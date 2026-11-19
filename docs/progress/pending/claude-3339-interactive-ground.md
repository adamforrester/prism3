## (2026-11-18) — A brand declares the darkest ground its controls sit on: `interactiveGround` (#3339)

**What.** The owner answered #3339 with C (2026-11-18): build it. A new optional brand input, `interactiveGround:
floor | page` (the name, values and Studio copy are a DRAFT, held for the owner on the PR):

- **`floor` (default)** is today's behavior. Unset is identical to `floor` in all 11 corpus brands (`test.ts` arm a), and
  no shipped brand sets it, so `regen --check` shows no change.
- **`page`** measures each interactive contrast check on `background.primary` instead of the floor, in light and dark.
  On the inverse band it uses `inverse.background.primary`. The roles: the interactive fills (with the #1773 tertiary
  arm dropped, since the brand excludes that tier), disabled text and icon, field borders, the destructive outline,
  and the field status borders (the inset grounds dropped). Each moved role's `against` names the page, so
  `lint-ratio-truth`, `.ai.json` and Studio's override flags all read the declared ground. High contrast keeps the floor.
- **Not moved:** links and the other text inks, `border.focus`, and the button borders that follow their label (#576).
  The neutral and primary button borders are already measured on the page.

It is a port of the throwaway prototype on `claude/3339-prototype`. The one change is that the page ground goes through
`asGround`, so an override of `background.primary` is honored.

**Where.** `theme-types.ts`, `theme-brand.ts` (validated like `secondaryTextGround`), `theme-schema.json`, a lever
(`kind: value`, `advanced`) and Studio's Surfaces & fills › Background fills, under the contrast floor, as two chips:
"Every surface" / "The page only". The `prism3-theme` settings table and the build-component lever-kind table each gain
a row. The native design.md carries the key generically, and arm (i) holds the round trip.

**Measured** (`page` vs today, light mode unless named; dark also moves the destructive outline, the fills, the inverse
field border and disabled text, and the field status borders):
- Field border: 450 → 400 in both the default brand and the reference brand, 3.86 → 3.28 and 3.84 → 3.27 on white.
- Field hover border: 650 → 600.
- Destructive outline: 600 → 500 in the default brand, 600 → 550 in the reference brand.
- Neutral and primary button borders: unchanged.
- Field status borders (`border.danger`, `.warning`, `.success`) in the default brand: light 550 → 500 (4.57, 4.54, 4.57
  on the page); dark 450 → 500 (4.25, 4.27, 4.25 on the page). Each also clears 3:1 on the page under the hover wash.
- Dark, the default brand: inverse field border 450 → 400 and inverse disabled text 450 → 400 (3.06 on the inverse page).
- No role in either brand falls below its bar on its declared ground (69 and 72 role-cells move).

**Tests.** `test.ts` #3339 arms (a)–(i). On main's engine, (b), (f), (g) and (h) fail by name. Mutations, each failing by
name:
- Field ground measured on the secondary while naming the page: (b) and (f).
- `page` reaching HC: (c).
- The text ground, and so the links, following the setting: (d).
- The enum check dropped: (h).
- The field status borders' page-under-wash ground dropped under `page`: (b). It was added after review; before it,
  this mutation passed `test.ts`.

Studio's `test-fills-input.ts` adds 5 assertions.

**Held for the owner.** The name, values and copy. Whether to add a `card` value (Q1 revised: in the live file the card
is a step lighter than `background.secondary`). Whether the reference fixture should set `page` (Q7). And the `.ai.json`
`avoid_when` and skill self-check that would carry the commitment to consumers (proposal §4), which is not built here.
