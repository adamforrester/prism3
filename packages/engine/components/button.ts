/**
 * Button — re-authored v1 from its KB brief (KB brief: `components/button.md`, §15),
 * the catalogue's calibration component. v0 was seeded from the schema shape only and
 * re-litigated settled decisions; this is faithful to the practice's resolved model.
 *
 * ── #1223: INTENT IS THE COMPONENT, NOT AN AXIS ────────────────────────────────────────────────
 * The three semantic intents are now three COMPONENTS — `Button` (primary/brand), `Destructive Button`,
 * `Neutral Button` — built by the `makeButton` factory below from one shared anatomy. Intent used to be
 * a variant axis crossing appearance × size × surface × state (one 1296-member set); splitting it gives
 * three 432-member sets whose only difference is the `interactive.<family>` color binding. Emphasis is
 * STILL the appearance axis within each component (filled > outline > text), so a three-action form is
 * three buttons of one component at three appearances. Accent is not a fourth component — a brand adds a
 * secondary palette and duplicates+rebinds the primary set in Figma (see the export block at the foot).
 *
 * The practice's resolved decisions carried in here:
 *  - appearance {filled, outline, text} × size × surface — NOT a single overloaded `variant` enum
 *    (brief §3; reconciled to the interactive vocabulary per docs/20 / KB button.md §3).
 *  - Primary is the brand/default button (`id: 'button'`). The old `intent` prop defaulted to primary
 *    (REVERSED 2026-08-07 from `neutral`) on the rule "one FILLED per view, so the loud button is the
 *    deliberate choice" — the rule survives the split unchanged, now expressed as one FILLED appearance
 *    per view within whichever component the semantic calls for.
 *  - The state TRIO: isPending (focusable aria-disabled, delayed spinner, width-preserved,
 *    busy-announced), isInactive (focusable disabled — relevant-but-unsatisfied), disabled
 *    (native, RESERVED for controls irrelevant to the view) (§4, §13).
 *  - leadingVisual / trailingVisual (not *Icon — the slot holds avatars/counters/spinners) (§2).
 *  - type='button' default (neutralize the platform submit trap) (§3, §11).
 *  - Icon-ONLY is a distinct component (icon-button) so the accessible name is required at
 *    the type level (§6, §10).
 *
 * Bound to the interactive color system (docs/20): each component binds `interactive.<family>.*`
 * (primary / neutral / destructive) with cross-cutting `disabled.*`. This CLOSES the v1 HIGH finding —
 * neutral (was the stateless `foreground.secondary`) carries hover/pressed/on-fill like every family, so
 * the Neutral Button is not hover-less. outline/text hover uses the overlay wash (assumes
 * `outlineInteraction: overlay-neutral`, the default). `ghost` is retired — a quiet button is the
 * Neutral Button at `appearance=text`. (The `type.label.lg` gap is CLOSED — #1260 minted the rung at
 * 18px/emphasis and `size.large.{appearance}.type` binds it; the text appearance binds its underlined twin, #2324.)
 */
import { ComponentDef } from '../component-schema';
import { BUTTON_SPACING } from '../button-spacing';

/** One size's spacing entries from `BUTTON_SPACING`, spread beside that size's height and type. */
const BUTTON_SPACING_AT = Object.fromEntries(['small', 'medium', 'large'].map((sz) =>
  [sz, Object.fromEntries(Object.entries(BUTTON_SPACING).filter(([k]) => k.startsWith(`size.${sz}.`)))])) as Record<string, Record<string, string>>;

type IntentFamily = 'primary' | 'neutral' | 'destructive';

/**
 * The per-family PAINT (docs/20), authored ONCE and called per component — #1223 split the three
 * semantic intents into three components (Button / Destructive Button / Neutral Button), and this map
 * is the ONLY thing that differs between them. Every def `makeButton` produces is byte-identical but for
 * the `color.interactive.<family>.*` bindings returned here; `test.ts` asserts exactly that (the
 * factory's safety net), so a binding edited on one component and not the others fails BY NAME rather
 * than shipping three buttons that have quietly diverged (docs/34).
 *
 * The keys drop the intent segment the grammar used to lead with. With intent FIXED per component it is
 * no longer a coordinate, so `paintKeys` is `{appearance}.{slot}.{state}` / `{appearance}.{slot}` and
 * these keys match it — the bare key is the REST value, the `.hover`/`.pressed` forms the stated states.
 * `disabled.*` is cross-cutting (intent-independent, docs/20 §7) and lives in the shared token block, not
 * here — its identity across all three components is the whole reason the split loses no coverage.
 */
const intentTokens = (family: IntentFamily): Record<string, string> => ({
  // filled — interactive fill + on-fill ink
  'filled.fill': `color.interactive.${family}.fill.rest`,
  'filled.fill.hover': `color.interactive.${family}.fill.hover`,
  'filled.fill.pressed': `color.interactive.${family}.fill.pressed`,
  'filled.label': `color.interactive.${family}.on-fill`,
  'filled.icon': `color.interactive.${family}.on-fill`,
  // outline — the EDGE carries state (#576), so all three rather than letting hover/pressed fall to rest
  'outline.border': `color.interactive.${family}.border.rest`,
  'outline.border.hover': `color.interactive.${family}.border.hover`,
  'outline.border.pressed': `color.interactive.${family}.border.pressed`,
  // THE INK CARRIES STATE TOO (#1282), and this is the half #576 left behind. That change made the
  // outline EDGE stateful and bound all three of its steps above; the label and icon stayed pinned to
  // `.rest`, so an outline button's border moved on hover and pressed while the text it surrounds did
  // not. The roles were already there — `iText` has emitted `text.{rest,hover,pressed}` since #576,
  // and `iBorder` consumes those very candidates, so the border was tracking an ink the component
  // then declined to bind. Nothing was missing from the token tier; three keys were missing here.
  //
  // Same rung delta as the border by construction rather than by agreement: both resolve
  // `color.interactive.<family>.{text,border}.<state>`, and `border` IS `text` passed by value
  // (`iBorder`). So "the edge matches its label" now holds at every state, which is what #576 said it
  // was for and could only deliver at rest.
  'outline.label': `color.interactive.${family}.text.rest`,
  'outline.label.hover': `color.interactive.${family}.text.hover`,
  'outline.label.pressed': `color.interactive.${family}.text.pressed`,
  // #1471 — the GLYPH binds the dedicated `icon.*` role, not `text.*`. Value-identical (the engine mints
  // `interactive.<family>.icon.{rest,hover,pressed}` as a value twin of `text.*`), so this is a semantic
  // rebinding with NO color change: an outline button's icon is an icon, and now says so. The label keeps
  // `text.*` (it IS text). Both button and icon-button move together.
  'outline.icon': `color.interactive.${family}.icon.rest`,
  'outline.icon.hover': `color.interactive.${family}.icon.hover`,
  'outline.icon.pressed': `color.interactive.${family}.icon.pressed`,
  'outline.overlay.hover': `color.interactive.${family}.overlay.hover`,
  'outline.overlay.pressed': `color.interactive.${family}.overlay.pressed`,
  // text — ink + the translucent overlay wash (#536 item 1: both overlay states keyed, or a pressed
  // ghost button falls back to rest and projects byte-identical to it).
  //
  // THE INK CARRIES STATE, exactly as `outline` above (#1351 part 1). The earlier reading here was that
  // `text` needed no per-state ink because — unlike `outline` — it draws no border for the ink to fall
  // out of step with. That reasoning missed the ground the ink actually sits on: the overlay wash is a
  // translucent WHITE layer on the inverse band, so on hover/pressed it LIGHTENS the ground beneath a
  // pinned `text.rest` ink and the composited contrast collapses — measured over the real inverse
  // backdrop `#0D0D0E`, button `text` fell rest 4.87 → hover 3.81 → pressed 2.70 (both AA fails), and
  // button-destructive the same shape. `outline` never showed it because #1282 had already made its ink
  // step; `text` is the half that treatment left behind. So the ink now walks `text.{rest,hover,pressed}`
  // like `outline`'s label/icon — the same roles `iText` has emitted since #576, resolved once and shared
  // — and the overlay wash stays the separate mechanism it always was, keyed at both states below. On the
  // default (page) surface the roles resolve to the page ink and the step is contrast-safe by
  // construction; the projector's `color.* → color.inverse.*` rewrite gives the inverse band its own
  // stepped ink, which is where the failure lived. Neutral's ink walks too since #2324 (950 → 850 → 750, reflected,
  // as it has no step further out), so a Neutral text button changes on hover and press like the others.
  // (Part 2 — the `filled` inverse-primary `on-fill` holding constant while the fill darkens — is a
  // separate, design-carrying fix (#1351 part 2) and is deliberately NOT touched here.)
  'text.label': `color.interactive.${family}.text.rest`,
  'text.label.hover': `color.interactive.${family}.text.hover`,
  'text.label.pressed': `color.interactive.${family}.text.pressed`,
  // #1471 — the GLYPH binds `icon.*` (value-identical to `text.*`); the label keeps `text.*`. See the
  // `outline.icon` note above — a name/semantic move, no color change.
  'text.icon': `color.interactive.${family}.icon.rest`,
  'text.icon.hover': `color.interactive.${family}.icon.hover`,
  'text.icon.pressed': `color.interactive.${family}.icon.pressed`,
  // #2324 (owner Q110): a text button is never filled at rest, and by default not on hover or press either: its
  // label and icon change color and its underline carries the affordance ("Text button hover: Text & icon only").
  // So the text appearance keys no overlay wash. A brand that turns on "Fill" gets the wash back on hover and
  // pressed, from the outline appearance's keys, in `applyButtonLayout` (`anatomy-figma.ts`).
});

/**
 * The button FACTORY (#1223). One anatomy, three color families → three components. `id`, `name`,
 * `description` and the `interactive.<family>` paint are the only things that vary; everything below —
 * props, states, appearance/size/surface axes, the #326 asymmetric padding, the icon slots, the anatomy,
 * disabled, focus, accessibility — is authored ONCE here and shared verbatim. The three exports at the
 * foot of the file are its outputs, not hand-maintained copies (docs/34 DRY), and `test.ts` pins that.
 */
/**
 * What each sibling says for ITSELF (#1697). Before this the factory shared `ai` and `docs` verbatim, so an
 * agent choosing between the three read the same trigger keywords, the same avoid-when and the same
 * priority on each, and the neutral button advertised "delete" and "primary action". These are the
 * selection fields, and selection is the one question the three answer differently. The copy is carried
 * from the brief: §10's `danger` / `destructive` aliases and §5's destructive-pairing rule for the
 * destructive sibling. `test.ts` pins that the siblings' `triggerKeywords` differ, and that everything else
 * the factory shares stays byte-identical.
 */
type ButtonSibling = {
  triggerKeywords: string[];
  /** Appended to the shared avoid-when: the sibling that fits better, named. */
  avoidWhen: string;
  generationPriority: number;
  /** Appended to the shared `docs.do`. */
  do: string[];
};

const makeButton = (id: string, name: string, summary: string, description: string, family: IntentFamily, sibling: ButtonSibling): ComponentDef => ({
  id,
  name,
  aliases: ['btn', 'cta'],
  category: 'form',
  status: 'draft',
  description,
  summary,

  props: [
    // #1242 — `label`, not `children`. The property NAME is what a designer reads in Figma's
    // properties panel (`figmaProperties.texts` keys against `props` by name, so the two move
    // together — see `component-schema.ts` `figmaPropertyErrors`), and `children` is a React-ism
    // that means nothing to a designer. The React `children` idiom is a code-side wrapper concern;
    // the def's declared API names the slot for what it IS — the label. LOWERCASE per #1333: every
    // Figma TEXT property name is lowercase, matching the already-lowercase swap and variant names.
    // #1697 — the description said the label was "not required for the icon-only case" beside
    // `required: true`. The icon-only case is a different component (icon-button), so on THIS def the
    // label is always required, and the prose now says so rather than contradicting the flag beside it.
    { name: 'label', type: 'node (label)', required: true, description: 'Visible label; verb-first, sentence case, ≤3 words. Always required here — an icon-only control is the separate icon-button, which requires an accessible name instead.' },
    { name: 'onClick', type: 'function', required: false, description: 'Action handler. Suppressed while isPending or isInactive.' },
    // #1223 — no `intent` prop. Intent is now the COMPONENT (Button = primary; Destructive Button;
    // Neutral Button), not a prop on one component. EMPHASIS IS STILL THE APPEARANCE AXIS: a form with
    // three actions is typically three of the SAME component at filled / outline / text, not three colors.
    { name: 'appearance', type: "enum: 'filled' | 'outline' | 'text'", values: ['filled', 'outline', 'text'], default: 'filled', required: false, description: 'Visual treatment over the color, decoupled from intent so the matrix scales by addition. filled = interactive fill + on-fill ink; outline = border + text ink; text = ink only. (Reconciled from solid/outline/plain.)' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Control size — drives height, padding, and label type.' },
    { name: 'surface', type: "enum: 'default' | 'inverse'", values: ['default', 'inverse'], default: 'default', required: false, description: 'The ground the button sits on. `default` for a normal page; `inverse` for a dark or brand-filled band, where the button binds its `color.inverse.*` counterparts so fill, ink, border, overlay and the disabled treatment keep contrast against the flipped surface. A host that cannot know its ground picks `default`, and the designer sets `inverse` on the instance — the same answer the nested focus ring gives.' },
    // #2350 (owner Q143) — DRAFT name, values and wording, for the owner.
    { name: 'inset', type: "enum: 'default' | 'flush-start' | 'flush-end'", values: ['default', 'flush-start', 'flush-end'], default: 'default', required: false, description: 'Text appearance only. `flush-start` or `flush-end` removes the inline padding on that side, so the label lines up with the content above and below it. A flush button hovers by color only, and its hit target keeps its size.' },
    { name: 'fullWidth', type: 'boolean', default: false, required: false, description: 'Stretch to container. Aliases: block / isFullWidth.' },
    { name: 'type', type: "enum: 'button' | 'submit' | 'reset'", values: ['button', 'submit', 'reset'], default: 'button', required: false, description: "Opinionated default 'button' to neutralize the platform's submit-on-enter-in-form trap; require 'submit' explicitly." },
    { name: 'isPending', type: 'boolean', default: false, required: false, description: 'Delays the spinner, preserves width, keeps focus (aria-disabled, not native disabled), suppresses re-fire, announces busy. Preferred over `loading`.' },
    { name: 'isInactive', type: 'boolean', default: false, required: false, description: 'Focusable disabled — visually muted, retains tab order, surfaces the blockage reason on focus. Use for a control blocked by satisfiable app state (e.g. submit on an incomplete form).' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Native disabled. Reserved for controls fundamentally irrelevant to the current view; removes from tab order + a11y tree. Prefer isInactive for anything relevant-but-blocked.' },
    { name: 'leadingVisual', type: 'slot', required: false, description: 'Icon / avatar / counter / spinner before the label.' },
    { name: 'trailingVisual', type: 'slot', required: false, description: 'Icon / caret / indicator after the label.' },
    { name: 'href', type: 'string', required: false, description: 'Discouraged — prefer link-button. If set, the button renders an <a>, which drops type and disabled semantics.' },
    // #1697 — the old description ("only needed when there is no visible label") assumed a case this def
    // cannot reach: `label` is required, so every Button has visible text. What `aria-label` does here is
    // EXTEND that text, and 2.5.3 is the constraint on how.
    { name: 'aria-label', type: 'string', required: false, description: 'Extends the visible label with context it does not carry ("Delete invoice 1042" on a "Delete" button). Start it with the visible text, so a voice-control user who speaks the label still activates the control (WCAG 2.5.3 Label in Name).' },
  ],

  states: ['rest', 'hover', 'focus-visible', 'pressed', 'pending', 'inactive', 'disabled'],
  variants: {
    // #1223 — `intent` is gone as an axis; it is the component identity now. `appearance` carries
    // emphasis, `surface` the ground, `size` the rung, `width` a drag (not projected).
    appearance: ['filled', 'outline', 'text'],
    size: ['small', 'medium', 'large'],
    width: ['auto', 'full'],
    // THE INVERSE GROUND (#1134), and the bindings for it are NOT in `tokens` below — that is the whole
    // mechanism, not an omission. An inverse control binds every role's inverse counterpart, which
    // docs/20 §9.9 defines as `color.inverse.` + the role. Expressed as authored keys they would collide
    // with this def's own grammar by arity: `filled.fill.inverse` fills the `{state}` segment with
    // `inverse` (not a state), and a cross-cutting `inverse.disabled.fill` names no slot the projector
    // dispatches — both rejected by `paintKeyErrors`. So the whole inverse half is unauthorable here and
    // is applied by the projector instead — `anatomy-figma.ts` rewrites each resolved `color.*` ref to its
    // `color.inverse.*` counterpart at any coordinate where `surface=inverse`. This def declares the axis;
    // the transform supplies the values. (The intent-family segment the grammar once led with is gone with
    // #1223 — intent is the component now — so the collision is one arity shorter but the conclusion holds.)
    surface: ['default', 'inverse'],
    // FLUSH (#2350, owner Q143): a text button drops its inline padding on one side, so its label lines up with the
    // content edge above and below it. `default` leads, so the set's first member and the code default stay as they
    // were. The text appearance only: `figmaProperties.excludeCoordinates` removes it from filled and outline, whose
    // visible edge needs its padding. Applied by the container's `flush` field.
    inset: ['default', 'flush-start', 'flush-end'],
  },
  // WHEN each axis changes (#1611): runtime axes are held to one footprint, authoring axes are not.
  // appearance stays RUNTIME, the strict default: a toggle button that fills when selected is the owner's
  // bold-when-selected shape (#1611), so an outline member must keep its filled sibling's box.
  axisKinds: { appearance: 'runtime', size: 'authoring', width: 'authoring', surface: 'authoring', inset: 'authoring' },
  // NO `modifiers` AXIS (#845), and its three values were three different things, which is the whole
  // defect: an axis's values are mutually exclusive coordinates along ONE dimension, and a button can
  // carry a leading visual AND a trailing visual simultaneously while `pending` is a coordinate on the
  // state axis entirely. It was a bag of unrelated booleans wearing an axis's clothing, and this def's
  // own `codeOnly` said so before the axis was removed.
  //
  // NOTHING IS LOST, because each of the three already lives somewhere that models it correctly, and
  // that is what made this a removal rather than a migration:
  //   leading-visual / trailing-visual → `figmaProperties.slotAxes`, which projects them as the two
  //     presence axes they are (`leading=` / `trailing=`) — declared, and the reason that surface is 648
  //     rather than 162. Presence had to be an AXIS rather than a Figma BOOLEAN because #326's slot-aware
  //     inset changes the CONTAINER's padding, which a boolean's single-node `visible` cannot reach.
  //   pending → `states`, and the projected `stateAxis`.
  // So removing the axis is projection-neutral: measured, `figmaAnatomySet` returns 648 members before
  // and after. What it DOES change is the paint census GRID, 1134 → 378 coordinates (4374 → 1458
  // assignments), which is `lint-paint.ts` arm 2's baseline shrinking to stop enumerating a phantom
  // dimension three times over.
  //
  // ONE HAZARD, and it is the reason this removal is not a one-line delete. The deleted `codeOnly` entry
  // was the ONLY place in this def's prose naming `pending` — and `figmaPropertyErrors`'s `admits()` is
  // what licenses omitting a state from the projected axis. Measured before removing it: with the entry
  // gone and nothing replacing it, dropping `pending` from `stateAxis` is still refused (`pending` IS on
  // the axis, so nothing needs admitting) — but `test.ts` asserts that dropping it FAILS *"even though
  // codeOnly MENTIONS it"*, and that assertion was written about this exact entry. The mention had to be
  // preserved somewhere that is not a leading admission, which is what the `slotAxes` comment below now
  // does. Deleting prose a gate reads is the same class of change as deleting the gate.

  // Full color × appearance × size skin, bound to the interactive.* family + cross-cutting
  // disabled.*. Every color now carries the SAME shape (fill+states / on-fill / border / text
  // / overlay), so the matrix is uniform — no per-color gaps. State-qualified slots carry a
  // dotted state suffix. accent is omitted from the base matrix (brand-conditional — it exists
  // only when the brand declares an accent palette). Keys structure the matrix; generators read them.

  // HOW THOSE PAINT KEYS ARE SPELLED (#758). This is the grammar `paintOf` used to have hardcoded, so
  // the two templates below are a transcription of existing behavior rather than a new decision —
  // which is why the 648-member paint is byte-identical across that change by construction.
  //
  // The state-qualified template LEADS, and the order is the fallback: `filled.fill.hover` wins where
  // it exists, and a state that does not restyle a part falls through to the rest key (a `pending`
  // button's fill is its rest fill). Reverse these two and every state paints its rest color — silently
  // identical to their rest sibling, which is #536 item 1's shape.
  //
  // #1223 dropped the leading `{intent}` segment: intent is the component now, so the family is fixed
  // per def (supplied by `intentTokens(family)` above) and no longer a coordinate the key carries.
  //
  // `disabled.*` is deliberately NOT a template here: it switches token family rather than qualifying
  // a key, and it is conditional on the appearance having that structure at rest. That is behavior,
  // and it stays in the projector where it can be expressed.
  paintKeys: ['{appearance}.{slot}.{state}', '{appearance}.{slot}'],

  // The spacing this spec states at comfortable, which density moves one step along the space ladder.
  densitySpacing: ['size.{size}.padding-x', 'size.{size}.padding-x-visual', 'size.{size}.padding-y', 'size.{size}.gap'],

  tokens: {
    // base (variant-independent)
    'radius': 'radius.md',
    // THE OUTLINE BORDER'S THICKNESS (#1278). The WIDTH does not move — Prism 2 draws its outline
    // buttons at 1px and that is owner-confirmed — so this binds the token that already resolves to 1
    // rather than choosing a new figure. What moves is PROVENANCE: the 1 was the executors' literal
    // (`if (!node.strokeWeight) … = 1`), the right number with nothing behind it, and a brand re-runging
    // its border floor changed every other bordered part while the button stayed at Figma's fallback.
    //
    // `border-width.hairline` is 1px in all four corpus brands, aliased to `<root>.core.dimension.1`,
    // and its own `$description` calls it the *default border floor* — which is what a button's edge is.
    // No token is added, so `CONTRACT_VERSION` does not move; #1228 bound the three selection controls to
    // `border-width.thick` by the identical mechanism, and the two figures staying DIFFERENT is the point
    // rather than an inconsistency: 2px is a control weight, 1px is a button's, and both defs now agree
    // with the reference through a token instead of one through a token and one through a fallback.
    //
    // BOUND ON THE SHARED CONTAINER, so it is carried at `filled` and `text` too, where no border paints.
    // That is #1228's own shape one def along — checkbox at `checked` and switch at `on` bind a thickness
    // and paint nothing — and it is precisely the coordinate `claimDefaults`' gate exists for: the literal
    // would otherwise run AFTER the bind loop and UNBIND what Figma just accepted, reporting no miss.
    'border-width': 'border-width.hairline',
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',
    // The flush side's padding (#2350): the zero step, bound rather than left a literal 0, so the designer reads
    // `space/0` on the side and a brand cannot move it. Zero by meaning: a pinned icon on that side sits at the edge.
    'inset.flush': 'space.0',

    // per-size geometry + label type. The height is the shared `size.*` rung; the spacing is this spec's
    // own, as `space.*` steps at COMFORTABLE density (the spacing model, 2026-09-29), and density moves each
    // one step along the space ladder (`densitySpacing` below). The horizontal model, left edge inward:
    // [padding-x-visual][icon][gap][label][padding-x]. Three values, one ordering:
    //
    //     gap  <  padding-x-visual  <  padding-x
    //
    //   · `gap` (#325) is tightest — PROXIMITY. The icon and label must sit closer to each other than to the
    //     button's edge, or they read as two things sharing a box.
    //   · `padding-x-visual` (#326) sits between — an icon's own bounding box already adds apparent space,
    //     so equal numeric padding reads as TOO MUCH on the icon side. Material 3 (`leading-space` 24 vs
    //     `with-leading-icon-leading-space` 16), Spectrum (`edge-to-text` vs `edge-to-visual`) and Carbon
    //     converge on it.
    //   · `padding-x` is loosest — plain text carries no bounding-box bonus.
    //
    // The ordering is the contract, asserted over every def at every density after the step rule
    // (`test.ts`, "spacing ordering"). The steps are the ones the shared scale used to derive
    // (gap = half of padding-x, the icon side two-thirds snapped to the scale), kept pixel-identical at
    // comfortable: small 16/12/8, medium 16/12/8, large 24/16/12, with 6/8/8 block padding. The steps live in
    // `button-spacing.ts` (data only, so the studio can read them without importing a def).
    //
    // `icon` — THE ONE-RUNG OFFSET (#1350, OWNER-DECIDED 2026-09-08). The control rung binds a glyph
    // artboard ONE RUNG BELOW its own rung: small→xs (16), medium→sm (20), large→md (24). This is
    // deliberately NOT #324's 1:1 identity any more, and the reversal is scoped to the TEXT-BEARING
    // button family (button / -destructive / -neutral) alone. #324/#756 built the identity so that a
    // control's icon matched a standalone `<Icon>` at the same size — a medium button's icon and a
    // standalone medium icon both 24. The owner has SANCTIONED breaking that here: a label already
    // carries the button, so its flanking glyph reads better one rung smaller, and 32px at `large`
    // (the old `lg`) was simply too big. `icon-button` is UNCHANGED — an icon-only control has no
    // label to lean on, so its glyph stays on the 1:1 ladder and still matches a standalone icon.
    // So the composition identity now holds for icon-button and is deliberately offset for buttons.
    // `lint-rung-names.ts` arm 3 and `test.ts`'s icon-button↔button parity assertion both record this
    // as a one-rung offset rather than an equality, and still FAIL BY NAME if the button icon drifts
    // to any rung other than exactly one below `md` (docs/34 — the invariant changed shape, it did not
    // disappear).
    ...(BUTTON_SPACING_AT['small']),
    'size.small.height': 'size.sm.height',
    'size.small.icon': 'icon.size.xs',
    'size.small.filled.type': 'type.label.sm.emphasis',
    'size.small.outline.type': 'type.label.sm.emphasis',
    // #2324 (owner Q110): a text button's label is underlined at rest and in every state; the underline is fixed.
    'size.small.text.type': 'type.label.sm.emphasis-link',
    ...(BUTTON_SPACING_AT['medium']),
    'size.medium.height': 'size.md.height',
    'size.medium.icon': 'icon.size.sm',
    'size.medium.filled.type': 'type.label.md.emphasis',
    'size.medium.outline.type': 'type.label.md.emphasis',
    // #2324 (owner Q110): a text button's label is underlined at rest and in every state; the underline is fixed.
    'size.medium.text.type': 'type.label.md.emphasis-link',
    ...(BUTTON_SPACING_AT['large']),
    'size.large.height': 'size.lg.height',
    'size.large.icon': 'icon.size.md',
    // RESOLVED #1260 (owner target 2026-09-17): a large button's label is 18px at emphasis (600),
    // bound to the `type.label.lg` rung MINTED for it — the body-lg SIZE (18) at the label tier's own
    // WEIGHT (emphasis/600). Before this, there was no `lg` rung so `large` reused `md` and a large
    // button's label was typographically identical to a medium one while height/padding/gap all moved;
    // #1248's type-key sweep measured that collapse (2 distinct styles across 3 sizes). It is now 3 —
    // `type.label.{sm,md,lg}` = 12/14/18 — and the sweep's authored expectation moves to 3 in step, so
    // re-pointing this back to `md` fails that gate by name (docs/34). Label is reading/UI text, exempt
    // from the typeScale shift, so `lg` resolves to 18px in every density (the owner's comfortable target).
    'size.large.filled.type': 'type.label.lg.emphasis',
    'size.large.outline.type': 'type.label.lg.emphasis',
    // #2324 (owner Q110): a text button's label is underlined at rest and in every state; the underline is fixed.
    'size.large.text.type': 'type.label.lg.emphasis-link',

    // THE PER-FAMILY PAINT — the full appearance × slot × state skin, bound to `interactive.<family>.*`.
    // Authored once in `intentTokens` above and spread here so the three components cannot silently
    // diverge (#1223, docs/34); the keys the projector reads (`filled.fill`, `outline.border.hover`, …)
    // are what that function returns. `test.ts` asserts these are the ONLY tokens that differ across the
    // three defs.
    ...intentTokens(family),

    // cross-cutting disabled (docs/20 §7) — ONE treatment, any appearance, IDENTICAL across all three
    // button components (that identity is why splitting the intents loses no coverage — #1223).
    //
    // INK IS KEYED TWICE, per ground (#784), and until #784 the second form was spelled
    // `disabled.on-fill` — a slot segment the projector never dispatches, so it was bound, gated, and
    // reached at no coordinate while every disabled appearance painted page ink. On `filled` that put
    // `disabled.text` on `disabled.fill` at 2.14:1 / 2.55:1 in two corpus brands, against the 3.04-3.08:1
    // contract `disabled.on-fill` already held. The `.on-fill` suffix now QUALIFIES the slot it paints
    // rather than replacing it, so `label`/`icon` stay words `paintOf` asks for and the projector picks
    // the form by whether the appearance actually has a disabled fill beneath the ink.
    'disabled.fill': 'color.disabled.fill',
    'disabled.label': 'color.disabled.text',
    'disabled.icon': 'color.disabled.icon',
    'disabled.label.on-fill': 'color.disabled.on-fill',
    'disabled.icon.on-fill': 'color.disabled.on-fill',
    // THE DISABLED EDGE TRACKS THE DISABLED INK (#1349), and until here it did not. It bound
    // `color.disabled.border` — a muted neutral matched to `disabled.fill` (both resolve `neutralLow()`,
    // gated `min: 0`) — which on a dark/inverse band paints DARKER than the disabled label/icon it
    // surrounds (nb dark: border `neutral.750` vs ink `neutral.550`), so the disabled outline button's
    // edge read heavier than the text inside it. A border is a NON-TEXT graphical object, so its whole
    // a11y bar is SC 1.4.11's 3:1 against adjacent colors — it does not need to be darker than the ink,
    // and matching the ink is both the correct weight and a real contract where the old role carried none.
    //
    // So the edge now binds `color.disabled.icon` — the SAME role the disabled icon ink binds two lines
    // up, its graphical-object peer among the disabled roles (`disabled.text`/`disabled.icon` resolve
    // identically; icon is the non-text one). It is STRUCTURAL (`anatomy-figma.ts` STRUCTURAL = {fill,
    // border}), so it paints only on `outline`, where there is no fill and the edge sits on the page —
    // exactly the ground `disabled.icon` is gated against (`background.primary`), so the border inherits
    // that role's real contract rather than the old `min: 0` exemption. Measured against the page: nb/aurora
    // 3.16:1, harbor 3.32:1 (reduced, `disabledMin` floor 3), HC modes ≥4.5:1 — clears 3:1 in every mode by
    // construction (`disabled.icon`'s own `min` is ≥3, so nothing here can dip below the graphical-object bar).
    // The `color.disabled.border` ROLE is unchanged and still bound by the other bordered controls
    // (text-field, select, the *-control trio), so no token NAME moves and CONTRACT holds. Icon-button
    // took the same rebind in #1697 (it painted 1.48–1.80:1 against the page on the old role).
    // `test.ts` pins the equality BY NAME (border role === icon role, ≠ the old `color.disabled.border`)
    // and re-measures the resolved ratio ≥3 across the corpus, so a revert to the darker binding fails
    // a named assertion rather than shipping the heavier edge again (docs/34).
    'disabled.border': 'color.disabled.icon',
  },

  // The STRUCTURAL layer (#327), instantiated from the KB brief §2 — which is already an
  // adjudicated cross-system anatomy, so this is a transcription into schema, not a re-derivation.
  //
  // Two parts of the brief resolve differently here, and both are decisions rather than omissions:
  //  · The brief's "container/target" and "layout container" are ONE part. In the brief they are
  //    separate paragraphs because CSS lets them be separate concerns; in both Figma auto-layout
  //    and `inline-flex` they are the same node, and splitting them would emit a redundant frame.
  //  · The focus ring IS a part, and this REVERSES the decision recorded here through #493 (#536
  //    item 3). The old reasoning was that a ring is "a stroke-with-offset on the target, not a node",
  //    so a part would put something in the child tree a materializer has nowhere to place. Both
  //    halves were wrong, and the second is what mattered: the ring is a node — an ABSOLUTELY
  //    positioned sibling — and a materializer places it precisely because it takes no cell in the row.
  //    What forced the reversal was the cost the old decision carried, measured rather than argued:
  //    `appearance=outline, state=focus-visible` emitted its REST border and no ring at all, and all
  //    108 focus-visible rows were byte-identical to their rest sibling. A ring drawn on the target
  //    instead would have to win the target's single stroke away from outline's border. An absolute
  //    sibling has its own, so nothing is traded — see `parts.focusRing`.
  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // THE ORDER IS THE PRECEDENCE (#933): the overlay if it resolves, otherwise the fill. `filled`
        // keys a fill and no overlay; `outline` and `text` key an overlay and no fill, because they have
        // no fill to change for hover and express it as a translucent wash on this same node. Exactly
        // one of the two resolves at any coordinate, so the order is a tie-break that never fires — it
        // is written down because the projector used to hold it as a hardcoded `??` and the def that
        // depends on it could not see it.
        paintSlots: ['overlay', 'fill', 'border'],
        role: 'target',
        children: ['leadingVisual', 'label', 'trailingVisual', 'focusRing'],
        // justify: center is the CONSTANT (docs/28 §5.2). Primer ties alignment to purpose —
        // center for CTAs, left for selection toggles — but that would make `align` the first
        // LAYOUT prop in ComponentDef, a precedent propagating across ~40 components. Deferred
        // until a real surface needs it, not settled by preference.
        //
        // The reference brand was that surface (#1667), and the answer is a BRAND lever, not a prop: a brand's
        // buttons all pin their icons or none do. `buttonIcons: edges` ("Locked to edges") is applied by
        // `applyButtonLayout` before projection — this root keeps hugging above its floor, the icons go out
        // of flow pinned to its edges (`PartDef.pin`), and each icon's side reserves inset + icon + gap as
        // padding, so the label centers in the space beside them and the button still grows with it. What
        // is authored here is the default, "Attached to label", unchanged. The per-size `minWidth` floor is
        // written there too, from the brand's heights, which is why this def authors none.
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        padding: {
          block: 'size.{size}.padding-y',
          inlineLabel: 'size.{size}.padding-x',
          inlineVisual: 'size.{size}.padding-x-visual',
        },
        gap: 'size.{size}.gap',
        height: 'size.{size}.height',
        radius: 'radius',
        // The EDGE's thickness (#1278) — see `border-width` in `tokens` for the figure and why it is
        // 1 and not 2. Names the def's own key rather than the token, exactly as `radius` above and as
        // checkbox/radio/switch do.
        strokeWidth: 'border-width',
        // #2350 — the flush side, per member. Its padding binds `inset.flush` (0), the row distributes toward it,
        // and the container paints no wash there (owner Q143 item 2: a flush button hovers by color only).
        flush: { axis: 'inset', start: 'flush-start', end: 'flush-end', key: 'inset.flush' },
      },
      // `nesting: swap` on all three swap-materialized parts (#681). A slot's target is nominated per
      // FILE by the caller and its content is the designer's to change, so there is no variant for the
      // def to fix — which is exactly what `swap` says.
      leadingVisual: { kind: 'slot', optional: true, size: 'size.{size}.icon', nesting: { kind: 'swap' }, note: 'Icon / avatar / counter / spinner before the label.' },
      label: { kind: 'text', optional: false, type: 'size.{size}.{appearance}.type', note: 'Its own node so truncation, wrap and line-height are controllable independently of the row.' },
      trailingVisual: { kind: 'slot', optional: true, size: 'size.{size}.icon', nesting: { kind: 'swap' }, note: 'Icon / caret / indicator after the label. Not split into visual + action (docs/28 §5.3): the condition that split rested on — a pending state needing its own slot — is already carried by leadingVisual + isPending.' },
      spinner: {
        kind: 'overlay',
        // THE SPINNER COMPONENT (#1670), swapped in at the member on the slot's own icon rung (a medium
        // button's `icon.size.sm` → `spinner/small`). Before `spinner` existed the overlay took the caller's
        // icon placeholder, so a pending member showed a placeholder glyph where the spinner belongs.
        nests: 'spinner',
        nesting: { kind: 'swap' },
        // ORDERED, and the order is the design decision (#848). Leading first because a spinner on the
        // left reads as "loading" while one on the right reads as a trailing indicator; trailing second
        // because a cell that EXISTS is always a better host than the label-overlay fallback.
        replaces: ['leadingVisual', 'trailingVisual'],
        overlaysWhenAbsent: 'label',
        when: 'pending',
        size: 'size.{size}.icon',
        note: 'Takes a visual cell when there is one (Primer: "the spinner replaces only that visual slot, and the button label remains visible") — width identical, because the cell was already the icon\'s size. With no visual cell at all there is nothing to take, so it goes out of flow, centered on the label, and the label holds the width open at zero opacity (React Aria). Generalized from "the leading visual" to "a visual cell" by #848, and the narrow reading was a real defect rather than a simplification: `replaces` named only `leadingVisual`, so `leading=false, trailing=true` — which has a visual cell — fell through to the label overlay and rendered as spinner + trailing visual with the label at zero opacity, i.e. two icons and no text. Found in a live Figma paste; every gate was green (see #848 and docs/34 shape 16). The older note before that ruled out the label\'s position on the grounds that replacing a centered label collapses the width, which conflated replacing with removing: removing the label collapses the width, overlaying it does not, and that conflation ruled out the correct fix for the label-only case for as long as it stood (#612).',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        // THE STROKE THE OFFSET HAS TO CLEAR (#801). `ring-offset` is the visible gap the brand asks
        // for; the ring draws its own 2px stroke INSIDE its bounds, so a materializer that positions
        // this part at -2 has the stroke drawn back across the whole gap and the ring lands flush on
        // the border. Both numbers travel and the executor sums them — see `PartDef.strokeInset`.
        strokeInset: 'ring-width',
        // `nest-fixed` with `follow: ['surface']` (#1134, #1156). The ring's `surface` FOLLOWS this
        // button's `surface`: a `surface=inverse` button member nests the `surface=inverse` ring, so a
        // button on a dark band gets the ring tuned for that band — which is what its own 3:1 contract
        // needs (1.4.11, the reason the ring has the axis). `variant: { surface: 'default' }` is the
        // fallback, reached only where the host member does not carry `surface` (a structure-only plan).
        // This is why both axes are named `surface` (#1134): the passthrough is by NAME, and a button
        // spelling it `surface` while the ring spelled it `color` could not drive one through the other.
        // Naming the variant is still #681 — the def CHOOSES rather than inheriting the ring set's first
        // child (creation-order, #656's error one layer out); `follow` only makes the choice per member.
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' }, follow: ['surface'] },
        note: 'An absolutely-positioned sibling nesting the shared `focus-ring` component. Takes no cell in the row, so no geometry moves, and has its own stroke — which is what dissolves the collision rather than trading a loss: a ring drawn on the target would compete with `appearance=outline`\'s border for the single stroke a Figma node has, at three different palette steps (550 ring / 500 border / 550 rest fill). Shared rather than authored per host because the ring is nobody\'s component — `focus.ring.*` and `color.border.focus` are top-level families and `focus.ring.offset-field` already emits separately.',
      },
    },
    derived: {
      'min-width': 'height × minWidthMultiplier — Spectrum computes it rather than authoring it, so a short label ("OK") cannot produce a stubby button',
      'pill-radius': 'height ÷ 2 — only when appearance uses the pill radius; a literal radius token would be wrong at more than one height',
    },
    // The ceilings. Each is structure the neutral vocabulary can state and Figma provably cannot
    // hold, so it is recorded rather than silently lost in the projection.
    codeOnly: [
      'touch-target-expansion — the optical box and the hit box are deliberately decoupled (::before / absolute overlay), reconciling the WCAG 2.5.8 24×24 floor with Apple HIG 44×44 without inflating a compact button. Figma has no concept of a hit area larger than the frame. A flush text button (#2350) keeps the same hit box: its height and minimum width are its default sibling\'s, and in code the hit area may extend past the flush edge into the gutter, which Figma cannot show.',
      'focus-ring-offset — the ring GEOMETRY now projects (an absolute sibling nesting the shared `focus-ring`), but its position is FROZEN at paste: Figma\'s x/y accept no variable binding, so the payload resolves `focus.ring.offset` AND `focus.ring.width` to numbers, sums them, and writes the result (#801 — the ring\'s stroke is drawn INSIDE its own bounds, so the gap the brand asked for has to be widened by the stroke that eats it). Two names freeze exactly as one did. Every bound paint re-themes when a brand changes; an already-pasted ring does not move. AND A REBUILD DOES NOT MOVE IT EITHER, which is the half worth writing down: the executor finds the set by name on the current page and skips each member by name, reporting `✓ already built` without writing any geometry — so to pick up a corrected ring position you must DELETE the existing component set, or build onto a fresh page. This is not specific to the ring; it is true of any geometry, paint or constraint change to an already-pasted set, and it is tracked as #827 because name-based idempotence cannot tell "already built correctly" from "built by an older engine". The `:focus-visible` CONDITION remains unprojectable — Figma carries the ring as a variant coordinate a designer selects, not as a state a pointer triggers.',
      'focus-ring STROKE, WIDTH and RADIUS — owned by the nested `focus-ring` component, not by this def. `focus-ring`, `ring-width` and `ring-offset` are bound in `tokens`, and since #801 BOTH numbers reach a Figma node as this def\'s own absolute geometry: the host positions the part at -(offset + width), because the ring draws its stroke inside its own bounds and would otherwise consume the whole gap. Since #1266 the width reaches the RING\'s node too, as its bound `strokeWeight` — so the compensation and the stroke it compensates for are finally the same number, which for three releases they were not. So this def verifies that a ring is nominated and where it sits, including the compensation that makes "where" visible, and nothing more. Sharing the ring is still the right call — the ring is one shared thing (`focus.ring.*` and `color.border.focus` are top-level families) and authoring it N ways in N hosts would be worse. But the UNGATED PART IS NOT A CONSEQUENCE OF SHARING IT, which is what this entry once claimed: it is projector and schema gaps, neither of them a trade anybody made. ALL THREE are now CLOSED, and what took the third one\'s place is smaller than the third one was. PAINT (closed #758 → #784): `paintOf` once keyed every lookup as `{intent}.{appearance}.{slot}`, so a def whose axes are surface/tone resolved nothing; #758 replaced that with each def\'s own `paintKeys` and #784 corrected the ring\'s keys to the slot vocabulary the projector dispatches. STRUCTURE (closed #795): this entry said `figmaAnatomySet` refuses any variant axis outside intent/appearance/size and `planComponentName` always writes a `size=` coordinate the ring has no axis for, so a ring member could never match the coordinate this def nests by — #795 deleted the axis list and made `size=` conditional on the def declaring `size`, and `focus-ring` now projects two members named exactly `surface=default` / `surface=inverse`, which is what this def\'s `nesting: { variant: { surface: \'default\' }, follow: [\'surface\'] }` asks for (re-verified against `nestVariantMatch`). STROKE WIDTH (closed #1266): `PartDef` gained `strokeWidth`, `focus-ring`\'s `ring` part binds it, and every projected member carries a bound `strokeWeight`. Before it, both executors fell through to `if (!node.strokeWeight) … = 1` and the ring pasted at 1px in every brand — half its declared thickness, and 3px of visible gap where 2 was designed, because the compensation above had already assumed 2. What is LEFT is one keyword: `PartDef` has no field for a stroke\'s style, and cannot usefully have one, because Figma expresses `solid`/`dashed` as a `dashPattern` of pixel runs rather than as a keyword — so `focus.ring.style` resolves against every brand and has nowhere to bind. A schema decision under #740. Read the remaining gap as "the ring pastes without its dash style", not as "the ring pastes without its stroke".',
      'min-width derivation — a literal per size at build (#1667): height × multiplier, rounded up to 8px, from baseline-density heights. Frozen, not live; a per-mode density keeps the baseline floor.',
      'Locked to edges (#1667) — in code, padding plus absolutely positioned icons: the button keeps `inline-size: auto` above its `min-inline-size` floor, each icon side pads by `calc(padding-x-visual + icon + gap)`, and the icons sit `position: absolute` at `padding-x-visual` from their edge, vertically centered, so the label centers in the space beside them. Figma holds the same shape with the reserve and the inset as literal px per size (its padding binds one variable, not a sum), so a brand change reaches them only on a rebuild, as with the floor.',
      'width (auto | full) — declared as a variant axis but deliberately NOT projected into Figma (#487 §4). A designer resizes an auto-layout frame; a variant axis for it doubles the whole set to buy nothing a drag does not already do.',
      // #1697 — brief §9 and §11, carried as code-tier rules. None of the four LEADS with an axis or state
      // name: `admits()` reads the first word as an admission that the name is unprojected (#867), so a
      // rule that opened with `pending` or `size` would license dropping it from the Figma projection.
      'Label overflow (brief §9) — the label wraps to a second line rather than truncating, since an ellipsis hides the action. The button takes no fixed English width: `min-inline-size` plus padding, so a German or Finnish label widens it. Figma holds one line of placeholder text, so neither rule projects.',
      'RTL mirroring (brief §9) — logical properties (`padding-inline`, `margin-inline`, flex `gap`) mirror the whole row, so the leading and trailing visuals swap sides on their own. Only directional glyphs (back and forward chevrons) flip, set per icon (`autoMirror`), never a blanket `scaleX(-1)` on the slot; search, settings and media-transport glyphs stay as drawn.',
      'Press behavior (brief §11) — built on a headless press primitive (React Aria `usePress`, Atlassian `Pressable`) that normalizes mouse, touch, keyboard and pointer, with the visual tokens owned here. No `overrides` surface into internal nodes: strict token mapping and headless composition instead.',
      'Form integration (brief §11) — inside a `<form action>`, `useFormStatus` sets `isPending` while the action is in flight. The component forwards `ref` and spreads rest props onto the underlying element, which tooltip and popover anchoring depend on.',
      // The `modifiers` admission is GONE, with the axis it admitted (#845). Two notes on why it is not
      // simply deleted-and-forgotten. FIRST, its closing sentence had already gone stale: it said slot
      // presence "needs its own variant axis … that axis does not exist in this def yet", and `slotAxes`
      // has existed since #487 step 2 — so the entry was admitting an axis for a reason that had been
      // fixed, which is a stale exemption reading as a live one. SECOND, an admission for an axis the def
      // no longer declares is refused by nothing in either direction; `figmaPropertyErrors` only asks
      // whether every DECLARED-and-unprojected axis is admitted, never whether every admission has an
      // axis. So it would have sat here indefinitely as evidence for an axis that was gone.
      // The `intent-at-disabled redundancy (#612)` entry is GONE with #1223, and its removal is the point
      // rather than an omission. It documented that all three intents rendered ONE byte-identical row at
      // `state=disabled` (144 redundant rows, accepted not pruned) — a redundancy that existed only
      // because intent was an AXIS crossing state. #1223 removes the intent axis entirely: each button
      // component now carries ONE disabled skin per coordinate, and the three components' disabled skins
      // are identical to each other (the shared `disabled.*` block), which is the token tier being correct
      // one level up. There is no per-intent redundancy left to admit, so the entry and the `admits()`
      // guard that protected its wording both retire — nothing declares `intent` for the check to key on.
      'inactive — a real state (isInactive), deliberately NOT a Figma variant. Its whole delta from `disabled` is behavioral: it retains tab order, keeps the control in the a11y tree, carries aria-disabled rather than the native attribute, and surfaces the blockage reason on focus. None of that is paint, so a variant has nothing to encode. At the TOKEN tier its intended visual is `disabled`\'s by an explicit decision (docs/03 item 3, resolved 2026-06-24: `disabledStrategy: \'accessible\'` IS the KB\'s contrast-preserving `inactive`; docs/06 defines `text.disabled` as "disabled / inactive ink"). The EMITTER does not implement that yet — `anatomy-figma.ts` special-cases `state === \'disabled\'` only, so `inactive` falls through to the `rest` paints, which is worse than a duplicate: the column would have read as a normal enabled button. Either way it is unprojectable, and the two facts fail it independently.',
    ],
  },

  // How this projects into Figma component properties (#487 §5). DECLARED, not inferred from
  // `props[].type` — those are prose. Deliberately partial: `variantAxes` names only the three axes
  // that exist and should project, and every axis it omits is admitted in `codeOnly` above (the
  // validator enforces that pairing). The slot-presence axis §4 calls for is future def work, so it
  // is absent rather than stubbed.
  figmaProperties: {
    // `surface` PROJECTS (#1134) — it doubles each component's set (216 → 432) so a designer can pick a
    // button for a dark band from the same component, which is the deliverable. It is a real axis a
    // variant carries, unlike `width` (a drag, admitted in codeOnly): the two grounds are genuinely
    // different pixels, and Figma has no way to publish "inverse context" to a nested instance, so an
    // explicit coordinate is the only thing that can carry it. Its inverse paints come from the
    // projector's `color.inverse.*` rewrite (see `variants.surface`), not from keys in `tokens`.
    //
    // #1223 — `intent` is NO LONGER an axis here. Each of the three button components fixes one family,
    // so its set is appearance(3) × size(3) × surface(2) × state(6) × slot-combos(4) = 432 members; the
    // former single 1296-member set is now three 432-member sets (Button / Destructive / Neutral).
    // `inset` PROJECTS (#2350) — padding is the container's, so it is an axis for the presence axes' reason below.
    variantAxes: ['appearance', 'size', 'surface', 'inset'],
    // FLUSH IS THE TEXT APPEARANCE'S ALONE (#2350, owner Q143): filled and outline have a visible edge, which needs
    // its padding. So the set has no flush filled or outline member: 432 + 288 flush text members = 720.
    excludeCoordinates: [{ appearance: ['filled', 'outline'], inset: ['flush-start', 'flush-end'] }],
    // Six of the seven in `states` above — still the single source (#487 §0.4). The legacy sheet's
    // six (`active`, `focused`, `loading`) are deliberately NOT codified: they are that sheet's names
    // for `pressed`, `focus-visible` and `pending`.
    //
    // `inactive` is the one omission, and it is admitted in `codeOnly` above rather than dropped —
    // same mechanism `focus-ring-offset` uses. Seven remains right for `states` (the def's truth);
    // six is right for the projection (what a variant can carry). Keeping it would have shipped 108
    // rows that render as their `rest` sibling — the emitter has no `inactive` paint branch — under a
    // label promising a blocked control. See the codeOnly entry for why no branch is worth adding.
    stateAxis: { name: 'state', values: ['rest', 'hover', 'focus-visible', 'pressed', 'pending', 'disabled'] },
    // Slot PRESENCE (§4) — the axis `planComponentName` has been emitting all along. Declaring it
    // takes the projected surface from 189 to 756, which is what the emitter already produced; the
    // gap was in the declaration, not the emitter.
    //
    // An axis rather than a BOOLEAN because presence changes the CONTAINER's geometry: #326's
    // slot-aware inset sets `paddingLeft = leading ? inlineVisual : inlineLabel` per side, and a
    // Figma BOOLEAN drives one node's `visible` and can touch nothing above it. `booleans` staying
    // stated-empty below is the same finding read from the other end.
    //
    // THESE TWO AXES ARE WHERE `modifiers` WENT (#845). That axis listed `leading-visual`,
    // `trailing-visual` and `pending` as though they were alternatives; the first two are these two
    // presence axes, and `pending` was never a modifier at all — it is a value on the state axis
    // directly above, which is why removing the axis dropped nothing. This is deliberately NOT a
    // leading `codeOnly` admission: `admits()` requires an entry to LEAD with a name to license
    // omitting it, so stating `pending` here records where it went WITHOUT licensing its omission from
    // the state axis. `test.ts` asserts that dropping `pending` from that axis fails *even though*
    // codeOnly mentions it — an assertion written about the deleted `modifiers` entry, and the reason
    // this mention had to land somewhere that cannot be mistaken for an admission.
    //
    // `figmaName` is the icon-property canon (#1380), the #1309 display-name decoupling reaching the
    // presence axes: the code axis stays the idiomatic `leading`/`trailing` (what `planSetLayout` and the
    // slot machinery key on), while the SWITCH a designer reads in the panel is `leading icon` /
    // `trailing icon`. A true/false variant axis renders as a switch in Figma; the label is what this sets.
    slotAxes: [
      { name: 'leading', part: 'leadingVisual', figmaName: 'leading icon' },
      { name: 'trailing', part: 'trailingVisual', figmaName: 'trailing icon' },
    ],
    // Slot CONTENT, so a designer can pick the icon — orthogonal to presence above. `figmaName` gives each
    // swap the canon panel label `↳ swap leading icon` / `↳ swap trailing icon` (#1380): the `↳ ` prefix
    // (U+21B3 + space) makes Figma render it nested beneath its `leading icon` / `trailing icon` switch,
    // while the code prop stays the idiomatic `leadingVisual` / `trailingVisual` (validated against `props`).
    swaps: {
      leadingVisual: { part: 'leadingVisual', figmaName: '↳ swap leading icon' },
      trailingVisual: { part: 'trailingVisual', figmaName: '↳ swap trailing icon' },
    },
    // "Button" is the placeholder, and it lives here rather than in the payload: the def is the layer
    // a second brand overrides. Figma accepts an empty TEXT default, which is what #510's set shipped —
    // 21 structurally perfect variants with nothing readable in any of them.
    //
    // KEYED `label` (#1242/#1333) — the idiomatic lowercase prop, validated as a declared `prop` name.
    // No `figmaName` needed: the canon panel label IS `label` (#1380), so the KEY doubles as the display
    // name. It projects FIRST in the panel (text → swap → boolean order in `planSetProperties`), which is
    // the "label at the top" half of the icon-property canon.
    texts: { label: { part: 'label', default: 'Button' } },
    // Empty, and stated rather than omitted. `fullWidth` is layout; `isPending`/`isInactive`/
    // `disabled` collapse into the state axis; `onClick`/`type`/`href` are behavioral. A Figma
    // BOOLEAN drives one node's `visible` and nothing else, and none of those are that.
    booleans: {},
    // The set's COLUMNS (#656). `state` because it is the axis a designer reads across — the six
    // steps of one skin, side by side, is how the color layer was reviewed and how the legacy sheet
    // is drawn. It is also the widest axis here, so the cardinality fallback would pick it anyway;
    // declaring it is what stops the next axis added to this def from taking the columns by accident,
    // which is precisely what `slotAxes` did in #536 (the full set laid out 324 × 2, measured live at
    // 320 × 23304px). With this, 72 rows × 6 columns per component (#1223 — was 108 × 6 when intent
    // crossed the row axis; each of the three components now carries a third of the rows).
    gridAxis: 'state',
  },

  accessibility: {
    role: 'button (native <button>; never div[role=button] — it inherits Space/Enter activation, focus, and HC affordances for free)',
    // #1697 — every entry carries its reason, and 2.5.5 is stated as intent: `lint-hit-target.ts` gates the
    // 44px floor at the default size on comfortable and spacious densities, and names a small button and
    // compact density as the two exceptions, so "meets 44×44" would be a claim the engine does not make.
    // 1.4.13 is left out on purpose: the brief lists it "only if a tooltip is attached", and this def
    // attaches none (see `notes.evolution`).
    wcag: [
      '1.4.11 Non-text Contrast (the focus ring and boundary at 3:1)',
      '2.4.7 Focus Visible (a :focus-visible ring on every member, never suppressed, kept through pending and inactive)',
      '2.4.13 Focus Appearance (AAA — the ring is offset from the edge, so a sliver of background separates it from the fill)',
      '2.5.3 Label in Name (an aria-label starts with the visible label text)',
      '2.5.8 Target Size (Minimum) (24×24 — small is 36px tall, 28px at compact density)',
      '2.5.5 Target Size (Enhanced) (44×44, as intent — medium clears 44px at comfortable and spacious density and misses it at compact (36px); small clears it only at spacious (44px); reaching 44 elsewhere is a code-side hit-area expansion)',
      '4.1.2 Name/Role/Value (native <button>: the label is the name, the role is button, and state rides aria-disabled, aria-busy and aria-pressed)',
    ],
    keyboard: 'Native <button>: Enter activates on keydown, Space on keyup. (This asymmetry vs a link — which activates on Enter only, Space scrolls — is exactly why a navigating "button" must be a real link.)',
    focus: 'A :focus-visible ring (color.border.focus) with an outline-offset so a sliver of background separates ring from border — it does not blend into the button\'s own fill (WCAG 1.4.11, target 3:1). Never suppressed. Focus is retained through pending and inactive (aria-disabled, not native disabled).',
    aria: 'State attributes are distinct, not interchangeable: aria-pressed only for a toggle-button; aria-expanded (+ aria-haspopup) for a menu/disclosure trigger; aria-checked only for the switch role. Do not conflate them. Busy: while isPending, set aria-busy and announce via a polite live region ("Saving…"), and set aria-hidden="true" on the embedded spinner, which otherwise announces its own "Loading" status (a double announcement); keep the control focusable so the busy state is discoverable. isInactive/isPending use aria-disabled (not native disabled) so focus and the explanatory name/description stay reachable. Localization (brief §9): the label wraps rather than truncating and has no fixed English width, the row mirrors under RTL through logical properties, and only directional glyphs flip.',
  },

  content: {
    labelPattern: 'Verb-first, action-specific, sentence case, ≤3 words. "Save changes" / "Delete file" — never "OK", "Submit", or "Click here".',
    errorPattern: 'Button has no error state — surface failures in an adjacent inline-message / alert (errors belong to the form/field).',
    dialogPattern: 'Match the destructive verb to the consequence ("Delete", not "Confirm"). Cancel = abort+revert; Close/Dismiss = dismiss info; never "OK" on an error.',
  },

  // SHARED across the three components (#1223) — the universal rules. Color is the component, so the
  // "which intent" guidance lives in each component's own `description`; what stays here is the appearance
  // hierarchy, labels, states and surface, which apply the same to Button / Destructive / Neutral.
  docs: {
    usage: 'Use for an immediate action in the current context — submit/save/reset a form, trigger a UI state change (open modal, toggle drawer), or fire async work. Color is the component (Button / Button.Destructive / Button.Neutral — pick by semantics); rank actions within a view by appearance (filled > outline > text), with exactly one filled button per view or region.',
    do: [
      'Lead with a verb, name the object ("Publish post", not "Submit")',
      'Keep exactly one filled button per view; demote the rest to outline / text, so a view of three actions is three buttons at three appearances rather than three fills competing',
      'Set surface=inverse for a button on a dark or brand-filled band, so its fill, ink, border and disabled treatment bind the inverse counterparts instead of losing contrast against the flipped ground',
      // THE BRAND'S BUTTON SETTINGS (#1667), stated for the agent that builds this component in code: the
      // def is brand-agnostic, so the settings travel as brand input (`buttonIcons`,
      // `buttonMinWidthMultiplier`, `buttonContentSize`, and #1752's `buttonLabelWeight`) and these lines
      // say what each one builds.
      // #1697 — split from one ~400-character line: one item per setting value.
      'Place the icons the way the brand\'s `buttonIcons` setting says; `attached` (Attached to label, the default) keeps them beside the label with the group centered',
      'Under `buttonIcons: edges` (Locked to edges), position each icon absolutely at the visual padding from its edge, pad that side by the padding + the icon + the gap, and center the label in the space left — a button with only a trailing icon has its label slightly left of center, and a long label still widens the button',
      'Give every size a minimum width of its height × the brand\'s `buttonMinWidthMultiplier` (2.25 by default), rounded up to a multiple of 8px — 88, 104 and 128px at heights of 36, 44 and 56px — in both icon placements, so a short label never makes a stubby button',
      'On a brand whose `buttonContentSize` is `smaller` (One step smaller), give a medium button the small size\'s label style and icon size (`type.label.sm.emphasis`, `icon.size.xs`) at the medium height and padding; small and large buttons keep their own',
      // #1752 — the fourth setting. Same shape as the line above: the setting, its option label, what it binds.
      'On a brand whose `buttonLabelWeight` is `default` (Default), set every size\'s label in the `default` weight of its label style (`type.label.sm.default`, `type.label.md.default`, `type.label.lg.default`) instead of `emphasis`; with One step smaller, a medium button takes `type.label.sm.default`',
      // #2324 (owner Q110) — the text appearance's underline, fixed, and the fifth setting. DRAFT words, for the owner.
      'Underline the label of a button at appearance=text, at rest and in every state, disabled included, with its underlined label style (`type.label.sm.emphasis-link`, `type.label.md.emphasis-link`, `type.label.lg.emphasis-link`); the underline is fixed, not a brand setting',
      'Never fill a button at appearance=text at rest; under the brand\'s `buttonTextHover` setting `text` (Text & icon only, the default), change only its label and icon colors on hover and pressed',
      'On a brand whose `buttonTextHover` is `fill` (Fill), also give a button at appearance=text the overlay wash on hover and pressed, as outline buttons take it',
      // #2350 (owner Q143) — DRAFT words, for the owner.
      'Set inset=flush-start or inset=flush-end on a button at appearance=text that starts or ends a column of content, so its label lines up with the content edge; give that side `padding-inline-start: 0` or `padding-inline-end: 0` and justify the content toward it, and keep the hit area at its full size',
      'Never fill a flush button on hover or pressed, whatever the brand\'s `buttonTextHover` is: with no padding on one side the fill would hug the label; only its label and icon colors change',
      'Use isInactive (focusable) for a control blocked by satisfiable state; reserve disabled for the irrelevant',
      ...sibling.do,
    ],
    dont: [
      'Set a flush inset on a filled or outline button — their visible edge needs its padding; flush is for appearance=text',
      'Use a button for navigation to a URL — use a link / link-button',
      'Stack multiple filled buttons competing for attention — differentiate rank by appearance, not by adding fills',
      'Use native disabled on a relevant-but-blocked control (dead end for keyboard/SR users)',
      'Remove the label to make room for a spinner — the button narrows mid-submit and screen readers lose the name; the spinner takes the leading visual\'s place, or overlays a label held at zero opacity',
    ],
    contentGuidelines: 'Verb-first, specific, sentence case, no terminal punctuation, ≤3 words to bound i18n expansion.',
  },

  ai: {
    primaryPurpose: 'Trigger an action in place.',
    whenToUse: 'The user needs to DO something on this surface — submit, confirm, open, apply, or start async work.',
    avoidWhen: `The target is a different location/URL → use a link (or link-button if it must look like a button). A persistent on/off state → use Switch.Row. One-of-many selection → use Radio.Group (or a segmented control, not built yet). A toggle with pressed state → use a toggle button (not built yet). Icon-only with no visible text → use IconButton (the accessible name is required there at the type level). ${sibling.avoidWhen}`,
    // #1697 — `spinner` (the pending state swaps it in, #1670) and `focus-ring` (every focus-visible member
    // nests it) are the two components this one always builds with, beside the icon in its slots.
    commonPartners: ['icon', 'spinner', 'focus-ring'],
    triggerKeywords: sibling.triggerKeywords,
    generationPriority: sibling.generationPriority,
  },

  composition: {
    // What the anatomy nests (#1700): the ring (absolute) and the pending spinner (an overlay swap). The `icon`
    // a slot usually carries is a partner, not a part — a slot names no component (#513).
    composesWith: ['focus-ring', 'spinner'],
    // #1697 — each sibling points at the icon-button of its OWN family, so the destructive button's
    // icon-only alternative is the destructive icon-button rather than the primary one.
    alternativeTo: [family === 'primary' ? 'icon-button' : `icon-button-${family}`, 'switch-row'],
    planned: ['tooltip', 'button-group', 'menu', 'popover', 'link', 'link-button', 'toggle-button', 'split-button'],
    replacesPatterns: ['input[type=button|submit]', 'div[role=button]'],
  },

  motion: {
    enter: 'none (present on mount)',
    exit: 'none',
    // #1697 — the brief's ~100–150ms is carried as the target, not as a fact: this def binds no motion
    // token, so "runs via motion tokens" was a claim nothing made true. Recorded in `notes.unverified`.
    reduceMotion: 'State transitions (background, border, shadow) are meant to run ~100–150ms through the brand\'s motion tokens; this component binds none yet, so the timing is code-side. A subtle press (scale 0.98) gives tactile feedback. Under prefers-reduced-motion, resolve scale/translate to none but keep the instantaneous color change so the state stays perceivable; the pending spinner is functional and its busy state is carried by aria-busy regardless.',
  },

  notes: {
    contested: [
      'native disabled vs focusable isInactive — the practice defaults to isInactive for relevant-but-blocked, but focusable aria-disabled is not yet the field-wide default (per-engagement decision).',
      'a low-emphasis destructive ("quiet Delete") is expressed as the Destructive Button at appearance=text rather than a fully orthogonal emphasis×tone split — tone is the component (#1223), emphasis is the appearance axis within it.',
      'outline/text hover uses the interactive overlay wash, which assumes outlineInteraction=overlay-neutral (the default); a solid-tint / none brand rebinds those slots before projection (`applyOutlineInteraction`, #1608: the tinted-wash variable interactive.<color>.subtle-fill, the control\'s own fill at an opacity step (#1614, #1646) / no hover fill), on the inverse band too.',
      // #1697 — brief §15 `notes.contested`, carried with how this def resolves each.
      'polymorphism (brief §3) — a separate link-button over a generic `as` prop, and where polymorphism is unavoidable, infer `<a>` from `href`. This def keeps `href` as a discouraged escape hatch and lists link-button as planned.',
      'the `modifiers` axis (brief §4, §15) — the brief lists leading-visual / trailing-visual / icon-only / pending as one modifiers axis. This def omits it (#845): the two visuals are slot-presence axes, pending is a state, and icon-only is the separate icon-button.',
    ],
    evolution: [
      // Moved from `contested` (#1700): resolved here, so it is evolution, not an open question.
      'ghost vs plain (brief §3) — the brief flagged `ghost` (an intent) and `plain` (an appearance) as overlapping at the low-emphasis end. Resolved by retiring `ghost` as a color: the quiet button is Button.Neutral at appearance=text (docs/20). Icon-button reuses the word as its appearance value (#1432), where there is no text to name.',
      'RESOLVED (was the v1 HIGH finding): interaction states existed only on the solid action/danger roles, so the default (neutral) button was hover-less. The interactive color system (docs/20) gives every color — primary/neutral/destructive — the full fill+states/on-fill/border/text/overlay shape, so the matrix is now uniform and the default button has proper hover/pressed. Disabled is the cross-cutting disabled.* family, no longer scattered per-color.',
      // #1697 — moved from `unverified`, where it sat marked RESOLVED.
      'RESOLVED (#1260): type.label.lg now exists (18px / emphasis) and size.large.type binds it, so a large button label is one rung above medium (14 → 18) rather than reusing type.label.md.',
      // #1697 — brief §13, the three field shifts, with where each lands here.
      'Field shift 1 (brief §13) — off native `disabled`, toward focusable inactive. Carried as the isPending / isInactive / disabled trio; still not the field-wide default, which is why it is also contested above.',
      'Field shift 2 (brief §13) — behavior moves into headless press primitives (Atlassian `Pressable`, React Aria `usePress`). Carried as a codeOnly rule.',
      'Field shift 3 (brief §13) — framework-agnostic delivery (Web Components + CSS variables). The brief holds its headline example, the Polaris Web Components move, as unverified; nothing here depends on it.',
      '1.4.13 Content on Hover or Focus is left out of `accessibility.wcag` (#1697): the brief lists it "only if a tooltip is attached", and this def attaches none — tooltip is planned, and the criterion belongs to its def.',
    ],
    unverified: [
      // #1697 — narrowed. The ring's 3:1 against the PAGE is gated (focus-ring.ts wcag, per mode, 4.5:1 in
      // high contrast); what stays open is its contrast against the host's own edge.
      'FINDING (engine): the focus ring clears 3:1 against the page in every mode (gated, focus-ring.ts). Its contrast against the host\'s own edge or fill is not measured — the offset is what makes it achievable, not what proves it.',
      'motion timing — the brief\'s ~100–150ms state transition is carried in `motion.reduceMotion` as the target. No motion token is bound, so nothing gates it.',
    ],
  },
});

// ── THE THREE COMPONENTS (#1223) ────────────────────────────────────────────────────────────────
// One factory, three color families. `test.ts` asserts they share byte-identical anatomy / geometry /
// disabled / #326 padding / slots and differ ONLY in the `interactive.<family>` bindings, so a future
// edit cannot silently desync them. `button` keeps the id `button` and is the primary/brand component;
// `Destructive Button` and `Neutral Button` are its siblings. ACCENT is deliberately not among them,
// and the reason is the split's own logic: intent IS the component, so a fourth intent would be a
// fourth component — but accent is OPTIONAL and per-brand, not one of the three always-generated
// families, so the engine cannot emit a component for a family a given brand may not have. The path
// instead has two halves. (1) The COLOUR family: a brand promotes an accent palette to a full
// `interactive.accent.*` column (`accentPalette` / `interactivePalettes`, docs/20 §3–§3a — the engine
// already generates this, gated like the built-ins). (2) The COMPONENT: in Figma the designer
// DUPLICATES the primary Button set and rebinds its `interactive.primary.*` variables to
// `interactive.accent.*` — a per-brand move over generated tokens, the same duplicate-and-rebind any
// brand-specific variant takes, not a set the engine enumerates.
export const button: ComponentDef = makeButton(
  'button',
  'Button',
  'Triggers an action in place. For navigation, use a link.',
  'In-flow trigger for an action that happens now, in the current context — submit, save, confirm, open a dialog, fire async work — in the brand\'s primary action style, the expected look of a button. Not navigation (use link / link-button, even when it looks like a button), not a persistent binary (Switch.Row), not one-of-many selection (segmented-control / toggle-button). For a destructive or a weightless action, use the Button.Destructive / Button.Neutral sibling components.',
  'primary',
  {
    triggerKeywords: ['button', 'submit', 'cta', 'confirm', 'action', 'primary action', 'save'],
    avoidWhen: 'The action deletes or removes something → use Button.Destructive. The action carries no brand emphasis (a toolbar control, a dense row) → use Button.Neutral.',
    generationPriority: 1,
    do: [],
  },
);

export const buttonDestructive: ComponentDef = makeButton(
  'button-destructive',
  'Button.Destructive',
  'Triggers a destructive action — delete, remove — in the destructive color.',
  'In-flow trigger for a destructive action — delete, remove, discard, disconnect — in the destructive color, so the consequence reads before the click. Same anatomy as Button; the color is the whole difference. Pair it with an adjacent neutral escape ("Cancel" / "Keep"), and match the verb to the consequence ("Delete", not "Confirm"). For a quiet destructive action, use appearance=text on this component.',
  'destructive',
  {
    // Brief §10: `danger` / `destructive` are the aliases consumers reach for; both map here.
    triggerKeywords: ['destructive button', 'danger button', 'delete button', 'danger', 'destructive', 'delete', 'remove', 'discard'],
    avoidWhen: 'The action is not destructive → use Button, or Button.Neutral for one with no brand emphasis. Color is a weak carrier on its own, so a destructive action also names its consequence in the label.',
    generationPriority: 2,
    // Brief §5, the destructive-pairing rule.
    do: [
      'Place it beside a neutral escape ("Cancel" / "Keep"), never alone; on a delete confirmation the safe choice is often the filled button and the destructive action sits at a lower appearance beside it',
    ],
  },
);

export const buttonNeutral: ComponentDef = makeButton(
  'button-neutral',
  'Button.Neutral',
  'Triggers an action with no brand emphasis — toolbars, dense rows.',
  'In-flow trigger for an action that carries no brand weight — a toolbar control, a dense table row, a low-stakes secondary action — in the neutral color. Reach for it when the control genuinely has no brand emphasis to carry, not merely because it is secondary in rank (rank is the appearance axis: a secondary primary action is the Button at appearance=outline). Same anatomy as Button.',
  'neutral',
  {
    // #1697 — no "delete" (that is Button.Destructive) and no "primary action" (that is Button).
    triggerKeywords: ['neutral button', 'toolbar button', 'cancel button', 'low-emphasis action', 'action'],
    avoidWhen: 'The action is the view\'s main one or carries the brand → use Button. It deletes or removes something → use Button.Destructive.',
    generationPriority: 2,
    do: [],
  },
);
