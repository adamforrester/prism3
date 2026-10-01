## (2026-10-01) — Palettes: the owner's follow-up decisions

Three owner decisions on Color › Palettes, 2026-10-01, each answering something S2 (#1935) left to the owner. UI only: no emitted artifact moves at defaults, so no ENGINE bump, and `CONTRACT_VERSION` is unchanged. `test:chrome` is 8,451 after merging `main` (S3 included).

### 1. A status color switched to Custom starts from the color the role resolves to

This closes the first item S2's review held ("Seed Custom from the borrowed palette"). A status color (success, warning, danger, info) switched to Custom now starts from the color it resolved to right before the switch, and the user edits from there. That holds whatever the source was: Auto, a borrowed palette ("Use primary", "Use accent"), or anything else.

**What changed.** `statusSeedHex` in `apps/studio/src/state/palette-input.ts`. It still returns the current custom hue when there is one. Otherwise it returned step 500 of the ramp NAMED FOR THE ROLE, and `#808080` when the role borrows (a borrowing role has no ramp of its own). That was the legacy page's behavior, which S2's review restored on purpose. It now returns the role's light-mode `foreground.<role>` from the engine's resolved output, through `resolvedModes(theme)` (`state/verdict.ts`), the per-theme cache the verdict and the Palettes preview already share, so the seed costs no extra resolve.

**Why the resolved role and not a ramp step.** `foreground.<role>` is the role's own fill: the color the status draws in. The alternative, the step `roleAnchorStep[role]` of `roleToPalette[role]`, would re-derive the engine's answer in the UI, and it would miss a per-mode override that repoints the role, which the resolved output already carries. At defaults the two agree (step 500 for every status role on prism3).

**Tests.**

- **`test:chrome`.** S2's check ("a status color switched from 'Use accent' to Custom seeds #808080, as the legacy page did") is replaced by a section, "Status seed", with three cases, each on a fresh page: success from **Use accent**, warning from **Auto**, and danger from **Use primary**. The EXPECTED hex is the engine's, bundled for Node from its source: the boot brand (`example-brands.json`'s prism3) with the case's source set, resolved, and light `foreground.<role>` read off it. It never calls `statusSeedHex`. The page's preview is a second witness: before the switch, that hex must be one of the squares the preview draws for the role's palette, so the oracle and the page are resolving the same brand. After the switch, each case checks:
  - the seeded hex equals the oracle;
  - the result is a valid custom color: the source reads `custom`, the hex is six digits, the color picker agrees, and the role has its own ramp in the preview;
  - it is editable: a typed hex takes, and the source label moves to "Custom: …".
- **Mutation, after a `wip:` commit:** `statusSeedHex` put back on the legacy lookup (the ramp named for the role, else `#808080`) fails by name in the two borrowing cases: `status seed: success switched from "Use accent" to Custom starts from the color the role resolved to, #7a3cff — seeded #808080` and `status seed: danger switched from "Use primary" to Custom starts from the color the role resolved to, #3d68fc — seeded #808080` (7,228/7,230, before the merge of `main`). The Auto case passes under it, as it should: for an Auto role the ramp named for the role is the role's own, so the legacy seed and the new one agree.


### 2. The Q4 trial stays, and scrolls smoothly

The owner kept the trial (an edit on Palettes reveals the palette it changes). `revealGroup` in `preview/follow-edit.ts` now calls `scrollTo` with `behavior: 'smooth'`, and `'instant'` under `prefers-reduced-motion: reduce`, read at each reveal. `instant`, not `auto`: `auto` defers to the pane's CSS `scroll-behavior`, which would make the reduced-motion answer depend on a stylesheet.

**Tests (`test:chrome` section 15).** A recorder wraps `Element.prototype.scrollTo` on the preview body and notes the `behavior` each reveal asks for, and the body's `scrollTop` is sampled every animation frame until it holds still for ten frames. Without reduced motion: the reveal asks for `smooth`, the preview passes through positions between start and end, and the palette ends in view. Under emulated reduced motion: the palette is in view as soon as the edit returns, the reveal asks for `instant`, and the preview does not move after the jump. The focus, levers-scroll and mode checks are unchanged.

**Mutation, after a `wip:` commit:** smooth under reduced motion fails by name, three times: `Q4: under reduced motion the neutral ramp is in view right after the edit (in view false, scrollTop 3024, was 3024)`, `Q4: under reduced motion the reveal asks for an instant scroll — asked ["smooth"]`, and `Q4: under reduced motion the preview does not move after the jump ([3024,3022,3015,…,865])` (7,241/7,244, before the merge of `main`).

### 3. Removing a brand color asks first

The remove button on a brand color opens S3's in-place confirm (`inlineConfirm` in `ui/lever-kit.ts`, #1939) under the list, with the hook `brand-color-confirm`. It names what else the removal changes, from the new `removalEffects` in `state/palette-input.ts`, which reads the working brand in the order `cascadeRemove` applies: the action and link palettes, a status or role that borrows the color, an interactive column, and each gradient's stops. Cancel and Escape write nothing and return focus to the remove button. **Remove** is the same `removeBrandColor` and cascade as before, and focus goes to Add brand color. The open confirm is part of the panel's shape, so a repaint keeps it, as on Brand.

A first draft wrote a small helper in `src/ui/` while S3 was not yet on `main`. Once S3 landed it was dropped for S3's, so there is one confirm pattern.

**New copy, for the owner** (neutral, in S3's pattern): the title "Remove ‹name›?", the action "Remove ‹name›", and the lines "Actions go back to primary.", "Links go back to their default color.", "The ‹role› color goes back to Auto." (a status role), "The ‹role› role goes back to its default palette." (any other role), "Its interactive color column is removed.", "In the ‹gradient› gradient, 1 stop switches to primary." / "‹n› stops switch to primary.", and "Nothing else uses it."

**Tests (`test:chrome` section 13c).** The oracle is the brand the web host persists after every edit (`prism3:brandInput` in localStorage), read before and after. The expected removal is written out by hand for prism3 with success on Use accent, and never calls `removalEffects` or `cascadeRemove`: accent leaves `brandColors`, success goes back to Auto, and the brand and glow gradients' accent stops move to primary. The section checks that the click asks first (the title names the dialog, focus is on the action), that the lines match, and that nothing is saved while it asks. It checks that Cancel and Escape keep the stored brand byte-identical and return focus, and that Remove stores exactly the expected brand. Section 13's existing removal now goes through the confirm, and counts it first, so a removal that skips the confirm fails by name instead of ending the run.

**Mutations, each after a `wip:` commit:**

| | Mutation | Fails with |
|---|---|---|
| a | Cancel still removes the color | `confirm: Cancel closes it and returns focus to the remove button (… "focus":"brand-color-add")` and `confirm: Cancel saves nothing — the stored brand is byte-identical and accent keeps its ramp (now {"v":2,…)` (8,447/8,449) |
| b | the remove button removes at once, with no confirm | `edit: removing a brand color asks first (0 confirm shown)`, `confirm: Remove accent asks first, … ({"n":0,…})`, `confirm: it names what else the removal changes — [], want [...]`, and the hook guard's `data-p3 hook "brand-color-confirm" is used by this suite but never appeared in the rendered DOM` (8,443/8,450) |

### Traps

- **The hook guard reads literal hooks only.** A selector built as `[data-p3="status-${role}-hex"]` is refused when the suite loads. Each status-seed case spells its three hooks literally.
- **A check that clicks a hook which no longer renders ends the run.** `hooks.click` waits through `need()`, which throws. The confirm checks count the confirm first and skip what they cannot drive, so a mutation that removes the confirm fails by name and the report still prints.
