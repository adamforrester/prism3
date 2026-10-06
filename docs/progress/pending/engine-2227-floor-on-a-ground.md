## (2026-10-06) — A contrast floor must be a step a page ground sits on (#2227, #2239)

**STATUS: branch `engine/2227-floor-on-a-ground`.** ENGINE minor, declared in `packages/engine/changes/engine-2227-floor-on-a-ground.md`; `CONTRACT_VERSION` unchanged; no committed artifact moves. One new sentence for the owner (DRAFT), plus picker screenshots. **Part 2 of #2227.** Part 1, the 21 secondary-collision cases, is #2244, a separate PR.

### The decision this carries

Owner, Q57 A: a contrast floor may only be a step a page ground in that mode actually sits on. The build refuses any other `floorStep` with a sentence, and the studio picker offers only valid steps. This covers #2227's 74 floor-step cases and #2239.

### Diagnosis

Every floor-gated role (the bold fills, the interactive fills, and the secondary, tertiary, status and link text) is measured against the floor. Its description names the surface it clears its bar on, and that name was always `background.secondary`. With a `floorStep` that no ground takes, there were two failures:
- the Figma color emission threw, so `export_theme include:["figma"]` returned -32603;
- fills shipped measured against a surface the page doesn't have. At floorSteps 500–750, #2239 measured 1.2–2:1 on the real page against a claimed 3:1.

### What changed

- **`modes.ts` `resolve`.** After the floor is chosen, it finds the page ground the floor sits on, naming `secondary` first, then `primary`, then `tertiary` (the order the Figma color lines use). With an explicit `floorStep` and no such ground, it throws: "surfaces.‹mode›.floorStep: ‹n› is not a step a ‹mode› page ground sits on — the floor is the ground every floor-gated role is measured against. Use ‹steps›." The sentence lists the valid steps in ramp order, each with its ground. Where no ground is a neutral step, it says "Remove it — no ‹mode› page ground sits on a neutral step."
- **Reporting.** The throw happens inside `buildTree`, so `validate_brand` and the generating tools report it through `buildBrand`'s guard. `export_theme`'s Figma emission now never sees an off-ground floor.
- **Prose.** The floor-gated prose names the ground the floor sits on (`floorLabel`), so a floor held on the tertiary step says "on background.tertiary".
- **Studio.** `floorGroundSteps(mode)` in `state/fills-input.ts` returns the neutral steps of the mode's three page grounds, in ramp order. The Contrast floor picker offers only those, in place of the whole ramp: prism3 Light shows 050 and 100, Dark 850, 900 and 950.

### Gates and mutations

- **`test.ts`.** One sweep covers every example brief × light/dark × every neutral step as `floorStep`.
  - The oracle is the plain brand's three ground paths, read off the brief with the floor unset, and a sentence typed in the test.
  - Each step builds exactly when a ground sits on it, and is refused otherwise with that sentence, never a throw.
  - For each built step, `foreground.brand` names the floor's ground.
  - The #2239 arm measures every role whose description claims "clears N:1 on background.‹tier›" against that ground's hex, in every mode.
  - The #2033 floor cases moved to on-ground steps.
- **`mcp-test.ts`.** Three arms: `validate_brand` refuses by sentence; `export_theme include:["figma"]` returns an `isError` result carrying the sentence, never -32603; an on-ground floor (100, tertiary) is still valid.
- **`test-fills-input.ts`, section 10.** Five literal cases of the offered steps: as loaded in both modes, Page 200, Secondary 200, and Page Black, which offers none. In each case the engine builds every offered step and refuses every other by sentence.
- **`test-chrome.mjs`.** In both modes, the real picker offers the literal steps, and picking each one leaves the error bar quiet.
- **Mutations.** Each ran after a `wip:` commit and failed by name:
  - today's `modes.ts` fails 18 sweep arms (the emit throws, "built 20, refused 0", the 2.76:1-claims-3:1 misses) and 2 mcp arms (`{"valid":true}`, -32603);
  - prose pinned back to `background.secondary` fails 10 arms;
  - refusing every `floorStep` fails all 18 sweep arms, plus the mcp on-ground arm;
  - the studio mutations are listed in the PR.

### Traps for whoever is next

- **Auto is never refused.** At a ladder end (a Black or 950 light page, a White or 050 dark page), the derived floor is a step next to the page, and no ground is that step. Refusing it would refuse the page choice, which Q57 did not decide. So the refusal applies only to an explicit `floorStep`, and that case keeps naming `background.secondary`. Measured: every floor-gated claim there still holds on the real secondary (0 misses in prism3).
- **A light-only brief still has its dark floor refused.** `resolve('dark')` always runs, so a dark `floorStep` is checked even for nb-redesign, which emits no dark mode. The sweep skips the mode the brief doesn't resolve.
- **Figma descriptions are light-only.** The DTCG overlays carry per-mode prose, but the Figma variable description is light's. Noted, not solved here.
- **Moving a ground away from a set floor is refused afterward.** With `floorStep` 100 set, picking a Page that takes 100 off every ground makes the brand refuse to build, and the studio shows the sentence in its error bar. That is the rule working, but whether the studio should clear or move the floor instead is a design question, held for the owner. `test:smoke` met it: its S4c sweep picked the floor and then moved the tertiary away from it. The sweep now edits the floor last.
- **The empty picker.** A Black light page has no neutral ground, so the floor picker shows no steps, only Return to Auto, with no line saying why. Any copy there is the owner's call.
- **Sweep cost.** The sweep adds about 200 builds to `test.ts`.
