/**
 * Icon — the glyph primitive (KB `components/icon.md`, docs/38 Arc 2 step 1).
 *
 * The first of the two dependency-A primitives (#741). It exists because Button and IconButton
 * already NOMINATE a component called `icon` as a swap target, and until now the only thing that
 * answered that name was whatever happened to sit in the Figma file — the inversion docs/14 §1
 * exists to reject, and the correction #749 recorded against #734. This def is the answer moving
 * back into the engine.
 *
 * WHAT AN ICON IS NOT, because it is the brief's central trap and it decides two fields here (§5,
 * §6): an Icon is never the interactive element. An icon-only control is a BUTTON with an
 * `aria-label` and a 44×44 target, and the glyph inside it is `aria-hidden`. So `states` is `[]`
 * — hover/pressed/disabled belong to the host control — and `label` is the only a11y surface,
 * because naming both the wrapper and the glyph is the failure mode, not a redundancy.
 *
 * TWO THINGS ABOUT THE SIZE ENUM, both recorded rather than left for the next author to re-derive:
 *
 *  1. THE BRIEF'S RUNG NAMES ARE OFFSET ONE RUNG FROM THE ENGINE'S. §15's schema says
 *     `values: [sm, md, lg, xl], default: md` while its `anatomy.grid` fixes the values at
 *     "16/20/24 (+32)" — so the brief implies sm=16, md=20, lg=24, xl=32. The engine emits
 *     xs=16, sm=20, md=24, lg=32, xl=40. The values AGREE exactly on the overlap; only the names
 *     differ. The engine's names win, and not as a preference: principle 5 makes token names the
 *     CONTRACT, so a def inventing its own rung names would make `icon.size.md` mean 24 in the
 *     token layer and 20 in the component API — a divergence nothing in the repo can detect,
 *     because both sides stay individually valid. That is the shadow-overlay class of bug: a
 *     wrong value that resolves. (The brief also disagrees with itself — §3's prose names three
 *     rungs where §15 names four.)
 *  2. THE DEFAULT SHIFTS, and it is a real shift rather than drift. `md` here is 24; the brief's
 *     default is 20. Same rung COUNT, different rung, entirely because of the offset above. Stated
 *     explicitly so a future reader who finds the brief and not this line does not read it as drift.
 *
 * This is the first instance of a systemic collision — every def authored from a KB brief meets it,
 * and text-field and card are next — so it is resolved HERE for icon and deliberately not
 * generalized in this PR; the general fix is filed separately by the owner.
 */
import { ComponentDef } from '../component-schema';

export const icon: ComponentDef = {
  id: 'icon',
  name: 'Icon',
  aliases: ['glyph', 'symbol', 'svg-icon'],
  category: 'foundations',
  status: 'draft',
  description:
    'A small vector glyph standing in for a concept, drawn on a square base-4/base-8 artboard at a fixed set of sizes. Decorative by default and hidden from assistive tech; a `label` is the sole gateway that makes it meaningful and named. Never the interactive element — an icon-only control is a Button that wraps one.',

  props: [
    { name: 'name', type: 'string (typed to the set vocabulary)', required: true, description: 'Which glyph, typed to the set\'s literal vocabulary rather than a free string — an unknown name must fail at compile time, because a missing glyph otherwise fails silently as an invisible gap in production (§10). Per-glyph components (`<IconSearch/>`) are the equivalent surface for a tree-shaken delivery.' },
    { name: 'size', type: "enum: 'xs' | 'sm' | 'md' | 'lg'", values: ['xs', 'sm', 'md', 'lg'], default: 'md', required: false, description: 'Enumerated, snapping to the fixed pixel grid — 16 / 20 / 24 / 32. NOT arbitrary integers: off-grid scaling blurs strokes between hardware pixels and is the first thing an icon system must forbid (§2). Rung names are the engine\'s (`icon.size.*`), which are offset one rung from the brief\'s — see the header.' },
    { name: 'tone', type: "enum: 'inherit' | a semantic ink token", values: ['inherit', 'primary', 'secondary', 'tertiary', 'brand', 'success', 'warning', 'danger', 'info'], default: 'inherit', required: false, description: 'Ink. Defaults to `inherit` (`currentColor`), so the glyph tracks its host control\'s hover/disabled/error cascade with no JS reconciliation. A semantic value pins it instead, insulating (say) an error glyph from a rogue cascade turning it invisible. REJECTS raw hex by construction — an enum has no cell for one — so contrast is enforced centrally rather than per call site (§3).' },
    { name: 'label', type: 'string', required: false, description: 'THE SOLE ACCESSIBILITY GATEWAY (§6). Present makes the glyph meaningful: `role="img"` + `aria-label`. Absent makes it decorative: `aria-hidden="true"`, which is the DEFAULT and the most common correct answer — a named icon beside its own text double-announces ("Email, Email"). Inside an icon-only control the WRAPPER carries the name and this stays absent; never name both.' },
  ],

  // `[]` — and this is a claim rather than an omission (§4). An icon is not interactive, so hover /
  // focus-visible / pressed / disabled belong to whatever control wraps it. A `disabled` icon inside
  // a disabled Button is Button's `disabled.icon` paint reaching in, not a state this component owns.
  states: [],

  // `size` is the grid. `tone` is the colour-expression model, and it is a real axis rather than a
  // prop-only concern because a semantic ink is a different component in Figma's sense — see the
  // codeOnly entry for why it does not project.
  //
  // NOT declared: `fill` (outlined↔filled) and `weight`. Both are real axes in the field (§4 —
  // Material's FILL/wght variable-font axes, SF Symbols' rendering modes), and both are properties of
  // the SET's delivery rather than of a glyph slot the token tier can bind. Declaring them here would
  // put an axis in the component API that nothing in this repo can supply a value for.
  variants: {
    size: ['xs', 'sm', 'md', 'lg'],
    tone: ['inherit', 'primary', 'secondary', 'tertiary', 'brand', 'success', 'warning', 'danger', 'info'],
  },

  // The square artboard at each rung, plus the semantic ink family. `tone.inherit` binds NOTHING and
  // is absent from this map deliberately: `currentColor` is the absence of a pinned ink, not a token
  // whose value happens to be "inherit". A binding key for it would have to resolve to some real
  // path, and every candidate would be a lie about what the default does.

  // THE PAINT GRAMMAR, and this def is why the field exists (#758). The ink axis leads with its own
  // NAME and carries no `{slot}` segment at all — `tone.primary`, not `primary.icon` — because the
  // component has one paintable surface, so a slot segment would be a constant repeated eight times.
  // `field-message` keys the same axis name the OPPOSITE way (`default.label` — value first, slot
  // second) over a disjoint value set, which is why the declaration is a template rather than an axis
  // list: an axis list can express one of these two shipped conventions and would force a rekey of
  // the other.
  //
  // `tone.inherit` is absent from `tokens` by the paragraph above, so a coordinate at `inherit`
  // resolves no paint and the glyph keeps whatever ink it inherits — the correct projection of
  // `currentColor`, not a dropped binding.
  paintKeys: ['tone.{tone}'],

  tokens: {
    'size.xs': 'icon.size.xs',
    'size.sm': 'icon.size.sm',
    'size.md': 'icon.size.md',
    'size.lg': 'icon.size.lg',
    'tone.primary': 'color.icon.primary',
    'tone.secondary': 'color.icon.secondary',
    'tone.tertiary': 'color.icon.tertiary',
    'tone.brand': 'color.icon.brand',
    'tone.success': 'color.icon.success',
    'tone.warning': 'color.icon.warning',
    'tone.danger': 'color.icon.danger',
    'tone.info': 'color.icon.info',
  },

  // ONE PART, and the brief is why rather than brevity (§2): "the 'anatomy' most people picture (the
  // paths) matters less than this governance". What an icon component structurally IS is a square
  // artboard at a fixed rung, and the glyph geometry inside it is the SET's content — a different
  // artifact, versioned like an API (§10), not a node tree this schema can hold. So the def carries
  // the governance it can bind and admits the geometry it cannot.
  anatomy: {
    root: 'glyph',
    parts: {
      glyph: {
        kind: 'box',
        // `target` in the schema's sense — the single node that owns this component's paint and
        // dimensions — and NOT in the interaction sense, which an icon never has (§5). Worth stating
        // because the two readings diverge here for the first time: every def so far has been a
        // control, where the paint owner and the hit-area owner are the same node. `role: 'target'`
        // on a glyph claims the former only. The a11y consequence of the latter is carried by the
        // `touch-target` codeOnly entry, which puts the 44×44 floor on the wrapper where it belongs.
        role: 'target',
        // ONE key, BOTH axes — the square. `size` rather than a `height` plus a matching `width`
        // because two bindings that must agree can be rebound on one axis with nothing noticing,
        // while a single key cannot drift from itself. Exactly the artboard `PartDef.size` was
        // written for.
        size: 'size.{size}',
        note: 'The square base-4/base-8 artboard at one grid rung. Carries the glyph paths, which are the set\'s content rather than declared parts — see codeOnly.',
      },
    },
    // The ceilings. Every entry is structure the brief states and the Figma leg provably cannot hold.
    codeOnly: [
      // MUST LEAD with `tone` — `figmaPropertyErrors` requires an unprojected variant axis to be
      // admitted by an entry that STARTS with the axis name, because a passing mention inside an
      // entry about something else is a gate satisfied by unrelated prose (the #563 finding).
      'tone — the ink axis, declared in `variants` and deliberately not a Figma variant. Two independent reasons, and the first is the interesting one: `inherit` (`currentColor`) is the DEFAULT and Figma has no equivalent — a Figma node\'s fill is a value, never an inheritance from its host, so the most common tone has no coordinate to occupy. Projecting the eight semantic tones and silently dropping the default would ship a set whose default member is the one thing the API does not default to. The second reason is STRUCTURAL and is the one that survived: `figmaAnatomySet` refuses any variant axis outside intent/appearance/size (`PROJECTABLE_VARIANT_AXES`) and throws rather than enumerating around it, so `tone` cannot become a Figma property whatever the paint does. PAINTWISE there was once a third reason and there is no longer one: `paintOf` used to key paint as `{intent}.{appearance}.{slot}`, so a def whose paint axis is `tone` resolved nothing; #758 replaced that with this def\'s own `paintKeys` and the tone ink resolves today at every tone — verified in `test.ts`, which plans this def at `{tone: danger}` and asserts the `color/icon/danger` binding. The set still projects unpainted, and the reason is the axis refusal above, not the grammar.',
      'glyph paths — the vector geometry itself is not a declared part, and cannot be. `PartKind` has no vector kind, and it should not: the paths are the SET\'s content, governed as a versioned vocabulary with its own deprecation and codemod discipline (§10), while this def governs the artboard the set is drawn on. A materializer builds the square and the set supplies what goes in it.',
      'optical baseline shift — a glyph\'s bounding box is rarely its visual centre of mass, so an inline icon needs an optical shift (Material Symbols moves ~11.5% of the text size down, aligning the glyph centre to the x-height rather than the box). That is a relationship between a glyph and the TEXT beside it, resolved at render; Figma centres a node in its parent frame and has nowhere to state it. The recurring polish bug the brief names — an icon sitting a pixel low beside its label — lives entirely in this gap.',
      'stroke weight — a constant tuned to the typeface rather than a per-icon value (Atlassian\'s 1.5px matches its 1.5px typeface stroke by the squint test; Material\'s baseline is 2dp). It is a property of the SET, so no single glyph component can carry it, and `PartDef` has no stroke-weight field to carry it with — the same wall `focus-ring` meets from the other side.',
      'label routing — the whole a11y contract is a DOM shape: present makes `role="img"` + `aria-label`, absent makes `aria-hidden="true"` (§6). Figma has no accessibility tree, so the one prop that decides whether this component is announced at all is invisible to the Figma leg. It is not a variant either — the meaningful/decorative split is semantic, not visual, and the two cells are pixel-identical.',
      'touch-target — the 44×44 (48 Android) floor for an icon-only control is the WRAPPER\'s, not the glyph\'s (2.5.8). A 16px glyph cannot be its own target, and this component must not grow to pretend otherwise; the Button supplies the padding while the glyph stays visually tight. Stated here because the temptation is to fix the target size where the small thing is.',
      'RTL mirroring — directional glyphs mirror under `dir="rtl"` (back/forward, send, undo, list indentation) and non-directional ones must not (a clock stays a clock). The robust mechanism is per-glyph `isMirroredInRTL` metadata so the component automates the transform, which makes it a fact about each member of the set rather than about this def — and Figma carries no such flag.',
      'delivery — inline SVG vs sprite vs variable WOFF2 is a genuine engineering trade with accessibility, bundle and rendering consequences (§11), and it is downstream of the design language rather than of this def: a locked fixed-stroke system ships tree-shaken inline SVG, a multi-axis one ships a variable font. The Figma leg is indifferent to all of it, and so is the token tier.',
    ],
  },

  // `size` alone. The projectable axis list in `anatomy-figma.ts` is intent/appearance/size, and
  // `size` is the only one of this def's two axes on it — `tone` is admitted in codeOnly above rather
  // than dropped. Four members, one per grid rung.
  //
  // No `stateAxis`: `states` is `[]`, so there is nothing to project. No `swaps`: an icon has no slot
  // — it IS what fills someone else's. `booleans` is stated-empty rather than omitted, which is the
  // established way this schema says "considered, and none survive".
  figmaProperties: {
    variantAxes: ['size'],
    booleans: {},
  },

  accessibility: {
    role: 'img when meaningful (with aria-label); none when decorative (aria-hidden="true")',
    wcag: [
      '1.1.1 Non-text Content (meaningful → text alternative; decorative → hidden from AT)',
      '1.4.1 Use of Color (an icon must never be the sole carrier of meaning colour conveys)',
      '1.4.11 Non-text Contrast (a meaningful icon clears 3:1; a decorative one is exempt)',
      '2.5.8 Target Size (the WRAPPING control\'s concern, never the glyph\'s)',
    ],
    focus: 'None of its own. An icon takes no focus; the control wrapping it does, and the focus ring is that control\'s (see `focus-ring`).',
    aria:
      'A three-way matrix, and almost every icon bug is picking the wrong cell. DECORATIVE (text beside it, or ornament): omit `label` → `aria-hidden="true"`; this is the default. MEANINGFUL STANDALONE: `label` → `role="img"` + `aria-label`, and `role="img"` is MANDATORY — without it many screen readers ignore an `aria-label` on a raw `<svg>` and leave the user on an unannounced stop. INSIDE AN ICON-ONLY CONTROL: the wrapper carries the name and the glyph stays `aria-hidden`; reversing it causes ghost focus rings and unpredictable AT behavior. Never name both.',
  },

  content: {
    labelPattern:
      'When meaningful: a concise noun or verb naming the concept or the action it fires — "Search", "Delete" — matching what the glyph depicts, not the asset\'s internal name. When decorative: no name at all.',
    metaphorRules:
      'Rely on globally established metaphors rather than local idioms; keep them minimal and additive, because a complex metaphor turns to mud at 16px; avoid depicting physical hardware, which dates the moment the device does. The floppy-disk save glyph endures precisely because its meaning outlived the object.',
  },

  docs: {
    usage:
      'Use to reinforce meaning, speed scanning, or anchor an action alongside text. Few icons are universally understood, so a glyph beside a visible label is a wayfinding anchor for returning users rather than a replacement for the words. Pick a size from the enum, leave `tone` at `inherit` unless the glyph must resist its host\'s cascade, and decide the one question that matters: is this glyph meaningful (give it a `label`) or decorative (do not)? For an icon-only action, reach for Button or IconButton and leave this glyph unnamed inside it.',
    do: [
      'Leave `label` off when the icon sits beside its own text — decorative is the default and the most common correct answer',
      'Give a meaningful standalone icon a `label`, which supplies both `role="img"` and the name',
      'Pick a size from the enum so the glyph lands on the pixel grid',
      'Let `tone` inherit unless a rogue cascade would make the glyph illegible',
    ],
    dont: [
      'Make the icon the interactive element — an icon-only control is a Button, and the name and 44×44 target live on the wrapper',
      'Name both the wrapper and the glyph (it double-announces, and causes ghost focus rings)',
      'Scale a glyph to an arbitrary size — off-grid scaling blurs strokes between hardware pixels',
      'Pass a raw hex color — that moves contrast enforcement out to the call site',
      'Invent a one-off glyph outside the set; the set is the discipline and an ad-hoc glyph is debt',
    ],
  },

  ai: {
    primaryPurpose: 'Render a set glyph at a grid size, routed correctly into or out of the accessibility tree.',
    whenToUse: 'Beside a label to reinforce meaning, or standalone with a `label` when the glyph itself carries the meaning.',
    avoidWhen:
      'As an interactive element. An icon-only action is a Button (or IconButton) with an accessible name and a 44×44 target, containing an unnamed glyph — reaching for Icon there puts the affordance on a node with no focus management, no keyboard listeners and no touch target. Also avoid it as an illustration (larger, narrative, its own component), a logo, or a thumbnail; and avoid naming a glyph that sits beside its own text.',
    commonPartners: ['button', 'icon-button', 'text-field', 'field-message', 'link', 'select', 'menu', 'badge'],
    triggerKeywords: ['icon', 'glyph', 'symbol', 'svg', 'chevron', 'arrow', 'search icon', 'close icon'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['button', 'icon-button', 'text-field', 'field-message', 'link', 'select', 'menu', 'badge'],
    alternativeTo: ['illustration', 'logo', 'thumbnail', 'emoji'],
    supersedes: ['legacy icon fonts', 'ad-hoc inline SVGs outside the set'],
  },

  notes: {
    contested: [
      'Delivery — tree-shaken inline SVG (the default for a locked fixed-stroke language) vs a variable WOFF2 font (for multi-axis / optical-sizing systems) vs an SVG sprite. Legacy ligature/PUA icon fonts are settled as dead; the FONT model is not (§11).',
      'Sizing model — px grid vs `em`. This def binds the grid; an `em` treatment belongs on the container an icon sits inline with.',
      'Taxonomy — literal glyph names (`chevron-right`) vs semantic ones (`next`). The field\'s resolution, adopted here: literal names for the immutable primitives, semantic names at an alias layer above them.',
    ],
    unverified: [
      'The brief flags an externally-supplied figure that font glyphs render materially faster than inline SVG in high-frame-rate tests, pending source backing. Nothing in this def depends on it.',
    ],
  },
};
