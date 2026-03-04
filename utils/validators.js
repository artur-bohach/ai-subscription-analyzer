'use strict';

// ─── Allowed values (single source of truth for both server & client) ──────────
const ALLOWED_CATEGORIES = [
  'Entertainment', 'Productivity', 'Education',
  'Cloud & Storage', 'Music & Audio', 'AI Tools',
  'Health & Fitness', 'News & Media', 'Other',
];
const ALLOWED_CYCLES     = ['monthly', 'yearly', 'weekly'];
const ALLOWED_STATUSES   = ['active', 'paused', 'cancelled'];
const ALLOWED_CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// ─── sanitizeInput ─────────────────────────────────────────────────────────────
/**
 * Trim whitespace and strip ASCII control characters from a string.
 *
 * Note: HTML output escaping is handled by EJS (<%= %>) at render time,
 * so we intentionally do NOT HTML-encode here to avoid double-encoding
 * when values are repopulated into form fields after validation failures.
 * Prisma uses parameterized queries, so SQL injection is already prevented.
 *
 * @param {*} value
 * @returns {string}
 */
function sanitizeInput(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // strip control chars
}

// ─── validateSubscription ──────────────────────────────────────────────────────
/**
 * Validate and sanitize subscription form data.
 * Async because it performs a duplicate-name DB check.
 *
 * @param {object}      data       - raw req.body
 * @param {object}      prisma     - Prisma client (passed in to avoid circular dep)
 * @param {number}      userId     - current user's id
 * @param {number|null} excludeId  - subscription id to exclude from duplicate check (updates)
 *
 * @returns {Promise<{
 *   isValid:   boolean,
 *   errors:    Record<string, string>,   // keyed by field name
 *   sanitized: object                    // clean values ready for DB write
 * }>}
 */
async function validateSubscription(data, prisma, userId, excludeId = null) {
  const errors = {};

  // ── 1. Sanitize all inputs ─────────────────────────────────────────────────
  const name         = sanitizeInput(data.name);
  const category     = sanitizeInput(data.category);
  const costRaw      = sanitizeInput(String(data.cost ?? ''));
  const currency     = sanitizeInput(data.currency) || 'EUR';
  const billingCycle = sanitizeInput(data.billingCycle);
  const startDate    = sanitizeInput(data.startDate);
  const status       = sanitizeInput(data.status) || 'active';
  const notes        = sanitizeInput(data.notes ?? '');

  // ── 2. Field rules ─────────────────────────────────────────────────────────

  // name: required, 2–100 chars
  if (!name) {
    errors.name = 'Service name is required.';
  } else if (name.length < 2) {
    errors.name = 'Service name must be at least 2 characters.';
  } else if (name.length > 100) {
    errors.name = 'Service name must not exceed 100 characters.';
  }

  // category: required, must be from allowed list
  if (!category) {
    errors.category = 'Please select a category.';
  } else if (!ALLOWED_CATEGORIES.includes(category)) {
    errors.category = 'Invalid category — please select from the list.';
  }

  // cost: required, positive, ≤ 99 999, max 2 decimal places
  if (!costRaw) {
    errors.cost = 'Cost is required.';
  } else if (!/^\d+(\.\d{1,2})?$/.test(costRaw)) {
    errors.cost = 'Enter a valid amount with at most 2 decimal places (e.g. 9.99).';
  } else {
    const costNum = parseFloat(costRaw);
    if (costNum <= 0)      errors.cost = 'Cost must be greater than 0.';
    else if (costNum > 99999) errors.cost = 'Cost must not exceed 99,999.';
  }

  // billingCycle: required, must be from allowed list
  if (!billingCycle) {
    errors.billingCycle = 'Please select a billing cycle.';
  } else if (!ALLOWED_CYCLES.includes(billingCycle)) {
    errors.billingCycle = 'Invalid billing cycle.';
  }

  // startDate: required, valid date, must not be in the future
  if (!startDate) {
    errors.startDate = 'Start date is required.';
  } else {
    const d = new Date(startDate + 'T00:00:00'); // local timezone, avoid UTC offset
    if (isNaN(d.getTime())) {
      errors.startDate = 'Please enter a valid date.';
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      if (d >= tomorrow) errors.startDate = 'Start date cannot be in the future.';
    }
  }

  // status: optional (default 'active'), but must be from allowed list if provided
  if (status && !ALLOWED_STATUSES.includes(status)) {
    errors.status = 'Invalid status value.';
  }

  // notes: optional, but max 500 chars when present
  if (notes.length > 500) {
    errors.notes = `Notes must not exceed 500 characters (currently ${notes.length}).`;
  }

  // ── 3. Duplicate active subscription check ─────────────────────────────────
  // Only run when no field errors exist (avoids spurious DB call on bad input)
  // and only when the effective status is 'active'.
  const effectiveStatus = ALLOWED_STATUSES.includes(status) ? status : 'active';
  if (Object.keys(errors).length === 0 && effectiveStatus === 'active') {
    const where = { userId, name, status: 'active' };
    if (excludeId) where.id = { not: excludeId };

    const duplicate = await prisma.subscription.findFirst({ where });
    if (duplicate) {
      errors.name = `You already have an active subscription named "${name}".`;
    }
  }

  // ── 4. Build clean payload for DB write ────────────────────────────────────
  const sanitized = {
    name,
    category,
    cost:         parseFloat(costRaw) || 0,
    currency:     ALLOWED_CURRENCIES.includes(currency) ? currency : 'EUR',
    billingCycle,
    startDate,
    status:       effectiveStatus,
    notes:        notes || null,
  };

  return {
    isValid:   Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}

// ─── validateContact ───────────────────────────────────────────────────────────
/**
 * Validate contact form data (synchronous — no DB lookup needed).
 *
 * @param {object} data - raw req.body: { name, email, subject, message }
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
function validateContact(data) {
  const errors = {};

  const name    = sanitizeInput(data.name);
  const email   = sanitizeInput(data.email);
  const subject = sanitizeInput(data.subject);
  const message = sanitizeInput(data.message);

  if (!name)                errors.name    = 'Full name is required.';
  else if (name.length < 2) errors.name    = 'Name must be at least 2 characters.';

  if (!email)                    errors.email = 'Email address is required.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email (e.g. you@example.com).';

  if (!subject)                  errors.subject = 'Subject is required.';
  else if (subject.length < 3)   errors.subject = 'Subject must be at least 3 characters.';

  if (!message)                        errors.message = 'Message is required.';
  else if (message.trim().length < 10) errors.message = 'Message must be at least 10 characters.';

  return { isValid: Object.keys(errors).length === 0, errors };
}

module.exports = { sanitizeInput, validateSubscription, validateContact };
