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
 *
 * INDEPENDENCE (docs/34). The SUBJECT is the engine's source text. The REFERENCE is the banned spellings and the
 * emitter list, both typed here, and the probe's expected order, a literal, never computed by the comparator it
 * checks. The emitter list is a floor on what the scan must reach, so a scope that silently lost a directory or a
 * file extension fails as unrepresented rather than passing clean.
 *
 * BEYOND THE ENGINE: TESTS AND TOOLS (#3701). The same rule holds for every test file at a workspace root
 * (`apps/<ws>/test-*`) and everything under `tools/`: a test that sorts by locale compares two sides that can each move
 * by machine, and a tool's report reorders by machine. Tools import `localeFreeCompare` by path, as they import the
 * rest of the engine; a surface's test may not deep-import the engine (`lint-engine-facade.ts`), so it sorts by code
 * unit inline. A separate floor and named files hold this scope to what it reached at #3701.
 *
 * WHAT IT DOES NOT ASSERT. That every sort passes a comparator at all: a bare `.sort()` on strings is already
 * code-unit order and locale-free. Nor the surfaces' own sources (`apps/<ws>/src`): whether a list a viewer reads, such as
 * font families or style-guide categories, should follow the viewer's locale is the owner's decision (#3701), and
 * those sites are unchanged. Nor TokenPress, a guest port that keeps its own patterns (`apps/tokenpress/README.md`).
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
const BANNED: { what: string; re: RegExp }[] = [
  // The called form and the reached-through forms (`String.prototype.localeCompare.call(…)`, `.apply`, `.bind`).
  // Prose that names the method bare, with neither after it, stays clean.
  { what: 'locale-dependent string comparison', re: /\blocaleCompare\b\s*(?:\(|\.\s*(?:call|apply|bind)\b)/ },
  { what: 'ICU collator', re: /\bIntl\s*\.\s*Collator\b/ },
  { what: 'locale-aware case fold', re: /\.\s*toLocale(?:Lower|Upper)Case\s*\(/ },
];

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
];
// 153 tracked test and tool source files at #3701.
const MIN_FILES_OUTSIDE = 100;
/** A test at a workspace root, not TokenPress's (a guest port), or any file under `tools/`. */
const isOutsideSite = (f: string): boolean =>
  (/^apps\/[^/]+\/test-[^/]+$/.test(f) && !f.startsWith('apps/tokenpress/')) || f.startsWith('tools/');

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
const outside = execFileSync('git', ['ls-files', '-z', 'apps', 'tools'], { cwd: repo, encoding: 'utf8' })
  .split('\0')
  .filter((f) => SOURCE.test(f) && isOutsideSite(f));

let hits = 0;
for (const f of [...files, ...outside]) {
  const lines = readFileSync(resolve(repo, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const b of BANNED) {
      if (b.re.test(line)) {
        hits++;
        const fix = f.startsWith('apps/') ? 'sort by code unit inline (a surface test may not deep-import the engine)' : 'use localeFreeCompare from locale-free-order.ts';
        failures.push(`LOCALE ORDER: ${f}:${i + 1} — ${b.what}; ${fix}\n      ${line.trim().slice(0, 160)}`);
      }
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
console.log('✓ clean — no comparison under packages/engine/, in a workspace test or under tools/ depends on the host locale');
