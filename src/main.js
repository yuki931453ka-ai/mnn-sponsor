import { loadFromLocal, replaceSponsors, replaceActivities } from './storage.js';
import { initSupabase, syncAllFromRemote, subscribeRealtime } from './supabase.js';
import { initToast } from './toast.js';
import { initIndustrySelect, initPlanAmountLink, initSegmentControls, initLogTypeSelector, initModalCloseButtons, initSponsorForm, initActivityForm, openSponsorDialog, setOnDataChange } from './forms.js';
import { renderDashboard } from './render-dashboard.js';
import { renderKanban } from './render-kanban.js';
import { renderList } from './render-list.js';
import { renderDetail } from './render-detail.js';
import { initDragStyles } from './drag.js';

let currentTab = 'dashboard';
let detailSponsorId = null;
let previousTab = 'list';

// --- タブ切替 ---
function switchTab(tab) {
  if (tab === 'detail') {
    previousTab = currentTab;
  }
  currentTab = tab;

  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`tab-${tab}`);
  if (panel) panel.classList.add('active');

  document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // 詳細からの戻り時はFABを非表示に
  const fab = document.querySelector('.detail-fab');
  if (fab && tab !== 'detail') fab.style.display = 'none';

  refreshCurrentTab();
}

function refreshCurrentTab() {
  switch (currentTab) {
    case 'dashboard':
      renderDashboard(document.getElementById('dashboard-content'), navigateToDetail);
      break;
    case 'kanban':
      renderKanban(document.getElementById('kanban-content'), navigateToDetail, refreshAll);
      break;
    case 'list':
      renderList(document.getElementById('list-content'), navigateToDetail);
      break;
    case 'detail':
      if (detailSponsorId) {
        renderDetail(
          document.getElementById('detail-content'),
          detailSponsorId,
          () => switchTab(previousTab),
          refreshAll
        );
      }
      break;
  }
}

function navigateToDetail(sponsorId) {
  detailSponsorId = sponsorId;
  switchTab('detail');
}

function refreshAll() {
  refreshCurrentTab();
}

// --- ボトムナビ ---
function initBottomNav() {
  document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelector('[data-action="add-sponsor"]')?.addEventListener('click', () => {
    openSponsorDialog();
  });
}

// --- 初期化 ---
async function init() {
  // ローカルデータ読み込み
  loadFromLocal();

  // UI初期化
  initToast();
  initBottomNav();
  initIndustrySelect();
  initPlanAmountLink();
  initSegmentControls();
  initLogTypeSelector();
  initModalCloseButtons();
  initSponsorForm();
  initActivityForm();
  initDragStyles();

  // データ変更時のコールバック
  setOnDataChange(refreshAll);

  // 初回レンダリング
  switchTab('dashboard');

  // Supabase接続
  const client = await initSupabase();
  if (client) {
    const remote = await syncAllFromRemote();
    if (remote.sponsors) replaceSponsors(remote.sponsors);
    if (remote.activities) replaceActivities(remote.activities);
    refreshAll();

    subscribeRealtime(
      async () => {
        const { fetchSponsors } = await import('./supabase.js');
        const sponsors = await fetchSponsors();
        if (sponsors) { replaceSponsors(sponsors); refreshAll(); }
      },
      async () => {
        const { fetchActivities } = await import('./supabase.js');
        const activities = await fetchActivities();
        if (activities) { replaceActivities(activities); refreshAll(); }
      }
    );
  }

  // PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

init();
