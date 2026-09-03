/**
 * FocusRing — the shared focus indicator, authored once and nested everywhere (docs/38 Arc 2 step 2).
 *
 * WHERE THIS IS GROUNDED, stated because there is no `focus-ring.md` in the brief corpus and a def
 * with no cited source is a def someone will assume was invented:
 *
 *  · KB `components/button.md:34` — the focus ring is its OWN concern, carrying an `outline-offset`
 *    (≈2px) so an unbroken sliver of background sits between the control's border and the ring. That
 *    offset is not decoration: without it, a primary-coloured button's ring sits directly against a
 *    similar hue and fails 1.4.11's 3:1 non-text contrast against the thing it must be distinguished
 *    from.
 *  · `docs/32` §"the absolute sibling" (:592) — the ring materializes as `layoutPositioning:
 *    ABSOLUTE`, zero children, `clipsContent: false`. Two consequences, both measured on the 648-
 *    variant Button build: an absolute sibling has its OWN stroke, so the three-way contention over a
 *    single Figma node's one stroke (550 ring vs 500 border vs 550 rest fill) never arises; and it
 *    takes no cell in the row, so nesting it shifts no geometry.
 *  · `docs/32` (:731) — author the ring ONCE as its own component and nest it, rather than N ways in
 *    N hosts. The token tier had already said so: `focus.ring.*` and `color.border.focus` are
 *    TOP-LEVEL families belonging to no component, and `focus.ring.offset-field` emits separately —
 *    which is the ring being one shared thing with a per-context parameter, recorded before anything
 *    could nest it. That line closed with "the schema cannot say so". It can now; this is it.
 *
 * WHAT THIS DEF CAN AND CANNOT DO, measured rather than assumed — because the honest answer is
 * "less than it looks" and the previous version of that answer was wrong in a way that stopped
 * anyone looking. Four independent walls sat between this def and a ring the engine materializes, and
 * every one of them was a projector or schema gap rather than a fact about focus rings. ALL FOUR ARE NOW
 * DOWN (#795, #1266) AND WHAT SURVIVES IS ONE KEYWORD:
 *
 *  1. `PartDef` HAD NO STROKE FIELD — **DOWN FOR THE WIDTH (#1266); STANDING FOR THE STYLE (#740).**
 *     Its geometry vocabulary was gap / height / radius / size / type / inset / padding. A ring is a
 *     stroke and nothing else, so for three releases the one thing this component IS had no field to be
 *     declared in: `tokens` below bound the stroke's color, weight and style, every binding resolved
 *     against every emitted brand, and no PART could carry any of them. All three moved separately.
 *     COLOR moved first (#933) — a part names its edge in `paintSlots` and the projector resolves it to
 *     a bound paint. WIDTH moved with #1266: `PartDef.strokeWidth` exists, the `ring` part binds it, and
 *     each projected member carries `bound.strokeWeight -> focus/ring/width`. That was a defect and not
 *     only a gap, because both executors have a `if (!node.strokeWeight) node.strokeWeight = 1` fallback
 *     for an unweighted stroke: the ring pasted at 1px in every brand, all of which emit 2, AND the gap
 *     came out wrong with it — a host sites the ring at `-(offset + ring-width)` on the premise the
 *     stroke is 2px, so a 1px stroke left 3px of background where 2 was designed. What is LEFT is the
 *     STYLE. `focus.ring.style` resolves against every brand and Figma offers no property to bind it to:
 *     a dash rhythm is a `dashPattern` of pixel runs, not a `solid`/`dashed` keyword, so a projection
 *     would have to invent the rhythm. That is #740's remaining scope here, and it is one keyword.
 *  2. `figmaAnatomySet` REFUSED the `surface` axis — **DOWN (#795).** `PROJECTABLE_VARIANT_AXES` was
 *     `['intent','appearance','size']`, and it threw rather than iterating around an unknown axis. The
 *     throw was right about its RULE — enumerating around an axis emits a set silently missing it (#487
 *     §5's 189-vs-756) — and wrong about the vocabulary being the projector's to own, since a plan has
 *     carried arbitrary axis names since #758. The enumeration now reads `variantAxes`, and the rule is
 *     kept by an empty-set throw instead of a closed list.
 *  3. `planComponentName` ALWAYS emitted `size=` — **DOWN (#795).** This def has no size axis, so a
 *     projected member would have been named `size=…`, while Button's `nesting: { kind: 'nest-fixed',
 *     variant: { surface: 'default' } }` needs a member named `surface=default`. Verified against
 *     `nestVariantMatch` and re-verified after the change: `{surface:'default'}` matches
 *     `['surface=default','surface=inverse']` and matches NOTHING in `['surface=default, size=md']`, because
 *     the coordinate must account for every axis the member's name carries. So the fix had to be the
 *     NAME losing its `size=` rather than this def gaining a size — and Button's coordinate now
 *     resolves against a projected set rather than the HAND-BUILT one #749 corrected the record about.
 *  4. PAINT WOULD NOT HAVE BOUND ANYWAY — LIFTED IN TWO STEPS, and worth reading as one wall that took
 *     two passes rather than as one that was fixed. `paintOf` used to key every lookup as
 *     `{intent}.{appearance}.{slot}` (`anatomy-figma.ts`), so a def whose paint axis is `surface`
 *     resolved no paint at all; #758 replaced that hardcoded template with this def's own `paintKeys`.
 *     That was necessary and not sufficient: the keys #758 shipped here were spelled `stroke`, which
 *     the projector never dispatches, so the ring's color was still reachable at 0 of 2 coordinates.
 *     #784 renamed them to `border`.
 *
 * So this def is REAL, gate-checked, PROJECTED as of #795 and drawing its brand's own stroke as of
 * #1266 — 2 members, ink and weight both bound. What it is still not is buildable ALONE, and that limit
 * is GEOMETRY rather than the stroke: a ring's extent is its host's extent plus the offset, so there is
 * no size a lone ring could correctly have and no schema field could supply one. See
 * `figmaProperties.notStandalone`. The difference matters for the roadmap: `focus-ring` is blocked on
 * neither the projector nor `PartDef` any more — nest it and it is correct.
 *
 * `figmaProperties` declares `surface` ALONE. `offset` stays a paste-time parameter rather than a second
 * variant axis, and #801 is why: the offset resolves to a NUMBER at paste because Figma's `x`/`y` bind
 * no variable, so an axis over it would ship members differing only by a value the platform cannot
 * hold. See its `codeOnly` entry — it is admitted there, not dropped.
 */
import { ComponentDef } from '../component-schema';

export const focusRing: ComponentDef = {
  id: 'focus-ring',
  name: 'FocusRing',
  aliases: ['focus-indicator', 'focus-outline'],
  category: 'foundations',
  status: 'draft',
  description:
    'The shared keyboard-focus indicator: a stroke drawn OUTSIDE its host\'s bounds, separated from them by an offset so an unbroken sliver of background sits between the control\'s own border and the ring. Authored once and nested by every focusable component rather than re-drawn per host — the ring belongs to no single component, which is why its tokens are top-level families.',

  props: [
    { name: 'surface', type: "enum: 'default' | 'inverse'", values: ['default', 'inverse'], default: 'default', required: false, description: 'The ground the ring is drawn against. `default` for a normal surface; `inverse` for a dark or brand-filled one, where the default ring would sit on a similar hue and lose its 3:1 separation. A host that cannot know its ground picks `default`; a host that carries its own `surface` axis passes it through (see Button), so the ring on a dark band is the inverse ring.' },
    { name: 'offset', type: "enum: 'control' | 'field'", values: ['control', 'field'], default: 'control', required: false, description: 'How far outside the host the ring sits. `control` is the standard ≈2px gap; `field` is 0, because an input\'s own border already supplies the separation and a gap there reads as a double border. Two values because the token tier already emits exactly two (`focus.ring.offset` and `focus.ring.offset-field`) — the per-context parameter docs/32 identified before anything could nest the ring.' },
  ],

  // `[]`, and this is the same claim `icon` makes for a different reason. A ring is not interactive —
  // it is the VISUAL EXPRESSION of its host's `focus-visible` state, so the state lives on the host
  // (Button declares `focus-visible` and its `focusRing` part declares `when: 'focus-visible'`). A
  // `states` entry here would model the ring as having a focus state of its own, which would mean a
  // ring that can itself be focused.
  states: [],

  // `surface` is the ground axis; `offset` is the context parameter. Both are author axes — a consumer
  // does not toggle either at runtime, the host declares them once. `surface` (renamed from `color`,
  // #1134) is the ONE name the bounded inverse set uses for the default|inverse ground, so a host that
  // carries `surface` can drive the ring's `surface` through by name (Button's `follow: ['surface']`).
  variants: {
    surface: ['default', 'inverse'],
    offset: ['control', 'field'],
  },

  // THE RING'S OWN SKIN, and the reason this def exists. Every one of these resolved only inside a
  // Figma file until now: the hand-authored ring docs/32 measured carried hardcoded `#2D65D4` and
  // `#AFC7F3` fills, radius 0, and a stroke weight bound to a REMOTE New Balance variable — all
  // placeholders, none of them the emitted token. These bindings are checked against every brand's
  // generated tree, so the ring is bound to a verified contract rather than to a file's contents.

  // THE PAINT GRAMMAR (#758, #1134). ONE key: `border` → `color.border.focus`. The ring binds its edge
  // on the DEFAULT ground and nothing else, because the inverse ground is no longer authored here — it
  // is the projector's, and that is the convention this def now demonstrates rather than the exception it
  // used to be.
  //
  // ── THE CONVENTION, RECORDED (#1134, docs/20 §9.11): THE SHAPE EVERY INVERSE COMPONENT FOLLOWS ────
  //
  // An inverse component declares a `surface: 'default' | 'inverse'` axis, projected as members
  // `surface=default` / `surface=inverse`, and binds only the DEFAULT-ground roles. On a `surface=inverse`
  // coordinate the projector rewrites each resolved `color.*` ref to its `color.inverse.*` counterpart —
  // docs/20 §9.9's `inverse(X) = color.inverse. + X`, applied once in `anatomy-figma.ts`. So this ring's
  // `border` resolves `color.border.focus` at `surface=default` and `color.inverse.border.focus` at
  // `surface=inverse`, with no `border.inverse` key to author. `Button` is the same shape; the ring is
  // nested by it and takes the same `surface` axis by NAME, which is what lets Button's `follow:
  // ['surface']` drive this ring's `surface` (a `surface=inverse` button nests the `surface=inverse` ring).
  //
  // WHY THE KEY IS `border` AND NOT `stroke` (#784, unchanged). `paintOf` dispatches `border` for a
  // stroke, so a key spelled `stroke` — the word this file's prose uses for the ring's substance — would
  // resolve at no coordinate and paint nothing. The prose still says "stroke", the CSS/Figma property;
  // only the KEY has to match what the projector asks for.
  //
  // ── WHAT THIS REPLACED, because the reversal is the thing worth reading ──────────────────────────
  //
  // Through #1133 this def authored TWO keys, `border` and `border.inverse` → `color.inverse.border.focus`,
  // selected by `paintKeys: ['{slot}.{color}', '{slot}']`, and its header called that "the shape every
  // inverse component now follows: declare a variant, bind the two ends by name." #1134 made the shape one
  // step smaller: a STATEFUL component (Button) cannot bind the inverse end by name — `…fill.inverse`
  // collides with `{state}` and `inverse.disabled.fill` with `{intent}`, both rejected by `paintKeyErrors`
  // — so the inverse end had to move into the projector as a rewrite. With the rewrite in place the ring's
  // own `border.inverse` key became the redundant one: `border` alone, transformed, gives the identical
  // `color.inverse.border.focus` at `surface=inverse`. Dropped, so the ring follows the same one mechanism
  // Button does rather than a second one only it could use. Renamed `color` → `surface` in the same change
  // (#1134): the ground axis is `surface` everywhere, so a host can pass it through by name.
  paintKeys: ['{slot}'],

  tokens: {
    'border': 'color.border.focus',
    'width': 'focus.ring.width',
    'style': 'focus.ring.style',
    'offset.control': 'focus.ring.offset',
    'offset.field': 'focus.ring.offset-field',
  },

  // ONE PART, because a ring IS one node — an absolutely-positioned sibling with zero children and
  // `clipsContent: false` (docs/32:592). It binds exactly one thing, and which one is the measurement
  // rather than an omission: a ring's geometry is its STROKE and its POSITION, and only the first of
  // those is a property. Its SIZE is its parent's bounds grown by the host's inset, so a `size` binding
  // here would fight the stretch (`PartDef.size` is rejected outright on the host's `absolute` part for
  // exactly this reason). Its RADIUS is the host's, derived below. Its POSITION is the host's `inset`,
  // and Figma's `x`/`y` accept no variable. Its STROKE is `strokeWidth` (#1266) — the one dimension a
  // ring owns rather than borrows, and the reason it now pastes at its brand's 2px instead of a 1px
  // executor fallback.
  anatomy: {
    root: 'ring',
    parts: {
      ring: {
        kind: 'box',
        // `paintSlots` NAMES THE EDGE AND NOTHING ELSE, because a ring is a stroke: it keys `border` and
        // no fill anywhere, so a filled ring would be a painted rectangle over whatever it is meant to be
        // drawing attention to. The inverse-ground edge is the SAME slot — the projector rewrites
        // `color.border.focus` to `color.inverse.border.focus` at `surface=inverse` (#1134), so there is
        // one slot, not two.
        paintSlots: ['border'],
        // THE STROKE'S WIDTH, and the whole of what a Figma stroke can take from a token beyond its paint
        // (#1266, #740's field). Bound here rather than left to the executors' `if (!node.strokeWeight)
        // … = 1` fallback, which is what shipped: a 1px ring in every brand, all four of which emit
        // `focus.ring.width: 2`. And thin was the smaller half — every host sites this part at
        // `-(offset + ring-width)` because the stroke is drawn INWARD across the gap, so at 1px the ring
        // sat 3px out where 2px was designed. Naming `width` rather than the token, like every other
        // binding key here: `tokens` above maps it to `focus.ring.width`, so a brand that tunes its ring
        // re-themes this the way it re-themes the ink.
        strokeWidth: 'width',
        // `target` in the a11y/interaction sense only, which a ring never has — it is here because the
        // schema requires exactly one, and a one-part anatomy has one candidate. This comment used to
        // read "`target` in this schema's sense — the single node owning this component's paint", which
        // was true of the projector and was #933: paint moved to `paintSlots` above, and the two
        // readings this comment noticed were coming apart are now two fields.
        role: 'target',
        note: 'The ring itself: one node, zero children, `clipsContent: false`. Nested by a host as an ABSOLUTE sibling, so it takes no cell in the host\'s row and its size is the host\'s bounds grown by the host\'s `inset` — which is why it binds no width, height or radius of its own. The one dimension it does bind is its stroke\'s width, because that one is nobody else\'s to supply.',
      },
    },
    derived: {
      'ring-radius':
        'host radius + ring offset — a ring sitting 2px outside a radius-4 corner needs radius 6 to stay concentric, or the straight run of the ring cuts the curve of the corner. Derived per host rather than authored here, because the ring does not know what it surrounds; a host overrides the instance.',
      'ring-bounds':
        'host bounds + 2 × offset on each axis — the ring is positioned at -offset and sized to the grown box, with STRETCH constraints on both axes so it tracks the host when a designer resizes a variant.',
    },
    // The ceilings, each measured on this branch rather than predicted, and each ticketed where a
    // ticket exists. The first four are the walls named in the header; the rest are properties of
    // focus indication that no Figma projection can carry.
    codeOnly: [
      // MUST LEAD with the axis name — `figmaPropertyErrors` requires an unprojected variant axis to
      // be admitted by an entry that STARTS with it. `surface` PROJECTS as of #795 and so has no entry
      // here any more; `offset` does not, and its entry is what keeps that a decision rather than a gap.
      // This check now runs for real, because `figmaProperties` is present.
      'offset — the context parameter (`control` ≈2px / `field` 0), and the one axis this def deliberately does NOT project (#795, decided on #801\'s measurement). Not a projector limit: the enumeration would carry it happily now that it reads `variantAxes`. The reason is that the offset is consumed by the HOST\'s `inset` binding and Figma\'s `x`/`y` accept no variable, so #801 measured the payload resolving it to a NUMBER at paste and writing that — an axis over it would ship two members differing only by a value the platform cannot hold, and a designer switching `offset=field` on an instance would see nothing move. So it stays a paste-time parameter the host supplies: `text-field`\'s field-specific offset comes from the PARENT at paste, not from a coordinate on this set. An already-pasted ring does not re-position when a brand changes `focus.ring.offset`, unlike every bound paint, which re-themes.',
      'stroke style — `focus.ring.style` resolves against every emitted brand and there is no Figma property to bind it to. In CSS the ring is an `outline` and its style is a keyword (`solid`, `dashed`); Figma has no keyword, only `dashPattern`, an array of pixel runs — so projecting a `dashed` ring means inventing a rhythm the token does not carry, and projecting `solid` means writing nothing, which is what happens already. This entry is the REMAINDER of one that used to read "stroke weight and stroke color", and the narrowing is the record worth keeping: a stroke is three things and this def could express none of them, because `PartDef`\'s vocabulary was gap / height / radius / size / type / inset / padding. COLOR left in #933 (`paintSlots` names the edge and the projector binds the paint) and WIDTH in #1266 (`PartDef.strokeWidth`, bound on the `ring` part above). What is left under #740 is one keyword, not the ring\'s visual substance — and Button\'s own ceiling entry described the whole thing as a deliberate trade, which it never was.',
      'the stroke, restated as the materialization ceiling — the def PROJECTS as of #795 (`figmaProperties` below declares `surface`, and the set builds two members with their ink bound), and what it projects is not yet a ring. Before #795 this entry said the def was deliberately not materializable because a `variantAxes: [\'color\']` block would validate and then throw; that is now simply false, and the honest replacement is narrower: nesting resolves by NAME against the live file (`compByName.get(n.nestTarget)`), so once the projected set is pasted, Button\'s `nests: \'focus-ring\'` binds to OUR members rather than to a hand-built component — which closes the docs/14 §1 inversion for the NODE. #1266 closed it for the STROKE as well — each member carries `bound.strokeWeight -> focus/ring/width`, so "the members are strokeless" is no longer the right reading and was the reading two other files quoted. What is left is narrower again and it is not a stroke: the members have their ink and their thickness and no EXTENT of their own, which is `figmaProperties.notStandalone` rather than a wall.',
      ':focus-visible condition — the ring appears on exactly one host state, and that state is a POINTER-vs-KEYBOARD distinction the browser makes at runtime. Figma has no state machine, so a projected ring is a variant coordinate a designer selects, never a state an interaction triggers. This is why Button\'s `focusRing` part declares `when: \'focus-visible\'` — the condition has to be stated in the def, because nothing downstream can infer it.',
      'high-contrast / forced-colors — a focus indicator must survive a forced-colors mode that replaces every authored color, which in CSS means `outline` rather than a border or box-shadow (an outline is preserved where a shadow is dropped). Figma has no forced-colors concept and no outline primitive distinct from a stroke, so the one property that keeps the ring visible for the users who most depend on it cannot be expressed in the Figma leg at all.',
      'the 3:1 adjacent-contrast contract — 1.4.11 requires the ring to clear 3:1 against BOTH the surface behind it and the control edge beside it, which is a relationship between three colors resolved per host and per mode. The `surface` axis is the design\'s answer to it (`inverse` exists because the default ring fails against a brand-filled surface), but the contract itself is a computation over a host this def cannot see, so no single ring component can carry it.',
    ],
  },

  // IT PROJECTS AS OF #795 — two members, `surface=default` and `surface=inverse`, each with its stroke
  // color bound. This block was ABSENT until #795 on a reason that was true when written and is not
  // now: `variantAxes: ['surface']` passed `figmaPropertyErrors` and then threw inside `figmaAnatomySet`,
  // so the def would have claimed a projection it did not have. Walls 2 and 3 are down, so it has one.
  //
  // `surface` ALONE, and the omissions are as declared as the inclusion:
  //  · `size` is NOT listed, because a ring has no size axis at all — and since #795 that means
  //    `planComponentName` writes no `size=` segment, which is precisely what lets Button's
  //    `nesting: { variant: { surface: 'default' } }` match (`nestVariantMatch` needs the coordinate to
  //    account for EVERY axis in the member name, so a `size=md` this def invented would match nothing).
  //  · `offset` is NOT listed on #801's measurement, not on a projector limit — see its `codeOnly`
  //    entry. The enumeration would carry it; Figma's `x`/`y` cannot bind it, so the two members would
  //    differ only by a number the platform freezes at paste.
  //  · No `gridAxis`: one varying axis has nothing to choose, and the fallback reaches `surface` anyway.
  //    Declaring it would read as a decision where there is one option.
  //  · `booleans` / `texts` / `swaps` are stated-empty rather than omitted — one node, no children, no
  //    text, no slot. `booleans: {}` is the "considered, and none survive" statement the schema asks for.
  //
  // AND IT PROJECTS TWO MEMBERS THAT ARE NOT A RING — `notStandalone` below, added under #869. The
  // paragraph above was written to correct an over-claim (the def cannot project) and replaced it with
  // one: *it projects* reads, to anyone deciding whether to build it, as *it builds*. Wall 1 is still
  // up, and what it costs standalone is measurable — see the field's own reason.
  figmaProperties: {
    variantAxes: ['surface'],
    booleans: {},
    // Measured against the real projector over nb's committed emission: 2 members, 0 binding errors,
    // 0 set properties, `planSetLayout` succeeds. Each member is `{name:'ring', type:'FRAME',
    // strokes:'color/border/focus', bound:{strokeWeight:'focus/ring/width'}, children:[]}` — no
    // layoutMode, no sizing mode, no width, no height. Four absent fields, so Figma supplies a 100×100
    // default frame. Nested it is fine: Button sites it absolutely and the executor resizes it to
    // `parent + inset*2`, which is where every one of those four comes from. Standalone there is no
    // parent, so nothing supplies them — and there never was a code path to lose.
    // THE REASON IS GEOMETRY, NOT THE STROKE, and #1266 is now the proof rather than the argument. This
    // comment used to have to insist on the distinction, because the first draft of the string below
    // blamed the stroke and both were true at once: the ring pasted at the executors' 1px fallback (a
    // fidelity loss) AND had no extent of its own (the blocker). The fallback is gone and the ring binds
    // its brand's `focus.ring.width`, and a standalone build is exactly as useless as it was — because a
    // ring's extent IS its host's extent plus the offset, so there is no size a lone ring could correctly
    // have. `PartDef`'s vocabulary already offers `size` and `height`; this part declares neither on
    // purpose, and no schema field could change that.
    notStandalone:
      'focus-ring: a ring is sized by the control it surrounds, so it projects members that bind no width or height of their own — built alone it is a 100×100 default frame with the focus color stroked around it. Build it as part of a host instead: Button nests it and supplies the geometry.',
  },

  accessibility: {
    role: 'none — a presentational sibling. The ring has no role of its own; it renders the focus state of the control it surrounds.',
    wcag: [
      '2.4.7 Focus Visible (a visible indicator on every keyboard-focusable control)',
      '1.4.11 Non-text Contrast (the indicator clears 3:1 against the adjacent surface AND the control edge — the offset is what makes the second half achievable)',
      '2.4.11 Focus Not Obscured (the ring must not be clipped by an ancestor — hence `clipsContent: false`, and why an offset ring needs its host not to clip)',
      '2.4.13 Focus Appearance (AAA — the indicator\'s area and contrast floor; the offset and width tokens are what a brand tunes to meet it)',
    ],
    focus:
      'This component IS the focus appearance. It is drawn for `:focus-visible` rather than `:focus`, so a pointer click does not raise it while keyboard navigation does — the distinction browsers make and the one a design system must not flatten. Never suppress it without replacing it: removing the indicator is the single most common 2.4.7 failure.',
    aria:
      'None, and that is a contract rather than an absence. The ring is presentational — the focus state is already conveyed by the platform focus itself, so an `aria-*` attribute here would announce something assistive tech already knows. It must never be given a role that makes it a stop in the tab order: a focusable focus ring is a node the user can land on with nothing to do.',
  },

  docs: {
    usage:
      'Do not place this directly. A focusable component nests it as an absolutely-positioned sibling — see Button\'s `focusRing` part — and picks `surface` for the ground it sits on and `offset` for its kind (`control` for a button, `field` for an input). One ring component serves every host: that is the point, and re-drawing it per component is the failure mode it exists to prevent. In code the ring is an `outline` with an `outline-offset`, not a border or a box-shadow, so it survives forced-colors mode.',
    do: [
      'Nest the shared ring rather than re-authoring a focus treatment per component',
      'Pick `color: inverse` on a dark or brand-filled surface, where the default ring loses its 3:1 separation',
      'Pick `offset: field` for inputs, whose own border already supplies the separation',
      'Keep the ring outside the host\'s bounds and the host un-clipped, so the ring is never cut off (2.4.11)',
    ],
    dont: [
      'Draw the ring on the host\'s own border — an outline appearance then has to give up its border for it, and the two contend for one stroke at different palette steps',
      'Remove the indicator without replacing it (the most common 2.4.7 failure)',
      'Render it for `:focus` rather than `:focus-visible` — a ring after every mouse click trains users to ignore it',
      'Implement it as a box-shadow: shadows are dropped in forced-colors mode and the indicator vanishes for the users who need it most',
      'Make it focusable or give it an ARIA role — it is presentational',
    ],
  },

  ai: {
    primaryPurpose: 'Render the shared keyboard-focus indicator for a focusable control.',
    whenToUse: 'Nested by any component that can receive keyboard focus, as an absolute sibling — the host declares it and picks the surface and offset.',
    avoidWhen:
      'As a standalone element, as a decorative outline, or as a hover/selected treatment. It is not a border and not an emphasis ring: rendering it outside `:focus-visible` destroys the one signal keyboard users navigate by. Never re-author a per-component focus treatment instead of nesting this — that is how a system ends up with N rings and N contrast bugs.',
    commonPartners: ['button', 'icon-button', 'text-field', 'select', 'checkbox', 'link'],
    triggerKeywords: ['focus ring', 'focus indicator', 'focus outline', 'focus visible', 'keyboard focus'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['button', 'icon-button', 'text-field', 'select', 'checkbox', 'link'],
    alternativeTo: ['a per-component focus border', 'a box-shadow focus glow'],
  },

  notes: {
    contested: [
      'Where the ring is drawn — on the host\'s own border versus as an offset sibling outside it. Settled here as the offset sibling, and settled by measurement rather than preference: a ring on the border must win the single stroke a Figma node has away from an `outline` appearance\'s border, and in CSS it collapses the background sliver 1.4.11 depends on (button.md:34, docs/32:592).',
      'Whether the ring is one shared component or a per-component treatment. Settled as shared, and the token tier said so first — `focus.ring.*` and `color.border.focus` are top-level families, and `focus.ring.offset-field` emits separately (docs/32:731).',
      'Offset values — the field ships 2px broadly and 0 for inputs. Both emit, and this def exposes the choice as the `offset` axis rather than picking one.',
    ],
  },
};
