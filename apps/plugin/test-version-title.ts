/**
 * THE NAMED VERSION EVERY COMMAND SAVES (#2828, owner decision Q442 A) — through the in-memory shims.
 *
 *   npx tsx apps/plugin/test-version-title.ts
 *
 *   text/…       the title and description for each case the owner's table lists, written out here by hand.
 *                Mutation: any word of `versionOf` changed → the case's `text/` line.
 *   theme/…      Apply Theme saves exactly one version, with the exact text, before the first variable or style is
 *                written; a pre-flight refusal saves none; a host that refuses leaves the file empty.
 *                Mutation: the save moved after the write → `theme/before first write`.
 *   build/…      Build saves one version before it writes, naming the sets it adds (the def and the missing sets it
 *                nests). Mutation: the dependency walk dropped → `build/sets`.
 *   bypass/…     no call to `saveVersionHistoryAsync` in the plugin's source but the builder's, and each of the four
 *                commands reaches the builder. Mutation: a direct `host.saveVersionHistoryAsync(title)` in any file
 *                under src/ → `bypass/no second caller`; a command's call to the builder removed → `bypass/<command>`.
 *
 * The update and style-guide commands are checked beside their own suites (`version/…` in test-update-apply.ts,
 * section 40 in test-style-guide.ts), which hold the shims they need.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { figmaAnatomySet } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import type { BrandInput } from '@prism3/engine/theme';
import { FileShim } from './file-shim';
import { makeShim } from './component-shim';
import { runApplyTheme, themePlans } from './src/apply-theme';
import { saveBeforeBuild, saveVersion, versionOf } from './src/version-title';
import { brandFromDesignMd } from './mcp-paste';

let failures = 0;
const ok = (cond: boolean, label: string): void => {
  if (!cond) failures++;
  console.log(`  ${cond ? '✓' : '✗'} ${label}`);
};
const E = `Engine ${ENGINE_VERSION}.`;
const names = (...ids: string[]) => ids.map((set) => ({ set }));

console.log('1. the text, by case (the owner table, Q442 A)');
{
  const many = ['icon', 'focus-ring', 'button'];
  const cases: [string, ReturnType<typeof versionOf>, string, string][] = [
    ['update, 3 sets', versionOf({ run: 'update', sets: names(...many) }), 'Saved before Prism3 updated 3 sets', `${E} Sets: icon, focus-ring, button (3).`],
    ['update, 1 set', versionOf({ run: 'update', sets: [{ set: 'dialog', name: 'Dialog' }] }), 'Saved before Prism3 updated Dialog', E],
    ['update, sets and page order', versionOf({ run: 'update', sets: names('a', 'b'), pageOrder: true }), 'Saved before Prism3 updated 2 sets', `${E} Sets: a, b (2). Page order.`],
    ['update, sets, page order, About frame and cover', versionOf({ run: 'update', sets: names('a', 'b'), pageOrder: true, about: true, cover: true }), 'Saved before Prism3 updated 2 sets', `${E} Sets: a, b (2). Page order. About frame. Cover.`],
    ['update, one set and the cover', versionOf({ run: 'update', sets: [{ set: 'dialog', name: 'Dialog' }], cover: true }), 'Saved before Prism3 updated Dialog', `${E} Cover.`],
    ['update, page order alone', versionOf({ run: 'update', sets: [], pageOrder: true }), 'Saved before Prism3 updated the page order', E],
    ['build, 1 set', versionOf({ run: 'build', sets: [{ set: 'pagination', name: 'Pagination' }] }), 'Saved before Prism3 added Pagination', E],
    ['build, 6 sets', versionOf({ run: 'build', sets: names('a', 'b', 'c', 'd', 'e', 'f') }), 'Saved before Prism3 added 6 sets', `${E} Sets: a, b, c, d, e, f (6).`],
    ['style guide', versionOf({ run: 'style-guide', tables: 42 }), 'Saved before Prism3 drew style guides', `${E} 42 tables.`],
    ['style guide, 1 table', versionOf({ run: 'style-guide', tables: 1 }), 'Saved before Prism3 drew style guides', `${E} 1 table.`],
    ['apply theme', versionOf({ run: 'apply-theme' }), 'Saved before Prism3 applied the theme', `${E} Variables and styles.`],
  ];
  for (const [label, got, title, description] of cases)
    ok(got.title === title && got.description === description, `text/${label}: ${JSON.stringify(got)}`);
  ok(/^\d+\.\d+\.\d+/.test(ENGINE_VERSION), `text/premise: the engine version reads as a version (${ENGINE_VERSION})`);
}

console.log('\n2. apply theme: one version, before the first write');
{
  const input: BrandInput = brandFromDesignMd(readFileSync(join(import.meta.dirname, '../../packages/engine/examples/prism3.design.md'), 'utf8'));
  const sizeOf = (f: FileShim): number => f.collections.length + f.vars.length + Object.values(f.styles).reduce((n, l) => n + l.length, 0);
  const fileFor = (refuse = false) => {
    const file = new FileShim();
    const faces = new Map<string, { family: string; style: string }>();
    for (const r of themePlans(input).textPlan) faces.set(`${r.fontFamilyPrimary}|${r.fontStyle}`, { family: r.fontFamilyPrimary, style: r.fontStyle });
    file.faces = [...faces.values()];
    const saved: { title: string; description: string | undefined; written: number }[] = [];
    (file as any).saveVersionHistoryAsync = async (title: string, description?: string) => {
      if (refuse) throw new Error('this plugin may not save versions');
      saved.push({ title, description, written: sizeOf(file) });
      return { id: 'v' };
    };
    return { file, saved };
  };
  const a = fileFor();
  const r = await runApplyTheme(input, a.file as any, () => saveVersion(a.file as any, { run: 'apply-theme' }).then(() => undefined));
  ok(r.guarded.ok === true && sizeOf(a.file) > 0, 'theme/premise: the apply wrote');
  ok(a.saved.length === 1 && a.saved[0].title === 'Saved before Prism3 applied the theme' && a.saved[0].description === `${E} Variables and styles.`,
    `theme/one version, exact text (${JSON.stringify(a.saved)})`);
  ok(a.saved[0]?.written === 0, `theme/before first write: the file held ${a.saved[0]?.written} collections, variables and styles when it was saved`);

  const b = fileFor(true);
  let threw = '';
  try { await runApplyTheme(input, b.file as any, () => saveVersion(b.file as any, { run: 'apply-theme' }).then(() => undefined)); } catch (e) { threw = (e as Error).message; }
  ok(/may not save versions/.test(threw) && sizeOf(b.file) === 0, `theme/refused: nothing written when the version cannot be saved (${threw})`);

  const c = fileFor();
  c.file.createVariableCollection('color');
  c.file.createVariable('x', c.file.collections[0], 'FLOAT');
  const before = sizeOf(c.file);
  const conflict = await runApplyTheme(input, c.file as any, () => saveVersion(c.file as any, { run: 'apply-theme' }).then(() => undefined));
  ok(conflict.guarded.ok === false && c.saved.length === 0 && sizeOf(c.file) === before, `theme/conflict: a pre-flight refusal saves no version (${c.saved.length} saved)`);
}

console.log('\n3. build: one version, the def and the sets it adds');
{
  const def = (id: string) => componentDefs.find((d) => d.id === id)!;
  const project = (d: (typeof componentDefs)[number]) => figmaAnatomySet(d, { swapTarget: 'icon/FPO-default-icon' });
  const run = async (id: string, comps: string[] = []) => {
    const api = makeShim({ page: { children: [] }, liveRoot: true, comps }) as any;
    const r = await saveBeforeBuild(api, def(id), { defs: componentDefs, project });
    return { r, versions: api._versions as string[], notes: api._versionNotes as string[], children: api.root.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).length as number };
  };
  // A set that nests nothing: only it is added, so the title names it.
  const leaf = await run('divider');
  ok(leaf.versions.length === 1 && leaf.versions[0] === 'Saved before Prism3 added ' + def('divider').name && leaf.notes[0] === E && leaf.children === 0,
    `build/one set: ${JSON.stringify(leaf.versions)} ${JSON.stringify(leaf.notes)}, nothing written`);
  // An empty file: the missing sets Tag nests are added first, so the title counts them and the description lists them.
  const bare = await run('tag');
  ok(bare.versions.length === 1 && bare.versions[0] === 'Saved before Prism3 added 3 sets' && bare.notes[0] === `${E} Sets: icon, focus-ring, tag (3).` && bare.children === 0,
    `build/sets: the def and the sets it nests, nested first (${JSON.stringify(bare.versions)} ${JSON.stringify(bare.notes)})`);
}

console.log('\n4. bypass: no second caller, and each command reaches the builder');
{
  const SRC = join(import.meta.dirname, 'src');
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : /\.tsx?$/.test(e.name) && !/\.d\.ts$/.test(e.name) ? [join(d, e.name)] : []));
  /** Every use of the host's save outside a type member, by file: a call, a reference, or a string key. */
  const usesOf = (name: string, text: string): number => {
    const sf = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
    let n = 0;
    const visit = (node: ts.Node): void => {
      const isName = (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) && node.text === 'saveVersionHistoryAsync';
      if (isName && !(ts.isMethodSignature(node.parent) || ts.isPropertySignature(node.parent))) n++;
      ts.forEachChild(node, visit);
    };
    visit(sf);
    return n;
  };
  ok(usesOf('x.ts', 'const f = async (h: any) => { await h.saveVersionHistoryAsync("t"); };') === 1
    && usesOf('x.ts', 'type T = { saveVersionHistoryAsync?(t: string): Promise<unknown> }; // saveVersionHistoryAsync(') === 0
    && usesOf('x.ts', 'h["saveVersionHistoryAsync"]("t")') === 1, 'bypass/detector: finds a call and a string key, and not a type member or a comment');
  const files = walk(SRC);
  ok(['version-title.ts', 'main.ts', 'update-apply.ts', 'apply-theme.ts', 'style-guide.ts'].every((f) => files.some((p) => p.endsWith(`/${f}`))), `bypass/scope: the scan reaches the builder and the four commands' files (${files.length} files)`);
  const text = new Map(files.map((p) => [relative(SRC, p), readFileSync(p, 'utf8')] as const));
  const callers = [...text].filter(([f, t]) => usesOf(f, t) > 0).map(([f]) => f);
  ok(JSON.stringify(callers) === JSON.stringify(['version-title.ts']), `bypass/no second caller: ${JSON.stringify(callers)}`);
  const has = (file: string, needle: string): boolean => (text.get(file) ?? '').includes(needle);
  ok(has('update-apply.ts', "run: 'update'"), 'bypass/update: Update saves through the builder');
  ok(has('main.ts', 'saveBeforeBuild(figma as unknown'), 'bypass/build: Build saves through the builder');
  ok(has('main.ts', "run: 'style-guide'") && has('style-guide.ts', 'run.beforeWrite?.('), 'bypass/style guide: Style guide saves through the builder');
  ok(has('main.ts', "run: 'apply-theme'") && has('apply-theme.ts', 'await beforeWrite?.()'), 'bypass/apply theme: Apply theme saves through the builder');
}

if (failures) { console.error(`\n${failures} version-title check(s) failed`); process.exit(1); }
console.log('\nversion titles: all checks pass');
