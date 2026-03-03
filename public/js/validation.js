/* ── Client-side Validation & Interactivity ─────────────────────────────── */

// ─── Flash Message Auto-dismiss ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Auto-dismiss flash messages after 4 seconds
  document.querySelectorAll('.flash').forEach(flash => {
    setTimeout(() => dismissFlash(flash), 4000);
  });

  // Manual close buttons
  document.querySelectorAll('.flash-close').forEach(btn => {
    btn.addEventListener('click', () => dismissFlash(btn.closest('.flash')));
  });
});

function dismissFlash(el) {
  if (!el) return;
  el.style.animation = 'fadeOut 0.3s ease forwards';
  setTimeout(() => el.remove(), 300);
}

// ─── Mobile Nav Menu ──────────────────────────────────────────────────────────
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (menuBtn && mobileMenu) {
  menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    const icon = menuBtn.querySelector('[data-lucide]');
    if (icon) {
      const isOpen = mobileMenu.classList.contains('open');
      icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
      lucide.createIcons();
    }
  });
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────────
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    // Toggle current
    if (!isOpen) item.classList.add('open');
  });
});

// ─── Delete Confirmation Modal ─────────────────────────────────────────────────
let pendingDeleteForm = null;

document.querySelectorAll('[data-delete-form]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const formId = btn.getAttribute('data-delete-form');
    pendingDeleteForm = document.getElementById(formId);
    const modal = document.getElementById('delete-modal');
    if (modal) modal.style.display = 'flex';
  });
});

const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn  = document.getElementById('cancel-delete');
const deleteModal      = document.getElementById('delete-modal');

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', () => {
    if (pendingDeleteForm) pendingDeleteForm.submit();
  });
}

[cancelDeleteBtn, deleteModal].forEach(el => {
  if (el) {
    el.addEventListener('click', (e) => {
      if (e.target === el) {
        deleteModal.style.display = 'none';
        pendingDeleteForm = null;
      }
    });
  }
});

// ─── Subscription Form Validation ─────────────────────────────────────────────
const subscriptionForm = document.getElementById('subscription-form');

if (subscriptionForm) {
  subscriptionForm.addEventListener('submit', (e) => {
    const errors = validateSubscriptionForm();
    if (errors.length > 0) {
      e.preventDefault();
      showFormErrors(errors);
    }
  });

  // Real-time validation
  subscriptionForm.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('blur', () => clearFieldError(field));
    field.addEventListener('input', () => clearFieldError(field));
  });
}

function validateSubscriptionForm() {
  const errors = [];
  const get = (id) => document.getElementById(id);

  const name = get('name');
  if (name && !name.value.trim()) {
    markError(name, 'Subscription name is required.');
    errors.push('name');
  }

  const category = get('category');
  if (category && !category.value) {
    markError(category, 'Please select a category.');
    errors.push('category');
  }

  const cost = get('cost');
  if (cost) {
    const val = parseFloat(cost.value);
    if (!cost.value || isNaN(val) || val <= 0) {
      markError(cost, 'Cost must be a positive number.');
      errors.push('cost');
    }
  }

  const billingCycle = get('billingCycle');
  if (billingCycle && !billingCycle.value) {
    markError(billingCycle, 'Please select a billing cycle.');
    errors.push('billingCycle');
  }

  const startDate = get('startDate');
  if (startDate && !startDate.value) {
    markError(startDate, 'Start date is required.');
    errors.push('startDate');
  }

  return errors;
}

function markError(field, message) {
  field.style.borderColor = 'rgba(239, 68, 68, 0.6)';
  field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';

  let errEl = field.parentNode.querySelector('.field-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'field-error';
    errEl.style.cssText = 'color:#fca5a5;font-size:0.75rem;margin-top:0.375rem;';
    field.parentNode.appendChild(errEl);
  }
  errEl.textContent = message;
}

function clearFieldError(field) {
  field.style.borderColor = '';
  field.style.boxShadow = '';
  const errEl = field.parentNode.querySelector('.field-error');
  if (errEl) errEl.remove();
}

function showFormErrors(errors) {
  // Scroll to first error field
  const firstErr = document.getElementById(errors[0]);
  if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ─── Contact Form ─────────────────────────────────────────────────────────────
const contactForm = document.getElementById('contact-form');

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const errors = validateContactForm();
    if (errors.length === 0) {
      showContactSuccess();
    }
  });
}

function validateContactForm() {
  const errors = [];
  const get = (id) => document.getElementById(id);

  const name = get('contact-name');
  if (name && !name.value.trim()) {
    markError(name, 'Name is required.');
    errors.push('contact-name');
  }

  const email = get('contact-email');
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value || !emailRegex.test(email.value)) {
      markError(email, 'Please enter a valid email address.');
      errors.push('contact-email');
    }
  }

  const message = get('contact-message');
  if (message && !message.value.trim()) {
    markError(message, 'Message is required.');
    errors.push('contact-message');
  }

  return errors;
}

function showContactSuccess() {
  const form = document.getElementById('contact-form');
  const successEl = document.getElementById('contact-success');
  if (form) form.style.display = 'none';
  if (successEl) successEl.style.display = 'flex';
}