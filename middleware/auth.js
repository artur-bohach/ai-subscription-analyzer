'use strict';

/**
 * Require authenticated session to access a route.
 * Redirects to /login with a flash message if no session exists.
 */
function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Please sign in to access this page.');
    return res.redirect('/login');
  }
  next();
}

/**
 * Require admin role to access a route.
 */
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.flash('error', 'Admin access required.');
    return res.redirect('/');
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
