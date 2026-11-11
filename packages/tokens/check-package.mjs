/**
 * PACKAGE GATE — does the shippable `@prism3/tokens` install, and does what installs define the
 * guaranteed token names in every mode? (#3408 S1, `docs/35` §9.3.)
 *
 * It tests the package the way a client gets it, not the build directory: `npm pack` (which runs the
 * `prepack` build), then `npm install <tarball>` into a temp folder OUTSIDE the repo (Q84 A: a local
 * tarball, no registry), then resolve the CSS through the installed package's `exports`.
 *
 * THE ORACLE IS INDEPENDENT OF THE BUILD (`docs/34`). The names come from
 * `packages/engine/schema/token-contract.json` — the guaranteed name surface, which only
 * `token-contract.ts --accept` rewrites and the build never reads. The prefix `--pds3-` and the promised
 * mode blocks are written down here, as the owner decided them (Q98 A; the `[data-theme]` modes), not
 * read off the build. So renaming the prefix or dropping a mode in `sd.ship.mjs` fails here by name.
 *
 * Which contract names: every guaranteed name with a DTCG `$type`, by this gate's own copy of the spec
 * list. A non-DTCG type (today `spring`) is not in the conforming projection the build reads (#642), so it
 * is out of the package by design; the exclusion is printed, not hidden.
 *
 * Mapping a contract key to a CSS name is stock Style Dictionary's `name/kebab` over the `pds3` root:
 * `color.text.primary` → `--pds3-color-text-primary`. Written out here as `.` → `-`, not by calling
 * Style Dictionary, so the build's naming is checked rather than repeated.
 *
 * [VALUE] (#3563): every guaranteed name's declaration in each block equals the engine's value for that
 * mode. Names alone passed a dark block built from the hc-dark overlay, and every color rewritten to red.
 * The expected values come from `packages/engine/out/prism3.tokens.json`, the full tree with each leaf's
 * per-mode values under `$extensions.prism3.modes`. The build reads the base and overlay projections and
 * never this file, so the two are separate emissions of the same engine run. A mode the leaf does not
 * list takes its base `$value`, which is what an overlay that omits the leaf leaves in place.
 * The comparison is loose on spelling and strict on content: both sides are cut into atoms (a `{a.b}`
 * alias is `var(--pds3-a-b)`, a composite's fields are its atoms, a color is its rounded RGBA however it is
 * written, quotes and `cubic-bezier( )` are dropped), and the two sorted lists must be equal. A typography
 * value is compared on the fields the CSS `font` shorthand carries, written down here (`FONT_SHORTHAND`);
 * `letterSpacing` and `textDecoration` cannot ride in it.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve, dirname, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, '../..');
const CONTRACT = resolve(REPO, 'packages/engine/schema/token-contract.json');
/** The [VALUE] oracle: the engine's full tree, per-mode values included. The build never reads it. */
const TREE = resolve(REPO, 'packages/engine/out/prism3.tokens.json');
/** The fields the CSS `font` shorthand carries (CSS Fonts 4 §2.8), so a typography value is compared on these. */
const FONT_SHORTHAND = ['fontStyle', 'fontWeight', 'fontSize', 'lineHeight', 'fontFamily'];

/** The decided prefix (Q98 A): stock Style Dictionary's root-prefixed names. */
const PREFIX = '--pds3-';
/** The blocks the package promises, by name: the light defaults, then each theme mode. */
const PROMISED_BLOCKS = [':root', '[data-theme="dark"]', '[data-theme="hc-dark"]', '[data-theme="hc-light"]'];
/** What `npm pack` may put in the tarball: the shippable CSS, the README, and the manifest npm always adds. */
const ALLOWED_FILE = /^(package\.json|README\.md|dist\/prism3\.css|dist\/prism3\/[\w-]+\.css)$/;
/** The DTCG spec's types — this gate's own transcription, as in `check-consumability.mjs` (docs/34). */
const DTCG_TYPES = new Set([
  'color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number',
  'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography',
]);

const fail = [];
const ok = (cond, label) => { console.log(`  ${cond ? '✓' : '✗'} ${label}`); if (!cond) fail.push(label); };

/** Blocks in a CSS file: selector → { name → value }. Comments are stripped first. */
const readBlocks = (css) => {
  const blocks = new Map();
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of src.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const vars = blocks.get(m[1].trim()) ?? {};
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
    blocks.set(m[1].trim(), vars);
  }
  return blocks;
};

/** A value as a sorted list of atoms, so spelling differences fall away and content differences stay. */
const rgba = (r, g, b, a) => `rgba:${[r, g, b].map((x) => Math.round(Number(x))).join('_')}_${Math.round(Number(a) * 100) / 100}`;
const atom = (x) => {
  const t = x.replace(/^['"]|['"]$/g, '');
  const h = /^#([0-9a-f]{3,8})$/i.exec(t)?.[1];
  if (!h || ![3, 4, 6, 8].includes(h.length)) return t.toLowerCase();
  const full = h.length <= 4 ? [...h].map((c) => c + c).join('') : h;
  const n = (i) => parseInt(full.slice(i, i + 2), 16);
  return rgba(n(0), n(2), n(4), full.length === 8 ? n(6) / 255 : 1);
};
/** The engine's side: a `{a.b}` alias is `var(--pds3-a-b)`, a number its digits, a composite its fields' atoms. */
const expectedAtoms = (v) => {
  if (typeof v === 'number') return [String(v)];
  if (typeof v === 'string') {
    const alias = /^\{([^}]+)\}$/.exec(v);
    return alias ? [`var(--${alias[1].replaceAll('.', '-')})`] : v.split(/\s+/).filter(Boolean);
  }
  if (Array.isArray(v)) return v.flatMap(expectedAtoms);
  if (v && typeof v === 'object') return Object.values(v).flatMap(expectedAtoms);
  return [String(v)];
};
/** The CSS side: `rgb[a]( )` read as one color, `cubic-bezier( )` as its numbers, split on space, `,` and `/`. */
const cssAtoms = (s) => s
  .replace(/rgba?\(([^)]*)\)/g, (_, a) => { const [r, g, b, al = '1'] = a.split(/[\s,/]+/).filter(Boolean); return rgba(r, g, b, al); })
  .replace(/cubic-bezier\(([^)]*)\)/g, '$1')
  .split(/[\s,/]+/).filter(Boolean);
const sameValue = (want, got) => {
  const a = expectedAtoms(want).map(atom).sort().join(' '), b = cssAtoms(got).map(atom).sort().join(' ');
  return a === b;
};

console.log('\nPackage gate — pack @prism3/tokens, install the tarball outside the repo, read the CSS\n');

const tmp = mkdtempSync(join(tmpdir(), 'prism3-tokens-pack-'));
const outside = relative(REPO, tmp);
ok(outside.startsWith('..') || isAbsolute(outside), `the install folder is outside the repo (${tmp})`);

try {
  // ---- PACK ----
  const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', tmp], { cwd: here, encoding: 'utf8' }));
  const { filename, files, name, version } = packed[0];
  const paths = files.map((f) => f.path).sort();
  console.log(`  packed ${name}@${version}: ${paths.join(', ')}\n`);
  ok(name === '@prism3/tokens', `the package is named @prism3/tokens (got ${name})`);
  const stray = paths.filter((p) => !ALLOWED_FILE.test(p));
  ok(stray.length === 0, `the tarball carries only the shippable CSS and the README${stray.length ? ` — also: ${stray.join(', ')}` : ''}`);
  ok(paths.includes('README.md'), 'the tarball carries the README');
  ok(paths.includes('dist/prism3.css'), 'the tarball carries dist/prism3.css');

  // ---- INSTALL, outside the repo, from the tarball alone ----
  const consumer = join(tmp, 'consumer');
  execFileSync('mkdir', ['-p', consumer]);
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'consumer', private: true }, null, 2));
  // --offline: the package declares no dependencies, so the install must need nothing but the tarball.
  execFileSync('npm', ['install', join(tmp, filename), '--offline', '--no-audit', '--no-fund', '--ignore-scripts'], { cwd: consumer, stdio: 'pipe' });
  const req = createRequire(join(consumer, 'package.json'));
  const installed = JSON.parse(readFileSync(req.resolve('@prism3/tokens/package.json'), 'utf8'));
  ok(installed.version === version, `the tarball installs (@prism3/tokens@${installed.version} in node_modules)`);
  ok(!installed.dependencies, 'the installed package declares no runtime dependencies');

  // ---- RESOLVE through the installed package's exports ----
  const main = req.resolve('@prism3/tokens');
  ok(main.startsWith(consumer) && main.endsWith('prism3.css'), `\`@prism3/tokens\` resolves to the installed CSS (${relative(consumer, main)})`);
  ok(req.resolve('@prism3/tokens/prism3.css') === main, '`@prism3/tokens/prism3.css` resolves to the same file');

  // ---- THE ORACLE: contract names in every promised block ----
  const contract = JSON.parse(readFileSync(CONTRACT, 'utf8')).guaranteed;
  const expected = Object.entries(contract).filter(([, t]) => DTCG_TYPES.has(t)).map(([k]) => PREFIX + k.replaceAll('.', '-'));
  const excluded = Object.entries(contract).filter(([, t]) => !DTCG_TYPES.has(t)).map(([k, t]) => `${k} (\`${t}\`)`);
  console.log(`\n  contract: ${expected.length} guaranteed names with a DTCG type; not projected (#642): ${excluded.join(', ') || 'none'}\n`);
  ok(expected.length > 0, 'the contract names a non-empty guaranteed surface — the check is not vacuous');

  const tree = JSON.parse(readFileSync(TREE, 'utf8'));
  ok(Boolean(tree.pds3), 'the [VALUE] oracle, out/prism3.tokens.json, has the pds3 root');
  const blocks = readBlocks(readFileSync(main, 'utf8'));
  console.log(`  blocks: ${[...blocks.keys()].join(' · ')}\n`);
  ok(blocks.size === PROMISED_BLOCKS.length, `the CSS holds exactly the ${PROMISED_BLOCKS.length} promised blocks (got ${blocks.size})`);
  const root = blocks.get(':root') ?? {};
  for (const sel of PROMISED_BLOCKS) {
    const vars = blocks.get(sel);
    ok(Boolean(vars), `[BLOCK] \`${sel}\` is in the installed CSS`);
    if (!vars) continue;
    const missing = expected.filter((n) => !(n in vars));
    ok(missing.length === 0,
      `[NAMES] \`${sel}\` defines every guaranteed name under \`${PREFIX}\` (${expected.length - missing.length}/${expected.length})${missing.length ? ` — missing e.g. ${missing.slice(0, 5).join(', ')}` : ''}`);
    const off = Object.keys(vars).filter((n) => !n.startsWith(PREFIX));
    ok(off.length === 0, `[PREFIX] every name in \`${sel}\` starts \`${PREFIX}\`${off.length ? ` — e.g. ${off.slice(0, 3).join(', ')}` : ''}`);
    // [VALUE] (#3563): each guaranteed declaration holds the engine's value for this block's mode.
    const mode = sel === ':root' ? null : sel.match(/"(.+)"/)[1];
    const wrong = [];
    let compared = 0;
    for (const [key, type] of Object.entries(contract)) {
      if (!DTCG_TYPES.has(type)) continue;
      const name = PREFIX + key.replaceAll('.', '-');
      if (!(name in vars)) continue;
      const leaf = key.split('.').reduce((n, k) => n?.[k], tree.pds3);
      const base = mode ? leaf?.$extensions?.prism3?.modes?.[mode]?.$value ?? leaf?.$value : leaf?.$value;
      const want = type === 'typography' && base && typeof base === 'object'
        ? Object.fromEntries(FONT_SHORTHAND.filter((f) => f in base).map((f) => [f, base[f]])) : base;
      compared++;
      if (want === undefined || !sameValue(want, vars[name])) wrong.push(`${name}: ${vars[name]} (the engine's ${mode ?? 'base'} value is ${JSON.stringify(want)})`);
    }
    ok(compared === expected.length - missing.length && wrong.length === 0,
      `[VALUE] \`${sel}\` holds the engine's ${mode ?? 'base'} value for every guaranteed name (${compared - wrong.length}/${compared})${wrong.length ? ` — e.g. ${wrong.slice(0, 3).join('; ')}` : ''}`);
    if (sel !== ':root') {
      const differs = expected.some((n) => n in vars && vars[n] !== root[n]);
      ok(differs, `[MODE] \`${sel}\` changes at least one guaranteed value from \`:root\` — it is a theme, not a copy`);
    }
  }

  // ---- each block also ships on its own, at @prism3/tokens/prism3/<mode>.css ----
  for (const sel of PROMISED_BLOCKS) {
    const mode = sel === ':root' ? 'base' : sel.match(/"(.+)"/)[1];
    let file;
    try { file = req.resolve(`@prism3/tokens/prism3/${mode}.css`); } catch { file = null; }
    ok(Boolean(file) && readBlocks(readFileSync(file, 'utf8')).has(sel), `\`@prism3/tokens/prism3/${mode}.css\` resolves and holds \`${sel}\``);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (fail.length) {
  console.log(`\n✗ ${fail.length} check(s) failed:\n${fail.map((f) => `    - ${f}`).join('\n')}\n`);
  process.exit(1);
}
console.log('\n✓ the packed @prism3/tokens installs and defines every guaranteed name, with the engine\'s value, in every mode block\n');
