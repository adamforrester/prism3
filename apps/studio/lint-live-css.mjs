/**
 * lint-live-css — a LIVE rule in `apps/studio/src/styles.css` is not removed without someone saying so (#2201).
 *
 *   node apps/studio/lint-live-css.mjs                         # the gate: read-only, a few seconds
 *   node apps/studio/lint-live-css.mjs --accept [--allow KEY]…  # re-sweep and rewrite the baseline
 *
 * WHY THIS EXISTS. Deleting `.sg-g3{grid-template-columns:repeat(3,1fr)}` collapses the style guide's
 * three-column grid into one column, and every suite stayed green (#2201): the suites assert colors,
 * contrast, targets and words, and nothing they assert reads a grid's track count. #2116 had to prove
 * its removals dead by hand for the same reason. A suite going green is not evidence a CSS removal is safe.
 *
 * WHAT IT COMPARES, and where each side comes from (docs/34 "In practice", question 1):
 *   - EXPECTED is `live-css.json`: the rules of `styles.css` that matched an element a real page drew,
 *     recorded by `live-css-sweep.mjs` riding the four browser suites `verify` already runs (`test:chrome`
 *     on both hosts in light and dark, `test:smoke`, and the plugin's `test:verdict` and `test:start`).
 *     Which rules are live is decided by the DOM, which the app's TypeScript draws, never by the stylesheet.
 *   - ACTUAL is the current `styles.css`, parsed by Chromium's own CSS parser.
 *   The gate fails, by name, when a live rule's key is gone, or when a live rule no longer declares a
 *   property it declared. A rule no page drew is not in EXPECTED, so a true dead-code removal passes.
 *
 * THE KEY IS A RULE, NOT A SELECTOR. `@media (max-width: 760px) » .sg-g3 #1`: the enclosing at-rules, one
 * selector of the rule's list, and its ordinal among rules with the same context and selector. Selector
 * text alone would pass #2201's own mutation, because `.sg-g3` ALSO appears in the 760px rule
 * `.sg-g3,.sg-g5{…}` (docs/34 shape 15: the comparison right, the set blind to the hard case). Each
 * selector of a list is its own key, so dropping one name from `.a,.b{}` fails too.
 *
 * PROPERTY NAMES, NOT VALUES. A live rule losing `grid-template-columns` fails; the same rule moving
 * from `repeat(3,1fr)` to `repeat(4,1fr)` passes. The gate is about removal. A computed-style comparison
 * on drawn nodes was considered and not built: computed style moves with the brand, the mode and timing
 * (#2116 measured ~380k-pixel run-to-run noise in one pane), so it would pin every value of the page
 * rather than the presence of its rules, and fail on every intended restyle.
 *
 * THE BASELINE HAS MEMORY (docs/34 shape 6). The gate never writes it. `--accept` re-runs the sweep and
 * refuses a baseline that would forget a live rule: a key that left `styles.css` (or lost a property)
 * while the sweep still finds its selector drawn is refused unless named with `--allow '<key>'`, so a
 * deliberate removal is stated, never absorbed. A key whose selector no page draws any more drops out
 * on its own and is printed, because then its markup is gone and the oracle says it is dead.
 *
 * ONE PARSE ON PURPOSE. The check and the accept both read `styles.css` through `parse()` below. That is
 * not the DRY trap (shape 2): what the check compares is the subject at two moments, and the independent
 * side is the sweep. What a shared parser CAN do is drop a rule from both moments (shape 15), so
 * `preludes()` lists the rule preludes in the raw text with a tokenizer of its own, and the gate fails
 * unless every one is accounted for — parsed by the browser, or listed as dropped by it.
 *
 * WHAT IT DOES NOT SEE, stated rather than implied:
 *   - a rule live only in a state no suite reaches (an untested hover menu, a 2000px viewport) is not in
 *     EXPECTED, and can be removed green. The sweep can only vouch for what the suites draw;
 *   - a live rule's EFFECT removed without removing the rule (a later rule overriding it, a value set to
 *     its initial value) passes, because nothing is removed;
 *   - a rule added since the last `--accept` is unprotected until the next one. The gate prints that count
 *     every run, so it does not go quiet.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');
const CSS_PATH = 'apps/studio/src/styles.css';
const BASELINE_PATH = 'apps/studio/live-css.json';
/** Floors (docs/34 shape 9): a parse or a baseline this small means the gate stopped looking, not that it passed. */
const MIN_RULES = 200, MIN_LIVE = 150;
/** The four corners the sweep must have drawn in, or the baseline is a statement about part of the app. */
const CORNERS = ['web|light', 'web|dark', 'figma|light', 'figma|dark'];
/** The browser suites `verify` runs, each from its own workspace. The sweep rides them; it adds no pages. */
const SUITES = [
  { name: 'test:chrome', cwd: 'apps/studio', script: 'test-chrome.mjs' },
  { name: 'test:smoke', cwd: 'apps/studio', script: 'test-smoke.mjs' },
  { name: 'test:verdict', cwd: 'apps/plugin', script: 'test-build-verdict.mjs', host: 'figma' },
  { name: 'test:start', cwd: 'apps/plugin', script: 'test-start-screen.mjs', host: 'figma' },
];

const { chromium } = await import(join(REPO, 'node_modules/playwright/index.mjs'));

/**
 * Every style rule of `css`, as Chromium parses it: one entry per selector of each rule's list, keyed
 * `<context> » <selector> #<n>`, with the longhand property names the rule declares and the at-rule
 * conditions the sweep evaluates. `fingerprint` lets the sweep recognize a frame that installed this sheet.
 */
export const parse = async (css) => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    return await page.evaluate((text) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      const split = (s) => { const out = []; let d = 0, cur = '', q = null;
        for (const ch of s) {
          if (q) { cur += ch; if (ch === q) q = null; continue; }
          if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
          if (ch === '(' || ch === '[') d++; else if (ch === ')' || ch === ']') d--;
          if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
        }
        out.push(cur.trim()); return out; };
      const rules = [], seen = new Map();
      let styleRules = 0;
      const walk = (list, ctx, conds) => { for (const r of list) {
        if (r instanceof CSSStyleRule) {
          styleRules++;
          const props = [...new Set(Array.from({ length: r.style.length }, (_, i) => r.style[i]))].sort();
          for (const sel of split(r.selectorText)) {
            const base = `${ctx}${sel}`;
            const n = (seen.get(base) ?? 0) + 1; seen.set(base, n);
            rules.push({ key: `${base} #${n}`, sel, conds, props });
          }
        } else if (r instanceof CSSMediaRule) walk(r.cssRules, `${ctx}@media ${r.conditionText} » `, [...conds, ['media', r.conditionText]]);
        else if (r instanceof CSSSupportsRule) walk(r.cssRules, `${ctx}@supports ${r.conditionText} » `, [...conds, ['supports', r.conditionText]]);
        else if (typeof CSSContainerRule !== 'undefined' && r instanceof CSSContainerRule) walk(r.cssRules, `${ctx}@container ${r.conditionText} » `, [...conds, ['container', r.conditionText]]);
        else if (r.cssRules && !(r instanceof CSSKeyframesRule)) walk(r.cssRules, `${ctx}@${r.constructor.name} » `, conds);
      } };
      walk(sheet.cssRules, '', []);
      const order = []; const w2 = (l) => { for (const r of l) { if (r instanceof CSSStyleRule) order.push(r.selectorText); else if (r.cssRules && !(r instanceof CSSKeyframesRule)) w2(r.cssRules); } };
      w2(sheet.cssRules);
      const top = sheet.cssRules;
      return { rules, styleRules, order, fingerprint: { n: top.length, first: top[0]?.cssText ?? '', last: top[top.length - 1]?.cssText ?? '' } };
    }, css);
  } finally { await browser.close(); }
};

/**
 * The independent side of the parser check: every style-rule prelude in the raw text, in order, found by
 * a tokenizer that shares nothing with `parse()`. Comments and strings are skipped; an at-rule prelude
 * and a keyframe step are not style rules.
 */
export const preludes = (css) => {
  const out = []; let i = 0, prelude = ''; const stack = [];
  while (i < css.length) {
    if (css.startsWith('/*', i)) { const j = css.indexOf('*/', i + 2); i = j < 0 ? css.length : j + 2; continue; }
    const ch = css[i];
    if (ch === '"' || ch === "'") { const j = css.indexOf(ch, i + 1); prelude += css.slice(i, j + 1); i = j + 1; continue; }
    if (ch === '{') {
      const p = prelude.trim();
      const kind = p.startsWith('@') ? (/^@(-webkit-)?keyframes/.test(p) ? 'keyframes' : 'at') : stack.includes('keyframes') ? 'step' : 'style';
      if (kind === 'style') out.push({ prelude: p.replace(/\s+/g, ' '), line: css.slice(0, i).split('\n').length });
      stack.push(kind); prelude = ''; i++; continue;
    }
    if (ch === '}') { stack.pop(); prelude = ''; i++; continue; }
    if (ch === ';' && prelude.trim().startsWith('@')) { prelude = ''; i++; continue; }
    prelude += ch; i++;
  }
  return out;
};

/**
 * Which raw preludes the browser did not keep: the two lists aligned in order, ignoring whitespace and the
 * quotes Chromium adds to attribute values. A dropped rule is invisible to both sides of the gate, so each
 * is NAMED, and only one reason is accepted: the selector uses ANOTHER ENGINE's prefix (`-moz-`), which
 * Chromium drops by design and could never have drawn. Any other drop fails, because it means the parser
 * is not seeing a rule Chromium might apply.
 */
export const dropped = (raw, order) => {
  const norm = (x) => x.replace(/["'\s]/g, '');
  const out = []; let j = 0;
  for (const r of raw) { if (j < order.length && norm(r.prelude) === norm(order[j])) j++; else out.push(r); }
  return { out, unmatchedParsed: order.length - j };
};
export const OTHER_ENGINE = /(^|[^a-z])-moz-/;

/** The comparison, kept pure so the self-check below can drive it with a planted removal. */
export const compare = (baseline, current) => {
  const now = new Map(current.rules.map((r) => [r.key, r]));
  const removed = [], shrunk = [];
  for (const [key, was] of Object.entries(baseline.live)) {
    const r = now.get(key);
    if (!r) { removed.push({ key, was }); continue; }
    const lost = was.props.filter((p) => !r.props.includes(p));
    if (lost.length) shrunk.push({ key, was, lost });
  }
  const known = new Set([...Object.keys(baseline.live), ...baseline.dead]);
  const unprotected = current.rules.filter((r) => !known.has(r.key)).map((r) => r.key);
  return { removed, shrunk, unprotected };
};

const witness = (w) => `${w.suite}, ${w.host} ${w.scheme}`;

const check = async () => {
  const fails = [];
  if (!existsSync(join(REPO, BASELINE_PATH))) { console.error(`✗ live-css: ${BASELINE_PATH} is missing. Run \`node apps/studio/lint-live-css.mjs --accept\`.`); process.exit(1); }
  const baseline = JSON.parse(readFileSync(join(REPO, BASELINE_PATH), 'utf8'));
  const css = readFileSync(join(REPO, CSS_PATH), 'utf8');
  const current = await parse(css);
  // Did it look? Each floor names what it guards.
  if (baseline.file !== CSS_PATH) fails.push(`the baseline describes ${baseline.file}, not ${CSS_PATH}`);
  const live = Object.keys(baseline.live ?? {}).length;
  if (live < MIN_LIVE) fails.push(`the baseline holds ${live} live rules, under the floor of ${MIN_LIVE}: it was recorded from a sweep that drew too little`);
  for (const c of CORNERS) if (!(baseline.coverage?.[c] > 0)) fails.push(`the baseline's sweep drew no page in ${c.replace('|', ' ')}, so it vouches for part of the app only`);
  if (current.styleRules < MIN_RULES) fails.push(`Chromium parsed ${current.styleRules} style rules from ${CSS_PATH}, under the floor of ${MIN_RULES}`);
  const raw = preludes(css);
  const drop = dropped(raw, current.order);
  if (drop.unmatchedParsed) fails.push(`Chromium parsed ${drop.unmatchedParsed} style rule(s) the raw-text count did not align with: the two counts disagree, so the parser check cannot vouch for either`);
  for (const d of drop.out) if (!OTHER_ENGINE.test(d.prelude)) fails.push(`Chromium dropped the rule at ${CSS_PATH}:${d.line} (\`${d.prelude.slice(0, 80)}\`), and not for another engine's prefix: a rule the parser drops is invisible to both sides of this gate`);
  const text = raw.length;
  // Can it fail at all (docs/34 shape 4)? Plant a removal and a dead-code removal in memory, then compare.
  const [firstLive] = Object.keys(baseline.live);
  const planted = compare(baseline, { rules: current.rules.filter((r) => r.key !== firstLive) });
  if (!planted.removed.some((x) => x.key === firstLive)) fails.push(`self-check: removing the live rule ${firstLive} in memory was not reported`);
  const deadKey = baseline.dead.find((k) => current.rules.some((r) => r.key === k));
  if (deadKey && compare(baseline, { rules: current.rules.filter((r) => r.key !== deadKey) }).removed.length) fails.push(`self-check: removing the dead rule ${deadKey} in memory was reported as live`);

  const { removed, shrunk, unprotected } = compare(baseline, current);
  for (const { key, was } of removed) fails.push(`live rule removed: ${key} — it matched a drawn element in ${witness(was.seen)}. Restore it; or, if removing it is the intent, run \`node apps/studio/lint-live-css.mjs --accept --allow '${key}'\``);
  for (const { key, was, lost } of shrunk) fails.push(`live rule lost ${lost.join(', ')}: ${key} — drawn in ${witness(was.seen)}. Restore the propert${lost.length > 1 ? 'ies' : 'y'}; or run \`--accept --allow '${key}'\``);

  console.log(`live-css: ${live} live rules held from a sweep of ${Object.values(baseline.coverage).reduce((a, b) => a + b, 0)} frames (${CORNERS.map((c) => `${c.replace('|', ' ')} ${baseline.coverage[c] ?? 0}`).join(', ')}); ${baseline.dead.length} were drawn by no page at the last accept; ${current.styleRules} style rules parsed, ${text} preludes counted${drop.out.length ? `, ${drop.out.length} dropped by Chromium for another engine's prefix (${drop.out.map((d) => `L${d.line}`).join(', ')})` : ''}.`);
  console.log(`live-css: ${unprotected.length} rule key${unprotected.length === 1 ? '' : 's'} added since the last --accept, unprotected until the next one.`);
  if (fails.length) { for (const f of fails) console.error(`✗ ${f}`); process.exit(1); }
  console.log(`✓ live-css: no live rule of ${CSS_PATH} was removed or lost a property.`);
};

const run = (cmd, args, opts) => spawnSync(cmd, args, { cwd: REPO, stdio: 'inherit', ...opts }).status;

const accept = async () => {
  const allow = process.argv.flatMap((a, i, all) => (a === '--allow' ? [all[i + 1]] : []));
  // --dry-run sweeps and reports, and never writes. --suites narrows the sweep, and is refused without
  // --dry-run: a partial sweep marks every rule its suites do not draw as dead, so it must never be able
  // to become a baseline. Both exist so the accept step's own refusals can be mutation-tested (#2201).
  const dry = process.argv.includes('--dry-run');
  const only = process.argv.flatMap((a, i, all) => (a === '--suites' ? all[i + 1].split(',') : []));
  if (only.length && !dry) { console.error('✗ live-css --accept: --suites narrows the sweep, so it is allowed only with --dry-run.'); process.exit(1); }
  const suites = only.length ? SUITES.filter((s) => only.includes(s.name)) : SUITES;
  if (only.length && suites.length !== only.length) { console.error(`✗ live-css --accept: --suites names an unknown suite (${only.join(', ')}).`); process.exit(1); }
  const old = existsSync(join(REPO, BASELINE_PATH)) ? JSON.parse(readFileSync(join(REPO, BASELINE_PATH), 'utf8')) : { live: {}, dead: [] };
  const css = readFileSync(join(REPO, CSS_PATH), 'utf8');
  const current = await parse(css);
  // The sweep also tests every key the OLD baseline held, including ones gone from the stylesheet, so
  // "still drawn" is asked of the DOM rather than of the stylesheet that just lost the rule.
  const byKey = new Map(current.rules.map((r) => [r.key, r]));
  for (const [key, was] of Object.entries(old.live)) if (!byKey.has(key)) byKey.set(key, { key, sel: was.sel, conds: was.conds, props: [], gone: true });
  const keys = [...byKey.values()];
  // Build first: the plugin suites do not check their bundle's freshness (#2101), and a sweep over a stale
  // bundle records the old UI.
  for (const w of ['@prism3/studio', '@prism3/plugin']) if (run('npm', ['run', '-w', w, 'build'], { stdio: 'ignore' }) !== 0) { console.error(`✗ live-css --accept: ${w} build failed`); process.exit(1); }
  const tmp = mkdtempSync(join(tmpdir(), 'live-css-'));
  const keyFile = join(tmp, 'keys.json');
  writeFileSync(keyFile, JSON.stringify({ keys: keys.map(({ key, sel, conds }) => ({ key, sel, conds })), fingerprint: current.fingerprint }));
  const seen = {}, coverage = {};
  try {
    for (const s of suites) {
      const out = join(tmp, `${s.name.replace(':', '-')}.json`);
      console.log(`live-css --accept: sweeping ${s.name} …`);
      const status = run('node', ['--import', join(HERE, 'live-css-sweep.mjs'), s.script], {
        cwd: join(REPO, s.cwd), stdio: ['ignore', 'ignore', 'inherit'],
        env: { ...process.env, LIVE_CSS_KEYS: keyFile, LIVE_CSS_OUT: out, LIVE_CSS_SUITE: s.name, LIVE_CSS_HOST: s.host ?? '' },
      });
      // A failing suite drew a partial app, and a partial sweep would record live rules as dead.
      if (status !== 0) { console.error(`✗ live-css --accept: ${s.name} exited ${status}; a partial sweep is not a baseline. Fix the suite first.`); process.exit(1); }
      const r = JSON.parse(readFileSync(out, 'utf8'));
      for (const [k, w] of Object.entries(r.seen)) seen[k] ??= w;
      for (const [c, n] of Object.entries(r.coverage)) coverage[c] = (coverage[c] ?? 0) + n;
      if (!r.framesWithSheet) { console.error(`✗ live-css --accept: ${s.name} opened no frame carrying ${CSS_PATH}; the sweep cannot see that suite.`); process.exit(1); }
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  for (const c of CORNERS) if (!(coverage[c] > 0)) { console.error(`✗ live-css --accept: the sweep drew no ${c.replace('|', ' ')} frame.`); process.exit(1); }

  // Memory: what the old baseline protected and this accept would forget.
  const refused = [], dropped = [], used = new Set();
  for (const [key, was] of Object.entries(old.live)) {
    const r = current.rules.find((x) => x.key === key);
    const lost = r ? was.props.filter((p) => !r.props.includes(p)) : null;
    if (r && !lost.length) continue;
    if (!seen[key]) { dropped.push(`${key} (no page draws it now)`); continue; }
    if (allow.includes(key)) { used.add(key); continue; }
    refused.push(r ? `${key} lost ${lost.join(', ')}` : `${key} was removed`);
  }
  const unused = allow.filter((k) => !used.has(k));
  if (unused.length) { console.error(`✗ live-css --accept: --allow names ${unused.join(', ')}, which this accept does not forget. Check the key.`); process.exit(1); }
  if (refused.length) {
    console.error('✗ live-css --accept refuses to forget live rules. Each still matches a drawn element:');
    for (const r of refused) console.error(`    ${r}`);
    console.error("  Restore them, or name each deliberate removal with --allow '<key>'.");
    process.exit(1);
  }
  const live = {}, dead = [];
  for (const r of current.rules) {
    if (seen[r.key]) live[r.key] = { sel: r.sel, conds: r.conds, props: r.props, seen: seen[r.key] };
    else dead.push(r.key);
  }
  const doc = { file: CSS_PATH, note: 'Written only by `node apps/studio/lint-live-css.mjs --accept` (#2201). Never by regen, never by the gate.', coverage, live, dead };
  if (dry) { for (const d of dropped) console.log(`  would drop: ${d}`); for (const k of used) console.log(`  would allow: ${k}`); console.log(`✓ live-css --accept --dry-run: would hold ${Object.keys(live).length} live, ${dead.length} drawn by no page. Nothing written.`); return; }
  writeFileSync(join(REPO, BASELINE_PATH), `${JSON.stringify(doc, null, 1)}\n`);
  for (const d of dropped) console.log(`  dropped: ${d}`);
  for (const k of used) console.log(`  allowed: ${k}`);
  console.log(`✓ live-css --accept: ${Object.keys(live).length} live, ${dead.length} drawn by no page, over ${CORNERS.map((c) => `${c.replace('|', ' ')} ${coverage[c]}`).join(', ')} frames. Wrote ${relative(REPO, join(REPO, BASELINE_PATH))}.`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--accept')) await accept(); else await check();
}
