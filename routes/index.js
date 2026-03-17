const express = require('express');
const router = express.Router();

// ─── Home Page ─────────────────────────────────────────────────────────────────
router.get('/', (_req, res) => {
  res.render('home', { title: 'SubTracker' });
});

// ─── /home alias ───────────────────────────────────────────────────────────────
router.get('/home', (_req, res) => {
  res.redirect(301, '/');
});

// ─── About Page ────────────────────────────────────────────────────────────────
router.get('/about', (_req, res) => {
  res.render('about', {
    title:       'About - SubTracker',
    breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'About' }],
  });
});

// ─── Contact Page ──────────────────────────────────────────────────────────────
router.get('/contact', (_req, res) => {
  res.render('contact', {
    title:       'Contact - SubTracker',
    breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'Contact' }],
  });
});

module.exports = router;
