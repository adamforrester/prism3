/**
 * PAINT GATE (#758) — two independent checks over the component tier's colour bindings.
 *
 *   npx tsx packages/engine/lint-paint.ts            # check
 *   npx tsx packages/engine/lint-paint.ts --accept    # rewrite the census baseline
 *
 * ── WHY THIS EXISTS AT ALL: THE MEASUREMENT THAT FORCED IT ──────────────────────────────────────
 *
 * #758's stated acceptance was *"Button's 648-member paint is byte-identical afterwards: `regen.ts
 * --check` reports 104 artifacts in sync."* That criterion cannot fail, and it was measured rather
 * than reasoned about. `figmaAnatomySet` is called by NO emitter and no component payload is
 * committed under `out/`, so component paint is outside regen's universe entirely. Two mutations,
 * both run before this file was written:
 *
 *   · Button's box fill deleted outright         → `regen --check` ✓ 104 in sync
 *   · `paintOf`'s state-qualified lookup dropped → `regen --check` ✓ 104 in sync
 *     (1926 paint assignments fell to 1782 — a quarter of the state grid silently painting its
 *      rest colour — and the committed artifacts still byte-matched)
 *
 * The sharpest one is the third, because it is the mutation a careless rebind actually looks like:
 *
 *   · `destructive.outline.icon` repointed to `color.interactive.neutral.text.rest` — a token that
 *     RESOLVES, so nothing reports a miss → `regen --check` ✓ 104, and `test.ts` 2192 passed / 0
 *     failed. A destructive button's icon paints neutral ink and the whole suite is green.
 *
 * So the gate #758 asked for had to be built, not cited. Two arms, because the three mutations
 * above are two different defect classes and one arm cannot catch both.
 *
 * ── ARM 1: THE PROVENANCE RULE (a rule, asserted at zero) ───────────────────────────────────────
 *
 * A paint key led by an axis VALUE must point at a token ref containing that value:
 * `destructive.outline.icon` → `color.interactive.destructive.text.rest` ✓;
 * → `color.interactive.neutral.text.rest` ✗.
 *
 * It holds 90/90 across the corpus's intent-led paint, which is what makes it a rule rather than a
 * snapshot: it is a property of how semantic colour is organized (an intent's paint comes from that
 * intent's family), so it fails the day a rebind crosses an intent boundary — including for a def
 * that does not exist yet.
 *
 * INDEPENDENCE (`docs/34`). EXPECTED comes from the KEY — the axis value the def declares in
 * `variants` and spells into the key. ACTUAL comes from the REF — the token path. Neither is derived
 * from the other; they are two authored halves of one line that a correct binding keeps in agreement.
 * This is deliberately NOT built from `paintOf`'s lookup: a check that asked the projector to resolve
 * the key and compared the answer to itself would agree in every case, including the mutated one.
 *
 * THE EXCEPTIONS ARE NAMED AND REASONED, not a tolerance. `field-message` maps four tone values onto
 * semantic roles whose names differ from the tone (`default` → `secondary`, `error` → `danger`), and
 * that is correct: its axis values are validation states, and the ink roles they land on are the
 * token tier's own vocabulary. A count-based allowance ("up to 4 violations") would let a real
 * regression hide inside the budget, so each exception is listed by key and its absence is a failure
 * too — a mapping that gets fixed at the def must be removed from here, or the list becomes a
 * memory of something that is no longer true.
 *
 * ── ARM 2: THE CENSUS (a characterization, pinned to an authored baseline) ───────────────────────
 *
 * Arm 1 is blind to a uniform loss: dropping the state-qualified lookup does not cross an intent
 * boundary, so every surviving key still satisfies provenance — 1782 assignments, all of them
 * "correct", a quarter of the grid wrong. So the census pins the SHAPE: how many coordinates, how
 * many paint assignments, and a hash over every (coordinate, node path, slot, variable) row sorted.
 *
 * IT IS TAKEN OVER THE FULL DECLARED GRID, NOT OVER `figmaAnatomySet`, and that is the one design
 * choice here worth arguing with. The obvious census is "project the Figma set and hash it" — and it
 * is measurably the wrong one:
 *
 *   figmaAnatomySet(icon) → 4 members, 0 paint assignments
 *   the full declared grid → 36 coordinates, 32 paint assignments
 *
 * because `icon.figmaProperties.variantAxes` is `['size']` and its paint axis is `tone`. A set-based
 * census would therefore have pinned `icon: 0` — a number no mutation to `tone.{tone}` can move,
 * recorded in a file that reads as coverage. That is this repo's most-repeated defect in its purest
 * form: a gate whose subject cannot reach the thing it claims to watch. So the grid is enumerated
 * from `variants` and `states` directly — every coordinate the def SAYS exists, whether or not the
 * Figma projection happens to enumerate it.
 *
 * That the enumeration duplicates something `figmaAnatomySet` also does is deliberate and must not
 * be DRY'd away: **the second walk IS the gate.** Calling `figmaAnatomySet` here would make the
 * expected set of coordinates a function of the projector's own opinion about which axes matter, so
 * an axis dropped from `variantAxes` would shrink both sides at once and report a pass.
 *
 * Both numbers are recorded per def — `set` (what the plugin will actually build, so #758's
 * byte-identity constraint stays legible: button 648 members / 1926 assignments) and `grid` (every
 * declared coordinate, which is what exercises `paintOf` completely).
 *
 * `schema/paint-census.json` IS AUTHORED AND DELIBERATELY NOT A `regen.ts` ARTIFACT, for exactly the
 * reason `token-contract.json` and `payload-manifest.json` are not (CLAUDE.md principle 5): regen
 * rewrites every generated artifact, so a regenerated census would rewrite itself to agree with a
 * regression and report that as a pass. **A gate allowed to rewrite what it reads has no memory.**
 * `--accept` is therefore a separate, deliberate act, and it prints the diff it is about to accept so
 * the act is informed rather than reflexive.
 *
 * WHAT THE CENSUS IS NOT. It is a characterization, not a rule — it says "this is what the projector
 * produced when a human looked", never "this is right". A deliberate paint change SHOULD fail it, and
 * the response is to read the diff and `--accept`. That is the same posture as the consumability
 * gate's pinned memories, and the reason arm 1 exists beside it: a rule can say "wrong", and a
 * characterization can only say "different".
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { componentDefs } from './components/index';
import { figmaAnatomySet, figmaAnatomyPlan, planComponentName, type FigmaNodePlan } from './anatomy-figma';
import type { ComponentDef } from './component-schema';

const repo = join(import.meta.dirname, '../..');
const CENSUS_PATH = join(repo, 'packages/engine/schema/paint-census.json');

/**
 * Paint keys whose ref legitimately does NOT carry the axis value, each with the reason.
 *
 * Listed by exact key so the list cannot absorb a real regression, and checked in BOTH directions —
 * an entry here that no longer violates provenance fails too, because a stale exemption is a comment
 * asserting something untrue about the def it names.
 */
const PROVENANCE_EXCEPTIONS: Record<string, string> = {
  'field-message|default.text':
    "tone `default` maps to the MUTED body role, not to a role named 'default' — the token tier has no `text.default`, and `secondary` is what a non-status message's ink is",
  'field-message|default.icon':
    'same mapping as `default.text`, for the glyph beside it',
  'field-message|error.text':
    "tone `error` maps to the `danger` ink role — the def's axis value is the validation state a consumer names, `danger` is the token tier's name for that colour; the two vocabularies are deliberately not merged",
  'field-message|error.icon':
    'same mapping as `error.text`, for the status glyph',
};

type Tally = { members: number; assignments: number; sha256: string };
type Census = {
  note: string;
  /** `set` = what `figmaAnatomySet` builds (null when the def does not project one); `grid` = every declared coordinate. */
  defs: Record<string, { set: Tally | null; grid: Tally }>;
};

/** Every (node path, paint slot, variable) row a plan's tree carries, prefixed by the member name. */
const paintRows = (n: FigmaNodePlan, path: string, member: string, out: string[]): void => {
  const p = `${path}/${n.name}`;
  if (n.paints?.fills) out.push(`${member}|${p}|fills=${n.paints.fills}`);
  if (n.paints?.strokes) out.push(`${member}|${p}|strokes=${n.paints.strokes}`);
  if (n.descendantFills) out.push(`${member}|${p}|descendantFills=${n.descendantFills}`);
  for (const c of n.children) paintRows(c, p, member, out);
};

const tally = (rows: string[], members: number): Tally => {
  rows.sort();
  return { members, assignments: rows.length, sha256: createHash('sha256').update(rows.join('\n')).digest('hex') };
};

/** What the plugin will actually build. `null` for a def with no `figmaProperties` — it projects no set. */
const setCensus = (def: ComponentDef): Tally | null => {
  if (!def.figmaProperties) return null;
  const set = figmaAnatomySet(def, { swapTarget: 'FPO-default-icon' });
  const rows: string[] = [];
  for (const plan of set) paintRows(plan.root, '', planComponentName(plan), rows);
  return tally(rows, set.length);
};

/**
 * Every coordinate the def DECLARES — the cross product of `variants` (size × each other axis) with
 * rest plus each non-rest state.
 *
 * Enumerated from the def rather than by calling `figmaAnatomySet`, deliberately: see the header.
 * `icon` paints only along `tone`, which the Figma set does not enumerate at all, so a set-only
 * census pins it at zero assignments and can never fail.
 */
const gridCensus = (def: ComponentDef): Tally => {
  const sizes = def.variants?.size ?? [];
  const axes = Object.entries(def.variants ?? {}).filter(([a]) => a !== 'size');
  let combos: Record<string, string>[] = [{}];
  for (const [a, vs] of axes) combos = combos.flatMap((c) => vs.map((v) => ({ ...c, [a]: v })));
  const states: (string | undefined)[] = [undefined, ...(def.states ?? []).filter((s) => s !== 'rest')];
  const rows: string[] = [];
  let members = 0;
  for (const size of sizes) for (const c of combos) for (const st of states) {
    const plan = figmaAnatomyPlan(def, size, { ...c, ...(st ? { state: st } : {}), leading: true, trailing: true, swapTarget: 'FPO-default-icon' } as never);
    members++;
    const coord = `size=${size}${Object.entries(c).map(([k, v]) => `,${k}=${v}`).join('')},state=${st ?? 'rest'}`;
    paintRows(plan.root, '', coord, rows);
  }
  return tally(rows, members);
};

/**
 * The defs a census can be taken of at all: they have an anatomy to project and a `size` axis, which
 * `figmaAnatomyPlan` requires. Three of the seven defs (`focus-ring`, `field-message`, `field-label`,
 * `text-field`) fall outside for reasons Arc 2 steps 3 and 5 address — they are covered by arm 1,
 * which reads their `tokens` directly and needs no projection.
 */
const censusable = (): ComponentDef[] => componentDefs.filter((d) => !!d.anatomy && (d.variants?.size ?? []).length > 0);

/**
 * Arm 1. For every paint key whose LEADING segment is a declared axis value, the ref must contain
 * that value as a path segment.
 *
 * Segment-wise rather than substring, because a substring test is satisfied by an unrelated
 * coincidence — `color.interactive.primary-subtle.fill` contains `primary` without being that
 * intent's family. The #563 finding, in its smallest form.
 */
const provenanceFailures = (): { key: string; detail: string }[] => {
  const out: { key: string; detail: string }[] = [];
  const satisfied = new Set<string>();
  for (const def of componentDefs) {
    for (const [key, ref] of Object.entries(def.tokens ?? {})) {
      if (!ref.startsWith('color.')) continue;
      const lead = key.split('.')[0];
      const axis = Object.entries(def.variants ?? {}).find(([, vs]) => vs.includes(lead))?.[0];
      if (!axis) continue; // not axis-value-led — arm 1 says nothing about it
      const id = `${def.id}|${key}`;
      if (ref.split('.').includes(lead)) { satisfied.add(id); continue; }
      if (id in PROVENANCE_EXCEPTIONS) continue;
      out.push({ key: id, detail: `${axis}='${lead}' is absent from '${ref}' — a ${lead} coordinate would paint another ${axis}'s colour` });
    }
  }
  // The other direction: an exemption for a key that now satisfies the rule (or no longer exists) is
  // a stale memory, and this gate's whole purpose is to not keep those.
  for (const id of Object.keys(PROVENANCE_EXCEPTIONS)) {
    const [defId, key] = id.split('|');
    const def = componentDefs.find((d) => d.id === defId);
    if (!def || !(key in (def.tokens ?? {})))
      out.push({ key: id, detail: 'exempted key does not exist — remove the exception, it asserts something untrue about this def' });
    else if (satisfied.has(id))
      out.push({ key: id, detail: 'exempted key now SATISFIES provenance — remove the exception so the rule covers it' });
  }
  return out;
};

const main = (): void => {
  const accept = process.argv.includes('--accept');
  const fails: string[] = [];
  const ok = (cond: boolean, msg: string): void => { if (!cond) fails.push(msg); };

  console.log('Prism3 paint gate (#758)\n');

  // ── ARM 1 ─────────────────────────────────────────────────────────────────────────────────────
  const prov = provenanceFailures();
  for (const f of prov) fails.push(`provenance: ${f.key} — ${f.detail}`);
  console.log(`  provenance rule … ${prov.length === 0 ? 'ok' : `${prov.length} violation(s)`} (${Object.keys(PROVENANCE_EXCEPTIONS).length} named exception(s))`);

  // ── ARM 2 ─────────────────────────────────────────────────────────────────────────────────────
  const actual: Census['defs'] = {};
  for (const def of censusable()) actual[def.id] = { set: setCensus(def), grid: gridCensus(def) };

  if (accept) {
    const next: Census = {
      note:
        'AUTHORED BASELINE, not a regen artifact (see lint-paint.ts). Rewritten only by an explicit ' +
        '`npx tsx packages/engine/lint-paint.ts --accept`, because a gate allowed to rewrite what it ' +
        'reads has no memory. A failure here means the projected paint changed — read the diff and ' +
        'decide whether the change was intended before accepting it. `set` is what the Figma ' +
        'projection builds; `grid` is every coordinate the def declares, which is wider (icon paints ' +
        'along `tone`, an axis the set does not enumerate).',
      defs: actual,
    };
    writeFileSync(CENSUS_PATH, `${JSON.stringify(next, null, 2)}\n`);
    for (const [id, c] of Object.entries(actual))
      console.log(`  ${id.padEnd(14)} grid ${c.grid.members} coords / ${c.grid.assignments} assignments${c.set ? `; set ${c.set.members} members / ${c.set.assignments}` : '; no Figma set'}`);
    console.log('\n✓ census baseline accepted');
    return;
  }

  let baseline: Census;
  try {
    baseline = JSON.parse(readFileSync(CENSUS_PATH, 'utf8')) as Census;
  } catch {
    console.error(`✗ no census baseline at ${CENSUS_PATH} — run with --accept to write one`);
    process.exit(1);
  }

  // Both directions, so a def losing its projection is a failure rather than a silently smaller run.
  for (const id of Object.keys(baseline.defs))
    ok(id in actual, `census: '${id}' is in the baseline but is no longer censusable — a def that stopped projecting is a regression, not a smaller census`);
  for (const id of Object.keys(actual))
    ok(id in baseline.defs, `census: '${id}' is censusable but absent from the baseline — run --accept to record it`);

  const compare = (id: string, arm: 'set' | 'grid', got: Tally | null, want: Tally | null): boolean => {
    if (!want && !got) return true;
    if (!want || !got) {
      fails.push(`census/${id}.${arm}: ${got ? 'now projects one, baseline had none' : 'no longer projects one, baseline had one'}`);
      return false;
    }
    const before = fails.length;
    ok(got.members === want.members, `census/${id}.${arm}: ${got.members} ${arm === 'set' ? 'members' : 'coordinates'}, baseline ${want.members}`);
    ok(got.assignments === want.assignments,
      `census/${id}.${arm}: ${got.assignments} paint assignments, baseline ${want.assignments} — paint was ${got.assignments < want.assignments ? 'DROPPED' : 'added'}`);
    ok(got.sha256 === want.sha256,
      `census/${id}.${arm}: paint hash ${got.sha256.slice(0, 12)}…, baseline ${want.sha256.slice(0, 12)}… — the same count of assignments, pointing somewhere else`);
    return fails.length === before;
  };

  for (const [id, want] of Object.entries(baseline.defs)) {
    const got = actual[id];
    if (!got) continue;
    const okSet = compare(id, 'set', got.set, want.set);
    const okGrid = compare(id, 'grid', got.grid, want.grid);
    console.log(`  census/${id.padEnd(14)} grid ${got.grid.members}/${got.grid.assignments}${got.set ? `, set ${got.set.members}/${got.set.assignments}` : ''} … ${okSet && okGrid ? 'ok' : 'DRIFTED'}`);
  }

  if (fails.length) {
    console.error(`\n✗ ${fails.length} failure(s):`);
    for (const f of fails) console.error(`  · ${f}`);
    console.error('\n  A provenance failure is a WRONG binding — fix the def.');
    console.error('  A census failure is a CHANGED projection — read the diff, then: npx tsx packages/engine/lint-paint.ts --accept');
    process.exit(1);
  }
  console.log('\n✓ paint is where the defs say it is');
};

main();
