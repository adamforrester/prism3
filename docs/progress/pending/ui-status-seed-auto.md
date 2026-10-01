## (2026-10-01) — A status color switched to Custom starts from the color the role resolves to

**Owner decision, 2026-10-01**, closing the first item S2's review held for the owner ("Seed Custom from the borrowed palette", UI redesign S2, #1935). On Color › Palettes, a status color (success, warning, danger, info) switched to Custom now starts from the color it resolved to right before the switch, and the user edits from there. That holds whatever the source was: Auto, a borrowed palette ("Use primary", "Use accent"), or anything else. UI only: no emitted artifact moves at defaults, so no ENGINE bump, and `CONTRACT_VERSION` is unchanged.

**What changed.** `statusSeedHex` in `apps/studio/src/state/palette-input.ts`. It still returns the current custom hue when there is one. Otherwise it returned step 500 of the ramp NAMED FOR THE ROLE, and `#808080` when the role borrows (a borrowing role has no ramp of its own). That was the legacy page's behavior, which S2's review restored on purpose. It now returns the role's light-mode `foreground.<role>` from the engine's resolved output, through `resolvedModes(theme)` (`state/verdict.ts`), the per-theme cache the verdict and the Palettes preview already share, so the seed costs no extra resolve.

**Why the resolved role and not a ramp step.** `foreground.<role>` is the role's own fill: the color the status draws in. The alternative, the step `roleAnchorStep[role]` of `roleToPalette[role]`, would re-derive the engine's answer in the UI, and it would miss a per-mode override that repoints the role, which the resolved output already carries. At defaults the two agree (step 500 for every status role on prism3).

### Tests

- **`test:chrome`.** S2's check ("a status color switched from 'Use accent' to Custom seeds #808080, as the legacy page did") is replaced by a section, "Status seed", with three cases, each on a fresh page: success from **Use accent**, warning from **Auto**, and danger from **Use primary**. The EXPECTED hex is the engine's, bundled for Node from its source: the boot brand (`example-brands.json`'s prism3) with the case's source set, resolved, and light `foreground.<role>` read off it. It never calls `statusSeedHex`. The page's preview is a second witness: before the switch, that hex must be one of the squares the preview draws for the role's palette, so the oracle and the page are resolving the same brand. After the switch, each case checks:
  - the seeded hex equals the oracle;
  - the result is a valid custom color: the source reads `custom`, the hex is six digits, the color picker agrees, and the role has its own ramp in the preview;
  - it is editable: a typed hex takes, and the source label moves to "Custom: …".
- **Mutation, after a `wip:` commit:** `statusSeedHex` put back on the legacy lookup (the ramp named for the role, else `#808080`) fails by name in the two borrowing cases: `status seed: success switched from "Use accent" to Custom starts from the color the role resolved to, #7a3cff — seeded #808080` and `status seed: danger switched from "Use primary" to Custom starts from the color the role resolved to, #3d68fc — seeded #808080` (7,228/7,230). The Auto case passes under it, as it should: for an Auto role the ramp named for the role is the role's own, so the legacy seed and the new one agree. `test:chrome` is 7,230 with the change (S2: 7,216; one check replaced by fifteen).

### Trap

- **The hook guard reads literal hooks only.** A selector built as `[data-p3="status-${role}-hex"]` is refused when the suite loads. Each case spells its three hooks literally.
