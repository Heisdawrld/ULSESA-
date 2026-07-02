export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import { castVotes } from "@/lib/voting";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;

    const userResult = await db.execute({
      sql: "SELECT id, verification_status, has_voted FROM users WHERE id = ?",
      args: [userId],
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    if (
      user.verification_status !== "ai_verified" &&
      user.verification_status !== "manual_approved" &&
      user.verification_status !== "pre_registered"
    ) {
      return NextResponse.json(
        { success: false, error: "Account not verified" },
        { status: 403 }
      );
    }

    if (user.has_voted === 1) {
      return NextResponse.json(
        { success: false, error: "Already voted" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { electionId, votes } = body;

    if (!electionId || !votes?.length) {
      return NextResponse.json(
        { success: false, error: "ElectionId and votes are required" },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const result = await castVotes(userId, votes, electionId, {
      ip,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      receipts: result.receipts,
    });
  } catch (error) {
    console.error("Cast vote error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cast vote" },
      { status: 500 }
    );
  }
}
