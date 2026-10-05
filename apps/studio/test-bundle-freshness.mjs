/**
 * A browser suite's bundle must be at least as new as what it is built from (#2037, #2067).
 *
 * The browser suites drive BUILT bundles, not sources: `test-chrome.mjs` and `test-smoke.mjs` load
 * `apps/studio/dist/main.js` (as `mode-audit.mjs` did until UI redesign S8.3 deleted it), and `test-chrome.mjs`'s figma host also loads
 * `apps/plugin/dist/ui.html`. A rebuild of one bundle after an edit leaves the other stale, and a suite
 * driving a stale bundle measures the old UI and reports it as this one. #2037 bit S4e's info-text mutation
 * and S6.3's one-home mutation that way, on `ui.html`. `npm run verify` orders both builds before every
 * browser suite, so the case is a hand run: a mutation battery that rebuilds only one bundle.
 *
 * A CHECK, NOT A BUILD, to match `verify.ts`: builds are their own gates and every browser suite is ordered
 * `after` them. Building here would build twice per verify, and report a build failure as this suite's.
 *
 * THE ROOTS ARE LITERAL, at each call site, and they are what that bundle compiles from. No build writes a
 * metafile, so the exact input set is not readable here. A root wider than the bundle only costs a rebuild
 * that was not needed. A narrower one would let the stale case through. Every root must exist and hold
 * files, so a renamed directory fails here rather than scanning nothing and passing (docs/34 shape 9).
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** What `apps/studio/dist/main.js` compiles from: the studio app, its chrome CSS, and the engine it bundles. */
export const STUDIO_SOURCE_ROOTS = ['apps/studio/src', 'apps/studio/chrome', 'packages/engine'];
/** What `apps/plugin/dist/ui.html` compiles from: the studio app it inlines whole, its chrome CSS, the plugin's
 *  iframe entry and the modules it imports, and the engine. `apps/plugin/src` is wider than the iframe (its
 *  `main.ts` is the main thread's), which only costs an unneeded rebuild. */
export const PLUGIN_UI_SOURCE_ROOTS = ['apps/studio/src', 'apps/studio/chrome', 'apps/plugin/src', 'packages/engine'];

/**
 * Exit the suite, by name, when `bundle` is missing or older than any file under `roots`. `repo` is the
 * repository root; `bundle` and `roots` are repo-relative; `label` names the check in the message
 * (`main.js freshness`); `effect` says what a stale bundle would do to this suite; `build` is the command
 * that fixes it.
 */
export function assertBundleFresh({ repo, bundle, roots, label, effect, build }) {
  let builtAt;
  try { builtAt = statSync(join(repo, bundle)).mtimeMs; } catch {
    console.error(`✗ ${label}: ${bundle} is missing. Run \`${build}\` first.`);
    process.exit(1);
  }
  let newest = { at: -Infinity, file: '' };
  for (const root of roots) {
    let files = 0;
    let ents = [];
    try { ents = readdirSync(join(repo, root), { recursive: true, withFileTypes: true }); } catch { /* reported below, by name */ }
    for (const ent of ents) {
      if (!ent.isFile()) continue;
      const file = join(ent.parentPath, ent.name);
      if (file.includes(`${sep}node_modules${sep}`)) continue;
      files++;
      const at = statSync(file).mtimeMs;
      if (at > newest.at) newest = { at, file };
    }
    if (files === 0) {
      console.error(`✗ ${label}: source root ${root} is missing or holds no files, so nothing was compared. Fix the roots in test-bundle-freshness.mjs.`);
      process.exit(1);
    }
  }
  if (newest.at > builtAt) {
    console.error(`✗ ${label}: ${bundle} is older than ${relative(repo, newest.file)}, so ${effect}. Run \`${build}\`, then this suite again.`);
    process.exit(1);
  }
}
