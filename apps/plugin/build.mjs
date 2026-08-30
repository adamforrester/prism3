/**
 * Plugin build (#107). Two esbuild bundles, one per context (docs/18 §1):
 *   • main.ts → dist/main.js   — the sandbox controller (manifest.main)
 *   • ui/ui.ts → inlined into dist/ui.html — the iframe (manifest.ui)
 *
 * The UI must be a SINGLE self-contained HTML file: a Figma plugin iframe has no server to
 * fetch a separate .js from (and we ship `allowedDomains:["none"]`), so the bundled JS is
 * inlined into a <script> in the HTML template. iife + no network — nothing loads at runtime.
 *
 * `--watch` keeps both rebuilding. Run: `node build.mjs` (or `npm run build` / `npm run watch`).
 */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(root, 'dist');
const watch = process.argv.includes('--watch');

/**
 * WHICH BUILD IS RUNNING (#836) — `<ISO seconds> <absolute tree path>`, stamped into BOTH bundles.
 *
 * Every checkout of this repo builds a `dist/` under the same plugin id (`prism3-theming-plugin`), and
 * Figma lists them all as one dev plugin with no way to tell them apart. On 2026-08-26 that cost an
 * afternoon: a lane handed over `/tmp/p3-swap`'s manifest path, the owner imported it, the emission
 * came out with pre-swap names, and the natural conclusion was a broken emitter. The manifest path was
 * checked and CLEARED — it was right. Four rebuilds and a three-way byte differential later, the bundle
 * at that path was proved correct too. Figma had been running a THIRD tree's `dist/`, built two days
 * earlier. The one thing that caught it was the rail's engine-version chip reading `0.21.0`.
 *
 * A commit SHA is the cheaper option and #836 answered it in its own body: two worktrees on the same
 * commit is a normal state here, and a SHA cannot separate them. `dist/` is also gitignored, so no git
 * operation touches what Figma runs and a tree can sit on exactly the right commit carrying a stale
 * bundle — hence the second field. The path makes the commit derivable (`git -C <tree> log -1`); the
 * commit does not make the path derivable, and the path is the actionable half besides: the remedy is
 * to re-import or rebuild a named tree. The renderings live in `apps/studio/src/build-identity.ts`.
 *
 * COMPOSED PER BUILD, not once per process, which is why `--watch` no longer uses an esbuild `context`:
 * a context fixes its `define` at creation, so a watcher left running would stamp its own start time
 * into every rebuild for the rest of the day — a freshness field that goes stale is worse than none.
 */
/**
 * AN ABSOLUTE REALPATH, DECIDED RATHER THAN INHERITED (#1099). This puts the developer's own filesystem
 * path into a built bundle, and `apps/plugin/dist` is inside `lint-us-english.ts`'s scope (#937) — so the
 * host's directory names become gate-scanned text. A worktree at `/private/tmp/p3-colour-lane` turns that
 * gate red, and its documented remedy (`NOT_EN_GB`) cannot hold a per-machine string. Three payloads were
 * measured against the real gate rather than argued:
 *
 *   • `/private/tmp/p3-colour-lane`   absolute  → exit 1
 *   • `p3-colour-lane`                basename  → exit 1   ← shortening does NOT fix it
 *   • `4f1a9c2`                       hashed    → exit 0
 *
 * The basename row is the one that decides it: the offending substring is in the LANE NAME a developer
 * chose, not in the parent directory, so every human-readable form of "which checkout" carries the same
 * property. A repo-relative path is worse than either — every checkout IS the repo root, so it is the
 * empty string in all of them and discriminates nothing. Only the hash clears the gate, and it deletes
 * the field's purpose: you cannot run `git -C <tree> log -1` on it, cannot re-import the tree it names,
 * and cannot compare it by eye against the manifest path Figma reports.
 *
 * That reasoning concluded: the path stays, and #1099 is filed as a scope decision about the gate.
 *
 * **#1117 REVERSED THE CONCLUSION AND KEPT THE MEASUREMENTS**, which are still the reason the fix is a
 * hash and not a shorter path. What the argument above weighed was only the GATE — whether scanning a
 * machine-substituted token as if it were prose is the gate's problem or this file's. It never weighed
 * the other half: `dist/` is imported into Figma, so the path is not merely gate-scanned text, it is a
 * developer's filesystem layout SHIPPED IN AN ARTIFACT, and the same substitution makes two checkouts
 * of one commit emit different bytes. On those two counts the answer does not depend on any gate's
 * scope. The three rows above then decide the form: only the hashed payload clears them. See
 * `treeToken` below for what the hash costs and how each cost is paid back.
 */
const TREE = resolve(root, '../..');

/**
 * THE TREE, HASHED (#1117 instance 2) — the discriminator without the disclosure.
 *
 * The block above argued the absolute path should stay and measured three payloads against the real
 * US-English gate: absolute -> exit 1, basename -> exit 1, hashed -> exit 0. Its conclusion was that
 * only the hash clears the gate and that the hash deletes the field's purpose, so the path stays and
 * the scope question is filed. #1117 reverses that call, and the reason is the half the old argument
 * did not weigh: the path is not only gate-scanned text, it is a DEVELOPER'S FILESYSTEM PATH SHIPPED
 * IN A BUNDLE. `dist/` is what gets imported into Figma; a directory name — and on most machines a
 * username — travels with it. That is a defect on its own terms, independent of any gate, and it is
 * also what makes the build non-reproducible: two checkouts of the same commit emit different bytes.
 *
 * WHAT THE HASH COSTS, AND HOW EACH COST IS PAID. The old argument's objection was that you cannot
 * `git -C <tree> log -1` a hash, cannot re-import the tree it names, and cannot compare it by eye
 * against the manifest path Figma reports. All three need the mapping hash -> path, so the build
 * PRINTS that mapping (below) and it is one command to recover in any checkout:
 *
 *   git worktree list --porcelain | awk '/^worktree /{print $2}' | while read t; do \
 *     printf '%s  %s\n' "$(node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex').slice(0,8))" "$t")" "$t"; done
 *
 * So "which tree is Figma running" is still answerable, in one step rather than zero. What is NOT
 * paid back is reading the answer straight off the panel, and that is the deliberate trade.
 *
 * SHA-256 over the absolute realpath, first 8 hex. Not a security boundary — it is a stable, opaque
 * per-tree token — but it is one-way, which is the property that matters here: the shipped bytes
 * cannot be turned back into someone's directory layout. An ENCODED path would satisfy a
 * "no absolute path" scan and still ship the path, which is why this is a hash and not base64.
 */
const treeToken = (abs) => `tree-${createHash('sha256').update(abs).digest('hex').slice(0, 8)}`;
const buildId = () => {
  const BUILT_AT = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  return `${BUILT_AT} ${treeToken(TREE)}`;
};

/**
 * NO ABSOLUTE FILESYSTEM PATH REACHES THE BUNDLE (#1117 instance 2).
 *
 * The inverse of `assertIdentity`: that one asserts the identity ARRIVED, this asserts the thing it
 * replaced did NOT. Both are needed and neither implies the other — a build that stamped nothing at
 * all would satisfy this and fail that.
 *
 * Two kinds of check, because they fail differently:
 *
 *   · THE EXACT ONE — the building tree's own absolute path, and the builder's home directory. These
 *     are the actual leak and they are literal string containment, so there is nothing to tune. This
 *     is also the arm that is self-referential in the right direction: it names the very string this
 *     machine would have leaked, so it cannot pass by testing a case that does not occur here.
 *   · THE SHAPES — `/Users/x/`, `/home/x/`, `/private/…`, `/tmp/…`, `/var/…`. This catches a leak
 *     that arrives by some route other than PRISM3_BUILD, on a machine whose layout differs from the
 *     builder's. Measured against the pre-#1117 bundles: the ONLY hits were the five occurrences of
 *     the stamp itself, so this scan is not merely quiet — it was loud before the fix and is silent
 *     after, which is the difference between a check and a decoration.
 */
const ABSOLUTE_SHAPES = [
  { label: 'a macOS/Linux home directory', re: /\/(?:Users|home)\/[A-Za-z0-9._-]+\//g },
  { label: 'a system temp or private path', re: /\/(?:private|tmp|var)\/[A-Za-z0-9._-]+/g },
];
const assertNoAbsolutePath = async (name, text) => {
  const found = [];
  for (const [label, needle] of [['the building tree', TREE], ['the builder home directory', homedir()]]) {
    if (needle && text.includes(needle)) found.push(`${label}: ${needle}`);
  }
  for (const { label, re } of ABSOLUTE_SHAPES) {
    for (const m of text.matchAll(re)) found.push(`${label}: ${m[0]}`);
  }
  if (!found.length) return;
  throw new Error(
    `apps/plugin/dist/${name}: an absolute filesystem path reached the bundle — ${found.length} ` +
      `occurrence(s): ${[...new Set(found)].slice(0, 5).join(' · ')}. dist/ is imported into Figma, so ` +
      `a directory name (and usually a username) would ship with it, and two checkouts of one commit ` +
      `would emit different bytes. Stamp a derived token, not a path. See #1117.`,
  );
};

/**
 * Assert the identity REACHED the artifact — the same reason every other assertion in this file exists:
 * `dist/` is gitignored, so a regression here is invisible to typecheck and to every source grep.
 *
 * "AND TO LINT" WAS TRUE WHEN WRITTEN AND #937 MADE IT FALSE — #1113. `lint-us-english.ts` scans
 * `apps/plugin/dist/main.js` and `ui.html` directly, which is the whole premise of the block at line 45
 * above: that gate is why an absolute realpath in this bundle is a scope question at all. Two statements
 * in one file disagree about whether `dist/` is linted, and the correction is the one 40 lines up. The
 * assertions here are still justified — typecheck and grep genuinely cannot see the concatenated output,
 * and the US-English gate reads PROSE, not structure, so it would not catch a lost iife wrapper — but the
 * justification is narrower than the sentence claims, and a narrower reason stated as a broader one is
 * how a later reader concludes no gate covers this directory. Three sites carry the stale clause (here,
 * and the two below); all three are cited.
 *
 * This is not a tautology. The expected value is composed above from `import.meta.url` and the clock; the
 * subject is esbuild's output. And esbuild only substitutes an identifier the entry actually REFERENCES,
 * so a bundle that never reads `PRISM3_BUILD` does not contain the string — which makes this fail if the
 * define is dropped from either entry AND if EVERY reader in it is deleted. Both mutations verified.
 *
 * The word `every` is measured, not a hedge: the main thread has two readers (`postVerdict` and the boot
 * log), and deleting one of them leaves this GREEN, because one surviving reference is all esbuild needs
 * to substitute. So this assertion answers "did the identity reach the artifact", never "does each surface
 * still report it".
 *
 * That second question is asked in `apps/studio/test-build-identity.ts` §6, by two assertions naming the
 * two readers. It is worth being exact about which check does what, because an earlier version of this
 * paragraph pointed at §6's *routing* scan — every verdict goes through `postVerdict` — as if routing
 * answered it. It does not: #1100's reviewer stripped `appendBuildNote` out of `postVerdict`, deleting the
 * identity from every verdict the panel reports, and routing, typecheck, `test:verdict` and this
 * assertion were all still green. The reader assertions are what close that; they are source scans, and
 * behavioral coverage of what the main thread composes is #1106.
 */
const assertIdentity = async (name, text, id) => {
  if (text.includes(id)) return;
  throw new Error(
    `apps/plugin/dist/${name}: the build identity '${id}' did not reach the bundle, so this build cannot ` +
      `say which tree it came from. Either the PRISM3_BUILD define is missing from this entry or nothing ` +
      `in it reads PRISM3_BUILD. See #836.`,
  );
};

const mainOpts = (id) => ({
  entryPoints: [resolve(root, 'src/main.ts')],
  outfile: resolve(out, 'main.js'),
  bundle: true,
  format: 'iife',        // the sandbox is not an ES-module context
  target: 'es2020',
  // #836 — the main thread reads this too, and `PRISM3_BUILD` is a REQUIRED input rather than a value
  // with a fallback: an absent define leaves a bare identifier that throws at load. `PRISM3_HOST` is
  // deliberately NOT defined here — this entry never references it, and defining an identifier no code
  // reads would make `assertIdentity` the only thing proving either define does anything.
  define: { PRISM3_BUILD: JSON.stringify(id) },
  logLevel: 'info',
});

// Bundle the UI to an in-memory JS string, then inline it into the HTML template.
// #110 — the UI IS the shared `studio/src/main.ts` (no fork): the same source the standalone web app
// bundles, built here with PRISM3_HOST='figma' so its commit path posts to the main thread instead
// of downloading. One UI, two outputs. The `../studio/src` engine imports are pure (node-free), so the
// iframe bundle stays self-contained + no-network like the placeholder did.
const WEB_UI = resolve(root, '../studio/src/main.ts');
const htmlTemplate = await readFile(resolve(root, 'src/ui/index.html'), 'utf8');
const buildUiHtml = async (id) => {
  const res = await build({
    entryPoints: [WEB_UI],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    // PRISM3_BUILD is required by every entry that bundles studio/src (#474) — an absent define leaves a
    // bare identifier that throws at load. This used to be the literal `'plugin'`, on the reasoning that
    // the plugin ships inside a versioned manifest and so has no commit to claim. True, and it made the
    // field unfalsifiable: `plugin` is the same string in every checkout, so the one panel chip that could
    // have answered "which tree is Figma running?" answered "a plugin" (#836).
    define: { PRISM3_HOST: '"figma"', PRISM3_BUILD: JSON.stringify(id) },
    // The studio chrome stylesheet is a real .css file since #769, imported by main.ts as TEXT.
    // This loader is what keeps the UI a SINGLE self-contained document: esbuild's default `.css`
    // loader emits a separate stylesheet, which an iframe shipping `allowedDomains:["none"]` has no
    // way to fetch. Dropping it does not silently unstyle the panel — with `write: false` there is
    // no output path, so esbuild refuses the CSS import and this build fails.
    loader: { '.css': 'text' },
    write: false,
    logLevel: 'silent',
  });
  const js = res.outputFiles[0].text;
  // Replace the dev-only module script tag with the inlined bundle.
  // The replacement MUST be a function, not a string (#496). A replacement string interprets `$`
  // patterns, and the bundle legitimately contains `'\\$&'` — the standard regex-escape idiom, from
  // `root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` in the shared UI. As a string that `$&` expanded to
  // the MATCHED text, injecting a literal `</script>` mid-bundle and truncating the inlined script:
  // the panel rendered blank, on a build that exited 0 with both typechecks clean.
  const html = htmlTemplate.replace(
    /<script type="module" src="\.\/ui\.ts"><\/script>/,
    () => `<script>${js}</script>`,
  );
  // Assert what the corruption above violated, because nothing else can see it: `dist/` is a
  // gitignored artifact, so the bug lived only in the concatenated output — invisible to typecheck
  // and to every source grep. ("and to lint" is stale here too — #937 put this exact file in
  // `lint-us-english.ts`'s scope; #1113.) A blank panel in Figma is now a failed build instead.
  const closers = html.split('</script>').length - 1;
  if (closers !== 1) {
    throw new Error(
      `apps/plugin/dist/ui.html: expected exactly 1 </script>, found ${closers}. The inlined bundle ` +
        `closed its own tag early, so the UI will render blank. See #496.`,
    );
  }
  if (html.includes('src="./ui.ts"')) {
    throw new Error('apps/plugin/dist/ui.html: the dev-only module tag survived into the build.');
  }
  await assertIdentity('ui.html', html, id);
  await assertNoAbsolutePath('ui.html', html);
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'ui.html'), html);
  console.log('  dist/ui.html   (shared studio/src UI inlined, host=figma)');
};

const buildMain = async (id) => {
  await build(mainOpts(id));
  // THE SANDBOX-SAFETY ASSERTION, MOVED HERE FROM CI ONLY (#804). `ci.yml` has always run
  // `grep -q "node:" apps/plugin/dist/main.js` after this build, because the Figma main thread has no
  // node: builtins and a regression breaks the plugin at LOAD — not at typecheck, not at build time.
  // This build script asserted four other properties of what it wrote (the version stamp, the iife
  // wrapper, the jszip shim, the single `</script>`) for exactly that reason: `dist/` is gitignored, so
  // a regression there is invisible to typecheck and to every source grep — the third and last site of
  // the stale "and to lint" clause (#1113; #937 linted this directory). This one property
  // was the exception, and the gap was not academic — #804 imported `componentDefs` into the main
  // thread, which pulled `icon-button.ts`'s `$description` prose into the bundle, and one clause read
  // "…reaches a Figma node: the engine…". Local `npm run -w @prism3/plugin build` passed; CI failed.
  //
  // A documented pre-push list weaker than CI is a list a diligent contributor can follow exactly and
  // still ship red, which is the defect class CLAUDE.md principle 4 records twice already. Same grep,
  // same file, deliberately NOT narrowed to import syntax: a check that parsed imports would miss a
  // builtin reached any other way, and the false positives it admits are one dash to fix.
  const mainJs = await readFile(resolve(out, 'main.js'), 'utf8');
  const hits = mainJs.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => l.includes('node:'));
  if (hits.length) {
    throw new Error(
      `apps/plugin/dist/main.js references a node: builtin on ${hits.length} line(s) — the main thread ` +
        `must stay sandbox-safe:\n` +
        hits.map(([n, l]) => `  ${n}: ${String(l).trim().slice(0, 160)}`).join('\n'),
    );
  }
  await assertIdentity('main.js', mainJs, id);
  await assertNoAbsolutePath('main.js', mainJs);
  console.log('  dist/main.js   (0 node: builtins)');
};

// ONE IDENTITY PER REBUILD, SHARED BY BOTH BUNDLES — the two outputs of one source change must not be
// able to disagree about which build they are.
const rebuild = async () => {
  const id = buildId();
  await buildMain(id);
  await buildUiHtml(id);
  return id;
};

if (watch) {
  await rebuild();
  // ONE watch mechanism for both outputs, replacing esbuild's `context().watch()` for main.js beside an
  // `fsWatch` for ui.html. Two reasons, and the first is a correctness one: a context fixes its `define`
  // at creation, so a long-lived watcher would stamp its start time into every later rebuild (#836).
  // The second is that the two mechanisms already watched the same two directories for the same reason.
  // Serialized through a promise chain because `fsWatch` fires several events per save, and overlapping
  // runs would race on `dist/` — pre-existing for ui.html, and now the thing `assertIdentity` would trip on.
  const { watch: fsWatch } = await import('node:fs');
  let queue = Promise.resolve();
  const go = () => { queue = queue.then(rebuild).catch(console.error); };
  fsWatch(resolve(root, 'src'), { recursive: true }, go);
  fsWatch(resolve(root, '../studio/src'), { recursive: true }, go);
  console.log('watching apps/plugin/src + studio/src …');
} else {
  const id = await rebuild();
  // The identity, printed where the person who just ran the build is looking. The 2026-08-26 incident
  // was diagnosed by three lanes reading build output, and none of them could see which tree Figma had.
  console.log(`plugin build complete → apps/plugin/dist/  (${id})`);
  // The mapping the bundle deliberately does not carry (#1117). Printed here, where the person who
  // can act on it is standing: the bundle names the tree by an opaque token, and this is the line
  // that says which tree that token is. Local build output, never a shipped artifact.
  console.log(`  ${treeToken(TREE)} = ${TREE}`);
}
