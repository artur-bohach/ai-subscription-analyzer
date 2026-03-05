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

const prisma = getPrismaClient();

// Default userId for demo (FR5 auth is a stub)
const DEFAULT_USER_ID = 1;

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── GET /subscriptions — list all ─────────────────────────────────────────────
router.get('/', async (_req, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where:   { userId: DEFAULT_USER_ID },
      orderBy: { createdAt: 'desc' },
    });

    const active       = subscriptions.filter(s => s.status === 'active');
    const monthlyTotal = active.reduce(
      (sum, s) => sum + normalizeToMonthly(Number(s.cost), s.billingCycle), 0
    );

    res.render('subscriptions/index', {
      title:        'My Subscriptions',
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
    formData:    {},
    fieldErrors: {},
  });
});

// ─── POST /subscriptions — create ──────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  let result;
  try {
    result = await validateSubscription(req.body, prisma, DEFAULT_USER_ID);
  } catch (err) {
    return next(err);
  }

  if (!result.isValid) {
    return res.status(422).render('subscriptions/new', {
      title:       'Add Subscription',
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
        userId:       DEFAULT_USER_ID,
      },
    });

    req.flash('success', `"${sanitized.name}" subscription added successfully!`);
    res.redirect('/subscriptions');
  } catch (err) {
    // DB write failure: keep user on the form with a flash, not a 500 page
    req.flash('error', 'Failed to save subscription. Please try again.');
    res.status(500).render('subscriptions/new', {
      title:       'Add Subscription',
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
    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) return renderNotFound(res);

    const monthly = normalizeToMonthly(Number(subscription.cost), subscription.billingCycle);

    res.render('subscriptions/show', {
      title:             subscription.name,
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
    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) return renderNotFound(res);

    res.render('subscriptions/edit', {
      title:       `Edit — ${subscription.name}`,
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

  let result;
  try {
    result = await validateSubscription(req.body, prisma, DEFAULT_USER_ID, id);
  } catch (err) {
    return next(err);
  }

  if (!result.isValid) {
    // Fetch the record so the template can render the page title and back-link
    let subscription = null;
    try {
      subscription = await prisma.subscription.findUnique({ where: { id } });
    } catch (_) { /* non-critical; template handles null gracefully */ }

    if (!subscription) return renderNotFound(res);

    return res.status(422).render('subscriptions/edit', {
      title:       `Edit — ${subscription.name}`,
      subscription,
      formData:    req.body,
      fieldErrors: result.errors,
    });
  }

  try {
    const { sanitized } = result;
    const parsedStart = new Date(sanitized.startDate + 'T00:00:00');
    const nextPayment = calculateNextPayment(parsedStart, sanitized.billingCycle);

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
    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) return renderNotFound(res);

    await prisma.subscription.delete({ where: { id } });

    req.flash('success', `"${subscription.name}" deleted successfully.`);
    res.redirect('/subscriptions');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
