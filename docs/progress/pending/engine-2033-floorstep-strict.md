## (2026-10-04) — surfaces floorStep refuses a step that is not on the neutral ramp (#2033)

**Status:** ENGINE `{{ENGINE_VERSION}}` (`engine: minor` change note), CONTRACT unchanged. `regen` moves no
committed artifact. Engine only: `apps/studio` and `apps/plugin` untouched.

### What changed

Owner go-ahead 2026-10-04: `surfaces.<mode>.floorStep` gets the treatment `base` and `inverseBase` got in
#1985. `modeConfigs` resolves it with `n()`, which snaps to the nearest neutral step, so `333` used to become
`neutral.350` and `1234` `neutral.950` with no error, silently moving every floor-gated role
(`text.secondary`, links, `foreground.*`, the interactive fills, disabled text). Now `brandTheme` refuses
an off-ramp number by name, naming the nearest real step (`333` → 350, `1234` → 950), and a non-number by
name (`'300'`, `'grey'`). Real steps are accepted unchanged: `text.secondary` is measured against exactly
that step.

**Which ramp.** `floorStep` always indexes the NEUTRAL ramp. `modeConfigs` resolves it with `n()` whatever
the page or the inverse band is on, and it has no `white`/`black` form, so the message offers neutral steps
only.

**One helper, not two copies.** #1985's nearest-step refusal is now `requireStep` in `brandTheme`, shared by
the six surface anchors and `floorStep`. The anchor messages are byte-identical to before.

### Measured before changing behavior

A temporary recorder, never committed and removed before the fix, logged every `floorStep` that
`brandTheme` saw, and every one `modeConfigs` resolved, while these ran:
- `regen --check`, `test.ts`, `lint-ratio-truth`, `mcp-test`, `nb-regression`, `token-contract --check`,
  `lint-lever-sweep` and `lint-voice` (its `NOTE_SWEEP` sets `floorStep`);
- the Studio unit suites `test-provenance`, `test-export-settings`, `test-store`, `test-brand-input`,
  `test-fills-input`, `test-interactive-input`, `test-type-input`, `test-depth-motion-input`,
  `test-lever-controls`, `test-pages` and `test-verdict-count`.

That was **1,984 records, 14 with a `floorStep` set, 4 distinct values (100, 200, 300, 800), 0 off the
ramp**. Every record saw the same neutral ramp (25 to 950). The Studio's contrast-floor select is built from
the theme's own neutral steps (`neutralStepOptions`), so it can't write an off-ramp value.

### Version class: minor

ENGINE major is refused while below 1.0 (`changes/README.md`; going to 1.0 is the owner's call). The values
now refused were already resolving to a floor nobody chose, so this turns a silent mis-resolution into a
named error rather than removing a working capability. No measured input relied on it. CONTRACT versions
token names, and none moves.

### Mutations

| Mutation | Fails |
|---|---|
| the `floorStep` check removed | 8, all `#2033` arms, e.g. `#2033: surfaces.light.floorStep = 333 is refused by name, naming the nearest step 350 (got: "")` |
| the nearest step always the ramp's first | 14: 4 `#2033` arms and 10 `#1985` arms (the shared helper), e.g. `… naming the nearest step 350 (got: "… the nearest step is 25 …")` |

### A trap for whoever measures this way next

A recorder that names `node:fs` in `packages/engine/` breaks the plugin build, which refuses `node:`
builtins in `dist/main.js`. Measure with the plugin unbuilt, or remove the recorder before building it.
