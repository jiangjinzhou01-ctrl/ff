import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const prefix = '/ff/dizhi/';
const files = fs.readdirSync(root, { recursive: true });
const html = files.filter(f => f.endsWith('.html'));
const failures = [];
let checked = 0;
const unescape = s => s.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
for (const file of html) {
  const content = fs.readFileSync(path.join(root,file),'utf8');
  if (!content.includes('lang="zh-CN"')) failures.push(`${file}: missing Chinese language`);
  if (!/<h1\b/.test(content)) failures.push(`${file}: missing H1`);
  if (!/<title>.+?<\/title>/.test(content)) failures.push(`${file}: missing title`);
  if (!/rel="canonical"/.test(content)) failures.push(`${file}: missing canonical`);
  if (/href="(?:#|)"/.test(content)) failures.push(`${file}: empty or dummy link`);
  for (const tag of content.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt=/.test(tag[0]) || !/\bwidth=/.test(tag[0]) || !/\bheight=/.test(tag[0])) failures.push(`${file}: image missing alt or dimensions`);
  }
  const attrs = [...content.matchAll(/\b(href|src|srcset|imagesrcset|action)="([^"]*)"/g)];
  for (const [, attr, value] of attrs) {
    const refs = attr.endsWith('srcset') ? value.split(',').map(s=>s.trim().split(/\s+/)[0]) : [value];
    for (const ref of refs) {
      if (!ref || /^(?:https?:|mailto:|tel:|data:)/.test(ref)) continue;
      const url = new URL(unescape(ref), `https://example.test${prefix}${file}`);
      if (!url.pathname.startsWith(prefix)) { failures.push(`${file}: path outside deployment base: ${ref}`); continue; }
      let relative = decodeURIComponent(url.pathname.slice(prefix.length));
      if (!relative || relative.endsWith('/')) relative += 'index.html';
      const target = path.join(root,relative);
      if (!fs.existsSync(target)) { failures.push(`${file}: missing ${ref}`); continue; }
      if (url.hash && target.endsWith('.html')) {
        const targetContent = fs.readFileSync(target,'utf8');
        const id = decodeURIComponent(url.hash.slice(1));
        if (!targetContent.includes(`id="${id}"`)) failures.push(`${file}: missing anchor ${ref}`);
      }
      checked++;
    }
  }
}
for (const file of files.filter(f=>f.endsWith('.css'))) {
  const css=fs.readFileSync(path.join(root,file),'utf8');
  for (const [,ref] of css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)) {
    if (/^(?:data:|https?:)/.test(ref)) continue;
    const url=new URL(ref,`https://example.test${prefix}${file}`);
    const target=path.join(root,decodeURIComponent(url.pathname.slice(prefix.length)));
    if (!url.pathname.startsWith(prefix)||!fs.existsSync(target)) failures.push(`${file}: missing CSS resource ${ref}`);
    checked++;
  }
}
if (!fs.existsSync(path.join(root,'pagefind/pagefind.js'))) failures.push('Search bundle missing');
for (const sitemap of files.filter(f=>/^sitemap.*\.xml$/.test(f))) {
  const xml=fs.readFileSync(path.join(root,sitemap),'utf8');
  for(const [,value] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url=new URL(value);
    let relative=url.pathname.slice(prefix.length);
    if(!relative||relative.endsWith('/')) relative+='index.html';
    if(!url.pathname.startsWith(prefix)||!fs.existsSync(path.join(root,relative))) failures.push(`${sitemap}: sitemap target missing ${value}`);
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Verified ${html.length} HTML routes and ${checked} internal links, anchors and assets under ${prefix}.`);
