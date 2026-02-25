# Site Conventions

## Stack

- **Framework**: Astro 4 with MDX support
- **Styling**: Tailwind CSS with custom theme (CSS variables in `tailwind.config.ts`)
- **Package manager**: pnpm
- **TypeScript**: Strict mode

## Commands

- `pnpm dev` — Start dev server (port 4321)
- `pnpm build` — Type-check then build (`astro check && astro build`)
- `pnpm check` — Type-check only
- `pnpm format` — Prettier format all files

## Path Aliases

Use these instead of relative paths:

- `@/assets/*` → `src/assets/*`
- `@/components/*` → `src/components/*`
- `@/data/*` → `src/data/*`
- `@/layouts/*` → `src/layouts/*`
- `@/utils` → `src/utils/index.ts`
- `@/types` → `src/types.ts`
- `@/site-config` → `src/site.config.ts`

## Layouts

- `Base.astro` — Root HTML wrapper (header, footer, theme provider). All pages use this.
- `BlogPost.astro` — Extends Base, adds TOC, metadata, PhotoSwipe. For content posts.

## Interactive Components Pattern

For JS-heavy pages (see `BoatModel.astro`, `WaterSlice.astro` for examples):

- Define custom HTML element classes in `<script>` tags
- Register with `customElements.define()`
- Use `data-*` attributes for state
- Dispatch/listen to custom events for inter-component communication

## Theme System

- `data-theme="dark"|"light"` attribute on `<html>`
- Theme colors defined as CSS variables: `--theme-accent`, `--theme-bg`, `--theme-text`, etc.
- Respect both dark and light modes in all new components

## Content Collections

Blog posts live in `src/content/post/` as Markdown files with frontmatter schema defined in `src/content/config.ts`.

## Deployment

- GitHub Pages via `withastro/action@v3`
- Post-build runs Pagefind for search indexing
- Git LFS for large image assets
