import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://jiangjinzhou01-ctrl.github.io',
  base: '/ff/dizhi',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap({
    filter: (url) => !['404', 'sources', 'search', 'seventy-years', 'basketball-champions', 'science-education'].some(name => new URL(url).pathname.replace(/\/$/, '') === `/ff/dizhi/${name}`),
    serialize: (item) => ({ ...item, url: item.url.endsWith('/ff/dizhi/') || item.url.endsWith('.html') ? item.url : `${item.url.replace(/\/$/, '')}.html` }),
  })],
  devToolbar: { enabled: false },
});
