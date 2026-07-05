/**
 * One-off backfill: compute passwordHash for every MatricAllowlist entry
 * that doesn't already have one. Safe to run multiple times.
 *
 * Run with: bun run tsx prisma/backfill-passwords.ts
 */
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth/server-auth'
import { generatePlainPassword } from '../src/lib/password-generator'

async function main() {
  const needHash = await db.matricAllowlist.findMany({
    where: { passwordHash: null },
    select: { id: true, matricNumber: true, fullName: true },
  })

  console.log(`Found ${needHash.length} entries needing a passwordHash.`)

  if (needHash.length === 0) {
    console.log('Nothing to do — every entry already has a passwordHash.')
    return
  }

  let updated = 0
  for (const entry of needHash) {
    const passwordHash = await hashPassword(
      generatePlainPassword(entry.matricNumber, entry.fullName)
    )
    await db.matricAllowlist.update({
      where: { id: entry.id },
      data: { passwordHash },
    })
    updated++

    if (updated % 20 === 0) {
      console.log(`  ... ${updated}/${needHash.length}`)
    }
  }

  console.log(`Done. Backfilled ${updated} entries.`)

  // Print a few example plaintext passwords for manual QA (admin can test login).
  // Only shown in dev — never expose plaintext in production logs.
  if (process.env.NODE_ENV !== 'production') {
    const sample = await db.matricAllowlist.findMany({
      take: 3,
      select: { matricNumber: true, fullName: true },
    })
    console.log('\nSample passwords (for QA):')
    for (const s of sample) {
      console.log(`  ${s.matricNumber} (${s.fullName}) → ${generatePlainPassword(s.matricNumber, s.fullName)}`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
