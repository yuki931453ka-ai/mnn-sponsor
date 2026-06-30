// PC用ドラッグ&ドロップのスタイルヘルパー
// 実際のドラッグロジックはrender-kanban.js内で処理
export function initDragStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .kanban-card.dragging { opacity: 0.4; transform: scale(0.95); }
    .kanban-cards.drag-over { background: rgba(212,160,23,0.08); border-radius: var(--radius); }
  `;
  document.head.appendChild(style);
}
