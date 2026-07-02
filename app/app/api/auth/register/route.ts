export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { generateId } from "@/lib/utils";
import { bufferToDataUrl } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const matric = formData.get("matric") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const password = formData.get("password") as string;
    const department = formData.get("department") as string;
    const document = formData.get("document") as File;

    if (!name || !matric || !email || !phone || !password || !document) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE matric = ?",
      args: [matric],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "Matric number already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const buffer = Buffer.from(await document.arrayBuffer());
    const mimeType = document.type || "application/octet-stream";
    const docResult = await bufferToDataUrl(buffer, mimeType);
    const documentUrl = docResult.dataUrl || "";

    const userId = generateId();
    let aiResult = null;

    try {
      const aiMod = await import("@/lib/ai-verification");
      aiResult = await aiMod.verifyDocument(documentUrl, { name, matric });
    } catch {
      // OPENAI_API_KEY not set or AI unavailable — skip
    }

    const verificationStatus =
      aiResult?.recommendation === "approve" ? "ai_verified" : "pending";

    await db.execute({
      sql: `INSERT INTO users (id, matric, name, email, phone, password_hash, biodata_document_url, verification_status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        userId,
        matric,
        name,
        email,
        phone,
        passwordHash,
        documentUrl,
        verificationStatus,
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    });

    if (aiResult?.success) {
      await db.execute({
        sql: `INSERT INTO verification_queue (id, user_id, document_url, extracted_data, confidence_score, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          generateId(),
          userId,
          documentUrl,
          JSON.stringify(aiResult.extractedData),
          aiResult.confidence,
          "pending",
          new Date().toISOString(),
          new Date().toISOString(),
        ],
      });
    }

    return NextResponse.json({ success: true, userId }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Registration failed" },
      { status: 500 }
    );
  }
}
