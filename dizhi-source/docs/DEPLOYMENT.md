# GitHub Pages 部署与维护

## 当前目录

```text
ff/
  index.html ...          原仓库其他站点，保留
  404.html                仓库级未知路径入口
  dizhi/                  可直接发布的学校静态输出
  dizhi-source/           Astro 源码
  .github/workflows/deploy-pages.yml
```

Astro：`site=https://jiangjinzhou01-ctrl.github.io`、`base=/ff/dizhi`、`build.format=file`、`trailingSlash=never`。这会生成 `dist/index.html`、`dist/admissions.html` 和 `dist/news/*.html`，不是只设置 base 而忽略公开目录。

`stage:pages` 在仓库 `_site/` 中保留根站点文件，再把本次 `dist/` 放入 `_site/dizhi/`。GitHub Pages 的仓库路径 `/ff/` 由托管平台提供，因此 artifact 中不再嵌套 `ff/`。最终路径是 `/ff/dizhi/`。

## 只使用 GitHub 网页操作

1. 将交付包中 `ff/` 的更新内容提交到现有 `jiangjinzhou01-ctrl/ff` 仓库 `main` 分支，包括源码、锁文件、`dizhi/` 和工作流。不要创建额外的 `ff/ff/` 目录。
2. 首次使用新工作流时，在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。这是现有“分支发布”切换到自动源码构建所需的一次设置。
3. 进入 **Actions → Build and deploy GitHub Pages**，查看构建与部署结果；也可选择 **Run workflow**。后续在 GitHub 修改 Markdown、组件或样式并提交，会自动构建和发布。
4. 成功后访问 `https://jiangjinzhou01-ctrl.github.io/ff/dizhi/`。旧 `index.html` 与 `admissions.html` 地址不变。

重构版本通过独立分支 `codex/dizhi-rebuild-20261030` 提交审查，未修改 main 分支或替换线上主站。工作流与本地 artifact 已实际验证；真实 Actions 部署仍需在合并与正确设置 Pages 后确认，不能以本地结果代替。

## 工作流执行顺序

Node 24 → `npm ci` → `npm run check` → `npm run build` → `npm run verify` → `npm run stage:pages` → upload-pages-artifact → deploy-pages。

不需要长期运行的服务器、数据库、付费 API、环境密钥或本地电脑。Pagefind 索引随构建发布。

## 本地运行（可选）

```bash
cd dizhi-source
npm ci
npm run dev
```

开发地址使用终端打印的 `/ff/dizhi/` 前缀。生产构建验证：

```bash
npm run check
npm run build
npm run verify
npm run preview
```

生产预览：`http://localhost:4321/ff/dizhi/`。开发服务器不生成 Pagefind，因此全文搜索应在 build + preview 后验证。开发状态搜索错误会明确反馈，不伪造结果。

继续采用旧版 main 分支静态发布时，执行 `npm run publish:pages`，该命令构建、验链并更新仓库 `dizhi/`；提交该目录即可。该替代方式仍可用，但要获得“只改 Markdown 自动更新”的体验，应采用上述 Actions。

## 新增报道

在 `dizhi-source/src/content/news/` 新建英文短横线文件名的 `.md`。参考现有文章，填写：

```yaml
---
title: 经核实的文章标题
description: 简短独立摘要
date: 2026-10-29
category: 科学教育
cover: null
source:
  name: 发布平台名称
  url: https://example.org/original-article
  title: 原文标题
draft: true
---

经核实并获得发布许可的正文。
```

分类必须为现有 schema 中的六类之一。`draft: true` 不发布；正式发布前改为 `false`。URL 自动成为 `/ff/dizhi/news/文件名.html`，无需复制 HTML。`cover` 为空完全可用；有权利明确的活动照片时再扩展图片清单与说明，不把校园资料图冒充活动现场。

新标题字符未包含在字体子集中时自动使用系统字体。字体子集更新是可选优化，不是内容发布前置条件。

## 上线内容交接

在校方授权正式运营前保留全站展示性质标识。获得授权后，校方应先确认品牌、资料、摄影、当年招生与联系方式，再修改展示标识。不要仅删除说明就宣称成为学校官方网站。

robots.txt 随子站提供。GitHub 项目不能控制 `jiangjinzhou01-ctrl.github.io/robots.txt` 这个域名根文件；需要域名级控制时，应由 GitHub 用户主页仓库管理。Sitemap 与 canonical 使用实际 `.html` 路径。
