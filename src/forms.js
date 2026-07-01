import { INDUSTRIES, PLANS, getPlanAmount, todayString } from './constants.js';
import { addSponsor, updateSponsor, getSponsorById, addActivity } from './storage.js';
import { upsertSponsor, insertActivity } from './supabase.js';
import { validateSponsor, validateActivity } from './validators.js';
import { showToast } from './toast.js';

let onDataChange = null;

export function setOnDataChange(fn) {
  onDataChange = fn;
}

function notifyChange() {
  if (onDataChange) onDataChange();
}

// --- 業種セレクト初期化 ---
export function initIndustrySelect() {
  const sel = document.getElementById('sf-industry');
  if (!sel) return;
  INDUSTRIES.forEach(ind => {
    const opt = document.createElement('option');
    opt.value = ind;
    opt.textContent = ind;
    sel.appendChild(opt);
  });
}

// --- プラン→金額自動セット ---
export function initPlanAmountLink() {
  const planSel = document.getElementById('sf-plan');
  const amountInput = document.getElementById('sf-amount');
  if (!planSel || !amountInput) return;
  planSel.addEventListener('change', () => {
    const amount = getPlanAmount(planSel.value);
    if (amount > 0) amountInput.value = amount;
  });
}

// --- セグメントコントロール ---
export function initSegmentControls() {
  document.querySelectorAll('.segment-control').forEach(container => {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      container.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// --- ログ種別セレクター ---
export function initLogTypeSelector() {
  const container = document.getElementById('af-type');
  if (!container) return;
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.log-type-btn');
    if (!btn) return;
    container.querySelectorAll('.log-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
}

// --- モーダル閉じるボタン ---
export function initModalCloseButtons() {
  document.querySelectorAll('[data-close-dialog]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dialogId = btn.getAttribute('data-close-dialog');
      const dialog = document.getElementById(dialogId);
      if (dialog) dialog.close();
    });
  });

  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  });
}

// --- 企業フォーム ---
function getFormData() {
  const priorityBtn = document.querySelector('#sf-priority .seg-btn.active');
  return {
    id: document.getElementById('sf-id').value || crypto.randomUUID(),
    name: document.getElementById('sf-name').value.trim(),
    representative: document.getElementById('sf-representative').value.trim(),
    industry: document.getElementById('sf-industry').value,
    address: document.getElementById('sf-address').value.trim(),
    phone: document.getElementById('sf-phone').value.trim(),
    email: document.getElementById('sf-email').value.trim(),
    priority: priorityBtn?.dataset.value || 'mid',
    status: document.getElementById('sf-status').value,
    plan: document.getElementById('sf-plan').value,
    amount: parseInt(document.getElementById('sf-amount').value, 10) || 0,
    approachReason: document.getElementById('sf-approach-reason').value.trim(),
    relationshipMemo: document.getElementById('sf-relationship-memo').value.trim(),
    nextAction: document.getElementById('sf-next-action').value.trim(),
    nextActionDate: document.getElementById('sf-next-action-date').value || null,
  };
}

function fillForm(sponsor) {
  document.getElementById('sf-id').value = sponsor.id;
  document.getElementById('sf-name').value = sponsor.name || '';
  document.getElementById('sf-representative').value = sponsor.representative || '';
  document.getElementById('sf-industry').value = sponsor.industry || '';
  document.getElementById('sf-address').value = sponsor.address || '';
  document.getElementById('sf-phone').value = sponsor.phone || '';
  document.getElementById('sf-email').value = sponsor.email || '';
  document.getElementById('sf-status').value = sponsor.status || 'not_started';
  document.getElementById('sf-plan').value = sponsor.plan || 'undecided';
  document.getElementById('sf-amount').value = sponsor.amount || 0;
  document.getElementById('sf-approach-reason').value = sponsor.approachReason || '';
  document.getElementById('sf-relationship-memo').value = sponsor.relationshipMemo || '';
  document.getElementById('sf-next-action').value = sponsor.nextAction || '';
  document.getElementById('sf-next-action-date').value = sponsor.nextActionDate || '';

  const priority = sponsor.priority || 'mid';
  document.querySelectorAll('#sf-priority .seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === priority);
  });
}

function clearForm() {
  document.getElementById('sf-id').value = '';
  document.getElementById('sponsor-form').reset();
  document.querySelectorAll('#sf-priority .seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === 'mid');
  });
  document.getElementById('sf-errors').hidden = true;
}

export function openSponsorDialog(sponsorId = null) {
  const dialog = document.getElementById('sponsor-dialog');
  const title = document.getElementById('sponsor-dialog-title');

  if (sponsorId) {
    const sponsor = getSponsorById(sponsorId);
    if (!sponsor) return;
    title.textContent = '企業編集';
    fillForm(sponsor);
  } else {
    title.textContent = '企業登録';
    clearForm();
  }

  dialog.showModal();
}

export function initSponsorForm() {
  const form = document.getElementById('sponsor-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData();
    const errors = validateSponsor(data);
    const errEl = document.getElementById('sf-errors');

    if (errors.length > 0) {
      errEl.textContent = errors.join('、');
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;

    const isEdit = !!document.getElementById('sf-id').value && !!getSponsorById(data.id);

    if (isEdit) {
      updateSponsor(data.id, data);
    } else {
      data.createdAt = new Date().toISOString();
      data.updatedAt = new Date().toISOString();
      addSponsor(data);
    }

    await upsertSponsor(data);
    document.getElementById('sponsor-dialog').close();
    showToast(isEdit ? '更新しました' : '登録しました', 'success');
    notifyChange();
  });
}

// --- 活動ログフォーム ---
export function openActivityDialog(sponsorId) {
  const dialog = document.getElementById('activity-dialog');
  const sponsor = getSponsorById(sponsorId);
  if (!sponsor) return;

  document.getElementById('af-sponsor-id').value = sponsorId;
  document.getElementById('af-sponsor-name').textContent = sponsor.name;
  document.getElementById('af-date').value = todayString();
  document.getElementById('af-memo').value = '';
  document.querySelectorAll('#af-type .log-type-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('af-errors').hidden = true;

  dialog.showModal();
}

export function initActivityForm() {
  const form = document.getElementById('activity-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const typeBtn = document.querySelector('#af-type .log-type-btn.active');
    const data = {
      id: crypto.randomUUID(),
      sponsorId: document.getElementById('af-sponsor-id').value,
      logDate: document.getElementById('af-date').value,
      logType: typeBtn?.dataset.value || '',
      memo: document.getElementById('af-memo').value.trim(),
      createdAt: new Date().toISOString(),
    };

    const errors = validateActivity(data);
    const errEl = document.getElementById('af-errors');

    if (errors.length > 0) {
      errEl.textContent = errors.join('、');
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;

    addActivity(data);
    await insertActivity(data);
    document.getElementById('activity-dialog').close();
    showToast('活動ログを追加しました', 'success');
    notifyChange();
  });
}
