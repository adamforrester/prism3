# QA first-pass findings — post-reshape component surface (brand: aurora)

> A programmatic first pass over the projected component surface at **ENGINE 0.75.0**, run to
> focus the owner's in-Figma review. A cloud lane cannot open the Figma file, so every number
> here comes from the projection the plugin runs (`figmaAnatomySet`) and the offline host-truth
> shim (`apps/plugin/test-roundtrip.ts` + `component-shim.ts`) — the same path CI drives. Where a
> claim needs a real host or a human eye, this doc says so rather than guessing.
>
> **This is an audit. It files no issues and changes no engine code, def or gate.** The owner
> triages from here.

## How the numbers were produced

- **Projection + host readback.** Each of the 17 projectable defs was projected with
  `figmaAnatomySet(def, { swapTarget })`, built through the offline shim with the real
  `applyComponentPlan`, and read back — member counts, panel property names, panel order, variant
  switches, and every bound variable. The full corpus round-trips clean: **1697 plans, 1697
  members, 0 divergences** across all 17 defs.
- **Aurora token layer.** `npx tsx packages/engine/cli.ts packages/engine/examples/aurora.design.md`
  → **1320/1320 aliases resolve, 788/788 mode contrast contracts pass.**
- **`text-field` and `textarea` do not project** (no `figmaProperties`) — expected-absent, not a
  defect. The round-trip names them as the two code-only defs.

---

## 1. Summary — systemic themes and reshape items

Most-urgent first. ✅ fixed · ◻ still-open · ⚠ new or newly-surfaced.

| Theme | State | One-line status (grounded) |
|---|---|---|
| **S6 — text-content model** (#1335) | ◻ | No consistent cross-family model yet. `select` folds value+placeholder into one `value` TEXT property plus an `empty` state; `field-label` uses `label`+`indicator`; `field-message` uses `message`. Naming/authoring decision, owner's. |
| **S1 — radio / switch decomposition** (#1348, #1354) | ◻ | `checkbox` is fixed (below). `radio` projects **36** and `switch` projects **24**, each enumerating `selection × size × state` directly. Neither nests an atom, so nest-exposed does not apply mechanically — they need the checkbox atom+row treatment first. Design decision. |
| **S2 — presence booleans / `select` count** (#1331, #1379) | ◻ ⚠ | `select` still projects **40** (`status 4 × state 5 × leading 2`); #1331 wants **20**. ⚠ The #1380 canon made `select`'s `leading` a true/false **variant switch**, which is the opposite of #1331's "boolean visibility" ask — the two decisions are now in tension. `button×3` stay at **432** by design (#1379 deferred; presence drives #326 padding a Figma boolean cannot). |
| **S1 — checkbox nest-exposed** (#1330) | ✅ | Confirmed. `checkbox` Row = **3** members, `variantAxes: [size]`, control nested `nest-exposed`. The atom `checkbox-control` keeps its full **54** (`selection 3 × size 3 × state 6`) — correct: the Row exposes it rather than re-enumerating it. |
| **Icon-property canon + `figmaName`** (#1380, #1309) | ✅ | Confirmed via host-truth `componentPropertyDefinitions`. `button×3` panel: `label` → `↳ swap leading icon` → `↳ swap trailing icon`, with `leading icon`/`trailing icon` true/false switches. `select`: `value` → `↳ swap leading icon`, `leading icon` switch. `icon-button×3`: `swap icon` only — no switch, no `↳`. All lowercase; text created first. |
| **S4 — property-name taxonomy** (#1333) | ✅ | Every projected property name is lowercase and every swap carries the `↳ ` prefix (host-truth). The old `Label`/`Message`/`Value` capitalization is gone. |
| **S5 — `tone` split** (#1334) | ✅ | Confirmed. `field-message` axis is `status`, `select` axis is `status`, `field-label` prominence axis is `emphasis`, `icon` keeps `tone`. No overloaded `tone` remains on the field family. |
| **S3 — stroke-weight binding** (#1332) | ✅ | The top technical unknown is resolved. Every bordered component binds its stroke width to a variable and the host retains it on readback — it is **not** discarded. Only the build telemetry's false-positive remains (#1332, low priority). Detail below. |

---

## 2. Per-def findings

Member counts are host-truth (built through the shim and counted back). Canon compliance is read
from `componentPropertyDefinitions`. Contrast statements rest on the aurora contract run.

### Buttons

- **`button` / `button-destructive` / `button-neutral` — 432 each, clean.**
  `appearance 3 × size 3 × surface 2 × leading 2 × trailing 2 × state 6 = 432`. Panel order and
  switches match the #1380 canon exactly (`label`, `↳ swap leading icon`, `↳ swap trailing icon`;
  `leading icon` / `trailing icon` switches). Stroke width binds `border-width/hairline` and reads
  back on every member.
  - **#1355 (button `433`/`ΩΩ` writer bug): symptom not reproducible here.** The projection and the
    offline writer both yield exactly **432** with no garbage `ΩΩ` member. The original 433rd member
    was seen in a live Figma file at engine ~0.64.0; the offline shim cannot reproduce a live-host
    variant-value collision, so this needs one real-host rebuild to close, and the count-vs-product
    guard gate the issue asks for is not evidenced in the suite.
  - **#1351 part 1 (inverse `text`/`outline` per-state ink): present.** `text.label.{hover,pressed}`
    and `text.icon.{hover,pressed}` bind `interactive.<family>.text.{hover,pressed}` — the per-state
    ink step the issue asked for. Issue is closed.
  - **#1351 part 2 (inverse filled-primary ink): resolved by a flat fill — ⚠ flag the tradeoff.**
    `filled.label`/`filled.icon` still bind a **stateless** `interactive.<family>.on-fill`. The
    collapse the issue measured is gone because aurora's `inverse.interactive.primary.fill` is now
    **flat across states** (`rest = hover = pressed = neutral.050`), while the default (page) primary
    fill still steps `accent.500 → 600 → 700`. A constant ink over a constant fill cannot fall out of
    step — but the inverse filled-primary button now shows **no hover/pressed fill feedback**. That is
    a visual-weight tradeoff only the owner can judge at the canvas.
  - **#1349 (disabled border vs disabled ink): still open, not a contract.** The disabled border binds
    `color.disabled.border`, distinct from the disabled ink. Whether the border clears 3:1 as a
    graphical object is not one of the 788 mode contracts, so a programmatic pass cannot confirm the
    rebind landed — host-truth measurement needed.

### Icon buttons

- **`icon-button` / `-destructive` / `-neutral` — 54 each, clean.** `appearance 3 × size 3 × state 6`.
  Panel is `swap icon` only — required icon, no presence switch, no `↳` — matching the canon.
  Square footprint (height drives both dimensions). **#1353** (button-minus-text model + circular /
  square shape variants) is untouched: still its own 54-member component with no shape axis. Design
  decision.

### Field family

- **`field-label` — 24, clean.** `size 3 × emphasis 2 × weight 2 × state 2`. Panel: `label`,
  `indicator` (both TEXT, lowercase). **#1337 (secondary+bold dropped `Label`/`indicator`) is fixed
  and verified:** all 24 members — including every `emphasis=secondary, weight=bold` coordinate —
  carry both TEXT properties on readback, with no `componentPropertyReferences` failure. #1338
  (required/optional toggle) and #1339 (disabled semantics) are separate open items, not assessed
  here.
- **`field-message` — 4, clean.** Single `status` axis (`default/error/warning/success`). Panel:
  `message`. Confirms S5.
- **`select` — 40, clean.** `status 4 × state 5 × leading 2`. Panel: `value`, `↳ swap leading icon`;
  `leading icon` switch. **#1331 (→20) still open** and now in tension with the #1380 canon switch
  (see S2 above). **#1344 (`empty` state)** still present — `states: [rest, hover, focus-visible,
  disabled, empty]`; `empty` re-points the `value` ink to the placeholder role. This is the
  documented placeholder-vs-value model, still awaiting the owner's decision on whether `empty`
  should be a projected state at all. #1341/#1342/#1343/#1345 are studio/width/layout items outside a
  projection pass.

### Selection controls

- **`checkbox-control` — 54, clean.** The atom, unchanged by the reshape (correct). Binds
  `border-width/thick`. **#1346:** there is **no `unchecked.border.pressed` key** — the pressed border
  falls through to the rest border (the field border ladder emits rest/hover only, documented in the
  def). Whether pressed should show a distinct border is the owner's call. Inner-glyph sizing is a
  visual-weight judgment a programmatic pass cannot make.
- **`checkbox` — 3, clean.** The S1 win (above). Panel: `label`.
- **`radio` — 36.** Draws its own control (binds `control.size.*` and `border-width/thick`
  directly); does **not** nest `checkbox-control`. So its `selection × size × state` matrix is its
  own, not a mirror of a nested atom — nest-exposed cannot collapse it until radio is decomposed.
  **#1348** (decompose + constant-border ring with inner dot + circular focus ring) is the open path.
- **`switch` — 24.** Same shape as radio: own control, binds `border-width/thick` on the track, does
  not nest an atom. **#1354** (Prism2 styling + handle mark + decompose) open.

### Media

- **`icon` — 43, clean.** One member per glyph name; keeps its `tone` ink axis (S5). No border.
- **`focus-ring` — 2, clean.** `surface: default/inverse`. Binds `focus/ring/width` (weight retained
  on both members). For aurora, `border.focus` resolves `accent.500` and `inverse.border.focus`
  resolves `accent.450` — **distinct**, so the inverse ring is not a copy of the default (the #1336
  concern, closed). The high-contrast-mode response the issue raised needs mode-by-mode host
  inspection, which this light/dark aurora pass does not cover.
- **`veil` — 6, clean.** `value 2 × intensity 3`. No border. Gradient handling tracked at #1318.
- **`image-placeholder` — 3, clean.** Aspect-lock verified independently by the round-trip
  (`1:1`, `4:3`, `16:9`). **#1340** (placeholder glyph scaling) is a visual-weight item.

### S3 in full — stroke weight is retained

Host readback of the bound `strokeWeight` on every bordered component:

| Def | members binding a stroke width | variable |
|---|---|---|
| `focus-ring` | 2 | `focus/ring/width` |
| `button×3` | 432 | `border-width/hairline` |
| `icon-button×3` | 54 | `border-width/hairline` |
| `checkbox-control` | 54 | `border-width/thick` |
| `radio` | 36 | `border-width/thick` |
| `switch` | 24 | `border-width/thick` |
| `select` | 40 | `border-width/hairline` |

The binding is present in the plan and retained by the host on readback — the projection does not
drop it. The offline shim models the single `strokeWeight` key; the live host carries the four
per-side weight keys (`strokeTopWeight`…) with `boundVariables.strokeWeight` empty by design, which
is what fooled the build telemetry into reporting `DISCARDED`. That telemetry fix is the only live
thread (#1332, low priority); there is no engine stroke-binding defect.

---

## 3. Focus list for the owner's in-Figma pass

Ranked — the handful a human at the canvas has to adjudicate, because a programmatic pass cannot.

1. **Inverse filled-primary button feedback (#1351 part 2).** The contrast collapse is resolved by
   pinning the inverse primary fill flat, but that removes the hover/pressed fill change on the
   inverse filled-primary button. Confirm the button still reads as interactive on a dark band, or
   decide the ink should step instead.
2. **`radio` and `switch` decomposition (#1348, #1354).** Both still draw their own control at 36 /
   24 members and want the checkbox atom+row treatment plus the Prism2 visuals (constant-border ring
   + inner dot; handle mark). Design calls that unlock the S1 collapse for them.
3. **`select` count vs the canon (#1331 / #1380).** Decide whether `select`'s `leading` stays a
   variant switch (canon, 40 members) or becomes boolean visibility (#1331, 20 members). The two
   shipped decisions currently disagree.
4. **`select` `empty` state (#1344)** and **the S6 text-content model (#1335).** Whether `empty` is a
   projected state, and how field text properties are named and defaulted across the family.
5. **`button` disabled border vs ink (#1349)** and the **#1336 high-contrast focus response.** Both
   are contrast relationships outside the 788 token contracts — measure on the real host.
6. **`icon-button` model + shapes (#1353):** text-less button vs distinct component, and whether to
   add circular/square shape variants.
7. **Inner-glyph and placeholder sizing (#1346, #1340):** visual-weight judgments on the checkbox
   check/dash and the image-placeholder glyph.
8. **One real-host rebuild of `button` (#1355):** to confirm the `ΩΩ`/433 member does not reappear in
   a live file, since the offline writer cannot reproduce a host variant collision.

---

## 4. What a programmatic pass cannot see

- **Visual weight** — glyph proportions, ring thickness read, whether a flat inverse fill "reads as a
  button". Every judgment of degree is the owner's.
- **Real-host accept-and-discard** — Figma taking a write and not keeping it. The offline shim
  reproduces only the discards it was taught; `tools/component-roundtrip/` (real host) is the arm for
  that, and CI does not run it.
- **Composited / per-side contrast** — the translucent-overlay compositing and the per-side stroke
  keys the live host uses. The 788 aurora contracts are token-pair contrasts, not composited
  component states.
- **High-contrast modes** — this pass built aurora's light/dark layer; the HC-mode focus-ring
  response (#1336) needs a mode-by-mode host read.
- **`lineHeight` binding (#1356)** — a text-style emission property, not a component-projection field;
  not assessable from this surface.

---

## 5. Open QA-arc issues, cross-referenced to the current projection

Status is read from the projection at 0.75.0. This doc closes and comments on nothing.

| Issue | Title (abridged) | State on the current surface |
|---|---|---|
| #1330 | S1 nest-exposed (checkbox) | ✅ addressed — checkbox 3, atom 54 |
| #1331 | S2 select 40 → 20 | ◻ untouched — select still 40; in tension with #1380 |
| #1332 | S3 telemetry false-positive | ◻ open (low) — strokes are bound; telemetry only |
| #1333 | S4 property-name taxonomy | ✅ addressed — all lowercase, `↳` on swaps |
| #1334 | S5 `tone` → `status`/`emphasis` | ✅ addressed — field family split |
| #1335 | S6 text-content model | ◻ untouched — no cross-family model |
| #1336 | inverse roles / HC focus ring | ✅ closed — aurora default≠inverse focus; HC needs host read |
| #1337 | field-label secondary+bold drop | ✅ addressed — 24 members clean, both TEXT props present |
| #1341 | studio control for field fill | ◻ studio surface — outside a projection pass |
| #1344 | select `empty` state | ◻ untouched — `empty` still projected |
| #1346 | checkbox-control glyph + pressed border | ◻ partial — no `border.pressed` key; falls to rest |
| #1348 | radio decompose + Prism2 visual | ◻ untouched — radio 36, own control |
| #1349 | button disabled border vs ink | ◻ untouched — not a contract; host read needed |
| #1350 | button icon sizes | ✅ addressed — rebound xs/sm/md (0.70.0) |
| #1351 | inverse WCAG failures | ✅ closed — part 1 in code; part 2 via flat fill (see §2) |
| #1352 | button-destructive inverse red ink | ✅ closed |
| #1353 | icon-button model + shapes | ◻ untouched — 54, no shape axis |
| #1354 | switch Prism2 + decompose | ◻ untouched — switch 24, own control |
| #1355 | button 433 / `ΩΩ` writer bug | ⚠ symptom gone (432 clean); needs a real-host rebuild + a guard gate |
| #1356 | TEXT nodes don't bind lineHeight | ◻ not assessable from this surface |
| #1379 | button leading/trailing count | ◻ deferred by design — 432 kept |

Not re-walked from the projection (studio, width, layout, or documentation items with no projected
surface): #1338, #1339, #1340, #1342, #1343, #1345, #1347. Their states are unchanged from #1329.
