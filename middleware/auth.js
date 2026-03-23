'use strict';

const { getPrismaClient } = require('../utils/helpers');
const prisma = getPrismaClient();

/**
 * Global middleware — loads the full user from DB on every request
 * if a session exists. Populates res.locals for all templates.
 */
async function loadUser(req, res, next) {
  res.locals.currentUser    = null;
  res.locals.isAuthenticated = false;
  res.locals.isAdmin         = false;

  if (req.session && req.session.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId },
        select: { id: true, username: true, email: true, role: true, avatar: true },
      });

      if (user) {
        res.locals.currentUser     = user;
        res.locals.isAuthenticated = true;
        res.locals.isAdmin         = user.role === 'admin';
      } else {
        // Session references a deleted user — clean up
        delete req.session.userId;
      }
    } catch (_) {
      // DB error — proceed as guest
    }
  }

  next();
}

/**
 * Require authenticated session.
 * Saves the original URL for post-login redirect.
 */
function isAuthenticated(req, res, next) {
  if (res.locals.isAuthenticated) return next();

  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please sign in to continue.');
  return res.redirect('/login');
}

/**
 * Require admin role.
 */
function isAdmin(req, res, next) {
  if (res.locals.isAdmin) return next();

  req.flash('error', 'Access denied. Admin privileges required.');
  return res.redirect('/');
}

/**
 * Guest-only routes (login, register).
 * Redirects authenticated users to /subscriptions.
 */
function isGuest(req, res, next) {
  if (res.locals.isAuthenticated) {
    return res.redirect('/subscriptions');
  }
  next();
}

module.exports = { loadUser, isAuthenticated, isAdmin, isGuest };
