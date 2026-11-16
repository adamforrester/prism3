## (2026-11-16) — An override on a wash or a subtle fill is refused instead of mis-rated or dropped (#3072)

**What.** The per-mode override layer in `resolveMode` now refuses two kinds of key, beside the #3071 hover-fill and
#3073 glass refusals:
- a role put as `ink-on-composite`, which today is the page and inverse `interactive.<c>.overlay.<state>` washes;
- `(inverse.)interactive.<c>.subtle-fill.<state>`, which names the fill to override instead (`…fill.rest`, and the
  tint follows it).

**Why refuse rather than re-rate.** #3072 offered either for the wash. Reproducing it showed the defect was worse than
the ratio: the override layer rewrites `path`, and the tree emits a non-tint role as an alias of its path, so
`interactive.primary.overlay.hover → primary.500` emitted `{…palette.primary.500}`, an opaque fill. The wash's strength
lived in the `black-alpha.10` primitive, and the role's `alpha` field never reached the value. Re-rating as ink on the
composite would have published a number for a wash the file does not contain. Applying it honestly needs an alpha
primitive per (palette, step, strength), which is a token-surface change, so it is held as an owner decision on the PR.
The subtle fill was never reachable: `settleSolidTint` runs after `resolveMode` and overwrites every subtle-fill role.

**The wash check reads the model, not a name list.** A role is a wash because it was put with `putWash` (#963), so a
wash added later is refused the day it is put. The subtle fill is matched by key, because it does not exist yet when the
layer runs.

**Measured.** `test.ts` gains #3072 (A)–(C): page and inverse wash overrides refused, the overlay brand's selected
subtle fill and a solid-tint brand's inverse hover refused, and a `fill.rest` override still applied. On main (A) and
(B) fail, 4 arms, "accepted". Disabling the wash refusal fails only (A); disabling the subtle-fill refusal fails only
(B). No corpus or example brand overrides either kind of role, so no artifact moves.
