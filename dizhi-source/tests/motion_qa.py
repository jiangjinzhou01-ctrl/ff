"""Real browser checks for interrupted motion, native pan, IME and reduced motion.
Optional QA tooling: Python Playwright + Chromium. No runtime service required.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://localhost:4321/ff/hunan-dizhi-school/')
parser.add_argument('--out', default='/tmp/dizhi-motion-qa')
args = parser.parse_args()
out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
report = {'base': args.base, 'checks': [], 'errors': []}

def record(name):
    report['checks'].append(name); print('PASS', name, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    report['browser'] = browser.version
    context = browser.new_context(viewport={'width':390, 'height':844}, has_touch=True, is_mobile=True)
    page = context.new_page()
    page.on('pageerror', lambda error: report['errors'].append(str(error)))
    def load(route): page.goto(args.base+route, wait_until='networkidle')
    def menu_open():
        box=page.locator('#menu-open').bounding_box()
        page.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2)
        page.wait_for_timeout(500)
        assert page.locator('#mobile-menu').evaluate('(d)=>d.open')
    def closed():
        page.locator('#mobile-menu').wait_for(state='hidden')
        assert page.evaluate("document.body.style.position==='' && document.documentElement.style.overflow===''")

    load('admissions.html')
    # A pointer moving into a scroll gesture must release the pressed appearance.
    box = page.locator('#menu-open').bounding_box(); x=box['x']+22; y=box['y']+22
    page.mouse.move(x,y); page.mouse.down(); page.wait_for_timeout(100)
    scale=page.locator('#menu-open').evaluate('(e)=>new DOMMatrix(getComputedStyle(e).transform).a')
    assert scale < .97, scale
    page.mouse.move(x-40,y+30); page.wait_for_timeout(650); page.mouse.up()
    assert page.locator('#menu-open').evaluate('(e)=>Math.abs(new DOMMatrix(getComputedStyle(e).transform).a-1)<.001')
    record('Pointer compression and scroll-cancel spring settle back to rest')

    page.evaluate("document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,900)")
    before=page.evaluate('scrollY');menu_open()
    page.keyboard.press('Escape');closed()
    assert abs(page.evaluate('scrollY')-before)<3
    assert page.locator('#menu-open').evaluate('(e)=>e===document.activeElement')
    record('Menu spring close restores page scroll and keyboard focus')

    # Close while the opening spring is still moving, then reopen.
    box=page.locator('#menu-open').bounding_box();page.touchscreen.tap(box['x']+22,box['y']+22);page.wait_for_timeout(45)
    page.locator('[data-menu-close]').tap();closed();menu_open()
    assert page.locator('#mobile-menu').evaluate('(e)=>getComputedStyle(e).opacity')=='1'
    record('Interrupted menu open/close/reopen has no stale opacity or lock')

    groups=page.locator('.mobile-nav-group')
    for _ in range(5): groups.nth(0).locator('summary').tap();page.wait_for_timeout(60)
    page.wait_for_timeout(700)
    assert groups.nth(0).evaluate("e=>e.open && e.style.height==='' && e.style.overflow===''")
    groups.nth(1).locator('summary').tap();page.wait_for_timeout(700)
    assert not groups.nth(0).evaluate('e=>e.open')
    assert groups.nth(1).evaluate('e=>e.open')
    record('Rapid accordion reversal and single open mobile group retain natural height')
    page.screenshot(path=str(out/'mobile-menu-expanded.png'))

    cdp=context.new_cdp_session(page)
    def swipe(distance, steps=8):
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':110,'y':32}]})
        for i in range(1,steps+1):
            cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':110,'y':32+distance*i/steps}]})
            page.wait_for_timeout(50)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
    swipe(55);page.wait_for_timeout(700)
    assert page.locator('#mobile-menu').evaluate('e=>e.open && Math.abs(new DOMMatrix(getComputedStyle(e).transform).m42)<.1')
    swipe(170);closed()
    assert abs(page.evaluate('scrollY')-before)<3
    record('Emulated touch: short menu drag returns, deliberate drag dismisses')

    menu_open()
    page.locator('.mobile-menu-scroll').evaluate('e=>e.scrollTop=250')
    assert page.locator('.mobile-menu-scroll').evaluate('e=>e.scrollTop>0')
    assert page.evaluate("document.body.style.position==='fixed'")
    page.locator('[data-menu-close]').tap()
    page.set_viewport_size({'width':1440,'height':900});closed()
    page.set_viewport_size({'width':390,'height':844});menu_open()
    page.keyboard.press('Escape');closed()
    record('Native internal menu pan and resize during exit never trap the page')

    load('admissions.html');faq=page.locator('#faq details').first
    for _ in range(4): faq.locator('summary').tap();page.wait_for_timeout(70)
    page.wait_for_timeout(700)
    assert faq.evaluate("e=>!e.open && e.style.height==='' && !e.querySelector('div').inert")
    faq.locator('summary').focus();page.keyboard.press('Enter');page.wait_for_timeout(700)
    assert faq.evaluate("e=>e.open && e.querySelector('summary').getAttribute('aria-expanded')==='true'")
    record('FAQ reverses under rapid taps and remains keyboard accessible')

    load('search.html?q=招生')
    page.wait_for_function("document.querySelector('#search-status').textContent.startsWith('找到')")
    retained=page.evaluate("""() => {
      const list=document.querySelector('#search-results');const before=list.children.length;
      document.querySelector('#search-input').value='篮球';document.querySelector('#search-form').requestSubmit();
      return before>0 && list.children.length===before && list.getAttribute('aria-busy')==='true';
    }""")
    assert retained
    page.wait_for_function("document.querySelector('#search-results a[href$=\"basketball-champions.html\"]')")
    page.evaluate("""() => {
      const input=document.querySelector('#search-input');
      input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));input.value='科学';
      input.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));
      document.querySelector('#search-form').requestSubmit();
    }""")
    page.wait_for_timeout(400)
    assert page.locator('#search-status').inner_text().find('篮球')>=0
    page.locator('#search-input').dispatch_event('compositionend')
    page.wait_for_function("document.querySelector('#search-status').textContent.includes('科学') && !document.querySelector('#search-status').classList.contains('is-loading')")
    page.locator('#search-clear').tap()
    assert page.locator('#search-input').input_value()==''
    assert page.locator('.search-result').count()==0
    assert page.locator('#search-input').evaluate('e=>e===document.activeElement')
    record('Search preserves results while pending, waits for Chinese IME and clears accessibly')
    page.locator('#search-input').fill('招生');page.locator('.search-result').first.wait_for()
    page.screenshot(path=str(out/'mobile-search.png'))

    page.set_viewport_size({'width':1440,'height':900});load('about.html')
    toggle=page.get_by_role('button', name='展开学校概况子栏目')
    for _ in range(5): toggle.click();page.wait_for_timeout(40)
    page.wait_for_timeout(650)
    assert toggle.get_attribute('aria-expanded')=='true'
    assert page.locator('#submenu-about').evaluate('e=>!e.hidden && !e.inert')
    page.keyboard.press('ArrowDown');page.keyboard.press('ArrowDown')
    assert page.locator('#submenu-about a').nth(1).evaluate('e=>e===document.activeElement')
    page.keyboard.press('ArrowUp')
    assert page.locator('#submenu-about a').first.evaluate('e=>e===document.activeElement')
    page.keyboard.press('End')
    assert page.locator('#submenu-about a').last.evaluate('e=>e===document.activeElement')
    page.keyboard.press('Escape');page.locator('#submenu-about').wait_for(state='hidden')
    record('Desktop dropdowns reverse smoothly and close through Escape')

    page.set_viewport_size({'width':390,'height':844});load('campus.html')
    page.locator('#campus-gallery figure>a').first.tap();page.wait_for_selector('.pswp--open');page.wait_for_function("[...document.querySelectorAll('.pswp__item')].every(e=>e.style.display!=='none')")
    page.keyboard.press('ArrowRight');page.wait_for_timeout(500)
    assert '2 / 5' in page.locator('.pswp__counter').inner_text()
    page.keyboard.press('Escape');page.locator('.pswp--open').wait_for(state='detached')
    assert page.evaluate("document.body.style.position!== 'fixed'")
    record('PhotoSwipe zoom transition opens and closes without a stuck scroll lock')

    # Change the preference at runtime while a spring is active.
    load('admissions.html');page.locator('#menu-open').tap()
    page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(50)
    assert page.evaluate("document.getAnimations().filter(a=>a.playState==='running').length===0")
    page.keyboard.press('Escape');closed()
    page.locator('#faq details summary').first.tap()
    assert page.locator('#faq details').first.evaluate("e=>e.open && e.style.height===''")
    menu_open();page.keyboard.press('Escape');closed()
    assert page.evaluate("document.getAnimations().filter(a=>a.playState==='running').length===0")
    record('Live reduced-motion preference settles springs and disables spatial feedback')

    page.emulate_media(reduced_motion='no-preference');load('index.html')
    page.evaluate("""() => { window.frameSamples=[];let previous=performance.now();
      function sample(now){window.frameSamples.push(now-previous);previous=now;if(window.frameSamples.length<100)requestAnimationFrame(sample)}requestAnimationFrame(sample);
    }""")
    menu_open();page.locator('.mobile-nav-group summary').first.tap();page.wait_for_timeout(1000)
    samples=page.evaluate('window.frameSamples.slice(2)');samples.sort()
    report['local_rAF_sample_ms']={'median':round(samples[len(samples)//2],2),'p95':round(samples[int(len(samples)*.95)],2),'max':round(max(samples),2),'count':len(samples)}
    page.keyboard.press('Escape');closed();page.wait_for_timeout(800)
    assert page.evaluate("document.getAnimations().filter(a=>a.playState==='running').length===0")
    record('Motion ends at rest without idle animation or permanent layer promotion')
    assert not report['errors'],report['errors']
    report['passed']=True
    (out/'motion-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    browser.close()
print('Report:',out/'motion-report.json')
