import fs from 'node:fs';
import path from 'node:path';
const dir=path.resolve(import.meta.dirname,'..',process.env.DIZHI_OUTPUT_DIR || 'dist');
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.html'));
const errors=[];
for(const file of files){
 const html=fs.readFileSync(path.join(dir,file),'utf8');
 for(const match of html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){
  const target=match[1];
  if(/^(?:https?:|data:|mailto:|tel:)/.test(target))continue;
  if(!fs.existsSync(path.resolve(dir,target)))errors.push(`${file}: missing ${target}`);
 }
 for(const match of html.matchAll(/href="([a-z-]+\.html)?(?:\?[^"#]*)?#([^"?]+)"/g)){
  const targetHtml=match[1]?fs.readFileSync(path.join(dir,match[1]),'utf8'):html;
  if(!targetHtml.includes(`id="${match[2]}"`))errors.push(`${file}: missing anchor ${match[0]}`);
 }
 if(!html.includes('<main id="main">')||!html.includes('lang="zh-CN"'))errors.push(`${file}: missing accessibility landmarks`);
 if(html.includes('—'))errors.push(`${file}: prohibited em dash`);
 if(/[↗▷Ⅱ→←]/u.test(html))errors.push(`${file}: text character used as a control icon`);
 if(html.includes('brand-mark'))errors.push(`${file}: obsolete single-character logo`);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 if(new Set(ids).size!==ids.length)errors.push(`${file}: duplicate id`);
}
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
for(const match of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)){
 const file=path.resolve(dir,match[1].split('?')[0].split('#')[0]);
 if(!fs.existsSync(file)||fs.statSync(file).size===0)errors.push(`style.css: missing or empty ${match[1]}`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Verified ${files.length} pages: local links, images, section anchors and landmarks.`);
