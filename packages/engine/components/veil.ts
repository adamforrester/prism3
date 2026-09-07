/**
 * Veil — the designer-selectable WASH a designer places over a photograph so text set on top of it
 * stays legible (#1030, renamed #1317, built here). A standalone, full-bleed overlay, and the FIRST
 * component whose whole job is to bind the semantic `veil.*` roles into a component surface.
 *
 * ── WHAT IT IS, AND THE ONE THING IT IS NOT ─────────────────────────────────────────────────────
 *
 * `veil` is the wash a designer CHOOSES per image — a dark wash under light text, a light wash under
 * dark text — and dials for how much the photo needs muting. It is NOT the modal backdrop: that stays
 * `scrim.default`, referenced directly by dialogs, mode-varying, and out of scope here. The token tier
 * already draws that line (the `veil.*` roles' own `$description` names `scrim.default` as the
 * mode-varying backdrop), and this def keeps it: veil is media, scrim is modality.
 *
 * ── TWO AXES, AND WHY THEY BIND EXISTING ROLES RATHER THAN NEW TOKENS ────────────────────────────
 *
 * `value` (Dark | Light) is the wash's polarity; `intensity` (subtle | medium | strong) is its
 * magnitude. The 2×3 grid maps one-to-one onto the six semantic roles #1317 renamed on `main`:
 *
 *     value=Dark,  intensity=subtle → veil.dark.subtle    (… medium/strong → veil.dark.{medium,strong})
 *     value=Light, intensity=subtle → veil.light.subtle   (… etc.)
 *
 * The fill for a (value, intensity) coordinate binds the matching role and nothing else. This
 * introduces NO new emitted token name — `veil.*` are appearance-invariant semantic color roles that
 * already ship — so `token-contract.ts --check` stays green and `CONTRACT_VERSION` does not move
 * (10.0.0). A prior build tried to bind the raw alpha PRIMITIVES (`black-alpha.*` / `white-alpha.*`)
 * and hit the wall this repo's semantic-layer rule exists to raise; binding the semantic `veil.*`
 * roles is the accepted path — the same shape as `button` binding `color.field.*` rather than a
 * palette step.
 *
 * ── TWO AXIS NAMES REOPEN THE CLOSED `VARIANT_AXES` LIST (owner-decided names) ───────────────────
 *
 * `value` and `intensity` are new entries in `VARIANT_AXES`, a list #756 deliberately closed. The
 * names are the owner's decision (the component's variant API is a design call); reopening the list to
 * honour them is the mechanical fallout, and each is held to that list's own bar — a distinct kind of
 * distinction no existing name expresses. `intensity` (a wash's magnitude) is nearest to `weight` (type
 * heaviness) and `appearance` (a control's emphasis/render strategy) and is neither: it is how STRONG
 * an overlay is, which no other axis names. `value` (a dark-vs-light lightness polarity) is nearest to
 * `tone` (which semantic ink role) and `surface` (which ground a control sits ON) and is neither: it is
 * the wash's OWN lightness, in the color-theory sense of value. `lint-axis-values.ts` carries both as
 * `sole` sets with the same reasons.
 *
 * ── THE PAINT GRAMMAR IS AXIS-LED, AND ARM 1 COVERS IT FOR FREE ─────────────────────────────────
 *
 * `paintKeys: ['{value}.{intensity}']` — one template, filling the full 2×3 grid (`dark.subtle` …
 * `light.strong`). The box's `fill` slot is a `PRIMARY_PAINT_SLOTS` member, so a slot-free template
 * answers it (`anatomy-figma.ts`). The key LEADS with a `value` axis value, and the veil role it binds
 * carries that value as a path segment (`dark.subtle` → `color.veil.dark.subtle`), so `lint-paint.ts`
 * arm 1's provenance rule covers this def with no exemption — a `dark` coordinate pointed at a `light`
 * role fails by name. No `NON_FAMILY_AXES` entry is needed, which is the difference from `selection`:
 * the veil roles ARE a family named for the axis value.
 *
 * ── SOLID WASHES ONLY — THE GRADIENT VARIANTS ARE DEFERRED (#1318) ──────────────────────────────
 *
 * Prism 2's veil carries `Gradient from top/bottom/left/right` variants alongside the solid washes.
 * They are NOT built here: the engine has no gradient-paint capability (a paint slot resolves to one
 * flat color variable), so a gradient axis would have no paint to bind. Owner-held and filed as #1318;
 * see `anatomy.codeOnly` and `notes.unverified`.
 *
 * ── THE SHAPE: A FULL-BLEED BOX WITH A NOMINAL STANDALONE EXTENT ────────────────────────────────
 *
 * One `box` root, one `fill`, no children. A veil has no intrinsic size — in use it is full-bleed,
 * stretched to cover the image behind it — so its real geometry is a code/layout concern (the box
 * fills its container). But a STANDALONE Figma component has no parent to fill, and a fill-sized root
 * acquires no extent (`lint-standalone-floor.ts`, #869's white-box defect). So the root binds a NOMINAL
 * square side, exactly as `focus-ring` does (#1280): `size: 'nominal-side'` → `container.narrow`
 * (720px), one key driving both axes, present only so the library artifact is a wash-shaped rectangle a
 * designer resizes over their image rather than Figma's 100×100 default frame. The def is a normal
 * standalone build — neither `notStandalone` (its members acquire an extent) nor `emitAsComponents`
 * (a `value` × `intensity` set is one component set, not a folder of siblings).
 */
import { ComponentDef } from '../component-schema';

export const veil: ComponentDef = {
  id: 'veil',
  name: 'Veil',
  aliases: ['wash', 'photo-wash', 'image-overlay', 'image-scrim', 'media-wash', 'photo-overlay'],
  category: 'media',
  status: 'draft',
  description:
    'A designer-selectable wash placed over a photograph or video so text set on top of it stays legible. Full-bleed, and chosen per image: pick a DARK wash under light text or a LIGHT wash under dark text (the `value` axis), then the intensity for how much the image needs muting. The intensity is a magnitude — a stronger wash mutes the image more — not a contrast guarantee, because the result depends on the specific photo; verify contrast against your own image. Not the modal backdrop, which is a separate mode-varying fill (scrim.default) that dialogs reference directly.',

  props: [
    { name: 'value', type: "enum: 'dark' | 'light'", values: ['dark', 'light'], default: 'dark', required: false, description: 'The wash\'s polarity — a DARK wash to lift light text off the image, a LIGHT wash to lift dark text. The designer picks it per image from what the photo needs; there is no automatic choice, because which polarity a given photograph wants is a judgment about that image. Lower-case to match the veil role segment it binds (`dark` → color.veil.dark.*); a UI may still label it "Dark".' },
    { name: 'intensity', type: "enum: 'subtle' | 'medium' | 'strong'", values: ['subtle', 'medium', 'strong'], default: 'medium', required: false, description: 'How much the wash mutes the image, weakest to strongest. A magnitude, not a contrast promise — a stronger wash darkens (or lightens) the photo more, and whether the text on top clears its floor depends on the image, so verify contrast against your own photo. subtle keeps the image most present; strong mutes it most.' },
  ],

  // `[]` — a veil is not interactive. It is a static decorative wash with no hover, press or focus of
  // its own (a control placed on top carries its own states). Same claim `focus-ring` and `icon` make,
  // for the same reason: nothing here has a runtime interaction to model.
  states: [],

  // The two axes, both projected (see `figmaProperties`). No `size` axis — a veil's extent is its
  // container's, not a rung it chooses (see `nominal-side`).
  variants: {
    value: ['dark', 'light'],
    intensity: ['subtle', 'medium', 'strong'],
  },

  // ONE template, filling the full 2×3 grid. `fill` is a primary paint slot, so this slot-free template
  // answers the box's `fill`. It LEADS with the `value` axis value, and the veil roles carry that value
  // as a segment, so `lint-paint.ts` arm 1 covers every key with no exemption (see the header).
  paintKeys: ['{value}.{intensity}'],

  tokens: {
    // ── THE SIX WASH FILLS — each (value, intensity) coordinate binds the matching semantic veil role.
    // No new token name is introduced: these roles already ship (renamed by #1317), so CONTRACT_VERSION
    // stays at 10.0.0. They are appearance-invariant alpha washes, identical in every mode, which is why
    // there is no per-mode or per-state key here to resolve.
    'dark.subtle': 'color.veil.dark.subtle',
    'dark.medium': 'color.veil.dark.medium',
    'dark.strong': 'color.veil.dark.strong',
    'light.subtle': 'color.veil.light.subtle',
    'light.medium': 'color.veil.light.medium',
    'light.strong': 'color.veil.light.strong',

    // ── THE NOMINAL STANDALONE EXTENT (#1280's idiom, on `focus-ring`). A veil has no size of its own —
    // in use it is full-bleed, stretched to its container — so this exists ONLY so a standalone build is
    // a wash-shaped rectangle rather than Figma's 100×100 default frame, which is what `lint-standalone-
    // floor.ts` refuses. `container.narrow` (720px) is a semantic role, not a raw primitive, so it does
    // not trip the primitive-leak warning `test.ts` asserts against; it drives both axes through `size`,
    // and a designer resizes it over their image. Not a design decision about veil size — there is none.
    'nominal-side': 'container.narrow',
  },

  // ── ANATOMY — ONE FULL-BLEED BOX (#1030) ─────────────────────────────────────────────────────────
  //
  // A veil IS one box — a rectangle carrying one fill. No children, no border, no radius — a wash has
  // no edge and no corner of its own; it covers the image edge to edge. The `fill` slot is the whole of
  // its paint, keyed by `value` × `intensity`.
  anatomy: {
    root: 'wash',
    parts: {
      wash: {
        kind: 'box',
        // `target` because the schema requires exactly one and a one-part anatomy has one candidate —
        // NOT an interaction claim. A veil is decorative and aria-hidden (see `accessibility`); it owns
        // no hit area. Same schema-satisfying use `focus-ring`'s single box makes of the role.
        role: 'target',
        // The whole paint: one fill, keyed `value`.`intensity`. No `border` slot — a wash has no edge.
        paintSlots: ['fill'],
        // THE NOMINAL SQUARE (#1280's idiom). One key, both axes, so the standalone artifact is a
        // wash-shaped rectangle a designer resizes rather than a 100×100 default frame. NOT a variant
        // axis: a `size` axis would write a `size=` segment into every member name and there is no size
        // decision to make (see `nominal-side` in `tokens`). Overwritten by the designer's own resize;
        // in real use the box is full-bleed, which is a layout fact Figma cannot hold for a standalone
        // component (see `codeOnly`).
        size: 'nominal-side',
        note: 'The wash itself: one box, one fill, no children. Full-bleed in use — it stretches to cover the image behind it — so its standalone size is nominal and a designer resizes it. It carries no border and no radius, because a wash has no edge of its own; it covers the media edge to edge.',
      },
    },
    codeOnly: [
      // MUST LEAD with the term — `figmaPropertyErrors` matches an admission by its first word.
      'full-bleed — a veil covers its container edge to edge, which is a LAYOUT fact (the box fills its parent) that a STANDALONE Figma component cannot hold: there is no parent to fill, and a fill-sized root acquires no extent at all (the 100×100 default-frame defect `lint-standalone-floor.ts` exists for). So the standalone member binds a NOMINAL square side (`container.narrow`, 720px) and a designer resizes or sets it to fill over their image. In code the veil is an absolutely-positioned or inset overlay sized to its media container; the fixed nominal square is the placeholder that reads as a wash in the library.',
      'gradient washes — Prism 2 ships `Gradient from top/bottom/left/right` variants beside the solid ones, and they are DEFERRED (#1318, owner-held). The engine has no gradient-paint capability: a paint slot resolves to one flat color variable, so a gradient axis would have no paint to bind and would project members that carry no wash. Solid washes only here — the three intensities on each polarity.',
      'the intensity is a magnitude, not a state — subtle/medium/strong is how much the wash mutes the image, and Figma carries it as a variant coordinate a designer selects, never a runtime state. A veil has no interaction states at all (`states: []`), so there is no hover, press or focus member; a control placed on top of the veil carries its own states.',
    ],
  },

  figmaProperties: {
    // Both axes project. 2 values × 3 intensities = 6 members, one wash each. No `stateAxis` (a veil has
    // no states), no `slotAxes`, no `swaps`, no `texts` — the box carries no text and no swappable slot.
    variantAxes: ['value', 'intensity'],
    // Considered, and none survive — a wash has one fill and no togglable node. Stated rather than
    // omitted, as the schema asks.
    booleans: {},
  },

  accessibility: {
    role: 'none — a presentational overlay. The veil conveys no information of its own; it is a wash behind text, so it is aria-hidden and the text on top carries the accessible content.',
    wcag: [
      '1.4.3 Contrast (Minimum) — the veil exists to help text on an image clear 4.5:1 (or 3:1 for large text), but it cannot GUARANTEE it: the result depends on the photo, so the contrast is verified against the real image, not assumed from the wash',
      '1.4.11 Non-text Contrast — where the text under the veil is itself a UI boundary, the same per-image verification applies',
      '1.4.1 Use of Color — the wash lifts text off the image; it is not itself a carrier of meaning',
    ],
    focus: 'None — the veil is not focusable and takes no place in the tab order. It is a decorative layer behind content; the interactive elements sit on top of it and own their own focus.',
    aria: 'Mark the veil aria-hidden — it is presentational and announcing it would add nothing to the text it sits behind. Never place text INSIDE the veil node as its only home; the veil is a background layer, and the text is a sibling on top so assistive tech reads the text directly. The veil is a legibility aid, not a substitute for verified contrast: check the text against the actual image, because the wash cannot promise a ratio over an unknown photo.',
  },

  content: {
    labelPattern: 'A veil carries no text of its own — it is a wash behind other content. Where its variants are named in a UI, name the polarity and the magnitude plainly: "Dark, medium" rather than a WCAG floor, because the rung is a magnitude and not a contrast promise.',
  },

  docs: {
    usage: 'Place a veil between a photograph (or video) and the text set over it, so the text stays legible. Pick the polarity from the image and the text on it — a DARK wash under light text, a LIGHT wash under dark text — then the intensity for how much the image needs muting: subtle keeps the photo most present, strong mutes it most. The veil is full-bleed, sized to its media container, with the text and any controls as siblings on top rather than children of the wash. Treat the intensity as a starting point and VERIFY the text\'s contrast against your own image — the wash cannot guarantee a ratio over an unknown photo. For the mode-varying backdrop behind a modal, use scrim.default instead; the veil is for media.',
    do: [
      'Pick the polarity from the image — a dark wash under light text, a light wash under dark text',
      'Verify the text\'s contrast against the actual photo; the intensity is a magnitude, not a guaranteed ratio',
      'Size the veil to its media container and keep the text and controls as siblings on top of it',
      'Mark the veil aria-hidden — it is a presentational background layer',
    ],
    dont: [
      'Read the intensity as a contrast promise — a stronger wash mutes the image more, but whether text clears its floor depends on the photo',
      'Reach for a veil as the modal backdrop — that is scrim.default, a separate mode-varying fill dialogs reference directly',
      'Put the text inside the veil node — the text is a sibling on top, so assistive tech reads it directly and the wash stays decorative',
      'Expect a gradient wash — the top/bottom/left/right gradients are deferred (#1318); only solid washes exist today',
    ],
    contentGuidelines: 'The veil holds no copy. Where its variants surface in a UI, name the polarity and magnitude ("Dark, strong") rather than a contrast floor.',
  },

  ai: {
    primaryPurpose: 'Place a designer-selected wash over a photograph or video so text set on top of it stays legible, choosing the wash\'s polarity and magnitude per image.',
    whenToUse: 'Text or controls sit over a photograph or video and need to stay readable against a varied image. Pick a dark wash under light text or a light wash under dark text, then the intensity for how much the image needs muting, and verify contrast against the real photo.',
    avoidWhen: 'The overlay is the backdrop behind a modal or dialog (that is scrim.default, a mode-varying fill referenced directly, not this component), the surface behind the text is a solid color rather than an image (bind a semantic background or text role directly and the contrast is known), or a directional gradient wash is required (deferred, #1318 — only solid washes exist today).',
    commonPartners: ['icon', 'button'],
    triggerKeywords: ['veil', 'wash', 'photo wash', 'image overlay', 'image scrim', 'photo overlay', 'text over image', 'darken image', 'media wash'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['icon', 'button'],
    alternativeTo: ['scrim'],
    supersedes: [
      'a hand-tuned semi-transparent rectangle over an image with an ad-hoc opacity',
    ],
    // Nothing supersedes the veil for a media wash — the modal backdrop (scrim) is a sibling used for a
    // different job (modality), not a replacement.
    supersededBy: [],
  },

  notes: {
    contested: [
      'THE FILL SLOT IS `fill`, NOT `overlay`, and that is the brief\'s call rather than an oversight. A veil IS conceptually a tint over whatever is beneath it, which is what `BOX_PAINT_SLOTS`\' `overlay` slot names — and `lint-paint.ts` arm 4 excludes `overlay` from its redundant-edge measurement for exactly that reason (a tint\'s alpha would be mis-measured as opaque). The veil binds `fill` because the wash IS the box\'s whole paint here — there is no ground fill beneath it that the wash sits over WITHIN this component; the image it washes is a sibling behind the veil node, not a fill on it. `fill` and `overlay` would resolve the same variable and reach the same node; `fill` is the primary slot and the one a slot-free paint template answers, which keeps the grammar to a single template.',
      'THE `value` VALUES ARE LOWER-CASE `dark`/`light`, not the capitalized `Dark`/`Light` a UI shows, and that is forced by `lint-paint.ts` arm 1 rather than a style choice. Arm 1 splits a paint key\'s ref on `.` and checks the key\'s LEAD segment is a member — so a key led by `Dark` binding `color.veil.dark.*` would fail, because `dark` (the role segment) is not `Dark` (the lead). The corpus convention is lower-case axis values anyway (`unchecked`, `off`, `filled`, `regular`), with the capitalized form left to the UI label; `weight` makes the same split (`bold` → `type.body.*.strong`). So the KEY carries the lower-case axis value and the REF carries the matching lower-case role segment, and arm 1 covers every veil fill with no exemption. Spelling the values `Dark`/`Light` would need six `PROVENANCE_EXCEPTIONS` entries for no gain, which is fixing a false positive by narrowing a scan — the move this repo forbids.',
    ],
    unverified: [
      'THE GRADIENT WASHES ARE DEFERRED (#1318). Prism 2\'s veil carries `Gradient from top/bottom/left/right` beside the solid washes, and the engine has no gradient-paint capability — a paint slot resolves to one flat color variable — so they cannot be bound today. Owner-held; when the engine grows gradient paint, they are a fourth axis (direction) or a second component. Named here and in `anatomy.codeOnly` so the absence reads as a deferral rather than a gap.',
      'THE NOMINAL SIZE IS A PLACEHOLDER, NOT A MEASUREMENT (#1280\'s idiom). `container.narrow` (720px) is what makes the standalone build a wash-shaped rectangle; a veil has no intrinsic size, so nobody has decided 720px is RIGHT — it is a legible placeholder a designer resizes. In real use the box is full-bleed, sized to its media container, which no standalone Figma component can express. If a nested or laid-out veil is ever found stuck at 720px, the fix is the consumer sizing it to its container, not a change here.',
      'THE CONTRAST IS PER-IMAGE AND UNVERIFIABLE HERE — the whole reason #1317 renamed the rungs from WCAG floors to intensities. The engine derives each alpha as the least step clearing a floor against the WORST pixel of an UNKNOWN image, so the wash\'s effect on a REAL photo\'s combined contrast depends on that photo. This component cannot gate it; the accessibility and docs prose says to verify against the actual image, and there is no engine check that can stand in for that.',
    ],
  },
};
