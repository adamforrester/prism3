/**
 * THE ENGINE-ONLY SEED (#2075 part 2, owner decision Q-FS1 A): reads one file facts report (`file-facts.ts`) and
 * proposes a starting brand input. Six picks — primary, accent, type families, density, radius, and the action
 * palette (owner decision Q-BK7 A) — each with a confidence and the evidence that drove it, plus the neutral cast a
 * compiling input needs (not scored).
 *
 *   seedFromFacts(report) → FileSeed           // pure, deterministic, dependency-free and node-free
 *   seedDesignMd(seed)    → string             // the seed as a `design.md`, in the shape `cli.ts` already compiles
 *
 * IT IS A SUGGESTION, NOT AN INVERSION (#2075, #677). The engine cannot be run backwards, so every pick is a
 * heuristic over names, alias structure and usage counts, and a reviewer confirms or overrides it before anything is
 * applied (part 3, an owner decision still to come). A pick with no evidence takes the engine default at
 * confidence 0, so a reader can tell "chosen" from "defaulted".
 *
 * THE RULES (`SEED_RULE` names their revision, and the seed carries it):
 *
 *   COLOR. Every color the report states becomes an OBSERVATION with a weight and the names it was reached through:
 *     · a COLOR variable's value in its collection's default mode: weight 1 for a value, 2 for an alias (a role that
 *       points at a color says the color is in use), plus its bound layers;
 *     · a paint style's solid paints: weight 2, plus its layers;
 *     · a usage row: its layers, times a role factor (button-like 4, background 1, icon 1, text 1, border 0.5).
 *   A NAME HINT is a word in the variable's or style's name (and every name on its alias chain): `primary`, `brand`,
 *   `action`, `interactive`, `cta` hint primary; `accent`, `secondary`, `tertiary`, `highlight` hint accent and win
 *   over the primary words (so `brand/secondary` is an accent). Status words (`success`, `warning`, `danger`, `error`,
 *   `info`, `positive`, `negative`, `caution`, `critical`, `alert`, `feedback`, `focus`) drop the observation:
 *   a status or focus color is not the brand anchor. Observations under chroma 0.05 (OKLCH) are neutrals.
 *   Chromatic observations group into HUE FAMILIES: a color held as a stepped variable (`…/primary/650`) joins its
 *   ramp's family; any other joins the first family within 15° of its heaviest member. The primary family ranks by
 *   weight + 3 × primary-hinted weight; the accent is the best other family at least 15° away, ranked by
 *   weight + 3 × accent-hinted weight, and only when it is accent-hinted or weighs at least a quarter of the primary.
 *   Within a family the anchor is the color with the most hinted weight, then the most weight, then the most chroma.
 *   Confidence = the winner's share of the top two ranks, times 0.75 when no name hinted it.
 *
 *   FAMILIES. Font family values from STRING variables (a FONT_FAMILY scope or `family` in the name), text styles
 *   and usage rows. A name with `display`, `heading`, `headline`, `title`, `hero` or `h1`–`h6` is display evidence;
 *   `body`, `paragraph`, `text`, `label`, `detail`, `caption` or `ui` is body evidence; `code` or `mono` (in the name
 *   or the family itself) marks the code family, which is kept out of the other two. Icon fonts (`icon`, `awesome`,
 *   `symbols`) are dropped. Body = most body-weighted, display = most display-weighted; display falls back to body
 *   when nothing is display-named.
 *
 *   DENSITY. A FLOAT variable whose name says a medium control height (`height` and `md`/`medium`) maps to the
 *   engine's ladder: ≤ 38px compact, ≥ 50px spacious, else comfortable (compact 36, comfortable 44, spacious 56).
 *   Without one, the layer-weighted median padding: < 8 compact, > 20 spacious, else comfortable, at lower confidence.
 *
 *   RADIUS. `radiusScale` = the brand's medium (control) corner ÷ 4px, the engine's base, clamped to [0, 2] and held
 *   to quarter steps. The corner is, in order: a corner-radius variable named for a `button`, `field` or `input`; one
 *   named `md`/`medium`; one named `sm`/`small` × 2; else the most-used usage radius between 1 and 32px.
 *
 *   ACTION PALETTE (`actionPalette`). Which palette the main action runs on, read from the roles named for it: a
 *   COLOR variable with `action`, `interactive`, `button` or `cta` in its name, at rest (no state or inverse word),
 *   for the main action (no `secondary`, `tertiary`, `neutral`, `accent`, `ghost`, `subtle`, `outline`, `quiet`,
 *   `plain` or `link` rank word), and not a status or `destructive` one; plus every button-like usage fill. A
 *   near-white value (lightness above 0.9) is the ink on the fill or the ground, not the action color, and is
 *   skipped. Each votes its weight (as COLOR above) for the palette its color belongs to: the primary pick's family,
 *   the accent pick's family, or neutral (chroma under 0.05); a color in any other family votes for none. The pick is
 *   the heaviest of the three, `primary` on a tie; confidence = its share of all the votes, a vote for no palette
 *   counted in the total. With no such role or fill it is `primary`, the engine default, at confidence 0. The input
 *   sets `actionPalette` only when the pick isn't `primary`.
 *
 *   NEUTRAL (not scored; a compiling input needs it). The chroma-weighted mean hue of the observed grays between
 *   lightness 0.15 and 0.95 with chroma at least 0.004, and their weighted median chroma, capped at 0.03.
 */
import { localeFreeCompare } from './locale-free-order';
import { hexToRgb, inGamut, rgbToOklch } from './color';
import { toDesignMd } from './design-md';
import type { FileFactsReport } from './file-facts';
import type { BrandInput, OKLCH } from './theme';

export const FILE_SEED_FORMAT = 'prism3-file-seed/0.1';
export const SEED_RULE = 'facts-seed/1';

export type Density = 'compact' | 'comfortable' | 'spacious';
export type Evidence = { from: 'variable' | 'style' | 'usage'; name: string; value: string; weight: number };
export type Pick<T> = { value: T; confidence: number; evidence: Evidence[] };
export type Families = { display: string | null; body: string | null; code: string | null };
export type ActionPalette = 'primary' | 'accent' | 'neutral';
export type FileSeed = {
  format: typeof FILE_SEED_FORMAT;
  rule: typeof SEED_RULE;
  factsFormat: string;
  picks: {
    primary: Pick<OKLCH | null>;
    accent: Pick<OKLCH | null>;
    families: Pick<Families>;
    density: Pick<Density>;
    radiusScale: Pick<number>;
    actionPalette: Pick<ActionPalette>;
    neutral: Pick<{ hue: number; chroma: number }>;
  };
  /** The picks as a `BrandInput` the engine compiles; a null pick is left to the engine default. */
  input: BrandInput;
};

/* ── words ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Lowercased words: separators and camelCase are word breaks, so `onPrimary` reads `on primary`. */
const words = (s: string): Set<string> =>
  new Set(s.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
const has = (w: Set<string>, list: readonly string[]): boolean => list.some((x) => w.has(x));
const PRIMARY_WORDS = ['primary', 'brand', 'action', 'interactive', 'cta'];
const ACCENT_WORDS = ['accent', 'secondary', 'tertiary', 'highlight'];
const STATUS_WORDS = ['success', 'warning', 'danger', 'error', 'info', 'positive', 'negative', 'caution', 'critical', 'alert', 'feedback', 'focus'];
// A variant of a role (inverse, or an interaction state) counts half: the rest state on the light ground is the anchor.
const VARIANT_WORDS = ['inverse', 'inverted', 'dark', 'ondark', 'hover', 'hovered', 'pressed', 'active', 'focused', 'selected', 'disabled', 'visited'];
const ACTION_WORDS = ['action', 'interactive', 'button', 'cta'];
// A rank word names an action other than the main one; `destructive` is the danger action, a status in all but name.
const ACTION_RANK_WORDS = ['secondary', 'tertiary', 'neutral', 'accent', 'ghost', 'subtle', 'outline', 'outlined', 'quiet', 'plain', 'link', 'destructive'];
const CONTROL_WORDS = ['control', 'checkbox', 'radio', 'switch', 'toggle', 'icon'];
const DISPLAY_WORDS = ['display', 'heading', 'headline', 'title', 'hero', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const BODY_WORDS = ['body', 'paragraph', 'text', 'label', 'detail', 'caption', 'ui'];
const CODE_WORDS = ['code', 'mono', 'monospace'];
const ICON_FONT = /icon|awesome|symbols/i;

const HUE_FAMILY = 15;
const round = (n: number, d = 4): number => Math.round(n * 10 ** d) / 10 ** d;
const confidence = (n: number): number => round(Math.max(0, Math.min(1, n)), 2);
const top = (ev: Evidence[], n = 5): Evidence[] =>
  [...ev].sort((a, b) => b.weight - a.weight || localeFreeCompare(a.name, b.name) || localeFreeCompare(a.value, b.value)).slice(0, n);

/** OKLCH to four decimals, its chroma eased down until the rounded color is back in sRGB. */
const oklchOf = (hex: string): OKLCH => {
  const m = rgbToOklch(hexToRgb(hex.slice(0, 7)));
  const o = { l: round(m.l), c: round(m.c), h: round(m.h ?? 0, 2) };
  while (o.c > 0 && !inGamut(o)) o.c = round(o.c - 0.0001);
  return o;
};
const hueGap = (a: number, b: number): number => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/* ── color ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

type Obs = { hex: string; weight: number; hint: 'primary' | 'accent' | null; ev: Evidence };
const ROLE_FACTOR: Record<string, number> = { 'button-like': 4, background: 1, icon: 1, text: 1, border: 0.5 };

/** The value of a variable in its collection's default mode (the report's own resolution of the alias chain). */
const defaultValue = (r: FileFactsReport, v: FileFactsReport['variables']['variables'][number]) => {
  const c = r.variables.collections.find((x) => x.id === v.collectionId);
  return v.values.find((m) => m.mode === c?.defaultMode) ?? v.values[0];
};

const colorObservations = (r: FileFactsReport): Obs[] => {
  const out: Obs[] = [];
  const hintOf = (names: string[]): Obs['hint'] | 'status' => {
    const w = new Set(names.flatMap((n) => [...words(n)]));
    if (has(w, STATUS_WORDS)) return 'status';
    if (has(w, ACCENT_WORDS)) return 'accent';
    if (has(w, PRIMARY_WORDS)) return 'primary';
    return null;
  };
  const push = (hex: unknown, weight: number, names: string[], ev: Omit<Evidence, 'weight' | 'value'>): void => {
    if (typeof hex !== 'string' || !/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(hex)) return;
    if (hex.length === 9 && parseInt(hex.slice(7), 16) < 128) return;   // under half opacity: a tint, not an anchor
    const hint = hintOf(names);
    if (hint === 'status') return;
    const w = has(words(names[0] ?? ''), VARIANT_WORDS) ? weight / 2 : weight;
    out.push({ hex: hex.slice(0, 7), weight: w, hint, ev: { ...ev, value: hex.slice(0, 7), weight: w } });
  };
  for (const v of r.variables.variables) {
    if (v.type !== 'COLOR') continue;
    const m = defaultValue(r, v);
    if (!m) continue;
    push(m.resolved, (m.alias ? 2 : 1) + v.boundLayers, [v.name, ...(m.chain ?? [])], { from: 'variable', name: v.name });
  }
  for (const s of r.styles.paint)
    for (const p of s.paints as { type?: string; color?: string | null }[])
      if (p.type === 'SOLID') push(p.color, 2 + s.layers, [s.name], { from: 'style', name: s.name });
  for (const u of r.usage.paints) {
    const names = u.binding.kind === 'raw' ? [] : [u.binding.name ?? ''];
    push(u.color, u.layers * (ROLE_FACTOR[u.role] ?? 1), names, { from: 'usage', name: `${u.property} on ${u.role}${names[0] ? ` via ${names[0]}` : ''}` });
  }
  return out;
};

type Family = { key: string; hue: number; obs: (Obs & { c: number; h: number })[]; weight: number; primaryHinted: number; accentHinted: number };

/** A color's RAMP: the stepped variable that holds it as a value (`…/primary/650` → `…/primary`), first by name. */
const rampsOf = (r: FileFactsReport): Map<string, string> => {
  const m = new Map<string, string>();
  const steps = r.variables.variables.filter((v) => v.type === 'COLOR' && /\/\d+$/.test(v.name))
    .sort((a, b) => localeFreeCompare(a.name, b.name));
  for (const v of steps) {
    const val = defaultValue(r, v);
    if (val && !val.alias && typeof val.resolved === 'string' && !m.has(val.resolved.slice(0, 7))) m.set(val.resolved.slice(0, 7), v.name.replace(/\/\d+$/, ''));
  }
  return m;
};

const hueFamilies = (obs: Obs[], ramps: Map<string, string>): Family[] => {
  const chromatic = obs.map((o) => ({ ...o, ...(({ c, h }) => ({ c, h: h ?? 0 }))(rgbToOklch(hexToRgb(o.hex))) }))
    .filter((o) => o.c >= 0.05)
    .sort((a, b) => b.weight - a.weight || b.c - a.c || localeFreeCompare(a.hex, b.hex));
  const fams: Family[] = [];
  for (const o of chromatic) {
    const ramp = ramps.get(o.hex);
    const f = ramp ? fams.find((x) => x.key === ramp) : fams.find((x) => hueGap(x.hue, o.h) <= HUE_FAMILY);
    if (f) f.obs.push(o);
    else fams.push({ key: ramp ?? `hue:${fams.length}`, hue: o.h, obs: [o], weight: 0, primaryHinted: 0, accentHinted: 0 });
  }
  for (const f of fams) for (const o of f.obs) {
    f.weight += o.weight;
    if (o.hint === 'primary') f.primaryHinted += o.weight;
    if (o.hint === 'accent') f.accentHinted += o.weight;
  }
  return fams;
};

/** The family's anchor: the color with the most hinted weight, then the most weight, then the most chroma. */
const anchorOf = (f: Family, hint: 'primary' | 'accent'): { hex: string; ev: Evidence[] } => {
  const by = new Map<string, { hinted: number; weight: number; c: number; ev: Evidence[] }>();
  for (const o of f.obs) {
    const e = by.get(o.hex) ?? { hinted: 0, weight: 0, c: o.c, ev: [] };
    e.weight += o.weight;
    if (o.hint === hint) e.hinted += o.weight;
    e.ev.push(o.ev);
    by.set(o.hex, e);
  }
  const [hex, e] = [...by].sort(([ah, a], [bh, b]) => b.hinted - a.hinted || b.weight - a.weight || b.c - a.c || localeFreeCompare(ah, bh))[0];
  return { hex, ev: top(e.ev) };
};

type Colors = { primary: Pick<OKLCH | null>; accent: Pick<OKLCH | null>; obs: Obs[]; pFam: Family | null; aFam: Family | null };
const pickColors = (r: FileFactsReport): Colors => {
  const obs = colorObservations(r);
  const fams = hueFamilies(obs, rampsOf(r));
  const none: Pick<OKLCH | null> = { value: null, confidence: 0, evidence: [] };
  if (!fams.length) return { primary: none, accent: none, obs, pFam: null, aFam: null };
  const pRank = (f: Family) => f.weight + 3 * f.primaryHinted;
  const aRank = (f: Family) => f.weight + 3 * f.accentHinted;
  const byP = [...fams].sort((a, b) => pRank(b) - pRank(a) || a.hue - b.hue);
  const p = byP[0];
  const pa = anchorOf(p, 'primary');
  const pShare = pRank(p) / (pRank(p) + (byP[1] ? pRank(byP[1]) : 0));
  const primary: Pick<OKLCH | null> = { value: oklchOf(pa.hex), confidence: confidence(pShare * (p.primaryHinted > 0 ? 1 : 0.75)), evidence: pa.ev };
  const rest = fams.filter((f) => f !== p && hueGap(f.hue, p.hue) >= HUE_FAMILY && (f.accentHinted > 0 || f.weight >= p.weight / 4))
    .sort((a, b) => aRank(b) - aRank(a) || a.hue - b.hue);
  if (!rest.length) return { primary, accent: none, obs, pFam: p, aFam: null };
  const a = rest[0];
  const aa = anchorOf(a, 'accent');
  const aShare = aRank(a) / (aRank(a) + (rest[1] ? aRank(rest[1]) : 0));
  return { primary, accent: { value: oklchOf(aa.hex), confidence: confidence(aShare * (a.accentHinted > 0 ? 1 : 0.5)), evidence: aa.ev }, obs, pFam: p, aFam: a };
};

/** The palette the main action runs on, by where its rest roles and button fills resolve (the header's rule). */
const pickAction = (r: FileFactsReport, c: Colors): Pick<ActionPalette> => {
  const ramps = rampsOf(r);
  const inFamily = (f: Family | null, hex: string, h: number): boolean => {
    if (!f) return false;
    const ramp = ramps.get(hex);
    if (ramp) return f.key === ramp || f.obs.some((o) => o.hex === hex);
    return f.obs.some((o) => o.hex === hex) || hueGap(f.hue, h) <= HUE_FAMILY;
  };
  const votes: Record<ActionPalette, number> = { primary: 0, accent: 0, neutral: 0 };
  let total = 0;
  const ev: Record<ActionPalette, Evidence[]> = { primary: [], accent: [], neutral: [] };
  const vote = (hex: unknown, weight: number, e: Omit<Evidence, 'value' | 'weight'>): void => {
    if (typeof hex !== 'string' || !/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(hex) || weight <= 0) return;
    if (hex.length === 9 && parseInt(hex.slice(7), 16) < 128) return;
    const h6 = hex.slice(0, 7);
    const m = rgbToOklch(hexToRgb(h6));
    if (m.l > 0.9) return;
    const to: ActionPalette | null = m.c < 0.05 ? 'neutral'
      : inFamily(c.pFam, h6, m.h ?? 0) ? 'primary' : inFamily(c.aFam, h6, m.h ?? 0) ? 'accent' : null;
    total += weight;
    if (!to) return;
    votes[to] += weight;
    ev[to].push({ ...e, value: h6, weight });
  };
  for (const v of r.variables.variables) {
    if (v.type !== 'COLOR') continue;
    const w = words(v.name);
    if (!has(w, ACTION_WORDS) || has(w, ACTION_RANK_WORDS) || has(w, VARIANT_WORDS) || has(w, STATUS_WORDS)) continue;
    const m = defaultValue(r, v);
    if (!m || has(new Set((m.chain ?? []).flatMap((n) => [...words(n)])), STATUS_WORDS)) continue;
    vote(m.resolved, (m.alias ? 2 : 1) + v.boundLayers, { from: 'variable', name: v.name });
  }
  for (const u of r.usage.paints)
    if (u.role === 'button-like' && u.property === 'fill')
      vote(u.color, u.layers, { from: 'usage', name: `fill on button-like${u.binding.kind === 'raw' ? '' : ` via ${u.binding.name ?? ''}`}` });
  if (!total) return { value: 'primary', confidence: 0, evidence: [] };
  const order: ActionPalette[] = ['primary', 'accent', 'neutral'];
  const value = [...order].sort((a, b) => votes[b] - votes[a] || order.indexOf(a) - order.indexOf(b))[0];
  return { value, confidence: confidence(votes[value] / total), evidence: top(ev[value]) };
};

/** The neutral cast from the observed grays (every color variable, style and usage row, status ones included). */
const pickNeutral = (r: FileFactsReport): Pick<{ hue: number; chroma: number }> => {
  const ramps = rampsOf(r);
  const chromaticRamps = new Set([...ramps].filter(([h]) => rgbToOklch(hexToRgb(h)).c >= 0.05).map(([, k]) => k));
  const grays: { c: number; h: number; w: number; ev: Evidence }[] = [];
  const add = (hex: unknown, w: number, ev: Omit<Evidence, 'value' | 'weight'>) => {
    if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/.test(hex) || chromaticRamps.has(ramps.get(hex) ?? '')) return;
    const m = rgbToOklch(hexToRgb(hex));
    if (m.c < 0.05 && m.c >= 0.004 && m.l >= 0.15 && m.l <= 0.95) grays.push({ c: m.c, h: m.h ?? 0, w, ev: { ...ev, value: hex, weight: w } });
  };
  for (const v of r.variables.variables) if (v.type === 'COLOR') add(defaultValue(r, v)?.resolved, 1 + v.boundLayers, { from: 'variable', name: v.name });
  for (const u of r.usage.paints) add(u.color, u.layers, { from: 'usage', name: `${u.property} on ${u.role}` });
  if (!grays.length) return { value: { hue: 0, chroma: 0 }, confidence: 0, evidence: [] };
  let x = 0, y = 0;
  for (const g of grays) { x += g.c * g.w * Math.cos((g.h * Math.PI) / 180); y += g.c * g.w * Math.sin((g.h * Math.PI) / 180); }
  const hue = round((((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360, 1);
  const sorted = [...grays].sort((a, b) => a.c - b.c);
  const total = sorted.reduce((s, g) => s + g.w, 0);
  let acc = 0, chroma = sorted[0].c;
  for (const g of sorted) { acc += g.w; if (acc >= total / 2) { chroma = g.c; break; } }
  return { value: { hue, chroma: round(Math.min(chroma, 0.03), 4) }, confidence: confidence(Math.min(1, grays.length / 10) * 0.5), evidence: top(grays.map((g) => g.ev)) };
};

/* ── families ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

const pickFamilies = (r: FileFactsReport): Pick<Families> => {
  type Tally = { display: number; body: number; code: number; any: number; ev: Evidence[] };
  const t = new Map<string, Tally>();
  const add = (family: unknown, name: string, weight: number, from: Evidence['from']): void => {
    if (typeof family !== 'string' || !family.trim() || ICON_FONT.test(family)) return;
    const w = words(name);
    const e = t.get(family) ?? { display: 0, body: 0, code: 0, any: 0, ev: [] };
    if (has(w, CODE_WORDS) || has(words(family), CODE_WORDS)) e.code += weight;
    else if (has(w, DISPLAY_WORDS)) e.display += weight;
    else if (has(w, BODY_WORDS)) e.body += weight;
    e.any += weight;
    e.ev.push({ from, name, value: family, weight });
    t.set(family, e);
  };
  for (const v of r.variables.variables) {
    if (v.type !== 'STRING' || !(v.scopes.includes('FONT_FAMILY') || words(v.name).has('family'))) continue;
    const m = defaultValue(r, v);
    add(m?.resolved, [v.name, ...(m?.chain ?? [])].join(' '), (m?.alias ? 2 : 1) + v.boundLayers, 'variable');
  }
  for (const s of r.styles.text) add(s.fontFamily, s.name, 1 + s.layers, 'style');
  for (const u of r.usage.typography.fontFamilies) add(u.value, u.binding.kind === 'raw' ? '' : u.binding.name ?? '', u.layers, 'usage');
  const all = [...t].sort(([a], [b]) => localeFreeCompare(a, b));
  if (!all.length) return { value: { display: null, body: null, code: null }, confidence: 0, evidence: [] };
  const best = (k: 'display' | 'body' | 'code', pool = all) => [...pool].filter(([, e]) => e[k] > 0).sort(([, a], [, b]) => b[k] - a[k] || b.any - a.any)[0];
  const share = (k: 'display' | 'body', pool: typeof all, w: string) => {
    const tot = pool.reduce((s, [, e]) => s + e[k], 0);
    return tot ? (pool.find(([f]) => f === w)?.[1][k] ?? 0) / tot : 0;
  };
  const code = best('code');
  const pool = all.filter(([f, e]) => f !== code?.[0] && e.any > e.code);
  const body = best('body', pool) ?? [...pool].sort(([, a], [, b]) => b.any - a.any)[0];
  const display = best('display', pool);
  const bodyName = body?.[0] ?? null;
  const displayName = display?.[0] ?? bodyName;
  // Confidence: each named role's share of its own evidence; a body with no body-named evidence is a guess (0.4).
  const bc = body && body[1].body > 0 ? share('body', pool, body[0]) : 0.4;
  const dc = display ? share('display', pool, display[0]) : bc * 0.5;
  const ev = [...new Set([bodyName, displayName, code?.[0] ?? null])].filter((f): f is string => !!f).flatMap((f) => top(t.get(f)!.ev, 3));
  return { value: { display: displayName, body: bodyName, code: code?.[0] ?? null }, confidence: confidence(Math.min(bc, dc)), evidence: ev };
};

/* ── geometry ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

const floats = (r: FileFactsReport) => r.variables.variables.filter((v) => v.type === 'FLOAT')
  .map((v) => ({ v, w: words(v.name), value: defaultValue(r, v)?.resolved }))
  .filter((x): x is { v: typeof x.v; w: Set<string>; value: number } => typeof x.value === 'number' && Number.isFinite(x.value));
const isMd = (w: Set<string>): boolean => w.has('md') || w.has('medium');
// `height-md` splits to `height md`, so a t-shirt suffix glued to `height` is read either way round.

const pickDensity = (r: FileFactsReport): Pick<Density> => {
  const h = floats(r).filter((x) => x.w.has('height') && isMd(x.w) && !has(x.w, [...CONTROL_WORDS, 'line', 'min']))
    .sort((a, b) => localeFreeCompare(a.v.name, b.v.name))[0];
  const bucket = (px: number): Density => (px <= 38 ? 'compact' : px >= 50 ? 'spacious' : 'comfortable');
  if (h) return { value: bucket(h.value), confidence: 0.7, evidence: [{ from: 'variable', name: h.v.name, value: `${h.value}px`, weight: 1 }] };
  const pads = r.usage.spacing.filter((s) => s.property === 'padding' && typeof s.value === 'number' && s.value > 0)
    .map((s) => ({ px: s.value as number, w: s.layers })).sort((a, b) => a.px - b.px);
  const total = pads.reduce((s, p) => s + p.w, 0);
  if (!total) return { value: 'comfortable', confidence: 0, evidence: [] };
  let acc = 0, median = pads[0].px;
  for (const p of pads) { acc += p.w; if (acc >= total / 2) { median = p.px; break; } }
  const value: Density = median < 8 ? 'compact' : median > 20 ? 'spacious' : 'comfortable';
  return { value, confidence: 0.35, evidence: [{ from: 'usage', name: 'median padding', value: `${median}px`, weight: total }] };
};

const pickRadius = (r: FileFactsReport): Pick<number> => {
  const corners = floats(r).filter((x) => x.v.scopes.includes('CORNER_RADIUS') || has(x.w, ['radius', 'corner', 'rounded']))
    .sort((a, b) => localeFreeCompare(a.v.name, b.v.name));
  const scale = (px: number) => Math.min(2, Math.max(0, Math.round((px / 4) * 4) / 4));
  const ev = (x: (typeof corners)[number]): Evidence[] => [{ from: 'variable', name: x.v.name, value: `${x.value}px`, weight: 1 }];
  const corners2 = corners.filter((x) => !has(x.w, CONTROL_WORDS));
  const control = corners2.find((x) => has(x.w, ['button', 'field', 'input']) && !has(x.w, ['pill', 'round', 'full']));
  if (control) return { value: scale(control.value), confidence: 0.8, evidence: ev(control) };
  const md = corners2.find((x) => isMd(x.w) && !has(x.w, ['container', 'card']));
  if (md) return { value: scale(md.value), confidence: 0.7, evidence: ev(md) };
  const sm = corners2.find((x) => (x.w.has('sm') || x.w.has('small')) && !has(x.w, ['container', 'card']));
  if (sm) return { value: scale(sm.value * 2), confidence: 0.5, evidence: ev(sm) };
  const used = r.usage.radii.filter((u) => u.value >= 1 && u.value <= 32)
    .sort((a, b) => b.layers - a.layers || a.value - b.value);
  if (used.length) {
    const tot = used.reduce((s, u) => s + u.layers, 0);
    return { value: scale(used[0].value), confidence: confidence(0.5 * (used[0].layers / tot)),
      evidence: used.slice(0, 3).map((u) => ({ from: 'usage' as const, name: 'corner radius', value: `${u.value}px`, weight: u.layers })) };
  }
  return { value: 1, confidence: 0, evidence: [] };
};

/* ── the seed ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

export const seedFromFacts = (report: FileFactsReport, id = 'seed'): FileSeed => {
  const colors = pickColors(report);
  const { primary, accent } = colors;
  const actionPalette = pickAction(report, colors);
  const neutral = pickNeutral(report);
  const families = pickFamilies(report);
  const density = pickDensity(report);
  const radiusScale = pickRadius(report);
  const f = families.value;
  const fam: Record<string, string> = {};
  if (f.display) { fam.display = f.display; fam.title = f.display; }
  if (f.body) { fam.body = f.body; fam.label = f.body; fam.caption = f.body; }
  if (f.code) fam.code = f.code;
  const input: BrandInput = {
    id,
    // A file with no chromatic color still needs an anchor; the engine's own default probe hue stands in, at
    // confidence 0, so the reviewer sees there was nothing to read.
    primary: primary.value ?? { l: 0.55, c: 0.15, h: 262 },
    neutral: neutral.value,
    ...(accent.value ? { brandColors: [{ name: 'accent', oklch: accent.value }] } : {}),
    ...(actionPalette.value !== 'primary' ? { actionPalette: actionPalette.value } : {}),
    density: density.value,
    radiusScale: radiusScale.value,
    ...(Object.keys(fam).length ? { typography: { families: fam } } : {}),
  } as BrandInput;
  return {
    format: FILE_SEED_FORMAT, rule: SEED_RULE, factsFormat: report.format,
    picks: { primary, accent, families, density, radiusScale, actionPalette, neutral }, input,
  };
};

/** The seed as a `design.md`: the input as frontmatter, the confidence and evidence of each pick as the prose. */
export const seedDesignMd = (seed: FileSeed): string => {
  const line = (k: string, p: Pick<unknown>) =>
    `- ${k}: confidence ${p.confidence}${p.evidence.length ? `; ${p.evidence.map((e) => `${e.from} ${e.name} = ${e.value}`).join('; ')}` : '; no evidence, engine default'}`;
  const prose = [`Seeded from a file facts report (${seed.factsFormat}) by ${seed.rule}. Each pick, its confidence and its evidence:`, '',
    ...Object.entries(seed.picks).map(([k, p]) => line(k, p))].join('\n');
  return toDesignMd(seed.input, prose);
};
