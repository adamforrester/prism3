/**
 * The token-export model (#723, implementing #720) — which ARTIFACTS the studio writes, which SHAPE
 * SETTINGS each one carries, which SOURCES each setting applies to, and the transforms themselves.
 *
 * Pure and host-neutral, for the reason `provenance.ts` is: `main.ts` touches `document` at import
 * time and cannot be loaded under `tsx`, so a model living inside it is assertable only by hand in a
 * browser. Everything here is driven by `apps/studio/test-export-settings.ts` over the four real
 * emitted brands.
 *
 * ---------------------------------------------------------------------------------------------
 * THE TWO ADMISSION RULES (#720), because every judgement below is one of them
 *
 *   1. If the spec already decides it, it is not a setting. DTCG defines `typography.lineHeight` as a
 *      unitless number, so offering px is not a preference we decline — it is non-conforming output.
 *   2. If it is not a pure renaming, it is a different export (#696). A shape setting must be
 *      reversible and information-preserving.
 *
 * Rule 2 is not a matter of taste here — it is measured. Every setting declares which KIND of
 * admission it claims, and `admissionDefects()` runs the round-trip that kind implies over the real
 * emitted trees. Three things fell out of running that rather than reasoning about it:
 *
 *   - **camelCase is not an admissible token-name style.** `padding-x-visual` → `paddingXVisual`
 *     inverts to `padding-xvisual`: the single-letter segment `x` fuses with the segment after it and
 *     no inverse can tell that hump from the one in `paddingX`. So it is offered nowhere, and the
 *     check is what says so rather than a comment. snake case round-trips all 250 distinct segments
 *     with zero collisions, which is why it IS offered.
 *   - **The base+overlay projection is not a `fileStructure` option.** It was the obvious reading of
 *     "single / split", and it fails rule 2: `buildOverlaySet` drops the `spring` tokens and the
 *     `modes` extension by design (#642, #708). That makes it a different ARTIFACT — one level up,
 *     with its own guarantees — not a setting. `per-group` splits the canonical tree by top-level
 *     group, which really is paths-unchanged and merges straight back.
 *   - **The tree's top-level `$extensions` is not part of any leaf**, so a transform written as a walk
 *     over leaves drops the generator stamp and the whole `decisions` log without touching a token.
 *     That is a rule-2 violation that no token-level check would have seen, which is why
 *     `admissionDefects` compares whole documents rather than token sets.
 *
 * ---------------------------------------------------------------------------------------------
 * SOURCE APPLICABILITY IS A DECLARATION (#720's 2026-08-12 correction)
 *
 * Every setting names the sources it applies to, the surface derives visibility from that
 * declaration, and a setting that declares nothing fails a check rather than defaulting to visible.
 * The reason it is a rule and not a spot check is that the spot check could not fail: with one source
 * implemented there is no Figma-source setting in existence to leak, so "exporting a generated tree
 * exposes no Figma-only control" passes on an empty set — and says nothing about the day someone adds
 * one. See `declarationDefects()` for which half of the enforcement is load-bearing.
 */

// ===========================================================================================
// Sources — what the tokens came from, which is the gate. NOT the host (#720).
// ===========================================================================================

/**
 * Where an export's tokens came from.
 *
 * `PRISM3_HOST` answers *where the UI runs*; this answers *what is being exported*, and those
 * diverge inside the plugin, which will eventually be able to export either. Gating on the host would
 * show a Figma-source setting while exporting a generated tree — and per #697 that is a defect rather
 * than an option: the float32 cleanup exists because Figma stores color as float32, so run against a
 * tree that never had that artifact it is a silent lossy rewrite of authored values.
 */
export type ExportSource =
  /** The engine-generated token tree — the only source that exists today, in either host. */
  | 'generated'
  /** The Figma file's own variables. #584's territory and UNBUILT: `readFigmaVariables` reads only
   *  `core-palette` + `color` to feed `verifyReadback`, so there is no general variables export. */
  | 'file-variables';

export const ALL_SOURCES: readonly ExportSource[] = ['generated', 'file-variables'];

/**
 * The sources a user can actually pick right now.
 *
 * Deliberately NOT derived from `PRISM3_HOST`. The plugin *will* have a second source; it does not
 * have one today, and a host-derived list would offer a picker whose second entry exports nothing.
 * When #584 lands, this list grows and every setting's `sources` declaration already decides what it
 * shows — which is the whole point of declaring rather than enumerating per source.
 */
export const AVAILABLE_SOURCES: readonly ExportSource[] = ['generated'];

// ===========================================================================================
// Artifacts — the first level. Which output, then its settings.
// ===========================================================================================

export type ArtifactId = 'dtcg' | 'design-md';

export interface ArtifactDef {
  readonly id: ArtifactId;
  readonly label: string;
  readonly desc: string;
}

/**
 * Two artifacts. Style-Dictionary-native is NOT a third — #720's 2026-08-12 note: the consumability
 * thesis (#635) is that stock Style Dictionary reads our DTCG with no custom code, asserted on every
 * CI run, so an SD-specific artifact would imply the DTCG needs adapting for SD. Do not build an
 * emitter to justify a UI level.
 */
export const ARTIFACTS: readonly ArtifactDef[] = [
  {
    id: 'dtcg',
    label: 'Design tokens',
    // Descriptions may carry teachable domain vocabulary (#618, reading 1) — "alias" and "token" are
    // learnable from two encounters on screen. Engine identifiers are not; see `jargonDefects`.
    desc: 'The whole token tree in the W3C design-token format, aliases intact. This is the file a build reads.',
  },
  {
    id: 'design-md',
    label: 'Brand brief',
    desc: 'The few anchors this brand is generated from, as Markdown. Import it back here to get the brand again.',
  },
];

// ===========================================================================================
// The DTCG shape settings
// ===========================================================================================

export type SettingKey = 'tokenNameCase' | 'formatDotNotation' | 'fileStructure' | 'prettyPrint';

/**
 * Which admission rule a setting passes — a closed union rather than prose, because each kind names
 * the round-trip that `admissionDefects()` runs for it, and a setting with no kind has no check.
 *
 * Why not one kind: the four settings are reversible in four different senses, and a single generic
 * "round-trips" check would have to pick one and would trivially pass for the other three. Renaming
 * inverts per path segment; nesting inverts by re-nesting a flat map; a file split inverts by merging
 * the files; a serialization change inverts by re-parsing. `admissionDefects` dispatches on this, so
 * the check a setting gets is the check its own claim implies.
 */
export type AdmissionKind = 'renaming' | 'nesting' | 'file-count' | 'serialization';

export interface OptionDef {
  readonly value: string;
  readonly label: string;
}

export interface SettingDef {
  readonly key: SettingKey;
  readonly artifact: ArtifactId;
  /**
   * The sources this setting applies to. REQUIRED — a new setting that omits it fails `typecheck` at
   * its own definition, which is the cheap half of #720's rule. The half that catches the subtler
   * miss (declaring `[]`, which type-checks and means "applies nowhere") is `declarationDefects()`.
   */
  readonly sources: readonly ExportSource[];
  readonly admits: AdmissionKind;
  readonly label: string;
  readonly desc: string;
  readonly options: readonly OptionDef[];
  readonly def: string;
}

/**
 * The four DTCG shape settings, in the order they appear.
 *
 * Keys are #720's names so the trace back to the decision is direct. The keys are NOT the copy: a
 * control keyed `tokenNameCase` still needs a label and a description a designer can read without
 * knowing the codebase, which is what `jargonDefects()` checks by rule rather than by list.
 *
 * Every one is `generated`-only today, and that is a fact about which source exists rather than a
 * claim that these are generated-specific: three of the four are pure output shape and will apply to
 * a Figma-variables source unchanged when #584 builds one. Adding `'file-variables'` to a line here
 * is then the whole change — no second list, no per-source enumeration.
 */
export const DTCG_SETTINGS: readonly SettingDef[] = [
  {
    key: 'tokenNameCase',
    artifact: 'dtcg',
    sources: ['generated'],
    admits: 'renaming',
    label: 'Token names',
    desc: 'Dashes are what the engine writes, so a name reads as it does here. Underscores suit toolchains that read a dash as minus.',
    options: [
      { value: 'kebab', label: 'color.on-fill' },
      { value: 'snake', label: 'color.on_fill' },
    ],
    def: 'kebab',
  },
  {
    key: 'formatDotNotation',
    artifact: 'dtcg',
    sources: ['generated'],
    admits: 'nesting',
    label: 'Grouping',
    desc: 'Groups nest by default, the way the format describes them. One flat level with dotted keys is easier to search and to diff.',
    options: [
      { value: 'nested', label: 'Nested groups' },
      { value: 'dotted', label: 'One flat level' },
    ],
    def: 'nested',
  },
  {
    key: 'fileStructure',
    artifact: 'dtcg',
    sources: ['generated'],
    admits: 'file-count',
    label: 'Files',
    desc: 'One file holds everything. Splitting writes a file per top-level group — same names, spread out, and they merge back.',
    options: [
      { value: 'single', label: 'One file' },
      { value: 'per-group', label: 'One per group' },
    ],
    def: 'single',
  },
  {
    key: 'prettyPrint',
    artifact: 'dtcg',
    sources: ['generated'],
    admits: 'serialization',
    label: 'Formatting',
    desc: 'Indented reads well in a review. Compact is smaller to ship, and a build reads the two the same way.',
    options: [
      { value: 'pretty', label: 'Indented' },
      { value: 'compact', label: 'Compact' },
    ],
    def: 'pretty',
  },
];

/**
 * `design.md` carries NO shape settings — and that is a finding, not an omission.
 *
 * #720 named three candidates ("dialect — engine-native vs STANDARD, whether to carry the `x-prism3`
 * lever block, whether to include prose"). Checked against what exists, each fails the same rule #720
 * applies to Style-Dictionary-native one level up:
 *
 *   - **dialect** — there is no standard-dialect WRITER. `standard-design-md.ts` reads that dialect
 *     and converts inward; `toDesignMd` writes engine-native only. Offering the choice means building
 *     an emitter to justify a control.
 *   - **the `x-prism3` block** — it is how the *standard* dialect carries engine levers. An
 *     engine-native brief carries those levers as ordinary frontmatter keys, so there is no block to
 *     include or omit.
 *   - **prose** — the studio holds none. `parseDesignMd` returns `{input, prose}` and the import path
 *     keeps `.input`, so prose is dropped on the way in and there is nothing to write back out.
 *
 * The two-level structure is what makes this expressible: an artifact with no shape settings is a
 * legible answer, where a flat list of controls would have needed one of the three invented.
 */
export const DESIGN_MD_SETTINGS: readonly SettingDef[] = [];

export const ALL_SETTINGS: readonly SettingDef[] = [...DTCG_SETTINGS, ...DESIGN_MD_SETTINGS];

export type SettingsState = Readonly<Record<SettingKey, string>>;

export const defaultSettings = (): SettingsState =>
  Object.fromEntries(ALL_SETTINGS.map((s) => [s.key, s.def])) as SettingsState;

/**
 * What the surface shows: ONE list, filtered by the declaration.
 *
 * Never a per-source list of settings. Two lists would have to be kept in sync by hand, and the
 * failure mode of the copy that drifts is a source-specific control reaching a tree it corrupts —
 * exactly what #697 calls a defect rather than an option.
 */
export const visibleSettings = (artifact: ArtifactId, source: ExportSource): readonly SettingDef[] =>
  ALL_SETTINGS.filter((s) => s.artifact === artifact && s.sources.includes(source));

// ===========================================================================================
// The transforms
// ===========================================================================================

type Node = Record<string, unknown>;

const isObj = (v: unknown): v is Node => !!v && typeof v === 'object' && !Array.isArray(v);
const isLeaf = (v: unknown): v is Node => isObj(v) && '$value' in v;

/** The tree's single non-`$` top-level key — the configurable root (`prism`, `nbds`, …). */
export const rootKeyOf = (tree: unknown): string => {
  const keys = Object.keys(isObj(tree) ? tree : {}).filter((k) => !k.startsWith('$'));
  if (keys.length !== 1) {
    throw new Error(`export-settings: expected exactly one root key, got ${JSON.stringify(keys)}`);
  }
  return keys[0];
};

/**
 * The document's top-level `$`-prefixed entries — the generator stamp and the `decisions` log.
 *
 * Carried through every projection explicitly. They are siblings of the root rather than descendants
 * of any token, so a transform expressed as a walk over leaves loses them silently: the export still
 * parses, still validates, still holds every token, and has dropped the record of what produced it.
 */
const metaOf = (tree: unknown): Node => {
  const out: Node = {};
  for (const [k, v] of Object.entries(isObj(tree) ? tree : {})) if (k.startsWith('$')) out[k] = v;
  return out;
};

/** One path segment, renamed. Its inverse is `unrenameSegment`; `admissionDefects` gates the pair. */
export const renameSegment = (seg: string, style: string): string =>
  style === 'snake' ? seg.replace(/-/g, '_') : seg;

export const unrenameSegment = (seg: string, style: string): string =>
  style === 'snake' ? seg.replace(/_/g, '-') : seg;

const renamePath = (path: string, style: string): string =>
  path.split('.').map((s) => renameSegment(s, style)).join('.');

/**
 * ALIAS REFERENCES ARE RENAMED TOO, and forgetting that is how a renaming stops being one.
 *
 * A DTCG alias is a token path in braces (`"{prism.color.on-fill}"`). Rename the keys without
 * rewriting the references and every alias points at a path that no longer exists — the export still
 * opens, still validates as JSON, and resolves to nothing. Composite values hold aliases inside
 * objects and arrays (`typography`, `shadow`, `transition`, `gradient`), so this walks values rather
 * than testing the top-level type. `aliasDefects()` is what holds it to that.
 */
const renameAliasesIn = (value: unknown, style: string): unknown => {
  if (typeof value === 'string') {
    return value.replace(/\{([^{}]+)\}/g, (_m, inner: string) => `{${renamePath(inner, style)}}`);
  }
  if (Array.isArray(value)) return value.map((v) => renameAliasesIn(v, style));
  if (isObj(value)) {
    const out: Node = {};
    for (const [k, v] of Object.entries(value)) out[k] = renameAliasesIn(v, style);
    return out;
  }
  return value;
};

/** A leaf with its own aliases rewritten. Structure and every descriptive field are untouched. */
const renameLeaf = (leaf: Node, style: string): Node => {
  const out: Node = {};
  for (const [k, v] of Object.entries(leaf)) out[k] = k === '$value' ? renameAliasesIn(v, style) : v;
  return out;
};

export interface Leaf {
  readonly path: string;
  readonly leaf: Node;
}

/** Every leaf in the tree, with a dot-joined path INCLUDING the root key. */
export const leavesOf = (tree: unknown): Leaf[] => {
  const out: Leaf[] = [];
  const walk = (n: unknown, path: string): void => {
    if (!isObj(n)) return;
    if (isLeaf(n)) { out.push({ path, leaf: n }); return; }
    for (const [k, v] of Object.entries(n)) {
      if (k.startsWith('$')) continue;
      walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(tree, '');
  return out;
};

/** Rebuild a nested tree from `{path, leaf}` pairs — the inverse of `leavesOf` for these purposes. */
const nest = (leaves: readonly Leaf[]): Node => {
  const out: Node = {};
  for (const { path, leaf } of leaves) {
    const segs = path.split('.');
    let cur = out;
    for (const seg of segs.slice(0, -1)) {
      if (!isObj(cur[seg])) cur[seg] = {};
      cur = cur[seg] as Node;
    }
    cur[segs[segs.length - 1]] = leaf;
  }
  return out;
};

/** A flat one-level object keyed by the full dotted path. */
const flatten = (leaves: readonly Leaf[]): Node => {
  const out: Node = {};
  for (const { path, leaf } of leaves) out[path] = leaf;
  return out;
};

export interface OutFile {
  readonly name: string;
  readonly text: string;
}

/** The group a path belongs to — the segment directly under the root. */
const groupOf = (path: string): string => path.split('.')[1] ?? '';

/**
 * The whole DTCG export: the transformed tree, serialized, as one or more files.
 *
 * ONE function, used by both the download and the preview. The preview is not a second renderer that
 * could disagree with the export — it is this function over a small sample tree, which is what makes
 * "every setting visibly changes the preview" a claim about the real output rather than about a
 * display of it.
 */
export const projectDtcg = (tree: unknown, slug: string, s: SettingsState): readonly OutFile[] => {
  const meta = metaOf(tree);
  const renamed = leavesOf(tree).map(({ path, leaf }) => ({
    path: renamePath(path, s.tokenNameCase),
    leaf: renameLeaf(leaf, s.tokenNameCase),
  }));
  const indent = s.prettyPrint === 'pretty' ? 2 : undefined;
  const doc = (ls: readonly Leaf[]): Node =>
    ({ ...(s.formatDotNotation === 'dotted' ? flatten(ls) : nest(ls)), ...meta });
  const ser = (v: unknown): string => JSON.stringify(v, null, indent) + '\n';

  if (s.fileStructure !== 'per-group') {
    return [{ name: `${slug}.tokens.json`, text: ser(doc(renamed)) }];
  }
  // Split by the top-level group UNDER the root, so every file is independently addressable and the
  // set merges straight back — paths unchanged, file count changed, which is the whole admission.
  // The root wrapper stays in each file (`nest` keeps it), so a file's own aliases still read as they
  // do in the single-file form; `admissionDefects` merges the set and compares it against that form.
  const groups = new Map<string, Leaf[]>();
  for (const l of renamed) {
    const g = groupOf(l.path);
    const bucket = groups.get(g);
    if (bucket) bucket.push(l); else groups.set(g, [l]);
  }
  return [...groups.entries()].map(([group, ls]) => ({
    name: `${slug}.${group}.tokens.json`,
    text: ser(doc(ls)),
  }));
};

/** Deep-merge a set of split files back into one document. Used by the split setting's own check. */
export const mergeFiles = (files: readonly OutFile[]): unknown => {
  const merge = (a: Node, b: Node): Node => {
    const out: Node = { ...a };
    for (const [k, v] of Object.entries(b)) {
      out[k] = isObj(out[k]) && isObj(v) && !isLeaf(out[k]) && !isLeaf(v) ? merge(out[k] as Node, v) : v;
    }
    return out;
  };
  return files.reduce<Node>((acc, f) => merge(acc, JSON.parse(f.text) as Node), {});
};

// ===========================================================================================
// The preview sample — representative, not complete (#720)
// ===========================================================================================

/**
 * Why each sample line is in the sample, and which control it exercises.
 *
 * #720's verify item runs one way — *a control whose effect is invisible in the preview is either
 * mis-chosen or the sample is wrong*. The check runs it both ways: every control needs a line it
 * moves, AND every line needs a control that moves it, or the line is decoration that makes the real
 * changes harder to see. Six to eight lines is the budget; a full list defeats the purpose.
 */
export interface SampleCriterion {
  readonly key: string;
  readonly exercises: SettingKey;
  readonly test: (path: string, leaf: Node) => boolean;
}

export const SAMPLE_CRITERIA: readonly SampleCriterion[] = [
  // A dashed segment is the only thing a name style can visibly change.
  { key: 'dashed-name', exercises: 'tokenNameCase', test: (p) => p.split('.').slice(1).some((s) => s.includes('-')) },
  // An alias is where a name style has to reach INSIDE a value, which is the half that gets forgotten.
  { key: 'alias-value', exercises: 'tokenNameCase', test: (_p, l) => typeof l.$value === 'string' && /\{[^{}]*-[^{}]*\}/.test(l.$value) },
  // Depth is what nesting versus one flat level is a choice about.
  { key: 'deep-path', exercises: 'formatDotNotation', test: (p) => p.split('.').length >= 5 },
  // A composite value is where indentation stops being cosmetic.
  { key: 'composite', exercises: 'prettyPrint', test: (_p, l) => isObj(l.$value) || Array.isArray(l.$value) },
];

/**
 * Pick the sample by CRITERIA rather than by path.
 *
 * A hard-coded list of eight token paths is a set of names of the world (docs/34 shape 9): rename one
 * token and the preview silently loses the line that made a control legible, with nothing to say so.
 * Chosen greedily in criterion order, first match wins, so the result is deterministic — and the
 * `fileStructure` criterion is not in the list because it is not a property of a single leaf: the
 * split is visible in the FILE LIST, which is why `previewFileNames` is part of the preview.
 */
export const sampleLeaves = (tree: unknown, max = 6): Leaf[] => {
  const all = leavesOf(tree);
  const picked: Leaf[] = [];
  const size = (l: Leaf): number => JSON.stringify(l.leaf).length;
  /**
   * The SMALLEST leaf matching the predicate, not the first.
   *
   * Not a micro-optimization — it is what keeps the preview readable while still being the real
   * export. Every emitted leaf carries its own `$extensions` (`figma` directives, `modes`, generation
   * provenance), so a semantic color leaf serializes to ~650 characters and eight of them render 265
   * lines. The projection is not allowed to trim that: dropping a leaf's extensions to make a tidier
   * preview would show the user something the download does not contain. Choosing the leanest example
   * of each criterion gets a skimmable preview out of the unmodified function. Ties break on path, so
   * the choice is deterministic.
   */
  const take = (pred: (p: string, l: Node) => boolean): void => {
    const hits = all.filter(({ path, leaf }) => pred(path, leaf) && !picked.some((p) => p.path === path));
    if (!hits.length) return;
    picked.push(hits.reduce((best, l) => {
      const d = size(l) - size(best);
      return d < 0 || (d === 0 && l.path < best.path) ? l : best;
    }));
  };
  // A plain shallow leaf first, so the sample opens with something ordinary to compare against.
  take((p, l) => typeof l.$value === 'string' && p.split('.').length === 3 && !p.includes('-'));
  for (const c of SAMPLE_CRITERIA) take(c.test);
  // Then fill toward the budget from a SECOND group, so the sample spans the axis the file split cuts
  // along — otherwise "one per group" produces a one-file preview and reads as having done nothing.
  const firstGroup = picked.length ? groupOf(picked[0].path) : '';
  while (picked.length < max) {
    const before = picked.length;
    take((p, l) => groupOf(p) !== firstGroup && SAMPLE_CRITERIA.some((c) => c.test(p, l)));
    if (picked.length === before) break;
  }
  return picked.slice(0, max);
};

/** The sample as a standalone document — the generator stamp is dropped, since it is not a token. */
export const sampleTree = (tree: unknown, max = 6): unknown => nest(sampleLeaves(tree, max));

/** The preview: the real export function over the sample tree. */
export const previewFiles = (tree: unknown, slug: string, s: SettingsState, max = 6): readonly OutFile[] =>
  projectDtcg(sampleTree(tree, max), slug, s);

/** The file list the current settings produce over the WHOLE tree — the preview's other half. */
export const fileNames = (tree: unknown, slug: string, s: SettingsState): readonly string[] =>
  projectDtcg(tree, slug, s).map((f) => f.name);

// ===========================================================================================
// Import — a slot, not a control (#723, #721)
// ===========================================================================================

/**
 * The import half of the dialog.
 *
 * "Load Prism3-themed tokens from an existing Figma file" depends on #677, which is unbuilt, so it is
 * a SLOT rather than a control: building the affordance first bakes in an assumption about how
 * reconstruction works, and #677 has not decided that.
 *
 * The union is what enforces it. An unavailable slot has no `label` and no `desc` — there is no copy
 * to write for a path that does not exist — and `availableImportSlots()` narrows to the copy-bearing
 * variant, so a renderer cannot reach for a string the unbuilt slot does not have.
 */
export type ImportSlot =
  | { readonly id: string; readonly available: true; readonly label: string; readonly desc: string }
  | { readonly id: string; readonly available: false; readonly needs: string };

export const IMPORT_SLOTS: readonly ImportSlot[] = [
  {
    id: 'design-md',
    available: true,
    label: 'Brand brief',
    desc: 'Paste or upload a brief. The engine has to accept it before it replaces what you have here.',
  },
  // #677: reconstructing a brand from emitted tokens is an undetermined inverse — the engine grows a
  // whole system from sparse anchors, and that does not run backwards. Until it is decided, no control.
  { id: 'figma-file', available: false, needs: '#677' },
];

export const availableImportSlots = (): ReadonlyArray<Extract<ImportSlot, { available: true }>> =>
  IMPORT_SLOTS.filter((s): s is Extract<ImportSlot, { available: true }> => s.available);

// ===========================================================================================
// The checks — what makes the rules above rules
// ===========================================================================================

/**
 * Every setting declares a usable source list.
 *
 * WHICH HALF IS LOAD-BEARING, since two checks look alike here: `sources` being a required field is
 * what catches a setting added with no declaration at all, and it catches it in `typecheck`, at the
 * definition, over every setting, with nothing to keep in scope. THIS function catches what a
 * required field cannot — `sources: []` type-checks, reads as a declaration, and means the setting is
 * visible nowhere. Neither subsumes the other, so #720's "a setting with no declaration fails the
 * build" is both of them: `typecheck` plus this, run by `npm run -w @prism3/studio test`.
 */
export const declarationDefects = (): string[] => {
  const out: string[] = [];
  for (const s of ALL_SETTINGS) {
    if (s.sources.length === 0) out.push(`${s.key}: declares no source — it would be visible nowhere`);
    for (const src of s.sources) {
      if (!ALL_SOURCES.includes(src)) out.push(`${s.key}: declares unknown source '${src}'`);
    }
    if (new Set(s.sources).size !== s.sources.length) out.push(`${s.key}: declares a source twice`);
    if (!ARTIFACTS.some((a) => a.id === s.artifact)) out.push(`${s.key}: names unknown artifact '${s.artifact}'`);
    if (!s.options.some((o) => o.value === s.def)) out.push(`${s.key}: default '${s.def}' is not one of its options`);
    if (s.options.length < 2) out.push(`${s.key}: fewer than two options — nothing to choose`);
    if (new Set(s.options.map((o) => o.value)).size !== s.options.length) out.push(`${s.key}: two options share a value`);
  }
  const keys = ALL_SETTINGS.map((s) => s.key);
  if (new Set(keys).size !== keys.length) out.push('two settings share a key');
  // A setting nobody can reach is as much a defect as one nobody declared: it means the export it
  // shapes cannot be produced. Checked against what is AVAILABLE, not against what is declarable.
  for (const s of ALL_SETTINGS) {
    if (!s.sources.some((src) => AVAILABLE_SOURCES.includes(src))) {
      out.push(`${s.key}: no available source declares it — unreachable in the UI`);
    }
  }
  return out;
};

/**
 * Copy a designer can read (#618, reading 1 — labels recognizable, descriptions allowed precise
 * domain vocabulary).
 *
 * A RULE, NOT A WORD LIST. An engine internal is identifier-SHAPED — a camel hump, or an underscore
 * inside a word — where domain vocabulary is not: `ink`, `fill`, `surface`, `alias`, `token` all pass
 * a shape test that `tokenNameCase`, `roleToPalette`, `nonTextMin` and `buildOverlaySet` all fail. A
 * hand-maintained list would have to grow with every engine export; this grows with nothing.
 *
 * Its limit, stated because a check whose scope is misread is worse than none: this catches jargon
 * that LOOKS like code. A term no designer could learn from two encounters, spelled as ordinary
 * words, passes here and needs a reader. Option labels are exempt from the identifier scan for one
 * reason — they are token names on purpose (`color.on-fill`), which is the setting demonstrating
 * itself; they are held to being real paths instead, below.
 */
export const jargonDefects = (): string[] => {
  const out: string[] = [];
  const identifierish = (text: string): readonly string[] =>
    text.match(/\b[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)+\b|\b[a-z0-9]+_[a-z0-9]+\b/g) ?? [];
  const check = (where: string, text: string): void => {
    for (const hit of identifierish(text)) out.push(`${where}: '${hit}' reads as an identifier, not as words`);
  };
  for (const a of ARTIFACTS) { check(`artifact ${a.id} label`, a.label); check(`artifact ${a.id} desc`, a.desc); }
  for (const s of ALL_SETTINGS) {
    check(`${s.key} label`, s.label);
    check(`${s.key} desc`, s.desc);
    // The exact miss #618's decision names: a control keyed `tokenNameCase` still needs copy that
    // does not lean on the key to explain itself.
    if (`${s.label} ${s.desc}`.includes(s.key)) out.push(`${s.key}: its own key appears in its copy`);
  }
  for (const slot of availableImportSlots()) {
    check(`import slot ${slot.id} label`, slot.label);
    check(`import slot ${slot.id} desc`, slot.desc);
  }
  return out;
};

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Canonical form for comparing two documents whose KEY ORDER may differ but whose content must not. */
const canonical = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canonical);
  if (isObj(v)) {
    const out: Node = {};
    for (const k of Object.keys(v).sort()) out[k] = canonical(v[k]);
    return out;
  }
  return v;
};

/**
 * Rule 2, measured: each setting round-trips over a REAL emitted tree, by the sense its `admits`
 * declares.
 *
 * The independence to notice (docs/34): every comparison here is against the caller's input tree —
 * the artifact the engine actually emitted — never against a fixture written alongside the transform
 * and never against another projection of the same code. A fixture would agree with whatever the
 * transform does; the emitted tree does not care.
 *
 * The `renaming` case is where the corpus does the work. It is not enough to invert the transform on
 * the paths it produced: two distinct segments mapping to one name is a silent merge that inverts
 * fine, so collisions are checked separately, against the real segment set.
 */
export const admissionDefects = (tree: unknown, slug = 'brand'): string[] => {
  const out: string[] = [];
  const base = defaultSettings();
  const one = (s: SettingsState): OutFile[] => projectDtcg(tree, slug, s) as OutFile[];

  for (const setting of ALL_SETTINGS) {
    if (setting.artifact !== 'dtcg') continue;
    for (const opt of setting.options) {
      const s: SettingsState = { ...base, [setting.key]: opt.value };
      const tag = `${setting.key}=${opt.value}`;

      if (setting.admits === 'renaming') {
        const segs = new Set<string>();
        for (const { path } of leavesOf(tree)) for (const seg of path.split('.')) segs.add(seg);
        const seen = new Map<string, string>();
        for (const seg of segs) {
          const fwd = renameSegment(seg, opt.value);
          const back = unrenameSegment(fwd, opt.value);
          if (back !== seg) out.push(`${tag}: '${seg}' → '${fwd}' → '${back}' does not round-trip`);
          const prior = seen.get(fwd);
          if (prior !== undefined) out.push(`${tag}: '${seg}' and '${prior}' both → '${fwd}'`);
          seen.set(fwd, seg);
        }
        // …and the whole document inverts: unrename every path in the output and it is the input
        // again, token for token. Note what this does NOT see — a rename that skipped `$value` leaves
        // every path correct and every reference dead, so it passes here and fails `aliasDefects`.
        // The two are not redundant, and dropping either loses a distinct failure.
        const files = one(s);
        if (files.length !== 1) { out.push(`${tag}: expected one file to invert, got ${files.length}`); continue; }
        const doc = JSON.parse(files[0].text) as unknown;
        const inverted = leavesOf(doc).map(({ path, leaf }) => ({
          path: path.split('.').map((x) => unrenameSegment(x, opt.value)).join('.'),
          leaf,
        }));
        const want = leavesOf(tree);
        if (inverted.length !== want.length) out.push(`${tag}: ${want.length} leaves in, ${inverted.length} out`);
        const wantPaths = new Set(want.map((l) => l.path));
        for (const l of inverted) {
          if (!wantPaths.has(l.path)) out.push(`${tag}: '${l.path}' is not a path of the input`);
        }
        if (!sameJson(canonical(metaOf(doc)), canonical(metaOf(tree)))) {
          out.push(`${tag}: the document's own $extensions did not survive`);
        }
      }

      if (setting.admits === 'nesting') {
        const files = one(s);
        if (files.length !== 1) { out.push(`${tag}: expected one file, got ${files.length}`); continue; }
        const doc = JSON.parse(files[0].text) as Node;
        // Every token survives the reshape, and comes back with the same path and the same leaf.
        const got = leavesOf(opt.value === 'dotted' ? nest(Object.entries(doc)
          .filter(([k]) => !k.startsWith('$'))
          .map(([path, leaf]) => ({ path, leaf: leaf as Node }))) : doc);
        const want = leavesOf(tree);
        if (got.length !== want.length) out.push(`${tag}: ${want.length} leaves in, ${got.length} out`);
        if (!sameJson(canonical(nest(got)), canonical(nest(want)))) out.push(`${tag}: leaves differ after the reshape`);
        if (!sameJson(canonical(metaOf(doc)), canonical(metaOf(tree)))) out.push(`${tag}: the document's own $extensions did not survive`);
      }

      if (setting.admits === 'file-count') {
        const files = one(s);
        if (opt.value === 'per-group' && files.length < 2) out.push(`${tag}: split produced ${files.length} file(s)`);
        if (opt.value === 'single' && files.length !== 1) out.push(`${tag}: produced ${files.length} files`);
        const merged = mergeFiles(files);
        if (!sameJson(canonical(merged), canonical(JSON.parse(one(base)[0].text)))) {
          out.push(`${tag}: the files do not merge back into the single-file export`);
        }
      }

      if (setting.admits === 'serialization') {
        const files = one(s);
        const plain = one({ ...base, [setting.key]: setting.def });
        if (files.length !== plain.length) { out.push(`${tag}: changed the file count`); continue; }
        for (let i = 0; i < files.length; i++) {
          if (!sameJson(JSON.parse(files[i].text), JSON.parse(plain[i].text))) {
            out.push(`${tag}: ${files[i].name} parses differently from the default formatting`);
          }
        }
        if (opt.value === 'compact' && files.some((f) => f.text.includes('\n  '))) {
          out.push(`${tag}: still indented`);
        }
        if (opt.value === 'pretty' && !files.some((f) => f.text.includes('\n  '))) {
          out.push(`${tag}: not indented`);
        }
      }
    }
  }
  return out;
};

/** The token paths a projected file defines, whichever grouping it used. */
const pathsIn = (doc: unknown, s: SettingsState): readonly string[] =>
  s.formatDotNotation === 'dotted'
    ? Object.keys(isObj(doc) ? doc : {}).filter((k) => !k.startsWith('$'))
    : leavesOf(doc).map((l) => l.path);

/** Every leaf of a projected file, whichever grouping it used. */
const leavesIn = (doc: unknown, s: SettingsState): readonly Leaf[] =>
  s.formatDotNotation === 'dotted'
    ? Object.entries(isObj(doc) ? doc : {}).filter(([k]) => !k.startsWith('$')).map(([path, leaf]) => ({ path, leaf: leaf as Node }))
    : leavesOf(doc);

/**
 * Every alias in a projected export resolves to a token the export DEFINES — across the whole set of
 * files, which is the scope a consumer reads at.
 *
 * This is the check the renaming setting actually stands on. A rename that rewrites keys and forgets
 * `$value` produces a file that parses, validates, holds every token, and whose every reference is
 * dead — no count, no diff of paths and no round-trip of the path set would notice, because the paths
 * are all correct. What notices is resolving the references against the keys.
 *
 * WHY THE SET AND NOT EACH FILE. Resolving per file is the stricter property, and asserting it was
 * wrong rather than cautious: it is not a property a split HAS, and it is not one a consumer needs.
 * `packages/tokens/sd.consumer.mjs` passes Style Dictionary a `source` ARRAY and SD merges before it
 * resolves — the same way `base` + `<mode>.overlay` compose (#609). Split by group, `color` aliases
 * `palette` across a file boundary by design, exactly as a hand-authored token repo does. Held to the
 * per-file rule, the only admissible split would be one that duplicated the palette into every file,
 * which is a worse export. So the scope of the check is the scope of the merge.
 */
export const aliasDefects = (tree: unknown, s: SettingsState, slug = 'brand'): string[] => {
  const out: string[] = [];
  const files = projectDtcg(tree, slug, s);
  const docs = files.map((f) => ({ name: f.name, doc: JSON.parse(f.text) as unknown }));
  // The whole set's paths, because a consumer merges the set before resolving.
  const defined = new Set(docs.flatMap(({ doc }) => pathsIn(doc, s)));
  let refs = 0;
  for (const { name, doc } of docs) {
    const walk = (v: unknown): void => {
      if (typeof v === 'string') {
        for (const m of v.matchAll(/\{([^{}]+)\}/g)) {
          refs++;
          if (!defined.has(m[1])) out.push(`${name}: alias {${m[1]}} resolves to nothing`);
        }
        return;
      }
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (isObj(v)) { for (const x of Object.values(v)) walk(x); }
    };
    for (const { leaf } of leavesIn(doc, s)) walk(leaf.$value);
  }
  // An export with no references at all would pass the loop above vacuously — the shape docs/34 calls
  // a probe over a haystack that cannot disagree. So assert there were references to resolve. Counted
  // over the SET for the same reason: a split's palette file legitimately holds none of its own.
  if (refs === 0) out.push(`${slug}: no aliases found to resolve — the check ran on nothing`);
  return out;
};

/**
 * The sample exercises every control, and every criterion earns its line — both directions (#720).
 *
 * One direction alone is the weaker half: a sample can satisfy "every control is visible" and still
 * carry three lines that no control touches, which makes the changes that DO happen harder to find.
 * `fileStructure` is excluded by name here because it is not a leaf property — its visibility is the
 * file list, asserted separately by the caller.
 */
export const sampleDefects = (tree: unknown, max = 6): string[] => {
  const out: string[] = [];
  const picked = sampleLeaves(tree, max);
  if (picked.length < 4) out.push(`sample has only ${picked.length} lines`);
  if (picked.length > max) out.push(`sample has ${picked.length} lines, over the ${max} budget`);
  const leafShaped = ALL_SETTINGS.filter((s) => s.artifact === 'dtcg' && s.key !== 'fileStructure');
  for (const s of leafShaped) {
    const cs = SAMPLE_CRITERIA.filter((c) => c.exercises === s.key);
    if (cs.length === 0) { out.push(`${s.key}: no sample criterion exercises it`); continue; }
    for (const c of cs) {
      if (!picked.some(({ path, leaf }) => c.test(path, leaf))) out.push(`${s.key}: criterion '${c.key}' matched no sampled leaf`);
    }
  }
  for (const { path, leaf } of picked) {
    if (!SAMPLE_CRITERIA.some((c) => c.test(path, leaf)) && path !== picked[0].path) {
      out.push(`${path}: sampled but no criterion explains it`);
    }
  }
  // And the file list has to move, or the split control is the invisible one.
  const single = fileNames(tree, 'brand', { ...defaultSettings(), fileStructure: 'single' });
  const split = fileNames(tree, 'brand', { ...defaultSettings(), fileStructure: 'per-group' });
  if (single.length !== 1 || split.length <= single.length) {
    out.push(`fileStructure: file list did not change (${single.length} → ${split.length})`);
  }
  return out;
};
