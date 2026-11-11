/**
 * TOKEN-CONSUMERS GATE (#3409, owner decision Q33 A) — every token in the guaranteed contract is READ by something, or
 * it is DECLARED here as unread on purpose, with the reason.
 *
 *   npx tsx packages/engine/lint-token-consumers.ts
 *
 * A token nothing reads is either dead weight a brand pays for in every file, or a binding a component is missing. The
 * contract (`schema/token-contract.json`, `guaranteed`) promises each name to every consumer, so an unread one is not
 * free to drop either: removing a guaranteed name is a major `CONTRACT_VERSION` bump. This gate does not decide which
 * it is. It makes each one a written decision, so a new token cannot arrive unread without someone saying why, and a
 * token that loses its last reader is named in the PR that removed it.
 *
 * ── WHAT COUNTS AS A READ ───────────────────────────────────────────────────────────────────────────
 *
 * A contract path is READ when any of these names it, root-relative and exactly (`color.text.primary`):
 *   · `defs`    — any string anywhere in a component def (`componentDefs`): a `tokens` binding, and also a code-only
 *                 binding a def states in prose (Dialog's backdrop is `color.scrim.default` in its `codeOnly` notes,
 *                 with no Figma part to bind it). A mention is a read: the walk does not parse prose, it matches names.
 *                 EXCEPT `notes.evolution` (#3444): that field is history, what a def USED to do and why it changed. A
 *                 line saying the icon once took `color.icon.link.visited` would keep the token read after the binding
 *                 is gone, so the walk skips it (`HISTORY` below). The other `notes` fields state live behavior and
 *                 still read.
 *   · `aliases` — a DTCG alias (`"{<root>.path}"`) in any committed emission, `out/*.tokens.json`, every corpus brand
 *                 and every overlay: a primitive a semantic role aliases is read by that role.
 *   · `preview` — a binding in `schema/preview-spec.json`, the sample components the plugin and the web playground
 *                 render from it.
 * The machine-readable metadata (`*.ai.json`) and the style-guide pages describe EVERY token, so counting them would
 * read the contract back to itself (`docs/34` shape 1) and nothing could ever be unread. They are not readers here.
 *
 * ── WHY THE REGISTER IS INDEPENDENT (docs/34) ───────────────────────────────────────────────────────
 *
 * SUBJECT: the contract's guaranteed paths, minus the paths the three readers above name — both measured live.
 * EXPECTED: `UNREAD_BY_DESIGN` below, authored by hand: a path or a family pattern, the COUNT of unread tokens it
 * claims today, and the reason. Nothing in it is read off the contract, a def or an emission, so:
 *   · a token that loses its only reader appears unclaimed, or moves a family's count, and fails by name;
 *   · an entry dropped from the register leaves its tokens unclaimed, and they fail by name;
 *   · an entry whose tokens are read again claims fewer than it declares, and fails as stale.
 * The COUNT is what keeps a family pattern honest (`docs/34` shape 15): without it, `color.inverse.*` would quietly
 * absorb every new inverse role nothing reads. With it, the family's membership is pinned, and a change to it is a
 * one-number edit a reviewer sees.
 *
 * An entry with `held` is an OWNER QUESTION (#3409: "any token that looks like it should be bound is an owner
 * question, not something to delete"): it passes today, and it names the question that decides whether the token is
 * bound, kept for consumers, or removed in a contract major.
 *
 * ── LIMITS ──────────────────────────────────────────────────────────────────────────────────────────
 *
 * It proves a name is mentioned, not that the mention is a correct binding: that is `lint-paint`'s and `test.ts`'s
 * business. A prose mention in a def counts as a read even where the sentence says "not X". Only `notes.evolution` is
 * skipped as history: a past-tense line in any other field (a `codeOnly` entry, a `docs` string) still counts, so write
 * history in `notes.evolution`. `brandDependent` paths are
 * not guaranteed and not checked. A reason is prose, and review is its only guard.
 * An alias is a read whoever holds it, even a guaranteed token that is itself unread: `core.dimension.72` counts as
 * read because `space.900` aliases it, though nothing reads `space.900`. Such a primitive becomes unread only when its
 * holder leaves the contract, and the pinned family counts then fail by name, so nothing is lost silently. The gate
 * REPORTS these reads on every run (`read only through unread holders`), measured as a fixed point over the alias
 * graph, and asserts nothing on them: the count is an input to the register's contents, not a verdict (#3434 review).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components/index';

const HERE = dirname(fileURLToPath(import.meta.url));

type Unread = {
  /** A contract path, or a pattern (see `matches`). */
  readonly match: string;
  /** How many unread guaranteed tokens the entry claims today. Authored, never computed. */
  readonly count: number;
  readonly reason: string;
  /** The owner question that decides this entry, when the token looks like it should be bound. */
  readonly held?: string;
};

/**
 * THE REGISTER — EXPECTED, authored, never generated. See the header. Most specific entries first is a convention,
 * not a rule: a token claimed by two entries fails, so the order decides nothing.
 */
export const UNREAD_BY_DESIGN: readonly Unread[] = [
  // ── BY DESIGN, settled by the owner (#3438): each looked like it could be bound, and the owner kept it unbound. ──
  { match: 'color.interactive.*.fill.focused', count: 3,
    reason: 'The focused fill of each intent (primary, neutral, destructive). Kept for consumers; Prism3 controls show focus with the ring (Q-TC2 A).' },
  { match: 'color.interactive.destructive.indicator.*', count: 3,
    reason: 'The destructive selection mark at rest, hover and pressed. The matrix is kept whole: every role carries every state, for consumers. No Prism3 control selects in the destructive intent (Q-TC3 A).' },
  { match: 'color.interactive.*.fill.selected', count: 2,
    reason: 'The selected fill of the neutral and destructive intents (primary\'s is read). The matrix is kept whole: every role carries every state, for consumers (Q-TC3 A).' },
  { match: 'color.*.tertiary', count: 2,
    reason: '`color.text.tertiary` and `color.foreground.tertiary`, the third step of the text and fill ladders. Kept for consumers; Prism3\'s muted parts stay on secondary (Q-TC4 A).' },
  { match: 'control.size.lg.*', count: 3,
    reason: 'The large selection-control rung (`inset`, `track`, `width`). Rungs kept for consumers\' own controls; the checkbox, radio and switch controls add no large size (Q-TC5 A).' },
  { match: 'size.xs.height', count: 1,
    reason: 'The extra-small control height. Rungs kept for consumers\' own controls; no Prism3 control adds an extra-small size (Q-TC5 A).' },

  // ── BY DESIGN: a family emitted whole, so a consumer finds every member of it. ──
  { match: 'color.inverse.**', count: 120,
    reason: 'The inverse ladder mirrors every role (`docs/06`: "the inverse form of any role is `inverse.` + its name"), so a consumer\'s own content on an inverse band has the same vocabulary as on the page. Components read the few inverse roles they place on an inverse surface; the rest are the mirror.' },
  { match: 'color.text.*-subtle', count: 5,
    reason: 'Text in each status and brand hue at its subtle strength. The status families carry the full role set (text, icon, fill, border, each strong and subtle, and the on-fill inks) so a consumer composes a status pattern from roles; components bind the subset their shapes need.' },
  { match: 'color.icon.*-subtle', count: 5,
    reason: 'An icon in each status and brand hue at its subtle strength: the status families\' full role set (see `color.text.*-subtle`).' },
  { match: 'color.icon.on-*', count: 5,
    reason: 'An icon on each status and brand bold fill: the status families\' full role set (see `color.text.*-subtle`). The on-fill TEXT roles are read; no component puts an icon on a bold status fill.' },
  { match: 'color.border.brand', count: 1,
    reason: 'The brand family\'s border role: its full role set (see `color.text.*-subtle`).' },
  { match: 'color.foreground.brand-subtle', count: 1,
    reason: 'The brand family\'s subtle fill: its full role set (see `color.text.*-subtle`).' },
  { match: 'core.palette.**', count: 16,
    reason: 'Ramp steps no semantic role aliases in any corpus brand. A ramp is emitted whole (`lint-ramp-steps`), so a brand\'s own roles and a consumer\'s own layouts can reach any step.' },
  { match: 'core.dimension.*', count: 12,
    reason: 'Steps of the dimension scale no semantic token aliases. The scale is emitted whole, as a ramp is, for consumers\' own layouts.' },
  { match: 'core.font.**', count: 6,
    reason: 'Steps of the font role scales (weight, line height, letter spacing) no text style aliases in any corpus brand. Emitted whole, so a brand that widens its type roles has the step.' },
  { match: '*.glass', count: 1,
    reason: '`blur.glass`, with `color.glass.surface`: a translucent surface treatment for consumers\' own layouts. No component draws glass.' },
  { match: 'color.glass.surface', count: 1,
    reason: 'The glass surface fill, with `blur.glass`: for consumers\' own layouts. No component draws glass.' },
  { match: 'container.*', count: 2,
    reason: '`container.fluid` and `container.max`: page layout widths for consumers\' own layouts. Components fill their container; only the floor (`container.min`) is bound.' },
  { match: 'grid.**', count: 5,
    reason: 'The layout grid\'s columns, gutter and margin per breakpoint: for consumers\' page layouts. No component lays out a page grid.' },
  { match: 'motion.**', count: 12,
    reason: 'Steps of the motion scale (durations, reduced-motion durations, easing, springs, stagger, transitions) no component names. Emitted whole for consumers\' own motion.' },
  { match: 'opacity.*', count: 11,
    reason: 'Steps of the opacity scale no component or role uses. Emitted whole for consumers.' },
  { match: 'radius.*', count: 2,
    reason: '`radius.3xl` and `radius.hairline`: the ends of the radius scale, emitted whole for consumers. No component rounds that far, or that little.' },
  { match: 'shadow.*', count: 4,
    reason: 'Elevation steps no component uses (`2xl`, `inset`, `md`, `xs`). Emitted whole for consumers.' },
  { match: 'space.*', count: 6,
    reason: 'The top of the space scale (700 to 1200): page-level spacing for consumers\' layouts, wider than any component gap.' },
  { match: 'type.*.*.default-link', count: 5,
    reason: 'The label and caption link styles. A link inside a run of text stays a text range in Figma, set with the `-link` text style (Q289.1 A); Link itself takes the body tier (Q297.1). So these are read by designers in the design file, not by a def.' },
  { match: 'type.*.*.line-box', count: 3,
    reason: 'The line box of a type rung, emitted for every rung so a part can be one line tall at any size. These rungs hold no such part today.' },
  { match: 'type.caption.lg.default', count: 1,
    reason: 'The caption tier\'s large rung. The type scale is emitted whole; no component sets large caption text.' },
];

// ---- the matcher -------------------------------------------------------------------------------------------------
/** `*` inside a segment matches one or more of `[a-z0-9-]` (so `on-*` is every `on-` role, `*` alone one whole segment);
 *  a final `**` matches one or more whole segments. */
export const matches = (pattern: string, path: string): boolean => {
  const p = pattern.split('.');
  const s = path.split('.');
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '**') return i === p.length - 1 && s.length > i;
    if (i >= s.length) return false;
    if (!new RegExp(`^${p[i].replace(/[^a-z0-9*-]/g, '').replace(/\*/g, '[a-z0-9-]+')}$`).test(s[i])) return false;
  }
  return s.length === p.length;
};

// The matcher's own cases, so a broken `*` or `**` cannot pass every entry or none.
const selfFails: string[] = [];
for (const [pat, path, want] of [
  ['color.text.tertiary', 'color.text.tertiary', true],
  ['color.text.tertiary', 'color.text.tertiary.x', false],
  ['color.*.on-info', 'color.icon.on-info', true],
  ['color.*.on-info', 'color.inverse.icon.on-info', false],
  ['color.inverse.**', 'color.inverse.icon.on-info', true],
  ['color.inverse.**', 'color.inverse', false],
  ['opacity.*', 'opacity.10', true],
  ['color.icon.on-*', 'color.icon.on-info', true],
  ['color.icon.on-*', 'color.icon.info', false],
  ['color.icon.*-subtle', 'color.icon.info-subtle', true],
  ['color.icon.*-subtle', 'color.icon.link.visited', false],
] as const) if (matches(pat, path) !== want) selfFails.push(`matcher: '${pat}' against '${path}' should be ${want}`);

// ---- the subject -------------------------------------------------------------------------------------------------
const contract = JSON.parse(readFileSync(join(HERE, 'schema', 'token-contract.json'), 'utf8')) as { guaranteed: Record<string, string> };
const guaranteed = Object.keys(contract.guaranteed);
const isGuaranteed = new Set(guaranteed);

// Reader 1: every string in every def. A dotted name inside a sentence or a binding. `HISTORY` is the one field the
// walk skips, by its key path from the def's root (#3444): history is not a read. Written here by hand, not read off
// the schema's `notes` type, so a field renamed there leaves this path matching nothing and the floor below fires.
const HISTORY = ['notes', 'evolution'] as const;
const NAME = /[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+/g;
const byDefs = new Set<string>();
let historySkipped = 0;
const walk = (v: unknown, path: readonly string[]): void => {
  if (path.length === HISTORY.length && path.every((k, i) => k === HISTORY[i])) { historySkipped++; return; }
  if (typeof v === 'string') { for (const m of v.matchAll(NAME)) if (isGuaranteed.has(m[0])) byDefs.add(m[0]); }
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, String(i)]));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, [...path, k]);
};
for (const d of componentDefs) walk(d, []);

// Reader 2: every alias in every committed emission. An alias carries the brand's root (`nbds.pds.`, `pds3.`), so a
// contract path is read when an alias ENDS in it at a segment boundary.
const OUT = resolve(HERE, 'out');
const emissions = readdirSync(OUT).filter((f) => f.endsWith('.tokens.json'));
const byAliases = new Set<string>();
const guaranteedTails = (dotted: string): string[] => {
  const segs = dotted.split('.');
  const tails: string[] = [];
  for (let i = 0; i < segs.length; i++) { const tail = segs.slice(i).join('.'); if (isGuaranteed.has(tail)) tails.push(tail); }
  return tails;
};
for (const f of emissions)
  for (const m of readFileSync(join(OUT, f), 'utf8').matchAll(/"\{([^}"]+)\}"/g)) for (const t of guaranteedTails(m[1])) byAliases.add(t);

// For the REPORT only (see LIMITS): who holds each alias. A holder that is not a guaranteed path is `null` — outside
// the contract, so it is never judged unread and its alias always stands as a read.
const holders = new Map<string, Set<string | null>>();
const walkHolders = (v: unknown, path: string[]): void => {
  if (typeof v === 'string') {
    const own = guaranteedTails(path.filter((k) => !k.startsWith('$')).join('.'));
    for (const m of v.matchAll(/\{([^}"]+)\}/g))
      for (const t of guaranteedTails(m[1])) {
        if (!holders.has(t)) holders.set(t, new Set());
        holders.get(t)!.add(own.length ? own[0] : null);
      }
  } else if (Array.isArray(v)) v.forEach((x, i) => walkHolders(x, [...path, String(i)]));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkHolders(x, [...path, k]);
};
for (const f of emissions) walkHolders(JSON.parse(readFileSync(join(OUT, f), 'utf8')), []);

// Reader 3: the sample-component preview's bindings.
const byPreview = new Set<string>();
walkPreview(JSON.parse(readFileSync(join(HERE, 'schema', 'preview-spec.json'), 'utf8')));
function walkPreview(v: unknown): void {
  if (typeof v === 'string') { if (isGuaranteed.has(v)) byPreview.add(v); }
  else if (Array.isArray(v)) v.forEach(walkPreview);
  else if (v && typeof v === 'object') Object.values(v).forEach(walkPreview);
}

const unread = guaranteed.filter((t) => !byDefs.has(t) && !byAliases.has(t) && !byPreview.has(t)).sort();

// The fixed point the REPORT names: a token read only through aliases whose every holder is guaranteed and itself
// unread (directly, or through this same chain). Reported, never asserted.
const strict = new Set(unread);
for (let grew = true; grew;) {
  grew = false;
  for (const t of guaranteed) {
    if (strict.has(t) || byDefs.has(t) || byPreview.has(t)) continue;
    const by = holders.get(t);
    if (by && by.size && [...by].every((h) => h !== null && h !== t && strict.has(h))) { strict.add(t); grew = true; }
  }
}
const viaUnread = [...strict].filter((t) => !unread.includes(t)).sort();

// ---- the comparison ----------------------------------------------------------------------------------------------
const fail: string[] = [...selfFails];
const claimed = new Map<Unread, string[]>(UNREAD_BY_DESIGN.map((e) => [e, []]));
for (const t of unread) {
  const by = UNREAD_BY_DESIGN.filter((e) => matches(e.match, t));
  if (by.length === 0) fail.push(`unclaimed: '${t}' is in the guaranteed contract and nothing reads it — bind it where it belongs, or declare it in UNREAD_BY_DESIGN with the reason (an owner question if it looks like it should be bound)`);
  else if (by.length > 1) fail.push(`ambiguous: '${t}' is claimed by ${by.map((e) => `'${e.match}'`).join(' and ')} — one entry per token`);
  else claimed.get(by[0])!.push(t);
}
for (const e of UNREAD_BY_DESIGN) {
  const got = claimed.get(e)!;
  if (!e.reason.trim()) fail.push(`register: '${e.match}' has no reason`);
  if (!e.match.includes('*') && !isGuaranteed.has(e.match)) fail.push(`register: '${e.match}' is not a guaranteed contract path — remove the entry`);
  if (got.length !== e.count)
    fail.push(`register: '${e.match}' claims ${got.length} unread token(s) and declares ${e.count}${got.length < e.count ? ' — a token it named is read now, or left the contract: lower the count, or remove the entry at 0' : ` — a token joined it unread (${got.join(', ')}): read it, or raise the count with the reason still true`}`);
}

// Floors: each reader has to find something, or a broken scan would make everything unread and fail loudly anyway —
// but a scan that found EVERYTHING would pass silently, so the unread count has a floor too.
if (guaranteed.length === 0) fail.push('floor: the contract lists no guaranteed path');
if (byDefs.size === 0) fail.push('floor: no def names a contract path — the def walk read nothing');
if (historySkipped === 0) fail.push(`floor: no def has a '${HISTORY.join('.')}' field — the history skip matched nothing; was the field renamed?`);
if (byAliases.size === 0) fail.push(`floor: no emission aliases a contract path — the alias scan read nothing (${emissions.length} emission files)`);
if (byPreview.size === 0) fail.push('floor: the preview spec names no contract path');
if (unread.length === 0) fail.push('floor: every guaranteed token is read — the register has nothing to claim; check the readers before believing it');

const held = UNREAD_BY_DESIGN.filter((e) => e.held);
if (fail.length) {
  console.error(`❌ token consumers: ${fail.length} failure(s)`);
  for (const f of fail) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`· token consumers (reported, not asserted): ${viaUnread.length} token(s) read only through unread holders — ${viaUnread.map((t) => `${t} ← ${[...holders.get(t)!].join(', ')}`).join('; ') || 'none'}`);
console.log(`✅ token consumers: ${guaranteed.length} guaranteed tokens — ${guaranteed.length - unread.length} read (${byDefs.size} by defs, ${byAliases.size} by aliases in ${emissions.length} emissions, ${byPreview.size} by the preview; ${historySkipped} defs' ${HISTORY.join('.')} skipped as history), ${unread.length} unread and each declared by one of ${UNREAD_BY_DESIGN.length} entries; ${held.reduce((n, e) => n + e.count, 0)} of them held for owner questions (${held.map((e) => e.held).filter((q, i, a) => a.indexOf(q) === i).join(', ') || 'none'})`);
