'use strict';

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const { getPrismaClient, normalizeToMonthly } = require('../utils/helpers');
const { isAuthenticated } = require('../middleware/auth');
const prisma = getPrismaClient();

const SALT_ROUNDS = 12;
const EMAIL_RE    = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

router.use(isAuthenticated);

// ─── GET /profile ─────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: res.locals.currentUser.id },
      include: { subscriptions: true },
    });

    const active       = user.subscriptions.filter(s => s.status === 'active');
    const monthlyTotal = active.reduce(
      (sum, s) => sum + normalizeToMonthly(Number(s.cost), s.billingCycle), 0
    );

    res.render('profile', {
      title:       'Profile & Settings',
      breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'Profile' }],
      profileUser:  user,
      stats: {
        subCount:    user.subscriptions.length,
        monthlyTotal: parseFloat(monthlyTotal.toFixed(2)),
      },
      fieldErrors:  {},
      pwdErrors:    {},
      activeTab:    req.query.tab || 'profile',
    });
  } catch (err) { next(err); }
});

// ─── POST /profile — update username/email ────────────────────────────────────
router.post('/', async (req, res, next) => {
  const userId = res.locals.currentUser.id;
  const { username, email } = req.body;
  const fieldErrors = {};

  const cleanUsername = (username || '').trim();
  const cleanEmail    = (email    || '').trim().toLowerCase();

  if (!cleanUsername)              fieldErrors.username = 'Username is required.';
  else if (cleanUsername.length < 3) fieldErrors.username = 'Must be at least 3 characters.';
  else if (cleanUsername.length > 30) fieldErrors.username = 'Must be 30 characters or fewer.';
  else if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) fieldErrors.username = 'Letters, numbers, _ and - only.';

  if (!cleanEmail)                 fieldErrors.email = 'Email is required.';
  else if (!EMAIL_RE.test(cleanEmail)) fieldErrors.email = 'Enter a valid email address.';

  if (Object.keys(fieldErrors).length > 0) {
    return _renderProfile(res, next, userId, { fieldErrors, activeTab: 'profile' });
  }

  try {
    const [byUsername, byEmail] = await Promise.all([
      prisma.user.findFirst({ where: { username: { equals: cleanUsername, mode: 'insensitive' }, NOT: { id: userId } } }),
      prisma.user.findFirst({ where: { email: cleanEmail, NOT: { id: userId } } }),
    ]);

    if (byUsername) fieldErrors.username = 'This username is already taken.';
    if (byEmail)    fieldErrors.email    = 'This email is already in use.';

    if (Object.keys(fieldErrors).length > 0) {
      return _renderProfile(res, next, userId, { fieldErrors, activeTab: 'profile' });
    }

    await prisma.user.update({ where: { id: userId }, data: { username: cleanUsername, email: cleanEmail } });

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/profile?tab=profile');
  } catch (err) { next(err); }
});

// ─── POST /profile/password — change password ─────────────────────────────────
router.post('/password', async (req, res, next) => {
  const userId = res.locals.currentUser.id;
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const pwdErrors = {};

  if (!currentPassword)              pwdErrors.currentPassword    = 'Current password is required.';
  if (!newPassword)                  pwdErrors.newPassword        = 'New password is required.';
  else if (newPassword.length < 6)   pwdErrors.newPassword        = 'Must be at least 6 characters.';
  else if (newPassword.length > 128) pwdErrors.newPassword        = 'Password is too long.';
  if (!confirmNewPassword)           pwdErrors.confirmNewPassword = 'Please confirm your new password.';
  else if (newPassword !== confirmNewPassword) pwdErrors.confirmNewPassword = 'Passwords do not match.';

  if (Object.keys(pwdErrors).length > 0) {
    return _renderProfile(res, next, userId, { pwdErrors, activeTab: 'password' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!valid) {
      return _renderProfile(res, next, userId, {
        pwdErrors: { currentPassword: 'Incorrect current password.' },
        activeTab: 'password',
      });
    }

    if (currentPassword === newPassword) {
      return _renderProfile(res, next, userId, {
        pwdErrors: { newPassword: 'New password must differ from current password.' },
        activeTab: 'password',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    req.flash('success', 'Password updated successfully.');
    res.redirect('/profile?tab=password');
  } catch (err) { next(err); }
});

// ─── DELETE /profile — delete account ────────────────────────────────────────
router.delete('/', async (req, res, next) => {
  const userId = res.locals.currentUser.id;
  const { confirmUsername } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!confirmUsername || confirmUsername.trim() !== user.username) {
      req.flash('error', 'Username confirmation did not match. Account not deleted.');
      return res.redirect('/profile?tab=danger');
    }

    // Cascade delete via Prisma schema (subscriptions deleted automatically)
    await prisma.user.delete({ where: { id: userId } });

    req.session.destroy(() => {
      res.redirect('/?deleted=1');
    });
  } catch (err) { next(err); }
});

// ─── Internal helper — re-render profile with errors ──────────────────────────
async function _renderProfile(res, next, userId, { fieldErrors = {}, pwdErrors = {}, activeTab = 'profile' }) {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: userId },
      include: { subscriptions: true },
    });
    const active       = user.subscriptions.filter(s => s.status === 'active');
    const monthlyTotal = active.reduce(
      (sum, s) => sum + normalizeToMonthly(Number(s.cost), s.billingCycle), 0
    );
    res.status(422).render('profile', {
      title:       'Profile & Settings',
      breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'Profile' }],
      profileUser:  user,
      stats: {
        subCount:    user.subscriptions.length,
        monthlyTotal: parseFloat(monthlyTotal.toFixed(2)),
      },
      fieldErrors,
      pwdErrors,
      activeTab,
    });
  } catch (err) { next(err); }
}

module.exports = router;
