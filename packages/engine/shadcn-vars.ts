/**
 * Prism3 — THE PINNED SHADCN VARIABLE SET, AND ITS GATE (#2997 gate 3).
 *
 *   npx tsx packages/engine/shadcn-vars.ts --check                      # the gate (the default)
 *   npx tsx packages/engine/shadcn-vars.ts --check --upstream <file>    # also hold the pin to an upstream theme item
 *   npx tsx packages/engine/shadcn-vars.ts --accept --from <file>       # rewrite the pin, after raising the map version
 *                                                                        # (both take --target <id>; one target today)
 *
 * shadcn/ui's theme variable names are an external contract Prism3 does not control. `schema/shadcn-vars.json` pins the
 * set the role map (`projections/shadcn.ts`) targets, with the source it was read from and the map version it was read
 * for. This gate holds three things:
 *
 *   1. MAP ↔ PIN, both ways. A pinned name the map does not emit fails `UNMAPPED <name>`; a map key outside the pin
 *      fails `UNPINNED <name>` unless `SHADCN_EXTRAS` names it with its decision; an extra that the pin now carries
 *      fails `EXTRA NOW PINNED <name>`, since it is no longer extra.
 *   2. THE VERSION. The pin's `mapVersion` must equal `SHADCN_MAP_VERSION`: a raised version with no `--accept`, or an
 *      accepted pin under an unraised one, fails `MAP VERSION`.
 *   4. PIN ↔ THE BASE'S PIN, read from git at the merge base (`comparison-base.ts`), as `lint-contract-version.ts` reads
 *      `CONTRACT_VERSION`: a name added since needs a MINOR raise over the base's `mapVersion`, a dropped name a MAJOR
 *      one, and with no name moved the number stays the base's. `PIN MOVED WITHOUT A … RAISE`, `MAP VERSION BELOW THE
 *      BASE`, `MAP VERSION RAISED WITH NO NAME MOVED`. Its rule runs first against literal cases (`BASE_SELF_CHECK`).
 *      The base comes by `lint-contract-version.ts`'s ladder: the merge group's parent first (`MERGE_GROUP_BASE_SHA`,
 *      #4106; lost, it CANNOT RUN), then `GITHUB_BASE_REF` fetched again in CI, then `origin/main`. `lint-push-base.ts`
 *      replays main's push run and the merge-queue run against this arm.
 *   3. PIN ↔ UPSTREAM, when an upstream file is given: a shadcn `registry:theme` item's `cssVars.light` and
 *      `cssVars.dark` names against the pin, `UPSTREAM ADDED <name> (<mode>)` and `UPSTREAM DROPPED <name> (<mode>)`.
 *      The arm runs every time against a planted stand-in (the pin plus one name, less one name), so it is proven to
 *      fire even where no upstream file is given.
 *
 * WHY THE BASELINE CANNOT AGREE WITH ITSELF (docs/34 shape 6). Only `--accept` writes the pin, never `regen`, and
 * `--accept` refuses unless `SHADCN_MAP_VERSION` is above the pinned one. A gate allowed to rewrite what it reads has no
 * memory, and arm 2 alone has none either: the pin and the constant are both in the tree under check, so a hand edit of
 * both reads as consistent. Arm 4 is the memory: the base's pin comes from git, so the pin moves only with a raise
 * over the base's number, which a reviewer sees.
 *
 * PER TARGET (Q2997.6 B). The gate iterates `projections/targets.ts`; shadcn is its one entry today. With one target the
 * failure names are unprefixed; with more, each is prefixed with its target's id. `--upstream` and `--accept` take
 * `--target <id>`, defaulting to the one target while there is one.
 *
 * UPSTREAM IS NOT READ OFFLINE YET. Q2997.18 A was "pin shadcn as a devDependency and read its set offline", on the
 * condition that the package carries the set. It does not: shadcn 4.23.0 and its `@shadcn/registry` 0.2.1 ship the CLI,
 * the registry schema and `tailwind.css`, and no theme variable list (the set lives in the hosted registry, e.g.
 * `r/styles/new-york-v4/theme-neutral.json`). So the devDependency would read nothing, and the CI run reports the
 * upstream arm as NOT CHECKED rather than as a pass. Flagged on #2997 for the owner.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { comparisonBase, mergeGroupBase } from './comparison-base.ts';
import { PROJECTION_TARGETS, type ProjectionTarget } from './projections/targets.ts';
import { satisfiesBump } from './version.ts';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, '..', '..');
const pinFile = (t: ProjectionTarget): string => resolve(REPO, t.pinPath);
/** The shadcn pin, for the callers that read it directly. */
export const PIN_PATH = pinFile(PROJECTION_TARGETS.find((t) => t.id === 'shadcn')!);

export type Pin = { note: string; mapVersion: string; source: string; readOn: string; light: string[]; dark: string[] };

const byCodePoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The two name lists a `registry:theme` item carries, sorted. Throws when the file is not one. */
export const itemNames = (item: unknown, label: string): { light: string[]; dark: string[] } => {
  const vars = (item as { cssVars?: { light?: object; dark?: object } } | null)?.cssVars;
  if (!vars?.light || !vars.dark) throw new Error(`${label}: no cssVars.light and cssVars.dark — not a shadcn theme item`);
  return { light: Object.keys(vars.light).sort(byCodePoint), dark: Object.keys(vars.dark).sort(byCodePoint) };
};

/** Arm 3: the pin against an upstream item's names. */
export const upstreamDiff = (pin: { light: string[]; dark: string[] }, up: { light: string[]; dark: string[] }): string[] => {
  const out: string[] = [];
  for (const mode of ['light', 'dark'] as const) {
    const have = new Set(pin[mode]), want = new Set(up[mode]);
    for (const n of up[mode]) if (!have.has(n)) out.push(`UPSTREAM ADDED ${n} (${mode})`);
    for (const n of pin[mode]) if (!want.has(n)) out.push(`UPSTREAM DROPPED ${n} (${mode})`);
  }
  return out;
};

/** Arms 1 and 2. */
export const pinFailures = (pin: Pin, mapKeys: readonly string[], extras: Readonly<Record<string, string>>, mapVersion: string): string[] => {
  const out: string[] = [];
  const pinned = new Set([...pin.light, ...pin.dark]);
  const keys = new Set(mapKeys);
  for (const n of [...pinned].sort(byCodePoint)) if (!keys.has(n)) out.push(`UNMAPPED ${n}`);
  for (const k of [...keys].sort(byCodePoint)) if (!pinned.has(k) && !(k in extras)) out.push(`UNPINNED ${k}`);
  for (const k of Object.keys(extras).sort(byCodePoint)) {
    if (pinned.has(k)) out.push(`EXTRA NOW PINNED ${k} (take it out of SHADCN_EXTRAS)`);
    if (!keys.has(k)) out.push(`EXTRA NOT MAPPED ${k}`);
  }
  if (pin.mapVersion !== mapVersion) out.push(`MAP VERSION ${mapVersion} ≠ pinned ${pin.mapVersion} (raise it and --accept together)`);
  return out;
};

type Level = 'none' | 'minor' | 'major';
const semver = (v: string): [number, number, number] | null => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};

/**
 * Arm 4, THE BASE: the pin against itself at the merge base, read from git. Both `mapVersion` and the map's constant
 * live in the tree under check, so arm 2 alone cannot tell a hand edit of both from an accepted move. Here the "was" is
 * the base's pin: a name added since needs at least a MINOR raise over the base's `mapVersion`, a name dropped a MAJOR
 * one, and when no name moved the number stays the base's (a remap moves values, not names, #2997 §9). A number below
 * the base's always fails. `was` null means the pin is new on this branch: nothing to compare.
 */
export const pinBaseFailures = (was: Pick<Pin, 'mapVersion' | 'light' | 'dark'> | null, now: Pick<Pin, 'mapVersion' | 'light' | 'dark'>): string[] => {
  if (!was) return [];
  const names = (p: Pick<Pin, 'light' | 'dark'>): Set<string> => new Set([...p.light.map((n) => `${n} (light)`), ...p.dark.map((n) => `${n} (dark)`)]);
  const before = names(was), after = names(now);
  const added = [...after].filter((n) => !before.has(n)).sort(byCodePoint);
  const dropped = [...before].filter((n) => !after.has(n)).sort(byCodePoint);
  const level: Level = dropped.length ? 'major' : added.length ? 'minor' : 'none';
  const w = semver(was.mapVersion), n = semver(now.mapVersion);
  if (!w || !n) return [`MAP VERSION NOT SEMVER ${was.mapVersion} → ${now.mapVersion}`];
  const order = n[0] !== w[0] ? n[0] - w[0] : n[1] !== w[1] ? n[1] - w[1] : n[2] - w[2];
  const moved = [...dropped.map((x) => `DROPPED ${x}`), ...added.map((x) => `ADDED ${x}`)].join(', ');
  if (order < 0) return [`MAP VERSION BELOW THE BASE ${now.mapVersion} < ${was.mapVersion}`];
  if (level === 'none') return order > 0 ? [`MAP VERSION RAISED WITH NO NAME MOVED ${was.mapVersion} → ${now.mapVersion}`] : [];
  const ok = level === 'major' ? satisfiesBump(was.mapVersion, now.mapVersion, 'major') : satisfiesBump(was.mapVersion, now.mapVersion, 'minor');
  return ok ? [] : [`PIN MOVED WITHOUT A ${level.toUpperCase()} RAISE ${was.mapVersion} → ${now.mapVersion} since the base: ${moved}`];
};

/** Arm 4's rule against literal expectations, so a rule that stopped refusing cannot read the real tree as clean. */
const BASE_SELF_CHECK: Array<{ label: string; was: [string, string[]]; now: [string, string[]]; ok: boolean }> = [
  { label: 'a name added at the base\'s number', was: ['1.0.0', ['a']], now: ['1.0.0', ['a', 'b']], ok: false },
  { label: 'a name added with a patch raise', was: ['1.0.0', ['a']], now: ['1.0.1', ['a', 'b']], ok: false },
  { label: 'a name added with a minor raise', was: ['1.0.0', ['a']], now: ['1.1.0', ['a', 'b']], ok: true },
  { label: 'a name dropped with a minor raise', was: ['1.0.0', ['a', 'b']], now: ['1.1.0', ['a']], ok: false },
  { label: 'a name dropped with a major raise', was: ['1.0.0', ['a', 'b']], now: ['2.0.0', ['a']], ok: true },
  { label: 'nothing moved, the base\'s number', was: ['1.0.0', ['a']], now: ['1.0.0', ['a']], ok: true },
  { label: 'nothing moved, raised', was: ['1.0.0', ['a']], now: ['1.1.0', ['a']], ok: false },
  { label: 'nothing moved, lowered', was: ['1.1.0', ['a']], now: ['1.0.0', ['a']], ok: false },
  { label: 'a pin new on this branch', was: ['', []], now: ['1.0.0', ['a']], ok: true },
];
/** Hand-counted, not derived. */
const BASE_SELF_CHECK_CASES = 9;
export const baseSelfCheckFailures = (): string[] => {
  const out = BASE_SELF_CHECK.filter((c) => {
    const was = c.was[0] ? { mapVersion: c.was[0], light: c.was[1], dark: [] } : null;
    return (pinBaseFailures(was, { mapVersion: c.now[0], light: c.now[1], dark: [] }).length === 0) !== c.ok;
  }).map((c) => `SELF-CHECK base arm: ${c.label} — expected ${c.ok ? 'a pass' : 'a refusal'}`);
  if (BASE_SELF_CHECK.length !== BASE_SELF_CHECK_CASES) out.push(`SELF-CHECK base arm: ${BASE_SELF_CHECK.length} case(s), not ${BASE_SELF_CHECK_CASES}`);
  return out;
};

const git = (...args: string[]): { ok: boolean; out: string; err: string } => {
  const r = spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr ?? '').trim() };
};
const cannotRun = (lines: string[]): never => {
  console.error(`✗ ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(l);
  process.exit(1);
};
/** The commit to read the base's pin at, by the ladder `lint-contract-version.ts` uses: in a merge-group run the group's
 *  parent (`MERGE_GROUP_BASE_SHA`, `mergeGroupBase`, #4106), authoritative, with no fallback when it is lost; on a pull
 *  request `origin/<GITHUB_BASE_REF>`, fetched again in CI because the checkout's copy is as old as the run's start;
 *  otherwise `origin/main`, then `main`. Then the merge base with it, or HEAD's first parent on the base branch itself
 *  (#2556). It cannot run without a base; it does not pass over nothing. */
const resolveBase = (): { rev: string; label: string } => {
  const tried: string[] = [];
  let ref: string | null = null;
  const mg = mergeGroupBase(git);
  const prRef = process.env.GITHUB_BASE_REF;
  if (mg) {
    // A merge-queue run: `GITHUB_BASE_REF` is empty, and `origin/main` would read the groups ahead as this PR's diff.
    tried.push(mg.tried);
    ref = mg.ref;
  } else if (prRef) {
    const pr = `origin/${prRef}`;
    if (process.env.GITHUB_ACTIONS === 'true') {
      // Two PRs that each raise the map version for different names make the identical edit to the number; the
      // stale ref would read a raise taken on the base branch since the checkout as free. A failed fetch does not fall back.
      const f = git('fetch', '--no-tags', '--quiet', 'origin', `+refs/heads/${prRef}:refs/remotes/${pr}`);
      if (!f.ok) return cannotRun([`could not refresh ${pr} from origin — the base arm CANNOT RUN against the current base.`, `    ${f.err || '(git printed nothing)'}`]);
    }
    const r = git('rev-parse', '--verify', '--quiet', `${pr}^{commit}`);
    tried.push(`${pr} (GITHUB_BASE_REF, authoritative) — ${r.ok ? 'resolves' : 'does not resolve'}`);
    if (r.ok) ref = pr;
  } else {
    for (const c of ['origin/main', 'main']) {
      const r = git('rev-parse', '--verify', '--quiet', `${c}^{commit}`);
      tried.push(`${c} — ${r.ok ? 'resolves' : 'does not resolve'}`);
      if (r.ok) { ref = c; break; }
    }
  }
  if (!ref) return cannotRun(['no base ref — the base arm CANNOT RUN.', `    tried: ${tried.join(' · ')}`, '  Locally, `git fetch origin main`.']);
  const mb = git('merge-base', 'HEAD', ref);
  if (!mb.ok || !mb.out.trim()) return cannotRun([`no merge base between HEAD and ${ref} — the base arm CANNOT RUN.`, '  A shallow clone is the usual cause: `git fetch --unshallow`.']);
  const { base, label } = comparisonBase(git, mb.out.trim(), cannotRun);
  return { rev: base, label: `${base.slice(0, 8)} (${mg ? 'merge group' : ref}, ${label})` };
};
const pinAt = (rev: string, t: ProjectionTarget): Pin | null => {
  const r = git('show', `${rev}:${t.pinPath}`);
  if (!r.ok) return null;
  return JSON.parse(r.out) as Pin;
};

const readPin = (t: ProjectionTarget): Pin => JSON.parse(readFileSync(pinFile(t), 'utf8')) as Pin;
const argAfter = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : undefined;
};

const check = (): void => {
  const failures: string[] = [...baseSelfCheckFailures()];
  const lines: string[] = [];
  const base = resolveBase();
  const upFile = argAfter('--upstream');
  const upTarget = argAfter('--target') ?? (PROJECTION_TARGETS.length === 1 ? PROJECTION_TARGETS[0]!.id : undefined);
  if (upFile && !PROJECTION_TARGETS.some((t) => t.id === upTarget)) failures.push(`--upstream needs --target <${PROJECTION_TARGETS.map((t) => t.id).join('|')}>`);
  if (!PROJECTION_TARGETS.length) failures.push('NO TARGETS in projections/targets.ts — the gate would check nothing');
  for (const t of PROJECTION_TARGETS) {
    if (!existsSync(pinFile(t))) { failures.push(`${t.id}: no pin at ${t.pinPath} — run --accept --target ${t.id} --from <theme item>`); continue; }
    const pin = readPin(t);
    const own = pinFailures(pin, Object.keys(t.vars), t.extras, t.mapVersion);

    // Arm 3's self-check: a planted upstream must be told apart from the pin, by name, in both directions.
    const planted = { light: [...pin.light.slice(1), 'planted-upstream-var'], dark: pin.dark };
    const seen = upstreamDiff(pin, planted);
    const wantSeen = ['UPSTREAM ADDED planted-upstream-var (light)', `UPSTREAM DROPPED ${pin.light[0]} (light)`];
    if (seen.length !== 2 || !wantSeen.every((w) => seen.includes(w))) own.push(`SELF-CHECK: the upstream arm read the planted stand-in as [${seen.join('; ')}]`);

    let upstream = 'NOT CHECKED — the shadcn package carries no variable set to read offline (Q2997.18, flagged on #2997)';
    if (upFile && upTarget === t.id) {
      own.push(...upstreamDiff(pin, itemNames(JSON.parse(readFileSync(upFile, 'utf8')), upFile)));
      upstream = `checked against ${upFile}`;
    }

    // Arm 4: the pin against the base's pin, read from git.
    const was = pinAt(base.rev, t);
    own.push(...pinBaseFailures(was, pin));
    const baseNote = was ? `held to the base's pin at map ${was.mapVersion}` : 'new on this branch, nothing at the base to hold it to';

    failures.push(...own.map((f) => (PROJECTION_TARGETS.length > 1 ? `${t.id}: ${f}` : f)));
    const names = new Set([...pin.light, ...pin.dark]).size;
    lines.push(`${t.id}: ${names} pinned names (${pin.light.length} light, ${pin.dark.length} dark) all mapped, ` +
      `${Object.keys(t.extras).length} declared extra, map ${t.mapVersion}; upstream arm self-checked; upstream ${upstream}; ` +
      `base ${base.label}: ${baseNote}`);
  }
  if (failures.length) {
    console.error(`✗ projection variable sets: ${failures.length} failure(s)`);
    for (const f of failures) console.error(`    ${f}`);
    console.error('\n  Fix: map the name in projections/<target>.ts, or declare it in its extras with its decision. When the target');
    console.error('  itself moved: raise its map version over the BASE\'s (MAJOR for a dropped name, MINOR for an added one), then');
    console.error('  --accept --target <id> --from <item>. Writing an old number into both the map and the pin does not satisfy the base arm.');
    process.exit(1);
  }
  console.log(`✓ projection variable sets — ${PROJECTION_TARGETS.length} target(s), base arm self-checked (${BASE_SELF_CHECK_CASES} cases)`);
  for (const l of lines) console.log(`    ${l}`);
};

const accept = (): void => {
  const from = argAfter('--from');
  if (!from) { console.error('✗ --accept needs --from <a shadcn registry:theme item, as downloaded>'); process.exit(1); }
  const id = argAfter('--target') ?? (PROJECTION_TARGETS.length === 1 ? PROJECTION_TARGETS[0]!.id : undefined);
  const t = PROJECTION_TARGETS.find((x) => x.id === id);
  if (!t) { console.error(`✗ --accept needs --target <${PROJECTION_TARGETS.map((x) => x.id).join('|')}>`); process.exit(1); }
  const SHADCN_MAP_VERSION = t.mapVersion;
  const PIN_PATH = pinFile(t);
  if (existsSync(PIN_PATH)) {
    const was = readPin(t).mapVersion;
    if (was === SHADCN_MAP_VERSION || !satisfiesBump(was, SHADCN_MAP_VERSION, 'minor')) {
      console.error(`✗ refused: the ${t.id} map version is ${SHADCN_MAP_VERSION}, pinned ${was}. Raise it first — the pin moves only with a version.`);
      process.exit(1);
    }
  }
  const source = argAfter('--source') ?? from;
  const pin: Pin = {
    note: 'Written by packages/engine/shadcn-vars.ts --accept only, never by regen. The shadcn/ui theme variable names, per mode, that projections/shadcn.ts targets, as read from `source`. Moves only with a raised SHADCN_MAP_VERSION.',
    mapVersion: SHADCN_MAP_VERSION,
    source,
    readOn: argAfter('--read-on') ?? new Date().toISOString().slice(0, 10),
    ...itemNames(JSON.parse(readFileSync(from, 'utf8')), from),
  };
  writeFileSync(PIN_PATH, `${JSON.stringify(pin, null, 2)}\n`);
  console.log(`✓ pinned ${pin.light.length} light and ${pin.dark.length} dark names from ${source} at map ${SHADCN_MAP_VERSION}`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--accept')) accept();
  else check();
}
