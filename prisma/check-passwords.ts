import { db } from '../src/lib/db'
import { generatePlainPassword } from '../src/lib/password-generator'

async function main() {
  const total = await db.matricAllowlist.count()
  const withHash = await db.matricAllowlist.count({ where: { passwordHash: { not: null } } })
  const withoutHash = await db.matricAllowlist.count({ where: { passwordHash: null } })
  console.log('Total allowlist entries:', total)
  console.log('With passwordHash:', withHash)
  console.log('Without passwordHash:', withoutHash)

  const sample = await db.matricAllowlist.findMany({
    take: 5,
    select: { matricNumber: true, fullName: true, passwordHash: true },
  })
  console.log('\nSample (first 5):')
  for (const s of sample) {
    const plain = generatePlainPassword(s.matricNumber, s.fullName)
    console.log(`  ${s.matricNumber} | ${s.fullName} → password: ${plain} | hash stored: ${!!s.passwordHash}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
