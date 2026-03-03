const express = require('express');
const router = express.Router();

// ─── GET /login ─────────────────────────────────────────────────────────────────
// Stub for FR5 — authentication placeholder
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/subscriptions');
  res.render('login', { title: 'Login - AI Subscription Analyzer' });
});

// ─── POST /login ────────────────────────────────────────────────────────────────
// Stub: accepts admin/admin123 without real DB check (FR5 placeholder)
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  // FR5 TODO: implement real bcrypt verification against DB
  if (username === 'admin' && password === 'admin123') {
    req.session.user = { id: 1, username: 'admin', role: 'admin' };
    req.flash('success', 'Welcome back, admin!');
    return res.redirect('/subscriptions');
  }
  req.flash('error', 'Invalid username or password.');
  res.redirect('/login');
});

// ─── POST /logout ───────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
