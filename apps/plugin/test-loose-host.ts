/**
 * THE STRICT HOST IS THE SHIM'S DEFAULT (#3215, owner decision Q-C8 A).
 *
 *   npx tsx apps/plugin/test-loose-host.ts
 *
 * #3209 passed every gate and broke every Update on real Figma: the shim's host was a plain object, where Figma's
 * methods are own data properties that are neither writable nor configurable, so a `Proxy` that handed back a bound
 * copy threw on the host and passed in every test. #3214 added `fixHostMethods` as an opt-in for three arms. Since
 * #3215 `makeShim` fixes its host and root by default, as `host-descriptors.json` records the real host, and a suite
 * that patches a host method after building the shim opts out with `looseHost: '<reason>'`.
 *
 * This suite holds four promises:
 *   · strict/…       a default shim's host and root methods are fixed, and a Proxy that substitutes one throws the
 *                    invariant #3209 threw. EXPECTED is literal (the property names and #3209's message), never read
 *                    from `host-descriptors.json`, which is what the shim reads (docs/34 shape 1).
 *   · loose/…        the opt-out works, and only with a reason.
 *   · register/…     every file that opts out is in `loose-host-register.json` with its reason, every entry still
 *                    opts out, and the register can only SHRINK: an entry that is not in the register at the merge
 *                    base fails by name. The base is read from git history, never from the tree, because a ceiling
 *                    in the tree is edited in the same commit as the entry it should refuse (docs/34 shape 6). Until
 *                    the register reached main, the base is SEED below: the suites measured failing strict on main
 *                    fa3c934b, each run alone with the strict default and no opt-out. The register is PER SUITE, as
 *                    Q-C8 A decided ("register of suites"): a listed suite can add more `looseHost` call sites and
 *                    nothing here fails. What it holds is that no new suite opts out.
 *   · descriptors/…  the fixture says what was measured, and the shim models nodes as the fixture records them: the
 *                    day a real-host reading says node methods are fixed, `descriptors/node` fails until the shim
 *                    fixes its nodes too.
 *
 * BY-NAME MUTATIONS (proven red, then restored, in the PR): the default dropped (`makeShim` fixes nothing unless asked)
 * → `strict/figma`, `strict/root`, `strict/assign`, `strict/proxy`; a new register entry (with a suite that opts out
 * to match) → `register/shrink-only`; an unlisted suite that opts out by shorthand, with the register untouched
 * (`const looseHost = '…'; makeShim({ looseHost, … })` in `test-cover-frame.ts`) → `register/unlisted`.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeShim } from './component-shim';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const REGISTER_PATH = 'apps/plugin/loose-host-register.json';
const DESCRIPTORS_PATH = 'apps/plugin/host-descriptors.json';

/** The suites that failed the strict host on main fa3c934b, measured one by one. The bootstrap base only: once the
 *  register is on main, the base is the register at the merge base. Delete a name here when its entry leaves the
 *  register; never add one. */
const SEED = [
  'test-build-completed.ts', 'test-native-slots.ts', 'test-open-large-file.ts', 'test-roundtrip.ts', 'test-run-progress.ts',
  'test-run-read.ts', 'test-slot-constraints.ts', 'test-update-apply.ts', 'test-update-fresh.ts', 'test-write-components.ts',
];

let failures = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed += 1;
  if (cond) console.log(`  ✓ ${label}`);
  else { failures += 1; console.log(`  ✗ ${label}`); }
};
const section = (t: string) => console.log(`\n${t}`);
const fixed = (o: object, k: string): boolean => {
  const d = Object.getOwnPropertyDescriptor(o, k);
  return !!d && 'value' in d && typeof d.value === 'function' && d.writable === false && d.configurable === false;
};

/* ── strict ─────────────────────────────────────────────────────────────────────────────────────────── */
section('strict — a default shim fixes its host and root methods, as Figma fixes figma\'s (#3209)');
{
  const shim = makeShim() as Record<string, unknown> & { root: Record<string, unknown> };
  // Literal names: the method #3209 threw on, two siblings on the host, and the root's search #3214's mutation named.
  const hostNames = ['getLocalTextStylesAsync', 'loadFontAsync', 'combineAsVariants'];
  const loose = hostNames.filter((k) => !fixed(shim, k));
  ok(loose.length === 0, `strict/figma: ${hostNames.join(', ')} are own data properties, neither writable nor configurable (loose: ${loose.join(', ') || 'none'})`);
  const allFns = Reflect.ownKeys(shim).filter((k) => typeof k === 'string' && typeof shim[k] === 'function') as string[];
  const looseAll = allFns.filter((k) => !fixed(shim, k));
  ok(allFns.length > 10 && looseAll.length === 0, `strict/figma-all: every one of the host's ${allFns.length} methods is fixed (loose: ${looseAll.join(', ') || 'none'})`);
  ok(fixed(shim.root, 'findAllWithCriteria'), 'strict/root: root.findAllWithCriteria is fixed');
  let threw = '';
  try { (shim as Record<string, unknown>).loadFontAsync = async () => undefined; } catch (e) { threw = (e as Error).message; }
  ok(/read only|read-only/.test(threw), `strict/assign: reassigning a host method throws, as in Figma (${threw || 'it did not throw'})`);
  // #3209's wrapper, reproduced: a Proxy whose get trap hands back a bound copy of each method.
  const wrapped = new Proxy(shim, { get: (t, k) => { const v = Reflect.get(t, k); return typeof v === 'function' ? v.bind(t) : v; } });
  let invariant = '';
  try { void (wrapped as Record<string, unknown>).getLocalTextStylesAsync; } catch (e) { invariant = (e as Error).message; }
  ok(/'getLocalTextStylesAsync' is a read-only and non-configurable data property on the proxy target/.test(invariant),
    `strict/proxy: a Proxy that hands back a bound copy throws #3209's invariant (${invariant.slice(0, 160) || 'it did not throw'})`);
}

/* ── loose ──────────────────────────────────────────────────────────────────────────────────────────── */
section('loose — the opt-out works, and only with a reason');
{
  const shim = makeShim({ looseHost: 'test-loose-host: the opt-out itself' }) as Record<string, unknown> & { root: Record<string, unknown> };
  const d = Object.getOwnPropertyDescriptor(shim, 'getLocalTextStylesAsync');
  ok(!!d && d.writable === true && !fixed(shim.root, 'findAllWithCriteria'), 'loose/opt-out: looseHost leaves the host and root plain');
  let refused = '';
  try { makeShim({ looseHost: '  ' }); } catch (e) { refused = (e as Error).message; }
  ok(/looseHost needs a reason/.test(refused), `loose/reason: an empty reason is refused (${refused || 'it was accepted'})`);
}

/* ── register ───────────────────────────────────────────────────────────────────────────────────────── */
section('register — every opt-out is registered, and the register only shrinks');
type Register = { entries: Record<string, string> };
const register = JSON.parse(readFileSync(resolve(REPO, REGISTER_PATH), 'utf8')) as Register;
const entries = Object.keys(register.entries);
{
  // Every source under apps/, packages/ and tools/ that names `looseHost` at all, by file name: a literal, a variable,
  // a passthrough (`looseHost: o.reason`) or the shorthand `{ looseHost }` all opt out, since the shim honors any
  // value. It errs toward over-listing: a comment that says `looseHost` counts too.
  const SKIP = new Set(['node_modules', 'dist', 'release', 'release-offline', 'out', '.git']);
  const SELF = new Set(['apps/plugin/component-shim.ts', 'apps/plugin/test-loose-host.ts']);
  const users = new Map<string, number>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(ts|mts|mjs|js)$/.test(name)) continue;
      const rel = relative(REPO, p).split('\\').join('/');
      if (SELF.has(rel)) continue;
      const n = (readFileSync(p, 'utf8').match(/\blooseHost\b/g) ?? []).length;
      if (n) users.set(rel, n);
    }
  };
  for (const top of ['apps', 'packages', 'tools']) walk(resolve(REPO, top));
  const nameOf = (rel: string) => (rel.startsWith('apps/plugin/') ? rel.slice('apps/plugin/'.length) : rel);
  const using = [...users.keys()].map(nameOf).sort();
  const unlisted = using.filter((f) => !(f in register.entries));
  ok(unlisted.length === 0, `register/unlisted: every file that opts out is in ${REGISTER_PATH} (${using.length} opt out; unlisted: ${unlisted.join(', ') || 'none'})`);
  const stale = entries.filter((f) => !using.includes(f));
  ok(stale.length === 0, `register/stale: every entry still opts out; delete one that does not (stale: ${stale.join(', ') || 'none'})`);
  const blank = entries.filter((f) => !String(register.entries[f] ?? '').trim());
  ok(blank.length === 0, `register/reason: every entry says why (blank: ${blank.join(', ') || 'none'})`);

  // The base: the register at the merge base, from git history.
  const git = (...args: string[]) => {
    const r = spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
  };
  const prBase = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null;
  const baseRef = [prBase, 'origin/main', 'main'].filter((x): x is string => !!x).find((r) => git('rev-parse', '--verify', '--quiet', `${r}^{commit}`).ok) ?? null;
  const mb = baseRef ? git('merge-base', 'HEAD', baseRef) : null;
  const head = git('rev-parse', 'HEAD');
  // On the base branch itself the merge base is HEAD, so compare with the first parent (as lint-executor-revision does, #2551).
  const baseRev = mb?.ok && head.ok ? (mb.out === head.out ? git('rev-parse', '--verify', '--quiet', 'HEAD^1').out : mb.out) : '';
  if (!baseRev) {
    ok(false, `register/shrink-only: CANNOT RUN — no merge base (base ref ${baseRef ?? 'none'}: ${mb?.err || head.err || 'git printed nothing'}). Fetch origin main; CI's plugin job has fetch-depth 0.`);
  } else {
    const listed = git('ls-tree', '--name-only', baseRev, '--', REGISTER_PATH);
    const atBase = listed.ok && listed.out ? git('show', `${baseRev}:${REGISTER_PATH}`) : null;
    let base: string[] | null = null;
    let label = '';
    if (!listed.ok) label = `CANNOT RUN — ${listed.err}`;
    else if (atBase === null) { base = SEED; label = `the seed (the register is not at ${baseRev.slice(0, 8)} yet)`; }
    else if (!atBase.ok) label = `CANNOT RUN — ${atBase.err}`;
    else { base = Object.keys((JSON.parse(atBase.out) as Register).entries); label = `the register at ${baseRev.slice(0, 8)}`; }
    if (!base) ok(false, `register/shrink-only: ${label}`);
    else {
      const added = entries.filter((f) => !base!.includes(f) || !SEED.includes(f));
      ok(added.length === 0, `register/shrink-only: no entry that is not in ${label} or the seed (${entries.length} now, ${base.length} at the base; added: ${added.join(', ') || 'none'})`);
    }
  }
}

/* ── descriptors ────────────────────────────────────────────────────────────────────────────────────── */
section('descriptors — the fixture records the real host, and the shim models what it records');
{
  type Surface = { methods: string; provenance: string; source: string };
  const d = JSON.parse(readFileSync(resolve(REPO, DESCRIPTORS_PATH), 'utf8')) as Record<'figma' | 'root' | 'node', Surface>;
  ok(d.figma?.methods === 'fixed' && d.figma.provenance === 'measured' && /getLocalTextStylesAsync/.test(d.figma.source),
    `descriptors/figma: the fixture records figma's methods fixed, measured by #3209's error (${d.figma?.methods}, ${d.figma?.provenance})`);
  const known = (['figma', 'root', 'node'] as const).filter((k) => ['fixed', 'plain'].includes(d[k]?.methods) && ['measured', 'assumed', 'unmeasured'].includes(d[k]?.provenance));
  ok(known.length === 3, `descriptors/shape: every surface says fixed or plain, and measured, assumed or unmeasured (${known.join(', ')})`);
  const node = (makeShim() as { createFrame(): Record<string, unknown> }).createFrame();
  const nodeFns = Reflect.ownKeys(node).filter((k) => typeof k === 'string' && typeof node[k] === 'function') as string[];
  const nodeFixed = nodeFns.filter((k) => fixed(node, k));
  ok(d.node?.methods === 'fixed' ? nodeFns.length > 0 && nodeFixed.length === nodeFns.length : true,
    `descriptors/node: the shim's nodes match the fixture (fixture: ${d.node?.methods}, ${d.node?.provenance}; ${nodeFixed.length} of ${nodeFns.length} node methods fixed)`);
}

console.log(failures ? `\n❌ ${failures} FAILED — ${executed} assertions executed` : `\n✅ ALL PASS — ${executed} assertions executed`);
if (failures) process.exit(1);
