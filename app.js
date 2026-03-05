require('dotenv').config();

const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const helpers = require('./utils/helpers');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Global Template Helpers (available in every EJS view via app.locals) ──────
app.locals.formatDateDisplay  = helpers.formatDateDisplay;
app.locals.formatDateInput    = helpers.formatDateInput;
app.locals.formatCurrency     = helpers.formatCurrency;
app.locals.normalizeToMonthly = helpers.normalizeToMonthly;
app.locals.getCategoryIcon    = helpers.getCategoryIcon;
app.locals.getStatusClasses   = helpers.getStatusClasses;

// ─── View Engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ─── Static Files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Method Override (for PUT/DELETE via forms) ────────────────────────────────
app.use(methodOverride('_method'));

// ─── Session ───────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// ─── Flash Messages ────────────────────────────────────────────────────────────
app.use(flash());

// ─── Global Template Variables ─────────────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

// ─── Routes ────────────────────────────────────────────────────────────────────
const indexRoutes        = require('./routes/index');
const subscriptionRoutes = require('./routes/subscriptions');
const authRoutes         = require('./routes/auth');

app.use('/', indexRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/', authRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.warn(`[${new Date().toISOString()}] 404 ${req.method} ${req.originalUrl}`);
  res.status(404).render('errors/404', {
    title:  '404 — Page Not Found',
    layout: 'layouts/main',
  });
});

// ─── Error Logger ──────────────────────────────────────────────────────────────
// Logs every error with timestamp + request context before delegating to renderer
app.use((err, req, _res, next) => {
  const ts     = new Date().toISOString();
  const status = err.status || err.statusCode || 500;

  console.error(`[${ts}] ERROR ${status} ${req.method} ${req.originalUrl}`);
  console.error(`  Message : ${err.message || 'No message'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack || '(no stack trace available)');
  }

  next(err);
});

// ─── 500 Error Handler ─────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isDev  = process.env.NODE_ENV !== 'production';

  res.status(status).render('errors/500', {
    title:        `${status} — Server Error`,
    layout:       'layouts/main',
    stack:        isDev ? err.stack   : null,
    errorMessage: isDev ? err.message : null,
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 AI Subscription Analyzer running at http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
