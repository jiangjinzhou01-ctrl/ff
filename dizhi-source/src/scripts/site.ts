import './feedback';
import './menu';
import { springTo, springs, finishMotion } from './motion';
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const observers: IntersectionObserver[] = [];
const header = document.querySelector<HTMLElement>('#site-header');
const arrival = document.querySelector('#arrival');
if (header && arrival) {
  const observer = new IntersectionObserver(([entry]) => header.classList.toggle('is-solid', !entry.isIntersecting), { rootMargin: '-80px 0px 0px 0px' });
  observer.observe(arrival); observers.push(observer);
}

const dropdowns = new Map<HTMLElement, (open: boolean) => void>();
document.querySelectorAll<HTMLElement>('.nav-item').forEach(item => {
  const button = item.querySelector<HTMLButtonElement>('.submenu-toggle');
  const panel = item.querySelector<HTMLElement>('.submenu');
  if (!button || !panel) return;
  const set = (open: boolean) => {
    if (button.getAttribute('aria-expanded') === String(open)) return;
    button.setAttribute('aria-expanded', String(open)); panel.inert = !open;
    if (open) {
      const wasHidden = panel.hidden; panel.hidden = false;
      springTo(panel, {
        opacity: wasHidden ? [0, 1] : 1,
        transform: wasHidden ? ['translateY(-7px) scale(.98)', 'translateY(0px) scale(1)'] : 'translateY(0px) scale(1)',
      }, springs.surface);
    } else if (!panel.hidden) springTo(panel, { opacity: 0, transform: 'translateY(-5px) scale(.99)' }, springs.surface, () => { panel.hidden = true; });
  };
  dropdowns.set(item, set);
  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-expanded') !== 'true';
    dropdowns.forEach((close, other) => { if (other !== item) close(false); }); set(next);
  });
  item.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') { set(false); button.focus(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); set(true);
      const links = [...panel.querySelectorAll<HTMLAnchorElement>('a')];
      const current = links.indexOf(document.activeElement as HTMLAnchorElement);
      const index = event.key === 'ArrowDown' ? (current + 1) % links.length : (current < 0 ? links.length - 1 : (current - 1 + links.length) % links.length);
      links[index]?.focus();
    }
    if ((event.key === 'Home' || event.key === 'End') && panel.contains(document.activeElement)) {
      event.preventDefault(); const links = [...panel.querySelectorAll<HTMLAnchorElement>('a')];
      (event.key === 'Home' ? links[0] : links.at(-1))?.focus();
    }
  });
  item.addEventListener('focusout', () => queueMicrotask(() => { if (!item.contains(document.activeElement)) set(false); }));
});
document.addEventListener('click', event => { dropdowns.forEach((close, item) => { if (!item.contains(event.target as Node)) close(false); }); });

const indexLinks = [...document.querySelectorAll<HTMLAnchorElement>('.section-index a')];
if (indexLinks.length) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) indexLinks.forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -55% 0px' });
  indexLinks.forEach(link => { const section = document.querySelector(link.hash); if (section) observer.observe(section); });
  observers.push(observer);
}
if (!reduce.matches && window.matchMedia('(min-width: 768px)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      const era = (entry.target as HTMLElement).dataset.era;
      document.querySelectorAll<HTMLElement>('[data-era-year]').forEach(el => el.classList.toggle('is-active', el.dataset.eraYear === era));
    }
  }), { rootMargin: '-25% 0px -35% 0px' });
  document.querySelectorAll('[data-era]').forEach(el => observer.observe(el)); observers.push(observer);
}
if (!reduce.matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    if (reduce.matches) { observer.unobserve(entry.target); return; }
    entry.target.animate([{ opacity: .45, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' });
    observer.unobserve(entry.target);
  }), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el)); observers.push(observer);
}
function imageError(img: HTMLImageElement) {
  const wrapper = img.closest<HTMLElement>('.school-image');
  if (!wrapper) return;
  img.hidden = true; wrapper.classList.add('is-broken');
  const note = wrapper.querySelector<HTMLElement>('.image-failure'); if (note) note.hidden = false;
}
document.addEventListener('error', event => { if (event.target instanceof HTMLImageElement) imageError(event.target); }, true);
document.querySelectorAll<HTMLImageElement>('.school-image img').forEach(img => { if (img.complete && !img.naturalWidth) imageError(img); });

document.querySelectorAll<HTMLButtonElement>('[data-copy-address]').forEach(button => button.addEventListener('click', async () => {
  const status = document.querySelector<HTMLElement>('.copy-status');
  try {
    const value = button.dataset.copyAddress || '';
    if (!navigator.clipboard) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(value);
    button.dataset.copyState = 'success';
    const label = button.querySelector('span');
    if (label) label.textContent = '已复制地址';
    if (status) status.textContent = '地址已复制，可粘贴到地图或聊天中。';
  } catch {
    button.dataset.copyState = 'error';
    const label = button.querySelector('span'); if (label) label.textContent = '复制地址';
    if (status) status.textContent = '浏览器暂不支持复制，请长按或选择上方地址复制。';
  }
}));
window.addEventListener('pagehide', event => { dropdowns.forEach(close => close(false)); finishMotion(); if (!event.persisted) observers.forEach(o => o.disconnect()); });
