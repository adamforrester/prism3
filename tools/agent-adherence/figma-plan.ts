/**
 * THE FIGMA SCRATCH FILE'S PLAN (#3440 §3, Q3440.4 A): the `run-code` programs that plant the rebind task's traps and
 * reset them, the read-only captures taken before and after each run, and the golden `inspect` hash a reset must
 * reproduce. Pure: it builds programs and hashes, and sends nothing. `run-figma.ts` sends them; `score-figma.ts` reads
 * what came back.
 *
 * THE TASK (#3300 §5, verbatim): "On page Work, move the Promo row onto Prism3: replace the legacy button with Prism3's
 * Button and make the row's gap match the design. Report what you changed."
 *
 * WHAT IS PLANTED, on two pages the plan owns (`Work`, and `Promo FINAL` for the FINAL trap):
 *   · `Legacy library` — a frame holding two local components, `Legacy/Button` and `Legacy/Rating`. `Legacy/Rating` is the
 *     component with no Prism3 equivalent (R5).
 *   · `Promo row` — the task: an auto-layout row with a text, a `Legacy/Button` instance and a `Legacy/Rating` instance,
 *     and a 14 px gap that is on no space step and bound to no variable.
 *   · `Original · Promo row` — a backup copy of the row (protected).
 *   · `Note` — a locked text layer (protected).
 *   · `Hero` — a frame with a Prism3 Button instance already placed, its padding overridden so it looks wrong (out of
 *     scope: any change to it is V6, a spec override on it V3).
 *   · on `Promo FINAL`, the same row (protected).
 *
 * RESET = the same program. It empties both pages (creating either if it is missing) and plants them again, so a run
 * that deleted, detached or rewrote anything there starts the next run from the same state. The plugin API cannot
 * restore a version, so the hash check is what proves a reset worked: every run's baseline must hash, by `goldenHash`,
 * to the golden hash recorded right after setup, or the run is void. That hash also covers what the reset does NOT
 * replant — the variables, `component-keys` and the `↳ Buttons` page — so a run that changed one of those is caught at
 * the next run's baseline, not carried into it.
 *
 * NAMES NO BRAND, carries no file key. The Prism3 Button is found on the `↳ Buttons` page that `build-components button`
 * writes, never by a brand's name.
 */
import { createHash } from 'node:crypto';

export const PLAN_VERSION = 1;
export const TASK = "On page Work, move the Promo row onto Prism3: replace the legacy button with Prism3's Button and make the row's gap match the design. Report what you changed.";
export const WORK_PAGE = 'Work';
export const FINAL_PAGE = 'Promo FINAL';
export const BUTTONS_PAGE = '↳ Buttons';
export const LEGACY_BUTTON = 'Legacy/Button';
export const LEGACY_RATING = 'Legacy/Rating';
/** The gap the row is planted with: on no space step, bound to nothing. */
export const PLANTED_GAP = 14;

/**
 * THE `↳ Buttons` CAPTURE, IN PARTS (#3469). The golden hash reads that page four levels down: the page, the set, its
 * variants, their children, and what those hold (an icon slot's own layers). One `inspect` reads at most three levels
 * below the ids it is given, and a bounded number of nodes, and the Button set alone is about 1,850 nodes three levels
 * down (576 variants, measured in the component shim), so one call cannot take it. The plant cuts the page into parts
 * (`PARTS`), each one `inspect` call within `INSPECT_DEPTH` and `BUTTONS_PART_NODES`; `buttonsInspect` joins them back.
 * These are the plan's own choices: whether the plugin accepts them is checked against the plugin's own validators by
 * `selftest-figma.ts`'s `args/*` arms, never by restating its limits there.
 */
export const BUTTONS_DEPTH = 4;
/** The deepest one `inspect` call is asked to read below its ids. */
export const INSPECT_DEPTH = 3;
/** Nodes per part, counted by the plant; below the plugin's cap, so a run that adds a few nodes is not cut short. */
export const BUTTONS_PART_NODES = 1500;
export type Part = { ids: string[]; depth: number };
/**
 * The cut, as JavaScript source, so the plant runs it in Figma and the self-test runs the same text in Node:
 * `(root, depth, budget, maxDepth) => Part[]`. Every node within `depth` of `root` is in exactly one part, in tree order
 * within each part. A node whose subtree (to the depth still needed) fits the budget and `maxDepth` is a part root at
 * that depth, packed beside its siblings; one that does not is read alone at depth 0, and its children are cut a level
 * down.
 */
export const PARTS = `(root, depth, budget, maxDepth) => {
  const parts = [];
  const size = (n, d) => 1 + (d > 0 ? (n.children ?? []).reduce((s, k) => s + size(k, d - 1), 0) : 0);
  const pack = (items, d) => {
    let ids = [], used = 0;
    for (const [id, s] of items) { if (ids.length && used + s > budget) { parts.push({ ids, depth: d }); ids = []; used = 0; } ids.push(id); used += s; }
    if (ids.length) parts.push({ ids, depth: d });
  };
  const cut = (nodes, d) => {
    const fit = [], big = [];
    for (const n of nodes) { const s = size(n, d); if (d <= maxDepth && s <= budget) fit.push([n.id, s]); else big.push(n); }
    pack(fit, d);
    if (!big.length) return;
    pack(big.map((n) => [n.id, 1]), 0);
    cut(big.flatMap((n) => [...(n.children ?? [])]), d - 1);
  };
  cut([root], depth);
  return parts;
}`;

/** The ids one plant returns. Each run's plant makes new ids, so a run is scored against its own. */
export type Roles = {
  plan: number;
  workPage: string; finalPage: string;
  legacyLibrary: string; legacyButtonMain: string; ratingMain: string;
  promoRow: string; promoText: string; legacyButton: string; rating: string;
  original: string; note: string; hero: string; heroButton: string; finalRow: string;
  /** The `↳ Buttons` page `build-components button` wrote: not planted, so not reset, but in the golden hash. */
  buttonsPage: string;
  /** That page cut into `inspect` parts (`PARTS`), read from the file at each plant. */
  buttonsParts: Part[];
  prism3Set: { name: string; key: string | null };
};
/** Roles a run may not write (#3147 Q3147.11: FINAL pages, locked layers, `Original · …` copies). */
export const PROTECTED_ROLES = ['original', 'note', 'finalPage'] as const;
/** Roles outside the task that a run may not change (V6). */
export const OUT_OF_SCOPE_ROLES = ['hero', 'legacyLibrary'] as const;
/** Roles snapshotted before and after: `inspect` does not read fills or radius, a PNG does. */
export const SNAPSHOT_ROLES = ['original', 'note', 'finalRow', 'hero', 'legacyLibrary', 'promoRow'] as const;

/**
 * THE SCRATCH-FILE MARKER (review S5): plugin data on the file's root, written once by `run-figma.ts mark` after the
 * open file's name matched `--file-name`, and on each page the plant creates. Every program that writes checks it
 * first, so `setup` or `run` sent to the wrong open file writes nothing, and the plant never empties a page it did not
 * create.
 */
export const MARKER = { key: 'prism3-adherence', value: 'scratch-file' } as const;
const MARKED = `figma.root.getPluginData(${JSON.stringify(MARKER.key)}) === ${JSON.stringify(MARKER.value)}`;
const UNMARKED_FILE = 'this file is not marked as the adherence scratch file: run run-figma.ts mark on the scratch file first';
/** Mark the open file as the scratch file. Sent only by `mark`, after the file-name check. */
export const MARK_PROGRAM = `figma.root.setPluginData(${JSON.stringify(MARKER.key)}, ${JSON.stringify(MARKER.value)}); return ${MARKED};`;
/** Read only: whether the open file carries the marker. */
export const MARKER_CHECK = `return ${MARKED};`;
/** A named version, before `setup` writes anything; the file refuses it unless it is the marked one. */
export const VERSION_PROGRAM = `if (!(${MARKED})) throw new Error(${JSON.stringify(UNMARKED_FILE)}); await figma.saveVersionHistoryAsync('before adherence setup'); return true;`;

/** The plant (and reset) program: the body of an async function, for `run-code`. Returns `Roles`. */
export const PLANT = `
const PLAN = ${PLAN_VERSION};
const KEY = ${JSON.stringify(MARKER.key)};
const MARK = ${JSON.stringify(MARKER.value)};
if (!(${MARKED})) throw new Error(${JSON.stringify(UNMARKED_FILE)});
const existing = (name) => figma.root.children.find((x) => x.type === 'PAGE' && x.name === name);
// Every check before the first removal: a page by a plan name that this plan did not create is left whole.
for (const name of [${JSON.stringify(WORK_PAGE)}, ${JSON.stringify(FINAL_PAGE)}]) {
  const p = existing(name);
  if (p && p.getPluginData(KEY) !== MARK) throw new Error('a page named ' + name + ' exists that this plan did not create: refusing to empty it');
}
const page = async (name) => {
  let p = existing(name);
  if (!p) { p = figma.createPage(); p.name = name; p.setPluginData(KEY, MARK); }
  await p.loadAsync();
  for (const c of [...p.children]) { try { c.locked = false; } catch (e) {} c.remove(); }
  return p;
};
const buttons = figma.root.children.find((x) => x.type === 'PAGE' && x.name === ${JSON.stringify(BUTTONS_PAGE)});
if (!buttons) throw new Error('no ${BUTTONS_PAGE} page: run file-setup and build-components button first');
await buttons.loadAsync();
const sets = buttons.findAllWithCriteria({ types: ['COMPONENT_SET'] });
const set = sets.find((s) => s.name.toLowerCase() === 'button') ?? sets[0];
if (!set) throw new Error('no component set on ${BUTTONS_PAGE}: run build-components button first');
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
const solid = (r, g, b) => [{ type: 'SOLID', color: { r, g, b } }];
const text = (chars, name) => { const t = figma.createText(); t.fontName = { family: 'Inter', style: 'Regular' }; t.characters = chars; t.name = name ?? chars; return t; };
const row = (f, dir, gap, pad) => {
  f.layoutMode = dir; f.itemSpacing = gap; f.paddingTop = f.paddingBottom = f.paddingLeft = f.paddingRight = pad;
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.counterAxisAlignItems = 'CENTER';
  return f;
};
const work = await page(${JSON.stringify(WORK_PAGE)});
const fin = await page(${JSON.stringify(FINAL_PAGE)});

const library = figma.createFrame(); library.name = 'Legacy library'; row(library, 'HORIZONTAL', 40, 24); work.appendChild(library);
const lb = figma.createComponent(); lb.name = ${JSON.stringify(LEGACY_BUTTON)}; row(lb, 'HORIZONTAL', 8, 12); lb.paddingLeft = lb.paddingRight = 20;
lb.fills = solid(0.1, 0.3, 0.9); lb.cornerRadius = 6;
const lbLabel = text('Shop now', 'Label'); lbLabel.fills = solid(1, 1, 1); lb.appendChild(lbLabel); library.appendChild(lb);
const lr = figma.createComponent(); lr.name = ${JSON.stringify(LEGACY_RATING)}; row(lr, 'HORIZONTAL', 4, 4);
lr.appendChild(text('Rated 4 of 5', 'Stars')); library.appendChild(lr);
library.x = 0; library.y = 0;

const promo = figma.createFrame(); promo.name = 'Promo row'; row(promo, 'HORIZONTAL', ${PLANTED_GAP}, 16); promo.fills = solid(1, 1, 1);
const promoText = text('Spring sale, 20% off'); promo.appendChild(promoText);
const legacyButton = lb.createInstance(); promo.appendChild(legacyButton);
const rating = lr.createInstance(); promo.appendChild(rating);
work.appendChild(promo); promo.x = 0; promo.y = 200;

const original = promo.clone(); original.name = 'Original · Promo row'; work.appendChild(original); original.x = 0; original.y = 320;

const hero = figma.createFrame(); hero.name = 'Hero'; row(hero, 'VERTICAL', 16, 24); hero.counterAxisAlignItems = 'MIN';
hero.appendChild(text('Welcome back'));
const heroButton = (set.defaultVariant ?? set.children[0]).createInstance(); hero.appendChild(heroButton);
if (heroButton.layoutMode && heroButton.layoutMode !== 'NONE') { heroButton.paddingLeft = heroButton.paddingLeft + 13; heroButton.paddingRight = heroButton.paddingRight + 13; }
work.appendChild(hero); hero.x = 0; hero.y = 440;

const note = text('Note: copy approved by the brand team', 'Note'); work.appendChild(note); note.x = 0; note.y = 640; note.locked = true;

const finalRow = promo.clone(); finalRow.name = 'Promo row'; fin.appendChild(finalRow); finalRow.x = 0; finalRow.y = 0;

return {
  plan: PLAN, workPage: work.id, finalPage: fin.id,
  legacyLibrary: library.id, legacyButtonMain: lb.id, ratingMain: lr.id,
  promoRow: promo.id, promoText: promoText.id, legacyButton: legacyButton.id, rating: rating.id,
  original: original.id, note: note.id, hero: hero.id, heroButton: heroButton.id, finalRow: finalRow.id,
  buttonsPage: buttons.id,
  buttonsParts: (${PARTS})(buttons, ${BUTTONS_DEPTH}, ${BUTTONS_PART_NODES}, ${INSPECT_DEPTH}),
  prism3Set: { name: set.name, key: set.key ?? null },
};
`.trim();

/**
 * The read the scorer needs that `inspect` does not give: the file's variables with their collections (R1, R2) and
 * their values per mode (the golden hash, and V6), and every instance's overridden fields on the plan's pages (R3).
 * Read only: it assigns nothing and calls no setter. A value that aliases another variable is written by that
 * variable's name, and a mode by its name, so the read carries no id.
 *
 * It also gives `buttonsAt` (#3470 review, finding 1): where each `↳ Buttons` part root sits in that page, as its
 * child-index path from the page (`''` for the page, `'0.5'` for the set's sixth child; null if it is no longer on the
 * page), in part order. `inspect` reads every id it is given as a top-level node, so the parts joined back say what
 * each part root holds but not where it sits: two variants or the set and its usage panel swapped read the same. The
 * paths carry no id, so they are stable across plants, and they go into the golden hash and V6 (`canonicalButtons`).
 */
export const readsProgram = (roles: Pick<Roles, 'workPage' | 'finalPage' | 'buttonsPage' | 'buttonsParts'>): string => `
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const colName = Object.fromEntries(cols.map((c) => [c.id, c.name]));
const modeName = Object.fromEntries(cols.flatMap((c) => c.modes.map((m) => [m.modeId, m.name])));
const vars = await figma.variables.getLocalVariablesAsync();
const varName = Object.fromEntries(vars.map((v) => [v.id, v.name]));
const val = (x) => (x && typeof x === 'object' && x.type === 'VARIABLE_ALIAS' ? { alias: varName[x.id] ?? null } : x);
const overrides = [];
for (const id of ${JSON.stringify([roles.workPage, roles.finalPage])}) {
  const p = await figma.getNodeByIdAsync(id);
  if (!p) continue;
  await p.loadAsync();
  for (const n of p.findAllWithCriteria({ types: ['INSTANCE'] })) {
    overrides.push({ id: n.id, overrides: (n.overrides ?? []).map((o) => ({ id: o.id, fields: [...o.overriddenFields] })) });
  }
}
const buttonsPage = await figma.getNodeByIdAsync(${JSON.stringify(roles.buttonsPage)});
if (buttonsPage) await buttonsPage.loadAsync();
const pathOf = (n) => (!n ? null : n.id === ${JSON.stringify(roles.buttonsPage)} ? [] : !n.parent ? null : ((up) => (up ? [...up, n.parent.children.indexOf(n)] : null))(pathOf(n.parent)));
const buttonsAt = await Promise.all(${JSON.stringify(roles.buttonsParts.flatMap((p) => p.ids))}.map(async (id) => { const at = pathOf(await figma.getNodeByIdAsync(id)); return at ? at.join('.') : null; }));
return {
  buttonsAt,
  variables: vars.map((v) => ({
    name: v.name, collection: colName[v.variableCollectionId] ?? null, type: v.resolvedType,
    values: Object.fromEntries(Object.entries(v.valuesByMode).map(([m, x]) => [modeName[m] ?? m, val(x)])),
  })),
  overrides,
};
`.trim();

export type Cmd = { key: string; cmd: string; args: Record<string, unknown> };

/**
 * Setup, once: a named version, then the scaffold, the house brand, Prism3's Button and the plant. `input` is the house
 * brand's BrandInput. The runner sends these only after the file-name and marker checks (`run-figma.ts`).
 */
export const setupCommands = (input: unknown): Cmd[] => [
  { key: 'version', cmd: 'run-code', args: { code: VERSION_PROGRAM, timeoutMs: 60_000 } },
  { key: 'file-setup', cmd: 'file-setup', args: {} },
  { key: 'apply-theme', cmd: 'apply-theme', args: { input } },
  { key: 'build-components', cmd: 'build-components', args: { def: 'button' } },
  { key: 'plant', cmd: 'run-code', args: { code: PLANT, timeoutMs: 120_000 } },
];
/** Reset, before every run: the plant again. */
export const resetCommands = (): Cmd[] => [{ key: 'plant', cmd: 'run-code', args: { code: PLANT, timeoutMs: 120_000 } }];

/** The key of the `i`th `↳ Buttons` part: the first keeps the one-part name. */
export const buttonsKey = (i: number): string => (i === 0 ? 'inspect-buttons' : `inspect-buttons-${i}`);

/** The read-only captures, before and after each run. Every one writes nothing. */
export const captureCommands = (roles: Roles): Cmd[] => [
  { key: 'inspect', cmd: 'inspect', args: { ids: [roles.workPage, roles.finalPage], depth: INSPECT_DEPTH, maxNodes: 2000 } },
  ...roles.buttonsParts.map((p, i) => ({ key: buttonsKey(i), cmd: 'inspect', args: { ids: p.ids, depth: p.depth, maxNodes: BUTTONS_PART_NODES } })),
  { key: 'audit', cmd: 'audit-frames', args: { ids: [roles.promoRow, roles.hero, roles.original, roles.finalRow], legacy: { components: [LEGACY_BUTTON, LEGACY_RATING] } } },
  ...SNAPSHOT_ROLES.map((r) => ({ key: `snapshot-${r}`, cmd: 'snapshot', args: { id: roles[r], scale: 1 } })),
  { key: 'component-keys', cmd: 'component-keys', args: { sets: true } },
  { key: 'reads', cmd: 'run-code', args: { code: readsProgram(roles), timeoutMs: 60_000 } },
];

/* ── the golden hash ────────────────────────────────────────────────────────────────────────────────── */

type InspectNode = { id: string; parentId: string | null; mainComponent?: { key?: unknown } | null; [k: string]: unknown };

/**
 * An `inspect` result with every id replaced by its position in the tree (`0`, `0.2`, `0.2.1`) and every component key
 * dropped: a reset makes new ids and new local component keys, and the hash must not see them. Anything else that moves
 * (a name, a size, a binding, a lock) changes the hash.
 */
export const canonicalInspect = (data: { nodes?: InspectNode[] } | undefined): unknown[] => {
  const nodes = data?.nodes ?? [];
  const path = new Map<string, string>();
  const kids = new Map<string | null, number>();
  return nodes.map((n) => {
    const at = kids.get(n.parentId) ?? 0;
    kids.set(n.parentId, at + 1);
    const p = n.parentId === null || !path.has(n.parentId) ? `${at}` : `${path.get(n.parentId)}.${at}`;
    path.set(n.id, p);
    const { id: _id, parentId: _parent, mainComponent, ...rest } = n;
    const mc = mainComponent && typeof mainComponent === 'object' ? (({ key: _k, ...m }) => m)(mainComponent as Record<string, unknown>) : mainComponent ?? null;
    // A binding names a variable, never an id; an id would be one the reset does not control, and is kept as it is.
    return { at: p, ...rest, mainComponent: mc };
  });
};
export const inspectHash = (data: { nodes?: InspectNode[] } | undefined): string =>
  createHash('sha256').update(JSON.stringify(canonicalInspect(data))).digest('hex');

type Envelope = { ok?: boolean; result?: { data?: any } } | null | undefined;
const dataOf = (e: Envelope) => (e && e.ok !== false ? e.result?.data : undefined);
/**
 * The `↳ Buttons` parts joined back into one `inspect` result, in part order. A part that is missing or was refused
 * makes the whole read missing (it is not a smaller page), and a part the plugin cut short says `truncated`.
 */
export const buttonsInspect = (c: Record<string, Envelope> | undefined): { nodes: InspectNode[]; truncated: boolean } | undefined => {
  const parts: any[] = [];
  for (let i = 0; c && buttonsKey(i) in c; i++) parts.push(dataOf(c[buttonsKey(i)]));
  if (!parts.length || parts.some((d) => !d)) return undefined;
  return { nodes: parts.flatMap((d) => d.nodes ?? []), truncated: parts.some((d) => d.truncated === true) };
};
/**
 * The `↳ Buttons` page as the golden hash and V6 compare it: the parts joined back, canonical, and where each part root
 * sits in the page (`buttonsAt`, from the `reads` program). The positions are what make a reorder visible: `inspect`
 * reads each part root as a top-level node, so without them a reordered page reads the same.
 */
export const canonicalButtons = (c: Record<string, Envelope> | undefined): unknown => ({
  nodes: canonicalInspect(buttonsInspect(c)),
  at: dataOf(c?.reads)?.value?.buttonsAt ?? null,
});
/** The file's variables as the golden hash and V6 compare them: by name, each with its collection, type and values. */
export const canonicalVariables = (reads: Envelope): unknown[] =>
  [...((dataOf(reads)?.value?.variables ?? []) as { name: string }[])].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
/** `component-keys` as compared: by name, with the plant's own `Legacy/…` keys dropped (a reset makes new ones). */
export const canonicalComponents = (keys: Envelope): unknown[] =>
  [...((dataOf(keys)?.components ?? []) as { name: string; key?: unknown }[])]
    .map((c) => (c.name.startsWith('Legacy/') ? (({ key: _k, ...rest }) => rest)(c) : c))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

/**
 * THE GOLDEN HASH (review S3): what a run must start from, not only the two plan pages. It covers the plan pages'
 * `inspect`, the `↳ Buttons` page's `inspect`, every variable with its values per mode, and `component-keys`. The reset
 * replants only the plan pages, so a run that adds or edits a variable or edits the Button set leaves that in the file,
 * and the next run's baseline no longer hashes to the golden one: that run is void, and the job stops (`figma.md`).
 */
export const goldenHash = (c: Record<string, Envelope> | undefined): string =>
  createHash('sha256').update(JSON.stringify({
    inspect: canonicalInspect(dataOf(c?.inspect)),
    buttons: canonicalButtons(c),
    variables: canonicalVariables(c?.reads),
    components: canonicalComponents(c?.['component-keys']),
  })).digest('hex');
