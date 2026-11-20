# @prism3/storybook

The arm 1 Storybook for the code POC (#3408). Owner decision Q-POC1 A pulled it forward from S5 so arm 1
reaches parity with arm 2 sooner; S5's accessibility and keyboard pass now runs over it. It runs Storybook 10 on `@storybook/web-components-vite`.

Each component has two story files, one per delivery form, with the same stories in each:

- **Element:** the custom element from `@prism3/web-components` (`<p3-button>`, `<p3-text-field>`,
  `<p3-password-field>`). Its controls come from `custom-elements.json`.
- **HTML:** plain HTML and CSS, written to `@prism3/css`'s README markup contract. The password field also loads
  `@prism3/css/password-field.js`, its Show/Hide script; nothing else runs a script.

**Button:** one story per state the def lists (rest, hover, pressed, focus-visible, disabled, inactive and
pending), then each appearance, each size, the inverse surface, the visual slots and full width.

**Text field and password field:** rest, filled, hover, focus-visible, each validation status (error, warning,
success), disabled, read-only, pending, required, each size and the visual slots. The password field adds `Shown`
and `ShownError`, which press Show. Their cases live in `stories/fields.js`, shared by both fields and both forms.

Hover, pressed and focus-visible are forced through `storybook-addon-pseudo-states`. The toolbar switches the theme
between light and dark, and the direction between left to right and right to left (#3986 part 2: a `dir` on the
story frame, which every part inherits).

```sh
npm run -w @prism3/storybook dev     # http://localhost:6006
npm run -w @prism3/storybook build   # storybook-static/, never committed
npx tsx apps/storybook/check-build.ts
npm run -w @prism3/storybook check:a11y    # axe, the ARIA snapshots, the keyboard suite and the RTL check, after the build
npm run -w @prism3/storybook accept:aria   # rewrite aria-snapshots.json after a deliberate change; review the diff
```

Both scripts build the token CSS from `@prism3/tokens` first.

## Adding a component

1. Add the component's cases (`stories/<component>/cases.js`, or a shared module as the fields use), plus one
   `*.element.stories.js` and one `*.html.stories.js` that export a story per case.
2. Import the component's stylesheet in `.storybook/preview.js`, and its element module if the package's root entry
   doesn't register it (today the root registers `<p3-button>` only).
3. Add the component, its two forms and its cases to `EXPECTED` in `check-build.ts`.
4. Add its rows to `HAS` in `check-aria.ts` and its Tab stops to `DEF_ORDER` in `check-keyboard.ts`, written from
   the def; run `accept:aria` and review the new snapshots. `a11y-harness.ts`'s `COMPONENTS` and its story-id
   pattern name each component too. Add its start/end pairs to `PAIRS` in `check-rtl.ts`, from its right-to-left prose.

## Not here yet

`addon-a11y` and `addon-vitest`, which would run the same checks inside Storybook's own UI and test runner. axe, the
ARIA snapshots and the keyboard suite run from Playwright over the static build instead (below).

## Checks

`check-build.ts` serves `storybook-static/` and opens every story in Chromium. It checks four things:

- The index holds exactly the stories its own `EXPECTED` list names.
- Each story renders its component.
- Each forced state shows: hover and pressed change the fill, and focus-visible draws the ring. For the fields,
  hover and focus-visible change the box, each validation status draws its own border and glyph, and Show unmasks.
- **The fields' error wiring (owner decision #1712 A):** the label names the input; `aria-describedby` names the
  field's message; `aria-invalid="true"` is on the input at error only; and no field holds a live region.
- The element and HTML stories of one case compute the same styles.

**The arm input contract (#3408).** `check-arm-contract.ts` checks that `arm-1.contract.json` is complete against
the engine's anatomy, the emitted token tree and the built `index.json`. It then runs eight mutants, and each must fail
by name. The geometry scripts read each component's root and part selectors from the contract. So another arm's
Storybook runs through the same scripts once that arm supplies its own contract (`ARM-CONTRACT.md`).

**Geometry (#3408 S6, KPI 2 with Q32 A).** `check:build` then runs two more scripts:
- **`check-geometry.ts`** measures every story, in both forms and both directions: the root's extent, padding, border
  and corner radii, and each anatomy part's box, from the browser's layout. Parts are keyed by the def's part path, the
  key Figma's layers carry. The element form must equal the HTML form to 0.01px. It writes the HTML form's left-to-right
  record to `storybook-static/geometry.code.json`. Four one-form mutants and the represented-story mutants must fail by
  name.
- **`compare-figma-geometry.ts --self-test`** proves the Figma comparison's arithmetic on planted records. The
  comparison itself, `compare-figma-geometry.ts`, needs Figma's record, `figma-geometry.json`, from the Mac job in
  `figma-geometry.md`. Until that record is committed, the comparison fails and names the job.

The accessibility pass (#3408 S5), four checks over the same static build, shared setup in `a11y-harness.ts`. Each
runs its own mutants, which must fail by name.

**Right to left (#3986 part 2).** Every check opens each story twice, left to right and under `dir="rtl"` (the
toolbar's direction global), and fails a right-to-left result with "(rtl)" after the story id.

Each check also proves what it covered. It records the stories it actually checked, and every story in
`expected-stories.ts` (the hand-written list `check-build.ts` also reads) must be among them, or the check fails by id
(`<id>: not checked by axe`). A case checked in one form only fails too (`<component>--<case>: only the element form
was checked by aria`), because its form comparison would otherwise be skipped. Both hold in each direction
(`<id> (rtl): not checked by axe`). Three mutants per check hold this.

- **`check-axe.ts`:** axe (`@axe-core/playwright`) on every story, in light and dark, with the WCAG 2.0–2.2 A and AA
  rules. An undecided "needs review" result fails too. One violation is accepted, by rule: a button label's contrast
  on the forced hover and pressed fills, which owner decision #1456 exempts (rest carries the contract), above its
  2.0:1 floor. Each acceptance prints with its ratio.
- **`check-aria.ts`:** each case's element and HTML forms build the same accessibility tree. That's Playwright's ARIA
  snapshot plus each control's description and states (required, read-only, busy) from Chromium's tree. It must
  also equal `aria-snapshots.json`, the reviewed record, and contain the hand-written `HAS` rows. No story attaches a
  shadow root, open or closed.
- **`check-keyboard.ts`:** real key presses. Tab order in every story, written from the defs, with both forms
  agreeing; Space and Enter on the button; Show/Hide by keyboard, with focus staying on it; and the focus ring on
  keyboard focus only. The password field's order differs from its def in both forms (#3967, an owner decision);
  the check holds today's order as a named exception that fails once the order changes. Right to left, the same
  stops: the def says Tab follows the visual order in both directions, and the DOM order doesn't move. None of the
  three defs names an arrow key, so there is no arrow expectation.
- **`check-rtl.ts`:** the layout, measured. Right to left, the component computes `direction: rtl`; each start/end
  pair swaps sides (the button's and the fields' leading and trailing visuals, the required indicator, the status
  glyph, the Show/Hide button, which sits at the label row's left end); and no slot or non-directional glyph is
  flipped. #4030's `mirror` field isn't on `poc/arm-1`, so the expectations are written from the defs' prose, and
  for the text field, field label and field message, which have none, from #4005. Two named exceptions: the
  directional arrow doesn't flip (#4052), and the text field's input lacks `dir="auto"` (#4051).
- axe and the ARIA snapshot also run right to left. The tree must be the same in both directions.
