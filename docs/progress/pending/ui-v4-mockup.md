## (2026-09-30) — UI redesign phase 2: the owner's decisions recorded, and the concept v4 mockup

**STATUS: PR open from `ui/v4-mockup`, labeled DO NOT MERGE.** Design artifacts only, all under `docs/superpowers/ui-redesign/`. No product code, and no ENGINE bump.

**What landed.**
- **Decisions:** `decisions-2026-09-30.md` records the owner's answers to the 14 Phase 1 questions (`phase1-audit.md` §4). Every recommendation was accepted. The headline is mode model B: the preview owns the viewing mode, and levers edit the base value with per-mode overrides inline.
- **Spec:** `v4-spec.md` turns those decisions and the audit's fixes into a build spec.
- **Mockup:** `concept-v4.html` is the mockup. `build-v4.mjs` builds it from `concept-v4.src.html` plus the real engine, bundled with `npx -y esbuild@0.24.0`. Nothing is installed into `node_modules`.
- **Note:** `concept-v4.md` covers the direction, what is live and what is simulated, the measured accessibility numbers, and 10 open questions for the owner.

**The decision that shaped the build: run the real engine, not a data snapshot.** Concept C invented its data: 23 made-up component defs, stale versions, and a size ladder with a padding column the engine no longer has. v4 bundles `@prism3/engine`, so every lever edit re-resolves the real system:
- palettes;
- 268 roles per mode, with their ratios;
- type, sizes and tokens;
- the decisions log;
- the 26 defs, with their variant counts.

Figma operations stay simulated, and the note lists each one.

**The coverage check uses the manifest as its oracle, not the mockup's own list.** Concept C's note claimed "every lever placed once, checked by script". That script checked the mockup's own 61-key list, so the check agreed with itself. It passed while two manifest levers were missing (`docs/34` shape 1). `build-v4.mjs` reads `packages/engine/schema/lever-manifest.json` and fails the build on:
- a key with no home;
- a key with more than one home;
- an unknown key;
- an advanced tier that disagrees with the manifest flag.

Mutation-tested: emptying a home, doubling a home, flipping a tier, and adding a web font each fail by name.

**Review round.** An independent review found two defects in the simulated Build-errors scenario, and both are fixed:
- **Member count:** it showed 214 of 216 members. The real TextField def has 24, and the counts didn't add up. The scenario now takes N from the def.
- **Missing font:** it named a face the brand doesn't use, while Health said fonts were clear. The scenario now marks one of the brand's own faces absent, and Health names the same face.

The review's smaller items were also fixed:
- named chip groups;
- the audit's label "Custom tint";
- the refused-edit banner rewritten in the UI register, with the engine's text one step away.

**Measured (Chromium, 29 states):**

| Check | Result |
|---|---|
| Lowest chrome text contrast | 6.14:1 |
| Lowest control boundary | 3.35:1 (Concept C: 1.75:1) |
| Smallest hit target | 24px |
| At 380×420 | 3 settings fully visible, 2 of them manifest levers |
| External requests | 0 |

**Deliberately left.**
- **Open questions:** the 10 in `concept-v4.md` are the owner's to answer.
- **Not committed:** the rendered-DOM coverage recount is not committed, so today only the source-level check can be rerun.
- **Filed:**
  - #1824: the personality trait citations quote a client brief and would surface in the Decisions log.
  - #1811 and #1812: two manifest and studio defects found in Phase 1.

**Trap for the next reader.** The mockup bundles the engine, so rebuilding it after an engine change can change what it shows. The versions in its harness bar come from `version.ts` at build time.
