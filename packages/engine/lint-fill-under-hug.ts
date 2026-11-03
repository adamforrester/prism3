/**
 * FILL-UNDER-HUG GATE (#2928, the shape owner QA Q537 found in Pagination) — no projected member stretches a child
 * across the WIDTH of a frame that hugs its width, and none fills a hugging HEIGHT the host has not been measured on (#3014).
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
 * And the HEIGHT twins (#3014, owner decision Q3014.1 A), one per way to fill a height:
 *   · `stretch-under-hugging-row` — a child stretched across a HORIZONTAL frame whose height (its counter axis) is
 *     not FIXED.
 *   · `grow-under-hugging-column` — a child grown down a VERTICAL frame whose height (its primary axis) is not
 *     FIXED. None today; held so one cannot arrive.
 *
 * ── THE HEIGHT TWINS: MEASURED-SAFE, NOT A RULE ──────────────────────────────────────────────────
 *
 * The host does NOT freeze a hugging height the way it freezes a width. Measured in real Figma on 2026-11-02 (#3014,
 * plugin build 89c83809, Accordion's 48 members and Password field's 84): every `titleRow` and `labelRow` main reads
 * `counterAxisSizingMode: AUTO` after the build, and on instances the rows grow with their content — Accordion's
 * medium title row 20 → 66 with the title wrapped to four lines (the stretched indicator follows to 66, leading and
 * trailing alike), and Password field's label row 26 → 27 with the label set to `body/lg/default` (the stretched
 * toggle follows).
 *
 * So a height stretch is not refused outright: it is refused UNMEASURED. The shapes that measurement covered are
 * named below (`MEASURED_SAFE`), by def and part path, and any other stretch or grow across a hugging height fails by
 * name until someone measures it on a real file and adds it with the citation. An entry the walk no longer sees fails
 * too (stale), so the list cannot keep vouching for a shape that has gone.
 *
 * A stretched child is not free in a hugging row: the host floors the row at the child's own minimum content height
 * (#3347 measured Password field's toggle holding the row at 26, its padding plus its "Show" line). That is a size
 * question, gated where it is measured (the plugin's round-trip), not here.
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
const hugsHeight = (n: PlanNode): boolean =>
  n.layoutMode === 'HORIZONTAL' ? n.counterAxisSizingMode !== 'FIXED' : n.layoutMode === 'VERTICAL' ? n.primaryAxisSizingMode !== 'FIXED' : false;

// THE HEIGHT FILLS MEASURED ON A REAL FILE (#3014, 2026-11-02, build 89c83809): each row still hugs after the build,
// and grows with its content on an instance, the stretched child following. Typed here, by def and part path, never
// read off a def (docs/34): a def that adds a height fill elsewhere is not on this list and fails by name.
const MEASURED_SAFE: Record<string, string> = {
  'accordion: container > header > titleRow > leadingIndicator': 'the title row grew 20 → 66 with a four-line title, the indicator with it',
  'accordion: container > header > titleRow > trailingIndicator': 'the title row grew 20 → 66 with a four-line title, the indicator with it',
  'password-field: container > labelRow > toggle': 'the label row grew 26 → 27 with a body/lg label, the toggle with it',
};
const measuredSeen = new Set<string>();

let defs = 0;
let members = 0;
let stretched = 0;
let grown = 0;
let hugColumns = 0;
let hugRows = 0;
let tallHugRows = 0;
let tallHugColumns = 0;
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
      if (n.layoutMode && hugsHeight(n)) n.layoutMode === 'HORIZONTAL' ? tallHugRows++ : tallHugColumns++;
      for (const c of n.children ?? []) {
        const at = `${path} > ${c.name}`;
        if (!outOfFlow(c)) {
          if (c.layoutAlign === 'STRETCH') stretched++;
          if (c.layoutGrow === 1) grown++;
          if (c.layoutAlign === 'STRETCH' && n.layoutMode === 'VERTICAL' && hugsWidth(n))
            record(`stretch-under-hugging-column: ${def.id}: ${at} stretches across '${n.name}', a column whose width hugs`, member);
          if (c.layoutGrow === 1 && n.layoutMode === 'HORIZONTAL' && hugsWidth(n))
            record(`grow-under-hugging-row: ${def.id}: ${at} grows along '${n.name}', a row whose width hugs`, member);
          // The height twins: a fill across a hugging height passes only where the host was measured to keep the hug.
          const tall = (c.layoutAlign === 'STRETCH' && n.layoutMode === 'HORIZONTAL') || (c.layoutGrow === 1 && n.layoutMode === 'VERTICAL');
          if (tall && hugsHeight(n)) {
            const key = `${def.id}: ${at}`;
            if (key in MEASURED_SAFE) measuredSeen.add(key);
            else if (n.layoutMode === 'HORIZONTAL')
              record(`stretch-under-hugging-row: ${def.id}: ${at} stretches across '${n.name}', a row whose height hugs`, member);
            else record(`grow-under-hugging-column: ${def.id}: ${at} grows down '${n.name}', a column whose height hugs`, member);
          }
        }
        walk(c, at);
      }
    };
    walk(plan.root as unknown as PlanNode, (plan.root as unknown as PlanNode).name);
  }
}

for (const [key, f] of found)
  fail.push(/^(stretch-under-hugging-row|grow-under-hugging-column):/.test(key)
    ? `${key}, in ${f.count} member(s) (first: ${f.first}) — unmeasured: the host keeps a hugging height under the fills #3014 measured, and this one is not among them. Build it on a real file, check the frame still hugs and grows with its content on an instance, and add it to MEASURED_SAFE with the measurement; or let the child keep its own height`
    : `${key}, in ${f.count} member(s) (first: ${f.first}) — the host turns that width FIXED when the fill is written (Q537), so the frame stops following its content. Pin a bar across the foot (\`foot\`), or let the child keep its own width`);
for (const key of Object.keys(MEASURED_SAFE))
  if (!measuredSeen.has(key)) fail.push(`measured-safe: '${key}' is no longer a fill across a hugging height in any member — the entry is stale, remove it from MEASURED_SAFE`);

if (defs === 0) fail.push('floor: no def projected a member — every arm passed over nothing');
if (stretched === 0) fail.push('floor: no projected child is stretched anywhere — the stretch arm has no subject (the fields\' rows stretch today)');
if (grown === 0) fail.push('floor: no projected child grows anywhere — the grow arm has no subject (every button\'s label row grows today)');
if (hugColumns === 0) fail.push('floor: no projected column hugs its width — the stretch arm has no parent to test');
if (hugRows === 0) fail.push('floor: no projected row hugs its width — the grow arm has no parent to test');
if (tallHugRows === 0) fail.push('floor: no projected row hugs its height — the height stretch arm has no parent to test');
if (tallHugColumns === 0) fail.push('floor: no projected column hugs its height — the height grow arm has no parent to test');

if (fail.length) {
  console.error(`❌ fill-under-hug: ${fail.length} failure(s)`);
  for (const f of fail) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✅ fill-under-hug: ${defs} defs, ${members} members walked; ${stretched} stretched and ${grown} grown children, none across a width that hugs (${hugColumns} hugging columns, ${hugRows} hugging rows); across a hugging height only the ${measuredSeen.size} measured-safe shapes (${tallHugRows} rows, ${tallHugColumns} columns hug their height)`);
