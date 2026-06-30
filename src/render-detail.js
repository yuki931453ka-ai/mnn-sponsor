import { getSponsorById, getActivitiesForSponsor, removeSponsor, removeActivity } from './storage.js';
import { deleteSponsorRemote, deleteActivityRemote, upsertSponsor } from './supabase.js';
import { getStatusLabel, getStatusColor, getPlanLabel, getPlanColor, getPriorityLabel, formatCurrency, formatDateFull, getLogTypeIcon, getLogTypeLabel, STATUSES } from './constants.js';
import { escapeHtml } from './validators.js';
import { showToast } from './toast.js';
import { openSponsorDialog, openActivityDialog } from './forms.js';

export function renderDetail(container, sponsorId, onBack, onDataChange) {
  const sponsor = getSponsorById(sponsorId);
  if (!sponsor) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-text">企業が見つかりません</div></div>';
    return;
  }

  const activities = getActivitiesForSponsor(sponsorId);
  const statusColor = getStatusColor(sponsor.status);
  const planColor = getPlanColor(sponsor.plan);

  container.innerHTML = `
    <button class="detail-back" id="detail-back">← 戻る</button>
    <div class="detail-header">
      <h2 class="detail-name">${escapeHtml(sponsor.name)}</h2>
      <div class="detail-actions">
        <button class="btn-icon" id="detail-edit" title="編集">✏️</button>
        <button class="btn-icon" id="detail-delete" title="削除">🗑️</button>
      </div>
    </div>

    <button class="detail-status-badge" id="detail-status" style="background:${statusColor};color:#fff">
      ${getStatusLabel(sponsor.status)} ▾
    </button>

    <div class="detail-info-grid mt-8">
      <div class="detail-info-item">
        <div class="detail-info-label">代表者/担当者</div>
        <div class="detail-info-value">${escapeHtml(sponsor.representative || '—')}</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">業種</div>
        <div class="detail-info-value">${escapeHtml(sponsor.industry || '—')}</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">所在地</div>
        <div class="detail-info-value">${escapeHtml(sponsor.address || '—')}</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">優先度</div>
        <div class="detail-info-value">${getPriorityLabel(sponsor.priority)}</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">協賛プラン</div>
        <div class="detail-info-value"><span style="color:${planColor}">● </span>${getPlanLabel(sponsor.plan)}</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">協賛金額</div>
        <div class="detail-info-value text-gold">${sponsor.amount > 0 ? formatCurrency(sponsor.amount) : '—'}</div>
      </div>
      ${sponsor.phone ? `<div class="detail-info-item"><div class="detail-info-label">電話</div><div class="detail-info-value"><a href="tel:${escapeHtml(sponsor.phone)}">${escapeHtml(sponsor.phone)}</a></div></div>` : ''}
      ${sponsor.email ? `<div class="detail-info-item"><div class="detail-info-label">メール</div><div class="detail-info-value"><a href="mailto:${escapeHtml(sponsor.email)}">${escapeHtml(sponsor.email)}</a></div></div>` : ''}
    </div>

    ${(sponsor.approachReason || sponsor.relationshipMemo) ? `
    <div class="detail-memo-section">
      ${sponsor.approachReason ? `<div class="detail-memo-label">アプローチ理由</div><div class="detail-memo-text">${escapeHtml(sponsor.approachReason)}</div>` : ''}
      ${sponsor.relationshipMemo ? `<div class="detail-memo-label mt-8">関係性メモ</div><div class="detail-memo-text">${escapeHtml(sponsor.relationshipMemo)}</div>` : ''}
    </div>
    ` : ''}

    ${sponsor.nextAction || sponsor.nextActionDate ? `
    <div class="detail-next-action">
      <div class="detail-next-label">次回アクション</div>
      ${sponsor.nextActionDate ? `<div class="detail-next-date">📅 ${formatDateFull(sponsor.nextActionDate)}</div>` : ''}
      ${sponsor.nextAction ? `<div class="detail-next-text">${escapeHtml(sponsor.nextAction)}</div>` : ''}
    </div>
    ` : ''}

    <h3 class="section-title mt-16">活動ログ (${activities.length})</h3>
    <div class="detail-timeline">
      ${activities.length === 0 ? '<div class="text-dim text-sm">まだ活動ログがありません</div>' : ''}
      ${activities.map(a => `
        <div class="timeline-item">
          <span class="timeline-icon">${getLogTypeIcon(a.logType)}</span>
          <div class="timeline-body">
            <div class="timeline-head">
              ${getLogTypeLabel(a.logType)}
              <span class="timeline-date">${formatDateFull(a.logDate)}</span>
            </div>
            ${a.memo ? `<div class="timeline-memo">${escapeHtml(a.memo)}</div>` : ''}
            <span class="timeline-delete" data-activity-id="${a.id}">削除</span>
          </div>
        </div>
      `).join('')}
    </div>

    <button class="detail-fab" id="detail-add-log">＋ ログ追加</button>
  `;

  // イベントバインド
  document.getElementById('detail-back').addEventListener('click', onBack);

  document.getElementById('detail-edit').addEventListener('click', () => {
    openSponsorDialog(sponsorId);
  });

  document.getElementById('detail-delete').addEventListener('click', () => {
    const confirmDialog = document.getElementById('confirm-dialog');
    document.getElementById('confirm-message').textContent = `「${sponsor.name}」を削除しますか？活動ログも全て削除されます。`;
    const okBtn = document.getElementById('confirm-ok');
    const freshBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(freshBtn, okBtn);
    freshBtn.addEventListener('click', async () => {
      removeSponsor(sponsorId);
      confirmDialog.close();
      showToast('削除しました', 'info');
      onBack();
      onDataChange();
      deleteSponsorRemote(sponsorId).catch(() => {});
    });
    confirmDialog.showModal();
  });

  document.getElementById('detail-status').addEventListener('click', () => {
    openStatusDialog(sponsorId, sponsor.status, onDataChange);
  });

  document.getElementById('detail-add-log').addEventListener('click', () => {
    openActivityDialog(sponsorId);
  });

  container.querySelectorAll('.timeline-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const activityId = btn.dataset.activityId;
      removeActivity(activityId);
      showToast('ログを削除しました', 'info');
      renderDetail(container, sponsorId, onBack, onDataChange);
      onDataChange();
      deleteActivityRemote(activityId).catch(() => {});
    });
  });
}

function openStatusDialog(sponsorId, currentStatus, onDataChange) {
  const dialog = document.getElementById('status-dialog');
  const optionsContainer = document.getElementById('status-options');

  optionsContainer.innerHTML = STATUSES.map(s => `
    <button class="status-option-btn ${s.key === currentStatus ? 'current' : ''}" data-status="${s.key}">
      <span class="status-dot" style="background:${s.color}"></span>
      ${s.label}
    </button>
  `).join('');

  optionsContainer.querySelectorAll('.status-option-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.status;
      const sponsor = getSponsorById(sponsorId);
      if (sponsor) {
        const updated = { ...sponsor, status: newStatus };
        const { updateSponsor: updateLocal } = await import('./storage.js');
        updateLocal(sponsorId, { status: newStatus });
        await upsertSponsor(updated);
        dialog.close();
        showToast(`ステータスを「${getStatusLabel(newStatus)}」に変更`, 'success');
        onDataChange();
      }
    });
  });

  dialog.showModal();
}
