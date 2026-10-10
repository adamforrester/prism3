/**
 * PLATFORM GATE (#2424) — a stock Style Dictionary builds every brand the engine emits to CSS, SCSS,
 * JavaScript (+ `.d.ts`), iOS (Swift) and Android (XML and Compose), and the values that come out
 * are the values a person would expect.
 *
 * Runs after `check-consumability.mjs` inside `npm run -w @prism3/tokens check:consumability`, and
 * against the Style Dictionary this repo's lockfile installs. Which versions behave the same, and why
 * 4.0.0 is the floor, is measured by `tools/sd-version-matrix/` (a tool: it installs other versions,
 * so it is too slow and too networked for CI) and recorded in `sd-version-matrix.md`.
 *
 * Four kinds of assertion, each labeled in its output line:
 *
 *   [RULE]    the config (`sd.platforms.mjs`) declares no custom code — read from its source, the
 *             same way `check-consumability.mjs` holds `sd.consumer.mjs` — and the config object it
 *             builds survives a JSON round trip unchanged, so no option is code or a non-JSON value (a
 *             `filter`, an `action`, a format, a RegExp, an `undefined`) whatever it is named.
 *   [READS]   every build writes every platform file, every source token reaches every platform,
 *             and the `.d.ts` declares every export of the module.
 *   [VERDICT] per platform × DTCG `$type`, the worst outcome any token had (emitted, transformed,
 *             broken, lost — `platform-outcomes.mjs`). PINNED: a characterization, like the consumer
 *             gate's CONSUMER-GAP. It fails when a cell moves in EITHER direction, so a Style
 *             Dictionary upgrade that fixes a cell fails too, and whoever upgraded updates the pin.
 *   [VALUE]   literal expected values per brand per platform, typed here by hand: a brand's primary
 *             hex, a px and a rem size, a ms duration, a unitless line height, a font family. Where
 *             stock Style Dictionary writes a wrong or uncompilable value, the literal is that
 *             measured value, tagged [GAP #N] with the issue that tracks it — a memory, not an
 *             endorsement.
 *
 * INDEPENDENCE (docs/34). The expected values below are literals, never read from `out/` at run time.
 * They are snapshots of the engine's output, verified by hand, and the colors' native forms were
 * checked by hand arithmetic (0x3d / 255 = 0.239). They are not the engine's input, and the NB red is
 * not the hand-built reference's value: the engine emits `#d53d44` for core-color red 500, while
 * `reference/` carries `#d83c43` for the same step. The outputs are read by parsing the
 * written files, never by asking Style Dictionary. A literal that moves because the engine moved a
 * brand's value fails here BY NAME, which is the point: re-verify, then update the literal.
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { buildPlatforms, platformsConfig, sourcesFor, PLATFORM_FILES, OUT_ROOT } from './sd.platforms.mjs';
import { outcomesFor, readPlatform, readDeclarations, norm, worst, PLATFORMS, TYPES } from './platform-outcomes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fail = [];
const ok = (cond, label) => { console.log(`  ${cond ? '✓' : '✗'} ${label}`); if (!cond) fail.push(label); };

console.log('\nPlatform gate — a stock Style Dictionary, every brand, CSS · SCSS · JS · iOS · Android\n');

// ---- [RULE] no custom code in the platform config ------------------------------------------------
const cfg = readFileSync(resolve(here, 'sd.platforms.mjs'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
for (const banned of ['preprocessors', 'hooks', 'transforms:', 'registerTransform', 'registerPreprocessor', 'registerFormat', 'registerTransformGroup', 'registerParser', 'parsers']) {
  ok(!cfg.includes(banned), `[RULE] the platform config declares no \`${banned}\` — built-in transform groups and formats only`);
}
// A source scan reads names; a function-valued option needs no banned name (`filter: (t) => true`).
// JSON drops a function and `undefined` and turns a RegExp into `{}`, so plain data is exactly what
// survives the round trip.
const live = platformsConfig(['a.tokens.json'], 'build');
ok(isDeepStrictEqual(JSON.parse(JSON.stringify(live)), live), '[RULE] the platform config is plain data — it survives a JSON round trip unchanged, so no option is code or a non-JSON value');

/**
 * The literals. One row per brand: its token root, a brand color (path under `core.palette`, hex, and
 * the Swift `UIColor` it should become), its normal duration in ms, and its display typeface (path
 * slug, family name, and the CSS spelling: a family with a space is quoted by the css group).
 */
const BRANDS = {
  nb: { root: 'nbds', color: ['red.500', '#d53d44', 'UIColor(red: 0.835, green: 0.239, blue: 0.267, alpha: 1)'], ms: 200, face: ['inter', 'Inter', 'Inter'] },
  prism3: { root: 'pds3', color: ['primary.500', '#3d68fc', 'UIColor(red: 0.239, green: 0.408, blue: 0.988, alpha: 1)'], ms: 200, face: ['playfair-display', 'Playfair Display', "'Playfair Display'"] },
  aurora: { root: 'ads', color: ['primary.500', '#7269ca', 'UIColor(red: 0.447, green: 0.412, blue: 0.792, alpha: 1)'], ms: 160, face: ['clash-display', 'Clash Display', "'Clash Display'"] },
  harbor: { root: 'hds', color: ['primary.500', '#437f7f', 'UIColor(red: 0.263, green: 0.498, blue: 0.498, alpha: 1)'], ms: 260, face: ['inter', 'Inter', 'Inter'] },
  wendys: { root: 'wds', color: ['primary.500', '#c8102e', 'UIColor(red: 0.784, green: 0.063, blue: 0.180, alpha: 1)'], ms: 200, face: ['wendysfresh', 'wendysFresh', 'wendysFresh'] },
};

/** Issues tracking what stock Style Dictionary gets wrong on native platforms (#2426's arc). */
const GAP = { pxScaled: 2430, unquoted: 2431, androidInteger: 2433 };

/** Expected value per platform for each literal token of one brand. Android values are `<tag>text`. */
const expected = ({ root, color: [pal, hex, uiColor], ms, face: [slug, family, cssFamily] }) => ({
  [`${root}.core.palette.${pal}`]: {
    label: `color ${hex}`,
    css: hex, scss: hex, js: hex, ios: uiColor, android: `<color>#ff${hex.slice(1)}`, compose: `Color(0xff${hex.slice(1)})`,
  },
  [`${root}.core.dimension.16`]: {
    label: 'dimension 16px',
    css: '16px', scss: '16px', js: '16px',
    // [GAP] stock native size transforms read every dimension as rem and multiply by 16.
    ios: 'CGFloat(256.00)', android: '<dimen>256.00dp', compose: '256.00.dp', gap: { ios: GAP.pxScaled, android: GAP.pxScaled, compose: GAP.pxScaled },
  },
  [`${root}.core.font.size.16`]: {
    label: 'font size 1rem',
    css: '1rem', scss: '1rem', js: '1rem', ios: 'CGFloat(16.00)', android: '<dimen>16.00dp', compose: '16.00.dp',
  },
  [`${root}.motion.duration-ms.${ms}`]: {
    label: `duration ${ms}ms`,
    css: `${ms}ms`, scss: `${ms}ms`, js: `${ms}ms`, android: `<string>${ms}ms`,
    // [GAP] no stock Swift or Kotlin transform for a duration; the raw string does not compile.
    ios: `${ms}ms`, compose: `${ms}ms`, gap: { ios: GAP.unquoted, compose: GAP.unquoted },
  },
  [`${root}.core.font.line-height.150`]: {
    label: 'line height 1.5',
    css: '1.5', scss: '1.5', js: 1.5, ios: '1.5', compose: '1.5',
    // [GAP] Android's resource compiler refuses a non-integer `<integer>`.
    android: '<integer>1.5', gap: { android: GAP.androidInteger },
  },
  [`${root}.core.font.typeface.${slug}`]: {
    label: `font family ${family}`,
    css: cssFamily, scss: cssFamily, js: family, android: `<string>${family}`,
    // [GAP] a font family is not `content`, so the stock Swift and Kotlin groups leave it unquoted.
    ios: family, compose: family, gap: { ios: GAP.unquoted, compose: GAP.unquoted },
  },
});

/**
 * The verdict pin: per platform, the DTCG types whose worst outcome over every brand's base
 * projection is NOT emitted/transformed. Measured on Style Dictionary 5.5.0 and 5.6.0 alike, and on
 * every version back to 4.0.0 (`sd-version-matrix.md`). Every type absent from a platform's list must
 * come through usable.
 */
const NOT_USABLE = {
  css: { gradient: 'broken' },
  scss: { gradient: 'broken' },
  js: {},
  ios: { dimension: 'broken', duration: 'broken', cubicBezier: 'broken', transition: 'broken', typography: 'broken', shadow: 'broken', gradient: 'broken', strokeStyle: 'broken', fontFamily: 'broken' },
  android: { dimension: 'broken', transition: 'broken', typography: 'broken', shadow: 'broken', gradient: 'broken', number: 'broken' },
  compose: { dimension: 'broken', duration: 'broken', cubicBezier: 'broken', transition: 'broken', typography: 'broken', shadow: 'broken', gradient: 'broken', strokeStyle: 'broken', fontFamily: 'broken' },
};

const brands = readdirSync(OUT_ROOT)
  .filter((f) => f.endsWith('.tokens.json') && !/\.(base|[\w-]+\.overlay)\.tokens\.json$/.test(f))
  .map((f) => f.replace('.tokens.json', '')).sort();
const modesOf = (b) => readdirSync(OUT_ROOT)
  .map((f) => f.match(new RegExp(`^${b}\\.([\\w-]+)\\.overlay\\.tokens\\.json$`))?.[1]).filter(Boolean).sort();

// ---- [SCOPE] every brand with literals is built, and every built brand has literals ---------------
for (const b of Object.keys(BRANDS)) ok(brands.includes(b), `[SCOPE] \`${b}\` is emitted and built`);
for (const b of brands) ok(b in BRANDS, `[SCOPE] \`${b}\` carries literal value assertions — a new brand needs its own row`);

const verdicts = Object.fromEntries(PLATFORMS.map((p) => [p, {}]));
const rank = { emitted: 0, transformed: 1, lost: 2, broken: 3 };

for (const brand of brands) {
  const modes = modesOf(brand);
  console.log(`\n  ── ${brand} (sets: canonical, base, ${modes.join(', ')}) ─────────────────────`);
  const dirs = {};
  for (const set of ['canonical', 'base', ...modes]) {
    dirs[set] = await buildPlatforms(brand, set);
    const missing = Object.entries(PLATFORM_FILES).flatMap(([p, files]) => files.map((f) => resolve(dirs[set], p, f)))
      .filter((f) => !existsSync(f) || statSync(f).size === 0);
    ok(missing.length === 0, `${brand}/${set}: [READS] every platform file is written and non-empty${missing.length ? ` — missing ${missing.map((f) => f.split(`${set}/`)[1]).join(', ')}` : ''}`);
    if (set === 'canonical') continue;
    const r = await outcomesFor(sourcesFor(brand, set), dirs[set]);
    const short = PLATFORMS.filter((p) => r[p].found !== r[p].total);
    ok(short.length === 0, `${brand}/${set}: [READS] all ${r.css.total} source tokens reach all ${PLATFORMS.length} platforms${short.length ? ` — short on ${short.map((p) => `${p} ${r[p].found}/${r[p].total}`).join(', ')}` : ''}`);
    const js = await readPlatform('js', dirs[set]);
    const decl = readDeclarations(dirs[set]);
    const undeclared = [...js.keys()].filter((k) => !decl.has(k));
    ok(js.size > 0 && undeclared.length === 0, `${brand}/${set}: [READS] the .d.ts declares all ${js.size} exports of the ES module${undeclared.length ? ` — ${undeclared.length} undeclared` : ''}`);
    if (set !== 'base') continue;
    for (const p of PLATFORMS) {
      for (const [t, row] of Object.entries(r[p].byType)) {
        const w = worst(row);
        if (!verdicts[p][t] || rank[w] > rank[verdicts[p][t].w]) verdicts[p][t] = { w, ex: row.examples[0] && `${brand}: ${row.examples[0]}` };
      }
    }
  }

  // ---- [VALUE] literals --------------------------------------------------------------------------
  const out = Object.fromEntries(await Promise.all(PLATFORMS.map(async (p) => [p, await readPlatform(p, dirs.base)])));
  const show = (p, v) => (v === undefined ? 'ABSENT' : p === 'android' ? `<${v.tag}>${v.text}` : typeof v === 'string' ? v : JSON.stringify(v));
  // A brand with no row has no literals to check; [SCOPE] above has already failed it by name.
  for (const [path, exp] of BRANDS[brand] ? Object.entries(expected(BRANDS[brand])) : []) {
    for (const p of PLATFORMS) {
      const got = out[p].get(norm(path));
      const tag = exp.gap?.[p] ? ` [GAP #${exp.gap[p]}]` : '';
      const actual = show(p, got);
      const want = p === 'js' ? exp.js : exp[p];
      const pass = p === 'js' ? JSON.stringify(got) === JSON.stringify(want) : actual === want;
      ok(pass, `${brand}: [VALUE]${tag} ${exp.label} on ${p} — ${path} = ${actual}${pass ? '' : ` (expected ${p === 'js' ? JSON.stringify(want) : want})`}`);
    }
  }

  // ---- the overlay is not inert on any platform -----------------------------------------------------
  const bg = `${BRANDS[brand]?.root}.color.background.primary`;
  for (const mode of BRANDS[brand] ? modes.filter((m) => m === 'dark') : []) {
    const moved = [];
    for (const p of ['js', 'ios', 'android', 'compose']) {
      const a = show(p, out[p].get(norm(bg)));
      const b = show(p, (await readPlatform(p, dirs[mode])).get(norm(bg)));
      if (a !== b && b !== 'ABSENT') moved.push(p);
    }
    ok(moved.length === 4, `${brand}/${mode}: [READS] the page background moves under the overlay on js, ios, android and compose (${moved.join(', ') || 'none'})`);
  }
}

// ---- [VERDICT] the pinned per-platform × type characterization -------------------------------------
console.log('\n  ── verdicts, every brand\'s base projection ─────────────────────');
for (const p of PLATFORMS) {
  for (const t of TYPES) {
    const got = verdicts[p][t]?.w ?? '—';
    const want = NOT_USABLE[p][t] ?? (got === 'emitted' || got === 'transformed' || got === '—' ? got : 'usable');
    ok(got === want, `[VERDICT] ${p} / ${t}: ${got}${NOT_USABLE[p][t] ? ' (pinned)' : ''}${got !== want ? ` — pinned ${NOT_USABLE[p][t] ?? 'usable (emitted or transformed)'}${verdicts[p][t]?.ex ? `; e.g. ${verdicts[p][t].ex}` : ''}` : ''}`);
  }
}

if (fail.length) {
  console.error(`\n✗ ${fail.length} platform assertion(s) failed:\n`);
  for (const f of fail) console.error(`    ${f}`);
  console.error('\n  A [VALUE] failure names the brand, the token and the platform. Re-verify the literal by hand before');
  console.error('  updating it. A [VERDICT] change in either direction means the pin needs updating, with the matrix rerun.\n');
  process.exit(1);
}
console.log(`\n✓ ${brands.length} brands × ${PLATFORMS.length} platforms built by a stock Style Dictionary; every token reaches every platform;`);
console.log('  values match their literals; the native gaps are pinned and tracked (#2426).\n');
