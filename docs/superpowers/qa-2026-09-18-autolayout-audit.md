# Auto-layout parity audit — projected components vs Prism 2

**Date:** 2026-09-18 · **Lane:** engine · **Type:** audit (docs-only) · **Source:** #1475 (owner QA 2026-09-17), feeds #1469 · **Engine:** read off the committed defs and `packages/engine/out/figma/nb` at this branch's base

Audit-first, per #1475: measure and report, change no engine code, def, gate, or committed artifact. Every number below is quoted from a run — the projected auto-layout was read **back off the offline host** (the `apps/plugin/test-roundtrip.ts` shim), not off the plan that wrote it, and the reference numbers are read straight from `reference/Prism2/component-specs/*.json`. The harness is in the appendix; it is not committed (this PR is docs-only), and it re-runs from a clean checkout in one command.

## What was measured, and how

For every projected def (`componentDefs.filter(d => d.figmaProperties)`), the harness calls `figmaAnatomySet(def, { swapTarget })`, applies the plan through the real `applyComponentPlan` against `component-shim.ts`, then walks each built member and reads the auto-layout Figma actually holds: `layoutMode`, `primaryAxisAlignItems` / `counterAxisAlignItems`, `primaryAxisSizingMode` / `counterAxisSizingMode`, `layoutGrow`, `layoutAlign`, and the bound `itemSpacing` / padding variable **names**. Each bound name is resolved to its nb pixel value against the emitted `packages/engine/out/figma/nb/*.json` (e.g. `space/075 = 6`), so a "gap" is a real token bound to a real number, not the shim's synthetic placeholder.

Auto-layout is structural — it does not vary across the state/appearance grid — so a member is read as representative, and the harness asserts every member agrees on the root `layoutMode` before trusting it.

Two independent sources of truth meet here: the **host** (what `applyComponentPlan` actually wrote, read back through a reader it does not share) and the **Prism 2 spec JSON** (the reference the owner is comparing against). Neither is derived from the other.

## Summary — root auto-layout, every projected component

| Def | root `layoutMode` | primary (align / size) | counter (align / size) | root gap | block / inline padding |
|---|---|---|---|---|---|
| `icon` | none (single glyph) | — | — | — | — |
| `focus-ring` | none (absolute, stroked) | — | — | — | — |
| `button` (+ `-destructive`, `-neutral`) | HORIZONTAL | CENTER / AUTO | CENTER / FIXED | `size/{s}/gap` (8 at sm) | `size/{s}/padding-y` · `padding-x[-visual]` |
| `icon-button` (+ siblings) | HORIZONTAL | CENTER / FIXED | CENTER / FIXED | 0 | — (square control) |
| `field-label` | HORIZONTAL | MIN / AUTO | BASELINE / AUTO | `space/050 = 4` | — |
| `field-message` | HORIZONTAL | MIN / AUTO | **MIN** / AUTO | `space/075 = 6` | — |
| `text-field` | VERTICAL | MIN / AUTO | MIN / **AUTO** | `space/100 = 8` | — |
| `select` | VERTICAL | MIN / AUTO | MIN / **AUTO** | `space/100 = 8` | — |
| `checkbox-control` | HORIZONTAL | CENTER / FIXED | CENTER / FIXED | 0 | — |
| `checkbox-row` | HORIZONTAL | MIN / AUTO | MIN / AUTO | `size/sm/gap = 8` | `space/150 = 12` · `space/0 = 0` |
| `checkbox-group` | VERTICAL | MIN / AUTO | MIN / **AUTO** | `size/sm/gap = 8` | `space/100 = 8` · `space/0 = 0` |
| `radio-control` | HORIZONTAL | CENTER / FIXED | CENTER / FIXED | 0 | — |
| `radio` | HORIZONTAL | MIN / AUTO | MIN / AUTO | `size/sm/gap = 8` | `space/150 = 12` · `space/0 = 0` |
| `switch-control` | HORIZONTAL | MIN / FIXED | CENTER / FIXED | 0 | `control/size/sm/inset = 3` |
| `switch` | HORIZONTAL | MIN / AUTO | MIN / AUTO | `size/sm/gap = 8` | — |
| `veil` | none | — | — | — | — |
| `image-placeholder` | HORIZONTAL | CENTER / FIXED | CENTER / FIXED | 0 | — |

The **bold `counter` sizing** cells are the crux: every column-stacking form component (`checkbox-group`, `text-field`, `select`) reads `counterAxisSizingMode = AUTO`, i.e. it **hugs its width**. Prism 2 gives each of these a fixed 320 px root with children set to `layoutSizingHorizontal: FILL`. See the systemic finding.

---

## Item 1 — `field-message` vs Prism 2 `_Helper Message`

`field-message` root layout is `{ direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } }`, `gap: 'gap'` (`components/field-message.ts:157`). Read back: HORIZONTAL, primary `MIN`/`AUTO`, counter `MIN`/`AUTO`, gap `space/075 = 6`, one visible flow child (`text`) at `layoutGrow = 0` on the default status.

Prism 2 `helper-message.json` root: `layoutMode HORIZONTAL`, `width 320`, `primaryAxisSizingMode FIXED`, `crossAxisAlignment CENTER`, `layoutSizingVertical HUG`, `itemSpacing 4`; its caption child (`thisIsAnErrorMessage`) is `layoutSizingHorizontal: FILL`.

| Facet | Prism 2 | Prism 3 (read back) | Verdict |
|---|---|---|---|
| direction | HORIZONTAL | HORIZONTAL | **match** |
| icon-before-caption order | icon, then caption | `iconError/Warning/Success`, then `text` (`:159`) | **match** |
| cross-axis alignment | `CENTER` | `MIN` (top) | **divergence** |
| gap | `4` | `6` (`space/075`) | **divergence (minor)** |
| main-axis width | `320` FIXED | AUTO (hug) | **divergence (systemic)** |
| caption fill | `FILL` | `layoutGrow 0` (hug) | **divergence (systemic)** |

The **cross-axis alignment** is the one worth a decision. Prism 2 centres a 16 px status glyph against the caption; Prism 3 top-aligns it (`align: 'start'` → `counterAxisAlignItems: MIN`). Top-aligning the mark to the first line reads better against a wrapping multi-line caption and worse against a single line — it is a real visual choice, not a mechanical miss, so it is flagged for the owner rather than filed as a defect. The **gap** (6 vs 4) is Prism 3 binding a real spacing rung (`space.075`) where Prism 2 used a raw 4 px; it is defensible and left as-is unless the owner wants exact-4. The width/fill rows are the systemic finding below.

## Item 2 — `checkbox-group` vs Prism 2 `checkbox-group` (the precedent #1469 inherits)

`checkbox-group` root layout is `{ direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } }`, `gap: 'size.{size}.gap'`, `padding: { block: 'pad-y', inlineLabel: 'pad-x' }` (`components/checkbox-group.ts:147`). Read back at `size = small`: VERTICAL, primary `MIN`/`AUTO`, counter `MIN`/`AUTO`, gap `size/sm/gap = 8`, block padding `space/100 = 8`, inline padding `space/0 = 0`; children `label`, `row1`, `row2`, `row3`, each `layoutGrow 0` and `layoutAlign` unset (Figma default `INHERIT`).

Prism 2 `checkbox-group.json`: root `layoutMode VERTICAL`, `width 320`, `layoutSizingVertical HUG`, `padding { top: 8, bottom: 8, start: 0, end: 0 }`, **no `itemSpacing`** (gap 0); a `label` container (HORIZONTAL, HUG/HUG, padding 8/8/0/0) wraps the `formLabel`; each `checkboxRow` is `layoutSizingHorizontal: FILL`.

| Facet | Prism 2 | Prism 3 (read back) | Verdict |
|---|---|---|---|
| direction | VERTICAL | VERTICAL | **match** |
| block padding | `8 / 8` | `space/100 = 8` / `8` | **match** |
| inline padding | `0 / 0` | `space/0 = 0` / `0` | **match** |
| root height sizing | HUG | AUTO (hug) | **match** |
| root width sizing | `320` FIXED | AUTO (hug) | **divergence (systemic)** |
| inter-row gap | `0` (rows are fixed 48 px, self-spacing) | `8` (`size.sm.gap`) | **intentional, provisional** — the def marks this `[HELD]`; our rows hug, so 0 would leave them touching (`checkbox-group.ts:110`) |
| rows fill width | `FILL` | `layoutGrow 0`, `layoutAlign` unset (hug) | **divergence (systemic)** |
| label wrapper | `label` container with own 8/8 padding | `field-label` nested directly, no wrapper | **divergence (structural, minor)** |
| label config | `required · Large · Bold · Secondary` | `field-label { size: medium, emphasis: secondary, weight: bold }` at the default member; `size` axis scales it | **intentional** — Prism 2 is single-size; the group carries a size axis |

The block/inline padding and the vertical hug match Prism 2 exactly. The two divergences that matter both point at the same thing: **the group hugs its width and its rows do not fill it.** The def's own comment describes the intent as "Column, filling its width so the rows span it" (`checkbox-group.ts:141`) — that intent is **not realized in the projection**, for the reason in the systemic finding.

## Item 3 — `image-placeholder` footprint "misses"

Not an auto-layout defect. `image-placeholder` binds **one** nominal dimension — `width → container.narrow`, resolved `720` in nb (`out/figma/nb/layout.md.json`, `out/nb.tokens.json`) — and declares `aspectRatio: 'ratio'` (`components/image-placeholder.ts:124`). The lock derives the other side, so the three ratio members measure, by design:

| ratio | `targetAspectRatio` read back | footprint |
|---|---|---|
| `1:1` | `1.0000` | 720 × 720 |
| `4:3` | `1.3333` | 720 × 540 |
| `16:9` | `1.7778` | 720 × 405 |

(The three `targetAspectRatio` values are quoted from `test-roundtrip.ts`'s aspect-lock read-back — a run, not the plan.)

They share a nominal **width** (720, the single bound side) and differ in **height** — which is the whole point of an aspect-ratio axis. The build-status footprint check (`anatomy-figma.ts:~3283`) groups members by `PLANS[i].group` and reports any member whose `width × height` box differs from the group's first. That group key is built **only** from `footprintVaries` (plus slot/size axes), `anatomy-figma.ts:~3148`. `image-placeholder` declares `footprintVaries` nowhere, so it defaults to `[]` (`figmaAnatomySet` at `:1526`) and **all three ratios land in one empty group** — the check then flags the two that differ as `footprint -> … (same )`. The trailing `(same )` is an **empty group name**, misread in the QA note as "same width."

So the dimensions are correct and the check is comparing the right thing (full box) in the wrong cohort. The fix is one line — declare the ratio axis as a legitimate footprint-mover, exactly what `footprintVaries` exists for (#1010, and `field-message` already does this with `['status']`). Filed (see below).

---

## Systemic finding — hug-and-don't-fill vs Prism 2's fixed-320-and-fill

Prism 2's form components share a shape: a **fixed 320 px** root, with the parts inside set to `layoutSizingHorizontal: FILL` so they stretch to that width. This holds for `helper-message`, `checkbox-group`, `radio-button-group`, `text-field`, `select`, `text-area`, and the rows (`checkboxRow` / `radioButtonRow` `innerContainer` FILL).

Prism 3 projects all of these as **HUG on both axes**, with children that do not stretch. Two engine facts produce this, and both are load-bearing for #1469:

1. **`sizing: 'fill'` and `sizing: 'hug'` are the same projection.** `sizingMode` maps only `'fixed' → FIXED`; everything else → `AUTO` (`anatomy-figma.ts:717`, and the schema says so at `component-schema.ts:84,380`). So a root that declares `sizing: { x: 'fill' }` — `checkbox-group`, `field-message` both do — projects `counterAxisSizingMode: AUTO`, i.e. hug. "Fill" at a set root is additionally a no-op because a component-set root has no auto-layout parent to fill.

2. **Cross-axis child FILL is not expressible.** Figma's per-child fill on the cross axis is `layoutAlign: 'STRETCH'` (its `MIN|CENTER|MAX` are deprecated — `component-schema.ts:513`). The projection never emits `STRETCH`: the only child-side stretch it writes is `layoutGrow: 1` on the **main** axis, via a `text` part's `wrap` (`write-components.ts:750`, `anatomy-figma.ts:1442`). There is no def field for "this child fills its parent's cross axis," so a `checkbox-row` cannot be told to fill the group's width the way Prism 2's `checkboxRow: FILL` does.

Where Prism 2 fills the **main** axis, Prism 3 already matches it: `checkbox-row` and `radio` set their label `layoutGrow: 1` + `textAutoResize: HEIGHT` (host-verified by #1424 in `test-roundtrip.ts`), which is Prism 2's `innerContainer`/`description` FILL. The gap is only on the **cross** axis — the width of a vertical stack — and that is exactly where `checkbox-group`, `text-field`, and `select` diverge.

Is the hug intentional? Partly. A brand-agnostic component that will be resized by whoever instances it has a fair claim to hug rather than freeze at Prism 2's canvas-specific 320. But two consequences are real and worth an owner decision, because #1469 will copy whatever `checkbox-group` settles on:

- With the group hugging and rows not stretching, a group of uneven-width rows is **ragged** — each row is as wide as its own label, and the group is as wide as the widest. Prism 2's filled rows are flush.
- A consumer who widens the instance gets a wider **frame** but the same content-width rows, left-aligned, because nothing inside stretches.

## Guidance for #1469 (radio-group) and a future switch-group

The owner asked how `radio-group` / a future switch-group should be structured to match `checkbox-group`. The honest answer from this audit: **`checkbox-group`'s auto-layout is itself an open question** on the two systemic rows above, so "match checkbox-group" should mean *inherit the same resolution*, decided once:

- `radio-group` should mirror `checkbox-group` **exactly** as it stands today — VERTICAL root; block padding `pad-y` (8), inline `pad-x` (0); a `field-label` nested `required · secondary · bold`, size-followed; three `nest-fixed` `radio` rows following `size`; the provisional `size.{size}.gap` inter-row gap. This reproduces Prism 2's `radio-button-group.json`, which is byte-for-byte the same auto-layout as `checkbox-group.json` (same root, same `label` container, same padding, rows `FILL`) — Prism 2 already treats them as one shape.
- The one place they differ in Prism 2 is the row height (`checkbox-row` fixed 48, `radio-button-row` fixed 56) and the default visible-row count (checkbox rows 2–6 default **on**, radio rows 3–6 default **off**). Neither is an auto-layout concern for the group; both are row-level and count-level, already `[HELD]` on `checkbox-group`.
- **Do not** invent a width/fill treatment for `radio-group` that `checkbox-group` does not have. If the owner decides the groups should be fixed-320-and-fill (Prism 2 parity) or hug-and-stretch (STRETCH support added), that resolution lands on `checkbox-group` first and `radio-group` copies it. Building `radio-group` to a *different* width model than `checkbox-group` is the one outcome that guarantees they never match.

A future switch-group has no Prism 2 spec to match (Prism 2 ships `toggle-switch` only, no group), so it would follow the same group shape by house precedent, not by reference.

## Issues filed

Per one-concern-per-PR, concrete fixable divergences are filed, not fixed here:

- **#1502 — `image-placeholder`: declare `footprintVaries: ['ratio']`** so the build-status footprint check partitions the ratios instead of false-flagging 720 × 540 vs 720 × 720 (Item 3).
- **#1503 — projection cannot emit cross-axis child FILL (`layoutAlign: 'STRETCH'`)**, so `checkbox-group` rows and the column-stacked form fields hug their width where Prism 2 fills it (systemic finding). Blocks true auto-layout parity for #1469; carries a design question (fixed-320-and-fill vs hug) for the owner.

The `field-message` cross-axis alignment (`MIN` vs Prism 2 `CENTER`) and gap (6 vs 4) are **flagged for the owner**, not filed: the alignment is a visual design call and the gap is a defensible token binding, and both fall under "design decisions are the owner's" rather than "concrete defect."

## What a programmatic pass cannot see

Stated honestly, per #1475. The read-back is the **offline** arm — `component-shim.ts`, not Figma. It proves what `applyComponentPlan` writes and what the plan declares; it does not prove what Figma *keeps*. Specifically:

- **Accept-and-discard.** Figma can take a write and silently not keep it (the #865/#866 class). The shim reproduces only the discards it was taught, so a field that reads back correct here could still be dropped on a real host. The real-host arm (`tools/component-roundtrip/`) is not in CI.
- **Rendered geometry.** The shim derives a flow child's `x`/`y` from padding + sibling widths, but the actual pixel size of a hugging frame, wrapped-line height, and baseline positions are Figma's to compute. "Hugs its width" is read from `counterAxisSizingMode`, not from a measured box.
- **The footprint check itself runs in the plugin payload**, against a live host measuring real boxes. This audit confirmed its *cohorting* mechanism from source and computed the boxes from the aspect-lock read-back + the 720 nominal; it did not re-run the live payload.
- **Visual correctness of the divergences** — whether top-aligned vs centred reads better, whether ragged hugging rows are acceptable — is a design judgment no gate makes. Those are surfaced for the owner above.

## Appendix — the harness (run from repo root; not committed)

```ts
// npx tsx <this file>   — run from the repo root. Drop it anywhere the workspace resolves
// (e.g. apps/plugin/), since it imports @prism3/engine and the plugin's shim by name.
import { readFileSync, readdirSync } from 'node:fs';
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { applyComponentPlan } from './src/write-components';
import { makeShim } from './component-shim';
import type { Page, ShimOpts } from './component-shim';

const SWAP_TARGET = 'FPO-default-icon';
const PROJECTED = componentDefs.filter((d) => d.figmaProperties);

// nb px resolver: name→value from the emitted figma variable files, keyed on the tail past the namespace.
const nbPx = new Map<string, number>();
const FIGMA_NB = 'packages/engine/out/figma/nb';
for (const fn of readdirSync(FIGMA_NB).filter((n) => n.endsWith('.json'))) {
  const j = JSON.parse(readFileSync(`${FIGMA_NB}/${fn}`, 'utf8')) as { variables?: { name: string; value?: unknown; valuesByMode?: Record<string, unknown> }[] };
  for (const v of j.variables ?? []) {
    const val = v.value ?? (v.valuesByMode ? Object.values(v.valuesByMode)[0] : undefined);
    if (typeof val === 'number') nbPx.set(v.name.split('/').slice(1).join('/'), val);
  }
}
const stem = (name: string): string => name.split('/').slice(1).join('/');
const px = (name?: string): string => {
  if (!name) return '—';
  const hit = nbPx.get(stem(name));
  return hit === undefined ? `${stem(name)}=?` : `${stem(name)}=${hit}`;
};

const planComps = (n: { swapTarget?: string; nestTarget?: string; children: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.children as (typeof n)[]).flatMap(planComps),
];
const fullFor = (plans: AnatomyPlan[]): ShimOpts => ({
  vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
  styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
  comps: [...new Set(plans.flatMap((p) => planComps(p.root)))],
});

type AnyNode = { name?: string; children?: AnyNode[]; layoutMode?: string;
  primaryAxisAlignItems?: string; counterAxisAlignItems?: string;
  primaryAxisSizingMode?: string; counterAxisSizingMode?: string;
  layoutGrow?: number; layoutAlign?: string; itemSpacing?: number;
  boundVariables?: Record<string, { id?: string }> };

const boundName = (n: AnyNode, key: string, by: Map<string, string>): string | undefined => {
  const id = n.boundVariables?.[key]?.id; return id ? (by.get(id) ?? id) : undefined;
};
const walkFrames = (n: AnyNode, out: AnyNode[]): void => { if (n.layoutMode) out.push(n); for (const c of n.children ?? []) walkFrames(c, out); };

const main = async (): Promise<void> => {
  for (const def of PROJECTED) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await applyComponentPlan(plans, shim as any, {});
    const vars = await (shim as unknown as { variables: { getLocalVariablesAsync: () => Promise<{ id: string; name: string }[]> } }).variables.getLocalVariablesAsync();
    const by = new Map(vars.map((v) => [v.id, v.name] as const));
    const members = ((page.children[0] as unknown as { children?: AnyNode[] })?.children ?? []);
    const rep = members[0];
    if (!rep) { console.log(`## ${def.id}: NO MEMBERS\n`); continue; }
    const frames: AnyNode[] = []; walkFrames(rep, frames);
    console.log(`## ${def.id}  (${members.length} members; root modes: ${[...new Set(members.map((m) => m.layoutMode ?? 'none'))].join(',')})`);
    for (const fr of frames) {
      console.log(`  · ${(fr.name || '(root)').padEnd(16)} ${String(fr.layoutMode).padEnd(10)} primary[${fr.primaryAxisAlignItems}/${fr.primaryAxisSizingMode}] counter[${fr.counterAxisAlignItems}/${fr.counterAxisSizingMode}] grow=${fr.layoutGrow}`);
      console.log(`    gap=${fr.boundVariables?.itemSpacing ? px(boundName(fr, 'itemSpacing', by)) : `literal ${fr.itemSpacing}`} padT=${px(boundName(fr, 'paddingTop', by))} padL=${px(boundName(fr, 'paddingLeft', by))}`);
    }
    const kids = rep.children ?? [];
    if (kids.length) console.log(`    root children: ${kids.map((k) => `${k.name}[grow=${k.layoutGrow ?? 0},align=${k.layoutAlign ?? '?'}]`).join(', ')}`);
    console.log('');
  }
};
main();
```
