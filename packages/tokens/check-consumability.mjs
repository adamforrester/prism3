/**
 * CONSUMABILITY GATE — can a stock Style Dictionary read what the engine emits, and how much of it?
 *
 * This is a CHARACTERIZATION gate, not a pass/fail one, and the distinction is deliberate. It PINS
 * measured behavior:
 *
 *   • the behavior improves → these assertions fail, and whoever improved it updates them
 *   • the behavior worsens  → these assertions fail
 *   • nothing changes       → green, with the gaps printed on every run so they stay visible
 *
 * Same posture `regen --check` takes toward `out/`: the gate's job is to have a MEMORY, not an
 * opinion. A known deficiency that cannot silently drift is worth far more than a red build everyone
 * learns to ignore.
 *
 * TWO THINGS IT MEASURES, which answer different questions:
 *
 *   1. the CANONICAL tree (`<brand>.tokens.json`) collapses to one value per token. Permanent and
 *      deliberate — `$extensions` is defined by DTCG as ignorable, and #609 resolved to keeping the
 *      canonical tree extension-based rather than contorting it. These assertions document WHY the
 *      projection exists; they are not a defect awaiting a fix.
 *   2. the PROJECTED set (`<brand>.base` + `<brand>.<mode>.overlay`) is #609's acceptance test: every
 *      token present in every mode, aliases intact, each mode under its own selector, no custom code.
 *
 * SCOPE — every brand the engine emits, not one (#635). The first version hard-coded `nb`, which
 * answered "can a stranger consume `nb`?" and was silent on the other three. Brands are DISCOVERED
 * from `out/`, so a fifth is covered the day it lands; the four known profiles are then asserted BY
 * NAME, because a gate with a scope must prove each promised surface is represented rather than count
 * files (CLAUDE.md principle 4).
 *
 * EVERY expectation is derived PER BRAND. Leaf counts, mode lists and the token root all differ
 * (`nb` roots at `nbds`, the rest at `prism`), so a shared literal would be one measurement standing
 * in for four — the gate-independence trap in its purest form.
 *
 * The independence rule (docs/34) is easy to get wrong here: leaf counts come from walking the SOURCE
 * JSON, variables from parsing the EMITTED CSS. Two artifacts, two readers. Deriving one from the
 * other would make the 1:1 collapse undetectable, which is the single thing this gate exists to see.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConsumer, buildProjected, SOURCE, OUT_ROOT } from './sd.consumer.mjs';

const CONFIG = resolve(dirname(fileURLToPath(import.meta.url)), 'sd.consumer.mjs');

/**
 * The brands to measure, discovered rather than listed — `<brand>.tokens.json` minus the projected
 * artifacts, which are `<brand>.base.` / `<brand>.<mode>.overlay.` and would otherwise read as brands
 * named `nb.base` and so on.
 */
const discoverBrands = () =>
  readdirSync(OUT_ROOT)
    .filter((f) => f.endsWith('.tokens.json') && !/\.(base|[\w-]+\.overlay)\.tokens\.json$/.test(f))
    .map((f) => f.replace('.tokens.json', ''))
    .sort();

/**
 * The profiles this gate PROMISES to cover, and what each one exercises that the others do not.
 * Asserted by name below. Discovery alone is not enough: if `aurora` stopped being emitted, a
 * count-based check would happily report "3 brands, all green" and the only brand with gradients
 * would have left the corpus unnoticed.
 */
const PROMISED = {
  nb: 'the legacy nbds.* dialect and hand-authored regression target',
  aurora: 'gradients (Paint Styles) + a decoupled action palette',
  harbor: 'a third input profile',
  wendys: 'the standard-dialect front door (parseStandard + classifier)',
};

/** Leaves in the DTCG source, the modes they declare, and the token root. Walks the JSON — NOT the CSS. */
const readSource = (brand) => {
  const tree = JSON.parse(readFileSync(SOURCE(brand), 'utf8'));
  let leaves = 0;
  const modes = new Set();
  const types = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if ('$value' in node) {
      leaves++;
      if (node.$type) types.add(node.$type);
      const m = node.$extensions?.prism3?.modes;
      if (m) for (const k of Object.keys(m)) modes.add(k);
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v);
  };
  walk(tree);
  // The token root is a lever (`nbds` for the legacy dialect, `prism` otherwise), so the CSS variable
  // prefix has to be read off the tree rather than assumed.
  const root = Object.keys(tree).find((k) => !k.startsWith('$'));
  return { leaves, modes: [...modes].sort(), types: [...types].sort(), root };
};

/** Variables in the emitted CSS, their values, and its selectors. Parses the CSS — NOT the JSON. */
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
  // A value Style Dictionary could not stringify. `[object Object]` is what a composite type with no
  // registered transform serializes to — present, counted, and useless. See the CORRUPT block below.
  const corrupt = Object.entries(byName).filter(([, v]) => v.includes('[object Object]')).map(([k]) => k).sort();
  return { vars, unique: new Set(vars).size, selectors: [...new Set(selectors)], refs, byName, corrupt };
};

const fail = [];
const ok = (cond, label) => { console.log(`  ${cond ? '✓' : '✗'} ${label}`); if (!cond) fail.push(label); };

// ---- THE RULE, enforced structurally rather than trusted ----
// Mutation showed the counting assertions below are blind to a preprocessor being added: it rewrites
// VALUES and leaves every count identical. So naivety is asserted against the config SOURCE. This is
// the gate's most important check — without it, the cheapest way to make a future failure go away is
// the exact move that destroys the gate's meaning.
console.log(`\nConsumability gate — a stock Style Dictionary over every emitted brand\n`);
const cfg = readFileSync(CONFIG, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
for (const banned of ['preprocessors', 'hooks', 'transforms:', 'registerTransform', 'registerPreprocessor', 'registerFormat']) {
  ok(!cfg.includes(banned),
    `[RULE] the consumer config declares no \`${banned}\` — no custom code a consumer would have to run`);
}

// ---- SCOPE: representation, not a count (#635) ----
const brands = discoverBrands();
console.log(`\n  brands discovered: ${brands.join(', ')}\n`);
for (const [name, why] of Object.entries(PROMISED)) {
  ok(brands.includes(name), `[SCOPE] \`${name}\` is measured — ${why}`);
}

/**
 * Composite-type values a stock Style Dictionary cannot serialize, PINNED per brand.
 *
 * This is the assertion that could not exist while the gate counted only names — and the reason it
 * had to. `nb` reported 556 leaves → 556 variables, a perfect 1:1, while three of those 556 were the
 * literal string `[object Object]`. The count was right and the output was broken, which is exactly
 * the shape of defect a count is structurally unable to see.
 *
 *   • `spring` (3 per brand) — a Prism3 type with no DTCG equivalent, so no consumer has a transform
 *     for it. Expected, and pinned so it stays visible rather than assumed.
 *   • `gradient` (2, `aurora` only) — a STANDARD DTCG composite type. This one is different in kind:
 *     a conforming consumer reading a conforming type gets garbage, and Style Dictionary's `css`
 *     transformGroup ships no gradient handler. Predicted by #635 before it was measured.
 *
 * NOT fixed here — #635 is explicitly about measuring all four brands, and each defect it surfaces
 * gets its own decision, the same way #609 came out of measuring one. Filed as #642. Widening this pin to make a
 * future failure go away would be the same move as adding a preprocessor: it ends the measurement.
 */
const CORRUPT = { nb: 3, aurora: 5, harbor: 3, wendys: 3 };

for (const brand of brands) {
  const src = readSource(brand);
  const css = readEmitted(await buildConsumer(brand));

  console.log(`\n  ── ${brand} (root \`${src.root}\`) ─────────────────────────────`);
  console.log(`     source leaves ${src.leaves} · modes ${src.modes.join(', ') || 'none'} (+ default) · css vars ${css.unique} · selectors ${css.selectors.join(', ')}`);

  ok(css.unique > 0, `${brand}: the build produces output at all`);
  ok(css.vars.some((v) => v.includes('color')), `${brand}: color roles reach the CSS`);
  // `outputReferences` is a config OPTION and permitted — but losing it is a real consumer regression
  // (the semantic->primitive relationship flattens to literals), and no count would notice. The floor
  // is a fraction of the brand's own leaf count rather than a shared literal: brands differ in size.
  ok(css.refs > src.leaves * 0.5,
    `${brand}: alias references survive into the CSS (${css.refs} \`var(--\` uses, over half of ${src.leaves} leaves) — outputReferences is on`);

  // ---- the CANONICAL tree's collapse. PINNED, and NOT a defect awaiting a fix. ----
  ok(css.unique === src.leaves,
    `${brand}: [#609] every DTCG leaf yields exactly ONE css var (${css.unique}/${src.leaves}) — per-mode values are dropped`);
  ok(css.selectors.join('|') === ':root',
    `${brand}: [#609] the only selector emitted is \`:root\` (got \`${css.selectors.join('|')}\`) — no per-mode blocks reach the consumer`);
  ok(src.modes.length > 0,
    `${brand}: the source DOES declare modes the consumer never sees (${src.modes.join(', ')}) — the gap is real, not vacuous`);

  // ---- VALUE INTEGRITY: what counting cannot see ----
  ok(css.corrupt.length === CORRUPT[brand],
    `${brand}: [CORRUPT] ${css.corrupt.length} value(s) serialize to \`[object Object]\`, pinned at ${CORRUPT[brand]}${css.corrupt.length ? ` — ${css.corrupt.slice(0, 3).join(', ')}` : ''}`);

  // ---- THE PROJECTION (#609): what a conforming consumer actually reads ----
  const base = readEmitted(await buildProjected(brand, 'base'));
  ok(base.unique === src.leaves, `${brand}: [#609] the BASE carries every token (${base.unique}/${src.leaves})`);
  ok(base.refs > src.leaves * 0.5, `${brand}: [#609] the base preserves alias references (${base.refs})`);
  // The canonical build and the base projection are two independently produced artifacts that should
  // agree on every default value. If they diverge, the projection has silently changed the default
  // system rather than merely re-expressing it — and no per-file count would show that.
  const baseDrift = Object.keys(css.byName).filter((k) => css.byName[k] !== base.byName[k]);
  ok(baseDrift.length === 0,
    `${brand}: [#609] the base projection reproduces the canonical build value-for-value${baseDrift.length ? ` — ${baseDrift.length} differ, e.g. ${baseDrift.slice(0, 2).join(', ')}` : ''}`);

  for (const mode of src.modes) {
    const m = readEmitted(await buildProjected(brand, mode));
    const differing = Object.keys(base.byName).filter((k) => base.byName[k] !== m.byName[k]).length;
    ok(m.unique === src.leaves, `${brand}/${mode}: [#609] every token present (${m.unique}/${src.leaves}) — nothing dropped`);
    ok(m.refs > src.leaves * 0.5, `${brand}/${mode}: [#609] alias references survive (${m.refs})`);
    ok(differing > 0, `${brand}/${mode}: [#609] actually differs from base (${differing} vars) — the overlay is not inert`);
    ok(m.selectors.join('|') === `[data-theme="${mode}"]`, `${brand}/${mode}: [#609] emitted under its own selector (${m.selectors.join('|')})`);
  }

  // A known page color, addressed through the brand's OWN root so this is not an `nb` assertion wearing
  // a loop. The canonical build must show the DEFAULT value, not a mode's — checked by comparing it
  // against the dark projection of the same variable rather than against a hard-coded color.
  const pageVar = `--${src.root}-color-background-primary`;
  const dark = readEmitted(await buildProjected(brand, 'dark'));
  ok(css.byName[pageVar] !== undefined, `${brand}: the page background resolves (${pageVar} = ${css.byName[pageVar] ?? 'MISSING'})`);
  ok(css.byName[pageVar] !== dark.byName[pageVar],
    `${brand}: the canonical build shows the DEFAULT page background, not dark's (${css.byName[pageVar]} vs ${dark.byName[pageVar]})`);

  ok(src.modes.length >= 3, `${brand}: [#609] the projection covers every declared mode (${src.modes.length})`);
}

if (fail.length) {
  console.error(`\n✗ ${fail.length} assertion(s) failed — the measured behavior moved:\n`);
  for (const f of fail) console.error(`    ${f}`);
  console.error('\n  Update the pin if the change was deliberate. If not, something regressed.\n');
  process.exit(1);
}
console.log(`\n✓ ${brands.length} brands measured: canonical trees collapse to one value per token BY DESIGN (#609);`);
console.log(`  base + overlay projections read back through a stock Style Dictionary with no custom code.`);
console.log(`✓ ${Object.values(CORRUPT).reduce((a, b) => a + b, 0)} composite values across the corpus serialize to \`[object Object]\` — pinned, not fixed (#635).\n`);
