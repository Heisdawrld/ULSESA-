export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getElectionResults } from "@/lib/voting";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get("electionId");

    let activeElectionId = electionId;

    if (!activeElectionId) {
      const electionResult = await db.execute({
        sql: "SELECT id FROM elections WHERE status = 'active' OR is_active = 1 ORDER BY created_at DESC LIMIT 1",
        args: [],
      });

      if (electionResult.rows.length > 0) {
        activeElectionId = electionResult.rows[0].id as string;
      }
    }

    if (!activeElectionId) {
      return NextResponse.json(
        { success: false, error: "No active election found" },
        { status: 404 }
      );
    }

    const electionResult = await db.execute({
      sql: "SELECT * FROM elections WHERE id = ?",
      args: [activeElectionId],
    });

    const election = electionResult.rows[0] || null;
    const results = await getElectionResults(activeElectionId);

    return NextResponse.json({
      success: true,
      election,
      results: results.results || [],
      totalVoters: results.totalVoters || 0,
    });
  } catch (error) {
    console.error("Get results error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}
