export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyVoteReceipt } from "@/lib/voting";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const result = await verifyVoteReceipt(token);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Verify vote error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
