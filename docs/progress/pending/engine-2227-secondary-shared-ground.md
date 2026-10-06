## (2026-10-06) — Figma color lines: a `secondary` on another ground's step names one ground in a fixed order, not a throw (#2227, part 1)

**STATUS: branch `engine/2227-secondary-shared-ground`.** Part 1 of #2227, the technical part: no wording, no design call, no committed artifact moves, `CONTRACT_VERSION` unchanged. Change note `engine: minor`, since a throw becomes output; ENGINE moves at the next fold past {{ENGINE_VERSION}}. Part 2 follows owner Q57 A: a Contrast floor may only be a step a page ground sits on. It covers the 74 floor-step cases and #2239 in its own PR.

### Diagnosis

A sweep ran every light and dark `floorStep` and `secondary` value, across the five example briefs, through `figmaArtifacts`. Of 400 schema-valid brands, 95 threw. Two classes:
- **74: a `floorStep` on a step no page ground sits on.** This is #2227's `floorStep: 25`. Owner Q57 A makes it a build refusal, in part 2.
- **21: a `secondary` on the step `base`, `tertiary` or an inverse tier also takes.** The floor moves with `secondary`, so the floor step is aliased by two grounds. `colorRoleDescription` in `emit-figma-color.ts` required exactly one ground and threw "… which 2 page grounds alias …". This PR fixes these 21.

The Figma line is the only place that resolves a bare floor step back to a ground role. Its two-ground throw was a uniqueness check with nothing to protect: the grounds are one color in light, so either name is true.

### What changed

`GROUND_ORDER` sets the search order:
- `background.secondary`, then `background.primary`, then `background.tertiary`;
- then the three inverse tiers.

The line names the first ground in that order that sits on the floor step. `background.secondary` leads because the floor follows it unless `floorStep` moves it, and the DTCG description already names it. Page grounds come before inverse ones because a probe of the example brands found no inverse role measured against a bare step: inverse roles name their ground as a role path. The no-ground throw stays. Part 2 makes it unreachable from input.

### Gates and their independence

`test.ts` adds one `#2227 figma sweep` arm per brief and mode. Each runs every neutral step as `secondary` through `figmaArtifacts`.

The oracle never reads `aliasOf`, the field the emitter selects by. It reads the emitted files back:
- the ground named in a role's Figma line must carry, in `color.light.json`, the color of the floor step's variable in `core.palette.json`;
- a page role must name a page ground.

A brandTheme refusal is skipped but counted, so an empty sweep fails.

Mutations, each after a `wip:` commit, each failing the five light arms by name with the dark arms green:
- **Today's emitter** (`git show origin/main:…`): fails with `throws at: 100, 850, 900, 950` for aurora, nb-redesign, prism3 and wendys, and `50, 150, 850, 900, 950` for harbor. That is the 21.
- **Inverse grounds first:** fails on `misnamed: 850: foreground.brand names inverse/background/tertiary`.
- **Naming `background.primary` whenever two grounds match:** fails on `misnamed: 100: foreground.brand names background/primary, measured on neutral.100`. The value oracle bites.

Which of two same-colored grounds is named is deliberately not pinned.

### Trap for whoever is next

The test adds about 210 brand builds to `test.ts`. Part 2's `floorStep` sweep will add as many. Measure the suite's time before adding a third.
