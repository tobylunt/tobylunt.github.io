# Transformers Project — Agent Harness Protocol

## Session Startup (do this EVERY session)
1. Run `pwd` to confirm you are in the website repo root
2. Read `src/pages/transformers/claude-progress.txt` for context on recent work
3. Check `git log --oneline -10` for recent commits
4. Read `src/pages/transformers/features.json` — find the first feature where `passes` is `false`
5. Run `./src/pages/transformers/init.sh` to start the dev server
6. Open `http://localhost:4321/transformers/` in Playwright and smoke-test that existing features still work before starting new work

## Rules
- Work on exactly **ONE feature** per session
- Never remove or edit feature descriptions in `features.json` — only change `passes` from `false` to `true`
- After implementing a feature, verify it visually using Playwright MCP (navigate to the page, check that it renders correctly, interact with it)
- After verification, commit with message: `transformers: implement feature #N — <short description>`
- Before ending the session, append a summary to `claude-progress.txt` including:
  - What you completed
  - Any bugs or issues found
  - Your git commit hash
  - What the next session should work on
- If a feature breaks existing functionality, `git revert HEAD` and try a different approach

## Architecture
- The transformers page is a single Astro page at `src/pages/transformers/index.astro`
- Interactive visualizations use `<script>` tags with custom elements or vanilla JS/TS
- Follow existing patterns from `BoatModel.astro` and `WaterSlice.astro` for canvas/SVG work
- Use Tailwind for styling; respect the site's dark/light theme system
- Use `Base.astro` layout for the page wrapper

## Editing Tips for index.astro
- **Indentation uses TABS, not spaces.** The Read tool displays them as spaces, but the file uses literal `\t` characters. When using the Edit tool, copy the exact string from the file — don't re-type with spaces.
- The em-dash character `–` (U+2013) appears in comments like `Sections 04–09`. It is multi-byte UTF-8 and may render oddly in `cat -et`. Match it exactly.
- When extracting a section from the placeholder loop, update the `.filter()` excludes array (e.g., add `'attention'` to the list) and adjust the comment range (e.g., `04–09` → `05–09`).
- CSS and JS are in `<style>` and `<script>` blocks at the bottom of the same file. Scoped styles use the Astro scoping model.
- Reusable CSS patterns: `.section-prose`, `.linkage-callout`, `.linkage-*` color variants, `.token-chip`, `.subsection-divider`/`.subsection-title`.

## Testing
- Use Playwright MCP to navigate to `http://localhost:4321/transformers/`
- Verify visual rendering, interactions, animations
- Check both dark and light theme modes
- Do NOT rely solely on build success — visually confirm each feature
