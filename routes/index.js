const express = require('express');
const router = express.Router();

// ─── Home Page ─────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.render('home', { title: 'AI Subscription Analyzer' });
});

// ─── About Page ────────────────────────────────────────────────────────────────
router.get('/about', (req, res) => {
  res.render('about', { title: 'About - AI Subscription Analyzer' });
});

// ─── Contact Page ──────────────────────────────────────────────────────────────
router.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact - AI Subscription Analyzer' });
});

module.exports = router;
