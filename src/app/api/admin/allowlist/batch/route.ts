import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromToken } from '@/lib/auth/server-auth'

/**
 * POST /api/admin/allowlist/batch
 *
 * Bulk insert a parsed roster into the MatricAllowlist. Used when rosters
 * are parsed offline (e.g., from a .doc file that the upload endpoint
 * can't handle, or from a screenshot via VLM) and then pushed as a clean
 * JSON payload.
 *
 * Body:
 *   {
 *     "programme": "Physics Education",
 *     "level": "400",
 *     "cohort": "Physics Education",   // optional, defaults to programme
 *     "source": "Physics Ed Y4 list.doc",
 *     "entries": [
 *       { "matric": "210315001", "name": "Raji olatubosun Joshua" },
 *       ...
 *     ]
 *   }
 *
 * Idempotent: matrics already in the allowlist are skipped (not overwritten,
 * not errored). Returns a detailed summary.
 */
interface BatchEntry {
  matric: string
  name: string
}

interface BatchBody {
  programme?: string
  level?: string
  cohort?: string
  source?: string
  entries?: BatchEntry[]
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as BatchBody
    const programme = (body.programme ?? '').toString().trim()
    const level = (body.level ?? '').toString().trim()
    const cohort = (body.cohort ?? programme).toString().trim()
    const source = (body.source ?? 'manual-batch').toString().trim()
    const entries = Array.isArray(body.entries) ? body.entries : []

    if (!programme || !level) {
      return NextResponse.json(
        { error: 'programme and level are required' },
        { status: 400 }
      )
    }
    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'entries array is empty' },
        { status: 400 }
      )
    }

    // ── Validate every entry before inserting any ────────────────────────
    // Roll back nothing if even one entry is malformed — surface all errors
    // at once so the admin can fix the source file and retry.
    const errors: { row: number; matric: string; reason: string }[] = []
    const seen = new Set<string>()
    const cleaned: BatchEntry[] = []

    entries.forEach((raw, idx) => {
      const matric = (raw?.matric ?? '').toString().trim()
      const name = (raw?.name ?? '').toString().trim()
      const row = idx + 1

      if (!matric) {
        errors.push({ row, matric: '', reason: 'matric is empty' })
        return
      }
      if (!/^\d{9}$/.test(matric)) {
        errors.push({
          row,
          matric,
          reason: `matric must be exactly 9 digits (got ${matric.length})`,
        })
        return
      }
      if (!name) {
        errors.push({ row, matric, reason: 'name is empty' })
        return
      }
      if (seen.has(matric)) {
        errors.push({
          row,
          matric,
          reason: 'duplicate matric within this batch',
        })
        return
      }
      seen.add(matric)
      cleaned.push({ matric, name })
    })

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed — no entries were inserted',
          errorCount: errors.length,
          errors,
        },
        { status: 400 }
      )
    }

    // ── Insert (skip existing) ────────────────────────────────────────────
    const batchId = `batch-${source.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`
    let inserted = 0
    let skippedExisting = 0
    const skippedDetails: { matric: string; reason: string }[] = []

    for (const { matric, name } of cleaned) {
      const existing = await db.matricAllowlist.findUnique({
        where: { matricNumber: matric },
        select: { id: true, programme: true, level: true },
      })
      if (existing) {
        skippedExisting++
        skippedDetails.push({
          matric,
          reason: `already in allowlist (${existing.programme} · ${existing.level})`,
        })
        continue
      }
      await db.matricAllowlist.create({
        data: {
          matricNumber: matric,
          fullName: name,
          programme,
          level,
          cohort,
          uploadBatch: batchId,
        },
      })
      inserted++
    }

    // ── Audit log ─────────────────────────────────────────────────────────
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'allowlist_batch_insert',
        target: `${programme} · ${level}`,
        details: `Inserted ${inserted} matrics, skipped ${skippedExisting} existing. Source: ${source}. Batch: ${batchId}`,
      },
    })

    return NextResponse.json({
      success: true,
      summary: {
        total: cleaned.length,
        inserted,
        skippedExisting,
        batchId,
        programme,
        level,
        cohort,
        source,
      },
      skippedDetails,
    })
  } catch (error) {
    console.error('[admin/allowlist/batch POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to insert batch' },
      { status: 500 }
    )
  }
}
