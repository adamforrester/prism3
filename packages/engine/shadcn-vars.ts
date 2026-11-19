/**
 * Prism3 — THE PINNED SHADCN VARIABLE SET, AND ITS GATE (#2997 gate 3).
 *
 *   npx tsx packages/engine/shadcn-vars.ts --check                      # the gate (the default)
 *   npx tsx packages/engine/shadcn-vars.ts --check --upstream <file>    # also hold the pin to an upstream theme item
 *   npx tsx packages/engine/shadcn-vars.ts --accept --from <file>       # rewrite the pin, after raising the map version
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
 *   3. PIN ↔ UPSTREAM, when an upstream file is given: a shadcn `registry:theme` item's `cssVars.light` and
 *      `cssVars.dark` names against the pin, `UPSTREAM ADDED <name> (<mode>)` and `UPSTREAM DROPPED <name> (<mode>)`.
 *      The arm runs every time against a planted stand-in (the pin plus one name, less one name), so it is proven to
 *      fire even where no upstream file is given.
 *
 * WHY THE BASELINE CANNOT AGREE WITH ITSELF (docs/34 shape 6). Only `--accept` writes the pin, never `regen`, and
 * `--accept` refuses unless `SHADCN_MAP_VERSION` is above the pinned one. A gate allowed to rewrite what it reads has no
 * memory; this one can only be moved by a version raise a reviewer sees.
 *
 * UPSTREAM IS NOT READ OFFLINE YET. Q2997.18 A was "pin shadcn as a devDependency and read its set offline", on the
 * condition that the package carries the set. It does not: shadcn 4.23.0 and its `@shadcn/registry` 0.2.1 ship the CLI,
 * the registry schema and `tailwind.css`, and no theme variable list (the set lives in the hosted registry, e.g.
 * `r/styles/new-york-v4/theme-neutral.json`). So the devDependency would read nothing, and the CI run reports the
 * upstream arm as NOT CHECKED rather than as a pass. Flagged on #2997 for the owner.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHADCN_EXTRAS, SHADCN_MAP_VERSION, SHADCN_VARS } from './projections/shadcn.ts';
import { satisfiesBump } from './version.ts';

const here = dirname(fileURLToPath(import.meta.url));
export const PIN_PATH = resolve(here, 'schema', 'shadcn-vars.json');

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

const readPin = (): Pin => JSON.parse(readFileSync(PIN_PATH, 'utf8')) as Pin;
const argAfter = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : undefined;
};

const check = (): void => {
  if (!existsSync(PIN_PATH)) { console.error(`✗ no pin at ${PIN_PATH} — run --accept --from <theme item>`); process.exit(1); }
  const pin = readPin();
  const failures = pinFailures(pin, Object.keys(SHADCN_VARS), SHADCN_EXTRAS, SHADCN_MAP_VERSION);

  // Arm 3's self-check: a planted upstream must be told apart from the pin, by name, in both directions.
  const planted = { light: [...pin.light.slice(1), 'planted-upstream-var'], dark: pin.dark };
  const seen = upstreamDiff(pin, planted);
  const wantSeen = ['UPSTREAM ADDED planted-upstream-var (light)', `UPSTREAM DROPPED ${pin.light[0]} (light)`];
  if (seen.length !== 2 || !wantSeen.every((w) => seen.includes(w))) failures.push(`SELF-CHECK: the upstream arm read the planted stand-in as [${seen.join('; ')}]`);

  const upFile = argAfter('--upstream');
  let upstream = 'NOT CHECKED — the shadcn package carries no variable set to read offline (Q2997.18, flagged on #2997)';
  if (upFile) {
    failures.push(...upstreamDiff(pin, itemNames(JSON.parse(readFileSync(upFile, 'utf8')), upFile)));
    upstream = `checked against ${upFile}`;
  }

  const names = new Set([...pin.light, ...pin.dark]).size;
  if (failures.length) {
    console.error(`✗ shadcn variable set: ${failures.length} failure(s)`);
    for (const f of failures) console.error(`    ${f}`);
    console.error('\n  Fix: map the name in projections/shadcn.ts, or declare it in SHADCN_EXTRAS with its decision. When shadcn');
    console.error('  itself moved: raise SHADCN_MAP_VERSION (MAJOR for a dropped name, MINOR for an added one), then --accept --from <item>.');
    process.exit(1);
  }
  console.log(`✓ shadcn variable set — ${names} pinned names (${pin.light.length} light, ${pin.dark.length} dark) all mapped, ` +
    `${Object.keys(SHADCN_EXTRAS).length} declared extra, map ${SHADCN_MAP_VERSION}; upstream arm self-checked; upstream ${upstream}.`);
};

const accept = (): void => {
  const from = argAfter('--from');
  if (!from) { console.error('✗ --accept needs --from <a shadcn registry:theme item, as downloaded>'); process.exit(1); }
  if (existsSync(PIN_PATH)) {
    const was = readPin().mapVersion;
    if (was === SHADCN_MAP_VERSION || !satisfiesBump(was, SHADCN_MAP_VERSION, 'minor')) {
      console.error(`✗ refused: SHADCN_MAP_VERSION is ${SHADCN_MAP_VERSION}, pinned ${was}. Raise it first — the pin moves only with a version.`);
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
