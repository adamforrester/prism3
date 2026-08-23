/**
 * COMPARISON — prism3's own DTCG emission vs TokenPress's, over the SAME brand.
 *
 *   npx tsx tools/exporter-comparison/compare.ts            # nb + aurora
 *   npx tsx tools/exporter-comparison/compare.ts nb          # one brand
 *   npx tsx tools/exporter-comparison/compare.ts --json      # machine-readable
 *
 * WHAT THIS ANSWERS. #697's Verify section asks for a comparison that "does not exist today and is
 * the only thing that would catch the two implementations drifting": theme a brand, export both ways,
 * diff the trees. This runs it. Neither exporter is modified — prism3's output is read from the
 * committed `out/`, TokenPress's is produced by its real `TokenExporter` over adapted input
 * (`adapt-figma-emission.ts` and `run-tokenpress.ts`, whose five workarounds are findings in their
 * own right and are printed with the result).
 *
 * THE DELIVERABLE IS THE CLASSIFICATION, NOT THE DIFF. A raw diff of two 500-token trees is noise.
 * Every difference is sorted into one of five categories, and each category is marked EXPECTED (a
 * consequence of a decision already recorded in #609/#696/#697) or SURPRISING (not predicted by any
 * of them — the actual finding). The categories are the task's:
 *
 *   1. PATHS      — present in one tree and not the other, both directions
 *   2. TYPES      — same path, different `$type`
 *   3. VALUES     — same path and type, different value, with float32 called out separately
 *   4. STRUCTURE  — file/directory layout, and how three mode axes land against one
 *   5. BUCKET (C) — the settings #703 predicted "range from inert to destructive", observed firing
 *
 * ── WHAT THIS IS NOT ────────────────────────────────────────────────────────────────────────────
 *
 * NOT A GATE — THIS FILE REPORTS AND ALWAYS EXITS 0. A gate asserts a difference is WRONG; most
 * categories here are a difference that is RIGHT for its host (#697: "the two representations
 * disagree by design, and each is right for its host"), so failing a build on the whole report would
 * be reporting a decision nobody has made.
 *
 * The assertable SUBSET is now a gate, and it lives next door in `gate.ts` — types, unpaired paths,
 * float32 leaks and the opacity scale, i.e. the arms where a disagreement means one exporter is
 * wrong rather than different. `gate.ts` imports `analyze` from here, so there is ONE measurement
 * path and the gate cannot drift from what this prints. What it deliberately does not import is
 * `VERDICTS`: those are authored prose selected by a predicate, and three of them were silently
 * wrong for weeks (#729) — a gate keyed on a verdict printing would inherit every proxy in them.
 * Categories 3–5 stay reporting-only until #697's byte-for-byte question is answered.
 *
 * NOT A COMPARISON OF EQUALS ON PATHS. prism3's root is a brand namespace (`nbds`, `prism`);
 * TokenPress's is whatever `options.namespace` says, and the default is none. So paths are compared
 * with each side's own root stripped — comparing `nbds.color.x` against `color.x` as different paths
 * would produce a 100%-difference report that says nothing. The root difference is itself reported,
 * once, under STRUCTURE.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptBrand, assertAdaptable, type Adapted } from './adapt-figma-emission.ts';
import { runTokenPress, DEFAULT_DTCG_OPTIONS, type TokenPressOutput } from './run-tokenpress.ts';
import {
  AXIS_MODEL,
  absentFromProjection,
  STYLE_AXIS_AS_NAME,
  axesRepresentedIn,
  censusFromEmission,
  classifyCollections,
  type Axis,
  type AxisClassification,
} from './axes.ts';

const OUT = 'packages/engine/out';
const BRANDS_DEFAULT = ['nb', 'aurora'];

// ---- flattening both sides to comparable path -> leaf maps --------------------------------------

type Leaf = { path: string; type: string; value: unknown; description?: string };

/** Walks a DTCG tree to its `$value`-bearing leaves.
 *
 *  `stripKey` drops ONE named top-level key — the brand namespace — so the two sides' paths are
 *  commensurable (see the header). It takes a NAME, never "the only key there is": TokenPress's
 *  per-collection files often have exactly one top-level group (`dark/color.json` -> `color`), and
 *  stripping that would delete a real path segment on one side only. That mistake made the first run
 *  of this harness report 2.5% shared paths, which measured the normalizer rather than the exporters. */
const leaves = (tree: unknown, stripKey?: string): Map<string, Leaf> => {
  const out = new Map<string, Leaf>();
  const walk = (node: unknown, path: string[]): void => {
    if (!node || typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    if ('$value' in o) {
      const p = path.join('.');
      out.set(p, {
        path: p,
        type: String(o.$type ?? ''),
        value: o.$value,
        description: typeof o.$description === 'string' ? o.$description : undefined,
      });
      return;
    }
    for (const k of Object.keys(o)) {
      if (k.startsWith('$')) continue;
      walk(o[k], [...path, k]);
    }
  };

  let root: unknown = tree;
  if (stripKey && tree && typeof tree === 'object' && stripKey in (tree as object)) {
    root = (tree as Record<string, unknown>)[stripKey];
  }
  walk(root, []);
  return out;
};

/** prism3's side: the CONFORMING PROJECTION (`base` + per-mode `overlay`), because that is the shape
 *  a stock consumer reads (#609) and therefore the honest thing to compare a consumer-facing export
 *  against. The canonical `<brand>.tokens.json` carries per-mode values under
 *  `$extensions.prism3.modes`, which a conforming reader ignores entirely. */
const readPrism3 = (brand: string) => {
  const base = JSON.parse(readFileSync(join(OUT, `${brand}.base.tokens.json`), 'utf8'));
  // The brand namespace is prism3's configurable root (`nbds`, `prism`) — the one key that must come
  // off for the comparison to mean anything, and the only one that may.
  const rootKey =
    Object.keys(base as Record<string, unknown>).filter((k) => !k.startsWith('$'))[0] ?? '';
  const overlays = new Map<string, Map<string, Leaf>>();
  for (const mode of ['dark', 'hc-dark', 'hc-light']) {
    const f = join(OUT, `${brand}.${mode}.overlay.tokens.json`);
    if (existsSync(f)) overlays.set(mode, leaves(JSON.parse(readFileSync(f, 'utf8')), rootKey));
  }
  const canonical = JSON.parse(readFileSync(join(OUT, `${brand}.tokens.json`), 'utf8'));
  return { base: leaves(base, rootKey), overlays, canonical, rootKey };
};

/** TokenPress's side: one flat path map, unioned across every ZIP entry. Two entries CAN claim the
 *  same path — that is what per-mode files are — so the collisions are counted, because a
 *  same-path-different-value collision across mode directories is exactly what a consumer merging
 *  the ZIP would hit.
 *
 *  WHICH file wins the union matters, and cannot be decided by iteration order. prism3's `base`
 *  projection is the LIGHT appearance and the DESKTOP type-set (measured: 163/163 of `color.light`'s
 *  variables agree with base, against 14/163 for dark). TokenPress's own per-mode files are equal
 *  peers with no default marked — so the harness names the modes that correspond to base, and says
 *  so. Letting ZIP order pick instead made `dark/color.json` win and reported all 228 color aliases
 *  as differences, which measured the adapter's alphabetical mode sort, not the exporters.
 *
 *  THIS SET USED TO BE HAND-WRITTEN — `new Set(['light', 'desktop', 'shared'])` — with a comment
 *  saying that having to supply the correspondence by hand "is #697's three-axis problem exactly".
 *  It was, and #697 is now decided: the correspondence is DERIVED from the axis declaration
 *  (`axes.ts`), by asking each collection's axis which of its members the `base` projection carries.
 *  The three names it produces are the same three, which is the point — the decision had to reproduce
 *  the measured behavior before it could be trusted to extend it. What changed is that a brand adding
 *  a mode-varying collection now gets the right answer from the declaration instead of a set that
 *  silently omits it. */
const unionTokenPress = (out: TokenPressOutput, baseDirs: Set<string>) => {
  const union = new Map<string, Leaf>();
  const perFile = new Map<string, Map<string, Leaf>>();
  /** `divergent` distinguishes a real resolution hazard (the files disagree, so merge order decides
   *  the value) from harmless redundancy (every file agrees). Both are collisions; only the first is
   *  what the category-4 verdict claims. */
  const collisions: { path: string; files: string[]; divergent: boolean }[] = [];
  const owner = new Map<string, string[]>();

  const dirOf = (p: string) => (p.includes('/') ? p.split('/')[0] : 'shared');
  // Base-equivalent modes first, so they win the union; everything else still contributes paths.
  const ordered = [...out.order].sort(
    (a, b) => Number(baseDirs.has(dirOf(b))) - Number(baseDirs.has(dirOf(a)))
  );

  for (const path of ordered) {
    // No key stripped: TokenPress adds a root only when `options.namespace` is set, and the default
    // DTCG options this harness runs under do not set one.
    const l = leaves(out.files.get(path));
    perFile.set(path, l);
    for (const [p, leaf] of l) {
      owner.set(p, [...(owner.get(p) ?? []), path]);
      if (!union.has(p)) union.set(p, leaf);
    }
  }
  for (const [p, files] of owner) {
    if (files.length <= 1) continue;
    const seen = new Set(files.map((f) => canon(perFile.get(f)?.get(p)?.value)));
    collisions.push({ path: p, files, divergent: seen.size > 1 });
  }
  return { union, perFile, collisions };
};

// ---- category 3: value comparison, with float32 isolated ---------------------------------------

/** #703's float32 question, made decidable.
 *
 *  prism3's Figma emission applies `Math.fround` DELIBERATELY (`emit-figma-color.ts:152`), modeling
 *  Figma's 32-bit storage, so the artifact really is in this harness's input. TokenPress then applies
 *  `roundToPrecision(v, 10_000)` at the formatter boundary. So the whole pipeline for a channel
 *  authored as the 8-bit value `i` is: `i/255` -> `Math.fround` -> round to 4dp.
 *
 *  `pipelineImage` computes exactly that. A difference it explains is ATTRIBUTABLE TO THE FLOAT32
 *  CLEANUP and reported separately, as the task asks; a difference it does not explain is a genuine
 *  value disagreement. Testing only `Math.fround(x) === y` (the first version of this) explained none
 *  of nb's 111 color differences, because the artifact is never visible in isolation — it is always
 *  composed with the 4dp rounding that follows it. */
const isFloat32Image = (x: number, y: number): boolean =>
  x !== y && (Math.fround(y) === x || Math.fround(x) === y);

const FOUR_DP = 10_000;
const pipelineImage = (authored: number): number =>
  Math.round(Math.fround(authored) * FOUR_DP) / FOUR_DP;

/** Does the cleanup LOSE anything? For an 8-bit-authored channel the question is whether the 4dp
 *  value still names the same 0–255 step. If it does, the cleanup is lossless for this corpus and
 *  #703's "silent lossy rewrite" concern does not fire here; if it does not, that is the defect. */
const roundTripsTo8Bit = (authored8Bit: number): boolean =>
  Math.round(pipelineImage(authored8Bit / 255) * 255) === authored8Bit;

const num = (v: unknown): number | null => {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && typeof (v as { value?: unknown }).value === 'number') {
    return (v as { value: number }).value;
  }
  return null;
};

/** Extracts every number in a value, in a stable order, for float32 comparison of composites. */
const numbersIn = (v: unknown, acc: number[] = []): number[] => {
  if (typeof v === 'number') acc.push(v);
  else if (Array.isArray(v)) v.forEach((x) => numbersIn(x, acc));
  else if (v && typeof v === 'object') {
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      numbersIn((v as Record<string, unknown>)[k], acc);
    }
  }
  return acc;
};

const canon = (v: unknown): string => JSON.stringify(v);

export type ValueDiff = {
  path: string;
  type: string;
  prism3: unknown;
  tokenpress: unknown;
  kind:
    | 'alias-target'
    | 'alias-vs-literal'
    | 'literal-vs-alias'
    | 'serialization-only'
    | 'unit'
    | 'scale'
    | 'hex-alpha-quantization'
    | 'shape'
    | 'numeric';
  float32: 'repair' | 'leak' | null;
  /** Human-readable reason, filled for the categories that need one. */
  why?: string;
};

const isAlias = (v: unknown) => typeof v === 'string' && /^\{.+\}$/.test(v);

/** Strips the brand namespace from an alias so `{nbds.palette.white}` and `{palette.white}` compare
 *  as the same target. The namespace absence is a STRUCTURE finding reported once, not 228 times. */
const aliasTarget = (v: string, rootKey: string): string =>
  v.replace(/^\{/, '').replace(/\}$/, '').replace(new RegExp(`^${rootKey}\\.`), '');

/** Normalizes a DTCG value to a comparable semantic form, so that "the same value written two ways"
 *  stops masquerading as a value difference.
 *
 *  This exists because the first version of this classifier put 189 of nb's 441 value differences in a
 *  "shape" bucket — `"rgb(242, 213, 211)"` against `{colorSpace:'srgb',components:[0.949,…]}` — and
 *  never compared the numbers inside. That hid the float32 question entirely, reporting 0 of it in
 *  either direction. Serialization and value have to be separated to answer that at all.
 *
 *  Returns `{ n: number[], unit?: string }`: the numbers in canonical order, plus a unit if the
 *  serialization carried one. */
const semantic = (
  type: string,
  v: unknown
): { n: number[]; unit?: string; str?: string } | null => {
  if (type === 'color' && typeof v === 'string') {
    // prism3 emits EITHER `rgb()/rgba()` OR hex, per the brand's own `colorFormat` lever: nb uses
    // rgb() for all 122 of its literal colors, aurora hex for all 162. Both must be parsed, or the
    // comparison silently reports one brand's every color as a difference — which is precisely what
    // running this on one brand alone would have concluded.
    const h = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(v.trim());
    if (h) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16));
      const alpha = h[2] === undefined ? 1 : parseInt(h[2], 16) / 255;
      return { n: [r / 255, g / 255, b / 255, alpha] };
    }
    const m = /^rgba?\(([^)]+)\)$/.exec(v.trim());
    if (m) {
      const parts = m[1].split(',').map((x) => Number(x.trim()));
      if (parts.every((x) => Number.isFinite(x))) {
        // prism3 writes 8-bit channels; normalize to the 0–1 fraction TokenPress uses.
        const [r, g, b, alpha] = parts;
        return { n: [r / 255, g / 255, b / 255, alpha ?? 1] };
      }
    }
    return null;
  }
  if (type === 'color' && v && typeof v === 'object') {
    const o = v as { components?: number[]; alpha?: number };
    if (Array.isArray(o.components)) return { n: [...o.components, o.alpha ?? 1] };
    return null;
  }
  if (type === 'number' && typeof v === 'number') return { n: [v] };
  if (type === 'shadow') {
    // DTCG permits a single shadow object OR an array of them. prism3 always writes an array;
    // TokenPress writes a bare object for a single layer. Normalize to a layer list so the
    // COUNT and the VALUES can be compared independently of that choice — the choice itself is
    // reported as its own finding.
    const layers = Array.isArray(v) ? v : [v];
    const n: number[] = [];
    for (const layer of layers) {
      const o = (layer ?? {}) as Record<string, unknown>;
      const c = semantic('color', o.color);
      n.push(...(c?.n ?? []));
      for (const k of ['offsetX', 'offsetY', 'blur', 'spread']) {
        const d = semantic('dimension', o[k]);
        n.push(...(d?.n ?? []));
      }
    }
    return { n, str: `${layers.length} layer(s)` };
  }
  if (type === 'dimension' || type === 'duration') {
    if (typeof v === 'string') {
      const m = /^(-?[\d.]+)([a-z%]*)$/.exec(v.trim());
      if (m) return { n: [Number(m[1])], unit: m[2] || undefined };
      return null;
    }
    if (v && typeof v === 'object') {
      const o = v as { value?: number; unit?: string };
      if (typeof o.value === 'number') return { n: [o.value], unit: o.unit };
    }
    return null;
  }
  return null;
};

const REM_MULTIPLIER = 16;

const classifyValue = (
  path: string,
  type: string,
  p: unknown,
  t: unknown,
  rootKey: string
): ValueDiff | null => {
  if (canon(p) === canon(t)) return null;

  const pa = isAlias(p);
  const ta = isAlias(t);

  if (pa && ta) {
    // Same target modulo the namespace? Then this is not a value difference at all.
    if (aliasTarget(p as string, rootKey) === aliasTarget(t as string, rootKey)) return null;
    return {
      path,
      type,
      prism3: p,
      tokenpress: t,
      kind: 'alias-target',
      float32: null,
      why: 'both are aliases, but to DIFFERENT tokens',
    };
  }
  if (pa || ta) {
    return {
      path,
      type,
      prism3: p,
      tokenpress: t,
      kind: pa ? 'alias-vs-literal' : 'literal-vs-alias',
      float32: null,
      why: pa
        ? 'prism3 keeps the reference; tokenpress inlined the resolved value'
        : 'prism3 inlined the value; tokenpress kept a reference',
    };
  }

  // Both literal. Try a semantic comparison before calling it a shape difference.
  const ps = semantic(type, p);
  const ts = semantic(type, t);
  if (ps && ts && ps.n.length === ts.n.length) {
    const differing = ps.n.map((x, i) => [x, ts.n[i]] as const).filter(([x, y]) => x !== y);

    // Unit mismatch that is a pure rem<->px restatement of the SAME length.
    if (ps.unit !== ts.unit) {
      const toPx = (s: { n: number[]; unit?: string }) =>
        s.unit === 'rem' ? s.n[0] * REM_MULTIPLIER : s.n[0];
      if (toPx(ps) === toPx(ts)) {
        return {
          path,
          type,
          prism3: p,
          tokenpress: t,
          kind: 'unit',
          float32: null,
          why: `same length, different unit (${ps.unit ?? 'none'} vs ${ts.unit ?? 'none'}) — equal at ${REM_MULTIPLIER}px/rem`,
        };
      }
      return {
        path,
        type,
        prism3: p,
        tokenpress: t,
        kind: 'unit',
        float32: null,
        why: `different unit AND different length (${ps.unit ?? 'none'} vs ${ts.unit ?? 'none'})`,
      };
    }

    if (!differing.length) {
      const arrayness =
        type === 'shadow' && Array.isArray(p) !== Array.isArray(t)
          ? ' — and one side wraps a single shadow in an array while the other does not (DTCG permits both)'
          : '';
      return {
        path,
        type,
        prism3: p,
        tokenpress: t,
        kind: 'serialization-only',
        float32: null,
        why: `identical value, different serialization${arrayness}`,
      };
    }

    // A constant ratio across every channel is a SCALE difference (a unit convention), not noise.
    const ratios = [
      ...new Set(
        differing.map(([x, y]) => (x === 0 ? null : Math.round((y / x) * 1e6) / 1e6)).filter((r) => r !== null)
      ),
    ];
    if (ratios.length === 1 && ratios[0] !== 1 && Number.isInteger(ratios[0] as number)) {
      return {
        path,
        type,
        prism3: p,
        tokenpress: t,
        kind: 'scale',
        float32: null,
        why: `tokenpress value is ${ratios[0]}x prism3's on every channel — a unit-convention difference, not rounding`,
      };
    }

    // ORDER MATTERS HERE, and the two tests below overlap. For a channel authored as an 8-bit value
    // BOTH explanations fit — `pipelineImage(i/255) === y` and `round(y*255)/255 === i/255` — because
    // the float32 pipeline preserves the byte exactly (measured: all 256 do). So the more specific
    // explanation must be tried first, or every color difference gets blamed on prism3's hex format,
    // including nb's, which does not use hex at all. Reversing these two blocks reattributed 100 of
    // nb's differences to the wrong exporter with no other visible change to the output.
    //
    // (1) Is every differing channel exactly what fround-then-4dp does to prism3's authored value?
    // Then the difference is entirely the float32 cleanup, and the only remaining question is
    // whether it lost information — for 8-bit-authored color: does it still name the same step?
    if (differing.every(([x, y]) => pipelineImage(x) === y)) {
      const lossy =
        type === 'color' &&
        differing.some(([x]) => {
          const step = Math.round(x * 255);
          return Math.abs(step - x * 255) < 1e-6 && !roundTripsTo8Bit(step);
        });
      return {
        path,
        type,
        prism3: p,
        tokenpress: t,
        kind: 'numeric',
        float32: lossy ? 'leak' : 'repair',
        why: lossy
          ? 'float32 cleanup changed which 8-bit step the channel names — LOSSY'
          : 'entirely the float32 cleanup (fround then 4dp); every channel still names the same authored value',
      };
    }
    if (differing.every(([x, y]) => isFloat32Image(x, y))) {
      const [x, y] = differing[0];
      return {
        path,
        type,
        prism3: p,
        tokenpress: t,
        kind: 'numeric',
        float32: Math.fround(y) === x ? 'repair' : 'leak',
        why: 'differs by the bare float32 image, with no rounding applied',
      };
    }

    // (2) Only now: is every differing channel the hex-BYTE image of tokenpress's value? Then
    // prism3's OWN hex serialization quantized it and tokenpress carries the more precise number.
    // Real and brand-conditional: aurora's hex `colorFormat` writes shadow alpha 0.1 as the byte
    // `1a` = 26/255 = 0.10196…, while nb's `rgb()` writes `0.1` exactly. Calling this "noise" would
    // blame the wrong exporter — the lossy step here is prism3's.
    const byteImage = (y: number) => Math.round(y * 255) / 255;
    if (differing.every(([x, y]) => Math.abs(byteImage(y) - x) < 1e-9)) {
      return {
        path,
        type,
        prism3: p,
        tokenpress: t,
        kind: 'hex-alpha-quantization',
        float32: null,
        why: "prism3's hex serialization rounded the channel to an 8-bit byte; tokenpress kept the authored precision",
      };
    }

    return {
      path,
      type,
      prism3: p,
      tokenpress: t,
      kind: 'numeric',
      float32: null,
      why: `${differing.length} of ${ps.n.length} channel(s) differ beyond float32 noise`,
    };
  }

  // No semantic normalizer for this $type — fall back to the raw numeric/shape test.
  const pn = numbersIn(p);
  const tn = numbersIn(t);
  if (pn.length && pn.length === tn.length) {
    const differing = pn.map((x, i) => [x, tn[i]] as const).filter(([x, y]) => x !== y);
    if (!differing.length) {
      return { path, type, prism3: p, tokenpress: t, kind: 'serialization-only', float32: null };
    }
    if (differing.every(([x, y]) => isFloat32Image(x, y))) {
      const [x, y] = differing[0];
      return {
        path,
        type,
        prism3: p,
        tokenpress: t,
        kind: 'numeric',
        float32: Math.fround(y) === x ? 'repair' : 'leak',
      };
    }
    return { path, type, prism3: p, tokenpress: t, kind: 'numeric', float32: null };
  }
  return { path, type, prism3: p, tokenpress: t, kind: 'shape', float32: null };
};

// ---- category 1: pairing the path differences ---------------------------------------------------

type PathExplanation = {
  reason: string;
  pairs: { prism3: string; tokenpress: string }[];
  /** Where each pair's prism3 leaf lives, so the TYPE arm can find it (#747).
   *
   *  `pairs[].prism3` is a LABEL, not always a path — the overlay rule writes
   *  `shadow.xs (dark overlay)` so the report reads well — so a type comparison cannot re-parse it
   *  without re-deriving the pairing from its own prose. `typed` carries the resolved leaves instead,
   *  index-aligned with `pairs`, filled by whoever built the pairing and therefore by the only code
   *  that knows which artifact the prism3 side came from. `null` means "this rule pairs a path against
   *  an ABSENCE" (the NOT-IN-EMISSION family), where there is no counterpart to carry a type. */
  typed: ({ prism3Path: string; prism3Type: string; tokenpressType: string } | null)[];
};

/** THE TYPE ARM'S SECOND HALF (#747) — a type disagreement found through a PAIRING rule.
 *
 *  The shared-path walk in `analyze` can only compare paths that appear verbatim on both sides. Every
 *  path a pairing rule explains is invisible to it — 71 on nb, 73 on aurora, 71 on wendys, ~14% of
 *  each brand's paired surface — because a renamed or axis-collapsed path never enters the shared set.
 *  That was measured by a mutation that did NOT fail: retyping TokenPress's grid branch `dimension` →
 *  `number` left the gate green (#747).
 *
 *  A rule that pairs A with B is ALREADY CLAIMING they are one token. So the type comparison belongs
 *  exactly there: the rule is the only code that knows the two correspond. */
export type PairedTypeDiff = {
  prism3: string;
  tokenpress: string;
  prism3Type: string;
  tokenpressType: string;
  rule: string;
};

/** Collects the type disagreements out of a set of explanations. Reads `typed`, which the rules fill,
 *  and never re-derives the pairing from `pairs[].prism3` prose. */
const pairedTypeDiffs = (explained: PathExplanation[]): PairedTypeDiff[] => {
  const out: PairedTypeDiff[] = [];
  for (const e of explained) {
    e.pairs.forEach((p, i) => {
      const t = e.typed[i];
      if (!t || t.prism3Type === t.tokenpressType) return;
      out.push({
        prism3: p.prism3,
        tokenpress: p.tokenpress,
        prism3Type: t.prism3Type,
        tokenpressType: t.tokenpressType,
        rule: e.reason,
      });
    });
  }
  return out;
};

/** The count the types arm CANNOT see — asserted, not printed (#747's last Verify bullet).
 *
 *  A pair with no `typed` entry is a blind path: the rule paired it and nothing compared its type.
 *  #747 asks for this to reach 0 and be asserted, because "a count that is only printed goes stale the
 *  way #707's figures did". Pairs against an absence are excluded by construction — `typed` is `null`
 *  there and that is correct, not blind, so they are counted separately. */
const blindPairs = (explained: PathExplanation[]): { blind: number; againstAbsence: number } => {
  let blind = 0;
  let againstAbsence = 0;
  for (const e of explained) {
    e.pairs.forEach((p, i) => {
      if (e.typed[i]) return;
      if (p.tokenpress === '(absent)') againstAbsence += 1;
      else blind += 1;
    });
  }
  return { blind, againstAbsence };
};

/** A raw "118 here, 59 there" is not an answer — most of those paths are the SAME token under a
 *  different name, and the ones that are not are the finding. This pairs them under explicit,
 *  named rules and reports what stays unpaired.
 *
 *  Each rule is a hypothesis about WHY the two exporters disagree, and it earns its place only by
 *  pairing paths one-to-one. A rule that pairs nothing is printed with a count of 0 rather than
 *  removed, so the report says which explanations were tested and did not apply. */
/** What a rule may ask the axis declaration for. Deliberately narrow: a rule gets the MEMBERS of a
 *  declared axis, and nothing else — not the classification, not the emission. A rule that needed more
 *  would be inferring axis semantics again, which is the thing #697 decided against. */
type AxisLookup = { members: (axis: Axis) => Set<string> };

const RENAME_RULES: {
  reason: string;
  rewrite: (p: string, axis: AxisLookup) => string | null;
  /** A duplicate-emission rule may pair a prism3 path a SECOND time — that is the point of it. */
  duplicate?: boolean;
  /** An axis-collapse rule pairs MANY prism3 paths onto ONE tokenpress path — also the point. */
  manyToOne?: boolean;
  /**
   * WHAT the rule claims corresponds — and therefore what its type comparison means (#747).
   *
   * `'token'`         — the two paths are the same token, so their `$type`s must be equal.
   * `{ field: 'x' }`  — the TokenPress path is ONE FIELD of the prism3 composite, so the type to
   *                     compare against is the type of whatever that field REFERENCES, not the
   *                     composite's own `typography`.
   *
   * This distinction was forced by the type comparison itself, and it is the clearest thing #747
   * produced. Adding types to the pairing immediately reported 11 disagreements per brand on the
   * `font-fluid.*` rule — `typography` against `dimension` — and the rule's own `reason` said they
   * were "the same 11 tokens emitted twice". They are not. TokenPress's `font-fluid.display.sm.strong`
   * is a FLOAT variable holding a font SIZE (48px); prism3's `type.display.sm.strong` is a composite
   * whose `fontSize` field references it. A "second copy of the composite" would have carried
   * fontFamily and fontWeight too, and it carries neither.
   *
   * So the 11 findings were a FALSE POSITIVE from a loose rule — exactly the failure #747's watch-outs
   * predicted ("adding a type assertion to a wrong rule produces a false positive that someone will
   * silence by loosening the rule further"). The fix is the opposite of loosening: the rule now states
   * which field it pairs, and the type expectation is DERIVED from that field's referent. Which means
   * the type arm did its job on its first run — it falsified a pairing hypothesis that had been read
   * and re-read as prose four times without anyone noticing it was wrong.
   */
  counterpart: 'token' | { field: string };
}[] = [
  {
    // prism3's composite type tokens live under `type.*`; TokenPress derives its name from the Figma
    // COLLECTION it scanned (`typography`) and from the variable prefix (`font-fluid/…`). The token
    // set is the same; the group name comes from a different place on each side.
    reason: 'group renamed: prism3 `type.*` = tokenpress `typography.*` (collection-derived name)',
    rewrite: (p) => (p.startsWith('type.') ? `typography.${p.slice('type.'.length)}` : null),
    counterpart: 'token',
  },
  {
    // TokenPress reaches these composites through TWO channels: the TEXT STYLES (as `typography.*`,
    // in `shared/`) and the `type-sets` VARIABLE collection (as `font-fluid.*`, per viewport mode).
    // But the two channels do not carry the same THING, which is what the type comparison established
    // and what this rule used to get wrong — see `counterpart` on the type above.
    //
    //   typography.display.sm.strong  $type typography  — the whole composite, from the text style
    //   font-fluid.display.sm.strong  $type dimension   — the fluid SIZE the composite's fontSize binds
    //
    // prism3 has no `font-fluid.*` path at all: the same fact lives in the composite's `fontSize`
    // reference and in `$extensions.prism3.responsive.{min,max}.ref`. So this pairs the prism3
    // composite against ONE FIELD of it, and the type expectation comes from that field's referent
    // (`font.size.48` -> `dimension`, all 11 per brand, in all three brands).
    //
    // It keeps `duplicate: true` because it still re-pairs a prism3 path the `typography` rule already
    // claimed — which is right, and is the part of the old reasoning that survived: one prism3 token
    // does correspond to two TokenPress paths. What was wrong was believing both were the same token.
    reason: 'SECOND CHANNEL, not a second copy: tokenpress reaches these composites twice — `typography.*` (the whole composite, from the text styles) AND `font-fluid.*` (only the fluid fontSize, from the type-sets variables)',
    rewrite: (p) => (p.startsWith('type.') ? `font-fluid.${p.slice('type.'.length)}` : null),
    duplicate: true,
    counterpart: { field: 'fontSize' },
  },
  {
    // THE AXIS COLLAPSE, in the paths rather than the files — #697's three-axes-into-one. prism3
    // carries the breakpoint as a PATH SEGMENT (`grid.sm.columns`), so all five coexist. TokenPress
    // carries it as a mode, so all five become `grid.columns` in five different FILES — five prism3
    // paths pair to one tokenpress path.
    //
    // THE MEMBER LIST IS NO LONGER SPELLED HERE. It used to be an inline alternation
    // (`xs|sm|md|lg|xl|2xl`) — a list of breakpoint names written into a regex in the comparison, which
    // is precisely the axis identity #697 says is human knowledge. It now comes from `axes.ts`, so a
    // brand adding a breakpoint extends the pairing by editing the declaration, and a member the
    // declaration does not know about stays UNPAIRED and fails the gate's unpaired arm rather than
    // being quietly dropped.
    reason: 'axis collapse: prism3 `grid.<breakpoint>.<prop>` = tokenpress `grid.<prop>`, once per mode file (MANY prism3 paths -> ONE tokenpress path)',
    rewrite: (p, axis) => {
      const m = /^grid\.([^.]+)\.(.+)$/.exec(p);
      if (!m || !axis.members('breakpoint').has(m[1])) return null;
      return `grid.${m[2]}`;
    },
    manyToOne: true,
    counterpart: 'token',
  },
];

/** Pairs a TokenPress-only `shadow-dark.*` path against the prism3 token that carries the same
 *  decision — reading the DARK OVERLAY, which is the projection this harness claims to compare
 *  (#609), and reporting separately when the overlay does not carry it.
 *
 *  ── WHY THIS READS THE OVERLAY AND NOT THE CANONICAL EXTENSION ─────────────────────────────────
 *
 *  It used to read `$extensions.prism3.modes.dark` on the canonical tree, with a comment explaining
 *  that the obvious hypothesis — `shadow-dark.xs` pairs with `shadow.xs` in the dark overlay — was
 *  false because the overlay carried only `color`. That WAS true, and it is how this harness found
 *  #708. It is no longer true: #708 shipped the fix and `lint-overlay-completeness.ts` now asserts
 *  each overlay carries exactly the leaves that vary in its mode. Measured on current `main`, all
 *  four brands: `dark` overlay = 156 leaves on nb / 147 on aurora, of which 7 are `shadow.*`.
 *
 *  The pairing had to move with the fix, and NOT because the old one stopped matching — that is the
 *  trap. The canonical extension is the SOURCE the overlay is projected FROM, so it carries the dark
 *  shadows whether or not the projector emits them. A predicate reading it is true in both worlds,
 *  which is exactly why the #708 verdict below went on printing "a SHIPPING DEFECT" for a defect
 *  that had been fixed. The overlay is the OUTPUT, so reading it can distinguish the two.
 *
 *  So this returns TWO explanations, and the split is the whole point (docs/34): `paired` is derived
 *  from the overlay and `regressed` from the disagreement between the extension and the overlay.
 *  Neither is derived from the other, and they cannot both be non-empty for one leaf. The #708
 *  verdict is now guarded on `regressed`, so it prints if and only if the defect is actually back. */
const explainViaModeOverlay = (
  onlyTP: string[],
  overlays: Map<string, Map<string, Leaf>>,
  canonical: unknown,
  tpUnion: Map<string, Leaf>
): { paired: PathExplanation; regressed: PathExplanation } => {
  const root = canonical && typeof canonical === 'object'
    ? (canonical as Record<string, unknown>)[
        Object.keys(canonical as Record<string, unknown>).filter((k) => !k.startsWith('$'))[0] ?? ''
      ]
    : undefined;
  /** Does the CANONICAL tree carry a per-mode value for this leaf — i.e. the projector's input? */
  const hasModeExtension = (path: string, mode: string): boolean => {
    let cur: unknown = root;
    for (const seg of path.split('.')) {
      if (!cur || typeof cur !== 'object') return false;
      cur = (cur as Record<string, unknown>)[seg];
    }
    const ext = (cur as { $extensions?: { prism3?: { modes?: Record<string, unknown> } } })?.$extensions;
    return ext?.prism3?.modes?.[mode] !== undefined;
  };

  const pairs: PathExplanation['pairs'] = [];
  const typed: PathExplanation['typed'] = [];
  const regressed: PathExplanation['pairs'] = [];
  // The prefix, the axis and the member are DECLARED (`axes.ts`), not spelled here. `shadow-dark`
  // reads like a token name, and only human knowledge says the `-dark` is an appearance-axis member —
  // #697's "axis identity is human knowledge Figma does not record", in the one place this harness
  // previously hard-coded it as a regex.
  const styleRules = STYLE_AXIS_AS_NAME.filter((s) => s.axis === 'appearance');
  for (const p of onlyTP) {
    const rule = styleRules.find((s) => p.startsWith(`${s.prefix}.`));
    if (!rule) continue;
    const target = `${rule.pairsWith}.${p.slice(rule.prefix.length + 1)}`;
    const mode = rule.member;
    if (overlays.get(mode)?.has(target)) {
      pairs.push({ prism3: `${target} (${mode} overlay)`, tokenpress: p });
      // #747: the prism3 leaf is in the OVERLAY, not base, so the type comes from there. The overlay
      // is also the artifact this pairing is derived from, which keeps the type comparison and the
      // pairing reading the same side of the projector — see the header on why that matters.
      const mine = overlays.get(mode)?.get(target)?.type;
      const theirs = tpUnion.get(p)?.type;
      typed.push(
        mine !== undefined && theirs !== undefined
          ? { prism3Path: target, prism3Type: mine, tokenpressType: theirs }
          : null
      );
    } else if (hasModeExtension(target, mode)) {
      // The canonical tree says this leaf varies in dark; the overlay a conforming reader consumes
      // does not carry it. That is #708, and only this comparison can see it.
      regressed.push({ prism3: `${target} $extensions.prism3.modes.${mode}, ABSENT from ${mode} overlay`, tokenpress: p });
    }
  }
  return {
    paired: {
      reason:
        'appearance axis crosses as a NAME, not a mode: prism3 carries the dark shadow as a MODE ' +
        '(`shadow.*` in the `dark` overlay, per #609/#708); Figma styles have no modes, so the emission ' +
        'prefixes them `shadow-dark/*` and tokenpress exposes them as peer tokens. Same decision, ' +
        'different axis — and a conforming reader now sees it on both sides',
      pairs,
      typed,
    },
    regressed: {
      reason:
        'REGRESSION OF #708 — the canonical tree carries a per-mode dark value for these shadows and ' +
        'the `dark` overlay does not, so a conforming consumer reading `base` + `dark.overlay` renders ' +
        'LIGHT-MODE shadows in dark mode',
      pairs: regressed,
      // A regressed pair is a pairing whose prism3 side is MISSING from the artifact a consumer reads.
      // There is no leaf there to take a type from, so `null` is the truthful entry — and it makes
      // `blindPairs` count these, which is right: if #708 came back, those paths would genuinely stop
      // being type-checked, and the blind-set assertion should say so rather than stay at 0.
      typed: regressed.map(() => null),
    },
  };
};

/** Prism3 paths the FIGMA EMISSION never carries, so no exporter reading a Figma file could produce
 *  them. Reported as a bound on the round-trip rather than as a TokenPress gap — measured against the
 *  emission's own variable names, which contain 0 matches for each of these prefixes. */
const NOT_IN_EMISSION = [
  { prefix: 'motion.', why: 'no motion collection is emitted at all (Figma has no duration/easing variable type)' },
  { prefix: 'font.line-height', why: 'line-height reaches Figma only inside a text style, never as its own variable' },
  { prefix: 'font.letter-spacing', why: 'letter-spacing reaches Figma only inside a text style, never as its own variable' },
  { prefix: 'font.typeface.', why: 'the typeface primitive tier is collapsed: the emission writes the resolved face onto `font/family/*`' },
  {
    prefix: 'container.fluid',
    why: 'value is `100%` — Figma FLOAT variables are unitless numbers, so a percentage has no representation and the emission omits the token',
  },
  {
    prefix: 'focus.ring.style',
    why: 'value is the strokeStyle keyword `solid` — Figma has no stroke-style variable type, and the emission omits it (`focus/ring/width|offset|offset-field` ARE emitted)',
  },
];

const explainPaths = (
  onlyP3: string[],
  onlyTP: string[],
  canonical: unknown,
  overlays: Map<string, Map<string, Leaf>>,
  p3Base: Map<string, Leaf>,
  tpUnion: Map<string, Leaf>,
  classification: AxisClassification,
  rootKey: string
) => {
  const tpSet = new Set(onlyTP);
  const claimedTP = new Set<string>();
  const claimedP3 = new Set<string>();
  const explained: PathExplanation[] = [];

  /** The type of a prism3 leaf, looked up in the BASE projection and then in the overlays.
   *
   *  Both, because the two sides do not always carry a token in the same artifact: the appearance-axis
   *  rule pairs a TokenPress `shadow-dark.*` style against a prism3 leaf that lives in the DARK
   *  OVERLAY, not in base. Looking only in base would return `undefined` there and silently leave
   *  those 7 paths blind — the same hole #747 is about, one artifact over. */
  const p3TypeOf = (path: string): string | undefined =>
    p3Base.get(path)?.type ?? [...overlays.values()].map((m) => m.get(path)?.type).find((t) => t !== undefined);

  /** The members of a declared axis, read off the emission's own collection modes.
   *
   *  Two independent things meet here, which is the point (docs/34): the AXIS of a collection is
   *  declared in `axes.ts`, and its MEMBERS are observed in the emission. Neither is derived from the
   *  other, and neither is derived from the pairing rule that consumes them. */
  const axisLookup: AxisLookup = {
    members: (axis) =>
      new Set(classification.classified.filter((c) => c.axis === axis).flatMap((c) => c.modes)),
  };

  /** The `$type` a composite's FIELD resolves to — for a rule whose `counterpart` is a field (#747).
   *
   *  The field's value is a DTCG alias (`{nbds.font.size.48}`), so the type to compare against is the
   *  type of the token it points at, looked up in the same base projection. This is the independent
   *  oracle the decision needed: the expectation comes from the canonical/base tree — the emitter's
   *  INPUT, authored nowhere in this file — and not from the pairing rule's own claim. */
  const p3FieldTypeOf = (path: string, field: string): string | undefined => {
    const v = p3Base.get(path)?.value;
    if (!v || typeof v !== 'object') return undefined;
    const raw = (v as Record<string, unknown>)[field];
    if (typeof raw !== 'string' || !isAlias(raw)) return undefined;
    return p3Base.get(aliasTarget(raw, rootKey))?.type;
  };

  for (const rule of RENAME_RULES) {
    const pairs: PathExplanation['pairs'] = [];
    const typed: PathExplanation['typed'] = [];
    for (const p of onlyP3) {
      // A duplicate-emission rule is allowed to re-pair an already-claimed prism3 path: the whole
      // point is that ONE prism3 token corresponds to TWO tokenpress paths.
      if (claimedP3.has(p) && !rule.duplicate) continue;
      const target = rule.rewrite(p, axisLookup);
      if (target && tpSet.has(target) && (rule.manyToOne || !claimedTP.has(target))) {
        pairs.push({ prism3: p, tokenpress: target });
        // #747: the rule claims these are one token, so it carries the type comparison. `manyToOne`
        // needs no special case here BY CONSTRUCTION — five prism3 paths each pair against the same
        // TokenPress leaf, so five comparisons are pushed against one `tokenpressType`, and a
        // disagreement AMONG the five surfaces as several findings naming different prism3 paths.
        // That is #747's "disagreement among the five is itself a finding", and it needed no extra
        // mechanism: the fan-out already produces one comparison per prism3 path.
        const mine =
          rule.counterpart === 'token' ? p3TypeOf(p) : p3FieldTypeOf(p, rule.counterpart.field);
        const theirs = tpUnion.get(target)?.type;
        const label = rule.counterpart === 'token' ? p : `${p}.${rule.counterpart.field} ->`;
        typed.push(
          mine !== undefined && theirs !== undefined
            ? { prism3Path: label, prism3Type: mine, tokenpressType: theirs }
            : null
        );
        claimedP3.add(p);
        claimedTP.add(target);
      }
    }
    explained.push({ reason: rule.reason, pairs, typed });
  }

  const stillUnpaired = onlyP3.filter((p) => !claimedP3.has(p));
  const notInEmission = NOT_IN_EMISSION.map((r) => {
    const pairs = stillUnpaired
      .filter((p) => p.startsWith(r.prefix))
      .map((p) => ({ prism3: p, tokenpress: '(absent)' }));
    return {
      reason: `NOT IN THE FIGMA EMISSION — ${r.prefix}*: ${r.why}`,
      pairs,
      // A path paired against an ABSENCE has no counterpart type. `null` is the honest entry — not a
      // gap in the type arm, which is why `blindPairs` counts these separately. Conflating the two is
      // what made the first measurement of the blind set read 140 instead of 71.
      typed: pairs.map(() => null),
    };
  }).filter((e) => e.pairs.length);

  const accounted = new Set(notInEmission.flatMap((e) => e.pairs.map((p) => p.prism3)));

  const remainingTP = onlyTP.filter((p) => !claimedTP.has(p));
  const { paired: overlayPaired, regressed } = explainViaModeOverlay(remainingTP, overlays, canonical, tpUnion);
  // A leaf claimed by EITHER explanation is accounted for. `regressed` is a pairing too — the token
  // exists on both sides; what is wrong is which prism3 artifact carries it — so leaving it out of
  // `overlayClaimed` would double-report it as an unpaired TokenPress path as well.
  const overlayClaimed = new Set(
    [...overlayPaired.pairs, ...regressed.pairs].map((p) => p.tokenpress)
  );

  return {
    explained: [
      ...explained,
      ...notInEmission,
      ...(overlayPaired.pairs.length ? [overlayPaired] : []),
      ...(regressed.pairs.length ? [regressed] : []),
    ],
    unpairedPrism3: stillUnpaired.filter((p) => !accounted.has(p)),
    unpairedTokenPress: remainingTP.filter((p) => !overlayClaimed.has(p)),
  };
};

// ---- category 5: bucket (c), observed ----------------------------------------------------------

/** Re-implements ONLY the predicate, never the behavior: each entry asks "did this setting's code path
 *  decide this token's type/value here?" by inspecting the INPUT (name, scopes) and the two OUTPUTS.
 *  Deliberately independent of `type-detection.ts` — importing its predicates would make this arm a
 *  restatement of the subject and it could not disagree with it (`docs/34`). The name patterns below
 *  are transcribed from the source and that duplication IS the measurement; do not DRY it. */
type BucketCFinding = {
  setting: string;
  verdict: 'fired' | 'inert';
  count: number;
  examples: string[];
  note: string;
};

const lastSegment = (figmaName: string) => figmaName.split('/').pop() ?? '';

const observeBucketC = (
  a: Adapted,
  tp: Map<string, Leaf>,
  p3: Map<string, Leaf>,
  tpOrder: string[]
): BucketCFinding[] => {
  const out: BucketCFinding[] = [];
  const tpPathOf = (figmaName: string) => figmaName.split('/').join('.');

  // (c1) BREAKPOINT REGEX — /^\d+$/ on the last name segment types ANY such variable as `dimension`.
  const numericTail = a.variables.filter((v) => /^\d+$/.test(lastSegment(v.name)));
  const numericTailTyped = numericTail
    .map((v) => ({ v, leaf: tp.get(tpPathOf(v.name)) }))
    .filter((x) => x.leaf?.type === 'dimension');
  // Which of those does prism3 type as something OTHER than dimension? Those are the misfires.
  const misfired = numericTailTyped.filter((x) => {
    const mine = p3.get(tpPathOf(x.v.name));
    return mine && mine.type !== 'dimension';
  });
  out.push({
    setting: 'breakpoint detection — /^\\d+$/ on the last name segment',
    verdict: misfired.length ? 'fired' : numericTailTyped.length ? 'inert' : 'inert',
    count: misfired.length,
    examples: misfired.slice(0, 6).map((x) => {
      const mine = p3.get(tpPathOf(x.v.name));
      return `${x.v.name}: prism3 ${mine?.type} -> tokenpress dimension`;
    }),
    note:
      misfired.length > 0
        ? `${numericTail.length} variables have a purely numeric last segment; ${misfired.length} are typed dimension by the regex where prism3 types them otherwise`
        : `${numericTail.length} variables have a purely numeric last segment, and every one of them is a dimension on BOTH sides — the regex reaches them but changes no verdict`,
  });

  // (c2) LINE_HEIGHT scope gate + lineHeightOutput. Default is 'ratio' -> `number`.
  const lhScoped = a.variables.filter((v) => v.scopes.includes('LINE_HEIGHT'));
  const lhDiff = lhScoped
    .map((v) => ({ v, t: tp.get(tpPathOf(v.name)), p: p3.get(tpPathOf(v.name)) }))
    .filter((x) => x.t && x.p && x.t.type !== x.p.type);
  out.push({
    setting: "lineHeightOutput (gated on scopes.includes('LINE_HEIGHT'))",
    verdict: lhScoped.length === 0 ? 'inert' : lhDiff.length ? 'fired' : 'inert',
    count: lhDiff.length,
    examples: lhDiff.slice(0, 5).map((x) => `${x.v.name}: prism3 ${x.p!.type} -> tokenpress ${x.t!.type}`),
    note:
      lhScoped.length === 0
        ? 'NO variable in this brand carries the LINE_HEIGHT scope, so the gate never opens — the setting has no input to act on'
        : `${lhScoped.length} variables carry LINE_HEIGHT`,
  });

  // (c3) OPACITY scope gate -> `number`.
  const opScoped = a.variables.filter((v) => v.scopes.includes('OPACITY'));
  const opDiff = opScoped
    .map((v) => ({ v, t: tp.get(tpPathOf(v.name)), p: p3.get(tpPathOf(v.name)) }))
    .filter((x) => x.t && x.p && x.t.type !== x.p.type);
  out.push({
    setting: "opacity typing (gated on scopes.includes('OPACITY'))",
    verdict: opScoped.length === 0 ? 'inert' : opDiff.length ? 'fired' : 'inert',
    count: opDiff.length,
    examples: opDiff.slice(0, 5).map((x) => `${x.v.name}: prism3 ${x.p!.type} -> tokenpress ${x.t!.type}`),
    note: `${opScoped.length} variables carry the OPACITY scope`,
  });

  // (c4) hasMultiMode — decides the whole directory layout.
  const multi = a.collections.filter((c) => c.modes.length > 1);
  const dirs = new Set(tpOrder.filter((p) => p.includes('/')).map((p) => p.split('/')[0]));
  out.push({
    setting: 'hasMultiMode (computed, not configurable)',
    verdict: multi.length ? 'fired' : 'inert',
    count: dirs.size,
    examples: [...dirs].sort(),
    note: multi.length
      ? `${multi.length} multi-mode collections (${multi.map((c) => `${c.name}=${c.modes.length}`).join(', ')}) put every file under a directory; the ${dirs.size} directories are three DIFFERENT axes as peers`
      : 'no multi-mode collection, so the layout would stay flat',
  });

  // (c5) MOTION duration name detection -> `duration`.
  const motionish = a.variables.filter(
    (v) => /motion|animation|transition/i.test(v.name) && /duration/i.test(v.name)
  );
  const motionDiff = motionish
    .map((v) => ({ v, t: tp.get(tpPathOf(v.name)), p: p3.get(tpPathOf(v.name)) }))
    .filter((x) => x.t && x.p && x.t.type !== x.p.type);
  out.push({
    setting: 'motion-duration detection (name contains motion/animation/transition + duration)',
    verdict: motionDiff.length ? 'fired' : 'inert',
    count: motionish.length,
    examples: motionDiff.slice(0, 5).map((x) => `${x.v.name}: prism3 ${x.p!.type} -> tokenpress ${x.t!.type}`),
    note: `${motionish.length} variables match the name pattern; ${motionDiff.length} disagree with prism3 on type`,
  });

  // (c6) EASING keyword detection on STRING -> `cubicBezier`.
  const easingish = a.variables.filter(
    (v) =>
      v.resolvedType === 'STRING' &&
      /easing|ease|timing|curve|bezier/i.test(v.name)
  );
  const easingDiff = easingish
    .map((v) => ({ v, t: tp.get(tpPathOf(v.name)), p: p3.get(tpPathOf(v.name)) }))
    .filter((x) => x.t && x.p && x.t.type !== x.p.type);
  out.push({
    setting: 'easing keyword detection on STRING variables',
    verdict: easingDiff.length ? 'fired' : 'inert',
    count: easingish.length,
    examples: easingDiff.slice(0, 5).map((x) => `${x.v.name}: prism3 ${x.p!.type} -> tokenpress ${x.t!.type}`),
    note: `${easingish.length} STRING variables match an easing keyword; ${easingDiff.length} disagree on type`,
  });

  // (c7) float32 cleanup — reported here as a setting too, since #703 named it in bucket (c). The
  // per-value verdicts come from `classifyValue`; this entry just records whether the input carried
  // the artifact at all, which is the precondition for the cleanup to be able to fire.
  const noisy = a.variables.filter((v) =>
    Object.values(v.valuesByMode).some((val) => numbersIn(val).some((n) => n !== 0 && Math.fround(n) === n && String(n).length > 10))
  );
  out.push({
    setting: 'float32 noise cleanup (roundToPrecision at the formatter boundary)',
    verdict: noisy.length ? 'fired' : 'inert',
    count: noisy.length,
    examples: noisy.slice(0, 4).map((v) => {
      const first = Object.values(v.valuesByMode)[0];
      return `${v.name}: ${JSON.stringify(first).slice(0, 70)}`;
    }),
    note: noisy.length
      ? `${noisy.length} adapted variables carry a float32 artifact in at least one mode (prism3's emit-figma-color.ts applies Math.fround deliberately, modeling Figma's storage), so the cleanup has real input here — see the VALUES section for whether it repaired or leaked`
      : 'no float32 artifact in the input, so the cleanup cannot fire',
  });

  return out;
};

// ---- the report --------------------------------------------------------------------------------

export type BrandReport = {
  brand: string;
  adapted: Adapted['notes'];
  counts: {
    prism3Base: number;
    prism3Overlays: Record<string, number>;
    tokenpressUnion: number;
    tokenpressFiles: number;
  };
  paths: {
    onlyPrism3: string[];
    onlyTokenPress: string[];
    shared: number;
    /** The path differences that are NOT genuine absences — a rename or an axis collapse pairs them
     *  one-to-one with a path on the other side. What is left over is the real gap. */
    explained: PathExplanation[];
    unpairedPrism3: string[];
    unpairedTokenPress: string[];
  };
  types: { path: string; prism3: string; tokenpress: string }[];
  /** Type disagreements found through a PAIRING rule rather than a shared path (#747). A separate
   *  field from `types` so the report can say which arm found what — and so the gate can assert both
   *  at 0 without either one being able to mask the other's silence. */
  pairedTypes: PairedTypeDiff[];
  /** #747's own acceptance measurement, asserted rather than printed: how many rule-paired paths have
   *  NO type comparison. Must be 0. `againstAbsence` is the NOT-IN-EMISSION family, which pairs a path
   *  against nothing and correctly has no type to compare. */
  typeBlindSpots: { blind: number; againstAbsence: number };
  /** #697's axis decision, as applied to this brand: what was declared, and what the emission carries
   *  that nobody declared. `unclassified` non-empty is a failure, never a default. */
  axes: AxisClassification & { represented: Axis[] };
  values: ValueDiff[];
  structure: {
    prism3Root: string;
    tokenpressRoot: string;
    prism3Files: string[];
    tokenpressFiles: string[];
    tokenpressDirs: string[];
    axisCollisions: { path: string; files: string[]; divergent: boolean }[];
  };
  bucketC: BucketCFinding[];
  complaints: string[];
  skippedBlurStyles: string[];
};

export const analyze = async (brand: string): Promise<BrandReport> => {
  const a = adaptBrand(brand, join(OUT, 'figma', brand));
  assertAdaptable(a);
  const out = await runTokenPress(a);
  // #697's declaration, applied before anything is compared: which TokenPress mode directories
  // correspond to prism3's `base` follows from the axis of each collection, and getting that wrong
  // moves hundreds of paths into the difference report (see `unionTokenPress`).
  const classification = classifyCollections(censusFromEmission(join(OUT, 'figma', brand)));
  const { union, collisions } = unionTokenPress(out, classification.baseDirs);
  const p3 = readPrism3(brand);

  // Drop the Figma-only collections before pairing (#893). TokenPress reads every Figma collection,
  // so a collection prism3 deliberately keeps OUT of the DTCG projection comes back as tokenpress-only
  // paths that no prism3 path can ever pair with. Driven by the axis declaration — see
  // `absentFromProjection` — so this is a drop someone declared, not a name the comparison exempted.
  const absent = absentFromProjection();
  const isAbsent = (k: string): boolean => absent.has(k.split('.')[0]);
  const absentDropped = [...union.keys()].filter(isAbsent).length;
  for (const k of [...union.keys()]) if (isAbsent(k)) union.delete(k);

  const onlyPrism3 = [...p3.base.keys()].filter((k) => !union.has(k)).sort();
  const onlyTokenPress = [...union.keys()].filter((k) => !p3.base.has(k)).sort();
  const shared = [...p3.base.keys()].filter((k) => union.has(k));

  const types: BrandReport['types'] = [];
  const values: ValueDiff[] = [];
  for (const path of shared) {
    const mine = p3.base.get(path)!;
    const theirs = union.get(path)!;
    if (mine.type !== theirs.type) {
      types.push({ path, prism3: mine.type, tokenpress: theirs.type });
      continue; // a type difference explains the value difference; do not double-count it
    }
    const vd = classifyValue(path, mine.type, mine.value, theirs.value, p3.rootKey);
    if (vd) values.push(vd);
  }

  const tpRootKeys = new Set<string>();
  for (const f of out.order) {
    const tree = out.files.get(f) as Record<string, unknown>;
    for (const k of Object.keys(tree ?? {})) if (!k.startsWith('$')) tpRootKeys.add(k);
  }

  const prism3Overlays: Record<string, number> = {};
  for (const [mode, l] of p3.overlays) prism3Overlays[mode] = l.size;

  const paths = explainPaths(
    onlyPrism3,
    onlyTokenPress,
    p3.canonical,
    p3.overlays,
    p3.base,
    union,
    classification,
    p3.rootKey
  );

  return {
    brand,
    adapted: a.notes,
    counts: {
      prism3Base: p3.base.size,
      prism3Overlays,
      tokenpressUnion: union.size,
      tokenpressFiles: out.order.length,
    },
    paths: {
      onlyPrism3,
      onlyTokenPress,
      shared: shared.length,
      ...paths,
    },
    types,
    pairedTypes: pairedTypeDiffs(paths.explained),
    typeBlindSpots: blindPairs(paths.explained),
    axes: { ...classification, represented: axesRepresentedIn(classification) },
    values,
    structure: {
      prism3Root: p3.rootKey,
      tokenpressRoot: `${tpRootKeys.size} top-level group(s), no brand namespace: ${[...tpRootKeys].sort().slice(0, 12).join(', ')}`,
      prism3Files: [
        `${brand}.tokens.json (canonical)`,
        `${brand}.base.tokens.json`,
        ...[...p3.overlays.keys()].map((m) => `${brand}.${m}.overlay.tokens.json`),
      ],
      tokenpressFiles: out.order,
      tokenpressDirs: [...new Set(out.order.filter((p) => p.includes('/')).map((p) => p.split('/')[0]))].sort(),
      axisCollisions: collisions,
    },
    bucketC: observeBucketC(a, union, p3.base, out.order),
    complaints: out.complaints,
    skippedBlurStyles: out.skippedBlurStyles,
  };
};

// ---- the verdicts: expected by design, or surprising -------------------------------------------

/** The task's last requirement, and the part a diff cannot supply: for each category, is the
 *  difference a consequence of a decision already on record, or is it news?
 *
 *  EACH VERDICT IS GUARDED BY A PREDICATE OVER THE MEASURED REPORT, not written as prose beside it.
 *  A verdict whose `when` is false does not print. So if a future run stops exhibiting the condition
 *  — the float32 cleanup starts losing values, a type difference appears, the opacity scale is fixed
 *  — the claim disappears from the output instead of standing there as a stale assertion about data
 *  it no longer describes. `source` is the issue/doc that predicted it; a SURPRISING verdict has none
 *  by definition, and `source` says where it should be recorded instead.
 *
 *  ── THE PREDICATE MUST TEST THE CLAIM, NOT SOMETHING CORRELATED WITH IT ────────────────────────
 *
 *  That guarantee is only as good as the match between `when` and `claim`, and the mechanism above
 *  gives no warning when they come apart: a predicate that is true for a reason the claim does not
 *  name goes on printing forever, and it prints CONFIDENTLY. Three of the verdicts below were wrong
 *  this way at once, all found by hand (docs/34's "not one instance was ever caught by a gate"):
 *
 *    · #708's shadow verdict tested the projector's INPUT (`$extensions.prism3.modes.dark` on the
 *      canonical tree) while claiming something about its OUTPUT (the dark overlay). The input is
 *      the source the output is projected FROM, so the predicate was true both before and after
 *      #713 fixed the bug — it reported a fixed defect as shipping and could not have stopped.
 *    · the axis verdict tested `tokenpressDirs.length > 3` while claiming THREE DIFFERENT KINDS of
 *      axis are peers. One axis with four values satisfies the count and refutes the claim.
 *    · the collision verdict counted every multi-file path while claiming they had DIFFERENT
 *      values. 11 of nb's 184 are identical in every file, so the number overstated the hazard.
 *
 *  So when writing one: name the artifact the claim is about, and read THAT. If the honest predicate
 *  is expensive or awkward to compute, compute it anyway — a cheap proxy here does not weaken the
 *  check, it removes it, and leaves prose that looks measured.
 *
 *  This is a judgement layer and it is the only authored-prose part of the report. It is honest about
 *  that: nothing here computes a verdict, it selects one that a measurement has made applicable. */
type Verdict = {
  category: 1 | 2 | 3 | 4 | 5;
  verdict: 'EXPECTED' | 'SURPRISING';
  claim: string;
  source: string;
  when: (r: BrandReport) => boolean;
};

const countKind = (r: BrandReport, kind: ValueDiff['kind']) =>
  r.values.filter((v) => v.kind === kind).length;
const explainedCount = (r: BrandReport, needle: string) =>
  r.paths.explained.find((e) => e.reason.includes(needle))?.pairs.length ?? 0;
const bucket = (r: BrandReport, needle: string) => r.bucketC.find((b) => b.setting.includes(needle));

/** The three mode axes the category-4 verdict NAMES, so its predicate can test the thing it claims.
 *
 *  `tokenpressDirs.length > 3` was the old test, and it is a proxy: 12 directories satisfy it whether
 *  they are three axes as peers or one axis with twelve values. The claim is specifically that
 *  DIFFERENT KINDS of axis sit side by side with nothing distinguishing them, so the predicate counts
 *  how many DISTINCT axes are represented. Names, not counts, for the same reason — a renamed
 *  breakpoint moves the directory out of `BREAKPOINT` and the axis stops being represented, which is
 *  the honest answer rather than a count that happens to stay above 3. */
const AXES: Record<string, Set<string>> = {
  appearance: new Set(['light', 'dark', 'hc-light', 'hc-dark']),
  breakpoint: new Set(['xs', 'sm', 'md', 'lg', 'xl', '2xl']),
  viewport: new Set(['desktop', 'mobile', 'shared']),
};
const axesRepresented = (r: BrandReport): number =>
  Object.values(AXES).filter((members) => r.structure.tokenpressDirs.some((d) => members.has(d)))
    .length;

const VERDICTS: Verdict[] = [
  // ---- 1. PATHS ----
  {
    category: 1,
    verdict: 'EXPECTED',
    claim:
      'the Figma round-trip is LOSSY BY CONSTRUCTION, and the loss is a property of Figma\'s variable model, not of either exporter: motion, line-height and letter-spacing roles, the typeface tier, `container.fluid` (a percentage) and `focus.ring.style` (a keyword) have no variable representation, so no exporter reading a Figma file can recover them',
    source: '#696 scoped the emission to what Figma can hold; #703 §portability restated it',
    when: (r) => r.paths.explained.some((e) => e.reason.startsWith('NOT IN THE FIGMA EMISSION')),
  },
  {
    category: 1,
    verdict: 'EXPECTED',
    claim:
      'group names differ because the two sides derive them from different things: prism3 names the group (`type.*`), TokenPress derives it from the Figma collection (`typography.*` from the text styles). Same tokens, different label',
    source: '#697 "the two representations disagree by design"',
    when: (r) => explainedCount(r, 'group renamed') > 0,
  },
  {
    category: 1,
    verdict: 'SURPRISING',
    claim:
      'TokenPress emits 11 composites TWICE — once as `typography.*` from the text styles and once as `font-fluid.*` from the type-sets variables — because prism3 emits the same typography both ways and TokenPress reads both channels. A consumer gets two spellings of one token with no marker saying they are the same',
    source: 'not predicted by #696/#697/#703 — belongs in #697 as a named collision',
    when: (r) => explainedCount(r, 'DUPLICATE emission') > 0,
  },
  {
    category: 1,
    verdict: 'SURPRISING',
    claim:
      'A SHIPPING DEFECT, #708 IS BACK: mode-varying shadows are missing from the `dark` overlay again, so a conforming consumer reading `base` + `dark.overlay` gets LIGHT-MODE shadows in dark mode. Root cause the first time was `emit-dtcg-overlay.ts` — the modes extension has two shapes (color wraps its value in `$value`, shadow is the bare array) and the projector\'s guard read one. Visible here because TokenPress, coming from Figma styles that have no modes, exposes all 7 as real `shadow-dark.*` tokens. `lint-overlay-completeness.ts` should have caught this first; if it is green and this is red, one of the two is wrong',
    source: 'originally found by this harness and filed as #708; fixed in #713 and now gated by lint-overlay-completeness.ts',
    when: (r) => explainedCount(r, 'REGRESSION OF #708') > 0,
  },
  {
    category: 1,
    verdict: 'EXPECTED',
    claim:
      'the dark shadows pair through the `dark` OVERLAY, which is what #708 fixed. This claim is the one that was wrong for longest, and how it was wrong is the useful part: its predicate asked whether the CANONICAL tree still carried `$extensions.prism3.modes.dark` — the projector\'s INPUT, true whether or not the projector emits anything — while the claim it gated asserted something about the projector\'s OUTPUT. So it went on printing "a SHIPPING DEFECT" after #713 fixed it, and could not have stopped. A verdict guarded on a proxy for its own claim is not guarded (docs/34)',
    source: '#708 (found here) → #713 (fixed) → this verdict repointed at the overlay it is about',
    when: (r) => explainedCount(r, 'appearance axis crosses as a NAME') > 0,
  },
  {
    category: 1,
    verdict: 'EXPECTED',
    claim:
      'aurora\'s 2 gradients are unreachable: Figma paint styles are neither variables nor effect styles and TokenPress\'s scanner has no call that returns them (W3). The only genuinely unpaired paths in either brand',
    source: '#703 named gradients as outside the scanner\'s reach',
    when: (r) => r.paths.unpairedPrism3.some((p) => p.startsWith('gradient.')),
  },
  {
    category: 1,
    verdict: 'EXPECTED',
    claim:
      'once renames, axis collapse and the emission\'s own gaps are accounted for, NOTHING is missing in either direction (aurora keeps only the 2 gradients). The two exporters cover the same token surface',
    source: '#697 hoped for this; this is the first measurement of it',
    when: (r) => r.paths.unpairedTokenPress.length === 0 && r.paths.unpairedPrism3.length <= 2,
  },

  // ---- 2. TYPES ----
  {
    category: 2,
    verdict: 'EXPECTED',
    claim:
      'ZERO type disagreements on either brand. TokenPress\'s name-pattern type detection — the part #703 flagged as most likely to misfire — reaches prism3\'s names and agrees with prism3\'s own typing every time',
    source: '#703 predicted risk here; the measurement says the risk did not materialize on this corpus',
    when: (r) => r.types.length === 0,
  },
  {
    category: 2,
    verdict: 'SURPRISING',
    claim: 'a type disagreement appeared — see the table above; every one is a consumer-visible break',
    source: 'not predicted — record it in #697 before any shared exporter is extracted',
    when: (r) => r.types.length > 0,
  },

  // ---- 3. VALUES ----
  {
    category: 3,
    verdict: 'EXPECTED',
    claim:
      'the largest value bucket is pure SERIALIZATION: prism3 writes CSS (`rgb(...)`, `"16px"`), TokenPress writes DTCG objects (`{colorSpace, components, alpha}`, `{value, unit}`). Same number, different spelling — both are valid DTCG',
    source: '#696: prism3\'s `colorFormat` lever and TokenPress\'s `dimensionFormat: object` preset',
    when: (r) => countKind(r, 'serialization-only') > 0,
  },
  {
    category: 3,
    verdict: 'EXPECTED',
    claim:
      'the float32 cleanup #703 called "a silent lossy rewrite when applied to a source that never had the artifact" DOES fire here and is NOT LOSSY FOR 8-BIT-AUTHORED COLORS, VERIFIED EXHAUSTIVELY: every float32-attributable difference still names the authored 8-bit value, and all 256 channels survive fround-then-4dp. That boundary is the claim — outside it the cleanup CAN quantize, and aurora\'s hex-alpha finding below is that boundary appearing on real input',
    source: '#703 raised it as an open risk; this narrows it to measured-safe for 8-bit-authored color, which is what was actually proved',
    when: (r) => r.values.some((v) => v.float32) && !r.values.some((v) => v.float32 === 'leak'),
  },
  {
    category: 3,
    verdict: 'SURPRISING',
    claim:
      'the float32 cleanup LOST values — a channel no longer names the authored one. This is exactly #703\'s predicted failure, now observed',
    source: 'confirms #703\'s prediction; blocks reuse of the cleanup as-is',
    when: (r) => r.values.some((v) => v.float32 === 'leak'),
  },
  {
    category: 3,
    verdict: 'SURPRISING',
    claim:
      'OPACITY disagrees by 100× AGAIN — prism3 says `0.05`, TokenPress says `5`. This was #709 and it is fixed: prism3\'s `emit-figma-dims.ts` applies the ×100 deliberately because a Figma OPACITY-scoped FLOAT is a PERCENT (live-verified: 0.9 renders as 0.9%), and TokenPress now divides it back at `exporter.ts`\'s `convertVariableValue`. If this prints, that conversion has been lost — the value lands 100× outside DTCG\'s 0–1 range, and it is the one difference in this report that visibly breaks a UI. `apps/tokenpress/tests/unit/opacity-percent-to-fraction.test.ts` should fail first',
    source: 'found here, filed as #709, fixed in #719 — this verdict is now its regression alarm',
    // This predicate was ALREADY honest and is left as it was: `kind: 'scale'` is computed from the
    // measured values, so the fix made it false and the claim stopped printing on its own. Contrast
    // the #708 verdict above, which had to be repointed. Kept as the worked example of the difference.
    when: (r) => countKind(r, 'scale') > 0,
  },
  {
    category: 3,
    verdict: 'SURPRISING',
    claim:
      'aurora\'s hex `colorFormat` QUANTIZES shadow alpha on prism3\'s own side: authored `0.1` becomes `1a` becomes `0.10196…`. nb, which uses `rgb()`, keeps `0.1` exactly. A prism3-side lossiness that depends on a per-brand lever, and visible ONLY because two brands were run',
    source: 'not predicted; belongs against `tree.ts`\'s `colorFormat` lever',
    when: (r) => countKind(r, 'hex-alpha-quantization') > 0,
  },
  {
    category: 3,
    verdict: 'EXPECTED',
    claim:
      'ALIASES FLATTEN TO LITERALS wherever the tier they pointed at was not emitted: prism3 keeps `font.family.display = {…font.typeface.inter}`, TokenPress has `"Inter"`, because `font.typeface.*` never reached Figma (see PATHS). The reference is not dropped — its target ceased to exist, so there was nothing left to reference',
    source: 'follows from the typeface-tier collapse already recorded under PATHS',
    when: (r) => countKind(r, 'alias-vs-literal') > 0,
  },
  {
    category: 3,
    verdict: 'EXPECTED',
    claim:
      'unit differences (`px` vs unitless, `ms` vs number) follow from `units`/`durationFormat` in TokenPress\'s preset meeting a Figma FLOAT that carries no unit at all',
    source: '#696: a FLOAT variable is a bare number; the unit is re-attached by convention',
    when: (r) => countKind(r, 'unit') > 0,
  },

  // ---- 4. STRUCTURE ----
  {
    category: 4,
    verdict: 'EXPECTED',
    claim:
      'one prism3 tree (+ base + overlays) against 23–24 TokenPress files, and a brand-namespace root against no root: prism3 emits a projection for consumers, TokenPress emits one file per (collection, mode)',
    source: '#609 (the projection) and #696 (TokenPress\'s per-collection layout)',
    when: (r) => r.structure.tokenpressFiles.length > r.structure.prism3Files.length,
  },
  {
    category: 4,
    verdict: 'SURPRISING',
    claim:
      'THE THREE AXES LAND AS PEER DIRECTORIES, with nothing distinguishing them. `dark`/`hc-dark`/`hc-light`/`light` (appearance), `sm`…`2xl` (breakpoint) and `desktop`/`mobile`/`shared` (viewport) sit side by side at the top level. #697 posed this as a design question; the answer is that the current output does not encode the distinction anywhere, and the harness had to be TOLD which modes correspond to prism3\'s base (`BASE_EQUIVALENT_MODES`) because the emission carries no default-mode marker at all',
    source: '#697 asked; this is the observation, and the hand-supplied constant is the proof',
    // Not `tokenpressDirs.length > 3` — that is satisfied by ONE axis with four values, which is not
    // what the claim says. The claim is that three DIFFERENT KINDS of axis are peers.
    when: (r) => axesRepresented(r) === 3,
  },
  {
    category: 4,
    verdict: 'SURPRISING',
    claim:
      'because the axes are peers, 171–173 paths appear in MORE THAN ONE file WITH DIFFERENT VALUES. Any consumer that merges the ZIP naively resolves them by file order — i.e. by accident. A further 11 (nb) / 14 (aurora) collide with the SAME value in every file, which is harmless and is counted separately: the old predicate counted all 184/185 together while the claim said "different values", so it asserted more than it had measured',
    source: 'not predicted; the consumer-facing consequence of the axis question',
    // Counts the collisions that actually DISAGREE, which is what the claim is about. A same-value
    // collision is redundancy, not a resolution hazard, and folding the two together overstates it.
    when: (r) => r.structure.axisCollisions.filter((c) => c.divergent).length > 50,
  },

  // ---- 5. BUCKET (C) ----
  {
    category: 5,
    verdict: 'EXPECTED',
    claim:
      'the breakpoint regex `/^\\d+$/` is INERT on this corpus: it reaches 214–253 variables and changes no verdict, because every numeric-tailed name is a dimension on both sides anyway. #703 called it the most likely to misfire; it does not, here',
    source: '#703 predicted "inert to destructive" — this end of the range, confirmed',
    when: (r) => bucket(r, 'breakpoint detection')?.verdict === 'inert',
  },
  {
    category: 5,
    verdict: 'SURPRISING',
    claim:
      'the scopes-gated handling never opens its gate: NO variable in either brand carries `LINE_HEIGHT`, so `lineHeightOutput` has no input, and the 12 `OPACITY`-scoped variables agree on TYPE — as they always did, since #709 was a VALUE disagreement and this gate does not touch values (it is now fixed, and the VALUES section no longer reports it). THIS IS AN ARTIFACT OF THE INPUT, NOT A PROPERTY OF THE SETTING: the measurement cannot determine whether these settings are destructive in general, only that they are INERT AGAINST THIS INPUT. The reason is not missing scope metadata — every one of the 994 nb / 1049 aurora adapted variables carries scopes. It is that prism3 emits no line-height variable for the gate to reach at all: line-height and letter-spacing exist only inside text styles, the same root cause as the unpaired-path findings in category 1',
    source: 'not predicted — #703 assumed the gates would fire and reasoned about their behavior',
    when: (r) => bucket(r, 'lineHeightOutput')?.verdict === 'inert',
  },
  {
    category: 5,
    verdict: 'EXPECTED',
    claim:
      '`hasMultiMode` FIRES and is the single highest-impact setting in the whole comparison: three multi-mode collections put every file under a directory, and that one boolean is what produces the peer-axis layout above',
    source: '#697: the mode axis is the structural disagreement',
    when: (r) => bucket(r, 'hasMultiMode')?.verdict === 'fired',
  },
  {
    category: 5,
    verdict: 'EXPECTED',
    claim:
      'motion-duration and easing detection are INERT for the same reason as each other: 0 matching variables, because the emission carries no motion collection for them to match',
    source: '#696 scoped motion out of the emission',
    when: (r) =>
      bucket(r, 'motion-duration detection')?.verdict === 'inert' &&
      bucket(r, 'easing keyword detection')?.verdict === 'inert',
  },
];

// ---- printing ----------------------------------------------------------------------------------

const H = (s: string) => `\n${'─'.repeat(96)}\n${s}\n${'─'.repeat(96)}`;
const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');

/** Wraps at a width so a long claim stays readable in a terminal; indentation is the caller's. */
const wrap = (s: string, width: number, indent: string): string =>
  s
    .split(' ')
    .reduce<string[]>((lines, word) => {
      const last = lines[lines.length - 1];
      if (last && (last + ' ' + word).length <= width) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
      return lines;
    }, [])
    .join(`\n${indent}`);

const printVerdicts = (r: BrandReport, category: Verdict['category']): void => {
  const applicable = VERDICTS.filter((v) => v.category === category && v.when(r));
  if (!applicable.length) return;
  console.log('');
  for (const v of applicable) {
    console.log(`  ${v.verdict === 'SURPRISING' ? '!! SURPRISING' : '   EXPECTED  '} — ${wrap(v.claim, 78, '                   ')}`);
    console.log(`                    source: ${v.source}`);
  }
};

const printReport = (r: BrandReport): void => {
  console.log(H(`BRAND: ${r.brand}`));

  console.log(`\nADAPTATION (what feeding TokenPress a prism3 tree cost — each item is a finding):`);
  console.log(`  W1 aliases rebound name -> synthetic id : ${r.adapted.aliasesRebound}`);
  console.log(`     unresolved alias names               : ${r.adapted.unresolvedAliasNames.length}`);
  console.log(`     duplicate variable names             : ${r.adapted.duplicateVariableNames.length}`);
  console.log(`  W2 per-mode files joined per variable   : ${Object.entries(r.adapted.modeAxes).filter(([, m]) => m.length > 1).map(([c, m]) => `${c}(${m.length})`).join(', ')}`);
  console.log(`  W3 style collections rerouted / dropped :`);
  for (const s of r.adapted.styleChannels) {
    console.log(`       ${s.collection.padEnd(16)} ${String(s.count).padStart(3)} -> ${s.channel}`);
  }
  console.log(`  W4 text-style bindings split in two     : ${r.adapted.textStyleBindingsSplit} (unresolved: ${r.adapted.textStyleBindingsUnresolved.length})`);

  console.log(`\nCOUNTS:`);
  console.log(`  prism3 base leaves        : ${r.counts.prism3Base}`);
  console.log(`  prism3 overlay leaves     : ${Object.entries(r.counts.prism3Overlays).map(([m, n]) => `${m}=${n}`).join(', ')}`);
  console.log(`  tokenpress union leaves   : ${r.counts.tokenpressUnion}  (across ${r.counts.tokenpressFiles} files)`);

  console.log(H('1. PATHS'));
  console.log(`  shared                 : ${r.paths.shared}  (${pct(r.paths.shared, r.counts.prism3Base)} of prism3 base)`);
  console.log(`  only in prism3         : ${r.paths.onlyPrism3.length}`);
  console.log(`  only in tokenpress     : ${r.paths.onlyTokenPress.length}`);
  console.log(`\n  PAIRED — the same token under a different name, so not a real absence:`);
  for (const e of r.paths.explained) {
    console.log(`     ${String(e.pairs.length).padStart(4)}  ${e.reason}`);
    for (const p of e.pairs.slice(0, 2)) console.log(`             e.g. ${p.prism3}  =  ${p.tokenpress}`);
  }
  console.log(
    `\n  UNPAIRED — the real gap: ${r.paths.unpairedPrism3.length} prism3-only, ` +
      `${r.paths.unpairedTokenPress.length} tokenpress-only`
  );
  const group = (paths: string[]) => {
    const g = new Map<string, number>();
    for (const p of paths) {
      const k = p.split('.').slice(0, 2).join('.');
      g.set(k, (g.get(k) ?? 0) + 1);
    }
    return [...g.entries()].sort((x, y) => y[1] - x[1]);
  };
  console.log(`     prism3-only, by group:`);
  for (const [k, n] of group(r.paths.unpairedPrism3).slice(0, 10)) console.log(`     ${String(n).padStart(4)}  ${k}`);
  console.log(`     tokenpress-only, by group:`);
  for (const [k, n] of group(r.paths.unpairedTokenPress).slice(0, 10)) console.log(`     ${String(n).padStart(4)}  ${k}`);
  printVerdicts(r, 1);

  console.log(H('2. TYPES (same path, different $type)'));
  console.log(`  total: ${r.types.length}`);
  const byPair = new Map<string, string[]>();
  for (const t of r.types) {
    const k = `${t.prism3} -> ${t.tokenpress}`;
    byPair.set(k, [...(byPair.get(k) ?? []), t.path]);
  }
  for (const [k, paths] of [...byPair.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(paths.length).padStart(4)}  ${k.padEnd(30)} e.g. ${paths.slice(0, 3).join(', ')}`);
  }
  printVerdicts(r, 2);

  console.log(H('3. VALUES (same path AND type, different value)'));
  console.log(`  total: ${r.values.length}`);
  const byKind = new Map<string, number>();
  for (const v of r.values) byKind.set(v.kind, (byKind.get(v.kind) ?? 0) + 1);
  for (const [k, n] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${k}`);
  }
  const f32 = r.values.filter((v) => v.float32);
  const lossless = f32.filter((v) => v.float32 === 'repair');
  const lossy = f32.filter((v) => v.float32 === 'leak');
  console.log(`\n  FLOAT32-ATTRIBUTABLE (isolated per the task): ${f32.length}`);
  console.log(`     LOSSLESS — the value still names the authored one : ${lossless.length}`);
  console.log(`     LOSSY    — the cleanup changed the value          : ${lossy.length}`);
  console.log(
    `     exhaustive check, independent of this corpus: all 256 8-bit channels round-trip ` +
      `through fround-then-4dp = ${Array.from({ length: 256 }, (_, i) => i).every(roundTripsTo8Bit)}`
  );
  for (const v of (lossy.length ? lossy : lossless).slice(0, 4)) {
    console.log(`     [${v.float32 === 'leak' ? 'LOSSY' : 'lossless'}] ${v.path} — ${v.why}`);
    console.log(`         prism3     : ${JSON.stringify(v.prism3).slice(0, 88)}`);
    console.log(`         tokenpress : ${JSON.stringify(v.tokenpress).slice(0, 88)}`);
  }
  // ONE EXAMPLE PER KIND, not the first N. Taking the first six printed six `serialization-only`
  // colors and no example at all of the two findings that matter most — the 100x opacity scale and
  // aurora's hex alpha quantization — because both sort late in path order. A sample that omits the
  // interesting buckets reads as if they were not there.
  const nonF32 = r.values.filter((v) => !v.float32);
  console.log(`\n  non-float32, ONE EXAMPLE PER KIND (${nonF32.length} total):`);
  for (const kind of [...new Set(nonF32.map((v) => v.kind))]) {
    const inKind = nonF32.filter((v) => v.kind === kind);
    const v = inKind[0];
    console.log(`     [${v.kind}] ${v.path} (${v.type})  — ${inKind.length} of this kind`);
    console.log(`         why        : ${v.why}`);
    console.log(`         prism3     : ${JSON.stringify(v.prism3).slice(0, 88)}`);
    console.log(`         tokenpress : ${JSON.stringify(v.tokenpress).slice(0, 88)}`);
  }
  printVerdicts(r, 3);

  console.log(H('4. STRUCTURE'));
  console.log(`  prism3 root key        : ${r.structure.prism3Root}`);
  console.log(`  tokenpress roots       : ${r.structure.tokenpressRoot}`);
  console.log(`  prism3 files (${r.structure.prism3Files.length}):`);
  for (const f of r.structure.prism3Files) console.log(`     ${f}`);
  console.log(`  tokenpress files (${r.structure.tokenpressFiles.length}), directories = ${r.structure.tokenpressDirs.length}:`);
  for (const f of r.structure.tokenpressFiles) console.log(`     ${f}`);
  console.log(`  THE AXIS QUESTION — tokenpress top-level directories: ${r.structure.tokenpressDirs.join(', ')}`);
  const divergent = r.structure.axisCollisions.filter((c) => c.divergent);
  console.log(
    `  same-path-in-multiple-files (a consumer merging the ZIP hits these): ${r.structure.axisCollisions.length}` +
      ` — ${divergent.length} with DIFFERENT values (merge order decides), ` +
      `${r.structure.axisCollisions.length - divergent.length} identical in every file (harmless)`
  );
  for (const c of divergent.slice(0, 4)) {
    console.log(`     ${c.path}  <- ${c.files.join(', ')}`);
  }
  printVerdicts(r, 4);

  console.log(H('5. BUCKET (C) — observed, not reasoned about'));
  for (const b of r.bucketC) {
    console.log(`  [${b.verdict.toUpperCase().padEnd(5)}] ${b.setting}`);
    console.log(`           ${b.note}`);
    for (const e of b.examples.slice(0, 5)) console.log(`           · ${e}`);
  }
  printVerdicts(r, 5);

  if (r.complaints.length) {
    console.log(H('EXPORTER COMPLAINTS (its own warnings about this input)'));
    for (const c of r.complaints.slice(0, 12)) console.log(`  ${c}`);
  }
  if (r.skippedBlurStyles.length) {
    console.log(`\n  skipped blur-only effect styles: ${r.skippedBlurStyles.join(', ')}`);
  }
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const brands = args.filter((x) => !x.startsWith('--'));
  const list = brands.length ? brands : BRANDS_DEFAULT;

  // The options this ran under, stated in the output — a comparison whose configuration is implicit
  // is not reproducible.
  if (!asJson) {
    console.log('TokenPress options: the plugin\'s own DEFAULT_OPTIONS (= its DTCG preset)');
    console.log(`  ${JSON.stringify(DEFAULT_DTCG_OPTIONS)}`);
    console.log('prism3 side: the CONFORMING PROJECTION (base + per-mode overlay), per #609.');
  }

  const reports: BrandReport[] = [];
  for (const brand of list) reports.push(await analyze(brand));

  if (asJson) {
    console.log(JSON.stringify(reports, null, 2));
    return;
  }
  for (const r of reports) printReport(r);

  console.log(H('CROSS-BRAND SUMMARY'));
  console.log(
    `  ${'brand'.padEnd(8)} ${'p3 base'.padStart(8)} ${'tp union'.padStart(9)} ${'shared'.padStart(7)} ${'only p3'.padStart(8)} ${'only tp'.padStart(8)} ${'types'.padStart(6)} ${'values'.padStart(7)} ${'f32'.padStart(4)}`
  );
  for (const r of reports) {
    console.log(
      `  ${r.brand.padEnd(8)} ${String(r.counts.prism3Base).padStart(8)} ${String(r.counts.tokenpressUnion).padStart(9)} ${String(r.paths.shared).padStart(7)} ${String(r.paths.onlyPrism3.length).padStart(8)} ${String(r.paths.onlyTokenPress.length).padStart(8)} ${String(r.types.length).padStart(6)} ${String(r.values.length).padStart(7)} ${String(r.values.filter((v) => v.float32).length).padStart(4)}`
    );
  }
  console.log(
    '\n  This is a MEASUREMENT: most of what it reports is a difference that is correct for its host\n' +
      '  (#697), so it never fails. The assertable subset — types, unpaired paths, float32 leaks and\n' +
      '  the opacity scale — IS a gate, and it runs in CI: `npx tsx tools/exporter-comparison/gate.ts`.'
  );
};

/** Only run the report when invoked directly. `gate.ts` imports `analyze` from this file, and without
 *  this guard that import would print the entire five-category report as a side effect of the gate
 *  starting up — the repo's established convention for a module that is both a library and a CLI
 *  (`emit-dtcg.ts`, `mcp.ts`, `regen.ts`, `token-contract.ts` all take this shape). */
const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  main().catch((e) => {
    console.error(`comparison failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
