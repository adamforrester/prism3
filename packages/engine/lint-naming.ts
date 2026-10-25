/**
 * lint-naming — component definitions follow the naming table in the build-component skill (#2759, owner
 * decisions on #2706: Q345 A, Q349, Q350, Q355; Q394 A on #2783).
 *
 *   npx tsx packages/engine/lint-naming.ts
 *
 * The audit on #2706 found the same job named several ways across the defs (a main text called `label`,
 * `text` or `title`; a glyph layer called `mark`, `check` or `dismissGlyph`; one root named for its
 * component). The owner decided the names, wrote them into `skills/prism3-build-component/SKILL.md` §6,
 * and asked for a gate on whatever a script can check. These are the arms, each a rule stated HERE as a
 * literal, never read off a def:
 *
 *  ── casing ──  (Q345 A) every Figma property name a def projects is lowercase: each `figmaName` (or the
 *     key, when there is none) in `slotAxes`, `swaps`, `texts` and `booleans`, each variant axis under
 *     its display name (`variantAxisNames`, else the axis key), and the state axis's `stateAxis.name`.
 *     EXPECTED is `name.toLowerCase()`.
 *
 *  ── prefix ──  (Q349, Q355) a def that should not be used outside its parent takes the `_` prefix, and
 *     only such a def does. "Should not be used outside its parent" is read off the def's `ai.whenToUse`,
 *     which states it in one of the two wordings in `PRIVATE_WORDING`. Both directions are checked: the
 *     wording without the prefix, and the prefix without the wording. The checkbox and radio controls are
 *     exempt by decision because they may be used on their own (`STANDALONE`); the arm asserts they stay
 *     unprefixed. `DECIDED_PRIVATE` is the owner's list of prefixed defs, and is the floor: each must be
 *     registered (or be the target of a pending rename) AND be detected by the wording, so a whenToUse
 *     reworded to slip the rule fails here rather than passing over nothing.
 *
 *  ── slot item ──  (Q394 A) a def that is any native slot's preferred item (a content slot's `preferred` or
 *     `preferredWhenBuilt`) is not "used only inside its parent" in the Q349 sense: a designer inserts it
 *     from the assets panel, and Figma publishes no `_` set, so a `_` slot item would offer nothing in a
 *     file that uses the library (#2831). So a slot item never takes the `_` prefix, and the prefix arm's
 *     wording direction does not ask it to, even where its whenToUse says "Only as a child of …".
 *     `SLOT_ITEMS` is the owner's list, and is the floor: each must be registered, unprefixed, and read as
 *     a slot's preferred item, so a slot that stops offering its item fails here rather than exempting
 *     nothing.
 *
 *  ── root ──  (Q350) the root part is named for its role: a name from `ROOT_ROLES`, never the def's own id.
 *
 *  ── glyph ──  (Q350) every `vector` part that is not the root is named `<shape>Glyph`.
 *
 *  ── control cell ──  (Q350) a box that holds a nested `*-control` is named `controlCell`.
 *
 * ── skill ──  the literals and the owner-facing table agree. `ROOT_ROLES`, `DECIDED_PRIVATE`, `SLOT_ITEMS` and
 *     `STANDALONE` are each written twice: here, and in §6 of the skill, which is what the owner reads and
 *     decides. The arm parses §6's root row, its prefixed set, its slot items and its exempt controls and
 *     asserts each equals its literal
 *     in both directions, so neither copy can move alone. It does not make the skill the oracle for a def:
 *     the defs are still checked against the literals. It reads each rule's FIRST match, so it also asserts
 *     each anchor (and the §6 and §7 headings) appears exactly once in the whole skill: a second copy a clean
 *     merge leaves further down would otherwise drift unread (#2948). A self-check appends a contradicting
 *     copy of each rule to the real skill and asserts the count fails by the rule's name.
 *
 * NOT CHECKED, and said so: "main text is `label`". Which text part is a component's main one is a judgment
 * (a dialog has a title and a description), not a field, so it stays with review.
 *
 * ── THE PENDING LEDGER, AND WHY IT CAN ONLY SHRINK ───────────────────────────────────────────────────
 *
 * The rules landed before the renames (#2759 PR 1; the renames are PRs 2–4). Every breach the rules find
 * today is listed in `PENDING` with the PR that clears it. A breach not in the ledger fails by its arm's
 * name; a ledger entry that no longer breaches fails as `stale`, so the ledger cannot keep an entry the
 * defs have outgrown and cannot quietly absorb a new breach. Each rename PR deletes its entries; when the
 * sweep is done the ledger is empty. The ledger is a WAIVER, never the oracle: the expected value of every
 * arm is its rule above (`docs/34` shape 1 is a gate whose expected value is read off the declaration).
 *
 * A def that leaves the registry for a reason other than these renames (#2660 removes the per-item
 * booleans) leaves its entries stale, and the stale arm says which to delete.
 *
 * ── LIVENESS (`docs/34` shapes 4 and 9) ─────────────────────────────────────────────────────────────
 *
 * A self-check feeds each rule a known breach and a known pass, and fails if either reads wrong; and a
 * representation floor asserts the walk saw property names, roots, vector parts and a control cell at all,
 * so an empty walk cannot report clean.
 */
import { readFileSync } from 'node:fs';
import { componentDefs } from './components/index';
import type { ComponentDef } from './component-schema';

// ── THE RULES, AS LITERALS ──────────────────────────────────────────────────────────────────────────

/** The two wordings a private part's `ai.whenToUse` opens with. A Radio row's "Always as a child of a
 *  Radio.Group" is not one of them: Q355's prefixed list leaves it out (#2759 Q-N1). */
const PRIVATE_WORDING: readonly RegExp[] = [/^Only as a child of /, /^Never directly\b/];

/** The owner's prefixed set (Q349), by the id each takes. Q353 and Q355 prefixed the tab, list item and
 *  segment too; Q394 A took them out as slot items (`SLOT_ITEMS`). */
const DECIDED_PRIVATE: readonly string[] = ['_accordion-indicator'];

/** The owner's slot items (Q394 A): each is a native slot's preferred item, so it stays unprefixed. */
const SLOT_ITEMS: readonly string[] = ['tab-item', 'list-item', 'segmented-control-segment'];

/** Exempt from the prefix by decision (Q349): each may be used on its own. */
const STANDALONE: readonly string[] = ['checkbox-control', 'radio-control'];

/** The role names a root part may take (the skill's naming table, §6). Not `label`: that is the main text's name. */
const ROOT_ROLES: readonly string[] = ['container', 'row', 'control', 'track', 'message', 'ring', 'glyph', 'frame', 'wash', 'surface', 'panel'];

/** The suffix every non-root glyph layer carries, and the name of a Row's control cell. */
const GLYPH_SUFFIX = 'Glyph';
const CONTROL_CELL = 'controlCell';

const isLower = (name: string): boolean => name === name.toLowerCase();
const isPrivateWording = (whenToUse: string): boolean => PRIVATE_WORDING.some((re) => re.test(whenToUse));
const rootOk = (root: string, id: string): boolean => ROOT_ROLES.includes(root) && root !== id && root !== id.replace(/^_/, '');
const glyphOk = (part: string): boolean => part.endsWith(GLYPH_SUFFIX) && part.length > GLYPH_SUFFIX.length;

// ── THE LEDGER ──────────────────────────────────────────────────────────────────────────────────────

type Arm = 'casing' | 'prefix' | 'slot item' | 'root' | 'glyph' | 'control cell';
/** One known breach: `arm`, the def id, and the name that breaches (a property name, a part, or the id). */
type Pending = { arm: Arm; def: string; name: string; pr: 2 | 3 | 4; to?: string };
const PENDING: readonly Pending[] = [
  // PR 2 — Figma property names lowercase (Q345 A): renamed here. #2660 removed the per-item names.
  // PR 3 — component renames. None breaches a rule here: Q394 A keeps the slot items unprefixed, and the
  // one rename left (`tab` → `tab-item`, Q353) is a name, not a rule this gate reads.
];

// ── THE WALK ────────────────────────────────────────────────────────────────────────────────────────

/** Every def a native slot offers as its preferred item, with the slot that offers it (`<def>.<part>`). */
const slotItemsOf = (defs: readonly ComponentDef[]): { slot: string; item: string }[] =>
  defs.flatMap((def) => Object.entries(def.anatomy?.parts ?? {}).flatMap(([name, p]) =>
    p.contentSlot ? [...(p.preferred ?? []), ...(p.preferredWhenBuilt ?? [])].map((item) => ({ slot: `${def.id}.${name}`, item })) : []));

type Breach = { arm: Arm; def: string; name: string; why: string };

/** Every Figma property name a def projects: its component properties, then its variant axes. */
const propertyNames = (def: ComponentDef): string[] => {
  const fp = def.figmaProperties;
  const out: string[] = [];
  for (const s of fp?.slotAxes ?? []) out.push(s.figmaName ?? s.name);
  for (const group of [fp?.swaps, fp?.texts, fp?.booleans])
    for (const [key, v] of Object.entries(group ?? {})) out.push((v as { figmaName?: string }).figmaName ?? key);
  const shown = (fp as { variantAxisNames?: Record<string, string> } | undefined)?.variantAxisNames ?? {};
  for (const axis of Object.keys(def.variants ?? {})) out.push(shown[axis] ?? axis);
  // The state axis is a variant property too (`figmaAxisNames` projects it between the variant and slot axes).
  if (fp?.stateAxis?.name) out.push(fp.stateAxis.name);
  return out;
};

const breachesOf = (defs: readonly ComponentDef[]): { breaches: Breach[]; seen: { props: number; roots: number; vectors: number; cells: number; privates: number; slotItems: number } } => {
  const breaches: Breach[] = [];
  const seen = { props: 0, roots: 0, vectors: 0, cells: 0, privates: 0, slotItems: 0 };
  const byId = new Map(defs.map((d) => [d.id, d]));
  const slotItems = new Set(slotItemsOf(defs).map((s) => s.item));
  for (const { slot, item } of slotItemsOf(defs)) {
    seen.slotItems++;
    if (item.startsWith('_'))
      breaches.push({ arm: 'slot item', def: item, name: item, why: `${slot} offers '${item}' as a slot's preferred item, so it stays unprefixed (Q394 A; expected '${item.replace(/^_+/, '')}')` });
  }
  for (const def of defs) {
    for (const name of propertyNames(def)) {
      seen.props++;
      if (!isLower(name)) breaches.push({ arm: 'casing', def: def.id, name, why: `Figma property '${name}' is not lowercase (expected '${name.toLowerCase()}')` });
    }

    const priv = isPrivateWording(def.ai?.whenToUse ?? '');
    if (priv) seen.privates++;
    if (STANDALONE.includes(def.id.replace(/^_/, '')) && def.id.startsWith('_'))
      breaches.push({ arm: 'prefix', def: def.id, name: def.id, why: `'${def.id}' is exempt from the prefix by decision (it may be used on its own) and must stay unprefixed` });
    else if (priv && !def.id.startsWith('_') && !slotItems.has(def.id))
      breaches.push({ arm: 'prefix', def: def.id, name: def.id, why: `whenToUse says it is used only inside its parent, so its id takes the '_' prefix ('_${def.id}')` });
    else if (!priv && def.id.startsWith('_'))
      breaches.push({ arm: 'prefix', def: def.id, name: def.id, why: `the id has the '_' prefix, and whenToUse does not say it is used only inside its parent (expected one of ${PRIVATE_WORDING.map(String).join(', ')})` });

    const parts = def.anatomy?.parts ?? {};
    const root = def.anatomy?.root ?? '';
    seen.roots++;
    if (!rootOk(root, def.id))
      breaches.push({ arm: 'root', def: def.id, name: root, why: `root part '${root}' is not named for its role (expected one of ${ROOT_ROLES.join(', ')}, never the def's own id)` });

    for (const [name, p] of Object.entries(parts)) {
      if (p.kind === 'vector' && name !== root) {
        seen.vectors++;
        if (!glyphOk(name)) breaches.push({ arm: 'glyph', def: def.id, name, why: `vector part '${name}' is not named <shape>${GLYPH_SUFFIX}` });
      }
      if (p.kind === 'box' && name !== root) {
        const holdsControl = (p.children ?? []).some((c) => {
          const child = parts[c];
          return child?.kind === 'nest' && !!child.nests && /-control$/.test(child.nests) && byId.has(child.nests);
        });
        if (holdsControl) {
          seen.cells++;
          if (name !== CONTROL_CELL) breaches.push({ arm: 'control cell', def: def.id, name, why: `box '${name}' holds a nested control, so it is named '${CONTROL_CELL}'` });
        }
      }
    }
  }
  return { breaches, seen };
};

// ── RUN ─────────────────────────────────────────────────────────────────────────────────────────────

const fail: string[] = [];

// Self-check: each rule reads a known breach as a breach and a known pass as a pass (`docs/34` shape 9).
const selfCheck: [string, boolean, boolean][] = [
  ['casing', isLower('State icon'), isLower('↳ swap leading icon')],
  ['prefix wording', isPrivateWording('Always as a child of a Radio.Group.'), isPrivateWording('Only as a child of Tabs.') && isPrivateWording('Never directly: it is part of an Accordion.')],
  ['root', rootOk('divider', 'divider') || rootOk('root', 'x'), rootOk('container', 'divider') && rootOk('control', 'checkbox-control')],
  ['glyph', glyphOk('mark') || glyphOk('Glyph'), glyphOk('checkGlyph')],
];
for (const [rule, breachReadAsPass, passReadAsPass] of selfCheck) {
  if (breachReadAsPass) fail.push(`self-check: the ${rule} rule passes a known breach`);
  if (!passReadAsPass) fail.push(`self-check: the ${rule} rule refuses a known pass`);
}

const { breaches, seen } = breachesOf(componentDefs);
const ids = new Set(componentDefs.map((d) => d.id));

// Floor: the walk saw each kind of thing it checks.
if (seen.props < 20) fail.push(`floor: only ${seen.props} Figma property names seen across ${componentDefs.length} defs; the casing arm is reading nothing`);
if (seen.roots !== componentDefs.length) fail.push(`floor: ${seen.roots} roots seen for ${componentDefs.length} defs`);
if (seen.vectors === 0) fail.push('floor: no non-root vector part seen; the glyph arm is reading nothing');
if (seen.cells === 0) fail.push('floor: no box holding a nested control seen; the control cell arm is reading nothing');
if (seen.privates === 0) fail.push('floor: no def reads as private by its whenToUse; the prefix arm is reading nothing');
if (seen.slotItems === 0) fail.push('floor: no slot offers a preferred item; the slot item arm is reading nothing');
const offered = new Set(slotItemsOf(componentDefs).map((s) => s.item));
for (const id of SLOT_ITEMS) {
  if (!ids.has(id)) fail.push(`floor: '${id}' is in the owner's slot items (Q394 A) and no def is registered under that id`);
  else if (!offered.has(id)) fail.push(`floor: '${id}' is in the owner's slot items (Q394 A), and no slot offers it as its preferred item, so the slot item rule cannot see it`);
}
for (const id of STANDALONE) if (!ids.has(id)) fail.push(`floor: '${id}' is exempt from the prefix by decision and is not registered under that id`);
for (const id of DECIDED_PRIVATE) {
  const pending = PENDING.find((p) => p.arm === 'prefix' && p.to === id);
  const def = componentDefs.find((d) => d.id === (pending ? pending.def : id));
  if (!def) { fail.push(`floor: '${id}' is in the owner's prefixed set and no def is registered as it${pending ? ` or as '${pending.def}'` : ''}`); continue; }
  if (!isPrivateWording(def.ai?.whenToUse ?? '')) fail.push(`floor: '${def.id}' is in the owner's prefixed set, and its whenToUse does not open with the private-part wording, so the prefix rule cannot see it`);
}

// The literals equal the skill's §6, both ways (each list read with a floor, so a reworded table that parses
// to nothing fails rather than agreeing with nothing). Each rule is read where it first appears, so a second
// copy further down (two PRs editing the skill in hunks git merges cleanly, #2948) would never be read: the
// skill must hold each anchor, and the §6 and §7 headings, exactly once, counted over the WHOLE file.
const SKILL = 'skills/prism3-build-component/SKILL.md';
const skill = readFileSync(new URL(`../../${SKILL}`, import.meta.url), 'utf8');
const ticks = (text: string | undefined): string[] => [...(text ?? '').matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const SKILL_RULES: [string, readonly string[], RegExp][] = [
  ['ROOT_ROLES', ROOT_ROLES, /^\| Root part \|([^|]*?)Never/m],
  ['DECIDED_PRIVATE', DECIDED_PRIVATE, /The prefixed set is ([^.]*)\./],
  ['SLOT_ITEMS', SLOT_ITEMS, /The slot items are ([^.]*)\./],
  ['STANDALONE', STANDALONE, /\(([^)]*)\) stay\s+unprefixed/],
];
const HEADINGS: readonly [string, RegExp][] = [['§6', /\n## 6\. /], ['§7', /\n## 7\. /]];
const count = (text: string, re: RegExp): number => [...text.matchAll(new RegExp(re.source, `${re.flags.replace('g', '')}g`))].length;
/** The problems one copy of the skill's text has against the literals. Returns them, so the self-check can call it too. */
const skillProblems = (text: string): string[] => {
  const out: string[] = [];
  for (const [label, re] of HEADINGS) {
    const n = count(text, re);
    if (n !== 1) out.push(`skill: ${SKILL} has ${n} ${label} headings, expected 1; the gate reads only the first, so a second copy goes unchecked`);
  }
  const s6 = text.slice(text.indexOf('\n## 6. '), text.indexOf('\n## 7. '));
  for (const [name, literal, re] of SKILL_RULES) {
    const n = count(text, re);
    if (n > 1) out.push(`skill: ${SKILL} states the ${name} rule ${n} times (anchor ${re.source}), expected once; the gate reads only the first, so a second copy goes unchecked`);
    const table = ticks(re.exec(s6)?.[1]);
    if (table.length === 0) { out.push(`skill: ${SKILL} §6 lists no ${name} that the gate can read; the agreement check is reading nothing`); continue; }
    for (const x of literal) if (!table.includes(x)) out.push(`skill: ${name} has '${x}', which ${SKILL} §6 does not list`);
    for (const x of table) if (!literal.includes(x)) out.push(`skill: ${SKILL} §6 lists '${x}', which ${name} does not have`);
  }
  return out;
};
fail.push(...skillProblems(skill));

// Self-check for the copy count (#2948): a second, contradicting copy of each rule, appended after §7, and a
// second §6 heading, each fail by the rule's name. The copy is made from the real skill's own sentence with a
// name changed, so the fixture is the merge the issue measured, not a synthetic string the anchor was fitted to.
for (const [name, , re] of SKILL_RULES) {
  const first = re.exec(skill)?.[0];
  if (!first) continue; // the floor above already failed by name
  const copy = first.replace(/`([^`]+)`/, '`$1-copy`');
  if (copy === first) { fail.push(`self-check: the ${name} sentence holds no quoted name to change, so the copy fixture is not a contradicting copy`); continue; }
  if (!skillProblems(`${skill}\n\n${copy}\n`).some((f) => f.includes(`states the ${name} rule ${count(skill, re) + 1} times`)))
    fail.push(`self-check: a second copy of the ${name} rule in ${SKILL} does not fail the copy count`);
}
if (!skillProblems(skill.replace('\n## 7. ', '\n## 6. Naming canon, again\n\n## 7. ')).some((f) => f.includes(`${count(skill, HEADINGS[0][1]) + 1} §6 headings`)))
  fail.push('self-check: a second §6 heading does not fail the heading count');

// Every breach is in the ledger; every ledger entry is still a breach.
const key = (b: { arm: string; def: string; name: string }): string => `${b.arm}|${b.def}|${b.name}`;
const pendingKeys = new Set(PENDING.map(key));
const breachKeys = new Set(breaches.map(key));
for (const b of breaches) if (!pendingKeys.has(key(b))) fail.push(`${b.arm}: ${b.def}: ${b.why}`);
for (const p of PENDING) if (!breachKeys.has(key(p))) fail.push(`stale: PENDING lists ${p.arm} '${p.name}' on ${p.def} (PR ${p.pr}), which no longer breaches — delete the entry`);

if (fail.length) {
  console.error(`✗ lint-naming: ${fail.length} problem(s):\n`);
  for (const f of fail) console.error(`  · ${f}`);
  process.exit(1);
}
const byPr = [2, 3, 4].map((n) => `PR ${n}: ${PENDING.filter((p) => p.pr === n).length}`).join(', ');
console.log(`✓ lint-naming: ${componentDefs.length} defs — ${seen.props} property names, ${seen.roots} roots, ${seen.vectors} glyph layers, ${seen.cells} control cells, ${seen.privates} private defs, ${seen.slotItems} slot items; every breach is pending (${PENDING.length}: ${byPr}), none stale; the skill's §6 agrees (${ROOT_ROLES.length} roles, ${DECIDED_PRIVATE.length} prefixed, ${SLOT_ITEMS.length} slot items, ${STANDALONE.length} exempt).`);
