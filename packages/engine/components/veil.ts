/**
 * Veil — the designer-selectable WASH a designer places over a photograph so text set on top of it
 * stays legible (#1030, renamed #1317, built here). A standalone, full-bleed overlay, and the FIRST
 * component whose whole job is to bind the semantic `veil.*` roles into a component surface.
 *
 * No KB brief: the catalogue has no veil or scrim brief, and nothing below cites one. Category
 * `foundations` — a media surface beside `image-placeholder`, whose brief (`image.md`) is Foundations.
 * Not `overlay`: in the KB that category is the floating layers (dialog, popover, tooltip), and a veil is
 * a wash inside the layout, not a layer above it.
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
 * already ship — so `token-contract.ts --check` stays green and `CONTRACT_VERSION` did not move for it
 * (10.0.0 when the def landed). A prior build tried to bind the raw alpha PRIMITIVES (`black-alpha.*` / `white-alpha.*`)
 * and hit the wall this repo's semantic-layer rule exists to raise; binding the semantic `veil.*`
 * roles is the accepted path — the same shape as `button` binding `color.field.*` rather than a
 * palette step.
 *
 * ── TWO AXIS NAMES REOPEN THE CLOSED `VARIANT_AXES` LIST (owner-decided names) ───────────────────
 *
 * `value` and `intensity` are new entries in `VARIANT_AXES`, a list #756 deliberately closed. The
 * names are the owner's decision (the component's variant API is a design call); reopening the list to
 * honor them is the mechanical fallout, and each is held to that list's own bar — a distinct kind of
 * distinction no existing name expresses. `intensity` (a wash's magnitude) is nearest to `weight` (type
 * heaviness) and `appearance` (a control's emphasis/render strategy) and is neither: it is how STRONG
 * an overlay is, which no other axis names. `value` (a dark-vs-light lightness polarity) is nearest to
 * `tone` (which semantic ink role) and `surface` (which ground a control sits ON) and is neither: it is
 * the wash's OWN lightness, in the color-theory sense of value. `lint-axis-values.ts` carries both as
 * `sole` sets with the same reasons.
 *
 * ── THE PAINT GRAMMAR IS AXIS-LED, AND ARM 1 COVERS IT FOR FREE ─────────────────────────────────
 *
 * `paintKeys: ['{value}.{intensity}']` — one template, filling the value × intensity grid (`dark.subtle` …
 * `light.strong`) at every `direction`; a gradient member takes the same key as its first stop. The box's `fill` slot is a `PRIMARY_PAINT_SLOTS` member, so a slot-free template
 * answers it (`anatomy-figma.ts`). The key LEADS with a `value` axis value, and the veil role it binds
 * carries that value as a path segment (`dark.subtle` → `color.veil.dark.subtle`), so `lint-paint.ts`
 * arm 1's provenance rule covers this def with no exemption — a `dark` coordinate pointed at a `light`
 * role fails by name. No `NON_FAMILY_AXES` entry is needed, which is the difference from `selection`:
 * the veil roles ARE a family named for the axis value.
 *
 * ── THE THIRD AXIS: `direction`, AND THE GRADIENT WASHES IT OPENS (#1318, owner-decided 2026-09-28) ──
 *
 * Prism 2's veil carries `Gradient from top/bottom/left/right` beside the solid wash. They were deferred
 * while a paint slot could only resolve to one flat color variable; #1318 gave a box a GRADIENT form of its
 * fill (`PartDef.gradient`), and the owner's three decisions shape what this def binds:
 *
 *   1. A new axis `direction` — `full | from-top | from-bottom | from-left | from-right`, default `full`.
 *      `full` is the solid wash every member was before this change, and those six members bind the same
 *      fill as they did. The grid is value(2) × intensity(3) × direction(5) = 30 members.
 *   2. The fade is two stops, linear: the (value, intensity) role at FULL strength on the named edge, to
 *      clear on the opposite edge. `from-top` is strongest at the top.
 *   3. The clear end is its own role per polarity, `veil.dark.clear` / `veil.light.clear` — 0% black and 0%
 *      WHITE. Figma interpolates gradient stops unpremultiplied, so a light veil fading to clear black would
 *      pass through gray.
 *
 * The CSS angle per direction lives on the part (`gradient.angles`), stated as the direction the gradient
 * RUNS from stop 0: `from-top` is 180 (`to bottom`), `from-bottom` 0 (`to top`), `from-left` 90 (`to
 * right`), `from-right` 270 (`to left`). The far stop is `{value}.clear`, so a light member fades to the
 * light clear and a dark one to the dark clear — `lint-paint.ts` checks both stops against the coordinate's
 * own `value`.
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
 * (a `value` × `intensity` × `direction` set is one component set, not a folder of siblings).
 */
import { ComponentDef } from '../component-schema';

export const veil: ComponentDef = {
  id: 'veil',
  name: 'Veil',
  aliases: ['wash', 'photo-wash', 'image-overlay', 'image-scrim', 'media-wash', 'photo-overlay'],
  // `foundations` (#1700) — no brief, so a stated choice; the header gives the reason.
  category: 'foundations',
  status: 'draft',
  summary: 'Wash over media so text stays legible, solid or fading from one edge. Verify contrast.',
  description:
    'A designer-selectable wash placed over a photograph or video so text set on top of it stays legible. Full-bleed, and chosen per image: pick a DARK wash under light text or a LIGHT wash under dark text (the `value` axis), then the intensity for how much the image needs muting, then the direction — a solid wash over the whole image, or one strongest at the edge the text sits on and fading to clear at the opposite edge. The intensity is a magnitude — a stronger wash mutes the image more — not a contrast guarantee, because the result depends on the specific photo; verify contrast against your own image. Not the modal backdrop, which is a separate mode-varying fill (scrim.default) that dialogs reference directly.',

  props: [
    { name: 'value', type: "enum: 'dark' | 'light'", values: ['dark', 'light'], default: 'dark', required: false, description: 'The wash\'s polarity — a DARK wash to lift light text off the image, a LIGHT wash to lift dark text. The designer picks it per image from what the photo needs; there is no automatic choice, because which polarity a given photograph wants is a judgment about that image.' },
    { name: 'intensity', type: "enum: 'subtle' | 'medium' | 'strong'", values: ['subtle', 'medium', 'strong'], default: 'medium', required: false, description: 'How much the wash mutes the image, weakest to strongest. A magnitude, not a contrast promise — a stronger wash darkens (or lightens) the photo more, and whether the text on top clears its floor depends on the image, so verify contrast against your own photo. subtle keeps the image most present; strong mutes it most.' },
    { name: 'direction', type: "enum: 'full' | 'from-top' | 'from-bottom' | 'from-left' | 'from-right'", values: ['full', 'from-top', 'from-bottom', 'from-left', 'from-right'], default: 'full', required: false, description: 'Where the wash sits. full is a solid wash over the whole image. from-top, from-bottom, from-left and from-right put the full intensity at that edge and fade linearly to clear at the opposite edge — for text that sits along one edge, so the rest of the photo stays unmuted. The intensity applies at the named edge only, so verify contrast where the text actually sits.' },
  ],

  // `[]` — a veil is not interactive. It is a static decorative wash with no hover, press or focus of
  // its own (a control placed on top carries its own states). Same claim `focus-ring` and `icon` make,
  // for the same reason: nothing here has a runtime interaction to model.
  states: [],

  // The three axes, all projected (see `figmaProperties`). No `size` axis — a veil's extent is its
  // container's, not a rung it chooses (see `nominal-side`). `direction` is #1318's: `full` is the solid
  // wash, and the four edges are the gradient forms `anatomy.parts.wash.gradient` projects.
  variants: {
    value: ['dark', 'light'],
    intensity: ['subtle', 'medium', 'strong'],
    direction: ['full', 'from-top', 'from-bottom', 'from-left', 'from-right'],
  },
  // WHEN each axis changes (#1611): runtime axes are held to one footprint, authoring axes are not. A
  // direction is chosen per image, like the other two.
  axisKinds: { value: 'authoring', intensity: 'authoring', direction: 'authoring' },

  // ONE template, filling the value × intensity grid at every direction (a gradient member's first stop). `fill` is a primary paint slot, so this slot-free template
  // answers the box's `fill`. It LEADS with the `value` axis value, and the veil roles carry that value
  // as a segment, so `lint-paint.ts` arm 1 covers every key with no exemption (see the header).
  paintKeys: ['{value}.{intensity}'],

  tokens: {
    // ── THE SIX WASH FILLS — each (value, intensity) coordinate binds the matching semantic veil role.
    // No new token name is introduced: these roles already ship (renamed by #1317), so CONTRACT_VERSION
    // does not move for them. They are appearance-invariant alpha washes, identical in every mode, which is why
    // there is no per-mode or per-state key here to resolve.
    'dark.subtle': 'color.veil.dark.subtle',
    'dark.medium': 'color.veil.dark.medium',
    'dark.strong': 'color.veil.dark.strong',
    'light.subtle': 'color.veil.light.subtle',
    'light.medium': 'color.veil.light.medium',
    'light.strong': 'color.veil.light.strong',

    // ── THE CLEAR ENDS (#1318) — the far stop of a directional wash, one per polarity, named by the part's
    // `gradient.fadeTo` (`{value}.clear`). Lead with the `value` axis value like the six above, so
    // `lint-paint.ts` arm 1 checks each against the role it binds. 0% black and 0% WHITE: a light wash fading
    // to clear black would pass through gray, because Figma interpolates stops unpremultiplied. New roles in
    // the token tier (CONTRACT 13.2.0), appearance-invariant like the rungs.
    'dark.clear': 'color.veil.dark.clear',
    'light.clear': 'color.veil.light.clear',

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
  // its paint, keyed by `value` × `intensity`; at a directional member that fill becomes a gradient's
  // first stop (`gradient`, #1318).
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
        // THE DIRECTIONAL FORM OF THE FILL (#1318). At `direction=full` nothing here applies and the box
        // paints its solid fill. At each edge the fill runs from the (value, intensity) role at the named
        // edge (stop 0) to `{value}.clear` at the opposite edge (stop 1). The angles are CSS
        // `linear-gradient()` angles — the direction the gradient runs FROM stop 0 — so `from-top` is 180,
        // CSS `to bottom`, with stop 0 on the top edge.
        gradient: {
          axis: 'direction',
          angles: { 'from-top': 180, 'from-bottom': 0, 'from-left': 90, 'from-right': 270 },
          fadeTo: '{value}.clear',
        },
        // THE NOMINAL SQUARE (#1280's idiom). One key, both axes, so the standalone artifact is a
        // wash-shaped rectangle a designer resizes rather than a 100×100 default frame. NOT a variant
        // axis: a `size` axis would write a `size=` segment into every member name and there is no size
        // decision to make (see `nominal-side` in `tokens`). Overwritten by the designer's own resize;
        // in real use the box is full-bleed, which is a layout fact Figma cannot hold for a standalone
        // component (see `codeOnly`).
        size: 'nominal-side',
        note: 'The wash itself: one box, one fill, no children. Full-bleed in use — it stretches to cover the image behind it — so its standalone size is nominal and a designer resizes it. It carries no border and no radius, because a wash has no edge of its own; it covers the media edge to edge. At a directional member the fill is a two-stop linear gradient, the chosen intensity at the named edge fading to clear at the opposite one.',
      },
    },
    codeOnly: [
      // MUST LEAD with the term — `figmaPropertyErrors` matches an admission by its first word.
      'full-bleed — a veil covers its container edge to edge, which is a LAYOUT fact (the box fills its parent) that a STANDALONE Figma component cannot hold: there is no parent to fill, and a fill-sized root acquires no extent at all (the 100×100 default-frame defect `lint-standalone-floor.ts` exists for). So the standalone member binds a NOMINAL square side (`container.narrow`, 720px) and a designer resizes or sets it to fill over their image. In code the veil is an absolutely-positioned or inset overlay sized to its media container; the fixed nominal square is the placeholder that reads as a wash in the library.',
      'directional washes in code — a `from-*` member is a CSS linear gradient from the veil role at the named edge to the clear role at the opposite edge, two stops. from-top is `linear-gradient(to bottom, var(--color-veil-dark-strong), var(--color-veil-dark-clear))` for a dark strong veil; from-bottom is `to top`, from-left `to right`, from-right `to left`. Use `light` on both stops for a light veil. `full` is the solid role alone (`background: var(--color-veil-dark-strong)`). A browser interpolates the stops premultiplied, so its fade never passes through gray; Figma interpolates them unpremultiplied, which is why each polarity has its own clear end — clear white for a light veil — so the fade keeps the wash\'s hue on both.',
      'the intensity is a magnitude, not a state — subtle/medium/strong is how much the wash mutes the image, and Figma carries it as a variant coordinate a designer selects, never a runtime state. A veil has no interaction states at all (`states: []`), so there is no hover, press or focus member; a control placed on top of the veil carries its own states.',
    ],
  },

  figmaProperties: {
    // All three axes project. 2 values × 3 intensities × 5 directions = 30 members, one wash each — the six
    // `full` members solid, the 24 directional ones a gradient. No `stateAxis` (a veil has no states), no
    // `slotAxes`, no `swaps`, no `texts` — the box carries no text and no swappable slot.
    variantAxes: ['value', 'intensity', 'direction'],
    // Considered, and none survive — a wash has one fill and no togglable node. Stated rather than
    // omitted, as the schema asks.
    booleans: {},
  },

  accessibility: {
    role: 'none — a presentational overlay. The veil conveys no information of its own; it is a wash behind text, so it is aria-hidden and the text on top carries the accessible content.',
    wcag: [
      '1.4.3 Contrast (Minimum) — the veil exists to help text on an image clear 4.5:1 (or 3:1 for large text), but it cannot GUARANTEE it: the result depends on the photo, so the contrast is verified against the real image, not assumed from the wash',
      '1.4.11 Non-text Contrast — where content on the veil is itself a UI boundary, the same per-image verification applies',
      '1.4.1 Use of Color — the wash lifts text off the image; it is not itself a carrier of meaning',
    ],
    focus: 'None — the veil is not focusable and takes no place in the tab order. It is a decorative layer behind content; the interactive elements sit on top of it and own their own focus.',
    aria: 'Mark the veil aria-hidden — it is presentational and announcing it would add nothing to the text it sits behind. Never place text INSIDE the veil node as its only home; the veil is a background layer, and the text is a sibling on top so assistive tech reads the text directly. The veil is a legibility aid, not a substitute for verified contrast: check the text against the actual image, because the wash cannot promise a ratio over an unknown photo.',
  },

  content: {
    labelPattern: 'A veil carries no text of its own — it is a wash behind other content. Where its variants are named in a UI, name the polarity and the magnitude plainly: "Dark, medium" rather than a WCAG floor, because the rung is a magnitude and not a contrast promise.',
  },

  docs: {
    usage: 'Place a veil between a photograph (or video) and the text set over it, so the text stays legible. Pick the polarity from the image and the text on it — a DARK wash under light text, a LIGHT wash under dark text — then the intensity for how much the image needs muting: subtle keeps the photo most present, strong mutes it most. Then the direction: full for text anywhere on the image, or a from-top, from-bottom, from-left or from-right fade when the text sits along one edge — the wash is at full intensity on that edge and clear at the opposite one, so the rest of the photo stays unmuted. The veil is full-bleed, sized to its media container, with the text and any controls as siblings on top rather than children of the wash. Treat the intensity as a starting point and VERIFY the text\'s contrast against your own image — the wash cannot guarantee a ratio over an unknown photo. For the mode-varying backdrop behind a modal, use scrim.default instead; the veil is for media.',
    do: [
      'Pick the polarity from the image — a dark wash under light text, a light wash under dark text',
      'Use a directional wash from the edge the text sits on — from-bottom for a caption along the bottom',
      'Verify the text\'s contrast against the actual photo; the intensity is a magnitude, not a guaranteed ratio',
      'Size the veil to its media container and keep the text and controls as siblings on top of it',
      'Mark the veil aria-hidden — it is a presentational background layer',
    ],
    dont: [
      'Read the intensity as a contrast promise — a stronger wash mutes the image more, but whether text clears its floor depends on the photo',
      'Reach for a veil as the modal backdrop — that is scrim.default, a separate mode-varying fill dialogs reference directly',
      'Put the text inside the veil node — the text is a sibling on top, so assistive tech reads it directly and the wash stays decorative',
      'Set text in the clear half of a directional wash — the intensity holds only at the named edge, so text away from it sits on the unmuted photo',
    ],
    contentGuidelines: 'The veil holds no copy. Where its variants surface in a UI, name the polarity and magnitude ("Dark, strong") rather than a contrast floor.',
  },

  ai: {
    primaryPurpose: 'Place a designer-selected wash over a photograph or video so text set on top of it stays legible, choosing the wash\'s polarity and magnitude per image.',
    whenToUse: 'Text or controls sit over a photograph or video and need to stay readable against a varied image. Pick a dark wash under light text or a light wash under dark text, then the intensity for how much the image needs muting, then the direction — full for text anywhere, or a fade from the edge the text sits on — and verify contrast against the real photo where the text sits.',
    avoidWhen: 'The overlay is the backdrop behind a modal or dialog (that is scrim.default, a mode-varying fill referenced directly, not this component), the surface behind the text is a solid color rather than an image (bind a semantic background or text role directly and the contrast is known), or the text sits in the clear half of a directional wash (move it to the named edge or use full).',
    // What sits ON a veil (text, an icon, a button) and what it sits over (`image-placeholder`'s frame).
    // None is nested, so all are partners (#1700).
    commonPartners: ['icon', 'button', 'image-placeholder'],
    triggerKeywords: ['veil', 'wash', 'photo wash', 'image overlay', 'image scrim', 'photo overlay', 'text over image', 'darken image', 'media wash', 'gradient scrim', 'gradient overlay', 'fade overlay'],
    generationPriority: 3,
  },

  composition: {
    // Nests nothing (#1700): the veil is one box, and what sits on it is a sibling.
    composesWith: [],
    alternativeTo: [],
    replacesPatterns: [
      'a hand-tuned semi-transparent rectangle over an image with an ad-hoc opacity',
    ],
    // Nothing supersedes the veil for a media wash — the modal backdrop (scrim) is a sibling used for a
    // different job (modality), not a replacement.
    supersededBy: [],
    planned: ['scrim'],
  },

  notes: {
    contested: [
      'THE FILL SLOT IS `fill`, NOT `overlay`, and that is a call made in this def rather than an oversight (there is no brief to make it). A veil IS conceptually a tint over whatever is beneath it, which is what `BOX_PAINT_SLOTS`\' `overlay` slot names — and `lint-paint.ts` arm 4 excludes `overlay` from its redundant-edge measurement for exactly that reason (a tint\'s alpha would be mis-measured as opaque). The veil binds `fill` because the wash IS the box\'s whole paint here — there is no ground fill beneath it that the wash sits over WITHIN this component; the image it washes is a sibling behind the veil node, not a fill on it. `fill` and `overlay` would resolve the same variable and reach the same node; `fill` is the primary slot and the one a slot-free paint template answers, which keeps the grammar to a single template.',
      'THE `value` VALUES ARE LOWER-CASE `dark`/`light`, not the capitalized `Dark`/`Light` a UI shows, and that is forced by `lint-paint.ts` arm 1 rather than a style choice. Arm 1 splits a paint key\'s ref on `.` and checks the key\'s LEAD segment is a member — so a key led by `Dark` binding `color.veil.dark.*` would fail, because `dark` (the role segment) is not `Dark` (the lead). The corpus convention is lower-case axis values anyway (`unchecked`, `off`, `filled`, `regular`), with the capitalized form left to the UI label; `weight` makes the same split (`bold` → `type.body.*.strong`). So the KEY carries the lower-case axis value and the REF carries the matching lower-case role segment, and arm 1 covers every veil fill with no exemption. Spelling the values `Dark`/`Light` would need six `PROVENANCE_EXCEPTIONS` entries for no gain, which is fixing a false positive by narrowing a scan — the move this repo forbids.',
    ],
    unverified: [
      'A DIRECTIONAL WASH\'S CONTRAST IS HIGHEST AT ITS NAMED EDGE AND FALLS TO NONE AT THE OPPOSITE ONE (#1318). The intensity rungs were derived for a SOLID wash over the worst pixel; a fade meets that only on its first stop, so text placed toward the clear end sits on less wash than the rung name suggests. Nothing here can gate where a designer puts the text, so the usage prose says to verify contrast where the text sits.',
      'THE NOMINAL SIZE IS A PLACEHOLDER, NOT A MEASUREMENT (#1280\'s idiom). `container.narrow` (720px) is what makes the standalone build a wash-shaped rectangle; a veil has no intrinsic size, so nobody has decided 720px is RIGHT — it is a legible placeholder a designer resizes. In real use the box is full-bleed, sized to its media container, which no standalone Figma component can express. If a nested or laid-out veil is ever found stuck at 720px, the fix is the consumer sizing it to its container, not a change here.',
      'THE CONTRAST IS PER-IMAGE AND UNVERIFIABLE HERE — the whole reason #1317 renamed the rungs from WCAG floors to intensities. The engine derives each alpha as the least step clearing a floor against the WORST pixel of an UNKNOWN image, so the wash\'s effect on a REAL photo\'s combined contrast depends on that photo. This component cannot gate it; the accessibility and docs prose says to verify against the actual image, and there is no engine check that can stand in for that.',
    ],
  },
};
