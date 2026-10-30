import { springTo, stopMotion, springs, reducedMotion } from './motion';

const menu = document.querySelector<HTMLDialogElement>('#mobile-menu');
const trigger = document.querySelector<HTMLButtonElement>('#menu-open');
const close = menu?.querySelector<HTMLButtonElement>('[data-menu-close]');
const dragArea = menu?.querySelector<HTMLElement>('[data-menu-drag]');
let savedScroll = 0;
let locked = false;
let state: 'closed' | 'open' | 'closing' = 'closed';
let drag: { id: number; start: number; last: number; time: number; offset: number; velocity: number } | null = null;

function unlock() {
  if (!locked) return;
  document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = '';
  document.documentElement.style.overflow = '';
  const previous = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, savedScroll); document.documentElement.style.scrollBehavior = previous;
  locked = false;
}
function finishClose(restoreFocus = true) {
  if (!menu) return;
  stopMotion(menu); state = 'closed'; menu.close(); unlock();
  trigger?.setAttribute('aria-expanded', 'false');
  menu.style.removeProperty('transform'); menu.style.removeProperty('opacity');
  if (restoreFocus) trigger?.focus({ preventScroll: true });
}
function closeMenu(restoreFocus = true) {
  if (!menu?.open || state === 'closing') return;
  state = 'closing'; trigger?.setAttribute('aria-expanded', 'false');
  if (reducedMotion.matches) { finishClose(restoreFocus); return; }
  const offset = new DOMMatrix(getComputedStyle(menu).transform).m42;
  springTo(menu, { transform: `translateY(${Math.max(offset + 40, Math.min(innerHeight * .15, 100))}px)`, opacity: 0 }, { ...springs.surface, stiffness: 540, damping: 44 }, () => finishClose(restoreFocus));
}
trigger?.addEventListener('click', () => {
  if (!menu) return;
  if (menu.open) {
    // Reverse a closing animation from its current position, without flashing.
    state = 'open'; trigger.setAttribute('aria-expanded', 'true');
    springTo(menu, { transform: 'translateY(0px)', opacity: 1 }); return;
  }
  savedScroll = scrollY; menu.showModal(); state = 'open';
  document.body.style.position = 'fixed'; document.body.style.top = `-${savedScroll}px`; document.body.style.width = '100%';
  document.documentElement.style.overflow = 'hidden'; locked = true;
  trigger.setAttribute('aria-expanded', 'true'); close?.focus({ preventScroll: true });
  springTo(menu, { transform: ['translateY(48px)', 'translateY(0px)'], opacity: [0, 1] });
  if (!reducedMotion.matches) menu.querySelector('.mobile-menu-scroll')?.animate([
    { transform: 'translateY(12px)', opacity: .5 }, { transform: 'translateY(0)', opacity: 1 },
  ], { duration: 380, easing: 'cubic-bezier(.2,.8,.25,1)' });
});
close?.addEventListener('click', () => closeMenu());
menu?.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
menu?.addEventListener('close', () => { state = 'closed'; unlock(); trigger?.setAttribute('aria-expanded', 'false'); });
menu?.querySelectorAll<HTMLAnchorElement>('a').forEach(link => link.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const destination = new URL(link.href);
  if (destination.pathname === location.pathname && destination.hash) {
    event.preventDefault(); finishClose(false); location.assign(link.href);
    document.querySelector<HTMLElement>(destination.hash)?.focus({ preventScroll: true });
  }
}));
matchMedia('(min-width: 1200px)').addEventListener('change', event => { if (event.matches && menu?.open) finishClose(false); });

// Drag only the menu's top bar. Page and menu content keep native touch scrolling.
dragArea?.addEventListener('pointerdown', event => {
  if (!menu?.open || !event.isPrimary || event.button !== 0 || state !== 'open' || reducedMotion.matches || (event.target as Element).closest('button,a')) return;
  stopMotion(menu); menu.style.opacity = '1';
  drag = { id: event.pointerId, start: event.clientY, last: event.clientY, time: event.timeStamp, offset: 0, velocity: 0 };
  dragArea.setPointerCapture(event.pointerId);
});
dragArea?.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id || !menu) return;
  const raw = Math.max(0, event.clientY - drag.start);
  // Resistance increases with travel rather than letting the surface run away.
  drag.offset = raw * .72;
  const delta = event.timeStamp - drag.time;
  if (delta > 0) drag.velocity = (event.clientY - drag.last) / delta * 1000;
  drag.last = event.clientY; drag.time = event.timeStamp;
  menu.style.transform = `translateY(${drag.offset}px)`;
});
function endDrag(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id || !menu) return;
  const dismiss = event.type !== 'pointercancel' && (drag.offset > 85 || (drag.offset > 25 && drag.velocity > 650 && event.timeStamp - drag.time < 100));
  drag = null;
  if (dragArea?.hasPointerCapture(event.pointerId)) dragArea.releasePointerCapture(event.pointerId);
  if (dismiss) closeMenu();
  else springTo(menu, { transform: 'translateY(0px)', opacity: 1 });
}
dragArea?.addEventListener('pointerup', endDrag);
dragArea?.addEventListener('pointercancel', endDrag);
window.addEventListener('pagehide', () => { drag = null; if (menu?.open) finishClose(false); unlock(); });
