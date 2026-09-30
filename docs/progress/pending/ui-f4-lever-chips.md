## (2026-09-30) — Enum levers with two to four options render as chips, chosen by one descriptor rule (#1675, #1835, UI redesign F4)

**STATUS: committed on `ui/f4-lever-chips`.** UI-only: `apps/studio/src`, the studio `test` script, `test:smoke` and `lint:contrast`. No ENGINE bump (`docs/30`: host executors under `apps/*` do not bump), and CONTRACT stands. Foundation slice F4 of the studio and plugin UI redesign plan. Unlike F1–F3, this slice changes the screen on purpose: owner decision Q12 and #1675 ask for it. Every other behavior is unchanged: the same lever values are written, through the same commit paths, with the same repaints.

**The diagnosis.** Which control a lever got was decided in five places. `renderControl` turned every `enum` into a select. `iEnumSelect` did the same for the three global behaviors on Interactive. `neutralEmphasisLead` kept its own option list (`NEUTRAL_EMPHASES`) with labels that differed from the manifest's. `leverControl` hand-listed the three per-mode "Auto" selects. The palette pickers built three option lists: the generic one without `neutral`, Action without `neutral`, and Link with it (#1835). No rule could be tested, because none was written down.

**The descriptor rule.** `apps/studio/src/levers/controls.ts` (new, DOM-free) has `describeControl(lever, { auto? })`:
- an `enum` with 2 to 4 options and no Auto entry is **chips**;
- an `enum` with 5 or more options, or with an Auto entry, is a **select**. The Auto entry is either an option the manifest labels "Auto…" or one a caller adds. No caller adds one yet: the per-mode "Auto" selects are still hand-built in `PER_MODE_SELECTS` and never reach the rule;
- a `palette-ref` is always a **select**, because its options come from the brand;
- `slider`, `toggle` and `color` map to themselves, and `list`, `object` and `text` are read-only in the generic path.
Option labels are the manifest's own. `renderControl`, `leverControl` (and so `leverSection` and `csLeverStack`) and the Interactive lead rows (`iEnumControl`, which replaces `iEnumSelect`) all render from it.

**Converted (10 levers).** `density` and `motionPersonality.tempo` in Light, `controlShape`, `buttonIcons`, `buttonContentSize`, `buttonLabelWeight`, `iconContrast`, `disabledStrategy`, `outlineInteraction`, and `neutralEmphasis`. Each is a `fieldset` whose `legend` is the lever label, with a native radio per option. Arrow keys, focus and the screen-reader announcement come from the platform. The selected chip is filled with `--ink`, set in a heavier weight and check-marked, so the state does not rest on color alone. Focus is a 2px `--ink2` ring offset by 2px, a different shape from the selected fill. The chips wrap on narrow panels. Each group carries a `data-p3="lever-<key>"` hook in kebab-case, for example `lever-motion-personality-tempo`. A chip writes the manifest value through `setPath` and commits through the same path the select used: `apply` or the caller's `commit` in knob contexts, and `applyFull` on the Interactive lead rows. The radio's `checked` is set as a property, never as the attribute, like `optionEl`'s `selected`, and the radio `name` is `lever:<key>` rather than a counter. So a rebuilt group's `outerHTML` equals the live one, and the #771 reconcile keeps the live group, and its focus, when nothing else changed.

**Visible copy that moved with the control.** Owner-visible, and both follow from the spec rather than from a new choice:
- The Neutral lead's options now read the manifest's labels, "Subtle (light gray)" and "Strong (bold near-black/white)". Before, `NEUTRAL_EMPHASES` read "Subtle · light gray" and "Strong · bold fill". `NEUTRAL_EMPHASES` is deleted.
- On the four Interactive lead rows, the legend takes the place of the small caption a select had. It keeps the same small-caps style, but reads the lever label: "Method" becomes "Outline hover", "Contrast" becomes "Disabled contrast", "Icon color" becomes "Icon contrast floor", and "Emphasis" becomes "Neutral emphasis". Keeping both would name one control twice. Keeping only the old caption would make the visible label differ from the accessible name (WCAG 2.5.3).

**Deliberately left.** These are design questions not yet decided, so they keep today's controls:
- `typography.typeScale` keeps its option cards, with their px ranges and the disable-on-clash for pinned sizes.
- `typography.titleFloor` keeps its toggle.
- `disabledMin` keeps its slider. The audit proposes 4 chips; that is a slider becoming chips, not an enum.
- The per-mode "Auto — follows global" selects (`radiusScale`, `density`, `tempo` outside Light) stay selects by the rule, since their choice set has an Auto entry.
- The typography matrix controls are not enum levers.
- `typography.displayCeiling` has 6 options, so it is a select by the rule.

The descriptor classifies `typeScale`, `titleFloor`, `captionFloor` and `sizeFloor` as chips, but their render sites are bespoke and do not go through it. `captionFloor` and `sizeFloor` have no studio control at all today; the audit lists them as new controls.

**#1835.** `paletteRefOptions(key, brandColorNames)` is the one list: `primary`, `neutral`, then the brand colors in order. The generic picker, Action and Link all read it. To keep behavior identical, it has one exception: `actionPalette` has no `neutral`, as on `main`. #1811 decides it should have one, and its PR (#1827) now lands as the deletion of that line plus the matching literal in `test-lever-controls.ts`. That PR will conflict with this one at `actionPaletteLead`. The generic picker gains `neutral`. No lever reaches it, so nothing on screen moves.

**Tests.** `apps/studio/test-lever-controls.ts` (new, wired into the studio `test` script) makes 92 assertions over the real manifest in Node. The expected control is derived in the test from each lever's raw option count and from bounds written there (2 and 4), never from `CHIPS_MIN`/`CHIPS_MAX`. The counts are read twice, from the bundled manifest and from the committed `schema/lever-manifest.json`, and must agree. A floor of 10 enum levers and both classes represented mean an empty read cannot pass. The 10 converted levers are named literally. Fixture arms cover 1, 2, 4 and 5 options and an "Auto" option. The #1835 lists and the hook names are checked as literals.

`test:smoke` gains a "Lever chips (#1675)" section. Each converted lever is located by its literal hook on every corpus brand, and the expected labels and options come from `schema/lever-manifest.json`. For each group it checks:
- one `fieldset`, whose `legend` is the lever label;
- the manifest's options, as radios forming one group of their own;
- exactly one checked, and that one is the stored value;
- a check mark and a heavier weight on the checked chip only;
- every chip, and the radio that takes its clicks, at 24px or more;
- every unchecked edge at 3:1 or more against its ground;
- the legend and every chip through the rendered-legibility probe at the chrome text bar.
On the first brand, each option is then clicked, and the written value is read back from the persisted `prism3:brandInput` blob, not from the radio just clicked. ArrowRight must write the next option, repaint the workspace and show a focus ring. At 380px, the Outline hover chips must wrap with no overflow. The tempo ramp section (#800) now drives the tempo chips, and a chip that does not hold is a named failure rather than a timeout. Smoke went from 2828 to 3339 assertions, all passing. The sweep's form-control walk still measures 962 controls, against a floor of 250: radios are chromeless to that walk, and their text is measured by the text walk.

**Measured.** Chip text: 17.72:1, `--ink` on `--panel` unchecked and `--panel` on `--ink` checked. The Interactive legends are `--faint` on `--panel` at 5.13:1. The chip edge is a new token, `--chip-edge` `#84848c`: 3.34:1 on `--paper` and 3.71:1 on `--panel`, and the rendered minimum is 3.71:1. `lint:contrast` now holds `--panel` on `--ink` at 4.5 and `--chip-edge` on `--paper` and on `--panel` at 3, so it checks 19 pairs. The hit target is 28.0px high at minimum on every chip, and the radio covers the whole chip. Before and after screenshots, at 1280 and 380 wide, of Size & radius (Control shape, Buttons), Motion (Tempo) and Interactive (Outline button hover, Disabled, Icon colors, Neutral actions), are in the session scratchpad under `f4/shots/`, named `before-*` and `after-*`.

**Mutations (each on a `wip:` commit, restored with `git checkout --`).**
- (a) Making the mapper take `< 4` instead of `<= 4` fails `✗ controlShape (4 options) → chips (got select)`, `✗ controlShape: renders as chips (#1675)` and `✗ a 4-option fixture enum → chips` (89/92, exit 1).
- (b) Making every chip write its group's first option fails, by lever, `✗ prism3 / density: checking "Compact" writes compact to the brand (wrote comfortable)` and the same arm for all ten levers, plus `✗ prism3/standard: the tempo chip clicked is the one checked once the page has repainted` in the #800 section (88 failures). On the first run, the unbounded `waitForFunction` in the tempo section timed out instead of failing by name. That is why the waits are now bounded.
- (c) Rendering the group as a `div` with no legend fails `✗ prism3 / density: the chip group is a fieldset (a DIV)` and `✗ … the group's legend names the lever ("null", want "Density")` for every lever and brand (180 failures).
- `lint:contrast`: lightening `--chip-edge` to `#9a9aa2` fails `--chip-edge on --panel 2.793 / 3`.
All went green after restore.

**Environment trap.** As in F1–F3, the suites ran against a scratch `PLAYWRIGHT_BROWSERS_PATH` of symlinks, because the Playwright pin wants a newer Chromium (#1822).

**Review round.** The independent review found that on three Interactive lead rows (Outline hover, Disabled contrast, Neutral emphasis) keyboard focus dropped to `<body>` after one arrow key. Their commit runs `applyFull`, and the row's example or warning line changes with the value, so the region is swapped and the focused radio goes with it. The old selects dropped focus the same way. But arrow keys are how a radio group moves, so the chips made it stop after one step. `renderWorkspace` now records the focused radio's group name and value before the reconcile, and focuses the same radio in the swapped-in group. The smoke suite's focus-ring check was conditional ("if a chip has focus"), so it skipped exactly these rows. It is now unconditional, and it presses ArrowRight a second time and asserts the second value is written. Mutation: removing the refocus fails 6 checks, 2 per lever, for `disabledStrategy`, `outlineInteraction` and `neutralEmphasis` (`✗ prism3 / outlineInteraction: a second ArrowRight writes solid-tint, so focus survived the repaint`). Smoke is 3371/3371 with the fix. The `controls.ts` header and this entry no longer claim that the per-mode selects pass `{ auto: true }`. No caller does yet: they are still hand-built in `PER_MODE_SELECTS`, so the Auto arm runs only in the test's fixtures.

**For the owner (design and copy, not decided here).**
- **Selected chip style.** The selected chip is a solid ink fill with a check mark. Concept C and v4 used a soft fill with an ink border, and kept solid black for primary actions.
- **Neutral option labels.** These now come from the manifest: "Subtle (light gray)" and "Strong (bold near-black/white)". They were "Subtle · light gray" and "Strong · bold fill".
- **Lead-row captions.** The captions are now the lever labels. "Method" became "Outline hover", "Contrast" became "Disabled contrast", "Icon color" became "Icon contrast floor", and "Emphasis" became "Neutral emphasis". The Icon colors row keeps its row label "Icon color" next to the legend "Icon contrast floor", which gives two names for one control.
- **Long labels.** #1675 keeps selects for long labels, but the rule counts only options. "Full contrast (4.5:1 — AA text)" is now a chip.
- **Light only.** The studio chrome is light-only, so #1675's "light and dark" has only its light half today.
