import { springTo, springs, reducedMotion, stopMotion } from './motion';

const selector = '.action,.icon-button,.submenu-toggle,.submenu a,.quick-access>a,.gallery-figure>a,.news-filters>a,.search-suggestions>a,.campus-nav a,.menu-home,.mobile-nav-group summary,.faq-section summary,.era-tabs button,.era-pagination button,.chapter-guide a,.life figure>a,[data-copy-link],.beyond-links>a,.home-news-list h3 a';
let pressed: HTMLElement | null = null;
let pointer: { id: number; x: number; y: number } | null = null;

function control(target: EventTarget | null) {
  const element = target instanceof Element ? target.closest<HTMLElement>(selector) : null;
  return element && !element.matches(':disabled,[aria-disabled=true]') ? element : null;
}
function press(element: HTMLElement) {
  release();
  pressed = element; element.classList.add('has-press-feedback'); element.dataset.pressed = 'true';
  if (!reducedMotion.matches) {
    const scale = element.matches('.icon-button,.submenu-toggle') ? .9 : element.matches('summary,.gallery-figure>a,.quick-access>a') ? .985 : .965;
    springTo(element, { transform: `scale(${scale})` }, springs.press);
  }
}
function release() {
  if (!pressed) return;
  const element = pressed; pressed = null;
  delete element.dataset.pressed;
  springTo(element, { transform: 'scale(1)' }, springs.release, () => { element.style.removeProperty('transform'); });
}
document.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  const element = control(event.target); if (!element) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; press(element);
}, { passive: true });
document.addEventListener('pointermove', event => {
  if (!pointer || event.pointerId !== pointer.id || !pressed) return;
  // Scrolling cancels compression without capturing the pointer or blocking pan.
  if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 10) release();
}, { passive: true });
for (const type of ['pointerup', 'pointercancel'] as const) document.addEventListener(type, () => { pointer = null; release(); }, { passive: true });
document.addEventListener('keydown', event => {
  if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
  const element = control(event.target);
  if (element && (event.key === 'Enter' || element.matches('button,summary'))) press(element);
});
document.addEventListener('keyup', event => { if (event.key === 'Enter' || event.key === ' ') release(); });
window.addEventListener('blur', release);
document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
window.addEventListener('pagehide', release);

// Animate the native details element while preserving keyboard/no-JS behavior.
type Disclosure = { set: (open: boolean) => void; target: boolean };
const disclosures = new Map<HTMLDetailsElement, Disclosure>();
document.querySelectorAll<HTMLDetailsElement>('.mobile-nav-group,.faq-section details').forEach(details => {
  const summary = details.querySelector<HTMLElement>('summary');
  if (!summary) return;
  const content = [...details.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el !== summary);
  let animating = false;
  const controller: Disclosure = { target: details.open, set(open) {
    controller.target = open;
    animating = true;
    // Freeze the current visual height before measuring the next natural height.
    const current = details.getBoundingClientRect().height;
    stopMotion(details); details.style.height = ''; details.open = true;
    const expanded = details.getBoundingClientRect().height;
    const border = parseFloat(getComputedStyle(details).borderTopWidth) + parseFloat(getComputedStyle(details).borderBottomWidth);
    const target = open ? expanded : summary.getBoundingClientRect().height + border;
    content.forEach(el => { el.inert = !open; });
    summary.setAttribute('aria-expanded', String(open));
    details.dataset.expanded = String(open);
    details.style.overflow = 'clip';
    springTo(details, { height: [`${current}px`, `${target}px`] }, springs.disclosure, () => {
      details.open = controller.target;
      details.style.removeProperty('height'); details.style.removeProperty('overflow');
      content.forEach(el => { el.inert = false; });
      animating = false;
    });
  } };
  disclosures.set(details, controller);
  details.addEventListener('toggle', () => {
    // Browser find-in-page can open a details element without a summary click.
    if (animating) return;
    controller.target = details.open;
    summary.setAttribute('aria-expanded', String(details.open));
    details.dataset.expanded = String(details.open);
  });
  summary.addEventListener('click', event => {
    event.preventDefault();
    if (!controller.target && details.classList.contains('mobile-nav-group')) disclosures.forEach((other, node) => {
      if (node !== details && node.classList.contains('mobile-nav-group') && other.target) other.set(false);
    });
    controller.set(!controller.target);
  });
});
