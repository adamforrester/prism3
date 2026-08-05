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
import { expandKey } from './component-schema';

/** A node in the materialization plan. Property names are Figma Plugin API property names
 *  deliberately — this is the projection's whole job, and naming them anything else would put a
 *  translation layer between the gate and the thing it claims to verify. */
export type FigmaNodePlan = {
  name: string;
  type: 'FRAME' | 'TEXT' | 'INSTANCE_SWAP';
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
  children: FigmaNodePlan[];
};

export type AnatomyPlan = {
  component: string;
  size: string;
  slots: { leading: boolean; trailing: boolean };
  root: FigmaNodePlan;
  /** Carried onto the plan rather than dropped, so the ceilings travel WITH the artifact that
   *  fails to honor them. A plan whose `codeOnly` is empty is claiming Figma holds everything. */
  codeOnly: string[];
  derived: Record<string, string>;
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
 */
export const figmaAnatomyPlan = (
  def: ComponentDef,
  size: string,
  slots: { leading?: boolean; trailing?: boolean; swapTarget?: string } = {},
): AnatomyPlan => {
  const a = def.anatomy;
  if (!a) throw new Error(`${def.id}: no anatomy block to project`);
  if (!(def.variants?.size ?? []).includes(size)) throw new Error(`${def.id}: '${size}' is not a declared size`);
  const leading = slots.leading ?? false;
  const trailing = slots.trailing ?? false;

  // binding key (possibly `{size}`-templated) → Figma variable name, via def.tokens.
  const varOf = (key: string): string => {
    const [resolved] = expandKey(key, [size]);
    const ref = def.tokens[resolved];
    if (!ref) throw new Error(`${def.id}: anatomy names binding key '${resolved}', which tokens does not bind`);
    return figmaVarName(ref);
  };

  const present = (name: string): boolean => {
    if (name === 'leadingVisual') return leading;
    if (name === 'trailingVisual') return trailing;
    const p = a.parts[name];
    return !p?.optional;
  };

  const node = (name: string, p: PartDef): FigmaNodePlan => {
    const bound: Record<string, string> = {};
    const kids = (p.children ?? []).filter(present).map((c) => node(c, a.parts[c]));

    if (p.kind === 'box') {
      if (p.gap) bound.itemSpacing = varOf(p.gap);
      if (p.height) bound.height = varOf(p.height);
      if (p.radius) for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) bound[c] = varOf(p.radius);
      if (p.padding) {
        bound.paddingTop = varOf(p.padding.block);
        bound.paddingBottom = varOf(p.padding.block);
        // The slot-aware rule (#326): a filled visual slot on a side pulls that side's inset in,
        // because the glyph's own bounding box already contributes apparent space. With no slot
        // filled, both sides fall back to the label inset and the button is symmetric again —
        // which is why this is additive rather than a redefinition of padding-x.
        const inlineVisual = p.padding.inlineVisual ?? p.padding.inlineLabel;
        bound.paddingLeft = varOf(leading ? inlineVisual : p.padding.inlineLabel);
        bound.paddingRight = varOf(trailing ? inlineVisual : p.padding.inlineLabel);
      }
    } else {
      // Both axes, bound to the SAME variable. That is legal — an unlocked node tracks a square
      // artboard on both axes — but it is legal only because the executor unlocks the node first;
      // see the `constrainProportions` note in `planToPluginJs`.
      if (p.size) { bound.width = varOf(p.size); bound.height = varOf(p.size); }
    }

    let textStyle: string | undefined;
    if (p.type) {
      const [resolved] = expandKey(p.type, [size]);
      const ref = def.tokens[resolved];
      if (!ref) throw new Error(`${def.id}: anatomy names binding key '${resolved}', which tokens does not bind`);
      textStyle = figmaTextStyleName(ref);
    }

    return {
      name,
      type: p.kind === 'text' ? 'TEXT' : p.kind === 'box' ? 'FRAME' : 'INSTANCE_SWAP',
      ...(textStyle ? { textStyle } : {}),
      ...(p.kind === 'slot' && slots.swapTarget ? { swapTarget: slots.swapTarget } : {}),
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
    root: node(a.root, a.parts[a.root]),
    codeOnly: [...a.codeOnly],
    derived: { ...(a.derived ?? {}) },
  };
};

/** Every part name in a plan, depth-first. */
export const planPartNames = (n: FigmaNodePlan): string[] => [n.name, ...n.children.flatMap(planPartNames)];

/** Every Figma variable name a plan binds. */
export const planBoundVars = (n: FigmaNodePlan): string[] =>
  [...Object.values(n.bound), ...n.children.flatMap(planBoundVars)];

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
 *  - `constrainProportions=false` before binding. A proportion-locked node cannot hold two
 *    independent dimension bindings — the second `setBoundVariable` EVICTS the first, last-write-
 *    wins, with no throw and nothing in `misses`. It bites FRAME, COMPONENT and INSTANCE alike;
 *    `createFrame()` happens to default to unlocked, but an instance inherits the lock from its main
 *    component, and `FPO-default-icon` ships locked. Every slot binds `width` AND `height`, so this
 *    is not a corner case — it is every slot in every plan.
 *  - NO `resize()` after binding. `resize()` CLEARS every dimension binding on all three node types.
 *    Binding then resizing loses the binding; resizing then binding is fine. (`appendChild` into
 *    auto-layout and setting `layoutSizing*` are both safe — measured, not assumed.)
 */
export const planToPluginJs = (plan: AnatomyPlan): string => `const PLAN=${JSON.stringify(plan.root)};
const vars=await figma.variables.getLocalVariablesAsync();
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
const misses=[];
const build=async(n)=>{
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
  else{node=figma.createFrame();node.clipsContent=false;}
  node.name=n.name;
  // Before ANY dimension binding. See the header note — a locked node keeps only the last of the two.
  if('constrainProportions' in node)node.constrainProportions=false;
  if(n.textStyle){
    const st=styleByName.get(n.textStyle);
    if(!st)misses.push(n.name+'.textStyle -> '+n.textStyle);
    else await node.setTextStyleIdAsync(st.id);
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
  for(const [prop,varName] of Object.entries(n.bound)){
    const v=byName.get(varName);
    if(!v){misses.push(n.name+'.'+prop+' -> '+varName);continue;}
    node.setBoundVariable(prop,v);
  }
  // READ BACK. The name resolved and the setter did not throw, which is not the same as the binding
  // being there — see the header note. This closes \`misses[]\`'s blind spot generically, so the next
  // silently-discarded write is reported by the paste instead of being found by probing months later.
  const got=node.boundVariables||{};
  for(const prop of Object.keys(n.bound))
    if(!got[prop])misses.push(n.name+'.'+prop+' -> DISCARDED (resolved, set, not retained)');
  for(const c of n.children) node.appendChild(await build(c));
  return node;
};
const root=await build(PLAN);
figma.currentPage.appendChild(root);
const comp=figma.createComponentFromNode(root);
comp.name=${JSON.stringify(`${plan.component}/size=${plan.size}${plan.slots.leading ? ', leading' : ''}${plan.slots.trailing ? ', trailing' : ''}`)};
return {component:comp.name,parts:${JSON.stringify(planPartNames(plan.root).length)},misses,codeOnly:${JSON.stringify(plan.codeOnly.length)}};
`;
