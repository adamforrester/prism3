/**
 * The consistency audit for rebuilt spec pages (#2886, owner Q506 A), run the way an agent runs it.
 *
 *   npx tsx apps/plugin/test-consistency-audit.ts
 *
 * `skills/prism3-rebind/consistency-audit.js` is the body of an async function that an agent sends to the dev
 * agent link's `run-code`. This suite sends it through the real `runCode` (`src/dev-commands.ts`), with a mock node
 * tree installed as the global `figma`: three pages, each at desktop and mobile, built here as plain objects.
 *
 * INDEPENDENCE (docs/34): the fixture and every expected finding are written here, by hand. The audit derives
 * nothing from this file; the actual side is the JSON the audit returns. A CONSISTENT set must come back with no
 * finding from any check, and a DRIFTED copy of it, with one seeded drift per check, must come back with exactly the
 * findings written below.
 *
 * READ-ONLY. Every node is a Proxy that records a property write after the fixture is built, and the nodes carry no
 * setter methods (a call to one throws). The suite fails if the audit writes anything.
 *
 * Mutations this fails by name (each check disabled in turn, by an early return in its function):
 *   checkControlLabels → `drift/1 control label`; checkPairing → `drift/2 pairing`;
 *   checkPageToPage → `drift/3 component` and `drift/3 spacing`; checkBindings → `drift/4 raw fill`,
 *   `drift/4 legacy variable`, `drift/4 legacy style inside an instance` and `drift/4 raw run`. Also: the heading
 *   allowlist dropped → `consistent/1`; the copy-number rule widened to any number → `consistent/3`; a frame renamed by
 *   the audit → `the audit wrote nothing to the file`; the page load dropped → `the page is loaded before it is read`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCode } from './src/dev-commands';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const section = (s: string): void => console.log(`\n${s}`);

const here = dirname(fileURLToPath(import.meta.url));
const AUDIT = readFileSync(resolve(here, '../../skills/prism3-rebind/consistency-audit.js'), 'utf8');

// ---- the file: variables, styles, components ----------------------------------------------------------------------
const collections: Record<string, any> = {
  'col:lib': { id: 'col:lib', key: 'key-col-lib', name: 'color', remote: false },
  'col:old': { id: 'col:old', key: 'key-col-old', name: 'Old palette', remote: true },
};
const variables: Record<string, any> = {
  'var:surface': { id: 'var:surface', name: 'background/primary', remote: false, variableCollectionId: 'col:lib' },
  'var:ink': { id: 'var:ink', name: 'text/primary', remote: false, variableCollectionId: 'col:lib' },
  'var:old': { id: 'var:old', name: 'gray-90', remote: true, variableCollectionId: 'col:old' },
};
const styles: Record<string, any> = {
  's:hd-lg': { id: 's:hd-lg', key: 'key-hd-lg', name: 'type/heading/lg', type: 'TEXT', remote: false },
  's:hd-md': { id: 's:hd-md', key: 'key-hd-md', name: 'type/heading/md', type: 'TEXT', remote: false },
  's:body-md': { id: 's:body-md', key: 'key-body-md', name: 'type/body/md', type: 'TEXT', remote: false },
  's:body-sm': { id: 's:body-sm', key: 'key-body-sm', name: 'type/body/sm', type: 'TEXT', remote: false },
  's:old-ink': { id: 's:old-ink', key: 'key-old-ink', name: 'Old/Ink', type: 'PAINT', remote: true },
};
const buttonSet = { type: 'COMPONENT_SET', name: 'button' };
const mains: Record<string, any> = {
  'button-md': { name: 'Size=md', key: 'key-button-md', parent: buttonSet },
  'button-lg': { name: 'Size=lg', key: 'key-button-lg', parent: buttonSet },
  link: { name: 'link', key: 'key-link', parent: { type: 'PAGE', name: 'Components' } },
};

// ---- nodes: plain objects behind a write-recording Proxy -------------------------------------------------------------
const byId = new Map<string, any>();
const loads: string[] = [];
const writes: string[] = [];
let armed = false;
let seq = 0;
const node = (raw: Record<string, any>): any => {
  raw.id ??= `n:${++seq}`;
  raw.visible ??= true;
  const p = new Proxy(raw, {
    set(t, k, v) { if (armed) writes.push(`${t.name}.${String(k)}`); t[k as string] = v; return true; },
    deleteProperty(t, k) { if (armed) writes.push(`delete ${t.name}.${String(k)}`); delete t[k as string]; return true; },
  });
  byId.set(raw.id, p);
  for (const c of raw.children ?? []) c.parent = p;
  return p;
};
const bound = (id: string) => ({ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id } } });
const raw = (r: number, g: number, b: number) => ({ type: 'SOLID', visible: true, color: { r, g, b } });
/** Fields `getStyledTextSegments` accepts, from the plugin typings (`StyledTextSegment`). A field outside them
 *  throws in Figma, so it throws here too. */
const SEGMENT_FIELDS = new Set(['fontSize', 'fontName', 'fontWeight', 'textDecoration', 'textCase', 'lineHeight', 'letterSpacing',
  'fills', 'textStyleId', 'fillStyleId', 'listOptions', 'indentation', 'hyperlink', 'boundVariables']);
const MIXED = Symbol('mixed');
const text = (name: string, characters: string, textStyleId: string, extra: Record<string, any> = {}): any => {
  const fills = extra.fills ?? [bound('var:ink')];
  const fillStyleId = extra.fillStyleId ?? '';
  const runs: any[] = extra.runs ?? [{ fills }];
  delete extra.runs;
  return node({
    type: 'TEXT', name, characters, textStyleId, fontSize: 16, fills, fillStyleId, x: 0, y: 0, width: 100, height: 20, ...extra,
    getStyledTextSegments: (fields: string[]) => {
      for (const f of fields) if (!SEGMENT_FIELDS.has(f)) throw new Error(`getStyledTextSegments: unknown field ${f}`);
      return runs.map((r) => ({ characters, textStyleId, fillStyleId, boundVariables: {}, fills: r.fills }));
    },
  });
};
const instance = (name: string, main: string, label: string, labelExtra: Record<string, any> = {}): any => {
  const n = node({
    type: 'INSTANCE', name, x: 0, y: 0, width: 120, height: 44, fills: [],
    children: [text('Label', label, 's:body-md', labelExtra)],
  });
  (n as any).getMainComponentAsync = async () => mains[main];
  return n;
};

type PageOpts = { autoHeading?: boolean; extras?: boolean; rawRun?: boolean; gap?: number; priceStyle?: string; filter?: 'button-md' | 'button-lg' | 'text'; divider?: 'bound' | 'raw'; legacyVar?: boolean; legacyInside?: boolean };
const frame = (name: string, width: number, bp: 'desktop' | 'mobile', heading: string, o: PageOpts = {}): any => {
  const children: any[] = [
    instance('Nav link', 'link', heading),
    text('Page heading', heading, bp === 'desktop' ? 's:hd-lg' : 's:hd-md'),
    text('Price', '$55.99', o.priceStyle ?? (bp === 'desktop' ? 's:body-md' : 's:body-sm'),
      o.legacyVar ? { fills: [bound('var:old')] } : {}),
    o.filter === 'text'
      ? text('Filter trigger', 'Filter & sort', 's:body-md')
      : instance('Filter button', o.filter ?? 'button-md', 'Filter & sort', o.legacyInside ? { fillStyleId: 's:old-ink' } : {}),
    node({ type: 'RECTANGLE', name: 'Divider', x: 0, y: 0, width, height: 1, fills: [o.divider === 'raw' ? raw(0.9, 0.9, 0.9) : bound('var:surface')] }),
    // Mixed fills: the paints live on the runs. One run is raw on the drifted Account / Desktop.
    text('Promo', 'Free returns', 's:body-md', { fills: MIXED, runs: [{ fills: [bound('var:ink')] }, { fills: [o.rawRun ? raw(0.8, 0, 0) : bound('var:surface')] }] }),
  ];
  // Layers no designer named, and numbered names, that must not be compared as one role: on the consistent
  // desktop pages each would differ from the other page if the audit read it as a role.
  if (o.extras) children.push(
    text('Text 2', 'Note', heading === 'Wishlist' ? 's:body-md' : 's:hd-lg'),
    text(heading === 'Wishlist' ? 'Heading 1' : 'Heading 2', 'Section', heading === 'Wishlist' ? 's:hd-lg' : 's:body-md'),
  );
  // A heading layer Figma named after its own text has no role; the allowlist still skips it by its style.
  if (o.autoHeading) children[1].name = heading;
  return node({ type: 'FRAME', name, width, height: 900, x: 0, y: 0, layoutMode: 'VERTICAL', itemSpacing: o.gap ?? 24, fills: [bound('var:surface')], children });
};

/** Three pages at two breakpoints. `Account` (mobile) is named without a breakpoint word, so its width decides. */
const build = (drift: boolean): { pageId: string; frames: any[] } => {
  const frames = [
    frame('Wishlist / Desktop', 1440, 'desktop', 'Wishlist', drift ? {} : { extras: true }),
    frame('Wishlist / Mobile', 375, 'mobile', 'Wishlist'),
    frame('Cart / Desktop', 1440, 'desktop', 'Cart', drift ? { filter: 'button-lg', gap: 32 } : { extras: true }),
    frame('Cart / Mobile', 375, 'mobile', 'Cart', drift ? { filter: 'text', priceStyle: 's:body-md' } : {}),
    frame('Account / Desktop', 1440, 'desktop', 'Account', drift ? { divider: 'raw', legacyVar: true, legacyInside: true, rawRun: true } : {}),
    frame('Account', 375, 'mobile', 'Account', { autoHeading: true }),
  ];
  // The last two sit inside a section, which the page walk must enter.
  const sectionNode = node({ type: 'SECTION', name: 'Account', children: frames.slice(4) });
  const page = node({ type: 'PAGE', name: drift ? 'Drifted set' : 'Consistent set', children: [...frames.slice(0, 4), sectionNode] });
  page.loadAsync = async () => { loads.push(page.name); };
  return { pageId: page.id, frames };
};
const consistent = build(false);
const drifted = build(true);

(globalThis as any).figma = {
  currentPage: byId.get(consistent.pageId),
  getNodeByIdAsync: async (id: string) => byId.get(id) ?? null,
  getStyleByIdAsync: async (id: string) => styles[id] ?? null,
  variables: {
    getVariableByIdAsync: async (id: string) => variables[id] ?? null,
    getVariableCollectionByIdAsync: async (id: string) => collections[id] ?? null,
  },
};
armed = true;

const audit = async (auditInput: Record<string, unknown>): Promise<any> => {
  let out: any;
  await runCode({ code: `const auditInput = ${JSON.stringify(auditInput)};\n${AUDIT}`, timeoutMs: 10_000 }, (d) => { out = d; });
  return out.value;
};
const of = (r: any, check: number) => r.findings.filter((f: any) => f.check === check);
const show = (fs: any[]) => JSON.stringify(fs.map((f) => `${f.frame} · ${f.role} · ${f.expected} → ${f.actual}`));

// ---- the consistent set -----------------------------------------------------------------------------------------------
section('consistent set — every check stays quiet');
{
  const r = await audit({ pageId: consistent.pageId, run: 1, label: 'Fixture set' });
  ok(r.frames.length === 6, `the page walk finds all six frames, including the two inside a section (${r.frames.length})`);
  const acct = r.frames.find((f: any) => f.name === 'Account');
  ok(acct?.breakpoint === 'mobile' && acct?.classifiedBy === 'width 375' && acct?.page === 'account',
    `a frame named without a breakpoint word is classified by width, and pairs with its desktop page (${JSON.stringify(acct)})`);
  const wd = r.frames.find((f: any) => f.name === 'Wishlist / Desktop');
  ok(wd?.breakpoint === 'desktop' && wd?.classifiedBy === 'name' && wd?.page === 'wishlist',
    `a frame named with a breakpoint word is classified by its name (${JSON.stringify(wd)})`);
  ok(loads.includes('Consistent set'), `the page is loaded before it is read (${JSON.stringify(loads)})`);
  ok(r.coverage.textsWithoutRole === 3, `default-named layers and an auto-named heading have no role, and are counted (${r.coverage.textsWithoutRole})`);
  for (const c of [1, 2, 3, 4]) ok(of(r, c).length === 0, `consistent/${c}: check ${c} reports nothing (${show(of(r, c))})`);
  ok(r.coverage.controls === 12 && r.coverage.instances === 12, `the walk reads every instance and counts each as a control (${r.coverage.instances}, ${r.coverage.controls})`);
  ok(/^\| 1 \| \d{4}-\d{2}-\d{2} \| Fixture set \| 6 \| 0 \(1: 0, 2: 0, 3: 0, 4: 0\) \| \? \| \? \| \? \|$/.test(r.runsRow),
    `the Runs row carries the run number, date, set, frame count and findings per check (${r.runsRow})`);
  ok(r.table.startsWith('| # | Check | Frame | Node | Role | Expected | Actual | Detail |'), 'the findings table has its header row');

  // The heading allowlist: 'Wishlist' as the page heading repeats the nav link's label and is allowed by default.
  const strict = await audit({ pageId: consistent.pageId, allow: { roles: [] } });
  ok(of(strict, 1).length === 6 && of(strict, 1).every((f: any) => ['page heading', ''].includes(f.role)),
    `allowlist: with no allowed roles, each page heading that repeats a nav link is reported (${show(of(strict, 1))})`);
  const byText = await audit({ pageId: consistent.pageId, allow: { roles: [], texts: ['Wishlist', 'Cart', 'Account'] } });
  ok(of(byText, 1).length === 0, `allowlist: an allowed text is not reported (${show(of(byText, 1))})`);

  // The library path: the same set, matched by key and by name instead of as local.
  const byKey = await audit({ pageId: consistent.pageId, library: { collectionKeys: ['key-col-lib'], styleKeys: ['key-hd-lg', 'key-hd-md', 'key-body-md', 'key-body-sm'] } });
  ok(of(byKey, 4).length === 0, `library by key: the library's collection and style keys match (${show(of(byKey, 4))})`);
  const byName = await audit({ pageId: consistent.pageId, library: { collectionPattern: '^color$', stylePattern: '^type/' } });
  ok(of(byName, 4).length === 0, `library by name: the collection and style name patterns match (${show(of(byName, 4))})`);
  const wrongLib = await audit({ pageId: consistent.pageId, library: { collectionKeys: ['key-other'] } });
  ok(of(wrongLib, 4).length > 0, `library by key: a key list that is not this library's reports the bindings (${of(wrongLib, 4).length})`);

  loads.length = 0;
  const subset = await audit({ frameIds: drifted.frames.slice(0, 2).map((f) => f.id) });
  ok(subset.frames.length === 2 && subset.findings.length === 0, `frameIds: exactly the listed frames are read (${subset.frames.length})`);
  ok(JSON.stringify(loads) === JSON.stringify(['Drifted set', 'Drifted set']), `frameIds: each frame's page is loaded before it is read (${JSON.stringify(loads)})`);
}

// ---- the drifted set -----------------------------------------------------------------------------------------------
section('drifted set — each seeded drift is reported, by the check that owns it');
{
  const r = await audit({ pageId: drifted.pageId });
  const c1 = of(r, 1);
  ok(c1.length === 1 && c1[0].frame === 'Cart / Mobile' && c1[0].node === 'Filter trigger' && c1[0].expected === 'button instance' && c1[0].actual === 'plain text',
    `drift/1 control label: "Filter & sort" drawn as plain text on Cart / Mobile is reported, once (${show(c1)})`);
  const c2 = of(r, 2);
  ok(c2.length === 1 && c2[0].role === 'price' && c2[0].frame === 'Cart / Mobile'
    && c2[0].expected === 'type/body/md → type/body/sm' && c2[0].actual === 'type/body/md → type/body/md',
    `drift/2 pairing: the price's desktop → mobile pair on Cart differs from the other pages (${show(c2)})`);
  const c3 = of(r, 3);
  const comp = c3.filter((f: any) => f.detail.includes('component'));
  ok(comp.length === 1 && comp[0].frame === 'Cart / Desktop' && comp[0].role === 'filter button'
    && comp[0].expected === 'button (Size=md)' && comp[0].actual === 'button (Size=lg)',
    `drift/3 component: the filter button's variant on Cart / Desktop differs (${show(comp)})`);
  const gap = c3.filter((f: any) => f.detail.includes('spacing'));
  ok(gap.length === 6 && gap.every((f: any) => f.frame === 'Cart / Desktop' && f.expected === 'gap 24' && f.actual === 'gap 32'),
    `drift/3 spacing: every element on Cart / Desktop sits at gap 32 where the other pages use 24 (${show(gap)})`);
  const style = c3.filter((f: any) => f.detail.includes('text style'));
  ok(style.length === 1 && style[0].role === 'price' && style[0].frame === 'Cart / Mobile' && style[0].actual === 'type/body/md',
    `drift/3 text style: the mobile price's style on Cart differs (${show(style)})`);
  const c4 = of(r, 4);
  ok(c4.some((f: any) => f.frame === 'Account / Desktop' && f.role === 'divider' && f.actual === 'raw #e6e6e6'),
    `drift/4 raw fill: the divider's raw fill on Account / Desktop is reported (${show(c4)})`);
  ok(c4.some((f: any) => f.role === 'price' && f.actual === 'remote collection Old palette' && f.detail.includes('"gray-90"')),
    `drift/4 legacy variable: the price bound to a remote, non-library variable is reported (${show(c4)})`);
  ok(c4.some((f: any) => f.node === 'Label' && f.actual === 'remote paint style' && f.detail.includes('inside an instance')),
    `drift/4 legacy style inside an instance: a remote paint style on a button's label is reported (${show(c4)})`);
  ok(c4.some((f: any) => f.role === 'promo' && f.actual === 'raw #cc0000'),
    `drift/4 raw run: a raw color on one run of a text with mixed fills is reported (${show(c4)})`);
  ok(c4.length === 4, `drift/4: nothing else is reported by the binding check (${show(c4)})`);
  ok(r.findings.length === 1 + 1 + 8 + 4 && /\| 14 \(1: 1, 2: 1, 3: 8, 4: 4\) \|/.test(r.runsRow),
    `the Runs row counts the fourteen findings by check (${r.runsRow})`);
}

section('read-only');
ok(writes.length === 0, `the audit wrote nothing to the file (${JSON.stringify(writes)})`);

console.log(`\n${executed - failed}/${executed} consistency-audit assertions passed.`);
if (failed) process.exit(1);
process.exit(0);
