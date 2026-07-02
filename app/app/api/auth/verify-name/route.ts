export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { name, matric } = await request.json();

    if (!name || !matric) {
      return NextResponse.json(
        { success: false, error: "Name and matric are required" },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: "SELECT id, name FROM users WHERE matric = ?",
      args: [matric],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ verified: false, userId: null });
    }

    const user = result.rows[0];
    const dbName = (user.name as string).trim().toLowerCase();
    const inputName = name.trim().toLowerCase();

    const verified = dbName === inputName;

    return NextResponse.json({
      verified,
      userId: verified ? (user.id as string) : null,
    });
  } catch (error) {
    console.error("Verify name error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
