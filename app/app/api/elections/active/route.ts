export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM elections WHERE status = 'active' OR is_active = 1 ORDER BY created_at DESC LIMIT 1",
      args: [],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active election found" },
        { status: 404 }
      );
    }

    const election = result.rows[0];

    const positionsResult = await db.execute({
      sql: "SELECT * FROM positions WHERE election_id = ? ORDER BY display_order",
      args: [election.id as string],
    });

    return NextResponse.json({
      success: true,
      election,
      positions: positionsResult.rows,
    });
  } catch (error) {
    console.error("Get active election error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch election" },
      { status: 500 }
    );
  }
}
