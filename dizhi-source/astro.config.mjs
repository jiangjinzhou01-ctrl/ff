import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://jiangjinzhou01-ctrl.github.io',
  base: '/ff/hunan-dizhi-school',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap({
    filter: (url) => !['404', 'sources', 'search', 'seventy-years', 'basketball-champions', 'science-education'].some(name => new URL(url).pathname.replace(/\/$/, '') === `/ff/hunan-dizhi-school/${name}`),
    serialize: (item) => ({ ...item, url: item.url.endsWith('/ff/hunan-dizhi-school/') || item.url.endsWith('.html') ? item.url : `${item.url.replace(/\/$/, '')}.html` }),
  })],
  devToolbar: { enabled: false },
});
