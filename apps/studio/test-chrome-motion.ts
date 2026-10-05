/**
 * The chrome's eased scroll follows `motion.transition.default` wherever its alias points (#2098 item 4), in Node.
 *
 *   npx tsx apps/studio/test-chrome-motion.ts
 *
 * `--p3-transition-dur` and `--p3-transition-ease` are the edit-reveal's and the jump links' scroll. Since #2041
 * `chrome/spec.mjs` reads both from the one composite the engine emits for them, `motion.transition.default`
 * (its `duration` and `timingFunction` members). Over the committed emission that is indistinguishable from
 * reading `motion.duration.normal` and `motion.easing-role.default` directly, because the composite points at
 * exactly those, so test-chrome.mjs's QA-B9 arm cannot tell the two reads apart. This arm can: it repoints the
 * composite's members in a fixture and checks the variables move with it.
 *
 * INDEPENDENT OF WHAT IT CHECKS (docs/34). The subject is the product's own path from token tree to CSS value:
 * the rows `shellRows` (`chrome/esbuild-plugin.mjs`) hands the build, formatted by `cssOf` (`chrome/tokens.mjs`).
 * The expected values are literals typed here, held by leaves this fixture adds and that the emission never
 * carries (a duration of 345ms and a curve of 0.11, 0.22, 0.33, 0.44, under `p3-fixture` names), so no
 * engine value can match them by accident. Each member is repointed through one alias hop of its own, as the
 * emission's members are, so the chain is followed rather than merely read.
 *
 * Mutation this fails by name: either row in `spec.mjs` read directly (`motion.duration.normal`, or
 * `motion.easing-role.default`) → `… --p3-transition-dur follows the repointed duration` (or `-ease`), in both
 * themes, with what it read instead. `resolve` (`chrome/tokens.mjs`) not following a member's alias → both arms,
 * the duration reading the alias string itself and the curve the error it threw.
 */
import { loadModes, cssOf } from './chrome/tokens.mjs';
import { shellRows } from './chrome/esbuild-plugin.mjs';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const DUR = '345ms';
const CURVE = [0.11, 0.22, 0.33, 0.44];
const EASE = 'cubic-bezier(0.11, 0.22, 0.33, 0.44)';

type Row = [string, string, string, ...unknown[]];
type Tree = { pds3: { motion: Record<string, Record<string, { $type?: string; $value: unknown }>> } };

/** The CSS a row builds over a tree, or the error it threw, so a broken read fails its own arm by name. */
const css = (tree: Tree, r: Row): string => { try { return cssOf(tree, r).css; } catch (e) { return `threw: ${(e as Error).message}`; } };

const modes = loadModes() as Record<'light' | 'dark', Tree>;
for (const mode of ['light', 'dark'] as const) {
  const rows = shellRows(mode) as (Row | string)[];
  const row = (name: string): Row | undefined => rows.find((r): r is Row => Array.isArray(r) && r[0] === name);
  const dur = row('transition-dur');
  const ease = row('transition-ease');
  ok(!!dur && !!ease, `${mode}: the build maps --p3-transition-dur and --p3-transition-ease`);
  if (!dur || !ease) continue;

  const fixture = structuredClone(modes[mode]);
  const m = fixture.pds3.motion;
  const def = m.transition?.default?.$value as Record<string, unknown> | undefined;
  ok(!!def && typeof def.duration === 'string' && typeof def.timingFunction === 'string',
    `${mode}: the emission carries motion.transition.default with aliased duration and timingFunction members (${JSON.stringify(def)})`);
  if (!def) continue;
  m.duration['p3-fixture-ms'] = { $type: 'duration', $value: DUR };
  m.duration['p3-fixture'] = { $type: 'duration', $value: '{pds3.motion.duration.p3-fixture-ms}' };
  m.easing['p3-fixture'] = { $type: 'cubicBezier', $value: CURVE };
  m['easing-role']['p3-fixture'] = { $type: 'cubicBezier', $value: '{pds3.motion.easing.p3-fixture}' };
  def.duration = '{pds3.motion.duration.p3-fixture}';
  def.timingFunction = '{pds3.motion.easing-role.p3-fixture}';

  const gotDur = css(fixture, dur);
  const gotEase = css(fixture, ease);
  ok(gotDur === DUR, `${mode}: --p3-transition-dur follows the repointed duration (want ${DUR}, got ${gotDur})`);
  ok(gotEase === EASE, `${mode}: --p3-transition-ease follows the repointed timingFunction (want ${EASE}, got ${gotEase})`);

  // Control: unrepointed, the same rows read the emission, not the fixture's leaves.
  const plainDur = css(modes[mode], dur);
  const plainEase = css(modes[mode], ease);
  ok(plainDur !== DUR && plainEase !== EASE, `${mode}: control: over the emission the rows read the engine's own values (${plainDur}, ${plainEase})`);
}

console.log(`\n${executed - failed}/${executed} chrome motion assertions passed.`);
if (failed) process.exit(1);
