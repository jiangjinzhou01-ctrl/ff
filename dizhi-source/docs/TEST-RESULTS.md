# 实际测试结果 · 交互更新 2.1

日期：2026-10-30。Chromium 154.0.8037.57（Linux无头模式）、Node 24.19.0、Lighthouse 13.6.0。以下为实际命令与浏览器结果。

## 构建与部署路径

- `npm run check`：38个源码文件，0 errors、0 warnings、0 hints。
- `npm run build`：25个HTML页面，13个正文页面的中文Pagefind索引。
- `npm run verify`：25个HTML路由、2040个内部链接/锚点/资源检查通过。
- `node scripts/publish-pages.mjs` 同步生成输出到 `dizhi/`；`npm run stage:pages` 生成 `_site/dizhi/`，保留仓库父站点。
- 保持 `/ff/dizhi/`、`.html` 页面、Canonical、Sitemap与搜索结果地址；新增公开许可证文件，并在来源页提供实际入口。
- 重构基线已由 PR #1 与 Actions run 41024643279 实际上线。此交互版本由独立分支检查后经 main 发布；部署应以对应提交的真实 Actions 结果为准。

## 全站回归

`tests/browser_qa.py` 实际执行通过，结果见 `test-evidence/browser-report.json`。

- 48组页面/宽度检查：首页320/360/390/430/768/1024/1440/1920px；10类内页320/390/768/1440px。无横向溢出，影像实际解码成功，唯一H1。
- 17组功能检查：25个真实HTML路径、导航与移动菜单、背景锁定与滚动/焦点还原、中文正文搜索/空结果/Back/故障重试、新闻分类与旧入口、FAQ、真实剪贴板复制、图库键盘与说明、触屏切换和双指缩放、无JavaScript阅读、减少动态、图片错误处理。
- 5类390px页面的axe-core WCAG 2A/2AA/2.1A/2.1AA/2.2AA扫描：0项违规。
- 页面运行时错误：0。

## 动画与中断专项

`tests/motion_qa.py` 实际执行12组检查通过，结果见 `test-evidence/motion-report.json`。

- 指针按压实际缩放、移入滚动手势后取消压缩并回位。
- 菜单退出还原焦点与滚动；打开中关闭再打开；退出中变更桌面断点后再次打开。
- 快速重复点击折叠栏可反转，最终移除临时高度；移动栏目只展开一组，FAQ可用键盘操作。
- CDP触屏模拟：短距离拖动回位，明确向下拖动关闭；正文仍用原生滚动。
- 搜索等待期间保留旧结果；中文输入法组词及确认期间不抢先查询；清除后输入焦点恢复。
- 桌面下拉方向键循环、Home/End、Escape；图库从缩略图缩放进入后切换与退出。
- 在弹簧运行途中切换减少动态效果，立即完成活动动画；之后操作无空间动画；静止后没有闲置动画循环。
- 本地98帧requestAnimationFrame采样：中位数16.7ms，95百分位16.7ms，最大16.8ms。这不是手机真机、iOS触感或持续帧率保证。

另做4项页面生命周期检查，见 `test-evidence/navigation-lifecycle.json`：真实跨页Back后图库仍可用；模拟persisted pagehide/pageshow后图库及首页观察器仍可用；菜单打开时离页并返回不会残留锁定。该次真实Back没有使用BFCache，模拟持久恢复与真实Back分开记录。

## 性能样本

| 当前首页移动模拟 | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| 2.1交互版本 | 91 | 100 | 100 | 100 |

LCP 3.5s、TBT 100ms、CLS 0。Lighthouse默认手机模拟节流，本地HTTP预览，2026-10-30T09:12:29Z。原始JSON/HTML随测试证据包交付。此后仅补充来源页的Motion署名和公开许可证，首页资源与脚本未更改；未反复跑分挑选结果。

## 尚未验证与内容边界

- 未做真实Android、iOS Safari或学校网络测试。视觉和手势反馈由网页实现，网页不能调用iOS原生触感引擎。
- 不将静态展示站上线等同于学校正式运营授权；非官方展示声明保留。
- 当前学校平台本次访问受限，未经核实的招生政策、电话、校务内容仍明确说明；没有编造信息。
- 课堂、赛事、艺术与社团影像仍待授权；没有补入虚构校园素材。
