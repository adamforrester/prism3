## (2026-11-19) — Token output records: Display-P3 deferred, px spacing, primitive placement, padded steps, pill radii (#4169, #4175, #4161, #4163)

**What.** Five audit findings whose owner decision (2026-11-19, all A) was to record, not change. One PR, because the
root cause is shared: a deliberate choice in the token output that nothing wrote down.
- **#4169:** `docs/01` §5.1 and §7 mark Display-P3 as deferred and tie it to the value form (#4123). The doc doesn't
  decide which rendering the contrast floors measure.
- **#4175:** `docs/01` §4.3 records why spacing ships in `px`: the 4px grid, Figma parity, and page zoom covers WCAG
  1.4.4. `packages/tokens/README.md` warns that `foreground` is a surface, not ink (row 2).
- **#4161:** the README documents that padded steps (`025`) sort after `950` in any JavaScript key walk. `radius.round`
  and `radius.capsule` each say which pill a control binds.
- **#4163:** `docs/35` §10.1 (indexed in `docs/42`) records where primitives sit and why nothing moves. The `.ai.json`
  note names the primitive families, so the tier, not the path, says what is a primitive.

**Why the `.ai.json` families are computed.** The list is read off the file's own `primitives` tier, so a new family
is named on arrival. The test doesn't trust that derivation. It checks that every `primitives` key falls under a named
family, that every named family holds a key, and that four literal families the issue cites are present.

**Test.** `#4163 <brand>` and `#4161 <brand>`, for each example brand. Mutations: with the note's sentence dropped, or
with `PILL_USE` emptied in `tree.ts`, each row fails by name.
