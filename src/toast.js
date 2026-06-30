let toastContainer = null;

function ensureContainer() {
  if (toastContainer) return toastContainer;
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(toastContainer);
  return toastContainer;
}

export function showToast(message, type = 'info', duration = 4000) {
  const container = ensureContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}

export function initToast() {
  window.addEventListener('mnn:toast', (e) => {
    const { message, type } = e.detail;
    showToast(message, type);
  });
}
