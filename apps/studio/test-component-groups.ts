/**
 * #2700 — the Components page's list and its multi-set run, as pure models (`state/component-groups.ts`,
 * `state/build-queue.ts`), run in Node over the committed catalog and over planted ones.
 *
 * EXPECTED IS THE APPROVED WIREFRAME'S, TYPED HERE (docs/34): the rows, their labels, their order and each family's sets
 * are written out from the wireframe the owner approved (every call A), never read back from the grouping. The catalog's
 * page and section come from the plugin's `file-taxonomy.ts`; this file never reads the taxonomy, so a taxonomy change
 * that moves a row fails here by name until the wireframe's list is changed with it.
 *
 *   npx tsx apps/studio/test-component-groups.ts
 *
 * By-name mutations (each proven red, then restored):
 *   · Icon listed under its own section again (`kindOf` keying on 'Subcomponents' only) → `call 11: Icon lists under Subcomponents`.
 *   · rows in catalog order (the sort dropped) → `notes 2, 3: the Components rows…`.
 *   · a family's sets in catalog order → `note 2: a family's sets are alphabetical…`.
 *   · a box selecting a set that can't be built (`buildableOf` bypassed) → `G4 under call 8…`.
 *   · search keeping a family only on its own label → `search: a family stays while any of its sets matches`.
 *   · Stop ending the run at once (before the current set's result) → `call 16: Stop waits for the set being built…`.
 *   · "Also builds" by component name again (`displayNameOf` bypassed) → `idea 7: the sets a build makes first…`.
 *   · the selection run in click order (`inListOrder` returning its input) → `review N1 on #2812: a selection runs in the list's order…`.
 *   · a search opening every family (`familiesToOpen` dropping its match) → `call 7 on #2812: a search opens the families…`.
 *   · Textarea dropped from Fields' `SETTING_SECTIONS` ids → `#2905 Q548: Fields holds the sets Field style draws …` and
 *     `#2905 Q6 A: … Other components …` (Textarea back in Other components).
 *   · a set focus key resolving to no row (`rowOfFocus` keying on row keys only) → `#2905 Q8 A: a set in a flat section
 *     focuses as itself …`.
 *
 * #2905 (owner decisions Q538, Q548 on wireframe v2): the sections with settings, typed from the wireframe: Buttons (the
 * Buttons page's four sets) and Fields (Password field, Select, Text field, Textarea), then Other components and
 * Subcomponents. Fields is also held to the engine's `FIELD_FRAME_PARTS`, the defs `applyFieldStyle` draws, so a field
 * gaining Field style without joining the section (or the other way round) fails by name.
 */
import { COMPONENT_CATALOG_DATA as catalog } from './src/state/component-catalog-data';
import type { Catalog, CatalogEntry } from './src/state/component-catalog';
import { alsoBuilds, boxOfSets, costOf, displayNameOf, familiesToOpen, groupsOf, inListOrder, rowMatches, rowOfFocus, sentenceCase, setFocusKey, toggleSets, GROUPS_COPY } from './src/state/component-groups';
import { FIELD_FRAME_PARTS } from '@prism3/engine/anatomy-figma';
import { currentOf, positionOf, record, runVerdict, startRun, stopRun, RUN_COPY } from './src/state/build-queue';

let failed = 0;
let executed = 0;
const ok = (cond: unknown, msg: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${msg}`);
  else { failed++; console.log(`  ✗ ${msg}`); }
};
const name = (id: string): string => catalog.find((e) => e.id === id)?.name ?? id;

console.log('\n1. The sections and their rows (notes 2–4, calls 11, 12 and 14; #2905 Q548)');
// The wireframes' lists, typed: [label, the family's sets by component name] (a single set has one).
const WIRE_BUTTONS: [string, string[]][] = [['Buttons', ['Button', 'Button.Destructive', 'Button.Group', 'Button.Neutral']]];
const WIRE_FIELDS: [string, string[]][] = [['Password field', ['PasswordField']], ['Select', ['Select']], ['Text field', ['TextField']], ['Textarea', ['Textarea']]];
const WIRE_COMPONENTS: [string, string[]][] = [
  ['Accordion', ['Accordion', 'Accordion.Indicator']], ['Badge', ['Badge']],
  ['Checkbox', ['Checkbox.Control', 'Checkbox.Group', 'Checkbox.Row']], ['Counter', ['Counter']], ['Dialog', ['Dialog']], ['Divider', ['Divider']],
  ['Icon button', ['IconButton', 'IconButton.Destructive', 'IconButton.Neutral']], ['Link', ['Link']], ['List', ['List', 'List.Item']],
  ['Radio', ['Radio.Control', 'Radio.Group', 'Radio.Row']],
  ['Segmented control', ['SegmentedControl', 'SegmentedControl.Segment']], ['Switch', ['Switch.Control', 'Switch.Row']],
  ['Tabs', ['Tab.Item', 'Tabs']], ['Tag', ['Tag']], ['Toast', ['Toast']], ['Veil', ['Veil']],
];
const WIRE_SUBS: [string, string[]][] = [
  ['Field label', ['FieldLabel']], ['Field message', ['FieldMessage']], ['Flush icon button', ['FlushIconButton', 'FlushIconButton.Destructive', 'FlushIconButton.Neutral']],
  ['Focus ring', ['FocusRing']], ['Icon', ['Icon']], ['Image placeholder', ['ImagePlaceholder']], ['Spinner', ['Spinner']],
];
const groups = groupsOf(catalog);
const drawn = (kind: string) => (groups.find((g) => g.kind === kind)?.rows ?? []).map((r) => [r.label, r.ids.map(name)] as [string, string[]]);
ok(JSON.stringify(groups.map((g) => g.title)) === JSON.stringify(['Buttons', 'Fields', 'Other components', 'Subcomponents']),
  `#2905 Q548, Q10 A: four sections, Buttons, Fields, Other components, Subcomponents (${groups.map((g) => g.title).join(', ')})`);
ok(JSON.stringify(groups.map((g) => g.flat)) === JSON.stringify([true, true, false, false]),
  `#2905 Q8 A: the sections with settings list their sets flat; Other components and Subcomponents keep their family rows (${JSON.stringify(groups.map((g) => g.flat))})`);
ok(JSON.stringify(drawn('buttons')) === JSON.stringify(WIRE_BUTTONS), `#2905 Q548: Buttons holds the Buttons family's four sets (${JSON.stringify(drawn('buttons'))})`);
const fieldIds = (groups.find((g) => g.kind === 'fields')?.rows ?? []).flatMap((r) => r.ids).sort();
ok(JSON.stringify(drawn('fields')) === JSON.stringify(WIRE_FIELDS) && JSON.stringify(fieldIds) === JSON.stringify(Object.keys(FIELD_FRAME_PARTS).sort()),
  `#2905 Q548: Fields holds the sets Field style draws, the engine's FIELD_FRAME_PARTS (${Object.keys(FIELD_FRAME_PARTS).sort().join(', ')}), as the wireframe lists them (${JSON.stringify(drawn('fields'))})`);
ok(JSON.stringify(drawn('components').map((r) => r[0])) === JSON.stringify(WIRE_COMPONENTS.map((r) => r[0])),
  `notes 2, 3, #2905 Q6 A: Other components holds every other component row, alphabetical, families grouped by page (${drawn('components').map((r) => r[0]).join(', ')})`);
ok(JSON.stringify(drawn('subcomponents').map((r) => r[0])) === JSON.stringify(WIRE_SUBS.map((r) => r[0])),
  `note 4: the Subcomponents rows are the wireframe's 7, alphabetical (${drawn('subcomponents').map((r) => r[0]).join(', ')})`);
ok(JSON.stringify(drawn('components')) === JSON.stringify(WIRE_COMPONENTS) && JSON.stringify(drawn('subcomponents')) === JSON.stringify(WIRE_SUBS),
  `note 2: a family's sets are alphabetical by component name, and call 12: a part set stays in its family (${JSON.stringify(drawn('components').filter((r) => r[1].length > 1).map((r) => r[1].join('/')))})`);
ok(groups.find((g) => g.kind === 'subcomponents')?.rows.some((r) => r.label === 'Icon' && r.page === 'Icons & assets') === true,
  'call 11: Icon lists under Subcomponents, and still lands on ↳ Icons & assets');
ok(groups.flatMap((g) => g.rows).flatMap((r) => r.ids).length === catalog.length && catalog.length === 44,
  `every set is listed once: ${groups.flatMap((g) => g.rows).flatMap((r) => r.ids).length} rows' sets over ${catalog.length} in the catalog (the wireframe's 41, Button.Group since #2661, Counter since #2427, and Toast since #2668)`);
ok(sentenceCase('Field Label') === 'Field label' && sentenceCase('Text field') === 'Text field' && sentenceCase('Icons & assets') === 'Icons & assets',
  'call 14: a page name reads in sentence case ("Field Label" → "Field label")');
ok(GROUPS_COPY.sectionCount('components', 19, 32) === '19 families and sets · 32 sets' && GROUPS_COPY.sectionCount('subcomponents', 7, 9) === '7 entries · 9 sets'
  && GROUPS_COPY.sectionCount('buttons', 1, 4) === '4 sets' && GROUPS_COPY.sectionCount('fields', 4, 4) === '4 sets',
  `the section counts, in the wireframes' words (${GROUPS_COPY.sectionCount('components', 19, 32)}; ${GROUPS_COPY.sectionCount('subcomponents', 7, 9)}; ${GROUPS_COPY.sectionCount('buttons', 1, 4)})`);
const btnRow = groups.find((g) => g.kind === 'buttons')?.rows[0];
ok(!!btnRow && rowOfFocus(catalog, setFocusKey('button-neutral'))?.key === btnRow.key && rowOfFocus(catalog, btnRow.key)?.key === btnRow.key && rowOfFocus(catalog, 'set=nothing') === undefined,
  `#2905 Q8 A: a set in a flat section focuses as itself, and its focus names its family's row, so the preview shows the family (${rowOfFocus(catalog, setFocusKey('button-neutral'))?.label})`);

console.log('\n2. Boxes and selection (note 5, call 8)');
const buttons = ['button', 'button-destructive', 'button-neutral'];
let sel = toggleSets(catalog, buttons, new Set());
ok(boxOfSets(catalog, buttons, sel) === 'on' && sel.size === 3, 'call 8: a family box selects all of its sets');
sel = toggleSets(catalog, ['button-neutral'], sel);
ok(boxOfSets(catalog, buttons, sel) === 'mixed', 'call 8: a family with some of its sets selected reads mixed');
sel = toggleSets(catalog, buttons, sel);
ok(boxOfSets(catalog, buttons, sel) === 'on', 'a mixed box selects the rest when it is toggled');
sel = toggleSets(catalog, buttons, sel);
ok(sel.size === 0 && boxOfSets(catalog, buttons, sel) === 'off', 'an all-on box clears its sets');
// G4: a planted set that can't be built is never selected by any box.
const off: CatalogEntry = { ...catalog.find((e) => e.id === 'badge')!, id: 'planted-off', name: 'Planted', buildable: false, reason: 'planted-off: no geometry.', members: null, nests: [] };
const withOff: Catalog = [...catalog, off];
const picked = toggleSets(withOff, ['badge', 'planted-off'], new Set());
ok([...picked].join() === 'badge' && boxOfSets(withOff, ['planted-off'], new Set()) === 'off',
  `G4 under call 8: a box over a set that can't be built never selects it (${JSON.stringify([...picked])})`);

console.log('\n3. Search (the Studio\'s search, #2700\'s edge state)');
const checkbox = groups.flatMap((g) => g.rows).find((r) => r.label === 'Checkbox')!;
ok(rowMatches(catalog, checkbox, 'row') && rowMatches(catalog, checkbox, 'CHECKBOX') && !rowMatches(catalog, checkbox, 'slider'),
  'search: a family stays while any of its sets matches ("row" finds Checkbox by Checkbox.Row), case-insensitively, and goes when none does');
ok(rowMatches(catalog, checkbox, '   '), 'an empty search keeps every row');
ok(JSON.stringify(familiesToOpen(catalog, 'neutral')) === JSON.stringify(['components|Buttons', 'components|Icon button', 'subcomponents|Flush Icon Button']) && familiesToOpen(catalog, ' ').length === 0,
  `call 7 on #2812: a search opens the families one of whose sets matches, and an empty search opens none (${JSON.stringify(familiesToOpen(catalog, 'neutral'))})`);

console.log('\n4. What a selection costs, and what it builds first (calls 17, idea 7)');
const four = ['button', 'button-destructive', 'dialog', 'text-field'];
const c4 = costOf(catalog, four);
ok(c4.sets === 4 && c4.variants === 576 + 576 + 24 + 84 && c4.components === 0, `four sets cost ${c4.variants} variants (the wireframe's 1,251, plus Dialog's 3 end members, #2877, and 6 fill members, #2880)`);
const ci = costOf(catalog, ['icon', 'badge']);
ok(ci.variants === 20 && ci.components === 45, `a set built as separate components counts as components, not variants (Icon: ${ci.components})`);
ok(JSON.stringify(alsoBuilds(catalog, four)) === JSON.stringify(['Icon', 'Spinner', 'Focus ring', 'Flush icon button Neutral', 'Divider', 'Button Group', 'Field label', 'Field message']),
  `idea 7: the sets a build makes first, transitively, minus the selection, named as the list names them (Q392 on #2812) (${alsoBuilds(catalog, four).join(', ')})`);
ok(displayNameOf(catalog, 'button-destructive') === 'Button Destructive' && displayNameOf(catalog, 'tab-item') === 'Tab Item' && displayNameOf(catalog, 'image-placeholder') === 'Image placeholder',
  `a part set reads as its base and its part, a set alone on its row as the row (${displayNameOf(catalog, 'button-destructive')}, ${displayNameOf(catalog, 'tab-item')}, ${displayNameOf(catalog, 'image-placeholder')})`);
ok(JSON.stringify(inListOrder(catalog, ['tag', 'badge', 'spinner', 'button-neutral', 'button'])) === JSON.stringify(['button', 'button-neutral', 'badge', 'tag', 'spinner']),
  `review N1 on #2812: a selection runs in the list's order, not the order it was ticked in (${JSON.stringify(inListOrder(catalog, ['tag', 'badge', 'spinner', 'button-neutral', 'button']))})`);
ok(alsoBuilds(catalog, ['focus-ring']).length === 0, 'a set that nests nothing builds nothing first');
ok(RUN_COPY.runLabel(4) === 'Build 4 sets' && RUN_COPY.runLabel(1) === 'Build 1 set' && RUN_COPY.runLabel(0) === 'Build',
  `call 17: the action counts sets ("${RUN_COPY.runLabel(4)}", "${RUN_COPY.runLabel(1)}", "${RUN_COPY.runLabel(0)}")`);

console.log('\n5. The run (calls 10, 16; idea 13)');
let r = startRun('selection', four);
ok(currentOf(r) === 'button' && JSON.stringify(positionOf(r)) === JSON.stringify({ at: 1, of: 4 }), 'a run starts at its first set, 1 of 4');
r = record(r, { id: 'button', result: 'ok', headline: '✓ built 576 variants' });
ok(currentOf(r) === 'button-destructive' && positionOf(r).at === 2 && !r.done, 'a result moves the run to the next set, 2 of 4');
r = stopRun(r);
ok(!r.done && currentOf(r) === 'button-destructive', 'call 16: Stop waits for the set being built (the run is not over until its result)');
r = record(r, { id: 'button-destructive', result: 'failed', headline: '✗ build failed' });
ok(r.done && currentOf(r) === null, 'call 16: the run ends at the first result after Stop');
const v = runVerdict(r, catalog);
ok(v.headline === 'Stopped after 2 of 4 sets' && !v.ok, `a stopped run says so (${v.headline})`);
ok(JSON.stringify(v.lines) === JSON.stringify(['Built Button on ↳ Buttons.', 'Button.Destructive: build failed.', 'Not built: Dialog, TextField.']),
  `idea 13: the summary names what was built where, what failed, and what a stop left (${JSON.stringify(v.lines)})`);
let full = startRun('subcomponents', ['focus-ring', 'icon']);
full = record(full, { id: 'focus-ring', result: 'ok', headline: '' });
full = record(full, { id: 'icon', result: 'issues', headline: '' });
const fv = runVerdict(full, catalog);
ok(full.done && fv.headline === 'Built 2 sets · 1 with problems' && !fv.ok && fv.lines.includes('Icon: built with problems.'),
  `a run with problems says how many, and names the one with problems (${fv.headline}; ${JSON.stringify(fv.lines)})`);
let clean = startRun('selection', ['button', 'button-destructive']);
clean = record(record(clean, { id: 'button', result: 'ok', headline: '' }), { id: 'button-destructive', result: 'ok', headline: '' });
const cv = runVerdict(clean, catalog);
ok(cv.ok && cv.headline === 'Built 2 sets' && JSON.stringify(cv.lines) === JSON.stringify(['Built Button, Button.Destructive on ↳ Buttons.']),
  `a clean run of one family reads as one line for its page (${cv.headline}; ${JSON.stringify(cv.lines)})`);
ok(startRun('selection', []).done, 'a run of nothing is over before it starts');

console.log(`\n${executed - failed}/${executed} component group assertions passed.`);
if (failed) process.exit(1);
