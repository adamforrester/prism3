/**
 * Prism3 engine — ANATOMY → FIGMA (the structural projection, #327).
 *
 * `materialise-to-figma.ts` does this for the TOKEN tier; this is its component-tier sibling and
 * deliberately copies its shape, because that shape is the thing that made the token round-trip
 * verifiable: a **pure plan builder** the test suite can assert against, plus a thin shell that
 * turns the plan into plugin JS. The plan is what gets gated; the paste is just transport.
 *
 * WHY A PROJECTION AND NOT A FORMAT. The neutral `anatomy` vocabulary is Shoelace-derived
 * (`::part()` + named slots) because that is a standard and the real customization surface a
 * WC/CMS consumer uses. Figma is one CONSUMER of that vocabulary, not its definition — the same
 * `$value` / `$extensions.figma` split the token tier already uses. Projecting here rather than
 * authoring Figma-shaped anatomy is what keeps the code outputs from inheriting Figma's limits.
 *
 * THE ASYMMETRY IS THE POINT. A plan is built for a specific (size, leading?, trailing?)
 * combination, because the horizontal padding is SLOT-AWARE: the side a visual sits against uses
 * `padding-x-visual` and the side a label sits against uses `padding-x` (#326, Material 3's
 * `with-leading-icon-leading-space`). A projection that ignored which slots are filled could not
 * express that, and would emit a button that reads loose on the icon side at every size.
 *
 * PURE. No disk, no Figma I/O — `figmaAnatomyPlan` is a function of the def alone, so the gate
 * runs it without a live file. Verification against what the engine actually emits is a separate,
 * also-pure step (`planBindingErrors`) that takes the emitted Figma variable names as a Set.
 */
import type { ComponentDef, PartDef, SizingMode } from './component-schema';
import { expandKey, gridColumnAxis, fillPaintKey, paintKeyPlaceholders, PRIMARY_PAINT_SLOTS } from './component-schema';

/** A node in the materialization plan. Property names are Figma Plugin API property names
 *  deliberately — this is the projection's whole job, and naming them anything else would put a
 *  translation layer between the gate and the thing it claims to verify. */
export type FigmaNodePlan = {
  name: string;
  /** `NESTED_INSTANCE` is an instance of a component that must ALREADY EXIST in the file, and it is a
   *  peer of `INSTANCE_SWAP` rather than a flag on it because the two differ in every consequence: a
   *  swap is a slot the *consumer* repoints and carries a component PROPERTY, while a nested instance
   *  is structure the *host* fixes and carries none. Collapsing them would hand the designer a
   *  swappable focus ring. */
  type: 'FRAME' | 'TEXT' | 'INSTANCE_SWAP' | 'NESTED_INSTANCE';
  layoutMode?: 'HORIZONTAL' | 'VERTICAL';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  primaryAxisSizingMode?: 'AUTO' | 'FIXED';
  counterAxisSizingMode?: 'AUTO' | 'FIXED';
  /** Figma property → Figma variable NAME (slash-pathed). Names not IDs: the plan is
   *  brand-invariant, and the executor resolves names to IDs in the live file. */
  bound: Record<string, string>;
  /** Composite type is a Figma TEXT STYLE, not a variable — a different API (`setTextStyleIdAsync`)
   *  and a different namespace. Carried as its own field rather than squeezed into `bound`, so the
   *  plan can't imply a binding call that would fail at paste time. */
  textStyle?: string;
  /** Elevation is a Figma EFFECT STYLE (`setEffectStyleIdAsync`), a THIRD namespace — not a
   *  variable and not a text style. It gets its own field for exactly the reason `textStyle` does:
   *  `setBoundVariable('effects', …)` is not an API, so an effect squeezed into `bound` would
   *  type-check, pass every offline gate, and fail only at paste time. Three namespaces, three
   *  fields, three name sets in `planBindingErrors` — the symmetry is the safeguard. */
  effectStyle?: string;
  /** For an `INSTANCE_SWAP` node: the NAME of the component to instantiate. A name, not a key or an
   *  id, for the same reason `bound` holds names — the plan is brand-invariant and the executor
   *  resolves against the live file. Figma has no "empty swappable slot": a slot with no target
   *  materializes as a bare frame, which is what shipped in #482 while the plan claimed
   *  INSTANCE_SWAP. Absent here means "no component nominated", and the payload records a miss
   *  rather than pretending. */
  swapTarget?: string;
  /** Paint bindings — a FOURTH API shape (`figma.variables.setBoundVariableForPaint`), and the
   *  reason they are not in `bound`: a paint is not a property, it is an entry in a `fills` /
   *  `strokes` ARRAY, so `setBoundVariable('fills', v)` is not the call. Same argument as
   *  `textStyle` and `effectStyle` — one field per API shape, so the plan cannot imply a call that
   *  does not exist. */
  paints?: { fills?: string; strokes?: string };
  /** The PLACEHOLDER copy for a `TEXT` node, from `figmaProperties.texts[*].default`.
   *
   *  On the node rather than looked up in the payload, because the payload builds nodes and knows
   *  only what the plan tells it. Absent on every other node type — a `characters` write on a FRAME
   *  throws — and absent on a TEXT node the def declares no TEXT property for, which is the case
   *  where an empty label is the correct output rather than an oversight. */
  characters?: string;
  /** Which Figma COMPONENT PROPERTY this node is driven by, and through which field:
   *  `characters` for a TEXT property, `mainComponent` for an INSTANCE_SWAP, `visible` for a BOOLEAN.
   *
   *  The value here is the PROP NAME (`children`), not Figma's property id (`children#104:25`). The
   *  id does not exist until `addComponentProperty` runs in the live file and embeds a node id that
   *  differs on every paste, so a plan holding one would not be brand-invariant — the same argument
   *  `bound` holds names rather than `VariableID:*`. The payload maps name → returned id. */
  propertyRef?: { field: 'characters' | 'mainComponent' | 'visible'; prop: string };
  /** For an `INSTANCE_SWAP` node: the paint for VECTOR descendants INSIDE the instance.
   *
   *  Its own field because the instance's own `fills` would paint a background square behind the
   *  glyph, not the glyph — the ink lives on the vector. This is also the one paint with no def-tier
   *  variable of its own: there is no `color/interactive/{intent}/icon`, so icon ink routes through
   *  `on-fill` / `text.rest` and reaches the vector as a per-instance override. Verified to survive
   *  `createComponentFromNode` and nesting one level deeper into an instance. */
  descendantFills?: string;
  /** For a `NESTED_INSTANCE`: the NAME of the component to instantiate, and the whole reason this node
   *  type exists. A name for the same reason `bound` holds names — the plan is brand-invariant.
   *
   *  Distinct from `swapTarget` even though both resolve a component by name, because the failure modes
   *  are opposite. An unresolvable `swapTarget` degrades to a placeholder frame, which is a slot the
   *  designer can still fill. An unresolvable `nestTarget` must NOT: a frame in the ring's place is an
   *  unstroked, invisible box that reads as a successfully built focus ring, so the payload records the
   *  miss and builds nothing at all. **A missing shared component is the expected failure of this kind**
   *  — it is the first kind that can fail because of what is absent from the FILE rather than the plan. */
  nestTarget?: string;
  /** For a `NESTED_INSTANCE`: WHICH VARIANT of `nestTarget` to nest, when `nestTarget` names a component
   *  SET rather than a plain component (#681). Figma's `InstanceNode.setProperties` shape exactly —
   *  `{ axis: value }` — which is why `PartDef.nesting`'s `variant` is a `Record` and not a string.
   *
   *  ABSENT when the def declares `nest-exposed`, and that absence is meaningful rather than a gap: an
   *  exposed nest is one whose coordinate the CONSUMER drives from the parent, so the def has no variant
   *  to name and this projection must not invent one. Present means `nest-fixed`, i.e. the def chose.
   *
   *  A RECORD RATHER THAN A MEMBER NAME, even though the executors resolve it to one, because the name
   *  is not the def's to write: a set's members are named by their full coordinate in FIGMA'S chosen
   *  order (`color=default, size=md` or the reverse), so a def spelling a name would be asserting an
   *  order it cannot see. The executors compare axis-by-axis instead, which is order-independent.
   *
   *  THE COORDINATE MUST IDENTIFY EXACTLY ONE MEMBER — every axis of the set named, no partial claims.
   *  A partial coordinate looks reasonable and is the trap: `{color:'default'}` against a color×size set
   *  matches two members, and something then has to choose between them. Every available rule for that
   *  choice is creation order wearing a different hat, which is `#656` — the exact error `nesting` exists
   *  to stop, one layer further in. So an under-specified coordinate is refused with the same fifth miss
   *  as a wrong one, and the message lists the members so the missing axis is visible.
   *
   *  Deliberately NOT in `bound` and not a variable name: a variant coordinate is neither. It is the
   *  same argument `textStyle`, `effectStyle` and `absoluteInset` each got their own field for — one
   *  field per API shape, so the plan cannot imply a call that does not exist. */
  nestVariant?: Record<string, string>;
  /** For a `NESTED_INSTANCE`: taken out of the auto-layout flow, sized to its parent's bounds grown by
   *  the `inset` variable's value on every side.
   *
   *  A variable NAME, like every other geometry field — but it is the one name here that will NOT be
   *  bound, and the distinction is the whole content of this field. Figma's `x`/`y` accept no variable
   *  binding, so the payload resolves this name to the variable's **value** and writes a number. It is
   *  deliberately not in `bound`, which would imply a `setBoundVariable('x', …)` that does not exist —
   *  the same argument `textStyle` and `effectStyle` got their own fields for, and the strongest form of
   *  it, since here the setter would take the call and drop the write.
   *
   *  A NAME rather than a resolved number because **the plan must stay brand-invariant**: freezing the
   *  number at plan time would make a plan that only works for the brand that built it, breaking the
   *  property every other field in this type preserves. The freezing still happens — it just happens at
   *  paste, in the file, against that file's own variables. So a brand changing `focus.ring.offset`
   *  re-themes every bound paint and does NOT move an already-pasted ring, which is a real ceiling and
   *  is admitted in `codeOnly`. Carrying the name also keeps this value inside `planBindingErrors`,
   *  instead of it being the one geometry binding in the projection exempt from the emit gate. */
  absoluteInset?: string;
  /** Taken out of the auto-layout flow and CENTERED on its parent, rather than inset from its bounds.
   *
   *  A separate field from `absoluteInset` even though both end in `layoutPositioning='ABSOLUTE'`,
   *  because the geometry is not the same shape and neither is the reason. An inset ring is sized
   *  FROM the parent and grown outward by a bound offset; a centered overlay keeps its own square
   *  size (its `size` binding still applies) and is merely positioned. Folding them together would
   *  mean either the ring loses its offset or the spinner gains a spurious one, and one flag standing
   *  for two geometries is how a payload writes a call that type-checks and does the wrong thing.
   *
   *  A boolean, not a variable name, because there is nothing brand-varying to carry: centered is
   *  centered. That also keeps it out of `planBindingErrors`' scope honestly — it names no variable,
   *  so there is no name to verify, which is the opposite of `absoluteInset`'s situation. */
  absoluteCenter?: boolean;
  /** Rendered at zero opacity — in the flow and in the accessibility tree, but not visible.
   *
   *  The only node property here that exists to preserve GEOMETRY rather than to express a design
   *  value, and the reason it is opacity rather than `visible: false`: a hidden node yields its cell,
   *  so the button collapses to the spinner's width and reflows the form — the exact bug this whole
   *  mechanism prevents. React Aria states the a11y half: "Do not use `visibility: hidden` or
   *  `display: none` as these remove the element from the accessibility tree."
   *
   *  Not a variable and deliberately not bound. A brand does not get to theme this to 0.5 — a
   *  half-visible label under a spinner is not a design choice a brand should be able to make, it is
   *  a legibility failure. So it is a literal in the plan, unlike every paint and dimension here. */
  zeroOpacity?: boolean;
  children: FigmaNodePlan[];
};

/**
 * Where in the variant grid a plan sits. A coordinate carrying none of the axes a def's `paintKeys`
 * name means "structure only" — the plan carries no paints at all, which is what every caller before
 * #487 step 3 wanted and still gets. Carry them, and the plan is one fully-skinned variant.
 *
 * `intent` and `appearance` are NAMED rather than left to the index signature because three of this
 * file's own functions read them by name (`planComponentName` writes them in a fixed position in the
 * member name), so they are part of the projection's shape and not merely data. The index signature is
 * what makes a def's OWN axes reachable — `tone`, `color`, `style` — without which a `paintKeys`
 * template naming one could be declared and never filled (#758). `state` is named for the same reason
 * as the first two and is not a `variants` axis at all.
 */
export type VariantCoord = { intent?: string; appearance?: string; state?: string } & Record<string, string | undefined>;

/**
 * What a caller hands `figmaAnatomyPlan`: the boolean slot toggles and the swap target, plus any axis
 * coordinate the def declares.
 *
 * It is NOT `… & VariantCoord`, and the reason is worth the line. That intersection typechecks inside
 * the engine's own `tsconfig` and fails under the plugin's, because `leading: boolean` collides with a
 * `Record<string, string | undefined>` index signature — the engine is buildless and only the plugin's
 * `tsc --noEmit` reached it. So the index signature widens to admit the booleans, and `axisValue()`
 * below narrows on the way out: a coordinate is a string or it is not a coordinate.
 */
export type PlanSlots = { leading?: boolean; trailing?: boolean; swapTarget?: string } & {
  intent?: string;
  appearance?: string;
  state?: string;
} & Record<string, string | boolean | undefined>;

/**
 * One Figma COMPONENT PROPERTY to declare on the assembled set (#487 step 6).
 *
 * Names, not ids, for the reason `FigmaNodePlan.propertyRef` gives. `default` is deliberately typed
 * as the union Figma's `addComponentProperty` accepts *for the corresponding type* — measured, not
 * assumed: an `INSTANCE_SWAP` default is a node **id** string (`'73:37'`), and `key`, `''`, `null`
 * and `undefined` are each rejected with *"Property value is incompatible"*. So a swap's default
 * cannot be computed offline at all, and this carries the target's NAME for the payload to resolve.
 */
export type FigmaPropertyPlan =
  | { name: string; type: 'TEXT'; default: string }
  | { name: string; type: 'BOOLEAN'; default: boolean }
  /** `swapTarget` is a component NAME; the payload resolves it to the node id Figma demands. A
   *  target that does not resolve makes the property unbuildable rather than merely undefaulted,
   *  which is why the payload reports it as a miss instead of substituting something. */
  | { name: string; type: 'INSTANCE_SWAP'; swapTarget: string };

export type AnatomyPlan = {
  component: string;
  size: string;
  slots: { leading: boolean; trailing: boolean };
  /** WHICH of the two slots are real Figma AXES — `figmaProperties.slotAxes` names, carried onto the
   *  plan for the same reason `gridAxis` is (`planComponentName` and `planSetLayout` receive plans,
   *  never the def).
   *
   *  It exists because the member NAME is a wire format, not a label: `combineAsVariants` derives a
   *  set's properties from its members' names, so a coordinate in the name IS a property in the
   *  designer's panel. `slots` alone cannot answer whether to write one — `leading: false` is both
   *  "this member has no leading visual" (Button, where the two values are two real boxes per #326)
   *  and "this component has no such slot at all" (IconButton, whose icon is required). Emitting it
   *  unconditionally made those identical, and gave IconButton's set two single-valued phantom
   *  properties: a def declaring FOUR axes projecting a set carrying SIX.
   *
   *  Found by the axis-parity gate (`figmaAxisNames` vs the axes a real name emits), which is the
   *  189-vs-756 defect in the mirror direction — there the emitter carried axes the declaration did
   *  not, here the declaration was right and the emitter added two. Same gate, both directions,
   *  because it compares a declaration against a parsed name rather than against another count. */
  slotAxes: string[];
  /** Where in the variant grid this plan sits — `{}` for a structure-only plan. Carried so the
   *  payload can name the component after its own coordinate, and so a gate can tell a plan that
   *  legitimately has no paints from one that dropped them. */
  coord: VariantCoord;
  root: FigmaNodePlan;
  /** Carried onto the plan rather than dropped, so the ceilings travel WITH the artifact that
   *  fails to honor them. A plan whose `codeOnly` is empty is claiming Figma holds everything. */
  codeOnly: string[];
  derived: Record<string, string>;
  /** Which axis the def wants across the set's COLUMNS (#656) — `figmaProperties.gridAxis`, carried
   *  onto the plan for the same reason `codeOnly` is: `planSetLayout` receives PLANS, never the def,
   *  and a layout decision the def made has to travel with the artifact it describes. Absent when the
   *  def declares no preference, which `planSetLayout` resolves by cardinality. */
  gridAxis?: string;
};

/** Root-relative token ref → the emitted Figma variable name. The emitters slash-path the same
 *  dotted path, so this is the whole mapping — but it is stated once, here, rather than inlined
 *  at each call site where a drift would be invisible. */
export const figmaVarName = (ref: string): string => ref.replace(/\./g, '/');

/** Composite type ref → the emitted Figma TEXT STYLE name. Note the asymmetry with
 *  `figmaVarName`: text styles drop the `type.` root (`type.label.md.emphasis` →
 *  `label/md/emphasis`) because they live in their own namespace rather than a variable
 *  collection. Stating it here is what stops the two mappings being assumed identical. */
export const figmaTextStyleName = (ref: string): string => ref.replace(/^type\./, '').replace(/\./g, '/');

const ALIGN: Record<string, 'MIN' | 'CENTER' | 'MAX' | 'BASELINE'> = {
  start: 'MIN', center: 'CENTER', end: 'MAX', baseline: 'BASELINE',
};
const JUSTIFY: Record<string, 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'> = {
  start: 'MIN', center: 'CENTER', end: 'MAX', 'space-between': 'SPACE_BETWEEN',
};
// `hug` and `fill` both mean "don't pin a number" on the axis; only `fixed` is FIXED.
const sizingMode = (m: SizingMode): 'AUTO' | 'FIXED' => (m === 'fixed' ? 'FIXED' : 'AUTO');

/**
 * Project one component's anatomy into a materialization plan for a given size and slot fill.
 *
 * Throws rather than returning a partial plan on an unresolvable binding: a plan is an
 * instruction to write into someone's Figma file, and a half-bound node is worse than no node.
 * `validateComponentDef` catches the same class of error earlier and with a better message —
 * this is the backstop for a caller that skipped it.
 *
 * PAINT (#487 step 3) IS OPTIONAL AND RAGGED. Pass `intent` + `appearance` and the plan is one
 * fully-skinned variant; omit them and it is structure only, exactly as before. The grid is
 * deliberately NOT rectangular, and that is a property of the design rather than a gap in the def:
 * `filled` expresses hover as a FILL CHANGE (`primary.filled.fill.hover`) while `outline` and `text`
 * express it as an OVERLAY (`primary.outline.overlay.hover`) — because there is no fill to change.
 * So a missing key means "this appearance does not paint that part in that state", and `paintOf`
 * returns undefined instead of throwing. `varOf` still throws, and the asymmetry is the point: a
 * geometry key is named by the anatomy and its absence is an authoring error, whereas a paint key is
 * looked up speculatively across a grid nothing claims is full.
 */
export const figmaAnatomyPlan = (
  def: ComponentDef,
  size: string,
  slots: PlanSlots = {},
): AnatomyPlan => {
  const a = def.anatomy;
  if (!a) throw new Error(`${def.id}: no anatomy block to project`);
  if (!(def.variants?.size ?? []).includes(size)) throw new Error(`${def.id}: '${size}' is not a declared size`);
  const leading = slots.leading ?? false;
  const trailing = slots.trailing ?? false;
  const { state } = slots;
  // An axis coordinate read off `slots` is a string or it is absent — `leading`/`trailing` share the
  // index signature but are not coordinates, and a def is free to declare an axis named either.
  const axisValue = (axis: string): string | undefined => {
    const v = slots[axis];
    return typeof v === 'string' ? v : undefined;
  };
  // Validated, not trusted. A typo'd axis value would otherwise resolve no paint keys at all and emit
  // a structurally perfect, entirely unpainted component — a silent failure of exactly the shape #500
  // and #482 were. Every axis the def declares is checked, not just Button's two (#758): the loop is
  // over `def.variants`, so a def gaining an axis gets the check without this line being edited.
  for (const [axis, values] of Object.entries(def.variants ?? {})) {
    const given = axisValue(axis);
    if (given !== undefined && !values.includes(given))
      throw new Error(`${def.id}: '${given}' is not a declared ${axis}`);
  }
  if (state && !(def.states ?? []).includes(state)) throw new Error(`${def.id}: '${state}' is not a declared state`);
  // WHERE THE PLAN SITS IN THE GRID. Only axes the caller actually supplied, so a structure-only plan
  // has an EMPTY coord — a load-bearing invariant with its own assertion, because it is what lets a
  // gate tell "legitimately unpainted" from "dropped the paints". `size` is deliberately NOT folded in
  // even though it is always known: it is already `plan.size`, `planComponentName` writes it from
  // there, and adding it here would make every plan's coord non-empty and retire that distinction.
  const coord: VariantCoord = {
    ...Object.fromEntries(Object.keys(def.variants ?? {}).flatMap((a) => (axisValue(a) !== undefined ? [[a, axisValue(a)]] : []))),
    ...(state ? { state } : {}),
  };
  // The coordinate paint keys are FILLED from, which is the grid coordinate plus `size`. Separate from
  // `coord` for the reason above, and it carries `size` because a `paintKeys` template naming `{size}`
  // would otherwise validate, pass reachability, and silently never fill.
  const paintCoord: VariantCoord = { ...coord, size };

  // A PARTIAL COORDINATE IS AN ERROR, and generalizing this was the second half of #758. The old rule
  // was `intent and appearance must be given together`, which is this rule with Button's axes baked
  // in. Supplying some of a template's axes but not all makes every template needing the missing one
  // unfillable, so the plan comes back structurally perfect and unpainted — the #500 shape again, and
  // the caller's own typo'd argument name is enough to cause it. Asked per template, because "all the
  // axes" is not a property of the def: `field-message` keys `{tone}.{slot}` and nothing else, so
  // `tone` alone is a COMPLETE coordinate there and an incomplete one in Button's grammar.
  for (const template of def.paintKeys ?? []) {
    const axes = paintKeyPlaceholders(template).filter((p) => p !== 'slot' && p !== 'state' && p in (def.variants ?? {}));
    const missing = axes.filter((a) => axisValue(a) === undefined);
    if (axes.length && missing.length && missing.length < axes.length)
      throw new Error(`${def.id}: a partial paint coordinate — '${template}' needs [${axes.join(', ')}] and [${missing.join(', ')}] was not given, so every key in that grammar goes unresolved and the plan projects unpainted`);
  }

  // binding key (possibly `{size}`-templated) → Figma variable name, via def.tokens.
  const varOf = (key: string): string => {
    const [resolved] = expandKey(key, [size]);
    const ref = def.tokens[resolved];
    if (!ref) throw new Error(`${def.id}: anatomy names binding key '${resolved}', which tokens does not bind`);
    return figmaVarName(ref);
  };

  /**
   * Resolve one paint slot for the current coordinate, or undefined if the def does not key it.
   *
   * `disabled` is CROSS-CUTTING (docs/20 §7): the def keys it as `disabled.fill` / `disabled.label`,
   * with no intent or appearance, because one disabled treatment serves every combination. So the
   * lookup switches namespace entirely rather than falling back within the interactive one — a
   * disabled destructive button must not tint toward red.
   *
   * But it is cross-cutting over INTENT, not over APPEARANCE. `disabled.fill` and `disabled.border`
   * are both keyed unconditionally, so applying them blind gives `text` a fill and a border it never
   * had at rest — a disabled ghost button rendering as a gray box. So a `disabled` structural paint
   * is applied only where the appearance HAS that structure, which is asked by resolving the same
   * slot at rest. Ink (`label` / `icon`) is unconditional: every appearance has ink.
   *
   * THE KEY SPELLING IS THE DEF'S, NOT THIS FILE'S (#758). This function used to build its keys from
   * a template hardcoded to `{intent}.{appearance}.{slot}` — Button's two axes, written in here as
   * though they were every component's. Five of the seven defs carry neither axis, so they resolved no
   * paint at all and projected structurally complete and silently colorless. Now `def.paintKeys`
   * declares the grammar and this walks it, so `icon`'s `tone.primary` and `focus-ring`'s
   * `stroke.inverse` resolve by the same code path as Button's `primary.filled.fill.hover`.
   *
   * ORDER IS THE DEF'S TOO, and it carries the state fallback that used to be hardcoded here.
   * `{intent}.{appearance}.{slot}.{state}` leads `{intent}.{appearance}.{slot}`, so a state that
   * restyles a part wins and one that does not falls through to the rest value (a `pending` button's
   * fill is its rest fill) — which is what keeps this from needing an entry per state per part. An
   * unfillable template is SKIPPED rather than half-substituted, so a rest coordinate simply misses
   * the state-qualified template instead of looking up a key ending in a dot.
   *
   * THE `disabled` BRANCH IS BEHAVIOR, NOT GRAMMAR, which is why it stays here and is NOT expressed
   * as a template. Two things it does that a key spelling cannot say: it switches namespace outright
   * rather than falling back within the interactive one, and it is conditional on structure. A
   * template list says how keys are spelled; this says which family applies, and folding the second
   * into the first would make the restKey guard below unstatable.
   */
  const STRUCTURAL = new Set(['fill', 'border']);
  const restKey = (slot: string): boolean =>
    (def.paintKeys ?? []).some((t) => {
      const k = fillPaintKey(t, slot, { ...paintCoord, state: undefined });
      return !!k && !!def.tokens[k];
    });
  const paintOf = (slot: string): string | undefined => {
    if (!def.paintKeys?.length) return undefined;
    if (state === 'disabled') {
      if (STRUCTURAL.has(slot) && !restKey(slot)) return undefined;
      return def.tokens[`disabled.${slot}`] ? figmaVarName(def.tokens[`disabled.${slot}`]) : undefined;
    }
    for (const template of def.paintKeys) {
      // A SLOT-FREE template answers only the part's primary paint slot — see `PRIMARY_PAINT_SLOTS`
      // for the measurement. Without this, `icon`'s `tone.{tone}` answered `border` with the same
      // variable it answered `fill`, and every glyph in the set came back outlined.
      if (!template.includes('{slot}') && !PRIMARY_PAINT_SLOTS.has(slot)) continue;
      const k = fillPaintKey(template, slot, paintCoord);
      if (k && def.tokens[k]) return figmaVarName(def.tokens[k]);
    }
    return undefined;
  };

  /**
   * The overlay active at this coordinate, and the part it stands in for (#536 item 2).
   *
   * `kind: 'overlay'` was declared, validated, and completely unprojected — this file had zero
   * occurrences of `overlay`, `replaces` or `spinner`, so `state=pending` emitted the same three
   * parts as `rest` and 108 variants rendered as their rest sibling.
   *
   * Keyed off `kind` + `when` rather than the part's NAME, like every other rule in this builder, so
   * a second def's overlay projects with no change here.
   */
  const activeOverlay = Object.entries(a.parts).find(([, p]) => p.kind === 'overlay' && !!p.when && p.when === state);

  /* Would this part be in the tree IGNORING any overlay? Split out of `present()` because the overlay
   * resolution below has to ask it, and `present()` now depends on that resolution — asking the full
   * `present()` here would be a cycle. Deliberately NOT the same predicate: this one answers "does the
   * caller supply this slot", `present()` answers "is it in the final tree", and after #612 those differ
   * for exactly the part an overlay lands on. */
  const slotPresent = (name: string): boolean => {
    if (name === 'leadingVisual') return leading;
    if (name === 'trailingVisual') return trailing;
    return !a.parts[name]?.optional;
  };

  /* Which part the active overlay actually lands on AT THIS COORDINATE — `replaces` when that part is
   * present, `overlaysWhenAbsent` when it is not (#612).
   *
   * The distinction the two branches encode is IN-FLOW vs OUT-OF-FLOW, and it is the whole fix. When
   * the leading visual is there, the spinner TAKES its cell: one node in one position, width identical
   * because the cell was already the icon's size. When there is no leading visual there is no cell to
   * take, and the pre-#612 code fell through to giving the spinner a cell of its own — which grew a
   * label-only button by 28px at medium (a 32px cell, less the 4px the left padding tightens by once
   * the cell reads as filled) and reflowed the form mid-submit. So in that case the spinner goes
   * ABSOLUTE, centered, and the label stays in flow at zero opacity holding the width open.
   *
   * Keyed off presence rather than off the part's name, like every other rule in this builder, so a
   * second def declaring an overlay over an optional slot gets the same behavior with no change here. */
  const replacesPresent = !!activeOverlay?.[1].replaces && slotPresent(activeOverlay[1].replaces!);
  const replacedByOverlay = replacesPresent ? activeOverlay?.[1].replaces : undefined;
  const overlaidPart = activeOverlay && !replacesPresent ? activeOverlay[1].overlaysWhenAbsent : undefined;

  const present = (name: string): boolean => {
    // The replaced part yields its cell — one node in one position, not two fighting for it. Figma
    // builds every variant as its own tree, so there is nothing to hide: the `pending` variant simply
    // has a spinner where the leading visual would otherwise be.
    if (replacedByOverlay && name === replacedByOverlay) return false;
    if (name === 'leadingVisual') return leading;
    if (name === 'trailingVisual') return trailing;
    const p = a.parts[name];
    // An `absolute` part is state-gated exactly as an overlay is — it appears on its `when` state and
    // nowhere else. Read off `when` rather than from a name, so the ring's presence follows the same
    // rule the spinner's does and a second def gets it for free. This is what closes #536 item 3's
    // measured symptom: `state=focus-visible` emitted a plan byte-identical to `rest` in all 108 rows,
    // because the ring was not a part at all and nothing else distinguishes focus.
    if (p?.kind === 'absolute') return !!p.when && p.when === state;
    return !p?.optional;
  };

  /* Padding asks about the CELL, not the slot. #326 insets a side less when a glyph sits against it,
   * and a spinner is a glyph — asking `leading` alone would inset a pending button as though its
   * leading cell were empty while a spinner sits in it.
   *
   * REVISED by #612, and the correction matters because the old note here was the defect's rationale.
   * It read: "because the spinner takes the leading cell whether or not `leading=true`, `pending` now
   * renders identically across the leading axis — those two coordinates collapse. That is *correct* (a
   * pending button has a visual there either way)." The first clause was true and the parenthetical
   * was the mistake — a pending button does have a visual there either way, but with `leading=false`
   * that visual arrived in a cell that did not exist at rest, so the button GREW. The collapse was
   * real; it was a symptom being read as a confirmation.
   *
   * Now `replacedByOverlay` is only set when the replaced cell is actually present, so with no leading
   * visual this correctly reads EMPTY and the label side keeps `padding-x` — the spinner is centered
   * out of flow and contributes no cell to inset against. The two leading coordinates no longer
   * collapse at `pending`, which is why #612's 54 rows survive as a genuine 54 rather than growing. */
  const leadingFilled = leading || replacedByOverlay === 'leadingVisual';
  const trailingFilled = trailing || replacedByOverlay === 'trailingVisual';

  // PART NAME → the component property that drives it, inverted from the def's prop-keyed maps.
  // Inverted here rather than searched per node because the invariant "one node carries at most one
  // property kind" is already enforced by `figmaPropertyErrors`, so a Map is the shape that matches
  // the rule — a second claim on a part would overwrite rather than accumulate, and the gate that
  // would have caught it runs earlier.
  const fp = def.figmaProperties;
  const drivenBy = new Map<string, FigmaNodePlan['propertyRef']>();
  const placeholder = new Map<string, string>();
  for (const [prop, t] of Object.entries(fp?.texts ?? {})) {
    drivenBy.set(t.part, { field: 'characters', prop });
    placeholder.set(t.part, t.default);
  }
  for (const [prop, part] of Object.entries(fp?.swaps ?? {})) drivenBy.set(part, { field: 'mainComponent', prop });
  for (const [prop, part] of Object.entries(fp?.booleans ?? {})) drivenBy.set(part, { field: 'visible', prop });

  const node = (name: string, p: PartDef): FigmaNodePlan => {
    const bound: Record<string, string> = {};
    // The overlay is spliced into the replaced part's POSITION, not appended — order is visual order
    // (`PartDef.children` says so), and a spinner that rendered after the label would sit on the
    // wrong side of it. `present()` has already removed the part it replaces.
    //
    // In the OUT-OF-FLOW case (#612) the overlay is spliced in AFTER the part it overlays instead of in
    // place of it, because both are in the tree: the label holds the cell at zero opacity and the
    // spinner sits on top of it. Later in `children` means later in Figma's z-order, which is what puts
    // the spinner above the label rather than behind it — an ordering fact that reads as cosmetic and is
    // not: reversed, the spinner is occluded by a node whose whole purpose is to be invisible.
    const childNames = (p.children ?? []).flatMap((c) =>
      replacedByOverlay && c === replacedByOverlay && activeOverlay ? [activeOverlay[0]]
        : present(c) ? (overlaidPart && c === overlaidPart && activeOverlay ? [c, activeOverlay[0]] : [c])
        : []);
    const kids = childNames.map((c) => node(c, a.parts[c]));

    if (p.kind === 'box') {
      if (p.gap) bound.itemSpacing = varOf(p.gap);
      if (p.height) bound.height = varOf(p.height);
      // A SQUARE box binds one key to both axes (IconButton's control). The same two-axes-one-variable
      // shape a slot's artboard uses, and legal for the same reason — the executor unlocks the node's
      // aspect ratio before binding, so the second write does not displace the first. Mutually exclusive
      // with `height` (the validator enforces it), so this is an else-if in effect rather than a second
      // chance to set the same property.
      if (p.size) { bound.width = varOf(p.size); bound.height = varOf(p.size); }
      if (p.radius) for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) bound[c] = varOf(p.radius);
      if (p.padding) {
        bound.paddingTop = varOf(p.padding.block);
        bound.paddingBottom = varOf(p.padding.block);
        // The slot-aware rule (#326): a filled visual slot on a side pulls that side's inset in,
        // because the glyph's own bounding box already contributes apparent space. With no slot
        // filled, both sides fall back to the label inset and the button is symmetric again —
        // which is why this is additive rather than a redefinition of padding-x.
        const inlineVisual = p.padding.inlineVisual ?? p.padding.inlineLabel;
        bound.paddingLeft = varOf(leadingFilled ? inlineVisual : p.padding.inlineLabel);
        bound.paddingRight = varOf(trailingFilled ? inlineVisual : p.padding.inlineLabel);
      }
    } else if (p.kind === 'absolute') {
      // NOTHING in `bound`, deliberately. An absolute part's geometry is its position and its size, and
      // Figma binds neither: `x`/`y` take no variable, and its size is its parent's grown by the inset
      // rather than a value of its own. So the one geometry fact travels in `absoluteInset` — see the
      // field's note for why a name that will never be bound still has to be a name.
      //
      // A `size` binding is not read here even if a def declares one: an absolute part is sized BY its
      // parent, so a square artboard binding would fight the stretch and win on one axis silently.
    } else {
      // Both axes, bound to the SAME variable. That is legal — an unlocked node tracks a square
      // artboard on both axes — but it is legal only because the executor unlocks the node first;
      // see the `unlockAspectRatio()` note in `planToPluginJs`.
      if (p.size) { bound.width = varOf(p.size); bound.height = varOf(p.size); }
    }

    let textStyle: string | undefined;
    if (p.type) {
      const [resolved] = expandKey(p.type, [size]);
      const ref = def.tokens[resolved];
      if (!ref) throw new Error(`${def.id}: anatomy names binding key '${resolved}', which tokens does not bind`);
      textStyle = figmaTextStyleName(ref);
    }

    // PAINT BY PART KIND, not by part name. `container` takes the fill/border because it is the
    // `target`; `label` takes ink because it is text; a slot takes ink on its VECTOR descendants.
    // Keyed off `role`/`kind` so this generalizes to the other four defs rather than hard-coding
    // Button's part names — and so a def that names its box something else still paints.
    const paints: { fills?: string; strokes?: string } = {};
    let descendantFills: string | undefined;
    if (p.kind === 'box' && p.role === 'target') {
      // `outline` and `text` key no `.fill`, so an unfilled box is the correct projection of both —
      // not a dropped binding. `text` keys no border either; only `outline` does.
      //
      // THE OVERLAY IS THE SAME SLOT AS THE FILL, and this is #487 §8's per-appearance rule rather
      // than a shortcut. `filled` expresses hover by CHANGING its fill; `outline` and `text` have no
      // fill to change, so they express it as a translucent overlay — which in Figma is a fill on the
      // same node. One node, one `fills` array, two different token families reaching it depending on
      // appearance. Overlay wins when both resolve, because for `filled` only the fill resolves and
      // for the other two only the overlay does; a collision would mean the def keyed both, which is
      // a def-tier contradiction worth surfacing rather than silently ordering.
      const fill = paintOf('overlay') ?? paintOf('fill');
      const border = paintOf('border');
      if (fill) paints.fills = fill;
      if (border) paints.strokes = border;
    } else if (p.kind === 'text') {
      const ink = paintOf('label');
      if (ink) paints.fills = ink;
    } else if (p.kind === 'slot' || p.kind === 'overlay') {
      // There is no `color/interactive/{intent}/icon` variable — icon ink routes through `on-fill` /
      // `text.rest` under the def's `.icon` slot key. It lands on the vector INSIDE the instance,
      // because the instance's own fill would paint a square behind the glyph.
      //
      // An OVERLAY inks the same way, and this was the second half of #536 item 2: projecting the
      // spinner structurally but leaving it out of the paint branch produced a node in the right cell
      // with no colour — a pending button whose spinner is invisible against its own fill. It is a
      // glyph standing in a glyph's cell, so it takes a glyph's ink.
      descendantFills = paintOf('icon');
    }

    // The placeholder lands only on a TEXT node, and only where the def declares a TEXT property for
    // that part. A `characters` write on a FRAME throws, and a text part with no declared property is
    // a part whose copy nothing is claiming to own.
    const chars = p.kind === 'text' ? placeholder.get(name) : undefined;
    // An overlay inherits the CELL's property, not its own. It stands in the replaced part's
    // position, so the swap that pointed at that cell should keep pointing at it — one cell, one
    // INSTANCE_SWAP property, contents varying by state. Without this the spinner builds as an
    // instance nothing nominates: the stub host reported it as a placeholder frame with no VECTOR
    // inside to paint, which is a spinner that is present, unswappable and invisible.
    // Only when the overlay actually TOOK that cell. Out of flow it owns no cell, so it inherits no
    // property — and `replaces` is still the right lookup even then rather than `overlaidPart`, because
    // inheriting the OVERLAID part's property would hand the spinner the label's `characters` property
    // and try to write text into an INSTANCE_SWAP. `drivenBy` returns undefined for the absent leading
    // cell, which is the correct answer: nothing is nominating a swap the designer can repoint, since
    // there is no leading slot at this coordinate to repoint.
    const cellName = p.kind === 'overlay' && p.replaces && replacedByOverlay ? p.replaces : name;
    const propertyRef = drivenBy.get(cellName);

    return {
      name,
      type: p.kind === 'text' ? 'TEXT' : p.kind === 'box' ? 'FRAME' : p.kind === 'absolute' ? 'NESTED_INSTANCE' : 'INSTANCE_SWAP',
      ...(p.kind === 'absolute' && p.nests ? { nestTarget: p.nests } : {}),
      // The def's chosen coordinate, projected only for `nest-fixed` (#681). `nest-exposed` is the
      // consumer's to drive and `swap` has no variants at all, so neither writes a coordinate here —
      // and the executors read the field's ABSENCE as "do not select", which is the only reading that
      // keeps an exposed nest from being silently pinned by its own projection.
      ...(p.kind === 'absolute' && p.nesting?.kind === 'nest-fixed' ? { nestVariant: p.nesting.variant } : {}),
      ...(p.kind === 'absolute' && p.inset ? { absoluteInset: varOf(p.inset) } : {}),
      // The out-of-flow half of the #612 fix, on the two nodes it concerns: the overlay is centered
      // absolutely, and the part it covers holds its cell at zero opacity. Both are keyed off
      // `overlaidPart`, so when the overlay lands on a real cell (`replaces` present) neither appears
      // and the projection is byte-identical to before — which is what keeps this change to the 108
      // rows that were actually wrong.
      ...(overlaidPart && name === activeOverlay?.[0] ? { absoluteCenter: true } : {}),
      ...(overlaidPart && name === overlaidPart ? { zeroOpacity: true } : {}),
      ...(chars !== undefined ? { characters: chars } : {}),
      ...(propertyRef ? { propertyRef } : {}),
      ...(textStyle ? { textStyle } : {}),
      ...((p.kind === 'slot' || p.kind === 'overlay') && slots.swapTarget ? { swapTarget: slots.swapTarget } : {}),
      ...(Object.keys(paints).length ? { paints } : {}),
      ...(descendantFills ? { descendantFills } : {}),
      ...(p.layout
        ? {
            layoutMode: p.layout.direction === 'row' ? ('HORIZONTAL' as const) : ('VERTICAL' as const),
            primaryAxisAlignItems: JUSTIFY[p.layout.justify],
            counterAxisAlignItems: ALIGN[p.layout.align],
            primaryAxisSizingMode: sizingMode(p.layout.sizing.x),
            counterAxisSizingMode: sizingMode(p.layout.sizing.y),
          }
        : {}),
      bound,
      children: kids,
    };
  };

  return {
    component: def.id,
    size,
    slots: { leading, trailing },
    // Read off the DEF, which is the only thing that knows the difference between a slot that is
    // absent on this member and a slot the component does not have. See `AnatomyPlan.slotAxes`.
    slotAxes: (def.figmaProperties?.slotAxes ?? []).map((s) => s.name),
    coord,
    root: node(a.root, a.parts[a.root]),
    codeOnly: [...a.codeOnly],
    derived: { ...(a.derived ?? {}) },
    ...(def.figmaProperties?.gridAxis ? { gridAxis: def.figmaProperties.gridAxis } : {}),
  };
};

/** The three `variants` axes `figmaAnatomyPlan` can be handed, and the two slot axes. Named here
 *  because `figmaAnatomySet` REFUSES anything else rather than iterating around it — see below. */
const PROJECTABLE_VARIANT_AXES = ['intent', 'appearance', 'size'];
const PROJECTABLE_SLOT_AXES = ['leading', 'trailing'];

/**
 * Every variant the def's Figma projection DECLARES, as plans — the whole set, ready for either executor.
 *
 * WHY THIS EXISTS AT ALL. `figmaAnatomyPlan` builds ONE plan and both executors take `AnatomyPlan[]`, so
 * "which plans" was, until now, six nested loops written out at each call site. The test suite has three
 * copies of them and the plugin's trigger (#483) would have been a fourth — in `main.ts`, which calls
 * `figma.showUI` at module scope and is therefore unreachable from any test. So the enumeration lives
 * here, where it is pure and gated, and the trigger is the thin thing it should be.
 *
 * IT REFUSES AN AXIS IT CANNOT PASS THROUGH, and that is the load-bearing half. `figmaAnatomyPlan`'s
 * signature names `intent`, `appearance`, `size`, `state`, `leading` and `trailing` and nothing else, so a
 * def declaring some fourth `variants` axis cannot be projected. Iterating around it — the obvious
 * implementation — emits a set that is internally consistent, combines cleanly, and is silently missing a
 * whole axis: exactly the failure `figmaAxisNames` was written for (#487 §5's 189-vs-756). A throw here
 * is the def's author being told the projection does not reach their axis yet.
 *
 * SIZE AND SLOT FILL ARE ALWAYS ENUMERATED, whether or not they are declared axes, because
 * `planComponentName` ALWAYS emits `size=`, `leading=` and `trailing=` coordinates. Pinning one value
 * for an undeclared axis would give every member an identical coordinate on it, which is fine — but
 * pinning `size` while the def declares three would give N members one name, and `planSetLayout` refuses
 * a duplicate coordinate. The name is the wire format, so the enumeration has to cover what the name
 * carries rather than what the declaration lists.
 *
 * `swapTarget` is an option and not a def field for the reason #513 recorded live: which component fills
 * a slot is a fact about the FILE, not about the component. The same def builds in a file whose
 * placeholder icon is called anything, so the caller that knows the file nominates it.
 */
export const figmaAnatomySet = (def: ComponentDef, opts: { swapTarget?: string } = {}): AnatomyPlan[] => {
  const fp = def.figmaProperties;
  if (!fp) throw new Error(`${def.id}: no figmaProperties block — nothing declares which axes become a Figma set`);
  const declared = fp.variantAxes ?? [];
  const unprojectable = declared.filter((a) => !PROJECTABLE_VARIANT_AXES.includes(a));
  if (unprojectable.length)
    throw new Error(`${def.id}: figmaAnatomySet cannot project variant axes [${unprojectable.join(', ')}] — figmaAnatomyPlan takes ${PROJECTABLE_VARIANT_AXES.join('/')} and nothing else, and enumerating around an axis emits a set that is silently missing it`);
  const slotAxes = (fp.slotAxes ?? []).map((s) => s.name);
  const unprojectableSlots = slotAxes.filter((s) => !PROJECTABLE_SLOT_AXES.includes(s));
  if (unprojectableSlots.length)
    throw new Error(`${def.id}: figmaAnatomySet cannot project slot axes [${unprojectableSlots.join(', ')}] — figmaAnatomyPlan takes ${PROJECTABLE_SLOT_AXES.join('/')} and nothing else`);

  // `[undefined]` rather than `[]` for an axis the def does not declare: one pass through the loop with
  // no coordinate on it, which is what `figmaAnatomyPlan` reads as "structure only on that axis".
  const one = <T>(xs: T[] | undefined, on: boolean): (T | undefined)[] => (on && xs?.length ? xs : [undefined]);
  const intents = one(def.variants?.intent, declared.includes('intent'));
  const appearances = one(def.variants?.appearance, declared.includes('appearance'));
  const states = one(fp.stateAxis?.values, !!fp.stateAxis);
  // Not gated on `declared.includes('size')` — see the header note on why the NAME decides this.
  const sizes = def.variants?.size ?? [];
  const bools = (name: string): boolean[] => (slotAxes.includes(name) ? [true, false] : [false]);

  // NESTED IN THE ORDER `planComponentName` WRITES, so the grid `planSetLayout` derives reads the way the
  // coordinate does — intent down to trailing, with the last varying axis becoming the columns.
  const plans: AnatomyPlan[] = [];
  for (const intent of intents)
    for (const appearance of appearances)
      for (const size of sizes)
        for (const state of states)
          for (const leading of bools('leading'))
            for (const trailing of bools('trailing'))
              plans.push(figmaAnatomyPlan(def, size, {
                leading,
                trailing,
                ...(opts.swapTarget ? { swapTarget: opts.swapTarget } : {}),
                ...(intent ? { intent } : {}),
                ...(appearance ? { appearance } : {}),
                ...(state ? { state } : {}),
              }));
  return plans;
};

/** Every part name in a plan, depth-first. */
export const planPartNames = (n: FigmaNodePlan): string[] => [n.name, ...n.children.flatMap(planPartNames)];

/** Every Figma variable name a plan binds — including PAINT bindings, which are a different API
 *  (`setBoundVariableForPaint`) but resolve against the same variable namespace. Folded in here
 *  rather than given a separate walker precisely because the namespace is shared: text and effect
 *  styles got their own walkers because they check against their own name sets, and a paint does
 *  not. Getting this wrong the other way would silently exempt every paint from the emit gate. */
export const planBoundVars = (n: FigmaNodePlan): string[] =>
  [...Object.values(n.bound), ...paintVarsOwn(n), ...readVarsOwn(n), ...n.children.flatMap(planBoundVars)];

/** This node's own paint variables (not its children's). */
const paintVarsOwn = (n: FigmaNodePlan): string[] =>
  [n.paints?.fills, n.paints?.strokes, n.descendantFills].filter((x): x is string => !!x);

/** Every variable name a plan REFERENCES without binding — today just `absoluteInset`, which Figma's
 *  `x`/`y` cannot bind but which the payload still resolves by name to read a value.
 *
 *  Folded into `planBoundVars` rather than given a separate check, because the question the emit gate
 *  asks is "does this name exist in the emitted variables" and the answer does not depend on which
 *  setter consumes it. Keeping it out would have made the one geometry value on the new part kind the
 *  only one in the projection nothing verified — and an unresolvable inset silently positions a focus
 *  ring flush against the border it exists to be distinguishable from. */
const readVarsOwn = (n: FigmaNodePlan): string[] => (n.absoluteInset ? [n.absoluteInset] : []);

/** Every paint variable a plan binds, depth-first. Exported for the gate that asserts a skinned plan
 *  actually carries paints — the check that a coordinate resolved to something. */
export const planPaintVars = (n: FigmaNodePlan): string[] =>
  [...paintVarsOwn(n), ...n.children.flatMap(planPaintVars)];

/** Every node in a plan carrying a `propertyRef`, depth-first. */
const refNodes = (n: FigmaNodePlan): FigmaNodePlan[] =>
  [...(n.propertyRef ? [n] : []), ...n.children.flatMap(refNodes)];

/**
 * The COMPONENT PROPERTIES to declare on a set — derived from the nodes the plans actually BUILD,
 * not from the def's declaration.
 *
 * That direction is the whole point, and it is a live finding rather than a preference. Button's def
 * declares `swaps` for BOTH visuals, but #510's grid is uniformly `leading=true, trailing=false`, so
 * no member has a trailing node. Declaring from the def would add a `trailingVisual` property that
 * no node in the set references — which Figma accepts, shows in the properties panel, and does
 * nothing at all when a designer changes it. Deriving from the built nodes cannot produce one.
 *
 * The reverse orphan — a node referencing a property nothing declared — is the one direction Figma
 * checks for us: `componentPropertyReferences` THROWS on an unknown name. So this returns the
 * closure of what the plans reference, and the payload's read-back covers what Figma then did with it.
 *
 * Refuses a CONTRADICTION rather than picking a winner: two plans in one set whose same-named
 * property disagrees on type or placeholder is a def-tier or caller-tier error, and a set carrying
 * whichever the iteration order happened to reach last would be silently wrong in a file.
 */
export const planSetProperties = (plans: AnatomyPlan[]): FigmaPropertyPlan[] => {
  const byName = new Map<string, FigmaPropertyPlan>();
  for (const plan of plans) {
    for (const n of refNodes(plan.root)) {
      const ref = n.propertyRef!;
      let prop: FigmaPropertyPlan;
      if (ref.field === 'characters') {
        // The placeholder is the node's own `characters`, so the property's default and the text a
        // member actually shows cannot disagree — they are one value read once.
        prop = { name: ref.prop, type: 'TEXT', default: n.characters ?? '' };
      } else if (ref.field === 'mainComponent') {
        // No target nominated means no id for Figma to default to, and `''` is rejected outright — so
        // the property is not emitted and the payload says so, rather than a swap property that
        // exists and defaults to nothing.
        if (!n.swapTarget) continue;
        prop = { name: ref.prop, type: 'INSTANCE_SWAP', swapTarget: n.swapTarget };
      } else {
        // The node EXISTS in this plan, so the part is present — an absent optional part builds no
        // node and therefore no reference. `true` is read off that fact, not assumed.
        prop = { name: ref.prop, type: 'BOOLEAN', default: true };
      }
      const prev = byName.get(prop.name);
      if (prev && JSON.stringify(prev) !== JSON.stringify(prop))
        throw new Error(`planSetProperties: '${prop.name}' is declared two different ways across the set — ${JSON.stringify(prev)} vs ${JSON.stringify(prop)}`);
      byName.set(prop.name, prop);
    }
  }
  return [...byName.values()];
};

/** Every Figma text style a plan applies. */
export const planTextStyles = (n: FigmaNodePlan): string[] =>
  [...(n.textStyle ? [n.textStyle] : []), ...n.children.flatMap(planTextStyles)];

/** Every Figma effect style a plan applies. Its own walker, matching `planTextStyles` — see
 *  `FigmaNodePlan.effectStyle` for why the three namespaces stay apart. */
export const planEffectStyles = (n: FigmaNodePlan): string[] =>
  [...(n.effectStyle ? [n.effectStyle] : []), ...n.children.flatMap(planEffectStyles)];

/**
 * Cross-check a plan against what the engine actually EMITS. This is the gate that makes the
 * projection more than an assertion about itself: `emitted` is read out of
 * `out/figma/<brand>/*.json`, so a binding that resolves in the token tree but never reaches a
 * Figma collection is caught here rather than in a live file at paste time.
 *
 * Variables, text styles and effect styles are checked against SEPARATE sets on purpose — they are
 * three separate namespaces in Figma, and a single merged set would let one pass by matching
 * another of the same name (or, more likely, mask the fact that one of them was never emitted at
 * all). Note that the shadow styles emit under BOTH `shadow/*` and `shadow-dark/*`, so a merged
 * set would also make a light-mode-only name look satisfiable.
 */
export const planBindingErrors = (
  plan: AnatomyPlan,
  emitted: Set<string>,
  textStyles?: Set<string>,
  effectStyles?: Set<string>,
): string[] => [
  ...[...new Set(planBoundVars(plan.root))].filter((v) => !emitted.has(v)).map((v) => `bound variable '${v}' is not in the emitted Figma variables`),
  ...(textStyles ? [...new Set(planTextStyles(plan.root))].filter((s) => !textStyles.has(s)).map((s) => `text style '${s}' is not in the emitted Figma text styles`) : []),
  ...(effectStyles ? [...new Set(planEffectStyles(plan.root))].filter((s) => !effectStyles.has(s)).map((s) => `effect style '${s}' is not in the emitted Figma effect styles`) : []),
];

/**
 * The variant COORDINATE — `key=value, key=value`, and nothing else.
 *
 * `combineAsVariants` derives a set's axes from its members' names, so this is a wire format rather
 * than a label: `state=hover` in the name becomes a `state` property with `hover` among its values.
 *
 * **NO `button/` PREFIX, and this is load-bearing.** Figma does not strip a slash prefix before
 * parsing the axes — it makes the prefix part of the FIRST AXIS KEY. A set built from
 * `button/intent=primary, …` comes back with a property literally named **`button/intent`**, which no
 * amount of correct token binding fixes and which a designer sees in the properties panel. Measured
 * live, not read: the same two components renamed without the prefix derive a clean `intent`. So the
 * component's identity lives on the SET (`set.name = plan.component`), and its members carry only
 * their coordinate. The single-component path uses the same name for one reason — a lone component
 * pasted today may be combined tomorrow, and a name that only works before combining is a trap.
 *
 * Slot fill stays a BOOLEAN-ish axis (`leading=true`) because #326's asymmetric padding makes slot
 * presence a real variant rather than a toggle — #487 §4, and the reason a boolean property cannot
 * carry it.
 *
 * BUT ONLY FOR A COMPONENT THAT HAS THAT SLOT AS AN AXIS (#712). This used to write both coordinates
 * unconditionally, on the reasoning that a constant coordinate is harmless — every member carries the
 * same value, so it costs a name segment and no grid dimension. That reasoning holds for the LAYOUT
 * and fails for the NAME, because the name is what `combineAsVariants` reads: a coordinate in it
 * becomes a property in the designer's panel whether it varies or not. IconButton's icon is required,
 * so it declares no slot axes at all — and its set came back with two single-valued phantom
 * properties, a def declaring FOUR axes projecting a set carrying SIX. Caught by the axis-parity gate,
 * which is #487 §5's 189-vs-756 shape running in the other direction.
 */
export const planComponentName = (plan: AnatomyPlan): string =>
  [
    ...(plan.coord.intent ? [`intent=${plan.coord.intent}`] : []),
    ...(plan.coord.appearance ? [`appearance=${plan.coord.appearance}`] : []),
    `size=${plan.size}`,
    ...(plan.coord.state ? [`state=${plan.coord.state}`] : []),
    ...(plan.slotAxes.includes('leading') ? [`leading=${plan.slots.leading}`] : []),
    ...(plan.slotAxes.includes('trailing') ? [`trailing=${plan.slots.trailing}`] : []),
  ].join(', ');

/**
 * WHAT A MISSING NEST TARGET ACTUALLY IS, in the message the designer reads (#681).
 *
 * The live 648-variant build reported 108 identical misses — every `state=focus-visible` member — saying
 * `focus-ring` was "not in this file; publish the shared component first". It WAS in the file, as a
 * component SET. `findAllWithCriteria({types:['COMPONENT']})` matches `ComponentNode` and never
 * `ComponentSetNode`, so the set's own name never entered the lookup while its CHILDREN were there under
 * their variant coordinates. Three distinct file states and a genuinely absent node all produced one
 * string, and the one piece of advice it gave was wrong for three of the four.
 *
 * WHAT CHANGED WHEN THE SET BECAME RESOLVABLE (#681's policy, 2026-08-12). A `COMPONENT_SET` is no
 * longer a dead end: a part declaring `nesting: nest-fixed` names a coordinate, and the executors nest
 * the member carrying it. So the `COMPONENT_SET` row below is no longer "this writer cannot read a set"
 * — it is now reached ONLY when the def named no coordinate for it, and its advice says so. The row that
 * used to be the 108-miss case is now a diagnosis of the DEF rather than of the file, which is why its
 * wording moved even though its `found` key did not.
 *
 * DIAGNOSIS ONLY REMAINS THE BOUNDARY for everything the def did not choose. What the executors resolve
 * is the coordinate a def states; what they still refuse to do is pick one for it. A message that
 * guessed would be worse than one that explains, because a wrong ring that builds looks like success.
 *
 * SHARED BY BOTH EXECUTORS, and it has to be a function rather than a constant because the paste path is
 * an emitted STRING that cannot import: the plugin calls this directly, and `PAYLOAD_BUILD` interpolates
 * its output for each case at emit time. That is the only way the two call sites cannot drift in wording
 * — which they would, being 500 lines and one language boundary apart.
 */
export const nestMissAdvice = (found: 'COMPONENT_SET' | 'INSTANCE' | 'OTHER' | 'ABSENT'): string => {
  switch (found) {
    case 'COMPONENT_SET':
      // WAS the 108-miss case; now the case where the file holds a set and the DEF did not say which
      // member to nest — i.e. a part declaring `nest-exposed`, whose coordinate is the consumer's to
      // drive and which needs an exposed nested property this write does not yet create (#681 defers
      // exposure pending the property-count measurement). A `nest-fixed` part never reaches this row,
      // because its coordinate is resolved against the set; if the coordinate matches nothing it gets
      // `nestVariantMissAdvice` instead, which is a different sentence about a different mistake.
      return 'found a COMPONENT_SET of that name and the def names no variant for it; nothing built — an exposed nest needs a nested property this write does not create yet, so declare nest-fixed with a coordinate, or publish one variant as its own component';
    case 'INSTANCE':
      // Called out separately because duplicating a variant out of a set is the obvious workaround for
      // the case above, and it lands here — where the old message said "not in this file" of a node the
      // designer had just made.
      return 'found an INSTANCE of that name, not a component; nothing built — nest the main component instead of a copy of it';
    case 'OTHER':
      return 'found a node of that name that is not a component; nothing built — rename it, or publish the component under this name';
    case 'ABSENT':
      // The one row the original message got right, kept verbatim.
      return 'not in this file; nothing built — publish the shared component first';
  }
};

/**
 * THE FIFTH MISS (#681): the named set is in the file and resolvable, the def named a coordinate, and
 * no member carries it.
 *
 * A DISTINCT FILE STATE from the four `nestMissAdvice` covers, and the reason it needs its own sentence
 * is that it is the only one of the five that is a defect in the DEF rather than in the file. The other
 * four all say "what you have is not what this needs"; this one says "what this def asks for does not
 * exist here", and the remedy is the opposite direction — edit the def, or add the variant.
 *
 * It is also the one that arrives silently. The four above are reached by a lookup returning nothing,
 * which is loud. This is reached by a lookup returning a SET FULL OF VALID MEMBERS, none of them the
 * requested one — and the tempting behavior at that point is to nest the set's first child, which is
 * `#656` exactly (`nesting`'s own reason for existing) and would look like success. So: nothing built,
 * and the message lists what IS there.
 *
 * NAMES THE COORDINATE AND THE MEMBERS, both, because either alone is unactionable. The coordinate
 * alone ("no member matches color=inverse") does not say what to write instead; the member list alone
 * does not say what was asked for, and a designer reading a list of four valid ring variants has no way
 * to tell which axis the def got wrong. A rename in the file and a typo in the def produce the same
 * lookup failure and different fixes.
 *
 * It covers TWO mistakes in one sentence — a coordinate that matches nothing, and one that matches more
 * than one member because it under-specifies the set's axes. Deliberately not split: both are "the def's
 * coordinate does not identify a member of this set", both are fixed by editing the same line, and the
 * member list is what distinguishes them on sight (a `{color:'default'}` against `color=default, size=md`
 * and `color=default, size=lg` shows its own missing axis).
 *
 * `wanted` is rendered in FIGMA'S OWN `axis=value` spelling rather than as JSON, so it can be compared
 * character-for-character against the member names printed beside it. That is the whole point of
 * printing them together: the difference is meant to be visible without translation.
 *
 * Shared by both executors for the same reason `nestMissAdvice` is — the paste path interpolates it at
 * emit time and cannot import. Unlike that one it takes RUNTIME arguments, so the payload cannot bake
 * the string: it interpolates this function's SOURCE and calls it in the file. Which is why this is
 * written as a self-contained expression with no closure over anything in this module (see
 * `nestVariantMissAdviceSrc`).
 *
 * NO TEMPLATE LITERAL IN THE BODY, and that is a constraint of shipping the source rather than a style
 * choice. `stripPayloadComments` deletes any line whose first non-space characters are `//`, which is
 * safe only while no payload contains a multi-line template literal — a `//` line inside one would be
 * data. `test.ts` asserts that precondition by refusing a backtick ANYWHERE in the emitted payload, so
 * the one-line interpolation this first used to spell an `axis=value` pair tripped it — a helper with no
 * multi-line literal in it, failing a check about multi-line literals. Written with `+` concatenation
 * instead, rather than teaching the gate to tell the two apart: a whole-payload backtick ban is blunt,
 * cheap and impossible to satisfy by accident, and the lexer that would distinguish a safe backtick from
 * an unsafe one is the exact thing that gate says to write BEFORE anything relies on the distinction.
 * A helper shipped as source inherits its host's constraints — that is the price of one definition.
 */
export const nestVariantMissAdvice = (wanted: Record<string, string>, members: readonly string[]): string =>
  'found a COMPONENT_SET of that name, and no member matching '
  + Object.entries(wanted).map(([k, v]) => k + '=' + v).join(', ')
  + '; nothing built — the def asks for a variant this set does not have. Members: '
  + (members.length ? members.join(' | ') : '(none)')
  + '. Fix the coordinate in the def, or add the variant to the set — nothing is nested by guess, because a valid wrong ring looks like a success';

/**
 * `nestVariantMissAdvice` AS SOURCE, for the paste payload to call in the file.
 *
 * The four fixed sentences are interpolated as pre-computed STRINGS (`JSON.stringify(nestMissAdvice(…))`)
 * because they take no arguments. This one does, so there is nothing to pre-compute — the coordinate and
 * the member list are only known in the live file. Shipping the source and calling it there is what keeps
 * ONE definition of the wording across two executors, which is the property #710 established and the
 * whole reason `nestMissAdvice` is a function.
 *
 * `Function.prototype.toString` rather than a hand-copied string literal, deliberately: a copy is a
 * second definition, and the two would drift exactly as the original two call sites did. The cost is
 * that this function must be a pure expression closing over NOTHING in this module — no imports, no
 * module constants, no helpers — because the payload has none of them. Asserted by the gate rather than
 * remembered: a body that references anything out of scope throws at paste time and nowhere earlier.
 */
export const nestVariantMissAdviceSrc = (): string => nestVariantMissAdvice.toString();

/**
 * WHICH MEMBER OF A SET A `nest-fixed` COORDINATE IDENTIFIES, or `null` (#681).
 *
 * Compares AXIS BY AXIS against each member's parsed name, never by string equality against a
 * reassembled name: Figma writes the axes in its own order, so `color=default, size=md` and
 * `size=md, color=default` are the same member and only one of them equals a def-built string. That
 * comparison would fail on a set whose axis order is not the order the def happens to list, and it
 * would fail INVISIBLY — as the fifth miss, which is a message about a def that is actually correct.
 *
 * RETURNS null WHEN MORE THAN ONE MEMBER MATCHES, not the first of them. A partial coordinate against a
 * multi-axis set is the shape that arrives by accident (`{color:'default'}` on color×size), and every
 * rule for choosing among the matches reduces to creation order — `#656`, one layer in from where
 * `nesting` was added to stop it. So an ambiguous coordinate is refused exactly like a wrong one, and
 * the caller's message lists the members, which is what makes the missing axis visible.
 *
 * A member name Figma cannot parse as coordinates (no `=`) contributes an empty coordinate set and so
 * matches nothing — the honest answer for a member somebody renamed by hand.
 *
 * SHARED BY BOTH EXECUTORS as SOURCE (`nestVariantMatchSrc`), same mechanism and same constraint as
 * `nestVariantMissAdvice`: a pure expression closing over nothing in this module, because the payload
 * has none of this module.
 */
export const nestVariantMatch = (wanted: Record<string, string>, members: readonly string[]): string | null => {
  const hits = members.filter((m) => {
    const coord: Record<string, string> = {};
    for (const kv of m.split(', ')) { const i = kv.indexOf('='); if (i > 0) coord[kv.slice(0, i)] = kv.slice(i + 1); }
    const keys = Object.keys(coord);
    // EVERY axis of the member accounted for, not merely every axis the def named. `keys.length` is the
    // ambiguity guard stated positively: a coordinate naming fewer axes than the member has cannot
    // identify it, so the two lengths must agree before the values are compared at all.
    return keys.length === Object.keys(wanted).length && keys.every((k) => coord[k] === wanted[k]);
  });
  return hits.length === 1 ? hits[0] : null;
};

/** `nestVariantMatch` as source, for the paste payload. See `nestVariantMissAdviceSrc` for why a
 *  hand-copied literal is not an option here. */
export const nestVariantMatchSrc = (): string => nestVariantMatch.toString();

/**
 * The SHELL: plan → plugin JS for `figma_execute`. Mirrors `materialise-to-figma.ts` — the
 * generated code resolves variable NAMES to live variables, so the same plan works in any file
 * that has had the token passes run against it.
 *
 * Deliberately builds ONE component, not forty (docs/28 §6): the spike's deliverable is the
 * validated schema and the projection rules, not the Figma asset.
 *
 * NO ASYNC IIFE — the body emits top-level `await` instead. `figma_execute` neither awaits nor
 * unwraps a returned Promise, so a `(async()=>{...})()` wrapper handed the caller
 * `success: true, result: undefined` ("Code returned undefined") while the component built fine.
 * That matters more here than in the token tier: `misses[]` is this payload's ONLY failure channel.
 * A variable or text style that doesn't resolve is recorded and the build continues, so a component
 * with nothing bound still looks like a success — and a discarded return value is the difference
 * between a verified paste and a frame that merely exists. Found by pasting this for real (#111).
 *
 * `misses[]` HAS A BLIND SPOT, and the two fixes below both live in it (#500, corrected): it fills
 * only when a NAME fails to resolve, so a setter that resolves its variable and then silently
 * discards the write is invisible to it. A Figma setter that accepts a call is not a Figma setter
 * that honored it. Hence:
 *
 *  - `unlockAspectRatio()` before binding. A proportion-locked node cannot hold two
 *    independent dimension bindings — the second `setBoundVariable` EVICTS the first, last-write-
 *    wins, with no throw and nothing in `misses`. It bites FRAME, COMPONENT and INSTANCE alike;
 *    `createFrame()` happens to default to unlocked, but an instance inherits the lock from its main
 *    component, and `FPO-default-icon` ships locked. Every slot binds `width` AND `height`, so this
 *    is not a corner case — it is every slot in every plan. (Was `constrainProportions=false`, which
 *    Figma's typings mark `@deprecated` in favour of this — #682. The payload calls it unconditionally:
 *    the old form needed an `in` guard because `constrainProportions` is on `LayoutMixin`, absent from
 *    some node types, while `unlockAspectRatio` is on `AspectRatioLockMixin`, which FrameNode, TextNode,
 *    InstanceNode and ComponentNode all carry.)
 *  - NO `resize()` after binding. `resize()` CLEARS every dimension binding on all three node types.
 *    Binding then resizing loses the binding; resizing then binding is fine. (`appendChild` into
 *    auto-layout and setting `layoutSizing*` are both safe — measured, not assumed.)
 */
export const planToPluginJs = (plan: AnatomyPlan): string => stripPayloadComments(`const PLAN=${JSON.stringify(plan.root)};
${PAYLOAD_PREAMBLE}
${PAYLOAD_BUILD}
const root=await build(PLAN);
figma.currentPage.appendChild(root);
const comp=figma.createComponentFromNode(root);
comp.name=${JSON.stringify(planComponentName(plan))};
// The NODE ID, not the name. Two runs of the same plan produce two identically-named components, so
// a caller verifying by name reads whichever one document order hands it — which is how #482's stale
// paste masqueraded as a failure of this one (#503). The id is the only unambiguous handle.
return {component:comp.name,id:comp.id,parts:${JSON.stringify(planPartNames(plan.root).length)},misses,codeOnly:${JSON.stringify(plan.codeOnly.length)},paints:${JSON.stringify(planPaintVars(plan.root).length)}};
`);

/**
 * STRIP the comments on the way OUT. Every payload in this file is emitted through here.
 *
 * The comments are 44% of the emitted bytes — 11,047 of a 25.9KB chunk shell, and the shell is
 * duplicated into every chunk, so the full 756-variant button paid for those 11KB 189 times. They are
 * the reason the chunk count is what it is, and they are the one part of a payload that no Figma API
 * ever reads. Stripping them roughly HALVES the chunk count for the full set. They stay in the source,
 * which is where the measurements they record belong; the emitted copy is transport.
 *
 * The tradeoff, stated because it is real: a payload read in the Figma console is now bare JS, so
 * anyone debugging a paste in isolation has to come back to this file for the why. That is the right
 * direction — the source is the record — but it is a loss, not a free win.
 *
 * FULL-LINE `//` ONLY, and deliberately so. A general comment stripper has to lex JavaScript to know
 * whether a `//` sits inside a string, a template literal or a regex, and getting that wrong corrupts
 * the payload in a way that surfaces only at paste time. A line whose FIRST non-space characters are
 * `//` cannot be inside any of those (a multi-line template literal would let one through, and this
 * file emits none — asserted by the gate, so a future one fails here rather than silently). The two
 * `/* *\/` blocks and the one trailing `//` left behind are ~200 bytes between them and are not worth
 * a lexer.
 *
 * Blank lines go too: the comments are what the blank lines separated, so leaving them behind emits
 * the blank paragraph breaks of prose that is no longer there.
 *
 * EXPORTED for the gate, and for a reason worth recording: gating it through its OUTPUT is not enough.
 * A greedier stripper — `!l.includes('//')`, which reads like a *better* comment stripper — deletes
 * `if(!id)continue; // ...`, a real guard, and every one of the 1,684 assertions stayed green. The
 * payload still parsed, carried no comments, and had no backtick. Output sampling cannot see a line
 * that is simply gone, so the pass is tested against crafted input where the answer is known.
 */
export const stripPayloadComments = (js: string): string =>
  js
    .split('\n')
    .filter((l) => l.trim() !== '' && !l.trimStart().startsWith('//'))
    .join('\n') + '\n';

/**
 * The payload HEAD, shared verbatim by the single-component and the SET path: four name→object
 * resolvers, one per Figma namespace, plus `misses[]`.
 *
 * Shared rather than copied because the single-component payload is the one carrying thirteen gate
 * assertions, so a second copy is exactly where a divergence would rot unnoticed — the SET path would
 * pass every offline check while pasting subtly different JS. One string, one set of gates.
 */
const PAYLOAD_PREAMBLE = `const vars=await figma.variables.getLocalVariablesAsync();
const byName=new Map(vars.map(v=>[v.name,v]));
const styles=await figma.getLocalTextStylesAsync();
const styleByName=new Map(styles.map(s=>[s.name,s]));
const effects=await figma.getLocalEffectStylesAsync();
const effectByName=new Map(effects.map(s=>[s.name,s]));
// Swap targets are resolved by NAME across the whole file, not just the current page — the FPO icon
// lives wherever the file's author put it, and \`currentPage.findAll\` would miss it silently.
await figma.loadAllPagesAsync();
const comps=figma.root.findAllWithCriteria({types:['COMPONENT']});
const compByName=new Map(comps.map(c=>[c.name,c]));
// A SECOND criteria call, sets only (#681). Two calls rather than one widened call for the reason the
// executor's port states: the COMPONENT map is instantiated from and a ComponentSetNode has no
// createInstance, so one map per node type keeps each read honest about what it holds.
const compSets=figma.root.findAllWithCriteria({types:['COMPONENT_SET']});
const setByName=new Map(compSets.map(s=>[s.name,s]));
// The two shared miss helpers, shipped as SOURCE rather than as baked strings: both take runtime
// arguments (the coordinate, the member list) that only exist in the live file. One definition, in
// anatomy-figma.ts, called by both executors — which is what stops the wording drifting.
const nestVariantMatch=${nestVariantMatchSrc()};
const nestVariantMissAdvice=${nestVariantMissAdviceSrc()};
const misses=[];`;

/**
 * The recursive node builder, also shared. Every hard-won detail lives in here — the unlock before
 * binding, the four API shapes, and the two read-backs — which is the other half of why this is one
 * string: those are the lines a divergent copy would silently lose.
 */
const PAYLOAD_BUILD = `const build=async(n)=>{
  let node;
  if(n.type==='TEXT'){node=figma.createText();}
  else if(n.type==='INSTANCE_SWAP'){
    // A slot with no resolvable target becomes a placeholder FRAME — but it says so. #482 shipped
    // the frame WITHOUT saying so, because there was no INSTANCE_SWAP branch at all: the plan
    // declared swappable slots and the paste built empty 24x24 boxes.
    const target=n.swapTarget?compByName.get(n.swapTarget):undefined;
    if(!n.swapTarget)misses.push(n.name+'.swapTarget -> (none nominated; built as a placeholder frame)');
    else if(!target)misses.push(n.name+'.swapTarget -> '+n.swapTarget);
    node=target?target.createInstance():figma.createFrame();
  }
  else if(n.type==='NESTED_INSTANCE'){
    // A SHARED component the file must already have — the first node type that can fail because of
    // what is absent from the FILE rather than from the plan.
    // NO placeholder frame, and this is the opposite call from INSTANCE_SWAP above deliberately. An
    // unstroked frame in a focus ring's place is invisible and reads as a ring that built fine; a slot's
    // placeholder is a box a designer can still fill. So a missing ring builds NOTHING and says so.
    const nested=compByName.get(n.nestTarget);
    // A SET the def named a coordinate in (#681). Checked only when the plain-component lookup missed:
    // a component and a set can share a name, and the component needs no coordinate to be unambiguous.
    const set=!nested&&n.nestVariant?setByName.get(n.nestTarget):undefined;
    if(set){
      // Resolve the def's coordinate against the MEMBERS' own names, axis by axis. \`nestVariantMatch\`
      // returns null for no match AND for more than one — an under-specified coordinate is refused, not
      // resolved by taking the first, because every rule for choosing is creation order (#656).
      const members=(set.children||[]).map(c=>c.name);
      const hit=nestVariantMatch(n.nestVariant,members);
      // THE FIFTH MISS: the file has the set, the def named a coordinate, no member carries it. Nothing
      // is built — nesting the first child here is the #656 error \`nesting\` exists to stop, and a valid
      // wrong ring looks like a success.
      if(!hit){misses.push(n.name+'.nestVariant -> '+n.nestTarget+' ('+nestVariantMissAdvice(n.nestVariant,members)+')');return null;}
      // The MEMBER is instantiated, never the set — Figma has no instance-of-a-set. The member is a plain
      // component, which is why the COMPONENT search above already holds it under its variant coordinate:
      // the members were always findable, and nothing knew which to ask for until the def said.
      const member=compByName.get(hit);
      if(!member){misses.push(n.name+'.nestVariant -> '+n.nestTarget+' (matched member '+hit+' is not instantiable; nothing built — the COMPONENT_SET and COMPONENT searches disagree about this file)');return null;}
      node=member.createInstance();
    }
    else if(!nested){
      // DIAGNOSE before reporting (#681): a second search, by name across every node type, so the miss
      // can say what is actually in the file. Only on the failure path — the happy path pays nothing.
      // A SET still reaches here when the def named no coordinate for it (\`nest-exposed\`), which is what
      // the COMPONENT_SET sentence now says.
      const other=figma.root.findAll(x=>x.name===n.nestTarget)[0];
      const found=!other?${JSON.stringify(nestMissAdvice('ABSENT'))}:other.type==='COMPONENT_SET'?${JSON.stringify(nestMissAdvice('COMPONENT_SET'))}:other.type==='INSTANCE'?${JSON.stringify(nestMissAdvice('INSTANCE'))}:${JSON.stringify(nestMissAdvice('OTHER'))};
      misses.push(n.name+'.nestTarget -> '+n.nestTarget+' ('+found+')');return null;
    }
    else{node=nested.createInstance();}
  }
  else{node=figma.createFrame();node.clipsContent=false;}
  node.name=n.name;
  // Before ANY dimension binding. See the header note — a locked node keeps only the last of the two.
  node.unlockAspectRatio();
  if(n.textStyle){
    const st=styleByName.get(n.textStyle);
    if(!st)misses.push(n.name+'.textStyle -> '+n.textStyle);
    else{
      // The STYLE'S OWN font, loaded before the style is applied. \`setTextStyleIdAsync\` pulls in a
      // family/style pair (\`Inter Semi Bold\`) that need not be the one \`createText\` starts on, and
      // Figma requires a font to be loaded before any text write. Loading here rather than once at the
      // top because the plan is what knows which styles it uses, and a hard-coded \`Inter Regular\`
      // would be a guess about a brand's typography.
      try{await figma.loadFontAsync(st.fontName);}catch(err){misses.push(n.name+'.font -> '+st.fontName.family+' '+st.fontName.style+' ('+err.message+')');}
      await node.setTextStyleIdAsync(st.id);
    }
  }
  // The PLACEHOLDER, after the style so the copy is set on a node already carrying the right font.
  // Both orders work (measured — the style survives a prior \`characters\` write, and vice versa), so
  // this one is chosen for reading order rather than necessity.
  if(typeof n.characters==='string'){
    try{node.characters=n.characters;}catch(err){misses.push(n.name+'.characters -> '+JSON.stringify(n.characters)+' ('+err.message+')');}
    // READ BACK, same discipline as the bindings: a text node that silently kept nothing is exactly
    // the empty-label set this step exists to stop shipping.
    if(node.characters!==n.characters)misses.push(n.name+'.characters -> DISCARDED (set '+JSON.stringify(n.characters)+', reads '+JSON.stringify(node.characters)+')');
  }
  if(n.effectStyle){
    const ef=effectByName.get(n.effectStyle);
    if(!ef)misses.push(n.name+'.effectStyle -> '+n.effectStyle);
    else await node.setEffectStyleIdAsync(ef.id);
  }
  if(n.layoutMode){
    node.layoutMode=n.layoutMode;
    node.primaryAxisAlignItems=n.primaryAxisAlignItems;
    node.counterAxisAlignItems=n.counterAxisAlignItems;
    node.primaryAxisSizingMode=n.primaryAxisSizingMode;
    node.counterAxisSizingMode=n.counterAxisSizingMode;
  }
  // \`wrote\` is what was ACTUALLY set, which is not the same as what the plan declared — a name that
  // does not resolve is skipped below. The read-back iterates this rather than the declaration, so an
  // unresolved name reports its one true cause instead of also claiming Figma discarded a write that
  // was never attempted.
  const wrote=[];
  for(const [prop,varName] of Object.entries(n.bound)){
    const v=byName.get(varName);
    if(!v){misses.push(n.name+'.'+prop+' -> '+varName);continue;}
    node.setBoundVariable(prop,v);
    wrote.push(prop);
  }
  // PAINTS — a fourth API shape. \`setBoundVariableForPaint\` RETURNS a new paint rather than mutating
  // the node, so the result must be assigned back into a fills/strokes ARRAY; forgetting the
  // assignment is a no-op that throws nothing.
  const paint=(varName,where)=>{
    const v=byName.get(varName);
    if(!v){misses.push(n.name+'.'+where+' -> '+varName);return null;}
    return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',v);
  };
  // Same reason as \`wrote\` above: only a paint that was actually assigned can have been discarded.
  const painted={};
  if(n.paints&&n.paints.fills){const p=paint(n.paints.fills,'fills');if(p){node.fills=[p];painted.fills=1;}}
  if(n.paints&&n.paints.strokes){
    const p=paint(n.paints.strokes,'strokes');
    // A stroke variable with no strokeWeight paints nothing visible, so the border appearance would
    // bind correctly and render as no border at all.
    // BORDER-BOX, and \`strokesIncludedInLayout\` defaults the other way. Left at Figma's default the
    // stroke is ADDED to the auto-layout size, so an outline button measured 62 wide where the filled
    // one measured 60 — swapping \`appearance\` moved the footprint, which is the one thing a variant
    // axis must not do. It showed up on the hug axis only: the fixed (bound) height absorbed the same
    // 2px silently, so a component with two fixed axes would have hidden this completely.
    if(p){node.strokes=[p];painted.strokes=1;if(!node.strokeWeight)node.strokeWeight=1;node.strokeAlign='INSIDE';if('strokesIncludedInLayout' in node)node.strokesIncludedInLayout=false;}
  }
  if(n.descendantFills){
    // The ink lives on the VECTORs inside the swapped instance, not on the instance itself — an
    // instance fill paints a square behind the glyph. Verified to survive createComponentFromNode.
    const vecs=node.findAll?node.findAll(x=>x.type==='VECTOR'):[];
    if(vecs.length===0)misses.push(n.name+'.descendantFills -> '+n.descendantFills+' (no VECTOR inside the instance to paint)');
    for(const vec of vecs){const p=paint(n.descendantFills,'descendantFills');if(p)vec.fills=[p];}
  }
  // READ BACK. The name resolved and the setter did not throw, which is not the same as the binding
  // being there — see the header note. This closes \`misses[]\`'s blind spot generically, so the next
  // silently-discarded write is reported by the paste instead of being found by probing months later.
  const got=node.boundVariables||{};
  for(const prop of wrote)
    if(!got[prop])misses.push(n.name+'.'+prop+' -> DISCARDED (resolved, set, not retained)');
  // Paints read back too, and from the ARRAY rather than the node — a paint binding lives on the
  // paint object, so \`boundVariables.fills\` is not where it is.
  const boundPaint=(arr)=>!!(arr&&arr[0]&&arr[0].boundVariables&&arr[0].boundVariables.color);
  if(painted.fills&&!boundPaint(node.fills))misses.push(n.name+'.fills -> DISCARDED (paint set, not retained)');
  if(painted.strokes&&!boundPaint(node.strokes))misses.push(n.name+'.strokes -> DISCARDED (paint set, not retained)');
  // FLOW CHILDREN FIRST, absolute ones after — two passes, because an absolute child is positioned
  // against its parent's FINAL size and the parent hugs its flow content. Positioning inside one loop
  // would read \`node.width\` mid-append and silently make the result depend on the part's ORDER in the
  // def: correct while the ring is declared last, and quietly wrong the day someone reorders \`children\`.
  const absolutes=[],centered=[];
  for(const c of n.children){
    const kid=await build(c);
    // A NESTED_INSTANCE whose shared component is missing returns null — the child is skipped and the
    // rest of the tree still builds, so the paste reports one precise miss instead of failing whole.
    if(!kid)continue;
    node.appendChild(kid);
    if(c.absoluteInset)absolutes.push([c,kid]);
    if(c.absoluteCenter)centered.push([c,kid]);
    // Zero opacity, written straight rather than bound: a brand does not get to theme a label under a
    // spinner to half-visible. See the plan field's note.
    if(c.zeroOpacity)kid.opacity=0;
  }
  // A CENTERED absolute child (#612's pending spinner with no leading cell to take). Applied by the
  // parent for the same reason the inset ones are — \`layoutPositioning\` only means anything inside an
  // auto-layout parent, and the centering is measured off the parent's box.
  for(const [c,kid] of centered){
    // Written via a variable so this statement is not BYTE-IDENTICAL to the ring's lift above. A test
    // mutates that one by string-replacing \`kid.layoutPositioning='ABSOLUTE';\` — and \`String.replace\`
    // with a string pattern replaces only the FIRST occurrence, so a duplicated statement here silently
    // stole the mutation and the ring's own gate went green while unmutated. Caught by that gate failing
    // when this loop was added; keep them textually distinct.
    const lift='ABSOLUTE';kid.layoutPositioning=lift;
    // NOT resized: unlike the ring, a centered overlay keeps its own square size — the \`size\` binding
    // is already on it, and \`resize\` would CLEAR that binding (the comment on the ring's resize says
    // so, and there it is safe only because an absolute part binds no dimensions).
    kid.x=(node.width-kid.width)/2;kid.y=(node.height-kid.height)/2;
    // Centered on both axes so the spinner stays over the label's middle when a designer resizes the
    // variant. STRETCH would distort it; CENTER is the constraint that matches the geometry.
    kid.constraints={horizontal:'CENTER',vertical:'CENTER'};
    // READ BACK, same discipline as the ring's. A centered child that quietly stayed in the flow ADDS a
    // cell — which is the precise defect this whole mechanism exists to prevent, so it must not fail
    // silently: the button would grow by the spinner's cell exactly as it did before #612.
    if(kid.layoutPositioning!=='ABSOLUTE')misses.push(c.name+'.layoutPositioning -> DISCARDED (set ABSOLUTE, reads '+kid.layoutPositioning+'; the spinner would take a cell and the button would grow on pending)');
  }
  // Applied by the PARENT, because every fact here is about the child's relationship to it:
  // \`layoutPositioning\` is only meaningful inside an auto-layout parent, and the parent's size is what
  // the inset is measured from.
  for(const [c,kid] of absolutes){
    const v=byName.get(c.absoluteInset);
    if(!v){misses.push(c.name+'.absoluteInset -> '+c.absoluteInset);continue;}
    kid.layoutPositioning='ABSOLUTE';
    // The VALUE, read from the variable, because \`x\`/\`y\` accept no binding — the one place in this
    // payload where a resolved number is written instead of a binding, and the reason the plan carries a
    // name rather than a number (the plan stays brand-invariant; the freeze happens here, per file).
    // \`resolveForConsumer\` rather than reading \`valuesByMode\`: the value is itself an ALIAS to a
    // dimension primitive, and the raw map hands back a VARIABLE_ALIAS object rather than a number.
    const off=v.resolveForConsumer(kid).value;
    if(typeof off!=='number'){misses.push(c.name+'.absoluteInset -> '+c.absoluteInset+' resolved to '+JSON.stringify(off)+', not a number');continue;}
    // Grown on every side: a ring at offset 2 sits 2px OUTSIDE its target, so it is 2×offset larger
    // than the parent and starts at -offset.
    // \`resize\` is safe HERE and nowhere else in this payload: it clears dimension bindings, and an
    // absolute part binds none (its size IS the parent's, so \`bound\` is empty by construction — gated).
    kid.resize(node.width+off*2,node.height+off*2);
    kid.x=-off;kid.y=-off;
    // STRETCH on both axes so the ring tracks its target when a designer resizes a variant. Without it
    // the ring keeps the size it was pasted at and widening the button leaves it behind — silently,
    // because it looks correct at the one size it was built.
    kid.constraints={horizontal:'STRETCH',vertical:'STRETCH'};
    // READ BACK, the same discipline as every other setter here. \`layoutPositioning\` is rejected on a
    // child of a non-auto-layout parent, and an absolute child that quietly stayed in the flow ADDS a
    // cell to the row — the one thing the ring must not do to its host's geometry.
    if(kid.layoutPositioning!=='ABSOLUTE')misses.push(c.name+'.layoutPositioning -> DISCARDED (set ABSOLUTE, reads '+kid.layoutPositioning+'; the ring would take a cell in the row)');
  }
  return node;
};`;

/**
 * DECLARE the component properties on a live set. Expects `set`, `PROPS`, `compByName` and `misses`
 * in scope; leaves `propIds`.
 *
 * Shared by the single-shot and the CHUNKED payload for the same reason `PAYLOAD_PREAMBLE` is shared,
 * and with more at stake: every hard-won detail below (the id must come from *after* the combine, an
 * INSTANCE_SWAP default must be a node id, a refusal must not kill the paste) is a line a second copy
 * would silently lose while passing every offline check.
 */
const PAYLOAD_DECLARE_PROPS = `// COMPONENT PROPERTIES (#487 step 6). On the SET, and only after combining — measured, not read:
// \`addComponentProperty\` on a member throws "Can only set component property definitions on a product
// component", so there is no per-variant path to fall back to. Declaring before the combine works via
// the standalone-component route and the ids are then REWRITTEN by \`combineAsVariants\` (\`children#103:19\`
// became \`children#103:21\`), which is a second reason to do it after: an id captured before the combine
// is stale by the time a reference needs it.
// SKIP BY NAME, exactly as the chunked path skips members it already built — and for a sharper reason.
// Measured live: re-declaring an existing property does NOT throw. Figma silently creates a SECOND
// property (\`leadingVisual2#113:102\`) and hands back an id whose own name does not match the key it just
// made (\`leadingVisual#113:102\`). So a re-pasted final chunk would double every property and wire the
// refs to the copies, orphaning the originals — a corrupted panel reported as a clean paste. A property
// that is already present with the right type is REUSED; its id is what the refs need anyway.
let declared={};
try{declared=set.componentPropertyDefinitions||{};}catch(err){/* already reported as UNREADABLE above */}
const byBareName=new Map();
for(const k of Object.keys(declared))if(declared[k].type!=='VARIANT')byBareName.set(k.split('#')[0],k);
const propIds=new Map();
for(const p of PROPS){
  const already=byBareName.get(p.name);
  if(already){
    if(declared[already].type===p.type){propIds.set(p.name,already);continue;}
    misses.push('property '+p.name+' -> ALREADY on the set as '+declared[already].type+' but this paste declares '+p.type+' (left alone; declaring it again would silently create a second property called '+p.name+'2)');
    continue;
  }
  let def;
  if(p.type==='INSTANCE_SWAP'){
    // Figma demands a NODE ID here. \`key\`, \`''\`, \`null\` and \`undefined\` are each rejected with
    // "Property value is incompatible with component property type" — so an unresolvable target is not
    // a missing default, it is a property that cannot be created at all.
    const target=compByName.get(p.swapTarget);
    if(!target){misses.push('property '+p.name+' -> swap target '+p.swapTarget+' (not found; property not created)');continue;}
    def=target.id;
  }else def=p.default;
  try{propIds.set(p.name,set.addComponentProperty(p.name,p.type,def));}
  catch(err){misses.push('property '+p.name+' -> '+p.type+' REFUSED ('+err.message+')');}
}`;

/**
 * WIRE the part→property references, per member, then read every one back. Expects `set`, `REFS`,
 * `propIds` and `misses`; leaves `wiredRefs`.
 */
const PAYLOAD_WIRE_REFS = `// WIRE the references, per MEMBER. They do NOT propagate: setting one on the first variant left every
// sibling's \`componentPropertyReferences\` empty, so a set wired once looks correct on the variant a
// designer happens to inspect and is inert on the other twenty.
const wiredRefs=[];
for(const member of set.children){
  for(const r of REFS){
    const node=member.findOne(x=>x.name===r.part);
    // An optional part absent from THIS variant builds no node, so there is nothing to wire — the
    // legitimate case, not an error. \`planSetProperties\` only ever declares a property some node
    // references, so a part missing everywhere would leave the property undeclared instead.
    if(!node)continue;
    const id=propIds.get(r.prop);
    if(!id)continue; // the property itself failed above and already reported its own cause
    try{
      node.componentPropertyReferences=Object.assign({},node.componentPropertyReferences||{},{[r.field]:id});
      wiredRefs.push([member.name,r.part,r.field,id]);
    }catch(err){misses.push('ref '+member.name+'/'+r.part+'.'+r.field+' -> '+r.prop+' ('+err.message+')');}
  }
}
// READ BACK every reference. Figma throws on a reference naming an unknown property, so this covers the
// other direction — a reference the setter ACCEPTED and did not retain, the same blind spot \`misses\`
// had for variable bindings before #503.
for(const [mName,part,field,id] of wiredRefs){
  const member=set.children.find(c=>c.name===mName);
  const node=member?member.findOne(x=>x.name===part):null;
  const got=node&&node.componentPropertyReferences?node.componentPropertyReferences[field]:undefined;
  if(got!==id)misses.push('ref '+mName+'/'+part+'.'+field+' -> DISCARDED (set '+id+', reads '+got+')');
}`;

/**
 * READ BACK the component properties. Expects `set`, `PROPS`, `propIds` and `defs` (the definitions
 * already read off the set); leaves `bare` and `propMiss`.
 */
const PAYLOAD_PROP_READBACK = `// READ BACK the component properties. Two failures live here that nothing else in this payload sees.
const propMiss=[];
// ONE: a DUPLICATE name is accepted silently and RENAMED — declaring \`children\` twice produced
// \`children\` and \`children2\`, no throw. So the check is that each declared name came back verbatim
// (the \`#nodeId\` suffix stripped), not that the count matches.
const bare=new Map();
for(const k of Object.keys(defs))if(defs[k].type!=='VARIANT')bare.set(k.split('#')[0],k);
for(const p of PROPS)if(propIds.has(p.name)&&!bare.has(p.name))propMiss.push('property '+p.name+' -> declared but absent from the set (Figma may have renamed it)');
// TWO: an ORPHAN — a property no node references. Figma shows it in the properties panel and changing
// it does nothing, which is indistinguishable from a broken component to the designer holding it.
const referenced=new Set();
for(const member of set.children)
  for(const n of [member].concat(member.findAll(()=>true)))
    for(const id of Object.values(n.componentPropertyReferences||{}))referenced.add(id);
for(const [name,key] of bare)if(!referenced.has(key))propMiss.push('property '+name+' -> ORPHAN (declared on the set, referenced by no node — it appears in the panel and does nothing)');`;

/**
 * A plan SET → one payload that pastes every variant and combines them into a COMPONENT_SET.
 *
 * `combineAsVariants` derives the variant axes from the component NAMES, which is why
 * `planComponentName` emits `key=value, key=value` — the name is the wire format between the paste
 * and the set, not decoration. Combining requires every member to declare the SAME axis keys, so this
 * refuses a heterogeneous set offline (a structure-only plan mixed in with skinned ones would
 * otherwise produce a set whose `state` property exists on some variants and not others, which Figma
 * accepts and no designer can use).
 *
 * ONE payload, not N. Twenty-one round trips would each re-resolve every variable, style and
 * component in the file — and, worse, a failure halfway leaves an uncombinable pile of loose
 * components that the next attempt then collides with by name. Building and combining in a single
 * call makes the whole set atomic from the caller's point of view.
 *
 * COMPONENT PROPERTIES ARE PART OF THE DELIVERABLE TOO, and for the same reason (#487 step 6). The set
 * #510 pasted was correct on every check this payload had — 21 variants, all bindings resolved, axes
 * clean, no coincidence, no footprint drift — and every button in it was BLANK, because nothing wrote
 * `characters` and nothing declared a TEXT property. The four things measured live before writing this,
 * each of which the obvious implementation gets wrong:
 *
 *  - `addComponentProperty` is legal on a SET and on a standalone component, and THROWS on a member
 *    ("Can only set component property definitions on a product component"). So it runs after the
 *    combine, which also avoids the id rewrite the combine performs on properties declared before it.
 *  - an `INSTANCE_SWAP` default must be a node **id**. The component `key`, `''`, `null` and
 *    `undefined` are each rejected, so an unresolved target means no property rather than a blank one.
 *  - `componentPropertyReferences` do NOT propagate across members. Wiring the first variant leaves the
 *    other twenty inert — visibly fine on whichever variant a designer inspects first.
 *  - non-variant keys come back from `componentPropertyDefinitions` with a `#nodeId` SUFFIX, variant
 *    keys do not. The pre-existing axis read-back compared all keys, so adding one TEXT property made
 *    it report an axis mismatch on a correct set. It now filters `type === 'VARIANT'`.
 *
 * LAYOUT IS PART OF THE DELIVERABLE, learned the hard way: `combineAsVariants` PRESERVES each member's
 * position, so appending twenty-one roots without setting one produced a set 21 variants deep and one
 * button tall, every member at the origin. Nothing was wrong with it — every binding resolved, `misses`
 * came back empty, the axes derived cleanly — and it was unusable. The grid below is computed offline
 * (the engine knows the coordinate; the payload only knows widths) and `coincident` reads it back, so
 * the next stacking bug is reported rather than seen.
 */
/**
 * The offline half of a set paste: validate the plans, compute the grid, derive the properties.
 *
 * Extracted so the single-shot and CHUNKED payloads compute the SAME layout from the SAME rules.
 * That is the point rather than tidiness: the grid is computed from the plans a caller passes, so a
 * chunk given a slice would place its members as though the slice were the whole set — `col` indices
 * restart at 0 and chunk 2 lands on top of chunk 1. Chunked pasting therefore hands the FULL plan
 * list to this and slices the *cells*, which keeps every member's coordinate absolute.
 *
 * EXPORTED for the plugin's `applyComponentPlan` (#487 step 5), which is the third caller and the
 * first outside this file. Shared rather than reimplemented because the alternative is a second copy
 * of the three set-level guards and the varying-axis grid rule, and the comments above record what
 * happens to a second copy of anything in this lane.
 *
 * BUT NOT SHAREABLE BY A PARITY GATE, and that is the load-bearing half. `test.ts` compares the two
 * executors' OBSERVABLE RESULTS — the axes Figma derived, the properties, the member coordinates —
 * precisely because both paths call THIS. A gate that instead compared two calls to `planSetLayout`
 * would be comparing one expression to itself and could not fail (docs/34). What the gate is
 * actually checking is everything downstream of here: node building, combine ordering, position
 * writing, read-backs. Do not "simplify" it into a shared-helper comparison.
 */
export const planSetLayout = (plans: AnatomyPlan[], fn: string) => {
  if (!plans.length) throw new Error(`${fn}: no plans`);
  // ONE COMPONENT PER SET, and the two guards below cannot cover it. Both reason about
  // `planComponentName`, which is built from `coord`/`size`/`slots` and deliberately carries NO
  // component — a member name is a variant coordinate and nothing else, because Figma folds a slash
  // prefix into the first axis key. So a plan from a different component has an identical axis shape
  // and a distinct coordinate: it passes the axis check, passes the duplicate check, and lands in the
  // set as a member. `set.name` comes from `plans[0].component`, so it is named after whichever plan
  // was first and the rest disappear into it — a `chip` variant filed under `button`, reported nowhere.
  // The property declarations then derive from the assembled nodes, so they describe the union of two
  // components' anatomies as though it were one API.
  const stray = plans.find((p) => p.component !== plans[0].component);
  if (stray) throw new Error(`${fn}: every plan must come from the same component — got '${plans[0].component}' and '${stray.component}'; the set would be named after the first and silently absorb the rest`);
  const axesOf = (p: AnatomyPlan): string =>
    planComponentName(p).split(', ').map((kv) => kv.split('=')[0]).join(',');
  const axes = axesOf(plans[0]);
  const odd = plans.find((p) => axesOf(p) !== axes);
  if (odd) throw new Error(`${fn}: every plan must declare the same variant axes — got '${axes}' and '${axesOf(odd)}' (${planComponentName(odd)})`);
  const names = plans.map(planComponentName);
  if (new Set(names).size !== names.length) throw new Error(`${fn}: two plans share a component name — the set would have duplicate variants`);

  // GRID PLACEMENT. Only the axes that actually vary get a dimension — a `size` axis with one value is
  // not a row of one, it is not a row. One varying axis becomes the columns and the rest combine into
  // rows.
  //
  // WHICH AXIS IS NOW CHOSEN, NOT INHERITED (#656). It used to be `varying[varying.length - 1]` — the
  // last axis in `figmaAxisNames` order, i.e. declaration order — so the column axis was whatever
  // happened to be declared last. When the rule was written that was `state`, giving `state` across
  // and `appearance` down, the shape the color layer was verified against. Appending `slotAxes` after
  // `stateAxis` (#536 item 5) moved it to `trailing`, a boolean: the full Button set laid out 324 rows
  // × 2 columns, measured live at 320 × 23304px. Nobody chose that, and no gate could notice — see the
  // note on the gate below.
  //
  // `gridColumnAxis` (in `component-schema.ts`) resolves it: the def's declared `gridAxis` when it
  // varies here, else the highest-cardinality varying axis. Button declares `state` → 108 × 6.
  //
  // THE RULE LIVES IN `component-schema.ts`, NOT HERE, AND THAT IS LOAD-BEARING. This function is the
  // subject of #656's gate; a gate whose expectation came from calling this function would agree with
  // it by construction (docs/34). The sub-shape #656 adds to that family is worth naming, because it
  // is not the usual one: `test.ts`'s member-placement parity gate does not derive its expectation
  // from the subject — it compares two executors, and BOTH call `planSetLayout`. The expectation is
  // independent; the two SIDES of the comparison share the subject. So it stays green under any
  // layout change, and is a real gate for everything downstream (node building, combine ordering,
  // position writing, read-backs) while being blind to the layout itself.
  const keys = axes.split(',');
  const valuesOf = (p: AnatomyPlan) => Object.fromEntries(planComponentName(p).split(', ').map((kv) => kv.split('=') as [string, string]));
  const vals = plans.map(valuesOf);
  const varying = keys.filter((k) => new Set(vals.map((v) => v[k])).size > 1);
  // Every plan in a set carries the same `gridAxis` (they come from one def via `figmaAnatomySet`), so
  // the first is the set's. Read off the PLAN rather than a def this function never receives.
  const colKey = gridColumnAxis(
    plans[0].gridAxis,
    varying.map((k) => ({ name: k, values: new Set(vals.map((v) => v[k])).size })),
  );
  const rowKeys = varying.filter((k) => k !== colKey);
  const order = (list: string[]) => { const seen: string[] = []; for (const x of list) if (!seen.includes(x)) seen.push(x); return seen; };
  const cols = colKey ? order(vals.map((v) => v[colKey])) : [''];
  const rows = order(vals.map((v) => rowKeys.map((k) => v[k]).join(' ')));
  const cells = plans.map((p, i) => ({
    name: names[i],
    root: p.root,
    row: rows.indexOf(rowKeys.map((k) => vals[i][k]).join(' ')),
    col: colKey ? cols.indexOf(vals[i][colKey]) : 0,
    // The FOOTPRINT COHORT — the variants that must measure the same. `size` and slot fill legitimately
    // change a button's box; `state` and `appearance` must not, so those share a group and the payload
    // compares measured sizes within it.
    group: `size=${p.size}, leading=${p.slots.leading}, trailing=${p.slots.trailing}`,
  }));

  // The properties to declare, derived from the nodes the plans BUILD (see `planSetProperties`), and
  // the part→property wiring the payload applies per member. `REFS` is deduped by part because every
  // member carries the same anatomy — the payload loops members, so a per-plan list would wire each
  // node twenty-one times over.
  const props = planSetProperties(plans);
  const refs = new Map<string, { part: string; field: string; prop: string }>();
  for (const plan of plans)
    for (const n of refNodes(plan.root))
      if (props.some((p) => p.name === n.propertyRef!.prop)) refs.set(n.name, { part: n.name, ...n.propertyRef! });

  // `rowKeys`/`colKey` and the two ORDERED value lists ride along for the chunked path. It re-derives
  // each member's cell from the member NAME instead of being handed a name→cell map, because the map is
  // the one thing that does not fit: 756 entries of name+group is ~121KB shipped into a 45KB payload.
  // The name is already the coordinate (that is why `planComponentName` exists), so the ordering is the
  // only thing a chunk genuinely cannot derive — and that is four short arrays.
  return { cells, props, refs: [...refs.values()], axes, rows: rows.length, cols: cols.length, component: plans[0].component, rowKeys, colKey: colKey ?? '', rowLabels: rows, colVals: cols };
};

export const planSetToPluginJs = (plans: AnatomyPlan[]): string => {
  const { cells, props, refs, axes, rows, cols } = planSetLayout(plans, 'planSetToPluginJs');

  return stripPayloadComments(`const PLANS=${JSON.stringify(cells)};
const PROPS=${JSON.stringify(props)};
const REFS=${JSON.stringify(refs)};
${PAYLOAD_PREAMBLE}
${PAYLOAD_BUILD}
const built=[];
for(const spec of PLANS){
  const root=await build(spec.root);
  figma.currentPage.appendChild(root);
  const comp=figma.createComponentFromNode(root);
  comp.name=spec.name;
  built.push(comp);
}
// LAY OUT BEFORE COMBINING — see the header note. Column pitch is measured rather than assumed because
// the widths are only known here: a hug-width button is as wide as its label, so a fixed pitch either
// overlaps the long ones or strands the short ones.
const GAP=24;
const colW=[],rowH=[];
built.forEach((c,i)=>{
  const {row,col}=PLANS[i];
  colW[col]=Math.max(colW[col]||0,c.width);
  rowH[row]=Math.max(rowH[row]||0,c.height);
});
const at=(arr,n)=>arr.slice(0,n).reduce((a,b)=>a+(b||0)+GAP,0);
built.forEach((c,i)=>{const {row,col}=PLANS[i];c.x=at(colW,col);c.y=at(rowH,row);});
// COMBINE. The axes come from the names above; \`combineAsVariants\` throws rather than degrading if
// they disagree, so the offline check in \`planSetToPluginJs\` is what keeps that from being the
// caller's first sign of trouble — by then twenty-one loose components are already in the file.
const set=figma.combineAsVariants(built,figma.currentPage);
set.name=${JSON.stringify(plans[0].component)};
${PAYLOAD_DECLARE_PROPS}
${PAYLOAD_WIRE_REFS}
// READ BACK the axes Figma actually derived. A name it cannot parse is dropped silently, so a set can
// come back with fewer properties than the names claimed — present is not parsed.
const defs=set.componentPropertyDefinitions||{};
// VARIANT ONLY, and this is load-bearing rather than tidiness: non-variant properties come back with a
// NODE-ID SUFFIX (\`children#104:25\`) while variant keys do not, so the moment step 6 added a TEXT
// property this comparison started reporting an axis mismatch on a perfectly correct set. Measured live.
const derived=Object.keys(defs).filter(k=>defs[k].type==='VARIANT').sort();
const expected=${JSON.stringify(axes.split(','))}.sort();
const axisMiss=JSON.stringify(derived)!==JSON.stringify(expected)?['axes -> derived ['+derived.join(',')+'] but the names declared ['+expected.join(',')+']']:[];
${PAYLOAD_PROP_READBACK}
// READ BACK the LAYOUT too. Two variants at one position is the signature of a set that combined
// perfectly and is unusable, and it is invisible to every other check in this payload.
const seen=new Map();
const coincident=[];
for(const c of set.children){
  const pos=c.x+','+c.y;
  if(seen.has(pos))coincident.push('layout -> '+c.name+' sits on top of '+seen.get(pos)+' at '+pos);
  else seen.set(pos,c.name);
}
// READ BACK the FOOTPRINT. Changing \`state\` or \`appearance\` must not move the box: an outline button
// two pixels wider than its filled sibling makes a row of buttons fail to align, and nothing else here
// notices because both variants are individually correct. Caught exactly this — Figma's
// \`strokesIncludedInLayout\` defaults to adding the border to the auto-layout size.
const sizeByGroup=new Map();
const footprint=[];
built.forEach((c,i)=>{
  const g=PLANS[i].group;
  const box=Math.round(c.width)+'x'+Math.round(c.height);
  const first=sizeByGroup.get(g);
  if(!first)sizeByGroup.set(g,{box,name:PLANS[i].name});
  else if(first.box!==box)footprint.push('footprint -> '+PLANS[i].name+' measures '+box+' but '+first.name+' measures '+first.box+' (same '+g+')');
});
// \`wiredMembers\` alongside \`refs\` because the two answer different questions and only the second one
// matters: \`refs\` is a push-count, so 42 writes onto ONE member satisfies it as readily as 42 spread
// across twenty-one. Since the whole point of the per-member loop is that references do NOT propagate,
// the number worth reporting is how many members were reached — SPREAD, not volume (#513 review).
return {set:set.name,id:set.id,variants:built.length,size:[set.width,set.height],grid:[${JSON.stringify(rows)},${JSON.stringify(cols)}],axes:derived.map(k=>k+':'+(defs[k].variantOptions||[]).length),properties:[...bare.keys()].map(k=>k+':'+defs[bare.get(k)].type),refs:wiredRefs.length,wiredMembers:[...new Set(wiredRefs.map(r=>r[0]))].length,misses:misses.concat(axisMiss,coincident,footprint,propMiss)};
`);
};

/**
 * The body of a CHUNK payload: find-or-create the set, append this chunk's members, re-lay-out and
 * re-size the whole set, then read back everything a chunk can see. Expects the emitted `PLANS`,
 * `PROPS_ALL`, `REFS_ALL`, `SET_NAME`, `LAST`, `FIRST`, `EXPECTED_AXES`, `ROW_KEYS`, `ROW_LABELS`,
 * `COL_KEY`, `COL_VALS` and the two shared payload halves.
 *
 * WHY IT RE-LAYS-OUT MEMBERS IT DID NOT BUILD. The column pitch is measured, not computed — a
 * hug-width button is as wide as its label, and only Figma knows that. A chunk measures its own
 * members and no others, so a chunk that positioned only its own would place them against a pitch
 * derived from a fifth of the set and overlap everything already there. Measuring the union
 * (`set.children` ∪ the new members) and re-writing every position makes each chunk's layout correct
 * for the members present and self-correcting as later chunks widen a column: the last chunk lays out
 * the finished grid. It also means the set's box is derived rather than predicted, so nothing offline
 * has to guess a final size.
 *
 * WHY IT DERIVES EACH CELL FROM THE MEMBER NAME. The alternative is shipping a name→cell map, and the
 * map is the one thing that does not fit — 756 entries is ~121KB into a 45KB payload. The name already
 * IS the coordinate (that is what `planComponentName` is for), so only the axis ORDERING has to travel,
 * which is four short arrays. As a side effect a member this generator never built — a designer's
 * manual copy — parses to no cell and is reported instead of being silently dragged somewhere.
 */
const PAYLOAD_CHUNK_BODY = `// FIND OR CREATE. Append mode is chosen by what is in the FILE, not by the chunk index: a re-run of
// chunk 0 against a set that already exists must append (and then skip everything by name) rather than
// combine a second set beside the first.
let set=figma.currentPage.findOne(n=>n.type==='COMPONENT_SET'&&n.name===SET_NAME);
if(!set&&!FIRST){
  // RETURN, not continue. Every read-back below reasons about \`set.children\`, so carrying on would
  // bury one legible cause under a dozen null-dereference consequences.
  misses.push('set -> '+SET_NAME+' NOT FOUND on this page (chunk '+(CHUNK+1)+' of '+TOTAL+' appends into the set chunk 1 creates — paste the chunks in order)');
  return {set:null,chunk:CHUNK+1,of:TOTAL,added:0,variants:0,misses};
}
// SKIP BY NAME. \`combineAsVariants\` accepts a DUPLICATE member name silently, and the set it returns
// then THROWS on \`componentPropertyDefinitions\` and \`variantGroupProperties\` while
// \`addComponentProperty\` still succeeds — so a re-run without this produces a set that looks buildable
// and dies on read-back. Skipping makes a re-paste idempotent; the guarded read below catches a
// duplicate that arrives any other way.
const have=new Set(set?set.children.map(c=>c.name):[]);
const fresh=[];
for(const spec of PLANS){
  if(have.has(spec.name)){misses.push('member '+spec.name+' -> ALREADY PRESENT (skipped; this chunk has run before)');continue;}
  const root=await build(spec.root);
  figma.currentPage.appendChild(root);
  const comp=figma.createComponentFromNode(root);
  comp.name=spec.name;
  fresh.push(comp);
}
if(!set){
  if(fresh.length===0){
    misses.push('set -> nothing to combine (chunk 1 built no members)');
    return {set:null,chunk:CHUNK+1,of:TOTAL,added:0,variants:0,misses};
  }
  // COMBINE, once, on the first chunk only. Every later member joins by \`appendChild\`, which re-derives
  // the axes correctly — measured: appending \`state=pressed\` to a \`state=rest|hover\` set extends that
  // axis, and appending \`size=lg\` extends the other one.
  set=figma.combineAsVariants(fresh,figma.currentPage);
  set.name=SET_NAME;
}else for(const c of fresh)set.appendChild(c);
let members=set.children.slice();
// LAY OUT. Cells derived from the names — see the header note.
const GAP=24;
const cellOf=(name)=>{
  const v={};
  for(const kv of name.split(', ')){const i=kv.indexOf('=');if(i>0)v[kv.slice(0,i)]=kv.slice(i+1);}
  const row=ROW_LABELS.indexOf(ROW_KEYS.map(k=>v[k]).join(' '));
  const col=COL_KEY?COL_VALS.indexOf(v[COL_KEY]):0;
  return {row,col,group:'size='+v.size+', leading='+v.leading+', trailing='+v.trailing};
};
const cells=members.map(c=>cellOf(c.name));
const colW=[],rowH=[];
members.forEach((c,i)=>{
  const {row,col}=cells[i];
  if(row<0||col<0)return;
  colW[col]=Math.max(colW[col]||0,c.width);
  rowH[row]=Math.max(rowH[row]||0,c.height);
});
const at=(arr,n)=>arr.slice(0,n).reduce((a,b)=>a+(b||0)+GAP,0);
const stray=[];
members.forEach((c,i)=>{
  const {row,col}=cells[i];
  // A member whose name is not a coordinate this generator emits. Left where it is rather than moved
  // to a guessed cell, and reported — it is someone's manual edit, and silently relocating it is worse
  // than leaving it visible.
  if(row<0||col<0){stray.push('member '+c.name+' -> NOT A GENERATED VARIANT (left in place; it will not follow the grid)');return;}
  c.x=at(colW,col);c.y=at(rowH,row);
});
// RESIZE, because appending does NOT grow the set's frame. Measured: appending a member at x=208 to a
// 184-wide set leaves the set 184 wide, with the new member outside its own box — nothing throws, and
// no read-back in the single-shot payload would ever notice, because that payload never appends.
const wantW=Math.max(1,at(colW,colW.length)-GAP),wantH=Math.max(1,at(rowH,rowH.length)-GAP);
if(colW.length&&rowH.length)set.resize(wantW,wantH);
// READ BACK THE BOX, because \`resize\` is the one call here with no other witness. Appending does not
// grow the frame, so a set that is never resized ends up SMALLER than its own contents — members
// sitting outside the box that owns them — and every binding, property, axis and footprint check in
// this payload passes on it. Compared against the offline expectation rather than against the members,
// so it also catches a resize that ran and landed somewhere else.
const boxMiss=[];
if(colW.length&&rowH.length&&(Math.round(set.width)<Math.round(wantW)||Math.round(set.height)<Math.round(wantH)))
  boxMiss.push('set -> BOX '+Math.round(set.width)+'x'+Math.round(set.height)+' does not contain its '+members.length+' members ('+Math.round(wantW)+'x'+Math.round(wantH)+' needed; appending does NOT grow the frame)');
// READ BACK the definitions, GUARDED. A duplicate member name poisons this getter (see above), so an
// unguarded read throws with no indication of which member caused it — and takes the whole paste's
// report with it, including the misses already collected.
let defs={},readable=false;
try{defs=set.componentPropertyDefinitions||{};readable=true;}
catch(err){misses.push('set -> UNREADABLE ('+err.message+') — two members almost certainly share a name, which combineAsVariants accepts silently');}
// The axes are checked on EVERY chunk, not just the last: each member declares the full set of axis
// KEYS (only the values are partial), so a name Figma cannot parse is visible from the first chunk on —
// which is where it is cheap to fix, rather than after thirty-five more have landed.
const derived=readable?Object.keys(defs).filter(k=>defs[k].type==='VARIANT').sort():[];
const axisMiss=readable&&JSON.stringify(derived)!==JSON.stringify(EXPECTED_AXES.slice().sort())?['axes -> derived ['+derived.join(',')+'] but the names declared ['+EXPECTED_AXES.join(',')+']']:[];
// PROPERTIES AND REFS ARE THE LAST CHUNK'S JOB, and only on a readable set. \`combineAsVariants\`
// REWRITES property ids, so anything declared before the final member joins holds ids that the
// combine has already invalidated. Emptied rather than skipped when unreadable: the UNREADABLE miss
// above is the single cause, and declaring properties on a poisoned set would bury it under a dozen
// consequences.
const PROPS=readable?PROPS_ALL:[];
const REFS=readable?REFS_ALL:[];`;

/** The tail of a CHUNK payload: the two layout read-backs and the report. */
const PAYLOAD_CHUNK_RETURN = `// READ BACK the LAYOUT. Two variants at one position is the signature of a set that combined perfectly
// and is unusable, and it is invisible to every other check here.
const seen=new Map();
const coincident=[];
for(const c of members){
  const pos=c.x+','+c.y;
  if(seen.has(pos))coincident.push('layout -> '+c.name+' sits on top of '+seen.get(pos)+' at '+pos);
  else seen.set(pos,c.name);
}
// READ BACK the FOOTPRINT, across the WHOLE set rather than this chunk. That is the point of doing it
// here: \`state\` and \`appearance\` must not move the box, and those siblings are exactly the members a
// chunk boundary is likely to separate — a cohort split across two chunks is one no single-chunk check
// would ever compare.
const sizeByGroup=new Map();
const footprint=[];
members.forEach((c,i)=>{
  const g=cells[i].group;
  const box=Math.round(c.width)+'x'+Math.round(c.height);
  const first=sizeByGroup.get(g);
  if(!first)sizeByGroup.set(g,{box,name:c.name});
  else if(first.box!==box)footprint.push('footprint -> '+c.name+' measures '+box+' but '+first.name+' measures '+first.box+' (same '+g+')');
});
// \`added\` and \`variants\` both, because a chunk that skipped everything and a chunk that built its
// whole slice are indistinguishable from the running total alone — and the first is the one worth
// noticing, since it means this chunk had already been pasted.
return {set:set.name,id:set.id,chunk:CHUNK+1,of:TOTAL,added:fresh.length,variants:members.length,size:[set.width,set.height],axes:derived.map(k=>k+':'+(defs[k].variantOptions||[]).length),properties:[...bare.keys()].map(k=>k+':'+defs[bare.get(k)].type),refs:wiredRefs.length,wiredMembers:[...new Set(wiredRefs.map(r=>r[0]))].length,misses:misses.concat(stray,boxMiss,axisMiss,coincident,footprint,propMiss)};`;

/**
 * The per-payload BYTE budget for a chunked paste, against `figma_execute`'s ~45KB ceiling.
 *
 * BYTES, NOT A VARIANT COUNT — and that is a correction, not a preference. The obvious constant is "21
 * variants", the size proven clean live twice (#513's grid, #528's BOOLEAN set, 42,040 B; 24 measured
 * 45,804 and was already over). It does not survive contact with the chunked payload, for two
 * independent reasons measured while writing this:
 *
 *  - the CHUNK shell is 21.3KB where the single-shot shell is 15.6KB (a chunk carries the find-or-skip
 *    logic, the axis ordering and the guarded read-back), so 21 slot-less variants measure 45,066 —
 *    over, on the very set the count was inherited from;
 *  - a variant's own cost swings ~60% with the plan. A slot-less button serializes to ~1,188 bytes and
 *    a leading+trailing one to ~1,940, so 18 variants of the FULL button measure 56,276 while 18 of
 *    the 4-state set measure 41,702. No single count is right for both.
 *
 * So a count cannot bound the thing the ceiling is actually about, and the failure mode is the bad one:
 * an over-budget payload is rejected by the transport *after* the caller has already pasted the chunks
 * before it, leaving a half-built set. `planSetChunks` packs to this budget instead, so a chunk that
 * would not fit becomes two chunks that do — decided offline, where it costs nothing.
 *
 * 42,000 rather than 45,000 because 42,040 is the largest payload with a *proven* live paste behind it,
 * and the remaining ~3KB is the margin for what the byte count cannot see (transport framing, and the
 * one variant whose label is longer than any measured here).
 */
export const SET_CHUNK_BYTES = 42_000;

/**
 * A plan set → N payloads that build the same COMPONENT_SET across SEPARATE `figma_execute` calls.
 *
 * WHY THIS EXISTS. `planSetToPluginJs` is one payload, and #487 §6 measured the ceiling it runs
 * into: the full Button is 756 variants ≈ 944KB against a 45KB paste limit. So the set has to
 * accumulate across calls, and the two hard parts are both things the single-shot payload gets for
 * free — the LAYOUT (a chunk handed a slice would place its members as though the slice were the
 * whole set, so chunk 2 lands on top of chunk 1) and the PROPERTIES (declared once, at the end,
 * because `combineAsVariants` rewrites property ids and `addComponentProperty` throws on a member).
 *
 * THE SHAPE, chosen after measuring both candidates live:
 *
 *   chunk 0     build its members → `combineAsVariants` → the set exists and is READABLE
 *   chunk 1..n  find the set by name → skip members already present → append → `set.resize(…)`
 *   final       declare the properties, wire every member, read everything back
 *
 * The alternative — stage every chunk's components in a frame and combine at the very end — also
 * works (measured), but leaves no usable set until the last call, so a half-finished run is a frame
 * of loose components rather than a partial button a designer can open. Appending into the live set
 * keeps every intermediate state valid.
 *
 * FIVE live measurements this rests on, none of which the docs state:
 *
 *  - APPENDING EXTENDS THE AXES. `set.appendChild(comp)` with a new value on an existing axis
 *    (`state=pressed`) or a new value on another axis (`size=lg`) both re-derive correctly:
 *    `size:md → size:md|lg`. So a set does not have to be built in one combine to be coherent.
 *  - THE SET'S FRAME DOES NOT GROW. Appending a member at x=208 to a 184-wide set leaves it 184
 *    wide — the member is outside its own set's box. Nothing throws and no read-back in the
 *    single-shot payload would notice, because that payload never appends. Hence the explicit
 *    `resize` per chunk.
 *  - A DUPLICATE NAME IS ACCEPTED AND POISONS THE SET. `combineAsVariants` takes two members named
 *    `state=rest` without complaint, and the resulting set then THROWS on both
 *    `componentPropertyDefinitions` and `variantGroupProperties` ("Component set has existing
 *    errors") while `addComponentProperty` still SUCCEEDS. So a re-run produces a set that looks
 *    buildable and dies on read-back. Two defenses, because either alone is insufficient: each
 *    chunk skips names already present (so a re-run is idempotent), AND the read-back is guarded so
 *    a duplicate arriving any other way — a designer's manual copy, a rename — is reported as a
 *    miss instead of throwing with no indication of which member caused it.
 *  - POSITIONS SURVIVE. `combineAsVariants` preserves each member's x/y, and so does `appendChild`
 *    followed by setting them. That is what makes a computed grid usable at all.
 *  - A STAGING FRAME ALSO WORKS. Positions survive the eventual combine and duplicates are skippable
 *    by name across separate calls — the option was measured, not assumed away, and rejected for the
 *    reason above.
 *
 * Returns one payload per chunk with its measured byte size — measured, because the size a chunk turns
 * out to be is the one number this function exists to control, and reporting the estimate it packed
 * against instead would hide exactly the case worth seeing.
 */
export const planSetChunks = (
  plans: AnatomyPlan[],
  budgetBytes: number = SET_CHUNK_BYTES,
): { index: number; total: number; variants: string[]; js: string; bytes: number }[] => {
  // The FULL plan list, so the ordering every chunk derives its cells from is the whole set's. Calling
  // `setLayout` per slice instead would compute `rowLabels`/`colVals` from a fifth of the members, so a
  // later chunk's `col` indices would restart at 0 and it would land on top of the first — #510's
  // stacking bug, reintroduced one chunk at a time.
  const { cells, props, refs, axes, component, rowKeys, colKey, rowLabels, colVals } = planSetLayout(plans, 'planSetChunks');

  // `name` + `root` only. `row`/`col`/`group` are all derivable from the name inside the payload, and
  // the payload's bytes are the budget this whole function exists to respect.
  const specs = cells.map((c) => ({ name: c.name, root: c.root }));
  // STRIPPED INSIDE `emit`, not around it, because every byte the packing loop reasons about has to be a
  // byte that ships. Stripping the finished payloads afterwards would pack against a 25.9KB shell and
  // then ship a 14.8KB one — correct, but a third more chunks than the budget allows, and the `bytes`
  // this function reports (the one number it exists to control) would be measuring a different string
  // from the one it packed.
  const emit = (slice: typeof specs, index: number, total: number, last: boolean) =>
    stripPayloadComments(`const PLANS=${JSON.stringify(slice)};
const SET_NAME=${JSON.stringify(component)};
const CHUNK=${index};
const TOTAL=${total};
const FIRST=${index === 0};
const EXPECTED_AXES=${JSON.stringify(axes.split(','))};
const ROW_KEYS=${JSON.stringify(rowKeys)};
const ROW_LABELS=${JSON.stringify(rowLabels)};
const COL_KEY=${JSON.stringify(colKey)};
const COL_VALS=${JSON.stringify(colVals)};
// Empty until the FINAL chunk: \`combineAsVariants\` rewrites property ids, so anything declared before
// the last member joins holds ids the combine has already invalidated.
const PROPS_ALL=${JSON.stringify(last ? props : [])};
const REFS_ALL=${JSON.stringify(last ? refs : [])};
${PAYLOAD_PREAMBLE}
${PAYLOAD_BUILD}
${PAYLOAD_CHUNK_BODY}
${PAYLOAD_DECLARE_PROPS}
${PAYLOAD_WIRE_REFS}
// RE-READ the definitions, because the read above happened BEFORE the properties existed.
// The single-shot payload reads once, after declaring, and gets this for free; the chunked one
// has to read early — the guarded read is how it learns whether the set is coherent enough to declare
// anything at all — so the snapshot it took is a set with no properties on it. Left stale, the read-back
// reported both properties "declared but absent from the set (Figma may have renamed it)" on a perfectly
// correct paste, and, worse, that noise MASKED two mutations that were supposed to fail loudly for
// entirely different reasons. A read-back is only as good as the moment it samples.
try{defs=set.componentPropertyDefinitions||{};}catch(err){/* already reported as UNREADABLE above */}
${PAYLOAD_PROP_READBACK}
${PAYLOAD_CHUNK_RETURN}
`);

  // PACK BY MEASURED BYTES. The shell is emitted and measured rather than estimated, then variants are
  // added while they fit — because a per-variant average is wrong by 60% between a slot-less plan and a
  // leading+trailing one, and the point is to be right about the payload that actually ships.
  const pack = (shell: number) => {
    const groups: (typeof specs)[] = [];
    let cur: typeof specs = [];
    let size = shell;
    for (const spec of specs) {
      // `+1` for the comma this variant adds to the `PLANS` array literal. One byte per variant, and it
      // is the only part of a chunk's size that is not inside `spec` itself.
      const cost = JSON.stringify(spec).length + 1;
      // ALWAYS at least one variant per chunk, even one that does not fit. A single plan bigger than the
      // whole budget is a real if distant possibility, and an empty chunk would loop forever — whereas a
      // one-variant over-budget chunk is reported by its own `bytes` and fails visibly at the transport.
      if (cur.length && size + cost > budgetBytes) { groups.push(cur); cur = []; size = shell; }
      cur.push(spec);
      size += cost;
    }
    if (cur.length) groups.push(cur);
    return groups;
  };
  // THE SHELL IS NOT A CONSTANT, and this cost four bytes at 121 chunks before it was measured. The
  // header interpolates `CHUNK`, `TOTAL` and `FIRST`, so a payload's own index widens it: measuring the
  // shell as chunk 1-of-1 charges `0`, `1` and `true`, while chunk 108-of-121 spends two more digits on
  // each number and one more character on `false`. Five bytes, invisible below ~10 chunks and enough to
  // push the full 756-variant button's worst chunk to 42,004 against a 42,000 budget.
  //
  // So the shell is measured at the WORST case for a given total — a non-first chunk at the widest index
  // — and that total is what packing produces, hence the fixpoint. It converges because a wider shell
  // only ever yields more chunks, `String(n).length` grows in steps, and the loop is bounded by that
  // width; the cap is a backstop, not a limit anything real reaches.
  let groups = pack(emit([], 0, 1, false).length);
  for (let guard = 0; guard < 8; guard++) {
    const shell = emit([], groups.length - 1, groups.length, false).length;
    const next = pack(shell);
    if (next.length === groups.length) { groups = next; break; }
    groups = next;
  }

  // The LAST chunk declares the properties, so it carries `PROPS_ALL`/`REFS_ALL` and is heavier than the
  // packing loop assumed. It is also the chunk most likely to be short, so this normally costs nothing —
  // but if it does overflow, split one variant off the end rather than ship a chunk over budget.
  const lastGroup = groups[groups.length - 1];
  if (lastGroup.length > 1 && emit(lastGroup, groups.length - 1, groups.length, true).length > budgetBytes)
    groups.push([lastGroup.pop()!]);

  return groups.map((slice, i) => {
    const js = emit(slice, i, groups.length, i === groups.length - 1);
    return { index: i, total: groups.length, variants: slice.map((c) => c.name), js, bytes: js.length };
  });
};
