# 湖南省地质中学校园网站

面向学生、家长与校友的中文校园展示站。包含首页、学校概况、校园资讯、特色教育、招生信息、校园导览、三篇报道精选和内容来源页。

在线地址：https://jiangjinzhou01-ctrl.github.io/ff/dizhi/

## 本地运行

需要 Node.js 22+ 和 Python 3，无需安装生产依赖。

```bash
npm run build
npm run check
npm run dev
```

访问 http://localhost:4173。

## 内容维护

- `src/data.mjs`：学校信息、资讯与招生问答。
- `scripts/build.mjs`：页面内容与公共布局，生成十个独立 HTML 页面。
- `src/style.css`：响应式样式、浅色与深色模式。
- `src/app.js`：网站搜索、分类筛选、手机导航、图片预览、地址复制和主题切换。
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
