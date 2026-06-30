import { getSponsors, updateSponsor } from './storage.js';
import { upsertSponsor } from './supabase.js';
import { STATUSES, getStatusLabel, getStatusColor, getPlanLabel, getPlanColor, getPriorityLabel, formatCurrency, formatDate } from './constants.js';
import { escapeHtml } from './validators.js';
import { showToast } from './toast.js';

let activeFilter = '';

export function renderKanban(container, onSelectSponsor, onDataChange) {
  const sponsors = getSponsors();
  const isPC = window.innerWidth >= 768;

  const filterChips = [
    { key: '', label: '全て', count: sponsors.filter(s => s.status !== 'declined').length },
    ...STATUSES.map(s => ({
      key: s.key,
      label: s.label,
      count: sponsors.filter(sp => sp.status === s.key).length,
    })),
  ];

  container.innerHTML = `
    <div class="kanban-filters">
      ${filterChips.map(f => `
        <button class="kanban-chip ${f.key === activeFilter ? 'active' : ''}" data-filter="${f.key}">
          ${f.label} (${f.count})
        </button>
      `).join('')}
    </div>
    <div id="kanban-board" class="${isPC ? 'kanban-pc' : ''}"></div>
  `;

  renderBoard(document.getElementById('kanban-board'), sponsors, isPC, onSelectSponsor, onDataChange);

  container.querySelectorAll('.kanban-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeFilter = chip.dataset.filter;
      container.querySelectorAll('.kanban-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === activeFilter));
      renderBoard(document.getElementById('kanban-board'), getSponsors(), isPC, onSelectSponsor, onDataChange);
    });
  });
}

function renderBoard(board, sponsors, isPC, onSelectSponsor, onDataChange) {
  const visibleStatuses = activeFilter
    ? STATUSES.filter(s => s.key === activeFilter)
    : STATUSES;

  board.innerHTML = visibleStatuses.map(status => {
    const items = sponsors
      .filter(s => s.status === status.key)
      .sort((a, b) => {
        const priorityOrder = { high: 0, mid: 1, low: 2 };
        return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
      });
    const sectionAmount = items.reduce((sum, s) => sum + (s.amount || 0), 0);

    return `
      <div class="kanban-section" data-status="${status.key}">
        <div class="kanban-section-header">
          <span class="kanban-section-title" style="color:${status.color}">
            ${status.label}
            <span class="kanban-section-count">(${items.length})</span>
          </span>
          ${sectionAmount > 0 ? `<span class="kanban-section-amount">${formatCurrency(sectionAmount)}</span>` : ''}
        </div>
        <div class="kanban-cards" data-status="${status.key}">
          ${items.map(s => renderKanbanCard(s)).join('')}
        </div>
      </div>
    `;
  }).join('');

  if (isPC) board.className = 'kanban-pc';

  board.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('click', () => onSelectSponsor(card.dataset.id));

    // モバイル: 長押しでステータス変更
    let pressTimer = null;
    card.addEventListener('touchstart', (e) => {
      pressTimer = setTimeout(() => {
        e.preventDefault();
        openStatusChangeSheet(card.dataset.id, onDataChange);
      }, 500);
    }, { passive: false });
    card.addEventListener('touchend', () => clearTimeout(pressTimer));
    card.addEventListener('touchmove', () => clearTimeout(pressTimer));

    // PC: ドラッグ対応
    if (isPC) {
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
    }
  });

  // PC: ドロップゾーン
  if (isPC) {
    board.querySelectorAll('.kanban-cards').forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.background = 'rgba(212,160,23,0.08)';
      });
      zone.addEventListener('dragleave', () => {
        zone.style.background = '';
      });
      zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        zone.style.background = '';
        const sponsorId = e.dataTransfer.getData('text/plain');
        const newStatus = zone.dataset.status;
        if (!sponsorId || !newStatus) return;

        const { getSponsorById } = await import('./storage.js');
        const sponsor = getSponsorById(sponsorId);
        if (!sponsor || sponsor.status === newStatus) return;

        updateSponsor(sponsorId, { status: newStatus });
        await upsertSponsor({ ...sponsor, status: newStatus });
        showToast(`「${getStatusLabel(newStatus)}」に移動`, 'success');
        onDataChange();
      });
    });
  }
}

function renderKanbanCard(sponsor) {
  const planColor = getPlanColor(sponsor.plan);
  const nextDate = sponsor.nextActionDate ? formatDate(sponsor.nextActionDate) : '';

  return `
    <div class="kanban-card" data-id="${sponsor.id}" style="border-left-color:${planColor}">
      <div class="kanban-card-header">
        <span class="kanban-card-name">${escapeHtml(sponsor.name)}</span>
        <span class="kanban-card-priority">${getPriorityLabel(sponsor.priority)}</span>
      </div>
      <div class="kanban-card-meta">
        ${sponsor.industry ? `<span>${escapeHtml(sponsor.industry)}</span>` : ''}
        ${sponsor.plan !== 'undecided' ? `<span class="kanban-card-plan"><span class="plan-dot" style="background:${planColor}"></span>${getPlanLabel(sponsor.plan)} ${sponsor.amount > 0 ? formatCurrency(sponsor.amount) : ''}</span>` : ''}
      </div>
      ${nextDate ? `<div class="kanban-card-next">📅 次: ${nextDate} ${sponsor.nextAction ? escapeHtml(sponsor.nextAction) : ''}</div>` : ''}
    </div>
  `;
}

function openStatusChangeSheet(sponsorId, onDataChange) {
  const dialog = document.getElementById('status-dialog');
  const optionsContainer = document.getElementById('status-options');

  import('./storage.js').then(({ getSponsorById }) => {
    const sponsor = getSponsorById(sponsorId);
    if (!sponsor) return;

    optionsContainer.innerHTML = STATUSES.map(s => `
      <button class="status-option-btn ${s.key === sponsor.status ? 'current' : ''}" data-status="${s.key}">
        <span class="status-dot" style="background:${s.color}"></span>
        ${s.label}
      </button>
    `).join('');

    optionsContainer.querySelectorAll('.status-option-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newStatus = btn.dataset.status;
        updateSponsor(sponsorId, { status: newStatus });
        const updated = getSponsorById(sponsorId);
        if (updated) await upsertSponsor(updated);
        dialog.close();
        showToast(`「${getStatusLabel(newStatus)}」に変更`, 'success');
        onDataChange();
      });
    });

    dialog.showModal();
  });
}
