export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { isOTPExpired } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { success: false, error: "UserId and code are required" },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: "SELECT id, expires_at, used FROM otp_codes WHERE user_id = ? AND code = ? ORDER BY created_at DESC LIMIT 1",
      args: [userId, code],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid OTP code" },
        { status: 400 }
      );
    }

    const otp = result.rows[0];

    if (otp.used as number === 1) {
      return NextResponse.json(
        { success: false, error: "OTP already used" },
        { status: 400 }
      );
    }

    if (isOTPExpired(otp.expires_at as string)) {
      return NextResponse.json(
        { success: false, error: "OTP has expired" },
        { status: 400 }
      );
    }

    await db.execute({
      sql: "UPDATE otp_codes SET used = 1 WHERE id = ?",
      args: [otp.id as string],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { success: false, error: "OTP verification failed" },
      { status: 500 }
    );
  }
}
