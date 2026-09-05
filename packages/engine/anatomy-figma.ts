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
import { fillKey, gridColumnAxis, fillPaintKey, paintKeyPlaceholders, PRIMARY_PAINT_SLOTS, replacesCandidates, statesOf, variantsOf } from './component-schema';
import type { ControlShape } from './scale';
// The glyph vocabulary, for `vector` parts (#864). A GENERATED module rather than the `icons/*.svg` files
// themselves, and that is a hard constraint rather than a preference: this file bundles into the Figma
// plugin sandbox, which has no filesystem — see `emit-icons.ts`'s header.
import { ICON_NAMES, ICON_PATHS, ICON_FILL_RULES, ICON_VIEWBOX } from './icon-glyphs';

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
  /** `GLYPH` is the one type here whose content is GEOMETRY rather than a box, a binding or a
   *  nomination — see `glyphSvg`. It is a leaf in the PLAN and not in the file: Figma builds it from an
   *  SVG document, which arrives as a FRAME on the glyph's own artboard wrapping the outline. Named for
   *  what it IS rather than for the node type it lands as, which is the convention `INSTANCE_SWAP` and
   *  `NESTED_INSTANCE` already set — neither is a Figma node type either, and both name the build
   *  strategy because that is what an executor branches on. */
  type: 'FRAME' | 'TEXT' | 'INSTANCE_SWAP' | 'NESTED_INSTANCE' | 'GLYPH';
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
  /** For a `TEXT` node: where the glyphs sit inside the node's own box (#1009). Present on EVERY text
   *  node and on nothing else — the projector's default is `CENTER` and a part overrides it with
   *  `PartDef.verticalAlign`.
   *
   *  ── WHERE THE RULE LIVES, WHICH IS THE QUESTION #1009 HELD OPEN ────────────────────────────────
   *
   *  Three candidates, and the measurement decides between them rather than taste. **774 TEXT nodes in
   *  the corpus, ZERO with a bound height**, so this property is a no-op on every node that exists
   *  today: a hugging text node's box IS its content and all three values land the glyphs in the same
   *  pixels.
   *
   *    - **Projector default + per-part override — CHOSEN.** The stated risk was "a def that wants top
   *      alignment now has to opt out of something it never opted into", and the measurement is what
   *      makes that risk small: there is no node the default can get wrong, because there is no node it
   *      can move. So it is introduced at the one moment it costs nothing, and every text node that
   *      later gains a height inherits a decided rule instead of Figma's `TOP`. The override ships in
   *      the same change rather than being added when someone needs it — an opt-out that arrives after
   *      the default is an opt-out nobody could have used.
   *    - **A required schema field — rejected.** It would make eleven defs state a value none of them
   *      can exercise. Eleven unfalsifiable declarations is not explicitness; it is eleven claims no
   *      gate can check, which is the shape `lint-context-nodes.ts`'s header calls a snapshot rather
   *      than a rule.
   *    - **Per-def bindings only — rejected by #1009's own observation**, three defs for three wrong,
   *      and by this field's whole reason for existing: a silence is not a decision.
   *
   *  ── WHAT THIS DOES NOT DO ─────────────────────────────────────────────────────────────────────
   *
   *  It does not centre a control against its label. That is #1009's half 1, it lives on the PARENT
   *  frame's `counterAxisAlignItems`, and no value here reaches it. The two arrived as one QA
   *  observation and are two properties on two different nodes — see the issue, and see `docs/00` for
   *  why half 1 is not in this change.
   *
   *  ALWAYS PRESENT rather than emitted only when a def overrides, and that is the point of it being a
   *  claim: #865's second-direction gate asks that every visually-significant property a built node
   *  carries trace to a plan entry, and a field absent from the plan whenever it agrees with the
   *  default is a field that gate cannot distinguish from a silence. */
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
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
  /** The CANONICAL default for the SET-LEVEL text property (#1018), which is `figmaProperties.texts[*].default`
   *  — NOT `characters`. `characters` is this MEMBER's copy (per-coordinate via `byVariant`); the component
   *  set's property has ONE `defaultValue`, and it is the fallback. Kept separate so `planSetProperties`
   *  reads a value that is CONSTANT across the set while each member's node overrides its own `characters`.
   *  Present ONLY where it DIVERGES from this member's `characters` — a `byVariant` member whose copy differs
   *  from the fallback. Omitted everywhere else (every member of a def with no `byVariant`, and `byVariant`'s
   *  own `default`-coordinate member), so those plans stay byte-identical and their `planStamp` does not move;
   *  `planSetProperties` reads `n.textDefault ?? n.characters`, so an omitted value resolves the same default. */
  textDefault?: string;
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
  /** The variable name whose value must be ADDED to `absoluteInset` to leave a visible gap of
   *  `absoluteInset` — the width of the stroke the nested component draws inside its own bounds.
   *
   *  THE FIGMA COMPENSATION, and #801 is why it exists. A materializer sets `strokeAlign: 'INSIDE'`
   *  (correct for a border: the stroke must not grow the auto-layout footprint), so a ring positioned at
   *  `-offset` has its stroke drawn back inward across the gap. At the shipped 2px offset and 2px ring
   *  width the outer edge lands exactly on the host's border and the gap is ZERO — the one position WCAG
   *  1.4.11 says a focus indicator must not take, produced by a projection that applied its offset
   *  correctly. Nothing anywhere modeled the stroke, so the number that mattered was never computed.
   *
   *  A SECOND NAME rather than a summed number or a derived token, each alternative rejected for a stated
   *  reason. A number summed at plan time breaks the brand-invariance the sibling field's own doc exists
   *  to preserve. A derived `focus.ring.inset` token would put a Figma compensation in the
   *  platform-neutral tree, against docs/19 §1: `focus.ring.offset` is 2 because 2 is what CSS wants and
   *  what the gap IS, so a token valued 4 is correct for this projection and a trap for every other
   *  consumer who finds the name. The precedent is docs/05 — canonical value in `$value`, platform
   *  directive in `$extensions` — and lineHeight's px-from-ratio is the same problem already solved that
   *  way. So the arithmetic lives HERE, in the materializer, against the projection it corrects.
   *
   *  Both names freeze to literals at paste exactly as one did: two `resolveForConsumer` reads and an
   *  addition. So this changes nothing about the ceiling in `codeOnly` — an already-pasted ring still does
   *  not move when a brand re-themes, and a rebuild over an existing set writes nothing at all (#821).
   *
   *  OPTIONAL, and its absence means the nested component draws nothing inside its bounds: such a part is
   *  positioned at exactly `-absoluteInset`, which is right. Ring-specific today only because
   *  `focus-ring` is the only part kind carrying a stroke of its own; when #740 gives `PartDef` a stroke
   *  field it supplies this width and neither executor changes. In `readVarsOwn` for the same reason the
   *  sibling is — a name this projection references without binding, and an unresolvable one silently
   *  returns the ring to flush. */
  absoluteStrokeInset?: string;
  /** Taken out of the auto-layout flow and CENTERED, rather than inset from its parent's bounds.
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
  /** WHICH sibling's box the centering is measured on — the name of the part being overlaid (#848).
   *
   *  Absent means the PARENT, which is what both executors did unconditionally before #848 and is
   *  correct only when the overlaid part is itself centered in the parent. It was not: at
   *  `leading=false, trailing=true` the label sits left of center because the trailing cell occupies
   *  the right, so a spinner centered on the container landed 12px right of the text it stood in for
   *  (measured at `small`: label spans 16→60, center 38; container center 50).
   *
   *  A NAME rather than a number because the box is not knowable at emit — the label's width is the
   *  designer's text, resolved by Figma's auto-layout at paste. So this field says which node to
   *  measure and the executor does the arithmetic against the LIVE box, the same division of labor
   *  `absoluteInset` uses for a value Figma will not let us bind. */
  absoluteCenterOn?: string;
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
  /** A COMPLETE SVG DOCUMENT for a `GLYPH` node — the glyph's own geometry, on the `ICON_VIEWBOX`
   *  artboard, ready for `figma.createNodeFromSvg`.
   *
   *  A FIFTH API SHAPE, and the argument is the one `textStyle`, `effectStyle`, `paints` and
   *  `absoluteInset` each got their own field for: `createNodeFromSvg(svg)` is neither a property write
   *  nor a variable binding — it is a CONSTRUCTOR that takes a document and returns a subtree, so an SVG
   *  squeezed into `bound` would imply a `setBoundVariable('svg', …)` that is not an API. One field per
   *  API shape, so the plan cannot imply a call that does not exist.
   *
   *  A DOCUMENT RATHER THAN THE `d` ATTRIBUTE, and this reversed an earlier decision on this branch, so
   *  the reason is recorded rather than left to be re-derived. The first version of this field carried
   *  bare path data for `figma.createVector()` plus `node.vectorPaths = [{ windingRule, data }]`. Two
   *  measurements killed it, and the second is the one that mattered:
   *
   *    1. `vectorPaths` accepts a SUBSET of SVG's path grammar — the typings enumerate `M`, `L`, `Q`, `C`
   *       and `Z` and no more. **23 of the set's 40 glyphs use `H`/`V`** (every arrow, both minuses, both
   *       plusses, both warning triangles, and the FPO placeholder). Writing a converter is possible; keeping one right for every
   *       glyph added later is a new correctness surface whose failure mode is a wrong shape that builds.
   *    2. **A `VectorNode`'s box IS its ink**, so the member component would be as big as the drawing
   *       rather than as big as the artboard. Measured across all 39: only 19 are square, `minus` is
   *       14×2, `more-vertical-filled` is 4×18. Every host binds a SQUARE `size.{size}.icon` onto the
   *       slot it swaps a glyph into, so a 14×2 main component stretches non-uniformly into that square
   *       — #864's own class ("builds fine, renders wrong") reintroduced by #864's fix.
   *
   *  `createNodeFromSvg` answers both: Figma's own importer handles the full path grammar, and it returns
   *  a FRAME sized to the `viewBox` with the outline inside. The wrapper is the artboard, which is the
   *  thing that makes the square binding uniform — so the extra level is the feature, not the cost.
   *
   *  **NOT a variable name, and this is the one geometry field here that is a LITERAL on purpose.**
   *  Every sibling carries a name so the plan stays brand-invariant and the value freezes at paste
   *  against the file's own variables. A glyph's outline is not brand-varying in that sense: it is the
   *  set's CONTENT, versioned as a vocabulary with its own deprecation discipline (`icon-set.ts`), not a
   *  themeable value. A brand swapping the icon set replaces `icons/*.svg` and regenerates — it does not
   *  re-theme a path. Carrying a name would also put it in `planBindingErrors`' scope, where it would be
   *  an unresolvable variable in every brand.
   *
   *  ABSENT on every other node type, and the executors branch on `type` rather than on this field's
   *  presence — a plan that names a `GLYPH` and carries no document is a projection failure, not a node
   *  to build empty.
   *
   *  THE PAINT IS NOT HERE, and under this shape it is not on the node either: the ink belongs on the
   *  VECTOR inside the frame, never on the frame, because a frame fill paints a square BEHIND the glyph.
   *  That is exactly what `descendantFills` already means, so a glyph part's ink is projected there — see
   *  the paint dispatch, where the argument for `paints.fills` reversed when the wrapper arrived. */
  glyphSvg?: string;
  /** The artboard `glyphSvg` declares, as `[width, height]` — what the built frame's box must COME BACK as.
   *
   *  A READ-BACK EXPECTATION, which is a different job from the one this field had one commit ago: with
   *  `createVector` the executors had to scale a path themselves and this was the scale factor's
   *  denominator. Figma's importer does the sizing now, so what is left is the question no other check
   *  here asks — did it size the frame to the artboard, or to something else? A glyph frame that comes
   *  back 0×0 or 100×100 is a member whose whole grid is off by a constant, and it builds without
   *  throwing.
   *
   *  Two numbers rather than the `'0 0 24 24'` string `ICON_VIEWBOX` holds, and rather than re-parsing it
   *  out of `glyphSvg`: an executor that read its expectation back out of the document it just submitted
   *  would still be comparing two independent things (the input and the host's output), but it would be
   *  doing the parse twice in two languages. The min-x/min-y terms are dropped deliberately —
   *  `emit-icons.ts` asserts every source is `0 0 W H`, so a non-zero origin cannot reach here without
   *  failing that gate first. */
  glyphViewBox?: [number, number];
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
  /** ABSENT where the def declares no `size` axis (#795) — a caption or a focus ring has one type
   *  scale, so there is no size coordinate to carry and `planComponentName` writes none. Optional
   *  rather than `''`: an empty string is a value that reads as a size everywhere it is interpolated,
   *  which is how `size=` would have come back as a real-looking empty coordinate. */
  size?: string;
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
  /** The def's `variantAxes`, in DECLARATION order, minus `size` — the order `planComponentName` writes
   *  the coordinate in (#795).
   *
   *  Carried onto the plan for exactly the reason `slotAxes` and `gridAxis` are: `planComponentName`
   *  receives PLANS, never the def, and it used to write `intent` then `appearance` from two hardcoded
   *  lines. That was Button's declaration order transcribed into the writer, so a def whose axis was
   *  named anything else — `field-message`'s `tone` — projected a coordinate the NAME did not carry, and
   *  four members came back named `""`. Byte-identical output for every existing def, because all four
   *  declare `['intent', 'appearance', 'size']` and this preserves declaration order. */
  gridAxisOrder: string[];
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
  /** Axes on which this def's box legitimately moves (#1010) — `figmaProperties.footprintVaries`, on the
   *  plan for `gridAxis`'s reason and read by `planSetLayout` when it builds the footprint cohort key.
   *  Always an array, empty for the defs that make no such claim, because the cohort key concatenates it
   *  and an `undefined` there would read as a segment rather than as none. */
  footprintVaries: string[];
};

/**
 * Root-relative token ref → the emitted Figma variable name, MINUS THE BRAND ROOT. The emitters
 * slash-path the same dotted path, so this is the whole mapping — but it is stated once, here, rather
 * than inlined at each call site where a drift would be invisible.
 *
 * THE ROOT IS NOT PART OF IT, AND THAT IS A DESIGN DECISION #1097 FORCED RATHER THAN AN OMISSION.
 *
 * Since #1097 every emitted variable is named `<root>/<tail>`, so this function no longer returns a name
 * a Figma file carries: it returns the TAIL. The alternative was to thread the brand root through
 * `figmaAnatomyPlan` and `figmaAnatomySet`, and the reason not to is that a PLAN IS BRAND-AGNOSTIC —
 * `figmaAnatomySet(button)` is one answer for every brand, which is why seven gates, the studio's
 * member-count read and the plugin's set enumeration can call it with a def and nothing else. Rooting
 * the plan would make each of them ask "whose brand?" about a question that does not have a brand in it.
 *
 * So the root enters where a plan MEETS A FILE, and there are exactly FOUR such places:
 *
 *   1. `PAYLOAD_PREAMBLE`'s `byName` — the CLI paste path, keyed by tail off the live variables.
 *   2. `apps/plugin/src/write-components.ts`'s `byName` — the plugin executor, the same way.
 *   3. `planBindingErrors`'s `emitted` — the offline gate, whose caller reads `out/figma/<brand>/*.json`
 *      and must key it by tail to match.
 *   4. `lint-absolute-inset.ts`'s `floatVars` — the gap gate, which resolves a def's `inset`/`strokeInset`
 *      refs against the FLOATs in a brand's committed export, and so keys that export by tail too.
 *
 * The fourth is the one this list got wrong, and the way it went wrong is the reason the list exists. It
 * said "exactly three" through the whole of #1097 while `floatVars` was keyed by FULL emitted name against
 * a root-relative plan name — so every lookup missed, the gap arm ran **zero** checks, and the gate printed
 * a pass. Not a loud failure: a silent one, of exactly the shape the last paragraph promises cannot happen.
 * What caught it was the gate's own vacuity report (it now runs 42 gap checks), not the count of failures,
 * and not this comment. An enumeration that is authoritative for the reader and unenforced against the
 * codebase can be wrong for a whole lane without anything noticing — #1049's shape.
 *
 * All four go through `tailOf`'s positional split rather than stripping a named prefix, so none of them
 * spells a root and all four work for a client namespace we have never seen. If a fifth appears, it
 * belongs on this list; a consumer that compares a plan name against a ROOTED name will find nothing and
 * report every binding missing — which is loud only if that consumer counts what it *did* resolve, which
 * is the lesson of the fourth.
 */
export const figmaVarName = (ref: string): string => ref.replace(/\./g, '/');

/** Composite type ref → the emitted Figma TEXT STYLE name. Note the asymmetry with
 *  `figmaVarName`: text styles drop the `type.` root (`type.label.md.emphasis` →
 *  `label/md/emphasis`) because they live in their own namespace rather than a variable
 *  collection. Stating it here is what stops the two mappings being assumed identical. */
export const figmaTextStyleName = (ref: string): string => ref.replace(/^type\./, '').replace(/\./g, '/');

/**
 * A `vector` part's glyph name → its path data (#864).
 *
 * THROWS on a name the vocabulary does not hold, and that is the field's whole value over authoring the
 * path inline. #864 was `icon` building four empty artboards: the geometry existed in `ICON_PATHS`, the
 * def imported `ICON_NAMES` for its prop enum, and nothing connected the two — so every gate was
 * legitimately green over a component that rendered nothing. A miss resolved to `undefined` here would
 * rebuild precisely that, one tier further in and harder to see.
 *
 * The message names the def, the part and the nearest few real glyphs, because the realistic causes are a
 * typo and a set swap (`icon-set.ts`'s whole purpose is that a client's branded set replaces ours), and
 * both are answered by seeing what the vocabulary actually holds.
 */
const glyphPath = (defId: string, part: string, glyph: string | undefined): string => {
  // Unreachable through `validateComponentDef`, which refuses a vector part with no glyph — this is the
  // backstop for a caller that skipped it, the same relationship every other throw in this file has.
  if (!glyph) throw new Error(`${defId}: anatomy part '${part}' is kind 'vector' and names no glyph`);
  const path = ICON_PATHS[glyph as keyof typeof ICON_PATHS];
  if (!path) {
    // Nearest by shared prefix, which is what a typo and a renamed glyph both produce. Not a full edit
    // distance: this is an error message, and the cheap heuristic answers both realistic causes.
    const near = ICON_NAMES.filter((n) => n.startsWith(glyph.slice(0, 3))).slice(0, 5);
    throw new Error(
      `${defId}: anatomy part '${part}' names glyph '${glyph}', which is not in the icon vocabulary` +
      `${near.length ? ` — did you mean ${near.map((n) => `'${n}'`).join(', ')}?` : ''}` +
      ` The vocabulary is ICON_SOURCES in icon-set.ts (${ICON_NAMES.length} glyphs); a glyph is added by dropping the .svg in icons/ and mapping it there.`,
    );
  }
  return path;
};

/**
 * A `vector` part's `glyph` field resolved AT ITS COORDINATE — `'{name}'` → `'check'` (#864).
 *
 * Why this exists is worth stating, because the first working version of this branch did not have it and
 * was wrong in exactly #864's own shape. `PartDef.glyph` is a static per-part string, so a set enumerated
 * over a 40-value `name` axis projected 40 members that every gate accepted — the right count, the right
 * names, one chunk, no throw — **all carrying the same outline**. Measured, not feared: member 0
 * `arrow-down` and member 38 `warning-triangle-filled` both came back with the `check` path. That is a
 * component that builds and shows the wrong thing with the suite green, which is #864 reproduced one tier
 * in, and the reason the fix is a substitution rather than a per-glyph def.
 *
 * An unfillable placeholder THROWS rather than passing the raw `'{name}'` to `glyphPath`. Both would fail
 * — `'{name}'` is not in the vocabulary — but the messages answer different questions, and the caller who
 * forgot to pass a coordinate is not helped by a list of glyphs it might have meant.
 *
 * Substitution uses `paintKeyPlaceholders`, the same `{...}` reader `fillPaintKey` uses, so the def tier
 * has ONE placeholder grammar rather than a second one that drifts. It deliberately does NOT reuse
 * `fillPaintKey` itself: that returns `undefined` for an unfillable template because a ragged paint grid
 * is legitimate, and a glyph silently going missing is the defect above.
 */
const resolveGlyph = (
  defId: string,
  part: string,
  glyph: string | undefined,
  coord: VariantCoord,
): string | undefined => {
  if (glyph === undefined) return undefined;
  let out = glyph;
  for (const ph of paintKeyPlaceholders(glyph)) {
    const value = coord[ph];
    if (value === undefined)
      throw new Error(
        `${defId}: anatomy part '${part}' names glyph '${glyph}', but no '${ph}' was given at this coordinate — a vector whose glyph is chosen by an axis cannot be projected without that axis, and filling it with anything else would draw one outline for every member`,
      );
    out = out.replace(`{${ph}}`, value);
  }
  return out;
};

/**
 * `ICON_VIEWBOX` parsed to the `[width, height]` the plan carries.
 *
 * Parsed rather than hard-coded to 24 for the reason `glyphViewBox` exists at all: the executors compare
 * the built frame's box against the artboard the document declared, so the artboard is an input to a
 * read-back and a stale constant would make every glyph's box "correct" against the wrong number.
 * `emit-icons.ts` asserts every source viewBox is exactly this string, so there is one artboard per set
 * and this reads it from the set.
 */
const viewBoxDims = (): [number, number] => {
  const [, , w, h] = ICON_VIEWBOX.split(/\s+/).map(Number);
  if (!w || !h) throw new Error(`icon-glyphs: ICON_VIEWBOX '${ICON_VIEWBOX}' is not '<minX> <minY> <width> <height>' with non-zero dimensions`);
  return [w, h];
};

/**
 * One glyph's path assembled into the SVG DOCUMENT `figma.createNodeFromSvg` takes (#864).
 *
 * Built here rather than stored in `icon-glyphs.ts` because the document is a fact about the CONSUMER —
 * Figma's importer — and the vocabulary is a fact about the set. `emit-icons.ts` asserts each source is
 * one `<path>` on `ICON_VIEWBOX` with `fill="currentColor"` and no stroke, group or transform, so the
 * document reassembled from `ICON_PATHS` is byte-equivalent in the ways the importer reads. Regenerating
 * from the parts also means a glyph cannot arrive here carrying markup the gate never saw.
 *
 * `width`/`height` are written as well as `viewBox`, and that is what makes the returned frame the
 * ARTBOARD: an importer given only a viewBox is free to size the result to the ink, which is the 14×2
 * `minus` this whole shape exists to avoid. The two must agree with the viewBox, so both come from it.
 *
 * `fill="currentColor"` is preserved from the source and is not the ink. Figma has no `currentColor`, so
 * the importer resolves it to a literal black — the paint that matters arrives afterwards, on the VECTOR
 * inside, from `descendantFills`. Carrying it anyway keeps this document identical to the source file,
 * which is what makes `emit-icons.ts`'s assertions about the source assertions about this too.
 */
const glyphDocument = (path: string, fillRule?: string): string =>
  `<svg width="${viewBoxDims()[0]}" height="${viewBoxDims()[1]}" viewBox="${ICON_VIEWBOX}" fill="none" xmlns="http://www.w3.org/2000/svg">` +
  // `fill-rule` is written only when the source declared a non-default one (#1012). It sits BEFORE `d`
  // the way the source authored it, and it is the attribute that keeps a lettered disc's counters cut
  // OUT rather than filled solid — Figma's importer honours it, so a glyph that stored `evenodd` renders
  // as drawn. Absent means `nonzero`, the default both SVG and Figma already assume, so the string is
  // byte-identical to before for every glyph that needs no rule.
  `<path ${fillRule ? `fill-rule="${fillRule}" ` : ''}d="${path}" fill="currentColor"/></svg>`;

/** `glyphDocument` for a resolved glyph NAME — looks its path and (sparse) winding rule up together, so
 *  the two lookups stay in one place and the caller passes a name rather than re-deriving both (#1012). */
const glyphSvgFor = (defId: string, part: string, glyph: string | undefined): string =>
  glyphDocument(glyphPath(defId, part, glyph), glyph ? ICON_FILL_RULES[glyph as keyof typeof ICON_PATHS] : undefined);

const ALIGN: Record<string, 'MIN' | 'CENTER' | 'MAX' | 'BASELINE'> = {
  start: 'MIN', center: 'CENTER', end: 'MAX', baseline: 'BASELINE',
};
const JUSTIFY: Record<string, 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'> = {
  start: 'MIN', center: 'CENTER', end: 'MAX', 'space-between': 'SPACE_BETWEEN',
};
/** A part's word → Figma's (#1009). Deliberately NOT the same vocabulary as `ALIGN` above, which is a
 *  FRAME's cross-axis rule and takes `baseline`; this is a TEXT node's own rule and Figma gives it three
 *  values. Sharing one map would let `align: 'baseline'` be copied onto a text node, where Figma has no
 *  such value and discards the write in silence. */
const VERTICAL_ALIGN: Record<string, 'TOP' | 'CENTER' | 'BOTTOM'> = {
  top: 'TOP', center: 'CENTER', bottom: 'BOTTOM',
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
  size: string | undefined,
  slots: PlanSlots = {},
): AnatomyPlan => {
  const a = def.anatomy;
  if (!a) throw new Error(`${def.id}: no anatomy block to project`);
  // A DEF WITH ONE TYPE SCALE HAS NO SIZE COORDINATE (#795), and `undefined` is how it says so.
  //
  // This used to require a declared size unconditionally, which made a one-scale def — a caption, a
  // focus ring — unprojectable at ANY coordinate by our own construction rather than by anything Figma
  // requires. But "no size" cannot mean "any size is fine": a def that DECLARES sizes and is handed
  // `undefined` would project one member standing for a grid it never enumerated, so the two cases are
  // asked separately and the wrong pairing throws either way.
  //
  // `{size}`-templated binding keys are safe here for a reason that is checked elsewhere rather than
  // assumed: `anatomyErrors` rejects a `{size}` placeholder when `variants.size` is empty
  // (`component-schema.ts:1282`), so a sizeless def cannot carry a template that needs expanding. The
  // guard below is what makes THAT guard load-bearing instead of incidental.
  if (size === undefined) {
    if ((def.variants?.size ?? []).length)
      throw new Error(`${def.id}: no size was given, but the def declares sizes [${(def.variants?.size ?? []).join(', ')}] — a sizeless plan would stand in for a grid this def enumerates, so pass one of them`);
  } else if (!(def.variants?.size ?? []).includes(size)) {
    throw new Error(`${def.id}: '${size}' is not a declared size`);
  }
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
  // Through `statesOf` (#821): `state` is a caller-supplied string and this is the check that decides
  // whether it is a declared one, so reading it as a `State` would be assuming the answer.
  if (state && !statesOf(def).includes(state)) throw new Error(`${def.id}: '${state}' is not a declared state`);
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
  //
  // A sizeless def contributes no `size` key at all rather than `size: undefined` (#795): `fillPaintKey`
  // reads this map, and a present-but-undefined entry fills `{size}` with the string "undefined" — a key
  // that resolves nothing while looking like a real lookup.
  const paintCoord: VariantCoord = { ...coord, ...(size === undefined ? {} : { size }) };

  // ON THE INVERSE GROUND (#1134), and the reason this is a projector rewrite rather than a parallel
  // key table in the def. A control whose `surface` axis is `inverse` binds every colour role's inverse
  // counterpart — `color.interactive.primary.fill.rest` becomes `color.inverse.interactive.primary.fill
  // .rest` — which is docs/20 §9.9's rule stated once: inverse(X) = `color.inverse.` + the role. The def
  // cannot express that as authored keys: a suffix form (`…fill.inverse`) collides with this grammar's
  // `{state}` segment by arity and `paintKeyErrors` rejects it as "state=inverse, nothing supplies it";
  // a prefix form (`inverse.disabled.fill`) collides with `{intent}.{appearance}.{slot}`. So the inverse
  // half of a stateful component is unauthorable in the key vocabulary, and the transform belongs here,
  // where every colour ref already resolves.
  //
  // KEYED ON THE `surface` AXIS BY NAME, which is the ONE inverse-context axis across the bounded set
  // (#1134): both `button` and `focus-ring` declare `surface`, so both paint their inverse ground through
  // this one rewrite rather than each authoring its own inverse keys. `focus-ring` used to author
  // `border.inverse` → `color.inverse.border.focus` and select it with `{slot}.{color}`; #1134 dropped
  // that key and renamed its axis `color` → `surface`, so its lone `border` → `color.border.focus`
  // binding is rewritten here to `color.inverse.border.focus` at `surface=inverse` — the identical
  // variable, now from the one mechanism.
  //
  // WHY THE TRIGGER IS THE AXIS VALUE AND NOT "AUTHORS NO INVERSE KEY": `lint-paint.ts`'s reachability
  // probe swaps every colour ref for a sentinel `color.probe-N`, so a def's authored refs are gone by
  // the time this runs — a "does the def author `color.inverse.*`" test would read the probed tokens and
  // be wrong under the probe. The axis value survives the probe. And it is safe precisely because no def
  // authors an inverse-only key any more: a def relying on the rewrite binds only default-ground roles
  // (`border`, reached at `surface=default`), so the sentinel is never inverse-only and nothing reads as
  // painting nothing. Any future stateful member of the set follows the same shape — declare `surface`,
  // bind default-ground roles, let this supply the inverse.
  const onInverse = axisValue('surface') === 'inverse';
  const toInverse = (ref: string): string =>
    ref.startsWith('color.') && !ref.startsWith('color.inverse.')
      ? `color.inverse.${ref.slice('color.'.length)}`
      : ref;
  const paintVarName = (ref: string): string => figmaVarName(onInverse ? toInverse(ref) : ref);

  // THE NESTED COORDINATE FOR THIS MEMBER (#1134, #1156). A `nest-fixed` part nests one coordinate on
  // every host member; `follow` names host axes whose value flows into the nested coordinate instead, so
  // a `surface=inverse` Button nests the `surface=inverse` ring rather than the fixed default. `variant`
  // is the fallback where the host member does not carry the axis (a structure-only plan). Resolved here,
  // where the coordinate is known per member, rather than projected as a constant.
  const nestVariantOf = (nesting: { variant: Record<string, string>; follow?: readonly string[] }): Record<string, string> => {
    const out: Record<string, string> = { ...nesting.variant };
    for (const axis of nesting.follow ?? []) {
      const v = axisValue(axis);
      if (v !== undefined) out[axis] = v;
    }
    return out;
  };

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

  // BINDING KEYS RESOLVE FROM THE COORDINATE, the same way paint keys do (#1248). There were TWO
  // `expandKey` call sites here — `varOf` and the TEXT-STYLE lookup below — and both substituted
  // `{size}` and nothing else, which is what made `size` the only axis a geometry or type binding
  // could vary by. Nothing had decided that. It was the axis the first templated key needed, and
  // every later def inherited the limit as a rule; #872 is where it bit, with Prism 2's form-label
  // crossing size × weight and only the size half expressible.
  //
  // `paintCoord` is the map to fill from, and it is the SAME map `fillPaintKey` reads a few lines
  // down — one coordinate, one substitution rule, for both kinds of key. It carries `size` (see its
  // own note) and every grid axis this member sits at, and a sizeless def contributes no `size` entry
  // at all rather than `size: undefined`, which is what keeps `{size}` from filling with the string
  // "undefined".
  //
  // An unfillable key is a THROW here rather than a skip, and that is the difference from `paintOf`:
  // a paint template that cannot fill means "try the next one" (a ragged grid is expressible), while
  // a geometry or type key that cannot fill means the node projects with no size or no type style —
  // the silent-loss shape this file keeps finding. `anatomyErrors` refuses a placeholder naming no
  // declared axis, so the reachable case is a coordinate that legitimately lacks the axis.
  const resolveKey = (key: string, what: string): string => {
    const resolved = fillKey(key, paintCoord);
    if (resolved === undefined)
      throw new Error(`${def.id}: anatomy names ${what} key '${key}', whose placeholders [${paintKeyPlaceholders(key).filter((p) => !paintCoord[p]).join(', ')}] have no value at this coordinate ${JSON.stringify(paintCoord)} — the member would project with that binding silently dropped`);
    const ref = def.tokens[resolved];
    if (!ref) throw new Error(`${def.id}: anatomy names binding key '${resolved}'${resolved === key ? '' : ` (from '${key}')`}, which tokens does not bind`);
    return ref;
  };

  // binding key (possibly axis-templated) → Figma variable name, via def.tokens.
  const varOf = (key: string): string => figmaVarName(resolveKey(key, 'binding'));

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
   * `border.inverse` resolve by the same code path as Button's `primary.filled.fill.hover`.
   *
   * THE SLOT SEGMENT IS STILL THIS FILE'S (#784), and that half is what #758 gave away by accident.
   * A def spells the ORDER and the AXES; it does not get to invent the slot NAMES, because the slot is
   * the argument this function is CALLED with — see the five `paintOf(…)` sites below (`overlay`,
   * `fill`, `border`, the text branch's `p.paintSlot ?? 'label'`, and `icon`), which are the entire
   * dispatch vocabulary (`PAINT_SLOTS`). A key whose `{slot}` segment is a word not among them is
   * authored, resolvable and reached at no coordinate: `field-label`'s ink was spelled `text` and
   * painted 0 of 3. `paintKeyErrors` now reads `PAINT_SLOTS` and rejects that, so adding a SIXTH
   * `paintOf('…')` call here is what widens the vocabulary — never an edit to the list alone.
   *
   * ONE OF THE FIVE IS NOW PARAMETERIZED BY THE PART (#796) rather than a literal, and that is a real
   * loosening of the sentence above, so it is said out loud: the text branch asks for `p.paintSlot`,
   * so a def can reach any slot in `PAINT_SLOTS` from a text node by naming it. What it CANNOT do is
   * invent a word — the value still has to be in the list, and the list still only grows when a
   * dispatch exists. So the guarantee that survives is the one that matters: every `{slot}` segment
   * anywhere in the corpus is a word this file dispatches. See `PAINT_SLOTS` for the admissibility
   * rule that keeps the list from becoming a per-part registry.
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
   *
   * AND THE INK IS CONDITIONAL ON STRUCTURE THE SAME WAY THE FILL IS (#784) — the half this branch was
   * missing, and the only finding in this pass with a measured contrast consequence. `disabled.fill` was
   * already applied only where the appearance HAS a fill at rest, precisely so a ghost button does not
   * become a gray box. But the INK was applied unconditionally, and ink on a fill is a different
   * contract from ink on the page: the token tier emits BOTH (`disabled.text`, gated against the page
   * floor, and `disabled.on-fill`, gated against `disabled.fill` — Carbon's `text-on-color-disabled`),
   * and this branch only ever asked for one. So a disabled FILLED button painted page ink on a fill:
   * 2.14:1 on wendys, 2.55:1 on harbor, against a 3.04-3.08:1 contract that already existed, was
   * already gated per mode, and was bound by the def and reached at no coordinate in the grid.
   *
   * So the ink asks for the ON-FILL form where a disabled fill actually lands, and the plain form
   * otherwise — the same `restKey` question the structural guard asks, which is why the two now read as
   * one rule rather than two. `outline` and `text` have no fill to sit on, so they keep page ink.
   */
  const STRUCTURAL = new Set(['fill', 'border']);
  // `indicator` is INK, not structure, and the distinction is about the GROUND rather than the node's
  // kind (#910). A radio's dot is a filled box, so it looks structural; but it is the mark, it sits on
  // the control's fill, and at `disabled` that fill is `color.disabled.fill` — so its ink has to be the
  // on-fill form for the same contrast reason #784 gives for a label. Leaving it out resolved
  // `disabled.indicator` instead, a key no def binds, so the dot kept its checked primary ink on a gray
  // disc. Not caught by the structural guard above (the dot's presence is `presentWhen`'s business, not
  // paint's) and not caught by any contrast gate, because the pairing it violates is one nothing had
  // asked about — arm 3 of `lint-paint.ts` named it, which is what that arm is for.
  const INK = new Set(['label', 'icon', 'indicator']);
  const restKey = (slot: string): boolean =>
    (def.paintKeys ?? []).some((t) => {
      const k = fillPaintKey(t, slot, { ...paintCoord, state: undefined });
      return !!k && !!def.tokens[k];
    });
  const paintOf = (slot: string): string | undefined => {
    if (!def.paintKeys?.length) return undefined;
    if (state === 'disabled') {
      if (STRUCTURAL.has(slot) && !restKey(slot)) return undefined;
      // `disabled.<slot>.on-fill` is a QUALIFIED form of the same slot, not a slot of its own — the
      // node being painted is still the label or the glyph, and only the ground beneath it changed.
      // Keying it that way is what keeps the vocabulary check honest: the slot segment stays a word the
      // projector dispatches, so a def cannot smuggle an unreachable key in behind the qualifier.
      const onFill = INK.has(slot) && !!def.tokens['disabled.fill'] && restKey('fill');
      const key = (onFill && def.tokens[`disabled.${slot}.on-fill`] && `disabled.${slot}.on-fill`) || `disabled.${slot}`;
      // Same inverse rewrite as the template branch below: a disabled control on an inverse ground binds
      // `color.inverse.disabled.*`, which exists for exactly this pairing (#1134). The cross-cutting
      // branch never sees `{surface}`, so the rewrite happens on the resolved ref, not the key.
      return def.tokens[key] ? paintVarName(def.tokens[key]) : undefined;
    }
    for (const template of def.paintKeys) {
      // A SLOT-FREE template answers only the part's primary paint slot — see `PRIMARY_PAINT_SLOTS`
      // for the measurement. Without this, `icon`'s `tone.{tone}` answered `border` with the same
      // variable it answered `fill`, and every glyph in the set came back outlined.
      if (!template.includes('{slot}') && !PRIMARY_PAINT_SLOTS.has(slot)) continue;
      const k = fillPaintKey(template, slot, paintCoord);
      if (k && def.tokens[k]) return paintVarName(def.tokens[k]);
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

  /* Which part the active overlay actually lands on AT THIS COORDINATE — the FIRST present `replaces`
   * candidate, or `overlaysWhenAbsent` when none of them is present (#612, generalized by #848).
   *
   * The distinction the two branches encode is IN-FLOW vs OUT-OF-FLOW, and it is the whole fix. When a
   * visual cell is there, the spinner TAKES it: one node in one position, width identical because the
   * cell was already the icon's size. When there is NO visual cell there is nothing to take, and the
   * pre-#612 code fell through to giving the spinner a cell of its own — which grew a label-only button
   * by 28px at medium (a 32px cell, less the 4px the left padding tightens by once the cell reads as
   * filled) and reflowed the form mid-submit. So in that case only, the spinner goes ABSOLUTE over the
   * label, which stays in flow at zero opacity holding the width open.
   *
   * #848 IS WHERE "a visual cell" REPLACED "the leading visual". `replaces` was one name, so
   * `leading=false, trailing=true` — which HAS a visual cell — took the out-of-flow branch anyway and
   * hid the label. What rendered was spinner + trailingVisual and no text: two icons, no label, in a
   * live paste. Now the candidates are walked in the def's order and the first present one wins, so
   * that coordinate lands in the trailing cell with the label fully visible. The fallback is reached
   * only when there is genuinely no visual cell — the label-only button it was written for.
   *
   * Keyed off presence rather than off any part's name, like every other rule in this builder, so a
   * second def declaring an overlay over its own optional slots gets the same behavior with no change
   * here. `find` rather than `filter`: FIRST present is the rule, and the def's order is the ranking. */
  const replacedByOverlay = activeOverlay
    ? replacesCandidates(activeOverlay[1]).find((r) => slotPresent(r))
    : undefined;
  const overlaidPart = activeOverlay && !replacedByOverlay ? activeOverlay[1].overlaysWhenAbsent : undefined;

  const present = (name: string): boolean => {
    // The replaced part yields its cell — one node in one position, not two fighting for it. Figma
    // builds every variant as its own tree, so there is nothing to hide: the `pending` variant simply
    // has a spinner where the leading visual would otherwise be.
    if (replacedByOverlay && name === replacedByOverlay) return false;
    if (name === 'leadingVisual') return leading;
    if (name === 'trailingVisual') return trailing;
    const p = a.parts[name];
    // VARIANT-GATED PRESENCE (#910), the first presence rule keyed on a coordinate that is not a state.
    // AND across axes, and an axis the caller did not supply reads as ABSENT rather than present — the
    // same answer the `absolute` line below gives when `state` is undefined, and the conservative one:
    // a structure-only plan of a checkbox carries neither the check nor the dash, where returning `true`
    // would give it both at once in a tree no member of the set ever builds.
    if (p?.presentWhen)
      for (const [axis, values] of Object.entries(p.presentWhen)) {
        const v = axisValue(axis);
        if (v === undefined || !values.includes(v)) return false;
      }
    // An `absolute` part is state-gated exactly as an overlay is — it appears on its `when` state and
    // nowhere else. Read off `when` rather than from a name, so the ring's presence follows the same
    // rule the spinner's does and a second def gets it for free. This is what closes #536 item 3's
    // measured symptom: `state=focus-visible` emitted a plan byte-identical to `rest` in all 108 rows,
    // because the ring was not a part at all and nothing else distinguishes focus.
    if (p?.kind === 'absolute') return !!p.when && p.when === state;
    return !p?.optional;
  };

  /* WHERE A TRAVELLING CHILD PUTS ITS PARENT'S DISTRIBUTION (#990). A switch's thumb declares
   * `positionWhen: { selection: { off: 'start', on: 'end' } }`, and this is where that becomes Figma:
   * the value is read at THIS coordinate and replaces the parent's own `layout.justify`.
   *
   * PROJECTED ONTO THE PARENT because Figma offers nowhere else to put it. `layoutAlign`'s
   * `MIN|CENTER|MAX` are deprecated ("all layers in an auto-layout frame must now have the same counter
   * axis alignment") and are the counter axis regardless; `layoutGrow` is a 0/1 stretch flag. The only
   * main-axis distribution in the API is `primaryAxisAlignItems` on the frame — which both executors
   * already write unconditionally alongside `layoutMode`, so this reaches Figma with no new plan field
   * and no executor change. That measurement is why #990 option 1 was not taken: it would have widened
   * the plan type and both executors and still left the thumb unable to move.
   *
   * Called with the PRESENT children only, so a part gated away by `presentWhen` cannot move a parent it
   * is absent from. First match wins across children, which is unambiguous because `anatomyErrors`
   * admits at most one flow child under a positioning parent and at most one axis per part — the
   * ordering here is a consequence of those rules, not a tie-break substituting for them.
   *
   * An axis the caller did not supply reads as NO OVERRIDE rather than as a default position: a
   * structure-only plan gets the def's declared `justify` and the parent is projected exactly as an
   * unpositioned one. The conservative direction, and the same answer `present()` gives — asserting a
   * coordinate on no evidence is what ships. */
  const positionOf = (childNames: readonly string[]): 'start' | 'center' | 'end' | undefined => {
    for (const c of childNames) {
      const byAxis = a.parts[c]?.positionWhen;
      if (!byAxis) continue;
      for (const [axis, byValue] of Object.entries(byAxis)) {
        const v = axisValue(axis);
        if (v !== undefined && byValue[v]) return byValue[v];
      }
    }
    return undefined;
  };

  // THE TEXT PLACEHOLDER FOR THIS MEMBER (#1018). `default` is one string for the whole set, so a def whose
  // axis changes what the text should SAY (a validation message's `tone`) rendered the same copy on every
  // member — `field-message`'s error member shipping the `tone=default` helper string. `byVariant` names,
  // per axis, the copy a member at that coordinate renders; resolved here against `axisValue`, first matching
  // axis wins (the exact shape `positionOf` uses one field up), and any coordinate it does not name falls
  // back to `default`. A structure-only plan supplies no axis values, so it reads `default` — byte-identical
  // to before for every def that declares no `byVariant`.
  const textDefaultOf = (t: { default: string; byVariant?: Record<string, Record<string, string>> }): string => {
    for (const [axis, byValue] of Object.entries(t.byVariant ?? {})) {
      const v = axisValue(axis);
      if (v !== undefined && byValue[v] !== undefined) return byValue[v];
    }
    return t.default;
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
  // #1018: the canonical (fallback) default per text part, for the SET-LEVEL property — constant across
  // members, unlike `placeholder` which is this member's own copy.
  const textDefaults = new Map<string, string>();
  for (const [prop, t] of Object.entries(fp?.texts ?? {})) {
    drivenBy.set(t.part, { field: 'characters', prop });
    placeholder.set(t.part, textDefaultOf(t));
    textDefaults.set(t.part, t.default);
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
      // A NON-SQUARE box states its main axis separately (#990). Two variables rather than one, which is
      // the case the aspect-ratio unlock above was already required for: a proportion-locked frame keeps
      // whichever dimension was written last, and a 2:1 track written height-then-width would come back
      // square. `unlockAspectRatio()` runs before every binding in both executors, so nothing extra is
      // needed here — but the reason it is safe is that call, not the arithmetic.
      if (p.width) bound.width = varOf(p.width);
      if (p.radius) for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) bound[c] = varOf(p.radius);
      // THE PART'S OWN STROKE (#1266, #740's field). One property, and the only one Figma offers: a
      // stroke's color is a bound PAINT (`paintSlots`) and its style is a `dashPattern`, so `strokeWeight`
      // is the whole of what a `strokeWidth` key can reach. Both executors' `if (!node.strokeWeight) … = 1`
      // fallback now stands down when this binding wrote — unconditional it would UNBIND what Figma just
      // accepted, which is the same last-write-wins silence the aspect-ratio unlock exists for.
      if (p.strokeWidth) bound.strokeWeight = varOf(p.strokeWidth);
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

    // THE TYPE KEY, resolved from the coordinate like every other binding key (#1248). This lookup
    // used to expand `{size}` alone, so a def could scale its type by size and by nothing else —
    // which is exactly the constraint #872 hit and deferred here.
    let textStyle: string | undefined;
    if (p.type) textStyle = figmaTextStyleName(resolveKey(p.type, 'type'));

    // PAINT BY PART KIND, and for a box by the part's OWN DECLARATION. `label` takes ink because it is
    // text; a slot takes ink on its VECTOR descendants; a box takes the slots it names in `paintSlots`.
    // Nothing here reads `role` — see below, and see the field's own note for why it still exists.
    const paints: { fills?: string; strokes?: string } = {};
    let descendantFills: string | undefined;
    if (p.kind === 'box') {
      // THIS LINE USED TO READ `p.kind === 'box' && p.role === 'target'`, and that was #933: `role`
      // answers "what does the user click", and it was also deciding "what carries colour". The two
      // have the same answer in every def written so far — every anatomy in the corpus is one box and
      // one target, and they are the same part — so nothing ever exercised the difference. A switch is
      // where they come apart: its whole ROW is clickable, which makes the row the target, while the
      // fill belongs to the TRACK. Probed against the real def, both configurations validated with
      // ZERO errors and the row-as-target one painted the track's `on` fill across the entire label
      // row. Structurally valid output that does not do its job — nothing resolves to nothing, nothing
      // throws, and no gate that asks "does it resolve" can see it.
      //
      // `paintSlots` IS A LIST BECAUSE `paintOf` IS PART-BLIND. It takes a slot and never learns which
      // part asked, so the cheaper repair — let any box paint and let the def's keys decide — was
      // measured and is worse than the defect: row, track and thumb all came back bound to the same
      // `color/interactive/primary/fill/selected`. The field's note carries that measurement.
      //
      // `outline` and `text` key no `.fill`, so an unfilled box is the correct projection of both — not
      // a dropped binding. `text` keys no border either; only `outline` does.
      const declared = p.paintSlots ?? [];
      // THE OVERLAY IS THE SAME SLOT AS THE FILL, and this is #487 §8's per-appearance rule rather than
      // a shortcut. `filled` expresses hover by CHANGING its fill; `outline` and `text` have no fill to
      // change, so they express it as a translucent overlay — which in Figma is a fill on the same node.
      // One node, one `fills` array, two token families reaching it depending on appearance. Which wins
      // is now the DEF'S declaration order rather than a `??` here: for `filled` only the fill resolves
      // and for the other two only the overlay does, so a def keying both is stating a contradiction,
      // and it should be reading its own answer to that rather than inheriting ours.
      let fill: string | undefined;
      for (const slot of declared) {
        if (slot === 'border') continue; // the one EDGE slot — it reaches `strokes`, never `fills`
        fill = paintOf(slot);
        if (fill) break;
      }
      const border = declared.includes('border') ? paintOf('border') : undefined;
      if (fill) paints.fills = fill;
      if (border) paints.strokes = border;
    } else if (p.kind === 'text') {
      // THE ONE PLACE A PART NAMES ITS OWN SLOT (#796), and the default is what keeps that from being a
      // widening: a text part that declares nothing asks for `label`, exactly as before. What the field
      // buys is a SECOND text node with a different ink role — `field-label`'s de-emphasised
      // "(optional)" suffix — which was unreachable at every coordinate while this line read `'label'`
      // unconditionally, because `paintOf` dispatches by slot and never sees which part asked. Measured:
      // both of `field-label`'s text parts came back `color/text/primary`.
      const ink = paintOf(p.paintSlot ?? 'label');
      if (ink) paints.fills = ink;
    } else if (p.kind === 'vector') {
      // THE GLYPH'S OWN INK, on the node that draws it (#864). `icon` is in `PRIMARY_PAINT_SLOTS`, so a
      // slot-free template answers it — which is what lets `icon`'s `tone.{tone}` reach this branch.
      //
      // `descendantFills` AND NOT `paints.fills`, and this reversed mid-branch when the build strategy
      // moved to `createNodeFromSvg` — the reason is worth carrying because the earlier reading was
      // defensible and wrong. It said: `descendantFills` is for a HOST pushing ink down into an instance
      // it swapped in, whereas here we ARE the vector, so its fill is its fill. What changed is the second
      // clause. Figma builds a glyph from an SVG document and hands back a FRAME wrapping the outline, so
      // the node this part names is the ARTBOARD and the vector is its child. A fill on the artboard is a
      // painted square BEHIND the glyph — the exact failure `descendantFills` was invented to avoid, met
      // from the other side. So the ink goes where the ink has always gone: on the VECTOR, found by
      // descendant search. One field, one meaning, whoever is pushing.
      const ink = paintOf('icon');
      if (ink) descendantFills = ink;
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
    // #1018: the canonical set-level default (the fallback `default`, constant across the set), carried
    // on the plan ONLY where it DIVERGES from this member's own `chars` — i.e. only on a `byVariant`
    // member whose per-coordinate copy differs from the fallback. Where the two are equal (every member
    // of a def with no `byVariant`, and `byVariant`'s own `default`-coordinate member) it is omitted, so
    // those plans stay byte-identical and their `planStamp` (lint-component-surface, #1259) does not move
    // — the surface change is scoped to the members that actually changed, which is `field-message`'s
    // error / warning / success. `planSetProperties` reads `n.textDefault ?? n.characters`, so an omitted
    // `textDefault` still resolves the same set-level default.
    const textDef = p.kind === 'text' ? textDefaults.get(name) : undefined;
    // An overlay inherits the CELL's property, not its own. It stands in the replaced part's
    // position, so the swap that pointed at that cell should keep pointing at it — one cell, one
    // INSTANCE_SWAP property, contents varying by state. Without this the spinner builds as an
    // instance nothing nominates: the stub host reported it as a placeholder frame with no VECTOR
    // inside to paint, which is a spinner that is present, unswappable and invisible.
    // Only when the overlay actually TOOK a cell. Out of flow it owns no cell, so it inherits no
    // property — and the RESOLVED candidate is the right lookup even then rather than `overlaidPart`,
    // because inheriting the OVERLAID part's property would hand the spinner the label's `characters`
    // property and try to write text into an INSTANCE_SWAP. `drivenBy` returns undefined when no cell
    // was taken, which is the correct answer: nothing is nominating a swap the designer can repoint,
    // since there is no visual slot at this coordinate to repoint.
    //
    // `replacedByOverlay` rather than `p.replaces` since #848 — the field is now a LIST, and the cell
    // the overlay took is whichever candidate resolved, not the first one declared. Reading `p.replaces`
    // here would hand the spinner the LEADING cell's swap property at a coordinate where it actually
    // took the TRAILING one, so a designer repointing the trailing visual would find the spinner
    // following it and vice versa — with both properties existing, so nothing would look broken.
    const cellName = p.kind === 'overlay' && replacedByOverlay ? replacedByOverlay : name;
    const propertyRef = drivenBy.get(cellName);

    return {
      name,
      // `nest` (#1226 PR-A) projects the SAME `NESTED_INSTANCE` as `absolute` — the difference is the flow,
      // not the node type: a `nest` carries no `absoluteInset`, so it stays a normal flow child (a cell),
      // where an `absolute` is positioned out of the flow below. The plugin builds both by `createInstance`.
      type: p.kind === 'text' ? 'TEXT' : p.kind === 'box' ? 'FRAME' : (p.kind === 'absolute' || p.kind === 'nest') ? 'NESTED_INSTANCE' : p.kind === 'vector' ? 'GLYPH' : 'INSTANCE_SWAP',
      // THE GEOMETRY, resolved from the vocabulary at projection (#864). A name that no longer resolves
      // THROWS rather than projecting an empty outline, which is the whole reason the def carries a name
      // instead of path data: #864 was four artboards that built without throwing and contained nothing,
      // and a silent miss here would rebuild exactly that. `glyphViewBox` travels beside it as the box the
      // executors expect the built frame to COME BACK as, so a host that sizes the import to the ink
      // instead of the artboard is reported rather than shipped.
      // `resolveGlyph` first, so `glyph: '{name}'` reaches the vocabulary as the member's own name — a
      // static string per part would ship one outline 40 times, measured (see `resolveGlyph`).
      // `paintCoord` rather than `coord` for the same reason paint keys use it: it is the grid coordinate
      // WITH `size` folded in, so `glyph: '{size}'` — an optically-sized glyph set, which no def has today
      // but which the field's grammar allows — resolves instead of throwing on an axis that is in fact known.
      ...(p.kind === 'vector'
        ? {
            glyphSvg: glyphSvgFor(def.id, name, resolveGlyph(def.id, name, p.glyph, paintCoord)),
            glyphViewBox: viewBoxDims(),
          }
        : {}),
      ...((p.kind === 'absolute' || p.kind === 'nest') && p.nests ? { nestTarget: p.nests } : {}),
      // The def's chosen coordinate, projected only for `nest-fixed` (#681). `nest-exposed` is the
      // consumer's to drive and `swap` has no variants at all, so neither writes a coordinate here —
      // and the executors read the field's ABSENCE as "do not select", which is the only reading that
      // keeps an exposed nest from being silently pinned by its own projection.
      ...((p.kind === 'absolute' || p.kind === 'nest') && p.nesting?.kind === 'nest-fixed' ? { nestVariant: nestVariantOf(p.nesting) } : {}),
      ...(p.kind === 'absolute' && p.inset ? { absoluteInset: varOf(p.inset) } : {}),
      // The stroke to compensate for (#801), projected only alongside an inset — on its own it has
      // nothing to correct, and the schema rejects that shape before the projection sees it.
      ...(p.kind === 'absolute' && p.inset && p.strokeInset ? { absoluteStrokeInset: varOf(p.strokeInset) } : {}),
      // The out-of-flow half of the #612 fix, on the two nodes it concerns: the overlay is centered
      // absolutely, and the part it covers holds its cell at zero opacity. Both are keyed off
      // `overlaidPart`, so when the overlay lands on a real cell (`replaces` present) neither appears
      // and the projection is byte-identical to before — which is what keeps this change to the 108
      // rows that were actually wrong.
      ...(overlaidPart && name === activeOverlay?.[0] ? { absoluteCenter: true, absoluteCenterOn: overlaidPart } : {}),
      ...(overlaidPart && name === overlaidPart ? { zeroOpacity: true } : {}),
      ...(chars !== undefined ? { characters: chars } : {}),
      ...(textDef !== undefined && textDef !== chars ? { textDefault: textDef } : {}),
      ...(propertyRef ? { propertyRef } : {}),
      ...(textStyle ? { textStyle } : {}),
      // ON EVERY TEXT NODE, not only the overriding ones — see the field's own note. The default lives
      // here and nowhere else, so this line IS the rule #1009 asked to be located.
      ...(p.kind === 'text' ? { textAlignVertical: VERTICAL_ALIGN[p.verticalAlign ?? 'center'] } : {}),
      ...((p.kind === 'slot' || p.kind === 'overlay') && slots.swapTarget ? { swapTarget: slots.swapTarget } : {}),
      ...(Object.keys(paints).length ? { paints } : {}),
      ...(descendantFills ? { descendantFills } : {}),
      ...(p.layout
        ? {
            layoutMode: p.layout.direction === 'row' ? ('HORIZONTAL' as const) : ('VERTICAL' as const),
            // A travelling child's declared position OVERRIDES the parent's own justify at this
            // coordinate (#990) — see `positionOf`. Absent one, the def's justify is projected unchanged,
            // so every existing plan is byte-identical.
            primaryAxisAlignItems: JUSTIFY[positionOf(childNames) ?? p.layout.justify],
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
    // Omitted rather than set to `undefined`, so `JSON.stringify` (the payload's wire format) carries
    // no `size` key at all for a sizeless def rather than a key the paste path has to interpret.
    ...(size === undefined ? {} : { size }),
    slots: { leading, trailing },
    // Read off the DEF, which is the only thing that knows the difference between a slot that is
    // absent on this member and a slot the component does not have. See `AnatomyPlan.slotAxes`.
    slotAxes: (def.figmaProperties?.slotAxes ?? []).map((s) => s.name),
    coord,
    // Declaration order, `size` removed — it has its own fixed position in the name. See the field's note.
    gridAxisOrder: (def.figmaProperties?.variantAxes ?? []).filter((a) => a !== 'size'),
    root: node(a.root, a.parts[a.root]),
    codeOnly: [...a.codeOnly],
    derived: { ...(a.derived ?? {}) },
    ...(def.figmaProperties?.gridAxis ? { gridAxis: def.figmaProperties.gridAxis } : {}),
    footprintVaries: [...(def.figmaProperties?.footprintVaries ?? [])],
  };
};

/** The two SLOT axes `figmaAnatomyPlan` can be handed. Still a closed list, and unlike the variant axes
 *  it is closed for a reason that is not going to move: these two are `PlanSlots` BOOLEANS wired to
 *  named parts, so a third would need a plan field and a projector branch rather than a value.
 *
 *  THERE IS NO `PROJECTABLE_VARIANT_AXES` ANY MORE (#795). It listed `intent`, `appearance` and `size`
 *  — Button's vocabulary — and `figmaAnatomySet` threw on anything else, which is what made `tone`
 *  (`field-message`) and `color` (`focus-ring`) unprojectable independently of the size wall. The throw
 *  was RIGHT about its rule: enumerating around an unknown axis emits a set silently missing it (#487
 *  §5's 189-vs-756). It was wrong about the vocabulary being the projector's to fix, because
 *  `figmaAnatomyPlan` has accepted arbitrary axis names since #758 — `VariantCoord`'s index signature is
 *  exactly that — so the enumeration was the only thing that still hardcoded three names. Now it
 *  enumerates whatever `variantAxes` declares, and the safety the throw provided is kept by the
 *  empty-set check at the end of `figmaAnatomySet`: the failure it guarded against was a set that
 *  quietly omits an axis, and a set with no members is the same defect with the count at zero. */
const PROJECTABLE_SLOT_AXES = ['leading', 'trailing'];

/** The `derived` key a def carries to opt IN to `controlShape` (#1163). Its VALUE is inert prose ("height
 *  ÷ 2 — …"); its PRESENCE is the selector. Today button + icon-button carry it; switch + radio do not, so
 *  they are outside the pill-able set by construction (asserted in `test.ts`, so the lever can never square
 *  them off). A future chip/tag/segmented control joins the set by declaring this key — nothing else. */
export const PILL_RADIUS_DERIVATION = 'pill-radius';

/** The rung a pill-able control binds under `controlShape: pill`. `radius.capsule` is a 999px sentinel —
 *  a single radius Figma clamps to min(w,h)/2 = height ÷ 2 at every size, which is the "pill-radius
 *  derivation" the def documents rather than a per-component literal. It is DISTINCT from `radius.round`
 *  (128px, the rung switch/radio bind intrinsically) on purpose (#1163): 128 stops being a full pill above
 *  a 256px control height, so the lever needs a rung whose ceiling no real control reaches, and raising it
 *  here must not touch the rung the intrinsic pills bind. Both are CORNER_RADIUS-scoped radii — a radius
 *  bound to a radius corner, not a height variable bound across Figma's scope boundary. */
export const PILL_RADIUS_RUNG = 'radius.capsule';

/** True when `def` is a pill-able control — it declares the `pill-radius` derivation. */
export const isPillable = (def: ComponentDef): boolean => !!def.anatomy?.derived?.[PILL_RADIUS_DERIVATION];

/**
 * Materialize a def for a brand's `controlShape` lever (#1163), BEFORE projection — this is why the choice
 * does not thread through `figmaAnatomyPlan`/`figmaAnatomySet`.
 *
 * The plan is BRAND-AGNOSTIC on purpose (`figmaVarName`'s header): seven gates, the studio's member count
 * and the plugin's set enumeration call `figmaAnatomySet(def)` with a def and nothing else, and a plan that
 * asked "whose brand?" would break all of them. `controlShape` IS a brand choice, so rather than give the
 * projector a brand input, the caller that knows the brand rewrites the DEF first and hands the projector a
 * def as before. The projector stays a pure function of its def; the brand-specificity lives here.
 *
 * What it does: under `pill`, a pill-able control's `radius` binding key is repointed from its rounded rung
 * (`radius.md`) to the shared pill rung (`radius.round`). `varOf` still resolves `radius` through
 * `def.tokens` exactly as before — only the ref it finds there has moved — so no binding is bypassed and no
 * per-component token is introduced. Under `rounded` (default) and for any def that is not pill-able, this
 * is the IDENTITY: it returns the same object, which is what makes `rounded` reproduce every plan
 * byte-identically (acceptance #1, the no-op-default independence check).
 *
 * NARROW BY CONSTRUCTION: it rewrites ONLY the `radius` key and ONLY for pill-able defs. `switch`/`radio`
 * carry no `pill-radius` derivation, so `isPillable` is false and they pass through untouched — the lever
 * cannot reach the one binding (`radius.round`) that already gives them their intrinsic pill/circle.
 */
export const applyControlShape = (def: ComponentDef, shape: ControlShape): ComponentDef => {
  if (shape !== 'pill' || !isPillable(def)) return def;
  return { ...def, tokens: { ...def.tokens, radius: PILL_RADIUS_RUNG } };
};

/**
 * Every variant the def's Figma projection DECLARES, as plans — the whole set, ready for either executor.
 *
 * WHY THIS EXISTS AT ALL. `figmaAnatomyPlan` builds ONE plan and both executors take `AnatomyPlan[]`, so
 * "which plans" was, until now, six nested loops written out at each call site. The test suite has three
 * copies of them and the plugin's trigger (#483) would have been a fourth — in `main.ts`, which calls
 * `figma.showUI` at module scope and is therefore unreachable from any test. So the enumeration lives
 * here, where it is pure and gated, and the trigger is the thin thing it should be.
 *
 * THE DECLARATION IS THE VOCABULARY (#795). `variantAxes` names the axes this def projects, and this
 * function enumerates exactly those — by name, off the def. It used to enumerate `intent` and
 * `appearance` from two hardcoded loops and refuse everything else, which was Button's vocabulary
 * standing in for the projector's: `field-message`'s `tone` and `focus-ring`'s `color` were refused not
 * because a plan could not carry them (it has been able to since #758) but because the enumeration had
 * no loop for them.
 *
 * WHAT THE OLD REFUSAL WAS RIGHT ABOUT, kept: iterating around an axis emits a set that is internally
 * consistent, combines cleanly, and is silently missing a whole axis (#487 §5's 189-vs-756). That
 * property is now held by the empty-set throw at the bottom plus `figmaAxisNames`' parity gate, rather
 * than by a closed list — a list that also refused the honest cases.
 *
 * SLOT FILL IS ALWAYS ENUMERATED and SIZE NO LONGER IS. Both follow from the name being a wire format:
 * `planComponentName` writes `leading=`/`trailing=` for a def that declares them, and writes `size=`
 * only where `size` is declared (#795). Pinning one value for an undeclared axis gives every member an
 * identical coordinate on it, which is harmless — but pinning `size` while the def declares three would
 * give N members one name, and `planSetLayout` refuses a duplicate coordinate. So the enumeration covers
 * what the name carries, and since #795 the name carries what the DECLARATION lists. Those are now the
 * same sentence, which is the whole of this change.
 *
 * `swapTarget` is an option and not a def field for the reason #513 recorded live: which component fills
 * a slot is a fact about the FILE, not about the component. The same def builds in a file whose
 * placeholder icon is called anything, so the caller that knows the file nominates it.
 */
export const figmaAnatomySet = (def: ComponentDef, opts: { swapTarget?: string } = {}): AnatomyPlan[] => {
  const fp = def.figmaProperties;
  if (!fp) throw new Error(`${def.id}: no figmaProperties block — nothing declares which axes become a Figma set`);
  const declared = fp.variantAxes ?? [];
  // No variant-axis vocabulary check any more (#795) — see `PROJECTABLE_SLOT_AXES` for why the list is
  // gone rather than widened. `validateComponentDef` still requires every name here to be a real
  // `variants` axis, so an axis this loop cannot fill is caught by the schema rather than admitted.
  const slotAxes = (fp.slotAxes ?? []).map((s) => s.name);
  const unprojectableSlots = slotAxes.filter((s) => !PROJECTABLE_SLOT_AXES.includes(s));
  if (unprojectableSlots.length)
    throw new Error(`${def.id}: figmaAnatomySet cannot project slot axes [${unprojectableSlots.join(', ')}] — figmaAnatomyPlan takes ${PROJECTABLE_SLOT_AXES.join('/')} and nothing else`);

  // `[undefined]` rather than `[]` for an axis the def does not declare: one pass through the loop with
  // no coordinate on it, which is what `figmaAnatomyPlan` reads as "structure only on that axis".
  const one = <T>(xs: T[] | undefined, on: boolean): (T | undefined)[] => (on && xs?.length ? xs : [undefined]);
  const states = one(fp.stateAxis?.values, !!fp.stateAxis);
  // SIZE IS NOW GATED ON THE DECLARATION (#795), where it used to be enumerated unconditionally because
  // the NAME always carried it. `[undefined]` is the sizeless pass — one plan on that axis, no `size=`
  // in the name — and it is the same `one()` every other axis uses rather than a special case.
  const sizes = one(def.variants?.size, declared.includes('size'));
  // EVERY OTHER DECLARED AXIS, BY NAME OFF THE DEF (#795). This used to be two hardcoded loops over
  // `intent` and `appearance`, which is why `tone` and `color` were refused: the vocabulary was the
  // projector's, so a def could declare an axis the enumeration had no loop for. Now the def's own
  // `variantAxes` drives it and `figmaAnatomyPlan` puts each value on the coord under its own name —
  // which it has done since #758, via the `VariantCoord` index signature. `size` is excluded because it
  // is a positional argument rather than a coord entry, and the two slot axes because their values are
  // booleans from `anatomy.parts` rather than strings from `variants`.
  const gridAxes = declared.filter((a) => a !== 'size');
  const gridValues = gridAxes.map((a) => one(variantsOf(def)[a], true));
  const bools = (name: string): boolean[] => (slotAxes.includes(name) ? [true, false] : [false]);

  // The cartesian product of the declared axes, in DECLARATION order — `variantAxes` is the order Figma
  // shows the properties in, and `planSetLayout` derives its grid from the resulting names, so the two
  // have to walk the same way round. Written as a fold rather than nested `for`s because the number of
  // axes is now the def's to choose; the previous six-deep nest is what fixed the vocabulary in place.
  const coords = gridValues.reduce<(string | undefined)[][]>(
    (acc, values) => acc.flatMap((prefix) => values.map((v) => [...prefix, v])),
    [[]],
  );

  const plans: AnatomyPlan[] = [];
  for (const combo of coords)
    for (const size of sizes)
      for (const state of states)
        for (const leading of bools('leading'))
          for (const trailing of bools('trailing'))
            plans.push(figmaAnatomyPlan(def, size, {
              leading,
              trailing,
              ...(opts.swapTarget ? { swapTarget: opts.swapTarget } : {}),
              ...Object.fromEntries(gridAxes.flatMap((a, i) => (combo[i] === undefined ? [] : [[a, combo[i]]]))),
              ...(state ? { state } : {}),
            }));

  // A DEF THAT DECLARES AXES AND PROJECTS NO COORDINATE IS A FAILURE, NOT AN EMPTY ANSWER (#795, #802's
  // class: every layer accepted and nothing read the count).
  //
  // This is the gate the size relaxation made necessary, and the FIRST VERSION OF IT WAS UNREACHABLE —
  // worth recording, because the shape is the one docs/34 is about and it survived a full green suite.
  // It read `if (plans.length === 0) throw`, on a measurement taken before this function was rewritten:
  // `figmaAnatomySet(fieldMessage, { variantAxes: [] })` did return OK → 0 plans under the old nested
  // loops. Under the fold it cannot: `one()` maps an absent or empty axis to `[undefined]`, so the
  // product of nothing is one empty coordinate and the set comes back with **1 plan named `""`**. Zero
  // was never the reachable failure. And the two tests I wrote for it both PASSED — on Button's *size*
  // guard throwing first, an unrelated throw satisfying a gate that asked only "did it throw".
  //
  // So the rule is stated as what actually goes wrong: a set whose members carry NO COORDINATE. One
  // unnamed member is the 189-vs-756 failure through the front door — declaration and emitter disagreeing
  // while both look internally consistent — and it is worse than zero, because zero is at least visibly
  // nothing while one blank member pastes a component that looks built.
  //
  // Asked of the RESULT (the names the projector produced) rather than of the declaration: a check that
  // re-read `variantAxes` would assert the input against itself. `planComponentName` is the oracle here
  // because it is the wire format — an axis on the coord that never reaches the name is invisible to
  // `nestVariantMatch` and `planSetLayout` alike, so the name is the thing whose emptiness matters.
  const unnamed = plans.filter((p) => planComponentName(p) === '');
  if (unnamed.length)
    throw new Error(`${def.id}: figmaAnatomySet projected ${unnamed.length} member(s) with NO variant coordinate at all — the def declares variantAxes [${declared.join(', ')}], so an unnamed member means an axis has no values in \`variants\` (or the list is empty). A member with no coordinate is not a projection; declare the values, or admit the axis in anatomy.codeOnly`);
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

/** Every variable name a plan REFERENCES without binding — the two geometry names Figma's `x`/`y`
 *  cannot bind but which the payload still resolves by name to read values from.
 *
 *  Folded into `planBoundVars` rather than given a separate check, because the question the emit gate
 *  asks is "does this name exist in the emitted variables" and the answer does not depend on which
 *  setter consumes it. Keeping it out would have made the one geometry value on the new part kind the
 *  only one in the projection nothing verified — and an unresolvable inset silently positions a focus
 *  ring flush against the border it exists to be distinguishable from.
 *
 *  `absoluteStrokeInset` is here for exactly that reason (#801): it is the second half of the same sum,
 *  so an unresolvable stroke width returns the ring to flush just as surely as an unresolvable offset —
 *  and both executors fall back to the offset alone when it misses, which is a legible ring rather than a
 *  broken one, and therefore the kind of failure only a gate notices. */
const readVarsOwn = (n: FigmaNodePlan): string[] =>
  [n.absoluteInset, n.absoluteStrokeInset].filter((x): x is string => !!x);

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
        // The SET-LEVEL property carries ONE `defaultValue` — the canonical fallback (`textDefault`, i.e.
        // `figmaProperties.texts[*].default`), NOT this member's own `characters`. #1018 made those two
        // diverge: a member's copy is per-coordinate (`byVariant`), while the set property's default is the
        // fallback and is constant across the set. Reading `characters` here — the member's copy — is what
        // made the set property "declared two different ways" the moment two members showed different text.
        // `textDefault` is the same on every member, so the contradiction check below sees agreement, and
        // each member still overrides its own `characters` on its node. Falls back to `characters` for a
        // def with no `byVariant`, where the two are equal anyway (byte-identical).
        prop = { name: ref.prop, type: 'TEXT', default: n.textDefault ?? n.characters ?? '' };
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
    // EVERY DECLARED AXIS, IN THE DEF'S OWN ORDER (#795). These two lines used to be `intent` then
    // `appearance` by name — Button's declaration order transcribed into the writer — which is why a def
    // whose axis is called `tone` or `color` projected a coordinate the name did not carry: the plan held
    // `{tone:'error'}` and the name came back `""`, four members sharing it, `planSetLayout` refusing the
    // duplicate. Byte-identical for the four defs that already project (all declare intent/appearance/size).
    ...plan.gridAxisOrder.flatMap((a) => (plan.coord[a] ? [`${a}=${plan.coord[a]}`] : [])),
    // CONDITIONAL SINCE #795, and this half is what the issue's "both halves" meant. It used to be
    // unconditional, which is the writer's side of the same wall: even had the plan admitted a sizeless
    // def, every member would still have been named `size=undefined`. The def's `variantAxes` decides —
    // no `size` listed, no `size=` written. See `nestVariantMatch` for why this is not cosmetic: a
    // coordinate must account for EVERY axis in the member's name, so a stray `size=` is the difference
    // between Button's `{color:'default'}` resolving against a projected ring and matching nothing.
    ...(plan.size === undefined ? [] : [`size=${plan.size}`]),
    ...(plan.coord.state ? [`state=${plan.coord.state}`] : []),
    ...(plan.slotAxes.includes('leading') ? [`leading=${plan.slots.leading}`] : []),
    ...(plan.slotAxes.includes('trailing') ? [`trailing=${plan.slots.trailing}`] : []),
  ].join(', ');

/**
 * FNV-1a, 32 bits, twice — forward and over the reversed string (#827). Hand-written because the engine
 * is dependency-free and this runs inside the Figma sandbox, where `node:crypto` does not exist and the
 * `plugin-no-node-builtins` gate would refuse the import anyway.
 *
 * TWO PASSES rather than one, and the reason is the failure mode: a stamp collision reports a stale
 * member as correct, which is precisely the defect #827 exists to fix. One 32-bit pass would give ~2^-32
 * per real change — small, and the wrong direction to economize in for eight bytes. Reversed rather than
 * a second offset basis, because two FNV runs over the same byte order share most of their avalanche and
 * would not independently notice a transposition.
 */
const fnv1a32 = (s: string, reverse: boolean): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(reverse ? s.length - 1 - i : i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

const hex8 = (n: number): string => n.toString(16).padStart(8, '0');

/**
 * WHAT ONE MEMBER'S PLAN HASHES TO (#827) — 16 hex characters that move when anything the executor
 * would write moves, and stay put otherwise.
 *
 * WHY THIS IS THE RIGHT SUBJECT. `write-components.ts` decides whether a member already exists **by
 * name** and skips it, so a name match is treated as proof the member is correct. It cannot be: a
 * member built by an older engine has the same name and different geometry. The stamp gives the skip
 * branch something to compare that is not the name.
 *
 * OVER THE WHOLE PLAN, deliberately, rather than over the properties the executor is known to write.
 * A hand-picked field list is a second statement of what the executor writes, and the two would drift
 * the first time a property is added — the drift being silent and in the unsafe direction, since the
 * new property would be written and never stamped. Hashing everything is OVER-sensitive: a plan field
 * no executor reads still moves the stamp, and the cost is a member reported stale that would have
 * rendered identically. That is the safe direction, and it is the whole argument for the choice.
 *
 * WHAT IT DOES NOT COVER, stated because the boundary is invisible from the call site. `figmaAnatomySet`
 * takes a `ComponentDef` and no theme, so this is a pure function of the DEFINITION: it does not move
 * when the brand's values move. It does not need to — brand values reach a member through variable
 * bindings, and a binding re-themes because the binding is what was written. What it also cannot see is
 * a change that lives only in the executor: 7 of the 22 commits touching this component pipeline since
 * 2026-07-01 changed `write-components.ts` alone and moved no plan bytes. `write-components.ts`'s own
 * `memberStamp` pairs this hash with `ENGINE_VERSION` only — no build identity, by design (see that
 * function's header for the full account, including why #836, which scoped adding one, closed without
 * it landing).
 */
export const planStamp = (plan: AnatomyPlan): string => {
  const json = JSON.stringify(plan);
  return `${hex8(fnv1a32(json, false))}${hex8(fnv1a32(json, true))}`;
};

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
/** The paste path bakes `nestMissAdvice` at EMIT time, before any node's `nestTarget` is known, so it
 *  cannot pass the name at a call site the way `write-components.ts` does. The ABSENT advice carries this
 *  sentinel where the name goes, and the payload replaces it with the runtime `nestTarget` — so ONE wording
 *  reaches both executors and the name is self-contained in the advice itself (not borrowed from the miss
 *  prefix, which a concatenated render puts next to a NEIGHBOUR's target — the #1262 review finding). */
export const NEST_TARGET_SLOT = '__NEST_TARGET__';

export const nestMissAdvice = (found: 'COMPONENT_SET' | 'INSTANCE' | 'OTHER' | 'ABSENT', target?: string): string => {
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
      // #1226 PR-A: this is the failure a designer hits building composed components one at a time — the
      // consumer is built before its nested target exists (`main.ts` builds one def per run). The advice
      // NAMES the target it wants built (`target`, or `NEST_TARGET_SLOT` when the paste path bakes this
      // before the runtime name is known), turning the bare "not in this file" into a build-order action.
      // The name is composed INTO the advice rather than left to the miss prefix (`… .nestTarget -> <name>`):
      // misses render concatenated (`main.ts` `join('; ')`), where "just above" pointed at a NEIGHBOUR's
      // target — the #1262 review finding. Was "publish the shared component first" — the focus-ring framing.
      return `not in this file — build ${target ?? NEST_TARGET_SLOT} FIRST (it is nested here, and the plugin builds one component per run), then rebuild this one`;
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
 * WHAT A MISSING SWAP TARGET ACTUALLY IS, in the message the designer reads (#1212 residue, #1280 PR-C,
 * #1288).
 *
 * The swap path had the defect `nestMissAdvice` was written to fix, one node type over, and it had it for
 * longer. Both swap consumers reported a bare NAME and no diagnosis: `leadingVisual.swapTarget ->
 * FPO-default-icon` from the node loop, and `property leadingVisual -> swap target FPO-default-icon (not
 * found; property not created)` from the property loop. Neither said what the file held under that name,
 * neither said what to do, and the second one's parenthesis — "not found" — is the same claim
 * `nestMissAdvice` retired for the nest path, wrong for three of the four file states it covers.
 *
 * THE SYMPTOM THAT MADE THIS WORTH FIXING was unreadable to the owner for exactly that reason: a button
 * built with no icon and reported a miss that named a component and nothing else, so "the icon slot is
 * empty" and "the icon slot is not swappable" were indistinguishable in the report. They are two different
 * failures on two different lines, and they now say which they are.
 *
 * FOUR CASES, the same four as the nest path, because the file states are a property of Figma rather than
 * of what a plan wanted from them: nothing of that name, a COMPONENT_SET, an INSTANCE, or a node of some
 * other type. The lookup that fails is `findAllWithCriteria({types:['COMPONENT']})`, which matches
 * `ComponentNode` and never `ComponentSetNode`, so a second name-based search on the failure path only is
 * what lets the message name what is there — the #681 mechanism, reused.
 *
 * THE COMPONENT_SET ROW IS THE ONE A DESIGNER ACTUALLY HITS once icons are wired, and it is why this
 * exists rather than being a tidier version of the same non-advice. A swap target must be ONE component:
 * an `INSTANCE_SWAP` default is a single node id (Figma refuses the component key, `''` and `null` alike).
 * A designer's own icon library is very often a set — so the honest reading of "not found" in that state is
 * not "publish it": the designer HAS published it, and the file holds exactly what they built. What is
 * missing is a nomination of one member, and no message said so.
 *
 * EACH SENTENCE NAMES ITS OWN TARGET, and that is a correctness constraint rather than a wording
 * preference. Misses render concatenated — `main.ts` joins them with `'; '` — so advice that locates its
 * subject by POSITION ("the component named just above") binds to whichever miss happens to precede it,
 * which is a NEIGHBOUR's target whenever a plan nominates more than one. That is the #1262 review finding
 * on the nest path, verbatim, and it is reachable here in a way it is not there: a def can carry a leading
 * and a trailing slot with different targets, so the two misses sit adjacent with different subjects.
 * `target` is composed INTO the string for that reason, and the harness asserts the binding by comparing
 * each miss's advice against its own prefix rather than against a fixed name.
 *
 * SHARED BY BOTH EXECUTORS, which is what #1288 closed and the reason this lives here rather than in
 * `write-components.ts` where PR-C first wrote it. `nestMissAdvice` sits in this file precisely so the
 * plugin and the emitted payload cannot drift in wording, and the paste path has both of these swap sites
 * too (`PAYLOAD_BUILD`'s `INSTANCE_SWAP` branch and `PAYLOAD_DECLARE_PROPS`'s property loop). PR-C
 * enriched the plugin's messages only, so for one release a designer reading a paste report and a designer
 * reading a plugin report were told different things about the same file state.
 *
 * THE EMIT-TIME PREMISE #1288 WAS FILED ON IS FALSE, and saying so is the whole design note. The issue —
 * and 0.49.0's changelog entry — held that the paste path "composes its advice at EMIT time and has no
 * `root.findAll` to read the file state from", which would have capped it at one generic sentence. What is
 * fixed at emit time is only WHICH FOUR STRINGS the payload carries; the payload itself RUNS IN THE FILE,
 * so it calls `figma.root.findAll` exactly as the plugin does and picks among the four at paste time. The
 * nest path has demonstrated that for two releases, one branch above the swap site. So the paste path gets
 * the full four-way diagnosis, not a degraded one.
 */
export type SwapFound = 'ABSENT' | 'COMPONENT_SET' | 'INSTANCE' | 'OTHER';

/** The swap counterpart to `NEST_TARGET_SLOT` (#1288): the paste path bakes these four sentences before
 *  any node's `swapTarget` is known, so the name is carried as a sentinel and the payload replaces it with
 *  the runtime target. Needed in ALL FOUR rows where the nest sentinel is needed in one — every swap
 *  sentence names its subject, because a swap miss is the case where two of them can sit adjacent with
 *  different targets (a leading and a trailing slot), which is the #1262 finding. */
export const SWAP_TARGET_SLOT = '__SWAP_TARGET__';

export const swapMissAdvice = (found: SwapFound, target?: string): string => {
  const name = target ?? SWAP_TARGET_SLOT;
  switch (found) {
    case 'ABSENT':
      // The build-order case, and the same cue `nestMissAdvice`'s ABSENT row carries (#1226 PR-A): the
      // plugin builds one def per run, so a designer working through a composed component reaches the
      // consumer before its slot filler exists. "Fills a slot" rather than "is nested here" because the
      // consequence differs — a slot degrades to a frame the designer can fill, a nest drops silently.
      return `not in this file — build ${name} FIRST (it fills a slot here, and the plugin builds one component per run), then rebuild this one`;
    case 'COMPONENT_SET':
      // NOT a dead end in the sense the nest path's set row is: there, the def can name a coordinate and
      // this writer resolves it. A swap target has no coordinate to name — the plan nominates a NAME and
      // the property needs one node id — so the action is on the file or on the nomination, not on a
      // `nesting` field. Both remedies are given because they cost differently: publishing one variant is
      // a designer action available today, nominating a member is not yet expressible in a plan.
      return `found a COMPONENT_SET named ${name}, and a swap target has to be ONE component — an INSTANCE_SWAP default is a single node id, and a set is many members. Publish one member of ${name} as its own component under that name, or nominate a member instead of the set`;
    case 'INSTANCE':
      // Reached by the obvious manual workaround for the row above — duplicating a variant out of a set
      // leaves an INSTANCE — which is why the nest path calls it out separately too.
      return `found an INSTANCE named ${name}, not a component — swap in the main component instead of a copy of it, or publish ${name} under this name`;
    case 'OTHER':
      return `found a node named ${name} that is not a component — rename it, or publish the component this slot needs under the name ${name}`;
  }
};

/** WHAT THE MISS COSTS, one clause per consumer, because the two consequences are opposite and the
 *  diagnosis above is identical. The node loop degrades to a placeholder frame — a box a designer can
 *  still fill by hand, which is why `build` returns it rather than null the way an unresolved nest does.
 *  The property loop cannot degrade at all: Figma demands a node id, so there is nothing to create the
 *  property WITH, and the slot ends up not swappable. Held apart from `swapMissAdvice` rather than
 *  multiplied into eight sentences: each call site has exactly one of these, forever. Shared with the
 *  paste path for the same reason the advice is — the two consumers exist on both sides (#1288). */
export const SWAP_PLACEHOLDER = 'built as a placeholder frame, which is a box you can still fill by hand';
export const SWAP_NO_PROPERTY = 'the property is NOT created, so this slot is not swappable at all — Figma demands a node id for an INSTANCE_SWAP default and refuses the component key, an empty string and null alike';

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
// KEYED BY TAIL, NOT BY NAME (#1097). A plan's bound names are root-relative (see \`figmaVarName\`), and
// every variable in the file is \`<root>/<tail>\`, so the map has to meet the plan in tail space. The split
// is POSITIONAL — it drops the first segment whatever that brand called it — because a reader that spelled
// a root would work for the brand it was written against and silently bind nothing for a client's own
// namespace, which is Prism2's \`pds/\` bug arriving in a new decade. \`figma-names.ts\`'s \`tailOf\` is the
// same three lines; it cannot be imported into a generated payload string, so this is a second spelling
// by necessity rather than by choice.
//
// A tail COLLISION means the file holds two brands' variables under one tail (a shared library plus a
// local set), and it is reported rather than resolved: last-write-wins would bind the wrong brand's
// variable, which paints and looks right.
const seenTail=new Map();
const byName=new Map();
for(const v of vars){const t=v.name.split('/').slice(1).join('/');if(!t)continue;if(seenTail.has(t))seenTail.get(t).push(v.name);else seenTail.set(t,[v.name]);byName.set(t,v);}
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
// THE SWAP MISS, FOUR WAYS (#1288) — the same table the plugin's two \`INSTANCE_SWAP\` consumers report
// through, reaching this payload by the OTHER of the two mechanisms in this preamble. The helpers above
// ship their SOURCE because they take runtime arguments; these four sentences take only the target, so
// they are baked as pre-computed strings and the target arrives as \`SWAP_TARGET_SLOT\`, substituted below.
// Same split \`nestMissAdvice\` uses one branch down, and for the same reason.
//
// ONE SPELLING FOR TWO CONSUMERS, which is why this is a preamble helper rather than an inline ternary like
// the nest path's. \`build\`'s INSTANCE_SWAP branch and \`PAYLOAD_DECLARE_PROPS\`'s property loop both diagnose
// the same lookup failure, and a second copy of the selection is a second place for it to rot.
//
// \`figma.root.findAll\` AT PASTE TIME, on the failure path only. #1288 was filed believing the paste path
// could not do this — that it "composes its advice at EMIT time and has no root.findAll". Emit time fixes
// only WHICH strings ship; the payload runs in the file, so the search is available here exactly as it is
// in the plugin. Failure path only for the reason the nest path states: a cold build already runs thousands
// of subtree searches and the happy path must not pay for a diagnosis it never prints.
const swapAdvice=(name)=>{const other=figma.root.findAll(x=>x.name===name)[0];return (!other?${JSON.stringify(swapMissAdvice('ABSENT'))}:other.type==='COMPONENT_SET'?${JSON.stringify(swapMissAdvice('COMPONENT_SET'))}:other.type==='INSTANCE'?${JSON.stringify(swapMissAdvice('INSTANCE'))}:${JSON.stringify(swapMissAdvice('OTHER'))}).split(${JSON.stringify(SWAP_TARGET_SLOT)}).join(name);};
const misses=[];
for(const [t,names] of seenTail) if(names.length>1) misses.push('AMBIGUOUS variable tail '+t+' — the file carries it under '+names.length+' brand roots ('+names.join(', ')+'), so a plan binding it cannot say which; remove or relink one of the sets');`;

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
    // DIAGNOSE, then report (#1288) — was the bare name and nothing else, which said neither what the file
    // holds under it nor what to do about it. Composed BYTE-IDENTICALLY to the plugin's node loop: same
    // prefix, same advice, same one consequence clause. That is not tidiness — \`test.ts\`'s parity gate
    // compares the two executors' miss strings for equality, so this is the spelling that gate reads.
    else if(!target)misses.push(n.name+'.swapTarget -> '+n.swapTarget+' ('+swapAdvice(n.swapTarget)+'; '+${JSON.stringify(SWAP_PLACEHOLDER)}+')');
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
      const found=(!other?${JSON.stringify(nestMissAdvice('ABSENT'))}:other.type==='COMPONENT_SET'?${JSON.stringify(nestMissAdvice('COMPONENT_SET'))}:other.type==='INSTANCE'?${JSON.stringify(nestMissAdvice('INSTANCE'))}:${JSON.stringify(nestMissAdvice('OTHER'))}).split(${JSON.stringify(NEST_TARGET_SLOT)}).join(n.nestTarget);
      misses.push(n.name+'.nestTarget -> '+n.nestTarget+' ('+found+')');return null;
    }
    else{node=nested.createInstance();}
  }
  else if(n.type==='GLYPH'){
    // THE GLYPH (#864). The only node here whose content is GEOMETRY rather than a box, a binding or a
    // nomination — and so also the only one that can build successfully and contain nothing, which is
    // exactly what #864 was: four artboards created without throwing.
    //
    // FIGMA'S OWN SVG IMPORTER, not \`createVector\` + \`vectorPaths\`, and the two measurements behind that
    // are on \`glyphSvg\`. It returns a FRAME sized to the document's artboard with the outline inside, so
    // the node the plan names is the ARTBOARD and the glyph is its child.
    node=figma.createNodeFromSvg(n.glyphSvg);
    // THE READ-BACK THE WHOLE ISSUE TURNS ON, and \`docs/34\`'s trap stated in its own words: asserting
    // "the node has children" passes on an empty group and "a vector exists" passes on a zero-area path.
    // So the quantity is the one a human would check — a VECTOR with a non-zero box — and it is asked of
    // the built subtree rather than of the document we submitted.
    const drawn=(node.findAll?node.findAll(x=>x.type==='VECTOR'):[]).filter(v=>v.width>0&&v.height>0);
    if(!drawn.length)misses.push(n.name+'.glyphSvg -> NO VECTOR (submitted '+n.glyphSvg.length+' chars of SVG; the import produced no outline with area, so the member would be an empty artboard — #864)');
    // THE ARTBOARD, read back too, because an importer is free to size its result to the INK. That is
    // the second half of #864's own class: \`minus\` is 14×2 of drawing on a 24×24 artboard, and a member
    // sized to the drawing stretches non-uniformly into the square its host binds.
    if(n.glyphViewBox&&(node.width!==n.glyphViewBox[0]||node.height!==n.glyphViewBox[1]))misses.push(n.name+'.glyphViewBox -> '+n.glyphViewBox[0]+'x'+n.glyphViewBox[1]+' (the imported frame reads '+node.width+'x'+node.height+'; the glyph was sized to its ink rather than to its artboard, so every host binding a square would distort it)');
    // SCALE rather than the importer's default, on the OUTLINE and not on the frame. The frame is resized
    // by whoever instances it — a host binds \`size.{size}.icon\` onto its own slot — and a child left at
    // Figma's MIN/MIN constraint keeps the 24px it was drawn at, so a 16px instance would show the
    // top-left corner of the glyph. This is the one property of the import we override.
    for(const v of drawn)v.constraints={horizontal:'SCALE',vertical:'SCALE'};
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
  // AFTER the text style, because a text style does not carry it and could not overwrite it — \`TextStyle\`
  // has no alignment field on either axis (#1009, measured against \`@figma/plugin-typings\`). Ordered
  // here anyway so the sequence reads the same as every other text write in this function.
  if(n.textAlignVertical)node.textAlignVertical=n.textAlignVertical;
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
    // GATED ON \`wrote\` (#1266). A part that declares \`strokeWidth\` has \`strokeWeight\` BOUND a few lines
    // up, and a literal assignment after a binding unbinds it — the border would then be the right paint
    // at a hardcoded 1px, re-theming on color and frozen on width. \`wrote\` rather than \`n.bound\`, because
    // a name that failed to resolve was skipped and still needs the fallback to paint something.
    // BORDER-BOX, and \`strokesIncludedInLayout\` defaults the other way. Left at Figma's default the
    // stroke is ADDED to the auto-layout size, so an outline button measured 62 wide where the filled
    // one measured 60 — swapping \`appearance\` moved the footprint, which is the one thing a variant
    // axis must not do. It showed up on the hug axis only: the fixed (bound) height absorbed the same
    // 2px silently, so a component with two fixed axes would have hidden this completely.
    if(p){node.strokes=[p];painted.strokes=1;if(!node.strokeWeight&&wrote.indexOf('strokeWeight')<0)node.strokeWeight=1;node.strokeAlign='INSIDE';if('strokesIncludedInLayout' in node)node.strokesIncludedInLayout=false;}
  }
  if(n.descendantFills){
    // The ink lives on the VECTORs INSIDE the node, never on the node itself — a fill on the wrapper is a
    // painted square behind the glyph. True of a swapped instance (a HOST pushing ink down) and true of a
    // \`GLYPH\`, whose wrapper is the artboard Figma's SVG importer returned; one field, one meaning, from
    // whichever side. Verified to survive createComponentFromNode.
    const vecs=node.findAll?node.findAll(x=>x.type==='VECTOR'):[];
    if(vecs.length===0)misses.push(n.name+'.descendantFills -> '+n.descendantFills+' (no VECTOR inside this node to paint)');
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
  // The BOX each centered child is measured on, by part name (#848). Collected in the flow pass because
  // that is where the sibling nodes exist; read in the centering pass after the parent has settled.
  const boxes=new Map();
  for(const c of n.children){
    const kid=await build(c);
    // A NESTED_INSTANCE whose shared component is missing returns null — the child is skipped and the
    // rest of the tree still builds, so the paste reports one precise miss instead of failing whole.
    if(!kid)continue;
    node.appendChild(kid);
    boxes.set(c.name,kid);
    if(c.absoluteInset)absolutes.push([c,kid]);
    if(c.absoluteCenter)centered.push([c,kid]);
    // Zero opacity, written straight rather than bound: a brand does not get to theme a label under a
    // spinner to half-visible. See the plan field's note.
    if(c.zeroOpacity)kid.opacity=0;
  }
  // A CENTERED absolute child (#612's pending spinner with no visual cell to take). Applied by the
  // parent for the same reason the inset ones are — \`layoutPositioning\` only means anything inside an
  // auto-layout parent, and the centering is measured off a box the parent owns.
  for(const [c,kid] of centered){
    // Written via a variable so this statement is not BYTE-IDENTICAL to the ring's lift above. A test
    // mutates that one by string-replacing \`kid.layoutPositioning='ABSOLUTE';\` — and \`String.replace\`
    // with a string pattern replaces only the FIRST occurrence, so a duplicated statement here silently
    // stole the mutation and the ring's own gate went green while unmutated. Caught by that gate failing
    // when this loop was added; keep them textually distinct.
    const lift='ABSOLUTE';kid.layoutPositioning=lift;
    // THE BOX THE CENTERING IS MEASURED ON (#848). The part named in \`absoluteCenterOn\` when it is
    // there, the parent otherwise. Centering on the PARENT is right only if the overlaid part is itself
    // centered in it, and at \`leading=false, trailing=true\` the label is not: the trailing cell holds the
    // right side, so the label sits left of center and a spinner centered on the container landed 12px
    // right of the text it stands in for. Read LIVE, after the flow pass, because the label's width is
    // the designer's text and only Figma knows it.
    const on=c.absoluteCenterOn?boxes.get(c.absoluteCenterOn):undefined;
    // A named box that is not in the tree is REPORTED, not silently swapped for the parent — falling
    // back would reproduce the exact off-center spinner this field exists to fix, and do it quietly.
    if(c.absoluteCenterOn&&!on)misses.push(c.name+'.absoluteCenterOn -> '+c.absoluteCenterOn+' (not built; centered on the parent instead, so it will sit off-center wherever that part is not itself centered — #848)');
    // NOT resized: unlike the ring, a centered overlay keeps its own square size — the \`size\` binding
    // is already on it, and \`resize\` would CLEAR that binding (the comment on the ring's resize says
    // so, and there it is safe only because an absolute part binds no dimensions).
    // \`x\`/\`y\` are PARENT-relative, and so is a sibling's \`x\`/\`y\` — so the sibling's offset carries
    // straight into the arithmetic with no coordinate conversion.
    if(on){kid.x=on.x+(on.width-kid.width)/2;kid.y=on.y+(on.height-kid.height)/2;}
    else{kid.x=(node.width-kid.width)/2;kid.y=(node.height-kid.height)/2;}
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
    const gap=v.resolveForConsumer(kid).value;
    if(typeof gap!=='number'){misses.push(c.name+'.absoluteInset -> '+c.absoluteInset+' resolved to '+JSON.stringify(gap)+', not a number');continue;}
    // THE STROKE THE GAP HAS TO CLEAR (#801). \`strokeAlign\` is INSIDE above — correct for a border,
    // since a stroke outside would grow the auto-layout footprint — so the nested ring draws its own
    // stroke back inward across the gap. At 2px offset and a 2px ring the outer edge lands exactly on the
    // host's border: gap ZERO, which is the position WCAG 1.4.11 exists to forbid. So the coordinate is
    // \`gap + strokeWidth\` and only the GAP is the design value. Absent means the nested component draws
    // nothing inside its bounds, which is right for any absolute part that is not a ring.
    let inset=gap;
    if(c.absoluteStrokeInset){
      const sv=byName.get(c.absoluteStrokeInset);
      if(!sv)misses.push(c.name+'.absoluteStrokeInset -> '+c.absoluteStrokeInset+' (positioned at the offset alone; the ring will sit flush against the border it must be distinguishable from — #801)');
      else{
        const sw=sv.resolveForConsumer(kid).value;
        if(typeof sw!=='number')misses.push(c.name+'.absoluteStrokeInset -> '+c.absoluteStrokeInset+' resolved to '+JSON.stringify(sw)+', not a number (positioned at the offset alone — the ring will sit flush, #801)');
        else inset=gap+sw;
      }
    }
    // Grown on every side by the full coordinate: the ring is 2×inset larger than the parent and starts
    // at -inset, which leaves \`gap\` of visible background once the stroke is drawn inward.
    // \`resize\` is safe HERE and nowhere else in this payload: it clears dimension bindings, and an
    // absolute part binds none (its size IS the parent's, so \`bound\` is empty by construction — gated).
    kid.resize(node.width+inset*2,node.height+inset*2);
    kid.x=-inset;kid.y=-inset;
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
    // "not found" was the wrong claim for three of the four states this reaches (#1288): a set, an instance
    // and a frame of that name are all FOUND. The consequence clause is the property loop's own — the slot
    // is not swappable at all, where the node loop above leaves a box a designer can still fill.
    if(!target){misses.push('property '+p.name+' -> swap target '+p.swapTarget+' ('+swapAdvice(p.swapTarget)+'; '+${JSON.stringify(SWAP_NO_PROPERTY)}+')');continue;}
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
    //
    // ABSENT MEANS OMIT, on every segment, and the PAYLOAD's `cellOf` must reach the byte-identical
    // string — it rebuilds this key by parsing the member NAME, so a segment the name does not carry is
    // one it cannot recover. The two derivations are deliberately separate (the chunked payload has none
    // of this module), so they are kept in step only by both encoding the same rule.
    //
    // `size` is #795's case: a def with no size axis writes no `size=` into the name, so the segment goes.
    //
    // THE SLOT SEGMENTS HAD THE SAME BUG ALREADY, and #795's test is what surfaced it. This wrote
    // `leading=${p.slots.leading}` unconditionally, which for a def with no slot axes is `leading=false`
    // — while `planComponentName` writes `leading=` only where the axis is DECLARED. Measured across the
    // corpus: Button (2 slot axes) agreed at 648/648, and `icon`, `field-label` and `icon-button` diverged
    // at every member, engine `leading=false` against payload `leading=undefined`. It never bit because
    // the disagreement is UNIFORM within a set — every member lands in one cohort under each rule, so the
    // footprint comparison still compares the right things. That is the whole hazard: a mismatch that
    // costs nothing until the day one side changes, and the sizeless case is that day. Gated in `test.ts`
    // against the payload's own extracted `cellOf`, run rather than grepped.
    //
    // AND THE DECLARED EXEMPTIONS LAST (#1010), which is the same rule reaching a case the two hardcoded
    // ones were never asked about: `presentWhen` gives a variant a third way to change what nodes a member
    // has, and a gated part in the FLOW moves the box exactly as a filled slot does. Appended rather than
    // sorted in, because the payload's `cellOf` must reach the byte-identical string and "last" is the one
    // ordering both sides can state without shipping a comparator. Read from the PLAN for the same reason
    // `slotAxes` is: this function never receives the def. See `FigmaProperties.footprintVaries` for why
    // the list is declared instead of derived from `presentWhen`.
    group: [
      ...(p.size === undefined ? [] : [`size=${p.size}`]),
      ...(p.slotAxes.includes('leading') ? [`leading=${p.slots.leading}`] : []),
      ...(p.slotAxes.includes('trailing') ? [`trailing=${p.slots.trailing}`] : []),
      ...p.footprintVaries.flatMap((k) => (vals[i][k] === undefined ? [] : [`${k}=${vals[i][k]}`])),
    ].join(', '),
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
  // `footprintVaries` rides out for the CHUNKED path only — the single-shot payload reads the `group`
  // this function already computed off each cell, while a chunk re-derives it from the member name and so
  // needs the def's list. Off `plans[0]` for `gridAxis`'s reason: every plan in a set comes from one def.
  return { cells, props, refs: [...refs.values()], axes, rows: rows.length, cols: cols.length, component: plans[0].component, rowKeys, colKey: colKey ?? '', rowLabels: rows, colVals: cols, footprintVaries: plans[0].footprintVaries };
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
 * `COL_KEY`, `COL_VALS`, `FOOTPRINT_VARIES` and the two shared payload halves.
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
  // Same "absent means omit" rule as \`planSetLayout\`'s \`group\` (#795), on EVERY segment — a def that
  // declares no size axis and no slot axes writes neither into the name, so there is nothing to parse
  // back out here. This side was always right; the engine side wrote \`leading=false\` unconditionally and
  // the two disagreed for every def but Button. Must produce the byte-identical string that side does or
  // the cohorts do not line up, and a per-member cohort compares nothing and reports nothing.
  const seg=(k)=>v[k]===undefined?[]:[k+'='+v[k]];
  // \`FOOTPRINT_VARIES\` LAST, matching that side's append (#1010). Shipped as a list rather than folded
  // into the three literal segments because it is the one part of this key that is per-DEF: the def
  // declares which axes move its box, and a payload that hardcoded them would answer for Button only.
  return {row,col,group:seg('size').concat(seg('leading'),seg('trailing'),...FOOTPRINT_VARIES.map(seg)).join(', ')};
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
  const { cells, props, refs, axes, component, rowKeys, colKey, rowLabels, colVals, footprintVaries } = planSetLayout(plans, 'planSetChunks');

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
const FOOTPRINT_VARIES=${JSON.stringify(footprintVaries)};
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
