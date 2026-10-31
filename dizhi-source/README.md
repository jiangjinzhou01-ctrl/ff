# 湖南省地质中学 · 数字校园设计展示

以“时间、探索与成长”为线索的完整静态网站。已实现25个页面、中文全文搜索、可触屏缩放的实景图库、分学段招生导引、移动菜单、Markdown内容管理和GitHub Pages自动构建工作流。

**本项目为非官方设计展示，尚未获得学校官方运营授权。** 当年招生通知、联系方式、校务文件与未取得授权的师生活动影像，保留明确资料状态，不虚构。

## 运行

需要 Node.js 24（最低22.23.4），无需后端、密钥或付费API。

```bash
npm ci
npm run dev
```

生产预览及搜索验证：

```bash
npm run check
npm run build
npm run verify
npm run preview
```

访问 `http://localhost:4321/ff/hunan-dizhi-school/`。Pagefind在生产构建后生成，开发服务器中的搜索会提示加载状态，不能替代生产搜索验收。

## 交付内容

- `src/pages/`：独立栏目、新闻分类及详情、搜索、来源与404。
- `src/components/`、`src/layouts/`：统一导航、移动菜单、页脚、影像与阅读模板。
- `src/content/news/`：5篇带原始日期和来源的独立报道摘要；新增文章无需复制HTML。
- `src/content.config.ts`：文章字段、分类与草稿状态校验。
- `src/styles/global.css`：统一色彩、排版、响应式与减少动态效果设置。
- 首页首屏以本校高清建筑实景建立学校身份；篮球、科学教育作为各自章节呈现，避免单一项目代表学校整体。
- `src/scripts/`：Motion mini 弹簧反馈、可拖动菜单、折叠栏、真实搜索、地址复制、影像错误与局部进入效果。
- `public/media/`：明确CC BY 4.0授权的本校实景AVIF / WebP，每张4个尺寸，另有手机首屏裁切。
- `src/assets/fonts/`：本地Noto CJK重命名子集，许可见 `docs/licenses/`。
- `scripts/`：搜索索引、内部链接校验、静态输出同步、仓库级Pages artifact。
- `tests/browser_qa.py`、`tests/motion_qa.py`：浏览器交互、响应式、键盘、动效中断与无障碍检查。真实执行结果见 `docs/TEST-RESULTS.md`。
- 仓库根 `.github/workflows/deploy-pages.yml`：GitHub网页修改源码后自动构建部署。

## 部署

保留原有 `/ff/hunan-dizhi-school/index.html`、`admissions.html` 和主要 `.html` 入口；3条旧文章地址静态跳转到新详情页。`dist/` 构建结果在 artifact 中实际放入 `hunan-dizhi-school/`，同时保留仓库其他页面。

只使用GitHub网页部署和维护的完整操作见 [部署说明](docs/DEPLOYMENT.md)。仓库根目录的 `.github/workflows/deploy-pages.yml` 会在 `main` 分支更新时构建、验链并发布 V2 子站。当前设计展示仍未获学校官方运营授权。

## 研究、内容与许可

- [原站审查与选型](docs/DISCOVERY.md)
- [设计与信息架构](docs/DESIGN.md)
- [内容事实与资料边界](docs/CONTENT-SOURCES.md)
- [影像清单与校验值](docs/ASSETS.json)
- [第三方项目与许可](THIRD_PARTY_NOTICES.md)
- [真实测试结果与限制](docs/TEST-RESULTS.md)

影像由Huangdan2060拍摄，CC BY 4.0，已压缩并按版面裁切。旧版中复用许可未明确的媒体照片与生成矿物图未纳入本次发布资源。关于师生活动影像、当年招生、校务供稿与正式运营授权的缺口均有明示。
