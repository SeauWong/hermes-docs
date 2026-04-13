# AGENT.md

This repository is a static documentation site built with `Astro` + `Starlight`.

## Basics

- Deployment target: `Cloudflare Pages`
- Build command: `npm run build`
- Build output: `dist/`

Use `Pages`, not `wrangler deploy`, for this project.

## Docs Location

All docs live under:

```txt
src/content/docs/
```

Current examples:

```txt
src/content/docs/index.mdx
src/content/docs/tractatus-logico-philosophicus.mdx
src/content/docs/philosophical-investigations.mdx
```

## Adding Docs

- Add a new `.md` or `.mdx` file under `src/content/docs/`
- `index.mdx` is the site landing page
- If a new page should appear in the sidebar, update `astro.config.mjs`

## Notes

- Do not commit `node_modules/`, `dist/`, or `.astro/`
- Keep this repo as a Starlight site unless there is a strong reason to change the framework
