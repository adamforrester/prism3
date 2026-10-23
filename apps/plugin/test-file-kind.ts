/**
 * FILE KIND test (#2879; the owner's Q485 C and Q613 A): which file the plugin opened in, a brand file, a library file or
 * a new one, read from the document by `src/file-kind.ts`.
 *
 *   npx tsx apps/plugin/test-file-kind.ts
 *
 * ONE CASE PER ROW of the wireframe's decision table, each built as a FILE (never as a signals object), run through the
 * real probe and the real classifier. The local collections come from `file-shim.ts`, the host every offline suite
 * shares, stamped by the plugin's own `stampOwnedModes`, which is how a real apply marks them. The shim models no pages
 * or remote nodes, so the current page and the library side (remote mains, remote variables and their collections) are
 * built here, as small objects with the fields the plugin typings give those nodes.
 *
 * INDEPENDENCE (docs/34): EXPECTED is a literal per case, the kind a designer would name for that file. Nothing is read
 * from the classifier or the probe to decide what a case should say. The stamps a library carries are written as
 * literals too (`0.237.0|…|…`), never minted by `memberStamp`, so the probe's reading of a stamp is checked against what a
 * stamp looks like, not against the function that writes one.
 *
 * BY-NAME MUTATIONS (each proven red, then restored):
 *   - drop "local beats remote" in `classifyFile` (move the `localPrism3` row below the library rows) →
 *     "file-kind: local collections + library instances → brand (got library)" fails;
 *   - count an unstamped remote instance as Prism3's → "file-kind: another library's instances only → undecided" fails.
 */
import { FileShim } from './file-shim';
import { stampOwnedModes } from './src/write-figma';
import { classifyFile, probeFile, type FileKind, type FileKindApi, type PageNode, type LibraryCollection } from './src/file-kind';

let failures = 0;
const ok = (cond: boolean, label: string): void => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
};

/** A Prism3 build stamp as a published Prism3 component carries it: `ENGINE_VERSION|plan|revision`. */
const STAMP = (v: string): string => `${v}|0123456789abcdef|7`;
const shared = (data: Record<string, string>) => ({ getSharedPluginData: (ns: string, k: string) => (ns === 'prism3' ? data[k] ?? '' : '') });

/** The library side of a file: remote mains, remote variables and their collections. */
const prism3Main = (v: string) => ({ remote: true, ...shared({ memberStamp: STAMP(v) }) });
const otherMain = () => ({ remote: true, ...shared({}) });
const localMain = () => ({ remote: false, ...shared({}) });
const instance = (main: unknown): PageNode => ({ type: 'INSTANCE', getMainComponentAsync: async () => main as never });
const frame = (children: PageNode[], boundVariables?: Record<string, unknown>): PageNode => ({ type: 'FRAME', children, boundVariables });
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

type Remote = { vars: Record<string, { remote: boolean; variableCollectionId: string }>; collections: Record<string, { remote: boolean; key: string; getSharedPluginData: (ns: string, k: string) => string }> };
/** A library with one Prism3 collection (stamped) and one other library's collection (not). */
const REMOTE: Remote = {
  vars: {
    'VariableID:p3': { remote: true, variableCollectionId: 'C:p3' },
    'VariableID:other': { remote: true, variableCollectionId: 'C:other' },
  },
  collections: {
    'C:p3': { remote: true, key: 'key-p3', ...shared({ 'modes:owned': JSON.stringify(['1:0', '1:1']) }) },
    'C:other': { remote: true, key: 'key-other', ...shared({}) },
  },
};
const LIBRARIES: LibraryCollection[] = [{ key: 'key-p3', libraryName: 'Product Library' }, { key: 'key-other', libraryName: 'Old Kit' }];

/** A file: its local collections (a FileShim, `stamped` running `stampOwnedModes` on one of them) and its current page. */
const file = (o: { local?: 'none' | 'plain' | 'stamped'; page: PageNode[]; clock?: () => number; throws?: boolean; libraries?: LibraryCollection[] | 'refused' }): FileKindApi => {
  const shim = new FileShim();
  if (o.local && o.local !== 'none') {
    const c = shim.createVariableCollection('color');
    if (o.local === 'stamped') stampOwnedModes(c, [c.modes[0].modeId]);
  }
  return {
    getLocalVariableCollectionsAsync: () => shim.getLocalVariableCollectionsAsync(),
    page: { children: o.page },
    getVariableByIdAsync: async (id) => { if (o.throws) throw new Error('read failed'); return REMOTE.vars[id] ?? null; },
    getVariableCollectionByIdAsync: async (id) => REMOTE.collections[id] ?? null,
    libraryCollections: async () => { if (o.libraries === 'refused') throw new Error('permission'); return o.libraries ?? LIBRARIES; },
    now: o.clock ?? (() => 0),
  };
};

const kindOf = async (api: FileKindApi): Promise<FileKind> => classifyFile(await probeFile(api));
const cases: [string, FileKindApi, FileKind][] = [
  // Row 3: local Prism3 collections. Library use is ignored: the file has tokens of its own.
  ['local collections + library instances → brand', file({ local: 'stamped', page: [instance(prism3Main('0.237.0'))] }), 'brand'],
  ['local collections, nothing on the page → brand', file({ local: 'stamped', page: [] }), 'brand'],
  // Row 4: confirmed Prism3 use, by instances or by bindings.
  ['Prism3 library instances → library', file({ page: [frame([instance(prism3Main('0.237.0')), instance(prism3Main('0.237.0'))])] }), 'library'],
  ['Prism3 library bindings → library', file({ page: [frame([], { fills: [alias('VariableID:p3')] })] }), 'library'],
  // A local collection without Prism3's stamp is a designer's own, not a brand file.
  ['an unstamped local collection + Prism3 instances → library', file({ local: 'plain', page: [instance(prism3Main('0.237.0'))] }), 'library'],
  // Row 5: another library in use too.
  ['Prism3 instances + another library\'s bindings → library', file({ page: [instance(prism3Main('0.236.0')), frame([], { fills: [alias('VariableID:other')] })] }), 'library'],
  // Row 7: remote use whose identity no stamp confirms.
  ['another library\'s instances only → undecided', file({ page: [instance(otherMain()), instance(otherMain())] }), 'undecided'],
  // Rows 8 and 9.
  ['local instances only → new', file({ page: [instance(localMain())] }), 'new'],
  ['an empty page → new', file({ page: [] }), 'new'],
  ['plain frames, no bindings → new', file({ page: [frame([frame([])])] }), 'new'],
  // Row 10: failed, or past the budget.
  ['a read that throws → undecided', file({ page: [frame([], { fills: [alias('VariableID:p3')] })], throws: true }), 'undecided'],
];
for (const [name, api, want] of cases) {
  const got = await kindOf(api);
  ok(got === want, `file-kind: ${name}${got === want ? '' : ` (got ${got})`}`);
}

// Row 10, the budget: a clock that passes 1.5 s between two reads stops the walk, and the answer is undecided, never a
// guess from what was read so far.
{
  let t = 0;
  const api = file({ page: [instance(prism3Main('0.237.0')), instance(prism3Main('0.237.0'))], clock: () => (t += 1000) });
  const s = await probeFile(api);
  ok(s.stopped === 'timeout' && classifyFile(s) === 'undecided', `file-kind: a check past 1.5 s → undecided (stopped ${s.stopped}, kind ${classifyFile(s)})`);
}
// The hard stop: a read that never returns cannot hold the start moment past the budget.
{
  const api = file({ page: [{ type: 'INSTANCE', getMainComponentAsync: () => new Promise(() => {}) }] });
  const s = await probeFile({ ...api, after: () => Promise.resolve() }, 1500);
  ok(s.stopped === 'timeout' && classifyFile(s) === 'undecided', `file-kind: a read that never returns stops at the budget → undecided (stopped ${s.stopped})`);
}

// What the library home states: counts of THIS page, the versions in order, and the library's name from the enabled list.
{
  const s = await probeFile(file({ page: [
    instance(prism3Main('0.237.0')), instance(prism3Main('0.231.0')), instance(prism3Main('0.237.0')), instance(otherMain()),
    frame([frame([], { fills: [alias('VariableID:p3'), alias('VariableID:p3')], itemSpacing: alias('VariableID:p3') })], { fills: [alias('VariableID:other')] }),
  ] }));
  ok(s.prism3Instances === 3, `file-kind: counts the 3 Prism3 instances on the page (got ${s.prism3Instances})`);
  ok(s.prism3Bindings === 3, `file-kind: counts 3 Prism3 bindings, one per alias, list fields included (got ${s.prism3Bindings})`);
  ok(s.otherRemote === 2, `file-kind: counts 2 remote uses no Prism3 stamp confirms (got ${s.otherRemote})`);
  ok(JSON.stringify(s.versions) === '["0.231.0","0.237.0"]', `file-kind: the build versions, ascending and unique (got ${JSON.stringify(s.versions)})`);
  ok(s.libraryName === 'Product Library', `file-kind: the name is the enabled library whose collection carries the stamp (got ${JSON.stringify(s.libraryName)})`);
}
// An instance's own layers are the library's: a binding inside one is not counted as this file's.
{
  const inner: PageNode = { type: 'INSTANCE', getMainComponentAsync: async () => prism3Main('0.237.0') as never, children: [frame([], { fills: [alias('VariableID:p3')] })] };
  const s = await probeFile(file({ page: [inner] }));
  ok(s.prism3Instances === 1 && s.prism3Bindings === 0, `file-kind: a remote instance counts once and its layers are not walked (instances ${s.prism3Instances}, bindings ${s.prism3Bindings})`);
}
// No name without the permission, and the decision does not move.
{
  const s = await probeFile(file({ page: [frame([], { fills: [alias('VariableID:p3')] })], libraries: 'refused' }));
  ok(s.libraryName === null && classifyFile(s) === 'library', `file-kind: a refused team-library read costs the name, not the decision (name ${JSON.stringify(s.libraryName)}, kind ${classifyFile(s)})`);
}
// A stamp that is not a build stamp (another plugin wrote the key) confirms nothing.
{
  const forged = { remote: true, ...shared({ memberStamp: 'hello' }) };
  const s = await probeFile(file({ page: [instance(forged)] }));
  ok(classifyFile(s) === 'undecided', `file-kind: a memberStamp that is not ENGINE_VERSION|plan|revision confirms nothing → undecided (got ${classifyFile(s)})`);
}

console.log(failures ? `\n${failures} failure(s)` : '\nfile-kind: all checks pass');
if (failures > 0) process.exit(1);
