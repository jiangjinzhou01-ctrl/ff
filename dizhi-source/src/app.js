const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => [...c.querySelectorAll(s)];
const menu = $('#mobile-nav');
$('#menu-toggle')?.addEventListener('click', () => {
  const open = $('#menu-toggle').getAttribute('aria-expanded') !== 'true';
  $('#menu-toggle').setAttribute('aria-expanded', String(open));
  menu.hidden = !open;
});
const savedTheme = localStorage.getItem('dizhi-theme');
if(savedTheme) document.documentElement.dataset.theme = savedTheme;
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#theme-toggle')?.setAttribute('aria-label', dark ? '切换浅色模式' : '切换深色模式');
  $('#theme-toggle')?.setAttribute('aria-pressed',String(dark));
}
updateThemeButton();
$('#theme-toggle')?.addEventListener('click', () => {
  const isDark = $('#theme-toggle').getAttribute('aria-pressed') === 'true';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('dizhi-theme',isDark ? 'light' : 'dark');
  updateThemeButton();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',updateThemeButton);
const search = $('#search-dialog');
$('#search-toggle')?.addEventListener('click',()=>{search.showModal();$('#site-search').focus()});
search?.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();search.close()}});
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$$('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}}));
const searchData = [
  {title:'学校概况 · 七十载育人历程',text:'学校介绍 校史 校训 1955 李四光 初中 高中',url:'about.html'},
  {title:'招生信息 · 入学与报考指南',text:'招生 报名 入学 志愿 政策 家长 录取',url:'admissions.html'},
  {title:'特色教育 · 科学与体艺',text:'科学 教学 课程 体育 篮球 武术 创新 教育',url:'education.html'},
  {title:'校园导览 · 在地中遇见成长',text:'校园 地址 交通 导航 位置 电话 实验室 体育馆',url:'campus.html'},
  ...Array.from(document.querySelectorAll('[data-search-news]')).map(el=>({title:el.dataset.title,text:el.dataset.category,url:el.dataset.url}))
];
function searchSite() {
  const q = $('#site-search').value.trim().toLowerCase();
  const result=$('#search-results');result.replaceChildren();
  if(!q){result.innerHTML='<p class="search-hint">试试搜索“招生”“篮球”或“校园”</p>';return;}
  const hits=searchData.filter(i=>(i.title+' '+i.text).toLowerCase().includes(q));
  if(!hits.length){result.innerHTML='<div class="empty-state"><strong>暂未找到相关内容</strong><p>换一个关键词，或从顶部导航继续浏览。</p></div>';return;}
  hits.forEach(item=>{const a=document.createElement('a');a.href=item.url;a.textContent=item.title;const span=document.createElement('span');span.textContent='↗';a.append(span);result.append(a)});
}
$('#site-search')?.addEventListener('input',searchSite);
$$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  const filter=button.dataset.filter;
  $$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  $$('[data-news-category]').forEach(item=>item.hidden=filter!=='全部' && item.dataset.newsCategory!==filter);
  const empty=$('#news-empty');if(empty)empty.hidden=$$('[data-news-category]').some(i=>!i.hidden);
}));
$$('[data-gallery]').forEach(button=>button.addEventListener('click',()=>{
  const dialog=$('#gallery-dialog');const img=$('img',button);$('#gallery-image').src=img.src;$('#gallery-image').alt=img.alt;$('#gallery-title').textContent=button.dataset.gallery;dialog.showModal();
}));
$('#copy-address')?.addEventListener('click',async()=>{
  const out=$('#copy-status');
  try{await navigator.clipboard.writeText('湖南省长沙市雨花区人民中路168号');out.textContent='地址已复制';}
  catch{out.textContent='请手动复制：湖南省长沙市雨花区人民中路168号';}
});
// IntersectionObserver keeps navigation state in step with the section in view.
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){$$('.page-index a').forEach(a=>a.classList.toggle('current',a.hash==='#'+e.target.id))}}),{rootMargin:'-15% 0px -65% 0px'});
 $$('section[id]').forEach(s=>observer.observe(s));
}
