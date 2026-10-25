/**
 * FILL-UNDER-HUG GATE (#2928, the shape owner QA Q537 found in Pagination) — no projected member stretches a child
 * across the WIDTH of a frame that hugs its width.
 *
 *   npx tsx packages/engine/lint-fill-under-hug.ts
 *
 * ── THE HOST RULE ────────────────────────────────────────────────────────────────────────────────
 *
 * The host does not let a frame hug a child that fills it. Writing `layoutAlign: 'STRETCH'` on a child of a COLUMN
 * whose width hugs turns the column's width FIXED, at the width it has at that moment (Q537, measured on a real file:
 * Pagination's underline ran about 100px, under the cells beside it, because the first frame stretched was childless
 * and the column froze at `createFrame`'s 100px). A frozen column stops following its content: a longer label on an
 * instance, or another item added to a native slot, runs past the frame and past whatever was stretched across it.
 * The component shim models the rule as `ShimOpts.fillFreezesHug`.
 *
 * #2796 fixed Pagination. #2928 found the same plan shape in Tab.Item (the indicator) and Tabs (the baseline), and
 * this gate's first run found it in CodeInput too (the label and the message). All four now hold their bars and rows
 * without a stretch: a bar is pinned across its parent's foot (`PartDef.foot`, constrained `STRETCH` out of the flow),
 * and a row keeps its own width.
 *
 * ── WHAT IT READS, AND WHY THAT IS INDEPENDENT ───────────────────────────────────────────────────
 *
 * SUBJECT: every projected member's plan (`figmaAnatomySet`), the input both executors build from — the child's
 * `layoutAlign` / `layoutGrow` and its parent's `layoutMode` and sizing modes, exactly as they will be written.
 * EXPECTED: the host rule above, typed here as two predicates. No def declares anything about it, and nothing here
 * is read off a def field, so a def that brings the shape back fails by name (docs/34).
 *
 * Two arms, one per way to fill a width:
 *   · `stretch-under-hugging-column` — a child stretched (`layoutAlign: 'STRETCH'`) across a VERTICAL frame whose
 *     width (its counter axis) is not FIXED. The shape Q537 measured.
 *   · `grow-under-hugging-row` — a child grown (`layoutGrow: 1`) along a HORIZONTAL frame whose width (its primary
 *     axis) is not FIXED. The same rule along a row. None today; held so one cannot arrive.
 * A child out of the flow (a foot pin, an inset or centered absolute, a corner glyph) takes no cell and is skipped.
 *
 * NOT HERE: the HEIGHT twins (a stretch across a row that hugs its height, a grow down a column that hugs it).
 * Accordion's indicators and PasswordField's toggle stretch across a hugging row's height today, and whether the host
 * freezes a height the same way is unmeasured. Filed as #3014, not asserted here.
 *
 * ── FLOORS ───────────────────────────────────────────────────────────────────────────────────────
 *
 * Every arm passes over nothing if the walk sees nothing, so the walk must see: every def that projects (a def whose
 * projection throws is a failure, not a skip), at least one stretched child and one grown child anywhere (so the
 * predicates have subjects), and at least one hugging column and one hugging row (so the parents do).
 */
import { componentDefs } from './components/index';
import { figmaAnatomySet, planComponentName } from './anatomy-figma';

type PlanNode = {
  name: string;
  layoutMode?: 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'AUTO' | 'FIXED';
  counterAxisSizingMode?: 'AUTO' | 'FIXED';
  layoutAlign?: 'STRETCH';
  layoutGrow?: number;
  footPin?: boolean;
  absoluteInset?: string;
  absoluteCenter?: unknown;
  cornerInset?: string;
  pin?: unknown;
  children?: PlanNode[];
};

const fail: string[] = [];
const SWAP = 'lint-fill-under-hug-swap';

// A child out of the auto-layout flow takes no cell, so it neither fills its parent nor freezes it.
const outOfFlow = (c: PlanNode): boolean =>
  c.footPin === true || c.absoluteInset !== undefined || c.absoluteCenter !== undefined || c.cornerInset !== undefined || c.pin !== undefined;
const hugsWidth = (n: PlanNode): boolean =>
  n.layoutMode === 'VERTICAL' ? n.counterAxisSizingMode !== 'FIXED' : n.layoutMode === 'HORIZONTAL' ? n.primaryAxisSizingMode !== 'FIXED' : false;

let defs = 0;
let members = 0;
let stretched = 0;
let grown = 0;
let hugColumns = 0;
let hugRows = 0;
// One line per def, part path and arm, with the member count and the first member, so a shape repeated across a whole
// set reads as one finding.
const found = new Map<string, { count: number; first: string }>();
const record = (key: string, member: string): void => {
  const f = found.get(key);
  if (f) f.count++;
  else found.set(key, { count: 1, first: member });
};

for (const def of componentDefs) {
  if (!def.figmaProperties || def.figmaProperties.emitAsComponents) continue;
  let plans: ReturnType<typeof figmaAnatomySet>;
  try {
    plans = figmaAnatomySet(def, { swapTarget: SWAP });
  } catch (e) {
    fail.push(`projection: ${def.id} does not project (${e instanceof Error ? e.message : String(e)}) — its members cannot be walked, so this gate would pass over them`);
    continue;
  }
  defs++;
  for (const plan of plans) {
    members++;
    const member = planComponentName(plan);
    const walk = (n: PlanNode, path: string): void => {
      if (n.layoutMode && hugsWidth(n)) n.layoutMode === 'VERTICAL' ? hugColumns++ : hugRows++;
      for (const c of n.children ?? []) {
        const at = `${path} > ${c.name}`;
        if (!outOfFlow(c)) {
          if (c.layoutAlign === 'STRETCH') stretched++;
          if (c.layoutGrow === 1) grown++;
          if (c.layoutAlign === 'STRETCH' && n.layoutMode === 'VERTICAL' && hugsWidth(n))
            record(`stretch-under-hugging-column: ${def.id}: ${at} stretches across '${n.name}', a column whose width hugs`, member);
          if (c.layoutGrow === 1 && n.layoutMode === 'HORIZONTAL' && hugsWidth(n))
            record(`grow-under-hugging-row: ${def.id}: ${at} grows along '${n.name}', a row whose width hugs`, member);
        }
        walk(c, at);
      }
    };
    walk(plan.root as unknown as PlanNode, (plan.root as unknown as PlanNode).name);
  }
}

for (const [key, f] of found)
  fail.push(`${key}, in ${f.count} member(s) (first: ${f.first}) — the host turns that width FIXED when the fill is written (Q537), so the frame stops following its content. Pin a bar across the foot (\`foot\`), or let the child keep its own width`);

if (defs === 0) fail.push('floor: no def projected a member — every arm passed over nothing');
if (stretched === 0) fail.push('floor: no projected child is stretched anywhere — the stretch arm has no subject (the fields\' rows stretch today)');
if (grown === 0) fail.push('floor: no projected child grows anywhere — the grow arm has no subject (every button\'s label row grows today)');
if (hugColumns === 0) fail.push('floor: no projected column hugs its width — the stretch arm has no parent to test');
if (hugRows === 0) fail.push('floor: no projected row hugs its width — the grow arm has no parent to test');

if (fail.length) {
  console.error(`❌ fill-under-hug: ${fail.length} failure(s)`);
  for (const f of fail) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✅ fill-under-hug: ${defs} defs, ${members} members walked; ${stretched} stretched and ${grown} grown children, none across a width that hugs (${hugColumns} hugging columns, ${hugRows} hugging rows)`);
