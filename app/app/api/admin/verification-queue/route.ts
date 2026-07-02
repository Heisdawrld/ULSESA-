export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { generateId } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/email";

export async function GET() {
  try {
    const result = await db.execute({
      sql: `SELECT vq.*, u.name as user_name, u.matric, u.email, u.biodata_document_url as document_url
            FROM verification_queue vq
            JOIN users u ON vq.user_id = u.id
            ORDER BY vq.created_at DESC`,
      args: [],
    });

    return NextResponse.json({ success: true, queue: result.rows });
  } catch (error) {
    console.error("Get verification queue error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch queue" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { queueId, action, notes } = await request.json();

    if (!queueId || !action) {
      return NextResponse.json(
        { success: false, error: "QueueId and action are required" },
        { status: 400 }
      );
    }

    const queueResult = await db.execute({
      sql: "SELECT * FROM verification_queue WHERE id = ?",
      args: [queueId],
    });

    if (queueResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Queue entry not found" },
        { status: 404 }
      );
    }

    const queue = queueResult.rows[0];
    const userId = queue.user_id as string;

    if (action === "approve") {
      const membershipNumber = `ULSESA-${String(Math.floor(10000 + Math.random() * 90000))}`;

      await db.execute({
        sql: `UPDATE users SET verification_status = 'manual_approved', verified_at = ?, updated_at = ? WHERE id = ?`,
        args: [new Date().toISOString(), new Date().toISOString(), userId],
      });

      await db.execute({
        sql: `UPDATE verification_queue SET status = 'approved', reviewed_at = ?, reviewer_notes = ?, updated_at = ? WHERE id = ?`,
        args: [
          new Date().toISOString(),
          notes || null,
          new Date().toISOString(),
          queueId,
        ],
      });

      // Try to send approval email
      try {
        const userResult = await db.execute({
          sql: "SELECT name, email FROM users WHERE id = ?",
          args: [userId],
        });
        const user = userResult.rows[0];
        if (user?.email) {
          await sendVerificationEmail(
            user.email as string,
            user.name as string,
            "approved"
          );
        }
      } catch {
        // Email not configured
      }

      return NextResponse.json({
        success: true,
        membershipNumber,
        status: "approved",
      });
    } else if (action === "reject") {
      await db.execute({
        sql: `UPDATE users SET verification_status = 'rejected', updated_at = ? WHERE id = ?`,
        args: [new Date().toISOString(), userId],
      });

      await db.execute({
        sql: `UPDATE verification_queue SET status = 'rejected', reviewed_at = ?, reviewer_notes = ?, updated_at = ? WHERE id = ?`,
        args: [
          new Date().toISOString(),
          notes || null,
          new Date().toISOString(),
          queueId,
        ],
      });

      // Try to send rejection email
      try {
        const userResult = await db.execute({
          sql: "SELECT name, email FROM users WHERE id = ?",
          args: [userId],
        });
        const user = userResult.rows[0];
        if (user?.email) {
          await sendVerificationEmail(
            user.email as string,
            user.name as string,
            "rejected"
          );
        }
      } catch {
        // Email not configured
      }

      return NextResponse.json({ success: true, status: "rejected" });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Process verification queue error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process queue entry" },
      { status: 500 }
    );
  }
}
