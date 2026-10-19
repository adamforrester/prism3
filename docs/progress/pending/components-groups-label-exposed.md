## (2026-10-15) — Group labels exposed: Checkbox group, Radio group and Segmented control (#2748, Q348 A)

**The decision.** Audit O4 on #2706 found three ways a form part nests FieldLabel: the four fields
`nest-exposed` (emphasis, weight) at secondary/regular, the three groups `nest-fixed` at
secondary/bold, and Counter (#2693, open) `nest-fixed` at secondary/regular. The owner chose A: the
groups expose emphasis and weight like the fields, and bold stays their default.

**The change is the nesting relation only.** Each group's `label` part moves from `nest-fixed` to
`nest-exposed` with `expose: ['emphasis', 'weight']`, keeping `follow: ['size']` and the same starting
coordinate (secondary, bold, rest). No group looks different. The projected surface moves (each plan's
label carries `nestExpose`), so `component-surface.json` is re-accepted under an `engine: minor`
note. No executor code moved: both executors already mark a `nest-exposed` instance exposed, on a
fresh build and in the in-place update branch, so `EXECUTOR_REVISION` stays.

**Update, proved in the shim.** `test-update-apply.ts` gains a section per group: built from today's
def with the label put back to `nest-fixed`, then updated with today's plans. The dry run reads all
three members as updates, the apply keeps every key and every node id (the label included), each
label reads `isExposedInstance === true`, and the next dry run reads all three current.

**The trap in that test.** The section's first draft read the label's coordinate off
`mainComponent.name` and got `field-label`: in `world()` every nest target is a plain stub component,
so there is no member to read. The fix gives `world()` a `fileSets` option that puts FieldLabel's
real set in the file (its member names from `planComponentName`) and drops the stub of the same name.
With the stub left in, the executor kept instancing the stub.

**Mutations, each failing by name.** The in-place branch's expose pass skipped: `<group>/exposed` ×3
(plus each `/verdict`, which verify catches as `label.nestExpose: isExposedInstance=false`).
`checkbox-group`'s label back to `nest-fixed`: `checkbox-group/dry run`, `checkbox-group/exposed`, and
`lint-component-surface` DRIFTED. `radio-group`'s starting weight moved to regular:
`radio-group/bold kept`.

**The decision has a by-name pin of its own (review round 1).** `isExposedInstance` is all-or-nothing, so the shim
cannot see WHICH axes were listed, and the surface baseline is re-accepted with any change note, so it does not
remember them either. `test.ts` now holds each group's label to the decision, as Select's #1438 block does: typed
`nest-exposed`, `expose` = [emphasis, weight], `follow` = [size], starting weight bold. Mutation: Segmented control's
`expose` cut to `['emphasis']` → `❌ Q348 A segmented-control's label is nest-exposed: exposes [emphasis, weight],
follows [size], starts bold (got expose emphasis, follow size, weight bold)`.

**Delta round (merge of #2739).** The pin now holds the whole starting coordinate: a group label's starting
`emphasis` moved to primary used to pass `test.ts` (only the shim arm caught it), and now fails the same Q348 A line
by name. The merge with the Segmented control redesign had a trap in `test-update-apply.ts`: git matched the `}` the
`group labels` and `segmented control` sections share, so the `for` loop lost its closing brace. The brace is put
back by hand, and the surface baseline is re-accepted after regen.

**Follow-up.** Counter (#2693) should take the same shape when it lands; it is not edited here.

**Merge with #2660 (items slots).** Three conflicts were comment-only in the three defs (main's slot wording,
with the Q348 A clause put back), plus the `test-update-apply.ts` header and `world()` options (both kept), and the
generated report and surface baseline (main's, then regen and `--accept`). One real interaction showed up only in
`test.ts`. Once the groups' label is `nest-exposed`, the three defs join the `#1392 … runs CLEAN through the paste
payload` loop for the first time. That loop provisioned every nested target as a keyless plain component, so each
group's new `items` slot could not offer its preferred set and reported two misses. On main neither side alone
reached it. The loop now provisions a slot's preferred sets as keyed sets of their real members, as the real build
has them.

**Merge with #2693 (Counter).** One conflict, in `test.ts`'s `#1392` paste-payload loop. Main had widened that loop's
`comps:` line so it also provisions per-instance swap-override glyphs (#2645). The resolution keeps both: main's
glyph targets, and this PR's keyed slot sets taken out of `comps` and supplied as `fileNodes`. Counter landed with
its FieldLabel `nest-fixed` at secondary/regular. That label is outside this PR: Q348 A names the three groups, and
#2748 scopes Counter out.
