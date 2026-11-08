## (2026-11-07) — Research: a design-system overview and more visual style guides (#1941)

The owner unparked #1941 (Q113) to explore two things: a set of overview frames Prism3 generates into Figma, and style guides that are more visual than rows in a table. The research is in `docs/superpowers/notes/2026-11-07-ds-overview-and-visual-style-guide.md`. This PR adds no code.

**What's there today.**
- **No system-at-a-glance frame exists** in the engine, plugin or studio.
- **The studio Style guide** is already built from specimens and cards, but it reads as a long reference page.
- **The Figma style guides are tables.** They read the file's variables, and the engine supplies only the contrast contract.
- **A fresh file's Foundations page is empty** (#3467).

**Options, each held for the owner.** The note gives four directions for the overview and seven for the style guides, three studio and four Figma. The recommended path:
1. a compact Brand preview built from today's sections;
2. rulers and stacks in Figma;
3. a small foundations set of overview frames.

All three would draw on one engine-owned list of the key roles, so the studio and Figma show the same roles. Owner questions Q-a0 to Q-b3 are open. Q-a0 asks for the hand-built reference overview's frame list, which isn't recorded in the repo.

**Trap for whoever builds on this.** Any printed contrast verdict has to come from `resolveAllModes` or a contract pair, for the exact ink, ground and mode drawn, and the gate has to re-derive it independently of the drawing code. Separately, `docs/45` lags the code on the group fill and the phase-3 kinds. That is filed as #3515, not fixed here.
