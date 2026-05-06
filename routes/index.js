const express = require('express');
const router  = express.Router();

const { getPrismaClient, normalizeToMonthly, formatCurrency, calculateNextPayment, getCategoryIcon } = require('../utils/helpers');
const { isAuthenticated } = require('../middleware/auth');
const prisma = getPrismaClient();

// ─── Home Page ─────────────────────────────────────────────────────────────────
router.get('/', (_req, res) => {
  res.render('home', { title: 'SubTracker' });
});

// ─── /home alias ───────────────────────────────────────────────────────────────
router.get('/home', (_req, res) => {
  res.redirect(301, '/');
});

// ─── About Page ────────────────────────────────────────────────────────────────
router.get('/about', (_req, res) => {
  res.render('about', {
    title:       'About - SubTracker',
    breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'About' }],
  });
});

// ─── Contact Page ──────────────────────────────────────────────────────────────
router.get('/contact', (_req, res) => {
  res.render('contact', {
    title:       'Contact - SubTracker',
    breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'Contact' }],
  });
});

// ─── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', isAuthenticated, async (req, res, next) => {
  try {
    const userId = res.locals.currentUser.id;
    const subscriptions = await prisma.subscription.findMany({
      where:   { userId },
      orderBy: { createdAt: 'asc' },
    });

    const active  = subscriptions.filter(s => s.status === 'active');
    const paused  = subscriptions.filter(s => s.status === 'paused');

    // ── Summary stats ──────────────────────────────────────────────────────────
    const monthlyTotal = active.reduce((sum, s) => sum + normalizeToMonthly(Number(s.cost), s.billingCycle), 0);
    const yearlyTotal  = monthlyTotal * 12;
    // Only paused subscriptions are "potential savings" — cancelled are already gone
    const potentialSavings = paused.reduce((sum, s) => sum + normalizeToMonthly(Number(s.cost), s.billingCycle), 0);

    // ── Doughnut: spending by category ────────────────────────────────────────
    const catMap = {};
    active.forEach(s => {
      const m = normalizeToMonthly(Number(s.cost), s.billingCycle);
      catMap[s.category] = (catMap[s.category] || 0) + m;
    });
    const CATEGORY_COLORS = {
      'Entertainment':    '#8B5CF6',
      'Productivity':     '#3B82F6',
      'AI Tools':         '#10B981',
      'Music & Audio':    '#EC4899',
      'Education':        '#F59E0B',
      'Cloud & Storage':  '#06B6D4',
      'Health & Fitness': '#F97316',
      'News & Media':     '#EF4444',
      'Other':            '#6B7280',
    };
    const categoryChartData = {
      labels: Object.keys(catMap),
      amounts: Object.values(catMap).map(v => parseFloat(v.toFixed(2))),
      colors: Object.keys(catMap).map(k => CATEGORY_COLORS[k] || '#6B7280'),
      total: parseFloat(monthlyTotal.toFixed(2)),
    };

    // ── Horizontal bar: cost per subscription ─────────────────────────────────
    const sortedActive = [...active].sort((a, b) =>
      normalizeToMonthly(Number(b.cost), b.billingCycle) - normalizeToMonthly(Number(a.cost), a.billingCycle)
    );
    const barChartData = {
      labels:  sortedActive.map(s => s.name),
      amounts: sortedActive.map(s => parseFloat(normalizeToMonthly(Number(s.cost), s.billingCycle).toFixed(2))),
      colors:  sortedActive.map(s => CATEGORY_COLORS[s.category] || '#6B7280'),
    };

    // ── Line chart: spending over last 6 months ────────────────────────────────
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d);
    }
    const lineLabels  = months.map(d => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    const lineAmounts = months.map(month => {
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
      // Include every subscription that had started by the end of this month.
      // We use startDate only — we don't store cancelledAt, so current status
      // would silently erase spending history for since-cancelled subscriptions.
      const activeThen = subscriptions.filter(s => new Date(s.startDate) <= monthEnd);
      return parseFloat(activeThen.reduce((sum, s) => sum + normalizeToMonthly(Number(s.cost), s.billingCycle), 0).toFixed(2));
    });
    const lineChartData = { labels: lineLabels, amounts: lineAmounts };

    // ── Upcoming payments (next 10) ────────────────────────────────────────────
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const upcomingPayments = active
      .map(s => {
        // nextPayment stored in DB is set at creation time and never auto-updated.
        // After one billing cycle passes that date becomes stale (in the past).
        // Always recalculate to guarantee a future date.
        const stored = s.nextPayment ? new Date(s.nextPayment) : null;
        const next = (stored && stored > now)
          ? stored
          : calculateNextPayment(new Date(s.startDate), s.billingCycle);
        return { ...s, computedNext: next, costNum: Number(s.cost) };
      })
      .sort((a, b) => a.computedNext - b.computedNext)
      .slice(0, 8)
      .map(s => ({
        id:       s.id,
        name:     s.name,
        category: s.category,
        cost:     formatCurrency(s.costNum, s.currency),
        monthly:  parseFloat(normalizeToMonthly(s.costNum, s.billingCycle).toFixed(2)),
        currency: s.currency,
        nextDate: s.computedNext.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        daysUntil: Math.ceil((s.computedNext - now) / (1000 * 60 * 60 * 24)),
        urgent:   s.computedNext <= threeDaysFromNow,
        icon:     getCategoryIcon(s.category),
      }));

    // ── Subscription breakdown (sorted by monthly cost desc) ──────────────────
    const breakdown = active
      .map(s => {
        const m = normalizeToMonthly(Number(s.cost), s.billingCycle);
        return {
          id:       s.id,
          name:     s.name,
          category: s.category,
          monthly:  parseFloat(m.toFixed(2)),
          pct:      monthlyTotal > 0 ? parseFloat(((m / monthlyTotal) * 100).toFixed(1)) : 0,
          color:    CATEGORY_COLORS[s.category] || '#6B7280',
        };
      })
      .sort((a, b) => b.monthly - a.monthly);

    res.render('dashboard', {
      title:        'Dashboard',
      breadcrumbs:  [{ label: 'Home', url: '/' }, { label: 'Dashboard' }],
      stats: {
        monthlyTotal:    parseFloat(monthlyTotal.toFixed(2)),
        yearlyTotal:     parseFloat(yearlyTotal.toFixed(2)),
        activeCount:     active.length,
        potentialSavings: parseFloat(potentialSavings.toFixed(2)),
      },
      categoryChartData,
      barChartData,
      lineChartData,
      upcomingPayments,
      breakdown,
      hasSubscriptions: active.length > 0,
      totalSubs: subscriptions.length,
    });
  } catch (err) { next(err); }
});

module.exports = router;
