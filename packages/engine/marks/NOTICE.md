# Provider logos — what this set is, where the artwork comes from, and the trademark line

## What the set is

Provider marks, in four kinds (owner decisions on #2343, 2026-10-27): payment tiles (`payment/`), standalone
payment logos (`logo/`), the glyph a sign-in button carries (`provider/`) and social marks (`social/`). They
are the second icon type, beside the core set in `icons/`, because they need the opposite of everything the
core set does: several paths, the provider's own colors, a provider-shaped artboard, and no ink from the
component that hosts them.

- **Names** are ours (`provider-logo-set.ts`), `<kind>/<provider>[-<style>]` in lowercase kebab-case (Q778 A),
  so swapping the artwork changes files, never names.
- **Artboards** by kind: square 24×24 (`social`, `provider`); the payment tile, 32×20 (`payment`, Q780 A),
  one kind for every logo in an "accepted payments" row; and the logo, 24 high, hugging its artwork left
  and right, with the width per mark (`logo`, Q781 A, Q783 A). A logo's side spacing is the component's.
- **Payment tiles are full-bleed** (owner decision Q720 A): square corners, no border, the tile's ground
  kept, because a colored ground is part of the provider's mark. The `provider-logo` component rounds the
  corners and draws the edge from tokens, the same at every size and mode, so a tile file that rounds or
  borders itself fails `lint-glyph-geometry.ts` (TILE BAKED, TILE BORDER BAKED). `payment/generic`, the
  owner's own card, is a silhouette with no ground: its record says `fullBleed: false`, which skips only
  the ground check.
- **Colors** are the provider's, copied verbatim. A mark is never retinted, and a one-color form is its
  own file (`-mono`), never made by recoloring the full-color one.
- **Every file has a record** in `provenance.json`: where it came from, who holds the rights, when it was
  supplied, the terms, the usage line, the colors as supplied and the forms allowed. No record, no build.
  Where a file was changed to pass the emitter, its record lists each step (`normalized`). No step
  changes a color.

## What is committed today

**The owner's artwork** (#2343 PR 3, 2026-10-27), assembled from several public sources and
hand-edited to fit. The original sources are not recorded, so every record says so and names the
provider as rights holder. The files were normalized only as far as the emitter requires: clip paths
that were the artboard dropped, a logo's artboard set to the frame its export rounded up, a ground
rectangle written as a path, color keywords written as their hex, `<use>` references inlined, one
gradient transform folded into its circle, gradient definitions moved before the paths, and, on two
social marks, the few coordinates that spilled past the dropped clip clamped to the artboard (by at
most 0.024). `social/x` was supplied as `twitter`; it is the X glyph, so it carries X's name.

## Adding a provider

Three data edits, then the steps any new member owes the versioned surface:

1. the SVG in its kind's folder;
2. its entry in `provider-logo-set.ts`;
3. its record in `provenance.json`;
4. its name in the `provider-logo` row of `lint-axis-values.ts`'s register;
5. after `regen.ts`, `--accept` on `lint-component-surface.ts` and `lint-component-renames.ts`;
6. a change note for the surface drift.

Replacing a mark's artwork under the same name is steps 1 and 3, then `regen.ts`, `--accept` on
`lint-component-surface.ts` only (the member count holds and the plans it projects move; the axes
baseline does not), and a change note (`engine: minor`).

Renaming or removing a mark is a name leaving the versioned surface: an entry in `COMPONENT_RENAMES`
(`component-renames.ts`, a `value` rename or a `drop`), so the plugin's Update renames or deprecates the
built component in place, then the steps above.

## Trademarks

Every provider mark is a trademark of its owner. Its presence here grants no right to use it. A mark is
shown only as its owner's guidelines allow (the record's `usage`), unaltered, and only to identify that
provider's own service.

## The repository-visibility condition

Owner decision on #2343, Q-B1 B (2026-10-26): every mark the owner supplies is committed, because the
repository is for internal use for now and marks like these are commonplace in the Figma community.

**If the repository goes public, refactor before it does**, to the Q-B1 A model: commit a mark only when
its source's terms permit this use, recorded in `provenance.json`, and keep a same-name neutral
placeholder for every other mark. The artwork then stays in the brand's Figma library and in its code,
where a brand swaps marks by name (`provider-logo` docs).
