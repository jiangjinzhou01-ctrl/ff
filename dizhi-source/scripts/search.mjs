import * as pagefind from 'pagefind';
import path from 'node:path';
import fs from 'node:fs';
const { index, errors } = await pagefind.createIndex({ forceLanguage: 'zh', excludeSelectors: ['[data-pagefind-ignore]'] });
if (errors.length || !index) throw new Error(errors.join('\n'));
const files = fs.readdirSync('dist', { recursive: true }).filter(file => file.endsWith('.html'));
let count = 0;
for (const file of files) {
  const content = fs.readFileSync(path.join('dist', file), 'utf8');
  if (!content.includes('data-pagefind-body')) continue;
  const result = await index.addHTMLFile({ url: file === 'index.html' ? '/' : `/${file}`, content });
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  count++;
}
const write = await index.writeFiles({ outputPath: path.resolve('dist/pagefind') });
if (write.errors.length) throw new Error(write.errors.join('\n'));
console.log(`Pagefind: indexed ${count} content pages; Chinese full-text search written to dist/pagefind.`);
await pagefind.close();
