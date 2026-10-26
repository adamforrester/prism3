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
- **Colors** are the provider's, copied verbatim. A mark is never retinted, and a one-color form is its
  own file, drawn by the provider, only where the provider publishes one.
- **Every file has a record** in `provenance.json`: where it came from, who holds the rights, when it was
  retrieved, the terms that permit this use, the provider's usage guideline, the colors as supplied and
  the forms the provider allows. No record, no build.

## What is committed today

**Neutral placeholders only**, gray shapes named for the providers of the first set, so the provider
files are a data drop: the SVGs and their records change, and no name moves. `card/generic` is not a
placeholder: it is Prism3's own neutral card, which names no network, and it stays.

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
