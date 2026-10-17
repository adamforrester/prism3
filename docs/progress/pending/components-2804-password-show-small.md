## (2026-10-16) — Password field: a small text-style Show at every size, and a tighter label row (#2804, Q380)

Owner QA on the built Password field asked for less space between the label and the Show row, and a small Show
control at every field size. Owner decision Q380 A settled it: Show stays a Button in the `text` appearance (an
action, so a button for assistive tech; the text look reads as a link), small at every size, and the row tightens on
every Password field.

**Measured before.** The label row is a hugging auto-layout row, so it was as tall as its tallest child, the Button:
36 / 44 / 56px at small / medium / large, against a label line of 18 / 21 / 24 (body 12 / 14 / 16 × 1.5). The label
was centered in the row, so it sat 9 / 11.5 / 16px further from the box than the 8px root gap: 17 / 19.5 / 24px in all.

**Why a small button alone was not enough.** A small Button is still 36 tall (`size.sm.height`), and the small field
already nested it, so following Q380's first half alone would have moved medium and large to 36 and left small where
it was. The row had to stop taking the button's height. The toggle now stretches to the row (`crossAxisFill`, Figma's
`STRETCH`): a hugging row is sized by its children that do not stretch, which leaves the label, and the button takes
the row's height. Its "Show" is one `label.sm` line (about 14px), which fits every row. No new token was needed. A
fixed row height bound to the label's line box was the alternative, but there is no line-box token for the small
field's 12px label, and the stretch keeps the row hugging a wrapped label too.

**After.** The row is 18 / 21 / 24px and the label sits 8px above the box at every size, where TextField's sits. In
code the button in the row sets `block-size: auto` and `padding-block: 0`.

**The hit area (owner question on #2809, option A built).** The small Button's own flush rule is 24×24 (Q174 B), but a
nested flush Button owes 44×44 at medium and large (#1741, Q170 B), and `lint-hit-target` held both, so CI was red on
the first head. A 44 centered on the 21 / 24px row reaches 3.5 / 2px into the input box. So the code-side hit area
stays 44×44 at medium and large and 24×24 at small, and at medium and large it is anchored: its bottom edge sits on the
row's bottom edge, so it reaches up and sideways, never down into the box. `lint-hit-target` gains `CODE_SIDE_NESTED`:
a nested flush Button below the floor by decision is held to the code-side rule AND its anchor, both stated in one
`codeOnly` entry, and the entry goes stale by name if the box ever meets the floor.

**Pinned.** `test.ts` measures the row per member, as a hugging row is sized, from the committed emission (the label's
FieldLabel member's line box and the Button member's bound height), against typed 18 / 21 / 24. The toggle test now
expects `size=small` and `label/sm/emphasis-link` on all 84 members. Mutations: following the field's size again fails
"#2317 password-field toggle" by name; dropping the stretch fails "#2804 password-field label row" by name on all 84
members (row 36px).

Mutations on the gate: deleting the anchor sentence fails `password-field.toggle/medium … no codeOnly entry states the
code-side 44×44 together with its anchor`; deleting the `CODE_SIDE_NESTED` entry fails `password-field.toggle/medium …
is 36px, below the 44px floor`.

**Trap for a re-verifier.** Whether a live host lets the row hug the label while a stretched instance whose own height
is bound to 36px sizes to the row, with its label centered and unclipped, is modeled offline only; it is in the def's
`unverified` notes.
