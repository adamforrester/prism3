/**
 * THE FIGMA MAIN-THREAD SANDBOX REJECT SCAN (#1461).
 *
 * A shipped `$description` string bricked the plugin, and 58 gates + CI stayed green (PR #1460).
 * `radio-control`'s `checked.border` description carried the literal phrase "the Figma import
 * (2026-09-15)". Bundled into the plugin's main-thread `dist/main.js`, Figma's plugin sandbox
 * (`rejectImportExpressions` / `rejectDangerousSources`) scans the SOURCE TEXT — string literals
 * included — for `import` immediately followed by `(`, reads it as a dynamic-import expression, and
 * rejects the WHOLE plugin at load: "SyntaxError: possible import expression rejected". The plugin
 * would not run at all.
 *
 * Why nothing caught it: `plugin-no-node-builtins` scans the same bundle but only for `node:`
 * builtins; `plugin-verdict` / `plugin-start` drive the UI (`dist/ui.html`) in a browser, not the
 * main-thread sandbox eval that does this text scan; `lint-us-english` / `lint-voice` read the bundle
 * as PROSE. So a class of shipped text — anything reaching `dist/main.js` (component `description` /
 * `note` / `aria` fields do, #849) — could carry a token sequence that Figma refuses, invisibly.
 *
 * This gate reads what Figma reads: `dist/main.js` as source text, and fails on any sequence Figma's
 * sandbox rejects.
 *
 * ── HOW IT COMPARES TWO INDEPENDENT THINGS (docs/34) ───────────────────────────────────────────────
 *
 * SUBJECT — the built `apps/plugin/dist/main.js`, exactly the bytes the manifest hands Figma.
 *
 * EXPECTED — `REJECT_PATTERNS` below, authored here from Figma's DOCUMENTED sandbox behaviour, NOT
 * derived from the bundle. A gate whose forbidden set came from the thing it scans could not fail
 * (docs/34 shape 2). The list is deliberately narrow and PROVEN — `import` + `(` is the sequence the
 * 2026-09-17 incident hit; add a pattern only when a real reject is observed, so a false positive
 * never trains anyone to narrow the scan.
 *
 * ── BOTH BUILDS (#2530) ───────────────────────────────────────────────────────────────────────────
 *
 * The release build (`release/main.js`, `build.mjs --release`) is built with `minifySyntax`, which rewrites the
 * bundle's syntax, so it is scanned as well as `dist/main.js`, and each must be present: a missing one is a FAIL
 * that names the build to run, never a skip. So is the offline variant's (`release-offline/main.js`, #3138).
 *
 * ── SCOPED TO main.js, DELIBERATELY (not ui.html) ─────────────────────────────────────────────────
 *
 * The reject is the MAIN-THREAD controller sandbox's text scan. `dist/ui.html` runs in a normal
 * browser iframe where `import(...)` is valid runtime syntax and no text scan runs — the identical
 * description string ships there too and is harmless, so scanning it would fail on legitimate prose.
 * The promise of this gate is "the plugin loads", and only `main.js` decides that.
 *
 * ── THE DETECTOR IS NOT VACUOUS ───────────────────────────────────────────────────────────────────
 *
 * A scan that never matches passes on an empty file as loudly as on a clean one. So before trusting a
 * clean bundle, `selfCheck()` runs each pattern against a POSITIVE control (the exact incident phrase,
 * which must match) and a NEGATIVE control (its fix, which must not) — and the bundle must be present
 * and non-empty (a missing `dist/main.js` is a FAIL that says "run the plugin build first", never a
 * silent pass). Mutation for the safety net (docs/34): reintroduce `import (` into any shipped
 * `$description`, rebuild, and this gate fires by name on `dist/main.js`.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MAIN_JS = [
  { file: resolve(HERE, 'dist/main.js'), name: 'apps/plugin/dist/main.js', build: 'npm run -w @prism3/plugin build' },
  { file: resolve(HERE, 'release/main.js'), name: 'apps/plugin/release/main.js', build: 'npm run -w @prism3/plugin build:release' },
  // #3138: the offline variant, built by the same script.
  { file: resolve(HERE, 'release-offline/main.js'), name: 'apps/plugin/release-offline/main.js', build: 'npm run -w @prism3/plugin build:release' },
];

type RejectPattern = {
  name: string;
  /** Global regex over the source text. `import` + optional whitespace + `(` is the proven case. */
  re: RegExp;
  why: string;
};

// Authored from Figma's documented main-thread sandbox rules — NOT read from the bundle (docs/34).
const REJECT_PATTERNS: readonly RejectPattern[] = [
  {
    name: 'dynamic-import',
    re: /import\s*\(/g,
    why: "Figma's sandbox (rejectImportExpressions) reads `import` followed by `(` — even inside a "
      + 'string literal — as a dynamic import and rejects the WHOLE plugin at load (#1461). Reword any '
      + 'shipped prose so `import` is not adjacent to `(` (e.g. "the 2026-09-15 Figma import").',
  },
];

type Hit = { pattern: string; line: number; snippet: string; why: string };

function scan(text: string): Hit[] {
  const lines = text.split('\n');
  const hits: Hit[] = [];
  for (const p of REJECT_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      p.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = p.re.exec(line)) !== null) {
        const start = Math.max(0, m.index - 40);
        const snippet = line.slice(start, m.index + 40).replace(/\s+/g, ' ').trim();
        hits.push({ pattern: p.name, line: i + 1, snippet: `…${snippet}…`, why: p.why });
        if (m.index === p.re.lastIndex) p.re.lastIndex++; // guard against zero-width loops
      }
    }
  }
  return hits;
}

/** The detector must catch the incident phrase and clear its fix — else the gate is vacuous. */
function selfCheck(): string[] {
  const failures: string[] = [];
  const POSITIVE = 'the Figma import (2026-09-15)'; // the exact #1460 incident string
  const NEGATIVE = 'the 2026-09-15 Figma import';   // its fix
  if (scan(POSITIVE).length === 0) {
    failures.push('detector self-check: the POSITIVE control ("…Figma import (…") was NOT detected — the scan is broken');
  }
  if (scan(NEGATIVE).length !== 0) {
    failures.push('detector self-check: the NEGATIVE control ("…2026-09-15 Figma import") was flagged — the scan false-positives');
  }
  return failures;
}

function main(): void {
  const selfFailures = selfCheck();
  if (selfFailures.length) {
    console.error('✗ lint-sandbox-reject — the gate\'s own detector is unsound:');
    for (const f of selfFailures) console.error(`    ${f}`);
    process.exit(1);
  }

  let bad = false;
  for (const target of MAIN_JS) {
    if (!existsSync(target.file)) {
      console.error(`✗ lint-sandbox-reject — ${target.name} is missing. Run \`${target.build}\` first; this gate must run AFTER both plugin builds.`);
      bad = true;
      continue;
    }
    const text = readFileSync(target.file, 'utf8');
    if (text.trim().length === 0) {
      console.error(`✗ lint-sandbox-reject — ${target.name} is empty; nothing was scanned (a build failure would look like this).`);
      bad = true;
      continue;
    }
    const hits = scan(text);
    if (hits.length) {
      console.error(`✗ lint-sandbox-reject — ${hits.length} Figma-sandbox reject sequence(s) in ${target.name}.`);
      console.error('  Figma will refuse to load the plugin. Each occurrence:');
      for (const h of hits) console.error(`    main.js:${h.line}  [${h.pattern}]  ${h.snippet}`);
      console.error('');
      for (const p of REJECT_PATTERNS) {
        if (hits.some((h) => h.pattern === p.name)) console.error(`  • ${p.name}: ${p.why}`);
      }
      bad = true;
      continue;
    }
    const lineCount = text.split('\n').length;
    console.log(`✓ lint-sandbox-reject — 0 Figma-sandbox reject sequences in ${target.name} (${lineCount} lines scanned; ${REJECT_PATTERNS.length} pattern(s); detector self-check ok).`);
  }
  if (bad) process.exit(1);
}

main();
