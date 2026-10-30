import { revealResults } from './motion';
interface SearchData { url: string; excerpt: string; meta: { title?: string; section?: string }; }
interface SearchHit { data: () => Promise<SearchData>; }
interface Pagefind { search: (query: string) => Promise<{ results: SearchHit[] }>; options: (config: { baseUrl: string }) => Promise<void>; }
const form = document.querySelector<HTMLFormElement>('#search-form')!;
const input = document.querySelector<HTMLInputElement>('#search-input')!;
const status = document.querySelector<HTMLElement>('#search-status')!;
const results = document.querySelector<HTMLElement>('#search-results')!;
const more = document.querySelector<HTMLButtonElement>('#search-more')!;
const clear = document.querySelector<HTMLButtonElement>('#search-clear')!;
const base = document.body.dataset.base || '/';
let engine: Promise<Pagefind> | undefined;
let loadAttempt = 0;
let generation = 0;
let hits: SearchHit[] = [];
let shown = 0;
let currentTerm = '';
let composing = false;
let timer: ReturnType<typeof setTimeout>;

function cleanExcerpt(html: string) {
  const fragment = document.createDocumentFragment();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const append = (node: Node, parent: Node) => {
    if (node.nodeType === Node.TEXT_NODE) { parent.appendChild(document.createTextNode(node.textContent || '')); return; }
    if (node instanceof Element && node.tagName === 'MARK') {
      const mark = document.createElement('mark'); mark.textContent = node.textContent; parent.appendChild(mark); return;
    }
    node.childNodes.forEach(child => append(child, parent));
  };
  doc.body.childNodes.forEach(node => append(node, fragment)); return fragment;
}
async function appendResults(token: number, replace = false) {
  more.disabled = true;
  const data = await Promise.all(hits.slice(shown, shown + 8).map(h => h.data()));
  if (token !== generation) return;
  if (replace) results.replaceChildren();
  const added: HTMLElement[] = [];
  for (const item of data) {
    const url = new URL(item.url, location.origin);
    if (url.origin !== location.origin || !url.pathname.startsWith(base)) continue;
    const article = document.createElement('article'); article.className = 'search-result';
    const category = document.createElement('span'); category.textContent = item.meta.section || '学校信息';
    const title = document.createElement('h2'); const link = document.createElement('a'); link.href = url.pathname + url.search + url.hash; link.textContent = item.meta.title || '查看内容'; title.append(link);
    const excerpt = document.createElement('p'); excerpt.append(cleanExcerpt(item.excerpt));
    article.append(category, title, excerpt); results.append(article); added.push(article);
  }
  revealResults(added);
  shown += data.length; more.hidden = shown >= hits.length; more.disabled = false;
}
function updateUrl(push: boolean) {
  const url = new URL(location.href); const q = input.value.trim();
  if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
  if (url.href !== location.href) history[push ? 'pushState' : 'replaceState']({}, '', url);
}
async function search(push = false, update = true) {
  const token = ++generation; const term = input.value.trim();
  if (update) updateUrl(push);
  clear.hidden = !term;
  document.querySelectorAll<HTMLElement>('[data-query]').forEach(link => { if (link.dataset.query === term) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current'); });
  more.hidden = true; hits = []; shown = 0; currentTerm = term;
  if (!term) { results.replaceChildren(); results.inert = false; status.classList.remove('is-loading'); status.textContent = '输入关键词，查找全站内容。'; results.setAttribute('aria-busy', 'false'); return; }
  results.inert = true; status.classList.add('is-loading');
  status.textContent = `正在查找“${term}”…`; results.setAttribute('aria-busy', 'true');
  try {
    const moduleUrl = `${base}pagefind/pagefind.js${loadAttempt ? `?retry=${loadAttempt}` : ''}`;
    engine ||= import(/* @vite-ignore */ moduleUrl) as Promise<Pagefind>;
    const pagefind = await engine;
    await pagefind.options({ baseUrl: base });
    const response = await pagefind.search(term);
    if (token !== generation) return;
    hits = response.results;
    if (!hits.length) {
      results.replaceChildren();
      status.textContent = `没有找到与“${term}”相关的内容。`;
      const p = document.createElement('p'); p.className = 'source-note'; p.textContent = '可以尝试更短的关键词，例如“招生”“篮球”或“校训”，或通过顶部栏目继续浏览。'; results.append(p);
    } else {
      status.textContent = `找到 ${hits.length} 条与“${term}”相关的内容。`;
      await appendResults(token, true);
    }
  } catch {
    if (token !== generation) return;
    results.replaceChildren(); engine = undefined; loadAttempt++; status.textContent = '搜索暂时无法加载，请检查网络后重试。';
    const retry = document.createElement('button'); retry.className = 'action action-outline search-retry'; retry.textContent = '重新搜索'; retry.addEventListener('click', () => search(false)); results.append(retry);
    const p = document.createElement('p'); p.className = 'source-note';
    const a = document.createElement('a'); a.href = `${base}news.html`; a.textContent = '也可以直接浏览新闻动态'; p.append(a); results.append(p);
  } finally { if (token === generation) { results.setAttribute('aria-busy', 'false'); results.inert = false; status.classList.remove('is-loading'); } }
}
form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); if (!composing) search(true); });
input.addEventListener('input', event => {
  clear.hidden = !input.value; clearTimeout(timer);
  if (!(event as InputEvent).isComposing) timer = setTimeout(() => search(false), 250);
});
input.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); });
input.addEventListener('compositionend', () => { composing = false; clearTimeout(timer); timer = setTimeout(() => search(false), 250); });
clear.addEventListener('click', () => { clearTimeout(timer); input.value = ''; search(true); input.focus({ preventScroll: true }); });
document.querySelectorAll<HTMLAnchorElement>('[data-query]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); clearTimeout(timer); input.value = link.dataset.query || ''; search(true); input.focus({ preventScroll: true }); }));
more.addEventListener('click', async () => {
  const token = generation;
  try { await appendResults(token); status.textContent = `已显示 ${shown} / ${hits.length} 条“${currentTerm}”的搜索结果。`; }
  catch { status.textContent = '部分结果加载失败，请重试。'; more.disabled = false; }
});
window.addEventListener('popstate', () => { input.value = new URL(location.href).searchParams.get('q') || ''; search(false, false); });
input.value = new URL(location.href).searchParams.get('q') || '';
clear.hidden = !input.value;
if (input.value) search(false, false);
