/**
 * Image placeholder — the empty-state MEDIA FRAME a designer drops a photograph into (#1316, built
 * here). A neutral fill, a centered `image` glyph as the "no image" marker, and — the elegant core of
 * this def — an aspect-ratio LOCK that keeps the frame's proportion while its actual size flexes.
 *
 * ── WHAT IT IS ──────────────────────────────────────────────────────────────────────────────────
 *
 * A rectangle sized to one of three ratios (`1:1`, `4:3`, `16:9`) that reads as "an image goes here".
 * The raster swap itself is a NATIVE Figma action — a designer drops an image fill onto the frame — so
 * this def does not model the image; it models the frame that holds it and the empty state before one
 * arrives. `clipsContent: true` so a dropped photo that is the wrong size cannot overflow the frame.
 *
 * ── THE ASPECT LOCK, AND WHY IT IS A LOCK RATHER THAN TWO DIMENSIONS (owner Option A, 2026-09-07) ──
 *
 * The ratio must stay FIXED while the container's real width and height FLEX. The obvious shape — bind a
 * width token and a height token per ratio — is exactly the shape the engine has always had to strip
 * (`anatomy-figma.ts`'s `unlockAspectRatio`): a Figma node cannot hold two independent dimension
 * bindings while its aspect ratio is locked, and it cannot hold a ratio without the lock, so the second
 * `setBoundVariable` evicts the first. It would also be WRONG on its own terms: dimension tokens vary
 * per brand, so a two-binding frame would change RATIO when a brand re-derived its dimensions, which is
 * the one thing this component exists to hold constant.
 *
 * So the ratio is a component-STRUCTURE property, not a token. The box binds ONE nominal dimension
 * (`width` → `container.narrow`, the veil idiom) and declares `aspectRatio: 'ratio'`; the projector
 * parses the member's own `ratio` value (`16:9` → 16/9) onto the plan, and both executors resize the
 * frame to that proportion and call `lockAspectRatio()`, so Figma DERIVES the height from the width. The
 * ratio is never a DTCG token and never touches TokenPress — ecosystem impact is nil, and
 * `CONTRACT_VERSION` stands at 10.0.0 (this def binds only existing roles).
 *
 * ── THE ONE THING THE OFFLINE BUILD CANNOT PROVE (the paste-time-derive risk) ────────────────────
 *
 * Figma's docs establish that a locked node resized on ONE axis derives the other, and `targetAspectRatio`
 * is read-only. That a `setBoundVariable` on the single axis triggers the SAME derive is the same class
 * of behavior, but it is a LIVE-PASTE fact no offline host can witness — exactly the accept-and-discard
 * boundary the round-trip gate names as real-Figma-only. What the offline gates DO prove: the plan carries
 * the ratio, and the built frame's `targetAspectRatio` reads back as the ratio its coordinate names
 * (`test-roundtrip.ts`'s aspect-lock block, against an independently authored contract). The derive-on-
 * paste itself is filed for the real-host arm (`tools/component-roundtrip/`), same posture as the ring's
 * resize note. Option A held — no fallback to Option C — because nothing falsified it: the lock is
 * captured with the right ratio, and Figma's own lock contract supplies the rest.
 *
 * ── THE NEUTRAL ROLES IT BINDS, AND WHY EACH ────────────────────────────────────────────────────
 *
 * `fill` → `color.background.secondary`: the neutral surface one step off the page, so an empty
 * placeholder reads as a FILLED media frame distinct from the page behind it rather than a hole. `icon`
 * → `color.icon.tertiary`: the most muted icon ink, right for a de-emphasized "no image" marker that
 * signals absence without competing with real content. Both are existing semantic roles, so no new token
 * is introduced. The glyph is decorative (`aria-hidden`), so `icon.tertiary` is not held to a text
 * contrast floor; a designer should still confirm it reads against their brand's `background.secondary`.
 *
 * ── DEFERRED TO A FOLLOW-UP (#1316 residue) ─────────────────────────────────────────────────────
 *
 * The optional SCRIM/veil overlay (a wash for text set over the image) and the PLAY-CIRCLE overlay (a
 * video affordance) are NOT built here. Both nest other components — the `veil` def and the `play-circle`
 * glyph — and this PR is the core empty-state aspect-locked frame. Named in `codeOnly` and
 * `notes.unverified` so the absence reads as a deferral rather than a gap.
 */
import { ComponentDef } from '../component-schema';

export const imagePlaceholder: ComponentDef = {
  id: 'image-placeholder',
  name: 'Image placeholder',
  aliases: ['media-frame', 'image-frame', 'photo-placeholder', 'empty-image', 'image-slot'],
  category: 'media',
  status: 'draft',
  description:
    'An empty-state media frame that holds a photograph at a fixed aspect ratio. Pick a ratio (1:1, 4:3 or 16:9) and the frame keeps that proportion while its size flexes to its container; a designer drops an image fill onto it (a native Figma action, not a modelled slot). Before an image arrives it shows a neutral fill and a centered "no image" marker, and it clips its content so a mismatched photo cannot overflow the frame.',

  props: [
    { name: 'ratio', type: "enum: '1:1' | '4:3' | '16:9'", values: ['1:1', '4:3', '16:9'], default: '4:3', required: false, description: 'The width-to-height PROPORTION the frame holds while its actual size flexes — a square (1:1), the classic photo ratio (4:3), or widescreen (16:9). It is an aspect-ratio LOCK, not a pair of fixed dimensions: the frame derives its height from its width (or the reverse) so the shape survives being resized. Pick it from the media the frame will hold.' },
  ],

  // `[]` — an image placeholder is not interactive of itself. Dropping an image onto it is a native
  // Figma edit, not a runtime state, and the frame carries no hover/press/focus. Same claim `veil`,
  // `focus-ring` and `icon` make, for the same reason: nothing here has an interaction to model.
  states: [],

  // The one axis, projected (see `figmaProperties`). No `size` axis — the frame's extent is its
  // container's, held to a ratio, not a rung it chooses.
  variants: {
    ratio: ['1:1', '4:3', '16:9'],
  },

  // ONE template answering both primary slots by name: the box's `fill` and the marker's `icon` ink.
  // Constant per slot (no axis), exactly as `field-label`'s `['{slot}']` is — the ratio axis changes the
  // frame's PROPORTION (a structure property, via `aspectRatio`), not its paint.
  paintKeys: ['{slot}'],

  tokens: {
    // THE NEUTRAL SURFACE FILL — one step off the page, so the empty frame reads as filled rather than a
    // hole. An existing semantic role, so no new token and CONTRACT stays 10.0.0.
    fill: 'color.background.secondary',
    // THE MUTED "NO IMAGE" MARKER — the most de-emphasized icon ink, signalling absence.
    icon: 'color.icon.tertiary',
    // THE SINGLE NOMINAL DIMENSION (the veil idiom, #1030/#1280). `container.narrow` (720px) is a
    // semantic role, not a raw primitive, so it does not trip the primitive-leak warning `test.ts`
    // asserts against. Bound to WIDTH alone; the aspect lock derives the height. Present so a standalone
    // build is a media-shaped rectangle rather than Figma's 100x100 default frame, which is what
    // `lint-standalone-floor.ts` refuses — a designer resizes it over their layout.
    'nominal-side': 'container.narrow',
    // THE MARKER GLYPH ARTBOARD — `icon.size.lg`, the largest icon rung, so the "no image" marker reads
    // as a prominent empty-state affordance rather than a stray small icon in a large frame.
    'glyph-size': 'icon.size.lg',
  },

  // ── ANATOMY — A CLIPPING BOX WITH A CENTERED MARKER ─────────────────────────────────────────────
  //
  // One `box` root carrying the neutral fill and the aspect lock, with one centered `image` glyph. The
  // box is the a11y target (it owns the frame a designer interacts with); the glyph is the decorative
  // "no image" marker.
  anatomy: {
    root: 'frame',
    parts: {
      frame: {
        kind: 'box',
        // `target` because the schema requires exactly one and the frame is what a designer selects,
        // resizes and drops an image onto. The marker below is decorative.
        role: 'target',
        // THE ASPECT-RATIO LOCK, derived from the `ratio` axis VALUE (#1316). The box binds ONE nominal
        // dimension (`width`) and the lock supplies the other — binding both would be the eviction case
        // this capability exists to replace. `sizing.y: 'fixed'` states that the height is CONTROLLED
        // (by the lock), not hugging the glyph.
        aspectRatio: 'ratio',
        width: 'nominal-side',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        // CLIPS, so a dropped photo the wrong size cannot spill past the frame edge. This is the one box
        // in the corpus that opts into clipping (#1316); every other box keeps Figma's-off default.
        clipsContent: true,
        paintSlots: ['fill'],
        children: ['marker'],
        note: 'The media frame: a neutral fill, an aspect-ratio lock, and clipping so a dropped image stays inside. Its width is nominal (720px) and a designer resizes it; the ratio holds while the size flexes.',
      },
      marker: {
        kind: 'vector',
        // The "no image" glyph (#1316's `image` icon — a mountain-and-sun placeholder). Decorative; the
        // frame carries the accessible role.
        glyph: 'image',
        // A SQUARE ARTBOARD. `size` binds both axes to one key (the glyph is square), legal on a NON-root
        // vector — this def IS the host and the glyph node IS its slot, so the size is the def's to state.
        size: 'glyph-size',
        note: 'The centered "no image" marker — a muted glyph shown until a photograph is dropped in.',
      },
    },
    codeOnly: [
      // MUST LEAD with the term — `figmaPropertyErrors` matches an admission by its first word.
      'aspect-lock derive — the frame holds its RATIO while its real size flexes, and Figma expresses that as an aspect-ratio LOCK (`lockAspectRatio()`) that DERIVES the second dimension from the first. The engine binds ONE nominal dimension and locks the ratio; that a variable BINDING on the single axis makes Figma derive the other at PASTE time (as a resize does) is a live-file behavior no offline host can witness, filed for the real-host round-trip arm (`tools/component-roundtrip/`). What the offline gates hold is the lock capturing the right ratio, read back as `targetAspectRatio`.',
      'raster swap — dropping an actual photograph onto the frame is a NATIVE Figma action (an image fill), not a modelled slot or variant. This def models the frame and its empty state; the image the designer supplies is theirs.',
      'scrim/veil and play-circle overlays — DEFERRED to a follow-up (#1316 residue, owner-held). A wash for text over the image nests the `veil` component, and a video affordance nests the `play-circle` glyph; both are compositions this core empty-state frame does not carry. Named here so the absence reads as a deferral rather than a gap.',
      'the ratio is a magnitude of SHAPE, not a state — 1:1 / 4:3 / 16:9 is a proportion a designer selects, carried by Figma as a variant coordinate, never a runtime state. An image placeholder has no interaction states at all (`states: []`).',
    ],
  },

  figmaProperties: {
    // One axis, three ratios, three members. No `stateAxis` (no states), no `slotAxes`/`swaps`/`texts`
    // — the frame carries no text and no swappable slot (the raster swap is native, not a component
    // property).
    variantAxes: ['ratio'],
    // Considered, and none survive — the frame has one fill, one marker, and no togglable node. Stated
    // rather than omitted, as the schema asks.
    booleans: {},
  },

  accessibility: {
    role: 'img — the frame stands in for an image, so it takes an image role and an accessible name describing what the image is (or will be). The "no image" marker inside it is decorative and aria-hidden; it is a visual affordance, not the accessible content.',
    wcag: [
      '1.1.1 Non-text Content — an image placeholder that ships as a real image needs a text alternative describing it; the empty-state marker is decorative and is hidden from assistive tech',
      '1.4.11 Non-text Contrast — where the frame edge is a meaningful boundary, verify it against the surface behind it; the neutral fill is a background, not a UI boundary carrying meaning',
      '1.4.1 Use of Color — the marker signals "no image" by shape and position, not by color alone',
    ],
    focus: 'None of its own — the frame is not focusable as an empty placeholder. If it becomes an interactive media element (a button that opens a picker), that control carries its own focus; the placeholder frame does not invent one.',
    aria: 'Give the frame an img role and a descriptive accessible name once it holds a real image. Mark the "no image" marker aria-hidden — it is a decorative affordance, and announcing it would add nothing. Do not rely on the marker as the accessible description of the eventual image.',
  },

  content: {
    labelPattern: 'An image placeholder carries no text of its own. Where its ratio variants surface in a UI, name the proportion plainly — "16:9", "Square" — rather than a pixel dimension, because the frame holds a ratio and not a fixed size.',
  },

  docs: {
    usage: 'Use an image placeholder wherever a layout reserves space for a photograph before one is chosen — a card\'s media slot, a hero, a gallery cell. Pick the ratio from the media it will hold (1:1 for avatars and square thumbnails, 4:3 for standard photography, 16:9 for video stills and wide banners); the frame keeps that proportion while it flexes to its container, so a row of cards stays aligned even as their widths change. Drop a photograph onto the frame as an image fill — a native Figma action. The frame clips its content, so a mismatched image stays inside the ratio rather than overflowing.',
    do: [
      'Pick the ratio from the media the frame will hold, and let the lock keep it while the size flexes',
      'Drop the photograph on as an image fill — the frame is the container, not a swappable slot',
      'Give a real image an accessible name; keep the empty-state marker decorative and aria-hidden',
      'Let the frame clip — a photo cropped to the ratio reads better than one that overflows the layout',
    ],
    dont: [
      'Hard-code a width AND a height to fake a ratio — the frame holds the ratio and derives the second dimension, so two fixed sizes fight the lock and break on resize',
      'Treat the "no image" marker as the image\'s description — it is a placeholder affordance, replaced when a photograph arrives',
      'Reach for an image placeholder as a decorative wash over a photo — that is the `veil` component (a follow-up may compose the two)',
      'Expect a play or scrim overlay yet — those are deferred (#1316); this is the core empty-state frame',
    ],
    contentGuidelines: 'The frame holds no copy. Where its ratio surfaces in a UI, name the proportion ("16:9", "Square"), not a pixel size — the frame holds a ratio, not a fixed dimension.',
  },

  ai: {
    primaryPurpose: 'Reserve space for a photograph at a fixed aspect ratio, holding the proportion while the frame flexes to its container, and show a neutral empty state until an image is dropped in.',
    whenToUse: 'A layout needs a media slot at a known proportion before the image is chosen — a card\'s photo area, a hero, a gallery cell. Pick 1:1, 4:3 or 16:9 from the media it will hold; the frame keeps that ratio as it resizes and clips whatever image is dropped onto it.',
    avoidWhen: 'The surface is a decorative wash over an existing photo (that is the `veil` component), the image is already present and fixed (place it directly), or the space needs a play button or a legibility scrim over the media (deferred, #1316 — this is the core empty-state frame only).',
    commonPartners: ['icon', 'veil'],
    triggerKeywords: ['image placeholder', 'media frame', 'photo frame', 'aspect ratio', '16:9', '4:3', 'square image', 'empty image', 'image slot', 'no image', 'media slot'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['icon', 'veil'],
    alternativeTo: [],
    supersedes: [
      'a hand-drawn rectangle with a fixed width and height standing in for an image, which breaks its ratio the moment it is resized',
    ],
    // Nothing supersedes the image placeholder — the veil is a sibling used for a different job (a wash
    // over media), not a replacement.
    supersededBy: [],
  },

  notes: {
    contested: [
      'THE FILL SLOT IS `fill`, bound to `color.background.secondary`, and that role is a call rather than the only option. An empty media frame could read as the page (no fill), as a recessed well (`background.tertiary`), or as a distinct filled surface (`background.secondary`). The middle reads as a deliberate placeholder distinct from the page while staying quiet, which is what an empty state wants; a designer who wants a more recessed well rebinds to `background.tertiary`. Named here so the choice is weighable rather than assumed.',
      'THE SINGLE NOMINAL DIMENSION IS `width`, not `height`, and that is the natural axis for a media frame that is usually as wide as its column and derives its height from the ratio. A portrait-first layout would bind `height` instead; the aspect-lock capability accepts either (the validator refuses only binding BOTH). `width` is the common case, so it is the default here.',
    ],
    unverified: [
      'THE PASTE-TIME DERIVE IS FIGMA-DOCUMENTED FOR RESIZE, NOT PROVEN FOR A BOUND VARIABLE. `lockAspectRatio()` derives the second dimension when a locked node is resized on one axis, and `targetAspectRatio` is read-only. Binding a variable on the single axis SETS that dimension, which is a resize — so the derive should hold — but that a `setBoundVariable` triggers it at paste time is a live-file behavior no offline host can witness, the same class as accept-and-discard. The offline gates prove the lock is captured with the right ratio (read back as `targetAspectRatio`); the derive-on-paste is filed for the real-host round-trip arm. If a pasted placeholder is ever found NOT deriving its height, the fallback is Option C — a nominal square plus the ratio carried in code/AI metadata only — and this note is the record that A was chosen on Figma\'s documented lock contract rather than on a live paste.',
      'THE OVERLAYS ARE DEFERRED (#1316). A legibility scrim/veil over the image and a play-circle video affordance both nest other components and are owner-held for a follow-up. Named here and in `codeOnly` so the absence reads as a deferral rather than a gap.',
      'THE NOMINAL WIDTH IS A PLACEHOLDER, NOT A MEASUREMENT (the veil/focus-ring idiom). `container.narrow` (720px) makes the standalone build a media-shaped rectangle; the frame has no intrinsic size, so nobody has decided 720px is RIGHT — it is a legible placeholder a designer resizes over their layout, and the ratio, not the width, is the fixed fact.',
    ],
  },
};
