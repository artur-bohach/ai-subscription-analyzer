require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ── Helper: advance a start date to the next future payment date ──────────────
function nextPayment(start, cycle) {
  const now = new Date();
  let d = new Date(start);
  const advance = (date) => {
    const nd = new Date(date);
    if (cycle === 'weekly')       nd.setDate(nd.getDate() + 7);
    else if (cycle === 'yearly')  nd.setFullYear(nd.getFullYear() + 1);
    else                          nd.setMonth(nd.getMonth() + 1);
    return nd;
  };
  while (d <= now) d = advance(d);
  return d;
}

async function main() {
  console.log('🌱 Seeding database...\n');

  await prisma.subscription.deleteMany({});
  await prisma.user.deleteMany({});

  // ── 1. admin ────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: { username: 'admin', email: 'admin@subtracker.app', passwordHash: adminHash, role: 'admin' },
  });
  console.log(`✅ admin  (id:${admin.id})  admin@subtracker.app / admin123`);

  const adminSubs = [
    { name: 'Netflix',              category: 'Entertainment',    cost: 15.99,  currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2023-06-01'), status: 'active',    notes: 'Standard plan, shared with family' },
    { name: 'Spotify',              category: 'Music & Audio',    cost: 9.99,   currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2022-01-15'), status: 'active',    notes: 'Premium individual plan' },
    { name: 'ChatGPT Plus',         category: 'AI Tools',         cost: 20.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-11-01'), status: 'active',    notes: 'GPT-4o access, used daily for work' },
    { name: 'GitHub Copilot',       category: 'Productivity',     cost: 10.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-03-01'), status: 'active',    notes: 'Individual developer plan' },
    { name: 'Google One',           category: 'Cloud & Storage',  cost: 2.99,   currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2021-09-01'), status: 'active',    notes: '100 GB storage plan' },
    { name: 'Adobe Creative Cloud', category: 'Productivity',     cost: 599.88, currency: 'EUR', billingCycle: 'yearly',  startDate: new Date('2024-01-10'), status: 'active',    notes: 'All apps — photography & video editing' },
    { name: 'Notion',               category: 'Productivity',     cost: 96.00,  currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2023-08-01'), status: 'active',    notes: 'Plus plan for personal knowledge management' },
    { name: 'YouTube Premium',      category: 'Entertainment',    cost: 11.99,  currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2022-05-01'), status: 'paused',    notes: 'Ad-free & background play — temporarily paused' },
    { name: 'iCloud+',              category: 'Cloud & Storage',  cost: 0.99,   currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2020-10-01'), status: 'active',    notes: '50 GB iCloud storage' },
    { name: 'Headspace',            category: 'Health & Fitness', cost: 69.99,  currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2024-01-01'), status: 'cancelled', notes: 'Meditation app — cancelled after trial' },
  ];

  for (const sub of adminSubs) {
    await prisma.subscription.create({ data: { ...sub, nextPayment: nextPayment(sub.startDate, sub.billingCycle), userId: admin.id } });
    console.log(`   ✅ ${sub.name}`);
  }

  // ── 2. testuser ─────────────────────────────────────────────────────────────
  const userHash = await bcrypt.hash('user123', 12);
  const testuser = await prisma.user.create({
    data: { username: 'testuser', email: 'user@example.com', passwordHash: userHash, role: 'user' },
  });
  console.log(`\n✅ testuser  (id:${testuser.id})  user@example.com / user123`);

  const userSubs = [
    { name: 'Disney+',      category: 'Entertainment',  cost: 8.99,   currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2024-03-01'), status: 'active', notes: 'Basic with ads' },
    { name: 'Apple Music',  category: 'Music & Audio',  cost: 10.99,  currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2023-09-01'), status: 'active', notes: 'Individual plan' },
    { name: 'Dropbox Plus', category: 'Cloud & Storage',cost: 119.99, currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2024-05-01'), status: 'active', notes: '2 TB storage' },
    { name: 'Duolingo Plus',category: 'Education',      cost: 6.99,   currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-07-01'), status: 'paused', notes: 'Learning Spanish' },
  ];

  for (const sub of userSubs) {
    await prisma.subscription.create({ data: { ...sub, nextPayment: nextPayment(sub.startDate, sub.billingCycle), userId: testuser.id } });
    console.log(`   ✅ ${sub.name}`);
  }

  // ── 3. demo ──────────────────────────────────────────────────────────────────
  const demoHash = await bcrypt.hash('demo123', 12);
  const demo = await prisma.user.create({
    data: { username: 'demo', email: 'demo@example.com', passwordHash: demoHash, role: 'user' },
  });
  console.log(`\n✅ demo  (id:${demo.id})  demo@example.com / demo123`);

  const demoSubs = [
    { name: 'Figma Pro',  category: 'Productivity', cost: 144.00, currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2024-02-01'), status: 'active', notes: 'Design tool' },
    { name: 'Linear',     category: 'Productivity', cost: 8.00,   currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-01-15'), status: 'active', notes: 'Issue tracker' },
    { name: 'Vercel Pro', category: 'Productivity', cost: 20.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-12-01'), status: 'active', notes: 'Hosting & deployments' },
  ];

  for (const sub of demoSubs) {
    await prisma.subscription.create({ data: { ...sub, nextPayment: nextPayment(sub.startDate, sub.billingCycle), userId: demo.id } });
    console.log(`   ✅ ${sub.name}`);
  }

  console.log('\n✨ Seed complete!');
  console.log('   admin    / admin123');
  console.log('   testuser / user123');
  console.log('   demo     / demo123\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
