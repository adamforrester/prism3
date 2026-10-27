# Brand marks — what this set is, where the artwork comes from, and the trademark line

## What the set is

Provider marks: the glyph a sign-in or wallet button carries (`provider/`), wallet logo lockups
(`wallet/`), card networks (`card/`) and social marks (`social/`). They are the second icon type, beside
the core set in `icons/`, because they need the opposite of everything the core set does: several paths,
the provider's own colors, a provider-shaped artboard, and no ink from the component that hosts them.

- **Names** are ours (`brand-mark-set.ts`), `<kind>/<provider>[-<style>]`, so swapping the artwork
  changes files, never names.
- **Artboards** by kind: square 24×24 (`social`, `provider`), card 32×20 (`card`), and wallet, 24 high
  with the width per mark (`wallet`).
- **Card files are full-bleed** (owner decision Q720 A): square corners, no border, the tile's ground kept, because a
  colored ground is part of the provider's mark. The `brand-mark` component rounds the corners and draws the edge
  from tokens, the same at every size and mode, so a card file that rounds or borders itself fails
  `lint-glyph-geometry.ts` (CARD TILE BAKED, CARD BORDER BAKED).
- **Colors** are the provider's, copied verbatim. A mark is never retinted, and a one-color form is its
  own file, drawn by the provider, only where the provider publishes one.
- **Every file has a record** in `provenance.json`: where it came from, who holds the rights, when it was
  retrieved, the terms that permit this use, the provider's usage guideline, the colors as supplied and
  the forms the provider allows. No record, no build.

## What is committed today

**Neutral placeholders only**, gray shapes named for the providers of the first set, so the provider
files are a data drop: the SVGs and their records change, and no name moves. `card/generic` is not a
placeholder: it is Prism3's own neutral card, which names no network, and it stays.

## Adding a provider

Three data edits, then the steps any new member owes the versioned surface:

1. the SVG in its kind's folder;
2. its entry in `brand-mark-set.ts`;
3. its record in `provenance.json`;
4. its name in the `brand-mark` row of `lint-axis-values.ts`'s register;
5. after `regen.ts`, `--accept` on `lint-component-surface.ts` and `lint-component-renames.ts`;
6. a change note for the surface drift.

Replacing a placeholder's artwork under the same name is steps 1 and 3, then `regen.ts`, `--accept`
on `lint-component-surface.ts` only (the member count holds and the plans it projects move; the axes
baseline does not), and a change note (`engine: minor`).

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
where a brand swaps marks by name (`brand-mark` docs).
