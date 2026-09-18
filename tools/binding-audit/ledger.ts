/**
 * THE EXPECTED PART→VARIABLE LEDGER (#1499) — the shared source of truth.
 *
 * Extracted from `audit.ts` (#1511) so the two things that must agree on the ledger cannot drift:
 * `audit.ts --ledger` (what a live file is diffed against) and `reconcile.ts` (the diff itself) both
 * import `buildLedger` from here. Were the reconciler to rebuild the ledger its own way, the console
 * export snippet the README documents and the reconciler could silently disagree on a coordinate — the
 * exact class of defect the ledger exists to catch. One builder, one shape.
 *
 * The ledger keys on the projection's DETERMINISTIC name-path: the Figma set name is `def.id`
 * (`set.name = plan.component` in anatomy-figma.ts), and each member's name is its variant-coordinate
 * string (`planComponentName`). A live file projected from this engine therefore carries the same
 * `(component, member, node, field)` coordinates the ledger keys on. The plan carries variable NAMES,
 * not resolved values, so the ledger is brand-invariant — one ledger audits a live file of any brand.
 */
import {
  figmaAnatomySet,
  planComponentName,
  type FigmaNodePlan,
} from '../../packages/engine/anatomy-figma';
import type { ComponentDef } from '../../packages/engine/component-schema';

// ── THE PHYSICAL SLOT A NODE PAINTS ───────────────────────────────────────────────────────────────
// Read off the plan node's TYPE and which paint field carries the variable — never off a key string,
// so the slot kind is what the projector actually built rather than what a name suggests.
export type SlotKind = 'surface-fill' | 'border' | 'text-ink' | 'glyph-ink';

/** The bindable field a slot binding lands on — the SAME three names the console export snippet reports
 *  per node, so the export and the ledger key on one vocabulary (README documents the mapping). */
export type BindField = 'fills' | 'strokes' | 'descendantFills';

/** A projected Figma variable NAME (`color/interactive/primary/icon/rest`) → its dotted role
 *  (`interactive.primary.icon.rest`). Non-color variables (`radius/md`) return null and are ignored:
 *  this audit is about color binding. */
export const roleOf = (variable: string): string | null => {
  const dotted = variable.replace(/\//g, '.');
  return dotted.startsWith('color.') ? dotted.slice('color.'.length) : null;
};

export type SlotBinding = { node: string; field: BindField; slotKind: SlotKind; variable: string; role: string };
export type MemberLedger = { member: string; bindings: SlotBinding[] };
export type Ledger = {
  note: string;
  generatedBy: string;
  components: Record<string, MemberLedger[]>;
};

/** Classify a plan node's paints into slot bindings. A node type + paint field decide the slot kind:
 *  a FRAME's `fills` is a surface, its `strokes` a border; a TEXT's `fills` is text ink; any
 *  `descendantFills` is glyph ink (the vector inside a swapped/nested instance or a glyph artboard). */
export const nodeBindings = (n: FigmaNodePlan, path: string, out: SlotBinding[]): void => {
  const here = `${path}/${n.name}`;
  const push = (field: BindField, slotKind: SlotKind, variable?: string): void => {
    if (!variable) return;
    const role = roleOf(variable);
    if (!role) return; // non-color binding (dimension, radius) — not this audit's subject
    out.push({ node: here, field, slotKind, variable, role });
  };
  if (n.type === 'TEXT') push('fills', 'text-ink', n.paints?.fills);
  else push('fills', 'surface-fill', n.paints?.fills);
  push('strokes', 'border', n.paints?.strokes);
  push('descendantFills', 'glyph-ink', n.descendantFills);
  for (const c of n.children) nodeBindings(c, here, out);
};

/** The full per-member ledger for a def, over the Figma set that actually ships (member names match
 *  the live file). `null` for a def that projects no set. */
export const memberLedger = (def: ComponentDef): MemberLedger[] | null => {
  if (!def.figmaProperties) return null;
  const set = figmaAnatomySet(def, { swapTarget: 'FPO-default-icon' });
  return set.map((plan) => {
    const bindings: SlotBinding[] = [];
    nodeBindings(plan.root, '', bindings);
    return { member: planComponentName(plan), bindings };
  });
};

/** The full ledger across every projectable def — the exact object `audit.ts --ledger` writes and
 *  `reconcile.ts` diffs against. */
export const buildLedger = (defs: readonly ComponentDef[]): Ledger => {
  const components: Record<string, MemberLedger[]> = {};
  for (const def of defs) {
    const ml = memberLedger(def);
    if (ml) components[def.id] = ml;
  }
  return {
    note:
      "EXPECTED part→variable ledger (brand-invariant). Diff a live Figma file's node boundVariables against `bindings[*].variable`; reconcile with `npx tsx tools/binding-audit/audit.ts --reconcile <export.json>` (see tools/binding-audit/README.md for the console export snippet).",
    generatedBy: 'tools/binding-audit/audit.ts --ledger',
    components,
  };
};
