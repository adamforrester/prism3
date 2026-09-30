## (2026-09-30) — Container radius rungs: radius.xl, radius.2xl and radius.3xl follow the radius lever (#1852)

**STATUS: PR open from `lane/radius-large-rungs`, labeled DO NOT MERGE.** ENGINE bump by change note (`engine: minor`). CONTRACT 14.0.0 → 14.1.0 (MINOR, three guaranteed paths added), baseline accepted with `token-contract.ts --accept`.

**What was wrong.** At the default scale the radius roles were `none` 0, `sm` 2, `md` 4, `lg` 6, then the pills. A container wanting 8-16px corners bound a `core.dimension.*` primitive, which `radiusScale` never moves, so its corner stopped following the brand. The UI redesign's style tiles hit it (their `core.dimension.8` and `.12` corners).

**Owner decision (2026-09-30).** Three container rungs: `xl` 8px, `2xl` 12px, `3xl` 16px at `radiusScale` 1, that is `baseMd` × 2, × 3 and × 4. The lane first proposed two rungs (8 and 16, reaching 12 only through the lever) and held the 12px question. The owner chose three, so the ladder reproduces Prism 2's whole container ramp and the t-shirt sequence stays unbroken.

**What changed.** Three rungs on the scaled ladder in `scale.ts`. At `baseMd` 4:

| rung | 0 | 0.5 | 1 | 1.5 | 2 |
|---|---|---|---|---|---|
| `xl` | 0 | 4 | 8 | 12 | 16 |
| `2xl` | 0 | 6 | 12 | 18 | 24 |
| `3xl` | 0 | 8 | 16 | 24 | 32 |

Every emission reads `theme.dims.radius`, so nothing else needed wiring: DTCG, per-mode overrides, the Figma `radius` collection, `.ai.json`, `tokens.html`, the modes and fidelity reports.

**The evidence.** Prism 2's container radius ramp is 2/4/6/8/12/16, which is 0.5/1/1.5/2/3/4 × 4px. The engine's ladder already reproduced its first three steps, and `xl`/`2xl`/`3xl` are the other three. The standard-dialect example brief corroborates: its own `m` 8, `l` 12 and `xl` 16 now match rungs in its fidelity report, where before they had no equivalent. `3xl` stays under the `round` pill at any legal input (at most `baseMd` 12 × 4 × scale 2 = 96 < 128).

**The #1015 question does not reopen.** The selection-control corner is still clamped from `radius.sm` (`controlRadius`), so no new rung reaches a 12-24px box.

**A sort bug the new names exposed.** `emit-figma-dims.ts`'s `byNumericKey` used `parseFloat`, which reads `'2xl'` as 2 and `'3xl'` as 3, so both listed first in the Figma collection, ahead of `none`. It now treats a key as numeric only when the whole key is a number. No other collection moved: `2xl`/`3xl` are the first digit-led t-shirt keys to pass through that sort (layout modes do not use it).

**Studio deferred to #1881.** `lint-ramp-steps.ts` fails when an engine rung is missing from the studio's `RADIUS_STEPS` and not declared. `apps/studio/src` belongs to the UI redesign lane, so this PR declares `xl`, `2xl` and `3xl` in that ramp's `omits`, citing #1881. Adding them to the list alone is not enough: `rp.dims` holds only preview-bound refs, so they would render at 0px (#1177). #1881 carries both halves and the removal of the three `omits`.

**Traps for whoever re-verifies.**
- The test oracle is literal per lever stop and per brand, never `RADIUS_LADDER`'s factors. A test that recomputed `snap2(baseMd × factor × scale)` would agree with any factor edit.
- `L-03`'s small-scale assertion enumerates the whole ladder (`0,0,2,2,2,4,4` at scale 0.25). A rung added later moves it too.
- The contract baseline was re-accepted from `main`'s 14.0.0 copy when the third rung arrived. Accepting on top of the two-rung baseline would have demanded 14.2.0 for what ships as one MINOR.
- No component binds the new rungs yet. Which surface uses which rung is a design call for the redesign and component lanes.
