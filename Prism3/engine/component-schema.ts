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
  | 'absolute'; // takes NO position in the flow — an absolutely-positioned sibling of its siblings

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

export type PartDef = {
  kind: PartKind;
  /** `target` marks the single a11y/interaction target — the node that owns the hit area,
   *  radius, fill and border. Exactly one part per anatomy may claim it. */
  role?: 'target' | 'presentation';
  /** Ordered. Order IS the visual order — a materializer appends children in this sequence. */
  children?: string[];
  layout?: LayoutDef;
  padding?: PaddingDef;
  gap?: string;
  height?: string;
  radius?: string;
  /** For `slot` parts: the binding key giving the slot's square artboard size. */
  size?: string;
  /** For `text` parts: the binding key giving the composite type style. */
  type?: string;
  /** A slot that need not be present. `false`/absent means required. */
  optional?: boolean;
  /** For `overlay`: the part whose position it takes (width-preserving, per the brief). */
  replaces?: string;
  /** For `overlay`: what to do when the part named in `replaces` is ABSENT at this coordinate.
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
  /** For `absolute`: the binding key giving the amount this part is inset OUTWARD from its parent's
   *  bounds on every side. The focus ring's `focus.ring.offset` — a ring at offset 2 sits 2px outside
   *  the target on each side, so a materializer positions it at `-inset` and sizes it
   *  `parent + 2 × inset`.
   *
   *  A binding key like every other geometry field, and it resolves through `def.tokens` identically,
   *  but note what a materializer can do with it: Figma's `x`/`y` accept NO variable binding, so the
   *  offset is read as a NUMBER at paste time and frozen. That is a real ceiling and belongs in
   *  `codeOnly` wherever this kind is used — unlike padding or radius, a brand changing its ring
   *  offset does NOT re-flow an already-pasted component. */
  inset?: string;
  note?: string;
};

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
   *  appear in `anatomy.codeOnly` — validated, so the omission is an admission rather than a gap. */
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
  /** Runtime interaction states: rest / hover / pressed / focus / disabled / … . `[]`
   *  for non-interactive primitives. */
  states: string[];
  /** Intentional axes and their values, e.g. `{ size: ['sm','md','lg'], tone: [...] }`. */
  variants: Record<string, string[]>;

  // ---- the token BINDING (docs/14 §2) — the brand/mode-invariant skin ----
  /** slot → token ref. Slots are the component's paintable/measurable surfaces; a
   *  state- or variant-qualified slot uses a dotted suffix (`fill.hover`, `label.on-fill`).
   *  VALUES are token refs, validated to resolve. Reach for SEMANTIC roles, not primitives. */
  tokens: Record<string, TokenRef>;

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
  content?: {
    labelPattern?: string;
    errorPattern?: string;
    emptyPattern?: string;
    [k: string]: string | undefined;
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
  notes?: { contested?: string[]; unverified?: string[] };
};

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

/** How many variants the declared surface projects — the product of every axis's cardinality.
 *  Slot axes are boolean, so each doubles. Derived rather than restated, so adding an axis moves
 *  this number without anyone remembering to. */
export const figmaVariantCount = (def: ComponentDef): number => {
  const fp = def.figmaProperties;
  if (!fp) return 0;
  const variants = (fp.variantAxes ?? []).reduce((n, a) => n * ((def.variants?.[a]?.length) ?? 1), 1);
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
      if (!(def.states ?? []).includes(v)) e.push(`figmaProperties.stateAxis: '${v}' is not one of states [${(def.states ?? []).join(', ')}]`);
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

  return e;
};

/** Expand a binding key's `{size}` placeholder across a def's declared sizes. A key with no
 *  placeholder expands to itself, so callers need not special-case. */
export const expandKey = (key: string, sizes: string[]): string[] =>
  key.includes('{size}') ? sizes.map((s) => key.replace('{size}', s)) : [key];

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

  // Every binding key anatomy names must be a slot the component actually binds, at every size.
  const bindingKeys = (p: PartDef): string[] =>
    [p.gap, p.height, p.radius, p.size, p.type, p.inset, p.padding?.block, p.padding?.inlineLabel, p.padding?.inlineVisual]
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
      if (!p.replaces) e.push(`anatomy part '${n}': an overlay must declare what it 'replaces'`);
      else if (!parts[p.replaces]) e.push(`anatomy part '${n}': replaces '${p.replaces}', which is not a declared part`);
      // The trigger is as required as the target. Without it the part is declarative decoration: it
      // validates clean, reads complete, and no projection can place it — which is exactly how the
      // spinner sat in this def while `state=pending` emitted a plan byte-identical to `rest`.
      if (!p.when) e.push(`anatomy part '${n}': an overlay must declare the state it appears in ('when') — without it nothing can project it`);
      else if (!(def.states ?? []).includes(p.when)) e.push(`anatomy part '${n}': when '${p.when}' is not one of states [${(def.states ?? []).join(', ')}]`);
      // The fallback target must exist and must NOT be optional. An optional one reintroduces the
      // defect one level down: if the part the overlay falls back to overlaying can itself be absent,
      // there is again a coordinate where the overlay has nowhere to go and takes a cell. `label` is
      // `optional: false`, which is what makes it a valid floor.
      if (p.overlaysWhenAbsent) {
        if (!parts[p.overlaysWhenAbsent]) e.push(`anatomy part '${n}': overlaysWhenAbsent '${p.overlaysWhenAbsent}', which is not a declared part`);
        else if (parts[p.overlaysWhenAbsent].optional) e.push(`anatomy part '${n}': overlaysWhenAbsent '${p.overlaysWhenAbsent}' is optional — the fallback must be a part that is always present, or there is still a coordinate where the overlay takes a cell of its own`);
        if (p.overlaysWhenAbsent === p.replaces) e.push(`anatomy part '${n}': overlaysWhenAbsent duplicates 'replaces' — the fallback exists for the case that part is ABSENT, so naming the same part says nothing`);
      } else if (p.replaces && parts[p.replaces]?.optional) {
        // An overlay whose `replaces` target is OPTIONAL has a coordinate where it lands nowhere, so
        // the fallback is REQUIRED, not a nicety. Gating it here rather than trusting a def to think of
        // it: this is the #612 defect's root, and it was invisible for exactly as long as nothing asked.
        e.push(`anatomy part '${n}': replaces '${p.replaces}', which is OPTIONAL — declare 'overlaysWhenAbsent' for the coordinate where it is missing, or the overlay takes a cell of its own there and the part GROWS on its '${p.when}' state`);
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
      else if (!(def.states ?? []).includes(p.when)) e.push(`anatomy part '${n}': when '${p.when}' is not one of states [${(def.states ?? []).join(', ')}]`);
      // `nests` is REQUIRED rather than optional, and this is the decision from `PartDef.nests` made
      // enforceable: an `absolute` with nothing nominated would have to be authored from scratch, which
      // is the N-way duplication the shared ring exists to avoid. Half-supporting both shapes would
      // mean neither is the answer.
      if (!p.nests) e.push(`anatomy part '${n}' is kind 'absolute' but nominates no component to nest ('nests') — an absolute part materializes as an instance of a shared component, never authored in place`);
      // The offset is the whole geometric content of this kind. Without it the ring lands exactly on
      // its parent's bounds, which is the one position WCAG 1.4.11 says it must not take: flush against
      // the border, it blends into the button's own edge instead of separating from it.
      if (!p.inset) e.push(`anatomy part '${n}' is kind 'absolute' but binds no 'inset' — a ring flush against its target's bounds blends into the element's own border (WCAG 1.4.11)`);
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
    if (p.kind !== 'box' && (p.layout || p.padding || p.gap !== undefined))
      e.push(`anatomy part '${n}' is kind '${p.kind}' but carries layout/padding/gap — only a 'box' lays out`);
    // `inset` is the absolute kind's own geometry and means nothing anywhere else: on a flow part it
    // reads as though the part were offset from its cell, which no projection does. Checked as its own
    // rule rather than folded into the loop above because the layout rule is about what LAYS OUT
    // children and this is about what sits OUTSIDE the flow — two different claims.
    if (p.kind !== 'absolute' && p.inset !== undefined)
      e.push(`anatomy part '${n}' is kind '${p.kind}' but binds 'inset' — only an 'absolute' part sits outside the flow to be inset from it`);
    if (p.kind !== 'absolute' && p.nests !== undefined)
      e.push(`anatomy part '${n}' is kind '${p.kind}' but declares 'nests' — only an 'absolute' part materializes as an instance of another component`);
    if (p.kind === 'box' && !p.layout && (p.children ?? []).length > 0)
      e.push(`anatomy part '${n}' is a box with children but no layout — a materializer has no direction to apply`);
    if (p.kind === 'text' && !p.type) e.push(`anatomy part '${n}' is text but binds no type style`);
  }

  return e;
};
