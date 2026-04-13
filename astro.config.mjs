import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Wittgenstein Notes',
      description: 'A small Starlight site introducing major works by Ludwig Wittgenstein.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/SeauWong/hermes-docs',
        },
      ],
      sidebar: [
        {
          label: 'Works',
          items: [
            { slug: 'tractatus-logico-philosophicus' },
            { slug: 'philosophical-investigations' },
          ],
        },
      ],
    }),
  ],
});
