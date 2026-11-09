// Drag-to-reorder for simple lists: rows carry data-sort=<id>, and each has a grip.
// Works with mouse and touch; the arrow keys move a row while its grip has focus.
import { html } from '../vendor.js';

export const moveItem = (list, id, toId, after) => {
  const item = list.find((x) => x.id === id), rest = list.filter((x) => x.id !== id), at = rest.findIndex((x) => x.id === toId);
  if (!item || at < 0) return list;
  rest.splice(at + (after ? 1 : 0), 0, item);
  return rest;
};

const siblings = (row) => [...row.parentElement.children].filter((el) => el.dataset.sort);

export function Grip({ id, onMove, label }) {
  const down = (e) => {
    if (e.button) return;
    e.preventDefault();
    const row = e.currentTarget.closest('[data-sort]'), rows = siblings(row);
    let target = null;
    const clear = () => rows.forEach((r) => r.classList.remove('drop-before', 'drop-after'));
    row.classList.add('dragging');
    const move = (ev) => {
      const over = rows.find((r) => { const b = r.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2; });
      const to = over || rows[rows.length - 1];
      target = { id: to.dataset.sort, after: !over };
      clear();
      if (to !== row) to.classList.add(over ? 'drop-before' : 'drop-after');
    };
    const end = (ev) => {
      for (const t of ['pointermove', 'pointerup', 'pointercancel']) removeEventListener(t, t === 'pointermove' ? move : end);
      clear(); row.classList.remove('dragging');
      if (ev.type === 'pointerup' && target && target.id !== id) onMove(id, target.id, target.after);
    };
    addEventListener('pointermove', move); addEventListener('pointerup', end); addEventListener('pointercancel', end);
  };
  const key = (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const row = e.currentTarget.closest('[data-sort]'), rows = siblings(row), up = e.key === 'ArrowUp', to = rows[rows.indexOf(row) + (up ? -1 : 1)], list = row.parentElement;
    if (!to) return;
    onMove(id, to.dataset.sort, !up);
    requestAnimationFrame(() => [...list.children].find((el) => el.dataset.sort === id)?.querySelector('.grip')?.focus());
  };
  return html`<button type="button" class="grip" title="Drag to reorder" aria-label=${`Reorder ${label || 'this'}. Use the up and down arrow keys`} onPointerDown=${down} onKeyDown=${key}>⠿</button>`;
}
