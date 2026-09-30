## (2026-09-30) — Container radius rungs: radius.xl and radius.2xl follow the radius lever (#1852)

**STATUS: PR open from `lane/radius-large-rungs`, labeled DO NOT MERGE.** ENGINE bump by change note (`engine: minor`). CONTRACT 14.0.0 → 14.1.0 (MINOR, two guaranteed paths added), baseline accepted with `token-contract.ts --accept`.

**What was wrong.** At the default scale the radius roles were `none` 0, `sm` 2, `md` 4, `lg` 6, then the pills. A container wanting 8-16px corners bound a `core.dimension.*` primitive, which `radiusScale` never moves, so its corner stopped following the brand. The UI redesign's style tiles hit it (their `core.dimension.8` and `.12` corners).

**What changed.** Two rungs on the scaled ladder in `scale.ts`: `xl` (`baseMd × 2`) and `2xl` (`baseMd × 4`). At `baseMd` 4 they are:

| rung | 0 | 0.5 | 1 | 1.5 | 2 |
|---|---|---|---|---|---|
| `xl` | 0 | 4 | 8 | 12 | 16 |
| `2xl` | 0 | 8 | 16 | 24 | 32 |

Every emission reads `theme.dims.radius`, so nothing else needed wiring: DTCG, per-mode overrides, the Figma `radius` collection, `.ai.json`, `tokens.html`, the modes and fidelity reports.

**Why these two.** The fewest rungs that reach both ends of the 8-16px band. Prism 2's container radius ramp is 2/4/6/8/12/16, which is 0.5/1/1.5/2/3/4 × 4px. The engine's ladder already reproduced its first three steps, so `xl` and `2xl` are its `container.lg` and `container.2xl`. The 12px between them is reached through the lever (`xl` at scale 1.5), not through a third name. The standard-dialect example brief corroborates: its own `m` 8 and `xl` 16 now match rungs in its fidelity report, where before they had no equivalent. Doubling also keeps `2xl` under the `round` pill at any legal input (at most `baseMd` 12 × 4 × scale 2 = 96 < 128).

**The #1015 question does not reopen.** The selection-control corner is still clamped from `radius.sm` (`controlRadius`), so neither new rung reaches a 12-24px box.

**A sort bug the new name exposed.** `emit-figma-dims.ts`'s `byNumericKey` used `parseFloat`, which reads `'2xl'` as 2, so `radius/2xl` listed first in the Figma collection, ahead of `none`. It now treats a key as numeric only when the whole key is a number. No other collection moved: `2xl` is the first digit-led t-shirt key to pass through that sort (layout modes do not use it).

**Studio deferred to #1881.** `lint-ramp-steps.ts` fails when an engine rung is missing from the studio's `RADIUS_STEPS` and not declared. `apps/studio/src` belongs to the UI redesign lane, so this PR declares `xl` and `2xl` in that ramp's `omits`, citing #1881. Adding them to the list alone is not enough: `rp.dims` holds only preview-bound refs, so they would render at 0px (#1177). #1881 carries both halves and the removal of the two `omits`.

**Traps for whoever re-verifies.**
- The test oracle is literal per lever stop and per brand, never `RADIUS_LADDER`'s factors. A test that recomputed `snap2(baseMd × factor × scale)` would agree with any factor edit.
- `L-03`'s small-scale assertion enumerates the whole ladder (`0,0,2,2,2,4` at scale 0.25). A rung added later moves it too.
- No component binds `xl` or `2xl` yet. Which surface uses which rung is a design call for the redesign and component lanes.
