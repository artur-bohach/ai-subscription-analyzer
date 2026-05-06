'use strict';

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const { getPrismaClient } = require('../utils/helpers');
const { isGuest }          = require('../middleware/auth');

const prisma      = getPrismaClient();
const SALT_ROUNDS = 12;
const EMAIL_RE    = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const AUTH_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_LIMIT_MAX       = 10;
const authAttempts         = new Map();

function authRateKey(req) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function authLimiter(req, res, next) {
  const now = Date.now();
  const key = authRateKey(req);
  const current = authAttempts.get(key);
  const entry = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + AUTH_LIMIT_WINDOW_MS };

  entry.count += 1;
  authAttempts.set(key, entry);

  if (entry.count > AUTH_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).send('Too many attempts from this IP. Please try again in 15 minutes.');
  }

  next();
}

// ── GET /register ──────────────────────────────────────────────────────────────
router.get('/register', isGuest, (_req, res) => {
  res.render('auth/register', {
    layout:      'layouts/auth',
    title:       'Create Account — SubTracker',
    formData:    {},
    fieldErrors: {},
  });
});

// ── POST /register ─────────────────────────────────────────────────────────────
router.post('/register', authLimiter, isGuest, async (req, res, next) => {
  const { username, email, password, confirmPassword } = req.body;
  const formData    = { username: (username || '').trim(), email: (email || '').trim() };
  const fieldErrors = {};

  // — username
  const cleanUsername = formData.username;
  if (!cleanUsername) {
    fieldErrors.username = 'Username is required.';
  } else if (cleanUsername.length < 3) {
    fieldErrors.username = 'Must be at least 3 characters.';
  } else if (cleanUsername.length > 30) {
    fieldErrors.username = 'Must be 30 characters or fewer.';
  } else if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
    fieldErrors.username = 'Letters, numbers, _ and - only.';
  }

  // — email
  const cleanEmail = formData.email.toLowerCase();
  if (!cleanEmail) {
    fieldErrors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(cleanEmail)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  // — password
  if (!password) {
    fieldErrors.password = 'Password is required.';
  } else if (password.length < 6) {
    fieldErrors.password = 'Must be at least 6 characters.';
  } else if (password.length > 128) {
    fieldErrors.password = 'Password is too long.';
  }

  // — confirm
  if (!confirmPassword) {
    fieldErrors.confirmPassword = 'Please confirm your password.';
  } else if (password !== confirmPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return res.status(422).render('auth/register', {
      layout: 'layouts/auth', title: 'Create Account — SubTracker', formData, fieldErrors,
    });
  }

  try {
    // — uniqueness checks (separate errors per field)
    const [existingByUsername, existingByEmail] = await Promise.all([
      prisma.user.findUnique({ where: { username: cleanUsername } }),
      prisma.user.findUnique({ where: { email: cleanEmail } }),
    ]);

    if (existingByUsername) fieldErrors.username = 'This username is already taken.';
    if (existingByEmail)    fieldErrors.email    = 'An account with this email already exists.';

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(422).render('auth/register', {
        layout: 'layouts/auth', title: 'Create Account — SubTracker', formData, fieldErrors,
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { username: cleanUsername, email: cleanEmail, passwordHash, role: 'user' },
    });

    req.session.userId = user.id;
    authAttempts.delete(authRateKey(req));
    req.flash('success', `Welcome to SubTracker, ${user.username}!`);
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

// ── GET /login ─────────────────────────────────────────────────────────────────
router.get('/login', isGuest, (_req, res) => {
  res.render('auth/login', {
    layout:   'layouts/auth',
    title:    'Sign In — SubTracker',
    formData: {},
  });
});

// ── POST /login ────────────────────────────────────────────────────────────────
router.post('/login', authLimiter, isGuest, async (req, res, next) => {
  const { identifier, password } = req.body;
  const formData = { identifier: (identifier || '').trim() };

  if (!formData.identifier || !password) {
    req.flash('error', 'Please fill in all fields.');
    return res.status(422).render('auth/login', {
      layout: 'layouts/auth', title: 'Sign In — SubTracker', formData,
    });
  }

  try {
    const cleanId = formData.identifier.toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanId, mode: 'insensitive' } },
          { email: cleanId },
        ],
      },
    });

    const isValid = user && (await bcrypt.compare(password, user.passwordHash));

    if (!isValid) {
      req.flash('error', 'Invalid email/username or password.');
      return res.status(401).render('auth/login', {
        layout: 'layouts/auth', title: 'Sign In — SubTracker', formData,
      });
    }

    // Set session
    req.session.userId = user.id;
    authAttempts.delete(authRateKey(req));

    // Extend cookie lifetime to 30 days if "remember me" is checked
    if (req.body.rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }

    // Redirect to saved returnTo URL — validate it's a local path to prevent open redirect
    const raw = req.session.returnTo || '';
    const returnTo = (raw.startsWith('/') && !raw.startsWith('//')) ? raw : '/dashboard';
    delete req.session.returnTo;

    req.flash('success', `Welcome back, ${user.username}!`);
    res.redirect(returnTo);
  } catch (err) {
    next(err);
  }
});

// ── GET /forgot-password ───────────────────────────────────────────────────────
router.get('/forgot-password', (_req, res) => {
  res.render('auth/forgot-password', {
    layout: 'layouts/auth',
    title:  'Reset Password — SubTracker',
  });
});

// ── POST /logout ───────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
