import { reducedMotion } from './motion';

// Finite effects only. Content stays readable before JavaScript and after interruption.
const activeMotion = new Set<Animation>();
function play(element: Element | null, frames: Keyframe[], duration = 650, delay = 0) {
  if (!element || reducedMotion.matches) return;
  const animation = element.animate(frames, { duration, delay, easing: 'cubic-bezier(.2,.8,.25,1)' });
  activeMotion.add(animation);
  animation.finished.catch(() => {}).finally(() => activeMotion.delete(animation));
}
function settle() {
  activeMotion.forEach(animation => { try { animation.finish(); } catch { animation.cancel(); } });
  activeMotion.clear();
}
reducedMotion.addEventListener('change', event => { if (event.matches) settle(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
window.addEventListener('pagehide', settle);

const hero = document.querySelector('.arrival');
if (hero && !reducedMotion.matches) {
  play(hero.querySelector('img'), [{ transform: 'scale(1.055)' }, { transform: 'scale(1)' }], 1100);
  hero.querySelectorAll('.hero-line > span').forEach((line, i) => play(line, [
    { opacity: .2, transform: 'translateY(36px)' }, { opacity: 1, transform: 'translateY(0)' },
  ], 720, 90 + i * 120));
  play(hero.querySelector('.arrival-kicker'), [{ opacity: .2, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }], 600);
  play(hero.querySelector('.arrival-sub'), [{ opacity: .2, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }], 650, 280);
}

const revealed = new WeakSet<Element>();
const revealObserver = new IntersectionObserver(entries => {
  let order = 0;
  for (const entry of entries) {
    if (!entry.isIntersecting || revealed.has(entry.target)) continue;
    revealed.add(entry.target); revealObserver.unobserve(entry.target);
    const delay = Math.min(order++, 3) * 85;
    play(entry.target, [{ opacity: .18, transform: 'translateY(28px)' }, { opacity: 1, transform: 'translateY(0)' }], 650, delay);
    if (entry.target.matches('figure')) play(entry.target.querySelector('img'), [
      { transform: 'scale(1.065)' }, { transform: 'scale(1)' },
    ], 900, delay);
  }
}, { threshold: .09 });
document.querySelectorAll('.chapter-line,.legacy-introduction,.spirit-top,.motto-words>span,.life-title,.life-main,.life-small,.beyond h2,.beyond-feature,.beyond-links>a,.section-title,.lead-news,.home-news-list>article,.journey-copy>h2,.journey-copy>p,.page-title-row,.reading-section>h2,.news-row,.gallery-figure').forEach(el => revealObserver.observe(el));

// The same selectable history and swipe behavior on every screen size.
document.querySelectorAll<HTMLElement>('[data-timeline]').forEach(timeline => {
  const tabs = [...timeline.querySelectorAll<HTMLButtonElement>('[data-era-select]')];
  const records = [...timeline.querySelectorAll<HTMLElement>('[data-era]')];
  const years = [...timeline.querySelectorAll<HTMLElement>('[data-era-year]')];
  const viewport = timeline.querySelector<HTMLElement>('[data-era-viewport]');
  const prev = timeline.querySelector<HTMLButtonElement>('[data-era-prev]');
  const next = timeline.querySelector<HTMLButtonElement>('[data-era-next]');
  const status = timeline.querySelector<HTMLElement>('[data-era-status]');
  if (!viewport || !records.length || tabs.length !== records.length) return;
  let selected = -1;
  function select(index: number, animate = true) {
    index = Math.max(0, Math.min(records.length - 1, index));
    if (selected === index) return;
    const direction = index > selected ? 1 : -1;
    selected = index;
    [...records, ...years].forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    records.forEach((record, i) => {
      record.hidden = i !== index; record.setAttribute('role', 'tabpanel');
      record.setAttribute('aria-labelledby', tabs[i].id); record.tabIndex = 0;
    });
    years.forEach((year, i) => year.classList.toggle('is-active', i === index));
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === records.length - 1;
    if (status) status.textContent = `0${index + 1} / 0${records.length} · ${records[index].dataset.era}`;
    if (animate) {
      play(records[index], [{ transform: `translateX(${direction * 26}px)` }, { transform: 'translateX(0)' }], 420);
      play(years[index], [{ opacity: .15, transform: `translateY(${direction * 28}px)` }, { opacity: 1, transform: 'translateY(0)' }], 480);
    }
  }
  timeline.classList.add('is-interactive');
  timeline.querySelectorAll<HTMLElement>('[data-era-controls]').forEach(el => el.hidden = false);
  select(Math.max(0, records.findIndex(record => `#${record.id}` === location.hash)), false);
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      let target: number | undefined;
      if (event.key === 'ArrowRight') target = (selected + 1) % tabs.length;
      if (event.key === 'ArrowLeft') target = (selected - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      if (target === undefined) return;
      event.preventDefault(); select(target); tabs[target].focus();
    });
  });
  prev?.addEventListener('click', () => select(selected - 1));
  next?.addEventListener('click', () => select(selected + 1));
  let start: {x: number; y: number; id: number} | null = null;
  viewport.addEventListener('pointerdown', event => {
    if (event.isPrimary && event.button === 0) start = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }, { passive: true });
  viewport.addEventListener('pointerup', event => {
    if (!start || start.id !== event.pointerId) return;
    const x = event.clientX - start.x, y = event.clientY - start.y; start = null;
    if (event.pointerType === 'mouse' && getSelection()?.toString()) return;
    if (Math.abs(x) >= 48 && Math.abs(x) > Math.abs(y) * 1.3) select(selected + (x < 0 ? 1 : -1));
  }, { passive: true });
  viewport.addEventListener('pointercancel', () => { start = null; }, { passive: true });
  window.addEventListener('hashchange', () => {
    const index = records.findIndex(record => `#${record.id}` === location.hash);
    if (index >= 0) select(index);
  });
});

const progress = document.querySelector<HTMLElement>('[data-reading-progress]');
const label = document.querySelector<HTMLElement>('[data-reading-label]');
const guide = document.querySelector<HTMLElement>('[data-chapter-guide]');
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]')];
const sections = links.map(link => document.getElementById(link.dataset.chapterLink || ''));
const guideNav = guide?.querySelector<HTMLElement>('nav');
let currentChapter = -1, requestedFrame = 0, userPanning = false, lastPercent = -1;
guideNav?.addEventListener('pointerdown', () => { userPanning = true; }, { passive: true });
window.addEventListener('pointerup', () => { userPanning = false; }, { passive: true });
window.addEventListener('pointercancel', () => { userPanning = false; }, { passive: true });
function updateReading() {
  requestedFrame = 0;
  if (document.body.style.position === 'fixed') return;
  const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 80;
  const main = document.querySelector('main');
  const article = document.querySelector('.article-reading');
  const end = (article || main)?.getBoundingClientRect().bottom || innerHeight;
  const length = Math.max(1, end + scrollY - innerHeight);
  const amount = Math.max(0, Math.min(1, scrollY / length));
  if (progress) progress.style.transform = `scaleX(${amount})`;
  const percent = Math.round(amount * 100);
  if (label && percent !== lastPercent) { label.textContent = `阅读进度 ${percent}%`; lastPercent = percent; }
  let index = 0;
  sections.forEach((section, i) => { if (section && section.getBoundingClientRect().top <= headerHeight + (guide?.getBoundingClientRect().height || 0) + 40) index = i; });
  if (!links.length || currentChapter === index) return;
  currentChapter = index;
  links.forEach((link, i) => { if (i === index) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current'); });
  const status = guide?.querySelector('[data-chapter-status]');
  if (status) status.textContent = `0${index + 1} / 0${links.length}`;
  if (guideNav && !userPanning) {
    const active = links[index], box = active.getBoundingClientRect(), navBox = guideNav.getBoundingClientRect();
    if (box.left < navBox.left || box.right > navBox.right) guideNav.scrollTo({ left: active.offsetLeft - guideNav.offsetLeft - (guideNav.clientWidth - active.clientWidth) / 2, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
}
function scheduleReading() { if (!requestedFrame) requestedFrame = requestAnimationFrame(updateReading); }
window.addEventListener('scroll', scheduleReading, { passive: true });
window.addEventListener('resize', scheduleReading, { passive: true });
window.addEventListener('pageshow', scheduleReading);
new ResizeObserver(scheduleReading).observe(document.documentElement);
scheduleReading();

document.querySelectorAll<HTMLButtonElement>('[data-copy-link]').forEach(button => {
  button.addEventListener('click', async () => {
    const status = document.querySelector<HTMLElement>('.link-copy-status');
    try {
      const url = document.querySelector<HTMLLinkElement>('link[rel=canonical]')?.href || location.href.split('#')[0];
      await navigator.clipboard.writeText(url);
      if (status) status.textContent = '链接已复制，可以分享给他人。';
      button.dataset.copyState = 'success';
    } catch {
      if (status) status.textContent = '自动复制暂不可用，请复制浏览器地址栏中的链接。';
    }
  });
});
