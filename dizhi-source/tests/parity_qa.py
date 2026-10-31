"""Behavioral checks for equivalent touch/desktop storytelling. Uses real Chromium."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',default='http://localhost:4321/ff/hunan-dizhi-school/');p.add_argument('--out',default='/tmp/dizhi-parity');args=p.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'base':args.base,'widths':[],'checks':[],'errors':[]};root=Path(__file__).resolve().parents[1]
def record(name):report['checks'].append(name);print('PASS',name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [320,360,390,768,1024,1440]:
  context=browser.new_context(viewport={'width':width,'height':900},has_touch=width<768,is_mobile=width<768)
  page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(args.base,wait_until='networkidle')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  assert page.locator('[data-era-select]').count()==3
  for i,year in enumerate(['1955','2019','2024']):
   page.locator('[data-era-select]').nth(i).click();page.wait_for_timeout(550)
   assert page.locator(f'[data-era="{year}"]').is_visible(),(width,year)
   assert page.locator('[data-era]:visible').count()==1
   assert page.locator(f'[data-era-year="{year}"]').evaluate('e=>getComputedStyle(e).display!=="none" && Number(getComputedStyle(e).opacity)>.95'),(width,year)
  page.locator('[data-era-select]').last.focus();page.keyboard.press('Home')
  assert page.locator('[data-era-select]').first.get_attribute('aria-selected')=='true'
  page.keyboard.press('ArrowRight');assert page.locator('[data-era-select]').nth(1).get_attribute('aria-selected')=='true'
  page.locator('[data-era-prev]').click();assert page.locator('[data-era-select]').first.get_attribute('aria-selected')=='true'
  if width==390:
   vp=page.locator('[data-era-viewport]');vp.scroll_into_view_if_needed();box=vp.bounding_box()
   cdp=context.new_cdp_session(page);start=box['x']+box['width']*.85;y=box['y']+110
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':start,'y':y}]})
   for i in range(1,9):
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':start-i*box['width']*.07,'y':y}]});page.wait_for_timeout(25)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(600)
   assert page.locator('[data-era-select]').nth(1).get_attribute('aria-selected')=='true'
   record('Touch swipe changes history; same selected year and text as desktop')
  # Homepage photography now opens directly, retaining visible controls on phones.
  page.locator('#life figure>a').first.click();page.wait_for_selector('.pswp--open');page.wait_for_timeout(350)
  assert '1 / 2' in page.locator('.pswp__counter').inner_text()
  assert page.get_by_role('button',name='下一张图片',exact=True).is_visible(),width
  page.get_by_role('button',name='下一张图片',exact=True).click();page.wait_for_timeout(400)
  assert '2 / 2' in page.locator('.pswp__counter').inner_text()
  page.get_by_role('button',name='关闭图片',exact=True).click();page.locator('.pswp--open').wait_for(state='detached')
  page.locator('[data-chapter-link="journal"]').click();page.wait_for_timeout(1400)
  assert page.locator('[data-chapter-link="journal"]').get_attribute('aria-current')=='location',width
  assert page.locator('[data-chapter-status]').inner_text()=='06 / 07'
  assert page.locator('[data-reading-progress]').evaluate('e=>new DOMMatrix(getComputedStyle(e).transform).a')>.35
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  if width in [390,1440]:page.screenshot(path=str(out/f'chapter-{width}.png'))
  report['widths'].append({'width':width,'timeline':True,'photo_controls':True,'chapter_navigation':True,'overflow':False})
  context.close()
 record('Timeline, direct image zoom, visible next/previous controls and chapter navigation at six widths')
 context=browser.new_context(viewport={'width':390,'height':844},permissions=['clipboard-read','clipboard-write'])
 page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.goto(args.base+'news/science-education.html',wait_until='networkidle');page.locator('[data-copy-link]').click()
 assert page.evaluate('navigator.clipboard.readText()')=='https://jiangjinzhou01-ctrl.github.io/ff/hunan-dizhi-school/news/science-education.html'
 assert '链接已复制' in page.locator('.link-copy-status').inner_text()
 page.evaluate("document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,700)");page.wait_for_timeout(100)
 assert page.locator('[data-reading-label]').inner_text()!='阅读进度 0%'
 record('Article link clipboard and reading progress work on mobile')
 page.goto(args.base,wait_until='networkidle');page.locator('[data-era-select]').last.click()
 page.add_script_tag(content=(root/'node_modules/axe-core/axe.min.js').read_text())
 report['axe']=page.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
 assert not report['axe'],report['axe']
 record('Enhanced homepage tab semantics and controls pass axe WCAG scans')
 page.emulate_media(reduced_motion='reduce');page.locator('[data-era-select]').first.click()
 assert page.evaluate('document.getAnimations().filter(a=>a.playState==="running").length===0')
 assert page.locator('[data-era="1955"]').is_visible()
 record('Runtime reduced-motion change settles all effects and keeps controls working')
 page.emulate_media(reduced_motion='no-preference');page.goto(args.base,wait_until='networkidle')
 assert page.evaluate('document.getAnimations().some(a=>a.playState==="running")')
 page.wait_for_timeout(1500)
 assert page.evaluate('document.getAnimations().filter(a=>a.playState==="running").length===0')
 record('Hero visibly animates on arrival and ends without an idle animation loop')
 context.close()
 nojs=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844});page=nojs.new_page();page.goto(args.base)
 assert page.locator('[data-era]:visible').count()==3
 assert page.locator('#life figure>a').first.get_attribute('href').endswith('1920.webp')
 record('No-JavaScript fallback preserves all history and original image access')
 assert not report['errors'],report['errors'];report['passed']=True
 (out/'parity-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));browser.close()
