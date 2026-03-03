// ─── Auth Middleware ────────────────────────────────────────────────────────────
// Stub for FR5 — session-based authentication guard

/**
 * Require authenticated session to access a route.
 * Redirects to /login if no session exists.
 */
function requireAuth(req, res, next) {
  // FR5 TODO: uncomment to enforce authentication
  // if (!req.session.user) {
  //   req.flash('error', 'Please log in to access this page.');
  //   return res.redirect('/login');
  // }
  next();
}

/**
 * Require admin role to access a route.
 */
function requireAdmin(req, res, next) {
  // FR5 TODO: implement role-based access control
  // if (!req.session.user || req.session.user.role !== 'admin') {
  //   req.flash('error', 'Admin access required.');
  //   return res.redirect('/');
  // }
  next();
}

module.exports = { requireAuth, requireAdmin };
