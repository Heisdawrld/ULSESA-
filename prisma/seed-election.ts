/**
 * Seed election + content data WITHOUT touching the allowlist or students.
 * Creates an ACTIVE election so voting can be tested end-to-end.
 *
 * Run with: bunx tsx prisma/seed-election.ts
 */
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth/server-auth'

async function main() {
  // ── Admin (if none exists) ─────────────────────────────────────────────
  const adminCount = await db.admin.count()
  if (adminCount === 0) {
    const adminPassword = await hashPassword('ulsesa-admin-2026')
    await db.admin.create({
      data: {
        username: 'admin',
        password: adminPassword,
        name: 'ULSESA Admin',
        role: 'superadmin',
      },
    })
    console.log('✅ Admin created (admin / ulsesa-admin-2026)')
  } else {
    console.log(`ℹ️  Admin already exists (${adminCount} found)`)
  }

  // ── Election (if none exists) ──────────────────────────────────────────
  const existingElection = await db.election.findFirst()
  if (existingElection) {
    console.log(`ℹ️  Election already exists: "${existingElection.title}" (${existingElection.status})`)
    // Make sure it's active so voting works for QA
    if (existingElection.status !== 'active') {
      await db.election.update({
        where: { id: existingElection.id },
        data: { status: 'active' },
      })
      console.log('✅ Election set to active for QA')
    }
  } else {
    const now = new Date()
    const startDate = new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

    const election = await db.election.create({
      data: {
        title: 'ULSESA General Election 2026',
        description:
          "Vote for your ULSESA executive council for the 2026/2027 academic session. Transparent • Secure • Anonymous — Shaping Tomorrow's Scientific Innovators.",
        status: 'active',
        startDate,
        endDate,
      },
    })
    console.log('✅ Election created (active)')

    // ── Positions ────────────────────────────────────────────────────────
    const positions = [
      { title: 'President', description: 'Leads the ULSESA executive council', order: 1 },
      { title: 'Vice President', description: 'Assists the president', order: 2 },
      { title: 'Secretary General', description: 'Manages records and documentation', order: 3 },
      { title: 'Financial Secretary', description: 'Oversees ULSESA finances', order: 4 },
      { title: 'Social Director', description: 'Plans social events and sports', order: 5 },
    ]

    for (const p of positions) {
      await db.position.create({ data: { ...p, electionId: election.id } })
    }
    console.log(`✅ ${positions.length} positions created`)

    // ── Candidates ───────────────────────────────────────────────────────
    const presidentPos = await db.position.findFirst({ where: { title: 'President' } })
    const vpPos = await db.position.findFirst({ where: { title: 'Vice President' } })
    const secPos = await db.position.findFirst({ where: { title: 'Secretary General' } })
    const finPos = await db.position.findFirst({ where: { title: 'Financial Secretary' } })
    const socialPos = await db.position.findFirst({ where: { title: 'Social Director' } })

    if (presidentPos) {
      for (const c of [
        { name: 'John David', manifesto: 'Building a more connected and transparent ULSESA.', level: '400', programme: 'Physics Education', bio: 'Former Class Rep' },
        { name: 'Aisha Bello', manifesto: 'Empowering students through academic excellence.', level: '400', programme: 'Chemistry Education', bio: 'Best Graduating Student' },
        { name: 'Daniel Okafor', manifesto: 'Innovation, integrity, and impact.', level: '500', programme: 'Mathematics Education', bio: 'EdTech Enthusiast' },
      ]) {
        await db.candidate.create({ data: { ...c, positionId: presidentPos.id } })
      }
    }
    if (vpPos) {
      for (const c of [
        { name: 'Grace Eze', manifesto: 'Bridging the gap between students and faculty.', level: '300', programme: 'Biology Education', bio: 'Class Representative' },
        { name: 'Ahmed Yusuf', manifesto: 'Building stronger communities through engagement.', level: '300', programme: 'Integrated Science Education', bio: 'Student Ambassador' },
      ]) {
        await db.candidate.create({ data: { ...c, positionId: vpPos.id } })
      }
    }
    if (secPos) {
      for (const c of [
        { name: 'Mary Ojo', manifesto: 'Efficient, transparent record-keeping.', level: '300', programme: 'Chemistry Education', bio: 'Excellent Writer' },
        { name: 'Peter Ade', manifesto: 'A digital-first approach to administration.', level: '300', programme: 'Mathematics Education', bio: 'Tech-savvy' },
      ]) {
        await db.candidate.create({ data: { ...c, positionId: secPos.id } })
      }
    }
    if (finPos) {
      await db.candidate.create({
        data: {
          name: 'Rashid Mohammed',
          manifesto: 'Accountable finance management with regular public reports.',
          level: '400',
          programme: 'Physics Education',
          bio: 'Accounting Background',
          positionId: finPos.id,
        },
      })
    }
    if (socialPos) {
      for (const c of [
        { name: 'Blessing Nwankwo', manifesto: 'Unforgettable events that celebrate our culture.', level: '200', programme: 'Biology Education', bio: 'Event Planner' },
        { name: 'Samuel Ike', manifesto: 'Building connections through sports and arts.', level: '500', programme: 'Physics Education', bio: 'Sports Captain' },
      ]) {
        await db.candidate.create({ data: { ...c, positionId: socialPos.id } })
      }
    }
    console.log('✅ Candidates created')
  }

  // ── Announcements (if none) ────────────────────────────────────────────
  const announceCount = await db.announcement.count()
  if (announceCount === 0) {
    for (let i = 0; i < 3; i++) {
      await db.announcement.create({
        data: {
          title: ['ULSESA Election is Live', 'Teaching Practice Registration', 'Inter-Departmental Quiz'][i],
          content: [
            'The 2026 ULSESA General Election voting is now open. All verified members can vote. Make your voice count!',
            'Teaching Practice registration for 400-level students is now open. Complete your registration this week.',
            'The annual ULSESA Inter-Departmental Quiz Competition holds next Friday.',
          ][i],
          category: ['election', 'academic', 'event'][i],
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        },
      })
    }
    console.log('✅ Announcements created')
  }

  // ── Summary ────────────────────────────────────────────────────────────
  const electionCount = await db.election.count()
  const positionCount = await db.position.count()
  const candidateCount = await db.candidate.count()
  const adminCount2 = await db.admin.count()
  const allowlistCount = await db.matricAllowlist.count()
  console.log('\n=== DB Summary ===')
  console.log(`  Admins: ${adminCount2}`)
  console.log(`  Elections: ${electionCount}`)
  console.log(`  Positions: ${positionCount}`)
  console.log(`  Candidates: ${candidateCount}`)
  console.log(`  Allowlist entries: ${allowlistCount}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
