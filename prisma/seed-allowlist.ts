/**
 * Seed the 400L Maths Education attendance list into the MatricAllowlist.
 * Run with: bun run tsx prisma/seed-allowlist.ts
 *
 * Computes a pre-set password hash for each entry using the ULSESA rule:
 *   matricNumber + last4(lowercase(surname))
 * Students log in directly with this — no claim / set-password flow.
 */
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth/server-auth'
import { generatePlainPassword } from '../src/lib/password-generator'
import { MATHS_ED_400L } from '../src/lib/rosters/maths-400l'

async function main() {
  console.log(`Seeding ${MATHS_ED_400L.length} matrics into allowlist...`)

  const batchId = `seed-maths-400L-${Date.now()}`
  let inserted = 0
  let skipped = 0

  for (const { matric, name } of MATHS_ED_400L) {
    const existing = await db.matricAllowlist.findUnique({
      where: { matricNumber: matric },
    })
    if (existing) {
      skipped++
      continue
    }
    const passwordHash = await hashPassword(generatePlainPassword(matric, name))
    await db.matricAllowlist.create({
      data: {
        matricNumber: matric,
        fullName: name,
        programme: 'Mathematics Education',
        level: '400',
        cohort: 'Mathematics Education',
        uploadBatch: batchId,
        passwordHash,
      },
    })
    inserted++
  }

  console.log(`Done. Inserted: ${inserted}, Skipped (already existed): ${skipped}`)
  console.log(`Batch ID: ${batchId}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
