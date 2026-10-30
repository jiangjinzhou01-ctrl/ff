# 第三方项目与许可证

以下软件许可不适用于学校名称、学校标识、新闻原文或摄影作品。

| 项目 | 本次版本 | 许可 | 使用方式 |
| --- | --- | --- | --- |
| Astro | 7.4.4 | MIT | 构建期静态站点与Content Collections |
| @astrojs/sitemap | 3.7.4 | MIT | 构建期Sitemap |
| Pagefind | 1.5.2 | MIT | 构建期索引、浏览器本地全文检索 |
| Motion | 14.8.0 | MIT | mini 原生 WAAPI 动画与 spring 生成器，按需打包，不引入 React 运行时 |
| PhotoSwipe | 5.4.4 | MIT | 校园图库，按页面加载 |
| Phosphor Icons | 沿用仓库SVG | MIT | 构建期内嵌图标 |
| Noto Sans CJK / Noto Serif CJK | 系统上游字体的重命名子集 | SIL OFL 1.1 | 自托管Dizhi Sans / Dizhi Song |

直接软件许可原文保存在 `docs/licenses/`。所有传递依赖和精确版本保存在 `package-lock.json`，其许可随npm包保留。TypeScript、@astrojs/check、axe-core和Lighthouse仅用于开发和验证，不是运行站点所需的后端。

## 校园摄影

作者：Huangdan2060。
拍摄：2024-07-23。
来源：Wikimedia Commons，Hunan Dizhi Middle School分类下a/b/c/d/e/f/h七张照片。
许可：https://creativecommons.org/licenses/by/4.0/
作者：https://commons.wikimedia.org/wiki/User:Huangdan2060

逐张原始页面、原图SHA256、响应式文件及修改记录见 `docs/ASSETS.json`。处理仅为压缩、尺寸变化与显示裁切。署名和许可在网站页脚、图库说明及来源页持续提供；这不表示摄影者或学校认可本项目。

## Phosphor Icons

Copyright (c) 2020 Phosphor Icons

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 已评估但未引入

Lucide（ISC，部分图标MIT）、Lenis（MIT）。本次使用 Motion mini、原生CSS、Web Animations API与IntersectionObserver，不分发旧版GSAP或CustomEase，不接管原生滚动。
