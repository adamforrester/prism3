# Icon

> Glyph from the icon set at 16/20/24/32px. Decorative unless labeled; never interactive.

A small vector glyph standing in for a concept, drawn on a square base-4/base-8 artboard at a fixed set of sizes. Decorative by default and hidden from assistive tech; a `label` is the sole gateway that makes it meaningful and named. Never the interactive element — an icon-only control is a Button that wraps one.

- **ID:** `icon`
- **Category:** foundations
- **Status:** draft
- **Also known as:** glyph, symbol, svg-icon

## Usage

Use to reinforce meaning, speed scanning, or anchor an action alongside text. Few icons are universally understood, so a glyph beside a visible label is a wayfinding anchor for returning users rather than a replacement for the words. Pick a size from the enum, leave `tone` at `inherit` unless the glyph must resist its host's cascade, and decide the one question that matters: is this glyph meaningful (give it a `label`) or decorative (do not)? For an icon-only action, reach for Button or IconButton and leave this glyph unnamed inside it.

### Do

- Leave `label` off when the icon sits beside its own text — decorative is the default and the most common correct answer
- Give a meaningful standalone icon a `label`, which supplies both `role="img"` and the name
- Pick a size from the enum so the glyph lands on the pixel grid
- Let `tone` inherit unless an inherited color would make the glyph illegible

### Don't

- Make the icon the interactive element — an icon-only control is a Button, and the name and the hit target (at least 24×24; 44×44 on touch) live on the wrapper
- Name both the wrapper and the glyph (it double-announces, and causes ghost focus rings)
- Scale a glyph to an arbitrary size — off-grid scaling blurs strokes between hardware pixels
- Pass a raw hex color — that moves contrast enforcement out to the call site
- Invent a one-off glyph outside the set; the set is the discipline and an ad-hoc glyph is debt

### Copy patterns

- **Labels:** When meaningful: a concise noun or verb naming the concept or the action it fires — "Search", "Delete" — matching what the glyph depicts, not the asset's internal name. When decorative: no name at all.
- **Metaphors:** Rely on globally established metaphors rather than local idioms; keep them minimal and additive, because a complex metaphor is illegible at 16px; avoid depicting physical hardware, which dates the moment the device does. The floppy-disk save glyph endures precisely because its meaning outlived the object.

## Choosing it

- **Purpose:** Render a set glyph at a grid size, routed correctly into or out of the accessibility tree.
- **Use when:** Beside a label to reinforce meaning, or standalone with a `label` when the glyph itself carries the meaning.
- **Avoid when:** As an interactive element. An icon-only action is a Button (or IconButton) with an accessible name and a hit target of at least 24×24 (44×44 on touch), containing an unnamed glyph — reaching for Icon there puts the affordance on a node with no focus management, no keyboard listeners and no touch target. Also avoid it as an illustration (larger, narrative, its own component), a logo, or a thumbnail; and avoid naming a glyph that sits beside its own text.
- **Often used with:** `button`, `icon-button`, `text-field`, `field-message`, `select`
- **Keywords:** icon, glyph, symbol, svg, chevron, arrow, search icon, close icon
- **Generation priority:** 2

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `name` | enum: IconName (`arrow-down`, `arrow-down-left`, `arrow-down-right`, `arrow-left`, `arrow-right`, `arrow-up`, `arrow-up-left`, `arrow-up-right`, `check`, `check-circle`, `check-circle-filled`, `chevron-down`, `chevron-left`, `chevron-right`, `chevron-up`, `close`, `close-filled`, `error-circle`, `error-circle-filled`, `external-link-filled`, `eye`, `eye-filled`, `eye-off`, `eye-off-filled`, `FPO-default-icon`, `home`, `image`, `info-circle`, `info-circle-filled`, `link`, `minus`, `minus-filled`, `more-horizontal-filled`, `more-vertical-filled`, `pause-circle`, `play-circle`, `plus`, `plus-circle`, `plus-circle-filled`, `plus-filled`, `resize-grip`, `search`, `warning-triangle`, `warning-triangle-filled`) | — | yes | Which glyph, typed to the set's literal vocabulary rather than a free string — an unknown name must fail at compile time, because a missing glyph otherwise fails silently as an invisible gap in production. The vocabulary is `IconName`, generated from the icon set and imported rather than restated, so a glyph cannot enter the set and be forgotten in the API. Compile-time refusal is available to any consumer importing that type; a code projection that widens it back to `string` gives the guarantee up, and that projection is the thing to watch rather than this def. Per-glyph components (`<IconSearch/>`) are the equivalent surface for a tree-shaken delivery. |
| `size` | enum: 'x-small' \| 'small' \| 'medium' \| 'large' | `medium` | no | Enumerated, snapping to the fixed pixel grid — 16 / 20 / 24 / 32. NOT arbitrary integers: off-grid scaling blurs strokes between hardware pixels and is the first thing an icon system must forbid. The t-shirt words are the vocabulary every other def uses; the rungs they bind are the engine's (`icon.size.*`). |
| `tone` | enum: 'inherit' \| a semantic ink token (`inherit`, `primary`, `secondary`, `tertiary`, `brand`, `success`, `warning`, `danger`, `info`) | `inherit` | no | Ink. Defaults to `inherit` (`currentColor`), so the glyph tracks its host control's hover/disabled/error cascade with no JS reconciliation. A semantic value pins it instead, insulating an error glyph from an inherited color that would make it invisible. Rejects raw hex by construction — an enum has no cell for one — so contrast is enforced centrally rather than per call site. |
| `label` | string | — | no | The only route to an accessible name. Present makes the glyph meaningful: `role="img"` + `aria-label`. Absent makes it decorative: `aria-hidden="true"`, which is the DEFAULT and the most common correct answer — a named icon beside its own text double-announces ("Email, Email"). Inside an icon-only control the WRAPPER carries the name and this stays absent; never name both. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `name` | `arrow-down`, `arrow-down-left`, `arrow-down-right`, `arrow-left`, `arrow-right`, `arrow-up`, `arrow-up-left`, `arrow-up-right`, `check`, `check-circle`, `check-circle-filled`, `chevron-down`, `chevron-left`, `chevron-right`, `chevron-up`, `close`, `close-filled`, `error-circle`, `error-circle-filled`, `external-link-filled`, `eye`, `eye-filled`, `eye-off`, `eye-off-filled`, `FPO-default-icon`, `home`, `image`, `info-circle`, `info-circle-filled`, `link`, `minus`, `minus-filled`, `more-horizontal-filled`, `more-vertical-filled`, `pause-circle`, `play-circle`, `plus`, `plus-circle`, `plus-circle-filled`, `plus-filled`, `resize-grip`, `search`, `warning-triangle`, `warning-triangle-filled` | at runtime |
| `tone` | `inherit`, `primary`, `secondary`, `tertiary`, `brand`, `success`, `warning`, `danger`, `info` | at runtime |

## Accessibility

- **Role:** img when meaningful (with aria-label); none when decorative (aria-hidden="true")
- **WCAG:**
  - 1.1.1 Non-text Content (meaningful → text alternative; decorative → hidden from AT)
  - 1.4.1 Use of Color (an icon must never be the sole carrier of meaning color conveys)
  - 1.4.11 Non-text Contrast (a meaningful icon clears 3:1; a decorative one is exempt)
  - 2.5.8 Target Size (the WRAPPING control's concern, never the glyph's)
- **Focus:** None of its own. An icon takes no focus; the control wrapping it does, and the focus ring is that control's (see `focus-ring`).
- **ARIA:** A three-way matrix, and almost every icon bug is picking the wrong cell. DECORATIVE (text beside it, or ornament): omit `label` → `aria-hidden="true"`; this is the default. MEANINGFUL STANDALONE: `label` → `role="img"` + `aria-label`, and `role="img"` is MANDATORY — without it many screen readers ignore an `aria-label` on a raw `<svg>` and leave the user on an unannounced stop. INSIDE AN ICON-ONLY CONTROL: the wrapper carries the name and the glyph stays `aria-hidden`; reversing it causes ghost focus rings and unpredictable AT behavior. Never name both.

## Composition

- **Composes with:** `button`, `icon-button`, `text-field`, `field-message`, `select`
- **Planned:** `link`, `menu`, `badge`, `illustration`, `logo`, `thumbnail`, `emoji`
- **Replaces:**
  - legacy icon fonts
  - ad-hoc inline SVGs outside the set

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- tone — the ink axis, declared in `variants` and deliberately not a Figma variant, and as of #795 the reason is ONE reason rather than three. The surviving one is the interesting one and always was: `inherit` (`currentColor`) is the DEFAULT and Figma has no equivalent — a Figma node's fill is a value, never an inheritance from its host. #1211 SHARPENS that rather than softening it, and the sharpening matters because the old wording is now half wrong. It said the most common tone "has no coordinate to occupy"; it has one, because `paintKeys` now ends on a `{slot}` floor and a coordinate at `inherit` resolves the primary ink like any other tone-less one. What Figma still cannot carry is the MEANING: a projected `tone=inherit` member would paint that floor and be pixel-identical to `tone=primary`, so the axis would offer a value whose entire job — defer to the host — the projection silently drops while looking complete. A duplicate member that lies is worse than an absent one, which is why the axis stays in code. The other two reasons are gone, and both were OURS rather than Figma's. STRUCTURAL: this entry said `figmaAnatomySet` refuses any variant axis outside intent/appearance/size (`PROJECTABLE_VARIANT_AXES`) and throws rather than enumerating around it — #795 deleted that list, so the projector would carry `tone` today if this def asked, and the def does not ask. PAINT: `paintOf` used to key every lookup as `{intent}.{appearance}.{slot}`, so a def whose paint axis is `tone` resolved nothing; #758 replaced that with this def's own `paintKeys` and the tone ink resolves at every tone — verified in `test.ts`, which plans this def at `{tone: danger}` and asserts the `color/icon/danger` binding. So the set projects over `name` and paints along `tone`, which is the shape #795's `variantAxes` doc comment cites as the field's original meaning.
- glyph fill vs stroke — the set ships FILLED outlines (`fill="currentColor"` on a closed path, verified across every source in the set), so a materializer paints the vector and never strokes it. A stroked-icon set is the other half of the field (Feather, Lucide) and would need a stroke weight plus a cap/join treatment, none of which `PartDef` can carry — the same wall the `stroke weight` entry below describes, met from the geometry side. Stated here because the def now DOES declare the geometry (#864) and this is the part of it that still cannot be declared.
- optical baseline shift — a glyph's bounding box is rarely its visual center of mass, so an inline icon needs an optical shift (Material Symbols moves ~11.5% of the text size down, aligning the glyph center to the x-height rather than the box). That is a relationship between a glyph and the TEXT beside it, resolved at render; Figma centers a node in its parent frame and has nowhere to state it. The recurring polish bug the brief names — an icon sitting a pixel low beside its label — lives entirely in this gap.
- stroke weight — a constant tuned to the typeface rather than a per-icon value (Atlassian's 1.5px matches its 1.5px typeface stroke by the squint test; Material's baseline is 2dp). It is a property of the SET, so no single glyph component can carry it, and `PartDef` has no stroke-weight field to carry it with — the same wall `focus-ring` meets from the other side.
- label routing — the whole a11y contract is a DOM shape: present makes `role="img"` + `aria-label`, absent makes `aria-hidden="true"` (§6). Figma has no accessibility tree, so the one prop that decides whether this component is announced at all is invisible to the Figma leg. It is not a variant either — the meaningful/decorative split is semantic, not visual, and the two cells are pixel-identical.
- touch-target — the 44×44 (48 Android) floor for an icon-only control is the WRAPPER's, not the glyph's (2.5.8). A 16px glyph cannot be its own target, and this component must not grow to pretend otherwise; the Button supplies the padding while the glyph stays visually tight. Stated here because the temptation is to fix the target size where the small thing is.
- RTL mirroring — directional glyphs mirror under `dir="rtl"` (back/forward, send, undo, list indentation) and non-directional ones must not (a clock stays a clock). The robust mechanism is per-glyph `isMirroredInRTL` metadata so the component automates the transform, which makes it a fact about each member of the set rather than about this def — and Figma carries no such flag.
- delivery — inline SVG vs sprite vs variable WOFF2 is a genuine engineering trade with accessibility, bundle and rendering consequences (§11), and it is downstream of the design language rather than of this def: a locked fixed-stroke system ships tree-shaken inline SVG, a multi-axis one ships a variable font. The Figma leg is indifferent to all of it, and so is the token tier.

---

Generated from the `icon` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
