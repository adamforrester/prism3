## (2026-10-06) — A contrast floor must be a step a page ground sits on (#2227, #2239)

**STATUS: branch `engine/2227-floor-on-a-ground`.** ENGINE minor, declared in `packages/engine/changes/engine-2227-floor-on-a-ground.md`; `CONTRACT_VERSION` unchanged; no committed artifact moves. The owner's Q67–Q70 on #2250 are built in: the studio shows its own sentences, two of them DRAFT and listed on the PR. The picker screenshots were approved (Q68 A). **Part 2 of #2227.** Part 1, the 21 secondary-collision cases, is #2244, a separate PR.

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
- **Studio, the picker.** `floorGroundSteps(mode)` in `state/fills-input.ts` returns the neutral steps of the mode's three page grounds, in ramp order. The Contrast floor picker offers only those, in place of the whole ramp: prism3 Light shows 050 and 100, Dark 850, 900 and 950.
- **Studio, the sentences (owner decisions Q67 B, Q69 A, Q70 A).** `state/floor-refusal.ts` holds them, with no DOM and no store. Agents and MCP keep the engine's sentence.
  - **Q67 B, the refusal.** The studio says "The contrast floor has to match a page background in ‹Light›. Choose ‹050 or 100›, or return to Auto." The mode and steps come from the brand, built with the floor removed. Only the refusal's kind is read off the engine's message (its `surfaces.‹mode›.floorStep:` key), never its words. The store's `lastError` carries the studio sentence, so the error bar and the failed-restore bar both show it. The import check (`validateDesignMd`) shows it too, still on the brief's line.
  - **The import check now resolves the modes.** The floor refusal is made in `resolveAllModes`, not `brandTheme`, and the check only ran `brandTheme`. So a brief with an off-ground floor passed the check, loaded, and then failed as "That change didn't apply". Now the check refuses it. Any other refusal made at mode resolution is refused at import the same way.
  - **Q69 A, the reset.** `setSurfaceBase` and `setSurfaceTier` (its Return to Auto included) reset a set floor to Auto when no ground sits on its step any more. They leave a notice, which the floor row shows (hook `surface-floor-reset`) until the next Surfaces & fills edit. The notice is held in state, not drawn once, so the repaint after the edit still shows it.
  - **Q70 A, the empty picker.** When no ground sits on a neutral step, a line under the picker says so (hook `surface-floor-none`).

### Gates and mutations

- **`test.ts`.** One sweep covers every example brief × light/dark × every neutral step as `floorStep`.
  - The oracle is the plain brand's three ground paths, read off the brief with the floor unset, and a sentence typed in the test.
  - Each step builds exactly when a ground sits on it, and is refused otherwise with that sentence, never a throw.
  - For each built step, `foreground.brand` names the floor's ground.
  - The #2239 arm measures every role whose description claims "clears N:1 on background.‹tier›" against that ground's hex, in every mode.
  - The #2033 floor cases moved to on-ground steps.
- **`mcp-test.ts`.** Three arms: `validate_brand` refuses by sentence; `export_theme include:["figma"]` returns an `isError` result carrying the sentence, never -32603; an on-ground floor (100, tertiary) is still valid.
- **`test-fills-input.ts`, section 10.** Five literal cases of the offered steps: as loaded in both modes, Page 200, Secondary 200, and Page Black, which offers none. In each case the engine builds every offered step and refuses every other by sentence.
- **`test-fills-input.ts`, section 11.** Every sentence is a literal typed in the test.
  - The studio sentence covers four cases: two steps, three, one (a neutral 950 page) and none (a Black page). Each is checked in the error bar's message and in the import check's message, the latter on its line. Neither carries the engine's words, and the engine still refuses in its own words.
  - A refusal that isn't the floor's keeps the engine's words.
  - The reset has three cases: a Secondary move and a Primary move, each resetting with its notice, and a move that keeps the floor's ground, which resets nothing. A fourth case is a tier's Return to Auto.
- **`test-chrome.mjs`.**
  - In both modes, the real picker offers the literal steps, and picking each one leaves the error bar quiet.
  - The #2250 block drives the real page. Primary Black shows the empty-picker line, and White removes it. Floor 050, then Secondary 200, shows the reset notice, the row reads Auto, and the error bar stays quiet. The next edit clears the notice. A pasted brief with floor 400 is refused with the studio sentence on line 6. After the edits and after the paste, the engine's sentence is nowhere in the page's text.
- **Mutations.** Each ran after a `wip:` commit and failed by name:
  - today's `modes.ts` fails 18 sweep arms (the emit throws, "built 20, refused 0", the 2.76:1-claims-3:1 misses) and 2 mcp arms (`{"valid":true}`, -32603);
  - prose pinned back to `background.secondary` fails 10 arms;
  - refusing every `floorStep` fails all 18 sweep arms, plus the mcp on-ground arm;
  - the studio mutations are listed in the PR.

### Traps for whoever is next

- **Auto is never refused.** At a ladder end (a Black or 950 light page, a White or 050 dark page), the derived floor is a step next to the page, and no ground is that step. Refusing it would refuse the page choice, which Q57 did not decide. So the refusal applies only to an explicit `floorStep`, and that case keeps naming `background.secondary`. Measured: every floor-gated claim there still holds on the real secondary (0 misses in prism3).
- **A light-only brief still has its dark floor refused.** `resolve('dark')` always runs, so a dark `floorStep` is checked even for nb-redesign, which emits no dark mode. The sweep skips the mode the brief doesn't resolve.
- **Figma descriptions are light-only.** The DTCG overlays carry per-mode prose, but the Figma variable description is light's. Noted, not solved here.
- **Only the studio's two background writes reset the floor.** A floor can still be stranded by anything else: an edit to the neutral ramp's steps, or a restored or hand-edited brand. Then the error bar shows the studio sentence. `test:smoke`'s S4c sweep met the stranded case before Q69, when it picked the floor and then moved the tertiary away. It runs in its original order again (floor second), because the move now resets the floor.
- **The studio sentence keys on the engine's message opening with `surfaces.‹mode›.floorStep:`.** If the engine rewords that key, the studio falls back to the engine's words, and section 11's arms fail by name.
- **Sweep cost.** The sweep adds about 200 builds to `test.ts`.
