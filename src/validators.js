export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

export function validateSponsor(data) {
  const errors = [];
  if (!data.name || !data.name.trim()) errors.push('社名は必須です');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('メールアドレスが不正です');
  if (data.amount !== undefined && (data.amount < 0 || data.amount > 99999999)) errors.push('金額が範囲外です');
  return errors;
}

export function validateActivity(data) {
  const errors = [];
  if (!data.sponsorId) errors.push('企業が指定されていません');
  if (!data.logDate) errors.push('日付は必須です');
  if (!data.logType) errors.push('種別は必須です');
  return errors;
}
