"""Regression: do not lose a close request during the gallery opening animation."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',default='http://localhost:4321/ff/hunan-dizhi-school/');p.add_argument('--out',default='/tmp/dizhi-gallery-interruption.json');args=p.parse_args()
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [390,1440]:
  page=browser.new_page(viewport={'width':width,'height':900},has_touch=width<768)
  for close in ['escape','button']:
   page.goto(args.base,wait_until='networkidle');page.locator('#life figure>a').first.click();page.wait_for_selector('.pswp--open');start=time.monotonic()
   if close=='escape':page.keyboard.press('Escape')
   else:page.get_by_role('button',name='关闭图片',exact=True).click(force=True)
   page.locator('.pswp--open').wait_for(state='detached',timeout=2000)
   assert page.evaluate("document.body.style.position!== 'fixed'")
   results.append({'width':width,'close':close,'seconds':round(time.monotonic()-start,3),'passed':True})
   print('PASS early gallery close',width,close,flush=True)
  page.close()
 browser.close()
Path(args.out).write_text(json.dumps({'passed':True,'checks':results},ensure_ascii=False,indent=2))
