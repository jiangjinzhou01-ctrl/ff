# 研究与原站审查

核查日期：2026-10-29。原始仓库 HEAD：`6539b6f8b62e1c222388f2068b30dc3ae1887f4d`。

## 实际访问

- 原站首页与招生页通过直接 HTTPS 请求均返回 200，并与仓库 `dizhi/` HTML 一致。
- 网页检索工具无法打开这两个地址；随后通过下载源码及本地 Chromium 访问完成检查，没有将工具访问失败描述为已完成在线审查。
- `https://hndzzx.csedu.gov.cn/` 本次直接请求返回 503，无法核实最新导航、招生文件与党群栏目。
- 历史域名 `https://www.hnsdzzx.com.cn/` 本环境代理返回 403，未声称已检查。

## 原有实现

`dizhi-source/` 为自制 Node 字符串模板生成器；`dizhi/` 是已提交的静态输出。原仓库无 AGENTS.md，无现成 GitHub Actions 工作流。仓库根目录另有独立站点，本次保留。

原站已有统一导航、页脚、独立页面、主题、图库、FAQ 和 GSAP 动效。已有 `.html` 路由值得保留。主要问题与改进依据：

1. 首页影像轮播、资讯、校史和特色教育都依赖切换组件，叙事节奏接近，历史与探索精神尚未形成贯穿全页的结构。本次改为七个各有视觉重心的章节。
2. 搜索仅对少量标题及分类做字符串包含匹配，不检索文章正文。本次构建 Pagefind 中文全文索引。
3. 新闻在 `data.mjs` 中用字符串维护，页面正文在构建脚本中拼接。迁移到类型校验的 Astro Content Collection + Markdown。
4. 招生页有官方渠道及 FAQ，但缺少学段、年度、文件收录状态及时间节点的清晰区分。本次分区呈现，未核实数据保持空缺。
5. 图库为自制弹窗，未实现成熟的双指缩放。本次使用 PhotoSwipe。
6. 旧照片来自媒体报道，原说明仅写“权利归原作者”；矿物为生成图，不是本校馆藏。本次全部移出发布树，采用作者明确以 CC BY 4.0 发布的本校照片。
7. 原首轮 390px 招生页与 1440px 首页检查未发现横向溢出，但部分手机正文为 12–13px。本次正文以 14–15px 为主，菜单、长文本及图集独立排版。
8. 原站缺少 canonical、sitemap、404 与完整自动构建流程。本次按实际 `/ff/dizhi/` 目录、文件型路由和仓库级 artifact 实现。

原审查截图保存在交付测试附件中。旧版源码仍可从 Git 历史恢复；未纳入新发布包的媒体图片不再随新站分发。

## 技术选型

| 候选 | 本次核实版本 / 许可 | 决定 |
| --- | --- | --- |
| Astro | 7.4.4 / MIT | 使用。静态路由与内容集合直接满足维护需求；运行环境 Node 24.19.0 符合 `>=22.23.4` 要求 |
| Pagefind | 1.5.2 / MIT | 使用。构建后本地索引，实际测试中文正文查询与子目录结果 URL |
| PhotoSwipe | 5.4.4 / MIT | 使用。原生模块、键盘、触屏切换与缩放，不需要 React |
| Motion | 14.7.1 / MIT | 已评估，不安装。少量进入及菜单反馈由 WAAPI、CSS 和 IntersectionObserver 完成 |
| Lucide | 1.64.0 / ISC（部分上游图标 MIT） | 已评估，不新增。沿用已有 MIT Phosphor SVG，避免混用图标风格 |
| Lenis | 1.3.27 / MIT | 不安装。保持浏览器原生滚动与返回行为 |
| @astrojs/sitemap | 3.7.4 / MIT | 使用，并显式将文件型页面写为 `.html` URL |

参考仓库均已访问：withastro/astro、Pagefind/pagefind、dimsemenov/PhotoSwipe、motiondivision/motion、lucide-icons/lucide、darkroomengineering/lenis。安装版本锁定于 package-lock.json；后续升级应在独立分支重新构建验证。
