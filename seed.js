require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

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
    { name: 'Disney+',       category: 'Entertainment',   cost: 8.99,   currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2024-03-01'), status: 'active',    notes: 'Basic with ads' },
    { name: 'Apple Music',   category: 'Music & Audio',   cost: 10.99,  currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2023-09-01'), status: 'active',    notes: 'Individual plan' },
    { name: 'Dropbox Plus',  category: 'Cloud & Storage', cost: 119.99, currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2024-05-01'), status: 'active',    notes: '2 TB storage' },
    { name: 'Duolingo Plus', category: 'Education',       cost: 6.99,   currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-07-01'), status: 'paused',    notes: 'Learning Spanish' },
    { name: 'LinkedIn Premium', category: 'Productivity', cost: 39.99,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-02-01'), status: 'active',    notes: 'Career plan for job searching' },
    { name: 'Calm',          category: 'Health & Fitness',cost: 59.99,  currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2023-12-01'), status: 'cancelled', notes: 'Sleep & meditation — switched to Headspace' },
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
    { name: 'Figma Pro',      category: 'Productivity',    cost: 144.00, currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2024-02-01'), status: 'active', notes: 'Design tool for UI/UX work' },
    { name: 'Linear',         category: 'Productivity',    cost: 8.00,   currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-01-15'), status: 'active', notes: 'Issue tracker for the team' },
    { name: 'Vercel Pro',     category: 'Developer Tools', cost: 20.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-12-01'), status: 'active', notes: 'Hosting & deployments' },
    { name: 'Loom Business',  category: 'Productivity',    cost: 12.50,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-04-01'), status: 'active', notes: 'Async video for team updates' },
    { name: 'Grammarly Pro',  category: 'Productivity',    cost: 144.00, currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2024-03-15'), status: 'active', notes: 'Writing assistant' },
  ];

  for (const sub of demoSubs) {
    await prisma.subscription.create({ data: { ...sub, nextPayment: nextPayment(sub.startDate, sub.billingCycle), userId: demo.id } });
    console.log(`   ✅ ${sub.name}`);
  }

  // ── 4. alex_m ────────────────────────────────────────────────────────────────
  const alexHash = await bcrypt.hash('alex123', 12);
  const alex = await prisma.user.create({
    data: { username: 'alex_m', email: 'alex.morgan@gmail.com', passwordHash: alexHash, role: 'user' },
  });
  console.log(`\n✅ alex_m  (id:${alex.id})  alex.morgan@gmail.com / alex123`);

  const alexSubs = [
    { name: 'Netflix',           category: 'Entertainment',    cost: 22.99,  currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2022-11-01'), status: 'active',    notes: '4K Premium plan' },
    { name: 'HBO Max',           category: 'Entertainment',    cost: 9.99,   currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2023-05-01'), status: 'active',    notes: 'Ad-supported plan' },
    { name: 'Spotify',           category: 'Music & Audio',    cost: 14.99,  currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2021-03-01'), status: 'active',    notes: 'Family plan' },
    { name: 'Xbox Game Pass',    category: 'Gaming',           cost: 14.99,  currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2023-07-01'), status: 'active',    notes: 'Ultimate tier with cloud gaming' },
    { name: 'PlayStation Plus',  category: 'Gaming',           cost: 59.99,  currency: 'EUR', billingCycle: 'yearly',  startDate: new Date('2023-01-15'), status: 'active',    notes: 'Extra tier for PS5 games' },
    { name: 'Twitch Turbo',      category: 'Entertainment',    cost: 8.99,   currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-02-01'), status: 'paused',    notes: 'Ad-free viewing — on hold' },
    { name: 'iCloud+',           category: 'Cloud & Storage',  cost: 2.99,   currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2021-06-01'), status: 'active',    notes: '200 GB family sharing' },
    { name: 'NordVPN',           category: 'Security',         cost: 71.88,  currency: 'EUR', billingCycle: 'yearly',  startDate: new Date('2024-01-20'), status: 'active',    notes: '2-year plan, auto-renews annually' },
  ];

  for (const sub of alexSubs) {
    await prisma.subscription.create({ data: { ...sub, nextPayment: nextPayment(sub.startDate, sub.billingCycle), userId: alex.id } });
    console.log(`   ✅ ${sub.name}`);
  }

  // ── 5. sofia_k ───────────────────────────────────────────────────────────────
  const sofiaHash = await bcrypt.hash('sofia123', 12);
  const sofia = await prisma.user.create({
    data: { username: 'sofia_k', email: 'sofia.kovac@outlook.com', passwordHash: sofiaHash, role: 'user' },
  });
  console.log(`\n✅ sofia_k  (id:${sofia.id})  sofia.kovac@outlook.com / sofia123`);

  const sofiaSubs = [
    { name: 'Adobe Creative Cloud', category: 'Productivity',    cost: 54.99,  currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2023-04-01'), status: 'active',    notes: 'Photography plan — Lightroom + Photoshop' },
    { name: 'Canva Pro',            category: 'Productivity',    cost: 109.99, currency: 'EUR', billingCycle: 'yearly',  startDate: new Date('2024-01-01'), status: 'active',    notes: 'Social media templates and brand kit' },
    { name: 'Pinterest Premium',    category: 'Productivity',    cost: 4.99,   currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-06-01'), status: 'cancelled', notes: 'Tried it, not worth it' },
    { name: 'Skillshare',           category: 'Education',       cost: 167.88, currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2023-09-01'), status: 'active',    notes: 'Design and illustration courses' },
    { name: 'Miro',                 category: 'Productivity',    cost: 10.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-03-01'), status: 'active',    notes: 'Whiteboard for client workshops' },
    { name: 'Notion',               category: 'Productivity',    cost: 10.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-10-01'), status: 'active',    notes: 'Project management and client docs' },
    { name: 'Spotify',              category: 'Music & Audio',   cost: 9.99,   currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2020-07-01'), status: 'active',    notes: 'Long-time subscriber' },
    { name: 'Claude Pro',           category: 'AI Tools',        cost: 20.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-04-01'), status: 'active',    notes: 'AI writing and research assistant' },
  ];

  for (const sub of sofiaSubs) {
    await prisma.subscription.create({ data: { ...sub, nextPayment: nextPayment(sub.startDate, sub.billingCycle), userId: sofia.id } });
    console.log(`   ✅ ${sub.name}`);
  }

  // ── 6. dev_james ─────────────────────────────────────────────────────────────
  const jamesHash = await bcrypt.hash('james123', 12);
  const james = await prisma.user.create({
    data: { username: 'dev_james', email: 'james.dev@proton.me', passwordHash: jamesHash, role: 'user' },
  });
  console.log(`\n✅ dev_james  (id:${james.id})  james.dev@proton.me / james123`);

  const jamesSubs = [
    { name: 'GitHub Pro',          category: 'Developer Tools',  cost: 4.00,   currency: 'USD', billingCycle: 'monthly', startDate: new Date('2021-08-01'), status: 'active',    notes: 'Private repos and Actions minutes' },
    { name: 'JetBrains All Products', category: 'Developer Tools', cost: 249.00, currency: 'USD', billingCycle: 'yearly', startDate: new Date('2024-01-01'), status: 'active',    notes: 'WebStorm, IntelliJ, DataGrip' },
    { name: 'AWS',                  category: 'Developer Tools',  cost: 47.30,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2022-05-01'), status: 'active',    notes: 'EC2 + RDS for side projects — varies monthly' },
    { name: 'DigitalOcean',         category: 'Developer Tools',  cost: 24.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-02-01'), status: 'active',    notes: '2x droplets, managed DB' },
    { name: 'ChatGPT Plus',         category: 'AI Tools',         cost: 20.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-06-01'), status: 'active',    notes: 'Daily coding assistant' },
    { name: 'Cursor Pro',           category: 'AI Tools',         cost: 20.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-05-01'), status: 'active',    notes: 'AI code editor' },
    { name: 'Postman Professional', category: 'Developer Tools',  cost: 14.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-11-01'), status: 'paused',    notes: 'Switched to Bruno for now' },
    { name: 'Notion',               category: 'Productivity',     cost: 10.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2022-09-01'), status: 'active',    notes: 'Docs, planning, notes' },
    { name: '1Password',            category: 'Security',         cost: 35.88,  currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2023-04-01'), status: 'active',    notes: 'Individual plan' },
    { name: 'Raycast Pro',          category: 'Productivity',     cost: 8.00,   currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-07-01'), status: 'active',    notes: 'Mac launcher with AI commands' },
  ];

  for (const sub of jamesSubs) {
    await prisma.subscription.create({ data: { ...sub, nextPayment: nextPayment(sub.startDate, sub.billingCycle), userId: james.id } });
    console.log(`   ✅ ${sub.name}`);
  }

  // ── 7. maria_r ───────────────────────────────────────────────────────────────
  const mariaHash = await bcrypt.hash('maria123', 12);
  const maria = await prisma.user.create({
    data: { username: 'maria_r', email: 'maria.r@icloud.com', passwordHash: mariaHash, role: 'user' },
  });
  console.log(`\n✅ maria_r  (id:${maria.id})  maria.r@icloud.com / maria123`);

  const mariaSubs = [
    { name: 'Apple One Premier', category: 'Entertainment',    cost: 37.95,  currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2023-09-15'), status: 'active',    notes: 'Apple TV+, Music, Arcade, iCloud 2TB, Fitness+' },
    { name: 'Netflix',           category: 'Entertainment',    cost: 15.99,  currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2024-01-01'), status: 'active',    notes: 'Standard HD plan' },
    { name: 'Peloton',           category: 'Health & Fitness', cost: 12.99,  currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2023-10-01'), status: 'active',    notes: 'App-only plan, no hardware' },
    { name: 'Noom',              category: 'Health & Fitness', cost: 209.00, currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2024-02-01'), status: 'cancelled', notes: 'Weight loss program — completed the course' },
    { name: 'Audible',           category: 'Education',        cost: 14.95,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2022-06-01'), status: 'active',    notes: '1 credit per month' },
    { name: 'Kindle Unlimited',  category: 'Education',        cost: 9.99,   currency: 'EUR', billingCycle: 'monthly', startDate: new Date('2023-01-01'), status: 'active',    notes: 'Unlimited e-books' },
    { name: 'Coursera Plus',     category: 'Education',        cost: 399.00, currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2024-03-01'), status: 'active',    notes: 'Unlimited courses for career upskilling' },
    { name: 'Strava Summit',     category: 'Health & Fitness', cost: 59.99,  currency: 'EUR', billingCycle: 'yearly',  startDate: new Date('2023-11-01'), status: 'paused',    notes: 'Running & cycling analysis — off-season pause' },
  ];

  for (const sub of mariaSubs) {
    await prisma.subscription.create({ data: { ...sub, nextPayment: nextPayment(sub.startDate, sub.billingCycle), userId: maria.id } });
    console.log(`   ✅ ${sub.name}`);
  }

  // ── 8. tom_business ──────────────────────────────────────────────────────────
  const tomHash = await bcrypt.hash('tom123', 12);
  const tom = await prisma.user.create({
    data: { username: 'tom_business', email: 'thomas.k@company.io', passwordHash: tomHash, role: 'user' },
  });
  console.log(`\n✅ tom_business  (id:${tom.id})  thomas.k@company.io / tom123`);

  const tomSubs = [
    { name: 'Slack Pro',           category: 'Productivity',     cost: 7.25,   currency: 'USD', billingCycle: 'monthly', startDate: new Date('2022-03-01'), status: 'active',    notes: 'Team workspace, 8 members' },
    { name: 'Zoom Business',       category: 'Productivity',     cost: 199.90, currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2023-06-01'), status: 'active',    notes: '10 licenses for the team' },
    { name: 'HubSpot Starter',     category: 'Business',         cost: 20.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-01-01'), status: 'active',    notes: 'CRM + email marketing' },
    { name: 'Ahrefs',              category: 'Business',         cost: 99.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-08-01'), status: 'active',    notes: 'SEO toolset for content marketing' },
    { name: 'Notion Business',     category: 'Productivity',     cost: 16.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-05-01'), status: 'active',    notes: 'Team workspace with SAML SSO' },
    { name: 'Intercom',            category: 'Business',         cost: 74.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-02-01'), status: 'active',    notes: 'Customer support chat' },
    { name: 'Webflow Business',    category: 'Developer Tools',  cost: 36.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-10-01'), status: 'active',    notes: 'Company marketing site' },
    { name: 'Zapier Professional', category: 'Productivity',     cost: 49.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-04-01'), status: 'active',    notes: 'Workflow automation, 2000 tasks/mo' },
    { name: 'Google Workspace',    category: 'Productivity',     cost: 72.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2021-11-01'), status: 'active',    notes: 'Business Starter, 6 users × $12' },
    { name: 'Typeform',            category: 'Business',         cost: 25.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-07-01'), status: 'cancelled', notes: 'Survey tool — replaced with Tally' },
    { name: 'Semrush Pro',         category: 'Business',         cost: 139.95, currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-01-15'), status: 'paused',    notes: 'Keyword research — paused Q2 budget review' },
  ];

  for (const sub of tomSubs) {
    await prisma.subscription.create({ data: { ...sub, nextPayment: nextPayment(sub.startDate, sub.billingCycle), userId: tom.id } });
    console.log(`   ✅ ${sub.name}`);
  }

  // ── 9. nika_art ──────────────────────────────────────────────────────────────
  const nikaHash = await bcrypt.hash('nika123', 12);
  const nika = await prisma.user.create({
    data: { username: 'nika_art', email: 'nika.art@gmail.com', passwordHash: nikaHash, role: 'user' },
  });
  console.log(`\n✅ nika_art  (id:${nika.id})  nika.art@gmail.com / nika123`);

  const nikaSubs = [
    { name: 'Midjourney',        category: 'AI Tools',         cost: 30.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-08-01'), status: 'active',    notes: 'Standard plan, ~200 GPU hours' },
    { name: 'Adobe Firefly',     category: 'AI Tools',         cost: 4.99,   currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-05-01'), status: 'active',    notes: 'Generative credits add-on' },
    { name: 'Procreate Dreams',  category: 'Productivity',     cost: 19.99,  currency: 'USD', billingCycle: 'yearly',  startDate: new Date('2024-01-01'), status: 'active',    notes: 'Animation on iPad' },
    { name: 'Behance Premium',   category: 'Productivity',     cost: 9.99,   currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-11-01'), status: 'cancelled', notes: 'Not worth it over free tier' },
    { name: 'ElevenLabs',        category: 'AI Tools',         cost: 22.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-06-01'), status: 'active',    notes: 'Voice AI for reels and shorts' },
    { name: 'Patreon',           category: 'Entertainment',    cost: 15.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2023-04-01'), status: 'active',    notes: 'Supporting 3 creators' },
    { name: 'Substack',          category: 'Education',        cost: 10.00,  currency: 'USD', billingCycle: 'monthly', startDate: new Date('2024-02-01'), status: 'active',    notes: 'Design & AI newsletter subscription' },
  ];

  for (const sub of nikaSubs) {
    await prisma.subscription.create({ data: { ...sub, nextPayment: nextPayment(sub.startDate, sub.billingCycle), userId: nika.id } });
    console.log(`   ✅ ${sub.name}`);
  }

  console.log('\n✨ Seed complete! 9 users, 69 subscriptions total.');
  console.log('\n── Credentials ────────────────────────────────');
  console.log('   admin         / admin123   (role: admin)');
  console.log('   testuser      / user123');
  console.log('   demo          / demo123');
  console.log('   alex_m        / alex123');
  console.log('   sofia_k       / sofia123');
  console.log('   dev_james     / james123');
  console.log('   maria_r       / maria123');
  console.log('   tom_business  / tom123');
  console.log('   nika_art      / nika123');
  console.log('───────────────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
