# 湖南省地质中学 · 官网首页重构

基于真实影像、中文编辑排版与矿物青色彩的响应式教育机构网站。**这是设计重构展示，不是学校官方发布平台。**

## 访问与部署

- 线上：https://jiangjinzhou01-ctrl.github.io/ff/hunan-dizhi-school/
- 独立源码：`jiangjinzhou01-ctrl/glowing-fortnight`。
- 发布副本：`jiangjinzhou01-ctrl/ff` 仓库的 `hunan-dizhi-school/` 独立目录，Pages 从 `main` 根目录发布。
- 当前授权不能创建仓库或启用新 Pages，因此使用已有 Pages 站点下的独立目录。后续修改源码后，将文件同步至发布目录并提交；目前没有跨仓库自动同步。
- 无构建、无运行依赖、无密钥。运行 `python3 -m http.server 4173` 后访问 http://localhost:4173。

## 文件

- `index.html`：首页结构与可访问导航。
- `styles.css`：设计变量、响应式布局、字体与动效。
- `content.js`：新闻回顾、栏目介绍、资料来源、外部权威入口。
- `app.js`：本地全文索引搜索、原生对话框、hash 阅读路由、键盘导航。
- `assets/`：本地 WebP 摄影、标题字体子集及字体许可。

## 已实现

桌面与移动独立主图、六栏全站导航、新闻与公告入口、校园人物故事、教育探索、成果记录、学校概况、招生指引、师生服务与校务公开引导、联系到访、实时中文搜索、可分享的文章 hash 地址、返回导航、减少动态效果支持。

## 内容维护

修改 `content.js` 中对应条目的 `title / category / paragraphs / image / source / links`。
首页推荐内容在 `index.html` 中维护。不要填入未经学校确认的招生政策、办公电话、荣誉、校史节点或备案号。
当前通知和招生入口指向学校现有官方发布渠道，并非后台实时同步。当前版本无CMS后台，无报名信息采集与校内账号接入。

## 影像与资料

- 校园、教室、实验室：https://www.icswb.com/h/106859/20250627/932256.html
- 球队与校园人物：https://edu.rednet.cn/content/646849/67/13931982.html
- 首屏学生比赛纪实：https://hunan.ifeng.com/c/8UPb93BtDfR

上述摄影版权归原权利人；本站保留源站水印，并提供资料来源说明。正式学校运营前需替换为校方确认使用权限的原始摄影及官方校徽。本版山形标识是设计辅助图形，不是官方校徽。标题使用 Noto Serif CJK 子集，许可见 `assets/FONT-LICENSE.txt`。

## 验证

通过 Chromium 检查 320/360/390/768/1024/1440px 无横向溢出、图片资源、本地搜索、菜单跳转、阅读关闭、浏览器返回与深链接。核心页面内容无需 JavaScript 即可阅读；搜索与扩展阅读需要 JavaScript。
