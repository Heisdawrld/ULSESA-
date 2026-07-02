export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { matric } = await request.json();

    if (!matric) {
      return NextResponse.json(
        { success: false, error: "Matric is required" },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: "SELECT id, matric, verification_status, has_voted FROM users WHERE matric = ?",
      args: [matric],
    });

    if (result.rows.length > 0) {
      const user = result.rows[0];
      return NextResponse.json({
        exists: true,
        source: "users",
        verification_status: user.verification_status as string,
        has_voted: user.has_voted as number,
        requires_password: true,
      });
    }

    // Try legacy voters table
    try {
      const votersResult = await db.execute({
        sql: "SELECT id, matric FROM voters WHERE matric = ?",
        args: [matric],
      });

      if (votersResult.rows.length > 0) {
        return NextResponse.json({
          exists: true,
          source: "voters",
          verification_status: "pre_registered",
          has_voted: 0,
          requires_password: false,
        });
      }
    } catch {
      // voters table doesn't exist
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Verify matric error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
