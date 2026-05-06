'use strict';

const express = require('express');
const router  = express.Router();
const { getPrismaClient, normalizeToMonthly } = require('../utils/helpers');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const prisma = getPrismaClient();

// All admin routes require auth + admin role
router.use(isAuthenticated, isAdmin);

// ─── GET /admin ─────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const [users, subscriptions] = await Promise.all([
      prisma.user.findMany({
        include: { subscriptions: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.subscription.findMany({
        include: { user: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Stats
    const totalUsers = users.length;
    const totalSubs  = subscriptions.length;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsersThisWeek = users.filter(u => new Date(u.createdAt) >= oneWeekAgo).length;

    const totalMonthlyRevenue = subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + normalizeToMonthly(Number(s.cost), s.billingCycle), 0);

    const avgPerUser = totalUsers > 0 ? totalMonthlyRevenue / totalUsers : 0;

    // Bar chart: top 10 most popular services
    const serviceCount = {};
    subscriptions.forEach(s => {
      serviceCount[s.name] = (serviceCount[s.name] || 0) + 1;
    });
    const topServices = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Pie chart: users by subscription count buckets
    const buckets = { '1–3': 0, '4–6': 0, '7–10': 0, '10+': 0, 'None': 0 };
    users.forEach(u => {
      const n = u.subscriptions.length;
      if (n === 0)       buckets['None']++;
      else if (n <= 3)   buckets['1–3']++;
      else if (n <= 6)   buckets['4–6']++;
      else if (n <= 10)  buckets['7–10']++;
      else               buckets['10+']++;
    });
    const subBuckets = Object.entries(buckets).map(([label, count]) => ({ label, count }));

    // Recent 5 users & subscriptions
    const recentUsers = users.slice(0, 5);
    const recentSubs  = subscriptions.slice(0, 5);

    res.render('admin/dashboard', {
      layout: 'layouts/admin',
      title: 'Admin Dashboard',
      stats: { totalUsers, totalSubs, totalMonthlyRevenue, avgPerUser, newUsersThisWeek },
      topServices,
      subBuckets,
      recentUsers,
      recentSubs,
    });
  } catch (err) { next(err); }
});

// ─── GET /admin/users ────────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: { subscriptions: true },
      orderBy: { createdAt: 'desc' }
    });

    const usersWithStats = users.map(u => {
      const monthly = u.subscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + normalizeToMonthly(Number(s.cost), s.billingCycle), 0);
      return { ...u, monthlyTotal: monthly, subCount: u.subscriptions.length };
    });

    res.render('admin/users/index', {
      layout: 'layouts/admin',
      title: 'User Management',
      users: usersWithStats,
    });
  } catch (err) { next(err); }
});

// ─── GET /admin/users/:id ─────────────────────────────────────────────────────
router.get('/users/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.redirect('/admin/users');

    const user = await prisma.user.findUnique({
      where: { id },
      include: { subscriptions: { orderBy: { createdAt: 'desc' } } }
    });
    if (!user) { req.flash('error', 'User not found.'); return res.redirect('/admin/users'); }

    const monthlyTotal = user.subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + normalizeToMonthly(Number(s.cost), s.billingCycle), 0);
    const yearlyTotal = monthlyTotal * 12;

    res.render('admin/users/show', {
      layout: 'layouts/admin',
      title: `User: ${user.username}`,
      user,
      stats: { monthlyTotal, yearlyTotal, subCount: user.subscriptions.length },
    });
  } catch (err) { next(err); }
});

// ─── DELETE /admin/users/:id ──────────────────────────────────────────────────
router.delete('/users/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.redirect('/admin/users');

    if (id === res.locals.currentUser.id) {
      req.flash('error', 'You cannot delete your own account.');
      return res.redirect('/admin/users');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) { req.flash('error', 'User not found.'); return res.redirect('/admin/users'); }

    // Cascade delete handled by Prisma schema (onDelete: Cascade)
    await prisma.user.delete({ where: { id } });

    req.flash('success', `User "${user.username}" and all their subscriptions have been deleted.`);
    res.redirect('/admin/users');
  } catch (err) { next(err); }
});

// ─── GET /admin/subscriptions ─────────────────────────────────────────────────
router.get('/subscriptions', async (req, res, next) => {
  try {
    const [subscriptions, users] = await Promise.all([
      prisma.subscription.findMany({
        include: { user: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.findMany({ orderBy: { username: 'asc' }, select: { id: true, username: true } })
    ]);

    const categories = [...new Set(subscriptions.map(s => s.category))].sort();

    res.render('admin/subscriptions', {
      layout: 'layouts/admin',
      title: 'All Subscriptions',
      subscriptions,
      users,
      categories,
    });
  } catch (err) { next(err); }
});

module.exports = router;
