'use strict';

// ── Mobile sidebar toggle ────────────────────────────────────────────────────
(function () {
  const toggle  = document.getElementById('admin-sidebar-toggle');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-overlay');
  if (!toggle || !sidebar) return;

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });
})();

// ── Users table: client-side search ─────────────────────────────────────────
(function () {
  const input  = document.getElementById('user-search');
  const tbody  = document.getElementById('users-tbody');
  const noRes  = document.getElementById('no-results');
  if (!input || !tbody) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    let visible = 0;
    tbody.querySelectorAll('.user-row').forEach(row => {
      const match = row.dataset.search.includes(q);
      row.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    if (noRes) noRes.classList.toggle('hidden', visible > 0);
  });
})();

// ── Users table: column sort ─────────────────────────────────────────────────
(function () {
  const table = document.getElementById('users-table');
  if (!table) return;

  let sortCol = -1, sortAsc = true;

  table.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = parseInt(th.dataset.col);
      if (sortCol === col) {
        sortAsc = !sortAsc;
      } else {
        sortCol = col;
        sortAsc = true;
      }

      // Reset all header icons
      table.querySelectorAll('th.sortable').forEach(h => {
        const icon = h.querySelector('[data-lucide]');
        if (icon) { icon.setAttribute('data-lucide', 'chevrons-up-down'); icon.style.opacity = '0.4'; }
      });

      const activeIcon = th.querySelector('[data-lucide]');
      if (activeIcon) {
        activeIcon.setAttribute('data-lucide', sortAsc ? 'chevron-up' : 'chevron-down');
        activeIcon.style.opacity = '1';
      }

      const tbody = table.querySelector('tbody');
      const rows  = Array.from(tbody.querySelectorAll('tr.user-row'));

      rows.sort((a, b) => {
        const cellA = a.cells[col];
        const cellB = b.cells[col];
        const rawA  = (cellA.dataset.sort !== undefined ? cellA.dataset.sort : cellA.textContent).trim();
        const rawB  = (cellB.dataset.sort !== undefined ? cellB.dataset.sort : cellB.textContent).trim();
        const numA  = parseFloat(rawA);
        const numB  = parseFloat(rawB);
        const isNum = !isNaN(numA) && !isNaN(numB);
        const cmp   = isNum ? numA - numB : rawA.localeCompare(rawB);
        return sortAsc ? cmp : -cmp;
      });

      rows.forEach(r => tbody.appendChild(r));
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });
  });
})();
