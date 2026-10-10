## (2026-10-10) — Tab and Tabs: line tabs, a primary bar when selected, a neutral bar at hover (#2416)

**Status:** engine (two new defs) and the plugin taxonomy. ENGINE minor (change note): two new projected
surfaces, `tab` (30 members) and `tabs` (3). CONTRACT unchanged, since every binding is an existing role. Built from
the proposal branch's draft (`claude/tabs-proposal`, `ca1c385`) with the owner's decisions on #2416 applied:
- **Q177:** the nested shape, line tabs only, and its own `↳ Tabs` page;
- **Q178.1 A:** a primary label plus a 2px primary bar, at the same weight;
- **Q178.2 B:** no wash, with a neutral bar at hover;
- **Q179 A:** the remaining calls, as recommended.

### What changed

- **`tab`.** The draft's wash is gone: the tab body paints nothing, and `paintSlots: ['overlay']` and the four
  `*.overlay.*` keys were removed. The bar is one always-present 2px box (`indicator`) painting its `fill` slot:
  - **selected:** primary border, stepping at hover and pressed;
  - **unselected:** `color.border.secondary` at hover and pressed only;
  - **disabled:** a disabled bar on a selected tab, and none on an unselected one.

  The disabled half needs no special case. `fill` is structural, so the disabled branch paints it only where a
  REST key exists, and the unselected bar deliberately has no rest key. The same absence keeps it off at
  focus-visible.
- **The neutral role is a technical pick** (the owner delegated it). The requirement was 3:1 against the page in
  every brand and mode with a committed export. Measured on the four brands × four modes:

  | Role | Range on the page | Note |
  |---|---|---|
  | `border.secondary` | **3.26–10.14** | **contracted** at 3:1 (#1745, `modes.ts` `cfg.nonTextMin`) |
  | `interactive.neutral.border.hover` | 14.0–16.1 | contracted, but it is label ink |
  | `border.tertiary` | 6.65–19.6 | `min 0`, unfloored |
  | `field.border.rest` | 3.51–4.63 | a form-field role |

  `border.secondary` is the only neutral edge whose floor the engine *guarantees* and that stays quieter than the
  selected bar it previews in light and dark. In the HC modes it is darker than the primary bar (9.8–10.1 against
  7.4–8.3). `interactive.neutral.border.hover` would have outweighed the selected bar in every non-HC mode.
- **`tabs`.** As drafted: `size` (3 members), six nested `tab`s following its size, tab 1 selected, tabs 4–6 behind
  the Figma-only booleans (#2344), over a 1px `color.border.primary` hairline.
- **Code notes** lead with "code delivery pending: behavior layer (#2454)". The plugin strip cuts that entry to
  "code delivery pending", so the issue number stays maintainer-only.
- **Registrations:**
  - `index.ts`; `file-taxonomy.ts` (a `Tabs` leaf under Components, after Tag);
  - `lint-hit-target` (`tab` INTERACTIVE + SMALL_SIZE, `tabs` EXCLUDED as a container);
  - `lint-rung-names` (both in MUST_COVER, `tabs` SIZE_BY_FOLLOW_ONLY);
  - `lint-axis-values` (`tab` joins Tag's `selection` set, both join the canonical `size`);
  - `lint-paint-placement` (both lists); `lint-standalone-floor`; `lint-absolute-inset` (`tab.focusRing`);
    `lint-paint` (`tab|focus-ring` is a ring nomination, as for Tag);
  - `test.ts`'s spacing, ordering, gap-floor, type-grid, KB-brief and #1009 centring tables;
  - Badge's `planned` `tabs` moved to `ai.commonPartners` as `tab`;
  - the regen artifact count, 175 → 177, in `verify.ts` and `ci.yml` together;
  - the studio's two committed generators, the used-by index (`gen-used-by.ts --write`) and the component
    catalog (`gen-component-catalog.ts --write`; Tab is the first `navigation` def, which shows only as the
    "Navigation" meta label on its row), and the `component-axes.json` baseline (`--accept`, additions only).

### Tests and mutations

A new #2416 block in `test.ts`, with every expected value a literal:
- the bar's height and fill at each of the 30 coordinates;
- the label ink per selection and state;
- no overlay paint anywhere, and an unpainted tab body;
- the hover bar against `color/background/primary` in all 16 brand × mode exports, with the cell count stated, so a
  missing export fails;
- identical structure, text styles and bound dimensions between selections at every size and state;
- the list's six nests, its toggles and its baseline.

Mutations, each run in a detached worktree from a clean commit and restored to it. The runner refuses a run with no
summary line. The first attempt had no `node_modules` and crashed silently with exit 1 (docs/34 shape 19), which is
why that guard exists. Each mutation failed its named arm:
- the wash restored at hover → `#2416 Q178.2 no hover wash`;
- `{selection}`-keyed label type → `#2416 Q178.1 same weight in both states`;
- `unselected.fill.hover` deleted → `#2416 Q178 tab bar` and the 3:1 arm;
- `Tab 4` default true → `#2416 Q177.2 tabs` and `#2416 Q179 tabs`.

A rebind of the hover bar to another resolving role fails `lint-paint` `census/tab.*` and `lint-component-surface`
`surface/tab` by name.

### Held for the owner

- **The wording.** All of it is the proposal's §7 drafts, plus one new Tab description sentence about the hover bar.
- **Pressed on an unselected tab** shows the same neutral bar as hover, with only the label ink stepping. Whether
  pressed needs its own cue is held (`tab.ts` `notes.contested`), not invented.

### Trap for whoever re-verifies

The 3:1 arm reads the bar's variable off the plan and its value off `out/figma/*/color.*.json`. A new committed brand
export is not picked up: the brand list is literal, on purpose. Add it there.
