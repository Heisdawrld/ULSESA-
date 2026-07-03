import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

// ULSESA — University of Lagos Science Education Students' Association
// 5 cohorts: Biology Education, Chemistry Education, Mathematics Education, Physics Education, Integrated Science Education
// Matric format: numeric, e.g. 230317091

async function main() {
  console.log('🌱 Seeding ULSESA database...')

  // Clear existing data
  await db.vote.deleteMany()
  await db.candidate.deleteMany()
  await db.position.deleteMany()
  await db.election.deleteMany()
  await db.announcement.deleteMany()
  await db.event.deleteMany()
  await db.resource.deleteMany()
  await db.course.deleteMany()
  await db.communityGroup.deleteMany()
  await db.auditLog.deleteMany()
  await db.verificationLog.deleteMany()
  await db.activity.deleteMany()
  await db.student.deleteMany()
  await db.admin.deleteMany()

  // ===== ADMIN =====
  const adminPassword = await bcrypt.hash('ulsesa-admin-2026', 10)
  await db.admin.create({
    data: {
      username: 'admin',
      password: adminPassword,
      name: 'ULSESA Admin',
      role: 'superadmin',
    },
  })
  console.log('✅ Admin created')

  // ===== STUDENTS — ULSESA across 5 cohorts, numeric matrics =====
  // Matric format: 230317091 (year 23, dept 031, serial 7091)
  const programmes = [
    'Biology Education',
    'Chemistry Education',
    'Mathematics Education',
    'Physics Education',
    'Integrated Science Education',
  ]

  const students = [
    // Primary test account — the developer (Chukwunenye David Chimaeze)
    { matricNumber: '230315011', fullName: 'Chukwunenye David Chimaeze', level: '300', programme: 'Physics Education', email: 'chimaeze@ulsesa.unilag.edu.ng', phone: '08117024699', isVerified: true },
    // Other verified students — across all levels and cohorts
    { matricNumber: '230317091', fullName: 'Dawrld Olamide', level: '300', programme: 'Physics Education', email: 'dawrld@ulsesa.unilag.edu.ng', phone: '08012345678', isVerified: true },
    { matricNumber: '230317042', fullName: 'Adaeze Okoro', level: '300', programme: 'Biology Education', email: 'adaeze@ulsesa.unilag.edu.ng', phone: '08023456789', isVerified: true },
    { matricNumber: '230317088', fullName: 'Chidi Eze', level: '300', programme: 'Chemistry Education', email: 'chidi@ulsesa.unilag.edu.ng', phone: '08034567890', isVerified: true },
    { matricNumber: '210317001', fullName: 'Tunde Bello', level: '500', programme: 'Mathematics Education', email: 'tunde@ulsesa.unilag.edu.ng', phone: '08045678901', isVerified: true },
    { matricNumber: '220317010', fullName: 'Fatima Ibrahim', level: '400', programme: 'Integrated Science Education', email: 'fatima@ulsesa.unilag.edu.ng', phone: '08056789012', isVerified: true },
    { matricNumber: '220317055', fullName: 'Sarah Adeyemi', level: '400', programme: 'Biology Education', email: 'sarah@ulsesa.unilag.edu.ng', phone: '08090123456', isVerified: true },
    { matricNumber: '230317102', fullName: 'Michael Olu', level: '300', programme: 'Mathematics Education', email: 'michael@ulsesa.unilag.edu.ng', phone: '08101234567', isVerified: true },
    { matricNumber: '240317005', fullName: 'Emeka Nwosu', level: '200', programme: 'Physics Education', email: 'emeka@ulsesa.unilag.edu.ng', phone: '08067890123', isVerified: false },
    { matricNumber: '240317019', fullName: 'Zainab Mohammed', level: '200', programme: 'Chemistry Education', email: 'zainab@ulsesa.unilag.edu.ng', phone: '08078901234', isVerified: false },
    { matricNumber: '250317001', fullName: 'David Okafor', level: '100', programme: 'Integrated Science Education', email: 'david@ulsesa.unilag.edu.ng', phone: '08089012345', isVerified: false },
    { matricNumber: '250317014', fullName: 'Blessing Nwankwo', level: '100', programme: 'Biology Education', email: 'blessing@ulsesa.unilag.edu.ng', phone: '08112345678', isVerified: false },
    { matricNumber: '210317022', fullName: 'Samuel Ike', level: '500', programme: 'Physics Education', email: 'samuel@ulsesa.unilag.edu.ng', phone: '08123456789', isVerified: true },
  ]

  // Verified students already have passwords (they've claimed their accounts
  // and been approved). Unverified students have NO password — they must
  // go through the claiming flow (matric → email OTP → set password → admin approval).
  const studentPassword = await bcrypt.hash('student123', 10)
  for (const s of students) {
    await db.student.create({
      data: {
        ...s,
        password: s.isVerified ? studentPassword : null,
        verificationStatus: s.isVerified ? 'approved' : 'pending',
      },
    })
  }
  console.log(`✅ ${students.length} students created (${students.filter(s => s.isVerified).length} verified with passwords, ${students.filter(s => !s.isVerified).length} unverified needing to claim)`)

  // ===== ELECTION =====
  // Election opens on the next Tuesday at 8:00 AM (Africa/Lagos) and runs for 48 hours.
  // Tuesday is the canonical ULSESA election day.
  const now = new Date()
  const TUESDAY = 2 // Date.getUTCDay(): 0=Sun ... 2=Tue
  const startAt8UTC = new Date(now)
  startAt8UTC.setUTCHours(7, 0, 0, 0) // 07:00 UTC == 08:00 WAT
  let daysUntilTuesday = (TUESDAY - startAt8UTC.getUTCDay() + 7) % 7
  if (daysUntilTuesday === 0 && startAt8UTC.getTime() <= now.getTime()) {
    daysUntilTuesday = 7 // today is Tuesday but 8 AM already passed → next Tuesday
  }
  const startDate = new Date(startAt8UTC.getTime() + daysUntilTuesday * 24 * 60 * 60 * 1000)
  const endDate = new Date(startDate.getTime() + 48 * 60 * 60 * 1000) // 48 hours of voting

  const election = await db.election.create({
    data: {
      title: 'ULSESA General Election 2026',
      description: 'Vote for your ULSESA executive council for the 2026/2027 academic session. Transparent • Secure • Anonymous — Shaping Tomorrow\'s Scientific Innovators.',
      status: 'upcoming',
      startDate,
      endDate,
    },
  })

  const positions = [
    { title: 'President', description: 'Leads the ULSESA executive council and represents the association', order: 1 },
    { title: 'Vice President', description: 'Assists the president and oversees departmental committees', order: 2 },
    { title: 'Secretary General', description: 'Manages records, correspondence, and official documentation', order: 3 },
    { title: 'Financial Secretary', description: 'Oversees ULSESA finances, dues, and budgeting', order: 4 },
    { title: 'Social Director', description: 'Plans and organizes social events, sports, and entrepreneurship programs', order: 5 },
    { title: 'Public Relations Officer', description: 'Manages ULSESA\'s public image and social media presence', order: 6 },
  ]

  for (const p of positions) {
    await db.position.create({
      data: { ...p, electionId: election.id },
    })
  }

  // ===== CANDIDATES =====
  const presidentPos = await db.position.findFirst({ where: { title: 'President' } })
  const vpPos = await db.position.findFirst({ where: { title: 'Vice President' } })
  const secPos = await db.position.findFirst({ where: { title: 'Secretary General' } })
  const finPos = await db.position.findFirst({ where: { title: 'Financial Secretary' } })
  const socialPos = await db.position.findFirst({ where: { title: 'Social Director' } })
  const proPos = await db.position.findFirst({ where: { title: 'Public Relations Officer' } })

  if (presidentPos) {
    const candidates = [
      { name: 'John David', manifesto: 'Building a more connected and transparent ULSESA. My vision is an inclusive association where every science education student\'s voice is heard. I will implement digital tools for better communication, organize regular town halls, and lead ULSESA to new heights of excellence and innovation.', level: '400', programme: 'Physics Education', bio: 'First Class Student • Former Class Rep • Science Club President' },
      { name: 'Aisha Bello', manifesto: 'Empowering students through academic excellence and community. I plan to establish peer-tutoring networks across all five departments, expand teaching practice opportunities, and strengthen industry partnerships for our future educators.', level: '400', programme: 'Chemistry Education', bio: 'Best Graduating Student • Teaching Competition Winner' },
      { name: 'Daniel Okafor', manifesto: 'Innovation, integrity, and impact. I will modernize ULSESA\'s digital infrastructure, create a mentorship program pairing senior students with freshmen, and champion entrepreneurship programs that prepare us for the future.', level: '500', programme: 'Mathematics Education', bio: 'EdTech Enthusiast • Entrepreneurship Award Winner' },
    ]
    for (const c of candidates) {
      await db.candidate.create({ data: { ...c, positionId: presidentPos.id, voteCount: Math.floor(Math.random() * 50) + 10 } })
    }
  }

  if (vpPos) {
    for (const c of [
      { name: 'Grace Eze', manifesto: 'Bridging the gap between students and faculty through open dialogue and collaborative problem-solving across all five departments.', level: '300', programme: 'Biology Education', bio: 'Class Representative • Debate Club Lead' },
      { name: 'Ahmed Yusuf', manifesto: 'Building stronger communities through engagement, transparency, and student welfare initiatives that leave no one behind.', level: '300', programme: 'Integrated Science Education', bio: 'Student Ambassador • Volunteer Leader' },
    ]) {
      await db.candidate.create({ data: { ...c, positionId: vpPos.id, voteCount: Math.floor(Math.random() * 40) + 5 } })
    }
  }

  if (secPos) {
    for (const c of [
      { name: 'Mary Ojo', manifesto: 'Efficient, transparent, and accessible record-keeping for all ULSESA activities and decisions.', level: '300', programme: 'Chemistry Education', bio: 'Excellent Writer • Organized Events' },
      { name: 'Peter Ade', manifesto: 'A digital-first approach to ULSESA administration and communication that keeps every student informed.', level: '300', programme: 'Mathematics Education', bio: 'Tech-savvy • Detail-oriented' },
    ]) {
      await db.candidate.create({ data: { ...c, positionId: secPos.id, voteCount: Math.floor(Math.random() * 35) + 5 } })
    }
  }

  if (finPos) {
    await db.candidate.create({
      data: {
        name: 'Rashid Mohammed',
        manifesto: 'Accountable finance management with regular public reports and student-friendly budgeting. Every naira accounted for.',
        level: '400',
        programme: 'Physics Education',
        bio: 'Accounting Background • Transparent Leader',
        positionId: finPos.id,
        voteCount: Math.floor(Math.random() * 30) + 5,
      },
    })
  }

  if (socialPos) {
    for (const c of [
      { name: 'Blessing Nwankwo', manifesto: 'Unforgettable events that celebrate our culture, talent, and unity — from sports to entrepreneurship programs.', level: '200', programme: 'Biology Education', bio: 'Event Planner • Creative Director' },
      { name: 'Samuel Ike', manifesto: 'Building connections through sports, arts, and social gatherings that bring all five departments together.', level: '500', programme: 'Physics Education', bio: 'Sports Captain • Music Enthusiast' },
    ]) {
      await db.candidate.create({ data: { ...c, positionId: socialPos.id, voteCount: Math.floor(Math.random() * 25) + 5 } })
    }
  }

  if (proPos) {
    await db.candidate.create({
      data: {
        name: 'Zainab Mohammed',
        manifesto: 'Elevating ULSESA\'s brand across Instagram, Twitter, and TikTok — telling our story to the world.',
        level: '200',
        programme: 'Chemistry Education',
        bio: 'Content Creator • Social Media Strategist',
        positionId: proPos.id,
        voteCount: Math.floor(Math.random() * 20) + 5,
      },
    })
  }
  console.log('✅ Election, 6 positions, and candidates created')

  // ===== ANNOUNCEMENTS =====
  const announcements = [
    { title: 'ULSESA Election Begins Tuesday', content: 'The 2026 ULSESA General Election voting opens this Tuesday at 8:00 AM. All verified members are eligible to vote. Please ensure your account is verified before election day. This is your association — make your voice count.', category: 'election' },
    { title: 'Teaching Practice Registration Opens', content: 'Teaching Practice registration for 400-level students across all five departments is now open. Complete your registration this week. TP is a core requirement for your degree — don\'t miss out.', category: 'academic' },
    { title: 'Inter-Departmental Quiz Competition', content: 'The annual ULSESA Inter-Departmental Quiz Competition holds next Friday. Biology, Chemistry, Mathematics, Physics, and Integrated Science — which department will take the crown this year?', category: 'event' },
    { title: 'Entrepreneurship Program Applications', content: 'Applications for the ULSESA Entrepreneurship Program are open. Learn how to turn your science education into a business. Limited slots available — apply now.', category: 'academic' },
    { title: 'Updated Course Materials Available', content: 'New course materials for SED 301, SED 305, and departmental courses have been uploaded. Check the Resources section or your course\'s Google Drive folder.', category: 'academic' },
  ]

  for (let i = 0; i < announcements.length; i++) {
    await db.announcement.create({
      data: { ...announcements[i], createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000) },
    })
  }
  console.log('✅ Announcements created')

  // ===== EVENTS =====
  const events = [
    { title: 'Election Debate', description: 'Watch the presidential candidates debate their manifestos live', date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), time: '4:00 PM', location: 'Faculty of Education Main Auditorium', category: 'upcoming' },
    { title: 'Inter-Departmental Quiz', description: 'Biology vs Chemistry vs Mathematics vs Physics vs Integrated Science', date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), time: '10:00 AM', location: 'Main Lecture Theatre', category: 'upcoming' },
    { title: 'Teaching Practice Workshop', description: 'Mandatory TP orientation for all 400-level students', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), time: '2:00 PM', location: 'Education Hall', category: 'upcoming' },
    { title: 'ULSESA Career Fair', description: 'Connect with schools, EdTech companies, and research institutions', date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), time: '9:00 AM', location: 'Student Center', category: 'upcoming' },
    { title: 'Sports Day', description: 'Inter-departmental sports competition — football, athletics, and more', date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), time: '8:00 AM', location: 'Sports Complex', category: 'upcoming' },
  ]

  for (const e of events) {
    await db.event.create({ data: e })
  }
  console.log('✅ Events created')

  // ===== COURSES — Science Education across 5 departments =====
  const courses = [
    // 100 Level — General
    { code: 'SED 101', title: 'Foundations of Science Education', level: '100', semester: 'First', department: 'General', description: 'Introduction to science education principles and teaching methodology', googleDriveUrl: 'https://drive.google.com/ulsesa-sed101' },
    { code: 'SED 102', title: 'History & Philosophy of Science', level: '100', semester: 'Second', department: 'General', description: 'Historical development and philosophical foundations of science', googleDriveUrl: 'https://drive.google.com/ulsesa-sed102' },
    // Biology Education
    { code: 'BED 201', title: 'Cell Biology for Educators', level: '200', semester: 'First', department: 'Biology Education', description: 'Cell structure, function, and processes for biology teachers' },
    { code: 'BED 301', title: 'Genetics & Evolution Teaching', level: '300', semester: 'First', department: 'Biology Education', description: 'Principles of genetics and evolution with teaching applications' },
    // Chemistry Education
    { code: 'CED 201', title: 'Organic Chemistry for Educators', level: '200', semester: 'First', department: 'Chemistry Education', description: 'Organic chemistry fundamentals for chemistry teachers' },
    { code: 'CED 301', title: 'Physical Chemistry Teaching', level: '300', semester: 'First', department: 'Chemistry Education', description: 'Thermodynamics, kinetics, and quantum chemistry for educators' },
    // Mathematics Education
    { code: 'MED 201', title: 'Calculus for Mathematics Teachers', level: '200', semester: 'First', department: 'Mathematics Education', description: 'Differential and integral calculus with pedagogical approaches' },
    { code: 'MED 301', title: 'Algebra & Geometry Teaching', level: '300', semester: 'First', department: 'Mathematics Education', description: 'Abstract algebra and geometry for mathematics educators' },
    // Physics Education
    { code: 'PED 201', title: 'Classical Mechanics for Educators', level: '200', semester: 'First', department: 'Physics Education', description: 'Newtonian mechanics and oscillations for physics teachers' },
    { code: 'PED 301', title: 'Quantum Mechanics Teaching', level: '300', semester: 'First', department: 'Physics Education', description: 'Foundations of quantum theory with teaching methodology' },
    // Integrated Science Education
    { code: 'IED 201', title: 'Integrated Science Methods', level: '200', semester: 'First', department: 'Integrated Science Education', description: 'Teaching integrated science across disciplines' },
    { code: 'IED 301', title: 'Environmental Science Education', level: '300', semester: 'First', department: 'Integrated Science Education', description: 'Environmental science concepts and teaching strategies' },
    // 400/500 Level — Professional
    { code: 'SED 401', title: 'Curriculum Development in Science Ed', level: '400', semester: 'First', department: 'General', description: 'Designing and evaluating science education curricula' },
    { code: 'SED 405', title: 'Educational Technology', level: '400', semester: 'First', department: 'General', description: 'Technology integration in science teaching and learning' },
    { code: 'SED 501', title: 'Research Methods in Science Education', level: '500', semester: 'First', department: 'General', description: 'Research design and methods for science education' },
    { code: 'SED 505', title: 'Science Education Seminar', level: '500', semester: 'Second', department: 'General', description: 'Capstone seminar on contemporary science education issues' },
  ]

  for (const c of courses) {
    await db.course.create({ data: c })
  }
  console.log(`✅ ${courses.length} courses created across 5 departments`)

  // ===== RESOURCES (linked to courses) =====
  const resources = [
    { title: 'SED 101 Lecture Notes — Foundations', type: 'note', url: '#', description: 'Complete notes covering science education foundations', courseId: (await db.course.findUnique({ where: { code: 'SED 101' } }))?.id },
    { title: 'SED 101 Past Questions (2020-2025)', type: 'past_question', url: '#', description: '5 years of past exam questions with model answers', courseId: (await db.course.findUnique({ where: { code: 'SED 101' } }))?.id },
    { title: 'BED 301 Genetics Notes', type: 'note', url: '#', description: 'Comprehensive genetics notes for biology educators', courseId: (await db.course.findUnique({ where: { code: 'BED 301' } }))?.id },
    { title: 'CED 301 Physical Chemistry Slides', type: 'slides', url: '#', description: 'Lecture slides on thermodynamics and kinetics', courseId: (await db.course.findUnique({ where: { code: 'CED 301' } }))?.id },
    { title: 'MED 201 Calculus Textbook', type: 'textbook', url: '#', description: 'Stewart — Calculus: Early Transcendentals', courseId: (await db.course.findUnique({ where: { code: 'MED 201' } }))?.id },
    { title: 'PED 301 Quantum Mechanics Notes', type: 'note', url: '#', description: 'Detailed quantum mechanics notes for physics educators', courseId: (await db.course.findUnique({ where: { code: 'PED 301' } }))?.id },
    { title: 'SED 405 EdTech Video Tutorials', type: 'video', url: '#', description: 'Video series on integrating technology in science classrooms', courseId: (await db.course.findUnique({ where: { code: 'SED 405' } }))?.id },
    { title: 'Teaching Practice Handbook', type: 'textbook', url: '#', description: 'Complete guide for teaching practice across all departments', courseId: null },
    { title: 'ULSESA Past Question Bank (All Levels)', type: 'past_question', url: '#', description: 'Comprehensive past question bank for all science education courses', courseId: null },
  ]

  for (const r of resources) {
    await db.resource.create({ data: r })
  }
  console.log('✅ Resources created')

  // ===== COMMUNITY (Single official ULSESA WhatsApp Community) =====
  // The entire ULSESA department — all 5 cohorts — lives under one WhatsApp Community
  await db.communityGroup.create({
    data: {
      title: 'ULSESA Official Community',
      description: 'The one and only official ULSESA WhatsApp Community — the entire department under one roof. All 5 cohorts (Biology, Chemistry, Mathematics, Physics & Integrated Science Education) connect here. Join for announcements, discussions, and everything ULSESA.',
      category: 'general',
      whatsappLink: 'https://chat.whatsapp.com/ENV11x4Fs4wLi828he1wcp',
      memberCount: 500,
    },
  })
  console.log('✅ Official ULSESA WhatsApp Community created')

  // ===== ACTIVITIES =====
  const verifiedStudents = await db.student.findMany({ where: { isVerified: true } })
  for (const s of verifiedStudents.slice(0, 4)) {
    await db.activity.create({
      data: {
        studentId: s.id,
        action: 'account_verified',
        details: 'Account verified successfully',
        timestamp: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
      },
    })
  }
  console.log('✅ Activities created')

  console.log('\n🎉 ULSESA seed complete!')
  console.log('\n📋 Demo credentials:')
  console.log('  Admin:        username=admin  password=ulsesa-admin-2026')
  console.log('  Verified:     matric=230315011  password=student123  (Chukwunenye David Chimaeze — can sign in)')
  console.log('  Needs claiming: matric=240317005  (Emeka Nwosu — no password yet, go through Claim Account flow)')
  console.log('  Needs claiming: matric=250317001  (David Okafor — no password yet)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
