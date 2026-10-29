const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const G=window.gsap;
const animated=()=>!!G&&!motionPreference.matches;
const animateIn=(target,vars={})=>{if(animated())G.fromTo(target,{opacity:0,y:18},{opacity:1,y:0,duration:.55,ease:'power3.out',...vars});};

// Native dialogs supply focus trapping and return focus to the opening control.
const dialogTriggers=new Map();
function openDialog(dialog,trigger){
 if(!dialog||dialog.open)return;
 dialogTriggers.set(dialog,trigger||document.activeElement);dialog.showModal();document.body.classList.add('dialog-open');
 if(dialog.id==='menu-dialog')$('#menu-toggle').setAttribute('aria-expanded','true');
 if(animated()){
  G.fromTo(dialog,{opacity:0,x:dialog.id==='menu-dialog'?65:0,y:dialog.id==='menu-dialog'?0:24},{opacity:1,x:0,y:0,duration:.55,ease:'power3.out'});
  if(dialog.id==='menu-dialog')G.fromTo($$('nav a',dialog),{opacity:0,x:35},{opacity:1,x:0,duration:.65,stagger:.055,ease:'power3.out',delay:.1});
 }
}
function closeDialog(dialog){
 if(!dialog?.open||dialog.dataset.closing)return;
 dialog.dataset.closing='true';
 const done=()=>{dialog.close();delete dialog.dataset.closing;G?.set(dialog,{clearProps:'opacity,transform'});dialogTriggers.get(dialog)?.focus({preventScroll:true});};
 if(animated())G.to(dialog,{opacity:0,x:dialog.id==='menu-dialog'?45:0,y:dialog.id==='menu-dialog'?0:14,duration:.22,ease:'power2.in',onComplete:done});else done();
}
$$('dialog').forEach(d=>{
 d.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('dialog-open');if(d.id==='menu-dialog')$('#menu-toggle').setAttribute('aria-expanded','false');});
 d.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeDialog(d);}});
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});
});
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.closest('dialog'))));
$('#menu-toggle')?.addEventListener('click',e=>openDialog($('#menu-dialog'),e.currentTarget));
$('#search-toggle')?.addEventListener('click',e=>{openDialog($('#search-dialog'),e.currentTarget);$('#site-search').focus({preventScroll:true});});

// Theme preference remains consistent across all static routes.
try{const theme=localStorage.getItem('dizhi-theme');if(theme)document.documentElement.dataset.theme=theme;}catch{}
const isDark=()=>document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme:dark)').matches);
function updateTheme(){const dark=isDark();$('#theme-toggle')?.setAttribute('aria-pressed',String(dark));$('#theme-toggle')?.setAttribute('aria-label',dark?'切换浅色模式':'切换深色模式');}
updateTheme();
$('#theme-toggle')?.addEventListener('click',()=>{const theme=isDark()?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('dizhi-theme',theme);}catch{}updateTheme();});
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',updateTheme);

// Search indexes the actual routes and article data. User text is never inserted as HTML.
const searchData=[
 {title:'学校概况 · 七十载育人历程',text:'学校介绍 校史 校训 1955 李四光 初中 高中',url:'about.html'},
 {title:'招生信息 · 入学与报考指南',text:'招生 报名 入学 志愿 政策 家长 录取',url:'admissions.html'},
 {title:'特色教育 · 科学与体艺',text:'科学 教学 课程 体育 篮球 武术 创新 教育',url:'education.html'},
 {title:'校园导览 · 在地中遇见成长',text:'校园 地址 交通 导航 位置 电话 实验室 体育馆',url:'campus.html'},
 ...$$('[data-search-news]').map(el=>({title:el.dataset.title,text:el.dataset.category,url:el.dataset.url}))
];
function searchSite(){
 const q=$('#site-search').value.trim().toLowerCase();const result=$('#search-results');result.replaceChildren();
 if(!q){result.innerHTML='<p class="search-hint">试试“招生”“篮球”或“校园”</p>';return;}
 const hits=searchData.filter(i=>(i.title+' '+i.text).toLowerCase().includes(q));
 if(!hits.length){result.innerHTML='<div class="empty-state"><strong>暂未找到相关内容</strong><p>换一个关键词，或者从导航继续了解学校。</p></div>';animateIn(result);return;}
 hits.forEach(item=>{const a=document.createElement('a');a.href=item.url;a.textContent=item.title;const arrow=document.createElement('span');arrow.textContent='↗';a.append(arrow);result.append(a);});animateIn($$('a',result),{stagger:.04,duration:.35});
}
$('#site-search')?.addEventListener('input',searchSite);
$('#site-search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){$('#search-results a')?.focus();e.preventDefault();}});

// A real timed carousel: active image, tabs and progress share one state.
const heroSlides=$$('[data-hero-slide]'),heroTabs=$$('[data-hero-index]');
if(heroSlides.length){
 let active=0,userPaused=motionPreference.matches,hovered=false,focused=false,visible=true,progress=null;
 const pauseButton=$('#hero-pause');
 function shouldPlay(){return !userPaused&&!hovered&&!focused&&visible&&!document.hidden&&!motionPreference.matches;}
 function playback(){
  pauseButton.disabled=motionPreference.matches;pauseButton.setAttribute('aria-pressed',String(userPaused));pauseButton.setAttribute('aria-label',motionPreference.matches?'系统设置已暂停自动播放':userPaused?'播放影像轮播':'暂停影像轮播');$('.pause-glyph',pauseButton).textContent=userPaused?'▷':'Ⅱ';
  if(progress){if(shouldPlay())progress.play();else progress.pause();}
 }
 function startProgress(){
  progress?.kill();heroTabs.forEach(t=>{const bar=$('i',t);bar.style.transform='scaleX(0)';});
  if(G){progress=G.fromTo($('i',heroTabs[active]),{scaleX:0},{scaleX:1,duration:6.5,ease:'none',paused:true,onComplete:()=>show((active+1)%heroSlides.length)});}
  playback();
 }
 function show(index){
  const next=(index+heroSlides.length)%heroSlides.length;if(next===active)return;
  const old=active;active=next;
  heroTabs.forEach((t,i)=>t.setAttribute('aria-pressed',String(i===active)));
  if(animated()){
   G.killTweensOf(heroSlides);heroSlides.forEach((s,i)=>{s.hidden=i!==old&&i!==active;G.set(s,{opacity:i===active?0:1,zIndex:i===active?2:1});});
   G.fromTo($('img',heroSlides[active]),{scale:1.08,xPercent:1.5},{scale:1,xPercent:0,duration:1.2,ease:'power3.out',overwrite:true});
   G.to(heroSlides[active],{opacity:1,duration:.7,ease:'power2.out',onComplete:()=>heroSlides.forEach((s,i)=>{s.hidden=i!==active;})});
   G.fromTo($('figcaption',heroSlides[active]),{opacity:0,y:15},{opacity:1,y:0,duration:.65,delay:.18,ease:'power3.out',overwrite:true});
  }else heroSlides.forEach((s,i)=>{s.hidden=i!==active;s.style.opacity='1';});
  startProgress();
 }
 heroTabs.forEach((t,i)=>t.addEventListener('click',()=>show(i)));
 pauseButton.addEventListener('click',()=>{userPaused=!userPaused;playback();});
 const controls=$('.hero-controls');controls.addEventListener('pointerenter',()=>{hovered=true;playback();});controls.addEventListener('pointerleave',()=>{hovered=false;playback();});
 controls.addEventListener('focusin',()=>{focused=true;playback();});controls.addEventListener('focusout',()=>{setTimeout(()=>{focused=controls.contains(document.activeElement);playback();},0);});
 controls.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(active+(e.key==='ArrowRight'?1:-1));heroTabs[active].focus();}});
 let touch=null;$('.hero-slides').addEventListener('pointerdown',e=>{touch={x:e.clientX,y:e.clientY};});$('.hero-slides').addEventListener('pointerup',e=>{if(touch){const x=e.clientX-touch.x,y=e.clientY-touch.y;if(Math.abs(x)>40&&Math.abs(x)>Math.abs(y))show(active+(x<0?1:-1));touch=null;}});
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;playback();},{threshold:.15}).observe($('.hero'));
 document.addEventListener('visibilitychange',playback);
 motionPreference.addEventListener('change',()=>{userPaused=motionPreference.matches;if(userPaused&&G){G.killTweensOf(heroSlides);heroSlides.forEach((s,i)=>{s.hidden=i!==active;G.set(s,{opacity:1});});}playback();});startProgress();
}

// Editorial previews respond to hover, keyboard focus and explicit preview buttons.
const journalEntries=$$('[data-journal]');
function previewJournal(index){
 journalEntries.forEach((el,i)=>{el.classList.toggle('is-active',i===index);$('.journal-select',el).setAttribute('aria-pressed',String(i===index));});
 $$('[data-journal-visual]').forEach((el,i)=>{el.hidden=i!==index;if(i===index)animateIn(el,{y:0,duration:.5});});
 const selected=journalEntries[index];$('.journal-caption').textContent=$('.journal-select>span',selected).textContent+' · '+$('time',selected).textContent;
}
journalEntries.forEach((entry,index)=>{entry.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')previewJournal(index);});entry.addEventListener('focusin',()=>previewJournal(index));$('.journal-select',entry).addEventListener('click',()=>previewJournal(index));});

// Year changes follow the chapter genuinely intersecting the reading area in either direction.
const chapters=$$('[data-history-index]');
if(chapters.length){
 let currentYear='1955';
 // A narrow reading line gives the same chapter on forward and reverse scrolling.
 const chapterObserver=new IntersectionObserver(entries=>{
  const next=entries.find(entry=>entry.isIntersecting)?.target;
  if(!next||next.dataset.year===currentYear)return;
  currentYear=next.dataset.year;$('#roots-year').textContent=currentYear;$('#roots-caption').textContent=next.dataset.caption;
  chapters.forEach(chapter=>chapter.classList.toggle('is-current',chapter===next));
  animateIn($('#roots-year'),{y:28,duration:.55});animateIn($('#roots-caption'),{y:8,duration:.4});
 },{rootMargin:'-44% 0px -55% 0px',threshold:0});
 chapters.forEach(c=>chapterObserver.observe(c));
}

// Native scroll snapping gives mouse drag, touch swiping, arrows and dots the same position.
const track=$('.learning-track');
if(track){
 const cards=$$('[data-learning]'),dots=$$('[data-learning-index]');let selected=0,requested=null,frame=0,drag=null,moved=false;
 function updateLearning(){
  const x=track.getBoundingClientRect().left+parseFloat(getComputedStyle(track).paddingLeft);let nearest=0,distance=Infinity;
  cards.forEach((c,i)=>{const d=Math.abs(c.getBoundingClientRect().left-x);if(d<distance){distance=d;nearest=i;}});selected=nearest;
  $('#learning-count').textContent=String(selected+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');$('#learning-prev').disabled=selected===0;$('#learning-next').disabled=selected===cards.length-1;dots.forEach((d,i)=>d.setAttribute('aria-pressed',String(i===selected)));
 }
 function go(index){requested=Math.max(0,Math.min(cards.length-1,index));const card=cards[requested];const left=track.scrollLeft+card.getBoundingClientRect().left-track.getBoundingClientRect().left-parseFloat(getComputedStyle(track).paddingLeft);track.scrollTo({left,behavior:motionPreference.matches?'instant':'smooth'});}
 $('#learning-prev').addEventListener('click',()=>go((requested??selected)-1));$('#learning-next').addEventListener('click',()=>go((requested??selected)+1));dots.forEach((d,i)=>d.addEventListener('click',()=>go(i)));
 track.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(()=>{updateLearning();frame=0;});},{passive:true});track.addEventListener('scrollend',()=>{updateLearning();requested=null;});track.addEventListener('wheel',()=>{requested=null;},{passive:true});
 track.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go((requested??selected)+(e.key==='ArrowRight'?1:-1));}});
 track.addEventListener('pointerdown',e=>{requested=null;if(e.pointerType==='mouse'&&e.button===0){drag={x:e.clientX,scroll:track.scrollLeft,id:e.pointerId};moved=false;}});
 track.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>6){moved=true;track.classList.add('is-dragging');track.setPointerCapture(drag.id);track.scrollLeft=drag.scroll-dx;e.preventDefault();}});
 function endDrag(){if(!drag)return;const wasMoved=moved;drag=null;track.classList.remove('is-dragging');if(wasMoved){updateLearning();go(selected);}}
 track.addEventListener('pointerup',endDrag);track.addEventListener('pointercancel',endDrag);track.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;}},true);updateLearning();
}

// Existing useful interactions are retained, now with explicit transitions.
$$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
 const filter=button.dataset.filter;$$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 const shown=[];$$('[data-news-category]').forEach(item=>{item.hidden=filter!=='全部'&&item.dataset.newsCategory!==filter;if(!item.hidden)shown.push(item);});
 if($('#news-empty'))$('#news-empty').hidden=shown.length>0;animateIn(shown,{stagger:.06,y:25,duration:.6});window.ScrollTrigger?.refresh();
}));
const galleryItems=$$('[data-gallery]');let galleryIndex=0;
function showGallery(index){
 galleryIndex=(index+galleryItems.length)%galleryItems.length;const item=galleryItems[galleryIndex],img=$('img',item);
 $('#gallery-image').src=img.src;$('#gallery-image').alt=img.alt;$('#gallery-title').textContent=item.dataset.gallery;$('#gallery-count').textContent=(galleryIndex+1)+' / '+galleryItems.length;animateIn($('#gallery-image'),{x:0,y:0,duration:.4});
 $('#gallery-prev').disabled=galleryItems.length<2;$('#gallery-next').disabled=galleryItems.length<2;
}
galleryItems.forEach((b,i)=>b.addEventListener('click',()=>{showGallery(i);openDialog($('#gallery-dialog'),b);}));
$('#gallery-prev')?.addEventListener('click',()=>showGallery(galleryIndex-1));$('#gallery-next')?.addEventListener('click',()=>showGallery(galleryIndex+1));
$('#gallery-dialog')?.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showGallery(galleryIndex+(e.key==='ArrowRight'?1:-1));}});
let galleryTouch=null;$('#gallery-image')?.addEventListener('pointerdown',e=>galleryTouch=e.clientX);$('#gallery-image')?.addEventListener('pointerup',e=>{if(galleryTouch!==null&&Math.abs(e.clientX-galleryTouch)>40)showGallery(galleryIndex+(e.clientX<galleryTouch?1:-1));galleryTouch=null;});
$('#copy-address')?.addEventListener('click',async()=>{const out=$('#copy-status');try{await navigator.clipboard.writeText('湖南省长沙市雨花区人民中路168号');out.textContent='地址已复制';}catch{out.textContent='请手动复制：湖南省长沙市雨花区人民中路168号';}animateIn(out,{y:5,duration:.3});});
$$('details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)animateIn($('p',d),{y:10,duration:.45});}));
const pageObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)$$('.page-index a').forEach(a=>a.classList.toggle('current',a.hash==='#'+e.target.id));});},{rootMargin:'-20% 0px -60% 0px'});$$('section[id]').forEach(s=>pageObserver.observe(s));
const topMarker=$('.hero')||$('.page-hero')||$('.article-header');
if(topMarker)new IntersectionObserver(([e])=>{const past=!e.isIntersecting&&e.boundingClientRect.top<0;$('.site-header').classList.toggle('is-scrolled',past);$('.back-top').classList.toggle('is-visible',past);},{threshold:0}).observe(topMarker);
$('.back-top')?.addEventListener('click',()=>window.scrollTo({top:0,behavior:motionPreference.matches?'instant':'smooth'}));

// Motion is progressive enhancement. Reduced-motion and failed-library paths remain fully readable.
if(G&&window.ScrollTrigger){
 G.registerPlugin(ScrollTrigger);const mm=G.matchMedia();
 mm.add('(prefers-reduced-motion: no-preference)',()=>{
  const intro=G.timeline({defaults:{ease:'power3.out'}});
  if($('.hero')){intro.from('.hero-kicker',{opacity:0,y:18,duration:.75},.05).from('.title-line>span',{yPercent:115,duration:1.15,stagger:.13,ease:'power4.out'},.1).from('.hero-intro,.hero-cta',{opacity:0,y:24,duration:.85,stagger:.1},.5);if(matchMedia('(min-width:768px)').matches)intro.from('.hero-visual',{opacity:0,x:35,duration:1.15},.2).from('.hero-slide.is-active img',{scale:1.1,duration:1.8},.2);}
  if($('.page-hero'))intro.from('.page-hero h1',{y:45,opacity:0,duration:1},.1).from('.page-hero>p,.page-word',{y:20,opacity:0,duration:.8,stagger:.12},.25);
  if($('.article-header'))intro.from('.article-header h1',{y:40,opacity:0,duration:1},.1);
  const reveal=$$('[data-reveal],.chapter-copy,.news-page .news-card,.motto-grid>div,.admission-steps li,.campus-main>div,.plain-columns>div,.visit-details>div');
  reveal.forEach(el=>{G.from(el,{y:35,opacity:0,duration:.9,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 92%',once:true}});});
  $$('.chapter-image').forEach(frame=>{G.fromTo($('img',frame),{yPercent:-5},{yPercent:5,ease:'none',scrollTrigger:{trigger:frame,start:'top bottom',end:'bottom top',scrub:.6}});});
  if($('.home-gallery'))G.from('.gallery-tile:nth-child(2)',{y:60,scrollTrigger:{trigger:$('.home-gallery'),start:'top bottom',end:'bottom top',scrub:1}});
  G.to('.reading-progress',{scaleX:1,ease:'none',scrollTrigger:{start:0,end:'max',scrub:.15}});
  $$('.round-link').forEach(link=>{
   const circle=$('.icon',link),moveX=G.quickTo(circle,'x',{duration:.45,ease:'power3.out'}),moveY=G.quickTo(circle,'y',{duration:.45,ease:'power3.out'});
   const move=e=>{if(e.pointerType!=='mouse')return;const r=link.getBoundingClientRect();moveX((e.clientX-r.left-r.width/2)*.12);moveY((e.clientY-r.top-r.height/2)*.12);};
   const leave=()=>{moveX(0);moveY(0);};link.addEventListener('pointermove',move);link.addEventListener('pointerleave',leave);
   // GSAP matchMedia reverts its animations; remove custom listeners on preference changes too.
   link._motionCleanup=()=>{link.removeEventListener('pointermove',move);link.removeEventListener('pointerleave',leave);};
  });
  return()=>{$$('.round-link').forEach(link=>link._motionCleanup?.());};
 });
 document.fonts?.ready.then(()=>ScrollTrigger.refresh());window.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true});
}
