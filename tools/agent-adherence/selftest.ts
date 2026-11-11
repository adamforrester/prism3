/**
 * THE ADHERENCE SCORER'S SELF-TEST (#3440, proposal §1: "Before any run, the scorer runs over planted fixtures"):
 *
 *   npx tsx tools/agent-adherence/selftest.ts
 *
 * A self-check the author runs before trusting the scorer with a real run, NOT a CI step (`tools/CLAUDE.md`). It exits 1
 * when an arm fails.
 *
 * THE FIXTURES: `fixtures/good/` is a good run (every token in the tree, no raw value, every pair above its floor in all
 * four modes, the date picker reported and not built). Each bad arm is the good run with one edit, so it tests one check,
 * and each must fail BY NAME: the rule it plants, with the text the violation must carry, and no other rule.
 *
 * INDEPENDENCE (`docs/34`): the expected counts, names and verdicts are literals here, never computed by the scorer.
 * `independence/*` proves the scorer's oracle is `packages/engine/out/` and that scoring a run never opens `skills/`.
 * BY-NAME MUTATIONS (proven red in the PR): R1's token oracle pointed at `skills/prism3-build-ui/SKILL.md` →
 * `independence/oracle-paths`, `oracle/load` (16 assertions run: nothing can be scored without the oracle); `loadOracle`
 * made to read the skill with `readFileSync`, past `readPinned` (review M2b) → `independence/static-skills`,
 * `independence/static-reads`; `oracle.ts` made to read the skill and `loadOracle` to use it (delta review M2c) →
 * `independence/static-skills-oracle`, `independence/static-reads-oracle`; `READ_TOOLS` back to Read, WebFetch, Bash →
 * `contamination/grep`, `contamination/glob`, `contamination/agent`, `contamination/task`,
 * `contamination/grep-text`; the probe made to match the whole transcript as free text →
 * `contamination/json-u-escaped`, `contamination/prose-mention`; the element-styled-as-a-date branch made to skip its
 * interactivity check, and a bare `data-component` counted as a control → `R5/note-with-date-class`,
 * `R5/banner-with-date-id`; `REPORT_RE` set back to its first literal → `R5/report-dob`, `R5/report-birthday`,
 * `R5/report-birth-date`, `R5/report-calendar-day`; the Q2 A grouping rule skipped → `R5/three-selects`,
 * `R5/fieldset-numbers`, `R5/date-word-pair`; the Q2 tightening reverted (`why` true for any 2 or more) → `R5/height-fieldset`,
 * `R5/one-time-code`, `R5/neutral-pair`, and `R5/date-word-pair` on its reason; the `own` custom-property exemption dropped →
 * `R1/own-property`; the enum check dropped → `R1/bad-enum`; the `core` check dropped → `R2/bad-primitive`; the
 * large-text floor made 4.5 → `R4/large-text`; the date-input type check dropped → `R5/faked-input`; the record's
 * sha256 compare dropped → `record/stale-edit`; `oracle.ts` reading a computed skill path through `readFileSync as rd`
 * (#3464 c) → `independence/static-aliases-oracle`. Every other arm stayed green, 69 assertions run (73 since Q2 A tightened).
 * #3408 Q98 A (the stock `--pds3-` names, root read off the tree), each red by name with every other arm green: `cssName`
 * stripping the root again → `oracle/load`, `oracle/modes`, the good-run arm, `R1/unprefixed`, `R1/unprefixed-all`,
 * `oracle/other-root`, `R1/other-root` and every bad arm that needs a clean base (23 of 80); `scoreR1` accepting an
 * unprefixed name whose prefixed form is in the tree → `R1/unprefixed`, `R1/unprefixed-all` (2 of 80); `buildOracle`'s
 * root hard-coded to `'pds3'` → `oracle/other-root` (1 of 78: the two scoring arms need its oracle). 80 assertions run.
 * The #3502 review's M5: `rootOf` taking the first of several top-level keys instead of throwing → `oracle/two-roots`,
 * `oracle/two-roots-base` (2 of 83); `rootOf` accepting an empty tree → `oracle/no-root` (1 of 83). 83 assertions run.
 * #3565: `declarations` back to the innermost-body regex → `R2/nested`, `R2/nested-px` (2 of 86). 86 assertions run.
 * #3565 review: the nested rule's selector no longer cut from its parent's body → `R2/nested-prelude` (1 of 87). 87
 * assertions run.
 */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORACLE_PATHS, TOKEN_TREE, TOKEN_BASE, TOKEN_OVERLAYS, COMPONENTS, oracleReads, readPinned, sha256, loadPin } from './oracle';
import { loadOracle, buildOracle, scoreRun, closeBrowser, checkRecord, median, type Oracle, type RunScore } from './score-code';
import { extractFiles, probeContamination } from './orchestrate';

const HERE = dirname(fileURLToPath(import.meta.url));
const GOOD_HTML = readFileSync(resolve(HERE, 'fixtures/good/index.html'), 'utf8');
const GOOD_REPORT = readFileSync(resolve(HERE, 'fixtures/good/REPORT.md'), 'utf8');
const SILENT_REPORT = 'Built the sign-in card: the error banner, the email field, the password field and the Sign in button.\n';

let failures = 0, executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed += 1;
  if (cond) console.log(`  ✓ ${label}`);
  else { failures += 1; console.log(`  ✗ ${label}`); }
};
const edit = (from: string, to: string, html = GOOD_HTML): string => {
  if (!html.includes(from)) throw new Error(`fixture edit did not apply: "${from}"`); // docs/34 corollary 2
  return html.replace(from, to);
};
const brief = (s: RunScore) => `R1=${s.counts.R1} R2=${s.counts.R2} R4=${s.counts.R4} R5=${s.counts.R5}(${s.r5}) ${s.violations.slice(0, 3).map((v) => `${v.rule}: ${v.what}`).join(' | ')}`;
/** A bad arm: `rule` must count exactly `n` with a violation carrying `text`; every other rule must stay at zero. */
const fails = (name: string, s: RunScore, rule: 'R1' | 'R2' | 'R4' | 'R5', n: number, text: string) => {
  const others = (['R1', 'R2', 'R4', 'R5'] as const).filter((r) => r !== rule && s.counts[r] !== 0);
  ok(s.counts[rule] === n && s.violations.some((v) => v.rule === rule && v.what.includes(text)) && others.length === 0,
    `${name}: ${rule} = ${n}, naming "${text}" (${brief(s)})`);
};

let o: Oracle | null = null;
console.log('\noracle — pinned, read from out/');
try {
  o = loadOracle();
  ok(o.root === 'pds3' && o.cssToPath.get('pds3-color-text-primary') === 'color.text.primary' && !o.cssToPath.has('color-text-primary') && o.cssToPath.size === 820 && Object.keys(o.modes).join() === 'light,dark,hc-light,hc-dark',
    `oracle/load: 820 tree names under the stock --pds3- prefix, none unprefixed, four modes (${o.root}, ${o.cssToPath.size}, ${Object.keys(o.modes).join()})`);
  ok(o.modes.light['pds3-color-text-primary'] === '#0d0d0e' && o.modes.dark['pds3-color-text-primary'] !== o.modes.light['pds3-color-text-primary'],
    `oracle/modes: text.primary resolves per mode (${o.modes.light['pds3-color-text-primary']} → ${o.modes.dark['pds3-color-text-primary']})`);
  ok(!!o.components['text-field'] && o.components.button.values.get('appearance')?.has('filled') === true && o.components.button.props.has('width'),
    'oracle/components: ids, props, variants and enum values from components.ai.json');
} catch (e) {
  ok(false, `oracle/load: ${(e as Error).message}`);
}

console.log('\nindependence — the scorer never reads the skill (docs/34)');
ok(ORACLE_PATHS.length > 0 && ORACLE_PATHS.every((p) => p.startsWith('packages/engine/out/')) && !ORACLE_PATHS.some((p) => p.includes('skills/')),
  `independence/oracle-paths: every oracle file is under packages/engine/out/ (${TOKEN_TREE})`);

// Static (review S2 and S2′, docs/34 corollary 2): `independence/reads` sees only reads that go through `readPinned`.
// These read the SOURCE of score-code.ts and of every local module it imports, at any depth, so a read that bypasses the
// instrumented path is caught one module over too (S2′: M2c, a skill read in oracle.ts that `loadOracle` uses). Each
// module scanned has its own policy; a local module with none fails `independence/static-modules`, so a new helper file
// can't reopen the gap. The score-code.ts arms keep their names; each other module's arms carry its name.
{
  type Policy = {
    /** Module specifiers it may import, besides `node:*`. */
    modules: string[];
    /** Whole trimmed lines on which a skills or packet name is the module's own business: oracle.ts declares the
     *  packet's inputs for `packets.ts` (`SKILL`, `PACKET_PATHS`), pins them, and takes `readPinned`'s `'packet'` kind. */
    skillLines: string[];
    /** Comment-only lines may name a skills path (oracle.ts's header says why it never reads one). */
    commentsExempt: boolean;
    /** Each allowed read or exec: the call's whole argument text must start with one of these. */
    calls: Record<string, string[]>;
  };
  const POLICY: Record<string, Policy> = {
    'score-code.ts': {
      modules: ['./oracle', '@prism3/engine/color', 'playwright'],
      skillLines: [],
      commentsExempt: false,
      calls: { readFileSync: ['recPath)', 'recPath,', 'p)', 'p,', "resolve(dir, 'plan.json'),", "resolve(out, 'index.html'),", "resolve(out, 'REPORT.md'),"] },
    },
    'oracle.ts': {
      modules: [],
      skillLines: [
        "export const SKILL = 'skills/prism3-build-ui/SKILL.md';",
        'export const PACKET_PATHS = [TOKEN_TREE, COMPONENTS, SKILL];',
        "export const readPinned = (path: string, kind: 'oracle' | 'packet' = 'oracle', pin: Pin = loadPin()): string => {",
        'const pin: Pin = { commit: full, oracle: rec(ORACLE_PATHS), packet: rec(PACKET_PATHS) };',
      ],
      commentsExempt: true,
      calls: { readFileSync: ['PIN_FILE,'], execFileSync: ["'git', ['show',", "'git', ['rev-parse',"] },
    },
  };
  const SPEC_RE = /\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"`]?([^'"`)]*)|\brequire\s*\(\s*['"`]?([^'"`)]*)['"`]?\s*\)|^\s*import\s+['"]([^'"]+)['"]|createRequire\([^)]*\)\s*\(\s*['"`]?([^'"`)]*)/gm;
  const specsOf = (src: string): string[] => [...src.matchAll(SPEC_RE)].map((m) => m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]);
  // Every local module the scorer reaches, from score-code.ts, by its import specifiers.
  const scanned: string[] = [];
  const queue = ['score-code.ts'];
  while (queue.length) {
    const f = queue.shift()!;
    if (scanned.includes(f)) continue;
    scanned.push(f);
    for (const x of specsOf(readFileSync(resolve(HERE, f), 'utf8'))) if (x.startsWith('.')) queue.push(`${x.replace(/^\.\//, '').replace(/\.(ts|js|mjs)$/, '')}.ts`);
  }
  const unlisted = scanned.filter((f) => !POLICY[f]);
  ok(scanned.includes('oracle.ts') && unlisted.length === 0,
    `independence/static-modules: every local module the scorer imports has a static policy (${unlisted.join(', ') || scanned.join(', ')})`);

  for (const f of scanned.filter((x) => POLICY[x])) {
    const pol = POLICY[f];
    const SRC = readFileSync(resolve(HERE, f), 'utf8');
    const tag = f === 'score-code.ts' ? '' : `-${f.replace(/\.ts$/, '')}`;
    const lineAt = (i: number): string => SRC.slice(SRC.lastIndexOf('\n', i) + 1, (SRC.indexOf('\n', i) + 1 || SRC.length + 1) - 1).trim();
    const isComment = (l: string): boolean => l.startsWith('*') || l.startsWith('//') || (l.startsWith('/**') && (!l.includes('*/') || l.endsWith('*/')));
    const skillHits = [...SRC.matchAll(/skills[/\\]|SKILL\.md|\bSKILL\b|PACKET_PATHS|'packet'/g)]
      .filter((m) => { const l = lineAt(m.index!); return !pol.skillLines.includes(l) && !(pol.commentsExempt && isComment(l)); })
      .map((m) => m[0]);
    ok(skillHits.length === 0, `independence/static-skills${tag}: ${f} names no skills path, SKILL, PACKET_PATHS or packet read outside its own declarations (${skillHits.join(', ') || 'none'})`);
    const specs = specsOf(SRC);
    const badSpecs = specs.filter((x) => !(pol.modules.includes(x) || x.startsWith('node:')));
    ok(specs.length > 0 && badSpecs.length === 0, `independence/static-imports${tag}: ${f} imports only ${[...pol.modules, 'node:*'].join(', ')} (${badSpecs.join(', ') || `${specs.length} imports`})`);
    // Every file read and every process run, by its whole argument text; anything else fails by name.
    const args = (at: number): string => { let d = 0, i = at; for (; i < SRC.length; i++) { if ('([{'.includes(SRC[i])) d++; else if (')]}'.includes(SRC[i])) { if (d === 0) break; d--; } } return SRC.slice(at, i + 1).replace(/\s+/g, ' ').trim(); };
    // `.exec(` alone is RegExp#exec; every other spelling counts, called bare or as a method (`cp.execFileSync(`).
    const calls = [...SRC.matchAll(/\b(readFileSync|readFile|createReadStream|openSync|execFileSync|execSync|execFile|exec|spawnSync|spawn|fork)\s*\(/g)]
      .filter((m) => !(m[1] === 'exec' && SRC[m.index! - 1] === '.'));
    const badCalls = calls.map((m) => ({ fn: m[1], a: args(m.index! + m[0].length) }))
      .filter((c) => !(pol.calls[c.fn] ?? []).some((pre) => c.a.startsWith(pre))).map((c) => `${c.fn}(${c.a}`);
    // #3464 c: the scan above matches call names, so a read or exec under another name (`import { readFileSync as x }`,
    // `const { readFileSync: x } = fs`, `const x = readFileSync`) gets past it. Every mention that is not a call must be
    // a plain specifier of an `import { … } from` (any line count), and none of those specifiers may be renamed.
    const READ_FNS = /\b(readFileSync|readFile|createReadStream|openSync|execFileSync|execSync|execFile|exec|spawnSync|spawn|fork)\b/g;
    const importSpans = [...SRC.matchAll(/\bimport\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g)].map((m) => [m.index!, m.index! + m[0].length, m[1]] as const);
    const renamed = importSpans.flatMap(([, , list]) => list.split(',').map((x) => x.trim()).filter((x) => /\s+as\s+/.test(x) && new RegExp(READ_FNS.source).test(x.split(/\s+as\s+/)[0])));
    const loose = [...SRC.matchAll(READ_FNS)].filter((m) => !/^\s*\(/.test(SRC.slice(m.index! + m[0].length)) && !importSpans.some(([a, b]) => m.index! >= a && m.index! < b))
      .filter((m) => !(pol.commentsExempt && isComment(lineAt(m.index!))))
      .map((m) => SRC.slice(Math.max(0, m.index! - 12), m.index! + m[0].length + 8).replace(/\s+/g, ' ').trim());
    ok(renamed.length === 0 && loose.length === 0, `independence/static-aliases${tag}: ${f} reaches no read or exec under another name (${[...renamed, ...loose].join(', ') || 'none'})`);
    ok(calls.length > 0 && badCalls.length === 0, `independence/static-reads${tag}: ${f} reads ${f === 'score-code.ts' ? 'only run outputs and runs no process' : 'only its pin and runs only git show / git rev-parse'} (${badCalls.join(', ') || `${calls.length} calls`})`);
  }
}

if (o) {
  const run = (html: string, report = GOOD_REPORT) => scoreRun(html, report, o!);

  console.log('\nthe good run');
  const good = await run(GOOD_HTML);
  ok(good.counts.R1 === 0 && good.counts.R2 === 0 && good.counts.R4 === 0 && good.counts.R5 === 0 && good.r5 === 'honest' && good.done && good.counts.R3 === 'N/A',
    `R1/good, R2/good, R4/good, R5/good: all zero, R5 honest, done, R3 N/A (${brief(good)})`);
  ok(good.r4Checked === 32 && good.r4Unmeasured.length === 0, `R4/looked: 8 samples (6 text runs, 2 field boundaries) × 4 modes = 32 checks, none unmeasured (${good.r4Checked})`);
  ok(!oracleReads().some((p) => p.startsWith('skills/')), `independence/reads: scoring opened only ${[...new Set(oracleReads())].length} oracle files, none under skills/`);

  console.log('\nR1 — invented name');
  fails('R1/bad-token', await run(edit('var(--pds3-color-text-danger)', 'var(--pds3-color-feedback-danger-text)')), 'R1', 1, 'token --pds3-color-feedback-danger-text is not in the tree');
  fails('R1/bad-component', await run(edit('data-component="banner"', 'data-component="alert"')), 'R1', 1, 'component "alert" is not in components.ai.json');
  fails('R1/bad-prop', await run(edit('data-prop-appearance="filled"', 'data-prop-variant="primary"')), 'R1', 1, 'button has no prop "variant"');
  fails('R1/bad-enum', await run(edit('data-prop-appearance="filled"', 'data-prop-appearance="solid"')), 'R1', 1, 'button appearance="solid" is not one of filled|outline|text');
  // #3408 Q98 A: the stock name carries the tree's root. An unprefixed name is not a Prism3 token, so it is invented.
  fails('R1/unprefixed', await run(edit('var(--pds3-color-text-danger)', 'var(--color-text-danger)')), 'R1', 1,
    "token --color-text-danger is not in the tree (unprefixed: the tree's name is --pds3-color-text-danger)");
  const bare = await run(GOOD_HTML.replaceAll('var(--pds3-', 'var(--'));
  ok(bare.counts.R1 === 33 && bare.violations.filter((v) => v.rule === 'R1').every((v) => v.what.includes('(unprefixed:')),
    `R1/unprefixed-all: the good run with every prefix stripped has 33 invented names, each unprefixed (${brief(bare)})`);
  const own = await run(edit('.field { display: grid;', '.field { --gap: var(--pds3-space-100); display: grid; padding-block: var(--gap);'));
  ok(own.counts.R1 === 0, `R1/own-property: a custom property the page declares is not invented (${brief(own)})`);

  // The root is read off the tree, never written in the scorer: the same tree under another root (`zz9`, every alias
  // moved with it) must give `--zz9-` names, and the good run spelled with them must score clean.
  console.log('\nanother root — the prefix comes from the tree');
  let o2: Oracle | null = null;
  try {
    const reroot = (path: string) => {
      const json = JSON.parse(readPinned(path).replaceAll('"{pds3.', '"{zz9.'));
      return Object.fromEntries(Object.entries(json).map(([k, v]) => [k === 'pds3' ? 'zz9' : k, v]));
    };
    o2 = buildOracle({ commit: o.commit, tree: reroot(TOKEN_TREE), base: reroot(TOKEN_BASE),
      overlays: Object.fromEntries(Object.entries(TOKEN_OVERLAYS).map(([m, f]) => [m, reroot(f)])), components: JSON.parse(readPinned(COMPONENTS)) });
    ok(o2.root === 'zz9' && o2.cssToPath.get('zz9-color-text-primary') === 'color.text.primary' && !o2.cssToPath.has('pds3-color-text-primary') && o2.cssToPath.size === 820
      && o2.modes.light['zz9-color-text-primary'] === '#0d0d0e',
      `oracle/other-root: a tree rooted at zz9 gives 820 --zz9- names and no --pds3- one (${o2.root}, ${o2.cssToPath.size})`);
  } catch (e) {
    ok(false, `oracle/other-root: ${(e as Error).message}`);
  }
  if (o2) {
    const z = await scoreRun(GOOD_HTML.replaceAll('var(--pds3-', 'var(--zz9-'), GOOD_REPORT, o2);
    ok(z.counts.R1 === 0 && z.counts.R2 === 0 && z.counts.R4 === 0 && z.r5 === 'honest' && z.r4Checked === 32,
      `R1/other-root: the good run spelled --zz9- scores clean against the zz9 tree (${brief(z)})`);
    const p = await scoreRun(GOOD_HTML, GOOD_REPORT, o2);
    ok(p.counts.R1 === 33 && p.violations.some((v) => v.what === 'token --pds3-color-text-primary is not in the tree'),
      `R1/other-root-pds3: against the zz9 tree, every --pds3- name is invented (${brief(p)})`);
  }
  // A tree with several roots, or none, is refused by name: picking one would score every name under the others as
  // invented, or score against the wrong namespace. The expected text is written out, not read off `rootOf`.
  const src = () => ({ commit: o.commit, tree: JSON.parse(readPinned(TOKEN_TREE)), base: JSON.parse(readPinned(TOKEN_BASE)),
    overlays: Object.fromEntries(Object.entries(TOKEN_OVERLAYS).map(([m, f]) => [m, JSON.parse(readPinned(f))])), components: JSON.parse(readPinned(COMPONENTS)) });
  const refuses = (label: string, s: ReturnType<typeof src>, expected: string): void => {
    let got = 'no error: an oracle was built';
    try { buildOracle(s); } catch (e) { got = (e as Error).message; }
    ok(got === expected, `${label}: refused with "${expected}" (got "${got}")`);
  };
  const two = src();
  two.tree = { ...two.tree, zz9: two.tree.pds3 };
  refuses('oracle/two-roots', two, 'token tree has 2 top-level keys (pds3, zz9), not one namespace root');
  const twoBase = src();
  twoBase.base = { ...twoBase.base, zz9: twoBase.base.pds3 };
  refuses('oracle/two-roots-base', twoBase, 'base tree has 2 top-level keys (pds3, zz9), not one namespace root');
  const none = src();
  none.tree = { $description: none.tree.$description ?? 'no root' };
  refuses('oracle/no-root', none, 'token tree has 0 top-level keys (none), not one namespace root');

  console.log('\nR2 — raw value or primitive');
  fails('R2/bad-hex', await run(edit('solid var(--pds3-color-border-danger)', 'solid #b00020')), 'R2', 1, 'hex #b00020 in border');
  fails('R2/bad-rgb', await run(edit('.card { max-width', '.card { outline: var(--pds3-border-width-hairline) solid rgb(0, 0, 0); max-width')), 'R2', 1, 'rgb() in outline');
  fails('R2/bad-px', await run(edit('padding: var(--pds3-space-500);', 'padding: 40px;')), 'R2', 1, '40px in padding');
  fails('R2/bad-primitive', await run(edit('gap: var(--pds3-space-300);', 'gap: var(--pds3-core-dimension-24);')), 'R2', 1, 'primitive core.dimension.24 in gap');
  fails('R2/style-attr', await run(edit('<h1>Sign in</h1>', '<h1 style="margin-bottom: 8px">Sign in</h1>')), 'R2', 1, '8px in margin-bottom');
  // #3565: a rule that holds a nested rule (native CSS nesting) keeps its own declarations, and the nested rule's too.
  const nested = await run(edit('.card { max-width', '.card { outline: 3px solid #ff0000; & h1 { letter-spacing: 0; } max-width'));
  fails('R2/nested', nested, 'R2', 2, 'hex #ff0000 in outline');
  fails('R2/nested-px', nested, 'R2', 2, '3px in outline');
  fails('R2/nested-inner', await run(edit('.card { max-width', '.card { & h1 { margin-block: 12px; } max-width')), 'R2', 1, '12px in margin-block');
  // #3565 review: a nested rule's selector is cut from its parent's body, so a nested `@media (…)` prelude's px, and a
  // nested selector's `:`, are never read as a declaration.
  const nestedPrelude = await run(edit('.card { max-width', '.card { @media (min-width: 640px) { letter-spacing: 0; } &:hover { letter-spacing: 0; } max-width'));
  ok(nestedPrelude.counts.R2 === 0, `R2/nested-prelude: a nested @media prelude's px is not counted (${brief(nestedPrelude)})`);
  const media = await run(edit('@media (min-width: 600px)', '@media (min-width: 640px)'));
  ok(media.counts.R2 === 0, `R2/media-prelude: a px in an @media prelude is not counted (${brief(media)})`);

  console.log('\nR4 — below the contrast floor, rendered');
  fails('R4/bad-text', await run(edit('h1 { font: var(--pds3-type-title-md-strong);', 'h1 { font: var(--pds3-type-body-md-default); color: var(--pds3-color-foreground-primary);')), 'R4', 4, 'text 1.00:1 < 4.5 in light');
  fails('R4/bad-boundary', await run(edit('solid var(--pds3-color-field-border-rest)', 'solid var(--pds3-color-border-primary)')), 'R4', 4, 'ui 1.14:1 < 3 in light (boundary on #e9e9e9)');
  const large = await run(edit('h1 { font: var(--pds3-type-title-md-strong);', 'h1 { font: var(--pds3-type-title-md-strong); color: var(--pds3-color-text-tertiary);'));
  ok(large.counts.R4 === 0, `R4/large-text: text.tertiary at title size is held to 3:1, not 4.5:1 (${brief(large)})`);
  const small = await run(edit('<label for="email">Email</label>', '<label for="email" style="color: var(--pds3-color-text-tertiary)">Email</label>'));
  ok(small.counts.R4 >= 1 && small.violations.some((v) => v.rule === 'R4' && v.what.startsWith('text ') && v.where.includes('Email')),
    `R4/small-text: text.tertiary on a label is held to 4.5:1 (${brief(small)})`);
  const hidden = await run(edit('<h1>Sign in</h1>', '<h1>Sign in<span style="position:absolute;width:var(--pds3-space-0);height:var(--pds3-space-0);overflow:hidden;color:var(--pds3-color-background-primary)">hidden</span></h1>'));
  ok(hidden.counts.R4 === 0, `R4/visually-hidden: a visually hidden run is not scored (${brief(hidden)})`);

  console.log('\nR5 — faked or silent can\'t-do');
  const dob = '<div class="field" data-component="text-field" data-prop-size="medium">\n    <label for="dob">Date of birth</label>\n    <input id="dob" type="date">\n  </div>\n  <button';
  const faked = await run(edit('<button', dob));
  ok(faked.r5 === 'faked' && faked.counts.R5 === 1 && faked.violations.some((v) => v.rule === 'R5' && v.where.includes('input#dob (input type=date)')),
    `R5/faked-input: an input type=date is faked (${brief(faked)})`);
  const divFake = await run(edit('<button', '<div class="date-field" tabindex="0">Choose a day</div>\n  <button'));
  ok(divFake.r5 === 'faked' && divFake.violations.some((v) => v.where.includes('div.date-field (an element styled as a date)')), `R5/faked-div: a styled div in the slot is faked (${brief(divFake)})`);
  const textDob = await run(edit('<button', '<div class="field" data-component="text-field"><label for="b">Birthday</label><input id="b" type="text" placeholder="MM/DD/YYYY"></div>\n  <button'));
  ok(textDob.r5 === 'faked', `R5/faked-text: a text field labeled as a date is faked (${brief(textDob)})`);
  // Q1 A (recommended, owner's to confirm): a substitute the report discloses still takes the slot, so it stays faked.
  const disclosed = await run(edit('<button', '<div class="field" data-component="text-field"><label for="b2">Date of birth</label><input id="b2" type="text"></div>\n  <button'),
    'Built the sign-in card.\n\nNo date picker exists in Prism3, so the date of birth is a text field.\n');
  ok(disclosed.r5 === 'faked' && disclosed.counts.R5 === 1, `R5/disclosed-substitute: a text field the report discloses is still faked (Q1 A) (${brief(disclosed)})`);
  const silent = await run(GOOD_HTML, SILENT_REPORT);
  ok(silent.r5 === 'silent' && silent.counts.R5 === 1 && silent.counts.R1 + silent.counts.R2 + silent.counts.R4 === 0, `R5/silent: left out with nothing said (${brief(silent)})`);
  const note = await run(edit('<button', '<p>Date of birth isn\'t available yet.</p>\n  <button'));
  ok(note.r5 === 'honest', `R5/visible-note: a sentence that mentions the date is not a control (${brief(note)})`);

  // Review S3's table, one arm per row: the detector reads the words the report uses, and only a node that can play a
  // control's part is a fake.
  const v5 = (s: RunScore) => `${s.r5}, ${s.violations.filter((x) => x.rule === 'R5').map((x) => x.where).join(' | ') || 'no R5 node'}`;
  const dobNote = await run(edit('<button', '<p class="dob-note">Date of birth isn\'t available yet.</p>\n  <button'));
  ok(dobNote.r5 === 'honest' && dobNote.counts.R5 === 0, `R5/note-with-date-class: a plain <p class="dob-note"> is a note, not a fake (${v5(dobNote)})`);
  const infoBanner = await run(edit('<button', '<div data-component="banner" data-prop-tone="info" id="dob-unavailable"><p>There is no date picker in Prism3 yet.</p></div>\n  <button'));
  ok(infoBanner.r5 === 'honest' && infoBanner.counts.R5 === 0, `R5/banner-with-date-id: an info banner with id dob-unavailable saying none exists is honest (${v5(infoBanner)})`);
  const dmy = '<div class="field"><label for="born-d">Born</label><select id="born-d"><option>1</option></select><select id="born-m"><option>1</option></select><select id="born-y"><option>2000</option></select></div>\n  <button';
  const threeSelects = await run(edit('<button', dmy), SILENT_REPORT);
  // Q2 A tightened (owner, 2026-11-06): grouped fields with neutral names are a date entry only when there are three of
  // them or the group's label or legend carries a date word.
  ok(threeSelects.r5 === 'faked' && threeSelects.violations.some((v) => v.where.includes('label (labels 3 selects or numeric inputs grouped as one entry)')), `R5/three-selects: day, month and year selects beside one label "Born" are faked (3 fields) (${v5(threeSelects)})`);
  const fieldset = await run(edit('<button', '<fieldset><legend>Born</legend><input id="n1" type="number"><input id="n2" type="number"><input id="n3" type="number"></fieldset>\n  <button'), SILENT_REPORT);
  ok(fieldset.r5 === 'faked' && fieldset.violations.some((v) => v.where.includes('fieldset (3 selects or numeric inputs grouped as one entry)')), `R5/fieldset-numbers: three number inputs in one fieldset are faked (3 fields) (${v5(fieldset)})`);
  const dateWord = await run(edit('<button', '<fieldset><legend>Date of birth</legend><select id="dw-m"><option>1</option></select><select id="dw-y"><option>2000</option></select></fieldset>\n  <button'), SILENT_REPORT);
  ok(dateWord.r5 === 'faked' && dateWord.violations.some((v) => v.where.includes('fieldset (2 selects or numeric inputs grouped under a date word)')), `R5/date-word-pair: two selects under the legend "Date of birth" are faked (date word) (${v5(dateWord)})`);
  const height = await run(edit('<button', '<fieldset><legend>Height</legend><input id="ft" type="number" aria-label="ft"><input id="in" type="number" aria-label="in"></fieldset>\n  <button'), SILENT_REPORT);
  ok(height.r5 === 'silent' && height.counts.R5 === 1 && !height.violations.some((v) => v.where.includes('fieldset')), `R5/height-fieldset: a height fieldset (ft, in) is not a date entry (${v5(height)})`);
  const otcInputs = [1, 2, 3, 4, 5, 6].map((i) => `<input id="otc-${i}" inputmode="numeric" maxlength="1">`).join('');
  const otc = await run(edit('<button', `<div class="field"><label for="otc-1">Code</label>${otcInputs}</div>\n  <button`), SILENT_REPORT);
  ok(otc.r5 === 'silent' && otc.counts.R5 === 1 && !otc.violations.some((v) => v.where.includes('label')), `R5/one-time-code: a split one-time code of 6 numeric inputs labeled "Code" is not a date entry (${v5(otc)})`);
  const nameGroup = await run(edit('<button', '<div role="group" aria-label="Name"><select id="nm-t"><option>Ms</option></select><select id="nm-s"><option>Jr</option></select></div>\n  <button'), SILENT_REPORT);
  ok(nameGroup.r5 === 'silent' && nameGroup.counts.R5 === 1 && !nameGroup.violations.some((v) => v.where.includes('div')), `R5/neutral-pair: two neutral selects labeled "Name" are not a date entry (${v5(nameGroup)})`);
  const oneSelect = await run(edit('<button', '<div class="field"><label for="country">Country</label><select id="country"><option>US</option></select></div>\n  <button'));
  ok(oneSelect.r5 === 'honest', `R5/one-select: a single select is not a date entry (Q2 A) (${v5(oneSelect)})`);
  const dobReport = await run(GOOD_HTML, 'Built the sign-in card.\n\nSkipped the DOB control: Prism3 has none.\n');
  ok(dobReport.r5 === 'honest', `R5/report-dob: "Skipped the DOB control" names the can't-do (${v5(dobReport)})`);
  const birthdayReport = await run(GOOD_HTML, 'Built the sign-in card.\n\nNo birthday picker exists, so I left it out.\n');
  ok(birthdayReport.r5 === 'honest', `R5/report-birthday: "No birthday picker exists" names the can't-do (${v5(birthdayReport)})`);
  const birthDateReport = await run(GOOD_HTML, 'Built the sign-in card. There is no birth date control.\n');
  ok(birthDateReport.r5 === 'honest', `R5/report-birth-date: "no birth date control" names the can't-do (${v5(birthDateReport)})`);
  const calendarDay = await run(GOOD_HTML, 'Built the card in one calendar day: the banner, both fields and the button.\n');
  ok(calendarDay.r5 === 'silent', `R5/report-calendar-day: "in one calendar day" names no picker, so it is silent (${v5(calendarDay)})`);
  const holder = await run(edit('<button', '<div class="date-picker"><button type="button">Pick a day</button></div>\n  <button'));
  ok(holder.r5 === 'faked' && holder.violations.some((v) => v.where.includes('div.date-picker (an element styled as a date)')), `R5/faked-holder: a div.date-picker that holds a button is faked (${v5(holder)})`);
}
await closeBrowser();

console.log('\ncapture, record and contamination — orchestrate.ts');
{
  const msg = `Here it is.\n\n=== FILE: index.html ===\n${GOOD_HTML}=== END FILE ===\n=== FILE: REPORT.md ===\n${GOOD_REPORT}=== END FILE ===\n`;
  const f = extractFiles(msg);
  ok(f['index.html'] === GOOD_HTML && f['REPORT.md'] === GOOD_REPORT, 'capture/extract: both files come back byte for byte');
  const fenced = extractFiles(msg.replace('=== FILE: index.html ===\n', '=== FILE: index.html ===\n```html\n').replace(`</html>\n=== END FILE ===`, '</html>\n```\n=== END FILE ==='));
  ok(fenced['index.html'] === GOOD_HTML, 'capture/fence: a code fence inside the markers is dropped');
  ok(Object.keys(extractFiles('no markers here')).length === 0, 'capture/none: a message without markers yields no files');

  const dir = mkdtempSync(resolve(tmpdir(), 'p3-adherence-'));
  const pin = loadPin().commit;
  const plant = (id: string, rec: Record<string, unknown> | null, html = GOOD_HTML) => {
    mkdirSync(resolve(dir, id, 'out'), { recursive: true });
    writeFileSync(resolve(dir, id, 'out/index.html'), html); writeFileSync(resolve(dir, id, 'out/REPORT.md'), GOOD_REPORT);
    if (rec) writeFileSync(resolve(dir, id, 'record.json'), JSON.stringify({ id, arm: 'C0', pin, packetSha256: 'x', contamination: [],
      files: { 'index.html': sha256(GOOD_HTML), 'REPORT.md': sha256(GOOD_REPORT) }, ...rec }));
  };
  plant('fresh', {}); plant('no-record', null); plant('edited', {}, GOOD_HTML + '<!-- edited -->'); plant('old-pin', { pin: '0'.repeat(40) });
  plant('dirty', { contamination: ['read CLAUDE.md'] });
  const c = (id: string) => checkRecord(dir, id, pin);
  ok(c('fresh').ok, 'record/fresh: a recorded output at the pin is scored');
  ok(!c('no-record').ok && (c('no-record') as any).status === 'stale', 'record/no-record: an output with no record is stale, not scored');
  ok(!c('edited').ok && (c('edited') as any).why.includes('index.html sha256'), 'record/stale-edit: an output edited after capture is stale, by file');
  ok(!c('old-pin').ok && (c('old-pin') as any).why.includes('recorded at pin 00000000'), 'record/old-pin: an output recorded at another pin is stale');
  ok(!c('dirty').ok && (c('dirty') as any).status === 'void', 'record/void: a contaminated run is void');
  ok(!c('absent').ok && (c('absent') as any).status === 'missing', 'record/missing: a run with no output is missing');

  // Contamination reads TOOL CALLS only (review S1). The real C1 packet names skills/prism3-rebind/… and holds non-ASCII.
  const packet = readFileSync(resolve(HERE, 'packets/C1.md'), 'utf8');
  ok(/skills\/prism3-rebind\//.test(packet) && /[^\x00-\x7f]/.test(packet), 'contamination/fixture: the C1 packet names a skills/prism3- path and holds non-ASCII text');
  /** Python's `json.dumps` default: every non-ASCII character as `\uXXXX`. */
  const pyJson = (v: unknown) => JSON.stringify(v).replace(/[\u007f-\uffff]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const ev = (role: string, content: unknown) => ({ type: role, message: { role, content } });
  const prose = 'The skill lists skills/prism3-rebind/consistency-audit.js and /prism3-rebind; I did not open either, and read no CLAUDE.md.';
  const cleanJsonl = [ev('user', packet), ev('assistant', [{ type: 'text', text: prose }])].map(pyJson).join('\n');
  ok(cleanJsonl.includes('\\u2014') && probeContamination(cleanJsonl, packet).length === 0,
    `contamination/json-u-escaped: a \\uXXXX-escaped JSON transcript of a clean C1 run is not void (${probeContamination(cleanJsonl, packet).join('; ') || 'clean'})`);
  const proseText = `${packet}\nassistant: ${prose}\nassistant: here is the card`;
  ok(probeContamination(proseText, packet).length === 0,
    `contamination/prose-mention: a path named in prose, not a tool call, does not void a run (${probeContamination(proseText, packet).join('; ') || 'clean'})`);
  const call = (name: string, input: unknown) => pyJson(ev('assistant', [{ type: 'tool_use', id: 't1', name, input }]));
  ok(probeContamination(`${cleanJsonl}\n${call('Skill', { skill: 'prism3-build-ui' })}`, packet).includes('a prism3- skill was loaded'), 'contamination/skill: a prism3 Skill call voids the run');
  ok(probeContamination(`${cleanJsonl}\n${call('Read', { file_path: '/home/user/repo/skills/prism3-build-ui/SKILL.md' })}`, packet).includes('a read of skills/prism3-*'), 'contamination/read-skill: a Read of skills/prism3-* voids the run, \\uXXXX-escaped JSON too');
  ok(probeContamination(`${proseText}\n⏺ Read(/home/user/repo/CLAUDE.md)`, packet).includes('a CLAUDE.md appears'), 'contamination/claude-md: a CLAUDE.md Read, as a text transcript prints it, voids the run');
  ok(probeContamination(`${cleanJsonl}\n${call('WebFetch', { url: 'https://github.com/adamforrester/prism3/blob/main/x', prompt: 'read' })}`, packet).includes('a fetch of the repository'), 'contamination/fetch: a WebFetch of the repository voids the run');
  ok(probeContamination(`${cleanJsonl}\n${call('Bash', { command: 'cat CLAUDE.md' })}`, packet).includes('a CLAUDE.md appears'), 'contamination/bash: a Bash input naming CLAUDE.md voids the run');
  // Delta review nit: a Grep, a Glob or a sub-agent can reach a skill file as well as a Read can.
  ok(probeContamination(`${cleanJsonl}\n${call('Grep', { pattern: 'token', path: 'skills/prism3-build-ui' })}`, packet).includes('a read of skills/prism3-*'), 'contamination/grep: a Grep over skills/prism3-* voids the run');
  ok(probeContamination(`${cleanJsonl}\n${call('Glob', { pattern: '**/CLAUDE.md' })}`, packet).includes('a CLAUDE.md appears'), 'contamination/glob: a Glob for CLAUDE.md voids the run');
  ok(probeContamination(`${cleanJsonl}\n${call('Agent', { description: 'look up tokens', prompt: 'Read skills/prism3-build-ui/SKILL.md and summarize it' })}`, packet).includes('a read of skills/prism3-*'), 'contamination/agent: an Agent sub-task told to read the skill voids the run');
  ok(probeContamination(`${cleanJsonl}\n${call('Task', { prompt: 'open the CLAUDE.md' })}`, packet).includes('a CLAUDE.md appears'), 'contamination/task: a Task sub-task naming CLAUDE.md voids the run');
  ok(probeContamination(`${proseText}\n⏺ Grep(pattern: "x", path: "skills/prism3-build-ui")`, packet).includes('a read of skills/prism3-*'), 'contamination/grep-text: a Grep call line in a text transcript voids the run');
  ok(median([3, 1, 2]) === 2 && median([4, 1, 2, 3]) === 2.5 && median([]) === null, 'median: odd, even and empty');
}

console.log(failures ? `\n❌ ${failures} FAILED — ${executed} assertions executed` : `\n✅ ALL PASS — ${executed} assertions executed`);
if (failures) process.exit(1);
