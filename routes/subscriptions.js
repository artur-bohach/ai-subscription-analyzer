const express = require('express');
const router = express.Router();
const { getPrismaClient } = require('../utils/helpers');
const {
  normalizeToMonthly,
  formatCurrency,
  calculateNextPayment,
  getCategoryIcon
} = require('../utils/helpers');

const prisma = getPrismaClient();

// Default userId for demo (FR5 auth is a stub)
const DEFAULT_USER_ID = 1;

// ─── GET /subscriptions — list all ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate summary stats
    const active = subscriptions.filter(s => s.status === 'active');
    const monthlyTotal = active.reduce((sum, s) => {
      return sum + normalizeToMonthly(Number(s.cost), s.billingCycle);
    }, 0);

    res.render('subscriptions/index', {
      title: 'My Subscriptions',
      subscriptions,
      monthlyTotal: monthlyTotal.toFixed(2),
      yearlyTotal: (monthlyTotal * 12).toFixed(2),
      activeCount: active.length,
      formatCurrency,
      getCategoryIcon,
      normalizeToMonthly
    });
  } catch (err) {
    console.error('Error fetching subscriptions:', err);
    req.flash('error', 'Failed to load subscriptions.');
    res.redirect('/');
  }
});

// ─── GET /subscriptions/new ─────────────────────────────────────────────────────
router.get('/new', (req, res) => {
  res.render('subscriptions/new', {
    title: 'Add Subscription',
    formData: {},
    errors: []
  });
});

// ─── POST /subscriptions — create ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, category, cost, currency, billingCycle, startDate, status, notes } = req.body;

  // Server-side validation
  const errors = [];
  if (!name || name.trim() === '') errors.push('Name is required.');
  if (!category) errors.push('Category is required.');
  if (!cost || isNaN(cost) || Number(cost) <= 0) errors.push('Cost must be a positive number.');
  if (!billingCycle) errors.push('Billing cycle is required.');
  if (!startDate) errors.push('Start date is required.');

  if (errors.length > 0) {
    return res.render('subscriptions/new', {
      title: 'Add Subscription',
      formData: req.body,
      errors
    });
  }

  try {
    const parsedStart = new Date(startDate);
    const nextPayment = calculateNextPayment(parsedStart, billingCycle);

    await prisma.subscription.create({
      data: {
        name: name.trim(),
        category,
        cost: parseFloat(cost),
        currency: currency || 'EUR',
        billingCycle,
        startDate: parsedStart,
        nextPayment,
        status: status || 'active',
        notes: notes ? notes.trim() : null,
        userId: DEFAULT_USER_ID
      }
    });

    req.flash('success', `"${name}" subscription added successfully!`);
    res.redirect('/subscriptions');
  } catch (err) {
    console.error('Error creating subscription:', err);
    req.flash('error', 'Failed to create subscription. Please try again.');
    res.render('subscriptions/new', {
      title: 'Add Subscription',
      formData: req.body,
      errors: ['Server error. Please try again.']
    });
  }
});

// ─── GET /subscriptions/:id — show ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!subscription) {
      req.flash('error', 'Subscription not found.');
      return res.redirect('/subscriptions');
    }

    const monthly = normalizeToMonthly(Number(subscription.cost), subscription.billingCycle);

    res.render('subscriptions/show', {
      title: subscription.name,
      subscription,
      monthlyEquivalent: monthly.toFixed(2),
      yearlyEquivalent: (monthly * 12).toFixed(2),
      formatCurrency,
      getCategoryIcon
    });
  } catch (err) {
    console.error('Error fetching subscription:', err);
    req.flash('error', 'Failed to load subscription.');
    res.redirect('/subscriptions');
  }
});

// ─── GET /subscriptions/:id/edit ───────────────────────────────────────────────
router.get('/:id/edit', async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!subscription) {
      req.flash('error', 'Subscription not found.');
      return res.redirect('/subscriptions');
    }

    res.render('subscriptions/edit', {
      title: `Edit — ${subscription.name}`,
      subscription,
      formData: subscription,
      errors: []
    });
  } catch (err) {
    console.error('Error loading edit form:', err);
    req.flash('error', 'Failed to load subscription for editing.');
    res.redirect('/subscriptions');
  }
});

// ─── POST /subscriptions/:id — update (method-override PUT) ────────────────────
router.put('/:id', async (req, res) => {
  const { name, category, cost, currency, billingCycle, startDate, status, notes } = req.body;
  const id = parseInt(req.params.id);

  // Server-side validation
  const errors = [];
  if (!name || name.trim() === '') errors.push('Name is required.');
  if (!category) errors.push('Category is required.');
  if (!cost || isNaN(cost) || Number(cost) <= 0) errors.push('Cost must be a positive number.');
  if (!billingCycle) errors.push('Billing cycle is required.');
  if (!startDate) errors.push('Start date is required.');

  if (errors.length > 0) {
    const subscription = await prisma.subscription.findUnique({ where: { id } });
    return res.render('subscriptions/edit', {
      title: `Edit — ${name}`,
      subscription,
      formData: req.body,
      errors
    });
  }

  try {
    const parsedStart = new Date(startDate);
    const nextPayment = calculateNextPayment(parsedStart, billingCycle);

    await prisma.subscription.update({
      where: { id },
      data: {
        name: name.trim(),
        category,
        cost: parseFloat(cost),
        currency: currency || 'EUR',
        billingCycle,
        startDate: parsedStart,
        nextPayment,
        status: status || 'active',
        notes: notes ? notes.trim() : null
      }
    });

    req.flash('success', `"${name}" updated successfully!`);
    res.redirect(`/subscriptions/${id}`);
  } catch (err) {
    console.error('Error updating subscription:', err);
    req.flash('error', 'Failed to update subscription.');
    res.redirect(`/subscriptions/${id}/edit`);
  }
});

// ─── POST /subscriptions/:id/delete — delete (method-override DELETE) ──────────
router.delete('/:id', async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!subscription) {
      req.flash('error', 'Subscription not found.');
      return res.redirect('/subscriptions');
    }

    await prisma.subscription.delete({
      where: { id: parseInt(req.params.id) }
    });

    req.flash('success', `"${subscription.name}" deleted successfully.`);
    res.redirect('/subscriptions');
  } catch (err) {
    console.error('Error deleting subscription:', err);
    req.flash('error', 'Failed to delete subscription.');
    res.redirect('/subscriptions');
  }
});

module.exports = router;
