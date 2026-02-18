#!/usr/bin/env python3
"""Feature #19 — Mechanistic interpretability teaser and future post link.

Enhances the closing section with:
- "Why it matters" teaser cards (Safety, Understanding, Control)
- "Opened box" visual mirroring the preamble's closed black box
- More prominent follow-up post callout card
- CSS for all new elements
"""

import re

FILE = "src/pages/transformers/index.astro"

with open(FILE, "r") as f:
    content = f.read()

# ──────────────────────────────────────────────────────────
# 1. Replace the mechinterp prose + closing section (HTML)
# ──────────────────────────────────────────────────────────

OLD_HTML = '''\t\t\t\t<div class="section-prose">
\t\t\t\t\t<p>
\t\t\t\t\t\tThe ability to identify and understand these circuits is the foundation of
\t\t\t\t\t\t<strong>mechanistic interpretability</strong> &mdash; the project of reverse-engineering
\t\t\t\t\t\twhat neural networks actually compute, rather than just observing what they output.
\t\t\t\t\t\tIf we can understand the algorithms transformers learn, we can begin to predict their
\t\t\t\t\t\tbehavior, identify failure modes, and build models we can genuinely trust.
\t\t\t\t\t</p>
\t\t\t\t\t<p>
\t\t\t\t\t\tThis is one of the most exciting frontiers in AI research. The transformer architecture
\t\t\t\t\t\tyou&rsquo;ve learned in this explainer isn&rsquo;t just an engineering artifact &mdash;
\t\t\t\t\t\tit&rsquo;s a computational structure that <em>we can study scientifically</em>,
\t\t\t\t\t\tuncovering the algorithms hidden within its weights.
\t\t\t\t\t</p>
\t\t\t\t</div>

\t\t\t\t{/* Closing: tying back to the preamble */}
\t\t\t\t<div class="circ-closing">
\t\t\t\t\t<div class="circ-closing-divider"></div>
\t\t\t\t\t<div class="circ-closing-journey">
\t\t\t\t\t\t<div class="circ-closing-title">The journey</div>
\t\t\t\t\t\t<div class="circ-journey-steps">
\t\t\t\t\t\t\t<span class="circ-j-step circ-j-embed">Tokens</span>
\t\t\t\t\t\t\t<span class="circ-j-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="circ-j-step circ-j-embed">Embeddings</span>
\t\t\t\t\t\t\t<span class="circ-j-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="circ-j-step circ-j-attn">Attention</span>
\t\t\t\t\t\t\t<span class="circ-j-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="circ-j-step circ-j-ffn">FFN</span>
\t\t\t\t\t\t\t<span class="circ-j-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="circ-j-step circ-j-output">Prediction</span>
\t\t\t\t\t\t\t<span class="circ-j-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="circ-j-step circ-j-circuits">Circuits</span>
\t\t\t\t\t\t</div>
\t\t\t\t\t</div>
\t\t\t\t\t<p class="circ-closing-text">
\t\t\t\t\t\tWe started with a black box. Now you know how tokens become vectors, how attention
\t\t\t\t\t\tlets tokens communicate, how feed-forward layers store knowledge, how residual
\t\t\t\t\t\tconnections carry information through dozens of layers, and how all of it composes
\t\t\t\t\t\tinto circuits that implement real algorithms. The box is open.
\t\t\t\t\t</p>
\t\t\t\t\t<p class="circ-closing-text circ-closing-cta">
\t\t\t\t\t\t<em>In a follow-up post, we&rsquo;ll go hands-on &mdash; reproducing these circuits
\t\t\t\t\t\tlocally in Llama&nbsp;3 using tools from the mechanistic interpretability community.
\t\t\t\t\t\tStay tuned.</em>
\t\t\t\t\t</p>
\t\t\t\t\t<div class="circ-closing-end">&#9632;</div>
\t\t\t\t</div>'''

NEW_HTML = '''\t\t\t\t<div class="section-prose">
\t\t\t\t\t<p>
\t\t\t\t\t\tThe ability to identify and understand these circuits is the foundation of
\t\t\t\t\t\t<strong>mechanistic interpretability</strong> &mdash; the project of reverse-engineering
\t\t\t\t\t\twhat neural networks actually compute, rather than just observing what they output.
\t\t\t\t\t</p>
\t\t\t\t</div>

\t\t\t\t{/* Why mechanistic interpretability matters */}
\t\t\t\t<div class="mi-teaser">
\t\t\t\t\t<div class="mi-teaser-label">Why it matters</div>
\t\t\t\t\t<div class="mi-teaser-cards">
\t\t\t\t\t\t<div class="mi-teaser-card mi-card-safety">
\t\t\t\t\t\t\t<div class="mi-card-icon">&Delta;</div>
\t\t\t\t\t\t\t<div class="mi-card-title">Safety</div>
\t\t\t\t\t\t\t<div class="mi-card-desc">If we can identify the circuits behind model behavior, we can catch failure modes <em>before</em> deployment &mdash; not after.</div>
\t\t\t\t\t\t</div>
\t\t\t\t\t\t<div class="mi-teaser-card mi-card-understanding">
\t\t\t\t\t\t\t<div class="mi-card-icon">&oplus;</div>
\t\t\t\t\t\t\t<div class="mi-card-title">Understanding</div>
\t\t\t\t\t\t\t<div class="mi-card-desc">Moving beyond &ldquo;it works&rdquo; to <em>how</em> it works. Circuits give us a scientific vocabulary for transformer computation.</div>
\t\t\t\t\t\t</div>
\t\t\t\t\t\t<div class="mi-teaser-card mi-card-control">
\t\t\t\t\t\t\t<div class="mi-card-icon">&sect;</div>
\t\t\t\t\t\t\t<div class="mi-card-title">Control</div>
\t\t\t\t\t\t\t<div class="mi-card-desc">Once you know which heads implement a behavior, you can steer, edit, or ablate it &mdash; precise intervention instead of blunt fine-tuning.</div>
\t\t\t\t\t\t</div>
\t\t\t\t\t</div>
\t\t\t\t</div>

\t\t\t\t<div class="section-prose">
\t\t\t\t\t<p>
\t\t\t\t\t\tThis is one of the most exciting frontiers in AI research. The transformer architecture
\t\t\t\t\t\tyou&rsquo;ve learned in this explainer isn&rsquo;t just an engineering artifact &mdash;
\t\t\t\t\t\tit&rsquo;s a computational structure that <em>we can study scientifically</em>,
\t\t\t\t\t\tuncovering the algorithms hidden within its weights.
\t\t\t\t\t</p>
\t\t\t\t</div>

\t\t\t\t{/* Closing: tying back to the preamble */}
\t\t\t\t<div class="circ-closing">
\t\t\t\t\t<div class="circ-closing-divider"></div>
\t\t\t\t\t<div class="circ-closing-journey">
\t\t\t\t\t\t<div class="circ-closing-title">The journey</div>
\t\t\t\t\t\t<div class="circ-journey-steps">
\t\t\t\t\t\t\t<span class="circ-j-step circ-j-embed">Tokens</span>
\t\t\t\t\t\t\t<span class="circ-j-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="circ-j-step circ-j-embed">Embeddings</span>
\t\t\t\t\t\t\t<span class="circ-j-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="circ-j-step circ-j-attn">Attention</span>
\t\t\t\t\t\t\t<span class="circ-j-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="circ-j-step circ-j-ffn">FFN</span>
\t\t\t\t\t\t\t<span class="circ-j-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="circ-j-step circ-j-output">Prediction</span>
\t\t\t\t\t\t\t<span class="circ-j-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="circ-j-step circ-j-circuits">Circuits</span>
\t\t\t\t\t\t</div>
\t\t\t\t\t</div>

\t\t\t\t\t{/* Opened box — mirrors the preamble\\'s closed black box */}
\t\t\t\t\t<div class="mi-openbox-wrap">
\t\t\t\t\t\t<div class="mi-openbox-label-in">tokens in</div>
\t\t\t\t\t\t<div class="mi-openbox">
\t\t\t\t\t\t\t<span class="mi-ob-component mi-ob-embed" title="Embedding">E</span>
\t\t\t\t\t\t\t<span class="mi-ob-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="mi-ob-component mi-ob-attn" title="Attention">A</span>
\t\t\t\t\t\t\t<span class="mi-ob-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="mi-ob-component mi-ob-ffn" title="FFN">F</span>
\t\t\t\t\t\t\t<span class="mi-ob-arrow">&rarr;</span>
\t\t\t\t\t\t\t<span class="mi-ob-component mi-ob-output" title="Prediction">P</span>
\t\t\t\t\t\t</div>
\t\t\t\t\t\t<div class="mi-openbox-label-out">prediction out</div>
\t\t\t\t\t</div>

\t\t\t\t\t<p class="circ-closing-text">
\t\t\t\t\t\tWe started with a black box. Now you know how tokens become vectors, how attention
\t\t\t\t\t\tlets tokens communicate, how feed-forward layers store knowledge, how residual
\t\t\t\t\t\tconnections carry information through dozens of layers, and how all of it composes
\t\t\t\t\t\tinto circuits that implement real algorithms. <strong>The box is open.</strong>
\t\t\t\t\t</p>

\t\t\t\t\t{/* Follow-up post callout */}
\t\t\t\t\t<div class="mi-followup">
\t\t\t\t\t\t<div class="mi-followup-tag">Coming next</div>
\t\t\t\t\t\t<div class="mi-followup-title">Hands-on Mechanistic Interpretability with Llama&nbsp;3</div>
\t\t\t\t\t\t<div class="mi-followup-desc">
\t\t\t\t\t\t\tWe&rsquo;ll reproduce induction heads, name mover circuits, and more &mdash;
\t\t\t\t\t\t\trunning real mechinterp experiments locally using open-source tools and an
\t\t\t\t\t\t\topen-weight model.
\t\t\t\t\t\t</div>
\t\t\t\t\t</div>

\t\t\t\t\t<div class="circ-closing-end">&#9632;</div>
\t\t\t\t</div>'''

assert OLD_HTML in content, "Could not find old HTML to replace"
content = content.replace(OLD_HTML, NEW_HTML, 1)

# ──────────────────────────────────────────────────────────
# 2. Insert new CSS before the closing "/* Closing section */" comment
# ──────────────────────────────────────────────────────────

NEW_CSS = '''
\t/* ── Feature #19: Mechinterp teaser ── */
\t.mi-teaser {
\t\tmargin: 2rem 0;
\t}
\t.mi-teaser-label {
\t\tfont-size: 0.72rem;
\t\tfont-weight: 600;
\t\ttext-transform: uppercase;
\t\tletter-spacing: 0.08em;
\t\tcolor: hsl(var(--theme-text) / 0.35);
\t\ttext-align: center;
\t\tmargin-bottom: 14px;
\t}
\t.mi-teaser-cards {
\t\tdisplay: grid;
\t\tgrid-template-columns: repeat(3, 1fr);
\t\tgap: 12px;
\t}
\t.mi-teaser-card {
\t\tpadding: 20px 16px;
\t\tborder-radius: 10px;
\t\tborder: 1px solid hsl(var(--theme-text) / 0.08);
\t\tbackground: hsl(var(--theme-text) / 0.02);
\t}
\t.mi-card-icon {
\t\tfont-size: 1.4rem;
\t\tmargin-bottom: 8px;
\t\tline-height: 1;
\t}
\t.mi-card-title {
\t\tfont-size: 0.82rem;
\t\tfont-weight: 700;
\t\tmargin-bottom: 6px;
\t}
\t.mi-card-desc {
\t\tfont-size: 0.78rem;
\t\tline-height: 1.55;
\t\tcolor: hsl(var(--theme-text) / 0.6);
\t}
\t.mi-card-safety .mi-card-icon { color: hsl(350 65% 55%); }
\t.mi-card-safety .mi-card-title { color: hsl(350 65% 55%); }
\t.mi-card-safety { border-color: hsl(350 65% 55% / 0.15); }
\t.mi-card-understanding .mi-card-icon { color: hsl(210 70% 55%); }
\t.mi-card-understanding .mi-card-title { color: hsl(210 70% 55%); }
\t.mi-card-understanding { border-color: hsl(210 70% 55% / 0.15); }
\t.mi-card-control .mi-card-icon { color: hsl(270 50% 58%); }
\t.mi-card-control .mi-card-title { color: hsl(270 50% 58%); }
\t.mi-card-control { border-color: hsl(270 50% 58% / 0.15); }

\t/* Opened box visual — mirrors .teaser-blackbox from preamble */
\t.mi-openbox-wrap {
\t\tdisplay: flex;
\t\talign-items: center;
\t\tjustify-content: center;
\t\tgap: 1.2rem;
\t\tmargin: 24px auto 20px;
\t}
\t.mi-openbox-label-in,
\t.mi-openbox-label-out {
\t\tfont-family: ui-monospace, monospace;
\t\tfont-size: 0.72rem;
\t\tcolor: hsl(var(--theme-text) / 0.4);
\t\tletter-spacing: 0.02em;
\t}
\t.mi-openbox {
\t\tdisplay: flex;
\t\talign-items: center;
\t\tgap: 6px;
\t\tpadding: 12px 18px;
\t\tborder-radius: 12px;
\t\tborder: 1.5px solid hsl(var(--theme-text) / 0.15);
\t\tbackground: transparent;
\t}
\t.mi-ob-component {
\t\twidth: 32px;
\t\theight: 32px;
\t\tborder-radius: 6px;
\t\tdisplay: flex;
\t\talign-items: center;
\t\tjustify-content: center;
\t\tfont-size: 0.72rem;
\t\tfont-weight: 700;
\t\tfont-family: ui-monospace, monospace;
\t}
\t.mi-ob-embed { background: hsl(210 70% 55% / 0.15); color: hsl(210 70% 55%); }
\t.mi-ob-attn { background: hsl(35 90% 55% / 0.15); color: hsl(35 90% 55%); }
\t.mi-ob-ffn { background: hsl(150 55% 45% / 0.15); color: hsl(150 55% 45%); }
\t.mi-ob-output { background: hsl(350 65% 55% / 0.15); color: hsl(350 65% 55%); }
\t.mi-ob-arrow {
\t\tcolor: hsl(var(--theme-text) / 0.2);
\t\tfont-size: 0.7rem;
\t}

\t/* Follow-up post callout */
\t.mi-followup {
\t\tmargin: 24px auto;
\t\tmax-width: 480px;
\t\tpadding: 20px 24px;
\t\tborder-radius: 10px;
\t\tborder: 1px solid hsl(35 90% 55% / 0.2);
\t\tbackground: hsl(35 90% 55% / 0.04);
\t\ttext-align: center;
\t}
\t.mi-followup-tag {
\t\tfont-size: 0.65rem;
\t\tfont-weight: 700;
\t\ttext-transform: uppercase;
\t\tletter-spacing: 0.1em;
\t\tcolor: hsl(35 90% 55%);
\t\tmargin-bottom: 8px;
\t}
\t.mi-followup-title {
\t\tfont-size: 0.95rem;
\t\tfont-weight: 700;
\t\tcolor: hsl(var(--theme-text) / 0.85);
\t\tmargin-bottom: 8px;
\t\tline-height: 1.35;
\t}
\t.mi-followup-desc {
\t\tfont-size: 0.8rem;
\t\tline-height: 1.6;
\t\tcolor: hsl(var(--theme-text) / 0.55);
\t}

\t@media (max-width: 480px) {
\t\t.mi-teaser-cards {
\t\t\tgrid-template-columns: 1fr;
\t\t}
\t\t.mi-openbox-wrap {
\t\t\tgap: 0.8rem;
\t\t}
\t\t.mi-ob-component {
\t\t\twidth: 26px;
\t\t\theight: 26px;
\t\t\tfont-size: 0.65rem;
\t\t}
\t}

'''

CSS_ANCHOR = "\n\t/* Closing section */"
assert CSS_ANCHOR in content, "Could not find CSS anchor '/* Closing section */'"
content = content.replace(CSS_ANCHOR, NEW_CSS + CSS_ANCHOR, 1)

with open(FILE, "w") as f:
    f.write(content)

print("Feature #19 inserted successfully.")
