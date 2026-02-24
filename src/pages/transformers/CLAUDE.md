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

## CRITICAL: Astro Scoped CSS on Dynamic Elements

Astro scopes `<style>` blocks by adding a `data-astro-cid-XXXX` attribute to both the CSS selectors and the HTML elements. **Elements created dynamically via `document.createElement()` do NOT get this attribute**, so scoped CSS silently fails on them.

### Symptoms

Your CSS rule says `display: flex; justify-content: center` but `getComputedStyle()` shows `display: block`. Or you add a class like `.token-chip` but it has no styling. The element renders with default browser styles.

### Diagnosis

Check computed styles in Playwright:

```js
() => {
  const el = document.querySelector(".your-class");
  const cs = getComputedStyle(el);
  return { display: cs.display, color: cs.color };
};
```

If `display` is `block` when it should be `flex` (or similar), the scoped attribute is missing.

### The fix pattern

At the top of any `<script is:inline>` block that creates DOM elements, detect the Astro attribute from an existing static element, then apply it to every element you create:

```js
// 1. Find the attribute from a static parent element
var astroAttr = null;
Array.from(parentEl.attributes).forEach(function (attr) {
  if (attr.name.indexOf("data-astro-cid-") === 0) astroAttr = attr.name;
});

// 2. Helper that creates elements with the attribute
function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (astroAttr) e.setAttribute(astroAttr, "");
  return e;
}

// 3. Use el() instead of document.createElement()
var chip = el("span", "token-chip");
```

**Also apply the attribute to elements created via `innerHTML`:**

```js
container.innerHTML = '<span class="my-class">text</span>';
if (astroAttr) {
  container.querySelectorAll("span").forEach(function (s) {
    s.setAttribute(astroAttr, "");
  });
}
```

### Where this has already been fixed

- **Sidenotes** (`setupMobileInlines` function) — mobile inline sidenote clones
- **Tokenizer** (Feature #5) — `.token-chip` spans
- **Dot product pipeline** (Feature #9) — all grid cells, bars, labels
- **Attention heatmap** (Feature #10) — all grid cells, row/column labels

### Where to watch for it

Any new `<script is:inline>` block that creates visible DOM elements needs this pattern. If you're adding a new visualization, apply the attribute from the start — don't wait for styling to break.

## Editing Tips for index.astro

- The em-dash character `–` (U+2013) appears in comments like `Sections 04–09`. It is multi-byte UTF-8 and may render oddly in `cat -et`. Match it exactly.
- When extracting a section from the placeholder loop, update the `.filter()` excludes array (e.g., add `'attention'` to the list) and adjust the comment range (e.g., `04–09` → `05–09`).
- CSS and JS are in `<style>` and `<script>` blocks at the bottom of the same file. Scoped styles use the Astro scoping model.
- Reusable CSS patterns: `.section-prose`, `.linkage-callout`, `.linkage-*` color variants, `.token-chip`, `.subsection-divider`/`.subsection-title`.

## CRITICAL: Commit Before Destructive Operations

**Always commit working changes before running `git checkout --` or `git revert`.** In a previous session, the entire steps 1-3 persistent layer implementation was lost because it was only in the working tree when `git checkout -- index.astro` was run to fix a bad edit. Uncommitted work cannot be recovered after a checkout.

### Safe workflow for risky edits

1. Commit current working state (even as a WIP commit)
2. Make the risky edit
3. If it breaks: `git revert HEAD` or `git reset HEAD~1` to get back to the WIP commit
4. If it works: amend or squash the WIP commit

## CRITICAL: Script Block Structure in index.astro

The file has a **single** `<script is:inline>` block (starting ~line 11279) that contains BOTH:

- The QKV projection interactive (first ~700 lines)
- The head walkthrough interactive (remaining ~3000 lines)

**These share the same scope.** When using Python to find/replace between function boundaries, be extremely careful not to accidentally span across the QKV/walkthrough boundary.

### Key landmarks (approximate line numbers, may shift)

- `el()` helper: near `function el(tag, cls, text)`
- `currentStep`, `STEP_DATA`: near the top of the walkthrough section
- `renderStep1()` through `renderStep5()`: early in the walkthrough
- `renderStep6()` through `renderStep14()`: deeper in the walkthrough (higher indent level due to nested scope)
- `showStep()`: near the end of the walkthrough
- End of script block: last `</script>` tag

Note: The file uses 2-space indentation throughout (Prettier-enforced). renderStep6-14 are at a deeper indent level than renderStep1-5 because they live inside a nested scope.

## Persistent Layer Pattern (steps 3-5)

Feature #17 introduced a persistent DOM layer for steps 3-5. Key architecture:

- **`s35Layout`** (`div.hw-s35-layout`): Container with class `hw-s35-at-N` controlling CSS transitions
- **`s35Body`** → **`s35Columns`**: 8 column divs, each with chip + arrow + pair (blue/yellow/green pills)
- **`s35Extras`** (`div.hw-s35-extras`): Volatile content cleared each step (sidenotes, legends, equations)
- **`buildS35Step3Extras()`**, **`buildS35Step4Extras()`**, **`buildS35Step5Extras()`**: Build volatile content
- **Merge animation**: Step 5 adds `hw-s35-merged` class after 500ms → blue/yellow collapse, green expands
- **`mergeTimeout`**: Cleared on every step change to prevent stale animations
- **FLIP animation**: Captures chip positions before layout change, animates transform delta

### Extending the pattern to other step ranges

When adding persistent layers for other step ranges (e.g., steps 6-8), follow the same structure:

1. Create persistent elements once (outside any render function)
2. Use parent class (`hw-sXY-at-N`) to control CSS transitions
3. Rebuild volatile extras each step
4. In `showStep()`, check if persistent container needs reinserting (`!container.parentNode`)

## Round 2 Context (features.json v2)

Round 1 implemented 13 features building the 12-step attention head walkthrough from scratch. Round 2 is a polish/redesign pass with 16 new features.

### Key design principles for round 2

- **Visual continuity**: The #1 priority. When advancing steps, NEVER wipe and redraw elements that persist across steps. Animate transitions — move, resize, recolor existing DOM elements. Only destroy elements that truly disappear.
- **Annotations in sidenotes gutter**: The annotation panel moves out of the card into the sidenotes column, freeing the full card width for the visualization.
- **Column pills**: Matrix columns should be unified rounded rectangles (one per token), not grids of separate cells. Emphasizes "one vector per token."
- **Pandas-style truncation**: Ellipsis (⋯, horizontal) goes in the MIDDLE row of any matrix/vector, not the bottom.
- **Proportional matrix sizing**: Matrices should be drawn at sizes that reflect their actual dimensions (T×T is square, T×d is tall-and-narrow, etc.).
- **Softmax**: Must be explained between the QK^T scores (step 11) and the attention heatmap (step 12). Round 1 had a pedagogical gap here.

### Step numbering change (12 → 14)

Old step 6 splits into new steps 6 (embeddings matrix formation) and 7 (layer norm + QKV). A new step 12 (interactive attention heatmap, moved from section 04c) is inserted after QK^T. All subsequent steps shift by +2.

### Reference documents

- `attention-head-figure.md` — original design spec
- `attention-head-figure-edits.md` — user's edit notes for round 2
- `src/pages/transformers/claude-progress.txt` — session-by-session log

## Round 3 Context (features.json — features 17+)

Round 3 focuses on **object continuity** — making DOM elements persist across step transitions instead of being destroyed and recreated. Features #17-23 were added to features.json.

### Current persistent layer status

- **Steps 1-2**: Full rebuild (no persistent layer yet)
- **Steps 3-5**: Persistent layer implemented (Feature #17) — `hw-s35-*` classes
- **Steps 6-14**: Full rebuild (to be migrated in future features)

### showStep() dispatch logic

```
if (step >= 3 && step <= 5) → persistent s35 layer
else → full rebuild (renderStepN)
```

## Testing

- Use Playwright MCP to navigate to `http://localhost:4321/transformers/`
- Verify visual rendering, interactions, animations
- Check both dark and light theme modes
- Do NOT rely solely on build success — visually confirm each feature
- **After creating dynamic elements**, always verify computed styles match expectations (see Astro scoping section above)
- **Visual continuity check**: When testing step transitions, verify that elements shared between steps are NOT destroyed and recreated — they should animate or persist in place
