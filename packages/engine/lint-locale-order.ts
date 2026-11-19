/**
 * Prism3 engine — NOTHING UNDER `packages/engine/` ORDERS OR FOLDS STRINGS BY THE HOST'S LOCALE (#3698 finding 2).
 *
 *   npx tsx packages/engine/lint-locale-order.ts
 *
 * A bare `localeCompare` sorts by whatever locale the machine runs in. The engine's emitters used it to order icon
 * names, provider marks, agent-link flags and spec coordinates, so `LC_ALL=cs_CZ.UTF-8 regen.ts --check` reported
 * drift on 8 artifacts with no code change: Czech sorts `ch` after `h`. CI runs one locale, so it could not see it.
 * Every comparison now goes through `localeFreeCompare` (`locale-free-order.ts`), and this gate keeps it that way.
 *
 * WHAT IT ASSERTS, each failure prefixed by the name a mutation must produce:
 *   LOCALE ORDER   a tracked source file under `packages/engine/` calls the locale-dependent comparison method,
 *                  builds an ICU collator, or folds case through the locale-aware case methods. Reported by file
 *                  and line. The scan covers tests and lints too: a test that sorts by locale compares two sides
 *                  that can each move by machine, and one rule is simpler to hold than a list of exemptions.
 *   PROBE          the comparator, run on a literal probe, does not return the literal order typed below, or the
 *                  probe no longer separates a Czech collation from it (so the probe could not catch the defect),
 *                  or `planVariableRenames` (which restates the comparator for the paste payload) orders a
 *                  case-split pair differently from the literal folded order typed below.
 *   REPRESENTED    the scan did not reach each emitter the defect was found in, or reached too few files.
 *   SELF-CHECK     the banned spellings, run on planted lines typed below, do not flag exactly the planted calls.
 *
 * SPELLINGS (#4201). The method is matched as called (`.localeCompare(`, `.call`/`.apply`/`.bind`), and also by NAME
 * anywhere in code outside a comment: `a["localeCompare"](b)` and `fn.bind(String.prototype.localeCompare)` reach the
 * same method without either spelling, and both read clean before. Prose in a comment that names the method stays
 * clean; a line is read as code after its comment is cut (`//` to the end, a line inside a block comment).
 *
 * INDEPENDENCE (docs/34). The SUBJECT is the engine's source text. The REFERENCE is the banned spellings and the
 * emitter list, both typed here, and the probe's expected order, a literal, never computed by the comparator it
 * checks. The emitter list is a floor on what the scan must reach, so a scope that silently lost a directory or a
 * file extension fails as unrepresented rather than passing clean.
 *
 * BEYOND THE ENGINE: TESTS AND TOOLS (#3701, owner decision A, 2026-11-18). The same rule holds for every test and
 * tool: a test file at a workspace root (`apps/<ws>/test-*`), a workspace's own gate (`apps/<ws>/lint-*`), everything
 * under `tools/`, the root runners (`verify.ts`, `fold.ts`, `run-suites.ts` and the rest at the root), the token
 * package's scripts (`packages/tokens/*.mjs`), and the scripts a skill ships for an agent to run (`skills/<skill>/*.js`).
 * A test that sorts by locale compares two sides that can each move by machine, and a tool's report reorders by machine.
 * Tools under `tools/` import `localeFreeCompare` by path, as they import the rest of the engine; a surface's test may
 * not deep-import the engine (`lint-engine-facade.ts`), and a skill's script runs in Figma with no import at all, so
 * each sorts by code unit inline. A separate floor and named files hold this scope to what it reached.
 *
 * WHAT IT DOES NOT ASSERT. That every sort passes a comparator at all: a bare `.sort()` on strings is already
 * code-unit order and locale-free. Nor the surfaces' own sources (`apps/<ws>/src`): a list a viewer reads, such as font
 * families or style-guide categories, keeps the viewer's locale order (owner decision A on #3701), so those sites stay
 * as they are and outside this scan. Nor TokenPress, a guest port that keeps its own patterns
 * (`apps/tokenpress/README.md`).
 *
 * This file is the one place allowed to spell the method, for the probe, and is skipped by name.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localeFreeCompare } from './locale-free-order';
import { planVariableRenames } from './rename-map';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const SELF = 'packages/engine/lint-locale-order.ts';
const failures: string[] = [];

// The banned spellings. A regex source never contains the dotted, called form it matches, so these lines do not
// trip the scan; the self-skip is for the probe below, which has to call the method.
const BANNED: { what: string; re: RegExp; code?: true }[] = [
  // The called form and the reached-through forms (`String.prototype.localeCompare.call(…)`, `.apply`, `.bind`).
  // Prose that names the method bare, with neither after it, stays clean.
  { what: 'locale-dependent string comparison', re: /\blocaleCompare\b\s*(?:\(|\.\s*(?:call|apply|bind)\b)/ },
  { what: 'ICU collator', re: /\bIntl\s*\.\s*Collator\b/ },
  { what: 'locale-aware case fold', re: /\.\s*toLocale(?:Lower|Upper)Case\s*\(/ },
  // #4201: the method reached by NAME, in code, in any other spelling: a bracket key, a property passed as a value.
  // Read on the line with its comment cut (`code`), so prose naming the method stays clean.
  { what: 'locale-dependent string comparison, reached by name', re: /\blocaleCompare\b(?!\s*(?:\(|\.\s*(?:call|apply|bind)\b))/, code: true },
];

/** A line as code: empty inside a block comment or JSDoc, and cut at a `//` comment. Coarse on purpose (a `//` inside a
 *  string cuts the line early), since it only decides what the by-name spelling reads. */
const codeOf = (line: string): string => {
  const t = line.trim();
  if (t.startsWith('*') || t.startsWith('/*') || t.startsWith('//')) return '';
  return line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '');
};
/** The banned spellings a line holds. */
const bannedIn = (line: string): { what: string }[] => BANNED.filter((b) => b.re.test(b.code ? codeOf(line) : line));

// ── SELF-CHECK: each planted call is flagged, each planted mention is not (#4201) ─────────────────────────────
{
  const flagged = [
    'names.sort((a, b) => a.localeCompare(b));',
    'rows.sort(([a], [b]) => a["localeCompare"](b));',
    "rows.sort(([a], [b]) => a['localeCompare'](b));",
    'rows.sort(([a], [b]) => Function.prototype.call.bind(String.prototype.localeCompare)(a, b));',
    'const cmp = String.prototype.localeCompare; rows.sort((a, b) => cmp.call(a, b));',
    'String.prototype.localeCompare.call(a, b);',
    "const c = new Intl.Collator('en');",
    's.toLocaleLowerCase();',
  ];
  const clean = [
    '// Code-unit order everywhere, never `localeCompare`: a locale-dependent sort would differ by machine.',
    ' *   the findings sorted with `localeCompare` again → fails by name',
    'names.sort(localeFreeCompare); // not localeCompare',
    '/* localeCompare */ names.sort();',
  ];
  for (const l of flagged) if (!bannedIn(l).length) failures.push(`SELF-CHECK: the scan does not flag a planted call: ${l}`);
  for (const l of clean) if (bannedIn(l).length) failures.push(`SELF-CHECK: the scan flags a planted mention that calls nothing: ${l}`);
}

// The emitters #3698 found the defect in, plus the ones that already sorted locale-free. Typed, never listed from
// the tree: the scan must reach each of them.
const MUST_SCAN = [
  'packages/engine/emit-icons.ts',
  'packages/engine/emit-marks.ts',
  'packages/engine/emit-agent-reference.ts',
  'packages/engine/component-defs-export.ts',
  'packages/engine/rename-map.ts',
  'packages/engine/release-notes.ts',
  'packages/engine/emit-analysis-reports.ts',
  'packages/engine/regen.ts',
  'packages/engine/test.ts',
];
// The engine held 194 tracked source files at #3698. A scan that reached a fraction of that is broken.
const MIN_FILES = 150;
// #3701: the test and tool sites outside the engine. Typed, never listed from the tree: one file per place the defect
// was found, so a scope that lost `tools/` or the `.mjs` tests fails as unrepresented.
const MUST_SCAN_OUTSIDE = [
  'apps/plugin/test-readback.ts',
  'apps/plugin/test-agent-link.ts',
  'apps/studio/test-smoke.mjs',
  'apps/studio/test-chrome.mjs',
  'tools/binding-audit/reconcile.ts',
  'tools/conformance-scan/fix.ts',
  'tools/exporter-comparison/adapt-figma-emission.ts',
  // The scope's other kinds, one file each, so a scope that lost a kind fails as unrepresented.
  'apps/plugin/lint-executor-revision.ts',
  'verify.ts',
  'packages/tokens/check-package.mjs',
  'skills/prism3-rebind/consistency-audit.js',
];
// 153 tracked test and tool source files at #3701's first pass (#3823); more once the scope reached every kind.
const MIN_FILES_OUTSIDE = 100;
/** A test or gate at a workspace root, not TokenPress's (a guest port); any file under `tools/`; a file at the repo
 *  root; a token-package script; a skill's script. Never a surface's `src/`, whose lists a viewer reads (#3701 A). */
const isOutsideSite = (f: string): boolean =>
  (/^apps\/[^/]+\/(?:test|lint)-[^/]+$/.test(f) && !f.startsWith('apps/tokenpress/'))
  || f.startsWith('tools/')
  || !f.includes('/')
  || /^packages\/tokens\/[^/]+\.mjs$/.test(f)
  || /^skills\/[^/]+\/[^/]+\.js$/.test(f);

// ── PROBE: the comparator's order on literals ────────────────────────────────────────────────────────────────
// Czech collates `ch` as one letter after `h`; English and code-unit order put it after `c`. The fold keeps
// `FPO-default-icon` among the f's, as the committed artifacts have it.
const PROBE = ['h', 'ch', 'FPO-default-icon', 'c', 'arrow-down', 'd', 'eye-off', 'eye'];
const PROBE_ORDER = ['arrow-down', 'c', 'ch', 'd', 'eye', 'eye-off', 'FPO-default-icon', 'h'];
const got = [...PROBE].sort(localeFreeCompare);
if (got.join(',') !== PROBE_ORDER.join(',')) {
  failures.push(`PROBE: localeFreeCompare ordered the probe ${got.join(', ')}; expected ${PROBE_ORDER.join(', ')}`);
}
const czech = [...PROBE].sort((a, b) => a.localeCompare(b, 'cs'));
if (czech.join(',') === PROBE_ORDER.join(',')) {
  failures.push('PROBE: a Czech collation orders the probe the same as the comparator, so the probe cannot tell them apart (is ICU missing?)');
}

// `rename-map.ts` restates the comparator (it ships as source in the paste payload, where an import does not exist).
// Drive the restated copy on a pair whose folded order and code-unit order disagree: `a` < `B` folded, `B` < `a` by
// code unit. The expected order is typed, never read from `localeFreeCompare`.
const RENAME_ORDER = ['a', 'B'];
const renamed = planVariableRenames(['B', 'a'], ['x', 'y'], [
  { collection: 'probe', from: 'B', to: 'x', since: '0' },
  { collection: 'probe', from: 'a', to: 'y', since: '0' },
]).map((r) => r.from);
if (renamed.join(',') !== RENAME_ORDER.join(',')) {
  failures.push(`PROBE: planVariableRenames ordered ${renamed.join(', ')}; expected ${RENAME_ORDER.join(', ')} (rename-map.ts's restated comparator has drifted from localeFreeCompare)`);
}

// ── SCAN ─────────────────────────────────────────────────────────────────────────────────────────────────────
const SOURCE = /\.(?:ts|mts|cts|js|mjs|cjs)$/;
const files = execFileSync('git', ['ls-files', '-z', 'packages/engine'], { cwd: repo, encoding: 'utf8' })
  .split('\0')
  .filter((f) => SOURCE.test(f) && f !== SELF);
const outside = execFileSync('git', ['ls-files', '-z'], { cwd: repo, encoding: 'utf8' })
  .split('\0')
  .filter((f) => SOURCE.test(f) && isOutsideSite(f));

let hits = 0;
for (const f of [...files, ...outside]) {
  const lines = readFileSync(resolve(repo, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const b of bannedIn(line)) {
      hits++;
      const fix = f.startsWith('apps/') || f.startsWith('skills/') ? 'sort by code unit inline (a surface test may not deep-import the engine, and a skill script has no import)' : 'use localeFreeCompare from locale-free-order.ts';
      failures.push(`LOCALE ORDER: ${f}:${i + 1} — ${b.what}; ${fix}\n      ${line.trim().slice(0, 160)}`);
    }
  });
}

const scanned = new Set(files);
for (const f of MUST_SCAN) if (!scanned.has(f)) failures.push(`REPRESENTED: ${f} was not scanned`);
if (files.length < MIN_FILES) failures.push(`REPRESENTED: scanned ${files.length} file(s), fewer than the floor of ${MIN_FILES}`);
const scannedOutside = new Set(outside);
for (const f of MUST_SCAN_OUTSIDE) if (!scannedOutside.has(f)) failures.push(`REPRESENTED: ${f} was not scanned (#3701)`);
if (outside.length < MIN_FILES_OUTSIDE) failures.push(`REPRESENTED: scanned ${outside.length} test and tool file(s), fewer than the floor of ${MIN_FILES_OUTSIDE} (#3701)`);

console.log(`lint-locale-order — ${files.length} tracked source file(s) under packages/engine/, ${MUST_SCAN.length} named emitter(s) reached; ${outside.length} test and tool file(s) outside it (#3701), ${MUST_SCAN_OUTSIDE.length} named`);
console.log(`  probe: ${got.join(', ')}`);
console.log(`  probe under a Czech collation: ${czech.join(', ')}`);
console.log(`  ${hits} locale-dependent call(s)`);
if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('✓ clean — no comparison under packages/engine/, in a workspace test or gate, under tools/, at the root, in a token-package script or in a skill script depends on the host locale');
