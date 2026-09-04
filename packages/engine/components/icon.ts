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
 * THREE THINGS ABOUT THE SIZE ENUM, all recorded rather than left for the next author to re-derive.
 * Read 3 first if you are here because the enum says `medium` and the token says `md`: those are two
 * different questions and this def is the one place both are answered.
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
 *     Now the RULE rather than this def's judgment (#756, `docs/28` §5.2): a default resolves to the
 *     tier's `md` rung, which holds 5/5 across the corpus. What settled it was composition — `button`
 *     and `icon-button` at their own default `medium` both bind `icon.size.md` = 24, so preserving the
 *     brief's VALUE here would render a standalone icon at 20 and the same icon inside a default-size
 *     button at 24, and would break the 1:1 pairing with `componentSizes` that makes control size →
 *     icon size the identity. Gated in `lint-rung-names.ts` arm 3.
 *  3. THE ENUM IS SPELLED IN T-SHIRT WORDS, AND THE TOKEN REFS ARE NOT (#844). `x-small` / `small` /
 *     `medium` / `large` binding `icon.size.{xs,sm,md,lg}`. This def used to spell the enum in the
 *     engine's abbreviations, and it was the ONLY axis in the whole corpus with abbreviated values —
 *     every other one spells whole words (`filled`, `destructive`, `auto`, `required`). So the change
 *     made this def stop being the exception, and it cost 4 projected Figma member names against the 814
 *     that unifying the other way would have cost.
 *
 *     THIS IS NOT A RETREAT FROM POINT 1, and the distinction is the one to hold onto: point 1 is about
 *     which TIER RUNG a binding points at, and it is unchanged — `medium` still reaches `icon.size.md`,
 *     still 24, and the default is still the `md` rung per #756's rule. Point 3 is about which WORD a
 *     consumer types. A def states its ladder twice, in two independently-authored halves, and
 *     `lint-rung-names.ts` arm 2 exists to compare them; making the two halves identical would have
 *     deleted that gate rather than simplified the def (verified: with the words in place, inverting the
 *     ladder is still caught). `x-small` is CSS's own keyword for the rung below `small`, chosen over
 *     inventing one; the corpus already carries hyphenated values (`focus-visible`, `read-only`).
 *
 * This was the first instance of a systemic collision — every def authored from a KB brief meets it,
 * and text-field and card are next. #756 has since generalized it: the rule is stated in `docs/28`
 * §5.2 and in `docs/40` §7's authoring procedure, and `lint-rung-names.ts` gates every def's enum
 * against the emitted tier and against its own `tokens` bindings.
 */
import { ComponentDef } from '../component-schema';
// The vocabulary, imported rather than restated: `emit-icons.ts` proves it matches both the authored
// mapping and the directory in BOTH directions, so a glyph cannot enter the set and miss the API (#833).
import { ICON_NAMES } from '../icon-glyphs';

export const icon: ComponentDef = {
  id: 'icon',
  name: 'Icon',
  aliases: ['glyph', 'symbol', 'svg-icon'],
  category: 'foundations',
  status: 'draft',
  description:
    'A small vector glyph standing in for a concept, drawn on a square base-4/base-8 artboard at a fixed set of sizes. Decorative by default and hidden from assistive tech; a `label` is the sole gateway that makes it meaningful and named. Never the interactive element — an icon-only control is a Button that wraps one.',

  props: [
    { name: 'name', type: 'enum: IconName', values: [...ICON_NAMES], required: true, description: 'Which glyph, typed to the set\'s literal vocabulary rather than a free string — an unknown name must fail at compile time, because a missing glyph otherwise fails silently as an invisible gap in production (§10). The vocabulary is `IconName` in `icon-glyphs.ts`, generated from `icons/*.svg` through `icon-set.ts` and IMPORTED here rather than restated, so a glyph cannot enter the set and be forgotten in the API (#833). Compile-time refusal is available to any consumer importing that type; a code projection that widens it back to `string` gives the guarantee up, and that projection is the thing to watch rather than this def. Per-glyph components (`<IconSearch/>`) are the equivalent surface for a tree-shaken delivery.' },
    { name: 'size', type: "enum: 'x-small' | 'small' | 'medium' | 'large'", values: ['x-small', 'small', 'medium', 'large'], default: 'medium', required: false, description: 'Enumerated, snapping to the fixed pixel grid — 16 / 20 / 24 / 32. NOT arbitrary integers: off-grid scaling blurs strokes between hardware pixels and is the first thing an icon system must forbid (§2). The t-shirt words are the corpus vocabulary every other def uses (#844); the RUNGS they bind are the engine\'s (`icon.size.*`) and are offset one rung from the brief\'s — see the header.' },
    { name: 'tone', type: "enum: 'inherit' | a semantic ink token", values: ['inherit', 'primary', 'secondary', 'tertiary', 'brand', 'success', 'warning', 'danger', 'info'], default: 'inherit', required: false, description: 'Ink. Defaults to `inherit` (`currentColor`), so the glyph tracks its host control\'s hover/disabled/error cascade with no JS reconciliation. A semantic value pins it instead, insulating (say) an error glyph from a rogue cascade turning it invisible. REJECTS raw hex by construction — an enum has no cell for one — so contrast is enforced centrally rather than per call site (§3).' },
    { name: 'label', type: 'string', required: false, description: 'THE SOLE ACCESSIBILITY GATEWAY (§6). Present makes the glyph meaningful: `role="img"` + `aria-label`. Absent makes it decorative: `aria-hidden="true"`, which is the DEFAULT and the most common correct answer — a named icon beside its own text double-announces ("Email, Email"). Inside an icon-only control the WRAPPER carries the name and this stays absent; never name both.' },
  ],

  // `[]` — and this is a claim rather than an omission (§4). An icon is not interactive, so hover /
  // focus-visible / pressed / disabled belong to whatever control wraps it. A `disabled` icon inside
  // a disabled Button is Button's `disabled.icon` paint reaching in, not a state this component owns.
  states: [],

  // `name` is which glyph — the grid, as of #864. `tone` is the color-expression model, and it is a real
  // axis rather than a prop-only concern because a semantic ink is a different component in Figma's sense
  // — see the codeOnly entry for why it does not project.
  //
  // NOT declared: `fill` (outlined↔filled) and `weight`. Both are real axes in the field (§4 —
  // Material's FILL/wght variable-font axes, SF Symbols' rendering modes), and both are properties of
  // the SET's delivery rather than of a glyph slot the token tier can bind. Declaring them here would
  // put an axis in the component API that nothing in this repo can supply a value for.
  // `name` IS THE FIGMA GRID, AND `size` IS NOT AN AXIS HERE ANY MORE (#864). Both halves of that need
  // saying, because the second is a removal from a def that has carried it since #741.
  //
  // #864 was this def building four empty artboards — one per size rung, each containing nothing. The
  // geometry existed in `ICON_PATHS` and nothing reached it, so what the Figma leg needs is a member PER
  // GLYPH; a member per size rung is four copies of the same empty square. Enumerating both would be
  // 4 × 40 = 160 members carrying each glyph's path FOUR times, for members that differ only by a
  // dimension — and a vector is scaled to the box it sits in, so those four are the same drawing.
  //
  // `size` therefore leaves `variants` rather than merely leaving `variantAxes`, and that is forced
  // rather than chosen: `figmaAnatomySet` hands `figmaAnatomyPlan` an undefined size for an axis it does
  // not project, and the plan refuses a sizeless coordinate for a def that DECLARES sizes (#795's guard,
  // deliberately — a sizeless plan would stand in for a grid the def enumerates). So a def cannot declare
  // a size axis it does not project.
  //
  // WHAT THAT DOES NOT COST, measured rather than assumed: nothing downstream binds a size on an icon
  // INSTANCE. `button.ts` and `icon-button.ts` each bind `size.{size}.icon` on their own slot — the host
  // sizes the square it swaps a glyph into, which is the composition #756's identity mapping describes.
  // The `size` PROP stays, with all four rungs and its `md` default, because a code consumer sizes an icon
  // directly and `lint-rung-names.ts` arm 2 still compares the enum against these bindings.
  //
  // `tone` still does not project — see the codeOnly entry. Its REASON moved in #1211 (a projected
  // `tone=inherit` member would now paint the floor and duplicate `tone=primary`, rather than having no
  // coordinate to occupy at all); the conclusion did not.
  variants: {
    name: [...ICON_NAMES],
    tone: ['inherit', 'primary', 'secondary', 'tertiary', 'brand', 'success', 'warning', 'danger', 'info'],
  },

  // THE PAINT GRAMMAR, and this def is why the field exists (#758). The ink axis leads with its own
  // NAME and carries no `{slot}` segment at all — `tone.primary`, not `primary.icon` — because the
  // component has one paintable surface, so a slot segment would be a constant repeated eight times.
  // `field-message` keys the same axis name the OPPOSITE way (`default.label` — value first, slot
  // second) over a disjoint value set, which is why the declaration is a template rather than an axis
  // list: an axis list can express one of these two shipped conventions and would force a rekey of
  // the other.
  //
  // THE SECOND KEY IS THE FLOOR, AND IT REVERSES WHAT THIS FILE USED TO SAY (#1211). Both this comment
  // and the one over `tokens` argued that `tone.inherit` must bind NOTHING — that `currentColor` is the
  // ABSENCE of a pinned ink, so a coordinate at `inherit` "resolves no paint and the glyph keeps
  // whatever ink it inherits", which that comment called the correct projection of `currentColor`
  // rather than a dropped binding. That reasoning predates any rendered default icon and it is wrong on
  // contact with the output. MEASURED: `variantAxes` is `['name']` alone, so no projected member carries
  // a `tone` coordinate at all — `tone.{tone}` is unfillable at every one of the 40 and all 40 ship with
  // no fill bound. What they then inherit is not a host cascade: Figma has no `currentColor`, so it
  // resolves the literal `fill="currentColor"` in the glyph document to BLACK. The old position did not
  // project `currentColor`; it shipped unbound black glyphs (39 at the time, 40 now) and read that as the projection.
  //
  // `'{slot}'` is the fallback the rest of the corpus already spells this way — `checkbox`, `radio`,
  // `switch` and `field-label` all end on it — and it sits SECOND on purpose: `paintOf` walks these in
  // DECLARATION ORDER, so a named tone still wins and the floor answers only the coordinates that name
  // none. That is every projected member, and `inherit` too.
  //
  // ONE HALF OF THE OLD ARGUMENT SURVIVES, and it is why the fix is a floor rather than a `tone.inherit`
  // entry: there is no token whose value is "inherit", so any key spelled that way would be a lie about
  // what the default DOES. The floor says something different and true — with no tone named, the ink is
  // the primary icon role. `tone: inherit` keeps its code meaning (the `tone` prop still documents
  // `currentColor`, and a DOM consumer can still leave the ink to the cascade); the floor is what a
  // target with no inheritance model resolves instead of falling back to a hard-coded black.
  paintKeys: ['tone.{tone}', '{slot}'],

  tokens: {
    // The two vocabularies meeting on four lines (#844) — the CONSUMER's word on the left, the ENGINE's
    // rung on the right, which is the shape the other four defs have always had and `icon` now does too.
    // The rungs did not move: `medium` still reaches `icon.size.md` = 24, so #756's default rule holds
    // unchanged. Only the word a consumer types changed.
    'size.x-small': 'icon.size.xs',
    'size.small': 'icon.size.sm',
    'size.medium': 'icon.size.md',
    'size.large': 'icon.size.lg',
    // THE FLOOR (#1211) — the ink a glyph takes when no tone is named, which is every projected member.
    // Keyed on the SLOT (`icon`) rather than on a tone value, because it is not a ninth tone: it is what
    // `paintOf('icon')` finds after `tone.{tone}` fails to fill. It points at the same role `tone.primary`
    // does, deliberately — the default tone IS primary, so a second role here would make the floor
    // disagree with the tone a consumer would name to get "the normal one".
    icon: 'color.icon.primary',
    'tone.primary': 'color.icon.primary',
    'tone.secondary': 'color.icon.secondary',
    'tone.tertiary': 'color.icon.tertiary',
    'tone.brand': 'color.icon.brand',
    'tone.success': 'color.icon.success',
    'tone.warning': 'color.icon.warning',
    'tone.danger': 'color.icon.danger',
    'tone.info': 'color.icon.info',
  },

  // ONE PART, AND IT IS THE GLYPH ITSELF (#864).
  //
  // This part used to be a `box` — a square artboard whose note said it "carries the glyph paths", and
  // it carried nothing. That was #864: four members built without throwing, each an empty frame, with
  // every gate legitimately green because a node that exists is all any of them checked. The def named
  // the vocabulary in a prop enum and nothing connected the enum to `ICON_PATHS`.
  //
  // So the part is now `kind: 'vector'` and NAMES A GLYPH, templated on the `name` axis. `'{name}'`
  // resolves per member against the set at projection, which is the distinction that matters here: a
  // static `glyph: 'check'` also projects 40 correctly-named members and every one of them draws a check
  // mark. Measured on this branch before it was fixed, which is why the templating exists and why the
  // gate for this checks each member's path against `ICON_PATHS[its own name]` rather than checking that
  // a vector is present.
  //
  // NO SIZE BINDING, and the schema refuses one: a vector is scaled to the box it sits in, so the
  // artboard is the HOST's binding to make (`size.{size}.icon` on button's and icon-button's slots).
  // Binding it here would state the same square twice, on the box that owns it and on the outline inside
  // it, with nothing to notice when the two disagree.
  //
  // The brief's §2 point survives this, restated rather than dropped: "the 'anatomy' most people picture
  // (the paths) matters less than this governance". True — and it was never an argument for the paths
  // being absent. The set is still the versioned vocabulary (§10) and this def still does not author
  // geometry; it names a member of that vocabulary and fails loudly when the name stops resolving.
  anatomy: {
    root: 'glyph',
    parts: {
      glyph: {
        kind: 'vector',
        // `target` in the schema's sense — the single node that owns this component's paint and
        // dimensions — and NOT in the interaction sense, which an icon never has (§5). Worth stating
        // because the two readings diverge here for the first time: every def so far has been a
        // control, where the paint owner and the hit-area owner are the same node. `role: 'target'`
        // on a glyph claims the former only. The a11y consequence of the latter is carried by the
        // `touch-target` codeOnly entry, which puts the 44×44 floor on the wrapper where it belongs.
        role: 'target',
        // WHICH glyph, by name in the set's vocabulary, resolved at the member's own coordinate. Never
        // path data — see `PartDef.glyph`: the name is the contract surface `icon.name` already types,
        // so a glyph that leaves the set is a projection failure rather than an invisible gap.
        glyph: '{name}',
        note: 'The glyph outline itself, drawn on the set\'s square artboard and scaled to whatever box it is instanced into. The geometry comes from the set (`ICON_PATHS`) by name, so this def references the vocabulary without authoring it.',
      },
    },
    // The ceilings. Every entry is structure the brief states and the Figma leg provably cannot hold.
    codeOnly: [
      // MUST LEAD with `tone` — `figmaPropertyErrors` requires an unprojected variant axis to be
      // admitted by an entry that STARTS with the axis name, because a passing mention inside an
      // entry about something else is a gate satisfied by unrelated prose (the #563 finding).
      'tone — the ink axis, declared in `variants` and deliberately not a Figma variant, and as of #795 the reason is ONE reason rather than three. The surviving one is the interesting one and always was: `inherit` (`currentColor`) is the DEFAULT and Figma has no equivalent — a Figma node\'s fill is a value, never an inheritance from its host. #1211 SHARPENS that rather than softening it, and the sharpening matters because the old wording is now half wrong. It said the most common tone "has no coordinate to occupy"; it has one, because `paintKeys` now ends on a `{slot}` floor and a coordinate at `inherit` resolves the primary ink like any other tone-less one. What Figma still cannot carry is the MEANING: a projected `tone=inherit` member would paint that floor and be pixel-identical to `tone=primary`, so the axis would offer a value whose entire job — defer to the host — the projection silently drops while looking complete. A duplicate member that lies is worse than an absent one, which is why the axis stays in code. The other two reasons are gone, and both were OURS rather than Figma\'s. STRUCTURAL: this entry said `figmaAnatomySet` refuses any variant axis outside intent/appearance/size (`PROJECTABLE_VARIANT_AXES`) and throws rather than enumerating around it — #795 deleted that list, so the projector would carry `tone` today if this def asked, and the def does not ask. PAINT: `paintOf` used to key every lookup as `{intent}.{appearance}.{slot}`, so a def whose paint axis is `tone` resolved nothing; #758 replaced that with this def\'s own `paintKeys` and the tone ink resolves at every tone — verified in `test.ts`, which plans this def at `{tone: danger}` and asserts the `color/icon/danger` binding. So the set projects over `name` and paints along `tone`, which is the shape #795\'s `variantAxes` doc comment cites as the field\'s original meaning.',
      'glyph fill vs stroke — the set ships FILLED outlines (`fill="currentColor"` on a closed path, verified across all 40 sources), so a materializer paints the vector and never strokes it. A stroked-icon set is the other half of the field (Feather, Lucide) and would need a stroke weight plus a cap/join treatment, none of which `PartDef` can carry — the same wall the `stroke weight` entry below describes, met from the geometry side. Stated here because the def now DOES declare the geometry (#864) and this is the part of it that still cannot be declared.',
      'optical baseline shift — a glyph\'s bounding box is rarely its visual center of mass, so an inline icon needs an optical shift (Material Symbols moves ~11.5% of the text size down, aligning the glyph center to the x-height rather than the box). That is a relationship between a glyph and the TEXT beside it, resolved at render; Figma centers a node in its parent frame and has nowhere to state it. The recurring polish bug the brief names — an icon sitting a pixel low beside its label — lives entirely in this gap.',
      'stroke weight — a constant tuned to the typeface rather than a per-icon value (Atlassian\'s 1.5px matches its 1.5px typeface stroke by the squint test; Material\'s baseline is 2dp). It is a property of the SET, so no single glyph component can carry it, and `PartDef` has no stroke-weight field to carry it with — the same wall `focus-ring` meets from the other side.',
      'label routing — the whole a11y contract is a DOM shape: present makes `role="img"` + `aria-label`, absent makes `aria-hidden="true"` (§6). Figma has no accessibility tree, so the one prop that decides whether this component is announced at all is invisible to the Figma leg. It is not a variant either — the meaningful/decorative split is semantic, not visual, and the two cells are pixel-identical.',
      'touch-target — the 44×44 (48 Android) floor for an icon-only control is the WRAPPER\'s, not the glyph\'s (2.5.8). A 16px glyph cannot be its own target, and this component must not grow to pretend otherwise; the Button supplies the padding while the glyph stays visually tight. Stated here because the temptation is to fix the target size where the small thing is.',
      'RTL mirroring — directional glyphs mirror under `dir="rtl"` (back/forward, send, undo, list indentation) and non-directional ones must not (a clock stays a clock). The robust mechanism is per-glyph `isMirroredInRTL` metadata so the component automates the transform, which makes it a fact about each member of the set rather than about this def — and Figma carries no such flag.',
      'delivery — inline SVG vs sprite vs variable WOFF2 is a genuine engineering trade with accessibility, bundle and rendering consequences (§11), and it is downstream of the design language rather than of this def: a locked fixed-stroke system ships tree-shaken inline SVG, a multi-axis one ships a variable font. The Figma leg is indifferent to all of it, and so is the token tier.',
    ],
  },

  // `name` ALONE — 40 members, one per glyph, each carrying its own outline (#864, 40th added #1012). This used to be
  // `['size']`, four members that were four empty squares.
  //
  // Still the def #795's `variantAxes` doc comment points at, and now more sharply: it projects along
  // `name` and PAINTS along `tone`, so the projected axis set and the def's axis set are disjoint. That is
  // exactly the distinction the field was created for — the axes that become the Figma grid, not the axes
  // the def has — and this is the first def where the two share no member at all.
  //
  // `size` is not here and is not in `variants` either; see the `variants` comment for why the second
  // follows from the first rather than being a separate decision.
  //
  // MEASURED: 40 members in ONE paste chunk, with the indivisible unit (shell + largest single variant)
  // at 40% of `SET_CHUNK_BYTES`. Each glyph's path travels once, which is the property that made this
  // shape the cheap one — enumerating size as well would ship every path four times for members that are
  // the same drawing at four scales.
  //
  // No `stateAxis`: `states` is `[]`, so there is nothing to project. No `swaps`: an icon has no slot
  // — it IS what fills someone else's. `booleans` is stated-empty rather than omitted, which is the
  // established way this schema says "considered, and none survive".
  //
  // `emitAsComponents` — the one place icon differs from every control def at MATERIALIZATION (#1012). A
  // control wants its members combined into one COMPONENT_SET with a variant picker; an icon set does
  // not. A designer reaches for `search`, not for a 40-variant set they must then select a `name=` out
  // of — and Figma folds the slash in `icon/search` into an assets-panel FOLDER, which is the delivery
  // an icon library is supposed to have. So each member is left as its own top-level `icon/<glyph>`
  // component instead of being combined. This changes only how the plugin writes the SAME projected
  // members — the flag never enters the plan, so it moves no plan stamp; the surface is still the 40
  // members `variantAxes: ['name']` enumerates.
  figmaProperties: {
    variantAxes: ['name'],
    booleans: {},
    emitAsComponents: true,
  },

  accessibility: {
    role: 'img when meaningful (with aria-label); none when decorative (aria-hidden="true")',
    wcag: [
      '1.1.1 Non-text Content (meaningful → text alternative; decorative → hidden from AT)',
      '1.4.1 Use of Color (an icon must never be the sole carrier of meaning color conveys)',
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
