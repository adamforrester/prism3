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
 *   · a box queuing a set that can't be built (`buildableOf` bypassed) → `G4 under call 8…`.
 *   · #3129: `addableOf` keeping the sets the file holds → `Q3129.6 A: a box acts on the sets the file could add …`; a
 *     mixed box re-queuing its queued sets (`toggleSets` without its filter) → `a mixed box queues the rest, and only the rest …`.
 *   · #3129 R1: `selectAllOf` without its queued filter → `R1: Select all queues the sets the file could add …`.
 *   · #3306 (Q3306.1–6 A, section 2b), one per rule:
 *     .1 `splitsOf` true for every family (`row.family` alone) → `Q3306.1 A: the families that split …`; and a hand list
 *        (`splitsOf` keyed on the four labels) → `Q3306.1 A: a planted family with two roots splits …`.
 *     .2 `boxOfSets` counting queued sets only (needed ignored) → `Q3306.2 A: a needed set counts toward its family's …`;
 *        `heldBy` returning null → `Q3306.2 A: a needed set's box is held …`.
 *     .3 the needed sets STORED in the queue (`toggleSets` writing the chosen set's `neededOf` with it) →
 *        `Q3306.3 A: a tick writes the chosen set alone …`; `neededOf` descending into a set the file holds →
 *        `Q3306.3 A: a set the file holds is not descended into …`.
 *     .4 the needing set's name dropped from the held name (`neededBy` returning the name alone) → `Q3306.4 A: …`.
 *     .5 the badge counting needed sets (`badgeParts.add` + the needed names) → `Q3306.5 A: the badge counts chosen …`.
 *     Also adds (owner's calls on the review, A and B): a private part named (`alsoAddsOf` without its `isPrivate`
 *        filter) → `Also adds (owner, A and B): one line …`; the `_Doc-block` sets dropped from it → the same arm.
 *     Review nits: `rootsOf` without `isPrivate` → `Q3306.1 A: a private part is never a root, even where nothing nests it`;
 *        `neededOf` without its `buildable` skip → `Q3306.3 A: a nested set that can't be built is not needed …`.
 *     Select all (owner, A): `selectAllOf` skipping needed sets → `Q3306.3, Select all A: Select all queues a needed set …`.
 *     .6 an on box taking out every set it could add (`toggleSets` without its chosen filter) → `Q3306.6 A: …`.
 *   · #3439 (Q-IF.1–3 A, section 2c): `inFileOf` false when the file holds every set (`&& false`) → `Q-IF.1 A: a set the
 *     file holds …`; true while the family can still add a set (its `addableOf` test dropped) → `Q-IF.3 A: a family
 *     partly in the file keeps an active box …`.
 *   · search keeping a family only on its own label → `search: a family stays while any of its sets matches`.
 *   · Stop ending the run at once (before the current set's result) → `call 16: Stop waits for the set being built…`.
 *   · "Also builds" by component name again (`displayNameOf` bypassed) → `idea 7: the sets a build makes first…`.
 *   · the selection run in click order (`inListOrder` returning its input) → `review N1 on #2812: a selection runs in the list's order…`.
 *   · a search opening every family (`familiesToOpen` dropping its match) → `call 7 on #2812: a search opens the families…`.
 *   · Textarea dropped from Fields' `SETTING_SECTIONS` ids → `#2905 Q548: Fields holds the sets Field style draws …` and
 *     `#2905 Q6 A: … Other components …` (Textarea back in Other components).
 *   · Tag dropped from Tag's `SETTING_SECTIONS` ids → `#2931 Q579 A: Tag holds the sets Tag style draws …` (and the
 *     five-section and Other components checks).
 *   · Fields' blocks reversed (`SECTION_BLOCKS.fields` = ['search', 'fields']) → `#2952 Q5 A: each section's settings
 *     blocks, in order …`.
 *   · a set focus key resolving to no row (`rowOfFocus` keying on row keys only) → `#2905 Q8 A: a set in a flat section
 *     focuses as itself …`.
 *
 * #2905 (owner decisions Q538, Q548 on wireframe v2): the sections with settings, typed from the wireframe: Buttons (the
 * Buttons page's four sets) and Fields (Code input, Password field, Select, Text field, Textarea), then Other components and
 * Subcomponents. Fields is also held to the engine's `FIELD_FRAME_PARTS`, the defs `applyFieldStyle` draws, so a field
 * gaining Field style without joining the section (or the other way round) fails by name. A subcomponent Field style
 * draws (the Code cell, #2428) is held as the component that nests it (owner decision Q-2789.3 A).
 */
import { COMPONENT_CATALOG_DATA as catalog } from './src/state/component-catalog-data';
import type { Catalog, CatalogEntry } from './src/state/component-catalog';
import { addableOf, alsoBuilds, boxOfSets, costOf, deselectAllOf, displayNameOf, familiesToOpen, groupsOf, heldBy, inFileOf, neededOf, rootsOf, splitsOf, inListOrder, rowMatches, rowOfFocus, selectAllOf, sentenceCase, setFocusKey, tiersOf, toggleSets, GROUPS_COPY, SECTION_BLOCKS } from './src/state/component-groups';
import { TAXONOMY } from '../plugin/src/file-taxonomy';
import { FIELD_FRAME_PARTS, TAG_STYLE_PARTS, DIALOG_TITLE_TYPE_KEYS, BANNER_STYLE_FILL_KEYS } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { currentOf, positionOf, record, runVerdict, startRun, stopRun, RUN_COPY } from './src/state/build-queue';
import { alsoAddsOf, badgeParts, queuedOf, UPDATE_COPY } from './src/state/update-file';

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
// #2888 shipped Search field; Q5 A on #2905 puts it inside Fields (FIELD_FRAME_PARTS holds it).
// #2428: Q-2789.3 A puts Code input inside Fields, as the component that nests the cell Field style draws.
// #2989 (Q656 A): the cell joins the Code input page, so the row holds both sets.
// #2343 PR 4: the Card number field joins Fields, on its own page.
const WIRE_FIELDS: [string, string[]][] = [['Card number field', ['CardNumberField']], ['Code input', ['CodeInput', 'CodeInput.Cell']], ['Password field', ['PasswordField']], ['Search field', ['SearchField']], ['Select', ['Select']], ['Text field', ['TextField']], ['Textarea', ['Textarea']]];
// Q578 part 2 (A on #2931's wireframe): Tag leaves Other components for its own Tag section.
const WIRE_TAGS: [string, string[]][] = [['Tag', ['Tag']]];
// #2958: Dialog leaves Other components for its own section, as Tag did (the wireframe on #2958).
const WIRE_DIALOGS: [string, string[]][] = [['Dialog', ['Dialog']]];
// #2924 (Q693 A): Banner leaves Other components for its own section, as Dialog did (the wireframe on #2924, §4).
const WIRE_BANNERS: [string, string[]][] = [['Banner', ['Banner']]];
// #2942 (Q3 A): Link leaves Other components for its own section, for its underline's read-only line.
const WIRE_LINKS: [string, string[]][] = [['Link', ['Link']]];
// #3086 (Q816 A): Radio leaves Other components for its own section, as Banner did. Its three sets share the Radio page, so
// one row holds them, as Code input's row holds its cell.
const WIRE_RADIOS: [string, string[]][] = [['Radio', ['Radio.Control', 'Radio.Group', 'Radio.Row']]];
const WIRE_COMPONENTS: [string, string[]][] = [
  ['Accordion', ['Accordion', 'Accordion.Indicator']], ['Badge', ['Badge']], ['Breadcrumbs', ['BreadcrumbItem', 'Breadcrumbs', 'BreadcrumbSeparator']],
  ['Checkbox', ['Checkbox.Control', 'Checkbox.Group', 'Checkbox.Row']], ['Counter', ['Counter']], ['Divider', ['Divider']],
  ['Icon button', ['IconButton', 'IconButton.Destructive', 'IconButton.Neutral']], ['List', ['List', 'List.Item']],
  // Pagination (#2665) joins after the wireframe: its own page, the row and its item, a family.
  ['Pagination', ['Pagination', 'Pagination.Item']],
  ['Progress', ['Progress']],
  ['Segmented control', ['SegmentedControl', 'SegmentedControl.Segment']],
  // #2343 PR 5: Sign-in button, on its own page (Q-S10 A).
  ['Sign-in button', ['SignInButton']],
  ['Slider', ['Slider', 'Slider.Thumb']], ['Switch', ['Switch.Control', 'Switch.Row']],
  ['Tabs', ['Tab.Item', 'Tabs']], ['Toast', ['Toast']], ['Veil', ['Veil']],
  // #2343 PR 4: Wallet button, on its own page.
  ['Wallet button', ['WalletButton']],
];
const WIRE_SUBS: [string, string[]][] = [
  // #2989 (Q656 A): Breadcrumb item and Code cell left for their consumers' pages. #3148: Provider logo joins Icon on the
  // Icons & assets page, so the two share its row, as every page's family does (DRAFT row label, Q3148.2 on #3148).
  ['Field label', ['FieldLabel']], ['Field message', ['FieldMessage']], ['Flush icon button', ['FlushIconButton', 'FlushIconButton.Destructive', 'FlushIconButton.Neutral']],
  ['Focus ring', ['FocusRing']], ['Icons & assets', ['Icon', 'ProviderLogo']], ['Image placeholder', ['ImagePlaceholder']], ['Spinner', ['Spinner']],
];
const groups = groupsOf(catalog);
const drawn = (kind: string) => (groups.find((g) => g.kind === kind)?.rows ?? []).map((r) => [r.label, r.ids.map(name)] as [string, string[]]);
ok(JSON.stringify(groups.map((g) => g.title)) === JSON.stringify(['Buttons', 'Fields', 'Tag', 'Dialog', 'Banner', 'Link', 'Radio', 'Page navigation', 'Other components', 'Subcomponents']),
  `#2905 Q548, Q10 A, #2931 Q579 A, #2958, #2924, #2942, #3086, #3345: ten sections, Buttons, Fields, Tag, Dialog, Banner, Link, Radio, Page navigation, Other components, Subcomponents (${groups.map((g) => g.title).join(', ')})`);
ok(JSON.stringify(groups.map((g) => g.flat)) === JSON.stringify([true, true, true, true, true, true, true, true, false, false]),
  `#2905 Q8 A: the sections with settings list their sets flat; Other components and Subcomponents keep their family rows (${JSON.stringify(groups.map((g) => g.flat))})`);
ok(JSON.stringify(drawn('buttons')) === JSON.stringify(WIRE_BUTTONS), `#2905 Q548: Buttons holds the Buttons family's four sets (${JSON.stringify(drawn('buttons'))})`);
const fieldIds = (groups.find((g) => g.kind === 'fields')?.rows ?? []).flatMap((r) => r.ids).sort();
// Q-2789.3 A: each FIELD_FRAME_PARTS def is a Fields set, and so is the component on its page that nests it (the Code cell
// and Code input since #2989), read from the catalog's own page and `nests` rather than from SETTING_SECTIONS.
const fieldRowIds = [...new Set(Object.keys(FIELD_FRAME_PARTS).flatMap((id) => {
  const page = catalog.find((e) => e.id === id)?.page;
  return [id, ...catalog.filter((e) => e.page === page && e.nests.includes(id)).map((e) => e.id)];
}))].sort();
ok(JSON.stringify(drawn('fields')) === JSON.stringify(WIRE_FIELDS) && JSON.stringify(fieldIds) === JSON.stringify(fieldRowIds)
  && Object.keys(FIELD_FRAME_PARTS).every((id) => fieldRowIds.includes(id) || catalog.some((e) => e.section === 'Components' && e.nests.includes(id))),
  `#2905 Q548, Q-2789.3 A: Fields holds the sets Field style draws, the engine's FIELD_FRAME_PARTS (${Object.keys(FIELD_FRAME_PARTS).sort().join(', ')}), each with the component on its page that nests it (${fieldRowIds.join(', ')}), as the wireframe lists them (${JSON.stringify(drawn('fields'))})`);
const tagIds = (groups.find((g) => g.kind === 'tags')?.rows ?? []).flatMap((r) => r.ids).sort();
ok(JSON.stringify(drawn('tags')) === JSON.stringify(WIRE_TAGS) && JSON.stringify(tagIds) === JSON.stringify(Object.keys(TAG_STYLE_PARTS).sort()),
  `#2931 Q579 A: Tag holds the sets Tag style draws, the engine's TAG_STYLE_PARTS (${Object.keys(TAG_STYLE_PARTS).sort().join(', ')}), as the wireframe lists them (${JSON.stringify(drawn('tags'))})`);
const dialogIds = (groups.find((g) => g.kind === 'dialogs')?.rows ?? []).flatMap((r) => r.ids).sort();
ok(JSON.stringify(drawn('dialogs')) === JSON.stringify(WIRE_DIALOGS) && JSON.stringify(dialogIds) === JSON.stringify(Object.keys(DIALOG_TITLE_TYPE_KEYS).sort()),
  `#2958: Dialog holds the sets Dialog title size reaches, the engine's DIALOG_TITLE_TYPE_KEYS (${Object.keys(DIALOG_TITLE_TYPE_KEYS).sort().join(', ')}), as the wireframe lists them (${JSON.stringify(drawn('dialogs'))})`);
const bannerIds = (groups.find((g) => g.kind === 'banners')?.rows ?? []).flatMap((r) => r.ids).sort();
ok(JSON.stringify(drawn('banners')) === JSON.stringify(WIRE_BANNERS) && JSON.stringify(bannerIds) === JSON.stringify(Object.keys(BANNER_STYLE_FILL_KEYS).sort()),
  `#2924: Banner holds the sets Banner style reaches, the engine's BANNER_STYLE_FILL_KEYS (${Object.keys(BANNER_STYLE_FILL_KEYS).sort().join(', ')}), as the wireframe lists them (${JSON.stringify(drawn('banners'))})`);
ok(JSON.stringify(drawn('links')) === JSON.stringify(WIRE_LINKS),
  `#2942 Q3 A: Link holds its one set, for the underline's read-only line (${JSON.stringify(drawn('links'))})`);
// #3086: Radio holds the sets Radio dot size reaches, read from the engine's defs rather than restated: the def whose dot
// part binds `control.size.*.dot` and is named Radio, and every def that nests it, transitively. List.Item bound them too
// until #3155 (Q3155.1 A) sized its bullet to the text on the space ladder, and Badge until #3226 (Q3226.1 A) sized its
// presence dot to `space.100`.
const nestsOf = (d: ComponentDef): string[] => Object.values(d.anatomy.parts).map((p: any) => p.nests).filter((x): x is string => typeof x === 'string');
const dotDefs = componentDefs.filter((d) => Object.values(d.tokens ?? {}).some((t) => /^control\.size\.(sm|md|lg)\.dot$/.test(String(t))));
const radioReach = new Set(dotDefs.filter((d) => d.name.startsWith('Radio')).map((d) => d.id));
for (let grew = true; grew;) { grew = false; for (const d of componentDefs) if (!radioReach.has(d.id) && nestsOf(d).some((n) => radioReach.has(n))) { radioReach.add(d.id); grew = true; } }
const radioIds = (groups.find((g) => g.kind === 'radios')?.rows ?? []).flatMap((r) => r.ids).sort();
ok(JSON.stringify(drawn('radios')) === JSON.stringify(WIRE_RADIOS) && JSON.stringify(radioIds) === JSON.stringify([...radioReach].sort()),
  `#3086: Radio holds the sets Radio dot size reaches, the Radio def binding control.size.*.dot and every def nesting it (${[...radioReach].sort().join(', ')}), on the Radio page's row (${JSON.stringify(drawn('radios'))})`);
ok(JSON.stringify(dotDefs.map((d) => d.id).sort()) === JSON.stringify(['radio-control']),
  `#3086, #3155, #3226: the one def that binds control.size.*.dot is Radio.Control, the one Radio dot size moves (${dotDefs.map((d) => d.id).sort().join(', ')})`);
// #2952 (#2905 Q5 A, Q7 A): a section holds an ordered LIST of settings blocks, not one. Typed from the decisions: Fields
// #3345: Page navigation holds the row and its item, the sets whose current page's bar Current page indicator sets
// (typed here; the bar itself is Link's, which keeps its own section).
const WIRE_PAGENAVS: [string, string[]][] = [['Page navigation', ['PageNav', 'PageNav.Item']]];
ok(JSON.stringify(drawn('pagenavs')) === JSON.stringify(WIRE_PAGENAVS), `#3345: Page navigation holds PageNav and PageNav.Item on its page's row (${JSON.stringify(drawn('pagenavs'))})`);
// draws Field options, then Search options below it; Buttons, Tag, Dialog, Banner, Link and Radio one each; Other components and Subcomponents none.
const WIRE_BLOCKS: Record<string, string[]> = { buttons: ['buttons'], fields: ['fields', 'search'], tags: ['tags'], dialogs: ['dialogs'], banners: ['banners'], links: ['links'], radios: ['radios'], pagenavs: ['pagenavs'], components: [], subcomponents: [] };
const blocksOf = Object.fromEntries(groups.map((g) => [g.kind, [...(SECTION_BLOCKS[g.kind] ?? [])]]));
ok(JSON.stringify(blocksOf) === JSON.stringify(WIRE_BLOCKS),
  `#2952 Q5 A: each section's settings blocks, in order: Fields draws Field options then Search options below it (${JSON.stringify(blocksOf)})`);
const allBlocks = Object.values(SECTION_BLOCKS).flat();
ok(new Set(allBlocks).size === allBlocks.length && groups.every((g) => !(SECTION_BLOCKS[g.kind] ?? []).length || g.flat),
  `#2952: a block sits in one section only, and only a flat section with settings draws blocks (${allBlocks.join(', ')})`);
ok(JSON.stringify(drawn('components').map((r) => r[0])) === JSON.stringify(WIRE_COMPONENTS.map((r) => r[0])),
  `notes 2, 3, #2905 Q6 A: Other components holds every other component row (Banner and Radio left for their own sections, #2924, #3086), Breadcrumbs (#2666), Pagination (#2665), Progress (#2670) and Slider (#2669) among them, alphabetical, families grouped by page (${drawn('components').map((r) => r[0]).join(', ')})`);
ok(JSON.stringify(drawn('subcomponents').map((r) => r[0])) === JSON.stringify(WIRE_SUBS.map((r) => r[0])),
  `note 4: the Subcomponents rows are the wireframe's 7, Icon's now shared with Provider logo on Icons & assets (#3148), alphabetical (Breadcrumb item and Code cell left for their consumers' pages, #2989) (${drawn('subcomponents').map((r) => r[0]).join(', ')})`);
ok(JSON.stringify(drawn('components')) === JSON.stringify(WIRE_COMPONENTS) && JSON.stringify(drawn('subcomponents')) === JSON.stringify(WIRE_SUBS),
  `note 2: a family's sets are alphabetical by component name, and call 12: a part set stays in its family (${JSON.stringify(drawn('components').filter((r) => r[1].length > 1).map((r) => r[1].join('/')))})`);
ok(groups.find((g) => g.kind === 'subcomponents')?.rows.some((r) => r.ids.includes('icon') && r.page === 'Icons & assets') === true,
  'call 11: Icon lists under Subcomponents, and still lands on ↳ Icons & assets');
ok(groups.flatMap((g) => g.rows).flatMap((r) => r.ids).length === catalog.length && catalog.length === 62,
  `every set is listed once: ${groups.flatMap((g) => g.rows).flatMap((r) => r.ids).length} rows' sets over ${catalog.length} in the catalog (the wireframe's 41, Button.Group since #2661, Counter since #2427, Code input and its cell since #2428, Pagination's 2 since #2665, Progress since #2670, Search field since #2888, Slider with its Thumb since #2669, Toast since #2668, Banner since #2579, the three Breadcrumbs sets since #2666, Provider logo since #2343, Wallet button since #2343 PR 4, Card number field since #2343 PR 4, Sign-in button since #2343 PR 5, and Page navigation with its item since #3345)`);
ok(sentenceCase('Field Label') === 'Field label' && sentenceCase('Text field') === 'Text field' && sentenceCase('Icons & assets') === 'Icons & assets',
  'call 14: a page name reads in sentence case ("Field Label" → "Field label")');
ok(GROUPS_COPY.sectionCount('components', 19, 32) === '19 families and sets · 32 sets' && GROUPS_COPY.sectionCount('subcomponents', 7, 9) === '7 entries · 9 sets'
  && GROUPS_COPY.sectionCount('buttons', 1, 4) === '4 sets' && GROUPS_COPY.sectionCount('fields', 4, 4) === '4 sets' && GROUPS_COPY.sectionCount('tags', 1, 1) === '1 set',
  `the section counts, in the wireframes' words (${GROUPS_COPY.sectionCount('components', 19, 32)}; ${GROUPS_COPY.sectionCount('subcomponents', 7, 9)}; ${GROUPS_COPY.sectionCount('buttons', 1, 4)})`);
const btnRow = groups.find((g) => g.kind === 'buttons')?.rows[0];
ok(!!btnRow && rowOfFocus(catalog, setFocusKey('button-neutral'))?.key === btnRow.key && rowOfFocus(catalog, btnRow.key)?.key === btnRow.key && rowOfFocus(catalog, 'set=nothing') === undefined,
  `#2905 Q8 A: a set in a flat section focuses as itself, and its focus names its family's row, so the preview shows the family (${rowOfFocus(catalog, setFocusKey('button-neutral'))?.label})`);

console.log('\n2. Boxes over the add queue (note 5, call 8; #3129 Q3129.4–6 A)');
// #3129: a box acts on the file's add queue, over the sets of its ids the file could add (buildable, not in the file).
const buttons = ['button', 'button-destructive', 'button-neutral'];
const apply = (q: ReadonlySet<string>, w: { ids: readonly string[]; on: boolean }): Set<string> => {
  const n = new Set(q);
  for (const id of w.ids) if (w.on) n.add(id); else n.delete(id);
  return n;
};
let q: Set<string> = new Set();
let w = toggleSets(catalog, buttons, q, []);
ok(w.on && JSON.stringify(w.ids) === JSON.stringify(buttons), `call 8: a family box queues all of its sets, as one write (${JSON.stringify(w)})`);
q = apply(q, w);
ok(boxOfSets(catalog, buttons, q, []) === 'on', 'call 8: a family with every set queued reads on');
q = apply(q, toggleSets(catalog, ['button-neutral'], q, []));
ok(boxOfSets(catalog, buttons, q, []) === 'mixed', 'call 8: a family with some of its sets queued reads mixed');
w = toggleSets(catalog, buttons, q, []);
ok(w.on && JSON.stringify(w.ids) === JSON.stringify(['button-neutral']), `a mixed box queues the rest, and only the rest, when it is toggled (${JSON.stringify(w)})`);
q = apply(q, w);
w = toggleSets(catalog, buttons, q, []);
q = apply(q, w);
ok(!w.on && q.size === 0 && boxOfSets(catalog, buttons, q, []) === 'off', 'an all-on box takes its sets out of the queue');
// Q3129.6 A: the file holds Button, so the family's box is over the other two, and a set the file holds is never queued.
w = toggleSets(catalog, buttons, new Set(), ['button']);
ok(w.on && JSON.stringify(w.ids) === JSON.stringify(['button-destructive', 'button-neutral']) && boxOfSets(catalog, buttons, new Set(['button-destructive', 'button-neutral']), ['button']) === 'on',
  `Q3129.6 A: a box acts on the sets the file could add; a set the file holds is never queued, and does not hold the box mixed (${JSON.stringify(w)})`);
ok(JSON.stringify(addableOf(catalog, buttons, buttons)) === '[]', 'Q3129.6 A: a family the file holds whole has no set to add, so no box');
// G4: a planted set that can't be built is never queued by any box.
const off: CatalogEntry = { ...catalog.find((e) => e.id === 'badge')!, id: 'planted-off', name: 'Planted', buildable: false, reason: 'planted-off: no geometry.', members: null, nests: [] };
const withOff: Catalog = [...catalog, off];
const picked = toggleSets(withOff, ['badge', 'planted-off'], new Set(), []);
ok(picked.ids.join() === 'badge' && boxOfSets(withOff, ['planted-off'], new Set(), []) === 'off',
  `G4 under call 8: a box over a set that can't be built never queues it (${JSON.stringify(picked)})`);
ok(GROUPS_COPY.addSet('Badge') === 'Add Badge to file' && GROUPS_COPY.addAllOf('Radio') === 'Add all of Radio to file' && GROUPS_COPY.addAll('Fields') === 'Add all Fields to file',
  'Q3129.4 A: the boxes\' names, as the wireframe words them (DRAFT)');
// #3306 Q3306.2 A (narrowing R5's two-state row box): a family's box is three-state. Planted: Radio's control in the
// file, its row queued, its group not, so the family is partly in the file and partly queued.
const radio = ['radio-control', 'radio-group', 'radio-row'];
ok(boxOfSets(catalog, radio, new Set(['radio-row']), ['radio-control']) === 'mixed' && boxOfSets(catalog, radio, new Set(['radio-group', 'radio-row']), ['radio-control']) === 'on',
  'Q3306.2 A: a family\'s box is three-state again: partly queued it reads mixed, every part the file lacks queued reads on');
const rw = toggleSets(catalog, radio, new Set(['radio-row']), ['radio-control']);
ok(rw.on && JSON.stringify(rw.ids) === JSON.stringify(['radio-group']),
  `R5: a family partly in the file and partly queued: its tick queues the missing part left, never one the file holds (${JSON.stringify(rw)})`);
// R1: a tier's Select all and Deselect all, over the planted ids.
const tierIds = ['badge', 'counter', 'divider', 'planted-off'];
ok(JSON.stringify(selectAllOf(withOff, tierIds, new Set(['counter']), ['divider'])) === JSON.stringify(['badge'])
  && JSON.stringify(deselectAllOf(withOff, tierIds, new Set(['counter', 'divider']), ['divider'])) === JSON.stringify(['counter']),
  'R1: Select all queues the sets the file could add that are not queued; Deselect all takes out the queued ones; neither touches a set the file holds or one that can\'t be built');
ok(selectAllOf(catalog, ['badge'], new Set(['badge']), []).length === 0 && deselectAllOf(catalog, ['badge'], new Set(), []).length === 0,
  'R1: each action is empty when it would change nothing');
ok(GROUPS_COPY.selectAll === 'Select all' && GROUPS_COPY.deselectAll === 'Deselect all' && GROUPS_COPY.settingsTier === 'Component settings',
  'R1, R2: the tier actions and the settings tier\'s caption, in the owner\'s words');

console.log('\n2b. A box per set, needed sets (#3306, Q3306.1–6 A)');
// Q3306.1 A: the families with two or more roots, typed from the proposal's table (2026-11-02), never read back from the
// rule: [label, its roots].
const WIRE_SPLITS: [string, string[]][] = [
  ['Buttons', ['button-destructive', 'button-group', 'button-neutral']],
  ['Icon button', ['icon-button', 'icon-button-destructive', 'icon-button-neutral']],
  ['Flush icon button', ['flush-icon-button', 'flush-icon-button-destructive', 'flush-icon-button-neutral']],
  ['Icons & assets', ['icon', 'provider-logo']],
];
const allRows = groups.flatMap((g) => g.rows);
const splits = allRows.filter((r) => splitsOf(catalog, r)).map((r) => [r.label, rootsOf(catalog, r.ids)] as [string, string[]]);
ok(JSON.stringify(splits) === JSON.stringify(WIRE_SPLITS),
  `Q3306.1 A: the families that split are those with two or more roots, Buttons, Icon button, Flush icon button and Icons & assets, each with its roots (${JSON.stringify(splits)})`);
ok(['Checkbox', 'Radio', 'Switch', 'Tabs', 'Accordion', 'Breadcrumbs', 'Code input'].every((l) => { const r = allRows.find((x) => x.label === l); return r && r.family && !splitsOf(catalog, r); })
  && JSON.stringify(rootsOf(catalog, ['_accordion-indicator', 'accordion'])) === JSON.stringify(['accordion']),
  'Q3306.1 A: a family with one root keeps one box (Checkbox, Radio, Switch, Tabs, Accordion, Breadcrumbs, Code input)');
// The review's nit 2: the fixture above is vacuous (Accordion nests its indicator, so the indicator is no root either way).
// Here nothing in the ids nests the private part, so only the `isPrivate` filter keeps it out.
ok(JSON.stringify(rootsOf(catalog, ['_accordion-indicator', 'tag'])) === JSON.stringify(['tag']),
  `Q3306.1 A: a private part is never a root, even where nothing nests it (${JSON.stringify(rootsOf(catalog, ['_accordion-indicator', 'tag']))})`);
// The rule is the catalog's: a planted family whose second set stops nesting the first gains a root, and splits.
const plantedCheckbox: Catalog = catalog.map((e) => (e.id === 'checkbox-row' ? { ...e, nests: [] } : e));
const plantedRow = groupsOf(plantedCheckbox).flatMap((g) => g.rows).find((r) => r.label === 'Checkbox')!;
ok(splitsOf(plantedCheckbox, plantedRow) && JSON.stringify(rootsOf(plantedCheckbox, plantedRow.ids)) === JSON.stringify(['checkbox-control', 'checkbox-group']),
  `Q3306.1 A: a planted family with two roots splits, so the rule is computed from the catalog's nests, not listed (${JSON.stringify(rootsOf(plantedCheckbox, plantedRow.ids))})`);

// Q3306.3 A: the needed sets, derived on read. The proposal's sample: the queue holds Button.Group, the file holds Icon
// and Focus ring; Button.Group nests Button, which nests Spinner.
const sample = new Set(['button-group']);
const has = ['icon', 'focus-ring'];
const need = neededOf(catalog, sample, has);
ok(JSON.stringify([...need]) === JSON.stringify([['button', ['button-group']], ['spinner', ['button-group']]]),
  `Q3306.3 A: the needed sets are what the chosen sets nest, transitively, that the file lacks, each with the chosen sets that need it (${JSON.stringify([...need])})`);
ok(neededOf(catalog, new Set(['button-group']), ['button']).size === 0,
  `Q3306.3 A: a set the file holds is not descended into, as build-deps does not (${JSON.stringify([...neededOf(catalog, new Set(['button-group']), ['button'])])})`);
// The review's nit 3: a set the engine can't build is never needed. Planted: Tag nests a set with no geometry.
const offNested: Catalog = [...catalog.map((e) => (e.id === 'tag' ? { ...e, nests: [...e.nests, 'planted-off'] } : e)), off];
ok(neededOf(offNested, new Set(['tag']), has).size === 0,
  `Q3306.3 A: a nested set that can't be built is not needed, as build-deps builds only buildable sets (${JSON.stringify([...neededOf(offNested, new Set(['tag']), has)])})`);
// Owner's call on the review (Select all, A): Select all queues the needed sets it covers as chosen. With Button.Group,
// Destructive and Neutral chosen, Button is needed and held; Select all over Buttons queues Button, which then is chosen.
const pickedButtons = new Set(['button-group', 'button-destructive', 'button-neutral']);
const selAll = selectAllOf(catalog, ['button', 'button-destructive', 'button-group', 'button-neutral'], pickedButtons, has);
const afterAll = new Set([...pickedButtons, ...selAll]);
ok(JSON.stringify(selAll) === JSON.stringify(['button']) && heldBy(catalog, ['button'], afterAll, has) === null && !neededOf(catalog, afterAll, has).has('button'),
  `Q3306.3, Select all A: Select all queues a needed set as chosen, so it is no longer held (${JSON.stringify(selAll)})`);
const tick = toggleSets(catalog, ['button-group'], new Set(), has);
let q6 = apply(new Set(), tick);
const untick = toggleSets(catalog, ['button-group'], q6, has);
q6 = apply(q6, untick);
ok(tick.on && JSON.stringify(tick.ids) === JSON.stringify(['button-group']) && !untick.on && JSON.stringify(untick.ids) === JSON.stringify(['button-group']) && q6.size === 0 && neededOf(catalog, q6, has).size === 0,
  `Q3306.3 A: a tick writes the chosen set alone, never the sets it needs, so unticking it leaves nothing behind (tick ${JSON.stringify(tick)}, untick ${JSON.stringify(untick)}, queue after ${JSON.stringify([...q6])})`);

// Q3306.2 A: a needed set is ticked and held, and counts toward its family's and its section's mixed state.
const buttons4 = ['button', 'button-destructive', 'button-group', 'button-neutral'];
ok(boxOfSets(catalog, ['button'], sample, has) === 'on' && boxOfSets(catalog, buttons4, sample, has) === 'mixed'
  && boxOfSets(catalog, buttons4, new Set(['button-group', 'button-destructive', 'button-neutral']), has) === 'on',
  'Q3306.2 A: a needed set counts toward its family\'s mixed state: Button ticked by Button.Group, the family mixed, then on with the other two chosen');
ok(JSON.stringify(heldBy(catalog, ['button'], sample, has)) === JSON.stringify(['button-group']) && JSON.stringify(heldBy(catalog, ['spinner'], sample, has)) === JSON.stringify(['button-group'])
  && heldBy(catalog, ['button-group'], sample, has) === null && heldBy(catalog, buttons4, sample, has) === null
  && JSON.stringify(heldBy(catalog, ['spinner'], new Set(['button-group', 'icon-button']), has)) === JSON.stringify(['button-group', 'icon-button'])
  && toggleSets(catalog, ['button'], sample, has).ids.length === 0,
  'Q3306.2 A: a needed set\'s box is held by the chosen sets that need it (Button and Spinner by Button.Group; Spinner by two once Icon button is chosen too), a chosen set\'s is not, and a tick on a held box writes nothing');

// Q3306.4 A: the tag reads Needed; the needing set is in the box's name and title.
ok(UPDATE_COPY.status.needed === 'Needed' && GROUPS_COPY.neededBy('Button', ['Button.Group']) === 'Button, needed by Button.Group'
  && GROUPS_COPY.neededBy('Spinner', ['Button.Group', 'IconButton', 'Tag']) === 'Spinner, needed by 3 sets',
  `Q3306.4 A: the tag reads "${UPDATE_COPY.status.needed}", the held name "${GROUPS_COPY.neededBy('Button', ['Button.Group'])}" or "${GROUPS_COPY.neededBy('Spinner', ['a', 'b', 'c'])}" (DRAFT)`);

// Q3306.5 A: the badge counts chosen sets only; To add's Also line names the needed ones, in and out of the family.
const sampleQueue = ['button-group', 'tag', 'icon-button'];
const bp = badgeParts(catalog, { present: has, setUp: true, error: null, due: {} }, null, sampleQueue);
const also = alsoAddsOf(catalog, { present: has }, sampleQueue, true);
ok(bp.add === 3 && queuedOf(catalog, { present: has }, sampleQueue).length === 3 && JSON.stringify(also) === JSON.stringify(['Button', 'Spinner'])
  && UPDATE_COPY.alsoAdds(also) === 'Also adds: Button, Spinner.' && alsoAddsOf(catalog, { present: has }, ['tag'], true).length === 0,
  `Q3306.5 A: the badge counts the 3 chosen sets, matching To add's rows; the Also line names the needed ones ("${UPDATE_COPY.alsoAdds(also)}"), and there is none when nothing is needed (badge ${bp.add})`);
// Owner's calls on the review: ONE "Also adds" line for everything built alongside the picks, the needed sets and #3308's
// `_Doc-block` sets together, each once (Spinner is both), in Components' order; a private part (Accordion's indicator,
// needed by Accordion) is built but never named. Panels off: the `_Doc-block` sets drop out.
const dbFile = { present: has, docBlockLacks: ['tag', 'divider', 'list-item', 'spinner'] };
const dbQueue = ['button-group', 'tag', 'accordion'];
const allAlso = alsoAddsOf(catalog, dbFile, dbQueue, true);
ok(JSON.stringify(allAlso) === JSON.stringify(['Button', 'Divider', 'List Item', 'Spinner']) && UPDATE_COPY.alsoAdds(allAlso) === 'Also adds: Button, Divider, List Item, Spinner.'
  && neededOf(catalog, new Set(dbQueue), has).has('_accordion-indicator'),
  `Also adds (owner, A and B): one line, the needed sets and the _Doc-block sets together, each once, no private part ("${UPDATE_COPY.alsoAdds(allAlso)}")`);
ok(JSON.stringify(alsoAddsOf(catalog, dbFile, dbQueue, false)) === JSON.stringify(['Button', 'Divider', 'Spinner']),
  `Also adds: with the panels off, only the needed sets (${JSON.stringify(alsoAddsOf(catalog, dbFile, dbQueue, false))})`);

// Q3306.6 A: an on family box takes out only the sets chosen in it; a set a chosen set elsewhere needs stays held.
const icons = ['icon', 'provider-logo'];
const elsewhere = new Set(['button', 'provider-logo']);
const off6 = toggleSets(catalog, icons, elsewhere, []);
ok(boxOfSets(catalog, icons, elsewhere, []) === 'on' && !off6.on && JSON.stringify(off6.ids) === JSON.stringify(['provider-logo'])
  && JSON.stringify(heldBy(catalog, ['icon'], apply(elsewhere, off6), [])) === JSON.stringify(['button']),
  `Q3306.6 A: Icons & assets on (Icon needed by Button, Provider logo chosen): its tick takes out Provider logo alone, and Icon stays held by Button (${JSON.stringify(off6)})`);
const on6 = new Set(['button-group', 'button-destructive', 'button-neutral']);
const off6b = toggleSets(catalog, buttons4, on6, has);
ok(!off6b.on && JSON.stringify(off6b.ids) === JSON.stringify(['button-destructive', 'button-group', 'button-neutral']) && apply(on6, off6b).size === 0,
  `Q3306.6 A: Buttons on, Button needed: the family's tick takes out the three chosen sets, and Button goes with what needed it (${JSON.stringify(off6b)})`);

console.log('\n2c. What the file holds (#3439, Q-IF.1–3 A)');
// EXPECTED typed from the issue: a set or family the file holds whole is drawn checked and disabled; a family partly in
// it keeps an active box; a box over nothing in the file (a set that can't be built) stays an empty cell.
ok(inFileOf(catalog, ['badge'], ['badge']) && inFileOf(catalog, buttons, buttons),
  'Q-IF.1 A: a set the file holds, and a family it holds whole, draw their box checked and disabled');
ok(!inFileOf(catalog, radio, ['radio-control']) && boxOfSets(catalog, radio, new Set(), ['radio-control']) === 'off'
  && JSON.stringify(toggleSets(catalog, radio, new Set(), ['radio-control'])) === JSON.stringify({ ids: ['radio-group', 'radio-row'], on: true }),
  'Q-IF.3 A: a family partly in the file keeps an active box, and its tick adds only the missing sets');
ok(inFileOf(catalog, radio, radio), 'Q-IF.3 A: once every set of a family is in the file, its box is checked and disabled');
ok(!inFileOf(withOff, ['planted-off'], []) && !inFileOf(catalog, ['badge'], []), 'Q3129.6 A kept: a box over no set the file holds or could add is no box');
ok(GROUPS_COPY.inFile === 'In file' && GROUPS_COPY.inFileName('Badge') === 'Badge is in this file',
  'Q-IF.1 A, Q-IF.2 A: the tag reads In file; the box\'s name reads "{name} is in this file" (DRAFT)');

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
ok(ci.variants === 50 && ci.components === 46, `a set built as separate components counts as components, not variants (Icon: ${ci.components}; Badge's 50 members, its contained status label at two sizes and three emphases since #2983 and its inline style since #3199: ${ci.variants})`);
ok(JSON.stringify(alsoBuilds(catalog, four)) === JSON.stringify(['Icon', 'Spinner', 'Focus ring', 'Flush icon button Neutral', 'Divider', 'Button Group', 'Field label', 'Field message']),
  `idea 7: the sets a build makes first, transitively, minus the selection, named as the list names them (Q392 on #2812) (${alsoBuilds(catalog, four).join(', ')})`);
ok(displayNameOf(catalog, 'button-destructive') === 'Button Destructive' && displayNameOf(catalog, 'tab-item') === 'Tab Item' && displayNameOf(catalog, 'image-placeholder') === 'Image placeholder',
  `a part set reads as its base and its part, a set alone on its row as the row (${displayNameOf(catalog, 'button-destructive')}, ${displayNameOf(catalog, 'tab-item')}, ${displayNameOf(catalog, 'image-placeholder')})`);
ok(JSON.stringify(inListOrder(catalog, ['tag', 'badge', 'spinner', 'button-neutral', 'button'])) === JSON.stringify(['button', 'button-neutral', 'tag', 'badge', 'spinner']),
  `review N1 on #2812: a selection runs in the list's order, not the order it was ticked in (${JSON.stringify(inListOrder(catalog, ['tag', 'badge', 'spinner', 'button-neutral', 'button']))})`);
ok(alsoBuilds(catalog, ['focus-ring']).length === 0, 'a set that nests nothing builds nothing first');
ok(RUN_COPY.runLabel(4) === 'Build 4 sets' && RUN_COPY.runLabel(1) === 'Build 1 set' && RUN_COPY.runLabel(0) === 'Build',
  `call 17: the action counts sets ("${RUN_COPY.runLabel(4)}", "${RUN_COPY.runLabel(1)}", "${RUN_COPY.runLabel(0)}")`);

console.log('\n5. The run (calls 10, 16; idea 13)');
let r = startRun('selection', four, catalog);
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
// #3326 PR 1 (Q3326.1 A, #3308 Q3308.1 A): the run's causes, as data. The failed set with no cause of its own still gets
// one; each set a stop left is one too. Literal. (mutation: `runCauses` skipping a result → `causes/run stopped`)
ok(JSON.stringify(v.causes) === JSON.stringify([
  { kind: 'bad', subject: 'button-destructive', what: 'could not be built', reasons: [] },
  { kind: 'warn', subject: 'dialog', what: 'not built', reasons: [] },
  { kind: 'warn', subject: 'text-field', what: 'not built', reasons: [] },
]), `causes/run stopped: the failed set and each set the stop left are causes (${JSON.stringify(v.causes)})`);
let full = startRun('subcomponents', ['focus-ring', 'icon'], catalog);
full = record(full, { id: 'focus-ring', result: 'ok', headline: '' });
// The set's own build sent its cause (the template line), and one about a set it built first: both kept, the set's
// reasons carried whole. (mutation: `runCauses` dropping a set's own causes → `causes/run reasons`)
const iconCause = { kind: 'warn' as const, subject: 'icon', what: 'built with problems', reasons: ['No usage panels drawn: this file has no _Doc-block component. Run Set up file, then build again.'] };
const nested = { kind: 'warn' as const, subject: 'focus-ring', what: 'built with problems', reasons: ['2 misses'] };
full = record(full, { id: 'icon', result: 'issues', headline: '', causes: [iconCause, nested] });
const fv = runVerdict(full, catalog);
// #3308: marked `⚠`, as one set's "with problems" build is, so Activity counts it a warning and not a failure.
ok(full.done && fv.headline === '⚠ Built 2 sets · 1 with problems' && !fv.ok && fv.lines.includes('Icon: built with problems.'),
  `a run with problems says how many, marked a warning, and names the one with problems (${fv.headline}; ${JSON.stringify(fv.lines)})`);
ok(JSON.stringify(fv.causes) === JSON.stringify([iconCause, nested]),
  `causes/run reasons: a set built with problems carries the reasons its own build sent (${JSON.stringify(fv.causes)})`);
// #3389 review N2: ONE CAUSE PER SET across the run. Focus Ring had problems in its own build, and Icon's build names it
// again (a set it built first): the run carries one Focus Ring cause holding both builds' reasons, in order, each once.
// Literal. (mutation: `runCauses` returning its list unmerged → `causes/run merged`)
let twice = startRun('subcomponents', ['focus-ring', 'icon'], catalog);
twice = record(twice, { id: 'focus-ring', result: 'issues', headline: '', causes: [{ ...nested, reasons: ['1 miss'] }] });
twice = record(twice, { id: 'icon', result: 'issues', headline: '', causes: [iconCause, nested] });
const tv = runVerdict(twice, catalog);
ok(JSON.stringify(tv.causes) === JSON.stringify([
  { kind: 'warn', subject: 'focus-ring', what: 'built with problems', reasons: ['1 miss', '2 misses'] },
  iconCause,
]), `causes/run merged: a set two builds name is one cause, with both builds' reasons (${JSON.stringify(tv.causes)})`);
let clean = startRun('selection', ['button', 'button-destructive'], catalog);
clean = record(record(clean, { id: 'button', result: 'ok', headline: '' }), { id: 'button-destructive', result: 'ok', headline: '' });
const cv = runVerdict(clean, catalog);
ok(cv.ok && cv.headline === 'Built 2 sets' && JSON.stringify(cv.lines) === JSON.stringify(['Built Button, Button.Destructive on ↳ Buttons.']),
  `a clean run of one family reads as one line for its page (${cv.headline}; ${JSON.stringify(cv.lines)})`);
ok(JSON.stringify(cv.causes) === '[]', `causes/run clean: a clean run names no cause (${JSON.stringify(cv.causes)})`);
ok(startRun('selection', [], catalog).done, 'a run of nothing is over before it starts');
// #3308: the owner's first-run queue, in the list's order (Components' families: Buttons, Checkbox group and its row,
// Icons & assets, Link, Badge). Typed here. The run builds each set after the queued sets it nests, so the plugin's own
// dependency pass (#1633) never builds one the queue then builds again: Checkbox.Row before Checkbox group, which nests
// it, and Icon before Button, which nests it through no other set. The rest keep the list's order.
// (mutation: `startRun` ignoring its catalog → `queue/deps-first`; `runSets` in `main.ts` dropping it → `typecheck-web`)
const owner = ['button', 'button-destructive', 'button-group', 'button-neutral', 'checkbox-group', 'checkbox-row', 'icon', 'link', 'badge'];
const ownerRun = startRun('selection', owner, catalog);
ok(JSON.stringify(ownerRun.ids) === JSON.stringify(['icon', 'button', 'button-destructive', 'button-group', 'button-neutral', 'checkbox-row', 'checkbox-group', 'link', 'badge']),
  `queue/deps-first: each queued set runs after the queued sets it nests, Icon first and Checkbox.Row before Checkbox group (${JSON.stringify(ownerRun.ids)})`);
ok(currentOf(ownerRun) === 'icon' && positionOf(ownerRun).of === 9, `queue/deps-first: the run still holds all 9 sets, and starts with Icon (${currentOf(ownerRun)}, of ${positionOf(ownerRun).of})`);
// Through a set the queue does not hold: Checkbox group nests Checkbox.Row, which nests Checkbox (control). Queued with
// the group after it, the control still runs first.
ok(JSON.stringify(startRun('selection', ['checkbox-group', 'checkbox-control'], catalog).ids) === JSON.stringify(['checkbox-control', 'checkbox-group']),
  `queue/deps-first: a set nested through one the queue does not hold still runs first (${JSON.stringify(startRun('selection', ['checkbox-group', 'checkbox-control'], catalog).ids)})`);
ok(JSON.stringify(startRun('selection', ['badge', 'link', 'badge'], catalog).ids) === JSON.stringify(['badge', 'link']),
  'queue/deps-first: sets that nest nothing queued keep the list\'s order, and a set listed twice runs once');

console.log('\nT. The four tiers (#2909 Q2909.17 A; Q659 A, working names)');
// The owner's tiers, in order, typed. Each set's tier is its page's section in the plugin's file taxonomy, read from
// `file-taxonomy.ts` itself (the file's structure, the oracle), never from the grouping: the Components section is the
// Components tier, and everything else a build places is Subcomponents, Icon's Foundations page included (call 11 A).
// No definition is placed in Content components or Blocks yet, so both stay empty, and no tier is guessed.
const tiers = tiersOf(catalog);
ok(JSON.stringify(tiers.map((t) => t.title)) === JSON.stringify(['Components', 'Subcomponents', 'Content components', 'Blocks']), `the tiers, in order (${tiers.map((t) => t.title).join(' / ')})`);
const sectionOf = (id: string): string | null => TAXONOMY.sections.find((sec) => sec.leaves.some((l) => l.defs.includes(id)))?.header ?? null;
const tierOfSet = (id: string): string | undefined => tiers.find((t) => t.sections.some((sec) => sec.rows.some((r) => r.ids.includes(id))))?.id;
const misplaced = catalog.filter((e) => (sectionOf(e.id) === 'Components' ? 'components' : 'subcomponents') !== tierOfSet(e.id)).map((e) => `${e.id} → ${tierOfSet(e.id)} (file: ${sectionOf(e.id)})`);
ok(catalog.length > 40 && !misplaced.length, `every set (${catalog.length}) sits in the tier its file section names${misplaced.length ? ` — ${misplaced.join(', ')}` : ''}`);
ok(tierOfSet('icon') === 'subcomponents', 'Icon, on its Foundations page, lists under Subcomponents (call 11 A)');
ok(JSON.stringify(tiers[0].sections.map((sec) => sec.title)) === JSON.stringify(['Buttons', 'Fields', 'Tag', 'Dialog', 'Banner', 'Link', 'Radio', 'Page navigation', 'Other components']) && JSON.stringify(tiers[1].sections.map((sec) => sec.title)) === JSON.stringify(['Subcomponents']),
  `the sections sit under their tier, settings first (${tiers.map((t) => `${t.title}: ${t.sections.map((sec) => sec.title).join(', ')}`).join(' | ')})`);
ok(tiers[2].sections.length === 0 && tiers[3].sections.length === 0, 'Content components and Blocks hold nothing: no definition names either');
ok(GROUPS_COPY.tiersEmpty(['Content components', 'Blocks']).startsWith('Content components and Blocks'), 'the empty tiers are named in one line');

console.log(`\n${executed - failed}/${executed} component group assertions passed.`);
if (failed) process.exit(1);
