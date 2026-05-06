const { PrismaClient } = require('@prisma/client');

// ─── Prisma Singleton ───────────────────────────────────────────────────────────
let prismaInstance = null;

function getPrismaClient() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
  }
  return prismaInstance;
}

// ─── Billing Cycle Normalization ────────────────────────────────────────────────

/**
 * Normalize any billing cycle cost to monthly equivalent.
 * @param {number} cost
 * @param {string} cycle - 'monthly' | 'yearly' | 'weekly'
 * @returns {number} monthly cost
 */
function normalizeToMonthly(cost, cycle) {
  switch (cycle) {
    case 'yearly':  return cost / 12;
    case 'weekly':  return cost * 4.33;
    case 'monthly':
    default:        return cost;
  }
}

// ─── Currency Formatting ────────────────────────────────────────────────────────

/**
 * Format a number as currency string.
 * @param {number} amount
 * @param {string} currency - ISO 4217 code
 * @returns {string}
 */
function formatCurrency(amount, currency = 'EUR') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

// ─── Next Payment Date Calculation ─────────────────────────────────────────────

/**
 * Calculate the next payment date from startDate and billingCycle.
 * @param {Date} startDate
 * @param {string} cycle
 * @returns {Date}
 */
function calculateNextPayment(startDate, cycle) {
  const now = new Date();
  let next = new Date(startDate);

  const addPeriod = (date) => {
    const d = new Date(date);
    switch (cycle) {
      case 'weekly':  d.setDate(d.getDate() + 7);     break;
      case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
      case 'monthly':
      default:        d.setMonth(d.getMonth() + 1);   break;
    }
    return d;
  };

  // Advance until next is in the future
  while (next <= now) {
    next = addPeriod(next);
  }

  return next;
}

// ─── Category Icons (Lucide icon names) ────────────────────────────────────────

const CATEGORY_ICONS = {
  'Entertainment':    'tv',
  'Productivity':     'briefcase',
  'Education':        'graduation-cap',
  'Cloud & Storage':  'cloud',
  'Music & Audio':    'music',
  'AI Tools':         'brain',
  'Health & Fitness': 'heart-pulse',
  'News & Media':     'newspaper',
  'Other':            'package'
};

/**
 * Get the Lucide icon name for a category.
 * @param {string} category
 * @returns {string} icon name
 */
function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || 'tag';
}

// ─── Status Badge Color ─────────────────────────────────────────────────────────

/**
 * Get Tailwind CSS classes for a subscription status badge.
 * @param {string} status
 * @returns {string}
 */
function getStatusClasses(status) {
  switch (status) {
    case 'active':    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'paused':    return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:          return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

// ─── Date Formatting ────────────────────────────────────────────────────────────

/**
 * Format a date for HTML date input (YYYY-MM-DD).
 *
 * Uses local date parts instead of toISOString() to avoid a UTC-offset
 * shift when the server runs in a non-UTC timezone (e.g. UTC+2 would
 * make toISOString return the previous day for a local-midnight Date).
 * Plain YYYY-MM-DD strings are returned as-is.
 *
 * @param {Date|string} date
 * @returns {string}
 */
function formatDateInput(date) {
  if (!date) return '';
  // YYYY-MM-DD strings round-trip correctly without any Date parsing
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Format a date for display (e.g. "Jan 15, 2025").
 * @param {Date|string} date
 * @returns {string}
 */
function formatDateDisplay(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// ─── Safe JSON serialization for inline <script> blocks ────────────────────────
// JSON.stringify does NOT escape < > & by default, so a subscription name like
// </script><script>alert(1) would break out of the script block (XSS).
// This function escapes those characters to their unicode equivalents.
function safeJson(obj) {
  return JSON.stringify(obj)
    .replace(/</g,  '\\u003c')
    .replace(/>/g,  '\\u003e')
    .replace(/&/g,  '\\u0026')
    .replace(/'/g,  '\\u0027');
}

module.exports = {
  getPrismaClient,
  normalizeToMonthly,
  formatCurrency,
  calculateNextPayment,
  getCategoryIcon,
  getStatusClasses,
  formatDateInput,
  formatDateDisplay,
  safeJson,
};
