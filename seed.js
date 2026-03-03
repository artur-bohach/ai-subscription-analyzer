require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── Clear existing data ──────────────────────────────────────────────────────
  await prisma.subscription.deleteMany({});
  await prisma.user.deleteMany({});

  // ─── Create admin user ────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash,
      role: 'admin'
    }
  });
  console.log(`✅ Created user: admin (id: ${admin.id})`);

  // ─── Helper ───────────────────────────────────────────────────────────────────
  function nextPayment(start, cycle) {
    const now = new Date();
    let d = new Date(start);
    const add = (date) => {
      const nd = new Date(date);
      if (cycle === 'weekly')  nd.setDate(nd.getDate() + 7);
      else if (cycle === 'yearly') nd.setFullYear(nd.getFullYear() + 1);
      else nd.setMonth(nd.getMonth() + 1);
      return nd;
    };
    while (d <= now) d = add(d);
    return d;
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────────
  const subscriptions = [
    {
      name: 'Netflix',
      category: 'Entertainment',
      cost: 15.99,
      currency: 'EUR',
      billingCycle: 'monthly',
      startDate: new Date('2023-06-01'),
      status: 'active',
      notes: 'Standard plan, shared with family'
    },
    {
      name: 'Spotify',
      category: 'Music & Audio',
      cost: 9.99,
      currency: 'EUR',
      billingCycle: 'monthly',
      startDate: new Date('2022-01-15'),
      status: 'active',
      notes: 'Premium individual plan'
    },
    {
      name: 'ChatGPT Plus',
      category: 'AI Tools',
      cost: 20.00,
      currency: 'USD',
      billingCycle: 'monthly',
      startDate: new Date('2023-11-01'),
      status: 'active',
      notes: 'GPT-4o access, used daily for work'
    },
    {
      name: 'GitHub Copilot',
      category: 'Productivity',
      cost: 10.00,
      currency: 'USD',
      billingCycle: 'monthly',
      startDate: new Date('2023-03-01'),
      status: 'active',
      notes: 'Individual developer plan'
    },
    {
      name: 'Google One',
      category: 'Cloud & Storage',
      cost: 2.99,
      currency: 'EUR',
      billingCycle: 'monthly',
      startDate: new Date('2021-09-01'),
      status: 'active',
      notes: '100 GB storage plan'
    },
    {
      name: 'Adobe Creative Cloud',
      category: 'Productivity',
      cost: 599.88,
      currency: 'EUR',
      billingCycle: 'yearly',
      startDate: new Date('2024-01-10'),
      status: 'active',
      notes: 'All apps plan — photography & video editing'
    },
    {
      name: 'Notion',
      category: 'Productivity',
      cost: 96.00,
      currency: 'USD',
      billingCycle: 'yearly',
      startDate: new Date('2023-08-01'),
      status: 'active',
      notes: 'Plus plan for personal knowledge management'
    },
    {
      name: 'YouTube Premium',
      category: 'Entertainment',
      cost: 11.99,
      currency: 'EUR',
      billingCycle: 'monthly',
      startDate: new Date('2022-05-01'),
      status: 'paused',
      notes: 'Ad-free & background play — temporarily paused'
    },
    {
      name: 'iCloud+',
      category: 'Cloud & Storage',
      cost: 0.99,
      currency: 'EUR',
      billingCycle: 'monthly',
      startDate: new Date('2020-10-01'),
      status: 'active',
      notes: '50 GB iCloud storage'
    },
    {
      name: 'Headspace',
      category: 'Health & Fitness',
      cost: 69.99,
      currency: 'USD',
      billingCycle: 'yearly',
      startDate: new Date('2024-01-01'),
      status: 'cancelled',
      notes: 'Meditation app — cancelled after trial'
    }
  ];

  for (const sub of subscriptions) {
    const np = nextPayment(sub.startDate, sub.billingCycle);
    await prisma.subscription.create({
      data: { ...sub, nextPayment: np, userId: admin.id }
    });
    console.log(`   ✅ ${sub.name} (${sub.category}, ${sub.billingCycle})`);
  }

  console.log(`\n✨ Seed complete! ${subscriptions.length} subscriptions created.`);
  console.log('   Login: admin / admin123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
