import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    category: z.enum(['教育教学', '校园活动', '科学教育', '体育风采', '学校发展', '校务通知']),
    cover: z.string().nullable().default(null),
    coverCaption: z.string().optional(),
    source: z.object({ name: z.string(), url: z.url(), title: z.string() }),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    seoTitle: z.string().optional(),
  }),
});
export const collections = { news };
