## (2026-10-04) — UI: the pill radii read "Pill", the Auto-chip rule tested, and Shape and depth write guards (S7/S9.2 follow-ups)

**STATUS: branch `ui/2078-shape-depth-followups`. Fixes #2078.** UI and studio tests only: no engine change, no emitted
artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. The four items owed from the reviews of S7 (#2064) and
S9.2 (#2063), all owner-decided on 2026-10-04.

**1. The pill sizes read "Pill"** (owner, 2026-10-04, per #1177; APPROVED copy). The Shape preview's Radius rows for
`radius.round` and `radius.capsule` read "Pill" where they read "‹n›px · pill". The label comes from which size the row
is (the engine marks the two pill sizes on the ladder), never from its px, so wireframe, which draws every radius at
0px, still labels them "Pill" (the old label read "0px · pill" there). Every other size still reads its px. The tests
name the two sizes literally: smoke 1g (every brand, in each mode the mode strip offers, against the emission; a pill row's value is now read off
the sample it draws, since its label carries no px) and chrome section 24 (both hosts at 1280, and the wireframe arm:
every size drawn at 0px, reading 0px but for the two pills).

**2. The Auto-chip rule, owner-decided (2026-10-04), one rule for S7's density and S9.2's tempo.** Previewing a mode on
Auto, the checked chip is Light's value, the one the mode already follows, and choosing it writes nothing: a mode
never pins Light's own value while it follows it; another value pins it, and Return to Auto unpins. S7 recorded this
as a conservative call for the owner to see ("Auto on a chip"); it is now decided, and tested. Two arms in
`test:smoke`, each holding `prism3:brandInput` byte-identical across the click: density on Shape (3d, first brand)
and tempo on Depth & motion (#800's Dark block, every brand with a Dark mode). Each first checks the mode is on Auto
with Light's chip checked, so neither passes on a store it never put in that state. Where the rule lives:
`choice()` in `ui/lever-kit.ts` calls back only for a chip that is not already checked.

**3. Write guards** (`test-shell-imports`, four new assertions):
- **`main.ts` makes no Shape write**, held by the AST write arm S6 and S9.1 built: no direct write (any assignment
  operator, `delete`, `++`/`--`, `Object.assign`, or through one alias) into `brandState.density`, `.radiusScale`,
  `.controlShape`, `.baseMd` or `brandState.modeLevers.‹m›.density|radius`; no keyed write (`setPath` into those keys
  or `modeLevers.‹m›.density|radius`, `setModeLever` on `density` or `radius`); and no Shape key literal handed to the
  generic writers (`renderControl`, `leverControl`, `csLeverStack`; S10 retired `csSlider` and `csPicker`), whose key reaches
  `setPath` as a variable. Oracle: the key names, literal, as #2078 lists them.
- **`domains/depth.ts` is under the same visitor.** The arm is now a per-file `scan()`; `main.ts` is held to every rule,
  and `domains/depth.ts` to the direct Depth & motion rule. Its keyed writes were already refused (the regex that it
  names no `setPath` or `setModeLever`), but a direct `brandState.shadow = …` named neither and passed.

**4. `radiusHairline` is deprecated, kept accepted, and stays in the manifest.** The engine always emits
`radius.hairline` (#2053), so the lever changes nothing, and S7 retired its switch. It is not dropped, on #2059's
reading of `docs/30-versioning-and-compatibility.md`: docs/30 versions the token-name surface, and retiring this lever
moves no token name, so the question is the input's. The brand-input schema is `additionalProperties: false`, so
removing the field would fail validation for every brand file that still carries it, a break for authors with no
token-name benefit; accepted and inert (`deprecated: true` in `theme-schema.json`, a decisions-log note that it is
retired) is the safe default. #2059 left the manifest to the Studio and expected S7 to drop the lever there, because
`test-pages` then failed on a manifest lever with no home. S7 instead made `test-pages` read the manifest's
`deprecated` flag (a retired lever is excluded from "every lever has a home" and fails if a row places it), so
keeping the lever, marked `deprecated`, costs nothing and keeps the manifest describing every key the input accepts.
Dropping it waits for an input change that is breaking for its own reasons.

**Mutations, each after the `wip:` commit, restored with `git checkout -- <file>`, each failing by name and alone:**

| Mutation | Fails with |
|---|---|
| The label from the px (`r.px >= 128 ? PILL_LABEL : …` in `radius.ts`) | chrome `previewing Wireframe, every radius size is drawn at 0px, as the emission draws wireframe, and reads 0px but for the two pill sizes, which read "Pill" (… round "0px" 0px, capsule "0px" 0px, …)`. Smoke stays green, correctly: it visits the mode strip's Light and Dark, where a pill's px is a pill's. |
| The chip calls back even when checked (the `aria-checked` guard dropped in `choice()`) | smoke `Auto chip (#2078): prism3: previewing Dark on Auto, choosing the density chip Dark already follows (Light's comfortable) writes nothing — prism3:brandInput changed, modeLevers.dark {"density":"comfortable"}` and, on prism3, aurora and harbor, `… the tempo chip Dark already follows (Light's relaxed) … changed, modeLevers.dark {"tempo":"relaxed"}`: 4 failures, no others |
| `setPath(brandState, 'density', 'compact')` planted in `main.ts` | shell-imports `src/main.ts makes no keyed Shape write (…) — line …: setPath(brandState, 'density', 'compact')` |
| `brandState.modeLevers!.dark!.radius = 2; csLeverStack(['baseMd'])` planted in `main.ts` | shell-imports `src/main.ts writes nothing into a Shape lever itself (…)` and `src/main.ts hands no Shape key to a writer that writes whatever it is handed (…) — csLeverStack(['baseMd'])` |
| `(brandState as any).shadow = undefined` planted in `domains/depth.ts` | shell-imports `src/domains/depth.ts writes nothing into brandState.shadow or brandState.motionPersonality itself — line …: (brandState as any).shadow = undefined` |

**Counts** (measured on the cut from `cb8fea63`, before merging S10 in): `test` shell-imports 248 → 252;
`test:smoke` 4,443, ten new arms (one Pill arm per brand and strip mode, 3 × 2; the density arm; the tempo arm on each
of three brands); `test:chrome` 15,132, two new (the Pill arm on each host; the wireframe arm is rewritten, not added).
