## (2026-11-11) — Apply Theme: a skipped opacity leaves a tinted wash at its literal, not a solid fill (#3556)

Found in the post-merge review of #3518 (#3569). The collision-choice header promises that what points at a skipped
variable keeps its literal value. A tinted wash is a color alias plus a per-mode opacity alias. When the opacity was
skipped (the whole `opacity` collection, or one `opacity/<n>` variable), `resolveCollisions` set that mode's opacity
reference to `null` and kept its color target. The color executor writes a plain alias for a target with no opacity,
so the wash became the solid fill at 100%, over the literal the first pass wrote. Designer files often hold a
collection named `opacity`, so a real person can hit this.

Now, when a mode's opacity reference is skipped, that mode's color target is dropped too, so the mode keeps the literal
the first pass wrote: the fill at its opacity. A renamed opacity still follows the rename, and the wash stays a wash.

**Status:** plugin only. No engine change, so no change note. `collision-choice.ts` is outside the component executor
(`lint-executor-revision.ts` walks `write-components.ts`), so `EXECUTOR_REVISION` stays.

### Test

`test-write-preflight.ts` gains four arms. The premise: on a clean apply,
`pds3/color/interactive/primary/subtle-fill/selected` is a wash in every mode. The new arms:

- `#3556 skip opacity collection`: a hand-made `opacity` collection, skipped. Each mode is a literal at alpha 0.3.
- `#3556 skip opacity variable`: `pds3/opacity/30` is retyped by hand, which is the one collision, and skipped. The
  wash's modes are literals at alpha 0.3.

Mutation: the color target kept when the opacity is skipped (`r.targetsByMode = r.targetsByMode.map(ref)`, as
before) → `#3556 skip opacity collection` and `#3556 skip opacity variable: … keeps its literal at its opacity` fail by
name.
