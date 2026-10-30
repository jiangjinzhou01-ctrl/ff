"""Production-browser QA. Optional: Python Playwright + Chromium, no backend needed.

Run against npm run preview: python tests/browser_qa.py --out /tmp/dizhi-qa
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://localhost:4321/ff/dizhi/')
parser.add_argument('--out', default='/tmp/dizhi-qa')
parser.add_argument('--chromium', default='/usr/bin/chromium')
parser.add_argument('--resume-clipboard',action='store_true',help='Run the remaining checks after a validated interaction pass')
args = parser.parse_args()
out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
report = {'browser': 'Chromium', 'base': args.base, 'responsive': [], 'checks': [], 'errors': [], 'axe': []}

def record(name, detail=None):
    report['checks'].append({'name': name, 'passed': True, 'detail': detail})
    print('PASS', name, detail or '', flush=True)

def load(page, route='', lazy=False):
    page.goto(args.base + route, wait_until='networkidle')
    page.evaluate('document.fonts.ready')
    if lazy:
        page.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')")
        page.wait_for_function("[...document.querySelectorAll('.school-image img')].every(i=>i.complete)")
        page.evaluate("Promise.all([...document.querySelectorAll('.school-image img')].map(i=>i.decode()))")
        page.evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))")

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.chromium, headless=True, args=['--no-sandbox'])
    report['browser'] = browser.version
    context = browser.new_context(viewport={'width':1440,'height':1000}, device_scale_factor=1)
    page = context.new_page()
    page.on('pageerror', lambda e: report['errors'].append(str(e)))
    page.on('console', lambda msg: report['errors'].append(msg.text) if msg.type == 'error' else None)

    if not args.resume_clipboard:
        for width in [320,360,390,430,768,1024,1440,1920]:
            page.set_viewport_size({'width':width,'height':844 if width<768 else 1000})
            load(page, lazy=True)
            size = page.evaluate('({viewport:innerWidth, content:document.documentElement.scrollWidth})')
            assert size['content'] <= size['viewport'], (width,size)
            assert page.locator('.school-image img').evaluate_all('(imgs)=>imgs.every(i=>i.naturalWidth>0)')
            report['responsive'].append({'page':'index.html','width':width,'overflow':False})
            if width in [390,1440]:
                page.screenshot(path=str(out/f'home-{width}-full.png'),full_page=True)
                page.screenshot(path=str(out/f'home-{width}-first-screen.png'))
        record('Homepage at 8 widths; all images decoded')

        routes = ['about.html','admissions.html','campus.html','news.html','education.html','contact.html','disclosure.html','news/science-education.html','search.html','sources.html']
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':844 if width<768 else 1000})
            for route in routes:
                load(page,route,lazy=True)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (route,width)
                assert page.locator('.school-image img').evaluate_all('(imgs)=>imgs.every(i=>i.naturalWidth>0)'),route
                assert page.locator('h1').count()==1,route
                report['responsive'].append({'page':route,'width':width,'overflow':False})
                if width in [390,1440] and route in ['admissions.html','campus.html','about.html']:
                    page.screenshot(path=str(out/f'{Path(route).stem}-{width}.png'),full_page=True)
        record('10 representative pages at 320 / 390 / 768 / 1440; no horizontal overflow')

        for file in (root/'dist').rglob('*.html'):
            route=file.relative_to(root/'dist').as_posix()
            response=page.request.get(args.base+route)
            assert response.status in ([200,404] if route=='404.html' else [200]),(route,response.status)
        record('25 built HTML routes return expected HTTP status')

        page.set_viewport_size({'width':390,'height':844})
        load(page,'admissions.html')
        page.evaluate("document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,1100)");page.wait_for_timeout(100)
        previous=page.evaluate('window.scrollY')
        box=page.locator('#menu-open').bounding_box()
        page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2);page.wait_for_timeout(350)
        assert page.locator('#mobile-menu').evaluate('(d)=>d.open')
        assert page.evaluate("document.body.style.position==='fixed'")
        fixed_top=page.evaluate('document.body.style.top')
        page.mouse.wheel(0,500)
        assert page.evaluate('document.body.style.top')==fixed_top
        page.locator('#mobile-menu summary').filter(has_text='招生信息').click()
        page.locator('.mobile-menu-scroll').evaluate('(e)=>e.scrollTop=e.scrollHeight')
        assert page.locator('.mobile-menu-scroll').evaluate('(e)=>e.scrollTop>0')
        page.keyboard.press('Escape');page.wait_for_timeout(250)
        assert not page.locator('#mobile-menu').evaluate('(d)=>d.open')
        assert abs(page.evaluate('window.scrollY')-previous)<3
        assert page.locator('#menu-open').evaluate('(e)=>e===document.activeElement')
        record('Mobile menu: expand, internal scroll, background lock, Escape, focus and scroll restoration')
        page.locator('#menu-open').click();page.wait_for_timeout(350)
        page.locator('#mobile-menu').get_by_role('link',name='初中招生',exact=True).click()
        page.wait_for_timeout(300)
        assert page.url.endswith('admissions.html#junior')
        assert not page.locator('#mobile-menu').evaluate('(d)=>d.open')
        assert page.evaluate("document.body.style.position!== 'fixed'")
        record('Mobile same-page navigation closes menu and restores document scrolling')

        page.set_viewport_size({'width':1440,'height':1000});load(page)
        toggle=page.get_by_role('button',name='展开学校概况子栏目')
        toggle.focus();page.keyboard.press('Enter')
        assert toggle.get_attribute('aria-expanded')=='true'
        page.keyboard.press('Escape')
        assert toggle.get_attribute('aria-expanded')=='false'
        assert toggle.evaluate('(e)=>e===document.activeElement')
        record('Desktop submenu opens by keyboard and closes with Escape')

        load(page,'search.html?q=%E6%8B%9B%E7%94%9F')
        page.wait_for_function("document.querySelector('#search-status').textContent.startsWith('找到')")
        assert page.locator('#search-results a[href$="admissions.html"]').count()>0
        page.locator('[data-query="篮球"]').click()
        page.wait_for_function("document.querySelector('#search-results a[href$=\"basketball-champions.html\"]')")
        page.go_back();page.wait_for_timeout(500)
        assert page.locator('#search-input').input_value()=='招生'
        assert page.locator('#search-results a[href$="admissions.html"]').count()>0
        page.locator('#search-input').fill('土壤');page.locator('#search-form').press('Enter')
        page.wait_for_function("document.querySelector('#search-results a[href$=\"science-education.html\"]')")
        page.locator('#search-input').fill('zzqvnomatch9292');page.locator('#search-form').press('Enter')
        page.wait_for_function("document.querySelector('#search-status').textContent.includes('没有找到')")
        assert page.locator('#search-results a').count()==0
        record('Chinese full-text search: title, body-only term, empty results and browser Back')

        load(page,'news/category/notices.html')
        assert page.get_by_role('heading',name='暂无已核实的校务通知').is_visible()
        page.get_by_role('link',name='查看全部报道',exact=True).click()
        assert page.locator('.news-row').count()==5
        load(page,'seventy-years.html')
        assert page.url.endswith('/news/seventy-years.html')
        record('Real static news categories, empty state and old article redirect')

        load(page,'admissions.html')
        faq=page.locator('#faq details').first
        faq.locator('summary').click();assert faq.get_attribute('open') is not None
        faq.locator('summary').click();assert faq.get_attribute('open') is None
        record('Native FAQ expands and collapses')

        load(page,'campus.html',lazy=True)
        page.locator('#campus-gallery figure>a').first.click()
        page.wait_for_selector('.pswp--open');page.wait_for_timeout(350)
        assert '1 / 5' in page.locator('.pswp__counter').inner_text()
        page.keyboard.press('ArrowRight');page.wait_for_timeout(500)
        assert '2 / 5' in page.locator('.pswp__counter').inner_text()
        assert 'Huangdan2060' in page.locator('.pswp__caption').inner_text()
        page.keyboard.press('Escape');page.wait_for_timeout(250)
        assert page.locator('.pswp--open').count()==0
        record('PhotoSwipe: open, keyboard next, caption and Escape close')

    context.grant_permissions(['clipboard-read','clipboard-write'])
    load(page,'contact.html')
    page.locator('[data-copy-address]').click()
    page.wait_for_function("document.querySelector('.copy-status').textContent.length>0")
    assert '已复制' in page.locator('.copy-status').inner_text()
    assert page.evaluate('navigator.clipboard.readText()')=='湖南省长沙市人民中路168号'
    record('Address copied to browser clipboard')

    axe_script=(root/'node_modules/axe-core/axe.min.js').read_text()
    for route in ['','admissions.html','campus.html','news/science-education.html','search.html']:
        page.set_viewport_size({'width':390,'height':844});load(page,route,lazy=True)
        page.add_script_tag(content=axe_script)
        violations=page.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>n.target)}))}")
        report['axe'].append({'route':route or 'index.html','violations':violations})
    record('axe-core checks completed',sum(len(r['violations']) for r in report['axe']))

    nojs=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
    np=nojs.new_page();load(np)
    assert np.locator('h1').is_visible()
    assert np.locator('.legacy-stories').inner_text().count('1955')>0
    assert np.get_by_role('link',name='招生信息',exact=True).last.count()>0
    load(np,'news/category/science.html');assert np.locator('.news-row').count()==1
    load(np,'news/science-education.html');assert '土壤' in np.locator('.article-body').inner_text()
    record('JavaScript disabled: homepage, news category and article remain available')

    reduced=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
    rp=reduced.new_page();load(rp)
    assert rp.evaluate("getComputedStyle(document.documentElement).scrollBehavior==='auto'")
    assert rp.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')==0
    record('Reduced motion: no running animation, native instant scrolling')

    fault=browser.new_context(viewport={'width':390,'height':844});fp=fault.new_page()
    fp.route('**/pagefind/pagefind.js',lambda route:route.abort())
    load(fp,'search.html?q=%E6%8B%9B%E7%94%9F')
    fp.wait_for_function("document.querySelector('#search-status').textContent.includes('暂时无法加载')")
    fp.unroute('**/pagefind/pagefind.js');fp.get_by_role('button',name='重新搜索').click()
    fp.wait_for_function("document.querySelector('#search-status').textContent.startsWith('找到')")
    record('Search load failure gives a real retry which recovers')
    fp.route('**/media/campus-e-*',lambda route:route.abort())
    load(fp)
    assert fp.locator('.arrival-image .image-failure').is_visible()
    record('Image load failure shows contextual alternative text')

    touch=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
    tp=touch.new_page();load(tp,'campus.html',lazy=True)
    tp.locator('#campus-gallery figure>a').first.tap();tp.wait_for_selector('.pswp--open');tp.wait_for_timeout(400)
    cdp=touch.new_cdp_session(tp)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':320,'y':400}]})
    for x in [280,230,180,130,80]: cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':400}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});tp.wait_for_timeout(700)
    assert '2 / 5' in tp.locator('.pswp__counter').inner_text()
    before=tp.locator('.pswp__zoom-wrap').evaluate_all('(els)=>els.map(e=>e.getAttribute("style"))')
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':165,'y':400,'id':0},{'x':225,'y':400,'id':1}]})
    for delta in [35,45,55,65,80,100,120]:
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':195-delta,'y':400,'id':0},{'x':195+delta,'y':400,'id':1}]})
        tp.wait_for_timeout(50)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});tp.wait_for_timeout(500)
    after=tp.locator('.pswp__zoom-wrap').evaluate_all('(els)=>els.map(e=>e.getAttribute("style"))')
    assert after!=before
    tp.get_by_role('button',name='关闭图片').tap();tp.wait_for_timeout(300)
    record('Emulated touch: gallery swipe, two-finger pinch and close')

    report['runtime_errors']=list(set(report['errors']))
    assert not report['runtime_errors'],report['runtime_errors']
    report['resumed_after_validated_checks']=args.resume_clipboard
    report['passed']=True
    (out/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    browser.close()
print('Report:',out/'browser-report.json',flush=True)
