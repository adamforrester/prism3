## (2026-10-08) — Fields: one sizing system, labels 12 / 14 / 16 over inputs 14 / 16 / 18, and fields shrink to their column (#2266 PR 2)

**Status:** engine ({{ENGINE_VERSION}}, minor). CONTRACT unchanged: every token bound here already ships (`type.body.xs` came in with #2312, and `control.size.*.line-box` and `size.md.min-height` were already there). Owner decisions Q84 A, Q101 A (all ten of the design note's §9 recommendations) and Q99 B. Closes #2251, answers #862, closes #1345. Visible prose (the `size` prop text, the iOS rule, the usage lines, the consume-skill paragraph) and the 120px width floor are DRAFTs for the owner.

### What changed

- **field-label** is re-laddered: small, medium and large map to `body.xs`, `body.sm` and `body.md` (12 / 14 / 16), at both weights. The default stays `small`, so a standalone default label goes from 14 to 12.
- **text-field, select and textarea** project `size` as a Figma variant, giving 72 members each (3 sizes × 4 statuses × 6 states).
  - Each size binds:
    - the input type, `body.sm/md/lg`;
    - the padding, on the existing `size.{size}.pad-*` rungs;
    - the caret, `control.size.{sm,md,lg}.line-box`;
    - the height.
  - Height: small and medium take `size.md.min-height` (44, Q6), large takes `size.lg.height`, and textarea takes its height from `rows`.
  - The nested label moves from *exposing* `size` to *following* it, so a small field always nests the small label.
  - Select gets its size prop and geometry for the first time (this lifts #1699 decision 2).
- **Q99 B:** the control's width floor drops from 320 to 120. The root is still built at 320 (`placementWidth`, #2292), so an unplaced field reads as before, and a placed field now shrinks with a narrower column.
- **Group legends** follow through `follow` with no def change. A medium group's legend is now 14px bold.
- **field-message** is unchanged.
- **iOS (Q7 A):** the engine emits no component CSS, so the rule lives in each field's `size` prop description, a `codeOnly` entry, `docs.usage` and the consume skill. There is no per-brand payload-skill emitter yet to carry it.

### The decision this PR holds for the owner: `medium` first

`dryRunSet` (#2265) gives an axis a set *gains* the value the **first plan** carries, and plans enumerate `variants.size` in order. With the canonical `[small, medium, large]`, every existing NB text-field, select and textarea member would land on `size=small`. Their keys would survive, but the update would rewrite each one in place as the 12 + 14 small field, and every placed instance would shrink.

So the three hosts declare `variants.size: ['medium', 'small', 'large']`. The existing members then land on medium and look exactly as they do today, and the Figma default variant matches the code default. The code enum (`props.size`) keeps the ladder order.

Two gates had to learn the split:
- `lint-axis-values` gains a `reordered` relation (the same values as canonical, in another order).
- `lint-rung-names` gains `DEFAULT_FIRST`. The two statements must hold the same values, and the variants must lead with the prop default.

The visible cost is that the Figma panel and the grid read medium, small, large. The alternative is to keep the canonical order and add a declared landing value for added axes in the rename ledger, which means editing `update-plan.ts`. That file is the update lane's, so it was left alone.

### Gates that saw the fields for the first time

- `lint-absolute-inset` walks only defs with a size axis, so the fields' zero-offset focus ring (`focus.ring.offset-field`, 0 by design) reached it for the first time. It is admitted in `ZERO_OK`, with focus-ring's own reason.
- `lint-hit-target` measures the fields at their default size now, rather than as single-size controls.
  - Its compact-density exception now uses `button` as its example, because text-field's code ladder moved onto the 44 floor its projection already used.
  - Before this change, text-field's code-API medium was `size.md.height`, 36px on compact, while its Figma member was `size.md.min-height`, 44px. That was an unflagged disagreement, and it is gone now.
- `gap` on text-field and select moved onto the per-size rungs (8px at every size), so the #325 ordering rule (gap < pad-x) still runs per size.

### Traps

- **Mutating a host def back to `main` makes earlier tests throw before the #2266 arms run.** The pre-#2266 def has no size, and many select tests now plan at `'medium'`. The mutation battery therefore reverts each part of the change on its own: per-size type, label follow, the 120 floor, the medium-first order and the 44px small floor. Each fails a `#2266 <def> size=<size>` arm by name. field-label's full revert fails its three size arms and both group-legend arms.
- **The NB file:** do not run an update on the field sets there until #2265's apply has been checked against "a set gains an axis" on that file. The dry run should show 24 renames (each gaining `size=medium`) and 48 adds per field set, with zero drops.
