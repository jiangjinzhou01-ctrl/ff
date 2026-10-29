const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];
const G=window.gsap,M=window.SiteMotion,preference=M.preference;
function svgIcon(name){const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),use=document.createElementNS(ns,'use');svg.setAttribute('class','icon');svg.setAttribute('aria-hidden','true');svg.setAttribute('viewBox','0 0 256 256');use.setAttribute('href','assets/icons.svg#'+name);svg.append(use);return svg;}

// All content switches use the same paired media/text transition.
function panelController(panels,buttons){
 let current=0,desired=0,request=0;
 const mount=index=>{current=index;panels.forEach((panel,i)=>panel.hidden=i!==index);buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));};
 async function go(index){
  if(index<0||index>=panels.length)return;const id=++request;desired=index;
  buttons.forEach(button=>button.removeAttribute('aria-busy'));M.clear(panels[current]);
  if(index===current)return;buttons[index].setAttribute('aria-busy','true');
  const loaded=await M.ready(panels[index]);if(id!==request)return;buttons[index].removeAttribute('aria-busy');
  if(!loaded){mediaFeedback(panels[current].parentElement,'影像暂时无法加载，请稍后重试。');return;}
  mediaFeedback(panels[current].parentElement,'');M.swap(panels[current],()=>panels[index],()=>mount(index));
 }
 buttons.forEach((button,i)=>{button.addEventListener('click',()=>go(i));button.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const next=(i+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;go(next);buttons[next].focus();}});});
 panels.forEach(panel=>M.observe(panel));return {go};
}
function mediaFeedback(container,message){let feedback=$('.media-feedback',container);if(!feedback){feedback=document.createElement('p');feedback.className='media-feedback';feedback.setAttribute('role','status');container.append(feedback);}feedback.textContent=message;feedback.hidden=!message;}
panelController($$('[data-journal-panel]'),$$('[data-journal]'));
panelController($$('[data-history-panel]'),$$('[data-history-index]'));

// Native dialogs retain focus trapping, Escape and reliable focus restoration.
const dialogTriggers=new Map();
function openDialog(dialog,trigger){
 if(!dialog||dialog.open)return;
 dialogTriggers.set(dialog,trigger||document.activeElement);dialog.showModal();document.body.classList.add('dialog-open');
 if(dialog.id==='menu-dialog')$('#menu-toggle').setAttribute('aria-expanded','true');M.enter(dialog);
}
function closeDialog(dialog){
 if(!dialog?.open||dialog.dataset.closing)return;dialog.dataset.closing='true';
 M.exit(dialog,()=>{dialog.close();M.clear(dialog);delete dialog.dataset.closing;dialogTriggers.get(dialog)?.focus({preventScroll:true});});
}
$$('dialog').forEach(dialog=>{
 dialog.addEventListener('close',()=>{if(!$('dialog[open]'))document.body.classList.remove('dialog-open');if(dialog.id==='menu-dialog')$('#menu-toggle').setAttribute('aria-expanded','false');});
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeDialog(dialog);}});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog(dialog);}});
});
$$('[data-close]').forEach(button=>button.addEventListener('click',()=>closeDialog(button.closest('dialog'))));
$('#menu-toggle')?.addEventListener('click',event=>openDialog($('#menu-dialog'),event.currentTarget));
$('#search-toggle')?.addEventListener('click',event=>{openDialog($('#search-dialog'),event.currentTarget);$('#site-search').focus({preventScroll:true});});

try{const theme=localStorage.getItem('dizhi-theme');if(theme)document.documentElement.dataset.theme=theme;}catch{}
const isDark=()=>document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme:dark)').matches);
function updateTheme(){const dark=isDark();$('#theme-toggle')?.setAttribute('aria-pressed',String(dark));$('#theme-toggle')?.setAttribute('aria-label',dark?'切换浅色模式':'切换深色模式');}
updateTheme();$('#theme-toggle')?.addEventListener('click',()=>{const theme=isDark()?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('dizhi-theme',theme);}catch{}updateTheme();});matchMedia('(prefers-color-scheme:dark)').addEventListener('change',updateTheme);

const searchData=[
 {title:'学校概况 · 七十载育人历程',text:'学校介绍 校史 校训 1955 李四光 初中 高中',url:'about.html'},
 {title:'招生信息 · 入学与报考指南',text:'招生 报名 入学 志愿 政策 家长 录取',url:'admissions.html'},
 {title:'特色教育 · 科学与体艺',text:'科学 教学 课程 体育 篮球 武术 创新 教育',url:'education.html'},
 {title:'校园导览 · 在地中遇见成长',text:'校园 地址 交通 导航 位置 电话 实验室 体育馆',url:'campus.html'},
 ...$$('[data-search-news]').map(el=>({title:el.dataset.title,text:el.dataset.category,url:el.dataset.url}))
];
function searchSite(){
 const q=$('#site-search').value.trim().toLowerCase(),result=$('#search-results');M.stop(result);result.replaceChildren();
 if(!q){result.innerHTML='<p class="search-hint">试试“招生”“篮球”或“校园”</p>';return;}
 const hits=searchData.filter(item=>(item.title+' '+item.text).toLowerCase().includes(q));
 if(!hits.length)result.innerHTML='<div class="empty-state"><strong>暂未找到相关内容</strong><p>换一个关键词，或者从导航继续了解学校。</p></div>';
 hits.forEach(item=>{const link=document.createElement('a'),label=document.createElement('span');link.href=item.url+'?v=20261029-3';label.textContent=item.title;link.append(label,svgIcon('arrow-right'));result.append(link);});M.enter(result);
}
$('#site-search')?.addEventListener('input',searchSite);$('#site-search')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('#search-results a')?.focus();}});

const slides=$$('[data-hero-slide]'),tabs=$$('[data-hero-index]');
if(slides.length){
 let active=0,desired=0,selectionRequest=0,paused=preference.matches,hover=false,focus=false,visible=true,progress=null;
 const hero=$('.hero'),pause=$('#hero-pause');
 function playback(){
  pause.disabled=preference.matches;pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',preference.matches?'系统设置已暂停自动播放':paused?'播放影像轮播':'暂停影像轮播');
  if(progress){if(!paused&&!hover&&!focus&&visible&&!document.hidden&&!preference.matches)progress.play();else progress.pause();}
 }
 function startProgress(){progress?.kill();tabs.forEach(tab=>$('i',tab).style.transform='scaleX(0)');if(G)progress=G.fromTo($('i',tabs[active]),{scaleX:0},{scaleX:1,duration:7,ease:'none',paused:true,onComplete:()=>show((active+1)%slides.length)});playback();}
 async function show(index){
  const id=++selectionRequest,next=(index+slides.length)%slides.length;
  if(next===active){hero.removeAttribute('aria-busy');mediaFeedback(hero,'');if(desired!==next){desired=next;M.enter(hero);startProgress();}return;}
  desired=next;progress?.pause();M.clear(hero);hero.setAttribute('aria-busy','true');
  const loaded=await M.ready(slides[next]);if(id!==selectionRequest)return;hero.removeAttribute('aria-busy');
  if(!loaded){mediaFeedback(hero,'影像暂时无法加载，请稍后重试。');paused=true;playback();return;}mediaFeedback(hero,'');
  M.swap(hero,()=>hero,()=>{active=next;slides.forEach((slide,i)=>slide.hidden=i!==active);tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===active)));$('#hero-caption').textContent=slides[active].dataset.caption;startProgress();});
 }
 tabs.forEach((tab,i)=>tab.addEventListener('click',()=>show(i)));pause.addEventListener('click',()=>{paused=!paused;if(!paused&&progress?.progress()===1)startProgress();else playback();});
 const controls=$('.hero-controls');controls.addEventListener('pointerenter',()=>{hover=true;playback();});controls.addEventListener('pointerleave',()=>{hover=false;playback();});controls.addEventListener('focusin',()=>{focus=true;playback();});controls.addEventListener('focusout',()=>setTimeout(()=>{focus=controls.contains(document.activeElement);playback();},0));
 controls.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const next=(desired+(event.key==='ArrowRight'?1:-1)+slides.length)%slides.length;show(next);tabs[next].focus();}});
 let touch=null;$('.hero-slides').addEventListener('pointerdown',event=>touch={x:event.clientX,y:event.clientY});$('.hero-slides').addEventListener('pointerup',event=>{if(touch){const dx=event.clientX-touch.x,dy=event.clientY-touch.y;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))show(desired+(dx<0?1:-1));touch=null;}});$('.hero-slides').addEventListener('pointercancel',()=>touch=null);
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;playback();},{threshold:.15}).observe(hero);document.addEventListener('visibilitychange',playback);preference.addEventListener('change',()=>{paused=preference.matches;M.clear(hero);playback();});M.prepare(hero);M.ready(slides[0]).then(()=>{if(selectionRequest===0){M.enter(hero);startProgress();}});
}

const track=$('.learning-track');
if(track){
 track.addEventListener('dragstart',event=>event.preventDefault());$$('img',track).forEach(img=>img.draggable=false);
 const cards=$$('[data-learning]'),dots=$$('[data-learning-index]');let selected=0,requested=null,frame=0,drag=null,moved=false,scrollTween=null;
 function update(){const left=track.getBoundingClientRect().left+parseFloat(getComputedStyle(track).paddingLeft);let distance=Infinity;cards.forEach((card,i)=>{const d=Math.abs(card.getBoundingClientRect().left-left);if(d<distance){distance=d;selected=i;}});$('#learning-count').textContent=String(selected+1).padStart(2,'0')+' / 04';$('#learning-prev').disabled=selected===0;$('#learning-next').disabled=selected===cards.length-1;dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===selected)));}
 function go(index){
  requested=Math.max(0,Math.min(cards.length-1,index));const card=cards[requested],left=track.scrollLeft+card.getBoundingClientRect().left-track.getBoundingClientRect().left-parseFloat(getComputedStyle(track).paddingLeft);scrollTween?.kill();
  if(M.enabled()){track.classList.add('is-animating');scrollTween=G.to(track,{scrollLeft:left,duration:M.tokens.duration,ease:M.tokens.ease,onComplete:()=>{track.classList.remove('is-animating');requested=null;update();}});}else{track.scrollLeft=left;requested=null;update();}
 }
 $('#learning-prev').addEventListener('click',()=>go((requested??selected)-1));$('#learning-next').addEventListener('click',()=>go((requested??selected)+1));dots.forEach((dot,i)=>dot.addEventListener('click',()=>go(i)));
 track.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(()=>{update();frame=0;});},{passive:true});track.addEventListener('scrollend',update);
 const stop=()=>{scrollTween?.kill();requested=null;track.classList.remove('is-animating');};track.addEventListener('wheel',stop,{passive:true});track.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();go((requested??selected)+(event.key==='ArrowRight'?1:-1));}});
 track.addEventListener('pointerdown',event=>{stop();if(event.pointerType==='mouse'&&event.button===0){drag={x:event.clientX,scroll:track.scrollLeft,id:event.pointerId};moved=false;}});
 track.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-drag.x;if(Math.abs(dx)>6){moved=true;track.classList.add('is-dragging');track.setPointerCapture(drag.id);track.scrollLeft=drag.scroll-dx;event.preventDefault();}});
 function end(){if(!drag)return;drag=null;update();const target=selected;if(moved)go(target);track.classList.remove('is-dragging');}
 track.addEventListener('pointerup',end);track.addEventListener('pointercancel',end);track.addEventListener('click',event=>{if(moved){event.preventDefault();event.stopPropagation();moved=false;}},true);update();
}

$$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{const filter=button.dataset.filter;$$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));const shown=[];$$('[data-news-category]').forEach(card=>{M.clear(card);card.hidden=filter!=='全部'&&card.dataset.newsCategory!==filter;if(!card.hidden)shown.push(card);});if($('#news-empty'))$('#news-empty').hidden=shown.length>0;shown.forEach(card=>M.enter(card));}));

const galleryItems=$$('[data-gallery]');let galleryIndex=0,galleryRequest=0;
function mountGallery(index){galleryIndex=(index+galleryItems.length)%galleryItems.length;const item=galleryItems[galleryIndex],img=$('img',item);$('#gallery-image').src=img.src;$('#gallery-image').alt=img.alt;$('#gallery-title').textContent=item.dataset.gallery;$('#gallery-count').textContent=(galleryIndex+1)+' / '+galleryItems.length;$('#gallery-prev').disabled=galleryItems.length<2;$('#gallery-next').disabled=galleryItems.length<2;}
async function showGallery(index){const id=++galleryRequest,target=(index+galleryItems.length)%galleryItems.length,dialog=$('#gallery-dialog');M.clear(dialog);const loaded=await M.ready(galleryItems[target]);if(id!==galleryRequest)return;if(!loaded){mediaFeedback(dialog,'影像暂时无法加载，请稍后重试。');return;}M.swap(dialog,()=>dialog,()=>mountGallery(target));}
galleryItems.forEach((button,i)=>button.addEventListener('click',async()=>{button.setAttribute('aria-busy','true');const loaded=await M.ready(button);button.removeAttribute('aria-busy');if(!loaded){mediaFeedback(button.parentElement,'影像暂时无法加载，请稍后重试。');return;}mountGallery(i);await M.ready($('#gallery-image'));openDialog($('#gallery-dialog'),button);}));$('#gallery-prev')?.addEventListener('click',()=>showGallery(galleryIndex-1));$('#gallery-next')?.addEventListener('click',()=>showGallery(galleryIndex+1));$('#gallery-dialog')?.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();showGallery(galleryIndex+(event.key==='ArrowRight'?1:-1));}});
$('#copy-address')?.addEventListener('click',async()=>{const out=$('#copy-status');try{await navigator.clipboard.writeText('湖南省长沙市雨花区人民中路168号');out.textContent='地址已复制';}catch{out.textContent='请手动复制：湖南省长沙市雨花区人民中路168号';}M.enter(out);});
$$('details').forEach(details=>$('summary',details).addEventListener('click',event=>{event.preventDefault();const content=$('p',details);if(details.open)M.exit(content,()=>{details.open=false;M.clear(content);});else{details.open=true;M.enter(content);}}));

// Establish paired content groups for all existing inner-page templates as well.
function markGroup(element,name){
 if(element.closest('[data-motion-group]'))return;element.dataset.motionGroup=name;
 [...element.children].forEach(child=>{if(['SCRIPT','STYLE'].includes(child.tagName))return;child.setAttribute(child.matches('img,.wide-image,.article-image,.news-photo')?'data-motion-media':'data-motion-copy','');});
}
$$('.page-hero,.prose,.content-section,.campus-main,.news-card,.visit-layout,.admissions-intro,.notice-box,.admission-steps li,.visit-card,.article-page').forEach(element=>markGroup(element,'content'));
$$('[data-motion-group]').forEach(group=>{if(group.dataset.motionGroup!=='hero')M.observe(group);});
const pageObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)$$('.page-index a').forEach(a=>a.classList.toggle('current',a.hash==='#'+entry.target.id));}),{rootMargin:'-20% 0px -60% 0px'});$$('section[id]').forEach(section=>pageObserver.observe(section));
const topMarker=$('.hero')||$('.page-hero')||$('.article-header');if(topMarker)new IntersectionObserver(([entry])=>{const past=!entry.isIntersecting&&entry.boundingClientRect.top<0;$('.site-header').classList.toggle('is-scrolled',past);$('.back-top').classList.toggle('is-visible',past);},{threshold:0}).observe(topMarker);
$('.back-top')?.addEventListener('click',()=>{if(M.enabled()){const pos={y:scrollY};G.to(pos,{y:0,duration:M.tokens.duration,ease:M.tokens.ease,onUpdate:()=>window.scrollTo({top:pos.y,behavior:'instant'})});}else window.scrollTo({top:0,behavior:'instant'});});
