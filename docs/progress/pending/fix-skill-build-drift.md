## (2026-11-19) — The build skills say where a brand's component bindings live, the hover-label exception, and the gate lists a new part kind joins (#4178, #4179, #4182, #4183)

A fix lane from the 2026-11-19 skills audit (#4104). Four findings where `prism3-build-ui` or `prism3-build-component` told an agent something the engine does not do. All four were checked on main before the edit.

### prism3-build-ui

- **#4178.** The self-check said a failing pair means the wrong role. A filled button's hover and pressed label fail in dark mode on every shipped brand, and no role passes there: `interactive.primary.on-fill` sits only on `fill.rest`, and #1626 leaves hover and pressed ungated. The self-check now says so for every `interactive.<intent>.on-fill`, names the two intents that fail (`primary` and `destructive`, measured; `neutral` and the `inverse.` twins pass), and cites #1626, so the line is revisited when the owner decides. The arm scores every intent's hover and pressed label over the three example brands and fails by name on any failing intent the self-check doesn't name.
- **#4179.** The skill sent agents to `components.ai.json`, which holds almost no bindings, and its radius row said a Button is `radius.md`. A `controlShape: pill` brand's resolved contract binds `radius.capsule` (checked with `cli.ts --component-specs`). The skill now names both routes to a brand's resolved bindings (`--component-specs`, and `export_theme` with `componentSpecs`), says the committed `<id>.md` pages are drawn at the default settings, and qualifies the radius row.

### prism3-build-component

- **#4182.** §7's table gains `lint-part-union` (`KINDS` and `ADMITS`), `lint-motion-literals` (`RECIPE_DEFS`) and the plugin's executor revision and reach. §2 says a new part kind is a schema change.
- **#4183.** "Before you finish" item 8 said "both baselines" where §7 lists three. It now says all three. `typeWeight` gets a paragraph in §1, and `literal`, the other top-level def field the skill never named, gets one too: the arm that checks every `ComponentDef` field is named found it.

### The arms

One block at the end of the #3408 Q146 section in `test.ts`. Each reads its oracle from outside the skill: the sidecar's `sits_on`, `cli.ts`'s flag parser, `EXPORT_SECTIONS`, each gate's declaration, the §7 sentence's own list, and `ComponentDef`'s fields in `component-schema.ts`. Against main's skills, 10 fail by name. Mutating each fix back fails its own arm by name.

### Held

- **#4180** (a plain-CSS path for a brand of your own) is flagged on the issue as an owner decision: the honest fix depends on whether `packages/tokens` gets a brand-parameterized build.
- The new skill prose is a draft for owner review against `docs/voice-standard.md`.
