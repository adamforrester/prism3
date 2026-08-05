/**
 * Prism3 engine — reader for the STANDARD `design.md` interchange format.
 *
 * The engine's front door for a `design.md` authored by `brand-skills` (the
 * extractor) following the open `google-labs-code/design.md` spec — a DIFFERENT
 * shape from the engine's own `BrandInput` frontmatter that `design-md.ts` parses.
 * `cli.ts` auto-detects this dialect and routes to it (docs/07 §11). The standard
 * file carries RESOLVED, observed values:
 *   - `colors`     — a FLAT map of token-name → sRGB hex ("#C8102E")
 *   - `typography` — a map of token-name → { fontFamily, fontSize, fontWeight, … }
 *   - `rounded` / `spacing` / `elevation` — flat maps of resolved dimensions/CSS
 *   - `name` / `version` — brand identity
 * plus `##` prose sections the spec leaves human-authored.
 *
 * `parseStandardDesignMd` reads the file into a typed `StandardDesignMd`;
 * `standardToBrandInput` then runs the colour-role classifier (`classify-colors.ts`),
 * derives the type families, and applies the optional `x-prism3` levers to produce a
 * `BrandInput`. It reuses `parseYamlSubset` from `design-md.ts` (the YAML-subset
 * parser is format-agnostic), so this is a shape mapper, not a second parser.
 */
import { parseYamlSubset } from './design-md';
import { BrandInput } from './theme';
import { resolveStop } from './vocabulary';
import { classifyColors, ColorClassification } from './classify-colors';

export type StandardTypeToken = {
  fontFamily?: string;
  fontSize?: string;                    // "94px", "1rem" — resolved dimension string
  fontWeight?: number;
  lineHeight?: number | string;         // 1.19 (unitless × fontSize) or "24px"
  letterSpacing?: string;               // "-0.5px", "-0.02em"
  fontFeature?: string;
  fontVariation?: string;
};

export type StandardDesignMd = {
  name: string;
  version?: string;
  colors: Record<string, string>;                    // token → hex
  typography: Record<string, StandardTypeToken>;     // token → type object
  rounded: Record<string, string | number>;          // token → px string / 0
  spacing: Record<string, string | number>;
  elevation: Record<string, string>;                 // token → CSS box-shadow / "none"
  /** Optional Prism3 engine-levers block (docs/07 §11.4). A namespaced extension
   *  the base spec ignores; brand-skills emits it verbatim from surfaces.md. Empty
   *  when absent — a plain spec file then compiles on engine defaults. */
  xPrism3: Record<string, unknown>;
  prose: string;
};

/** Split the `---`-fenced YAML frontmatter from the trailing prose. Mirrors the
 *  fence handling in `design-md.ts` (kept local so the shipped parser is
 *  untouched). Throws if the opening/closing fence is missing. */
const splitFrontmatter = (text: string): { fm: string; prose: string } => {
  const nl = text.indexOf('\n');
  const firstLine = (nl < 0 ? text : text.slice(0, nl)).trim();
  if (firstLine !== '---') {
    throw new Error("standard design.md must open with a '---' YAML frontmatter fence on the first line");
  }
  const rest = text.slice(nl + 1);
  const close = rest.indexOf('\n---');
  if (close < 0) throw new Error("standard design.md frontmatter is not closed with a '---' line");
  const fm = rest.slice(0, close);
  const afterFence = rest.slice(close + 4);
  const proseStart = afterFence.indexOf('\n');
  const prose = (proseStart < 0 ? '' : afterFence.slice(proseStart + 1)).trim();
  return { fm, prose };
};

const asRecord = (v: unknown): Record<string, any> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {};

/** Parse a standard `design.md` (brand-skills / google-labs format) into a typed
 *  `StandardDesignMd`. Values are read verbatim — no coercion, no classification. */
export const parseStandardDesignMd = (text: string): StandardDesignMd => {
  const { fm, prose } = splitFrontmatter(text);
  const raw = parseYamlSubset(fm);
  const colorsRaw = asRecord(raw.colors);
  const colors: Record<string, string> = {};
  for (const [k, v] of Object.entries(colorsRaw)) {
    // L-15: an unquoted `#hex` value is read as a YAML comment and stripped to null, which
    // would surface downstream as a baffling `invalid hex 'null'`. Point at the real cause.
    if (v == null || v === '')
      throw new Error(`colour '${k}' has no value — a bare '#hex' is read as a comment; quote it, e.g. ${k}: "#3366ff"`);
    colors[k] = String(v);
  }
  return {
    name: raw.name != null ? String(raw.name) : 'brand',
    version: raw.version != null ? String(raw.version) : undefined,
    colors,
    typography: asRecord(raw.typography) as Record<string, StandardTypeToken>,
    rounded: asRecord(raw.rounded),
    spacing: asRecord(raw.spacing),
    elevation: asRecord(raw.elevation) as Record<string, string>,
    xPrism3: asRecord(raw['x-prism3']),
    prose,
  };
};

// --- standard design.md → BrandInput -----------------------------------------
// The full conversion the CLI (and the fidelity report) run: classify the flat
// colours into anchors, derive the type families, and apply the optional x-prism3
// levers. Pure; the caller owns validation + emit.

/** Slug a brand `name` into an emit id (`Wendy's` → `wendys`, `Acme Corp` →
 *  `acme-corp`). The standard format carries no `id`; the engine needs one. */
export const idFromName = (name: string): string =>
  name.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'brand';

/** Which face each Prism3 CATEGORY draws from, read off a standard spec's per-token `fontFamily`.
 *
 *  A standard spec names its own typesets (`mega`, `button`, `paragraph`…), not Prism3 categories, so
 *  this stays a two-bucket read — headings vs running text — and then fans each bucket onto the
 *  categories it covers. Before #415 those two buckets WERE the output shape (the `display`/`text`
 *  family roles); the fan-out is the same mapping the engine used to apply downstream, moved here now
 *  that categories bind faces directly. The heading face falls back to the text face, which is what
 *  keeps a spec that only styles body copy from jumping to the engine's default face. */
export const deriveFamilies = (typography: StandardDesignMd['typography']): Record<string, string> => {
  const firstFamilyFor = (pred: (name: string) => boolean): string | undefined => {
    for (const [name, tok] of Object.entries(typography)) if (pred(name.toLowerCase()) && tok.fontFamily) return tok.fontFamily;
    return undefined;
  };
  const text = firstFamilyFor((n) => /^(body|caption|paragraph)/.test(n));
  const heading = firstFamilyFor((n) => /^(mega|display|title|button|label|eyebrow)/.test(n)) ?? text;
  const out: Record<string, string> = {};
  for (const g of ['display', 'title', 'label', 'eyebrow']) if (heading) out[g] = heading;
  for (const g of ['body', 'caption']) if (text) out[g] = text;
  // `code` is deliberately unset: a standard spec rarely declares a mono face, and an unset category
  // takes the engine default — the same outcome the mono role had.
  return out;
};

/** Map the optional namespaced `x-prism3` block (docs/07 §11.4) onto a BrandInput.
 *  Mutates `input`; returns the human-readable list of levers applied. An absent
 *  block applies nothing → the engine runs on defaults (the plain-spec guarantee).
 *  Passed through as-is; the engine's schema validates the values. */
export const applyXPrism3 = (input: BrandInput, x: Record<string, unknown>): string[] => {
  const applied: string[] = [];
  if (x.radiusScale != null) {
    // Routed through the SHARED `resolveStop` so this dialect accepts exactly what the engine-native
    // one does — a number, or a named stop (#471).
    //
    // It previously called `Number()` and rejected anything non-numeric, with an error message that
    // named `soft` as the invalid example. That was correct when written and wrong the moment #471
    // made `radiusScale: 'soft'` legal natively: the two front doors disagreed about the same lever,
    // and a brief written against the engine's own documentation failed at the standard-dialect
    // ingest. `vocabulary.ts` records the schema-vs-engine version of this trap; this is the same
    // shape one level up — DIALECT vs DIALECT — and the fix is the same, a single shared resolver
    // rather than two parallel implementations that agree only by attention.
    //
    // The M-14 guard it replaces is preserved BY the resolver: a stop name resolves, a number passes
    // through, and anything else throws naming the valid stops. The finite check stays because
    // `resolveStop` returns a number unexamined, and a NaN would otherwise reach the radius ramp.
    const rs = resolveStop('radiusScale', x.radiusScale);
    if (!Number.isFinite(rs)) throw new Error(`x-prism3.radiusScale must be a finite number or a named stop, got ${JSON.stringify(x.radiusScale)}`);
    input.radiusScale = rs; applied.push(`radiusScale=${rs}`);
  }
  // The vocabulary's headline affordance (#471), and the dialect that needs it MOST: a brand-skills
  // brief is precisely the "I have prose, not numbers" case `personality` was built for. It was
  // dropped silently here — no passthrough at all — which is the exact failure mode #471 existed to
  // eliminate. Passed through verbatim; `brandTheme` resolves it and logs every inference, and the
  // schema's closed enum rejects an unknown trait before it gets this far.
  if (x.personality != null) {
    (input as { personality?: unknown }).personality = x.personality;
    applied.push(`personality=[${Array.isArray(x.personality) ? x.personality.join(', ') : String(x.personality)}]`);
  }
  if (x.typeScale != null) { input.typography = { ...input.typography, typeScale: x.typeScale as any }; applied.push(`typeScale=${x.typeScale}`); }
  if (x.density != null) { input.density = x.density as any; applied.push(`density=${x.density}`); }
  if (x.motionTempo != null) { input.motionPersonality = { tempo: x.motionTempo as any }; applied.push(`motionTempo=${x.motionTempo}`); }
  if (x.actionPalette != null) { input.actionPalette = String(x.actionPalette); applied.push(`actionPalette=${x.actionPalette}`); }
  if (x.iconContrast != null) { input.iconContrast = x.iconContrast as any; applied.push(`iconContrast=${x.iconContrast}`); }
  if (x.surfaces != null) { input.surfaces = x.surfaces as any; applied.push('surfaces'); }
  if (x.gradients != null) { input.gradients = x.gradients as any; applied.push('gradients'); }
  return applied;
};

export type StandardConversion = { input: BrandInput; classification: ColorClassification; xApplied: string[] };

/** Convert a parsed standard `design.md` into a `BrandInput` (+ the classification
 *  and applied levers, for reporting). `id` overrides the name-derived slug. */
export const standardToBrandInput = (std: StandardDesignMd, id?: string): StandardConversion => {
  const classification = classifyColors(std.colors);
  const input: BrandInput = {
    id: id ?? idFromName(std.name),
    primary: classification.input.primary,
    neutral: classification.input.neutral,
    brandColors: classification.input.brandColors,
    status: classification.input.status,
    typography: { families: deriveFamilies(std.typography) },   // typeScale via x-prism3 or engine default
  };
  const xApplied = Object.keys(std.xPrism3).length ? applyXPrism3(input, std.xPrism3) : [];
  return { input, classification, xApplied };
};
