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
  | 'overlay'; // occupies another part's position rather than its own row cell

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

  return { errors, warnings };
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
    [p.gap, p.height, p.radius, p.size, p.type, p.padding?.block, p.padding?.inlineLabel, p.padding?.inlineVisual]
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
    } else if (!seen.has(n)) {
      e.push(`anatomy part '${n}' is unreachable from root '${a.root}' — an orphan part would be silently dropped by a materializer`);
    }
  }

  // Only a box lays out children; a text/slot/overlay carrying layout means the tree is
  // mis-shaped and the materializer would emit an auto-layout frame where a leaf belongs.
  for (const n of names) {
    const p = parts[n];
    if (p.kind !== 'box' && (p.layout || p.padding || p.gap !== undefined))
      e.push(`anatomy part '${n}' is kind '${p.kind}' but carries layout/padding/gap — only a 'box' lays out`);
    if (p.kind === 'box' && !p.layout && (p.children ?? []).length > 0)
      e.push(`anatomy part '${n}' is a box with children but no layout — a materializer has no direction to apply`);
    if (p.kind === 'text' && !p.type) e.push(`anatomy part '${n}' is text but binds no type style`);
  }

  return e;
};
