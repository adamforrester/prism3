/**
 * DOES A CHANGE NEED THE CANARY? (#3215, owner decisions of 2026-11-01). Given two commits, the last checked build and
 * the one about to be called ready, reports whether the path rule says a check is needed, and why.
 *
 *   npx tsx tools/figma-canary/needs-check.ts <last-checked-commit> <candidate-commit>
 *
 * THE RULE, as the owner decided it: run the check only if the changes since the last checked build touch any of
 *   · the plugin's Figma-side code: write, update and read paths, the component executor, Update and Apply, the agent
 *     link, and the main thread's startup;
 *   · a raised `EXECUTOR_REVISION`;
 *   · a Figma API the plugin hasn't called before;
 *   · `build.mjs` or the manifests.
 * It skips panel-only styling, copy, docs, tests and token-value-only engine changes.
 *
 * The rule is the literal lists below, read in order: SKIP first (a path on it never triggers alone), then CHECK. A
 * path on NEITHER list needs a check, with that as the reason: an unclassified file is the canary's to rule out, not
 * this script's to assume away. So engine code (anything under `packages/engine/` not on SKIP) needs a check: the
 * plugin bundles it, and only its token values are on the skip list.
 *
 * A "Figma API the plugin hasn't called before" is read from the added lines under `apps/plugin/src/` as a
 * `figma.<path>` it names that no file under `apps/plugin/src/` named at the older commit. A NEW METHOD ON A NODE
 * (`node.createSlot()`) is not seen by that read; a change that adds one is under `apps/plugin/src/`, which needs a
 * check anyway.
 *
 * A TOOL (`tools/CLAUDE.md`): it answers and exits 0; 2 only when git cannot answer.
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Never triggers alone. Each with why it is safe to skip, in the decision's words where it has them. */
export const SKIP: { pattern: RegExp; why: string }[] = [
  { pattern: /^apps\/plugin\/src\/ui\//, why: 'panel-only' },
  { pattern: /^apps\/studio\//, why: 'panel-only (the panel the plugin UI bundles)' },
  { pattern: /^apps\/plugin\/src\/.*\.d\.ts$/, why: 'types only' },
  { pattern: /\.md$/, why: 'docs' },
  { pattern: /^docs\//, why: 'docs' },
  { pattern: /^apps\/plugin\/test-[^/]+$/, why: 'tests' },
  { pattern: /^apps\/plugin\/lint-[^/]+$/, why: 'tests (a gate)' },
  { pattern: /^packages\/engine\/(test|mcp-test)[^/]*\.ts$/, why: 'tests' },
  { pattern: /^apps\/plugin\/(component-shim|file-shim|reach-draw)\.ts$/, why: 'tests (the shim the suites drive)' },
  { pattern: /^[^/]+\.(ts|mjs)$/, why: 'repo tooling at the root (verify.ts, fold.ts): not in the plugin bundle' },
  { pattern: /^packages\/engine\/lint-[^/]+\.ts$/, why: 'tests (a gate)' },
  { pattern: /^packages\/engine\/out\//, why: 'token-value-only engine change (the emitted artifacts)' },
  { pattern: /^packages\/engine\/examples\//, why: 'token-value-only engine change (brand inputs)' },
  { pattern: /^packages\/engine\/schema\//, why: 'token-value-only engine change (committed schema and baselines)' },
  { pattern: /^packages\/engine\/changes\//, why: 'docs (a change note)' },
  { pattern: /^(apps\/tokenpress|packages\/tokens|tools|reference|skills|\.github|\.claude)\//, why: 'not in the plugin bundle' },
];

/** Needs a check. */
export const CHECK: { pattern: RegExp; why: string }[] = [
  { pattern: /^apps\/plugin\/src\/.*executor-revision\.ts$/, why: 'the component executor' },
  { pattern: /^apps\/plugin\/src\//, why: "the plugin's Figma-side code (write, update and read paths, the executor, Update and Apply, the agent link, startup)" },
  { pattern: /^apps\/plugin\/(build|git-stamp|strip-maintainer-prose)\.mjs$/, why: 'build.mjs or a step it runs' },
  { pattern: /^apps\/plugin\/manifest[^/]*\.json$/, why: 'a manifest' },
];

export type Decision = { needed: boolean; reasons: string[]; skipped: string[] };

/** The rule over a list of changed paths, the two `EXECUTOR_REVISION`s, and the new `figma.` APIs. Pure. */
export const decide = (paths: string[], rev: { before: number | null; after: number | null }, newApis: string[]): Decision => {
  const reasons: string[] = [];
  const skipped: string[] = [];
  for (const p of paths) {
    const skip = SKIP.find((r) => r.pattern.test(p));
    if (skip) { skipped.push(`${p} (${skip.why})`); continue; }
    const check = CHECK.find((r) => r.pattern.test(p));
    reasons.push(check ? `${p}: ${check.why}` : `${p}: on neither list, so the rule does not skip it`);
  }
  if (rev.before !== null && rev.after !== null && rev.after > rev.before) reasons.push(`EXECUTOR_REVISION raised (${rev.before} → ${rev.after})`);
  for (const api of newApis) reasons.push(`a Figma API the plugin hasn't called before: ${api}`);
  return { needed: reasons.length > 0, reasons, skipped };
};

const FIGMA_API = /\bfigma\.[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g;
/** The `figma.` paths named in some text. */
export const figmaApis = (text: string): Set<string> => new Set(text.match(FIGMA_API) ?? []);

const isMain = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [from, to] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!from || !to) { console.error('usage: needs-check.ts <last-checked-commit> <candidate-commit>'); process.exit(2); }
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const git = (...args: string[]): string => {
    const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    if (r.status !== 0) { console.error(`needs-check.ts: git ${args.join(' ')} failed — this cannot answer: ${(r.stderr ?? '').trim()}`); process.exit(2); }
    return r.stdout;
  };
  const paths = git('diff', '--name-only', from, to).split('\n').filter(Boolean);
  const revOf = (c: string): number | null => {
    const r = spawnSync('git', ['-C', repo, 'show', `${c}:apps/plugin/src/executor-revision.ts`], { encoding: 'utf8' });
    const m = /export const EXECUTOR_REVISION\s*=\s*(\d+)/.exec(r.stdout ?? '');
    return m ? Number(m[1]) : null;
  };
  const known = figmaApis(git('grep', '-h', '-o', '-E', 'figma\\.[A-Za-z_$][A-Za-z0-9_$.]*', from, '--', 'apps/plugin/src').replace(/^[^:]*:/gm, ''));
  const added = git('diff', '-U0', from, to, '--', 'apps/plugin/src').split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
  const fresh = [...figmaApis(added)].filter((a) => !known.has(a)).sort();
  const d = decide(paths, { before: revOf(from), after: revOf(to) }, fresh);
  console.log(`${from.slice(0, 8)} → ${to.slice(0, 8)}: ${paths.length} file(s) changed`);
  console.log(d.needed ? '\ncheck needed:' : '\nno check needed: nothing in the changes is on the path rule.');
  for (const r of d.reasons) console.log(`  · ${r}`);
  if (d.skipped.length) { console.log('\nskipped by the rule:'); for (const s of d.skipped) console.log(`  · ${s}`); }
}
