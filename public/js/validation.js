/**
 * validation.js — AI Subscription Analyzer
 * Modular client-side validation with real-time feedback,
 * animated error messages, character counters and submit-guard.
 */
'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Constants
// ═══════════════════════════════════════════════════════════════════════════════

const NOTES_MAX  = 500;   // max chars for subscription notes
const MSG_MIN    = 10;    // min chars for contact message
const EMAIL_RE   = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// ═══════════════════════════════════════════════════════════════════════════════
// ── Shared Touch Registry
// ── Tracks which field IDs the user has already blurred (interacted with)
// ═══════════════════════════════════════════════════════════════════════════════

const touched = new Set();

// ═══════════════════════════════════════════════════════════════════════════════
// ── DOM Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/** Get element by id */
const $ = (id) => document.getElementById(id);

/**
 * Return (or create) the animated error <p> below a field.
 * Always appended inside field.parentElement.
 */
function ensureErrorEl(field) {
  const parent = field.parentElement;
  let el = parent.querySelector('.field-error-msg');
  if (!el) {
    el = document.createElement('p');
    el.className = 'field-error-msg';
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'polite');
    parent.appendChild(el);
  }
  return el;
}

/**
 * Return (or create) the tiny status dot appended to the field's <label>.
 * Dot flips between .valid (green) and .invalid (red).
 */
function ensureStatusDot(field) {
  const label = field.labels && field.labels[0];
  if (!label) return null;
  let dot = label.querySelector('.field-status');
  if (!dot) {
    dot = document.createElement('span');
    dot.className = 'field-status';
    dot.setAttribute('aria-hidden', 'true');
    label.appendChild(dot);
  }
  return dot;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── UI State Setters
// ═══════════════════════════════════════════════════════════════════════════════

function setFieldValid(field) {
  field.classList.remove('is-error');
  field.classList.add('is-valid');

  const err = ensureErrorEl(field);
  err.textContent = '';
  err.classList.remove('show');

  const dot = ensureStatusDot(field);
  if (dot) dot.className = 'field-status valid';
}

function setFieldError(field, message) {
  field.classList.remove('is-valid');
  field.classList.add('is-error');

  const err = ensureErrorEl(field);
  err.textContent = '⚠ ' + message;
  err.classList.add('show');

  const dot = ensureStatusDot(field);
  if (dot) dot.className = 'field-status invalid';
}

function setFieldNeutral(field) {
  field.classList.remove('is-valid', 'is-error');

  const err = field.parentElement.querySelector('.field-error-msg');
  if (err) { err.textContent = ''; err.classList.remove('show'); }

  const dot = ensureStatusDot(field);
  if (dot) dot.className = 'field-status';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Pure Validator Functions
// ── Each returns an error string on failure, or null on success.
// ═══════════════════════════════════════════════════════════════════════════════

const Validators = {

  /** Required text with configurable minimum length */
  text(value, label = 'This field', minLen = 2) {
    const v = value.trim();
    if (!v)             return `${label} is required.`;
    if (v.length < minLen) return `${label} must be at least ${minLen} characters.`;
    return null;
  },

  /** Required <select> — empty string value means nothing selected */
  select(value, label = 'Please make a selection.') {
    if (!value) return label;
    return null;
  },

  /** Subscription cost: required, positive, max 2 decimal places */
  cost(value) {
    const v = value.trim();
    if (!v) return 'Cost is required.';

    const parts = v.split('.');
    if (parts[1] && parts[1].length > 2) return 'Cost can have at most 2 decimal places (e.g. 9.99).';

    const num = parseFloat(v);
    if (isNaN(num) || num <= 0) return 'Cost must be a positive number greater than 0.';
    return null;
  },

  /** Start date: required, valid date, must not be in the future */
  date(value) {
    if (!value) return 'Start date is required.';
    // Append T00:00:00 to parse in local timezone, avoiding UTC offset pitfalls
    const d = new Date(value + 'T00:00:00');
    if (isNaN(d.getTime())) return 'Please enter a valid date.';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    if (d >= tomorrow) return 'Start date cannot be in the future.';
    return null;
  },

  /** Notes: optional, but max NOTES_MAX characters when filled */
  notes(value) {
    if (!value.trim()) return null; // optional — always OK when empty
    if (value.length > NOTES_MAX)
      return `Notes must be ${NOTES_MAX} characters or fewer (currently ${value.length}).`;
    return null;
  },

  /** Email: required + RFC-like regex check */
  email(value) {
    const v = value.trim();
    if (!v) return 'Email address is required.';
    if (!EMAIL_RE.test(v)) return 'Please enter a valid email (e.g. you@example.com).';
    return null;
  },

  /** Contact message: required, minimum MSG_MIN characters */
  message(value) {
    const v = value.trim();
    if (!v)              return 'Message is required.';
    if (v.length < MSG_MIN) return `Message must be at least ${MSG_MIN} characters.`;
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── Validation Runner
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute a validator against a field and apply the appropriate UI state.
 * @param {HTMLElement} field
 * @param {Function}    validatorFn  - (value: string) => string|null
 * @returns {boolean}   true = valid, false = invalid
 */
function runValidator(field, validatorFn) {
  const error = validatorFn(field.value);
  if (error) { setFieldError(field, error); return false; }
  setFieldValid(field);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Submit Button Guard
// ═══════════════════════════════════════════════════════════════════════════════

function setSubmitState(form, valid) {
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = !valid;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Shake Animation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Trigger CSS shake animation on the submit button.
 * pointer-events:none on :disabled buttons doesn't block JS class manipulation.
 */
function shakeSubmitBtn(form) {
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;

  // Temporarily lift disabled so the element can receive the animation class
  const wasDisabled = btn.disabled;
  btn.disabled = false;
  btn.classList.remove('btn-shake');
  void btn.offsetWidth; // force reflow to restart CSS animation
  btn.classList.add('btn-shake');
  btn.addEventListener('animationend', () => {
    btn.classList.remove('btn-shake');
    btn.disabled = wasDisabled;
  }, { once: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Character Counter
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Attach a live character counter beneath a textarea.
 * @param {HTMLTextAreaElement} field
 * @param {number} max  - hard maximum (0 = disabled)
 * @param {number} min  - soft minimum hint (0 = disabled)
 */
function attachCounter(field, max = 0, min = 0) {
  const parent = field.parentElement;
  let counter = parent.querySelector('.char-counter');
  if (!counter) {
    counter = document.createElement('div');
    counter.className = 'char-counter';
    parent.appendChild(counter);
  }

  const update = () => {
    const len = field.value.length;

    if (max > 0) {
      // Show "used / max"
      counter.textContent = `${len} / ${max}`;
      counter.className = 'char-counter' +
        (len > max        ? ' over' :
         len > max * 0.85 ? ' warn' : '');

    } else if (min > 0) {
      // Show "N more characters needed" guidance
      const trimmed = field.value.trim().length;
      const needed  = Math.max(0, min - trimmed);
      if (needed > 0) {
        counter.textContent = `${needed} more character${needed !== 1 ? 's' : ''} needed`;
        counter.className = 'char-counter';
      } else {
        counter.textContent = `${trimmed} characters  ✓`;
        counter.className = 'char-counter ok';
      }
    }
  };

  field.addEventListener('input', update);
  update(); // render on load
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── SUBSCRIPTION FORM MODULE
// ── Handles new.ejs and edit.ejs forms (#subscription-form)
// ═══════════════════════════════════════════════════════════════════════════════

function initSubscriptionForm() {
  const form = $('subscription-form');
  if (!form) return;

  // ── Field registry: each entry has the DOM element + its validator ─────────
  const fields = [
    {
      el: $('name'),
      fn: (v) => Validators.text(v, 'Service name', 2),
      required: true,
    },
    {
      el: $('category'),
      fn: (v) => Validators.select(v, 'Please select a category.'),
      required: true,
    },
    {
      el: $('cost'),
      fn: (v) => Validators.cost(v),
      required: true,
    },
    {
      el: $('billingCycle'),
      fn: (v) => Validators.select(v, 'Please select a billing cycle.'),
      required: true,
    },
    {
      el: $('startDate'),
      fn: (v) => Validators.date(v),
      required: true,
    },
    {
      el: $('status'),
      fn: (v) => Validators.select(v, 'Please select a status.'),
      required: true,
    },
    {
      el: $('notes'),
      fn: (v) => Validators.notes(v),
      required: false,
    },
  ].filter((f) => f.el !== null);

  // ── Attach notes character counter ─────────────────────────────────────────
  const notesEl = $('notes');
  if (notesEl) attachCounter(notesEl, NOTES_MAX);

  // ── Validity map: fieldId → boolean ────────────────────────────────────────
  // Required fields start as invalid (false); optional start as valid (true).
  const validity = new Map(fields.map((f) => [f.el.id, !f.required]));

  // ── Recalculate and update submit button ────────────────────────────────────
  function recheck() {
    const allValid = [...validity.values()].every(Boolean);
    setSubmitState(form, allValid);
  }

  // ── Validate a single entry (only if it has been touched or forced) ─────────
  function validateOne(entry, force = false) {
    if (!touched.has(entry.el.id) && !force) return;
    const valid = runValidator(entry.el, entry.fn);
    validity.set(entry.el.id, valid);
    recheck();
  }

  // ── Pre-validate fields that already have values (edit mode) ───────────────
  fields.forEach((entry) => {
    const val = entry.el.value;
    if (val !== null && val !== undefined && val.trim() !== '') {
      touched.add(entry.el.id);
      const valid = runValidator(entry.el, entry.fn);
      validity.set(entry.el.id, valid);
    }
  });
  recheck();

  // ── Attach real-time event listeners ───────────────────────────────────────
  fields.forEach((entry) => {
    const { el } = entry;

    // blur: mark as touched, then validate
    el.addEventListener('blur', () => {
      touched.add(el.id);
      validateOne(entry, true);
    });

    // input / change: re-validate only if already touched
    el.addEventListener('input',  () => { if (touched.has(el.id)) validateOne(entry, true); });
    el.addEventListener('change', () => { if (touched.has(el.id)) validateOne(entry, true); });
  });

  // ── Submit handler ──────────────────────────────────────────────────────────
  form.addEventListener('submit', (e) => {
    // Force-validate every field
    let allValid = true;
    fields.forEach((entry) => {
      touched.add(entry.el.id);
      const valid = runValidator(entry.el, entry.fn);
      validity.set(entry.el.id, valid);
      if (!valid && entry.required) allValid = false;
    });

    setSubmitState(form, allValid);

    if (!allValid) {
      e.preventDefault();
      shakeSubmitBtn(form);
      // Scroll to the first field in error
      const firstErr = form.querySelector('.is-error');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── CONTACT FORM MODULE
// ── Handles contact.ejs form (#contact-form) — UI only, no server submit
// ═══════════════════════════════════════════════════════════════════════════════

function initContactForm() {
  const form = $('contact-form');
  if (!form) return;

  // Disable submit on load
  setSubmitState(form, false);

  const fields = [
    {
      el: $('contact-name'),
      fn: (v) => Validators.text(v, 'Full name', 2),
      required: true,
    },
    {
      el: $('contact-email'),
      fn: (v) => Validators.email(v),
      required: true,
    },
    {
      el: $('contact-subject'),
      fn: (v) => Validators.text(v, 'Subject', 3),
      required: true,
    },
    {
      el: $('contact-message'),
      fn: (v) => Validators.message(v),
      required: true,
    },
  ].filter((f) => f.el !== null);

  // Attach live character counter to message
  const msgEl = $('contact-message');
  if (msgEl) attachCounter(msgEl, 0, MSG_MIN);

  const validity = new Map(fields.map((f) => [f.el.id, false]));

  function recheck() {
    const allValid = [...validity.values()].every(Boolean);
    setSubmitState(form, allValid);
  }

  function validateOne(entry, force = false) {
    if (!touched.has(entry.el.id) && !force) return;
    const valid = runValidator(entry.el, entry.fn);
    validity.set(entry.el.id, valid);
    recheck();
  }

  fields.forEach((entry) => {
    const { el } = entry;

    el.addEventListener('blur', () => {
      touched.add(el.id);
      validateOne(entry, true);
    });

    el.addEventListener('input', () => {
      if (touched.has(el.id)) validateOne(entry, true);
    });
  });

  // Submit: validate all → show success screen if valid
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let allValid = true;
    fields.forEach((entry) => {
      touched.add(entry.el.id);
      const valid = runValidator(entry.el, entry.fn);
      validity.set(entry.el.id, valid);
      if (!valid) allValid = false;
    });

    if (!allValid) {
      shakeSubmitBtn(form);
      const firstErr = form.querySelector('.is-error');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    showContactSuccess();
  });
}

// ─── Contact Success Screen ────────────────────────────────────────────────────

function showContactSuccess() {
  const form    = $('contact-form');
  const success = $('contact-success');
  if (!form || !success) return;

  // Fade out the form
  form.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  form.style.opacity    = '0';
  form.style.transform  = 'translateY(-10px)';

  setTimeout(() => {
    form.style.display = 'none';
    success.classList.add('visible'); // triggers CSS animation
  }, 300);
}

// ─── Contact Success: reset back to form ──────────────────────────────────────
// Exposed globally so the inline reset button can call it
window.resetContactForm = function () {
  const form    = $('contact-form');
  const success = $('contact-success');
  if (!form || !success) return;

  success.classList.remove('visible');
  form.reset();
  form.style.cssText = '';

  // Clear all validation states
  form.querySelectorAll('.is-valid, .is-error').forEach((el) => {
    el.classList.remove('is-valid', 'is-error');
  });
  form.querySelectorAll('.field-error-msg').forEach((el) => {
    el.textContent = '';
    el.classList.remove('show');
  });
  form.querySelectorAll('.field-status').forEach((el) => {
    el.className = 'field-status';
  });

  // Reset touched + validity state
  ['contact-name', 'contact-email', 'contact-subject', 'contact-message'].forEach((id) => {
    touched.delete(id);
  });

  setSubmitState(form, false);
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── FLASH MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

function initFlash() {
  document.querySelectorAll('.flash').forEach((flash) => {
    setTimeout(() => dismissFlash(flash), 4500);
  });
  document.querySelectorAll('.flash-close').forEach((btn) => {
    btn.addEventListener('click', () => dismissFlash(btn.closest('.flash')));
  });
}

function dismissFlash(el) {
  if (!el) return;
  el.style.animation = 'fadeOut 0.3s ease forwards';
  setTimeout(() => el.remove(), 300);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MOBILE NAV MENU
// ═══════════════════════════════════════════════════════════════════════════════

function initMobileMenu() {
  const menuBtn    = $('menu-btn');
  const mobileMenu = $('mobile-menu');
  if (!menuBtn || !mobileMenu) return;

  menuBtn.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    const icon   = menuBtn.querySelector('[data-lucide]');
    if (icon) {
      icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── FAQ ACCORDION
// ═══════════════════════════════════════════════════════════════════════════════

function initFaq() {
  document.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      // Close all items, then open the clicked one if it was closed
      document.querySelectorAll('.faq-item').forEach((i) => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function initDeleteModal() {
  let pendingForm = null;
  const modal     = $('delete-modal');

  // Any button with data-delete-form="<formId>" opens the modal
  document.querySelectorAll('[data-delete-form]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      pendingForm = $(btn.getAttribute('data-delete-form'));
      if (modal) modal.style.display = 'flex';
    });
  });

  // Confirm → submit the pending hidden form
  const confirmBtn = $('confirm-delete');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (pendingForm) pendingForm.submit();
    });
  }

  // Cancel (button or backdrop click) → close modal
  [$('cancel-delete'), modal].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', (e) => {
      if (e.target === el) {
        modal.style.display = 'none';
        pendingForm = null;
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── INIT — runs after DOM is ready
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// ── PASSWORD TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════

function initPasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-toggle-password');
      const input    = document.getElementById(targetId);
      if (!input) return;

      const isHidden = input.type === 'password';
      input.type     = isHidden ? 'text' : 'password';

      const icon = btn.querySelector('[data-lucide]');
      if (icon) {
        icon.setAttribute('data-lucide', isHidden ? 'eye-off' : 'eye');
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PASSWORD STRENGTH
// ═══════════════════════════════════════════════════════════════════════════════

function getPasswordStrength(password) {
  if (!password) return { level: '', score: 0 };
  let score = 0;
  if (password.length >= 6)  score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1)  return { level: 'weak',        score };
  if (score === 2) return { level: 'medium',       score };
  if (score === 3) return { level: 'strong',       score };
  return               { level: 'very-strong',   score };
}

function updateStrengthBar(bar, label, password) {
  const { level } = getPasswordStrength(password);

  // Clear old level classes
  bar.classList.remove('pwr-weak', 'pwr-medium', 'pwr-strong', 'pwr-very-strong');

  if (!password) {
    label.textContent = '';
    return;
  }

  bar.classList.add(`pwr-${level}`);
  const map = { 'weak': 'Weak', 'medium': 'Fair', 'strong': 'Good', 'very-strong': 'Strong' };
  label.textContent = map[level] || '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── REGISTER FORM MODULE
// ═══════════════════════════════════════════════════════════════════════════════

function initRegisterForm() {
  const form = $('register-form');
  if (!form) return;

  const usernameEl  = $('username');
  const emailEl     = $('email');
  const passwordEl  = $('password');
  const confirmEl   = $('confirmPassword');
  const pwrBar      = document.querySelector('.pwr-bar');
  const pwrLabel    = $('pwr-label');

  // Attach strength bar updates
  if (passwordEl && pwrBar && pwrLabel) {
    passwordEl.addEventListener('input', () => {
      updateStrengthBar(pwrBar, pwrLabel, passwordEl.value);
    });
  }

  const fields = [
    {
      el: usernameEl,
      fn: (v) => {
        const t = v.trim();
        if (!t)           return 'Username is required.';
        if (t.length < 3) return 'Must be at least 3 characters.';
        if (t.length > 30)return 'Must be 30 characters or fewer.';
        if (!/^[a-zA-Z0-9_-]+$/.test(t)) return 'Letters, numbers, _ and - only.';
        return null;
      },
      required: true,
    },
    {
      el: emailEl,
      fn: (v) => Validators.email(v),
      required: true,
    },
    {
      el: passwordEl,
      fn: (v) => {
        if (!v)           return 'Password is required.';
        if (v.length < 6) return 'Must be at least 6 characters.';
        return null;
      },
      required: true,
    },
    {
      el: confirmEl,
      fn: (v) => {
        if (!v) return 'Please confirm your password.';
        if (passwordEl && v !== passwordEl.value) return 'Passwords do not match.';
        return null;
      },
      required: true,
    },
  ].filter((f) => f.el !== null);

  // Pre-mark any server-side errors as touched so they remain visible
  fields.forEach(({ el }) => {
    if (el && el.classList.contains('is-error')) touched.add(el.id);
  });

  const validity = new Map(fields.map((f) => [f.el.id, false]));
  // Fields that already came back with server errors count as invalid
  fields.forEach(({ el }) => {
    if (el.classList.contains('is-error')) validity.set(el.id, false);
  });

  function recheck() {
    setSubmitState(form, [...validity.values()].every(Boolean));
  }

  function validateOne(entry, force = false) {
    if (!touched.has(entry.el.id) && !force) return;
    const valid = runValidator(entry.el, entry.fn);
    validity.set(entry.el.id, valid);
    // Re-validate confirm whenever password changes
    if (entry.el.id === 'password' && confirmEl && touched.has('confirmPassword')) {
      const ok = runValidator(confirmEl, fields.find((f) => f.el === confirmEl).fn);
      validity.set('confirmPassword', ok);
    }
    recheck();
  }

  fields.forEach((entry) => {
    const { el } = entry;
    el.addEventListener('blur',   () => { touched.add(el.id); validateOne(entry, true); });
    el.addEventListener('input',  () => { if (touched.has(el.id)) validateOne(entry, true); });
    el.addEventListener('change', () => { if (touched.has(el.id)) validateOne(entry, true); });
  });

  form.addEventListener('submit', (e) => {
    let allValid = true;
    fields.forEach((entry) => {
      touched.add(entry.el.id);
      const valid = runValidator(entry.el, entry.fn);
      validity.set(entry.el.id, valid);
      if (!valid) allValid = false;
    });
    setSubmitState(form, allValid);
    if (!allValid) {
      e.preventDefault();
      shakeSubmitBtn(form);
      const firstErr = form.querySelector('.is-error');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  recheck();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── LOGIN FORM MODULE
// ═══════════════════════════════════════════════════════════════════════════════

function initLoginForm() {
  const form = $('login-form');
  if (!form) return;

  const identifierEl = $('identifier');
  const passwordEl   = $('password');

  const fields = [
    {
      el: identifierEl,
      fn: (v) => {
        if (!v.trim()) return 'Email or username is required.';
        return null;
      },
      required: true,
    },
    {
      el: passwordEl,
      fn: (v) => {
        if (!v) return 'Password is required.';
        return null;
      },
      required: true,
    },
  ].filter((f) => f.el !== null);

  const validity = new Map(fields.map((f) => [f.el.id, false]));

  function recheck() {
    setSubmitState(form, [...validity.values()].every(Boolean));
  }

  function validateOne(entry, force = false) {
    if (!touched.has(entry.el.id) && !force) return;
    const valid = runValidator(entry.el, entry.fn);
    validity.set(entry.el.id, valid);
    recheck();
  }

  fields.forEach((entry) => {
    const { el } = entry;
    el.addEventListener('blur',  () => { touched.add(el.id); validateOne(entry, true); });
    el.addEventListener('input', () => { if (touched.has(el.id)) validateOne(entry, true); });
  });

  form.addEventListener('submit', (e) => {
    let allValid = true;
    fields.forEach((entry) => {
      touched.add(entry.el.id);
      const valid = runValidator(entry.el, entry.fn);
      validity.set(entry.el.id, valid);
      if (!valid) allValid = false;
    });
    setSubmitState(form, allValid);
    if (!allValid) {
      e.preventDefault();
      shakeSubmitBtn(form);
    }
  });

  recheck();
}

document.addEventListener('DOMContentLoaded', () => {
  initFlash();
  initMobileMenu();
  initFaq();
  initDeleteModal();
  initSubscriptionForm();
  initContactForm();
  initPasswordToggles();
  initRegisterForm();
  initLoginForm();
});
