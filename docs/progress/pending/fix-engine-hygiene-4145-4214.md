## (2026-11-19) — Engine hygiene: three exports get the reader their comments claimed, or go; one step helper, not three copies (#4145, #4214)

Two audit issues (#4104) of the same shape: code or prose that claims a reader, a check or a count that isn't there. No emitted file changes; `regen.ts` writes the same bytes.

### #4145: an export whose comment names a reader nothing is

- `SPECS_SCHEMA_VERSION` (`component-defs-export.ts`) said it was "checked against" by `check-specs.mjs`, which reads only `packages/tokens/package.json`'s pin. `test.ts` now holds the constant equal to that pin, and the comment says so. `check-specs.mjs` is left alone: its header promises it imports nothing from the engine (docs/34), so the comparison lives on the engine side. This arm cannot fail on `main`, because the two values agree today; the defect was that nothing compared them. Mutation: the constant at `0.38.0` fails `#4145 SPECS_SCHEMA_VERSION is the Specs schema pin` by name.
- `DISPOSITION_MEANINGS` (`code-only-register.ts`) said it was "read by the doc and the gate's report". It is now read by `lint-code-only-classes.ts`, which prints each meaning under the disposition counts. The comment drops "the doc": none reads it. Kept rather than deleted because it is the only place the four definitions are written.
- `PROTOCOL_VERSION` (`mcp.ts`), "retained for the older handshake's reply", was never read: `initialize` answers through `negotiateHandshakeVersion`. Deleted with its comment. It was not on the engine facade.

### #4214, items 1 to 4

1. `CLAUDE.md` said "Three whole-catalog component exports"; `UNCOMMITTED_OUT` has four since #3992. It now names the list and no count, the file's own rule (#1110). An arm fails if the sentence states a count, as a word or a digit, that disagrees with the list. Mutation: "The 5 whole-catalog component exports" fails `#4214 CLAUDE.md states no count of the uncommitted exports that disagrees with UNCOMMITTED_OUT (states 5, the list has 4)` by name; before the review nit, the arm read only number words and let it pass.
2. The action anchor step repeated `interactiveStepFor` line for line, and so did the link anchor step, a third copy the issue didn't list. Both call the helper now. The arm reads the source, because the copies computed the same number and no output can tell them apart.
3. `theme-type.ts`'s comment on the empty-`links` refusal said a brief "cannot ship without the body and caption link styles". It can (`links: ['title']` builds without them, #4040). Narrowed to what the refusal does. Comment only, so no test.
4. Not here: it is in #4327 with the ratio floor fix (#4211), its root cause, still open.

Items 5 (weight ranges) and 6 (Windows-invalid ids) are owner calls, flagged on #4214, and not built here. Item 6's technical part, routing `cli.ts`'s fidelity-report and `component-*` writes through the existing guard, is unblocked now that #4271 has merged, but it is not built here either. So this PR refs #4214 and leaves it open.

### Mutations

One `test.ts` run with three independent mutations: the Specs constant moved, the meanings loop disabled, and the link anchor's `primary` case copied back inline. Each failed its own named arm and nothing else failed.
