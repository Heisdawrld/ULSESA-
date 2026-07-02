export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const { matric, password } = await request.json();

    if (!matric || !password) {
      return NextResponse.json(
        { success: false, error: "Matric and password are required" },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: "SELECT id, matric, name, email, password_hash, verification_status, has_voted FROM users WHERE matric = ?",
      args: [matric],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    const validPassword = await verifyPassword(password, user.password_hash as string);

    if (!validPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await createToken({
      userId: user.id as string,
      matric: user.matric as string,
      name: user.name as string,
      email: user.email as string,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id as string,
        name: user.name as string,
        matric: user.matric as string,
        email: user.email as string,
        verification_status: user.verification_status as string,
        has_voted: user.has_voted as number,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
