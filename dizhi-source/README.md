# 湖南省地质中学校园网站

面向学生、家长与校友的中文校园展示站。包含首页、学校概况、校园资讯、特色教育、招生信息、校园导览、三篇报道精选和内容来源页。

在线地址：https://jiangjinzhou01-ctrl.github.io/ff/dizhi/

## 本地运行

需要 Node.js 22+ 和 Python 3。动效使用本地打包的 GSAP 与 CustomEase，不依赖运行时 CDN。

```bash
npm ci
npm run build
npm run check
npm run dev
```

访问 http://localhost:4173。

## 内容维护

- `src/home.mjs`：首页的影像轮播、资讯预览、校史章节和教育栏目。
- `src/layout.mjs`：全站导航、沉浸菜单、搜索、图库和页脚。
- `src/data.mjs`：学校信息、资讯与招生问答。
- `scripts/build.mjs`：页面内容与公共布局，生成十个独立 HTML 页面。
- `src/style.css`：响应式样式、浅色与深色模式。
- `src/motion.js`：全站唯一的图文动效规范与时间线。
- `src/app.js`：影像轮播、图文面板、可拖动的教育栏目、菜单、搜索、图库、地址复制和主题切换。
- `public/assets/`：本地图片素材。页面无外部字体、图片 CDN 或运行时依赖。
- `src/icons/`：Phosphor Icons 原始图标。

网站部署在 `ff` 仓库的独立 `dizhi/` 目录，完整开发源码位于 `dizhi-source/`。原有仓库页面保留不变。GitHub Pages 已配置从 `main` 分支发布。当前 GitHub 连接不允许新建仓库或启用新 Pages，因此采用已有 Pages 的独立目录。

更新源码后，在 `dizhi-source/` 执行：

```bash
npm run publish:pages
cd ..
git add dizhi dizhi-source
git commit -m "Update school website"
git push
```

`publish:pages` 自动生成并校验 `../dizhi/`，推送 `main` 后 GitHub Pages 自动上线。部署记录见仓库 Actions。若迁移至独立仓库，运行 `npm run build` 后发布 `dist/` 即可。

## 内容说明

学校公开资料中的正式名称为“湖南省地质中学”，本站沿用该名称。校史、校训与特色信息来自公开学校介绍及新闻报道，具体链接见网站“内容与图片来源”。招生页面仅提供官方渠道入口，不提供在线报名，不收集学生资料。新一年的招生计划及通知需由维护者根据学校正式发布更新。

本站为网站设计展示，不表示已获校方认证。`hndzzx.csedu.gov.cn` 为公开报道列示的校方平台。没有设置成绩查询、后台管理或虚构的登录入口。

校园照片来自长沙晚报公开学校介绍，权利归原权利人所有；矿物图片为 AI 生成的主题视觉，不代表学校馆藏。对外正式运营前应由维护方确认图片使用授权。Phosphor 图标采用 MIT 许可，见 THIRD_PARTY_NOTICES.md。

## 验证

`npm run check` 验证十个页面中的本地链接、图片、页面内锚点及基础可访问性结构。另已使用 Chromium 验证桌面与手机布局及主要交互，并进行 Lighthouse 检查。

## 统一动效与界面

`src/motion.js` 是动效的唯一入口：内容进入使用 900ms，退出使用 300ms，位移统一为 28px；GSAP CustomEase 与 CSS 使用同一条 cubic-bezier(.22,1,.36,1)。图片完成解码后，与对应标题、正文、按钮由同一条时间线驱动，零错峰；图片内部的轻微缩放也使用同样的起止时间和进度。播放进度按真实时间线性更新，不参与内容的缓动。

- 首页改为影像内排版，校史与资讯采用图文配对的切换面板。
- 首屏、资讯、校史、特色教育、图库与内页统一调用 `SiteMotion`，移除了独立视差、磁吸按钮与另一套跨页动画。
- 同一组图文在快速切换时取消之前的时间线，共享当前可见项；触摸、鼠标、按钮与键盘保持一致。
- 主题、搜索、图库、菜单、FAQ 与地址复制功能保留；支持 Esc、焦点恢复与减少动态效果。
- 控件使用 Phosphor SVG 图标。搜索结果用同一份 SVG sprite，播放与暂停切换真实的图标，不使用箭头或播放字符。
- 页首移除了原先的单字方框，采用完整校名的字标排版。公开校徽照片清晰度不足，当前没有使用或仿制正式校徽。

自托管 Noto Sans CJK 字体子集，以 OFL 许可分发，详见 `public/assets/FONT-LICENSE.txt`。新内容中未包含的字符由系统中文字体补足。
