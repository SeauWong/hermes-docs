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
            { slug: 'tractatus-logico-philosophicus' },
            { slug: 'philosophical-investigations' },
          ],
        },
      ],
    }),
  ],
});
