export const STORAGE_KEYS = {
  SPONSORS: 'mnn-sponsors',
  ACTIVITIES: 'mnn-activities',
};

export const STATUSES = [
  { key: 'not_started',   label: '未着手',       color: '#6b7280' },
  { key: 'approaching',   label: 'アプローチ中', color: '#3b82f6' },
  { key: 'negotiating',   label: '交渉中',       color: '#f59e0b' },
  { key: 'verbal_commit', label: '内諾',         color: '#10b981' },
  { key: 'confirmed',     label: '契約確定',     color: '#22c55e' },
  { key: 'declined',      label: '見送り',       color: '#ef4444' },
];

export const PLANS = [
  { key: 'diamond',   label: 'ダイヤモンド', amount: 300000, color: '#7dd3fc', limit: 1 },
  { key: 'platinum',  label: 'プラチナ',     amount: 200000, color: '#e2e8f0' },
  { key: 'gold',      label: 'ゴールド',     amount: 150000, color: '#d4a017' },
  { key: 'silver',    label: 'シルバー',     amount: 80000,  color: '#94a3b8' },
  { key: 'support',   label: '応援',         amount: 10000,  color: '#4ade80' },
  { key: 'undecided', label: '未定',         amount: 0,      color: '#4b5563' },
];

export const PRIORITIES = [
  { key: 'high', label: '★★★', sort: 0 },
  { key: 'mid',  label: '★★',  sort: 1 },
  { key: 'low',  label: '★',   sort: 2 },
];

export const LOG_TYPES = [
  { key: 'phone',   label: '電話',   icon: '📞' },
  { key: 'visit',   label: '訪問',   icon: '🏢' },
  { key: 'email',   label: 'メール', icon: '📧' },
  { key: 'meeting', label: '会議',   icon: '🤝' },
  { key: 'other',   label: 'その他', icon: '📝' },
];

export const INDUSTRIES = [
  '飲食', 'メディア', 'IT・Web', '美容・サロン', '建設・不動産',
  '小売', '製造', '医療・福祉', '教育', '金融・保険',
  'イベント・エンタメ', '広告・デザイン', 'その他',
];

export function getStatusLabel(key) {
  return STATUSES.find(s => s.key === key)?.label ?? key;
}

export function getStatusColor(key) {
  return STATUSES.find(s => s.key === key)?.color ?? '#6b7280';
}

export function getPlanLabel(key) {
  return PLANS.find(p => p.key === key)?.label ?? key;
}

export function getPlanColor(key) {
  return PLANS.find(p => p.key === key)?.color ?? '#4b5563';
}

export function getPlanAmount(key) {
  return PLANS.find(p => p.key === key)?.amount ?? 0;
}

export function getPriorityLabel(key) {
  return PRIORITIES.find(p => p.key === key)?.label ?? key;
}

export function getLogTypeIcon(key) {
  return LOG_TYPES.find(t => t.key === key)?.icon ?? '📝';
}

export function getLogTypeLabel(key) {
  return LOG_TYPES.find(t => t.key === key)?.label ?? key;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDateFull(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
