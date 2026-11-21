## (2026-11-19) — Theme › Type laid out around the text types, with line height and letter spacing set by value (#3079)

**What.** The owner approved the proposed Type view (2026-11-18, A). The page now reads Fonts (unchanged), then Scale,
then **Text types**, one card per text type (display, title, body, label, caption, eyebrow, code), then **Every text
type**. One page switch, **Show advanced settings**, replaces Scale's "Show 1 advanced" and the page's stacked "Show 15
advanced" (Q3079.2 A): advanced rows appear in place under an "Advanced" mark, and a search draws them too. Each card
holds its family, read-only; a **Line height** and a **Letter spacing** menu; its size rows, shown (Q3079.3 A); and,
advanced, its weights, italic styles and font style pins (Q3079.6 A). Display also holds the largest display size
(Q3079.9 A). Every text type holds the weight behind each name, Underlined link styles with the underline beneath it
(Q3079.7 A), and each line height and letter spacing name's value and mode swap.

**The two menus (Q808 A).** Each lists real values ("1.65", "+1%") with the token name as secondary text, every role
on the ladder (`open` included), and Default, which shows what the brand gets with nothing stored. A value writes the
text type's pin and removes its nudge; Default removes both. A stored nudge shows as the value it lands on; when it lands
on several (title +1 → 1.40 / 1.25), a **Current** entry holds it until another value is picked (Q3079.5 A). Opening the
view writes nothing, so a stored brand stays byte-identical until edited. Line height needed a pin of its own, so the
engine gains `typography.leading` (Q3079.4 A), opt-in, the twin of #3077's `typography.tracking`.

**The extra small sizes (Q809 A, Q3079.8 A).** The three "Smallest … size" levers are gone. Title 2xs, caption sm and
caption xs are rows in their cards, each with a switch that writes what its lever wrote (`titleFloor` 16,
`captionFloor` 10, `sizeFloor` 8). An off row shows with advanced, an on row always (Q3079.10 A). The refusals moved
onto the rows: Compact refuses title 2xs; title 2xs set individually holds its switch on; caption md at 10px refuses
caption sm, so two 10px captions can't be reached. **Q809 was still open on the issue**; this builds its recommended A,
and the PR flags it as pending.

**Trap.** The preview kept its sections (Scale, Weights and styles, Line height and letter spacing), so the levers' Scale
description and the preview's no longer match. Q23's "one description on both sides" no longer holds for Scale; the
chrome suite asserts the lever copy and the pairing, not that sameness. The derived-mode hold keeps the page switch live
through a `.p3-disclose` class in `STAYS_LIVE`, as the old folds were.

**Measured.** A new chrome section, §3079, fails on main (no cards: `§3079 web: the case stopped at "open Type" —
data-p3 hook "type-card" did not appear`) and passes here. Mutations, each after a `wip:` commit: `setSpacing` keeping
the nudge fails `§3079 web: (c) picking 1.50 for title writes typography.leading.title normal and removes
leadingShift.title …`; the cards reversed fails `§3079 web: (a) one card per text type, in order …` on both hosts; the
engine's `leadPin` dropped fails `test.ts` "#3079 leading: a title pin puts every title size on loose …" and "#3079
leading: a body pin on normal ignores the +1 body nudge".
