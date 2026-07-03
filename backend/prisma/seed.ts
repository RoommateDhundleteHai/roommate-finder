import bcrypt from 'bcryptjs';
import { prisma } from '../src/db.js';

async function main() {
  console.log('🌱 Seeding VibeSync database...');
  console.log('⚠️  Clearing all existing data...\n');

  // Clear in dependency order (child tables first)
  await prisma.message.deleteMany();
  await prisma.matchResult.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.question.deleteMany();
  await prisma.matchingCycle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.college.deleteMany();

  // ─── 1. CREATE COLLEGE ───
  const iitp = await prisma.college.create({
    data: { name: 'Indian Institute of Technology Patna', domain: 'iitp.ac.in' },
  });
  console.log(`🏫 College: ${iitp.name} (domain: ${iitp.domain})`);

  // ─── 2. CREATE SUPER ADMIN (Platform Owner — not tied to any college) ───
  const superAdminPassword = await bcrypt.hash('SuperAdmin@2026!', 12);
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@vibesync.in',
      name: 'VibeSync Platform Admin',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      isVerified: true,
      // Super Admin is NOT tied to any college — platform-level
    },
  });
  console.log(`👑 Super Admin: ${superAdmin.email} (Password: SuperAdmin@2026!)`);

  // ─── 3. CREATE COLLEGE ADMIN (Pre-Approved for testing) ───
  const adminPassword = await bcrypt.hash('Admin@IITPatna2026', 12);
  const collegeAdmin = await prisma.user.create({
    data: {
      email: 'admin@iitp.ac.in',
      name: 'IIT Patna Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      adminStatus: 'APPROVED',
      isVerified: true,
      collegeId: iitp.id,
    },
  });
  console.log(`🛡️  College Admin: ${collegeAdmin.email} (Password: Admin@IITPatna2026) [APPROVED]`);

  // ─── 4. CREATE TEST STUDENTS (with degree + passingYear for isolation) ───
  const studentPassword = await bcrypt.hash('student123', 10);

  // B.Tech 2027 bucket
  const priyank = await prisma.user.create({
    data: {
      name: 'Priyank Patel', email: 'priyank@iitp.ac.in', passwordHash: studentPassword,
      isVerified: true, role: 'USER', collegeId: iitp.id,
      degree: 'B.Tech', passingYear: 2027,
    },
  });
  const rahul = await prisma.user.create({
    data: {
      name: 'Rahul Sharma', email: 'rahul@iitp.ac.in', passwordHash: studentPassword,
      isVerified: true, role: 'USER', collegeId: iitp.id,
      degree: 'B.Tech', passingYear: 2027,
    },
  });
  const kabir = await prisma.user.create({
    data: {
      name: 'Kabir Singh', email: 'kabir@iitp.ac.in', passwordHash: studentPassword,
      isVerified: true, role: 'USER', collegeId: iitp.id,
      degree: 'B.Tech', passingYear: 2027,
    },
  });
  const ananya = await prisma.user.create({
    data: {
      name: 'Ananya Verma', email: 'ananya@iitp.ac.in', passwordHash: studentPassword,
      isVerified: true, role: 'USER', collegeId: iitp.id,
      degree: 'B.Tech', passingYear: 2027,
    },
  });

  // M.Tech 2027 bucket (should NOT match with B.Tech students)
  const vikram = await prisma.user.create({
    data: {
      name: 'Vikram Desai', email: 'vikram@iitp.ac.in', passwordHash: studentPassword,
      isVerified: true, role: 'USER', collegeId: iitp.id,
      degree: 'M.Tech', passingYear: 2027,
    },
  });
  const neha = await prisma.user.create({
    data: {
      name: 'Neha Gupta', email: 'neha@iitp.ac.in', passwordHash: studentPassword,
      isVerified: true, role: 'USER', collegeId: iitp.id,
      degree: 'M.Tech', passingYear: 2027,
    },
  });

  console.log(`👥 Created 6 test students (Password: student123)`);
  console.log(`   B.Tech 2027: Priyank, Rahul, Kabir, Ananya`);
  console.log(`   M.Tech 2027: Vikram, Neha (isolated bucket)`);

  // ─── 5. CREATE 15 FIXED SCALE QUESTIONS + 1 STRICT ───
  const questionsData = [
    { order: 1,  text: "Sleep Schedule: 1 (Early Bird, 10 PM) to 5 (Night Owl, 3 AM+)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 4.0 },
    { order: 2,  text: "Cleanliness: 1 (OCD/Spotless) to 5 (Controlled Chaos/Messy)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 4.5 },
    { order: 3,  text: "Study Vibe: 1 (Absolute Silence) to 5 (Music/Background Noise)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 3.5 },
    { order: 4,  text: "Social Battery: 1 (Room is a private cave) to 5 (Open door, friends always welcome)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 3.0 },
    { order: 5,  text: "AC Temperature: 1 (Freezing, 18°C) to 5 (Warm/Fan only, 26°C)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 2.5 },
    { order: 6,  text: "Alarm Habits: 1 (Wake up on first ring) to 5 (10 snoozes, wakes everyone)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 3.0 },
    { order: 7,  text: "Light Sensitivity: 1 (Need pitch black) to 5 (Can sleep with tubelights on)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 2.5 },
    { order: 8,  text: "Sharing Belongings: 1 (Strictly separate) to 5 (What's mine is yours)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 2.0 },
    { order: 9,  text: "Conflict Resolution: 1 (Discuss immediately) to 5 (Avoid and let it pass)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 2.5 },
    { order: 10, text: "Weekend Lifestyle: 1 (Stay inside & chill/code) to 5 (Go out/Party)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 2.0 },
    { order: 11, text: "Phone Calls: 1 (Always step out) to 5 (Loud speaker inside is fine)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 2.0 },
    { order: 12, text: "Room Aesthetics: 1 (Minimalist/Clean walls) to 5 (Posters/LED lights everywhere)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 1.5 },
    { order: 13, text: "Room Fragrance: 1 (No strong smells) to 5 (Love incense/fresheners)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 1.5 },
    { order: 14, text: "Bathroom Time: 1 (10 mins quick shower) to 5 (45 mins full grooming)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 2.0 },
    { order: 15, text: "Late Night Tech: 1 (Silent typing/No gaming) to 5 (Mechanical keyboard/Voice chat)", type: "FIXED" as const, matchType: "SCALE" as const, weight: 3.5 },
  ];

  for (const q of questionsData) {
    await prisma.question.create({
      data: {
        text: q.text, order: q.order, type: q.type,
        matchType: q.matchType, weight: q.weight,
        options: [], collegeId: iitp.id,
      },
    });
  }

  // One STRICT question with options
  await prisma.question.create({
    data: {
      text: 'Dietary Preference', order: 16, type: 'EDITABLE',
      matchType: 'STRICT', weight: 5.0,
      options: ['VEG', 'NON_VEG', 'VEGAN', 'JAIN'],
      collegeId: iitp.id,
    },
  });

  console.log(`📝 Created 16 questions (15 SCALE + 1 STRICT)`);

  // ─── 6. CREATE A DRAFT CYCLE ───
  const cycle = await prisma.matchingCycle.create({
    data: {
      name: 'Fall 2026 Roommate Matching',
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'DRAFT',
      collegeId: iitp.id,
    },
  });
  console.log(`🔄 Created cycle: "${cycle.name}" [DRAFT] — Deadline: ${cycle.endDate.toLocaleDateString()}`);

  console.log('\n✅ Seed complete! VibeSync is ready.\n');
  console.log('─────────────────────────────────────────────');
  console.log('  Login Credentials:');
  console.log('  Super Admin  : superadmin@vibesync.in / SuperAdmin@2026!');
  console.log('  College Admin: admin@iitp.ac.in / Admin@IITPatna2026');
  console.log('  Students     : priyank@iitp.ac.in / student123');
  console.log('─────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });