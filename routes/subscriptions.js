'use strict';

const express = require('express');
const router  = express.Router();

const {
  getPrismaClient,
  normalizeToMonthly,
  formatCurrency,
  calculateNextPayment,
  getCategoryIcon,
} = require('../utils/helpers');

const { validateSubscription } = require('../utils/validators');
const { isAuthenticated }      = require('../middleware/auth');

const prisma = getPrismaClient();

// All subscription routes require a signed-in user
router.use(isAuthenticated);

// ─── Helpers ───────────────────────────────────────────────────────────────────

const BC_ROOT = { label: 'Home', url: '/' };
const BC_LIST = { label: 'Subscriptions', url: '/subscriptions' };

/** Render the 404 error page with an optional contextual message. */
function renderNotFound(res, message) {
  return res.status(404).render('errors/404', {
    title:   '404 — Not Found',
    layout:  'layouts/main',
    message: message || "The subscription you're looking for doesn't exist or has been deleted.",
  });
}

/** Parse and validate a route :id param. Returns the integer or NaN. */
function parseId(str) {
  const id = parseInt(str, 10);
  return Number.isFinite(id) ? id : NaN;
}

/**
 * Build the ownership filter for a subscription query.
 * Admin sees all subscriptions; regular users only their own.
 */
function ownerFilter(id, res) {
  if (res.locals.isAdmin) return { id };
  return { id, userId: res.locals.currentUser.id };
}

/** Get current user's ID from res.locals. */
function currentUserId(res) {
  return res.locals.currentUser.id;
}

// ─── GET /subscriptions — list all ─────────────────────────────────────────────
router.get('/', async (_req, res, next) => {
  try {
    const userId = currentUserId(res);
    const subscriptions = await prisma.subscription.findMany({
      where:   res.locals.isAdmin ? {} : { userId },
      orderBy: { createdAt: 'desc' },
    });

    const active       = subscriptions.filter(s => s.status === 'active');
    const monthlyTotal = active.reduce(
      (sum, s) => sum + normalizeToMonthly(Number(s.cost), s.billingCycle), 0
    );

    res.render('subscriptions/index', {
      title:        'My Subscriptions',
      breadcrumbs:  [BC_ROOT, { label: 'Subscriptions' }],
      subscriptions,
      monthlyTotal: monthlyTotal.toFixed(2),
      yearlyTotal:  (monthlyTotal * 12).toFixed(2),
      activeCount:  active.length,
      formatCurrency,
      getCategoryIcon,
      normalizeToMonthly,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /subscriptions/new ─────────────────────────────────────────────────────
router.get('/new', (_req, res) => {
  res.render('subscriptions/new', {
    title:       'Add Subscription',
    breadcrumbs: [BC_ROOT, BC_LIST, { label: 'New Subscription' }],
    formData:    {},
    fieldErrors: {},
  });
});

// ─── POST /subscriptions — create ──────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  const userId = currentUserId(res);
  let result;
  try {
    result = await validateSubscription(req.body, prisma, userId);
  } catch (err) {
    return next(err);
  }

  if (!result.isValid) {
    return res.status(422).render('subscriptions/new', {
      title:       'Add Subscription',
      breadcrumbs: [BC_ROOT, BC_LIST, { label: 'New Subscription' }],
      formData:    req.body,
      fieldErrors: result.errors,
    });
  }

  try {
    const { sanitized } = result;
    const parsedStart = new Date(sanitized.startDate + 'T00:00:00');
    const nextPayment = calculateNextPayment(parsedStart, sanitized.billingCycle);

    await prisma.subscription.create({
      data: {
        name:         sanitized.name,
        category:     sanitized.category,
        cost:         sanitized.cost,
        currency:     sanitized.currency,
        billingCycle: sanitized.billingCycle,
        startDate:    parsedStart,
        nextPayment,
        status:       sanitized.status,
        notes:        sanitized.notes,
        userId,
      },
    });

    req.flash('success', `"${sanitized.name}" subscription added successfully!`);
    res.redirect('/subscriptions');
  } catch (err) {
    req.flash('error', 'Failed to save subscription. Please try again.');
    res.status(500).render('subscriptions/new', {
      title:       'Add Subscription',
      breadcrumbs: [BC_ROOT, BC_LIST, { label: 'New Subscription' }],
      formData:    req.body,
      fieldErrors: {},
    });
  }
});

// ─── GET /subscriptions/:id — show ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (isNaN(id)) return renderNotFound(res);

  try {
    const subscription = await prisma.subscription.findFirst({ where: ownerFilter(id, res) });
    if (!subscription) return renderNotFound(res);

    const monthly = normalizeToMonthly(Number(subscription.cost), subscription.billingCycle);

    res.render('subscriptions/show', {
      title:             subscription.name,
      breadcrumbs:       [BC_ROOT, BC_LIST, { label: subscription.name }],
      subscription,
      monthlyEquivalent: monthly.toFixed(2),
      yearlyEquivalent:  (monthly * 12).toFixed(2),
      formatCurrency,
      getCategoryIcon,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /subscriptions/:id/edit ───────────────────────────────────────────────
router.get('/:id/edit', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (isNaN(id)) return renderNotFound(res);

  try {
    const subscription = await prisma.subscription.findFirst({ where: ownerFilter(id, res) });
    if (!subscription) return renderNotFound(res);

    res.render('subscriptions/edit', {
      title:       `Edit — ${subscription.name}`,
      breadcrumbs: [BC_ROOT, BC_LIST, { label: subscription.name, url: `/subscriptions/${id}` }, { label: 'Edit' }],
      subscription,
      formData:    subscription,
      fieldErrors: {},
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /subscriptions/:id — update (via method-override) ─────────────────────
router.put('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (isNaN(id)) return renderNotFound(res);

  const userId = currentUserId(res);
  let result;
  try {
    result = await validateSubscription(req.body, prisma, userId, id);
  } catch (err) {
    return next(err);
  }

  if (!result.isValid) {
    let subscription = null;
    try {
      subscription = await prisma.subscription.findFirst({ where: ownerFilter(id, res) });
    } catch (_) { /* non-critical */ }

    if (!subscription) return renderNotFound(res);

    return res.status(422).render('subscriptions/edit', {
      title:       `Edit — ${subscription.name}`,
      breadcrumbs: [BC_ROOT, BC_LIST, { label: subscription.name, url: `/subscriptions/${id}` }, { label: 'Edit' }],
      subscription,
      formData:    req.body,
      fieldErrors: result.errors,
    });
  }

  try {
    const { sanitized } = result;
    const parsedStart = new Date(sanitized.startDate + 'T00:00:00');
    const nextPayment = calculateNextPayment(parsedStart, sanitized.billingCycle);

    // Verify ownership before update
    const existing = await prisma.subscription.findFirst({ where: ownerFilter(id, res) });
    if (!existing) return renderNotFound(res);

    await prisma.subscription.update({
      where: { id },
      data: {
        name:         sanitized.name,
        category:     sanitized.category,
        cost:         sanitized.cost,
        currency:     sanitized.currency,
        billingCycle: sanitized.billingCycle,
        startDate:    parsedStart,
        nextPayment,
        status:       sanitized.status,
        notes:        sanitized.notes,
      },
    });

    req.flash('success', `"${sanitized.name}" updated successfully!`);
    res.redirect(`/subscriptions/${id}`);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /subscriptions/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (isNaN(id)) return renderNotFound(res);

  try {
    const subscription = await prisma.subscription.findFirst({ where: ownerFilter(id, res) });
    if (!subscription) return renderNotFound(res);

    await prisma.subscription.delete({ where: { id } });

    req.flash('success', `"${subscription.name}" deleted successfully.`);
    res.redirect('/subscriptions');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
