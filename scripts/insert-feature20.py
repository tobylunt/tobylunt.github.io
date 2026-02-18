#!/usr/bin/env python3
"""Feature #20 — Scroll-triggered animations and section transitions.

Adds:
- CSS for .reveal / .revealed classes with opacity+translateY transition
- prefers-reduced-motion support
- IntersectionObserver-based reveal system
- data-reveal attributes on key content blocks within each section
"""

import re

FILE = "src/pages/transformers/index.astro"

with open(FILE, "r") as f:
    content = f.read()

# ──────────────────────────────────────────────────────────
# 1. Add CSS before </style> — reveal animation classes
# ──────────────────────────────────────────────────────────

STYLE_ANCHOR = "\n</style>"
assert STYLE_ANCHOR in content, "Could not find </style> anchor"

REVEAL_CSS = """
\t/* ── Feature #20: Scroll-triggered reveal animations ── */
\t.reveal {
\t\topacity: 0;
\t\ttransform: translateY(24px);
\t\ttransition: opacity 0.6s ease-out, transform 0.6s ease-out;
\t}
\t.reveal.revealed {
\t\topacity: 1;
\t\ttransform: translateY(0);
\t}

\t/* Stagger children within a section */
\t.reveal.reveal-d1 { transition-delay: 0.08s; }
\t.reveal.reveal-d2 { transition-delay: 0.16s; }
\t.reveal.reveal-d3 { transition-delay: 0.24s; }

\t/* Reduced motion: instant reveal, no animation */
\t@media (prefers-reduced-motion: reduce) {
\t\t.reveal {
\t\t\topacity: 1;
\t\t\ttransform: none;
\t\t\ttransition: none;
\t\t}
\t}
"""

content = content.replace(STYLE_ANCHOR, REVEAL_CSS + STYLE_ANCHOR, 1)


# ──────────────────────────────────────────────────────────
# 2. Add JS after the last </script> — IntersectionObserver for reveals
# ──────────────────────────────────────────────────────────

# Find the very last </script> in the file
last_script_end = content.rfind("</script>")
assert last_script_end > 0, "Could not find last </script>"

REVEAL_JS = """

<script is:inline>
\t// Feature #20: Scroll-triggered reveal animations
\t(function() {
\t\t// Respect prefers-reduced-motion
\t\tif (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

\t\t// Select all elements that should reveal on scroll
\t\tvar targets = document.querySelectorAll('.reveal');
\t\tif (!targets.length) return;

\t\tvar io = new IntersectionObserver(function(entries) {
\t\t\tentries.forEach(function(entry) {
\t\t\t\tif (entry.isIntersecting) {
\t\t\t\t\tentry.target.classList.add('revealed');
\t\t\t\t\tio.unobserve(entry.target);
\t\t\t\t}
\t\t\t});
\t\t}, {
\t\t\trootMargin: '0px 0px -12% 0px',
\t\t\tthreshold: 0.01
\t\t});

\t\ttargets.forEach(function(el) { io.observe(el); });

\t\t// Immediately reveal anything already in the viewport on load
\t\t// (above the fold — so it doesn't flash invisible then animate)
\t\trequestAnimationFrame(function() {
\t\t\ttargets.forEach(function(el) {
\t\t\t\tvar rect = el.getBoundingClientRect();
\t\t\t\tif (rect.top < window.innerHeight * 0.88) {
\t\t\t\t\tel.classList.add('revealed');
\t\t\t\t\tio.unobserve(el);
\t\t\t\t}
\t\t\t});
\t\t});
\t})();
</script>"""

# Insert after the last </script>
content = content[:last_script_end + len("</script>")] + REVEAL_JS + content[last_script_end + len("</script>"):]


# ──────────────────────────────────────────────────────────
# 3. Add .reveal class to key content elements
# ──────────────────────────────────────────────────────────

# Strategy: Add .reveal to elements we can reliably identify.
# We'll target:
# - Section headers (the flex items-baseline gap-4 div within each section)
# - .section-prose blocks
# - .subsection-divider elements
# - .linkage-callout elements
# - Major visualization containers
# - .mi-teaser, .mi-followup, .mi-openbox-wrap
# - .circ-closing

replacements = [
    # Section prose blocks — add reveal class
    ('class="section-prose"', 'class="section-prose reveal"'),

    # Subsection dividers
    ('class="subsection-divider"', 'class="subsection-divider reveal"'),

    # Linkage callouts (various color variants)
    ('class="linkage-callout linkage-', 'class="linkage-callout reveal linkage-'),
    # plain linkage-callout if any
    ('class="linkage-callout"', 'class="linkage-callout reveal"'),

    # Architecture diagram
    ('class="arch-pipeline"', 'class="arch-pipeline reveal"'),

    # Embeddings: tokenizer, lookup table, vector plot
    ('class="embed-tokenizer"', 'class="embed-tokenizer reveal"'),
    ('class="embed-lookup"', 'class="embed-lookup reveal"'),
    ('class="embed-position"', 'class="embed-position reveal"'),

    # Attention: QKV projection, dot-product, heatmap, softmax
    ('class="attn-qkv-wrap"', 'class="attn-qkv-wrap reveal"'),
    ('class="attn-dot-wrap"', 'class="attn-dot-wrap reveal"'),
    ('class="attn-heatmap-wrap"', 'class="attn-heatmap-wrap reveal"'),
    ('class="attn-softmax-wrap"', 'class="attn-softmax-wrap reveal"'),
    ('class="attn-output-wrap"', 'class="attn-output-wrap reveal"'),

    # Multi-head attention
    ('class="mha-heads-wrap"', 'class="mha-heads-wrap reveal"'),
    ('class="mha-concat-wrap"', 'class="mha-concat-wrap reveal"'),

    # FFN
    ('class="ffn-structure-wrap"', 'class="ffn-structure-wrap reveal"'),
    ('class="ffn-activation-wrap"', 'class="ffn-activation-wrap reveal"'),
    ('class="ffn-expansion-wrap"', 'class="ffn-expansion-wrap reveal"'),

    # Residual stream
    ('class="rs-highway-wrap"', 'class="rs-highway-wrap reveal"'),
    ('class="rs-norm-wrap"', 'class="rs-norm-wrap reveal"'),

    # Output layer
    ('class="out-unembed-wrap"', 'class="out-unembed-wrap reveal"'),
    ('class="out-logits-wrap"', 'class="out-logits-wrap reveal"'),
    ('class="out-temp-wrap"', 'class="out-temp-wrap reveal"'),

    # Walkthrough (Feature #17)
    ('class="wt-walkthrough"', 'class="wt-walkthrough reveal"'),

    # Circuits (Feature #18)
    ('class="circ-induction-wrap"', 'class="circ-induction-wrap reveal"'),
    ('class="circ-types"', 'class="circ-types reveal"'),

    # Mechinterp teaser (Feature #19)
    ('class="mi-teaser"', 'class="mi-teaser reveal"'),
    ('class="mi-followup"', 'class="mi-followup reveal"'),
    ('class="mi-openbox-wrap"', 'class="mi-openbox-wrap reveal"'),

    # Closing
    ('class="circ-closing"', 'class="circ-closing reveal"'),

    # Preamble elements
    ('class="preamble-teaser"', 'class="preamble-teaser reveal"'),
    ('class="vocab-legend"', 'class="vocab-legend reveal"'),

    # Layer norm subsection title  (uses h3 with subsection-divider)
    # Already handled by subsection-divider replacement above
]

for old, new in replacements:
    content = content.replace(old, new)


# ──────────────────────────────────────────────────────────
# Write it back
# ──────────────────────────────────────────────────────────

with open(FILE, "w") as f:
    f.write(content)

# Count how many .reveal classes we added
import re
count = len(re.findall(r'\breveal\b', content)) - 10  # subtract CSS/JS references
print(f"Feature #20 inserted successfully. ~{count} elements will animate on scroll.")
