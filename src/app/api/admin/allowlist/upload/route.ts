import { NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { db } from '@/lib/db'
import { getAdminFromToken, hashPassword } from '@/lib/auth/server-auth'
import { generatePlainPassword } from '@/lib/password-generator'
import { parseRosterText } from '@/lib/roster-parser'

/**
 * POST /api/admin/allowlist/upload
 *
 * Accepts a roster file (.docx, .csv, .txt) + programme + level, extracts
 * 9-digit matrics + names, and upserts them into the MatricAllowlist.
 *
 * Three-way semantics (matches the admin UI's UploadSummary contract):
 *  - inserted       : brand-new matrics → created with a rule-based password hash
 *  - updated        : matrics already in the allowlist but NOT yet claimed by a
 *                     student → refreshed (name/programme/level/password hash)
 *  - skippedClaimed : matrics already in the allowlist AND already claimed by a
 *                     real student → left untouched (don't disrupt a registered voter)
 *
 * Within-file duplicates are reported back in `summary.duplicates` (only the
 * first occurrence is kept).
 *
 * Idempotent: re-uploading the same roster is safe and just reports
 * `updated` counts.
 */
export const runtime = 'nodejs'

const ALLOWED_EXT = ['.docx', '.csv', '.txt']
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file')
    const programme = (form.get('programme')?.toString() ?? '').trim()
    const level = (form.get('level')?.toString() ?? '').trim()

    if (!programme || !level) {
      return NextResponse.json(
        { error: 'programme and level are required' },
        { status: 400 }
      )
    }
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file uploaded. Select a .docx, .csv, or .txt file.' },
        { status: 400 }
      )
    }

    const name = file.name.toLowerCase()
    const ext = name.slice(name.lastIndexOf('.'))
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        {
          error: `Unsupported file type "${ext || 'none'}". Allowed: ${ALLOWED_EXT.join(', ')}`,
        },
        { status: 400 }
      )
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.` },
        { status: 413 }
      )
    }

    // ── Extract raw text from the file ──────────────────────────────────
    let rawText: string
    if (ext === '.docx') {
      const arrayBuf = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer: Buffer.from(arrayBuf) })
      rawText = result.value
    } else {
      // .csv and .txt are both plain text. Read as UTF-8.
      rawText = await file.text()
    }

    const parsed = parseRosterText(rawText)
    if (parsed.entries.length === 0) {
      return NextResponse.json(
        {
          error:
            'No valid matric + name pairs found in the file. Make sure each row has a 9-digit matric number and a name. ' +
            `${parsed.skippedLines} line(s) were scanned but none matched.`,
        },
        { status: 400 }
      )
    }

    // ── Upsert each entry ───────────────────────────────────────────────
    const batchId = `upload-${programme.replace(/\s+/g, '-').toLowerCase()}-${level}-${Date.now()}`
    let inserted = 0
    let updated = 0
    let skippedClaimed = 0

    for (const { matric, name: fullName } of parsed.entries) {
      const existing = await db.matricAllowlist.findUnique({
        where: { matricNumber: matric },
        select: { id: true, isClaimed: true, fullName: true },
      })

      if (existing) {
        if (existing.isClaimed) {
          // A real student already claimed this matric — do NOT disrupt them.
          skippedClaimed++
          continue
        }
        // Existing but unclaimed → refresh in case the roster was corrected.
        // Recompute the rule-based password hash from the (possibly updated) name.
        const passwordHash = await hashPassword(generatePlainPassword(matric, fullName))
        await db.matricAllowlist.update({
          where: { id: existing.id },
          data: {
            fullName,
            programme,
            level,
            cohort: programme,
            uploadBatch: batchId,
            passwordHash,
          },
        })
        updated++
      } else {
        // Brand new entry → pre-compute the rule-based password hash so the
        // student can log in directly with matric + last4(surname).
        const passwordHash = await hashPassword(generatePlainPassword(matric, fullName))
        await db.matricAllowlist.create({
          data: {
            matricNumber: matric,
            fullName,
            programme,
            level,
            cohort: programme,
            uploadBatch: batchId,
            passwordHash,
          },
        })
        inserted++
      }
    }

    // ── Audit log ───────────────────────────────────────────────────────
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'allowlist_upload',
        target: `${programme} · ${level}`,
        details: `File: ${file.name}. Parsed ${parsed.entries.length} matrics — inserted ${inserted}, updated ${updated}, skipped ${skippedClaimed} (already claimed). ${parsed.duplicates.length} within-file duplicate(s) ignored. Skipped ${parsed.skippedLines} non-matching line(s). Batch: ${batchId}`,
      },
    })

    return NextResponse.json({
      success: true,
      summary: {
        total: parsed.entries.length,
        inserted,
        updated,
        skippedClaimed,
        duplicates: parsed.duplicates,
      },
      batchId,
    })
  } catch (error) {
    console.error('[admin/allowlist/upload POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}
