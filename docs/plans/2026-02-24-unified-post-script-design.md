# Unified `post.js` Script Design

## Problem

The existing `new-post.js` only creates new posts. It requires a `-photos` suffix on Desktop folder names and errors if the post already exists. There's no way to add new images to an existing post from the Desktop folder.

## Solution

A unified `scripts/post.js` that handles both creation and updates.

## CLI Interface

```
pnpm post <folder-name>
```

- `<folder-name>` is a directory on `~/Desktop/`
- Post slug derived by stripping `-photos` suffix if present

## Mode Detection

Checks if `src/content/post/{slug}.mdx` (or `.md`) exists:

- **Create mode**: Post doesn't exist. Creates MDX, image dir, copies all media, generates imports + components.
- **Update mode**: Post exists. Diffs Desktop folder against existing images, copies only new files, appends imports + components to end of MDX.

## Folder Name Resolution

Tries in order:
1. `~/Desktop/{folder-name}/` (exact match)
2. `~/Desktop/{folder-name}-photos/` (legacy convention)

## Preserved Behaviors

- HEIC to JPEG conversion (quality 0.9)
- MOV to MP4 via ffmpeg
- `cleanFileName()` for consistent naming
- Images to `src/assets/img/{slug}/`
- Videos to `public/assets/img/{slug}/`
- Draft mode, placeholder descriptions, sequential numbering

## Update Mode Diffing

Compares cleaned filenames from Desktop folder against files already in `src/assets/img/{slug}/`. Only files with no matching cleaned name are processed. Image numbering in appended components continues from the highest existing number.

## Package.json Changes

- Add `"post": "node scripts/post.js"` script
- Keep `"new-post"` for backwards compatibility
