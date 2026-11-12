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
 *                  probe no longer separates a Czech collation from it (so the probe could not catch the defect).
 *   REPRESENTED    the scan did not reach each emitter the defect was found in, or reached too few files.
 *
 * INDEPENDENCE (docs/34). The SUBJECT is the engine's source text. The REFERENCE is the banned spellings and the
 * emitter list, both typed here, and the probe's expected order, a literal, never computed by the comparator it
 * checks. The emitter list is a floor on what the scan must reach, so a scope that silently lost a directory or a
 * file extension fails as unrepresented rather than passing clean.
 *
 * WHAT IT DOES NOT ASSERT. That every sort passes a comparator at all: a bare `.sort()` on strings is already
 * code-unit order and locale-free. And nothing outside `packages/engine/`: the plugin, Studio and `tools/` sort
 * for their own screens and reports (#3698 follow-up).
 *
 * This file is the one place allowed to spell the method, for the probe, and is skipped by name.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localeFreeCompare } from './locale-free-order';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const SELF = 'packages/engine/lint-locale-order.ts';
const failures: string[] = [];

// The banned spellings. A regex source never contains the dotted, called form it matches, so these lines do not
// trip the scan; the self-skip is for the probe below, which has to call the method.
const BANNED: { what: string; re: RegExp }[] = [
  { what: 'locale-dependent string comparison', re: /\.\s*localeCompare\s*\(/ },
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
// The engine held 193 tracked source files at #3698. A scan that reached a fraction of that is broken.
const MIN_FILES = 150;

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

// ── SCAN ─────────────────────────────────────────────────────────────────────────────────────────────────────
const files = execFileSync('git', ['ls-files', '-z', 'packages/engine'], { cwd: repo, encoding: 'utf8' })
  .split('\0')
  .filter((f) => /\.(?:ts|mts|cts|js|mjs|cjs)$/.test(f) && f !== SELF);

let hits = 0;
for (const f of files) {
  const lines = readFileSync(resolve(repo, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const b of BANNED) {
      if (b.re.test(line)) {
        hits++;
        failures.push(`LOCALE ORDER: ${f}:${i + 1} — ${b.what}; use localeFreeCompare from locale-free-order.ts\n      ${line.trim().slice(0, 160)}`);
      }
    }
  });
}

const scanned = new Set(files);
for (const f of MUST_SCAN) if (!scanned.has(f)) failures.push(`REPRESENTED: ${f} was not scanned`);
if (files.length < MIN_FILES) failures.push(`REPRESENTED: scanned ${files.length} file(s), fewer than the floor of ${MIN_FILES}`);

console.log(`lint-locale-order — ${files.length} tracked source file(s) under packages/engine/, ${MUST_SCAN.length} named emitter(s) reached`);
console.log(`  probe: ${got.join(', ')}`);
console.log(`  probe under a Czech collation: ${czech.join(', ')}`);
console.log(`  ${hits} locale-dependent call(s)`);
if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('✓ clean — no comparison under packages/engine/ depends on the host locale');
