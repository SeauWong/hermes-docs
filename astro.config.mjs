import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Theo Notes',
      description: 'A small Starlight site for essays on philosophy, reading, and related topics.',
      sidebar: [
        {
          label: 'Notes',
          items: [
            { label: 'GEA: Group-Evolving Agents', link: '/gea/' },
            { label: 'GEA：群体进化智能体（中文版）', link: '/gea-cn/' },
            { slug: 'tractatus-logico-philosophicus' },
            { slug: 'philosophical-investigations' },
          ],
        },
      ],
    }),
  ],
});
