require('dotenv').config();

const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
const indexRoutes = require('./routes/index');
const subscriptionRoutes = require('./routes/subscriptions');
const authRoutes = require('./routes/auth');

app.use('/', indexRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/', authRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Page Not Found',
    statusCode: 404,
    message: "The page you're looking for doesn't exist.",
    layout: 'layouts/main'
  });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).render('error', {
    title: '500 - Server Error',
    statusCode: 500,
    message: 'Something went wrong on our end. Please try again later.',
    layout: 'layouts/main'
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 AI Subscription Analyzer running at http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
