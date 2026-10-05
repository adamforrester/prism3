/**
 * RAMP VALUE GATE (#1186) — every studio ramp rung resolves to a VALUE in the map its preview reads,
 * or the preview visibly special-cases it.
 *
 *   npx tsx packages/engine/lint-ramp-values.ts
 *
 * ── THIS IS THE HALF #1185 DOES NOT COVER, AND IT IS THE ACTUAL #1177 MECHANISM ─────────────────
 *
 * `lint-ramp-steps.ts` proves a step NAME is a real rung of its ladder. Its own header says what it
 * leaves open, and this gate is that sentence: *"a step can be in the ladder and still be absent from
 * `rp.dims`."*
 *
 * #1177 in one line: `capsule` WAS in `theme.dims.radius`, so a name-membership check passes it — but
 * `rp.dims`, which `resolve-preview.ts` builds from **only the refs the preview SPEC binds**, carried
 * no value for it, so `rp.dims['radius.capsule'] ?? 0` rendered `capsule · 0px` with a sharp swatch.
 * The name gate and the value are different invariants. Measured on this main: the radius ladder has
 * six rungs and `rp.dims` carries four (`sm`, `md`, `lg`, `round`) — the gap is real and permanent,
 * because `rp.dims` answers "what do preview COMPONENTS bind", which is a different question from
 * "what rungs exist".
 *
 * So a rung may legitimately be absent from `rp.dims` — `none` always was, `capsule` is since #1178 —
 * and the invariant is not "everything is in the map". It is:
 *
 *   **every rung is EITHER in the map the preview reads, OR visibly special-cased by that preview.**
 *
 * ── THE INDEPENDENCE CRUX: THE SPECIAL-CASE SET IS DISCOVERED, NEVER LISTED ─────────────────────
 *
 * A hand-written `SPECIAL_CASED = ['none', 'capsule']` in this file would be a second copy of a fact
 * the preview already states, and it would rot the instant somebody special-cases a fourth rung — the
 * gate would keep passing while the new sentinel went unchecked, and `docs/34` shape 4 is exactly that
 * (an oracle measuring a constant). **There is deliberately no such list below.**
 *
 * Instead the set is read out of how the preview actually BRANCHES: `step === '<rung>'` inside the
 * ramp's own function body. That is the same truth the running code uses — `step === 'none' ? 0 : …`
 * short-circuits before `rp.dims`, and `const isCapsule = step === 'capsule'` decides both the drawn
 * corner and the label. If a fifth rung is special-cased tomorrow, the same idiom discovers it with no
 * edit here.
 *
 * TWO WAYS THAT DISCOVERY CAN BE WRONG, and they are not symmetrical:
 *
 *   · IT UNDER-COLLECTS — someone special-cases via an idiom the scan does not know
 *     (`['none','capsule'].includes(step)`, or a `SPECIAL` set). Then the rung reads as uncovered and
 *     ARM A fires. **A false POSITIVE, which is the safe direction**: it is loud, and the remedy is to
 *     widen the discovery or make the special case explicit — never to add the rung to a list here.
 *   · IT OVER-COLLECTS — the scan picks up a `step === 'x'` that is not a value bypass at all (a
 *     cosmetic highlight, say). That rung would read as covered while still reaching `rp.dims`, which
 *     is a false NEGATIVE and would be silent. **ARM B exists to convert exactly that into a
 *     failure**: a rung that is special-cased AND present in `rp.dims` is reported, because either the
 *     sentinel is stale or this scan over-collected, and both need a person. That is why arm B is a
 *     failure and not a note — it is what keeps the discovery honest.
 *
 * ── INDEPENDENCE (docs/34) ─────────────────────────────────────────────────────────────────────
 *
 *   SUBJECT  — the studio's ramp: its step list and its branch structure, parsed from
 *              `apps/studio/src/main.ts` (which touches `document` at import time and cannot be
 *              loaded under `tsx` — the reason every studio gate here is a source scan).
 *   ORACLE   — `resolvePreview(theme, previewSpec).dims`, obtained by RUNNING the real resolver over
 *              real themes. Not a re-implementation of which refs the spec binds: re-deriving that
 *              here would be a second opinion about the wrong thing, and would agree with itself.
 *
 * The two are independent: `rp.dims` is decided by `preview.ts`'s spec and `resolve-preview.ts`'s
 * walk; the step list and the special cases are hand-written in the studio. #1177 is precisely the two
 * disagreeing.
 *
 * ── THE ARMS ────────────────────────────────────────────────────────────────────────────────────
 *
 *   A  UNRESOLVED RUNG   — a rung neither present in `rp.dims` nor special-cased by its preview. It
 *                          hits `?? 0` and renders a plausible number.            ← #1177 reproduced
 *   B  STALE SENTINEL    — a rung special-cased AND present in `rp.dims`. Either the sentinel outlived
 *                          its reason, or this file's discovery over-collected. See above: this arm is
 *                          the reason the discovery can be trusted.
 *   C  LITERAL KEY       — a `rp.dims['<ref>']` read with a spelled-out key whose ref the map does not
 *                          carry. Same defect, no loop to catch it, and one `?? 0` away from the same
 *                          silent 0. (Its last subject, the legacy button specimen's `rp.dims['radius.md']`,
 *                          went in S8.2; the arm stays as a tripwire, see the S8.2 section below.)
 *
 * ── THE FLOORS ─────────────────────────────────────────────────────────────────────────────────
 *
 * Every arm is a set comparison, so each side is asserted populated, by name:
 *
 *   · the ramp function must be FOUND in the studio source — a moved or renamed function makes this
 *     gate watch nothing, and that must fail rather than report a clean zero (#986);
 *   · the discovery must find at least one special case in a ramp that HAS rungs outside `rp.dims`,
 *     so a rotted idiom is diagnosed as a rotted idiom rather than as N spurious arm-A failures;
 *   · `rp.dims` must be non-empty for the ramp's prefix, or arm B compares nothing;
 *   · every interpolated `rp.dims[...]` read in the studio must belong to a DECLARED ramp — so a
 *     second ramp that starts reading the map fails here until it is classified. Without this the gate
 *     covers the one case it was written for, which is `docs/34` shape 10.
 *
 * ── WHAT THIS DOES NOT CHECK ───────────────────────────────────────────────────────────────────
 *
 * That the value is the RIGHT number. Arm A proves the map has an entry; whether that entry is the px
 * a designer should see is a question about `resolve-preview.ts`, not about the ramp, and nothing here
 * would notice a correct-shaped wrong value. Nor does it check ramps that read the theme directly
 * (`paintSizePreview` reads `theme.dims.sizes`): those derive their steps from the map they read, so
 * there is no second list to drift — the reason #1179's issue called that shape the deeper fix.
 *
 * ── UI REDESIGN S7: THE RADIUS RAMP LEFT THE MAP, AND THE SCOPE WIDENED (docs/34) ──────────────
 *
 * S7 (Shape) retired `paintRadiusPreview` and its `RADIUS_STEPS`, this gate's one declared ramp. The Shape
 * preview reads the radius ladder itself (`theme.dims.radius`, each size at the mode's own value), never
 * `rp.dims`, so the #1177 mechanism this gate guards (a rung absent from a map narrower than the ladder) no
 * longer exists for radius: there is one map, and it IS the ladder. That the preview draws every rung at its
 * emitted value is held where it can be measured, as drawn, by `test:smoke`'s Shape section against the
 * committed emission.
 *
 * The gate is RE-SCOPED, not retired, because its other arms still have subjects: arm C's literal read (the
 * legacy Buttons specimen's `rp.dims['radius.md']`, until S8), and the UNDECLARED RAMP floor, the arm that makes
 * a second ramp resolving through `rp.dims` fail until it is declared. Both now read EVERY studio source file
 * (`apps/studio/src/**`), not `main.ts` alone: the redesign moves code out of `main.ts` slice by slice, and a scan
 * pinned to the file the code is leaving would watch less with every slice while still printing clean (shape 10).
 *
 * THE FLOOR CHANGED SHAPE, and for a stated reason. It used to fail on 0 interpolated reads, because 0 then meant a
 * rotted scan. Now 0 is the expected state, so 0 cannot be the alarm. What proves the scan is alive instead: it
 * must read `main.ts` and the Shape preview's radius module by name, a planted fixture must be found by both
 * detectors (an interpolated read and a literal read), and the file count is printed. A scan that stopped reading
 * files, or whose patterns stopped matching, fails by name; a studio with no ramp in the map passes, which is the
 * truth. And #1189 is folded in: when a ramp's special-case discovery finds nothing while rungs sit outside the map,
 * its arm-A findings are skipped, because a scan just declared unreadable is not evidence.
 *
 * ── UI REDESIGN S8.2: ARM C LOST ITS LAST LITERAL READ, AND IS KEPT AS A TRIPWIRE (docs/34) ──────────
 *
 * S8.2 moved the button specimen to the Components page and fixed #2049 there: each button's corner is now the radius
 * size the engine binds for the brand's Control shape, at its value in the previewed mode (`buttonCornerPx` in
 * `apps/studio/src/preview/sections/button-layout.ts`, read off the ladder, never off `rp.dims`), so the legacy
 * caller's `rp.dims['radius.md']`, arm C's last subject, is gone. The studio reads `rp.dims` by a literal key nowhere.
 *
 * KEPT, NOT RETIRED, for the reason S7 kept the undeclared-ramp floor: the arm costs nothing, its detector is proven
 * alive on every run by the planted fixture (a pattern that stopped matching fails by name), and a new literal read is
 * exactly the #1177 shape it exists for, one `?? 0` from a silent zero. Zero literal reads is the expected state now,
 * printed as such, and is the truth rather than a blind spot: the fixture, not the count, is what proves the scan
 * looked. What the corner's VALUE should be is held where it can be measured against an independent oracle, not here:
 * `apps/studio/test-button-input.ts` against the engine's `applyControlShape` and the brand's emission, and
 * `test:smoke` against the corner as drawn. `MUST_READ` keeps `main.ts` and the radius module; `button-layout.ts` is
 * read with every other studio file.
 *
 * PURE-ADJACENT — reads the studio's source files and runs the engine + the real preview resolver in memory.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Theme } from './theme.ts';
import { brandTheme } from './theme.ts';
import { nbTheme } from './nb-fixture.ts';
import { readExampleBrand } from './emit-dtcg.ts';
import { resolvePreview } from './resolve-preview.ts';
import { previewSpec } from './preview.ts';

const HERE = import.meta.dirname;
const STUDIO_SRC = join(HERE, '../../apps/studio/src');
const REPO = join(HERE, '../..');
/** Every studio source file (S7 widened the scan from `main.ts` alone; see the header). */
const studioFiles = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? studioFiles(p) : /\.ts$/.test(n) && !/\.d\.ts$/.test(n) ? [p] : [];
});
const FILES = studioFiles(STUDIO_SRC);
const STUDIO_LABEL = 'apps/studio/src/**';
/** The files the scan must read, by name, so a misdirected or empty scan cannot pass: the legacy page module and
 *  the module that replaced the radius ramp. */
const MUST_READ = ['apps/studio/src/main.ts', 'apps/studio/src/preview/sections/radius.ts'];

/**
 * A ramp that resolves its rungs through `rp.dims`. Declared, and the declaration is CHECKED against
 * the file: the floor below fails on any interpolated `rp.dims` read whose ramp is not named here.
 *
 * Note what is NOT here and must never be: the special-cased rungs. Those are discovered from `fn`'s
 * own body — see the independence crux in the header.
 */
const RAMPS: { fn: string; steps: string; prefix: string; label: string }[] = [
  // `paintRadiusPreview` / `RADIUS_STEPS` stood here until UI redesign S7 moved the radius sizes off `rp.dims`
  // entirely (the header's S7 section). No studio ramp resolves through the map today; the floor below holds that a
  // new one is declared here before it can pass.
];

/** The body of a top-level `const <name> = (…) => {…};` arrow function, by brace depth. Text, because
 *  the studio cannot be imported; depth-counted rather than regex-matched so a nested `};` does not
 *  end it early. */
const functionBody = (src: string, name: string): string | null => {
  const start = src.indexOf(`const ${name} = (`);
  if (start < 0) return null;
  const open = src.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open, i + 1);
  }
  return null;
};

/** The array literal for an authored step list. */
const parseSteps = (src: string, name: string): string[] | null => {
  const m = new RegExp(`^const ${name}\\s*(?::[^=]+)?=\\s*\\[([^\\]]*)\\]`, 'm').exec(src);
  if (!m) return null;
  return m[1].split(',').map((s) => s.trim().replace(/^['"\`]|['"\`]$/g, '')).filter(Boolean);
};

/**
 * SPECIAL CASES, DISCOVERED — every rung the ramp's own body compares the loop variable against.
 * `step === 'none'` and `const isCapsule = step === 'capsule'` are both found by this, because both
 * are the code branching on a rung name. Deliberately not a list; see the header.
 */
const specialCasedIn = (body: string): string[] =>
  [...new Set([...body.matchAll(/\bstep\s*===\s*'([^']+)'/g)].map((m) => m[1]))].sort();

/** Interpolated reads — `rp.dims[`<prefix>.${var}`]` — so the declaration above is checked against the
 *  file rather than against itself. */
const interpolatedReads = (src: string): { prefix: string; index: number }[] =>
  [...src.matchAll(/rp\.dims\[`([a-z-]+)\.\$\{/g)].map((m) => ({ prefix: m[1], index: m.index ?? 0 }));

/** Literal reads — `rp.dims['radius.md']` — arm C's subject. */
const literalReads = (src: string): string[] =>
  [...new Set([...src.matchAll(/rp\.dims\['([^']+)'\]/g)].map((m) => m[1]))].sort();

const src = FILES.map((f) => readFileSync(f, 'utf8')).join('\n');

const corpus: { id: string; theme: Theme }[] = [
  { id: 'nb', theme: nbTheme() },
  { id: 'aurora', theme: brandTheme(readExampleBrand('./examples/aurora.design.md')) },
  { id: 'harbor', theme: brandTheme(readExampleBrand('./examples/harbor.design.md')) },
  // A lever extreme, for the same reason lint-ramp-steps carries one: `rp.dims` is spec-driven and so
  // is lever-independent today, and that is a property of the current spec rather than a guarantee.
  {
    id: 'aurora@radiusScale=0',
    theme: brandTheme({ ...readExampleBrand('./examples/aurora.design.md'), radiusScale: 0 }),
  },
];

const failures: string[] = [];
const lines: string[] = [];

// ---- FLOOR: the scan is alive (S7; see the header) ---------------------------------------------
const read = new Set(FILES.map((f) => relative(REPO, f).split('\\').join('/')));
for (const f of MUST_READ) {
  if (!read.has(f)) failures.push(`FLOOR: the scan did not read ${f}, so it is not looking where the studio's ramps live — a moved or misdirected scan reporting a clean zero (#986).`);
}
{
  // A planted fixture each detector must find, so a pattern that stopped matching fails by name rather than reading
  // as "the studio has no ramps".
  const FIXTURE = 'const x = rp.dims[`radius.${step}`] ?? 0; const y = rp.dims[\'radius.md\'];';
  if (interpolatedReads(FIXTURE).length !== 1) failures.push('FLOOR: the interpolated-read detector does not find the planted `rp.dims[`radius.${step}`]`, so a ramp reading the map would pass unseen.');
  if (literalReads(FIXTURE).join() !== 'radius.md') failures.push(`FLOOR: the literal-read detector does not find the planted \`rp.dims['radius.md']\` (found ${literalReads(FIXTURE).join(', ') || 'nothing'}), so arm C is watching nothing.`);
}
lines.push(`  scanned                   ${FILES.length} studio source files (${STUDIO_LABEL})`);
// ---- FLOOR: every interpolated rp.dims read belongs to a declared ramp -------------------------
const reads = interpolatedReads(src);
const declaredPrefixes = new Set(RAMPS.map((r) => r.prefix));
for (const r of reads) {
  if (!declaredPrefixes.has(r.prefix)) {
    failures.push(
      `UNDECLARED RAMP — ${STUDIO_LABEL} reads \`rp.dims\` with an interpolated '${r.prefix}.*' key, and ` +
        `no entry in RAMPS covers it. A second ramp resolving through the preview map is exactly this ` +
        `gate's subject; declare it (or this gate covers only the one case it was written for).`,
    );
  }
}

for (const ramp of RAMPS) {
  const body = functionBody(src, ramp.fn);
  if (!body) {
    failures.push(
      `FLOOR: \`${ramp.fn}\` was not found in ${STUDIO_LABEL}, so this ramp is watched by nothing. ` +
        `Renamed or moved — fix the declaration, never drop the entry.`,
    );
    continue;
  }
  const steps = parseSteps(src, ramp.steps);
  if (!steps?.length) {
    failures.push(`FLOOR: \`${ramp.steps}\` did not parse to a non-empty list, so every arm compared nothing.`);
    continue;
  }
  const special = new Set(specialCasedIn(body));

  let exercised = 0;
  const unresolved = new Map<string, string[]>();
  const stale = new Map<string, string[]>();
  for (const { id, theme } of corpus) {
    const dims = resolvePreview(theme as never, previewSpec as never).dims as Record<string, number>;
    const present = new Set(Object.keys(dims).filter((k) => k.startsWith(`${ramp.prefix}.`)).map((k) => k.slice(ramp.prefix.length + 1)));
    if (!present.size) {
      failures.push(
        `FLOOR: \`rp.dims\` carries no '${ramp.prefix}.*' key at all for '${id}', so arm B compares ` +
          `nothing and arm A would flag every rung for the wrong reason.`,
      );
      continue;
    }
    exercised++;
    for (const step of steps) {
      // ARM A — neither resolvable nor special-cased. This is #1177.
      if (!present.has(step) && !special.has(step)) unresolved.set(step, [...(unresolved.get(step) ?? []), id]);
      // ARM B — special-cased AND resolvable. Keeps the discovery honest; see the header.
      if (present.has(step) && special.has(step)) stale.set(step, [...(stale.get(step) ?? []), id]);
    }
  }

  // FLOOR — a ramp with rungs outside the map must have discovered at least one special case, or the
  // idiom changed and arm A is about to report a rotted scan as N real defects.
  const outsideMap = steps.length > 0 && unresolved.size + special.size > 0;
  if (outsideMap && !special.size) {
    failures.push(
      `FLOOR: the special-case discovery found 0 rungs in \`${ramp.fn}\`, yet rungs sit outside ` +
        `\`rp.dims\`. The \`step === '<rung>'\` idiom this scan reads has probably changed — widen the ` +
        `discovery. Do NOT add a list of special-cased rungs to this file (docs/34 shape 4).`,
    );
  }
  if (!exercised) {
    failures.push(`FLOOR: \`${ramp.fn}\` was compared against 0 themes, so a clean result is silence.`);
  }

  // #1189: a scan just declared unreadable (the floor above) is not evidence, so its arm-A findings are not
  // reported; the floor's remedy, then a re-run, surfaces any real one.
  for (const [step, brands] of outsideMap && !special.size ? [] : [...unresolved].sort()) {
    failures.push(
      `UNRESOLVED RUNG — ${STUDIO_LABEL}'s \`${ramp.steps}\` lists '${step}', and ${ramp.label} resolves ` +
        `it through \`rp.dims['${ramp.prefix}.${step}']\`, which carries no value for it (${brands.join(', ')}) ` +
        `— and \`${ramp.fn}\` does not special-case it. It will hit \`?? 0\` and render a plausible ` +
        `number with a plausible picture, which is #1177 exactly. Either bind it in the preview spec, ` +
        `or special-case it in \`${ramp.fn}\` the way \`none\` and \`capsule\` are.`,
    );
  }
  for (const [step, brands] of [...stale].sort()) {
    failures.push(
      `STALE SENTINEL — \`${ramp.fn}\` special-cases '${step}', but \`rp.dims\` DOES carry ` +
        `'${ramp.prefix}.${step}' (${brands.join(', ')}). Two readings and both need a person: the ` +
        `sentinel outlived its reason (a component now binds this rung, so the ramp is showing a ` +
        `placeholder where a real value exists), or this gate's special-case discovery over-collected ` +
        `a branch that is not a value bypass. This arm is what makes that discovery trustworthy.`,
    );
  }

  lines.push(
    `  ${ramp.fn.padEnd(24)} ${steps.length} rungs · special-cased {${[...special].join(', ') || '—'}} · ` +
      `${exercised} theme(s)`,
  );
}

// ---- ARM C: literal-key reads ------------------------------------------------------------------
const literals = literalReads(src);
{
  const dims = resolvePreview(corpus[0].theme as never, previewSpec as never).dims as Record<string, number>;
  for (const ref of literals) {
    if (!(ref in dims)) {
      failures.push(
        `LITERAL KEY — ${STUDIO_LABEL} reads \`rp.dims['${ref}']\`, which the resolved preview map does ` +
          `not carry (checked on '${corpus[0].id}'). One \`?? 0\` away from the same silent zero as a ` +
          `ramp rung, with no loop to make it visible.`,
      );
    }
  }
  lines.push(`  literal rp.dims keys      ${literals.length} read(s): ${literals.join(', ') || '—'}`);
}

console.log('ramp values — every rung resolves in the map its preview reads, or is special-cased there:');
for (const l of lines) console.log(l);

if (failures.length) {
  console.error(`\n✗ ${failures.length} ramp-value failure(s):\n`);
  for (const f of failures) console.error(`  • ${f}\n`);
  console.error(
    `The map (\`rp.dims\`) answers "what do preview COMPONENTS bind"; the step list answers "what rungs ` +
      `exist". They are different questions and #1177 was them disagreeing. Fix the side that is wrong ` +
      `— and never resolve a failure by adding a special-case list to this file (#1186, docs/34).`,
  );
  process.exit(1);
}

console.log(
  `\n  ✓ clean — every ramp rung either resolves in the preview map or is special-cased by the preview ` +
    `itself, and no special case shadows a value the map now carries. Note the limit: this proves the ` +
    `map HAS an entry, not that the entry is the right number.`,
);
