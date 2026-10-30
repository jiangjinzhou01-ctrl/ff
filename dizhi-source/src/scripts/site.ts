export {};
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const observers: IntersectionObserver[] = [];
const header = document.querySelector<HTMLElement>('#site-header');
const arrival = document.querySelector('#arrival');
if (header && arrival) {
  const observer = new IntersectionObserver(([entry]) => header.classList.toggle('is-solid', !entry.isIntersecting), { rootMargin: '-80px 0px 0px 0px' });
  observer.observe(arrival); observers.push(observer);
}

const menu = document.querySelector<HTMLDialogElement>('#mobile-menu');
const menuOpen = document.querySelector<HTMLButtonElement>('#menu-open');
const menuClose = menu?.querySelector<HTMLButtonElement>('[data-menu-close]');
let savedScroll = 0;
let locked = false;
let closing = false;
function unlockPage() {
  if (!locked) return;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.documentElement.style.overflow = '';
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, savedScroll);
  document.documentElement.style.scrollBehavior = '';
  locked = false;
}
function closeMenu(restoreFocus = true) {
  if (!menu?.open || closing) return;
  closing = true;
  const finish = () => { menu.close(); unlockPage(); menuOpen?.setAttribute('aria-expanded', 'false'); closing = false; if (restoreFocus) menuOpen?.focus({ preventScroll: true }); };
  if (reduce.matches) finish();
  else menu.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 140, easing: 'cubic-bezier(.4,0,1,1)' }).finished.then(finish, finish);
}
menuOpen?.addEventListener('click', () => {
  if (!menu || menu.open) return;
  savedScroll = window.scrollY;
  menu.showModal();
  document.body.style.position = 'fixed'; document.body.style.top = `-${savedScroll}px`; document.body.style.width = '100%';
  document.documentElement.style.overflow = 'hidden'; locked = true;
  menuOpen.setAttribute('aria-expanded', 'true');
  menuClose?.focus({ preventScroll: true });
  if (!reduce.matches) menu.animate([{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)' });
});
menuClose?.addEventListener('click', () => closeMenu());
menu?.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
menu?.addEventListener('close', () => { unlockPage(); menuOpen?.setAttribute('aria-expanded', 'false'); });
menu?.querySelectorAll<HTMLAnchorElement>('a').forEach(link => link.addEventListener('click', event => {
  const destination = new URL(link.href);
  if (destination.pathname === location.pathname && destination.hash) {
    event.preventDefault(); menu.close(); unlockPage(); menuOpen?.setAttribute('aria-expanded', 'false'); location.assign(link.href);
  }
}));
window.matchMedia('(min-width: 1200px)').addEventListener('change', e => { if (e.matches && menu?.open) { menu.close(); unlockPage(); } });

document.querySelectorAll<HTMLElement>('.nav-item').forEach(item => {
  const button = item.querySelector<HTMLButtonElement>('.submenu-toggle');
  const panel = item.querySelector<HTMLElement>('.submenu');
  if (!button || !panel) return;
  const set = (open: boolean) => { panel.hidden = !open; button.setAttribute('aria-expanded', String(open)); };
  button.addEventListener('click', () => {
    const next = panel.hidden;
    document.querySelectorAll<HTMLButtonElement>('.submenu-toggle[aria-expanded=true]').forEach(other => { if (other !== button) other.click(); });
    set(next);
  });
  item.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { set(false); button.focus(); }
    if (event.key === 'ArrowDown' && panel.hidden) { event.preventDefault(); set(true); panel.querySelector<HTMLAnchorElement>('a')?.focus(); }
  });
  item.addEventListener('focusout', () => queueMicrotask(() => { if (!item.contains(document.activeElement)) set(false); }));
  document.addEventListener('click', event => { if (!item.contains(event.target as Node)) set(false); });
});

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
    if (status) status.textContent = '地址已复制，可粘贴到地图或聊天中。';
  } catch { if (status) status.textContent = '浏览器暂不支持复制，请长按或选择上方地址复制。'; }
}));
window.addEventListener('pagehide', event => { if (menu?.open) menu.close(); unlockPage(); if (!event.persisted) observers.forEach(o => o.disconnect()); });
