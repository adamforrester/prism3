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
 * WHY THE PROJECTION IS THE STANDARD ANSWER, NOT A WORKAROUND — worth knowing before someone reads
 * (1) as an apology for a limitation we invented.
 *
 * Style Dictionary issue #1171, "Multiple conditional / mode values for a single design token"
 * (opened 2024-04-25), asked for exactly what (1) says is impossible: one file whose tokens each
 * carry several mode-conditional values. It was CLOSED as completed within days. The resolution is
 * the point — the answer was to build separate outputs per theme rather than teach one file to hold
 * multi-valued tokens. `base` + `<mode>.overlay` is that shape. We are following the tool's own
 * recommended approach, not routing around a gap in it.
 *
 * And the shape is not idiosyncratic. The DTCG Resolver Module (preview draft, 30 July 2026,
 * https://www.designtokens.org/tr/drafts/resolver/) models exactly this: SETS of token sources merged
 * in array order, MODIFIERS carrying a `contexts` map, and a RESOLUTION ORDER deciding priority.
 * `base` is a set; each `<mode>.overlay` is a context under a modifier. We converged on the standard's
 * data model independently, before it existed in draft.
 *
 * WHY WE STILL EMIT PLAIN PER-MODE FILES RATHER THAN A RESOLVER DOCUMENT. Style Dictionary issue
 * #1590, "Support for DTCG v2025.10" (OPEN, filed 2025-11-04), tracks what SD does and does not yet
 * handle, and lists `Resolvers: support for the new resolver module` as still in progress. A resolver
 * document is not readable by a stock Style Dictionary today, so emitting one would break the single
 * promise this gate exists to keep. Re-check #1590 before proposing that change.
 *
 * Two cautions, so the convergence is not over-read. The draft says "do not attempt to implement this
 * version" — this is convergence worth knowing about, not a spec to conform to yet. And the 2025.10
 * stable announcement advertises theming "without file duplication" while the mechanism lives in this
 * separate draft: anyone acting on "DTCG has theming now" is acting on an announcement, not a spec.
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

/**
 * The types the DTCG spec defines — this gate's OWN copy, deliberately not imported from the engine.
 *
 * The engine has an identical list in `emit-dtcg-overlay.ts`, which is what DECIDES what to project.
 * Importing it here would make the rule below unfalsifiable: adding `spring` to the engine's set would
 * put spring back in the projection AND simultaneously teach this gate that spring is conforming, and
 * the assertion would pass while the promise broke. **Two independent transcriptions of a published
 * spec is the point, not duplication to clean up** (docs/34). Both cite the spec; neither cites the
 * other. If they ever disagree, the disagreement is the finding.
 */
const DTCG_TYPES = new Set([
  'color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number',
  'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography',
]);

/** Leaves in a DTCG tree, the modes they declare, the types they use, and the token root. Walks the
 *  JSON — NOT the CSS. `file` defaults to the canonical tree; the projection is read with the same
 *  walker so the two are measured by one implementation rather than two that could drift. */
const readSource = (brand, file = SOURCE(brand)) => {
  const tree = JSON.parse(readFileSync(file, 'utf8'));
  let leaves = 0;
  const modes = new Set();
  const types = new Set();
  // Paths, not just a count: a non-conforming type has to be NAMED to be actionable, and a bare
  // number would leave whoever hits this failure hunting for which token it means.
  const byType = {};
  const walk = (node, path = '') => {
    if (!node || typeof node !== 'object') return;
    if ('$value' in node) {
      leaves++;
      if (node.$type) {
        types.add(node.$type);
        (byType[node.$type] ??= []).push(path);
      }
      const m = node.$extensions?.prism3?.modes;
      if (m) for (const k of Object.keys(m)) modes.add(k);
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, path ? `${path}.${k}` : k);
  };
  walk(tree);
  // The token root is a lever (`nbds` for the legacy dialect, `prism` otherwise), so the CSS variable
  // prefix has to be read off the tree rather than assumed.
  const root = Object.keys(tree).find((k) => !k.startsWith('$'));
  const nonConforming = Object.entries(byType)
    .filter(([t]) => !DTCG_TYPES.has(t))
    .flatMap(([t, paths]) => paths.map((p) => `${p} (\`${t}\`)`))
    .sort();
  return { leaves, modes: [...modes].sort(), types: [...types].sort(), root, nonConforming };
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
 * Values a stock Style Dictionary cannot serialize — SPLIT IN TWO by #642, and the split is the point.
 *
 * Until #642 this was one number per brand, all of it labelled `[CORRUPT]`: `{nb: 3, aurora: 5,
 * harbor: 3, wendys: 3}` = 14. That conflated two things wanting OPPOSITE treatment — "we emitted
 * something unreadable" and "a conforming consumer cannot read something correct." One is our defect
 * and should be impossible; the other is not ours and should be remembered.
 *
 * EMITTER-SIDE — a RULE, asserted at 0, not pinned. Every `$type` in the conforming projection must be
 * a DTCG type. This is the upgrade #642 was worth doing for, beyond the 12 tokens it removed: a pinned
 * count can only remember what was true when someone wrote it down, whereas "zero non-DTCG types in the
 * conforming projection" fails the DAY a new one ships. Note what it is derived from — each emitted
 * `$type` checked against the spec list, NOT a count of `[object Object]`. A future non-standard type
 * might stringify cleanly (a string `$value`, say) and walk straight through a corruption count while
 * breaking the same promise. The rule is about conformance; corruption was only its symptom.
 *
 * CONSUMER-SIDE — a MEMORY, pinned at 2. `gradient` is a STANDARD DTCG composite type and our token
 * already conforms: an array of stops carrying `color` and `position`. Style Dictionary's `css`
 * transformGroup simply ships no gradient handler and falls back to `String(value)`. Both candidate
 * "fixes" are worse than the gap — pre-serializing a CSS string would make our output NON-conforming,
 * and shipping a gradient transform is exactly what the NO CUSTOM CODE rule forbids. That rule governs
 * what WE ship; a consumer writing their own transform is their configuration, not our adapter. So this
 * stays measured and visible, in the same posture as #609's mode collapse: a documented consumer gap,
 * not a defect awaiting a fix (#642).
 *
 * THE GAP NOW HAS A NAMED UPSTREAM CAUSE, and it is worth watching rather than assuming permanent.
 * Style Dictionary issue #1590, "Support for DTCG v2025.10" (OPEN, filed 2025-11-04), lists what v5
 * does and does not yet handle: color, border, shadow and dimension are done; `Gradient: support for
 * the new color module still in progress`. So this pin is tracking an open upstream item, not an
 * architectural impossibility. **If it closes, this number should MOVE — and because the assertion is
 * `===`, an improvement fails the gate and whoever improved it updates the pin.** That is the
 * characterization posture working as designed; do not read a failure here as a regression without
 * checking #1590 first.
 *
 * Widening either number to make a failure go away is the same move as adding a preprocessor: it ends
 * the measurement.
 */
const CONSUMER_GAP = { nb: 0, aurora: 2, harbor: 0, wendys: 0 };

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

  // ---- VALUE INTEGRITY on the CANONICAL build. NOT a conformance promise — this tree is ours and
  // extension-based by #609's decision, and `spring` lives here on purpose. Kept measured so the
  // corruption does not become invisible now that the RULE below covers the projection. The expected
  // count is DERIVED from two independent readers: non-DTCG leaves counted by walking the JSON, plus
  // the consumer gap counted by parsing the CSS. A literal here would be the pin this PR just split.
  const canonicalExpected = src.nonConforming.length + CONSUMER_GAP[brand];
  ok(css.corrupt.length === canonicalExpected,
    `${brand}: the canonical build corrupts ${css.corrupt.length} value(s) = ${src.nonConforming.length} non-DTCG + ${CONSUMER_GAP[brand]} consumer-gap — expected, this tree is ours (#609)`);

  // ---- THE PROJECTION (#609): what a conforming consumer actually reads ----
  const base = readEmitted(await buildProjected(brand, 'base'));
  const baseSrc = readSource(brand, resolve(OUT_ROOT, `${brand}.base.tokens.json`));

  // ---- THE RULE (#642): every `$type` in the conforming projection is a DTCG type. 0, ASSERTED. ----
  // Checked against the spec list, per emitted type, across the base AND every overlay — not by
  // counting `[object Object]`, which a future non-standard type could stringify past. This is the
  // assertion that fails the day another one ships, rather than the day someone remembers to re-measure.
  ok(baseSrc.nonConforming.length === 0,
    `${brand}: [RULE] every \`$type\` in the BASE projection is a DTCG type${baseSrc.nonConforming.length ? ` — ${baseSrc.nonConforming.join(', ')} cannot be resolved by a conforming consumer (#642)` : ''}`);
  for (const mode of src.modes) {
    const ov = readSource(brand, resolve(OUT_ROOT, `${brand}.${mode}.overlay.tokens.json`));
    ok(ov.nonConforming.length === 0,
      `${brand}/${mode}: [RULE] every \`$type\` in the OVERLAY is a DTCG type${ov.nonConforming.length ? ` — ${ov.nonConforming.join(', ')} (#642)` : ''}`);
  }
  // And the rule's consequence, read off the EMITTED CSS rather than the JSON: whatever the projection
  // still cannot serialize is standard-typed, so it is the consumer's gap and not ours. PINNED.
  ok(base.corrupt.length === CONSUMER_GAP[brand],
    `${brand}: [CONSUMER-GAP] ${base.corrupt.length} standard-typed value(s) a stock SD cannot serialize, pinned at ${CONSUMER_GAP[brand]}${base.corrupt.length ? ` — ${base.corrupt.join(', ')} (correct DTCG, no SD handler — #642)` : ''}`);

  // The base is the canonical tree MINUS non-DTCG leaves (#642) — derived from the source walk, so a
  // token silently vanishing from the projection still fails even though the count is no longer 1:1.
  ok(base.unique === src.leaves - src.nonConforming.length,
    `${brand}: [#609] the BASE carries every DTCG token (${base.unique}/${src.leaves - src.nonConforming.length} = ${src.leaves} leaves − ${src.nonConforming.length} non-DTCG)`);
  ok(base.refs > src.leaves * 0.5, `${brand}: [#609] the base preserves alias references (${base.refs})`);
  // The canonical build and the base projection are two independently produced artifacts that should
  // agree on every default value. If they diverge, the projection has silently changed the default
  // system rather than merely re-expressing it — and no per-file count would show that.
  //
  // #642 made the projection a SUBSET, which splits this into two questions that must not be merged.
  // Excusing every missing variable would turn a value check into "the projection contains nothing it
  // shouldn't", and a token quietly disappearing would then read as a pass. So the absentees are
  // asserted BY NAME against the non-conforming paths read from the source tree, and the values are
  // compared across everything else.
  // Style Dictionary's `name/kebab` keeps the token root as the variable prefix (`nbds.motion.spring
  // .snappy` → `--nbds-motion-spring-snappy`), so the full path converts — dropping the root here was
  // an early mistake that made the check report 3/3 correct names as UNEXPECTED.
  const varOf = (path) => `--${path.replace(/\./g, '-')}`;
  const expectedAbsent = new Set(src.nonConforming.map((p) => varOf(p.replace(/ \(`.*`\)$/, ''))));
  const missing = Object.keys(css.byName).filter((k) => base.byName[k] === undefined);
  ok(missing.length === expectedAbsent.size && missing.every((k) => expectedAbsent.has(k)),
    `${brand}: [#642] exactly the non-DTCG tokens are absent from the base (${missing.length}/${expectedAbsent.size})${missing.some((k) => !expectedAbsent.has(k)) ? ` — UNEXPECTED: ${missing.filter((k) => !expectedAbsent.has(k)).slice(0, 3).join(', ')}` : ''}`);
  const baseDrift = Object.keys(css.byName).filter((k) => base.byName[k] !== undefined && css.byName[k] !== base.byName[k]);
  ok(baseDrift.length === 0,
    `${brand}: [#609] the base projection reproduces the canonical build value-for-value, for every token it carries${baseDrift.length ? ` — ${baseDrift.length} differ, e.g. ${baseDrift.slice(0, 2).join(', ')}` : ''}`);

  for (const mode of src.modes) {
    const m = readEmitted(await buildProjected(brand, mode));
    const differing = Object.keys(base.byName).filter((k) => base.byName[k] !== m.byName[k]).length;
    // Same subtraction as the base: a mode's build sources base + overlay, so it carries the projected
    // token set, not the canonical one (#642).
    ok(m.unique === src.leaves - src.nonConforming.length,
      `${brand}/${mode}: [#609] every DTCG token present (${m.unique}/${src.leaves - src.nonConforming.length}) — nothing dropped`);
    ok(m.refs > src.leaves * 0.5, `${brand}/${mode}: [#609] alias references survive (${m.refs})`);
    ok(differing > 0, `${brand}/${mode}: [#609] actually differs from base (${differing} vars) — the overlay is not inert`);
    ok(m.selectors.join('|') === `[data-theme="${mode}"]`, `${brand}/${mode}: [#609] emitted under its own selector (${m.selectors.join('|')})`);
  }

  // A known page color, addressed through the brand's OWN root so this is not an `nb` assertion wearing
  // a loop. The canonical build must show the DEFAULT value, not a mode's — checked by comparing it
  // against the dark projection of the same variable rather than against a hard-coded color.
  //
  // ── ONE TIER, AND THE SHORT NAME IS NOW THE ONE THAT VARIES (#1148) ────────────────────────────
  // Until #1148 there were two colour tiers and this block had to ask the LONGER one: the swap (#1013)
  // gave the short name to a surface-ALIAS tier whose leaf was a POINTER, so in CSS it emitted
  // `var(--<root>-color-appearance-background-primary)` — the same string in every appearance build,
  // because appearance varied one level down. Asking the short name then compared a pointer against
  // itself and failed with two identical strings in the message, reading as "the overlay is inert"
  // rather than "wrong tier asked". That is the trap this comment exists to keep visible, and #1148
  // removed the tier that caused it: `color.background.primary` is the value now, and it moves.
  //
  // The three arms below are a SET and none is sufficient. Arm 1 is the original assertion at the only
  // tier there is. Arm 2 is the property that broke it before — the value must MOVE between appearance
  // builds — which is what a re-introduced pointer under this name would fail. Arm 3 is the converse
  // and the one that cannot be satisfied by accident: the long spelling must be ABSENT, so an emitter
  // that revived the two-tier split fails here by name rather than passing arms 1 and 2 unchanged while
  // silently adding a second surface for consumers to choose between.
  const valueVar = `--${src.root}-color-background-primary`;
  const retiredPrefix = `--${src.root}-color-appearance-`;
  const dark = readEmitted(await buildProjected(brand, 'dark'));
  ok(css.byName[valueVar] !== undefined, `${brand}: the page background resolves (${valueVar} = ${css.byName[valueVar] ?? 'MISSING'})`);
  ok(css.byName[valueVar] !== dark.byName[valueVar],
    `${brand}: [#1148] the canonical build shows the DEFAULT page background, not dark's, and the SHORT name is what moves (${css.byName[valueVar]} vs ${dark.byName[valueVar]}) — identical strings here mean a pointer tier is back under this name`);
  const retired = Object.keys(css.byName).filter((n) => n.startsWith(retiredPrefix));
  ok(retired.length === 0,
    `${brand}: [#1148] and the retired \`color.appearance.*\` tier reaches the consumer in NO form (${retired.length ? `${retired.length} still do, e.g. ${retired.slice(0, 3).join(', ')}` : 'none'}) — one collection means one name per role, and a consumer choosing between two spellings of the same value is the state the collapse removed`);

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
console.log(`✓ [RULE] every \`$type\` in every conforming projection is a DTCG type — 0 non-standard, asserted not pinned (#642).`);
console.log(`✓ [CONSUMER-GAP] ${Object.values(CONSUMER_GAP).reduce((a, b) => a + b, 0)} standard-typed values across the corpus a stock Style Dictionary`);
console.log(`  cannot serialize — correct DTCG with no SD handler, so pinned as a documented consumer gap, not a defect (#642).\n`);
