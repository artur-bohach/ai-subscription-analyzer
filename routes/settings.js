'use strict';

const express = require('express');
const router  = express.Router();
const { getPrismaClient } = require('../utils/helpers');
const { isAuthenticated } = require('../middleware/auth');
const prisma = getPrismaClient();

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

router.use(isAuthenticated);

// ─── Internal helper — re-render settings with errors ──────────────────────────
async function _render(res, next, userId, { activeSection = 'general', fieldErrors = {} } = {}) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return res.status(422).render('settings', {
      title:         'Settings — SubTracker',
      breadcrumbs:   [{ label: 'Home', url: '/' }, { label: 'Settings' }],
      profileUser:   user,
      activeSection,
      fieldErrors,
    });
  } catch (err) { next(err); }
}

// ─── GET /settings ─────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: res.locals.currentUser.id },
    });

    res.render('settings', {
      title:         'Settings — SubTracker',
      breadcrumbs:   [{ label: 'Home', url: '/' }, { label: 'Settings' }],
      profileUser:   user,
      activeSection: req.query.section || 'general',
      fieldErrors:   {},
    });
  } catch (err) { next(err); }
});

// ─── POST /settings/general — update display name + email ──────────────────────
router.post('/general', async (req, res, next) => {
  const userId = res.locals.currentUser.id;
  const { username, email } = req.body;
  const fieldErrors = {};

  const cleanUsername = (username || '').trim();
  const cleanEmail    = (email    || '').trim().toLowerCase();

  if (!cleanUsername)                fieldErrors.username = 'Display name is required.';
  else if (cleanUsername.length < 3) fieldErrors.username = 'Must be at least 3 characters.';
  else if (cleanUsername.length > 30) fieldErrors.username = 'Must be 30 characters or fewer.';
  else if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) fieldErrors.username = 'Letters, numbers, _ and - only.';

  if (!cleanEmail)                      fieldErrors.email = 'Email is required.';
  else if (!EMAIL_RE.test(cleanEmail))  fieldErrors.email = 'Enter a valid email address.';

  if (Object.keys(fieldErrors).length > 0) {
    return _render(res, next, userId, { activeSection: 'general', fieldErrors });
  }

  try {
    const [byUsername, byEmail] = await Promise.all([
      prisma.user.findFirst({ where: { username: { equals: cleanUsername, mode: 'insensitive' }, NOT: { id: userId } } }),
      prisma.user.findFirst({ where: { email: cleanEmail, NOT: { id: userId } } }),
    ]);

    if (byUsername) fieldErrors.username = 'This username is already taken.';
    if (byEmail)    fieldErrors.email    = 'This email is already in use.';

    if (Object.keys(fieldErrors).length > 0) {
      return _render(res, next, userId, { activeSection: 'general', fieldErrors });
    }

    await prisma.user.update({ where: { id: userId }, data: { username: cleanUsername, email: cleanEmail } });
    req.flash('success', 'Settings saved successfully.');
    res.redirect('/settings?section=general');
  } catch (err) { next(err); }
});

// ─── POST /settings/export — download all user data as JSON ────────────────────
router.post('/export', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: res.locals.currentUser.id },
      select: {
        id: true, username: true, email: true, role: true, createdAt: true,
        subscriptions: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, name: true, category: true, cost: true, currency: true,
            billingCycle: true, startDate: true, nextPayment: true,
            status: true, notes: true, createdAt: true, updatedAt: true,
          },
        },
      },
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      user: {
        id:        user.id,
        username:  user.username,
        email:     user.email,
        role:      user.role,
        createdAt: user.createdAt,
      },
      subscriptions: user.subscriptions.map(s => ({ ...s, cost: Number(s.cost) })),
    };

    const date     = new Date().toISOString().slice(0, 10);
    const filename = `subtracker-${user.username}-${date}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) { next(err); }
});

// ─── POST /settings/delete-account ────────────────────────────────────────────
router.post('/delete-account', async (req, res, next) => {
  const userId     = res.locals.currentUser.id;
  const { confirmText } = req.body;

  if (!confirmText || confirmText.trim() !== 'DELETE') {
    req.flash('error', 'Type DELETE (all caps) to confirm account deletion.');
    return res.redirect('/settings?section=privacy');
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
    req.session.destroy(() => res.redirect('/'));
  } catch (err) { next(err); }
});

module.exports = router;
