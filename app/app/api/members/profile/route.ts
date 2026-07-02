export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/jwt";

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const payload = await verifyToken(token);
  if (!payload?.userId) return null;

  const result = await db.execute({
    sql: `SELECT id, matric, name, email, phone, profile_photo_url,
                 verification_status, has_voted, voted_at, created_at
          FROM users WHERE id = ?`,
    args: [payload.userId as string],
  });

  return result.rows[0] || null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Try to get membership info
    let membership = null;
    try {
      const memberResult = await db.execute({
        sql: "SELECT * FROM members WHERE user_id = ?",
        args: [user.id as string],
      });
      membership = memberResult.rows[0] || null;
    } catch {
      // members table may not exist
    }

    return NextResponse.json({ success: true, user, membership });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { name, phone } = await request.json();

    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    if (name) {
      updates.push("name = ?");
      args.push(name);
    }
    if (phone) {
      updates.push("phone = ?");
      args.push(phone);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    updates.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(user.id as string);

    await db.execute({
      sql: `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
