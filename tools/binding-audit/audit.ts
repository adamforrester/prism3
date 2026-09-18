/**
 * BINDING AUDIT (#1499) — the expected part→variable ledger, plus unbound / mis-bound detection.
 *
 *   npx tsx tools/binding-audit/audit.ts            # the human report (ledger summary + findings), exit 0
 *   npx tsx tools/binding-audit/audit.ts --json     # the same findings as machine JSON
 *   npx tsx tools/binding-audit/audit.ts --ledger    # the full per-member expected ledger as JSON
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────
 *
 * The owner found unbound and incorrectly-bound tokens during QA — the icon-button glyph bound to a
 * `text.*` role instead of `icon.*` (fixed as #1471) is the motivating case — and wants that
 * systematized rather than eyeballed: "an audit to find any unbound or incorrectly bound tokens …
 * it's too much for me to be checking all token binds."
 *
 * A console pass over a live Figma file can see *bound vs unbound* but NOT *bound to the wrong
 * token* — the whole value of this tool is the second half. So it builds the EXPECTED binding map
 * from the component defs / the engine's projection, and diffs the ACTUAL emitted binding against
 * it. Three outputs, exactly as #1499 asks:
 *
 *   1. THE EXPECTED LEDGER — from the projection plan (`figmaAnatomyPlan` → each member's nodes),
 *      the `(component, member, node, slot) → bound-variable` map. This is the source of truth for
 *      "what should bind to what", and the reference a LIVE Figma file is diffed against (the
 *      read-only companion script in this folder's README reads each node's actual `boundVariables`
 *      and diffs it against `--ledger`'s output). The plan carries variable NAMES, not resolved
 *      values, so the ledger is brand-invariant — one ledger audits a live file of any corpus brand.
 *
 *   2. UNBOUND detection — a color binding a def DECLARES that the projector returns at NO
 *      coordinate. In the emitted plan every painted slot is a bound variable (the plan cannot bake
 *      a literal), so the in-repo signal for the baked-where-it-should-bind class is a declared bind
 *      that emits nothing: in a live file the node it was meant for is then unbound (a baked
 *      default). This overlaps `lint-paint.ts`'s arm-3 reachability gate on purpose — the value here
 *      is one consolidated report beside the ledger and the mis-bind pass, not a second gate.
 *
 *   3. MIS-BOUND detection (the #1471 class) — a slot bound to a role whose FAMILY mismatches the
 *      slot's KIND: a glyph inking a `text.*` role, a border painting a `fill` role, a surface
 *      painting an ink role. A heuristic map of slot-kind → allowed role-family (`ALLOWED` below);
 *      anything outside it is reported for human review. Not a gate: see the note on `ALLOWED`.
 *
 * ── IT IS A TOOL, NOT A GATE (tools/CLAUDE.md) ──────────────────────────────────────────────────
 *
 * A tool answers a question and exits 0; a gate asserts an answer and fails. This is the former, and
 * the mis-bind pass is the reason it must be: it is a HEURISTIC. Its map encodes what a slot-kind
 * SHOULD bind from design semantics, and the corpus carries deliberate, already-pinned cross-slot
 * bindings that the heuristic would otherwise flag — the disabled outline edge binding
 * `color.disabled.icon` rather than `color.disabled.border` (#1349, pinned BY NAME in `test.ts`), the
 * switch thumb painting `on-fill`, the switch on/off glyphs tinted with the track's `fill` role.
 * Those are design decisions, not defects, so the map admits them with a stated reason (`ALLOWED`),
 * and a run over today's corpus reports ZERO mis-binds. That is what a healthy audit looks like —
 * the instrument's value is that it lights up on a regression (revert #1471 and every button/
 * icon-button glyph is reported) or on a drifted live Figma file, not that it is red today. If a
 * SPECIFIC mis-binding later hardens into a contract, a gate enforces THAT one separately (#1499),
 * independently of this survey.
 *
 * ── INDEPENDENCE (docs/34), even though this is not a gate ──────────────────────────────────────
 *
 * The two halves of every comparison are authored apart. For mis-bind: the EXPECTED constraint is
 * `ALLOWED`, a slot-kind → role-family map written here from first principles; the ACTUAL is the role
 * the projector emitted, read off the plan tree. Neither is derived from the other, so the map cannot
 * launder the defs' own opinion of themselves into a pass. For unbound: the subject is a def's
 * `tokens`, and reachability is read out of the EMITTED plan with a per-key sentinel (a returned
 * variable then names exactly one key even where two keys share a real ref — the collision that let
 * #784's own defect pass a ref-matching check). The mis-bind map is deliberately NOT built by asking
 * the projector to resolve each key and comparing the answer to itself.
 */
import { componentDefs } from '../../packages/engine/components/index';
import {
  figmaAnatomySet,
  figmaAnatomyPlan,
  planComponentName,
  type FigmaNodePlan,
} from '../../packages/engine/anatomy-figma';
import type { ComponentDef } from '../../packages/engine/component-schema';

// ── THE PHYSICAL SLOT A NODE PAINTS ───────────────────────────────────────────────────────────────
// Read off the plan node's TYPE and which paint field carries the variable — never off a key string,
// so the slot kind is what the projector actually built rather than what a name suggests.
type SlotKind = 'surface-fill' | 'border' | 'text-ink' | 'glyph-ink';

/** A projected Figma variable NAME (`color/interactive/primary/icon/rest`) → its dotted role
 *  (`interactive.primary.icon.rest`). Non-color variables (`radius/md`) return null and are ignored:
 *  this audit is about color binding. */
const roleOf = (variable: string): string | null => {
  const dotted = variable.replace(/\//g, '.');
  return dotted.startsWith('color.') ? dotted.slice('color.'.length) : null;
};

/**
 * The ROLE FAMILY WORD — the structural slot a role paints, independent of intent, state and the
 * `inverse.` surface transform. `interactive.primary.fill.selected` → `fill`;
 * `interactive.primary.on-fill` → `on-fill`; `icon.brand` → `icon`; `border.focus` → `border`;
 * `field.placeholder` → `placeholder`; `veil.dark.medium` → `veil`.
 *
 * Segment-wise membership, not substring — `on-fill` is one segment and is tested before `fill` so a
 * glyph's `on-fill` ink is not read as a surface `fill`. `inverse.` is stripped first: an inverse role
 * is the same family painted for a flipped ground.
 */
const familyWord = (role: string): string => {
  const segs = role.replace(/^inverse\./, '').split('.');
  const has = (s: string): boolean => segs.includes(s);
  if (has('on-fill')) return 'on-fill';
  if (has('overlay')) return 'overlay';
  if (has('fill')) return 'fill';
  if (has('border')) return 'border';
  if (has('placeholder')) return 'placeholder';
  if (has('icon')) return 'icon';
  if (has('text')) return 'text';
  if (has('background')) return 'background';
  if (has('veil')) return 'veil';
  return `other:${segs[0]}`;
};

/**
 * SLOT KIND → the role families it may legitimately bind, each family carrying WHY it is allowed.
 *
 * Authored from design semantics, not reverse-engineered from the corpus — that is what makes the
 * mis-bind pass a heuristic RULE rather than a snapshot. A family a slot should never bind is simply
 * absent, and a binding to an absent family is what the pass reports. The cross-slot admissions below
 * are the deliberate, already-pinned corpus bindings named in the header; each states its reason so
 * the next reader can tell an admission from a hole.
 */
const ALLOWED: Record<SlotKind, Record<string, string>> = {
  'surface-fill': {
    fill: 'the ordinary surface fill (interactive/field/disabled fills)',
    overlay: 'the translucent hover/pressed wash — a fill on the same node for outline/ghost appearances',
    background: 'a page/surface background role (image-placeholder, veil grounds)',
    veil: 'a scrim fill',
    'on-fill':
      "the switch thumb — a filled knob whose color IS the on-fill ink, sitting on the track surface (switch-control /track/thumb). Pinned design, not an ink-on-surface defect.",
  },
  border: {
    border: 'an edge role (interactive/field/disabled/focus/danger borders)',
    icon:
      "the disabled outline edge binds `color.disabled.icon` rather than `color.disabled.border` so the edge tracks the disabled ink and clears 3:1 on an inverse ground (#1349) — pinned BY NAME in test.ts. `disabled.text`/`disabled.icon` resolve identically; icon is the non-text graphical-object peer.",
  },
  'text-ink': {
    text: 'the ordinary text ink (interactive/disabled text, text.primary/secondary/danger/…)',
    'on-fill': 'label ink over a filled control, and the disabled-on-fill twin',
    placeholder: "the empty-field placeholder ink (`field.placeholder`)",
  },
  'glyph-ink': {
    icon:
      'the glyph ink role — the interactive `icon.*` family (#1471) and the non-interactive `icon.*` content family, plus `disabled.icon`',
    'on-fill': 'a glyph over a filled control (filled button/icon-button), and the disabled-on-fill twin',
    fill:
      "the switch on/off glyphs, tinted with the track's own `fill` role so they read as subtle marks ON the track rather than as separate ink (switch-control /track/thumb/{on,off}Glyph) — pinned design.",
  },
};

// ── THE LEDGER ──────────────────────────────────────────────────────────────────────────────────
type SlotBinding = { node: string; field: 'fills' | 'strokes' | 'descendantFills'; slotKind: SlotKind; variable: string; role: string };
type MemberLedger = { member: string; bindings: SlotBinding[] };

/** Classify a plan node's paints into slot bindings. A node type + paint field decide the slot kind:
 *  a FRAME's `fills` is a surface, its `strokes` a border; a TEXT's `fills` is text ink; any
 *  `descendantFills` is glyph ink (the vector inside a swapped/nested instance or a glyph artboard). */
const nodeBindings = (n: FigmaNodePlan, path: string, out: SlotBinding[]): void => {
  const here = `${path}/${n.name}`;
  const push = (field: SlotBinding['field'], slotKind: SlotKind, variable?: string): void => {
    if (!variable) return;
    const role = roleOf(variable);
    if (!role) return; // non-color binding (dimension, radius) — not this audit's subject
    out.push({ node: here, field, slotKind, variable, role });
  };
  if (n.type === 'TEXT') push('fills', 'text-ink', n.paints?.fills);
  else push('fills', 'surface-fill', n.paints?.fills);
  push('strokes', 'border', n.paints?.strokes);
  push('descendantFills', 'glyph-ink', n.descendantFills);
  for (const c of n.children) nodeBindings(c, here, out);
};

/** The full per-member ledger for a def, over the Figma set that actually ships (member names match
 *  the live file). `null` for a def that projects no set. */
const memberLedger = (def: ComponentDef): MemberLedger[] | null => {
  if (!def.figmaProperties) return null;
  const set = figmaAnatomySet(def, { swapTarget: 'FPO-default-icon' });
  return set.map((plan) => {
    const bindings: SlotBinding[] = [];
    nodeBindings(plan.root, '', bindings);
    return { member: planComponentName(plan), bindings };
  });
};

// ── GRID ENUMERATION — every coordinate the def DECLARES ──────────────────────────────────────────
// Wider than the Figma set (it enumerates axes the set does not, e.g. icon's `tone`), so the analysis
// reaches every paint the def can produce. Same shape as lint-paint's grid walk.
const gridPlans = (def: ComponentDef): FigmaNodePlan[] => {
  const sizes = (def.variants?.size ?? []).length ? def.variants!.size! : [undefined];
  const axes = Object.entries(def.variants ?? {}).filter(([a]) => a !== 'size');
  let combos: Record<string, string>[] = [{}];
  for (const [a, vs] of axes) combos = combos.flatMap((c) => vs.map((v) => ({ ...c, [a]: v })));
  const states: (string | undefined)[] = [undefined, ...(def.states ?? [])];
  const roots: FigmaNodePlan[] = [];
  for (const size of sizes) for (const c of combos) for (const st of states)
    for (const leading of [false, true]) for (const trailing of [false, true])
      roots.push(figmaAnatomyPlan(def, size as never, { ...c, ...(st ? { state: st } : {}), leading, trailing, swapTarget: 'FPO-default-icon' } as never).root);
  return roots;
};

// ── FINDINGS ──────────────────────────────────────────────────────────────────────────────────────
type Finding =
  | { component: string; severity: 'mis-bound'; slotKind: SlotKind; site: string; variable: string; role: string; family: string; coords: number; detail: string }
  | { component: string; severity: 'unbound'; site: string; ref: string; detail: string };

/**
 * The physical slot a PAINT KEY names, for a def that cannot be projected (no anatomy). Read off the
 * key's own segments — the fallback for a def the plan-based classifier can't reach, so nothing is
 * silently uncovered. A nomination key (`focus-ring`, a ring color a nested component draws) names no
 * slot on this def and returns null.
 */
const slotKindFromKey = (key: string): SlotKind | null => {
  const segs = key.split('.');
  const has = (s: string): boolean => segs.includes(s);
  if (has('focus-ring') || has('ring')) return null;
  if (has('icon')) return 'glyph-ink';
  if (has('label') || has('text') || has('caption') || has('indicator') || has('placeholder')) return 'text-ink';
  if (has('border')) return 'border';
  if (has('fill') || has('overlay')) return 'surface-fill';
  return null;
};

/**
 * MIS-BOUND — every emitted color binding whose role family is not in `ALLOWED[slotKind]`.
 * Collapsed to one finding per (component, node, slotKind, role), with the coordinate count. A def
 * with no anatomy cannot be projected, so its keys are classified from the key text instead (one
 * finding per key rather than per coordinate).
 */
const misBoundFindings = (def: ComponentDef): Finding[] => {
  if (!def.anatomy) {
    const out: Finding[] = [];
    for (const [key, ref] of Object.entries(def.tokens ?? {})) {
      if (typeof ref !== 'string' || !ref.startsWith('color.')) continue;
      const slotKind = slotKindFromKey(key);
      if (!slotKind) continue;
      const role = ref.slice('color.'.length);
      const family = familyWord(role);
      if (family in ALLOWED[slotKind]) continue;
      out.push({
        component: def.id,
        severity: 'mis-bound',
        slotKind,
        site: `${key} (key-classified — no anatomy to project)`,
        variable: ref,
        role,
        family,
        coords: 1,
        detail: `${slotKind} bound to role '${role}' (family '${family}'), which is not among the families a ${slotKind} should carry: ${Object.keys(ALLOWED[slotKind]).join(', ')}`,
      });
    }
    return out;
  }

  const seen = new Map<string, { slotKind: SlotKind; site: string; variable: string; role: string; family: string; coords: number }>();
  for (const root of gridPlans(def)) {
    const bindings: SlotBinding[] = [];
    nodeBindings(root, '', bindings);
    for (const b of bindings) {
      const family = familyWord(b.role);
      if (family in ALLOWED[b.slotKind]) continue;
      const k = `${b.node}|${b.slotKind}|${b.role}`;
      const prev = seen.get(k);
      if (prev) prev.coords++;
      else seen.set(k, { slotKind: b.slotKind, site: b.node, variable: b.variable, role: b.role, family, coords: 1 });
    }
  }
  return [...seen.values()].map((m) => ({
    component: def.id,
    severity: 'mis-bound' as const,
    slotKind: m.slotKind,
    site: m.site,
    variable: m.variable,
    role: m.role,
    family: m.family,
    coords: m.coords,
    detail: `${m.slotKind} bound to role '${m.role}' (family '${m.family}'), which is not among the families a ${m.slotKind} should carry: ${Object.keys(ALLOWED[m.slotKind]).join(', ')}`,
  }));
};

/**
 * UNBOUND — a color binding the def declares that the projector returns at no coordinate. Each key is
 * probed with a unique sentinel ref so a returned variable names exactly ONE key even where two keys
 * share a real ref; a key whose sentinel never comes back emits nothing, so in a live file the node
 * it was meant for is unbound (baked). Anatomy-less defs cannot be planned and are reported as
 * un-analyzable rather than counted clean.
 */
const unboundFindings = (def: ComponentDef): { findings: Finding[]; unplannable: boolean; declared: number } => {
  const colorKeys = Object.entries(def.tokens ?? {}).filter(([, ref]) => typeof ref === 'string' && ref.startsWith('color.'));
  if (!def.anatomy) return { findings: [], unplannable: true, declared: colorKeys.length };

  const sentinel = new Map<string, string>();
  const tokens: Record<string, string> = { ...(def.tokens as Record<string, string>) };
  colorKeys.forEach(([key], i) => { sentinel.set(`color.probe-${i}`, key); tokens[key] = `color.probe-${i}`; });
  const probed = { ...def, tokens } as ComponentDef;

  const hit = new Set<string>();
  const walk = (n: FigmaNodePlan): void => {
    for (const v of [n.paints?.fills, n.paints?.strokes, n.descendantFills]) if (v) hit.add(v.replace(/\//g, '.'));
    for (const c of n.children) walk(c);
  };
  for (const root of gridPlans(probed)) walk(root);

  const reached = new Set([...hit].map((v) => sentinel.get(v)).filter((k): k is string => !!k));
  const findings: Finding[] = colorKeys
    .filter(([key]) => !reached.has(key))
    // A NOMINATION names a color a SEPARATE nested component draws (`focus-ring`), not a slot this def
    // paints — it is unreached BY SHAPE and is not a dead bind. Excluded structurally, not by copying
    // lint-paint's exemption list: `slotKindFromKey` returns null for a ring key precisely because it
    // names no slot on this def.
    .filter(([key]) => slotKindFromKey(key) !== null)
    .map(([key, ref]) => ({
      component: def.id,
      severity: 'unbound' as const,
      site: key,
      ref,
      detail: `'${key}' → '${ref}' is declared but the projector emits it at no coordinate — in a live file the node it targets would be unbound (a baked default). Verify it is an intentional code-only binding (a node that exists in code but has no Figma member) rather than a dead bind. See lint-paint.ts arm 3 for the enforced subset.`,
    }));
  return { findings, unplannable: false, declared: colorKeys.length };
};

// ── REPORT ────────────────────────────────────────────────────────────────────────────────────────
const main = (): void => {
  const asJson = process.argv.includes('--json');
  const asLedger = process.argv.includes('--ledger');

  // FULL LEDGER (--ledger): per-member expected binding map, the reference a live file is diffed
  // against. Written to stdout as JSON so it can be piped or saved next to a captured live snapshot.
  if (asLedger) {
    const ledger: Record<string, MemberLedger[]> = {};
    for (const def of componentDefs) {
      const ml = memberLedger(def);
      if (ml) ledger[def.id] = ml;
    }
    process.stdout.write(`${JSON.stringify({
      note: 'EXPECTED part→variable ledger (brand-invariant). Diff a live Figma file\'s node boundVariables against `bindings[*].variable`; see tools/binding-audit/README.md for the read-only companion script.',
      generatedBy: 'tools/binding-audit/audit.ts --ledger',
      components: ledger,
    }, null, 2)}\n`);
    return;
  }

  const misBound: Finding[] = [];
  const unbound: Finding[] = [];
  const unplannable: string[] = [];
  const ledgerStats: { component: string; members: number; bindings: number; declared: number }[] = [];

  for (const def of componentDefs) {
    misBound.push(...misBoundFindings(def));
    const u = unboundFindings(def);
    unbound.push(...u.findings);
    if (u.unplannable) unplannable.push(`${def.id} (${u.declared} color binding(s) — no anatomy, cannot be projected; its keys are still mis-bind-checked)`);
    const ml = memberLedger(def);
    if (ml) ledgerStats.push({ component: def.id, members: ml.length, bindings: ml.reduce((s, m) => s + m.bindings.length, 0), declared: u.declared });
  }

  const findings = [...misBound, ...unbound];

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ misBound, unbound, unplannable, ledgerStats }, null, 2)}\n`);
    return;
  }

  console.log('Prism3 binding audit (#1499)\n');

  // ── SECTION 1: THE LEDGER ───────────────────────────────────────────────────────────────────────
  console.log('── Ledger (expected part→variable binds) ' + '─'.repeat(38));
  let totalMembers = 0;
  let totalBinds = 0;
  for (const s of ledgerStats.sort((a, b) => a.component.localeCompare(b.component))) {
    totalMembers += s.members;
    totalBinds += s.bindings;
    console.log(`  ${s.component.padEnd(24)} ${String(s.members).padStart(4)} members · ${String(s.bindings).padStart(5)} slot binds · ${s.declared} declared color keys`);
  }
  console.log(`  ${'TOTAL'.padEnd(24)} ${String(totalMembers).padStart(4)} members · ${String(totalBinds).padStart(5)} slot binds`);
  console.log('  Full per-member ledger for a live-file diff: `npx tsx tools/binding-audit/audit.ts --ledger` (see README).');

  // ── SECTION 2 + 3: FINDINGS, grouped by component, severity-ordered (mis-bound > unbound) ────────
  console.log('\n── Findings (grouped by component; mis-bound before unbound) ' + '─'.repeat(19));
  const components = [...new Set(findings.map((f) => f.component))].sort();
  if (components.length === 0) {
    console.log('  none — every emitted color binding sits in a slot-family its kind should carry, and every');
    console.log('  declared bind reaches a node. See the Coverage line below for what the pass admits and skips.');
  }
  const rank = (f: Finding): number => (f.severity === 'mis-bound' ? 0 : 1);
  for (const comp of components) {
    const fs = findings.filter((f) => f.component === comp).sort((a, b) => rank(a) - rank(b));
    console.log(`\n  ${comp}`);
    for (const f of fs) {
      if (f.severity === 'mis-bound') {
        console.log(`    ✗ MIS-BOUND  ${f.site}  [${f.slotKind}] → ${f.variable}  (×${f.coords} coord)`);
        console.log(`                 ${f.detail}`);
      } else {
        console.log(`    · UNBOUND    ${f.site} → ${f.ref}`);
        console.log(`                 ${f.detail}`);
      }
    }
  }

  // What the audit did NOT reach, printed rather than left silent (docs/34 shape 9).
  console.log('\n── Coverage ' + '─'.repeat(67));
  console.log(`  ${misBound.length} mis-bound · ${unbound.length} unbound · ${findings.length} finding(s) total.`);
  console.log(`  mis-bind checked against ALLOWED (slot-kind → role-family). Admitted cross-slot binds (reported`);
  console.log(`  as clean, by design): switch thumb on-fill, switch glyph fill, disabled outline edge → disabled.icon (#1349).`);
  for (const u of unplannable) console.log(`  not projectable: ${u}`);
  console.log('\n  This is a measurement harness — it reports and exits 0 (tools/CLAUDE.md). A specific mis-binding');
  console.log('  that hardens into a contract is enforced by its own gate, separately.');
  process.exitCode = 0;
};

main();
