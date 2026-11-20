## (2026-11-18) — controlShape's schema description follows the manifest; Link shows a social follow link (#2076, #4019)

### controlShape (#2076, owner decision 2026-11-18 A, copy approved)

`theme-schema.json`'s `controlShape.description` said Hairline "implies the hairline rung", false since #2059 emits
`radius.hairline` for every brand, and still used "pill-able" and "rung", which #2050 retired. It now reads as the
lever manifest's `controlShape` description does, with the token names agents read kept in brackets
(`radius.hairline`, `radius.none`, `radius.md`, `radius.capsule`).

**Which wording.** #2076 quoted #2070's string 3 ("buttons and other controls that can round fully … Pill rounds the
ends fully, whatever the softness"). Since then #2361 (Q139) put fields and the checkbox on Hairline and Boxed too,
and #2695 (Q333) rewrote the last sentence, so string 3 would already be stale here. The schema takes the manifest's
current wording, the approved line's successor in `levers.ts`. That line carries one DRAFT part of its own: Boxed's
reach (Q139 item 3), marked in its comment. String 3 is a one-line swap if the owner wants it as quoted.

### Social follow links (#4019, the leftover of #2343, Q-B6 A)

Link's `docs.usage` gains the example the #2343 design note set out (§2.5): a follow link is a Link, not a sign-in or
wallet button; a standalone Link around the network's one-color mark (ProviderLogo `social/<name>-mono` at 24px)
with a 44 by 44 target; the name in `aria-label`, the mark `aria-hidden`; the link's ink, hover and focus ring the
theme's. **The prose is DRAFT for the owner.** The note's other half, a `social` row in the brand-mark docs, was not
in #4019 and is not done here.

### Verification

`test.ts` #2076: the description names all four tokens and none of "implies", "pill-able", "rung" (restoring main's
text fails it by name). #4019: Link's usage names a `social/*-mono` mark that the artwork folder ships, read from
disk, and names the link by `aria-label` with the mark hidden (naming an unshipped mark, or main's usage, fails by name).
