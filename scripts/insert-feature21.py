#!/usr/bin/env python3
"""Feature #21 — Mobile responsive layout for all sections and visualizations.

Fixes:
- QKV SVG overflow (min-width: 640px causing horizontal scroll on mobile)
- Attention pipeline recap overflow at 375px
- Tighter padding/margins at small viewports
- Touch-friendly subtitle text for scatter plot
- Additional mobile breakpoints for various sections
"""

FILE = "src/pages/transformers/index.astro"

with open(FILE, "r") as f:
    content = f.read()

# ──────────────────────────────────────────────────────────
# 1. Fix QKV SVG overflow — add overflow:hidden on container
# ──────────────────────────────────────────────────────────

old_qkv_container = """\t.qkv-viz-container {
\t\tmargin: 2rem 0;
\t\tmax-width: 46rem;
\t}"""

new_qkv_container = """\t.qkv-viz-container {
\t\tmargin: 2rem 0;
\t\tmax-width: 46rem;
\t\toverflow: hidden;
\t}"""

assert old_qkv_container in content, "Could not find .qkv-viz-container CSS"
content = content.replace(old_qkv_container, new_qkv_container, 1)

# ──────────────────────────────────────────────────────────
# 2. Fix attention pipeline recap — add overflow:hidden
# ──────────────────────────────────────────────────────────

old_pipeline = """\t.attn-pipeline-recap {
\t\tmargin: 2.5rem 0 1.5rem;
\t\tpadding: 1.5rem;
\t\tbackground: hsl(var(--theme-text) / 0.03);
\t\tborder: 1px solid hsl(var(--theme-text) / 0.08);
\t\tborder-radius: 12px;
\t}"""

new_pipeline = """\t.attn-pipeline-recap {
\t\tmargin: 2.5rem 0 1.5rem;
\t\tpadding: 1.5rem;
\t\tbackground: hsl(var(--theme-text) / 0.03);
\t\tborder: 1px solid hsl(var(--theme-text) / 0.08);
\t\tborder-radius: 12px;
\t\toverflow: hidden;
\t}"""

assert old_pipeline in content, "Could not find .attn-pipeline-recap CSS"
content = content.replace(old_pipeline, new_pipeline, 1)

# ──────────────────────────────────────────────────────────
# 3. Add comprehensive mobile CSS before </style>
# ──────────────────────────────────────────────────────────

STYLE_ANCHOR = "\n</style>"
assert STYLE_ANCHOR in content, "Could not find </style> anchor"

MOBILE_CSS = """
\t/* ── Feature #21: Mobile responsive refinements ── */

\t/* 768px (iPad) — tighten spacing */
\t@media (max-width: 768px) {
\t\t.qkv-svg {
\t\t\tmin-width: 500px;
\t\t}
\t\t.mi-teaser-cards {
\t\t\tgrid-template-columns: 1fr;
\t\t}
\t}

\t/* 480px (large phone) — further adjustments */
\t@media (max-width: 480px) {
\t\t.qkv-svg {
\t\t\tmin-width: 420px;
\t\t}
\t\t.qkv-viz-container {
\t\t\tmargin: 1rem 0;
\t\t}
\t\t.qkv-controls {
\t\t\tgap: 6px;
\t\t}
\t\t.qkv-btn {
\t\t\tpadding: 5px 10px;
\t\t\tfont-size: 0.75rem;
\t\t}
\t\t.attn-formula {
\t\t\tpadding: 12px;
\t\t\tfont-size: 0.85rem;
\t\t}
\t\t.attn-pipeline-labels span {
\t\t\tmin-width: 2rem;
\t\t\tfont-size: 0.55rem;
\t\t}
\t\t.attn-pipeline-labels span:empty {
\t\t\tmin-width: 0.5rem;
\t\t}
\t\t.circ-induction-wrap {
\t\t\tpadding: 14px;
\t\t}
\t\t.mi-followup {
\t\t\tpadding: 16px;
\t\t}
\t}

\t/* 390px (iPhone SE / small phones) — tightest layout */
\t@media (max-width: 390px) {
\t\t.qkv-svg {
\t\t\tmin-width: 375px;
\t\t}
\t\t.section-prose {
\t\t\tfont-size: 0.92rem;
\t\t}
\t\t.linkage-callout {
\t\t\tpadding: 12px 14px;
\t\t\tfont-size: 0.82rem;
\t\t}
\t\t.embed-tokenizer {
\t\t\tpadding: 14px;
\t\t}
\t\t.embed-scatter-subtitle {
\t\t\tfont-size: 0.7rem;
\t\t}
\t\t.attn-formula {
\t\t\tpadding: 10px;
\t\t\tfont-size: 0.8rem;
\t\t\toverflow-x: auto;
\t\t}
\t\t.attn-pipeline-recap {
\t\t\tpadding: 1rem;
\t\t}
\t\t.attn-pipeline-labels {
\t\t\tdisplay: none;
\t\t}
\t\t.wt-controls {
\t\t\tgap: 6px;
\t\t\tpadding: 10px 12px;
\t\t}
\t\t.wt-ctrl-btn {
\t\t\tpadding: 5px 10px;
\t\t\tfont-size: 0.72rem;
\t\t}
\t\t.mi-teaser-card {
\t\t\tpadding: 14px 12px;
\t\t}
\t\t.mi-card-desc {
\t\t\tfont-size: 0.72rem;
\t\t}
\t\t.mi-openbox {
\t\t\tpadding: 10px 12px;
\t\t\tgap: 4px;
\t\t}
\t\t.mi-openbox-wrap {
\t\t\tgap: 0.6rem;
\t\t}
\t\t.mi-openbox-label-in,
\t\t.mi-openbox-label-out {
\t\t\tfont-size: 0.65rem;
\t\t}
\t\t.circ-closing-text {
\t\t\tfont-size: 0.82rem;
\t\t}
\t}
"""

content = content.replace(STYLE_ANCHOR, MOBILE_CSS + STYLE_ANCHOR, 1)

# ──────────────────────────────────────────────────────────
# 4. Update scatter plot subtitle for touch accessibility
# ──────────────────────────────────────────────────────────

old_subtitle = 'hover over any point to see the word'
new_subtitle = 'hover or tap any point to see the word'
assert old_subtitle in content, "Could not find scatter subtitle"
content = content.replace(old_subtitle, new_subtitle, 1)

# ──────────────────────────────────────────────────────────
# Write it back
# ──────────────────────────────────────────────────────────

with open(FILE, "w") as f:
    f.write(content)

print("Feature #21 inserted successfully.")
