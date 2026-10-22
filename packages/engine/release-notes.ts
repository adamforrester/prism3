/**
 * Prism3 — RELEASE NOTES (#2650, owner decision Q308.1 A): "What changed in <version>", generated, never typed.
 *
 *   npx tsx packages/engine/release-notes.ts --pending            # print the notes the next fold would write
 *   npx tsx packages/engine/release-notes.ts --version 0.236.0    # (re)write one folded version's notes from git
 *   npx tsx packages/engine/release-notes.ts --refresh            # a fold PR that merged main: rewrite its notes
 *   npx tsx packages/engine/release-notes.ts --index              # rewrite index.json and index.md from the release files
 *
 * `fold.ts` calls `buildRelease` and `writeRelease` for the version it assigns, so each fold writes
 * `docs/public/releases/<version>.md` and `.json` and updates `index.md` and `index.json` beside them.
 *
 * ── WHAT A RELEASE IS COMPUTED FROM ──────────────────────────────────────────────────────────────────
 *
 * Two trees: the BASE is the commit in HEAD's history (merges excluded) that set `ENGINE_VERSION` to the version
 * before (the previous fold), and the HEAD is the tree that carries this version (the fold being written,
 * or, for a version already folded, the commit that set it). From each, four committed records, read with
 * `git show` and never recomputed, because a release names what shipped and these are what shipped:
 *
 *   · `schema/component-axes.json` — each Figma set's variant properties and their values (#2265).
 *   · `schema/component-surface.json` — each set's projected members, as a count and a digest (#1252).
 *   · `out/components/components.ai.json` — each coded component's props, their values and defaults.
 *   · `schema/token-contract.json` — the guaranteed token names and their types, and the deprecations.
 *
 * plus the rename ledger, `component-renames.ts` (`COMPONENT_RENAMES`), at HEAD, which says which
 * disappearance is a rename. And the change notes the fold consumes, verbatim, under "In detail".
 *
 * A version whose base or head lacks one of the four records is refused, not guessed at: that is the
 * "reliable" line for a backfill. The oldest version with all four on both sides is 0.234.0 (#2265 added
 * the axes baseline between the 0.232.0 and 0.233.0 folds), so the backfill starts there.
 *
 * ── THE RULE THAT CLASSIFIES AN ITEM (docs/30 "Change classification", one layer wider) ─────────────
 *
 *   breaking  a name someone uses is removed, renamed or retyped: a set, a variant property or one of its
 *             values, a coded component, a prop or one of its values, a guaranteed token. A reference to
 *             it stops resolving until it is changed. A rename is breaking even when the plugin's Update
 *             renames the members in place, because a name in a developer's code or an agent's notes does
 *             not move with it. A token with a deprecation keeps its MAJOR (docs/30 "Deprecations").
 *   new       a name is added. Nothing that already resolves changes.
 *   fix       a value moves under a name that stays: a prop's default, or a set that builds differently
 *             (its surface digest moved) with no name added or removed on it.
 *
 * `brandDependent` tokens are left out, as docs/30 leaves them out of the contract: they exist for some
 * brand inputs only. The change notes are not classified; each change they describe that a reader can
 * observe is already an item above them, read from the records, so the notes add the reasoning only.
 *
 * ── WHAT THE GATE CHECKS ─────────────────────────────────────────────────────────────────────────────
 *
 * `lint-release-notes.ts` re-derives every release's items from git with its own code and fails by name
 * when a breaking change in the diff is missing from the notes, when the notes claim a change the diff
 * does not show, or when an item is classified against the rule. It never imports this file (docs/34
 * shape 2): a gate that called the generator would agree with it by construction.
 *
 * ── LIMITS ───────────────────────────────────────────────────────────────────────────────────────────
 *
 * 1. ONE VERSION SPANS ITS WHOLE FIRST-PARENT RANGE. A fold PR squashed after other PRs merged carries
 *    their record changes into its tree, while their change notes stay pending for the next fold. The
 *    notes then list those changes under this version, which is where `main` shipped them, and the gate
 *    agrees, because it reads the same range. After merging `main` into a fold branch, run `--refresh`.
 * 2. FIGMA'S BOOLEAN, TEXT AND INSTANCE-SWAP PROPERTIES are not in any baseline, so a change to one shows
 *    only as "builds differently" (its digest moves), never by name.
 * 3. A CODED PROP RENAME has no ledger, so it reads as one prop removed (breaking) and one added (new).
 *    The class is right; the pairing is not drawn.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(here, '../..');
export const RELEASES_DIR = 'docs/public/releases';
const VERSION_FILE = 'packages/engine/version.ts';
const NOTES_DIR = 'packages/engine/changes';

const SOURCES = {
  axes: 'packages/engine/schema/component-axes.json',
  surface: 'packages/engine/schema/component-surface.json',
  components: 'packages/engine/out/components/components.ai.json',
  contract: 'packages/engine/schema/token-contract.json',
} as const;
const LEDGER = 'packages/engine/component-renames.ts';

// ---- the data a release carries ------------------------------------------------------------------

export type ReleaseClass = 'breaking' | 'new' | 'fix';
export type ReleaseArea = 'figma' | 'code' | 'tokens';
export type ReleaseItem = {
  class: ReleaseClass;
  area: ReleaseArea;
  /** What changed, from a closed list; `lint-release-notes.ts` derives the same kinds. */
  kind: string;
  /** The def id: the set's name in Figma, and the key the plugin filters by. */
  component?: string;
  property?: string;
  /** The values added or removed on one property, in its order. */
  values?: string[];
  token?: string;
  from?: string;
  to?: string;
  text: string;
};
export type ReleaseNote = { slug: string; level: string; prose: string };
export type Release = {
  note: string;
  version: string;
  from: string;
  date: string;
  /** The commit the diff starts from: the previous fold, on `main`. */
  base: string;
  counts: Record<ReleaseClass, number>;
  items: ReleaseItem[];
  notes: ReleaseNote[];
};
export type IndexEntry = {
  version: string; from: string; date: string; counts: Record<ReleaseClass, number>; md: string; json: string;
  /** The breaking and new Figma items, for the plugin's Update summary: the part a designer's file meets. */
  highlights: { component: string; class: ReleaseClass; text: string }[];
  /** Every Figma and token item, every class, as the release lists them (#2858): the plugin's About frame, its publish
   *  description and each set's "Last changed in" read these. Code items stay in `<version>.json`. */
  items: IndexItem[];
};
/** An index item: a release item's class, area, kind, set and sentence. */
export type IndexItem = { class: ReleaseClass; area: ReleaseArea; kind: string; component?: string; text: string };
export type ReleaseIndex = { note: string; releases: IndexEntry[] };

const RELEASE_NOTE = 'Generated by packages/engine/release-notes.ts at each fold, from the committed records at the previous fold and at this one. Do not hand-edit; packages/engine/lint-release-notes.ts checks every item against git.';
const INDEX_NOTE = 'Generated by packages/engine/release-notes.ts. One entry per engine version, newest first; `highlights` are the breaking and new Figma items, which the plugin shows in its Update check; `items` are every Figma and token item, which the plugin bundles for the file\'s About frame, its publish description and each set\'s last change.';

// ---- git -------------------------------------------------------------------------------------------

const git = (...args: string[]): { ok: boolean; out: string; err: string } => {
  const r = spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr ?? '').trim() };
};

/** A file at a commit, or in the working tree when `ref` is null. Null when it is not there. */
const readAt = (ref: string | null, rel: string): string | null => {
  if (ref === null) return existsSync(join(REPO, rel)) ? readFileSync(join(REPO, rel), 'utf8') : null;
  const r = git('show', `${ref}:${rel}`);
  return r.ok ? r.out : null;
};

const VERSION_LINE = /^export const ENGINE_VERSION = '(\d+\.\d+\.\d+)';$/m;
export const versionAt = (ref: string | null): string | null => {
  const src = readAt(ref, VERSION_FILE);
  return src ? (VERSION_LINE.exec(src)?.[1] ?? null) : null;
};

/** Each version, mapped to the newest commit in HEAD's history that set it: its fold. A merge is never a
 *  fold. `main` is squash-only, so every fold is an ordinary commit; a feature branch that merged `main`
 *  across a fold has a merge commit that moves `ENGINE_VERSION` against its first parent (the branch), and
 *  `--first-parent` read that merge as the fold, so the notes took the branch's own changes for the fold's.
 *  `--no-merges` over the whole history finds the fold on `main`'s side instead. */
export const foldCommits = (): Map<string, string> => {
  const r = git('log', '--no-merges', '-U0', '--format=%x00%H', '-G', '^export const ENGINE_VERSION = ', 'HEAD', '--', VERSION_FILE);
  if (!r.ok) throw new Error(`git log failed while finding the folds: ${r.err}`);
  const out = new Map<string, string>();
  for (const rec of r.out.split('\0').filter((x) => x.trim())) {
    const sha = rec.slice(0, rec.indexOf('\n')).trim();
    const m = /^\+export const ENGINE_VERSION = '(\d+\.\d+\.\d+)';$/m.exec(rec);
    if (m && !out.has(m[1])) out.set(m[1], sha);
  }
  return out;
};

// ---- the records -----------------------------------------------------------------------------------

type Axes = Record<string, { axes: Record<string, string[]>; members: number }>;
type Surface = Record<string, { members: number; sha256: string } | null>;
type Prop = { name: string; type?: string; default?: unknown; values?: string[] };
type Components = Record<string, { name: string; props: Prop[] }>;
type Contract = { guaranteed: Record<string, string>; deprecations: { path: string; replacedBy: string }[] };
type Rename = { def: string; kind: 'value' | 'axis' | 'drop'; axis?: string; value?: string; from?: string; to?: string };
export type Snapshot = { axes: Axes; surface: Surface; components: Components; contract: Contract; ledger: Rename[] };

/** The ledger is TypeScript that imports nothing, so a copy of it at any commit can be loaded as it stood. */
const ledgerAt = async (ref: string | null): Promise<Rename[]> => {
  const src = readAt(ref, LEDGER);
  if (!src) return [];
  const dir = mkdtempSync(join(tmpdir(), 'p3-release-ledger-'));
  try {
    const f = join(dir, 'component-renames.ts');
    writeFileSync(f, src);
    const mod = (await import(pathToFileURL(f).href)) as { COMPONENT_RENAMES?: Rename[] };
    return [...(mod.COMPONENT_RENAMES ?? [])];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

export const snapshotAt = async (ref: string | null): Promise<Snapshot> => {
  const where = ref === null ? 'the working tree' : ref.slice(0, 8);
  const raw: Partial<Record<keyof typeof SOURCES, unknown>> = {};
  for (const [k, rel] of Object.entries(SOURCES) as [keyof typeof SOURCES, string][]) {
    const src = readAt(ref, rel);
    if (src === null) throw new Error(`${rel} is not in ${where}, so this version's notes cannot be read reliably`);
    raw[k] = JSON.parse(src);
  }
  const comps = (raw.components as { components: Record<string, { name: string; props?: Prop[] }> }).components;
  const contract = raw.contract as { guaranteed: Record<string, string>; deprecations?: { path: string; replacedBy: string }[] };
  return {
    axes: raw.axes as Axes,
    surface: (raw.surface as { defs: Surface }).defs,
    components: Object.fromEntries(Object.entries(comps).map(([id, c]) => [id, { name: c.name, props: c.props ?? [] }])),
    contract: { guaranteed: contract.guaranteed, deprecations: contract.deprecations ?? [] },
    ledger: await ledgerAt(ref),
  };
};

// ---- the diff ----------------------------------------------------------------------------------------

const code = (s: string): string => `\`${s}\``;
const list = (xs: readonly string[]): string =>
  xs.length <= 1 ? xs.map(code).join('') : `${xs.slice(0, -1).map(code).join(', ')} and ${code(xs[xs.length - 1])}`;
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
const isBlock = (id: string): boolean => id.startsWith('_');
const show = (v: unknown): string => (v === undefined || v === null ? 'no default' : code(String(v)));

/** Follows a chain of renames for one name to its end. */
const follow = (start: string, step: (n: string) => string | undefined): string => {
  let at = start;
  const seen = new Set([at]);
  for (let next = step(at); next !== undefined && !seen.has(next); next = step(at)) { seen.add(next); at = next; }
  return at;
};

const figmaItems = (b: Snapshot, h: Snapshot): ReleaseItem[] => {
  const out: ReleaseItem[] = [];
  for (const [id, a] of Object.entries(h.axes)) {
    if (b.axes[id]) continue;
    out.push({ class: 'new', area: 'figma', kind: 'set-added', component: id, text: isBlock(id)
      ? `${code(id)} is a new building block, ${plural(a.members, 'variant')}. Other components nest it; it isn't placed on its own.`
      : `${code(id)} is a new component set, ${plural(a.members, 'variant')}.` });
  }
  for (const [id, was] of Object.entries(b.axes)) {
    const now = h.axes[id];
    if (!now) { out.push({ class: 'breaking', area: 'figma', kind: 'set-removed', component: id, text: `${code(id)} no longer builds. A set already in a file stays as it is.` }); continue; }
    const mine = h.ledger.filter((r) => r.def === id);
    const axisTo = (a: string): string => follow(a, (x) => mine.find((r) => r.kind === 'axis' && r.from === x)?.to);
    const targets = new Set<string>();
    for (const [axis, values] of Object.entries(was.axes)) {
      const to = axisTo(axis);
      if (!now.axes[to]) { out.push({ class: 'breaking', area: 'figma', kind: 'axis-removed', component: id, property: axis, text: `${code(id)}: the ${code(axis)} property is gone.` }); continue; }
      targets.add(to);
      if (to !== axis) out.push({ class: 'breaking', area: 'figma', kind: 'axis-renamed', component: id, from: axis, to, text: `${code(id)}: the ${code(axis)} property is now called ${code(to)}.` });
      const valueTo = (v: string): string => follow(v, (x) => mine.find((r) => r.kind === 'value' && r.axis === to && r.from === x)?.to);
      const reached = new Set<string>();
      const gone: string[] = [];
      for (const v of values) {
        const w = valueTo(v);
        if (!now.axes[to].includes(w)) { gone.push(v); continue; }
        reached.add(w);
        if (w !== v) out.push({ class: 'breaking', area: 'figma', kind: 'value-renamed', component: id, property: to, from: v, to: w, text: `${code(id)}: the ${code(to)} value ${code(v)} is now called ${code(w)}.` });
      }
      if (gone.length) out.push({ class: 'breaking', area: 'figma', kind: 'value-removed', component: id, property: to, values: gone, text: `${code(id)}: ${code(to)} no longer has ${gone.length === 1 ? 'the value' : 'the values'} ${list(gone)}.` });
      const added = now.axes[to].filter((w) => !reached.has(w));
      if (added.length) out.push({ class: 'new', area: 'figma', kind: 'value-added', component: id, property: to, values: added, text: `${code(id)}: ${code(to)} has ${added.length === 1 ? 'a new value,' : 'new values:'} ${list(added)}.` });
    }
    for (const [axis, values] of Object.entries(now.axes)) if (!targets.has(axis))
      out.push({ class: 'new', area: 'figma', kind: 'axis-added', component: id, property: axis, text: `${code(id)} has a new property, ${code(axis)}, with the values ${list(values)}.` });
  }
  // A SET THAT BUILDS DIFFERENTLY, under names that all stay: its digest moved (`lint-component-surface.ts`),
  // under its own key or a brand-scenario key (`<id>@<scenario>`), and nothing above was said about it.
  const named = new Set(out.map((i) => i.component));
  const moved = new Set<string>();
  for (const key of new Set([...Object.keys(b.surface), ...Object.keys(h.surface)])) {
    const id = key.split('@')[0];
    if (JSON.stringify(b.surface[key] ?? null) !== JSON.stringify(h.surface[key] ?? null)) moved.add(id);
  }
  for (const id of [...moved].sort()) {
    if (named.has(id) || !b.axes[id] || !h.axes[id]) continue;
    const m0 = b.axes[id].members, m1 = h.axes[id].members;
    out.push({ class: 'fix', area: 'figma', kind: 'set-rebuilt', component: id, text: `${code(id)} builds differently${m0 !== m1 ? `, ${m0} → ${m1} variants` : ''}.` });
  }
  return out;
};

const codeItems = (b: Snapshot, h: Snapshot): ReleaseItem[] => {
  const out: ReleaseItem[] = [];
  for (const [id, c] of Object.entries(h.components))
    if (!b.components[id]) out.push({ class: 'new', area: 'code', kind: 'component-added', component: id, text: `${code(c.name)} is a new component.` });
  for (const [id, was] of Object.entries(b.components)) {
    const now = h.components[id];
    if (!now) { out.push({ class: 'breaking', area: 'code', kind: 'component-removed', component: id, text: `${code(was.name)} is gone.` }); continue; }
    const N = code(now.name);
    const before = new Map(was.props.map((p) => [p.name, p]));
    const after = new Map(now.props.map((p) => [p.name, p]));
    for (const [name] of after) if (!before.has(name))
      out.push({ class: 'new', area: 'code', kind: 'prop-added', component: id, property: name, text: `${N} has a new prop, ${code(name)}.` });
    for (const [name, p] of before) {
      const q = after.get(name);
      if (!q) { out.push({ class: 'breaking', area: 'code', kind: 'prop-removed', component: id, property: name, text: `${N} no longer has the ${code(name)} prop.` }); continue; }
      const v0 = p.values ?? [], v1 = q.values ?? [];
      const gone = v0.filter((v) => !v1.includes(v)), added = v1.filter((v) => !v0.includes(v));
      if (gone.length) out.push({ class: 'breaking', area: 'code', kind: 'prop-value-removed', component: id, property: name, values: gone, text: `${N}: ${code(name)} no longer takes ${list(gone)}.` });
      if (added.length) out.push({ class: 'new', area: 'code', kind: 'prop-value-added', component: id, property: name, values: added, text: `${N}: ${code(name)} takes ${added.length === 1 ? 'a new value,' : 'new values:'} ${list(added)}.` });
      // A type string spells an enum's values, so a value change moves it too; retyped means a change beyond that.
      if (!p.values && !q.values && (p.type ?? '') !== (q.type ?? ''))
        out.push({ class: 'breaking', area: 'code', kind: 'prop-retyped', component: id, property: name, from: p.type ?? '', to: q.type ?? '', text: `${N}: ${code(name)} changes type, from ${code(p.type ?? 'none')} to ${code(q.type ?? 'none')}.` });
      if (JSON.stringify(p.default ?? null) !== JSON.stringify(q.default ?? null))
        out.push({ class: 'fix', area: 'code', kind: 'prop-default', component: id, property: name, from: String(p.default ?? ''), to: String(q.default ?? ''), text: `${N}: ${code(name)} now defaults to ${show(q.default)}, not ${show(p.default)}.` });
    }
  }
  return out;
};

const tokenItems = (b: Snapshot, h: Snapshot): ReleaseItem[] => {
  const out: ReleaseItem[] = [];
  const g0 = b.contract.guaranteed, g1 = h.contract.guaranteed;
  const replaced = new Map(h.contract.deprecations.map((d) => [d.path, d.replacedBy]));
  for (const [path, type] of Object.entries(g1))
    if (!(path in g0)) out.push({ class: 'new', area: 'tokens', kind: 'token-added', token: path, text: `${code(path)} is a new ${type} token.` });
  for (const [path, type] of Object.entries(g0)) {
    if (!(path in g1)) {
      const by = replaced.get(path);
      out.push({ class: 'breaking', area: 'tokens', kind: 'token-removed', token: path, ...(by ? { to: by } : {}), text: by ? `${code(path)} is gone. Use ${code(by)} instead.` : `${code(path)} is gone.` });
    } else if (g1[path] !== type) {
      out.push({ class: 'breaking', area: 'tokens', kind: 'token-retyped', token: path, from: type, to: g1[path], text: `${code(path)} changes type, from ${type} to ${g1[path]}.` });
    }
  }
  return out;
};

const CLASS_ORDER: ReleaseClass[] = ['breaking', 'new', 'fix'];
const AREA_ORDER: ReleaseArea[] = ['figma', 'code', 'tokens'];
const byOrder = (a: ReleaseItem, b: ReleaseItem): number =>
  CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class)
  || AREA_ORDER.indexOf(a.area) - AREA_ORDER.indexOf(b.area)
  || (a.component ?? a.token ?? '').localeCompare(b.component ?? b.token ?? '')
  || a.text.localeCompare(b.text);

export const diffSnapshots = (b: Snapshot, h: Snapshot): ReleaseItem[] =>
  [...figmaItems(b, h), ...codeItems(b, h), ...tokenItems(b, h)].sort(byOrder);

// ---- a release -----------------------------------------------------------------------------------

export const buildRelease = async (o: { version: string; from: string; base: string; head: string | null; notes: ReleaseNote[]; date: string }): Promise<Release> => {
  const items = diffSnapshots(await snapshotAt(o.base), await snapshotAt(o.head));
  const counts = { breaking: 0, new: 0, fix: 0 };
  for (const i of items) counts[i.class]++;
  return { note: RELEASE_NOTE, version: o.version, from: o.from, date: o.date, base: o.base, counts, items, notes: [...o.notes].sort((a, b) => a.slug.localeCompare(b.slug)) };
};

const CLASS_HEADING: Record<ReleaseClass, string> = { breaking: 'Breaking changes', new: 'New', fix: 'Fixes' };
const AREA_HEADING: Record<ReleaseArea, string> = { figma: 'Figma', code: 'Code', tokens: 'Tokens' };
/** A list longer than this goes into a collapsed block, so a large token change doesn't bury the rest. */
const FOLD_OVER = 12;

export const releaseMarkdown = (r: Release): string => {
  const c = r.counts;
  const L: string[] = [
    `# What changed in ${r.version}`,
    '',
    `${r.date} · from ${r.from} · ${plural(c.breaking, 'breaking change')}, ${c.new} new, ${plural(c.fix, 'fix', 'fixes')}`,
    '',
    `These notes are generated from the engine's own records at ${r.from} and at ${r.version}: the Figma component sets, the coded components and the token names. Every item is checked against those records.`,
    '',
    '- **Breaking:** a name is renamed, removed or retyped. Anything that uses the old name stops working until it uses the new one.',
    '- **New:** a name is added. Nothing that already works changes.',
    '- **Fix:** a value changes under a name that stays, such as a default or how a set is built.',
    '',
    'Under **Figma**, a set is named as it appears in the file, and a property is a variant property in its panel. Under **Code**, a prop is a setting a developer passes to a coded component. Under **Tokens**, a token is a named value, such as a color or a size, that Figma variables and code both read; names are shown without the brand\'s root, such as `prism.`.',
  ];
  for (const cls of CLASS_ORDER) {
    L.push('', `## ${CLASS_HEADING[cls]}`);
    const mine = r.items.filter((i) => i.class === cls);
    if (!mine.length) { L.push('', 'None in this version.'); continue; }
    for (const area of AREA_ORDER) {
      const here = mine.filter((i) => i.area === area);
      if (!here.length) continue;
      L.push('', `### ${AREA_HEADING[area]}`, '');
      const lines = here.map((i) => `- ${i.text}`);
      // Said once for the list rather than on every line: what a designer does about a set that builds differently.
      if (cls === 'fix' && area === 'figma') L.push('Update brings a set already in a file up to date.', '');
      if (lines.length > FOLD_OVER) L.push('<details>', `<summary>${here.length} items</summary>`, '', ...lines, '', '</details>');
      else L.push(...lines);
    }
  }
  L.push('', '## In detail', '');
  if (!r.notes.length) L.push('No change notes were folded into this version.');
  else {
    L.push('The change notes this version folds, as each change\'s author wrote them. They carry the reasoning behind the items above, for the people who build Prism3.');
    for (const n of r.notes) L.push('', `### ${n.slug} (${n.level})`, '', n.prose);
  }
  return `${L.join('\n')}\n`;
};

const semverDesc = (a: string, b: string): number => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  return pb[0] - pa[0] || pb[1] - pa[1] || pb[2] - pa[2];
};

const indexMarkdown = (ix: ReleaseIndex): string => [
  '# Release notes',
  '',
  'One page per engine version, newest first. Each is generated when the version is assigned, from the engine\'s own records.',
  '',
  '| Version | Date | Breaking | New | Fixes |',
  '|---|---|---|---|---|',
  ...ix.releases.map((e) => `| [${e.version}](${e.md}) | ${e.date} | ${e.counts.breaking} | ${e.counts.new} | ${e.counts.fix} |`),
  '',
].join('\n');

export const readIndex = (): ReleaseIndex => {
  const p = join(REPO, RELEASES_DIR, 'index.json');
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as ReleaseIndex) : { note: INDEX_NOTE, releases: [] };
};

/** A release's index entry: its counts, its highlights and its Figma and token items, read off the release alone. */
const indexEntry = (r: Release): IndexEntry => ({
  version: r.version, from: r.from, date: r.date, counts: r.counts, md: `${r.version}.md`, json: `${r.version}.json`,
  highlights: r.items.filter((i) => i.area === 'figma' && i.class !== 'fix').map((i) => ({ component: i.component!, class: i.class, text: i.text })),
  items: r.items.filter((i) => i.area !== 'code').map((i) => ({ class: i.class, area: i.area, kind: i.kind, ...(i.component === undefined ? {} : { component: i.component }), text: i.text })),
});

const writeIndex = (dir: string, ix: ReleaseIndex): void => {
  ix.note = INDEX_NOTE;
  ix.releases.sort((a, b) => semverDesc(a.version, b.version));
  writeFileSync(join(dir, 'index.json'), `${JSON.stringify(ix, null, 2)}\n`);
  writeFileSync(join(dir, 'index.md'), indexMarkdown(ix));
};

/** Writes `<version>.md` and `.json`, and puts the version's entry into `index.json` and `index.md`. */
export const writeRelease = (r: Release): string[] => {
  const dir = join(REPO, RELEASES_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${r.version}.json`), `${JSON.stringify(r, null, 2)}\n`);
  writeFileSync(join(dir, `${r.version}.md`), releaseMarkdown(r));
  const ix = readIndex();
  ix.releases = [...ix.releases.filter((e) => e.version !== r.version), indexEntry(r)];
  writeIndex(dir, ix);
  return [`${RELEASES_DIR}/${r.version}.md`, `${RELEASES_DIR}/${r.version}.json`, `${RELEASES_DIR}/index.md`, `${RELEASES_DIR}/index.json`];
};

/** Rewrites `index.json` and `index.md` from every `<version>.json` on disk, so an index field added later reaches the
 *  releases written before it (#2858). The release files are not touched. */
export const rewriteIndex = (): string[] => {
  const dir = join(REPO, RELEASES_DIR);
  const releases = readdirSync(dir).filter((f) => /^\d+\.\d+\.\d+\.json$/.test(f))
    .map((f) => indexEntry(JSON.parse(readFileSync(join(dir, f), 'utf8')) as Release));
  writeIndex(dir, { note: INDEX_NOTE, releases });
  return [`${RELEASES_DIR}/index.md`, `${RELEASES_DIR}/index.json`];
};

// ---- the change notes ----------------------------------------------------------------------------

const NOTE_RE = /^---\nengine:[ \t]*(\S+)[ \t]*\n---\n([\s\S]*)$/;
const parseNote = (path: string, src: string, version: string): ReleaseNote | null => {
  const m = NOTE_RE.exec(src.replace(/\r\n/g, '\n'));
  return m ? { slug: path.slice(path.lastIndexOf('/') + 1, -'.md'.length), level: m[1], prose: m[2].trim().replace(/\{\{ENGINE_VERSION\}\}/g, version) } : null;
};

/** The notes a commit deleted from `changes/`, as they read at its first parent: what that fold folded. */
const notesFoldedBy = (sha: string, version: string): ReleaseNote[] => {
  const r = git('diff', '--name-only', '--no-renames', '--diff-filter=D', `${sha}^1`, sha, '--', NOTES_DIR);
  if (!r.ok) throw new Error(`git diff failed for ${sha.slice(0, 8)}: ${r.err}`);
  return r.out.split('\n').map((p) => p.trim()).filter((p) => p && !p.endsWith('README.md'))
    .map((p) => parseNote(p, readAt(`${sha}^1`, p) ?? '', version)).filter((n): n is ReleaseNote => n !== null);
};

/** The notes pending in the working tree, as the next fold would fold them. */
const pendingNotes = (version: string): ReleaseNote[] => {
  const dir = join(REPO, NOTES_DIR);
  return readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => parseNote(`${NOTES_DIR}/${f}`, readFileSync(join(dir, f), 'utf8'), version)).filter((n): n is ReleaseNote => n !== null);
};

const dayOf = (sha: string): string => new Date(git('show', '-s', '--format=%cI', sha).out.trim()).toISOString().slice(0, 10);

/** The release for a version already folded in HEAD's history, read entirely from git. */
export const releaseFromHistory = async (version: string, folds = foldCommits()): Promise<Release> => {
  const head = folds.get(version);
  if (!head) throw new Error(`no commit in HEAD's history (merges excluded) sets ENGINE_VERSION to ${version}`);
  const from = versionAt(`${head}^1`);
  if (!from) throw new Error(`cannot read ENGINE_VERSION at ${head.slice(0, 8)}^1`);
  const base = folds.get(from);
  if (!base) throw new Error(`no commit in HEAD's history (merges excluded) sets ENGINE_VERSION to ${from}, the version before ${version}`);
  return buildRelease({ version, from, base, head, notes: notesFoldedBy(head, version), date: dayOf(head) });
};

// ---- the CLI -------------------------------------------------------------------------------------

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = (flag: string): string | undefined => { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : undefined; };
  const fail = (msg: string): never => { console.error(`✗ release-notes: ${msg}`); process.exit(1); };
  try {
    if (process.argv.includes('--pending')) {
      const current = versionAt(null) ?? fail('cannot read ENGINE_VERSION');
      const base = foldCommits().get(current) ?? fail(`no commit (merges excluded) sets ENGINE_VERSION to ${current}`);
      const r = await buildRelease({ version: 'the next version', from: current, base, head: null, notes: pendingNotes('the next version'), date: new Date().toISOString().slice(0, 10) });
      process.stdout.write(releaseMarkdown(r));
    } else if (arg('--version')) {
      const r = await releaseFromHistory(arg('--version')!);
      console.log(`wrote ${writeRelease(r).join(', ')} — ${r.counts.breaking} breaking, ${r.counts.new} new, ${r.counts.fix} fix(es), ${r.notes.length} change note(s)`);
    } else if (process.argv.includes('--refresh')) {
      const version = versionAt(null) ?? fail('cannot read ENGINE_VERSION');
      const p = join(REPO, RELEASES_DIR, `${version}.json`);
      if (!existsSync(p)) fail(`${RELEASES_DIR}/${version}.json does not exist; --refresh rewrites the notes a fold already wrote`);
      const was = JSON.parse(readFileSync(p, 'utf8')) as Release;
      const base = foldCommits().get(was.from) ?? fail(`no commit (merges excluded) sets ENGINE_VERSION to ${was.from}`);
      const r = await buildRelease({ version, from: was.from, base, head: null, notes: was.notes, date: was.date });
      console.log(`wrote ${writeRelease(r).join(', ')} — ${r.counts.breaking} breaking, ${r.counts.new} new, ${r.counts.fix} fix(es)`);
    } else if (process.argv.includes('--index')) {
      console.log(`wrote ${rewriteIndex().join(', ')}`);
    } else {
      fail('pass --pending, --version <x.y.z>, --refresh or --index');
    }
  } catch (e) {
    fail((e as Error).message);
  }
}
