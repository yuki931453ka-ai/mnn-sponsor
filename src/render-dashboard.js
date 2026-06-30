import { getSponsors, getActivities } from './storage.js';
import { STATUSES, getStatusLabel, getStatusColor, getLogTypeIcon, getLogTypeLabel, formatCurrency, formatDate, formatDateFull, todayString } from './constants.js';
import { escapeHtml } from './validators.js';

export function renderDashboard(container, onSelectSponsor) {
  const sponsors = getSponsors();
  const activities = getActivities();

  const total = sponsors.filter(s => s.status !== 'declined').length;
  const approached = sponsors.filter(s => ['approaching', 'negotiating', 'verbal_commit', 'confirmed'].includes(s.status)).length;
  const verbal = sponsors.filter(s => s.status === 'verbal_commit').length;
  const confirmed = sponsors.filter(s => s.status === 'confirmed').length;
  const confirmedAmount = sponsors.filter(s => s.status === 'confirmed').reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalPipeline = sponsors.filter(s => !['not_started', 'declined'].includes(s.status)).reduce((sum, s) => sum + (s.amount || 0), 0);

  const today = todayString();
  const weekEnd = getWeekEnd(today);
  const upcomingActions = sponsors
    .filter(s => s.nextAction && s.nextActionDate && s.status !== 'declined' && s.status !== 'confirmed')
    .sort((a, b) => (a.nextActionDate || '').localeCompare(b.nextActionDate || ''));

  const recentActivities = activities.slice(0, 10);

  const funnelData = STATUSES.filter(s => s.key !== 'declined').map(s => ({
    ...s,
    count: sponsors.filter(sp => sp.status === s.key).length,
  }));
  const funnelTotal = Math.max(total, 1);

  container.innerHTML = `
    <div class="kpi-scroll">
      <div class="kpi-card">
        <div class="kpi-value">${total}</div>
        <div class="kpi-label">候補数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${approached}</div>
        <div class="kpi-label">アプローチ済</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${verbal}</div>
        <div class="kpi-label">内諾</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${confirmed}</div>
        <div class="kpi-label">確定</div>
      </div>
      <div class="kpi-card kpi-amount">
        <div class="kpi-value text-gold">${formatCurrency(confirmedAmount)}</div>
        <div class="kpi-label">確定金額</div>
      </div>
    </div>

    <div class="funnel-bar">
      <div class="funnel-track">
        ${funnelData.map(f => `<div class="funnel-segment" style="width:${(f.count / funnelTotal * 100).toFixed(1)}%;background:${f.color}" title="${f.label}: ${f.count}"></div>`).join('')}
      </div>
      <div class="funnel-meta">
        <span>${funnelData.map(f => `${f.label} ${f.count}`).join(' / ')}</span>
        <span>パイプライン ${formatCurrency(totalPipeline)}</span>
      </div>
    </div>

    <h3 class="section-title mt-16">直近アクション</h3>
    <div class="action-list">
      ${upcomingActions.length === 0 ? '<div class="text-dim text-sm">予定されたアクションはありません</div>' : ''}
      ${upcomingActions.map(s => {
        const isOverdue = s.nextActionDate < today;
        const isThisWeek = s.nextActionDate <= weekEnd && !isOverdue;
        const urgencyClass = isOverdue ? 'overdue' : (isThisWeek ? 'this-week' : '');
        return `
          <div class="action-item ${urgencyClass}" data-id="${s.id}">
            <div class="action-date ${urgencyClass}">${formatDate(s.nextActionDate)}</div>
            <div class="action-body">
              <div class="action-name">${escapeHtml(s.name)}</div>
              <div class="action-desc">${escapeHtml(s.nextAction)}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <h3 class="section-title mt-16">最近の更新</h3>
    <div class="feed-list">
      ${recentActivities.length === 0 ? '<div class="text-dim text-sm">まだ活動ログがありません</div>' : ''}
      ${recentActivities.map(a => {
        const sponsor = sponsors.find(s => s.id === a.sponsorId);
        return `
          <div class="feed-item${sponsor ? '' : ' feed-item-deleted'}" data-id="${sponsor ? a.sponsorId : ''}">
            <span class="feed-icon">${getLogTypeIcon(a.logType)}</span>
            <div class="feed-body">
              <div class="feed-head">
                ${escapeHtml(sponsor?.name || '(削除済み)')}
                <span class="feed-date">${formatDateFull(a.logDate)}</span>
              </div>
              ${a.memo ? `<div class="feed-memo">${escapeHtml(a.memo)}</div>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.action-item').forEach(el => {
    el.addEventListener('click', () => onSelectSponsor(el.dataset.id));
  });
  container.querySelectorAll('.feed-item').forEach(el => {
    el.addEventListener('click', () => { if (el.dataset.id) onSelectSponsor(el.dataset.id); });
  });
}

function getWeekEnd(todayStr) {
  const d = new Date(todayStr + 'T00:00:00');
  const dayOfWeek = d.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  d.setDate(d.getDate() + daysUntilSunday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
