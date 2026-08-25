/**
 * component-schema.ts — the component-definition contract (docs/14 §2, docs/19).
 *
 * DRAFT v0. One `ComponentDef` per component is the SINGLE SOURCE from which every
 * artifact projects — Figma shell, WC/React code, Storybook, docs, `.ai.json`,
 * Code Connect (docs/19 §1). This file is the schema + a runtime validator; the
 * definitions themselves live one-file-per-component under `components/` (see
 * `components/button.ts`). Final on-disk format (TS object vs YAML+parser) is a
 * build decision (docs/14 §2) — the SHAPE is what this locks.
 *
 * Seeded, not invented (docs/13 inspirations + KB):
 *  - Key spine mirrors the KB §15 agent-consumable schema (`components/_schema.md`):
 *    identity / description / api / states / variants / accessibility / content /
 *    composition / notes — plus the two projections §15 doesn't carry (docs/ai).
 *  - Maps to `@directededges/specs-schema` (Specs CLI: `Component` / `AnyProp`) —
 *    conformant-or-mappable, the follow-don't-fork posture (docs/13 §3).
 *  - Type-checked + runtime-validated so metadata drift is a GATE FAILURE, not a
 *    silent rot — the Astryx typed-`ComponentDoc` lesson (docs/13 §1), the same
 *    "can't drift" mechanism as the lever manifest / preview spec.
 *  - Carries `avoid_when` + a relationships graph — the intent-poor gap docs/13 §1
 *    names in Astryx's schema; this is a DECISION surface, not a props table.
 *
 * The binding insight (docs/14 §2): visual props bind to LOCKED TOKEN NAMES, not
 * values. That makes a definition brand- and mode-INVARIANT structure — brands and
 * modes are value-columns the engine already supplies. `validateComponentDef` checks
 * every binding resolves against a real generated tree, so a definition is bound to a
 * *verified contract* — a property Specs-CLI-style observed-value specs can't have.
 */
import { normalizeRef, tokenPaths, isPrimitiveRef } from './eval';

/** A reference to a token by its root-relative dotted path (`color.interactive.primary.fill.rest`,
 *  `radius.md`). Validated to resolve against the generated tree. */
export type TokenRef = string;

export type PropDef = {
  name: string;
  /** Free-form per §15 ("keys locked, values prose"): `boolean` / `enum` / `node` / a union. */
  type: string;
  default?: string | boolean | number;
  required?: boolean;
  /** Allowed values when `type` is an enum. */
  values?: string[];
  deprecated?: boolean;
  description: string;
};

// ---------------------------------------------------------------------------------------
// ANATOMY (#327, docs/28 §4) — the STRUCTURAL layer.
//
// `ComponentDef` already carried the semantic contract (props/states/variants/a11y) and the
// paint (`tokens`). What it never carried is structure: the node tree, the layout model, and
// the slot→property mapping a materializer needs to actually call `createComponent()`. A
// binding like `size.medium.padding-x → size.md.padding-x` says nothing about WHAT that
// padding is applied to.
//
// THE LINE THIS DRAWS, and it is the load-bearing decision here:
//   anatomy = structure + GEOMETRY      (tree, layout, padding, gap, height, radius, sizes)
//   tokens  = PAINT                     (fill, border, ink, overlay — per intent × appearance)
//
// Paint is variant-dependent in a way structure is not: a button's fill changes across nine
// intent×appearance combinations while its box stays one row with one gap. Folding colour into
// anatomy would force the part tree to be re-declared per variant, which is exactly the
// combinatorial blow-up `tokens`' flat keyed map already avoids. So the two layers stay
// separate and each says the thing it is good at saying.
//
// Anatomy references BINDING KEYS in `def.tokens`, never raw token refs — one indirection,
// already established, and it keeps a definition brand-invariant. `{size}` expands over
// `variants.size`, so `size.{size}.gap` is required to resolve for every declared size.
export type PartKind =
  | 'box'      // a layout container — the only kind that carries layout/padding/gap
  | 'text'     // a text node; carries a type binding
  | 'slot'     // swappable content (icon / avatar / counter / spinner) — instance-swap in Figma
  | 'overlay'  // occupies another part's position rather than its own row cell
  | 'absolute' // takes NO position in the flow — an absolutely-positioned sibling of its siblings
  | 'vector';  // a filled outline — the one kind whose CONTENT is geometry rather than a box (#864)

/** How a part sizes on each axis. Figma's auto-layout vocabulary, which is also CSS-expressible
 *  (`hug` = fit-content, `fill` = stretch, `fixed` = an explicit dimension). */
export type SizingMode = 'hug' | 'fill' | 'fixed';

export type LayoutDef = {
  direction: 'row' | 'column';
  /** Cross-axis. */
  align: 'start' | 'center' | 'end' | 'baseline';
  /** Main-axis. */
  justify: 'start' | 'center' | 'end' | 'space-between';
  sizing: { x: SizingMode; y: SizingMode };
};

/** Per-side padding. The inline sides are SPLIT (#326): the side a visual sits against insets
 *  less than the side a plain label sits against, because a glyph's own bounding box already
 *  contributes apparent space. `inlineVisual` is optional — a part with no slots has one
 *  inline padding and says so by omitting it. */
export type PaddingDef = {
  block: string;
  inlineLabel: string;
  inlineVisual?: string;
};

/**
 * HOW A PART THAT POINTS AT ANOTHER COMPONENT RELATES TO IT (#681's landed decision).
 *
 * Three kinds, and the split they encode is identity-vs-policy. WHICH component fills a slot is a
 * fact about the FILE — the file's icon might be called anything — so the caller nominates it
 * (`figmaAnatomySet`'s `swapTarget`, per #513). WHETHER that component's own variants surface on the
 * parent is a fact about the DESIGN, true across every file and brand, so the DEF declares it. The
 * first version of this field had the caller nominating the variant too, following `swapTarget`'s
 * precedent; that conflated the two rows above.
 *
 * WHY IT IS A DEF FIELD RATHER THAN A FIGMA DETAIL. Per docs/19 §1 one definition set projects into
 * every output, so an exposure declaration has to project into all of them: Figma gets an exposed
 * nested-instance property, React/Web Components get a PROP, `.ai.json` gets a documented option an
 * agent can select, Storybook gets a control. A def that cannot express exposure cannot express its
 * own public API — which is why this is not a deferrable nicety.
 *
 *  · `swap`        — the whole component is replaced (an icon). Variants do not enter into it: the
 *                    consumer picks a different component, not a different coordinate of this one.
 *  · `nest-fixed`  — the nested component HAS variants, the parent picks one, and the consumer never
 *                    changes it (a focus ring: which ring a normal surface gets is a design decision).
 *                    The variant is REQUIRED here — see below for why it cannot be inherited.
 *  · `nest-exposed`— the nested component has variants the consumer controls FROM the parent (a
 *                    helper/validation message, a form label's sizes, a block header's title sizes).
 *
 * WHY `nest-fixed` MUST NAME ITS VARIANT rather than taking the nested set's default: Figma's default
 * is its FIRST CHILD, an artifact of creation order, and that is #656 exactly one layer out. #656's
 * finding was "an artifact of declaration order, not a layout decision" and its fix was to CHOOSE the
 * axis instead of inheriting it. Inheriting a ring's first variant re-commits the same error, and it
 * would be equally invisible — both variants are valid rings, so nothing downstream notices the wrong
 * one was nested.
 *
 * The coordinate is a `Record` rather than a string because a set can have more than one axis, and
 * because this is the shape the consumer API takes: Figma's `InstanceNode.setProperties` accepts
 * exactly `{ axis: value }`.
 */
export type NestingRelation =
  | { kind: 'swap' }
  | { kind: 'nest-fixed'; variant: Record<string, string> }
  | { kind: 'nest-exposed' };

export type PartDef = {
  kind: PartKind;
  /** `target` marks the single a11y/interaction target — the node that owns the hit area and the
   *  focus ring. Exactly one part per anatomy may claim it.
   *
   *  IT DOES NOT DECIDE WHICH PART PAINTS, and it used to (#933). The projector's box branch read
   *  `role === 'target'`, so "what does the user click" was also answering "what carries colour" —
   *  two questions that have the same answer in every def written so far and come apart the moment
   *  one does not. A switch is the case: its whole ROW is clickable, so the row is the target, while
   *  the fill belongs to the track. Both configurations validated with zero errors, and the one a
   *  hit-area author reaches for painted the track's `on` fill across the entire label row. Paint is
   *  now `paintSlots`, declared per part; nothing in the projector reads this field.
   *
   *  SO WHY DOES IT STILL EXIST. Because it answers the question it names. A materializer needs one
   *  node to attach the interactive role, the accessible name and the focus ring to, and `icon`'s
   *  target is a `vector` with no box anywhere in its anatomy — which is the clearest evidence the
   *  two concepts were never the same one. Do not delete it as unused on the strength of the
   *  projector no longer reading it; the a11y tier is downstream of here. */
  role?: 'target' | 'presentation';
  /** Ordered. Order IS the visual order — a materializer appends children in this sequence. */
  children?: string[];
  layout?: LayoutDef;
  padding?: PaddingDef;
  gap?: string;
  height?: string;
  radius?: string;
  /** ONE binding key driving BOTH axes — a square. A slot's glyph artboard, and a `box` that is square
   *  by declaration rather than by two bindings that happen to agree.
   *
   *  The `box` case arrived with IconButton, which is square by definition ("height drives both
   *  dimensions"), and it is this field rather than a new `width` beside `height` for a reason worth
   *  stating: two independent bindings can be rebound on ONE axis and nothing anywhere notices, because
   *  each is individually valid. `size` cannot drift from itself. So "square" is expressible as a single
   *  fact instead of an invariant nobody checks — and the field already means exactly this for a slot,
   *  so nothing new is being taught, only a kind added to what reads it.
   *
   *  MUTUALLY EXCLUSIVE with `height`, and validated so: a part declaring both is stating its height
   *  twice, and the projection would silently keep whichever branch ran last. */
  size?: string;
  /** The MAIN-AXIS edge, for a box that is deliberately NOT square (#990). A switch's track: `height`
   *  gives the pill's thickness and this gives its length.
   *
   *  WHY THIS IS NOT THE `width` `size`'s OWN NOTE ARGUES AGAINST. That note says a square is one fact
   *  rather than "two bindings that happen to agree", because two independent bindings can be rebound on
   *  one axis with nothing noticing. That argument is about a SQUARE and it still holds — `size` is how a
   *  square is spelled, and this field is refused alongside it. What it cannot cover is a box whose two
   *  edges are two different decisions: `control.size.*` emits `height` AND `width` (#900, `width` = 2 x
   *  `height`, the one ratio the field converges on), and until this field existed the tier emitted a
   *  number the schema had no way to read. A track is not a square that drifted; it is 2:1 by design.
   *
   *  MAIN-AXIS, not "horizontal". A `column` box's main axis is vertical, so this field means "the axis
   *  the children run along" and the projector reads it against `layout.direction` — which is also why a
   *  part binding it must declare `sizing.x: 'fixed'`: a hugging main axis is decided by the children and
   *  the binding would be silently overridden. That is the same trap `size`'s two sizing rules catch, and
   *  the same one #989 records for `'fill'`.
   *
   *  It is ALSO the precondition for `positionWhen` — see that field. A part cannot travel along an axis
   *  whose length its parent does not fix, because a parent hugging one child is exactly as long as the
   *  child and every alignment lands in the same place. */
  width?: string;
  /** For `text` parts: the binding key giving the composite type style. */
  type?: string;
  /** For `text` parts: WHICH ink slot this part asks the paint grammar for. Defaults to `label`,
   *  which is what every text part in the corpus but one wants (#796).
   *
   *  WHY THIS FIELD EXISTS AT ALL, and it is a corrected decision rather than a new idea. #784 renamed
   *  `field-label`'s ink keys into the projector's slot vocabulary and kept `indicator.label` keyed
   *  under the part, on the reasoning that the template list disambiguates the two text nodes
   *  positionally. **That was reasoning about a mechanism nobody had measured, and it is wrong.**
   *  `paintOf` takes a SLOT and never sees which part asked: the `kind === 'text'` branch calls
   *  `paintOf('label')` for every text node in the tree. Probed with `field-label`'s two text parts,
   *  both came back `color/text/primary` — so `indicator.label` → `color.text.secondary` was authored,
   *  resolvable, reached at NO coordinate, and would have shipped the de-emphasised "(optional)" suffix
   *  in full-strength primary ink. The rename produced a dead key, which is the #784 defect class
   *  reappearing inside #784's own fix.
   *
   *  Nothing in the schema tier could catch it: `{slot}` does not match a two-segment key, so
   *  `paintKeyErrors` correctly said nothing. `lint-paint.ts`'s arm 3 — the plan-derived oracle — is
   *  what fails on it, which is the argument for that arm existing: it enumerates coordinates instead
   *  of reading declarations, so it can see a key no declaration describes.
   *
   *  IT IS THE PART, NOT THE DEF, THAT DECLARES THIS, because two text nodes in ONE component is
   *  exactly the case — a def-level answer would have to be per-part anyway. And a per-part *name*
   *  never becomes the vocabulary: the part names a SLOT from `PAINT_SLOTS`, so the word still has to
   *  be one the projector dispatches. See `PAINT_SLOTS` for what makes a new slot admissible — a
   *  distinct ink ROLE, not a distinct part. `indicator` qualifies (a name and its de-emphasised
   *  suffix are two roles); "this part happens to need its own colour" does not. */
  paintSlot?: string;
  /** For `box` parts: WHICH paint slots this box takes, in precedence order (#933). Absent means the
   *  box paints nothing — it is structure, and `field-label`'s and `field-message`'s boxes are exactly
   *  that. The words must come from `BOX_PAINT_SLOTS`.
   *
   *  WHY A LIST AND NOT A FLAG, and this is measured rather than argued. #933 was filed as "`role`
   *  decides paint", so the obvious repair is to drop `role` from the branch and let any box paint,
   *  with the def's own paint keys deciding what each one gets. That was implemented against a
   *  two-box switch anatomy and probed: the row, the track AND the thumb all came back bound to the
   *  SAME variable, `color/interactive/primary/fill/selected`. `paintOf` takes a slot and never sees
   *  which part asked — the identical blindness #796 measured one kind over, where both of
   *  `field-label`'s text nodes came back `color/text/primary`. So "let the keys decide" is not a
   *  weaker fix than this one, it is strictly worse than the bug: it paints three nodes where the
   *  defect painted one wrong node. A box has to name its slots because nothing else can.
   *
   *  ORDER IS PRECEDENCE, for the ground slots. `['overlay', 'fill']` reads "the overlay if it
   *  resolves, otherwise the fill", which is #487 §8's per-appearance rule that `filled` expresses
   *  hover by changing its fill while `outline` and `text` have no fill to change and express it as a
   *  translucent overlay on the same node. That rule used to be a hardcoded `??` in the projector with
   *  a paragraph explaining it; as a declaration it is visible in the def that depends on it. */
  paintSlots?: readonly string[];
  /** For `vector` parts: WHICH glyph, by its name in the icon vocabulary (#864).
   *
   *  A NAME, resolved against `ICON_PATHS` at projection — never the path data itself. Two reasons, and
   *  the second is the one that matters. A def carrying `d="M12 2L2 7…"` would be authoring geometry in a
   *  file whose whole job is to declare *relationships*, and the path would then exist in two places with
   *  nothing comparing them. And the name is the CONTRACT surface: `icon.name` is typed against
   *  `IconName`, `icon-set.ts` maps our names to source files in both directions, and a name that has
   *  stopped resolving is a build error rather than an invisible gap — which is exactly the guarantee
   *  `icon.name`'s own prop description claims and #833 built the mechanism for.
   *
   *  TEMPLATABLE ON A VARIANT AXIS, `{name}` in the same `{...}` grammar `paintKeys` uses — because a
   *  static string per part is a real defect and not a limitation. A set enumerated over a 39-value `name`
   *  axis with `glyph: 'check'` projects 39 correctly-named members that all draw a check mark, and every
   *  gate accepts it: the count is right, the names are right, nothing throws. That is #864's own shape one
   *  tier in, and it was measured on this branch before it was fixed. An unfillable placeholder throws at
   *  projection and is refused at authoring time by `anatomyErrors`.
   *
   *  So a def says `glyph: 'check'` and the projection fails loudly if the vocabulary no longer has it.
   *  Swapping the icon set for a client's branded one changes `icons/*.svg` and `icon-set.ts`; every def
   *  naming a glyph that survives the swap is untouched, and every def naming one that does not fails at
   *  projection instead of building an empty square. */
  glyph?: string;
  /** A slot that need not be present. `false`/absent means required. */
  optional?: boolean;
  /** VARIANT-GATED PRESENCE (#910): axis → the values at which this part exists. AND-composed across
   *  axes, so `{ selection: ['checked'] }` means "present at `selection=checked`, absent everywhere
   *  else", and a part naming two axes appears only where both agree.
   *
   *  This is the third presence mechanism and the first one keyed on a VARIANT rather than a state.
   *  The other two are `optional` (honoured only for the hardcoded `leadingVisual`/`trailingVisual`
   *  pair, so it is a Button fact rather than a schema one) and `when` on an `overlay`/`absolute` part
   *  (a STATE, one value per coordinate). Nothing could express "this node exists at some values of a
   *  variant axis and not at others", and `field-label`'s own `indicator` `codeOnly` entry states the
   *  consequence it hit: *"Reopening this needs a way to declare a part's absence as a coordinate, not
   *  a wider axis list."* This is that.
   *
   *  WHY A CHECKBOX FORCES IT rather than a cheaper shape. The mark is a glyph, and there is no glyph
   *  for `unchecked` — an empty box draws nothing, so `glyph: '{selection}'` has no third value to
   *  resolve. Painting the check in the box's own fill colour would resolve and pass every gate while
   *  drawing an invisible tick, and deferring the mark to `codeOnly` would need `lint-paint.ts` to
   *  admit `checked.icon` and `indeterminate.icon` as bindings that legitimately never paint. Absence
   *  is the coordinate, so absence is what the def has to be able to say.
   *
   *  AN ABSENT AXIS MEANS ABSENT, not present — the same answer `absolute`'s `when` gives when no state
   *  is supplied. A structure-only projection (`figmaAnatomyPlan(def, size, {})`) has no `selection`,
   *  so it carries neither the check nor the dash rather than both at once, which is a tree no member
   *  ever builds. Asserting presence on no evidence is the direction that ships.
   *
   *  Restricted to axes in `variants` (never `size`, never a state) by `anatomyErrors`, and the axis
   *  must be one `figmaProperties.variantAxes` actually projects — a gate on an axis Figma does not
   *  carry makes the part absent from every member of the set, silently. */
  presentWhen?: Record<string, readonly string[]>;
  /** VARIANT-GATED POSITION (#990): axis → value → where along its PARENT's main axis this part sits.
   *  A switch's thumb says `{ selection: { off: 'start', on: 'end' } }` — ONE part, in two places.
   *
   *  WHY IT IS NOT `presentWhen` TWICE. The rejected shape was two parts, `thumb-off` and `thumb-on`,
   *  each gated to one value. It projects a lie: every real switch is one element that translates, and a
   *  code projection reading two parts emits two elements and toggles them. It also duplicates every
   *  binding on the moving part with nothing in the schema noticing when the two copies diverge — the
   *  #933 shape, where a field doing two jobs was fixed by separating the concepts rather than by
   *  working around them. A position is a position; it is not an absence.
   *
   *  PROJECTED ONTO THE PARENT, not onto this part. Figma has no per-child main-axis offset inside auto
   *  layout: `layoutAlign`'s `MIN|CENTER|MAX` are DEPRECATED by Figma ("all layers in an auto-layout
   *  frame must now have the same counter axis alignment") and are the COUNTER axis anyway, and
   *  `layoutGrow` is a 0/1 stretch flag. Main-axis distribution exists only on the frame, as
   *  `primaryAxisAlignItems` — which both executors already write. So the projector overrides the
   *  PARENT's `primaryAxisAlignItems` at the coordinate, reusing the same `start|center|end` vocabulary
   *  and the same `JUSTIFY` map as `layout.justify`. Nothing new reaches the plan type or the executors.
   *  This is why #990's option 1 was not taken: it is the one that cannot express the travel at all.
   *
   *  TWO PRECONDITIONS, both ASSERTED by `anatomyErrors` rather than trusted:
   *  1. the parent's MAIN-AXIS sizing must be `'fixed'`. A hugging parent is exactly as long as its
   *     child, so `MIN`, `CENTER` and `MAX` all land in the same place and the field is a silent no-op.
   *     This is the #989 shape — `'hug'` and `'fill'` both project to AUTO — and the reason the moving
   *     part's parent must bind `width` (a track states its length; the thumb travels inside it).
   *  2. the part must be its parent's ONLY flow child. `primaryAxisAlignItems` distributes the whole
   *     row, so a second sibling means the alignment moves the GROUP and this part's position is a
   *     side effect of where its neighbours are.
   *  Both are things a reasonable author gets wrong once and cannot see in the output, because the
   *  failure is a thumb that renders — in the wrong place, or in the same place twice.
   *
   *  ITS LIMIT, stated rather than discovered: `MIN|CENTER|MAX` is three positions, so this expresses a
   *  2- or 3-value axis and no more. A segmented control with four segments and a slider's continuous
   *  thumb are NOT expressible this way and will need real offsets (`absolute`, or a plan field Figma
   *  does carry). The field is not switch-shaped — it names no component and no axis — but it is
   *  three-position-shaped, and that is a property of the projection target, not of this schema. */
  positionWhen?: Record<string, Record<string, 'start' | 'center' | 'end'>>;
  /** For `overlay`: the part whose position it takes (width-preserving, per the brief).
   *
   *  An ORDERED LIST of candidates as of #848, resolved to the FIRST one present at this coordinate.
   *  A single string is still accepted and means a one-entry list — every existing def reads the same.
   *
   *  Why a list. Primer's rule is that the spinner "replaces only that visual slot, and the button
   *  label remains visible", and until #848 we spelled that as `replaces: 'leadingVisual'` — one named
   *  slot, with `overlaysWhenAbsent` as the fallback for everything else. That reading was too narrow
   *  in a way no gate could see: at `leading=false, trailing=true` there IS a visual cell available,
   *  and naming only the leading one sent that coordinate to the label-overlay fallback. The result
   *  was a `pending` button rendering as spinner + trailing visual with its label at zero opacity —
   *  **two icons and no text** (#848, seen in a live Figma paste, not in any gate).
   *
   *  So the generalization is Primer's rule stated over the cells that EXIST rather than over one
   *  name: take whichever visual cell is present, preferring the leading one because a spinner on the
   *  left reads as "loading" while one on the right reads as a trailing indicator. The fallback is
   *  then reached only when there is genuinely no visual cell at all — the label-only button it was
   *  written for.
   *
   *  ORDER IS THE DECLARATION and it is the def's to make, not this file's: the list is walked in
   *  order and the first present part wins, so a def that prefers its trailing cell says so by
   *  writing it first. */
  replaces?: string | string[];
  /** For `overlay`: what to do when NONE of the parts named in `replaces` is present at this
   *  coordinate.
   *
   *  The part named here is overlaid OUT OF FLOW — the overlay takes no cell, and the named part is
   *  rendered at zero opacity so it keeps its space. Absent this field, an overlay whose `replaces`
   *  target is missing falls back to taking a cell of its own, which is the #612 defect: a label-only
   *  button entering `pending` GREW by the spinner's cell (28px at medium — a 32px cell less 4px, the
   *  left padding also flipping to `padding-x-visual` because the cell reads as filled). That is the
   *  exact mid-submit reflow the replace-the-leading-visual rule exists to prevent, live in the most
   *  common button shape there is: a plain labeled Submit.
   *
   *  Why zero opacity and not `visible: false`: React Aria states the constraint outright — "Do not
   *  use `visibility: hidden` or `display: none` as these remove the element from the accessibility
   *  tree." A hidden label also yields its cell, so the width collapses and we are back to the bug.
   *  Opacity keeps the node in flow AND in the a11y tree, which is what lets the accessible name pair
   *  as "Save, pending". */
  overlaysWhenAbsent?: string;
  /** For `overlay`: the STATE that activates it. Required, because an overlay that never says when
   *  it appears cannot be projected without the emitter hardcoding the part's name — and
   *  `anatomy-figma.ts` deliberately keys off `kind`/`role` so it generalizes past Button.
   *
   *  This was the real gap behind #536 item 2. The part, its `kind` and its `replaces` were all
   *  declared AND validated, and the projection still could not use any of it, because *when* was the
   *  one fact nobody had written down. **A declaration that omits its trigger is not projectable,
   *  however complete it looks** — and it looks complete precisely because every field that exists
   *  is filled in. */
  when?: string;
  /** For `absolute`: the NAME of a component that must already exist in the file, which this part
   *  materializes as an INSTANCE of rather than authoring from nothing.
   *
   *  **This is the first part kind whose materialization depends on another component existing**, and
   *  the reason it is a nomination rather than a construction is the focus ring's own economics: the
   *  ring is not any one component's (`focus.ring.*` and `color.border.focus` are top-level families,
   *  and `focus.ring.offset-field` already emits separately — the ring was always one shared thing
   *  with a per-context parameter). Authored per host it would be duplicated N ways; nested, one
   *  component carries it and every host points at it.
   *
   *  The COST, stated because it is real and permanent: the nested component's own strokes, weight and
   *  radius live inside it, so `planBindingErrors` cannot gate them — the engine can verify that the
   *  host nominates a ring and where it sits, and nothing more. A host's `focus-ring` / `ring-width` /
   *  `ring-offset` binding keys therefore stay bound-but-unprojected, which is the honest reading of
   *  "the ring is shared" rather than a gap. The DECISION this encodes is that N-way duplication is
   *  the worse cost; `absolute` without `nests` is left unsupported rather than half-supported. */
  nests?: string;
  /** How this part relates to the component it points at (#681). REQUIRED on every part that points
   *  at one — a `slot` (whose content is swapped) and an `absolute` (which materializes AS an
   *  instance) — and rejected on the kinds that point at nothing.
   *
   *  Separate from `nests` because the two answer different questions and `nests` already has an
   *  answer: `nests` names WHICH component, this names the RELATIONSHIP to it. A `slot` has no `nests`
   *  at all (the caller nominates its target per file), and still needs this — which is what makes
   *  folding the two impossible rather than merely awkward.
   *
   *  Required rather than defaulted, and the reason is the field's own subject: a default would be
   *  Figma's default one indirection out. `swap` is by far the commonest value, so defaulting to it
   *  would be the tempting choice — and it would silently make every nested set fixed-at-its-first-
   *  variant, which is the #656 error this field exists to stop. See `NestingRelation`. */
  nesting?: NestingRelation;
  /** For `absolute`: the binding key giving the size of the VISIBLE GAP between this part's inner edge
   *  and its parent's bounds. The focus ring's `focus.ring.offset` — at offset 2 an unbroken 2px sliver
   *  of background separates the ring from the control's own border (WCAG 1.4.11, target 3:1).
   *
   *  A GAP, not a coordinate, and #801 is the whole reason that distinction is spelled out here. This
   *  doc used to say a materializer "positions it at `-inset` and sizes it `parent + 2 × inset`" — which
   *  is the CSS geometry, where `outline-offset` measures from the border edge and the outline's own
   *  width grows away from it, so the gap and the coordinate are the same number. In Figma they are not.
   *  A stroke is drawn INSIDE its node's bounds (`strokeAlign: 'INSIDE'`, which both executors set and
   *  which is correct for a border), so a ring placed at `-offset` has its stroke drawn back inward
   *  across the whole gap: at offset 2 with a 2px stroke the ring's outer edge lands exactly on the
   *  border and the gap is ZERO. The offset was applied, and the property it exists to produce was not.
   *  Found by comparing a built file against the Prism2 reference, which sits at `-4` for the same 2px
   *  stroke; nothing in the projection or either executor knew the part had a stroke at all.
   *
   *  So a materializer whose strokes are inside-aligned must position this part at
   *  `-(inset + strokeWidth)` and size it `parent + 2 × (inset + strokeWidth)`. That is a PLATFORM
   *  COMPENSATION and belongs in the materializer, never in the token: `focus.ring.offset` stays 2 in
   *  the canonical tree because 2 is what CSS wants and what the gap IS (docs/19 §1, docs/05 —
   *  canonical value in `$value`, platform directive in `$extensions`, the same shape as lineHeight's
   *  px-from-ratio). A derived `focus.ring.inset = 4` would be correct for one projection and a trap
   *  for every consumer who found the name.
   *
   *  `strokeInset` below is how a part declares the stroke to compensate for. Ring-specific today only
   *  because `focus-ring` is the only part kind that carries a stroke of its own; when #740 gives
   *  `PartDef` a stroke field, that field supplies this width and the compensation stops being
   *  ring-specific without either executor changing.
   *
   *  A binding key like every other geometry field, resolving through `def.tokens` identically, but note
   *  what a materializer can do with it: Figma's `x`/`y` accept NO variable binding, so both names are
   *  read as NUMBERS at paste time and summed. That is a real ceiling and belongs in `codeOnly` wherever
   *  this kind is used — a brand changing its ring offset does NOT re-flow an already-pasted component,
   *  and a rebuild does not fix that, because the executor skips every member that already exists by
   *  name and reports `✓ already built` without writing geometry (#827 — general to any geometry, paint
   *  or constraint change, not to this field). Delete the set or build onto a fresh page. */
  inset?: string;
  /** For `absolute`: the binding key giving the width of the stroke the nested component draws INSIDE
   *  its own bounds, which a materializer must add to `inset` to leave a visible gap of `inset`.
   *
   *  SEPARATE FROM `inset` rather than folded into it, because they are different quantities with
   *  different owners. `inset` is a design decision the brand makes (how much background separates the
   *  ring from the control); this is a fact about the nested component's own rendering that the host must
   *  compensate for. Summing them at authoring time is what produces a token whose value is right for
   *  Figma and wrong for CSS — #801's actual defect one layer up.
   *
   *  OPTIONAL, and its absence means "this part's nested component draws nothing inside its bounds", not
   *  "unknown". A part that omits it is positioned at exactly `-inset`, which is right for a part with no
   *  stroke and is what every non-ring absolute part will want. `lint-absolute-inset.ts` is what stops
   *  the omission from being silent for a part that does carry one. */
  strokeInset?: string;
  note?: string;
};

/** An overlay's `replaces` as an ordered candidate LIST, whatever shape the def wrote it in (#848).
 *
 *  Exported and shared by the validator and both materializers ON PURPOSE. The alternative — each
 *  caller doing its own `Array.isArray` — is three normalizations that agree until one of them is
 *  edited, and the field's whole meaning is the ORDER, so a caller reading it differently places the
 *  overlay somewhere else while every gate stays green. That is not a DRY nicety: it is the same
 *  two-shapes-for-one-concept defect #708 found in `$extensions.prism3.modes`, where color wrapped
 *  its value and shadow was a bare array, one reader guarded the wrong shape, and 28 mode-varying
 *  shadows were silently dropped from every overlay in all four brands. One shape, read once.
 *
 *  Returns `[]` for an absent field so callers can test `.length` and never hold `undefined`. */
export const replacesCandidates = (p: PartDef): string[] =>
  p.replaces === undefined ? [] : Array.isArray(p.replaces) ? p.replaces : [p.replaces];

export type AnatomyDef = {
  /** The part every other part hangs beneath. */
  root: string;
  parts: Record<string, PartDef>;
  /** Values COMPUTED from other values rather than authored — the third category docs/28 §2.2
   *  identifies alongside tokenized and structural (Spectrum derives min-width from height and
   *  pill radius from height). Prose formulas: they are resolved to literals at emit, and the
   *  `codeOnly` note records that Figma gets a frozen number rather than a live relationship. */
  derived?: Record<string, string>;
  /** Structure that provably will NOT survive the Figma leg. The component-tier version of the
   *  ceilings discipline docs/14 §3 set for tokens: a schema claiming Figma carries everything
   *  is wrong, so this list is REQUIRED and validated non-empty. */
  codeOnly: string[];
};

/**
 * How a component projects into Figma COMPONENT PROPERTIES (#487 §5).
 *
 * DECLARED, never inferred. `PropDef.type` is free-form prose by design (docs/28 §15, "keys locked,
 * values prose") — `"enum: 'primary' | 'neutral' | 'destructive'"` is a sentence, not a type. Parsing
 * it to decide a Figma property type would be exactly the fragility the token tier refuses, so the
 * projection is stated separately and cross-checked against `variants` / `states` / `anatomy.parts`.
 *
 * The separation of concerns is the point, because Figma's four property kinds are not
 * interchangeable and only one of them can carry a layout consequence:
 *
 *  - VARIANT        — a real axis; each combination is its own component. The only kind that can
 *                     change padding, which is why slot PRESENCE has to be a variant (#487 §4).
 *  - INSTANCE_SWAP  — what goes in a slot, not whether the slot is there.
 *  - TEXT           — a string on one text node.
 *  - BOOLEAN        — drives one node's `visible`, and nothing else. It cannot touch an ancestor's
 *                     `paddingLeft`, which is the whole reason #326's split inline padding cannot
 *                     ride on a boolean.
 */
export type FigmaProperties = {
  /** Which `variants` axes become VARIANT properties, in the order Figma should show them. An axis
   *  present in `variants` but absent here is deliberately NOT a Figma variant, and the reason must
   *  appear in `anatomy.codeOnly` — validated, so the omission is an admission rather than a gap.
   *
   *  THIS LIST IS NOW EXHAUSTIVE, INCLUDING `size` (#795). It always read as "the axes this def
   *  projects into the Figma grid" — `icon` declares `['size']` while painting along `tone` — but
   *  `size` was the one axis the projector supplied for itself: `figmaAnatomyPlan` required a declared
   *  size axis and `planComponentName` wrote `size=` unconditionally, so a def with genuinely ONE type
   *  scale (a caption, a focus ring) had no projectable coordinate at all. Now the coordinate carries
   *  `size=` because the def LISTED `size`, and omits it because the def did not.
   *
   *  Not a `sizeAxis: false` boolean, deliberately: this field already means exactly this, and a
   *  boolean special-casing one axis invites the next one. The cost of making it authoritative is that
   *  a def omitting `size` gets a projection with no size coordinate — which is the point — so
   *  `figmaAnatomySet`'s no-coordinate gate is what stops that becoming a silent nothing: a def that
   *  declares axes here and projects a member named for NONE of them throws, rather than returning an
   *  empty answer nobody reads. Read that gate's own comment before trusting this one — its first
   *  version was unreachable and the suite stayed green (#802's class). */
  variantAxes: string[];
  /** `states` projects as one MORE variant axis, under this name, over these values. Separate from
   *  `variantAxes` because `states` is its own top-level field, not a member of `variants`. */
  stateAxis?: { name: string; values: string[] };
  /** Slot PRESENCE projects as one boolean-valued variant axis per slot — `leading=true` etc.
   *
   *  A third declaration field for the same reason `stateAxis` is a second: an axis whose values do
   *  not come from `variants` cannot be named in `variantAxes`, which validates its entries against
   *  that map. Slot presence comes from `anatomy.parts`.
   *
   *  It is a VARIANT axis and not a BOOLEAN, and that is the crux rather than a detail: a Figma
   *  BOOLEAN drives one node's `visible` and cannot touch an ancestor's padding, while #326's
   *  slot-aware inset sets `paddingLeft = leading ? inlineVisual : inlineLabel` per side. Presence
   *  changes the container's GEOMETRY, so it has to be an axis. `booleans` staying stated-empty is
   *  the same finding from the other end.
   *
   *  This axis existed in the EMITTER before it existed here: `planComponentName` has always appended
   *  `leading=`/`trailing=`, so the declared surface computed 189 variants while the emitter produced
   *  756 — and the count gate asserted the 189, which read as agreement. `figmaAxisNames` is the fix
   *  for the class, not just the instance. */
  slotAxes?: { name: string; part: string }[];
  /** Which axis lays out ACROSS the set's columns — the one grid decision a def gets to make (#656).
   *
   *  Declared rather than inferred for the same reason `slotAxes` exists: `planSetLayout` used to take
   *  the last VARYING axis in `figmaAxisNames` order, which is declaration order, so the column axis
   *  was whatever happened to be declared last. When the grid rule was written that was `state`
   *  (`state` across, `appearance` down — the shape the color layer was verified against); appending
   *  `slotAxes` after `stateAxis` in #536 moved it to `trailing` and reshaped every set the engine
   *  lays out to 324×2, with nobody choosing that and no gate able to notice.
   *
   *  So the point is not that `state` is the right answer for Button — it is that the answer stops
   *  being a side effect of array order. An axis added later cannot silently reshape a declared grid.
   *
   *  ABSENT is legitimate, and falls back to the highest-cardinality varying axis (ties broken by
   *  declaration order) — a def that has not thought about its grid still gets the widest table
   *  available rather than whichever axis sorts last. Validated against the def's own axis names, so
   *  a `gridAxis` naming an axis this def does not project is an error rather than a silent fallback. */
  gridAxis?: string;
  /** prop name → part name. BOOLEAN property; drives that one part's `visible`. An empty object is
   *  a meaningful statement — "considered, and none survive" — and is preferred to omitting the
   *  field: a schema that lists booleans it cannot honor is worse than one that admits there are none. */
  booleans?: Record<string, string>;
  /** prop name → the `kind: 'text'` part it drives, plus the PLACEHOLDER the component ships with.
   *
   *  THE ODD SHAPE OUT, and deliberately so: `booleans` and `swaps` are bare part names because
   *  Figma's `addComponentProperty` needs a `defaultValue` those two can DERIVE — a swap defaults to
   *  the node id of the target the plan already nominates (`AnatomyPlan.swapTarget`), and a boolean
   *  defaults to the visibility of the part as built. A TEXT property has no such source. Figma
   *  accepts `''`, and a set of 21 empty buttons is what #510 shipped: structurally perfect, every
   *  binding resolved, and unreadable on the canvas. So the copy is stated HERE rather than in the
   *  emitter, for the same reason every other name in this file is — the def is what a second brand
   *  overrides, and a placeholder hard-coded in the payload is one no def can change. */
  texts?: Record<string, { part: string; default: string }>;
  /** prop name → `kind: 'slot'` part. INSTANCE_SWAP property — the slot's CONTENT. */
  swaps?: Record<string, string>;
  /**
   * WHY THIS DEF'S PROJECTION CANNOT STAND ALONE ON A CANVAS — prose, and absent means it can (#869).
   *
   * A def can project perfectly and still produce nothing a designer can use. `focus-ring` does: it
   * builds two members, 0 binding errors, nothing throws, both paints bound and correct — and each
   * member is a bare `FRAME` with `bound: {}` and `children: []`. No `layoutMode`, no sizing mode, no
   * width, no height, no `strokeWeight`: five absent fields, so Figma supplies its own default frame
   * and the executor's stroke fallback (`write-components.ts` — `if (!node.strokeWeight) … = 1`, there
   * so a bound stroke paints *something*) finishes the illusion. The result is a **100×100 white box
   * with the right token at 1px**, which is the worst possible output because it reads as a success.
   *
   * THE KNOWLEDGE ALREADY EXISTED AND NOTHING COULD READ IT. `focus-ring`'s `codeOnly` says "the
   * members are strokeless" and "what it projects is not yet a ring" — correct, specific, written
   * before the QA pass that found the box, and prose in a field no gate consults for this question.
   * That is the actual defect: not a missing check but a **decision recorded where only humans look.**
   * So this field is the same admission, moved somewhere a projector and a picker can act on it.
   *
   * WHY THE FLOOR IS DECLARED RATHER THAN INFERRED, which is the whole design. A predicate over the
   * projected plan — "no bound dimensions and no children" — is one line and would catch `focus-ring`
   * today. It is also exactly the membership-by-inference this schema refuses everywhere else
   * (`variantAxes` over parsing `PropDef.type`, `gridAxis` over array order, `axes.ts` over "do the
   * variables vary"), and here it is *provably* wrong at the boundary: `icon` binds `width`/`height`
   * with zero children and renders fine, while a def could bind `itemSpacing` alone and render
   * nothing. Absent-fields-as-proxy answers a question about renderability with a fact about shape.
   * Worse, it decides silently: a def that trips a heuristic is refused with no author having agreed
   * that refusal is right, and a def that renders nothing but happens to bind a dimension is offered.
   *
   * WHAT IT IS FOR, precisely: `focus-ring` is nested by `button` as an ABSOLUTE part, and that path
   * is where its geometry comes from — the executor resizes it to `parent + inset*2`. There is no
   * parent standalone, so no code path sizes it, and there never was one to lose. A def with this
   * field set is **still projected and still nested**; it is only refused as a *standalone* build
   * target, with this string as the reason the designer reads. Lift it when #740 gives `PartDef` a
   * stroke field and the ring can carry its own substance.
   *
   * LEADS WITH `<id>:`, matching `codeOnly`'s convention and for the identical reason — the
   * admission must name its subject so a gate can tell an admission from a mention. Asserted, both
   * directions: a def in this state without the field fails, and a stale field on a def that has
   * since become buildable fails too.
   */
  notStandalone?: string;
};

export type ComponentDef = {
  // ---- identity (§15) + specs-schema Component.id/name ----
  id: string;
  name: string;
  aliases?: string[];
  /** Grouping by purpose (action / input / container / feedback / navigation / …). */
  category: string;
  status: 'draft' | 'stable' | 'deprecated';
  description: string;

  // ---- api (§15) ----
  /** The substrate this stands on (the form family stands on `text-field`). The def
   *  records the DELTA, not a copy — the §15 `inherits:` convention. */
  inherits?: string;
  props: PropDef[];

  // ---- states + variants (§15) ----
  /** Runtime interaction states, from the closed `STATES` vocabulary (#821). `[]` for
   *  non-interactive primitives.
   *
   *  Typed as `State[]` rather than `string[]` so a misspelling is a compile error in the def itself,
   *  where the author is — `typecheck-components.ts` is what makes that reach every def. The runtime
   *  check in `validateComponentDef` is NOT redundant with it: a type binds only what a compiler reads,
   *  and every other consumer (a brand's own def, an MCP caller, a hand-built object in a test) arrives
   *  as data, where it asserts nothing. See `STATES` for what may be added and the bar. */
  states: State[];
  /** Intentional axes and their values, e.g. `{ size: ['sm','md','lg'], tone: [...] }`.
   *
   *  Axis NAMES come from the closed `VARIANT_AXES` vocabulary; VALUES are deliberately open, and that
   *  asymmetry is argued in `VARIANT_AXES`'s own header — a name is a claim about the KIND of
   *  distinction and is worth checking across components, where values are the component's own design.
   *
   *  `Partial<Record<...>>` rather than `Record<...>`, so a def declares only the axes it has: a full
   *  `Record` would require every def to carry all ten keys, which is the opposite of the point. */
  variants: Partial<Record<VariantAxis, string[]>>;

  // ---- the token BINDING (docs/14 §2) — the brand/mode-invariant skin ----
  /** slot → token ref. Slots are the component's paintable/measurable surfaces; a
   *  state- or variant-qualified slot uses a dotted suffix (`fill.hover`, `label.on-fill`).
   *  VALUES are token refs, validated to resolve. Reach for SEMANTIC roles, not primitives. */
  tokens: Record<string, TokenRef>;

  /** HOW `tokens`' PAINT KEYS ARE SPELLED, in the order a lookup tries them (#758).
   *
   *  Optional, and its absence means "this def declares no paint grammar", which is why it can be
   *  added without touching a def that has none.
   *
   *  ── THE DEFECT THIS REMOVES ──────────────────────────────────────────────────────────────────
   *
   *  `anatomy` NAMES its geometry keys (`size.{size}.gap`, resolved through `varOf`), so a typo is
   *  an authoring error caught before a tree is supplied. Paint keys were the one binding family
   *  nothing named: `paintOf` BUILT them from a template hardcoded to `{intent}.{appearance}.{slot}`
   *  — Button's two axes, written into the projector as though they were every component's. Five of
   *  the seven defs carry neither axis, so they projected structurally complete and silently
   *  colorless (the #500 / #482 shape), and no authoring could fix it.
   *
   *  The asymmetry is stated at the top of this file as deliberate — paint stays out of `anatomy`
   *  because folding it in re-declares the part tree per variant. That still holds. What did not
   *  follow from it, and was the actual bug, is that the paint grammar was unstated ANYWHERE.
   *
   *  ── WHY A TEMPLATE LIST RATHER THAN AN AXIS LIST ─────────────────────────────────────────────
   *
   *  The tempting shape is `paintAxes: ['tone']`, with the projector building `{value}.{slot}` from
   *  it. Measured against the corpus, that blesses one convention and invalidates another that has
   *  already shipped. `icon` keys `tone.primary` — the axis NAME leads, the value follows, and there
   *  is no slot segment at all. `field-message` keys `default.text` — the axis VALUE leads and the
   *  slot follows. Same axis name, opposite grammars, disjoint value sets (9 values against 4). An
   *  axis list cannot express both, so adopting one would force a rekey of the other; a template
   *  says which grammar this def uses and both stay valid as authored.
   *
   *  ORDER IS THE DECLARATION, not an implementation detail. `paintOf` walks the list and takes the
   *  first key that `tokens` binds, so the more specific template must lead — `focus-ring` keys both
   *  `stroke.inverse` and a bare `stroke`, and reversing them makes every ring paint the default.
   *  This is the fallback `paintOf` used to hardcode as a state suffix, now stated per def.
   *
   *  PLACEHOLDERS: `{slot}` is the paint slot the projector asks for (`fill` / `overlay` / `border`
   *  / `label` / `icon` — chosen by part KIND, never by part name), and `{<axis>}` is the current
   *  coordinate's value on that axis, for any axis in `variants` or the literal `{state}`. A
   *  template whose placeholders cannot all be filled at a coordinate is SKIPPED rather than
   *  half-substituted, which is what makes a ragged grid expressible: a missing key still means
   *  "this appearance does not paint that part in that state" (see `figmaAnatomyPlan`'s header).
   *
   *  Button declares the two templates it already used, so its 648-member paint is unchanged BY
   *  CONSTRUCTION rather than by a test that happens to agree — the point of doing this as a
   *  declaration instead of a rewrite. */
  paintKeys?: string[];

  /** The STRUCTURAL layer (#327). Optional while the catalogue is mid-migration — a def without
   *  it is semantically complete but not materializable. */
  anatomy?: AnatomyDef;

  /** The Figma COMPONENT-PROPERTY projection (#487 §5). Optional, like `anatomy`, and meaningless
   *  without it — the part-targeting maps resolve against `anatomy.parts`. */
  figmaProperties?: FigmaProperties;

  // ---- accessibility (§15) ----
  accessibility: {
    role?: string;
    wcag?: string[];
    keyboard?: string;
    focus?: string;
    /** ARIA state attributes + their correct use (pressed/expanded/haspopup/checked
     *  are distinct, not interchangeable), and any live-region / busy announcement. */
    aria?: string;
  };

  // ---- content (§15, SCALES) ----
  /** COPY GUIDANCE FOR A WRITER — prose, per pattern, projected into the docs. Not a content MODEL:
   *  `docs/39` §8 is explicit that a block's question (*"can this hold a 60-character heading, and what
   *  happens at 200?"*) is cardinality, type and overflow, and a `string` carries none of them. That
   *  decision is filed (#846); this field stays prose and the closed key list is what makes it gateable
   *  in the meantime.
   *
   *  AND THE FIELD HAS NO READER — measured, and the reason #846 is a decision rather than a cleanup.
   *  `def.content` appears in exactly two places in this repo: this declaration and a quoted block in
   *  `docs/39`. No emitter, no projection, no `.ai.json` field, no skill, no gate. Six defs author
   *  `labelPattern` prose that is gated for voice and US English and delivered to nobody. So closing the
   *  keys is worth doing on its own terms — an author's typo now fails instead of vanishing twice over —
   *  but it does not make the field arrive anywhere, and reading this list as though it does is the
   *  mistake to avoid.
   *
   *  THE INDEX SIGNATURE IS GONE (#821). `[k: string]: string | undefined` made every misspelled key
   *  valid — `lablePattern` typechecked, projected nothing, and no gate could see it, because a field
   *  that accepts any key has no wrong answer to detect. That is `docs/39` §7(a)'s *"doing quiet harm in
   *  the meantime"*, and it is the same shape as an unlisted state: authored, well-formed, reached by
   *  nothing.
   *
   *  The five keys are the corpus measured, not a guess: `labelPattern` on 6 defs, `errorPattern` on 3,
   *  `emptyPattern` / `dialogPattern` / `metaphorRules` on 1 each. The two single-def keys are kept
   *  rather than folded into a generic one because both carry guidance no other key expresses — button's
   *  dialog-verb rule and `icon`'s metaphor rules — and a def-specific key is honest here in a way it
   *  would not be in `PAINT_SLOTS`: nothing dispatches on these, so a sixth key costs a line and misleads
   *  nobody. Adding one is a one-line change with a reason; the point is only that it be a DECISION. */
  content?: {
    labelPattern?: string;
    errorPattern?: string;
    emptyPattern?: string;
    dialogPattern?: string;
    metaphorRules?: string;
  };

  // ---- docs projection (docs/19 §6 — carried so docs are a projection, not a re-author) ----
  docs: {
    usage: string;
    do?: string[];
    dont?: string[];
    contentGuidelines?: string;
  };

  // ---- .ai.json projection (KB 03 §7 / docs/13 §1 — the decision surface) ----
  ai: {
    primaryPurpose: string;
    whenToUse: string;
    /** The highest-value field (docs/13 §1: AI defaults to using whatever it finds). Required. */
    avoidWhen: string;
    commonPartners?: string[];
    triggerKeywords?: string[];
    /** Tiebreaker when several components could serve a prompt. */
    generationPriority?: number;
  };

  // ---- composition (§15) ----
  composition?: {
    composesWith?: string[];
    alternativeTo?: string[];
    supersedes?: string[];
    supersededBy?: string[];
  };

  // ---- motion / notes (§15, SCALES) ----
  motion?: { enter?: string; exit?: string; reduceMotion?: string };
  /** Field-research residue, kept beside the def rather than in a doc so it travels with the thing it
   *  is about: `contested` (the practice disagrees), `unverified` (asserted here, not yet gated),
   *  `evolution` (a finding a later revision RESOLVED — kept because "why is it like this now" is the
   *  question a def cannot answer about itself). Prose only; no emitter reads these.
   *
   *  `evolution` was authored in `button.ts` and missing here until #483 — invisible because nothing
   *  under a tsconfig imported a component def, and `test.ts` runs through `tsx`, which does not
   *  typecheck. #483's plugin call site pulled `button.ts` into `tsconfig.main.json` and it surfaced. */
  notes?: { contested?: string[]; unverified?: string[]; evolution?: string[] };
};

/**
 * The two closed vocabularies read back as OPEN strings, for the readers that hold an unvalidated one.
 *
 * `states: State[]` and `variants: Partial<Record<VariantAxis, string[]>>` (#821) close what a def may
 * DECLARE. Every reader through these accessors asks the opposite question — *is this string, which came
 * from somewhere else, a member?* — and the string is a `figmaProperties.stateAxis` value, a `when:` on
 * a part, or a `{placeholder}` lifted out of a paint template. None of those are a `State`/`VariantAxis`
 * yet; that is the whole point of the check about to be performed on them.
 *
 * So the widening is at the READER, deliberately, rather than at the declaration. Widening the fields
 * back to `string[]` / `Record<string, string[]>` would make every one of these sites compile and delete
 * the only thing the new types buy — a def author's typo failing in `typecheck-components.ts`. And
 * casting the incoming string TO `State` instead would be worse than either: it would make the runtime
 * check downstream compare a value the compiler has already been told is a member, which is a check that
 * cannot fail (`docs/34` shape 1).
 *
 * Same shape as the existing `(PAINT_SLOTS as readonly string[]).includes(...)` idiom, hoisted to two
 * named accessors because the explanation is worth stating once rather than at each site.
 *
 * EXPORTED, and `anatomy-figma.ts` is why — which is worth knowing because it corrects something this
 * PR first wrote. The comment on `ComponentDef.states` claimed the defs are the only files typechecked
 * against this schema; they are the only ones `typecheck-components.ts` covers, but `apps/studio`'s own
 * `tsconfig` reaches `anatomy-figma.ts` through its imports and typechecks it too. So the projector is a
 * second reader holding unvalidated strings — `figmaAnatomyPlan`'s `state` argument, and `variantAxes`
 * entries indexing `variants` — and it found the claim by failing to compile. One exported pair rather
 * than a re-derived cast per file, so the argument above cannot be silently disagreed with downstream.
 */
export const statesOf = (def: ComponentDef): readonly string[] => def.states ?? [];
export const variantsOf = (def: ComponentDef): Record<string, string[] | undefined> => def.variants ?? {};

/**
 * Validate a `ComponentDef`. Structural checks always run; when a generated `tree`
 * (+ its `root`) is supplied, every token binding is resolved against it — the
 * bound-to-a-verified-contract gate (docs/14 §2). Returns `{ errors, warnings }`:
 * errors fail the gate (drift / broken binding); warnings surface a smell
 * (a component reaching past the semantic layer into a raw primitive tier).
 */
export const validateComponentDef = (
  def: ComponentDef,
  tree?: any,
  root?: string,
): { errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const req = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };

  // identity + prose
  req(!!def.id && /^[a-z][a-z0-9-]*$/.test(def.id), `id must be kebab-case (got '${def.id}')`);
  req(!!def.name, 'name is required');
  req(!!def.category, 'category is required');
  req(['draft', 'stable', 'deprecated'].includes(def.status), `status must be draft|stable|deprecated (got '${def.status}')`);
  req(!!def.description, 'description is required');

  // api
  req(Array.isArray(def.props), 'props must be an array');
  for (const p of def.props ?? []) {
    req(!!p.name && !!p.type && !!p.description, `prop '${p?.name ?? '?'}' needs name + type + description`);
    if (p.values && p.default !== undefined && typeof p.default === 'string' && !p.values.includes(p.default))
      errors.push(`prop '${p.name}': default '${p.default}' is not one of its values [${p.values.join(', ')}]`);
  }

  // states + variants
  req(Array.isArray(def.states), 'states must be an array (use [] for non-interactive)');
  req(!!def.variants && typeof def.variants === 'object', 'variants must be an object');

  // The CLOSED vocabularies (#821). Not redundant with the types on those two fields: `State[]` and
  // `Partial<Record<VariantAxis, …>>` bind wherever a compiler reads them — `typecheck-components.ts`
  // over the files git tracks as defs, and `apps/studio`'s `tsconfig` over the engine modules its
  // imports reach. Everything else arrives as DATA — an MCP caller's def, a brand's own component, the
  // hand-built objects this validator's own tests feed it — where a type asserts nothing at all. So the
  // type catches the author and this catches the caller, and neither subsumes the other.
  //
  // The first version of this comment said the defs were the only files compiled against this schema.
  // They are the only ones `typecheck-components.ts` covers, which is a different claim, and the studio's
  // typecheck falsified the wider one by failing on `anatomy-figma.ts` — see `statesOf`'s header. Left
  // recorded because "which compilers read this type" is not answerable by reading one gate's `include`.
  //
  // Read through `statesOf` / `variantsOf` and compare against a `readonly string[]` view of the list,
  // deliberately on both sides: comparing a `State[]` against `STATES` would be the compiler checking a
  // claim it already enforced, which is a check that cannot fail (`docs/34` shape 1). The value under
  // test has to be read as an unconstrained string for the membership test to mean anything.
  for (const s of statesOf(def))
    if (!(STATES as readonly string[]).includes(s))
      errors.push(`states: '${s}' is not one of the ${STATES.length} declared interaction states [${STATES.join(', ')}]. A state name reaches `
        + `figmaProperties.stateAxis member names, anatomy \`when:\` gates and \`{state}\` paint keys, so an unlisted one resolves nothing at the coordinate it names. `
        + `Do NOT add it to STATES to clear this unless it is a distinct INTERACTION with no existing entry expressing it — check the census in STATES' header first, `
        + `because a synonym for an entry already there is the failure mode this list exists to catch`);
  for (const a of Object.keys(variantsOf(def)))
    if (!(VARIANT_AXES as readonly string[]).includes(a))
      errors.push(`variants: '${a}' is not one of the ${VARIANT_AXES.length} declared axis names [${VARIANT_AXES.join(', ')}]. Axis NAMES are closed because two defs `
        + `declaring the same name are claiming the same kind of distinction; axis VALUES are deliberately open, so a new set of values needs no change here. `
        + `See VARIANT_AXES for the bar a new name has to clear`);
  for (const [a, vs] of Object.entries(variantsOf(def)))
    if (!Array.isArray(vs) || vs.length === 0)
      errors.push(`variants.${a}: an axis must declare at least one value — an empty axis multiplies the projected grid by nothing and is silently dropped by the cartesian fold (#795)`);

  // accessibility + docs + ai (the projections must be present — they're not optional)
  req(!!def.accessibility, 'accessibility block is required');
  req(!!def.docs?.usage, 'docs.usage is required (docs projection)');
  req(!!def.ai?.primaryPurpose && !!def.ai?.whenToUse, 'ai.primaryPurpose + ai.whenToUse are required');
  req(!!def.ai?.avoidWhen, 'ai.avoidWhen is required — the highest-value intent field (docs/13 §1)');

  // token bindings — resolve against the generated contract when a tree is supplied
  req(!!def.tokens && typeof def.tokens === 'object' && Object.keys(def.tokens).length > 0, 'tokens block must bind at least one slot');
  if (tree && root && def.tokens) {
    const valid = tokenPaths(tree, root);
    for (const [slot, ref] of Object.entries(def.tokens)) {
      if (typeof ref !== 'string') { errors.push(`token slot '${slot}' must be a string ref`); continue; }
      const path = normalizeRef(ref, root);
      if (!valid.has(path)) errors.push(`token slot '${slot}' → '${ref}' does not resolve in the generated tree`);
      else if (isPrimitiveRef(path)) warnings.push(`token slot '${slot}' → '${ref}' reaches a raw primitive tier — prefer a semantic role`);
    }
  }

  // the paint grammar (#758). Optional; when present, every placeholder must name something.
  if (def.paintKeys) errors.push(...paintKeyErrors(def));

  // anatomy — the structural layer (#327). Optional; when present it must be COMPLETE.
  if (def.anatomy) errors.push(...anatomyErrors(def));

  // Figma component properties (#487 §5). Optional; when present, every cross-reference must land.
  if (def.figmaProperties) errors.push(...figmaPropertyErrors(def));

  return { errors, warnings };
};

/**
 * Cross-reference checks for `figmaProperties` (#487 §5). Kept out of `validateComponentDef`'s body
 * for the same reason `anatomyErrors` is: this block's invariants are all RELATIONAL — every name it
 * uses must resolve somewhere else in the def — where the rest of the validator is field-by-field.
 *
 * This is the whole point of declaring the projection instead of inferring it. A `swaps` entry
 * pointing at a text node, or a variant axis that no longer exists, produces a Figma component that
 * fails at creation time in someone's file. Caught here, it is a failing unit test with no Figma
 * account involved.
 */
/**
 * Every axis name this def declares, in the order Figma will show them.
 *
 * Exists so the DECLARED surface and the EMITTED surface can be compared instead of hand-counted.
 * The projection count was previously asserted as a literal (`projected === 189`) computed from
 * `variantAxes × stateAxis` — which is a restatement of the declaration, not a check against the
 * emitter. `planComponentName` had been appending `leading=`/`trailing=` the whole time, so the real
 * surface was 756; the gate agreed with the declaration and neither noticed the other.
 *
 * **A count derived from a declaration cannot detect that the declaration is incomplete.** Comparing
 * these NAMES against the ones a real plan emits can, and does so for any axis added later rather
 * than only for this one.
 */
export const figmaAxisNames = (def: ComponentDef): string[] => {
  const fp = def.figmaProperties;
  if (!fp) return [];
  return [
    ...(fp.variantAxes ?? []),
    ...(fp.stateAxis?.name ? [fp.stateAxis.name] : []),
    ...(fp.slotAxes ?? []).map((s) => s.name),
  ];
};

/**
 * Which axis belongs across the COLUMNS (#656) — the declared preference, else the widest axis.
 *
 * Takes the DECLARED axis and the varying axes with their cardinalities, rather than a `ComponentDef`,
 * because the caller is `planSetLayout`, which receives plans and never the def. "Varying" is a fact
 * about the plans in hand, not about the declaration: a scoped set (one size, say) varies over fewer
 * axes than the def projects, and an axis with one value is not a column of one — it is not a column.
 *
 * Two sources, in order:
 *  1. `declared`, when there is one AND it is among the varying axes. A declared axis that does not
 *     vary in this particular set is not an error — it is a scoped set, and falling back is useful.
 *  2. Otherwise the highest-cardinality varying axis, ties broken by the order given (declaration
 *     order, as `figmaAxisNames` emits it). Cardinality is the right fallback because the widest axis
 *     makes the shortest table, and a 108×6 table reads where a 324×2 strip does not.
 *
 * LIVES HERE rather than inside `planSetLayout`, and the placement is the point: `planSetLayout` is
 * the SUBJECT of #656's gate, so an expectation computed by calling back into it would agree with it
 * by construction. Kept separate, the rule can be checked against a hand-written table on one side
 * and against the layout function's actual output on the other — two derivations that CAN disagree.
 * **Do not inline this into `planSetLayout` to save a parameter: that deletes the gate.**
 */
export const gridColumnAxis = (
  declared: string | undefined,
  varying: readonly { name: string; values: number }[],
): string | undefined => {
  if (!varying.length) return undefined;
  if (declared && varying.some((v) => v.name === declared)) return declared;
  return varying.reduce((best, v) => (v.values > best.values ? v : best), varying[0]).name;
};

/** How many variants the declared surface projects — the product of every axis's cardinality.
 *  Slot axes are boolean, so each doubles. Derived rather than restated, so adding an axis moves
 *  this number without anyone remembering to. */
export const figmaVariantCount = (def: ComponentDef): number => {
  const fp = def.figmaProperties;
  if (!fp) return 0;
  const variants = (fp.variantAxes ?? []).reduce((n, a) => n * ((variantsOf(def)[a]?.length) ?? 1), 1);
  return variants * (fp.stateAxis?.values.length ?? 1) * 2 ** ((fp.slotAxes ?? []).length);
};

export const figmaPropertyErrors = (def: ComponentDef): string[] => {
  const fp = def.figmaProperties;
  if (!fp) return [];
  const e: string[] = [];
  const parts = def.anatomy?.parts ?? {};
  if (!def.anatomy) e.push('figmaProperties requires `anatomy` — its property maps target anatomy parts');

  /**
   * Does `codeOnly` ADMIT this name — as opposed to merely mentioning it somewhere?
   *
   * Shared by the axis loop and the state loop, and the sharing is the point. A joined-prose
   * substring scan says yes to any mention, and these entries mention plenty of names they are not
   * about: `min-width derivation` contains `width`, the `modifiers` entry names `pending` while
   * explaining an AXIS, and `inactive`'s entry names `disabled` to say they share a paint. Under a
   * substring scan, deleting the `width` admission outright left the whole suite green (found in
   * #563 review) because another entry happened to spell the word — the `strokeWeight` shape again:
   * a gate satisfied by the comment that explains something else.
   *
   * So the entry must LEAD with the name, which is how every codeOnly entry is already written
   * (`name — explanation`). The delimiter test is what makes it a WHOLE WORD: without it a bare
   * `startsWith` lets `disabledStrategy` (a real lever name) admit dropping the `disabled` state,
   * and `min-width` admit `min`. That clause is separately asserted, because when it was first
   * written it was the one part of this check no test covered.
   */
  const admits = (term: string) => (def.anatomy?.codeOnly ?? []).some((c) => {
    const t = c.trim();
    if (!t.startsWith(term)) return false;
    const rest = t.slice(term.length);
    // `''` so a bare entry qualifies. NOT `-`: a hyphen is part of a compound NAME, not a separator
    // after one, so allowing it lets `min-width derivation` admit an axis called `min` and
    // `focus-ring-offset` admit a state called `focus`. Every real entry leads with its full name and
    // then ` — `, so nothing needs the hyphen. Found by the mutation this clause now has.
    return rest === '' || /^[\s—:(]/.test(rest);
  });

  // ---- variant axes ----
  if (!Array.isArray(fp.variantAxes) || fp.variantAxes.length === 0) {
    e.push('figmaProperties.variantAxes must be a non-empty array');
  } else {
    const seen = new Set<string>();
    for (const axis of fp.variantAxes) {
      if (!(axis in (def.variants ?? {}))) e.push(`figmaProperties.variantAxes: '${axis}' is not an axis in variants [${Object.keys(def.variants ?? {}).join(', ')}]`);
      if (seen.has(axis)) e.push(`figmaProperties.variantAxes: '${axis}' listed twice`);
      seen.add(axis);
    }
    // An axis the def declares but Figma will not carry is a real loss of fidelity. #487 §5 says the
    // reason belongs in codeOnly, and `codeOnly` already exists as the place a def ADMITS what the
    // Figma leg drops — so this makes the admission mandatory rather than merely encouraged. Without
    // it, an axis can quietly vanish from the projection and the def still reads complete.
    for (const axis of Object.keys(def.variants ?? {})) {
      if (!seen.has(axis) && !admits(axis)) {
        e.push(`variants.${axis} is not projected as a Figma variant and is not explained in anatomy.codeOnly — record why, or add it to variantAxes. The entry must LEAD with '${axis}' ("${axis} — why Figma cannot carry it"); a passing mention inside an entry about something else does not count`);
      }
    }
  }

  // ---- the state axis ----
  if (fp.stateAxis) {
    const { name, values } = fp.stateAxis;
    if (!name) e.push('figmaProperties.stateAxis.name is required');
    if (name && name in (def.variants ?? {})) e.push(`figmaProperties.stateAxis.name '${name}' collides with a variants axis of the same name`);
    if (!Array.isArray(values) || values.length === 0) e.push('figmaProperties.stateAxis.values must be a non-empty array');
    // Values come from `states`, the single source (#487 §0.4) — NOT from a legacy sheet's names.
    for (const v of values ?? []) {
      if (!statesOf(def).includes(v)) e.push(`figmaProperties.stateAxis: '${v}' is not one of states [${statesOf(def).join(', ')}]`);
    }
    // Same `admits` as the axis loop above — an omitted state is admitted on exactly the terms an
    // omitted axis is, and one helper means the next tightening cannot reach one loop and miss the
    // other, which is precisely how #563 shipped a fixed state check beside an unfixed axis check.
    const missing = (def.states ?? []).filter((s) => !(values ?? []).includes(s));
    for (const s of missing) {
      if (!admits(s)) e.push(`state '${s}' is not in the Figma state axis and is not explained in anatomy.codeOnly — a silently dropped state under-represents the def. The codeOnly entry must LEAD with '${s}' ("${s} — why Figma cannot carry it"); a passing mention inside an entry about something else does not count`);
    }
  }

  // ---- the slot-presence axes ----
  if (fp.slotAxes) {
    const taken = new Set<string>([...(fp.variantAxes ?? []), ...(fp.stateAxis?.name ? [fp.stateAxis.name] : [])]);
    for (const { name, part } of fp.slotAxes) {
      if (!name) e.push('figmaProperties.slotAxes: every entry needs a name');
      if (taken.has(name)) e.push(`figmaProperties.slotAxes: '${name}' collides with an axis of the same name`);
      taken.add(name);
      const p = parts[part];
      if (!p) e.push(`figmaProperties.slotAxes.${name} → part '${part}' does not exist in anatomy.parts`);
      // Presence is only a question for a part that can be absent. An axis over a part the anatomy
      // says is always there would emit a `false` coordinate the plan cannot actually build.
      else if (!p.optional) e.push(`figmaProperties.slotAxes.${name} → part '${part}' is not optional — presence is not a question for a part that is always there`);
    }
  }

  // ---- the grid column axis ----
  // Checked against the def's OWN axis names, so a `gridAxis` naming an axis this def does not
  // project is an error rather than a silent fallback to cardinality. That distinction is the whole
  // value of the field: a typo'd or renamed axis would otherwise leave the grid looking chosen while
  // it was inherited again — exactly the #656 failure, restored by a rename nobody ran a gate over.
  // Placed after the three axis blocks because it needs the complete name list they build.
  if (fp.gridAxis !== undefined) {
    const names = figmaAxisNames(def);
    if (!names.includes(fp.gridAxis))
      e.push(`figmaProperties.gridAxis: '${fp.gridAxis}' is not an axis this def projects [${names.join(', ')}] — the grid's column axis must be one Figma will carry`);
  }

  // ---- the part-targeting maps ----
  const propNames = new Set((def.props ?? []).map((p) => p.name));
  const claimed = new Map<string, string>();
  // Takes `prop → part name`. `texts` carries a second field and is normalized to this shape by its
  // caller below, rather than this helper learning two shapes — the relational checks are identical
  // for all three maps and the difference is one field, so the narrower helper is the honest one.
  const checkMap = (label: string, map: Record<string, string> | undefined, kind?: PartKind, requireOptional = false): void => {
    for (const [prop, part] of Object.entries(map ?? {})) {
      if (!propNames.has(prop)) e.push(`figmaProperties.${label}: '${prop}' is not a declared prop`);
      const p = parts[part];
      if (!p) { e.push(`figmaProperties.${label}.${prop} → part '${part}' does not exist in anatomy.parts`); continue; }
      if (kind && p.kind !== kind) e.push(`figmaProperties.${label}.${prop} → part '${part}' is kind '${p.kind}', expected '${kind}'`);
      // A BOOLEAN drives `visible`, so its target must be a part the anatomy already says may be
      // absent. Toggling a required part off produces a component whose own anatomy forbids it.
      if (requireOptional && !p.optional) e.push(`figmaProperties.${label}.${prop} → part '${part}' is not optional; a BOOLEAN toggles visibility, so the anatomy must allow the part to be absent`);
      const owner = claimed.get(part);
      // One node, one property kind. A part driven as both a TEXT and an INSTANCE_SWAP is two
      // different Figma property types pointed at the same node — unresolvable at creation.
      if (owner) e.push(`part '${part}' is targeted by both ${owner} and ${label}.${prop} — a node carries at most one property kind`);
      claimed.set(part, `${label}.${prop}`);
    }
  };
  checkMap('texts', Object.fromEntries(Object.entries(fp.texts ?? {}).map(([p, t]) => [p, t.part])), 'text');
  checkMap('swaps', fp.swaps, 'slot');
  checkMap('booleans', fp.booleans, undefined, true);

  // The placeholder is REQUIRED to say something. An empty default is exactly what Figma accepts and
  // what #510 shipped — 21 variants with nothing readable in them — so a def that declares a TEXT
  // property and leaves its copy blank is stating the one thing the field exists to prevent.
  //
  // ZERO-WIDTH characters are stripped before the test, not just whitespace. `.trim()` handles the
  // space family including U+00A0, but `'​'.trim()` is truthy — so a zero-width space satisfied a
  // check whose entire subject is whether the label RENDERS anything (#513 review). Nobody types one
  // deliberately; they survive copy-paste out of design tools, which is exactly how a def gets written.
  // The set is the invisible formatting characters rather than U+200B alone: the test is "does this
  // advance the caret", and narrowing it to the one character that was probed would leave the next
  // member of the same class to be found the same way.
  // Written as \u escapes deliberately: the literal characters are INVISIBLE in source, so a reader
  // cannot see what the class contains and a diff cannot show one being added or dropped.
  const renders = (s: string) => s.replace(/[\u200B-\u200F\u2028-\u202E\u2060-\u2064\uFEFF]/g, '').trim();
  for (const [prop, t] of Object.entries(fp.texts ?? {})) {
    if (!t.default || !renders(t.default)) e.push(`figmaProperties.texts.${prop}.default is empty — a TEXT property with no placeholder builds a component with an unreadable label, which is what the field exists to prevent`);
  }

  // AND THE COMPLEMENT, which the rule above cannot see (#798): every `text` part must BE claimed by one
  // of those properties. `characters` lands on a text node only where a TEXT property names that part
  // (`anatomy-figma.ts`'s `placeholder` map), so an unclaimed text part projects as a TEXT node with
  // correct ink, correct type style and NO CONTENT — an empty, zero-width node on the canvas.
  //
  // The two checks are opposite halves and neither implies the other: the one above starts from the
  // PROPERTY list and asks whether each default renders; this one starts from the PART list and asks
  // whether each part has a property at all. A def with two text parts and one property passes the first
  // trivially — there is nothing wrong with the property it declares — which is exactly how #796 shipped
  // `field-label`'s indicator as a blank node through a green suite, reviewed and merged.
  //
  // #510 IS THE PRECEDENT AND IT IS WHY THIS IS AN ERROR RATHER THAN A WARNING: it pasted 21 buttons that
  // were all BLANK, every binding resolved, every check green, because *"nothing wrote `characters` and
  // nothing declared a TEXT property"* (`anatomy-figma.ts`'s `pasteComponentSet` header). That was the
  // whole-component case; this is the same defect at one-node scale, which is harder to see because the
  // component looks right and one node inside it is missing.
  //
  // Scoped to defs that CAN project, deliberately: a def with no `figmaProperties` cannot be built at any
  // coordinate (`figmaAnatomySet` throws), so it has no blank node to ship. `field-message` is exactly
  // that case today — one text part, no property, unprojectable for #795's reason — and failing it here
  // would report a defect that cannot reach a canvas, then be silenced by a fabricated property. This
  // function only runs where `figmaProperties` exists, which is that scope already; stated so the
  // narrowness reads as chosen rather than as an oversight.
  // Built from `fp.texts` rather than reusing the `claimed` map above, and that is not duplication: that
  // map records part → *any* property kind, so a text part claimed by a `swaps` entry would satisfy it
  // while still writing no `characters`. Only a TEXT property populates the placeholder. (`checkMap`
  // separately rejects a `swaps` entry pointing at a text part, so that state is unreachable today —
  // which is the argument for asking the precise question here rather than relying on it staying so.)
  const textClaimed = new Set(Object.values(fp.texts ?? {}).map((t) => t.part));
  for (const [name, p] of Object.entries(def.anatomy?.parts ?? {})) {
    if (p.kind === 'text' && !textClaimed.has(name)) {
      e.push(`anatomy part '${name}' is a 'text' part with no TEXT property claiming it — \`characters\` is written only where \`figmaProperties.texts\` names the part, so this node projects with its ink and type style and NO content: an empty, zero-width text node in Figma. Add \`texts: { <prop>: { part: '${name}', default: '<placeholder>' } }\`. This is #510's blank-button defect at one-node scale`);
    }
  }

  // ---- the standalone floor (#869) ----
  //
  // Shape only — whether the field is WELL-FORMED, not whether it is TRUE. Truth is
  // `lint-standalone-floor.ts`'s job, in both directions, because answering it needs the projected plan
  // and this function has only the def. Keeping the two apart is deliberate: a validator that decided
  // renderability from the def would be inferring the very thing the field exists to have declared.
  if (fp.notStandalone !== undefined) {
    const t = fp.notStandalone.trim();
    if (!t) e.push('figmaProperties.notStandalone is empty — the string IS the reason a designer reads when the build is refused, so an empty one refuses with no explanation, which is worse than not declaring it');
    // Same LEAD rule as `admits`, same reason: a reason that merely mentions the def somewhere could be
    // a reason about something else. Checked against `def.id` rather than a caller's claim.
    else if (!t.startsWith(`${def.id}:`)) e.push(`figmaProperties.notStandalone must LEAD with '${def.id}:' so the reason names its own subject — read "${t.slice(0, 40)}…"`);
  }

  return e;
};

/** Expand a binding key's `{size}` placeholder across a def's declared sizes. A key with no
 *  placeholder expands to itself, so callers need not special-case. */
export const expandKey = (key: string, sizes: string[]): string[] =>
  key.includes('{size}') ? sizes.map((s) => key.replace('{size}', s)) : [key];

/**
 * The paint slots the projector asks for (`anatomy-figma.ts`'s paint dispatch). Exported so
 * `paintKeyErrors` and the projector cannot disagree about the vocabulary — one list, two readers.
 *
 * WHAT MAKES A NEW ENTRY ADMISSIBLE: **a distinct ink ROLE, not a distinct PART.** Every entry here is
 * a different thing colour does — a ground (`fill`), a translucent ground (`overlay`), an edge
 * (`border`), text ink (`label`), glyph ink (`icon`) — and the list is chosen by part KIND precisely so
 * it stays that short: one entry serves every box, every text node, every glyph in the corpus.
 *
 * `indicator` (#796) is the ONE entry that names a part rather than a kind, and it is the exception the
 * rule has to survive rather than the start of a pattern. It earns its place because the two text nodes
 * in `field-label` carry genuinely different ink roles — the name and its de-emphasised suffix — and
 * `field-label`'s own `{slot}` grammar had no way to reach the second: `paintOf` dispatches by slot and
 * never sees which part asked, so both text parts took `paintOf('label')` and the muted "(optional)"
 * rendered in primary ink. The measurement is in `PartDef.paintSlot`.
 *
 * **The failure mode to guard is this list reaching fifteen entries with half of them part names**, at
 * which point it has stopped being a set of ink roles and become a per-part registry — and a
 * vocabulary that names parts cannot be checked against anything, because every new part legitimises
 * its own word. So the test for a candidate is not "does a part need its own colour" (a part can
 * always be given one) but "is this a role no existing entry expresses". If the answer is a part name,
 * the honest fix is usually a second part of a different KIND, or a def-tier decision that the two
 * surfaces share ink. And the DO-NOT-WIDEN rule in `paintKeyErrors` still binds independently: an entry
 * needs a real `paintOf('<slot>')` dispatch behind it before it may be added at all.
 */
export const PAINT_SLOTS = ['fill', 'overlay', 'border', 'label', 'icon', 'indicator'] as const;

/**
 * The paint slots a SLOT-FREE template is allowed to answer (#758).
 *
 * A template with no `{slot}` placeholder — `icon`'s `tone.{tone}` — substitutes to the same key for
 * every slot asked, so applied blind it answers `border` with the same variable it answers `fill`.
 * Measured, not predicted: `icon`'s glyph came back with `fills` AND `strokes` both bound to
 * `color/icon/primary`, a spurious 1px outline on every glyph in the set. Nothing would have failed —
 * the plan is structurally valid and the variable resolves.
 *
 * So a slot-free grammar answers only the slot that IS the part's paint: a box's `fill`, a text node's
 * `label`, a glyph's `icon`. It is a rule over the projector's own dispatch rather than a per-def
 * declaration, because a def with one paintable surface has nothing to choose between — asking it to
 * name the slot would be asking it to restate its part's kind.
 *
 * A def whose grammar DOES need to reach `border` or `overlay` says so by keying `{slot}`, which is
 * what every def with more than one paintable surface already does.
 *
 * `indicator` IS HERE (#796), and the reason is the rule above read literally rather than a second
 * decision: it is what a text part's paint IS when that part declares `paintSlot: 'indicator'`, exactly
 * as `label` is for a text part that declares nothing. Both are the primary paint of the same KIND, so
 * excluding it would mean a slot-free grammar over an indicator part resolved nothing at all — a part
 * that projects structurally and never paints, which is the #784 shape this pass exists to remove.
 * No def in the corpus needs that combination today (`field-label` keys `{slot}`), so this is the
 * consistent answer rather than a demonstrated one — stated so the next slot-free grammar does not
 * inherit a silent hole.
 */
export const PRIMARY_PAINT_SLOTS = new Set(['fill', 'label', 'icon', 'indicator']);

/**
 * The slots a `box` part may declare in `paintSlots` (#933) — a NAMED SUBSET of `PAINT_SLOTS`, not a
 * second vocabulary. The dispatch words are unchanged; this says which of them land on a box.
 *
 * `label` and `icon` are missing on purpose. They are INK roles for a node that DRAWS something — a
 * box taking one would put a filled rectangle BEHIND the thing it was meant to colour. That is not a
 * prediction: it is #864's measured failure met from the other side. `createNodeFromSvg` hands back a
 * frame wrapping the outline, a fill on that frame painted a square behind every glyph in the set, and
 * the fix was to route ink to the vector by descendant search. A box declaring `paintSlots: ['icon']`
 * would re-open that from the def tier, where it would read like a deliberate choice.
 *
 * `indicator` WAS in that list and is not any more (#910), and the correction is worth stating because
 * the original reason was sound and over-general. #864's premise is that a box claiming an ink slot
 * paints a rectangle behind the glyph or text node that actually draws the mark. An `indicator` need
 * not be drawn by a child at all: radio's dot IS a box — a filled circle, at `radius.round` — and there
 * is nothing behind it to obscure, because it draws itself. There is no filled circle in the glyph
 * vocabulary and minting one would put a bare primitive into a set whose membership rule is that an
 * entry carries meaning, so a `vector` is not the cheaper route here.
 *
 * The premise is kept as a CHECK rather than as this paragraph: `anatomyErrors` refuses a box claiming
 * `indicator` that has a `vector` or `text` child, which is exactly the configuration #864 measured.
 * `field-label`'s indicator is unaffected — it is a `text` part reaching `indicator` through the
 * singular `paintSlot`, a different field and a different branch of the projector.
 *
 * Which leaves the three grounds and the one edge, and the split is exhaustive by construction rather
 * than by a list the projector also keeps: `border` is the only edge slot, so it is the only one that
 * reaches `strokes`, and everything else competes for the single `fills` array in declaration order.
 */
export const BOX_PAINT_SLOTS = ['overlay', 'fill', 'border', 'indicator'] as const;

/**
 * The RUNTIME INTERACTION STATES a def may declare (#821, argued in `docs/39` §7(a)).
 *
 * Closed for the reason `PAINT_SLOTS` is closed, one tier up: at 7 components free-form state strings
 * are invisible drift, and at 25 they are the difference between *"the catalogue has a state model"*
 * and *"each component invented one"*. Doing it now costs seven defs' worth of review; doing it after
 * the catalogue means adjudicating twenty-five components' worth of accumulated spelling.
 *
 * `states` is NOT merely decorative prose — it is read by four things, which is what makes drift here
 * expensive rather than cosmetic: `figmaAnatomyPlan` refuses an undeclared state, `figmaProperties`
 * requires its `stateAxis` values to be declared states, `anatomy`'s `when:` gates a part on one, and
 * `paintKeyErrors` fills `{state}` from this list. A misspelling in any of those resolves nothing at the
 * coordinate it names — the #784 shape — so the vocabulary is the earliest place to catch it.
 *
 * ── MEASURED BEFORE IT WAS CLOSED, and the census is why this list is eleven and not seven ──────────
 *
 * The corpus declared 11 distinct state names across 7 defs, and closing the list admitted all 11 —
 * because closing a vocabulary is a different act from renaming what shipped. It is **10** now: #843
 * adjudicated the one synonym the census exposed (below), which is the closure paying for itself rather
 * than a revision of it. Every remaining name is admitted, because closing a
 * vocabulary *around what shipped* is a different act from renaming what shipped, and the second is a
 * token-tier breaking change this is not (see principle 5 — `states` values reach `figmaProperties`
 * member names, so a rename moves the Figma surface):
 *
 *     rest           4 defs   button, icon-button, field-label, text-field
 *     disabled       4        button, icon-button, field-label, text-field
 *     hover          3        button, icon-button, text-field
 *     focus-visible  3        button, icon-button, text-field
 *     pressed        2        button, icon-button
 *     pending        3        button, icon-button, text-field   (text-field was `loading` — see below)
 *     inactive       2        button, icon-button
 *     read-only      1        text-field
 *     error          1        text-field
 *     empty          1        text-field
 *
 * ── THE ONE THING THE CENSUS FOUND, and it is now RESOLVED rather than filed (#843) ────────────────
 *
 * `pending` (button, icon-button) and `loading` (text-field) were one concept spelled twice. Both name
 * an async operation in flight; button's `anatomy` gates its spinner on `pending` and `text-field`'s
 * `loading` prop read *"a spinner replaces an adornment without reflow; sets aria-busy"* — the same
 * mechanism under a second name. **`pending` won and `loading` is gone from this list.**
 *
 * The direction was MEASURED, not preferred, and the two figures are the whole argument: `pending` is a
 * value on button's and icon-button's projected `stateAxis`, so it names a Figma variant member on
 * **810** members; `text-field` has no `figmaProperties` block at all, so `loading` named **0**.
 * Renaming the single-def spelling moves nothing that ships; renaming the pair's majority would have
 * moved 810 member names, which is principle 5's breaking change.
 *
 * TWO THINGS THE FILED ISSUE GOT WRONG, recorded because the correction is the reusable part: it said
 * merging *"repoints an `anatomy.when` on a third [def]"* and that `text-field`'s `loading` gates a
 * part. Neither is true — `when: 'loading'` occurs nowhere in the repo and `text-field` has no
 * `anatomy` block, so the migration cost it priced was for a mechanism that does not exist. **A cost
 * estimate written while filing is a hypothesis; re-measure it before paying it or declining to.**
 *
 * And the repo had already adjudicated this pair once, in the direction this decision confirms:
 * `button.ts`'s `figmaProperties` comment records that the legacy spec sheet's `loading` is *that
 * sheet's name for* `pending`, `docs/40`'s #487 §0.4 forbids codifying it, and `test.ts` asserts no
 * state axis carries it. `loading` re-entered through a def, past the gate that watches the axis. The
 * general shape: **a rejected name can return through whichever door the gate is not standing at.**
 *
 * A `states` entry may only be added here with a stated reason, and the bar is the one `PAINT_SLOTS`
 * sets: **a distinct interaction, not a distinct component.** `read-only`, `error` and `empty` are
 * single-def entries that clear it — each is a real interaction state of a text input with no existing
 * entry expressing it. An eleventh entry that turns out to be a synonym for one of these is the failure
 * mode; that is what the census above is for, and `loading` is what it caught.
 */
export const STATES = [
  'rest', 'hover', 'pressed', 'focus-visible', 'disabled',
  'pending', 'inactive', 'read-only', 'error', 'empty',
] as const;

/** One member of the closed state vocabulary. `ComponentDef.states` is `State[]`, so an unknown state
 *  name is a compile error in the def rather than a lookup that resolves nothing at runtime. */
export type State = (typeof STATES)[number];

/**
 * The VARIANT AXIS NAMES a def may declare (#821).
 *
 * **Names close; VALUES stay open, and that asymmetry is the decision rather than an omission.** An
 * axis name is a claim about *what kind of distinction this is* — two components declaring `intent` are
 * saying they vary along the same conceptual axis, and that claim is checkable and worth checking. An
 * axis's VALUES are the component's own design: `icon` has 9 tones against `field-message`'s 4, keyed in
 * opposite grammars. Closing values would force one of that pair to rekey for no gain in meaning.
 *
 * `size` used to be this paragraph's second example, and its replacement by #844 sharpens the rule rather
 * than weakening it. The five defs now share one t-shirt vocabulary — but **not because this list closed
 * it**, which it still does not. `size` was unified by a decision recorded in the corpus (see inconsistency
 * 1 below), and a def remains free to spell its size values however it likes as far as this file is
 * concerned. The distinction is the load-bearing one: *values stay open* is a statement about what the
 * SCHEMA refuses, never a claim that every vocabulary is equally good. Reading it as the latter is what
 * would leave a synonym sitting in a census forever, on the grounds that the type permits it.
 *
 * ── WHAT THE FIELD RESEARCH FOUND, which is the reason to say the asymmetry out loud ────────────────
 *
 * **No design system surveyed enforces that two components' shared axis names mean the same thing.**
 * Material, Polaris, Carbon, Primer and Spectrum all use `size`/`variant`/`emphasis` across components
 * with per-component meanings and no cross-component contract. So this is a deliberate step past the
 * field rather than a convention borrowed from it, and the honest scope of the step is *names only*:
 * closing the names makes a typo and a synonym visible; it does NOT assert the two axes carry the same
 * semantics, which nothing here can check.
 *
 * ── MEASURED: 11 distinct axis names, and TWO INCONSISTENCIES THE CENSUS EXPOSED ────────────────────
 *
 *     size        8 defs   ALL EIGHT [small,medium,large] / [small,medium] — one vocabulary since #844
 *     appearance  2        button, icon-button — [filled,outline,text] BOTH, identical
 *     intent      2        button, icon-button — [primary,neutral,destructive] BOTH, identical
 *     selection   3        checkbox[unchecked,checked,indeterminate] · radio[unchecked,checked] ·
 *                          switch[off,on] — the family axis, decided once below. THE VALUES DIVERGED,
 *                          which is the census doing its job rather than a defect: see below.
 *     style       2        text-field, textarea — [bordered] BOTH, an axis of one on each
 *     tone        2        icon[9 values] · field-message[4 values] — disjoint, opposite key grammars
 *     color       1        focus-ring
 *     indicator   1        field-label
 *     name        1        icon[39 values] — the glyph vocabulary (#864)
 *     offset      1        focus-ring
 *     width       1        button
 *
 * 1. **`size` spelled one concept three ways** — `[xs,sm,md,lg]` (icon) / `[small,medium,large]` (three
 *    defs) / `[small,medium]` (field-label). **RESOLVED (#844): the t-shirt words win, and `icon` moved.**
 *
 *    Values stay open as a RULE — that asymmetry above is unchanged, and this is not a values-closing
 *    exception to it. `size` is decided one level up, in the corpus rather than in the schema: nothing
 *    here refuses a def's size values, and a def is free to spell them wrong. What settled the direction
 *    was two measurements, neither of them taste:
 *
 *      - **`size` was the ONLY axis in the corpus with abbreviated values.** All nine others spell whole
 *        words — `filled`/`outline`/`text`, `primary`/`neutral`/`destructive`, `auto`/`full`,
 *        `required`/`optional`. So `icon` was not one of two competing conventions; it was the single
 *        exception to a convention the other 21 values already followed.
 *      - **The projected-member cost is 4 against 814.** These values reach `figmaProperties` member
 *        names, which is why #844 was filed rather than fixed inline. Unifying on the words renames 4
 *        members (`icon`'s whole projected set); unifying on the abbreviations renames 814 across button,
 *        icon-button and field-label. The cheap direction was also the correct one, which is not always
 *        how this goes and is the reason to state both figures rather than just the winner.
 *
 *    **The `md` DEFAULT RULE is untouched, and that is the subtlety worth reading twice.** #756 decided a
 *    def's default size resolves to the tier's `md` rung, and `icon` still does: its default is now
 *    spelled `medium` and its binding still reaches `icon.size.md`. The rung names remain the engine's —
 *    #756's rule is about which TIER RUNG a binding points at, and this is about which word the CONSUMER
 *    types. The two are independently authored halves, which is exactly what `lint-rung-names.ts` arm 2
 *    compares; collapsing them would delete that gate, so `icon` now states `medium → md` the same way
 *    the other four defs always did. Verified by mutation: with `icon` spelled in words, inverting its
 *    ladder (`xs→sm, sm→xs`) is still caught by arm 2C.
 * 2. **`modifiers` was not an axis** and its own def said so. **RESOLVED (#845): removed, from both defs
 *    and from this list.** Its values were not alternatives — a button can carry a leading visual AND a
 *    trailing visual, and `pending` was a coordinate on the state axis entirely; `icon-button`'s copy was
 *    an axis of one, which has no dimension at all. Each value already had a correct home, so this was a
 *    removal rather than a migration: the two visuals are `figmaProperties.slotAxes` (declared since #487
 *    step 2 — which also means button's admission had gone stale, claiming that axis "does not exist in
 *    this def yet"), and `pending` is a `states` value on the projected `stateAxis`.
 *
 *    **Projection-neutral, measured: `figmaAnatomySet` returns 648 / 162 members before and after.** What
 *    it does move is the paint-census GRID, 1134 → 378 coordinates on button (4374 → 1458 assignments)
 *    — `lint-paint.ts` arm 2 stopping its enumeration of a phantom third dimension.
 *
 * `offset` is the interesting admission: #795 decided it is NOT a projected axis (Figma's `x`/`y` bind
 * no variable, so its two members would differ only by a value the platform cannot hold), and
 * `focus-ring` documents that in `codeOnly`. It stays in `variants` and therefore in this list, because
 * `variants` is the AUTHOR's axis set and `figmaProperties.variantAxes` is the projected subset — #795
 * is exactly the change that made those two different questions. A reader who conflates them will try
 * to delete this entry.
 *
 * ── `selection`: THE TENTH NAME, ADDED FOR THE SELECTION-CONTROL FAMILY (checkbox, radio, switch) ──
 *
 * Admitted with `checkbox` (KB `components/checkbox.md` §4). It names the kind of distinction *"which
 * of this control's mutually-exclusive selection values is showing"* — checkbox `[unchecked, checked,
 * indeterminate]`, and the same axis on `radio` and `switch` when those are authored.
 *
 * **DECIDED ONCE, FOR THREE DEFS, WHICH IS THE ONLY REASON IT IS HERE AND NOT IN THE FIRST DEF THAT
 * WANTED IT.** Checkbox, radio and switch each meet this question independently, and three defs each
 * answering it alone is #756's failure mode exactly: `selection` / `selected` / `state` / `on` are four
 * spellings of one axis, every one individually defensible, and the census that would catch them runs
 * after all three have shipped. `pending`/`loading` (#843) is what that costs when it is only two defs
 * and one word. So the NAME is settled here for the family; the VALUES stay open per the asymmetry
 * above, with the recommendation that they follow native DOM — `checked`/`unchecked` is the word ARIA
 * uses for all three (`aria-checked` covers `checkbox`, `radio` AND `role="switch"`), so a switch
 * spelling its axis `[off, on]` should be a decision somebody takes rather than a default.
 *
 * **ALL THREE HAVE NOW SHIPPED, AND THE VALUES DIVERGED: `switch` SPELLS IT `[off, on]`.** The decision
 * was taken explicitly rather than defaulted into, which is what this paragraph asked for, and the
 * argument is in `components/switch.ts`'s header at length: paint-key values describe what is on SCREEN
 * and appear in no ARIA tree; `role="switch"` is ANNOUNCED "on"/"off" (that is the whole reason the role
 * exists rather than reusing `role="checkbox"`), so ARIA's own output is on/off even though its property
 * is `aria-checked`; and `checked` is the word carrying that component's most common misuse, since a def
 * spelled `[unchecked, checked]` reads as a checkbox with a different skin.
 *
 * **Recorded here because the recommendation this paragraph made was NOT followed, and a recommendation
 * whose outcome is not written down is one nobody can audit.** The consequence is the failure mode the
 * asymmetry above concedes and the reason to be explicit about it: three defs now spell one axis two
 * ways, and **nothing in this file or anywhere else in the engine can check that.** `VARIANT_AXES`
 * closes NAMES; the census above is authored prose and counts DEFS per axis, so it needs a human to
 * notice. That is not an argument for closing values — the asymmetry stands, and #864's `name` axis is
 * why — it is the honest statement of what the open half costs. If the family should be unified, the
 * decision belongs in `switch.ts` (delete `[off, on]`), and the three grounds are what must be defeated.
 *
 * ── WHY AN AXIS AND NOT TWO ENTRIES IN `STATES`, WHICH WAS THE CHEAPER ANSWER ────────────────────
 *
 * `checked` and `indeterminate` would both be admissible `STATES` entries on the letter of that list's
 * bar — six of its ten members are already non-interactions (`empty`, `error`, `pending`, `read-only`,
 * `inactive`, `disabled`), so "a distinct interaction" is not what the list actually contains. The
 * reason it is an axis is MECHANICAL and it is about a coordinate that would paint the wrong colour:
 *
 *     `{state}` holds ONE value per coordinate, so `checked` as a state makes `checked` × `hover`
 *     inexpressible — and it does not fail, it FALLS BACK. A hovered checked box resolves the state
 *     `hover`, finds the UNCHECKED hover border, and paints it. That is #708's shape: a wrong value
 *     that resolves, invisible to every gate.
 *
 * An axis crosses with the state axis by construction (`{slot}.{selection}.{state}`), which is what
 * `button` already does with `{intent}.{appearance}.{slot}.{state}`. The precedent for a RUNTIME-driven
 * axis is `field-message`'s `tone`, whose values are validation outcomes rather than author choices —
 * so "variants is the author's set" is about who OWNS the axis, not about who moves it.
 *
 * ── `name`: THE ELEVENTH NAME, THE FIRST WHOSE VALUES ARE A VOCABULARY (#864) ────────────────────
 *
 * `name` (#864) is the admission that tests the "names close, values stay open" rule hardest, because it
 * is the first axis whose values are a VOCABULARY rather than a design choice: its 39 values are
 * `ICON_NAMES`, spread from the icon set, so `icon.ts` does not author them and cannot spell one wrong.
 * It earns the entry on the same ground every other one does — a distinct kind of distinction, and one no
 * existing name expresses. `tone` is which ink, `size` is how big, and neither says WHICH GLYPH; `style`
 * and `appearance` are the two that come closest and both name a treatment applied to fixed content.
 *
 * Two things about it are worth reading before adding a second axis of this shape. It is the largest axis
 * in the corpus by an order of magnitude — 39 values against `tone`'s 9 — and axis size is not free
 * downstream: `lint-paint.ts` takes a cross product over `variants`, so icon's grid census moves from 36
 * coordinates to **351** and needs a fresh `--accept` baseline. Read as measured, not as ×39: this axis
 * arrived in the same change that took `size` (4 rungs) out of `variants`, so the product went
 * 4 × 9 → 39 × 9. An axis of this width added to a def that keeps its other axes multiplies them all,
 * which for `button` would be four figures. And it is the first axis a def does not spell out, which is
 * what makes it safe at that width: a values census over `name` reads
 * the icon set, so the synonym-sitting-in-a-census failure mode this list guards has no way in here.
 */
export const VARIANT_AXES = [
  'size', 'intent', 'appearance', 'tone', 'color',
  'width', 'style', 'indicator', 'offset', 'selection',
  'name',
] as const;

/** One member of the closed axis-NAME vocabulary. Values are not constrained — see `VARIANT_AXES`. */
export type VariantAxis = (typeof VARIANT_AXES)[number];

/**
 * Bindings that name a component this def WILL nest, before it has the `anatomy` block that would
 * say so (#784).
 *
 * The segment-vocabulary rule exempts a nested component's own token by reading `anatomy.parts[*].nests`
 * — derived, so it cannot go stale. A def with no `anatomy` yet has nowhere to state the relationship,
 * and `text-field`'s `focus-ring` binding is the one such case in the corpus: it is Button's binding
 * verbatim, gated per brand for the same reason, and the ring is in `composition.composesWith`.
 *
 * This map is deliberately the SMALLEST possible escape hatch, and it is self-retiring: the guard
 * requires `!def.anatomy`, so the entry stops applying the moment the anatomy block lands and the
 * derived path takes over. `paintKeyErrors` asserts both stale directions — an entry naming a key that
 * does not exist, and an entry for a key the rule would not have flagged anyway.
 */
const NESTED_WITHOUT_ANATOMY: Record<string, string[]> = {
  'text-field': ['focus-ring'],
  // Same case, same removal trigger: `textarea` binds the substrate's ring and has no `anatomy` yet,
  // so `nests` cannot see it either. Both entries go when their anatomy blocks land.
  'textarea': ['focus-ring'],
  // `checkbox` WAS the third entry and came out in #910, which is the guard retiring itself as designed:
  // the def now has an `anatomy` whose `focusRing` part declares `nests: 'focus-ring'`, so `nestedIds`
  // sees the binding and the exemption stopped being needed. Left as a note because it is the first time
  // an entry has been removed by the trigger its own comment named, and the removal is not optional — the
  // stale-direction assertion below fails on an entry whose def has gained a block.
  //
  // `radio` inherits the entry along with the binding — same control ring, same absent anatomy block.
  'radio': ['focus-ring'],
  // And this one closes the selection-control family. `switch`'s ring sits on the TRACK rather than on
  // a box (brief §4: never on the thumb, which moves), which changes which part will carry it once the
  // anatomy block lands and changes nothing about this entry: the binding is structurally Button's and
  // the def has no `anatomy`, so `nests` cannot see it. Both remaining pairs go the same way.
  'switch': ['focus-ring'],
};

/** Every `{placeholder}` in a paint-key template, in order of appearance. */
export const paintKeyPlaceholders = (template: string): string[] =>
  [...template.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);

/**
 * Fill one paint-key template at one coordinate, or `undefined` if it cannot be filled (#758).
 *
 * Returning `undefined` rather than a partly-substituted string is what keeps a RAGGED grid
 * expressible. `{intent}.{appearance}.{slot}.{state}` at a rest coordinate has no `state` value, and
 * a template that emitted `primary.filled.fill.` would look up a key nothing binds — indistinguishable
 * from a key the def deliberately omits. So an unfillable template is skipped and the next one is
 * tried, which is exactly the state-suffix fallback `paintOf` used to hardcode.
 */
export const fillPaintKey = (
  template: string,
  slot: string,
  coord: Record<string, string | undefined>,
): string | undefined => {
  let out = template;
  for (const ph of paintKeyPlaceholders(template)) {
    const value = ph === 'slot' ? slot : coord[ph];
    if (!value) return undefined;
    out = out.replace(`{${ph}}`, value);
  }
  return out;
};

/**
 * Cross-reference checks for `paintKeys` (#758). Every placeholder must name something the def has.
 *
 * This is the check the hardcoded template could never have: `{intent}` inside `anatomy-figma.ts` was
 * true of Button and false of five other defs, and nothing could say so because nothing declared it.
 * A placeholder here is validated against THIS def's `variants` and `states`, so a def naming an axis
 * it does not have fails at authoring time instead of projecting unpainted.
 */
const paintKeyErrors = (def: ComponentDef): string[] => {
  const e: string[] = [];
  const keys = def.paintKeys!;
  if (!Array.isArray(keys) || keys.length === 0) {
    e.push('paintKeys must be a non-empty array — an empty grammar is stated by omitting the field');
    return e;
  }
  const axes = Object.keys(def.variants ?? {});
  const seen = new Set<string>();
  for (const template of keys) {
    if (typeof template !== 'string' || !template) { e.push('paintKeys: every entry must be a non-empty string'); continue; }
    if (seen.has(template)) e.push(`paintKeys: '${template}' listed twice`);
    seen.add(template);
    const phs = paintKeyPlaceholders(template);
    if (!phs.length) continue; // a literal key (`border`, `focus-ring`) — checked against `tokens` below
    for (const ph of phs) {
      if (ph === 'slot' || ph === 'state') continue;
      if (!axes.includes(ph))
        e.push(`paintKeys: '${template}' names '{${ph}}', which is not an axis in variants [${axes.join(', ')}]`);
    }
    if (phs.includes('state') && !(def.states ?? []).length)
      e.push(`paintKeys: '${template}' names '{state}', but this def declares no states`);
  }

  // A template that can never resolve is a declaration nobody honours, and it is SILENT: `paintOf`
  // skips a key `tokens` does not bind, so a grammar with a typo'd slot segment projects unpainted
  // and reports nothing. So every template must be REACHABLE — some key in `tokens` matches its
  // shape — which is the same posture `anatomy`'s binding keys already take, one step less direct
  // because the coordinate is not known here.
  const bound = Object.keys(def.tokens ?? {});
  const matcher = (template: string): RegExp =>
    new RegExp(`^${template.replace(/[.]/g, '\\.').replace(/\{[^}]+\}/g, '[^.]+')}$`);
  for (const template of keys) {
    if (!bound.some((k) => matcher(template).test(k)))
      e.push(`paintKeys: '${template}' matches no key in tokens — a template nothing binds projects unpainted and reports nothing`);
  }

  /*
   * THE SEGMENT VOCABULARY, and the reason the check above was not enough (#784).
   *
   * Reachability asks whether a template matches SOME key's shape. It says nothing about whether the
   * VALUES filling a placeholder are values the projector ever supplies — and a template can be
   * perfectly well-formed over a vocabulary nothing speaks. Measured on `main` after #758, by
   * enumerating every coordinate `paintOf` can be called at and asking which colour bindings any of
   * them reaches:
   *
   *     field-label     0/3 reachable   (text, indicator, disabled.text)
   *     focus-ring      0/2 reachable   (stroke, stroke.inverse)
   *     field-message   4/8 reachable   (default.text, error.text, warning.text, success.text)
   *     text-field      6/12 reachable  (text, placeholder, border.focus, border.readonly, …)
   *
   * `field-label` is the sharp case: `paintKeys: ['{slot}']` passes every check #758 shipped, and the
   * def paints NOTHING, because its bindings are spelled `text` and `indicator` while the projector
   * asks for `label`. #758's own report claimed five of seven defs could now be painted; three could.
   *
   * WHY THIS IS INDEPENDENT AND NOT A RE-LISTING. The ORACLE is `PAINT_SLOTS` / `def.states` — the
   * projector's own dispatch vocabulary, which `anatomy-figma.ts` reads to decide what to ask for. The
   * SUBJECT is the def's binding keys. Two different artifacts, neither derived from the other, which
   * is what `docs/34` requires. Deriving the expectation by asking `paintOf` what it resolves would
   * reproduce any bug in `paintOf` on both sides and report it as a pass — the same trap #708's
   * overlay gate had to route around.
   *
   * DO NOT WIDEN `PAINT_SLOTS` TO GO GREEN. Once this rule reads that list, the cheapest way to make a
   * failure vanish is to add the offending word to it — which converts a real defect into a silent
   * pass in one line, and moves nothing. `PAINT_SLOTS` may only grow when the projector ACTUALLY
   * DISPATCHES the new slot, which is checkable in `anatomy-figma.ts`: a `paintOf('<slot>')` call must
   * exist in the paint branch for the part kind that owns it. Today there are exactly five such calls
   * (`overlay`, `fill`, `border`, `icon`, and the text branch's `p.paintSlot ?? 'label'`), covering six
   * slots — the text branch reaches both `label` and `indicator` because a text part may name its slot
   * (#796), which is why this is five calls and not one per slot. A slot in the list with no call
   * behind it is a vocabulary entry no part can ever ask for, so it can never fail this rule and never
   * paint anything either.
   */
  /** Every PLACEHOLDER segment of `template`, paired with the value `key` fills it with. */
  const segmentsOf = (template: string, key: string): { ph: string; value: string }[] => {
    const parts = key.split('.');
    return template
      .split('.')
      .flatMap((seg, i) => (seg.startsWith('{') && seg.endsWith('}') ? [{ ph: seg.slice(1, -1), value: parts[i] }] : []));
  };
  /**
   * WHAT THE PROJECTOR CAN SUPPLY for one placeholder — the ORACLE side of the rule, and the reason
   * this generalizes instead of being three checks. Every placeholder is filled from exactly one
   * source, and each source is enumerable:
   *
   *   `{slot}`   — the ARGUMENT `paintOf` is called with. `PAINT_SLOTS` is that list.
   *   `{state}`  — the coordinate's state, which can only be one this def DECLARES.
   *   `{<axis>}` — a variant value, which can only be one that axis declares.
   *
   * So the question is one question asked three times, not three rules: is the value filling this
   * segment a value anything ever supplies? A `no` means the key is authored, resolvable, and reached
   * at no coordinate in the grid. Returning `undefined` for an unknown placeholder is deliberate —
   * the check above already rejects a placeholder that names no axis, so there is nothing to say here.
   */
  const supplied = (ph: string): readonly string[] | undefined =>
    ph === 'slot' ? PAINT_SLOTS : ph === 'state' ? statesOf(def) : variantsOf(def)[ph];
  /*
   * SCOPED TO COLOUR BINDINGS, and the scope is load-bearing rather than a convenience. `tokens` is one
   * flat map holding two kinds of binding with two different resolvers: paint keys go through `paintOf`
   * (this grammar), while GEOMETRY and TYPE keys — `size.medium.gap`, `size.large.height`, `offset.field`
   * — are named by `anatomy` and go through `varOf`, which throws on a miss and needs no grammar at all.
   * Unscoped, this rule reported 30 false positives on `main`: every one of Button's `size.*.padding-x`
   * keys "fills {slot} with 'padding-x'", which is true and meaningless, because nothing ever asks
   * `paintOf` for a padding. Read the REF, not the key shape — a colour ref is the thing paint resolves.
   */
  const isColourBinding = (key: string): boolean => {
    const ref = def.tokens?.[key];
    return typeof ref === 'string' && (ref.startsWith('color.') || ref.startsWith('{color.'));
  };
  /*
   * ONE KIND OF COLOUR BINDING THAT THIS GRAMMAR DOES NOT GOVERN, read from the def rather than named
   * in a list here — a list would be a second place for the answer to live.
   *
   *   A NESTED COMPONENT'S OWN TOKEN — Button and icon-button both bind `focus-ring`, and it is not a
   *   slot on them at all: the ring is a separate def reached via `nests`, and this binding exists so
   *   the host's contract can be gated per brand. Detected by asking whether the key names a part this
   *   def NESTS. That is `anatomy.parts[*].nests`, so a def that stops nesting the ring stops being
   *   exempt in the same edit.
   *
   * `disabled.*` IS NOT EXEMPT, and the first version of this rule wrongly made it so — which is worth
   * recording, because the wrong exemption was the plausible one and it hid a live defect. Those keys
   * are resolved by `paintOf`'s CROSS-CUTTING BRANCH (`anatomy-figma.ts`), which short-circuits before
   * the template loop and looks up `disabled.<slot>` directly. From that it followed — I thought — that
   * the templates do not govern them. False, and in the half that matters: the branch is exempt from the
   * KEY SPELLING, not from the SLOT VOCABULARY. It concatenates `disabled.` with the slot it was ASKED
   * for, so it can only ever find `disabled.<one of PAINT_SLOTS>` and a `disabled.*` key ending in
   * anything else is exactly as unreachable as a template-keyed one. Measured: Button's
   * `disabled.on-fill` and text-field's `disabled.text` are bound and reached at no coordinate, so a
   * disabled FILLED button paints `disabled.text` on `disabled.fill` — 2.14:1 on wendys, 2.55:1 on
   * harbor — while `disabled.on-fill`, the token that exists for that exact pairing and is gated at
   * 3.04-3.08:1, is never asked for. So the exemption is only for the `disabled` LEAD segment, which is
   * a literal the branch supplies itself and no axis declares.
   */
  const nestedIds = new Set(
    Object.values(def.anatomy?.parts ?? {}).flatMap((p) => (p.nests ? [p.nests] : [])),
  );
  const governed = (key: string): boolean => {
    if (nestedIds.has(key)) return false;
    // The `disabled` LEAD only — see the note above. The branch supplies that segment itself, so a
    // `disabled.*` key is not described by any template and must not be read through one: text-field's
    // `{slot}.{state}` matches `disabled.fill` by shape and would report `{slot}='disabled'` and
    // `{state}='fill'`, both true and both meaningless. Its slot segment is checked by the dedicated
    // pass below, against the same oracle — exempt from the template, not from the vocabulary.
    if (key.split('.')[0] === 'disabled' && (def.states ?? []).includes('disabled')) return false;
    // A def that will nest the ring but has no `anatomy` yet cannot be detected by `nests`, so the
    // exemption is NAMED — the same mechanism (and the same stale-exemption discipline) `lint-paint.ts`
    // uses for its provenance exceptions. `text-field` is the only entry: its `focus-ring` binding is
    // Button's exactly, and it becomes detectable — and this line removable — the moment the anatomy
    // block lands (Arc 2 step 5). An entry here must name a key that EXISTS and is otherwise ungoverned,
    // which the two directions below assert, so a rename does not leave a lie behind.
    if (NESTED_WITHOUT_ANATOMY[def.id]?.includes(key) && !def.anatomy) return false;
    return true;
  };
  for (const template of keys) {
    if (typeof template !== 'string') continue;
    for (const key of bound) {
      if (!matcher(template).test(key) || !isColourBinding(key) || !governed(key)) continue;
      for (const { ph, value } of segmentsOf(template, key)) {
        const can = supplied(ph);
        if (!can || value === undefined || can.includes(value)) continue;
        e.push(
          `paintKeys: '${key}' fills '${template}'\`s {${ph}} with '${value}', which nothing ever supplies ` +
            `— ${ph === 'slot' ? `the projector dispatches only [${can.join(', ')}]` : `this def declares ${ph === 'state' ? 'states' : `variants.${ph}`} [${can.join(', ')}]`}. ` +
            `The binding is authored, resolvable and reached at NO coordinate: it paints nothing, and the ` +
            `slot silently falls through to whatever the next template answers. Rename it to a value that ` +
            `is supplied.${ph === 'slot' ? ` Do NOT add '${value}' to PAINT_SLOTS to clear this — that only ` +
            `widens the vocabulary past what anatomy-figma.ts actually dispatches; a slot belongs there ` +
            `only once a paintOf('${value}') call exists in the branch for the part kind that owns it.` : ''}`,
        );
      }
    }
  }

  /*
   * THE CROSS-CUTTING BRANCH'S OWN KEYS, checked against the same oracle for the reason above: the
   * branch supplies the `disabled.` lead itself, so its keys match no template and the loop above never
   * sees them. This is the one place where the SUBJECT is a key the templates do not describe, and
   * skipping it is what let a 2.14:1 disabled pairing ship. Derived from `PAINT_SLOTS` and from the def's
   * own `states`, identically to the rule above — one oracle, two subjects.
   *
   * `DISABLED_GROUNDS` is the branch's own qualifier vocabulary, and it exists for the same reason
   * `PAINT_SLOTS` does: the branch may ask for `disabled.<slot>.<ground>` as well as `disabled.<slot>`,
   * so a key carrying a qualifier the branch never appends is exactly as unreachable as a mis-spelled
   * slot. The SLOT segment is still checked against `PAINT_SLOTS` either way — which is the property
   * that keeps a qualifier from becoming a hiding place for an unreachable slot name.
   */
  const DISABLED_GROUNDS = ['on-fill'];
  if ((def.states ?? []).includes('disabled'))
    for (const key of bound) {
      if (!key.startsWith('disabled.') || !isColourBinding(key)) continue;
      const rest = key.slice('disabled.'.length).split('.');
      const ground = rest.length > 1 ? rest[rest.length - 1] : undefined;
      const slot = ground ? rest.slice(0, -1).join('.') : rest.join('.');
      const slotOk = (PAINT_SLOTS as readonly string[]).includes(slot);
      const groundOk = ground === undefined || DISABLED_GROUNDS.includes(ground);
      if (slotOk && groundOk) continue;
      e.push(
        `paintKeys: '${key}' is a cross-cutting disabled binding, and ` +
          (slotOk
            ? `its ground segment is '${ground}', which that branch never appends — it asks only for [${DISABLED_GROUNDS.join(', ')}].`
            : `its slot segment is '${slot}', which the projector never asks for — it dispatches only [${PAINT_SLOTS.join(', ')}].`) +
          ` That branch builds its key from the slot it was ASKED for, so this one is reached at no coordinate ` +
          `and the disabled treatment falls through to whichever 'disabled.<slot>' key does exist — which is how ` +
          `a disabled filled control painted page ink on a fill at 2.14:1. Rename it to a dispatched slot.`,
      );
    }

  /*
   * THE EXEMPTION, IN BOTH DIRECTIONS. An escape hatch nobody re-reads is how a fixed defect comes back
   * wearing a permission slip, so the map above has to fail when it stops being true — the discipline
   * `lint-paint.ts`'s provenance exceptions already run on.
   *
   *   NOT-EXISTS — the entry names a key this def does not bind. Left unchecked, renaming or deleting
   *   `focus-ring` leaves an exemption covering nothing, which reads as a live exception forever.
   *
   *   NOW-GOVERNED — the entry names a key the rule would not have flagged anyway (a slot the projector
   *   does ask for, or a non-colour binding). Then the exemption is doing no work and its removal is
   *   free, so keeping it only misinforms the next reader about what the rule catches.
   *
   * The `!def.anatomy` guard needs no third direction: it is the retirement condition itself, and it
   * flips automatically when the anatomy block lands.
   */
  for (const key of NESTED_WITHOUT_ANATOMY[def.id] ?? []) {
    if (!(key in (def.tokens ?? {}))) {
      e.push(
        `paintKeys: NESTED_WITHOUT_ANATOMY exempts '${key}', which this def does not bind — a stale exemption ` +
          `covering nothing. Remove the entry.`,
      );
      continue;
    }
    const slotIsAsked = keys.some((t) =>
      typeof t === 'string'
      && segmentsOf(t, key).some(({ ph, value }) => {
        const can = supplied(ph);
        return !!can && value !== undefined && can.includes(value);
      }),
    );
    if (!isColourBinding(key) || slotIsAsked)
      e.push(
        `paintKeys: NESTED_WITHOUT_ANATOMY exempts '${key}', but the rule would not flag it anyway — the ` +
          `exemption does no work. Remove the entry.`,
      );
  }

  // ORDER IS THE DECLARATION, so an order that strands an AUTHORED BINDING is an error.
  //
  // The lookup returns on the first template whose filled key is bound, so listing the general
  // `{slot}` before the specific `{slot}.{color}` means that for slot `border` the bare `border` key
  // always answers and `border.inverse` — authored, resolvable, and passing the reachability check
  // above, because the template that names it does match something — is never reached. Every focus
  // ring paints the default colour and the inverse ring is invisible on the surface it exists for.
  // That is #656's defect, reintroduced by a reordering no other check can see.
  //
  // So the rule runs per BINDING rather than per template: a key that a qualified template matches
  // must be what the chain actually returns at its own coordinate. Note this is not the same check as
  // the one above and neither implies the other — that one asks whether a template reaches any key,
  // this asks whether a key is reached by the chain.
  //
  // WHY IT IS A SCHEMA RULE AND NOT A PROJECTION TEST. It was found by mutation, and the reason first
  // given was that the paint census could not see the def at all: `focus-ring` declared no `size` axis,
  // so `figmaAnatomyPlan` refused it. **#795 removed that refusal** — the ring plans, projects and is
  // censused now — so the original argument has expired and the rule stays for the half that does not
  // depend on any def's shape: shadowing is decidable from the def ALONE, so it belongs where all seven
  // defs are checked rather than where the projectable ones are. Which is the more durable form of the
  // same instinct, and worth noting as a shape: a check justified by a *current* gap in another gate's
  // reach inherits that gap's lifetime, and this one outlived its stated reason by being right for a
  // second one nobody had written down.
  const withAxis = keys.filter(
    (t): t is string => typeof t === 'string' && paintKeyPlaceholders(t).some((p) => p !== 'slot'),
  );
  for (const template of withAxis) {
    const phs = paintKeyPlaceholders(template);
    const segs = template.split('.');
    for (const key of bound) {
      if (!matcher(template).test(key)) continue;
      // Recover the coordinate this binding sits at, by reading the key back through its template.
      const parts = key.split('.');
      const coord: Record<string, string | undefined> = {};
      let slot = 'fill'; // a template with no `{slot}` answers a primary slot; `fill` stands for it
      segs.forEach((seg, i) => {
        const ph = seg.startsWith('{') ? seg.slice(1, -1) : undefined;
        if (ph === 'slot') slot = parts[i];
        else if (ph) coord[ph] = parts[i];
      });
      const winner = keys.find(
        (t): t is string => typeof t === 'string' && !!fillPaintKey(t, slot, coord) && !!def.tokens?.[fillPaintKey(t, slot, coord)!],
      );
      const won = winner ? fillPaintKey(winner, slot, coord) : undefined;
      if (won && won !== key)
        e.push(
          `paintKeys: '${key}' is bound but never reached — at its own coordinate (${[`slot=${slot}`, ...phs.filter((p) => p !== 'slot').map((p) => `${p}=${coord[p]}`)].join(', ')}) ` +
            `the earlier template '${winner}' answers with '${won}' first. Order is the fallback chain: put the more specific template before the more general one.`,
        );
    }
  }
  return e;
};

/**
 * Structural checks for `anatomy`. Kept separate from `validateComponentDef`'s body because it
 * is the only block with its own graph invariants (reachability, single target, no double
 * parent) — the rest of the validator is field-by-field.
 *
 * Every binding key is resolved through `def.tokens` rather than against the token tree
 * directly: anatomy names a SLOT the component already binds, so a typo here fails even before
 * a tree is supplied, and the binding's own resolution is checked once, in one place.
 */
const anatomyErrors = (def: ComponentDef): string[] => {
  const e: string[] = [];
  const a = def.anatomy!;
  const parts = a.parts ?? {};
  const names = Object.keys(parts);
  const sizes = def.variants?.size ?? [];

  if (!names.length) return ['anatomy.parts is empty'];
  if (!parts[a.root]) e.push(`anatomy.root '${a.root}' is not a declared part`);

  // The ceilings list is REQUIRED and non-empty — a schema that claims Figma carries every
  // part is making a false claim, and this is the assertion that stops it being made silently.
  if (!Array.isArray(a.codeOnly) || a.codeOnly.length === 0)
    e.push('anatomy.codeOnly must be a non-empty list — some structure provably does not survive Figma, and the schema must say which (docs/14 §3)');

  // Exactly one interaction target. Zero means nothing owns the hit area; two means the
  // materializer has no single node to attach the a11y role and focus ring to.
  const targets = names.filter((n) => parts[n].role === 'target');
  if (targets.length !== 1) e.push(`anatomy: exactly one part must have role 'target' (found ${targets.length}${targets.length ? `: ${targets.join(', ')}` : ''})`);

  // NO TWO BOXES MAY CLAIM THE SAME SLOT (#933). `paintOf` dispatches on the slot alone and is blind to
  // which part asked, so two boxes naming `fill` do not divide the fill between them — they both take
  // the SAME variable, and one of them is wrong. That is not the shape of a def with two painted
  // surfaces; it is the shape of a def that has not decided which surface is the fill. Measured on a
  // two-box switch anatomy before this rule existed: row, track and thumb all bound
  // `color/interactive/primary/fill/selected`. A def that genuinely needs a second painted box needs a
  // second SLOT for it, which is a `PAINT_SLOTS` decision and deliberately a harder one to make.
  const claimants = new Map<string, string[]>();
  for (const n of names)
    for (const slot of parts[n].kind === 'box' ? parts[n].paintSlots ?? [] : [])
      claimants.set(slot, [...(claimants.get(slot) ?? []), n]);
  for (const [slot, who] of claimants)
    if (who.length > 1)
      e.push(`anatomy: parts [${who.join(', ')}] all declare paintSlots '${slot}' — the projector resolves a slot once, so every one of them would bind the same variable rather than each getting its own`);

  // A BOX MAY CLAIM `indicator` ONLY IF IT DRAWS THE INDICATOR ITSELF (#910). This is #864's premise kept
  // as a check rather than as prose: a box taking an ink slot paints a rectangle BEHIND the node that
  // draws the mark, which is measured — a fill on `createNodeFromSvg`'s wrapper frame put a square behind
  // every glyph in the set. `indicator` left `BOX_PAINT_SLOTS`' exclusion list because a radio's dot is a
  // filled circle with no child at all, so there is nothing behind it to obscure. A box that claims the
  // slot AND has a glyph or text child is exactly the configuration the exclusion existed for, so the
  // widening is scoped to the case that motivated it rather than taken on trust.
  for (const n of names) {
    const p = parts[n];
    if (p.kind !== 'box' || !(p.paintSlots ?? []).includes('indicator')) continue;
    const drawn = (p.children ?? []).filter((c) => parts[c] && (parts[c].kind === 'vector' || parts[c].kind === 'text'));
    if (drawn.length)
      e.push(`anatomy part '${n}' declares paintSlots 'indicator' and has ${parts[drawn[0]].kind} child${drawn.length > 1 ? 'ren' : ''} [${drawn.join(', ')}] — a box may take an ink slot only when it DRAWS the mark itself, or the fill lands behind the node that does (#864). Move the ink to the drawing part's own slot.`);
  }

  // Every binding key anatomy names must be a slot the component actually binds, at every size.
  const bindingKeys = (p: PartDef): string[] =>
    [p.gap, p.height, p.radius, p.size, p.width, p.type, p.inset, p.padding?.block, p.padding?.inlineLabel, p.padding?.inlineVisual]
      .filter((k): k is string => typeof k === 'string');
  for (const n of names)
    for (const key of bindingKeys(parts[n]))
      for (const expanded of expandKey(key, sizes))
        if (!(expanded in (def.tokens ?? {})))
          e.push(`anatomy part '${n}': binding key '${expanded}'${expanded === key ? '' : ` (from '${key}')`} is not a slot in tokens`);
  if (sizes.length === 0 && names.some((n) => bindingKeys(parts[n]).some((k) => k.includes('{size}'))))
    e.push("anatomy uses the {size} placeholder but variants.size is empty — nothing to expand over");

  // Tree shape: children exist, nothing is claimed twice, everything is reachable from root.
  const claimed = new Map<string, string>();
  for (const n of names)
    for (const c of parts[n].children ?? []) {
      if (!parts[c]) { e.push(`anatomy part '${n}': child '${c}' is not a declared part`); continue; }
      if (claimed.has(c)) e.push(`anatomy part '${c}' is claimed as a child twice ('${claimed.get(c)}' and '${n}')`);
      else claimed.set(c, n);
    }
  // Overlays sit outside the child tree by construction (they take another part's position
  // rather than their own cell), so reachability is measured against the parts that aren't overlays.
  const seen = new Set<string>();
  const walk = (n: string) => {
    if (seen.has(n) || !parts[n]) return;
    seen.add(n);
    for (const c of parts[n].children ?? []) walk(c);
  };
  walk(a.root);
  for (const n of names) {
    const p = parts[n];
    if (p.kind === 'overlay') {
      // `replaces` is a string OR an ordered list since #848. Normalized once here and read as a list
      // from this point down, so every rule below states itself over candidates rather than over the
      // single name the field used to hold.
      const replacesList = replacesCandidates(p);
      if (!replacesList.length) e.push(`anatomy part '${n}': an overlay must declare what it 'replaces'`);
      for (const r of replacesList) if (!parts[r]) e.push(`anatomy part '${n}': replaces '${r}', which is not a declared part`);
      // A DUPLICATE in the list is refused rather than tolerated. Walking the list stops at the first
      // present candidate, so a repeat can never be reached and is therefore always a mistake — most
      // likely a def meaning to name a second, different cell.
      const dupes = replacesList.filter((r, i) => replacesList.indexOf(r) !== i);
      if (dupes.length) e.push(`anatomy part '${n}': replaces lists '${dupes[0]}' more than once — resolution stops at the first present candidate, so a repeat is unreachable`);
      // At most ONE non-optional candidate, and it must be LAST. A required part is present at every
      // coordinate, so resolution can never walk past it: any candidate after it is dead, and
      // `overlaysWhenAbsent` is dead too. That would make the label-only fallback unreachable while
      // reading as though it were configured — the #848 shape of "validates clean, cannot fire".
      const requiredAt = replacesList.findIndex((r) => parts[r] && !parts[r].optional);
      if (requiredAt >= 0 && requiredAt < replacesList.length - 1)
        e.push(`anatomy part '${n}': replaces '${replacesList[requiredAt]}' is REQUIRED but is not last — it is present at every coordinate, so candidates after it (${replacesList.slice(requiredAt + 1).join(', ')}) can never be reached`);
      // The trigger is as required as the target. Without it the part is declarative decoration: it
      // validates clean, reads complete, and no projection can place it — which is exactly how the
      // spinner sat in this def while `state=pending` emitted a plan byte-identical to `rest`.
      if (!p.when) e.push(`anatomy part '${n}': an overlay must declare the state it appears in ('when') — without it nothing can project it`);
      else if (!statesOf(def).includes(p.when)) e.push(`anatomy part '${n}': when '${p.when}' is not one of states [${statesOf(def).join(', ')}]`);
      // The fallback target must exist and must NOT be optional. An optional one reintroduces the
      // defect one level down: if the part the overlay falls back to overlaying can itself be absent,
      // there is again a coordinate where the overlay has nowhere to go and takes a cell. `label` is
      // `optional: false`, which is what makes it a valid floor.
      if (p.overlaysWhenAbsent) {
        if (!parts[p.overlaysWhenAbsent]) e.push(`anatomy part '${n}': overlaysWhenAbsent '${p.overlaysWhenAbsent}', which is not a declared part`);
        else if (parts[p.overlaysWhenAbsent].optional) e.push(`anatomy part '${n}': overlaysWhenAbsent '${p.overlaysWhenAbsent}' is optional — the fallback must be a part that is always present, or there is still a coordinate where the overlay takes a cell of its own`);
        if (replacesList.includes(p.overlaysWhenAbsent)) e.push(`anatomy part '${n}': overlaysWhenAbsent duplicates a 'replaces' candidate ('${p.overlaysWhenAbsent}') — the fallback exists for the case EVERY candidate is absent, so naming one of them says nothing`);
      } else if (replacesList.length && replacesList.every((r) => parts[r]?.optional)) {
        // Every candidate OPTIONAL means a coordinate exists where the overlay lands nowhere, so the
        // fallback is REQUIRED, not a nicety. Gating it here rather than trusting a def to think of it:
        // this is the #612 defect's root, and it was invisible for exactly as long as nothing asked.
        // `every` rather than the old single-name test — a list with one required entry has no such
        // coordinate and correctly needs no fallback.
        e.push(`anatomy part '${n}': every 'replaces' candidate (${replacesList.join(', ')}) is OPTIONAL — declare 'overlaysWhenAbsent' for the coordinate where they are all missing, or the overlay takes a cell of its own there and the part GROWS on its '${p.when}' state`);
      }
    } else if (p.kind === 'absolute') {
      // An `absolute` IS a child — it is a sibling of the row's cells that simply takes no space in
      // the row, so unlike an overlay it appears in `children` and the reachability walk above covers
      // it. Nothing is exempted here; the checks below are the ones the kind adds.
      if (!seen.has(n)) e.push(`anatomy part '${n}' is unreachable from root '${a.root}' — an orphan part would be silently dropped by a materializer`);
      // Same requirement, same reason as an overlay's: a part that never says WHEN it appears is
      // decorative declaration. The ring appears on exactly one state and a projection cannot guess
      // which — #536 item 2's lesson applied before the kind has a chance to repeat it.
      if (!p.when) e.push(`anatomy part '${n}': an absolute part must declare the state it appears in ('when') — without it nothing can project it`);
      else if (!statesOf(def).includes(p.when)) e.push(`anatomy part '${n}': when '${p.when}' is not one of states [${statesOf(def).join(', ')}]`);
      // `nests` is REQUIRED rather than optional, and this is the decision from `PartDef.nests` made
      // enforceable: an `absolute` with nothing nominated would have to be authored from scratch, which
      // is the N-way duplication the shared ring exists to avoid. Half-supporting both shapes would
      // mean neither is the answer.
      if (!p.nests) e.push(`anatomy part '${n}' is kind 'absolute' but nominates no component to nest ('nests') — an absolute part materializes as an instance of a shared component, never authored in place`);
      // The offset is the whole geometric content of this kind. Without it the ring lands exactly on
      // its parent's bounds, which is the one position WCAG 1.4.11 says it must not take: flush against
      // the border, it blends into the button's own edge instead of separating from it.
      if (!p.inset) e.push(`anatomy part '${n}' is kind 'absolute' but binds no 'inset' — a ring flush against its target's bounds blends into the element's own border (WCAG 1.4.11)`);
      // AND THE STROKE THAT EATS IT (#801). The rule above required an inset and stopped there, and a
      // part satisfying it still projected flush: the nested component draws its stroke INSIDE its own
      // bounds, so a 2px stroke at offset 2 consumes the entire gap the offset was asked for. The check
      // above cannot see that — it asks whether a number was named, and the number was.
      //
      // Keyed off `nests` naming the ring rather than off a stroke field, because `PartDef` has no
      // stroke field yet: #740 is what adds one, and until it lands the only part kind that carries a
      // stroke of its own is a focus ring. So this is deliberately the narrow rule that fires today,
      // written to be REPLACED rather than extended — when a part can declare its own stroke, the
      // condition becomes "declares a stroke and no strokeInset" and this name check goes away.
      // Narrow beats absent: the alternative is that the one part kind where this is already wrong
      // validates clean, which is exactly how #801 shipped.
      if (p.inset && p.nests === 'focus-ring' && !p.strokeInset)
        e.push(`anatomy part '${n}' is kind 'absolute' binding inset '${p.inset}' and nests 'focus-ring', but binds no 'strokeInset' — the ring draws its stroke INSIDE its own bounds, so a materializer positioning it at -inset leaves a gap of (inset - strokeWidth) and at the shipped 2px/2px that is ZERO: flush against the border it must be distinguishable from (WCAG 1.4.11, #801). Bind the ring's width key here`);
      // A part outside the flow cannot be the interaction target: `role: 'target'` is what owns the hit
      // area, radius, fill and border, and a node that takes no space in the row owns no hit area. The
      // single-target check above would not catch this — it counts targets, and one absolute target is
      // still exactly one.
      if (p.role === 'target') e.push(`anatomy part '${n}' is kind 'absolute' and claims role 'target' — a part outside the layout flow owns no hit area`);
      // An absolute part is sized BY its parent (parent bounds grown by `inset`), so a square-artboard
      // `size` has nothing to mean here. Rejected rather than ignored: the projection would drop it
      // silently, and a def author who wrote it would reasonably believe the ring were 16px. This is
      // the same class as the spinner's missing `when` — a field that validates clean and projects to
      // nothing — caught on the day the kind ships rather than months later.
      if (p.size) e.push(`anatomy part '${n}' is kind 'absolute' but binds 'size' — an absolute part is sized by its parent's bounds grown by 'inset', so a square-artboard size would be silently dropped`);
      // Children too: the shared component owns everything inside itself, so a child here would be
      // appended into an INSTANCE — which Figma forbids outright, at paste time, in someone's file.
      if ((p.children ?? []).length) e.push(`anatomy part '${n}' is kind 'absolute' but declares children — it materializes as an instance of '${p.nests ?? '(unnamed)'}', whose contents belong to that component; Figma does not accept appends into an instance`);
    } else if (!seen.has(n)) {
      e.push(`anatomy part '${n}' is unreachable from root '${a.root}' — an orphan part would be silently dropped by a materializer`);
    }
  }

  // Only a box lays out children; a text/slot/overlay/absolute carrying layout means the tree is
  // mis-shaped and the materializer would emit an auto-layout frame where a leaf belongs.
  for (const n of names) {
    const p = parts[n];
    // ---- VARIANT-GATED PRESENCE (#910) ----
    // Six rules, and each one is a way the field can be authored so that it validates and then makes the
    // part vanish from every coordinate — the direction that ships, because a node that is never there
    // throws nothing, resolves nothing, and looks in the def exactly like a node that is.
    if (p.presentWhen !== undefined) {
      const gates = Object.entries(p.presentWhen);
      if (!gates.length)
        e.push(`anatomy part '${n}' declares an EMPTY 'presentWhen' — a gate on no axis is not "always present", it is a claim with nothing in it. Drop the field`);
      // The ROOT cannot be conditional: `figmaAnatomyPlan` builds from the root down, so a coordinate at
      // which the root is absent has no tree to project at all.
      if (n === a.root)
        e.push(`anatomy part '${n}' is the anatomy ROOT and declares 'presentWhen' — the root is what a coordinate projects, so gating it away leaves that coordinate with no tree`);
      // TWO GATING MECHANISMS ON ONE PART is ambiguous rather than additive: `present()` reads `when`
      // through an early return, so whichever it consults first silently decides and the other field
      // reads as though it were still doing work.
      if (p.kind === 'overlay' || p.kind === 'absolute')
        e.push(`anatomy part '${n}' is kind '${p.kind}' and declares 'presentWhen' as well as its own 'when' — that kind is already gated by STATE, and two presence rules on one part means one of them is not consulted`);
      for (const [axis, values] of gates) {
        const declared = variantsOf(def)[axis];
        // `size` is deliberately not admissible. A part present at only some rungs is the rung-ladder
        // claim (`lint-rung-names.ts`), not a presence one, and nothing in the corpus needs it — so
        // admitting it here would be adding an unexercised axis to a mechanism whose failure mode is
        // silent absence. A STATE is refused by the same check, since `states` is not in `variants`.
        if (axis === 'size' || !declared)
          e.push(`anatomy part '${n}' gates presence on '${axis}', which is not one of this def's variant axes [${Object.keys(variantsOf(def)).join(', ') || 'none'}]${axis === 'size' ? " ('size' is deliberately excluded — a part present at only some rungs is a ladder claim, not a presence one)" : ''} — an axis the projector never supplies makes the part absent at EVERY coordinate`);
        else {
          if (!Array.isArray(values) || !values.length)
            e.push(`anatomy part '${n}' gates presence on '${axis}' with no values — an empty list is satisfied by nothing, so the part is absent everywhere`);
          for (const v of values ?? [])
            if (!declared.includes(v))
              e.push(`anatomy part '${n}' gates presence on ${axis}='${v}', which is not a declared value of that axis [${declared.join(', ')}] — the coordinate it names does not exist, so the part never appears`);
          // A gate naming EVERY value is a no-op wearing a condition's clothes. It reads as "this part is
          // conditional" to anyone maintaining the def while behaving as "always present".
          if (Array.isArray(values) && declared.every((v) => values.includes(v)))
            e.push(`anatomy part '${n}' gates presence on all ${declared.length} values of '${axis}' — that is the same as no gate at all, so either a value is missing from the list or the field should go`);
          // THE AXIS MUST BE ONE FIGMA CARRIES. `figmaAnatomySet` enumerates `variantAxes`, so a gate on
          // an axis outside that list is never supplied, `present()` reads `undefined`, and the part is
          // dropped from every member of the set — a component built with the node simply missing.
          if (def.figmaProperties && !(def.figmaProperties.variantAxes ?? []).includes(axis))
            e.push(`anatomy part '${n}' gates presence on '${axis}', which figmaProperties.variantAxes does not project [${(def.figmaProperties.variantAxes ?? []).join(', ') || 'none'}] — the set is enumerated over the projected axes only, so this part would be absent from every member`);
        }
      }
    }
    // ---- VARIANT-GATED POSITION (#990) ----
    // The field projects onto the PARENT's `primaryAxisAlignItems`, and every rule here is a way to author
    // it so that the projection is a NO-OP or positions something other than this part — both of which
    // render. A thumb in the wrong place, or in the same place at both values, is not a missing node: it
    // is a switch that looks built and does not read as on or off. Nothing downstream can see that.
    if (p.positionWhen !== undefined) {
      const gates = Object.entries(p.positionWhen);
      const parent = claimed.get(n);
      const pp = parent ? parts[parent] : undefined;
      if (!gates.length)
        e.push(`anatomy part '${n}' declares an EMPTY 'positionWhen' — a position keyed on no axis is not "wherever the parent says", it is a claim with nothing in it. Drop the field`);
      // ONE AXIS ONLY. `presentWhen` AND-composes because absence composes — two gates both have to be
      // satisfied for the part to exist. A POSITION does not compose: two axes each naming a place for the
      // same part is two answers to one question, and the projector would return whichever it read first.
      if (gates.length > 1)
        e.push(`anatomy part '${n}' declares 'positionWhen' on ${gates.length} axes [${gates.map(([k]) => k).join(', ')}] — unlike presence, a position does not AND-compose: each axis names a different place for the same part and only one of them can be projected. Key the travel on one axis`);
      // The ROOT has no parent, so there is no frame whose distribution could carry it.
      if (n === a.root)
        e.push(`anatomy part '${n}' is the anatomy ROOT and declares 'positionWhen' — a position is projected onto the PARENT's main-axis distribution, and the root has no parent`);
      else if (!parent)
        e.push(`anatomy part '${n}' declares 'positionWhen' but is not a child of any part — the position projects onto its parent's distribution, so with no parent there is nothing to write it to`);
      // Outside the flow there is no distribution to be distributed by: an overlay takes another part's
      // position and an absolute part is placed against its parent's bounds. Either would validate clean
      // and project nothing, which is this pass's whole defect class.
      if (p.kind === 'overlay' || p.kind === 'absolute')
        e.push(`anatomy part '${n}' is kind '${p.kind}' and declares 'positionWhen' — that kind sits OUTSIDE the layout flow (an overlay takes another part's cell, an absolute is placed against its parent's bounds), so main-axis distribution never reaches it`);
      // ---- THE TWO PRECONDITIONS, asserted rather than reasoned about ----
      // #964's topological-order assumption and #900's prescribed derivation were both confident and both
      // wrong, so these are checks, not prose. Each one is a configuration in which the field is a silent
      // no-op — the part renders, at one position, for every value of the axis.
      if (pp && !pp.layout)
        e.push(`anatomy part '${n}' declares 'positionWhen' but its parent '${parent}' carries no layout — the position is projected as that parent's 'primaryAxisAlignItems', which only exists on an auto-layout frame`);
      // PRECONDITION 1: the parent's main axis must be FIXED. A hugging parent is exactly as long as its
      // child, so MIN, CENTER and MAX all land in the same place — the field validates, projects a real
      // value, and the part does not move. `sizingMode` maps BOTH 'hug' and 'fill' to AUTO (#989), so
      // 'fill' is refused here too: it reads like a fixed-length track and projects like a hugging one.
      if (pp?.layout && pp.layout.sizing.x !== 'fixed')
        e.push(`anatomy part '${n}' declares 'positionWhen' but its parent '${parent}' has main-axis sizing '${pp.layout.sizing.x}' — a parent that is not FIXED along that axis is exactly as long as its children, so 'start', 'center' and 'end' are the same place and the travel is a silent no-op. Bind the parent's 'width' and declare sizing.x 'fixed' ('fill' projects to AUTO as well, #989)`);
      // PRECONDITION 2: sole flow child. `primaryAxisAlignItems` distributes the WHOLE row, so with a
      // sibling present the alignment moves the group and this part's position is a side effect of where
      // its neighbours happen to be — which is a position that changes when an unrelated part is added.
      if (pp) {
        const flow = (pp.children ?? []).filter((c) => parts[c] && parts[c].kind !== 'overlay' && parts[c].kind !== 'absolute');
        if (flow.length > 1)
          e.push(`anatomy part '${n}' declares 'positionWhen' but its parent '${parent}' has ${flow.length} flow children [${flow.join(', ')}] — main-axis distribution positions the whole group, so this part's place would be decided by where its siblings sit rather than by the value of the axis`);
      }
      for (const [axis, byValue] of gates) {
        const declared = variantsOf(def)[axis];
        // `size` is excluded for the same reason `presentWhen` excludes it: a part sitting in a different
        // place at a different rung is not a variant fact, and admitting the axis would add an
        // unexercised path to a mechanism whose failure mode is invisible. A state is refused by the same
        // check — `states` is not in `variants`.
        if (axis === 'size' || !declared) {
          e.push(`anatomy part '${n}' keys its position on '${axis}', which is not one of this def's variant axes [${Object.keys(variantsOf(def)).join(', ') || 'none'}]${axis === 'size' ? " ('size' is deliberately excluded — a part that sits elsewhere at another rung is a ladder claim, not a position one)" : ''} — an axis the projector never supplies leaves the part at its parent's declared justify at EVERY coordinate`);
          continue;
        }
        const entries = Object.entries(byValue ?? {});
        if (!entries.length) {
          e.push(`anatomy part '${n}' keys its position on '${axis}' with no values — a map from nothing positions nothing, so the part never moves`);
          continue;
        }
        for (const [v, pos] of entries) {
          if (!declared.includes(v))
            e.push(`anatomy part '${n}' positions itself at ${axis}='${v}', which is not a declared value of that axis [${declared.join(', ')}] — the coordinate it names does not exist, so that position is never projected`);
          if (!['start', 'center', 'end'].includes(pos))
            e.push(`anatomy part '${n}' positions itself '${pos}' at ${axis}='${v}', which is not one of start/center/end — the projector resolves the word through the same JUSTIFY map 'layout.justify' uses, and an unknown one projects as undefined`);
        }
        // EXHAUSTIVE over the axis. A value with no entry falls back to the parent's own `justify`, which
        // is a position decided somewhere else and not visible from this field — so a three-value axis
        // that names two positions has a third coordinate nobody chose.
        const missing = declared.filter((v) => !(v in (byValue ?? {})));
        if (missing.length)
          e.push(`anatomy part '${n}' keys its position on '${axis}' but names no position for [${missing.join(', ')}] — those coordinates fall back to parent '${parent ?? '(none)'}'s own justify, so their position is decided by a field that does not mention this part. Name every value of the axis`);
        // ALL THE SAME POSITION is `layout.justify` wearing a condition's clothes: it reads as "this part
        // travels" to whoever maintains the def, and projects as a part that does not.
        const places = new Set(entries.map(([, pos]) => pos));
        if (entries.length > 1 && places.size === 1)
          e.push(`anatomy part '${n}' positions itself '${[...places][0]}' at every value of '${axis}' — that is the same as no positioning at all, so either a value is wrong or this belongs in parent '${parent ?? '(none)'}'s 'layout.justify'`);
        // THE AXIS MUST BE ONE FIGMA CARRIES, the same rule `presentWhen` needs and for the same reason:
        // the set is enumerated over `variantAxes`, so a position keyed on an axis outside that list is
        // never supplied and every member of the set builds with the part at the parent's justify.
        if (def.figmaProperties && !(def.figmaProperties.variantAxes ?? []).includes(axis))
          e.push(`anatomy part '${n}' keys its position on '${axis}', which figmaProperties.variantAxes does not project [${(def.figmaProperties.variantAxes ?? []).join(', ') || 'none'}] — the set is enumerated over the projected axes only, so every member would build with this part at its parent's justify`);
      }
    }
    // ---- A NON-SQUARE BOX'S MAIN AXIS (#990) ----
    // `width` is the field a 2:1 track needs and `size` is the field a square needs; each is refused where
    // the other belongs. Both arms are about a binding that would be silently dropped.
    if (p.width !== undefined && p.kind !== 'box')
      e.push(`anatomy part '${n}' is kind '${p.kind}' but binds 'width' — only a 'box' has a main axis of its own to fix; a slot/vector is sized by its square artboard and a text by its content`);
    if (p.size && p.width)
      e.push(`anatomy part '${n}' binds both 'size' and 'width' — 'size' already drives both axes, so the two write the same property and one of them is silently discarded. A square declares 'size' alone; a box that is deliberately not square declares 'height' and 'width'`);
    // A bound main axis needs a FIXED main axis, exactly as a square's does — otherwise the children
    // decide the length and the binding is overridden. This is also the precondition `positionWhen` checks
    // from the child's side; stated here too, because a track may bind a width for its own sake.
    if (p.kind === 'box' && p.width && p.layout && p.layout.sizing.x !== 'fixed')
      e.push(`anatomy part '${n}' binds 'width' but its main-axis sizing is '${p.layout.sizing.x}' — a bound dimension needs 'fixed', or the content decides the length and the binding is overridden ('fill' projects to AUTO as well, #989)`);
    if (p.kind !== 'box' && (p.layout || p.padding || p.gap !== undefined))
      e.push(`anatomy part '${n}' is kind '${p.kind}' but carries layout/padding/gap — only a 'box' lays out`);
    // `inset` is the absolute kind's own geometry and means nothing anywhere else: on a flow part it
    // reads as though the part were offset from its cell, which no projection does. Checked as its own
    // rule rather than folded into the loop above because the layout rule is about what LAYS OUT
    // children and this is about what sits OUTSIDE the flow — two different claims.
    if (p.kind !== 'absolute' && p.inset !== undefined)
      e.push(`anatomy part '${n}' is kind '${p.kind}' but binds 'inset' — only an 'absolute' part sits outside the flow to be inset from it`);
    // `strokeInset` gets the same rule for the same reason: it is a compensation applied to `inset`, so
    // off an absolute part there is nothing for it to compensate and it would project to nothing.
    if (p.kind !== 'absolute' && p.strokeInset !== undefined)
      e.push(`anatomy part '${n}' is kind '${p.kind}' but binds 'strokeInset' — it compensates an absolute part's 'inset' for an inside-drawn stroke, and there is no inset here to compensate`);
    if (p.kind !== 'absolute' && p.nests !== undefined)
      e.push(`anatomy part '${n}' is kind '${p.kind}' but declares 'nests' — only an 'absolute' part materializes as an instance of another component`);
    // ---- the nesting relation (#681) ----
    // The three kinds that POINT AT another component must declare how they relate to it; the two
    // that point at nothing must not. `slot` is in the required set even though it carries no
    // `nests` — its target is nominated per file by the caller (#513), and the RELATIONSHIP to that
    // target is still the def's to state.
    //
    // `overlay` IS in the set, and that is read off the projection rather than assumed from the name:
    // `anatomy-figma.ts` types an overlay `INSTANCE_SWAP` and hands it the same `swapTarget` a slot
    // gets, because a spinner is a glyph standing in a glyph's cell. Deciding this from the kind's
    // PROSE ("occupies another part's position") would have left the one part in Button's anatomy that
    // is already swap-materialized out of the field that describes swapping.
    const pointsAtComponent = p.kind === 'slot' || p.kind === 'overlay' || p.kind === 'absolute';
    if (pointsAtComponent && !p.nesting)
      e.push(`anatomy part '${n}' is kind '${p.kind}' but declares no 'nesting' relation — a part pointing at another component must say whether it is a 'swap', a 'nest-fixed' (naming the variant) or a 'nest-exposed' (#681). Omitted, the nested component's FIRST variant is nested by default, which is #656's inherit-instead-of-choose error one layer out and equally invisible`);
    if (!pointsAtComponent && p.nesting)
      e.push(`anatomy part '${n}' is kind '${p.kind}' but declares a 'nesting' relation — only a 'slot'/'overlay' (whose content is swapped) or an 'absolute' (which materializes as an instance) points at another component`);
    // A `swap` REPLACES the whole component, so a variant coordinate on it has nothing to address: the
    // consumer picks a different component rather than a different coordinate of this one. Rejecting it
    // rather than ignoring it, for the same reason `absolute` rejects `size` — a def author who wrote
    // one would reasonably believe it took effect.
    if (p.nesting?.kind === 'nest-fixed' && !Object.keys(p.nesting.variant).length)
      e.push(`anatomy part '${n}' declares nesting 'nest-fixed' with an empty variant — the whole point of 'fixed' is that the def picks the coordinate rather than inheriting the nested set's first child (#656)`);
    // An `absolute` part cannot be a `swap`: it materializes as an INSTANCE of the component `nests`
    // names, and a swap is the caller nominating a target per file. The two are different
    // materialization paths, and `NESTED_INSTANCE` is the one this kind takes.
    if (p.kind === 'absolute' && p.nesting?.kind === 'swap')
      e.push(`anatomy part '${n}' is kind 'absolute' but declares nesting 'swap' — an absolute part materializes as an instance of the component 'nests' names, so its relation is 'nest-fixed' or 'nest-exposed'; 'swap' is for a slot whose target the caller nominates per file`);
    // And the mirror: a `slot`/`overlay`'s content is swapped by definition — that IS the INSTANCE_SWAP
    // property. One declaring a nest relation would be claiming its content is fixed while the property
    // that drives it exists to let a designer change it.
    if ((p.kind === 'slot' || p.kind === 'overlay') && p.nesting && p.nesting.kind !== 'swap')
      e.push(`anatomy part '${n}' is kind '${p.kind}' but declares nesting '${p.nesting.kind}' — its content IS swappable (that is what the INSTANCE_SWAP property does), so its relation is 'swap'`);
    // `size` and `height` both drive the height axis, so declaring both states it twice and the
    // projection keeps whichever branch runs last. Checked for every kind, not just `box`: an
    // `absolute` already rejects `size` outright above, and a `slot`/`overlay` has never had a
    // `height` — so this is the rule those two are special cases of.
    if (p.size && p.height)
      e.push(`anatomy part '${n}' binds both 'size' and 'height' — both drive the height axis, so one of them is silently discarded; a square part declares 'size' alone`);
    // A square box's height comes from a bound variable, so the cross axis must be FIXED for the same
    // reason a fixed-height row's is — `hug` on that axis lets the content decide and the binding is
    // then fighting the layout. Caught here rather than at paste: the symptom is a control that is
    // square at one size and not at another, depending on what its glyph happens to measure.
    if (p.kind === 'box' && p.size && p.layout && p.layout.sizing.y !== 'fixed')
      e.push(`anatomy part '${n}' is a square box (binds 'size') but its cross-axis sizing is '${p.layout.sizing.y}' — a bound dimension needs 'fixed', or the content decides the height and the binding is overridden`);
    if (p.kind === 'box' && p.size && p.layout && p.layout.sizing.x !== 'fixed')
      e.push(`anatomy part '${n}' is a square box (binds 'size') but its main-axis sizing is '${p.layout.sizing.x}' — a square binds BOTH axes, so 'hug' on the main axis would let the content widen it out of square`);
    if (p.kind === 'box' && !p.layout && (p.children ?? []).length > 0)
      e.push(`anatomy part '${n}' is a box with children but no layout — a materializer has no direction to apply`);
    if (p.kind === 'text' && !p.type) e.push(`anatomy part '${n}' is text but binds no type style`);
    // `paintSlot` is the TEXT kind's field (#796) — the only branch that reads it. On any other kind it
    // would validate clean and be silently ignored, which is this whole pass's defect class: a field an
    // author reasonably believes took effect.
    if (p.kind !== 'text' && p.paintSlot !== undefined)
      e.push(`anatomy part '${n}' is kind '${p.kind}' but declares 'paintSlot' — only a 'text' part chooses which ink slot it asks for; every other kind's paint follows from its kind`);
    // And the word must be one the projector DISPATCHES, checked against the same oracle `paintKeyErrors`
    // uses. Without this, `paintSlot: 'indicatr'` resolves no paint and the part projects unpainted —
    // the #784 shape arriving through the field that exists to prevent it.
    if (p.kind === 'text' && p.paintSlot !== undefined && !(PAINT_SLOTS as readonly string[]).includes(p.paintSlot))
      e.push(`anatomy part '${n}': paintSlot '${p.paintSlot}' is not a slot the projector dispatches — it asks only for [${PAINT_SLOTS.join(', ')}]. A part naming a word outside that list resolves no paint and projects unpainted. Do NOT add it to PAINT_SLOTS to clear this: a new slot needs a distinct ink ROLE and a real dispatch behind it (see PAINT_SLOTS)`);
    // ---- `paintSlots`, the BOX kind's field (#933) ----
    // The same wrong-kind rule as `paintSlot` above, for the same reason: only the box branch reads it,
    // so on any other kind it validates clean, is silently ignored, and leaves an author believing the
    // part paints. A `text` part choosing its ink says `paintSlot`; a `vector`'s ink follows its kind.
    if (p.kind !== 'box' && p.paintSlots !== undefined)
      e.push(`anatomy part '${n}' is kind '${p.kind}' but declares 'paintSlots' — only a 'box' part chooses which paint slots it takes; a 'text' part names its ink with 'paintSlot' and every other kind's paint follows from its kind`);
    if (p.kind === 'box' && p.paintSlots !== undefined) {
      if (p.paintSlots.length === 0)
        e.push(`anatomy part '${n}' declares an EMPTY 'paintSlots' — a box that paints nothing says so by omitting the field, and an empty list reads as a declaration that was meant to say something`);
      for (const slot of p.paintSlots)
        if (!(BOX_PAINT_SLOTS as readonly string[]).includes(slot))
          e.push(`anatomy part '${n}': paintSlots names '${slot}', which a box may not take — a box takes only [${BOX_PAINT_SLOTS.join(', ')}]. ${(PAINT_SLOTS as readonly string[]).includes(slot) ? `'${slot}' is an INK role: it belongs on the text or vector node that draws the mark, and on a box it would paint a rectangle behind it (see BOX_PAINT_SLOTS)` : `'${slot}' is not a slot the projector dispatches at all — it asks only for [${PAINT_SLOTS.join(', ')}]`}`);
      // A repeated word is either a typo or a belief that repetition means something. Neither should
      // project: the second occurrence can never win the precedence loop the first already answered.
      const dupes = p.paintSlots.filter((s, i) => p.paintSlots!.indexOf(s) !== i);
      if (dupes.length)
        e.push(`anatomy part '${n}': paintSlots repeats [${[...new Set(dupes)].join(', ')}] — order is precedence, so a repeat can only ever be unreachable`);
    }
    // ---- the vector kind (#864) ----
    // A vector's CONTENT is its geometry, so a vector naming no glyph is the empty artboard #864 was
    // filed for arriving one tier earlier: it would project a node with nothing in it and every gate
    // would stay green, because a node that exists is all any of them check.
    if (p.kind === 'vector' && !p.glyph)
      e.push(`anatomy part '${n}' is kind 'vector' but names no 'glyph' — a vector's content IS its geometry, so one with no glyph projects an empty outline. That is #864 exactly: four artboards that built without throwing and contained nothing`);
    // And the mirror, for the reason every other field-on-the-wrong-kind rule here exists: `glyph` is
    // read only by the vector branch, so on any other kind it validates clean, is silently ignored, and
    // leaves an author believing the part draws something.
    if (p.kind !== 'vector' && p.glyph !== undefined)
      e.push(`anatomy part '${n}' is kind '${p.kind}' but names a 'glyph' — only a 'vector' part carries geometry. A slot's content is whatever the consumer swaps in, which is a component and not a path`);
    // A `{...}`-TEMPLATED GLYPH must name an axis this def has, the same rule `paintKeyErrors` applies to
    // a paint template and for the same reason: `glyph: '{nmae}'` is unfillable, and the projector's throw
    // arrives per-coordinate at emission rather than here at authoring time. `size` is admissible on top
    // of the declared axes because the projector fills the glyph from `paintCoord`, which carries it.
    for (const ph of paintKeyPlaceholders(p.glyph ?? '')) {
      const known = ph === 'size' ? (def.variants?.size ?? []).length > 0 : Object.keys(variantsOf(def)).includes(ph);
      if (!known)
        e.push(`anatomy part '${n}' names glyph '${p.glyph}', whose '{${ph}}' is not an axis this def declares [${Object.keys(variantsOf(def)).join(', ') || 'none'}] — an unfillable placeholder reaches the icon vocabulary verbatim, so every member would carry the same outline or none at all`);
    }
    // A vector is a LEAF IN THE DEF, and that stayed true when the build strategy stopped making it a leaf
    // in the FILE. Figma builds a glyph by importing an SVG document, which returns a frame wrapping the
    // outline — so the built subtree does have a child, and it is the IMPORTER'S. A child declared here
    // would have to be appended beside it, into a frame whose contents no part of this schema describes,
    // and the reachability walk above would report that child as reachable while no materializer places it.
    if (p.kind === 'vector' && (p.children ?? []).length)
      e.push(`anatomy part '${n}' is kind 'vector' but declares children — a glyph's subtree is Figma's SVG importer's, so a child declared here has nowhere this schema can place it; nest the vector inside a 'box' instead and let the box lay them out`);
    // A glyph is sized by WHOEVER INSTANCES IT — a host binds `size.{size}.icon` onto its own slot — and
    // the artboard the outline is drawn on comes from the icon set. A `size` binding on the ROOT would
    // state that square a third time, on the outline itself, and the three could then disagree with
    // nothing noticing.
    //
    // NARROWED TO THE ROOT BY #910, and the discriminator is the rule's own reason rather than a carve-out
    // for checkbox. "Whoever instances it" is a real party for `icon.glyph`, which IS its def's root: a
    // host swaps that component into a slot and binds `size.{size}.icon` onto the slot. It is nobody for a
    // vector nested in its own def's anatomy — this def IS the host, the glyph node IS its slot, and there
    // is no instancing step to inherit a size from. Measured: `figma.createNodeFromSvg` returns a frame at
    // the icon set's own artboard (24×24) and nothing in the plan resizes it, so an unsized mark inside a
    // 16px control box overflows it by 8px on both axes, centered, at every rung. The projector already
    // binds both axes from `size` for a non-box part (`anatomy-figma.ts`'s else branch) and the executor
    // sets SCALE constraints on the outline for exactly this — so the count is TWO here, not three, and
    // the artboard read-back is unaffected because it runs before any binding is applied.
    //
    // `height` stays refused on every vector. A glyph's artboard is square (`lint-glyph-geometry.ts` arm
    // D asserts it), so binding one axis alone states a non-square one and distorts the outline.
    if (p.kind === 'vector' && p.height)
      e.push(`anatomy part '${n}' is kind 'vector' but binds 'height' — a glyph's artboard is square, so binding one axis alone states a shape the icon set does not draw; use 'size', which binds both`);
    if (p.kind === 'vector' && p.size && n === a.root)
      e.push(`anatomy part '${n}' is kind 'vector', binds 'size' and is the anatomy ROOT — a root glyph's rendered size comes from the host that instances it (a host binds \`size.{size}.icon\` onto its own slot), so binding it here states the same square a third time and the three can disagree with nothing noticing`);
  }

  return e;
};
