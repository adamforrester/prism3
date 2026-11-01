## (2026-11-01) — The redesign seed fits its secondary text on the page (Q3212.4 A, #3219)

#3212 added `secondaryTextGround: floor | page` and set `page` on the reference brand's legacy fixture only. The
owner took Q3212.4 A: the redesign seed sets it too, for the same reason (its designs run secondary copy lighter).

- **The change.** One line in `packages/engine/examples/nb-redesign.design.md`. Its light `text.secondary` and
  `icon.secondary` move from `#696869` (the floor fit) to `#767576`, 4.59:1 on white. `inverse.text.secondary`
  stays `#828282`: the band keeps its floor. The seed is light only, so Q3212.3 B (HC keeps the floor) has nothing
  to act on. `field.placeholder` still reads `#696869` here; making it follow is #3220.
- **The pin.** The redesign's row in the `Q-TXT1 A: no other brand's secondary ink moved` arm (`test.ts`, 41 cells)
  now holds the page fit as a literal, and the arm's message says the redesign seed holds it.
- **Regen moved nothing committed.** The seed has no emitted tree, so the change note is a `patch`.
- **Mutation.** Dropping the seed's `secondaryTextGround: page` fails the arm by name: `❌ Q-TXT1 A: no other brand's
  secondary ink moved … MOVED: nb-redesign light: #767576 #767576 #828282 → #696869 #696869 #828282`.
