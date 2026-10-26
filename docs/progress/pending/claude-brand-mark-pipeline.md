## (2026-10-26) — Brand marks: the second icon type, on neutral placeholders (#2343 PR 1)

**What landed.** The brand-mark pipeline from the #2343 proposal (§1, §4 PR 1), on the owner's calls of 2026-10-26:
`packages/engine/marks/` (folders by kind, `NOTICE.md`, `provenance.json`), `brand-mark-set.ts` (our names to files,
authored), `emit-marks.ts` → `brand-mark-glyphs.ts` (generated, a regen artifact beside `icon-glyphs.ts`), the
`brand-mark` def (`emitAsComponents`, so each mark is a `brand-mark/<kind>/<name>` Figma component), and the gates.
Every mark is a neutral gray placeholder named for the proposal's first set, except `card/generic`, which is Prism3's
own card and stays. The owner's files are then a data drop (PR 3): SVGs and records change, names do not.

**The provider list is data** (Q-B7 amended: about a dozen providers are coming). No count is asserted in code: the
gates hold "every listed mark has a file and a record, every file a name and a record", and `lint-icon-count.ts`
fails the `brand-mark` def's prose if it states any count of marks.

**Q-B1 B is written down where it will be seen.** The marks are committed because the repository is internal for
now; if it goes public, the set is refactored to placeholders plus recorded terms first. That condition is in
`marks/NOTICE.md`, `marks/provenance.json`'s `_note` and `icons/NOTICE.md`, and `lint-mark-provenance.ts` fails if
`NOTICE.md` or the `_note` loses it.

**The diagnosis that kept the projector change small.** The `vector` part path already builds a GLYPH from an SVG
document through `createNodeFromSvg`, and a GLYPH node only takes ink through `descendantFills`. So a mark is a GLYPH
whose document carries literal fills and whose part takes no ink: one branch keyed on the def id (the `ICON_DEF_ID`
precedent), resolving the glyph against `BRAND_MARK_DOCUMENTS` and skipping `paintOf`, rather than a new node type.
The in-place update path, the hand-edit record and the artboard read-back all apply to marks unchanged.

**Gates and their independence.** `lint-mark-provenance.ts` walks the folder itself and compares it with the typed
records both ways, field by field against its own literals. `lint-mark-colors.ts` re-parses each source SVG with its
own reader and compares the fills with the record, the generated module (in order, spelled as supplied) and the
`brand-mark` Figma plans (no paint, no bound variable), and holds that no host pushes `descendantFills` into a
`brand-mark/*` instance (vacuous until a host carries one; its detector is proven by a self-check). The
`lint-glyph-geometry.ts` arm types its own artboard table (square 24×24, card 32×20, wallet 24 high at the recorded
width) and measures the ink with a walker over the whole SVG path grammar (relative commands, smooth curves, arcs),
because provider artwork is exported by whatever tool the provider used. Each was mutated to fail by name; the
mutations and their failing lines are in the PR.

**Held for the owner** (Q-block on #2343): the page the marks sit on in the file (built: a "Brand marks" page under
Foundations, after "Icons & assets", so each Foundations page holds one set and the web list reads "Brand mark"), the
def's shipped prose, which is DRAFT, and the placeholder names the owner's files must match.

**Trap for whoever drops the real files in.** A wallet lockup's width is stated once, in its provenance record
(`width`), and both the emitter and the geometry arm compare the file with it. Change the record with the file.
