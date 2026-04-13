# AGENT.md

This repository is a Starlight documentation site built on top of Astro.

## What This Repo Is

- Framework: `Astro` + `Starlight`
- Content format: Markdown/MDX
- Current output: static files in `dist/`
- Current deployment target: `Cloudflare Pages`

This repo is not currently a Cloudflare Workers/Wrangler app.

## How To Build

Use:

```bash
npm run build
```

This runs:

```bash
astro check && astro build
```

The generated static output goes to:

```txt
dist/
```

## How To Deploy

For Cloudflare, use `Pages`, not `wrangler deploy`.

Correct Cloudflare Pages settings:

- Framework preset: `Astro`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

Do not configure this repo like a Workers project unless you intentionally migrate it to Workers.

These commands/settings are wrong for the current repo shape:

- `npx wrangler deploy`
- `npx wrangler versions upload`

If Cloudflare shows mostly Worker-oriented options, make sure you are creating a `Pages` project, not a `Workers` project.

## How Content Works Today

Docs content lives under:

```txt
src/content/docs/
```

Do not rebuild a custom docs shell unless there is a strong reason. Starlight now owns the docs UI.

```txt
```

Important files:

- `astro.config.mjs`
- `src/content.config.ts`
- `src/content/docs/`
- `src/components/Mermaid.astro`

## If You Add Docs In The Current Setup

Add Markdown or MDX files under:

```txt
src/content/docs/
```

Example:

```txt
src/content/docs/getting-started.mdx
src/content/docs/guide/install.md
```

Keep frontmatter valid. Starlight uses the `docs` content collection defined in:

```txt
src/content.config.ts
```

Starlight is an Astro docs theme, not a separate framework.

Implications:

- On Cloudflare Pages, the framework preset should still be `Astro`
- Static content can use `.md`
- Interactive docs can use `.mdx`
- A landing page can be implemented with `template: splash` frontmatter in `src/content/docs/index.md` or `index.mdx`

If a page needs interactive behavior, prefer MDX and embed Astro/components there.

## Operational Notes

- Do not commit `node_modules/`, `dist/`, or `.astro/`
- If build fails, check `astro check` output first
- If deployment fails after build succeeds, verify Cloudflare is using `Pages` static deployment rather than `wrangler`-based Worker deployment
