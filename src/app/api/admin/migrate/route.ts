import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromToken } from '@/lib/auth/server-auth'
import { MATHS_ED_400L } from '@/lib/rosters/maths-400l'

/**
 * POST /api/admin/migrate
 *
 * One-shot admin-only migration that brings the live Turso DB schema in sync
 * with the Prisma schema after the MatricAllowlist + Dispute models were added.
 *
 * Render's deploy pipeline only runs `prisma generate` (postinstall) — it does
 * NOT run `prisma db push`. So new tables/columns added to schema.prisma never
 * make it to the live DB unless someone runs the migration manually. This
 * endpoint does that programmatically through raw SQL, and is fully
 * idempotent (safe to call multiple times).
 *
 * What it does:
 *  1. CREATE TABLE IF NOT EXISTS MatricAllowlist
 *  2. CREATE TABLE IF NOT EXISTS Dispute
 *  3. ALTER TABLE Student ADD COLUMN deviceFingerprint TEXT (no-op if exists)
 *  4. ALTER TABLE Student ADD COLUMN claimIp TEXT (no-op if exists)
 *  5. CREATE UNIQUE INDEX IF NOT EXISTS on key columns
 *  6. If MatricAllowlist is empty → seed the 113 400L Maths Ed students
 *
 * No data is destroyed. Safe to re-run.
 */
export async function POST(request: Request) {
  // ── Admin auth ─────────────────────────────────────────────────────────
  const admin = await getAdminFromToken()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const steps: { step: string; ok: boolean; message: string }[] = []

  // Helper to wrap each step with try/catch + uniform logging.
  async function run(
    step: string,
    fn: () => Promise<string>
  ): Promise<void> {
    try {
      const message = await fn()
      steps.push({ step, ok: true, message })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      // "duplicate column" / "already exists" are NOT errors for an
      // idempotent migration — record as ok=true with an info note.
      const benign =
        /duplicate column/i.test(message) ||
        /already exists/i.test(message)
      steps.push({
        step,
        ok: benign,
        message: benign ? `already present — ${message}` : message,
      })
    }
  }

  // ── 1. MatricAllowlist table ───────────────────────────────────────────
  await run('create MatricAllowlist table', async () => {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "MatricAllowlist" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "matricNumber" TEXT NOT NULL,
        "fullName" TEXT NOT NULL,
        "programme" TEXT NOT NULL,
        "level" TEXT NOT NULL,
        "cohort" TEXT NOT NULL,
        "isClaimed" BOOLEAN NOT NULL DEFAULT 0,
        "claimedAt" DATETIME,
        "claimedByStudentId" TEXT,
        "uploadBatch" TEXT NOT NULL,
        "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    return 'table created (or already existed)'
  })

  // ── 2. Dispute table ───────────────────────────────────────────────────
  await run('create Dispute table', async () => {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Dispute" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "matricNumber" TEXT NOT NULL,
        "expectedName" TEXT NOT NULL,
        "reporterName" TEXT NOT NULL,
        "reporterContact" TEXT,
        "reason" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "accusedStudentId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "resolvedAt" DATETIME,
        "resolvedBy" TEXT,
        "resolutionNote" TEXT
      )
    `
    return 'table created (or already existed)'
  })

  // ── 3. Add deviceFingerprint + claimIp to Student ─────────────────────
  // SQLite's ALTER TABLE ADD COLUMN doesn't support IF NOT EXISTS, so we
  // rely on try/catch + the "duplicate column" benign-message match above.
  await run('Student.deviceFingerprint column', async () => {
    await db.$executeRaw`ALTER TABLE "Student" ADD COLUMN "deviceFingerprint" TEXT`
    return 'column added'
  })

  await run('Student.claimIp column', async () => {
    await db.$executeRaw`ALTER TABLE "Student" ADD COLUMN "claimIp" TEXT`
    return 'column added'
  })

  // ── 4. Indexes ─────────────────────────────────────────────────────────
  await run('unique index on MatricAllowlist.matricNumber', async () => {
    await db.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "MatricAllowlist_matricNumber_key"
      ON "MatricAllowlist"("matricNumber")
    `
    return 'index ready'
  })

  await run('unique index on MatricAllowlist.claimedByStudentId', async () => {
    await db.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "MatricAllowlist_claimedByStudentId_key"
      ON "MatricAllowlist"("claimedByStudentId")
    `
    return 'index ready'
  })

  await run('index on Dispute.status', async () => {
    await db.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Dispute_status_idx"
      ON "Dispute"("status")
    `
    return 'index ready'
  })

  await run('index on Dispute.matricNumber', async () => {
    await db.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Dispute_matricNumber_idx"
      ON "Dispute"("matricNumber")
    `
    return 'index ready'
  })

  // ── 5. Count current allowlist entries ─────────────────────────────────
  let allowlistCount = 0
  await run('count current allowlist entries', async () => {
    allowlistCount = await db.matricAllowlist.count()
    return `${allowlistCount} entries already in allowlist`
  })

  // ── 6. Seed 400L Maths Ed roster if empty ──────────────────────────────
  if (allowlistCount === 0) {
    await run('seed 400L Maths Ed roster (113 students)', async () => {
      const batchId = `live-bootstrap-maths-400L-${Date.now()}`
      let inserted = 0
      let skipped = 0

      for (const { matric, name } of MATHS_ED_400L) {
        const existing = await db.matricAllowlist.findUnique({
          where: { matricNumber: matric },
          select: { id: true },
        })
        if (existing) {
          skipped++
          continue
        }
        await db.matricAllowlist.create({
          data: {
            matricNumber: matric,
            fullName: name,
            programme: 'Mathematics Education',
            level: '400',
            cohort: 'Mathematics Education',
            uploadBatch: batchId,
          },
        })
        inserted++
      }

      return `inserted ${inserted}, skipped ${skipped} (batch ${batchId})`
    })
  } else {
    steps.push({
      step: 'seed 400L Maths Ed roster',
      ok: true,
      message: `skipped — allowlist already has ${allowlistCount} entries`,
    })
  }

  // ── 7. Final count ─────────────────────────────────────────────────────
  let finalCount = 0
  try {
    finalCount = await db.matricAllowlist.count()
  } catch {
    finalCount = -1
  }

  return NextResponse.json({
    ok: steps.every((s) => s.ok),
    admin: admin.username,
    finalAllowlistCount: finalCount,
    steps,
  })
}

/**
 * GET /api/admin/migrate — diagnostic only. Reports whether the allowlist
 * table exists and how many entries are in it. Does NOT perform any writes.
 */
export async function GET() {
  const admin = await getAdminFromToken()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let tableExists = false
  let count = 0
  let error: string | undefined

  try {
    count = await db.matricAllowlist.count()
    tableExists = true
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : String(err)
  }

  return NextResponse.json({
    admin: admin.username,
    matricAllowlistTableExists: tableExists,
    matricAllowlistCount: count,
    error,
  })
}
