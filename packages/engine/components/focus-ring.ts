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
 * every one of them was a projector or schema gap rather than a fact about focus rings. THREE ARE NOW
 * DOWN (#795) AND THE ONE LEFT IS THE ONE THAT MATTERS MOST:
 *
 *  1. `PartDef` HAS NO STROKE FIELD — **STILL STANDING (#740), and it is why this def now projects and
 *     is still not DONE.** Its geometry vocabulary is gap / height / radius / size / type / inset /
 *     padding. A ring is a stroke and nothing else, so the one thing this component IS has no field to
 *     be declared in. `tokens` below binds the stroke's color, weight and style, and every binding
 *     resolves against both brands' emitted trees — but no PART can carry the weight or the style, so
 *     no plan binds them to a node. As of #795 the ring PROJECTS: 2 members, `color=default` and
 *     `color=inverse`, each with its stroke COLOUR bound. What comes out is a ring-shaped box with the
 *     right ink and no stroke — which is progress, and is not yet a ring. Read this as #740's scope
 *     rather than as a wall nobody has looked at.
 *  2. `figmaAnatomySet` REFUSED the `color` axis — **DOWN (#795).** `PROJECTABLE_VARIANT_AXES` was
 *     `['intent','appearance','size']`, and it threw rather than iterating around an unknown axis. The
 *     throw was right about its RULE — enumerating around an axis emits a set silently missing it (#487
 *     §5's 189-vs-756) — and wrong about the vocabulary being the projector's to own, since a plan has
 *     carried arbitrary axis names since #758. The enumeration now reads `variantAxes`, and the rule is
 *     kept by an empty-set throw instead of a closed list.
 *  3. `planComponentName` ALWAYS emitted `size=` — **DOWN (#795).** This def has no size axis, so a
 *     projected member would have been named `size=…`, while Button's `nesting: { kind: 'nest-fixed',
 *     variant: { color: 'default' } }` needs a member named `color=default`. Verified against
 *     `nestVariantMatch` and re-verified after the change: `{color:'default'}` matches
 *     `['color=default','color=inverse']` and matches NOTHING in `['color=default, size=md']`, because
 *     the coordinate must account for every axis the member's name carries. So the fix had to be the
 *     NAME losing its `size=` rather than this def gaining a size — and Button's coordinate now
 *     resolves against a projected set rather than the HAND-BUILT one #749 corrected the record about.
 *  4. PAINT WOULD NOT HAVE BOUND ANYWAY — LIFTED IN TWO STEPS, and worth reading as one wall that took
 *     two passes rather than as one that was fixed. `paintOf` used to key every lookup as
 *     `{intent}.{appearance}.{slot}` (`anatomy-figma.ts`), so a def whose paint axis is `color`
 *     resolved no paint at all; #758 replaced that hardcoded template with this def's own `paintKeys`.
 *     That was necessary and not sufficient: the keys #758 shipped here were spelled `stroke`, which
 *     the projector never dispatches, so the ring's color was still reachable at 0 of 2 coordinates.
 *     #784 renamed them to `border`.
 *
 * So this def is REAL, gate-checked and PROJECTED as of #795 — 2 members, both with their ink bound —
 * and it is NOT YET A USABLE RING, because wall 1 holds the stroke that is the whole component. That
 * is a narrower and more honest position than the one this header used to describe, and the difference
 * matters for the roadmap: `focus-ring` is no longer blocked on the projector, only on `PartDef`.
 *
 * `figmaProperties` declares `color` ALONE. `offset` stays a paste-time parameter rather than a second
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
    { name: 'color', type: "enum: 'default' | 'inverse'", values: ['default', 'inverse'], default: 'default', required: false, description: 'Which surface the ring is drawn against. `default` for a normal surface; `inverse` for a dark or brand-filled one, where the default ring would sit on a similar hue and lose its 3:1 separation. A host that cannot know its surface picks `default` and lets the designer override the instance.' },
    { name: 'offset', type: "enum: 'control' | 'field'", values: ['control', 'field'], default: 'control', required: false, description: 'How far outside the host the ring sits. `control` is the standard ≈2px gap; `field` is 0, because an input\'s own border already supplies the separation and a gap there reads as a double border. Two values because the token tier already emits exactly two (`focus.ring.offset` and `focus.ring.offset-field`) — the per-context parameter docs/32 identified before anything could nest the ring.' },
  ],

  // `[]`, and this is the same claim `icon` makes for a different reason. A ring is not interactive —
  // it is the VISUAL EXPRESSION of its host's `focus-visible` state, so the state lives on the host
  // (Button declares `focus-visible` and its `focusRing` part declares `when: 'focus-visible'`). A
  // `states` entry here would model the ring as having a focus state of its own, which would mean a
  // ring that can itself be focused.
  states: [],

  // `color` is the surface axis; `offset` is the context parameter. Both are author axes — a consumer
  // does not toggle either at runtime, the host declares them once.
  variants: {
    color: ['default', 'inverse'],
    offset: ['control', 'field'],
  },

  // THE RING'S OWN SKIN, and the reason this def exists. Every one of these resolved only inside a
  // Figma file until now: the hand-authored ring docs/32 measured carried hardcoded `#2D65D4` and
  // `#AFC7F3` fills, radius 0, and a stroke weight bound to a REMOTE New Balance variable — all
  // placeholders, none of them the emitted token. These bindings are checked against every brand's
  // generated tree, so the ring is bound to a verified contract rather than to a file's contents.

  // THE PAINT GRAMMAR (#758), and here ORDER is the whole declaration. The qualified template leads,
  // so `color=inverse` finds `border.inverse` and `color=default` falls through to the bare `border`.
  // Reverse the two and every ring paints the default color — both variants are valid rings, so
  // nothing downstream would notice, which is the same invisibility #656 turned on.
  //
  // The DEFAULT value is the one with no segment of its own. That is not an accident of authoring: the
  // ring has one canonical color and `inverse` is the exception, so the unqualified key IS the
  // default. `paintKeys` can say that; the `{intent}.{appearance}.{slot}` template this replaces could
  // not say it at all, which is wall 4 of the four this def's header lists.
  //
  // THE SLOT VOCABULARY (#784). Until #784 these keys were spelled `stroke` / `stroke.inverse` — the
  // word this file's own prose uses for the ring's substance, and a word the projector never asks for.
  // `paintOf` dispatches `border` for a stroke, so BOTH color bindings resolved at 0 of 2 coordinates:
  // the grammar #758 shipped was correct in shape and painted nothing. Renamed to the dispatched slot.
  // The surrounding prose still says "stroke", deliberately — that is the CSS/Figma property this def
  // binds, and only the KEY has to match the projector.
  //
  // NOTE ON WHAT THIS ALONE BOUGHT: the stroke's COLOUR became resolvable and the ring did not become
  // projectable — the three structural walls above were untouched, and `figmaProperties` stayed absent
  // for them. #795 took walls 2 and 3 down, so both keys now resolve at real coordinates (`border` at
  // `color=default`, `border.inverse` at `color=inverse`). Wall 1 is why that is a bound color on a
  // node with no stroke to wear it.
  paintKeys: ['{slot}.{color}', '{slot}'],

  tokens: {
    'border': 'color.border.focus',
    'border.inverse': 'color.border.inverse.focus',
    'width': 'focus.ring.width',
    'style': 'focus.ring.style',
    'offset.control': 'focus.ring.offset',
    'offset.field': 'focus.ring.offset-field',
  },

  // ONE PART, because a ring IS one node — an absolutely-positioned sibling with zero children and
  // `clipsContent: false` (docs/32:592). It binds no geometry, and that is the measurement rather
  // than an omission: a ring's geometry is its stroke and its position, and `PartDef` has a field for
  // neither. Its SIZE is its parent's bounds grown by the host's inset, so a `size` binding here
  // would fight the stretch (`PartDef.size` is rejected outright on the host's `absolute` part for
  // exactly this reason). Its RADIUS is the host's, derived below. Its STROKE has no field at all.
  anatomy: {
    root: 'ring',
    parts: {
      ring: {
        kind: 'box',
        // `target` in this schema's sense — the single node owning this component's paint — and not
        // in the interaction sense, which a ring never has. Same distinction `icon` draws, and worth
        // repeating because both primitives are the first defs where the two readings come apart.
        role: 'target',
        note: 'The ring itself: one node, zero children, `clipsContent: false`. Nested by a host as an ABSOLUTE sibling, so it takes no cell in the host\'s row and its size is the host\'s bounds grown by the host\'s `inset` — which is why it binds no dimension of its own.',
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
      // be admitted by an entry that STARTS with it. `color` PROJECTS as of #795 and so has no entry
      // here any more; `offset` does not, and its entry is what keeps that a decision rather than a gap.
      // This check now runs for real, because `figmaProperties` is present.
      'offset — the context parameter (`control` ≈2px / `field` 0), and the one axis this def deliberately does NOT project (#795, decided on #801\'s measurement). Not a projector limit: the enumeration would carry it happily now that it reads `variantAxes`. The reason is that the offset is consumed by the HOST\'s `inset` binding and Figma\'s `x`/`y` accept no variable, so #801 measured the payload resolving it to a NUMBER at paste and writing that — an axis over it would ship two members differing only by a value the platform cannot hold, and a designer switching `offset=field` on an instance would see nothing move. So it stays a paste-time parameter the host supplies: `text-field`\'s field-specific offset comes from the PARENT at paste, not from a coordinate on this set. An already-pasted ring does not re-position when a brand changes `focus.ring.offset`, unlike every bound paint, which re-themes.',
      'stroke weight and stroke color — the ring\'s entire visual substance, and `PartDef` has no field for either. Its geometry vocabulary is gap / height / radius / size / type / inset / padding; a stroke is not among them. So `tokens` binds `color.border.focus`, `focus.ring.width` and `focus.ring.style` and every one resolves against every emitted brand, while no PART can carry them and therefore no plan can bind them to a node. This is the wall Button\'s codeOnly entry used to describe as a deliberate trade — it is not; it is an unexamined schema gap, and expressing it needs a `PartDef` stroke field, which is a schema decision under #740.',
      'the stroke, restated as the materialization ceiling — the def PROJECTS as of #795 (`figmaProperties` below declares `color`, and the set builds two members with their ink bound), and what it projects is not yet a ring. Before #795 this entry said the def was deliberately not materializable because a `variantAxes: [\'color\']` block would validate and then throw; that is now simply false, and the honest replacement is narrower: nesting resolves by NAME against the live file (`compByName.get(n.nestTarget)`), so once the projected set is pasted, Button\'s `nests: \'focus-ring\'` binds to OUR members rather than to a hand-built component — which closes the docs/14 §1 inversion for the NODE while wall 1 keeps it open for the stroke. Read the remaining gap as "the members are strokeless", not as "the def cannot project".',
      ':focus-visible condition — the ring appears on exactly one host state, and that state is a POINTER-vs-KEYBOARD distinction the browser makes at runtime. Figma has no state machine, so a projected ring is a variant coordinate a designer selects, never a state an interaction triggers. This is why Button\'s `focusRing` part declares `when: \'focus-visible\'` — the condition has to be stated in the def, because nothing downstream can infer it.',
      'high-contrast / forced-colors — a focus indicator must survive a forced-colors mode that replaces every authored color, which in CSS means `outline` rather than a border or box-shadow (an outline is preserved where a shadow is dropped). Figma has no forced-colors concept and no outline primitive distinct from a stroke, so the one property that keeps the ring visible for the users who most depend on it cannot be expressed in the Figma leg at all.',
      'the 3:1 adjacent-contrast contract — 1.4.11 requires the ring to clear 3:1 against BOTH the surface behind it and the control edge beside it, which is a relationship between three colors resolved per host and per mode. The `color` axis is the design\'s answer to it (`inverse` exists because the default ring fails against a brand-filled surface), but the contract itself is a computation over a host this def cannot see, so no single ring component can carry it.',
    ],
  },

  // IT PROJECTS AS OF #795 — two members, `color=default` and `color=inverse`, each with its stroke
  // color bound. This block was ABSENT until #795 on a reason that was true when written and is not
  // now: `variantAxes: ['color']` passed `figmaPropertyErrors` and then threw inside `figmaAnatomySet`,
  // so the def would have claimed a projection it did not have. Walls 2 and 3 are down, so it has one.
  //
  // `color` ALONE, and the omissions are as declared as the inclusion:
  //  · `size` is NOT listed, because a ring has no size axis at all — and since #795 that means
  //    `planComponentName` writes no `size=` segment, which is precisely what lets Button's
  //    `nesting: { variant: { color: 'default' } }` match (`nestVariantMatch` needs the coordinate to
  //    account for EVERY axis in the member name, so a `size=md` this def invented would match nothing).
  //  · `offset` is NOT listed on #801's measurement, not on a projector limit — see its `codeOnly`
  //    entry. The enumeration would carry it; Figma's `x`/`y` cannot bind it, so the two members would
  //    differ only by a number the platform freezes at paste.
  //  · No `gridAxis`: one varying axis has nothing to choose, and the fallback reaches `color` anyway.
  //    Declaring it would read as a decision where there is one option.
  //  · `booleans` / `texts` / `swaps` are stated-empty rather than omitted — one node, no children, no
  //    text, no slot. `booleans: {}` is the "considered, and none survive" statement the schema asks for.
  //
  // AND IT PROJECTS TWO MEMBERS THAT ARE NOT A RING — `notStandalone` below, added under #869. The
  // paragraph above was written to correct an over-claim (the def cannot project) and replaced it with
  // one: *it projects* reads, to anyone deciding whether to build it, as *it builds*. Wall 1 is still
  // up, and what it costs standalone is measurable — see the field's own reason.
  figmaProperties: {
    variantAxes: ['color'],
    booleans: {},
    // Measured against the real projector over nb's committed emission: 2 members, 0 binding errors,
    // 0 set properties, `planSetLayout` succeeds. Each member is `{name:'ring', type:'FRAME',
    // strokes:'color/border/focus', bound:{}, children:[]}` — no layoutMode, no sizing mode, no width,
    // no height, no strokeWeight. Five absent fields, so Figma supplies a 100×100 default frame and the
    // executor's `if (!node.strokeWeight) … = 1` fallback paints the correct token at 1px. Nested it is
    // fine: Button sites it absolutely and the executor resizes it to `parent + inset*2`, which is where
    // every one of those five comes from. Standalone there is no parent, so nothing supplies them — and
    // there never was a code path to lose. The `codeOnly` entry above already said "the members are
    // strokeless"; this is the same admission somewhere the picker can act on it.
    // THE REASON IS GEOMETRY, NOT THE STROKE, and the first draft of this string said the stroke — worth
    // recording because both are true and only one is the blocker. Wall 1 (#740) is why the projected ring
    // paints a 1px fallback instead of its bound `focus.ring.width`; that is a fidelity loss. What makes a
    // standalone build meaningless is that a ring's extent IS its host's extent plus the offset, so there
    // is no size a lone ring could correctly have — #740 does not change that, and no schema field could:
    // `PartDef`'s vocabulary already offers `size` and `height`, and this part declares neither on purpose.
    notStandalone:
      'focus-ring: a ring is sized by the control it surrounds, so it projects members that bind no width or height of their own — built alone it is a 100×100 default frame with the focus color at 1px. Build it as part of a host instead: Button nests it and supplies the geometry.',
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
      'Do not place this directly. A focusable component nests it as an absolutely-positioned sibling — see Button\'s `focusRing` part — and picks `color` for the surface it sits on and `offset` for its kind (`control` for a button, `field` for an input). One ring component serves every host: that is the point, and re-drawing it per component is the failure mode it exists to prevent. In code the ring is an `outline` with an `outline-offset`, not a border or a box-shadow, so it survives forced-colors mode.',
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
