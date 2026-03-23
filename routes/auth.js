'use strict';

const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const { getPrismaClient } = require('../utils/helpers');
const { isGuest }          = require('../middleware/auth');

const prisma      = getPrismaClient();
const SALT_ROUNDS = 12;
const EMAIL_RE    = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

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
router.post('/register', isGuest, async (req, res, next) => {
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
    req.flash('success', `Welcome to SubTracker, ${user.username}!`);
    res.redirect('/subscriptions');
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
router.post('/login', isGuest, async (req, res, next) => {
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

    // Redirect to saved returnTo URL or default
    const returnTo = req.session.returnTo || '/subscriptions';
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
