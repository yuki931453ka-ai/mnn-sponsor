import { getSponsors, getLatestActivityForSponsor } from './storage.js';
import { STATUSES, PLANS, PRIORITIES, getStatusLabel, getStatusColor, getPlanLabel, getPlanColor, getPriorityLabel, formatCurrency, formatDate } from './constants.js';
import { escapeHtml } from './validators.js';

let currentFilters = { status: '', plan: '', priority: '', search: '' };
let currentSort = { key: 'updatedAt', dir: 'desc' };

export function renderList(container, onSelectSponsor) {
  const sponsors = getSponsors();

  container.innerHTML = `
    <div class="list-toolbar">
      <input type="search" class="list-search" placeholder="🔍 企業名で検索..." id="list-search" value="${escapeHtml(currentFilters.search)}">
      <select class="list-filter-select" id="list-filter-status">
        <option value="">全ステータス</option>
        ${STATUSES.map(s => `<option value="${s.key}" ${currentFilters.status === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}
      </select>
      <select class="list-filter-select" id="list-filter-plan">
        <option value="">全プラン</option>
        ${PLANS.map(p => `<option value="${p.key}" ${currentFilters.plan === p.key ? 'selected' : ''}>${p.label}</option>`).join('')}
      </select>
      <select class="list-filter-select" id="list-filter-priority">
        <option value="">全優先度</option>
        ${PRIORITIES.map(p => `<option value="${p.key}" ${currentFilters.priority === p.key ? 'selected' : ''}>${p.label}</option>`).join('')}
      </select>
      <button class="list-sort-btn" id="list-sort-btn">${getSortLabel()}</button>
    </div>
    <div id="list-cards"></div>
  `;

  renderFilteredCards(document.getElementById('list-cards'), sponsors, onSelectSponsor);

  document.getElementById('list-search').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    renderFilteredCards(document.getElementById('list-cards'), getSponsors(), onSelectSponsor);
  });

  ['list-filter-status', 'list-filter-plan', 'list-filter-priority'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      const filterKey = id.replace('list-filter-', '');
      currentFilters[filterKey] = e.target.value;
      renderFilteredCards(document.getElementById('list-cards'), getSponsors(), onSelectSponsor);
    });
  });

  document.getElementById('list-sort-btn').addEventListener('click', () => {
    cycleSortKey();
    document.getElementById('list-sort-btn').textContent = getSortLabel();
    renderFilteredCards(document.getElementById('list-cards'), getSponsors(), onSelectSponsor);
  });
}

function getSortLabel() {
  const labels = { updatedAt: '更新日', name: '社名', amount: '金額', priority: '優先度' };
  const arrow = currentSort.dir === 'desc' ? '↓' : '↑';
  return `${labels[currentSort.key] || currentSort.key} ${arrow}`;
}

function cycleSortKey() {
  const keys = ['updatedAt', 'name', 'amount', 'priority'];
  const idx = keys.indexOf(currentSort.key);
  if (currentSort.dir === 'desc') {
    currentSort.dir = 'asc';
  } else {
    currentSort.key = keys[(idx + 1) % keys.length];
    currentSort.dir = 'desc';
  }
}

function filterAndSort(sponsors) {
  let filtered = sponsors;

  if (currentFilters.search) {
    const q = currentFilters.search.toLowerCase();
    filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || (s.representative || '').toLowerCase().includes(q));
  }
  if (currentFilters.status) filtered = filtered.filter(s => s.status === currentFilters.status);
  if (currentFilters.plan) filtered = filtered.filter(s => s.plan === currentFilters.plan);
  if (currentFilters.priority) filtered = filtered.filter(s => s.priority === currentFilters.priority);

  const dir = currentSort.dir === 'desc' ? -1 : 1;
  filtered.sort((a, b) => {
    switch (currentSort.key) {
      case 'name': return dir * (a.name || '').localeCompare(b.name || '', 'ja');
      case 'amount': return dir * ((a.amount || 0) - (b.amount || 0));
      case 'priority': {
        const order = { high: 0, mid: 1, low: 2 };
        return dir * ((order[a.priority] ?? 1) - (order[b.priority] ?? 1));
      }
      default: return dir * ((a.updatedAt || '').localeCompare(b.updatedAt || ''));
    }
  });

  return filtered;
}

function renderFilteredCards(container, sponsors, onSelectSponsor) {
  const filtered = filterAndSort(sponsors);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">該当する企業がありません</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(s => {
    const statusColor = getStatusColor(s.status);
    const planColor = getPlanColor(s.plan);
    const nextDate = s.nextActionDate ? formatDate(s.nextActionDate) : '';
    return `
      <div class="sponsor-card" data-id="${s.id}" style="border-left-color:${planColor}">
        <div class="sponsor-card-top">
          <span class="sponsor-card-name">${escapeHtml(s.name)}</span>
          <span class="sponsor-card-priority">${getPriorityLabel(s.priority)}</span>
        </div>
        <div class="sponsor-card-mid">
          <span class="badge" style="background:${statusColor};color:#fff">${getStatusLabel(s.status)}</span>
          ${s.plan !== 'undecided' ? `<span class="badge" style="background:${planColor};color:#000">${getPlanLabel(s.plan)}</span>` : ''}
          ${s.amount > 0 ? `<span>${formatCurrency(s.amount)}</span>` : ''}
          ${nextDate ? `<span>次: ${nextDate}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.sponsor-card').forEach(card => {
    card.addEventListener('click', () => onSelectSponsor(card.dataset.id));
  });
}
