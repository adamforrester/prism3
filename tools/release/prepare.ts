/**
 * PREPARE A RELEASE RECORD for "Prism3 Studio" (#3147, the owner's Q3147.18 A). Nothing is published, tagged or
 * pushed here: this writes files and prints the commands for the owner, who is the only one who publishes.
 *
 *   npx tsx tools/release/prepare.ts --figma-version <N>            # after publishing version N in Figma
 *   npx tsx tools/release/prepare.ts --figma-version <N> --out <dir>
 *
 * `<N>` is the version number Figma gave the publish. The record is named `studio-r<N>` after it.
 *
 * WHAT IT CHECKS FIRST, and refuses on:
 *   · the checkout: clean, at the tip of `origin/main`, by the same `releaseCheck` the release build uses
 *     (`apps/plugin/git-stamp.mjs`, Q3147.16 A);
 *   · both builds: `apps/plugin/release/` and `apps/plugin/release-offline/` hold a manifest and both bundles, and every
 *     bundle's build stamp names this commit, so the zips are the bytes that were published;
 *   · the tag: `studio-r<N>` does not exist yet.
 *
 * WHAT IT WRITES, under `tools/release/out/studio-r<N>/` (ignored by git) or `--out`:
 *   · `prism3-studio-r<N>.zip` and `prism3-studio-offline-r<N>.zip`, each folder's three files (system `zip`);
 *   · `release-note.md`, the draft GitHub release note: Figma's version, the commit, ENGINE_VERSION,
 *     EXECUTOR_REVISION, the privacy note for the publish page, and the PRs merged since the last `studio-r` tag.
 *
 * WHAT IT PRINTS: the `git tag`, `git push` and `gh release create --draft` commands, for the owner to run.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_VERSION } from '../../packages/engine/version';
import { EXECUTOR_REVISION } from '../../apps/plugin/src/executor-revision';
import { behindStamp, commitStamp, releaseCheck } from '../../apps/plugin/git-stamp.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BUILDS = [
  { dir: 'apps/plugin/release', zip: 'prism3-studio', label: 'Prism3 Studio' },
  { dir: 'apps/plugin/release-offline', zip: 'prism3-studio-offline', label: 'Prism3 Studio Offline' },
] as const;
const FILES = ['manifest.json', 'main.js', 'ui.html'] as const;
/** The privacy note for the publish page (#3147, Q3147.7 A and Q3147.17 A), as the plugin shows it. */
const PRIVACY = 'Prism3 loads Google Fonts families for previews: the family name and your IP address go to Google. When you turn on the agent link and pair a local agent, Prism3 connects to it on this computer only (localhost). Theming itself runs in the plugin; nothing else is sent.';
/** A build stamp as `build.mjs` writes it (#836, #3239): `<ISO seconds> tree-<8 hex> <commit field>`. */
const STAMP = /\b\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ tree-[0-9a-f]{8} ([0-9a-f]{7,40}(?:-dirty)?|git-unavailable)\b/g;

const git = (args: string[], timeout = 20000) => {
  const r = spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf8', timeout });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', error: r.error };
};
const refuse = (lines: string[]): never => {
  for (const l of lines) console.error(l);
  process.exit(1);
};

const argv = process.argv.slice(2);
const at = (flag: string): string | undefined => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
const n = Number(at('--figma-version'));
if (!Number.isInteger(n) || n < 1) refuse(['usage: npx tsx tools/release/prepare.ts --figma-version <N> [--out <dir>]', '  <N> is the version number Figma gave this publish.']);
const tag = `studio-r${n}`;
const outDir = resolve(at('--out') ?? join(REPO, 'tools/release/out'), tag);

// 1. The checkout: clean and current, as a release build requires.
const commit = commitStamp(git);
const check = releaseCheck(commit.field, behindStamp(git).behind, true);
if (check.refuse) refuse(check.lines.map((l) => l.replace('Release build refused', 'Release record refused')));
const sha = commit.field;
const full = git(['rev-parse', 'HEAD']).stdout.trim();

// 2. Both builds exist, whole, and were built from this commit.
for (const b of BUILDS) {
  for (const f of FILES) if (!existsSync(join(REPO, b.dir, f))) refuse([`✗ ${b.dir}/${f} is missing. Run npm run -w @prism3/plugin build:release first.`]);
  for (const f of ['main.js', 'ui.html']) {
    const stamps = [...readFileSync(join(REPO, b.dir, f), 'utf8').matchAll(STAMP)].map((m) => m[1]);
    if (!stamps.length) refuse([`✗ ${b.dir}/${f} carries no build stamp, so it cannot be tied to a commit.`]);
    const other = stamps.find((s) => s !== sha);
    if (other) refuse([`✗ ${b.dir}/${f} was built from ${other}, and this checkout is ${sha}. Rebuild with npm run -w @prism3/plugin build:release.`]);
  }
}

// 3. The tag is new.
if (git(['rev-parse', '-q', '--verify', `refs/tags/${tag}`]).status === 0) refuse([`✗ The tag ${tag} exists already. Each publish gets its own Figma version number.`]);

// The PRs merged since the last record: first-parent subjects on main, each ending in its (#N).
const previous = git(['tag', '-l', 'studio-r*']).stdout.split('\n').map((t) => t.trim()).filter((t) => /^studio-r\d+$/.test(t))
  .sort((a, b) => Number(a.slice(8)) - Number(b.slice(8))).pop() ?? null;
const log = previous ? git(['log', '--first-parent', '--format=%s', `${previous}..HEAD`]).stdout.split('\n').filter(Boolean) : [];

// 4. Write the record.
const zip = spawnSync('zip', ['-v'], { encoding: 'utf8' });
if (zip.status !== 0) refuse(['✗ The zip command is not available, so the builds cannot be archived.']);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const zips: string[] = [];
for (const b of BUILDS) {
  const file = join(outDir, `${b.zip}-r${n}.zip`);
  // -X: no extra file attributes, -j: the three files at the archive's root, as Figma imports them.
  const r = spawnSync('zip', ['-X', '-j', '-q', file, ...FILES.map((f) => join(REPO, b.dir, f))], { encoding: 'utf8' });
  if (r.status !== 0) refuse([`✗ zip failed for ${b.dir}: ${r.stderr.trim()}`]);
  zips.push(file);
}
const note = [
  `# Prism3 Studio r${n}`,
  '',
  `Figma version ${n} of "Prism3 Studio" and "Prism3 Studio Offline", published to the organization.`,
  '',
  `- Commit: ${full} (build stamp ${sha})`,
  `- ENGINE_VERSION: ${ENGINE_VERSION}`,
  `- EXECUTOR_REVISION: ${EXECUTOR_REVISION} (Update file redraws sets built under an earlier revision)`,
  `- Builds: ${BUILDS.map((b, i) => `${b.label}, ${relative(outDir, zips[i])}`).join('; ')}`,
  '',
  '## Privacy note (for the publish page)',
  '',
  PRIVACY,
  '',
  `## Merged since ${previous ?? 'the first release'}`,
  '',
  ...(previous ? (log.length ? log.map((s) => `- ${s}`) : ['- Nothing merged since the last release.']) : ['- This is the first release record, so there is no earlier tag to compare with.']),
  '',
  '## Rollback',
  '',
  `Import the previous record's zip (its manifest.json) in Figma and publish it as a new version, with a note that says "rollback to r<N>".`,
  '',
].join('\n');
const notePath = join(outDir, 'release-note.md');
writeFileSync(notePath, note);

// 5. The commands, for the owner. None of them is run here.
/** A path as the owner types it: relative to the repository when it is inside it, absolute when not. */
const show = (p: string) => { const r = relative(REPO, p); return r && !r.startsWith('..') ? r : p; };
const q = (p: string) => (/\s/.test(show(p)) ? `"${show(p)}"` : show(p));
console.log(`✓ Release record for ${tag} written to ${show(outDir)}`);
for (const f of [...zips, notePath]) console.log(`  ${show(f)}`);
console.log('\nNothing has been tagged, pushed or published. To record the release, run:\n');
console.log(`  git tag -a ${tag} ${full} -m "Prism3 Studio r${n}"`);
console.log(`  git push origin ${tag}`);
console.log(`  gh release create ${tag} --draft --title "Prism3 Studio r${n}" --notes-file ${q(notePath)} ${zips.map((z) => q(z)).join(' ')}`);
