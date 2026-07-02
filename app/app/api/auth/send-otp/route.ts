export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { generateOTP, getOTPExpiry, generateId } from "@/lib/utils";
import { sendOTPEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { success: false, error: "Email and userId are required" },
        { status: 400 }
      );
    }

    const otp = generateOTP();
    const expiresAt = getOTPExpiry().toISOString();

    await db.execute({
      sql: `INSERT INTO otp_codes (id, user_id, code, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [generateId(), userId, otp, expiresAt, new Date().toISOString()],
    });

    // Try to send email — don't fail if SMTP not configured
    try {
      const userResult = await db.execute({
        sql: "SELECT name FROM users WHERE id = ?",
        args: [userId],
      });
      const userName = (userResult.rows[0]?.name as string) || "User";
      await sendOTPEmail(email, otp, userName);
    } catch {
      // Email not configured — continue for dev
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}
