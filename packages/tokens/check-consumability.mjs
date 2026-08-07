/**
 * CONSUMABILITY GATE — can a stock Style Dictionary read what the engine emits, and how much of it?
 *
 * This is a CHARACTERIZATION gate, not a pass/fail one, and the distinction is deliberate. The
 * emitter has a known defect (#609): per-mode values live under `$extensions.prism3.modes`, which
 * DTCG defines as ignorable, so every conforming consumer silently sees one value per token. A gate
 * that simply went red would either block every unrelated PR or get skipped; a gate that went green
 * would be lying.
 *
 * So it PINS the current measured behavior. The known-bad numbers are assertions:
 *
 *   • fix the defect  → these assertions fail, and whoever fixed it updates them and closes #609
 *   • worsen it       → these assertions fail
 *   • change nothing  → green, with the gap printed on every run so it stays visible
 *
 * That is the same posture `regen --check` takes toward `out/`: the gate's job is to have a MEMORY,
 * not an opinion. A known deficiency that cannot silently drift is worth far more than a red build
 * everyone learns to ignore.
 *
 * The independence rule (CLAUDE.md principle 4 / docs/34) applies here and is easy to get wrong:
 * `dtcgLeaves` is counted by walking the SOURCE JSON, and `cssVars` by parsing the EMITTED CSS.
 * Two different artifacts read two different ways — deriving one from the other would make the 1:1
 * collapse undetectable, which is the single thing this gate exists to see.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConsumer, buildProjected, SOURCE } from './sd.consumer.mjs';

const CONFIG = resolve(dirname(fileURLToPath(import.meta.url)), 'sd.consumer.mjs');

const BRAND = 'nb';

/** Leaves in the DTCG source, and how many carry per-mode values. Walks the JSON — NOT the CSS. */
const readSource = (brand) => {
  const tree = JSON.parse(readFileSync(SOURCE(brand), 'utf8'));
  let leaves = 0;
  const modes = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if ('$value' in node) {
      leaves++;
      const m = node.$extensions?.prism3?.modes;
      if (m) for (const k of Object.keys(m)) modes.add(k);
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v);
  };
  walk(tree);
  return { leaves, modes: [...modes].sort() };
};

/** Variables in the emitted CSS, and how many distinct selectors carry them. Parses the CSS — NOT the JSON. */
const readEmitted = (cssPath) => {
  // Comments are stripped FIRST — the generated file opens with a `/** … */` banner, and a naive
  // selector regex happily captures it as one.
  const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = [...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]);
  const selectors = [...css.matchAll(/^([^\s{][^{]*)\{/gm)].map((m) => m[1].trim()).filter(Boolean);
  // Values and references, not just names. Counting alone cannot see a preprocessor that rewrote
  // every value, nor `outputReferences` being switched off — both leave the COUNT identical.
  const refs = (css.match(/var\(--/g) ?? []).length;
  const byName = Object.fromEntries([...css.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]));
  return { vars, unique: new Set(vars).size, selectors: [...new Set(selectors)], refs, byName };
};

const fail = [];
const ok = (cond, label) => { console.log(`  ${cond ? '✓' : '✗'} ${label}`); if (!cond) fail.push(label); };

const src = readSource(BRAND);
const css = readEmitted(await buildConsumer(BRAND));

console.log(`\nConsumability gate — a stock Style Dictionary over \`${BRAND}.tokens.json\`\n`);
console.log(`  DTCG leaves in source        : ${src.leaves}`);
console.log(`  modes declared in source     : ${src.modes.length ? src.modes.join(', ') : 'none'} (+ the default)`);
console.log(`  CSS variables emitted        : ${css.unique}`);
console.log(`  selectors emitted            : ${css.selectors.join(', ')}\n`);

// ---- THE RULE, enforced structurally rather than trusted ----
// Mutation showed the counting assertions below are blind to a preprocessor being added: it rewrites
// VALUES and leaves every count identical. So naivety is asserted against the config SOURCE. This is
// the gate's most important check — without it, the cheapest way to make a future failure go away is
// the exact move that destroys the gate's meaning.
const cfg = readFileSync(CONFIG, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
for (const banned of ['preprocessors', 'hooks', 'transforms:', 'registerTransform', 'registerPreprocessor', 'registerFormat']) {
  ok(!cfg.includes(banned),
    `[RULE] the consumer config declares no \`${banned}\` — no custom code a consumer would have to run`);
}

// ---- what currently HOLDS (and should keep holding) ----
ok(css.unique > 0, 'the build produces output at all');
ok(css.vars.some((v) => v.includes('color')), 'color roles reach the CSS');
// `outputReferences` is a config OPTION and permitted — but losing it is a real consumer regression
// (the semantic->primitive relationship flattens to literals), and no count would notice.
ok(css.refs > 100, `alias references survive into the CSS (${css.refs} \`var(--\` uses) — outputReferences is on`);
// A known light-mode VALUE, so a preprocessor that silently swapped modes cannot pass unseen.
ok(css.byName['--nbds-color-background-primary']?.includes('palette-white'),
  `background/primary resolves to the LIGHT value (${css.byName['--nbds-color-background-primary'] ?? 'missing'})`);

// ---- the CANONICAL tree's collapse. PINNED, and it is NOT a defect awaiting a fix. ----
// I originally wrote these as "expected-true today, should fail once #609 lands." That was wrong, and
// the correction is worth stating: #609 resolved to keeping `$extensions` as the SOURCE OF TRUTH and
// emitting a conforming PROJECTION alongside it. So the canonical tree stays deliberately
// extension-based and these assertions stay true forever — they now document WHY the projection
// exists, not a defect. The acceptance test for #609 is the projected block below.
const KNOWN_COLLAPSE = true;
ok(css.unique === src.leaves,
  `[#609] every DTCG leaf yields exactly ONE css var (${css.unique}/${src.leaves}) — per-mode values are dropped`);
ok(css.selectors.join('|') === ':root',
  `[#609] the only selector emitted is \`:root\` (got \`${css.selectors.join('|')}\`) — no per-mode blocks reach the consumer`);
ok(src.modes.length > 0,
  `the source DOES declare modes the consumer never sees (${src.modes.join(', ')}) — the gap is real, not vacuous`);

// ---- THE PROJECTION (#609): what a conforming consumer actually reads ----
// This is the acceptance test. Same stock config, two sources instead of one, still no custom code.
console.log(`\n  Projected build — base + overlay, stock Style Dictionary, no custom code:\n`);
const baseCss = readEmitted(await buildProjected(BRAND, 'base'));
ok(baseCss.unique === src.leaves,
  `[#609] the BASE carries every token (${baseCss.unique}/${src.leaves})`);
ok(baseCss.refs > 100, `[#609] the base preserves alias references (${baseCss.refs})`);
// Independence: `modes` comes from walking the SOURCE json, the emitted vars from parsing CSS.
for (const mode of src.modes) {
  const m = readEmitted(await buildProjected(BRAND, mode));
  const differing = Object.keys(baseCss.byName).filter((k) => baseCss.byName[k] !== m.byName[k]).length;
  ok(m.unique === src.leaves, `[#609] ${mode}: every token present (${m.unique}/${src.leaves}) — nothing dropped`);
  ok(m.refs > 100, `[#609] ${mode}: alias references survive (${m.refs})`);
  ok(differing > 0, `[#609] ${mode}: actually differs from base (${differing} vars) — the overlay is not inert`);
  ok(m.selectors.join('|') === `[data-theme="${mode}"]`, `[#609] ${mode}: emitted under its own selector (${m.selectors.join('|')})`);
}
// The non-vacuity floor: an empty overlay would satisfy "nothing dropped" while changing nothing.
ok(src.modes.length >= 3, `[#609] the projection covers every declared mode (${src.modes.length})`);

if (fail.length) {
  console.error(`✗ ${fail.length} assertion(s) failed — the measured behavior moved:\n`);
  for (const f of fail) console.error(`    ${f}`);
  console.error('\n  If you FIXED #609, update the pinned assertions. If not, something regressed.\n');
  process.exit(1);
}
console.log(`✓ canonical tree: ${src.modes.length} of ${src.modes.length + 1} modes invisible to a conforming consumer — BY DESIGN (#609).`);
console.log(`✓ projected set:  base + ${src.modes.length} overlays read by a stock Style Dictionary with no custom code.\n`);
if (!KNOWN_COLLAPSE) process.exit(1);
