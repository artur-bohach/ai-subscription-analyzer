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

// ─── GET /subscriptions — list all ─────────────────────────────────────────────
router.get('/', async (req, res) => {
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
    console.error('Error fetching subscriptions:', err);
    req.flash('error', 'Failed to load subscriptions.');
    res.redirect('/');
  }
});

// ─── GET /subscriptions/new ─────────────────────────────────────────────────────
router.get('/new', (req, res) => {
  res.render('subscriptions/new', {
    title:       'Add Subscription',
    formData:    {},
    fieldErrors: {},
  });
});

// ─── POST /subscriptions — create ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  // Validate + sanitize (includes async duplicate-name check)
  const result = await validateSubscription(req.body, prisma, DEFAULT_USER_ID);

  if (!result.isValid) {
    return res.status(422).render('subscriptions/new', {
      title:       'Add Subscription',
      formData:    req.body,      // repopulate form with user's raw input
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
    console.error('Error creating subscription:', err);
    req.flash('error', 'Failed to save subscription. Please try again.');
    res.render('subscriptions/new', {
      title:       'Add Subscription',
      formData:    req.body,
      fieldErrors: {},
    });
  }
});

// ─── GET /subscriptions/:id — show ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!subscription) {
      req.flash('error', 'Subscription not found.');
      return res.redirect('/subscriptions');
    }

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
    console.error('Error fetching subscription:', err);
    req.flash('error', 'Failed to load subscription.');
    res.redirect('/subscriptions');
  }
});

// ─── GET /subscriptions/:id/edit ───────────────────────────────────────────────
router.get('/:id/edit', async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!subscription) {
      req.flash('error', 'Subscription not found.');
      return res.redirect('/subscriptions');
    }

    res.render('subscriptions/edit', {
      title:       `Edit — ${subscription.name}`,
      subscription,
      formData:    subscription,  // pre-populate with current DB values
      fieldErrors: {},
    });
  } catch (err) {
    console.error('Error loading edit form:', err);
    req.flash('error', 'Failed to load subscription for editing.');
    res.redirect('/subscriptions');
  }
});

// ─── PUT /subscriptions/:id — update (via method-override) ─────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  // Validate + sanitize; pass excludeId so the current record is skipped in
  // the duplicate-name check (updating the same subscription's name is fine)
  const result = await validateSubscription(req.body, prisma, DEFAULT_USER_ID, id);

  if (!result.isValid) {
    // Fetch the original subscription so the template has access to its id/name
    const subscription = await prisma.subscription.findUnique({ where: { id } });
    return res.status(422).render('subscriptions/edit', {
      title:       `Edit — ${subscription ? subscription.name : 'Subscription'}`,
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
    console.error('Error updating subscription:', err);
    req.flash('error', 'Failed to update subscription. Please try again.');
    res.redirect(`/subscriptions/${id}/edit`);
  }
});

// ─── DELETE /subscriptions/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!subscription) {
      req.flash('error', 'Subscription not found.');
      return res.redirect('/subscriptions');
    }

    await prisma.subscription.delete({
      where: { id: parseInt(req.params.id) },
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
