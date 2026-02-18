#!/usr/bin/env python3
"""Feature #22 — Performance audit: lazy loading, animation efficiency, bundle size.

Wraps heavy visualization scripts in IntersectionObserver-based lazy initialization:
- QKV projection SVG (~45 SVG elements)
- Multi-head attention heatmaps (48 DOM elements)
- Activation function canvas (250+ canvas ops)
- Residual stream animations (animation loops + bar chart)

Each script defers initialization until the visualization's container
enters the viewport (with 200px rootMargin lookahead).
"""

FILE = "src/pages/transformers/index.astro"

with open(FILE, "r") as f:
    content = f.read()

def wrap_lazy(content, old_comment, element_id, label):
    """Wrap a DOMContentLoaded script body in a lazy-init IntersectionObserver pattern.

    Finds: document.addEventListener('DOMContentLoaded', () => {
               // <old_comment>

    Replaces start with lazy wrapper, and replaces the closing });\\n</script>
    with the lazy observer + closing.
    """
    old_start = "\tdocument.addEventListener('DOMContentLoaded', () => {\n\t\t// %s" % old_comment
    assert old_start in content, f"Could not find: {old_comment}"

    new_start = """\t// %s (lazy-init: Feature #22)
\tdocument.addEventListener('DOMContentLoaded', () => {
\t\tvar _lazyEl = document.getElementById('%s');
\t\tif (!_lazyEl) return;
\t\tfunction _lazyInit() {
\t\t// %s""" % (label, element_id, old_comment)

    content = content.replace(old_start, new_start, 1)

    # Find the NEXT closing });  </script> after our insertion
    start_pos = content.find(new_start)
    search_from = start_pos + len(new_start)
    close_pattern = "\t});\n</script>"
    close_pos = content.find(close_pattern, search_from)
    assert close_pos > search_from, f"Could not find closing for: {label}"

    lazy_close = """\t\t}
\t\t// Lazy: init now if near viewport, else wait
\t\tvar _r = _lazyEl.getBoundingClientRect();
\t\tif (_r.top < window.innerHeight * 1.5) {
\t\t\t_lazyInit();
\t\t} else {
\t\t\tvar _lio = new IntersectionObserver(function(entries) {
\t\t\t\tif (entries[0].isIntersecting) { _lio.disconnect(); _lazyInit(); }
\t\t\t}, { rootMargin: '200px 0px' });
\t\t\t_lio.observe(_lazyEl);
\t\t}
\t});
</script>"""

    content = content[:close_pos] + lazy_close + content[close_pos + len(close_pattern):]
    print(f"  Wrapped: {label}")
    return content


# 1. QKV projection animation (line ~7862)
content = wrap_lazy(content,
    old_comment="--- QKV projection animation ---",
    element_id="qkv-svg",
    label="QKV projection")

# 2. Multi-head attention heatmaps (line ~8388)
content = wrap_lazy(content,
    old_comment="===== Feature #12: Multi-Head Attention heatmaps =====",
    element_id="mha-heatmap-1",
    label="Multi-head heatmaps")

# 3. Activation function canvas (line ~8568)
content = wrap_lazy(content,
    old_comment="===== Feature #14: Activation function canvas =====",
    element_id="ffn-activation-canvas",
    label="Activation function canvas")

# 4. Residual stream animations (line ~8743)
content = wrap_lazy(content,
    old_comment="===== Feature #15: Residual stream animations =====",
    element_id="res-animate-btn",
    label="Residual stream animations")

# Write
with open(FILE, "w") as f:
    f.write(content)

print("\nFeature #22 inserted successfully.")
