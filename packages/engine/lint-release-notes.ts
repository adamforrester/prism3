/**
 * RELEASE-NOTES GATE (#2650, owner decision Q308.1 A) — every release's notes say exactly what git says
 * changed between the fold before it and its own fold, and classify each change by docs/30's rule.
 *
 *   npx tsx packages/engine/lint-release-notes.ts
 *
 * It fails BY NAME when:
 *
 *   BREAKING CHANGE MISSING   a breaking change in the computed diff is not among a release's items.
 *   MISSING                   a new or fix change in the computed diff is not among them.
 *   CLAIMED, NOT IN THE DIFF  an item names a change the diff does not show.
 *   MISCLASSIFIED             an item's class is not the class the rule gives its kind (a removal is
 *                             breaking whatever the notes call it).
 *   TEXT                      an item's sentence does not name the set, property, value or token it is about,
 *                             or does not say what its kind says happened (SAYS, below): a sentence that
 *                             reverses its item, names kept, fails here.
 *   DATE                      a release's date is not a day git allows: before the fold that set the version
 *                             before it, or after its own fold (the working tree: after today, UTC).
 *   MARKDOWN                  the `.md` page's list lines are not exactly the `.json` items' sentences.
 *   NOTES                     the folded change notes are not exactly the ones that version's fold deleted.
 *   INDEX                     `index.json` and the release files disagree, in either direction, or an index
 *                             entry's counts or highlights (what the plugin shows) are not the release's.
 *   REPRESENTED               a version assigned at or after FLOOR has no release.
 *
 * A shallow clone CANNOT RUN rather than reporting its missing history as notes that disagree with git.
 *
 * ── WHERE THE TWO SIDES COME FROM (docs/34) ─────────────────────────────────────────────────────────
 *
 * SUBJECT: the committed `docs/public/releases/*`, written by `release-notes.ts` (called from `fold.ts`).
 * ORACLE: git. For a version V, HEAD is the single-parent commit in HEAD's history that set
 * `ENGINE_VERSION` to V (its fold), or the working tree when no commit has yet (a fold being written).
 * BASE is the commit that set the version before it. At each, this file reads the same four committed
 * records the generator reads and the rename ledger, and derives the changes with ITS OWN CODE.
 *
 * It never imports `release-notes.ts` (docs/34 shape 2): a gate that called the generator would agree
 * with it at every commit, including the one that drops a breaking line. The shared inputs are the
 * committed records and the ledger, which are what shipped (shape 17's acceptable ancestor), and the item
 * shape, which is the data contract between the two. The classification table below is restated, not
 * shared, so a generator that moves a kind to another class fails here.
 *
 * ── LIMITS ───────────────────────────────────────────────────────────────────────────────────────────
 *
 * 1. It checks WHAT each item says changed, its class, that its sentence names its subject and that it
 *    carries its kind's phrase (SAYS) and no phrase of another class. It does not judge the wording;
 *    `lint-voice.ts` and `lint-us-english.ts` scan `docs/public/**` for that. SAYS restates the
 *    generator's sentence templates as phrases, so a reworded template moves SAYS in the same PR.
 * 2. A merge is never a fold (`main` is squash-only), so a feature branch that merges `main` across a
 *    fold is checked against the fold on `main`'s side, and sees the same releases CI does.
 * 3. A fold PR that merges `main` sees `main`'s record changes in its own range and fails until
 *    `release-notes.ts --refresh` rewrites its notes. That is the gate working: the squash would ship
 *    those changes under this version.
 *
 * ── MUTATION REGISTER ────────────────────────────────────────────────────────────────────────────────
 *
 * Run over a fold committed in a throwaway worktree that removes a Figma value and a coded prop value
 * (so the release carries breaking items), each fault applied to the committed notes:
 *
 *   M1  one breaking item dropped from the `.json` and its line from the `.md` → BREAKING CHANGE MISSING.
 *   M2  a fake breaking item added to both → CLAIMED, NOT IN THE DIFF.
 *   M3  a removal's class set to `fix`, in both → MISCLASSIFIED.
 *   M4  one breaking line dropped from the `.md` only → MARKDOWN.
 *   M5  the newest release's files deleted → REPRESENTED and INDEX.
 *
 * Run over the committed releases:
 *
 *   M6  a `value-added` sentence inverted to "lost its value", names kept, in the `.json`, `.md` and
 *       `index.json` → TEXT.
 *   M7  a release's date set to 2026-01-01 in its `.json` and `index.json` → DATE.
 *   M8  the gate run in a `--depth 50` clone → CANNOT RUN, naming `git fetch --unshallow`.
 *   M9  the fold walk back on `--first-parent` with merges kept, on a branch that merged `main` across the
 *       0.237.0 fold → NOTES: the merge is read as the fold, and the notes carry change notes it did not fold.
 *   M10 a `token-added` sentence's type word changed (dimension → color) in the `.json` and `.md` → TEXT.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = 'docs/public/releases';
/** The oldest version with every record on both sides of its diff (#2265 added the axes baseline after
 *  the 0.232.0 fold). Every version from here on carries a release. */
const FLOOR = '0.234.0';

const git = (...args: string[]): { ok: boolean; out: string } => {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? '' };
};
const cannotRun = (why: string): never => {
  console.error(`\n❌ lint-release-notes CANNOT RUN — ${why}`);
  console.error('  In CI, `ci.yml` sets `fetch-depth: 0`; locally, `git fetch --unshallow`.');
  process.exit(1);
};
/** `null` = the working tree. */
const fileAt = (at: string | null, rel: string): string | null => {
  if (at === null) { const p = join(repo, rel); return existsSync(p) ? readFileSync(p, 'utf8') : null; }
  const r = git('show', `${at}:${rel}`);
  return r.ok ? r.out : null;
};
if (git('rev-parse', '--is-shallow-repository').out.trim() !== 'false') cannotRun('this clone is shallow (or not a git work tree), so the fold history the notes are checked against is not all here');
const versionIn = (src: string | null): string | null => (src ? /ENGINE_VERSION = '(\d+\.\d+\.\d+)'/.exec(src)?.[1] ?? null : null);
const cmpVersion = (a: string, b: string): number => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

// ---- THE RULE, restated (docs/30 "Change classification", one layer wider) -------------------------
const CLASS_OF: Record<string, 'breaking' | 'new' | 'fix'> = {
  'set-removed': 'breaking', 'axis-removed': 'breaking', 'axis-renamed': 'breaking', 'value-removed': 'breaking', 'value-renamed': 'breaking',
  'component-removed': 'breaking', 'prop-removed': 'breaking', 'prop-value-removed': 'breaking', 'prop-retyped': 'breaking',
  'token-removed': 'breaking', 'token-retyped': 'breaking',
  'set-added': 'new', 'axis-added': 'new', 'value-added': 'new', 'component-added': 'new', 'prop-added': 'new', 'prop-value-added': 'new', 'token-added': 'new',
  'set-rebuilt': 'fix', 'prop-default': 'fix',
};

/** What each kind's sentence must say happened, restated from the rule rather than read from the
 *  generator. Code spans are stripped first, so a name never supplies the phrase. */
const SAYS: Record<string, RegExp> = {
  'set-added': /is a new (component set|building block)/, 'set-removed': /no longer builds/,
  'axis-added': /has a new property/, 'axis-removed': /the +property is gone/, 'axis-renamed': /the +property is now called/,
  'value-added': /has (a new value,|new values:)/, 'value-removed': /no longer has the values?/, 'value-renamed': /the +value +is now called/,
  'set-rebuilt': /builds differently/,
  'component-added': /is a new component/, 'component-removed': /is gone/,
  'prop-added': /has a new prop/, 'prop-removed': /no longer has the +prop/, 'prop-retyped': /changes type, from/,
  'prop-value-added': /takes (a new value,|new values:)/, 'prop-value-removed': /no longer takes/, 'prop-default': /now defaults to/,
  'token-added': /is a new .*token/, 'token-removed': /is gone/, 'token-retyped': /changes type, from/,
};
/** A phrase that belongs to another class: a new or fix sentence that says something went away, or a
 *  breaking one that says something arrived. */
const NOT_IN: Record<string, RegExp> = {
  breaking: /\bnew\b|builds differently|now defaults/,
  new: /no longer|is gone|is now called|changes type|lost|removed/,
  fix: /no longer|is gone|is now called|changes type|lost|removed|\bnew\b/,
};
const prose = (t: string): string => t.replace(/`[^`]*`/g, '');

type Item = { class?: string; area: string; kind: string; component?: string; property?: string; values?: string[]; token?: string; from?: string; to?: string; text?: string };
const identity = (i: Item): string =>
  [i.area, i.kind, i.component ?? '', i.property ?? '', i.token ?? '', i.from ?? '', i.to ?? '', [...(i.values ?? [])].sort().join(',')].join(' | ');

// ---- the oracle: the changes between two trees, derived here ------------------------------------
type Recs = {
  axes: Record<string, { axes: Record<string, string[]>; members: number }>;
  surface: Record<string, unknown>;
  comps: Record<string, { name: string; props?: { name: string; type?: string; default?: unknown; values?: string[] }[] }>;
  guaranteed: Record<string, string>;
  deprecated: Map<string, string>;
  ledger: { def: string; kind: string; axis?: string; from?: string; to?: string }[];
};
const recordsAt = async (at: string | null): Promise<Recs> => {
  const need = (rel: string): unknown => {
    const s = fileAt(at, rel);
    if (s === null) cannotRun(`${rel} is missing at ${at ?? 'the working tree'}`);
    return JSON.parse(s!);
  };
  const contract = need('packages/engine/schema/token-contract.json') as { guaranteed: Record<string, string>; deprecations?: { path: string; replacedBy: string }[] };
  let ledger: Recs['ledger'] = [];
  const src = fileAt(at, 'packages/engine/component-renames.ts');
  if (src) {
    const d = mkdtempSync(join(tmpdir(), 'p3-lint-release-'));
    try { const f = join(d, 'ledger.ts'); writeFileSync(f, src); ledger = [...(((await import(pathToFileURL(f).href)) as { COMPONENT_RENAMES?: Recs['ledger'] }).COMPONENT_RENAMES ?? [])]; }
    finally { rmSync(d, { recursive: true, force: true }); }
  }
  return {
    axes: need('packages/engine/schema/component-axes.json') as Recs['axes'],
    surface: (need('packages/engine/schema/component-surface.json') as { defs: Record<string, unknown> }).defs,
    comps: (need('packages/engine/out/components/components.ai.json') as { components: Recs['comps'] }).components,
    guaranteed: contract.guaranteed,
    deprecated: new Map((contract.deprecations ?? []).map((x) => [x.path, x.replacedBy])),
    ledger,
  };
};

const changes = (b: Recs, h: Recs): Item[] => {
  const got: Item[] = [];
  const add = (i: Item): void => { got.push(i); };
  // Figma sets.
  for (const id of new Set([...Object.keys(b.axes), ...Object.keys(h.axes)])) {
    const was = b.axes[id], now = h.axes[id];
    if (!was) { add({ area: 'figma', kind: 'set-added', component: id }); continue; }
    if (!now) { add({ area: 'figma', kind: 'set-removed', component: id }); continue; }
    const rename = (kind: string, name: string, axis?: string): string => {
      let at = name; const seen = new Set<string>();
      while (!seen.has(at)) {
        seen.add(at);
        const r = h.ledger.find((x) => x.def === id && x.kind === kind && x.from === at && (axis === undefined || x.axis === axis));
        if (!r?.to) break;
        at = r.to;
      }
      return at;
    };
    const landed = new Set<string>();
    for (const axis of Object.keys(was.axes)) {
      const to = rename('axis', axis);
      if (!(to in now.axes)) { add({ area: 'figma', kind: 'axis-removed', component: id, property: axis }); continue; }
      landed.add(to);
      if (to !== axis) add({ area: 'figma', kind: 'axis-renamed', component: id, from: axis, to });
      const kept = new Set<string>(); const gone: string[] = [];
      for (const v of was.axes[axis]) {
        const w = rename('value', v, to);
        if (now.axes[to].includes(w)) { kept.add(w); if (w !== v) add({ area: 'figma', kind: 'value-renamed', component: id, property: to, from: v, to: w }); }
        else gone.push(v);
      }
      if (gone.length) add({ area: 'figma', kind: 'value-removed', component: id, property: to, values: gone });
      const fresh = now.axes[to].filter((w) => !kept.has(w));
      if (fresh.length) add({ area: 'figma', kind: 'value-added', component: id, property: to, values: fresh });
    }
    for (const axis of Object.keys(now.axes)) if (!landed.has(axis)) add({ area: 'figma', kind: 'axis-added', component: id, property: axis });
  }
  const said = new Set(got.map((i) => i.component));
  const digestMoved = new Set(Object.keys({ ...b.surface, ...h.surface })
    .filter((k) => JSON.stringify(b.surface[k] ?? null) !== JSON.stringify(h.surface[k] ?? null)).map((k) => k.split('@')[0]));
  for (const id of digestMoved) if (!said.has(id) && b.axes[id] && h.axes[id]) add({ area: 'figma', kind: 'set-rebuilt', component: id });
  // Coded components.
  for (const id of new Set([...Object.keys(b.comps), ...Object.keys(h.comps)])) {
    const was = b.comps[id], now = h.comps[id];
    if (!was) { add({ area: 'code', kind: 'component-added', component: id }); continue; }
    if (!now) { add({ area: 'code', kind: 'component-removed', component: id }); continue; }
    const p0 = new Map((was.props ?? []).map((p) => [p.name, p])), p1 = new Map((now.props ?? []).map((p) => [p.name, p]));
    for (const name of new Set([...p0.keys(), ...p1.keys()])) {
      const p = p0.get(name), q = p1.get(name);
      if (!p) { add({ area: 'code', kind: 'prop-added', component: id, property: name }); continue; }
      if (!q) { add({ area: 'code', kind: 'prop-removed', component: id, property: name }); continue; }
      const out = (p.values ?? []).filter((v) => !(q.values ?? []).includes(v));
      const inn = (q.values ?? []).filter((v) => !(p.values ?? []).includes(v));
      if (out.length) add({ area: 'code', kind: 'prop-value-removed', component: id, property: name, values: out });
      if (inn.length) add({ area: 'code', kind: 'prop-value-added', component: id, property: name, values: inn });
      if (p.values === undefined && q.values === undefined && (p.type ?? '') !== (q.type ?? '')) add({ area: 'code', kind: 'prop-retyped', component: id, property: name, from: p.type ?? '', to: q.type ?? '' });
      if (JSON.stringify(p.default ?? null) !== JSON.stringify(q.default ?? null)) add({ area: 'code', kind: 'prop-default', component: id, property: name, from: String(p.default ?? ''), to: String(q.default ?? '') });
    }
  }
  // Guaranteed tokens.
  for (const path of new Set([...Object.keys(b.guaranteed), ...Object.keys(h.guaranteed)])) {
    const t0 = b.guaranteed[path], t1 = h.guaranteed[path];
    if (t0 === undefined) add({ area: 'tokens', kind: 'token-added', token: path });
    else if (t1 === undefined) add({ area: 'tokens', kind: 'token-removed', token: path, ...(h.deprecated.has(path) ? { to: h.deprecated.get(path) } : {}) });
    else if (t0 !== t1) add({ area: 'tokens', kind: 'token-retyped', token: path, from: t0, to: t1 });
  }
  return got.map((i) => ({ ...i, class: CLASS_OF[i.kind] }));
};

// ---- the history ---------------------------------------------------------------------------------
// A fold is a commit with ONE parent that sets the version. `main` is squash-only, so a commit with two
// parents is a feature branch merging `main`; read against its first parent (the branch) it moves the
// version, and `--first-parent` took it for the fold, so a branch that merged `main` across a fold was
// checked against a diff holding the branch's own changes. So: the whole history, each record's parents
// printed, and any record with more than one parent skipped here rather than trusted to a git flag.
const folds = new Map<string, string>();
{
  const r = git('log', '-U0', '--format=%x00%H %P', '-G', 'ENGINE_VERSION = ', 'HEAD', '--', 'packages/engine/version.ts');
  if (!r.ok) cannotRun('git log failed');
  for (const rec of r.out.split('\0')) {
    const [sha, ...parents] = rec.split('\n')[0].trim().split(/\s+/);
    if (!sha || parents.length !== 1) continue;
    const v = /^\+export const ENGINE_VERSION = '(\d+\.\d+\.\d+)'/m.exec(rec)?.[1];
    if (v && !folds.has(v)) folds.set(v, sha);
  }
}
if (!folds.size) cannotRun('no single-parent commit in HEAD\'s history sets ENGINE_VERSION');
const working = versionIn(fileAt(null, 'packages/engine/version.ts'));
if (!working) cannotRun('cannot read ENGINE_VERSION in the working tree');
/** Where a version's tree is: its fold commit, or the working tree for a fold not yet committed. */
const headOf = (v: string): string | null | undefined => folds.has(v) ? folds.get(v)! : v === working ? null : undefined;

const fails: string[] = [];
const fail = (arm: string, line: string): void => { fails.push(`${arm} — ${line}`); };

// ---- SCOPE: the files, the index and the assigned versions agree ----------------------------------
const files = existsSync(join(repo, DIR)) ? readdirSync(join(repo, DIR)) : [];
const onDisk = files.filter((f) => /^\d+\.\d+\.\d+\.json$/.test(f)).map((f) => f.slice(0, -'.json'.length));
const index = existsSync(join(repo, DIR, 'index.json')) ? JSON.parse(readFileSync(join(repo, DIR, 'index.json'), 'utf8')) as { releases: { version: string; from: string; date: string; md: string; json: string; counts: Record<string, number>; highlights: { component: string; class: string; text: string }[] }[] } : { releases: [] };
const indexed = index.releases.map((e) => e.version);
for (const v of onDisk) if (!indexed.includes(v)) fail('INDEX', `${DIR}/${v}.json is not in index.json`);
for (const v of indexed) if (!onDisk.includes(v)) fail('INDEX', `index.json lists ${v}, and ${DIR}/${v}.json does not exist`);
for (const v of onDisk) if (!files.includes(`${v}.md`)) fail('INDEX', `${DIR}/${v}.json has no ${v}.md beside it`);
if (!files.includes('index.md')) fail('INDEX', `${DIR}/index.md is missing`);
else for (const v of indexed) if (!readFileSync(join(repo, DIR, 'index.md'), 'utf8').includes(`[${v}](${v}.md)`)) fail('INDEX', `index.md has no link to ${v}.md`);
const assigned = new Set([...folds.keys(), working!].filter((v) => cmpVersion(v, FLOOR) >= 0));
for (const v of assigned) if (!onDisk.includes(v)) fail('REPRESENTED', `ENGINE_VERSION ${v} is assigned (${folds.has(v) ? `fold ${folds.get(v)!.slice(0, 8)}` : 'the working tree'}) and has no release notes — the fold writes them; for a version already folded, \`npx tsx packages/engine/release-notes.ts --version ${v}\``);

// ---- each release against git ---------------------------------------------------------------------
const report: string[] = [];
for (const v of onDisk.sort(cmpVersion)) {
  const rel = JSON.parse(readFileSync(join(repo, DIR, `${v}.json`), 'utf8')) as { version: string; from: string; base: string; date: string; counts: Record<string, number>; items: Item[]; notes: { slug: string; level: string; prose: string }[] };
  const at = headOf(v);
  if (at === undefined) { fail('CLAIMED, NOT IN THE DIFF', `${v}: no single-parent commit in HEAD's history sets ENGINE_VERSION to ${v}, and the working tree is ${working}`); continue; }
  const from = versionIn(fileAt(at === null ? 'HEAD' : `${at}^1`, 'packages/engine/version.ts'));
  if (rel.version !== v) fail('INDEX', `${v}.json says it is ${rel.version}`);
  if (!from || rel.from !== from) { fail('NOTES', `${v}: the notes say they follow ${rel.from}; git says ${from ?? '(unreadable)'}`); continue; }
  const base = folds.get(from);
  if (!base) { fail('NOTES', `${v}: no fold commit sets ${from}`); continue; }
  // The date: no earlier than the fold this one follows, no later than its own fold (UTC days, as the
  // fold writes them). A fold not yet committed is bounded by today.
  const day = (sha: string): string => new Date(git('show', '-s', '--format=%cI', sha).out.trim()).toISOString().slice(0, 10);
  const lo = day(base), hi = at === null ? new Date().toISOString().slice(0, 10) : day(at);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rel.date ?? '') || rel.date < lo || rel.date > hi) fail('DATE', `${v}: the notes are dated ${rel.date}; git puts this fold between ${lo} (${from}'s fold, ${base.slice(0, 8)}) and ${hi} (${at === null ? 'today, the working tree' : `its own fold, ${at.slice(0, 8)}`})`);
  if (rel.base !== base) fail('NOTES', `${v}: the notes start from ${rel.base?.slice(0, 8)}; the fold that set ${from} is ${base.slice(0, 8)}`);

  const expected = changes(await recordsAt(base), await recordsAt(at));
  const want = new Map(expected.map((i) => [identity(i), i]));
  const have = new Map(rel.items.map((i) => [identity(i), i]));
  for (const [k, i] of want) {
    const h = have.get(k);
    if (!h) fail(i.class === 'breaking' ? 'BREAKING CHANGE MISSING' : 'MISSING', `${v}: ${i.class} ${k}`);
    else if (h.class !== i.class) fail('MISCLASSIFIED', `${v}: ${k} is ${i.class} by the rule; the notes call it ${h.class}`);
  }
  for (const [k, h] of have) if (!want.has(k)) fail('CLAIMED, NOT IN THE DIFF', `${v}: ${h.class} ${k}`);
  // The sentence names what it is about: the set or the coded component's name, the property, each value, the token.
  const headRecs = await recordsAt(at);
  const names = headRecs.comps;
  const baseNames = (await recordsAt(base)).comps;
  for (const i of rel.items) {
    const subject = i.area === 'code' ? (names[i.component!] ?? baseNames[i.component!])?.name : i.component;
    const must = [subject, i.property, i.token, i.kind.endsWith('renamed') || i.kind === 'token-removed' ? i.to : undefined, ...(i.values ?? [])].filter((x): x is string => !!x);
    for (const m of must) if (!(i.text ?? '').includes(m)) fail('TEXT', `${v}: "${i.text}" does not name ${m}`);
    const said = prose(i.text ?? ''), cls = CLASS_OF[i.kind];
    if (!SAYS[i.kind]?.test(said)) fail('TEXT', `${v}: "${i.text}" does not say what ${i.kind} says happened (${SAYS[i.kind] ?? 'no such kind'})`);
    else if (cls && NOT_IN[cls].test(said)) fail('TEXT', `${v}: "${i.text}" is ${i.kind}, ${cls}, and says ${NOT_IN[cls].exec(said)![0]}`);
    // A token's type, read from the contract at the fold rather than from the item: `is a new .*token`
    // accepted any type word, so a dimension token called a color token passed.
    const typed = i.kind === 'token-added' ? [`is a new ${headRecs.guaranteed[i.token!]} token`]
      : i.kind.endsWith('-retyped') ? [`from ${i.from}`, `to ${i.to}`] : [];
    for (const t of typed) if (!(i.text ?? '').replace(/`/g, '').includes(t)) fail('TEXT', `${v}: "${i.text}" does not say "${t}"`);
  }
  const counts = { breaking: 0, new: 0, fix: 0 } as Record<string, number>;
  for (const i of rel.items) counts[i.class!] = (counts[i.class!] ?? 0) + 1;
  for (const c of ['breaking', 'new', 'fix']) if (rel.counts[c] !== counts[c]) fail('INDEX', `${v}.json counts ${rel.counts[c]} ${c}; its items hold ${counts[c]}`);

  // The page: its list lines, before "In detail", are the items' sentences, no more and no fewer.
  const md = readFileSync(join(repo, DIR, `${v}.md`), 'utf8');
  const top = md.split('\n## In detail')[0];
  const lines = top.split('\n').filter((l) => l.startsWith('- ') && !/^- \*\*(Breaking|New|Fix):\*\*/.test(l)).map((l) => l.slice(2));
  const texts = rel.items.map((i) => i.text ?? '');
  for (const t of texts) if (!lines.includes(t)) fail('MARKDOWN', `${v}.md does not list "${t}"`);
  for (const l of lines) if (!texts.includes(l)) fail('MARKDOWN', `${v}.md lists "${l}", which is not an item in ${v}.json`);
  for (const n of rel.notes) if (!md.includes(n.prose)) fail('MARKDOWN', `${v}.md does not carry the change note ${n.slug}`);

  // The folded notes: exactly the ones this version's fold deleted, as they read before it.
  const before = at === null ? 'HEAD' : `${at}^1`;
  const del = at === null ? git('diff', '--name-only', '--no-renames', '--diff-filter=D', 'HEAD', '--', 'packages/engine/changes') : git('diff', '--name-only', '--no-renames', '--diff-filter=D', before, at, '--', 'packages/engine/changes');
  const folded = new Map(del.out.split('\n').map((p) => p.trim()).filter((p) => p.endsWith('.md') && !p.endsWith('README.md')).map((p) => {
    const m = /^---\nengine:\s*(\S+)\s*\n---\n([\s\S]*)$/.exec((fileAt(before, p) ?? '').replace(/\r\n/g, '\n'));
    return [p.slice(p.lastIndexOf('/') + 1, -3), { level: m?.[1] ?? '?', prose: (m?.[2] ?? '').trim().split('{{ENGINE_VERSION}}').join(v) }];
  }));
  for (const [slug, n] of folded) {
    const got = rel.notes.find((x) => x.slug === slug);
    if (!got) fail('NOTES', `${v}: its fold folded ${slug}, and the notes do not carry it`);
    else if (got.level !== n.level || got.prose !== n.prose) fail('NOTES', `${v}: ${slug} does not read as the note its fold folded`);
  }
  for (const n of rel.notes) if (!folded.has(n.slug)) fail('NOTES', `${v}: the notes carry ${n.slug}, which its fold did not fold`);

  // The index entry, which the plugin reads: the release's own counts, and its breaking and new Figma items.
  const e = index.releases.find((x) => x.version === v);
  if (e) {
    if (e.from !== rel.from || e.date !== rel.date || e.md !== `${v}.md` || e.json !== `${v}.json`) fail('INDEX', `index.json's entry for ${v} does not match ${v}.json`);
    for (const c of ['breaking', 'new', 'fix']) if (e.counts?.[c] !== counts[c]) fail('INDEX', `index.json counts ${e.counts?.[c]} ${c} for ${v}; its items hold ${counts[c]}`);
    const hl = rel.items.filter((i) => i.area === 'figma' && i.class !== 'fix').map((i) => `${i.class}|${i.component}|${i.text}`);
    const got = (e.highlights ?? []).map((x) => `${x.class}|${x.component}|${x.text}`);
    if (JSON.stringify([...hl].sort()) !== JSON.stringify([...got].sort())) fail('INDEX', `index.json's highlights for ${v} are not its breaking and new Figma items (${got.length} listed, ${hl.length} owed)`);
  }
  report.push(`  ${v}: ${expected.length} change(s) in ${base.slice(0, 8)}..${at === null ? 'the working tree' : at.slice(0, 8)} — ${counts.breaking} breaking, ${counts.new} new, ${counts.fix} fix; ${rel.notes.length} change note(s)`);
}

console.log(`release notes (#2650): ${onDisk.length} release(s) in ${DIR}/, checked against git from ${FLOOR}`);
for (const l of report) console.log(l);
if (fails.length) {
  console.error(`\n❌ lint-release-notes — ${fails.length} problem(s):`);
  for (const f of fails) console.error(`  ${f}`);
  console.error('\n  The notes are generated: rewrite them with `npx tsx packages/engine/release-notes.ts --version <v>` for a folded');
  console.error('  version, or `--refresh` in a fold PR, rather than by hand. A change the notes miss is a change the reader is not told about.');
  process.exit(1);
}
console.log('  ✓ every release lists exactly the changes git shows, classified by the rule');
