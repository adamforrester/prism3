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

**Follow-up.** Counter (#2693) should take the same shape when it lands; it is not edited here.
