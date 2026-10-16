## (2026-10-16) — Dialog: the close control is always the X, no icon swap (#2609)

**Status:** Dialog def + tests. ENGINE minor (change note). CONTRACT unchanged: no token path moves. No executor
change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision (2026-10-16, on #2609):** the control in the header's top-right corner is always the close X.
  Dialog has no icon swap for it; a team that wants another X changes the `close` glyph in its icon set or edits the
  component.
- **Owner decision Q385 A (2026-10-16, on #2806), settling Q377 A on #2609:** the close nests
  **FlushIconButton.Neutral** instead of IconButton.Neutral, so a file built without the IconButton sets still builds
  Dialog, and building Dialog no longer pulls IconButton.Neutral in. The variant is `shape: round, size: medium`, the
  closest to the earlier ghost medium IconButton: the same 44px box at the default density (so the header keeps its
  height and the close keeps a visible 44px target), the same neutral glyph ink and hover wash, and the shared focus
  ring. The one visible difference is round's decorative edge (`color.border.secondary`), which the ghost button did
  not draw; the flush shape would have dropped the edge but shrunk the box to the 20px glyph. Held for the owner's
  visual QA. Dialog depends on IconButton.Neutral nowhere now: the part's `nests`, every member's plan, `composesWith`,
  `commonPartners`, the docs, `.ai.json`, the dependency report and the Studio catalog. `lint-hit-target.ts`'s
  exclusion reason for Dialog names the new button.
- Dialog's `close` part (`nest-fixed`) gains `overrides: { swaps: { icon: 'close' } }`, the
  #2645 mechanism, so every one of the 15 members shows the close icon instead of the icon set's default glyph. The
  `close` boolean (show or hide) is unchanged.
- The "nested close button shows the file's default icon" note is gone; the footer buttons' half of it stays, as the
  Cancel and Save label overrides are still #2671's.

- **Fallout: two readers of the plans that #2645 missed.** Dialog's close is the first swap override on main (List's
  are text), so two places that read a plan's dependencies without `nestOverrides` surfaced here:
  - The Studio component catalog (`apps/studio/src/state/component-catalog.ts`) walked `nestTarget` and `swapTarget`
    only, so it listed Dialog as nesting icon-button-neutral, divider and button while the plugin's pre-build
    (`build-deps.ts`) also builds `icon`. It now reads each `INSTANCE_SWAP` value too, and the generated
    `component-catalog-data.ts` lists `icon`. `test-component-catalog.ts` failed by name on the stale walk.
  - `apps/plugin/test-update-apply.ts`'s and `test-canvas-furniture.ts`'s `planComps` left `icon/close` out of the shim file, so the corpus re-apply
    and the rollout read Dialog as blocked ("component the plan swaps to is not in this file"): 0 of 15 current. A real file
    holds it, because the build pre-builds the icon set; the harness now lists swap-override targets too.

### Diagnosis

Dialog never declared a swap property of its own: `figmaProperties` has no `swaps`, and the close is `nest-fixed`, so
it is not marked `isExposedInstance` and the nested button's `swap icon` does not surface on Dialog's panel. What the
designer saw was the nested button's default glyph. The fix is the override; the test pins both halves, so a later
`swaps` entry or a switch to `nest-exposed` fails by name. A designer can still select the nested button inside an
instance and use its own `swap icon`, which is Figma's behavior for every nested instance and matches the owner's
"go into the component".

### Verification

`test.ts` `#2609 dialog (Q385 A): the close nests FlushIconButton.Neutral, and Dialog depends on IconButton.Neutral
nowhere` reads the part, every plan's nest, swap and swap-override targets, and the selection fields against literals.
`test.ts` `#2609 dialog: …` — every member's close carries the literal swap to `icon/close`; Dialog's Figma surface
has no swap property; the close stays `nest-fixed`. Surface baseline accepted for Dialog only (15 → 15 members).
