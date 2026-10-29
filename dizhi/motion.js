/* A single motion vocabulary for text, media, panels and controls. */
(() => {
 const G=window.gsap,preference=matchMedia('(prefers-reduced-motion: reduce)');
 const tokens=Object.freeze({duration:.9,exit:.3,distance:28,scale:1.035,ease:'site',curve:'0.22,1,0.36,1'});
 const hasEase=G&&window.CustomEase;
 if(hasEase){G.registerPlugin(CustomEase);CustomEase.create(tokens.ease,tokens.curve);}
 const rootStyle=document.documentElement.style;rootStyle.setProperty('--motion-duration',tokens.duration*1000+'ms');rootStyle.setProperty('--motion-fast',tokens.exit*1000+'ms');rootStyle.setProperty('--motion-ease','cubic-bezier('+tokens.curve+')');
 const enabled=()=>!!hasEase&&!preference.matches;
 const entered=new WeakSet(),observed=new Set(),running=new WeakMap(),generation=new WeakMap();
 const targets=group=>{
  if(Array.isArray(group))return group.filter(Boolean);
  if(!group)return [];
  const found=[...group.querySelectorAll('[data-motion-media],[data-motion-copy]')].filter(el=>el.closest('[data-motion-group]')===group);
  return found.length?found:[group];
 };
 const stop=group=>{generation.set(group,(generation.get(group)||0)+1);running.get(group)?.kill();running.delete(group);if(G)G.killTweensOf(targets(group));};
 const clear=group=>{stop(group);const items=targets(group);if(G){G.set(items,{clearProps:'opacity,transform,visibility'});G.set(items.flatMap(el=>[...el.querySelectorAll('img')]),{clearProps:'transform'});}return items;};
 const prepare=group=>{if(enabled())G.set(targets(group),{opacity:0,y:tokens.distance});};
 async function ready(group){const images=group.matches?.('img')?[group]:[...group.querySelectorAll('img')];const results=await Promise.all(images.filter(img=>img.getAttribute('src')).map(async img=>{img.loading='eager';try{await img.decode();return true;}catch{return false;}}));return results.every(Boolean);}
 function enter(group){
  const items=targets(group);if(!items.length)return null;
  if(!Array.isArray(group))entered.add(group);
  if(!enabled()){clear(group);return null;}
  stop(group);
  const timeline=G.timeline({defaults:{duration:tokens.duration,ease:tokens.ease},onComplete:()=>G.set(items,{clearProps:'opacity,transform,visibility'})});
  timeline.fromTo(items,{opacity:0,y:tokens.distance},{opacity:1,y:0,stagger:0},0);
  const media=items.filter(el=>el.hasAttribute('data-motion-media')).flatMap(el=>[...el.querySelectorAll('img')]);
  if(media.length)timeline.fromTo(media,{scale:tokens.scale},{scale:1,overwrite:'auto'},0);
  running.set(group,timeline);return timeline;
 }
 function exit(group,done){
  stop(group);if(!enabled()){done?.();return null;}
  const timeline=G.to(targets(group),{opacity:0,y:-tokens.distance,duration:tokens.exit,ease:tokens.ease,stagger:0,onComplete:done});
  running.set(group,timeline);return timeline;
 }
 function swap(outgoing,incoming,update){
  if(!enabled()){update();clear(incoming());return null;}
  return exit(outgoing,()=>{clear(outgoing);update();enter(incoming());});
 }
 const observer=new IntersectionObserver(entries=>entries.forEach(async entry=>{
  if(entry.isIntersecting&&!entered.has(entry.target)){
   observer.unobserve(entry.target);entered.add(entry.target);if(running.has(entry.target))return;const version=generation.get(entry.target)||0;entry.target.setAttribute('aria-busy','true');
   const loaded=await ready(entry.target);entry.target.removeAttribute('aria-busy');
   if(!entry.target.hidden&&version===(generation.get(entry.target)||0)){if(loaded)enter(entry.target);else clear(entry.target);}
  }
 }),{threshold:.12,rootMargin:'0px 0px -3% 0px'});
 function observe(group){
  if(!group||observed.has(group))return;
  observed.add(group);
  if(!enabled())return;
  if(!entered.has(group))prepare(group);
  observer.observe(group);
 }
 preference.addEventListener('change',()=>{if(preference.matches)observed.forEach(clear);});
 window.SiteMotion=Object.freeze({tokens,enabled,targets,stop,clear,prepare,ready,enter,exit,swap,observe,preference});
})();
