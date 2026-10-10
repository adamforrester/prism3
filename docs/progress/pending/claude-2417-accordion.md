## (2026-10-10) — Accordion and its indicator building block (#2417, owner Q182 and Q183) — owner review: copy

### What landed

- **`accordion`**, 24 members: `expansion` [collapsed, expanded] × `indicator` [start, end] × `size` [small, medium, large] × state [rest, focus-visible]. No hover, pressed or disabled member (Q182.3, Q183). One def, no group: the stack's code contract (single or multiple open, key arrays, the heading level) is code-only.
- **`_accordion-indicator`**, 12 members, under Subcomponents: `style` [chevron, plus-minus] × `expansion` × `size`, one glyph instance per member. The accordion nests it `nest-exposed` (`expose: ['style']`, `follow: ['expansion', 'size']`).
- **Schema:** `expansion` joins `VARIANT_AXES`; an id may lead with one `_` (Figma's private prefix — the id IS the set name and the nest target, so the prefix cannot be a Figma-only rename); `PaddingDef.blockEnd`; a fixed `weightIntent` form.

### Diagnosis worth keeping

- **The style-survives-expansion premise is two halves, and only one is checkable here.** Figma keeps an override on a nested instance across a variant switch when the layer has the same name and the same set in both members, carrying the overridden property and taking the rest from the new member. The shim holds the build's half (same layer, same set, coordinates differing in `expansion` only, exposed), and models the swap by that rule; the host's half needs a live file. Switching the POSITION is expected to reset the style: the two positions are different layers (`startIndicator` / `endIndicator`), because node order is fixed per member and `positionWhen` moves only a row's sole flow child.
- **Fix 1 (panel ink) dissolved into the slot decision.** The proposal's second text ink existed because the panel held a paragraph that could only ask for the header's `label` ink. With Q182.4's swap slot there is no panel text node: the accordion binds no `icon` key (the glyph's ink is the indicator's), so the slot is pushed no ink at all and its content keeps its own. A new paint slot with no node to paint would be a dead entry in `PAINT_SLOTS`, which its admissibility rule forbids. `test.ts` holds "no ink reaches the content" by name.
- **The `body.*.strong` title dangled on the `[default, emphasis]` corpus brand** (`#1601`). `weightIntent` needed an axis; the title has none, so the fixed form resolves every body binding to `bold` per brand.
- **The medium glyph moved from 20px to 24px:** a default size must resolve the `md` rung (`lint-rung-names`, #756); 24px fills the medium header's 24px line box.

### Held for the owner

- The draft copy (summary, description, docs, placeholder title).
- The axis name `indicator` for the position (technical call; argued in `VARIANT_AXES`' neighbor, `lint-axis-values`).
- The panel's inline inset (content under the glyph at start position) and its end inset (the header's block padding).
- The content slot is an instance swap holding the file's placeholder; a native Figma slot waits on an executor revision.

### Trap

- `lint-axis-values` and `lint-emission-version` read COMMITS: run them after a `wip:` commit, or they pass over an uncommitted def.
