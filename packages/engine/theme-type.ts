/** Prism3 engine — Typography: typefaces, families, weight roles, the size ladder, line heights, letter spacing and the
 *  type composites.
 *
 *  Split out of `theme.ts` (#3698 R5), which re-exports its public names unchanged.
 */
import { genericClassOf, SERIF_FALLBACK } from './font-class';

// ---------------------------------------------------------------------------
// Typography axis (Phase 1 — primitive tier). Grounded in 23-typography-
// tokenisation + the Prism2 reference scale. Deliberate deviation from the KB's
// modular-ratio recommendation: the size ladder is a CURATED rem scale, not a
// ratio. A single ratio leaves gaps (1.25 off 16px skips 24/28/36 — the sizes
// designers reach for) and yields non-round values; the curated ladder has
// variable step density (fine for text, coarse for display) and covers all bases
// with clean values. Font-size primitives are brand-INVARIANT (16px is 16px in
// any brand, like the spacing scale); the white-label lever is the families, the
// weight role→numeric map, and the `typeScale` preset (consumed at the semantic
// tier in Phase 2). Weight roles are FUNCTION-named (subtle/default/emphasis/
// strong/max over a numeric reference tier) — the white-label-safe answer to "one
// brand's bold is 700, another's 600": the role is the stable contract, the
// numeric is the brand-variable part (23 §"Naming the weight ladder"). The role

// set is data-driven (WEIGHT_ROLE_ORDER) so it extends without renames.
/** #415 — a family binding is keyed by CATEGORY, not by an abstract role. The `display|text|mono`
 *  role tier is gone: it was a middle layer Prism2 never had (its brand-theme binds
 *  `font/family/{display,title,body,detail}` straight to a typeface primitive), its brand-invariance
 *  argument held for any NAMED tier-2 and so never justified role-keying specifically, and its
 *  coupling is what forced #390 to invent per-mode `familyMap` so two categories sharing a role could
 *  diverge. Category-keyed, that divergence is the base case and needs no mechanism. */
export type FontFamilyBinding = { group: TypeGroup; stack: string[]; variable: boolean };
// A TYPEFACE is the primitive — the actual face, named after itself (`inter`,
// `clash-display`), carrying its fallback stack. `font.family.<category>` is the semantic
// that binds to one (`title → clash-display`). Two tiers, mirroring colour: a palette is
// named after the thing (`strawberry`), a semantic after the job (`color.text.danger`).
// The semantic is the brand-INVARIANT handle a shared codebase binds to — it survives a
// face swap, which a direct `font.typeface.clash-display` reference would not. What #269
// argued for was a NAMED tier-2, and category names satisfy that as well as role names did
// (#415); the typeface library is shared ACROSS brands, each binding its own.
export type Typeface = { slug: string; name: string; stack: string[]; variable: boolean };
/** Slugify a face name for its token path: `"Clash Display"` → `clash-display`. Derived,
 *  never user-chosen, so there is no arbitrary-rename churn — you either have that face
 *  or you don't. */
export const typefaceSlug = (name: string): string =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unnamed';
// The canonical weight-role ladder, lightest→heaviest. DATA-DRIVEN: this ordered
// array is the single source — `WeightRoleName` derives from it, the defaults map
// keys off it, and the build emits one `font.weight-role.*` primitive per entry.
// Adding a role (e.g. a `light` between subtle and default) is a one-line edit
// here + a default value below; no consumer hardcodes the four original names.
// `max` is the heaviest slot (black/900 territory) — brands that ship a heavy
// hero weight bind to it; it stays defined-but-unused by default categories
// (same as `subtle`), so default output is unchanged bar the extra primitive.
export const WEIGHT_ROLE_ORDER = ['subtle', 'default', 'emphasis', 'strong', 'max'] as const;
export type WeightRoleName = typeof WEIGHT_ROLE_ORDER[number];
export type WeightRole = { role: WeightRoleName; value: number };
/** Every text CATEGORY, in emission order. Since #415 each one binds a typeface directly rather than
 *  routing through a `display|text|mono` role, so this list doubles as the family-binding domain. */
export const TYPE_GROUPS = ['display', 'title', 'body', 'label', 'caption', 'eyebrow', 'code'] as const;
export type TypeGroup = typeof TYPE_GROUPS[number];
/** #1368 — a VERBATIM FACE PIN for one (category, weight-role) slot. A brand names the exact Figma
 *  face — `{ family, style }` — that a slot should bind, OVERRIDING the numeric-weight → style-name
 *  derivation. This is how a WIDTH cut the numeric weight axis can't reach (e.g. ITC Garamond Std
 *  *Light Condensed*, PostScript `ITCGaramondStd-LtCond`) binds at all: `subtle` (300) would resolve
 *  plain "Light", never "Light Condensed".
 *
 *  `family` must equal the category's bound family — a pin names a CUT WITHIN the face, not a different
 *  face — because the emitted Text Style binds `fontFamily` to the `font.family.<category>` variable and
 *  the write lane resolves the loaded `fontName.family` FROM that variable's value (`write-plan.ts`
 *  `fontFamilyPrimary`). A pin whose family diverged would be silently ignored at the host. Only the
 *  STYLE changes. The numeric `fontWeight` variable still follows the slot's weight-role numeric (a Light
 *  cut is still weight 300), so it stays truthful. */
export type FacePin = { family: string; style: string };

/** #1296 — does a Figma STYLE NAME name an italic cut? A face pin that does is refused (`buildComposites`):
 *  italic belongs to the italics levers, which also put `fontStyle: 'italic'` into the tokens, whereas a
 *  pin changes only the Figma style and would leave code upright.
 *
 *  THE RULE: the case-insensitive substring `italic`. A substring rather than a whole word because Figma
 *  style names come from each font's own subfamily names, and slanted cuts are spelled several ways —
 *  "Italic", "Medium Italic", "SemiBold Italic", "Light Condensed Italic", and the joined "BoldItalic"
 *  some families ship. A whole-word match would let the joined form through, and a miss is the defect
 *  this refuses. It is also the test TokenPress applies to the same style name when it reads it back to
 *  DTCG (`typography-converter.ts` `extractFontStyle`), transcribed here rather than imported so the two
 *  stay independent. `Oblique` is deliberately NOT matched: the italics levers derive "<Weight> Italic"
 *  names, and the plugin's style resolver has no Italic-to-Oblique synonym, so refusing an oblique pin
 *  would leave an oblique-only family with no route at all. */
export const isItalicCut = (style: string): boolean => style.toLowerCase().includes('italic');

// A semantic composite: a (group, variant) bundling family + size + weight role +
// line-height + tracking. Two composites may share a size primitive (e.g. title.xs
// and body.lg both at 18px) — they differ on family/line-height/weight/intent;
// family is a property of the GROUP, not the size. The size ladder underneath is
// single-source.
export type TypeComposite = {
  group: TypeGroup; variant: string; path: string; sizePx: number;   // desktop / max
  sizeMinPx: number;                               // mobile / min (== sizePx when static)
  // #415 — no `family` field: a composite's family IS its group (`type.title.*` → `font.family.title`),
  // so carrying it separately would be a second copy of the same fact.
  lineHeight: string; weightRole: WeightRoleName; tracking: string;
  // #296 — per-mode RE-POINT: the rung key this composite binds in a given mode, when it differs
  // from the light key. Absent ⇒ the composite uses one rung across every mode.
  lineHeightByMode?: Record<string, string>;
  trackingByMode?: Record<string, string>;
  // #328 — per-mode rung SIZE. Carries its OWN recomputed mobile endpoint: inheriting the brand-level
  // `sizeMinPx` would pair a re-sized desktop value with a floor derived from the size it replaced.
  sizeByMode?: Record<string, number>;
  sizeMinByMode?: Record<string, number>;
  textCase: 'none' | 'uppercase' | 'lowercase';   // baked style (not Figma-bindable; code/style-side)
  link: boolean;                                   // underlined link variant (textDecoration baked)
  italic: boolean;                                 // italic variant — orthogonal modifier PAIRED with the weight
                                                   // (`strong` + `strong-italic`), NOT a weight role; emits
                                                   // `fontStyle: 'italic'` on the composite $value (off-core-DTCG,
                                                   // the shared Token-Press contract), omitted when normal.
  // #1296 — the category is italic by default (`typography.italicDefault`): this composite, though bare
  // (no `-italic` modifier in its name), renders in the italic cut. Present only when true, so a
  // composite object for every other category is unchanged. Distinct from `italic`, which marks the
  // paired MODIFIER variant and drives the `-italic` path suffix.
  italicDefault?: true;
  // #1368 — a verbatim Figma face pinned for THIS slot (see `FacePin`). Present only on the composites
  // whose (group, weightRole) the brand pinned via `typography.faces`; absent ⇒ the fontStyle is derived
  // from the weight-role numeric as before. Carries the whole pin so the emitter needs no re-lookup.
  facePin?: FacePin;
};
export type Typography = {
  families: FontFamilyBinding[];
  /** The typeface PRIMITIVES the roles bind to — de-duplicated by slug, and unioned across
   *  every per-mode family override so a mode's alias always lands on a real leaf (the same
   *  contract `weightsRef` has for per-mode weight numerics). */
  typefaces: Typeface[];
  sizesPx: number[];                                  // curated ladder (px; rem = px/16)
  weightsRef: number[];                               // 100..900 numeric reference tier
  weightRoles: WeightRole[];                          // function-named roles → numeric
  lineHeights: { key: string; value: number }[];      // unitless multipliers
  letterSpacings: { key: string; em: number }[];      // em-relative tracking
  typeScale: 'compact' | 'default' | 'expressive';    // shifts heading sizes up/down the ladder
  composites: TypeComposite[];                        // semantic tier (Phase 2)
  fluid: boolean;                                     // responsive sizing on (Phase 3)
  minViewport: number;                                // px — fluid clamp() interpolation floor
  maxViewport: number;                                // px — fluid clamp() interpolation ceiling
  /** #2942 — the link underline, each field a whole percent of the font size, or 'auto' (see `resolveUnderline`). */
  underline: ResolvedUnderline;
  // Per-mode typography levers (Phase D) — only modes whose `modeLevers.families`/`weights` deviate
  // the baseline. Each carries the RE-DERIVED primitives (via the same helpers buildTypography uses):
  // family stacks per family-role, weight-role → numeric per weight-role. Every typography COMPOSITE
  // inherits automatically (its fontFamily/fontWeight alias the family/weight-role PRIMITIVE), so the
  // composite SET is untouched. Absent (field omitted) when no per-mode typography → byte-identical.
  familiesByMode?: Record<string, FontFamilyBinding[]>;
  weightRolesByMode?: Record<string, WeightRole[]>;
  // Per-mode LINE HEIGHT / LETTER SPACING ramps (Phase D) — only modes whose `modeLevers.lineHeights`/
  // `letterSpacings` deviate the baseline. Each carries the FULL named ramp re-anchored for that mode
  // (steps at the light value where the mode didn't override). Composites inherit via their
  // line-height/letter-spacing key alias, so the composite set is untouched. Absent ⇒ byte-identical.
  // #296 — per-mode leading/tracking RE-POINT maps (rung → rung). Not per-mode ramps: the rungs are
  // mode-invariant primitives, so a mode records only which rung stands in for which.
  lineHeightRepointByMode?: Record<string, Record<string, string>>;
  letterSpacingRepointByMode?: Record<string, Record<string, string>>;
  /** #377 — the EMISSION shape of the same intent: mode → role → the ladder VALUE that role resolves to
   *  in that mode. Derived from the re-point maps above, not authored alongside them, so there is still
   *  one source of truth; the re-point map stays the authoring/UI vocabulary (rung → rung) while this is
   *  what `tree.ts` needs to hang `$extensions.prism3.modes` on the semantic role. */
  lineHeightRoleByMode?: Record<string, Record<string, number>>;
  letterSpacingRoleByMode?: Record<string, Record<string, number>>;
  /** #328 — mode → heading group → rung → px. Only DIFFERING rungs are recorded, so an inert
   *  declaration leaves this absent and the artifact byte-identical. */
  typeSizesByMode?: Record<string, Record<string, Record<string, number>>>;
};

const SANS_FALLBACK = ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'];
const MONO_FALLBACK = ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'];
/** #3140 (Q3138.6 A): the tail for a lone face. A face `font-class.ts` knows as a serif takes the serif tail in place of
 *  the sans one; every other tail (mono, and sans for an unknown family) is unchanged. */
const tailFor = (face: string, fallback: string[]): string[] =>
  fallback === SANS_FALLBACK && genericClassOf(face) === 'serif' ? SERIF_FALLBACK : fallback;
// Line-height + letter-spacing are curated NAMED ramps (semantic keys → value). The key ORDER is the
// single source: `LineHeightKey`/`LetterSpacingKey` derive from it, and per-mode overrides
// (modeLevers.lineHeights/letterSpacings) are keyed by these names. Composites reference a key
// (lineHeightFor / trackingFor pick which). NOTE (#296): a per-mode override no longer re-anchors a
// key's VALUE — the rungs are mode-invariant primitives, and the mode re-points the composite at a
// different rung instead. What follows describes the BRAND-level ramp, which a brand may re-anchor
// freely (mode-invariantly); the per-mode path snaps to whichever rung it lands nearest. Was: every
// composite that uses it — the same seam as weight-role.
// #388 — `cozy` (1.40) sits between `compact` and `normal` so CAPTION can have its own band. Captions
// are the smallest running text the system emits, and small text is where leading carries the most
// legibility weight, but caption shared `normal` (1.50) with body — long-form body leading on a short,
// small run. 1.40 is the first BODY step on the ladder (KB body range 1.4–1.6), so this is the tightest
// value that is still a reading leading rather than a heading one.
export const LINE_HEIGHT_KEYS = ['tight', 'snug', 'compact', 'cozy', 'normal', 'relaxed', 'loose'] as const;
export type LineHeightKey = typeof LINE_HEIGHT_KEYS[number];
// #2322 (owner, 2026-10-08) — three roles between and beyond the six: `tightest` (−4%, display headings), `snugger`
// (−1.5%, between tight and snug) and `open` (+1%, between normal and wide). The six keep their names and values.
export const LETTER_SPACING_KEYS = ['tightest', 'tighter', 'tight', 'snugger', 'snug', 'normal', 'open', 'wide', 'wider'] as const;
export type LetterSpacingKey = typeof LETTER_SPACING_KEYS[number];
/** THE STEPS A TRACKING NUDGE MOVES ALONG (`trackingShift`, the Type view's nudge): the six roles from before
 *  #2322, unchanged. A nudge counts rungs, so inserting `snugger` and `open` into its path would move every brand
 *  that nudges a group: one step tighter from `snug` would land on −1.5% instead of −2%. The new roles are for a
 *  role or the chrome to bind by name; whether a nudge should use them too is a separate choice. */
export const TRACKING_SHIFT_KEYS = ['tighter', 'tight', 'snug', 'normal', 'wide', 'wider'] as const satisfies readonly LetterSpacingKey[];
/** The PRIMITIVE ladders (#377). Curated and locked: a brand binds a role to a step, it does not
 *  re-anchor a step's value. That is the whole point of numeric keys — `line-height.150` must be 1.50
 *  or the name lies, which is exactly why value-editing had to go.
 *
 *  Sized from field research, not taste. Both reference systems already ship this two-tier shape —
 *  Prism2 (`lineheight.105…175` + `mostcompact/compact/default/relaxed` aliases) and NB
 *  (`lineheight.1p1…1p5` + `xs/sm/md/lg/xl`) — and the engine's previous six values WERE Prism2's
 *  ladder, flattened into one tier. The density comes from where brands actually need to move: the KB's
 *  archetype guidance ("approachable → generous body 1.5–1.6; expert → controlled headings") was
 *  unexpressible on the old ladder, which offered exactly ONE value (1.50) across the whole 1.40–1.60
 *  body range. The 1.30→1.40 gap is deliberate — the heading/body boundary, where nothing sits.
 *
 *  Wider than any single reference system on purpose: Prism2 ships 6 because 6 is what Prism2 needed.
 *  A white-label generator needs the union of what ANY brand might bind. */
export const LINE_HEIGHT_LADDER = [
  1.00, 1.05, 1.10,                      // hero display — Tailwind ships leading-none 1.0
  1.15, 1.20, 1.25, 1.30,                // display text + title (KB: 1.1–1.3)
  1.40, 1.45, 1.50, 1.55, 1.60,          // body (KB: 1.4–1.6) — dense → generous
  1.65, 1.75,                            // long-form reading
  2.00,                                  // deliberately generous / accessible reading
] as const;
export const LETTER_SPACING_LADDER = [
  -0.05, -0.04, -0.03, -0.02, -0.015, -0.01, -0.005,   // negative: display/hero tightening
  0,
  0.005, 0.01, 0.02, 0.03, 0.05, 0.08, 0.10,           // positive: eyebrow/all-caps opening
] as const;
/** Ladder step → its emitted key. Leading is ×100 (Prism2's convention: 1.50 → `150`); tracking is
 *  ×1000 with a `neg-` prefix rather than a minus sign, since `-` reads as a path separator in slugs
 *  (Prism2 does the same: `neg-015`). */
export const lineHeightStepKey = (v: number): string => String(Math.round(v * 100));
export const letterSpacingStepKey = (em: number): string =>
  (em < 0 ? 'neg-' : '') + String(Math.abs(Math.round(em * 1000)));
const LINE_HEIGHTS: { key: LineHeightKey; value: number }[] = [
  { key: 'tight', value: 1.05 }, { key: 'snug', value: 1.15 }, { key: 'compact', value: 1.25 },
  { key: 'cozy', value: 1.4 },
  { key: 'normal', value: 1.5 }, { key: 'relaxed', value: 1.65 }, { key: 'loose', value: 1.75 },
];
const LETTER_SPACINGS: { key: LetterSpacingKey; em: number }[] = [
  { key: 'tightest', em: -0.04 }, { key: 'tighter', em: -0.03 }, { key: 'tight', em: -0.02 }, { key: 'snugger', em: -0.015 },
  { key: 'snug', em: -0.01 }, { key: 'normal', em: 0 }, { key: 'open', em: 0.01 },
  { key: 'wide', em: 0.02 }, { key: 'wider', em: 0.05 },
];
/** The roles #2322 added. Each, when a brand does not set it, takes its default CLAMPED between its two resolved
 *  neighbors, so a brand that re-anchored a neighbor past it (`tighter: -0.05`) still builds: `tightest` then sits
 *  at `tighter`'s value rather than crossing it, which the order check would refuse. A neighbor's value is on the
 *  ladder, so the clamped value is too. */
const ADDED_TRACKING = new Set<LetterSpacingKey>(['tightest', 'snugger', 'open']);
const resolveLetterSpacings = (t: { letterSpacings?: Partial<Record<LetterSpacingKey, number>> }): { key: LetterSpacingKey; em: number }[] => {
  const ems = LETTER_SPACINGS.map((l) => (ADDED_TRACKING.has(l.key) ? undefined : t.letterSpacings?.[l.key] ?? l.em));
  LETTER_SPACINGS.forEach((l, i) => {
    if (!ADDED_TRACKING.has(l.key)) return;
    const set = t.letterSpacings?.[l.key];
    if (set !== undefined) { ems[i] = set; return; }
    const prev = ems.slice(0, i).reverse().find((v) => v !== undefined);
    const next = ems.slice(i + 1).find((v) => v !== undefined);
    ems[i] = Math.min(next ?? Infinity, Math.max(prev ?? -Infinity, l.em));
  });
  return LETTER_SPACINGS.map((l, i) => ({ key: l.key, em: ems[i]! }));
};
export const WEIGHT_ROLE_DEFAULT: Record<WeightRoleName, number> = { subtle: 300, default: 400, emphasis: 600, strong: 700, max: 900 };
// The numeric weights the token contract guarantees whatever the roles say (#1718). Deliberately a
// literal list, NOT derived from WEIGHT_ROLE_DEFAULT: it is the contract's promise, and the default
// roles moving must not quietly move it.
const CONTRACT_WEIGHTS = [300, 400, 700, 900] as const;

// Curated rem ladder: text [10–18] in 1–2px steps; ¼rem (4px) 20→40; ½rem (8px)
// 48→80; 1rem (16px) 96→160. 22 steps, all clean rem values (matches Prism2).
//
// `floor` is the OPT-IN sub-10px escape hatch (#1363, typography.sizeFloor). The floor is a hard 10px
// for every default brand — 8px sits below the size range the system's contrast ratios were reasoned
// about, so it is reachable ONLY by explicitly opting in, never off the default ladder. `8` PREPENDS a
// single 8px rung (an eighth of a rem, on the ½rem sub-grid) and changes nothing else; the rest of the
// ladder is byte-identical, so no existing rung moves.
const fontSizeLadder = (floor: 8 | 10 = 10): number[] => {
  const px = floor === 8 ? [8, 10, 11, 12, 14, 16, 18] : [10, 11, 12, 14, 16, 18];
  for (let p = 20; p <= 40; p += 4) px.push(p);
  for (let p = 48; p <= 80; p += 8) px.push(p);
  for (let p = 96; p <= 160; p += 16) px.push(p);
  return px;
};

const asStack = (fam: string | string[] | undefined, fallbackFace: string, fallback: string[]): string[] => {
  if (!fam) return [fallbackFace, ...fallback];
  const arr = Array.isArray(fam) ? fam : [fam];
  return arr.length > 1 ? arr : [...arr, ...fallback];   // single face → append fallback; full stack → trust it
};

export type TypographyInput = {
  /** The face each CATEGORY draws from (#415) — keyed by category, not by an abstract role. A lone
   *  name auto-pads a system fallback stack; a full array is trusted verbatim. Unset categories take
   *  the engine default (Inter, or JetBrains Mono for `code`), so a brand states only what it chooses.
   *
   *  `code: null` OPTS OUT of code styles entirely — most brands have no mono face, and a brand
   *  without one ships no `code` category. It replaces the old `mono: null`, which said the same thing
   *  one tier up. Omitted (undefined) keeps the default, so a brand that never mentions code is
   *  unaffected. */
  families?: Partial<Record<TypeGroup, string | string[] | null>> & { variable?: boolean | Partial<Record<TypeGroup, boolean>> };
  /** Faces the brand HAS, independent of which job any of them does (#287). Before this, a typeface
   *  existed only if a role bound it — "add a typeface" and "bind a typeface to a role" were the same
   *  action, with nowhere to stage a face while deciding. Each entry emits a `font.typeface.<slug>`
   *  primitive exactly like a bound face, so pointing a role at one later changes no token shape.
   *
   *  Deleting a BOUND entry is not a thing the engine has to handle, which is the whole point of the
   *  chosen removal semantics (owner, 2026-08-01: only unbound entries are deletable). Drop a still-bound
   *  name from this list and its primitive survives anyway — the role keeps deriving it — so there is no
   *  cascade to write and #269's "no cascade needed" resolution stands. */
  typefaceLibrary?: string[];
  weightRoles?: Partial<Record<WeightRoleName, number>>;
  typeScale?: 'compact' | 'default' | 'expressive';
  /** Cap the display tier by RUNG, not by px (#328). Brands that don't need mega
   *  heroes stop lower (e.g. `'xl'`); the ladder is unchanged, the engine just omits
   *  display composites above the named rung. Default `'3xl'` (full).
   *
   *  Named by rung rather than by px deliberately: a px cap is compared against sizes
   *  that `typeScale` has already shifted, so the SAME cap yielded a different number
   *  of rungs per scale (96px kept 4 under compact/default but 3 under expressive) —
   *  a brand lever silently changing the type SET. The engine even shipped a note
   *  apologizing for the discrepancy. A rung name is invariant under the shift. */
  displayCeiling?: DisplayVariant;
  /** Whether the title tier includes `title.2xs`. `16` adds it — a 16px brand-font
   *  heading that deliberately overlaps `body.md`; `18` (default) omits it.
   *
   *  This is pure SET MEMBERSHIP: it decides whether a rung exists, and never clamps
   *  a size. It used to also do `Math.max(sizePx, titleFloor)`, which fed a size
   *  operation into the monotonic dedupe and silently deleted a rung — `compact`
   *  lost `title.sm` (floor 18) or `title.xs` (floor 16), leaving a GAP mid-ramp. */
  titleFloor?: 16 | 18;
  /** Whether the caption tier includes `caption.sm` — a 10px fine-print rung (#1360). `10` adds it;
   *  `11` (default) omits it, flooring caption at `md` (11px). 10 is ALREADY on the size ladder, so
   *  this is pure SET MEMBERSHIP on an existing ladder step (the same split as `titleFloor`): it
   *  decides whether the rung exists, and never resizes another rung. OFF by default so no corpus
   *  brand moves — opt in for dense legal / footer / product-attribute fine print. */
  captionFloor?: 10 | 11;
  /** OPT-IN sub-10px escape hatch (#1363). `8` pushes the size-ladder floor to 8px (see
   *  `fontSizeLadder`) and adds a single `caption.xs` = 8px rung; `10` (default) is the hard floor and
   *  adds nothing. Modeled on `titleFloor` — an enumerated opt-in that enables one extra small rung on
   *  one group and touches nothing else — but 8px sits BELOW the size range the system's contrast
   *  ratios were reasoned about, so the engine FLAGS it in `notes` as a deliberate escape hatch (the way
   *  `actionPalette` flags a decoupled action colour), never a rung a brand reaches by accident. OFF by
   *  default so no corpus brand moves. */
  sizeFloor?: 8 | 10;
  /** Per-size overrides for the heading groups, keyed group → rung → px. The BASELINE counterpart of
   *  `modeLevers.<mode>.typeSizes`, and it exists because the asymmetry ran the wrong way: a size could
   *  be pinned per mode but not at the brand level, so a single-mode brand — the common case — could
   *  not tune its ramp while a multi-mode one could.
   *
   *  Applied AFTER the typeScale shift, so a pinned size is ABSOLUTE: it does not move when the scale
   *  changes. That is deliberate and it is why changing `typeScale` with sizes pinned can collide —
   *  the ramp check rejects it rather than silently re-shifting the value the author fixed.
   *
   *  Modes then override on top of the customized baseline, not the derived one.
   *
   *  `caption` is the one reading/UI category it also takes (#3077, owner decision 2026-10-27: caption A), at the
   *  BRAND level only: one static size per rung (`md`, `lg`), on the size ladder, at or above
   *  `CAPTION_SIZE_FLOOR`, and through the same strict ramp check. `sizeOverrides` and the per-mode
   *  `modeLevers.<mode>.typeSizes` stay heading-only, so caption keeps one size in every mode and viewport, as the
   *  mode-invariance contract for reading text says. `caption.xs`/`caption.sm` are not settable here: their floors
   *  (`sizeFloor`, `captionFloor`) pin them. */
  sizes?: Partial<Record<BrandSizeGroup, Record<string, number>>>;
  /** OPT-IN per-rung DESKTOP/MOBILE size override on the viewport axis (#1587). Keyed group → rung →
   *  `{ desktop?, mobile? }`, heading groups only (display/title/eyebrow), so a "rung" is a
   *  (group, variant) pair exactly as `sizes` above. It is the escape hatch for the viewport axis the
   *  Responsive lever otherwise controls only globally: a brand pins a specific desktop and/or mobile
   *  endpoint for ONE rung, overriding what the clamp/derive produced for that rung alone.
   *
   *  A rung with NO entry is fully clamp-derived — today's behaviour, byte-identical — so this is a pure
   *  addition: `desktop` overrides the composite's `sizePx` (taking precedence over `sizes` for that
   *  rung); `mobile` overrides the derived `sizeMinPx` (the fluid mobile endpoint `mobileEndpoint`
   *  otherwise computes). The pipeline downstream is untouched: `tree.ts` reshapes `sizeMinPx`/`sizePx`
   *  into `figma.modes.{mobile,desktop}` and the web `clamp()`, and both the plugin and paste write paths
   *  read those — the override writes the field the entire fluid pipeline already consumes.
   *
   *  A `mobile` override needs `responsive.fluid` on (there is no mobile mode otherwise). All constraints
   *  are enforced in `buildComposites` with by-name refusals (rung exists and is a heading rung; value is
   *  a ladder step; clears the heading floor; mobile ≤ its own desktop — no inverted ramp; the mobile ramp
   *  stays monotonic across rungs). `lint-size-override-coherence.ts` re-asserts the invariant
   *  independently. Omit for none (byte-identical). */
  sizeOverrides?: Partial<Record<PerModeSizeGroup, Record<string, { desktop?: number; mobile?: number }>>>;
  /** Per-role weight set. Weight is an axis on every type role (every composite
   *  carries the weight in its name). Defaults: display/title `[strong]`, body
   *  `[default, strong]` (add `emphasis` for a 3rd), caption `[default, strong]`,
   *  label/eyebrow `[emphasis]`, code `[default]`. Override a role to ship a
   *  multi-weight ramp (e.g. `display: ['default','strong']`, or `['strong','max']`
   *  for a black hero). Roles use the canonical weight-role names
   *  (subtle/default/emphasis/strong/max, lightest→heaviest). Every role keeps at least one weight,
   *  label keeps `emphasis`, and body and caption keep `default` (#1639/#1681, refused in `buildComposites`). */
  weights?: Partial<Record<TypeGroup, WeightRoleName[]>>;
  /** Per-(category, weight-role) VERBATIM FACE PIN (#1368). A slot may name the exact Figma face —
   *  `{ family, style }` — it should bind, OVERRIDING the numeric-weight → style-name derivation for
   *  that slot only. This is the WIDTH-cut escape hatch: `subtle` (300) otherwise resolves plain
   *  "Light", never NB's *Light Condensed* (`ITCGaramondStd-LtCond`). The mechanism is general (any
   *  slot the category ships can name a face) but is populated a slot at a time — NB pins display/subtle
   *  and title/subtle only.
   *
   *  Constraints (all enforced in `buildComposites`, each with its own by-name refusal): the category
   *  must be one the brand binds a family for; the weight-role must be one that category actually ships
   *  (via `weights`); and `family` must equal the category's bound family — a pin names a CUT within the
   *  face, not a different family (the emitted Text Style binds `fontFamily` to the category's variable,
   *  so a divergent family would be dropped at the host). Only the STYLE changes; the numeric weight the
   *  slot binds is untouched and stays truthful. Omit for none (byte-identical). */
  faces?: Partial<Record<TypeGroup, Partial<Record<WeightRoleName, FacePin>>>>;
  /** Which roles get an underlined `.link` variant for every size×weight. Default
   *  `['body','caption']`. Underline is baked; the link colour stays `text.link.*`. */
  links?: TypeGroup[];
  /** #2942 (owner Q1/Q4/Q5/Q800/Q801 A) — the underline every `-link` style draws: thickness and offset, each a
   *  unitless SHARE OF THE FONT SIZE (0.05 = 5%), or `'auto'`, which leaves it to the font. Default auto for both,
   *  so a brand that never sets it is byte-identical. A set value is held to a whole percent and CLAMPED to its
   *  bound (thickness 1–20%, offset 0–50%), corrected rather than refused, like the per-breakpoint column count
   *  (`resolveUnderline`). A set field emits `core.font.underline.<field>` (`$type: number`); auto emits nothing. */
  underline?: { thickness?: number | 'auto'; offset?: number | 'auto' };
  /** Which roles ship an `.*-italic` variant for every size×weight (and, for link
   *  roles, an italic-link too — italic and link are orthogonal). Italic is a
   *  weight-PAIRED modifier (`strong` + `strong-italic`), NOT a weight role; it
   *  emits `fontStyle: 'italic'` on the composite `$value`. Default `[]` — italics
   *  are a deliberate brand choice, so default output ships none (opt in per role,
   *  e.g. `['body','caption']` for emphasis in running text). */
  italics?: TypeGroup[];
  /** #1296 — which categories are ITALIC BY DEFAULT: every composite the category ships is set in the
   *  italic cut, under its ordinary name (`type.display.lg.emphasis`, no `-italic` suffix). Its `$value`
   *  carries `fontStyle: 'italic'`, and the derived Figma style name is the weight's italic instance
   *  (emphasis 500 → "Medium Italic"), through the same weight-to-style-name table the `italics` modifier
   *  uses. The numeric weight is untouched.
   *
   *  Same shape as `italics` and `links` — a list of categories — because it answers the same kind of
   *  question about a category ("which cut does it ship"), and a list is the smallest thing that can.
   *  The difference from `italics`: `italics` ADDS a paired `-italic` twin beside each upright weight;
   *  this REPLACES the upright cut. A category ships no upright variant while it is here (a heading voice
   *  is one or the other), and it may not also be in `italics`, where every twin would duplicate its bare
   *  weight — `buildComposites` refuses that by name. Italic is this lever family's job alone: a
   *  `typography.faces` pin naming an italic cut is refused and pointed here.
   *  Default `[]`, so every existing brand is byte-identical. */
  italicDefault?: TypeGroup[];
  /** Responsive sizing (Phase 3). `fluid` (default true) gives heading groups a
   *  mobile endpoint (= desktop × a per-group factor, snapped to the ladder); the
   *  same min/max pair drives the web `clamp()` and the Figma desktop/mobile modes.
   *  Reading/UI text stays static. `minViewport`/`maxViewport` (px, default
   *  375/1280) bound the clamp interpolation. */
  responsive?: { fluid?: boolean; minViewport?: number; maxViewport?: number };
  /** BIND a named LEADING rung to a step of `LINE_HEIGHT_LADDER` (unitless multiplier). The rung SET
   *  is fixed (tight…loose) — this changes which step a rung binds, not which rung a composite lands
   *  on, so every composite aliasing it reflows. Omitted rungs keep the curated default.
   *
   *  The value must be a LADDER STEP and the merged ramp must stay ordered; both are enforced. This
   *  used to document a continuous range of `[0.8, 3]`, which #384 superseded when it locked the
   *  ladder — a stale range reads as "any number in here is fine" and is exactly what the UI believed
   *  until #388 (it shipped `step="0.05"`, landing on 1.35 inside the deliberate 1.30→1.40 gap). */
  lineHeights?: Partial<Record<LineHeightKey, number>>;
  /** BIND a named TRACKING rung to a step of `LETTER_SPACING_LADDER` (em). Same contract as
   *  `lineHeights`, including the on-ladder and ordering checks (was documented as `[-0.5, 0.5]`). */
  letterSpacings?: Partial<Record<LetterSpacingKey, number>>;
  /** Per-group LEADING nudge, in rungs (typically -1 / 0 / +1). The engine derives
   *  a size-sensitive rung per composite (`lineHeightFor` — bigger headings get
   *  tighter leading); this shifts that whole curve without flattening it, so the
   *  size-sensitivity survives. Positive = more open. Default 0. */
  leadingShift?: Partial<Record<TypeGroup, number>>;
  /** Per-group TRACKING nudge, in rungs. Same contract as `leadingShift`;
   *  positive = wider. Default 0. */
  trackingShift?: Partial<Record<TypeGroup, number>>;
  /** Per-category TRACKING PIN (#3077, owner decision 2026-10-27: tracking A). Binds every composite in a category
   *  to one named letter-spacing role, any of the nine (`open` included, which no nudge reaches), and REPLACES the
   *  size-derived rung and the `trackingShift` nudge for that category only. That is what lets a category read one
   *  value across its whole ramp: display's derived rung splits at 96px (`tight` below, `tighter` at and above), and
   *  a nudge moves both halves together, so no nudge can make display uniform. Unpinned categories keep the derive
   *  plus nudge. The role still resolves through `letterSpacings` and each mode's re-points, so a pin names a role,
   *  never a value. Opt-in: omit for none (byte-identical). */
  tracking?: Partial<Record<TypeGroup, LetterSpacingKey>>;
};

// Semantic catalogue defaults (the 'default' typeScale, before levers). Family/
// weight/tracking are per-GROUP; line-height is size-derived for headings.
/** #415 — the default FACE per category, replacing the old category→role map. Uniform except `code`,
 *  because the role tier is what used to carry the grouping; a brand now states the faces it chooses
 *  and every unset category takes the system default. */
const TYPE_FAMILY_DEFAULT: Record<TypeGroup, { face: string; fallback: string[] }> = {
  display: { face: 'Inter', fallback: SANS_FALLBACK }, title: { face: 'Inter', fallback: SANS_FALLBACK },
  label: { face: 'Inter', fallback: SANS_FALLBACK }, eyebrow: { face: 'Inter', fallback: SANS_FALLBACK },
  body: { face: 'Inter', fallback: SANS_FALLBACK }, caption: { face: 'Inter', fallback: SANS_FALLBACK },
  code: { face: 'JetBrains Mono', fallback: MONO_FALLBACK },
};
// Weight is a CONFIGURABLE AXIS on every role (not a single baked weight): each
// role declares which weight roles it ships, and every composite carries the
// weight in its name (`type.body.md.strong`) so adding weights later never
// renames. Defaults stay lean — display/title single-weight (expandable: brands
// that ship multi-weight hero ramps just list more), body 2 (default + strong;
// `emphasis` is the opt-in 3rd), caption 2. Override per role via `weights`.
export const TYPE_WEIGHTS_DEFAULT: Record<TypeGroup, WeightRoleName[]> = {
  display: ['strong'], title: ['strong'], label: ['emphasis'], eyebrow: ['emphasis'],
  body: ['default', 'strong'], caption: ['default', 'strong'], code: ['default'],
};
/**
 * #1639 (owner-decided 2026-09-26) — the weight roles a category can NEVER drop, each with the reason.
 * `badge` binds `type.label.*.emphasis` BY NAME (not through a weight intent, the way `field-label` does since #1602),
 * and so do `button` and (since #2945) `tag` unless `buttonLabelWeight` is 'default' (#1752),
 * so a label set without `emphasis` would leave them with no text style. `buildComposites` refuses such a set. Every other single-role default (eyebrow, code)
 * may be swapped, as long as the category keeps a weight: see the empty-set refusal there.
 * #1681 (owner-decided 2026-09-26, option A): `body` and `caption` keep `default` on the same footing —
 * the form controls bind those composites by name. A brand may still ADD weights to either.
 */
export const REQUIRED_WEIGHT_ROLES: Partial<Record<TypeGroup, { role: WeightRoleName; why: string }>> = {
  label: { role: 'emphasis', why: 'badges use it, and so do buttons and tags unless their label weight is Default' },
  body: { role: 'default', why: 'text fields, selects, text areas, and checkbox, radio and switch rows use it' },
  caption: { role: 'default', why: 'text areas and field messages use it' },
};
/**
 * #1752 — the weight role `buttonLabelWeight: 'default'` makes the button label bind, and the category it lives in.
 * `applyButtonLayout` rebinds the button family's `type.label.*.emphasis` to this role by name.
 *
 * EVERY BRAND SHIPS IT since owner decisions Q225 A and Q226 A (2026-10-10): Tabs binds `type.label.*.default` on
 * an unselected tab and `emphasis` on the selected one, so the label category always carries `default` beside its
 * own roles, whatever the button lever says. `withLabelDefault` unions it into the label weight set before the
 * composites are built, so the composites, the Figma text styles and `weightAvailability` all see it. A brand whose
 * label set already carries `default` is unchanged (same array back). The union keeps `WEIGHT_ROLE_ORDER`
 * (lightest first), the order every default set is written in. Until then it was unioned only under the lever.
 */
export const BUTTON_LABEL_DEFAULT_ROLE: WeightRoleName = 'default';
export const withLabelDefault = (t: TypographyInput | undefined): TypographyInput | undefined => {
  const roles = t?.weights?.label ?? TYPE_WEIGHTS_DEFAULT.label;
  // A malformed set is `buildComposites`' to refuse, by name; the union does not repair or mask it. An EMPTY set is
  // one (#1639 refuses a category with no weight), so it is passed through untouched rather than given `default`.
  if (!Array.isArray(roles) || roles.length === 0 || roles.includes(BUTTON_LABEL_DEFAULT_ROLE)) return t;
  const label = [...roles, BUTTON_LABEL_DEFAULT_ROLE].sort((a, b) => WEIGHT_ROLE_ORDER.indexOf(a) - WEIGHT_ROLE_ORDER.indexOf(b));
  return { ...t, weights: { ...t?.weights, label } };
};
/**
 * #1602 — the weight roles a brand ACTUALLY EMITS per category, derived from the composites it
 * built rather than from `TYPE_WEIGHTS_DEFAULT` (which is only the pre-override default). This is the
 * surface a weight INTENT resolves against: `field-label`'s `bold` intent binds the heaviest body role
 * the brand ships, and "which does it ship" is answered HERE, from the emitted tree, not from a
 * hard-coded role name in a component def (#1601's whole point).
 *
 * Read off `composites` — the same array `tree.ts` emits `type.*` from — so the availability the
 * projection resolves against is the availability a designer's file actually carries. A brand that
 * ships `body: [default, emphasis]` (NB, its heaviest body cut Medium/500) yields `body → [default,
 * emphasis]` here, and `bold` resolves to `emphasis`, not a `strong` the brand never wanted. Ordered
 * lightest→heaviest by `WEIGHT_ROLE_ORDER` and de-duplicated (link/italic modifiers share a weight
 * role, so they collapse to one entry). Groups the brand does not bind at all are absent.
 */
export const weightAvailability = (typography: Typography): Partial<Record<TypeGroup, WeightRoleName[]>> => {
  const seen: Partial<Record<TypeGroup, Set<WeightRoleName>>> = {};
  for (const c of typography.composites) (seen[c.group] ??= new Set()).add(c.weightRole);
  const out: Partial<Record<TypeGroup, WeightRoleName[]>> = {};
  for (const [g, roles] of Object.entries(seen))
    out[g as TypeGroup] = WEIGHT_ROLE_ORDER.filter((r) => roles!.has(r));
  return out;
};
// Which roles get an underlined `.link` variant for EVERY size×weight (inline
// links inherit the surrounding text's size + weight). Underline is baked
// (textDecoration isn't Figma-bindable — a separate text style); the link COLOUR
// stays `text.link.*` and is applied alongside.
export const TYPE_LINK_DEFAULT: readonly TypeGroup[] = ['body', 'caption'];
/** Roles that ALWAYS get their underlined variant, whatever `typography.links` lists (#2324, owner Q110): a button at
 *  the text appearance underlines its label at rest and in every state, and the underline is fixed, not a brand
 *  setting. Its color is the button's own ink (`interactive.<family>.text.*`), not `text.link.*`. */
export const TYPE_LINK_ALWAYS: readonly TypeGroup[] = ['label'];
/** #2942 (owner Q801 A) — the underline bounds, in whole percents of the font size. A set value outside them is
 *  corrected to the nearest bound, not refused: the Studio's number field can reach it, and the column-count clamp
 *  set that precedent for a UI knob. The Studio's two fields read these bounds from here, so the panel and the clamp
 *  cannot disagree; `test.ts` (#2942) states the four numbers itself. */
export const UNDERLINE_BOUNDS = { thickness: { min: 1, max: 20 }, offset: { min: 0, max: 50 } } as const;
/** #2942 (owner Q800 A) — what the "Custom underline" switch starts at when turned on, in whole percents. */
export const UNDERLINE_ON_DEFAULT = { thickness: 5, offset: 25 } as const;
export type ResolvedUnderline = { thickness: number | 'auto'; offset: number | 'auto' };
/** Input share (0.05) → a whole, clamped percent (5), or 'auto'. Unset, null or non-finite reads as auto. */
export const resolveUnderline = (u: TypographyInput['underline']): ResolvedUnderline => {
  const pct = (v: number | 'auto' | undefined, k: keyof typeof UNDERLINE_BOUNDS): number | 'auto' => {
    if (v === undefined || v === null || v === 'auto' || typeof v !== 'number' || !Number.isFinite(v)) return 'auto';
    const { min, max } = UNDERLINE_BOUNDS[k];
    return Math.max(min, Math.min(max, Math.round(v * 100)));
  };
  return { thickness: pct(u?.thickness, 'thickness'), offset: pct(u?.offset, 'offset') };
};
const TYPE_TRACK_DEFAULT: Record<TypeGroup, string> = {
  display: 'tight', title: 'snug', label: 'normal', eyebrow: 'wider',
  body: 'normal', caption: 'normal', code: 'normal',
};
// Mega display tightens further (-0.03em): large type needs tighter tracking.
const trackingFor = (group: TypeGroup, px: number): string =>
  group === 'display' && px >= 96 ? 'tighter' : TYPE_TRACK_DEFAULT[group];
// base variant → px (default scale). title floor 18; 16 (title.2xs) is opt-in.
const TYPE_VARIANTS: Record<TypeGroup, [string, number][]> = {
  display: [['sm', 48], ['md', 64], ['lg', 80], ['xl', 96], ['2xl', 128], ['3xl', 160]],
  title: [['xs', 18], ['sm', 20], ['md', 24], ['lg', 28], ['xl', 32], ['2xl', 40]],
  // `xs` = 12 (#2266, owner Q78 A): secondary text and metadata set among body text, on body's line height and face.
  // Not for running text, which is what its description says wherever it ships (BODY_XS_DESCRIPTION).
  body: [['xs', 12], ['sm', 14], ['md', 16], ['lg', 18]],
  // `lg` = 18 at the label tier's own weight (emphasis/600), added #1260 for the large button label,
  // whose target the owner resolved to 18px/emphasis (2026-09-17). This is deliberately the body-lg
  // SIZE at the label WEIGHT — the two rejected routes were `lg`=16 (following the 12/14 progression,
  // too small) and moving button to `type.body.*` (18px but default/strong, the wrong weight). Label
  // is reading/UI text, so it is EXEMPT from the typeScale shift (see `isHeading` below): `type.label.lg`
  // resolves to 18px in every density (compact/default/expressive alike), which is what lands the owner's
  // 18px at the comfortable (default) density they targeted rather than a rung that drifts under the shift.
  label: [['sm', 12], ['md', 14], ['lg', 18]],
  caption: [['md', 11], ['lg', 12]],          // small print; lg=12 (standard), md=11 (denser). sm=10 (fine print) is a future opt-in.
  // Eyebrow is part of the HEADING system, not the UI-text system (#328): a kicker sits above a
  // title and scales with the heading it accompanies. It was a single SIZELESS rung, which made
  // `type.eyebrow.<weight>` the only composite path with no size segment. Three rungs now — `lg`
  // exists specifically for the hero kicker, which is also what makes the fluid rule below do
  // anything (with only 12/14 nothing would ever clear the threshold).
  eyebrow: [['sm', 12], ['md', 14], ['lg', 20]],
  code: [['inline', 14]],
};
/** body/xs's description, verbatim (#2266, owner Q101 A, item 9): the DTCG `$description` of every body.xs composite
 *  and its `.ai.json` `$description`. body/xs is the one rung whose use differs from its group's (running text), so it
 *  carries its own words rather than the generated ones. */
export const BODY_XS_DESCRIPTION = 'Smallest body text, 12px. Secondary text and metadata only, never running text.';
const TYPE_SCALE_SHIFT = { compact: -1, default: 0, expressive: 1 } as const;
/** The display rung names, smallest→largest — the domain of `displayCeiling` (#328). */
export const DISPLAY_VARIANTS = ['sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
export type DisplayVariant = typeof DISPLAY_VARIANTS[number];
// Desktop → mobile endpoint — RESEARCH-VALIDATED (not a flat factor). The field
// (IBM Carbon fluid-display, Utopia, practitioner consensus) shrinks BIGGER sizes
// MORE: body/UI static, titles ~1 rung, display converging to a ~40–48px mobile
// "hero band" no matter how large desktop goes (Carbon fluid-display-04 is
// 40→176px ≈ 23%). A flat factor shrank a 96px hero and a 28px heading by the same
// proportion — the opposite of how systems behave, and it left a 160px hero at
// 120px (≈3 chars/line on a 360px phone) instead of ~48px (≈9–11 chars/line).
const oneRungDown = (ladder: number[], px: number): number => {
  const i = ladder.indexOf(px);
  return i > 0 ? ladder[i - 1] : px;
};
// Display mobile endpoints, anchored to Carbon's fluid-display curve (floor ~40–48px).
// Keyed by desktop px (always a ladder value); fallback ≈ one rung down.
const DISPLAY_MOBILE: Record<number, number> = {
  36: 32, 40: 32, 48: 36, 56: 40, 64: 40, 72: 40, 80: 40,
  96: 48, 112: 48, 128: 48, 144: 48, 160: 48,
};
// EXPORTED (#1587): the studio's per-rung DESKTOP/MOBILE override control shows the DERIVED mobile
// endpoint alongside a pin (the #423 read-only-derived pattern), and computing that derived value with a
// second copy of this curve is how the label and the build drift apart. One implementation means the
// "what the clamp produces" the UI shows cannot disagree with what the engine emits when the pin is off.
export const mobileEndpoint = (ladder: number[], group: TypeGroup, desktopPx: number): number => {
  if (group === 'display') return Math.min(desktopPx, DISPLAY_MOBILE[desktopPx] ?? Math.max(oneRungDown(ladder, desktopPx), 32));
  if (group === 'title') return desktopPx <= 20 ? desktopPx : Math.min(desktopPx, Math.max(oneRungDown(ladder, desktopPx), 20));
  // Eyebrow follows title's shape with its own numbers (#328) — fluid ABOVE a threshold, static at
  // or below it. Not a new mechanism and not an exception: `title` above is already exactly
  // "small ones don't move, large ones do". So sm=12/md=14 never shift across breakpoints and only
  // a hero kicker does. Floor 12 because it is uppercase and tracked wider, which costs legibility
  // that lowercase body text at the same px does not pay.
  if (group === 'eyebrow') return desktopPx <= 14 ? desktopPx : Math.min(desktopPx, Math.max(oneRungDown(ladder, desktopPx), 12));
  return desktopPx;   // body / label / caption / code — static (field consensus)
};
/** Per-mode rung SIZE overrides (#328) are heading-only. Each group's floor is the smallest value the
 *  brand-level machinery can ALREADY produce for it — display 32 (its mobile-endpoint floor), title 16
 *  (titleFloor's minimum), eyebrow 11 (what `compact` shifts sm to since #346). A mode may re-size a
 *  rung; it may not invent a size the rest of the system would never emit. Reading/UI text
 *  (body/label/caption/code) is absent BY CONTRACT, not by oversight: those groups are mode-invariant,
 *  and both the schema and brandTheme REJECT them rather than silently ignoring the request.
 *  These floors are ABSOLUTE and deliberately not a cross-category rule (display ≥ title ≥ body):
 *  titleFloor 16 already overlaps body.md on purpose, so a relative rule would forbid a shipped brand. */
export const HEADING_SIZE_FLOOR = { display: 32, title: 16, eyebrow: 11 } as const;
export type PerModeSizeGroup = keyof typeof HEADING_SIZE_FLOOR;
export const PER_MODE_SIZE_GROUPS = Object.keys(HEADING_SIZE_FLOOR) as PerModeSizeGroup[];
/** #3077 (caption A) — the smallest size `typography.sizes.caption` may set. 10px, the default ladder's floor, and
 *  NOT the 8px `sizeFloor: 8` adds: 8px is below the range the contrast ratios were reasoned about, so it stays
 *  `caption.xs`'s alone (the flagged escape hatch), never a size an ordinary caption rung can be moved to. */
export const CAPTION_SIZE_FLOOR = 10;
/** The groups `typography.sizes` takes: the heading groups, plus caption at the brand level only (#3077). */
export type BrandSizeGroup = PerModeSizeGroup | 'caption';
export const BRAND_SIZE_GROUPS: readonly BrandSizeGroup[] = [...PER_MODE_SIZE_GROUPS, 'caption'];
// Bigger heading → tighter line-height (display tightest; small titles open up).
/** Size-sensitive leading. Bigger type carries more visual presence and reads better with tighter
 *  leading, which is why `title` bands rather than taking one value — and why `display` now does too
 *  (#377). Display was flat `tight` across its WHOLE 48→160px range, a 3.3× span, while title banded
 *  across a 2.2× one: the function contradicted its own premise, and the seam showed at the tier
 *  boundary, where `title.2xl` 40px sat at snug (1.15) and `display.sm` 48px dropped two rungs to
 *  tight (1.05). Eight pixels of size bought two rungs of leading.
 *
 *  The 64px boundary keeps every step to at most ONE rung, matching how title moves. It is deliberately
 *  coarse: with only six rungs there is nothing between snug and tight, so the mid display sizes take
 *  the tighter of the two. #377's 15-value ladder adds 1.10 exactly here, and this band set should be
 *  revisited when it lands — that is a refinement, not a correction. */
const lineHeightFor = (group: TypeGroup, px: number): string => {
  if (group === 'display') return px >= 64 ? 'tight' : 'snug';
  if (group === 'title') return px >= 56 ? 'tight' : px >= 28 ? 'snug' : 'compact';
  if (group === 'label' || group === 'eyebrow') return 'snug';
  if (group === 'caption') return 'cozy';                // #388 — small running text, tighter than body
  return 'normal';                                       // body, code
};

/** The rung a composite derives BEFORE any per-category nudge. Exported because the UI cannot offer an
 *  honest nudge range without it (#377): `shiftRung` CLAMPS, so a step past the end of a ramp is a silent
 *  no-op — from `normal`, +3/+4/+5 all render `loose`. A control that offers them is offering dead
 *  options, and a control that caps at ±2 hides live ones (`display` starts at the end of its ramp, so
 *  reaching `loose` genuinely needs more). Both failures come from guessing the range instead of
 *  deriving it; this is the single source of truth that lets the UI do neither. */
export const derivedRungFor = (field: 'leadingShift' | 'trackingShift', group: TypeGroup, px: number): string =>
  field === 'leadingShift' ? lineHeightFor(group, px) : trackingFor(group, px);

// Shift a named rung along its ordered key list, clamped at both ends. Both ramps
// are ordered so that a POSITIVE shift is the more open direction (leading
// tight→loose, tracking tighter→wider), which keeps `leadingShift`/`trackingShift`
// reading the same way.
// EXPORTED for the dashboard (#411): the nudge control prints the rung a category actually lands on,
// and computing that with a second copy of this clamp is how the label and the build drift apart. One
// implementation means the line cannot disagree with what the engine does.
export const shiftRung = (keys: readonly string[], key: string, by: number): string => {
  if (!by) return key;
  const i = keys.indexOf(key);
  return i < 0 ? key : keys[Math.max(0, Math.min(keys.length - 1, i + by))];
};

const buildComposites = (ladder: number[], t: TypographyInput, fluid: boolean, families: FontFamilyBinding[]): TypeComposite[] => {
  // A category with no family binding can't be built — `families.code: null` is the opt-out (#415,
  // replacing `mono: null`, which said the same thing one tier up).
  const boundGroups = new Set(families.map((f) => f.group));
  const leadShift = t.leadingShift ?? {};
  const trackShift = t.trackingShift ?? {};
  // #3077 (tracking A) — a per-category pin replaces the derived rung and its nudge. Refused by name: a category
  // that isn't one, and a role that isn't one of the nine.
  const trackPin: Partial<Record<TypeGroup, LetterSpacingKey>> = t.tracking ?? {};
  for (const [g, role] of Object.entries(trackPin)) {
    if (!(TYPE_GROUPS as readonly string[]).includes(g))
      throw new Error(`typography.tracking: '${g}' is not a type category (${TYPE_GROUPS.join('/')}).`);
    if (!(LETTER_SPACING_KEYS as readonly string[]).includes(role as string))
      throw new Error(`typography.tracking.${g}: '${role}' is not a letter spacing role (${LETTER_SPACING_KEYS.join('/')}).`);
  }
  const shift = TYPE_SCALE_SHIFT[t.typeScale ?? 'default'];
  const ceilingIdx = DISPLAY_VARIANTS.indexOf(t.displayCeiling ?? '3xl');
  const titleFloor = t.titleFloor ?? 18;
  // Opt-in fine-print rungs on the caption tier (#1360 caption.sm=10, #1363 caption.xs=8). Both OFF by
  // default (11 / 10), so absent them the caption set is exactly [md, lg] and no corpus brand moves.
  const captionFloor = t.captionFloor ?? 11;
  const sizeFloor = t.sizeFloor ?? 10;
  const shiftPx = (px: number): number => {
    const i = ladder.indexOf(px);
    if (i < 0) return px;
    return ladder[Math.max(0, Math.min(ladder.length - 1, i + shift))];
  };
  // Brand-level per-size overrides. Until now a size could be pinned per MODE but not at the baseline,
  // so a single-mode brand — the common case — could not tune its ramp at all while a multi-mode one
  // could. The shape checks run here; ORDERING is enforced by the ramp check below, which sees the
  // merged result and so catches an override colliding with a rung the author never touched.
  const brandSizes: Partial<Record<BrandSizeGroup, Record<string, number>>> = t.sizes ?? {};
  const consumedSizes = new Set<string>();
  // `group` below is a TypeGroup (all seven); the override map is heading-only by contract. A lookup
  // for body/label/caption/code is legitimately undefined rather than a type error, so narrow here
  // once instead of casting at each call site.
  const brandSizeFor = (g: TypeGroup, v: string): number | undefined =>
    (brandSizes as Record<string, Record<string, number> | undefined>)[g]?.[v];
  const ladderSet = new Set(ladder);
  for (const [g, rungs] of Object.entries(brandSizes)) {
    if (!BRAND_SIZE_GROUPS.includes(g as BrandSizeGroup))
      throw new Error(`typography.sizes: '${g}' is not a group a size can be set for — per-size overrides cover ${PER_MODE_SIZE_GROUPS.join('/')}, and caption at the brand level. Other reading and UI text takes its size from the category, not from a lever.`);
    for (const [variant, px] of Object.entries(rungs ?? {})) {
      // #3077 — caption's opt-in fine-print rungs are pinned by their floors: the floor decides that the rung
      // exists AND what it is worth, so a size here would be a second way to say the same thing.
      if (g === 'caption' && (variant === 'xs' || variant === 'sm'))
        throw new Error(`typography.sizes.caption.${variant}: caption.${variant} is pinned by ${variant === 'xs' ? 'sizeFloor 8 (8px)' : 'captionFloor 10 (10px)'}, so it can't be set here. A caption size covers md and lg.`);
      if (!ladderSet.has(px))
        throw new Error(`typography.sizes.${g}.${variant}: ${px}px is not a step on the size ladder (${ladder.join(', ')}).`);
      const floor = g === 'caption' ? CAPTION_SIZE_FLOOR : HEADING_SIZE_FLOOR[g as PerModeSizeGroup];
      if (px < floor)
        throw new Error(`typography.sizes.${g}.${variant}: ${px}px is below the ${g} floor of ${floor}px — the smallest size this system emits for ${g} anywhere.`);
    }
  }
  // #1587 — OPT-IN per-rung DESKTOP/MOBILE viewport override. Same heading-only contract and the same
  // on-ladder/floor shape checks as `sizes` above; the SHAPE is validated here, and the two coherence
  // properties that need the RESOLVED endpoints — mobile ≤ its own desktop (no inverted ramp) and a
  // monotonic mobile ramp — are checked AFTER the composites are built, reading the composite's own
  // `sizePx`/`sizeMinPx` rather than re-deriving them (the docs/34-independent form the coherence gate
  // relies on too). `overrideFor` narrows the heading-only map once, like `brandSizeFor`.
  const sizeOverrides: Partial<Record<PerModeSizeGroup, Record<string, { desktop?: number; mobile?: number }>>> = t.sizeOverrides ?? {};
  const consumedOverrides = new Set<string>();
  const overrideFor = (g: TypeGroup, v: string): { desktop?: number; mobile?: number } | undefined =>
    (sizeOverrides as Record<string, Record<string, { desktop?: number; mobile?: number }> | undefined>)[g]?.[v];
  for (const [g, rungs] of Object.entries(sizeOverrides)) {
    if (!PER_MODE_SIZE_GROUPS.includes(g as PerModeSizeGroup))
      throw new Error(`typography.sizeOverrides: '${g}' is not a heading group — per-viewport overrides cover ${PER_MODE_SIZE_GROUPS.join('/')} only. Reading and UI text takes one size from its category, not per viewport.`);
    const floor = HEADING_SIZE_FLOOR[g as PerModeSizeGroup];
    for (const [variant, ov] of Object.entries(rungs ?? {})) {
      for (const vp of ['desktop', 'mobile'] as const) {
        const px = ov?.[vp];
        if (px == null) continue;
        if (!ladderSet.has(px))
          throw new Error(`typography.sizeOverrides.${g}.${variant}.${vp}: ${px}px is not a step on the size ladder (${ladder.join(', ')}).`);
        if (px < floor)
          throw new Error(`typography.sizeOverrides.${g}.${variant}.${vp}: ${px}px is below the ${g} floor of ${floor}px — the smallest size this system emits for ${g} anywhere.`);
      }
      // A mobile endpoint only exists in the fluid regime — with responsive off, every size is static and
      // there is no mobile mode for the pin to land in. Refuse rather than silently drop it.
      if (ov?.mobile != null && !fluid)
        throw new Error(`typography.sizeOverrides.${g}.${variant}.mobile: a mobile override needs responsive typography — set responsive.fluid (it is off, so type is static and there is no mobile endpoint to pin).`);
    }
  }
  const weightsMap = { ...TYPE_WEIGHTS_DEFAULT, ...(t.weights ?? {}) };
  // #1639 (owner-decided 2026-09-26): every category keeps at least one weight. Removing weights is
  // never how a text-style category disappears, so an empty set is refused by name rather than
  // silently emitting no `type.<category>.*` at all. And a category's required roles stay in its set.
  for (const g of TYPE_GROUPS) {
    const roles = weightsMap[g];
    if (!Array.isArray(roles) || roles.length === 0)
      throw new Error(`typography.weights.${g}: the '${g}' category needs at least one weight role. Removing weights can't remove a type category, so keep one (its default is ${TYPE_WEIGHTS_DEFAULT[g].join('/')}).`);
    const req = REQUIRED_WEIGHT_ROLES[g];
    if (req && !roles.includes(req.role))
      throw new Error(`typography.weights.${g}: the '${g}' category must include '${req.role}', because ${req.why}. Add '${req.role}' back (the set given is ${roles.join('/')}).`);
  }
  const linkGroups = new Set([...(t.links ?? TYPE_LINK_DEFAULT), ...TYPE_LINK_ALWAYS]);
  const italicGroups = new Set(t.italics ?? []);   // default none — italics are opt-in per role
  // #1296 — categories whose DEFAULT cut is italic (default none). Each is a refusal-checked choice: an
  // unknown category name, and a category also listed in `italics`, fail here by name.
  const italicDefaultGroups = new Set(t.italicDefault ?? []);
  for (const g of italicDefaultGroups) {
    if (!(TYPE_GROUPS as readonly string[]).includes(g))
      throw new Error(`typography.italicDefault: '${g}' is not a type category (${TYPE_GROUPS.join('/')}).`);
    if (italicGroups.has(g))
      throw new Error(`typography.italicDefault: '${g}' is also in typography.italics. A category that is italic by default has no upright weight to pair an -italic variant with, so every twin would repeat its bare weight. Keep '${g}' in one list.`);
  }
  // #1368 — verbatim face pins, validated once here so a bad pin fails at build with a named message
  // rather than emitting a Text Style the host silently drops. Each throw is a refusal with its own
  // by-name mutation test (docs/34). `familyPrimary` is `stack[0]` — the value the `font.family.<cat>`
  // variable carries and the host loads as `fontName.family`, so a pin's family must equal it.
  const facePins: Partial<Record<TypeGroup, Partial<Record<WeightRoleName, FacePin>>>> = t.faces ?? {};
  for (const [g, roles] of Object.entries(facePins)) {
    if (!boundGroups.has(g as TypeGroup))
      throw new Error(`typography.faces.${g}: '${g}' is not a category this brand binds a face for (${[...boundGroups].join('/')}) — a face pin names a CUT within a bound category, it can never add one.`);
    const familyPrimary = families.find((f) => f.group === g)?.stack[0];
    for (const [role, pin] of Object.entries(roles ?? {})) {
      if (!WEIGHT_ROLE_ORDER.includes(role as WeightRoleName))
        throw new Error(`typography.faces.${g}.${role}: '${role}' is not a weight role (${WEIGHT_ROLE_ORDER.join('/')}).`);
      if (!weightsMap[g as TypeGroup].includes(role as WeightRoleName))
        throw new Error(`typography.faces.${g}.${role}: this category does not ship the '${role}' weight role (it ships ${weightsMap[g as TypeGroup].join('/')}) — pin a slot the category has, or add the role to typography.weights.${g}.`);
      if (!pin || typeof pin.family !== 'string' || typeof pin.style !== 'string' || !pin.family.trim() || !pin.style.trim())
        throw new Error(`typography.faces.${g}.${role}: a face pin needs a non-empty { family, style } — the exact Figma family and style to bind (e.g. { family: 'ITC Garamond Std', style: 'Light Condensed' }).`);
      if (pin.family !== familyPrimary)
        throw new Error(`typography.faces.${g}.${role}: family '${pin.family}' must match the category's bound family '${familyPrimary}' — a pin names a WIDTH/STYLE cut WITHIN the face, not a different family. The Text Style binds fontFamily to the category's variable, so a divergent family is dropped at the host.`);
      // #1296 — one method per job. Italic is the italics levers' job; a pin is for the cuts the engine
      // cannot derive (a width cut like NB's "Light Condensed", an optical size). A pin binds its style
      // VERBATIM and changes nothing else, so an italic pin rendered italic in Figma and upright in code.
      // `isItalicCut` is the recognition rule; see its header for why it is a substring match.
      if (isItalicCut(pin.style))
        throw new Error(`typography.faces.${g}.${role}: '${pin.style}' names an italic cut, and a face pin binds only the Figma style, so code would render it upright. Set italic with the italics levers instead: typography.italicDefault makes italic the category's default cut, and typography.italics adds -italic variants. A face pin is for cuts the weight axis cannot reach, such as a condensed width.`);
      // A pin in an italic-default category would bind an upright cut verbatim while the tokens say
      // italic (the pin is not italic, or the check above refused it) — the same disagreement, reversed.
      if (italicDefaultGroups.has(g as TypeGroup))
        throw new Error(`typography.faces.${g}.${role}: '${g}' is italic by default (typography.italicDefault), and a pin binds its style verbatim, so the upright cut '${pin.style}' would contradict it. Remove the pin, or take '${g}' out of typography.italicDefault.`);
    }
  }
  const out: TypeComposite[] = [];
  // One (group, size) fans out to every weight the role ships, and — orthogonally —
  // an italic modifier and/or an underlined link modifier of each. The modifiers are
  // hyphenated suffixes on the weight, in a fixed order: `type.<group>.<size>.<weight>[-italic][-link]`
  // (size omitted for sizeless roles like eyebrow). Adding a weight/modifier later is
  // purely additive — no renames.
  const push = (group: TypeGroup, variant: string, sizePx: number) => {
    // #1587 — an authored mobile endpoint OVERRIDES the derive; absent it, `mobileEndpoint` is the
    // default (today's behaviour). `mobile` is only reachable when `fluid` (the shape check above
    // refuses a mobile override with responsive off), so this never re-introduces a mobile mode a static
    // brand does not have. `mobile ≤ sizePx` is asserted after the loop, against the resolved endpoints.
    const mobilePin = overrideFor(group, variant)?.mobile;
    const sizeMinPx = fluid ? (mobilePin ?? mobileEndpoint(ladder, group, sizePx)) : sizePx;
    if (mobilePin != null) consumedOverrides.add(`${group}.${variant}`);
    const emit = (weightRole: WeightRoleName, link: boolean, italic: boolean) => {
      // Modifiers are hyphenated suffixes on the weight (`strong-italic-link`), clean
      // SIBLING leaves of the bare weight — not `.italic`/`.link` children (that would
      // make `strong` a token-with-children, non-DTCG). Italic precedes link so the
      // ordering is stable regardless of which axes a role ships. Matches the
      // `-subtle`/`on-fill` convention.
      const weightSeg = `${weightRole}${italic ? '-italic' : ''}${link ? '-link' : ''}`;
      const segs = [group, variant, weightSeg].filter(Boolean);
      const facePin = facePins[group]?.[weightRole];   // #1368 — verbatim style for this slot, if pinned
      out.push({
        group, variant, weightRole, link, italic, path: segs.join('.'), sizePx, sizeMinPx,
        ...(italicDefaultGroups.has(group) ? { italicDefault: true as const } : {}),
        ...(facePin ? { facePin } : {}),
        // The derived rung is size-sensitive; the per-group nudge shifts that curve
        // rather than replacing it, so `title` keeps tightening as it grows. A tracking pin (#3077) replaces both.
        lineHeight: shiftRung(LINE_HEIGHT_KEYS, lineHeightFor(group, sizePx), leadShift[group] ?? 0),
        tracking: trackPin[group] ?? shiftRung(TRACKING_SHIFT_KEYS, trackingFor(group, sizePx), trackShift[group] ?? 0),
        textCase: group === 'eyebrow' ? 'uppercase' : 'none',
      });
    };
    // italic × link are orthogonal: a role that ships both gets the full cross
    // (bare / italic / link / italic-link). A role shipping neither gets just the bare weight.
    const italicStates = italicGroups.has(group) ? [false, true] : [false];
    const linkOn = linkGroups.has(group);
    for (const weightRole of weightsMap[group]) {
      for (const italic of italicStates) {
        emit(weightRole, false, italic);
        if (linkOn) emit(weightRole, true, italic);
      }
    }
  };
  for (const group of Object.keys(TYPE_VARIANTS) as TypeGroup[]) {
    if (!boundGroups.has(group)) continue;   // no family binding ⇒ no composites (families.code: null)
    // The heading SYSTEM, not just the heading hierarchy (#328): eyebrow shifts with display/title
    // because a kicker sits directly above one and is read as a pair with it. Leave it out and an
    // `expressive` brand grows its titles a rung while the kicker stays put, which breaks the very
    // pairing that makes an eyebrow an eyebrow. Reading/UI text (body/label/caption/code) still
    // never moves — that boundary is the one the scale preset exists to respect.
    const isHeading = group === 'display' || group === 'title' || group === 'eyebrow';
    let prev = -Infinity;
    // title floor: a fixed 16px brand-font heading, PINNED (exempt from the
    // typeScale shift) so titleFloor:16 always delivers a literal 16px title that
    // overlaps body.md — the documented contract — regardless of typeScale.
    if (group === 'title' && titleFloor === 16) {
      // The 2xs rung is pinned at 16 by the floor, but a brand override still applies to it — the
      // floor decides that the rung EXISTS, never what it is worth (the set/size split, #328).
      const px = overrideFor('title', '2xs')?.desktop ?? brandSizes.title?.['2xs'] ?? 16;
      if (brandSizes.title?.['2xs'] !== undefined) consumedSizes.add('title.2xs');
      if (overrideFor('title', '2xs')?.desktop !== undefined) consumedOverrides.add('title.2xs');
      push('title', '2xs', px); prev = px;
    }
    // Opt-in caption fine-print rungs, PINNED to their ladder step and pushed smallest-first so the
    // ramp check below sees the whole caption set in order (xs 8 < sm 10 < md 11 < lg 12). Both are
    // pure SET MEMBERSHIP on steps already ON the ladder — `sizeFloor:8` also puts 8 on the ladder via
    // `fontSizeLadder` — and both are OFF by default, so absent them caption is exactly [md, lg] and no
    // corpus brand moves. Caption is reading/UI text, so it is exempt from the typeScale shift (like the
    // TYPE_VARIANTS caption rungs) and from `sizes` overrides (which take caption md/lg only, #3077: xs/sm are refused above).
    if (group === 'caption') {
      if (sizeFloor === 8) { push('caption', 'xs', 8); prev = 8; }
      if (captionFloor === 10) { push('caption', 'sm', 10); prev = 10; }
    }
    for (const [i, [variant, base]] of TYPE_VARIANTS[group].entries()) {
      // displayCeiling trims the top by RUNG POSITION, before any size is computed — set
      // membership, decided once here and never re-applied per mode (#328). Trimming from
      // the end is what keeps the surviving names stable: no rung is ever renumbered.
      if (group === 'display' && i > ceilingIdx) continue;
      // typeScale shifts the heading SYSTEM only (display + title + eyebrow); reading/UI text stays put.
      const shifted = isHeading ? shiftPx(base) : base;
      // A brand-level per-size override lands HERE — after the shift, before the ramp check. Absolute
      // px, exactly like the per-mode one: it pins the size, so it does NOT move when typeScale changes
      // (which is why changing the scale with sizes pinned can collide — and should, loudly). A #1587
      // per-viewport DESKTOP override pins the same endpoint and takes precedence over `sizes` for the rung.
      const desktopOv = overrideFor(group, variant)?.desktop;
      const sizePx = desktopOv ?? brandSizeFor(group, variant) ?? shifted;
      if (brandSizeFor(group, variant) !== undefined) consumedSizes.add(`${group}.${variant}`);
      if (desktopOv !== undefined) consumedOverrides.add(`${group}.${variant}`);
      // The ramp must be STRICTLY INCREASING. This used to `continue` — silently dropping
      // the colliding rung and leaving a gap mid-ramp (`compact` lost title.sm). Dropping a
      // rung is never the right answer: it changes the type SET, which is the one thing the
      // set/size split exists to keep stable. Reject instead. validateBrandInput catches the
      // one reachable combination (compact + titleFloor 16) with a friendlier message.
      if (sizePx <= prev) {
        const pinned = brandSizeFor(group, variant) !== undefined || desktopOv !== undefined;
        const where = desktopOv !== undefined ? `typography.sizeOverrides.${group}.${variant}.desktop` : `typography.sizes.${group}.${variant}`;
        throw new Error(`typography: ${group}.${variant} resolves to ${sizePx}px, which is not larger than the previous rung (${prev}px) — the ramp must be strictly increasing. ${pinned ? `${where} pins it to ${sizePx}px; a pinned size does not move when the scale does, so either release it or move its neighbor.` : `Check typeScale '${t.typeScale ?? 'default'}'${group === 'title' ? ` + titleFloor ${titleFloor}` : ''}.`}`);
      }
      push(group, variant, sizePx);
      prev = sizePx;
    }
  }
  for (const [g, rungs] of Object.entries(brandSizes))
    for (const variant of Object.keys(rungs ?? {}))
      if (!consumedSizes.has(`${g}.${variant}`)) {
        const shipped = [...new Set(out.filter((c) => c.group === g).map((c) => c.variant))];
        throw new Error(`typography.sizes.${g}.${variant}: that rung is not in this brand's ${g} set${shipped.length ? ` (${shipped.join('/')})` : ''} — ${g === 'caption' ? 'caption sizes cover md and lg' : 'it is trimmed by displayCeiling or not enabled by titleFloor'}. A size override re-sizes a rung that exists; it never adds one.`);
      }
  // #1587 — a per-viewport override rung that never landed (trimmed by displayCeiling, or not enabled by
  // titleFloor) is a typo, not a silent no-op. `consumedOverrides` records the (group, variant) pairs the
  // build actually resolved a desktop or mobile pin for above; anything named but unconsumed is rejected,
  // exactly like the `sizes` unconsumed check. A rung with only `{}` (neither endpoint) is consumed vacuously.
  for (const [g, rungs] of Object.entries(sizeOverrides))
    for (const [variant, ov] of Object.entries(rungs ?? {})) {
      const named = ov?.desktop !== undefined || ov?.mobile !== undefined;
      if (named && !consumedOverrides.has(`${g}.${variant}`)) {
        const shipped = [...new Set(out.filter((c) => c.group === g).map((c) => c.variant))];
        throw new Error(`typography.sizeOverrides.${g}.${variant}: that rung is not in this brand's ${g} set${shipped.length ? ` (${shipped.join('/')})` : ''} — it is trimmed by displayCeiling or not enabled by titleFloor. A viewport override re-sizes a rung that exists; it never adds one.`);
      }
    }
  // #1587 — THE COHERENCE THROW. Two properties an authored viewport pin can break that the derive never
  // could (`mobileEndpoint` is `Math.min(desktop, …)` by construction, so the derived path is coherent for
  // free — an authored pin escapes that guarantee, which is the whole reason this check exists):
  //   1. mobile ≤ desktop, per rung — a pin that inverts a rung (mobile > desktop) is a ramp that grows on
  //      the smaller viewport, the incoherent hand-authored shape the engine exists to replace.
  //   2. the mobile ramp stays MONOTONIC across a group's rungs — non-decreasing as desktop grows, so a pin
  //      on one rung cannot make a smaller rung's mobile exceed a larger rung's. (Non-decreasing, not
  //      strictly increasing: the derived display curve legitimately plateaus — 96/112/128px all floor to
  //      48px mobile — so a strict rule would reject the engine's own output.)
  // Read from the composites' OWN resolved `sizePx`/`sizeMinPx`, never re-run through `mobileEndpoint`, so
  // the check cannot silently agree with the derivation it is meant to police (docs/34 shape 1).
  for (const g of PER_MODE_SIZE_GROUPS) {
    const rungs = out.filter((c) => c.group === g)
      // one row per rung (weights/modifiers share a size), ascending by desktop px so the ramp reads small→large
      .reduce((acc: TypeComposite[], c) => (acc.some((a) => a.variant === c.variant) ? acc : [...acc, c]), [])
      .sort((a, b) => a.sizePx - b.sizePx);
    let prevMin = -Infinity;
    for (const c of rungs) {
      if (c.sizeMinPx > c.sizePx)
        throw new Error(`typography.sizeOverrides.${g}.${c.variant}: mobile ${c.sizeMinPx}px is larger than desktop ${c.sizePx}px — an override may not invert a rung (mobile ≤ desktop; the ramp must not grow on the smaller viewport).`);
      if (c.sizeMinPx < prevMin)
        throw new Error(`typography.sizeOverrides.${g}.${c.variant}: mobile ${c.sizeMinPx}px is smaller than a lower rung's mobile ${prevMin}px — the mobile ramp must not decrease as size grows (an override broke its monotonicity).`);
      prevMin = c.sizeMinPx;
    }
  }
  return out;
};

// Derive one family binding per CATEGORY from a `families` input object. Single source for both the
// light build (buildTypography) and per-mode re-derivation (brandTheme's modeLevers.families): a
// per-mode override merges its stacks over the base `families` and re-runs this, keeping the
// `variable` flag from the base.
export const deriveFamilies = (fam: TypographyInput['families'] = {}): FontFamilyBinding[] => {
  // `variable` may be a single flag (applies to all) or per-category — the build reads it per binding
  // to decide weight emission (KB 23 §Variable fonts).
  const isVar = (group: TypeGroup): boolean =>
    typeof fam.variable === 'object' ? fam.variable[group] ?? false : fam.variable ?? false;
  const out: FontFamilyBinding[] = [];
  for (const group of TYPE_GROUPS) {
    const chosen = fam[group];
    // `code: null` is the explicit opt-out (#415, replacing `mono: null`) — the category ships nothing.
    // Only `code` may opt out: it is the one category a brand plausibly has no face for. Nulling any
    // other would silently delete a tier of the type system, so it is REFUSED rather than honored —
    // and refused here, at the single choke point both the brand build and the per-mode re-derivation
    // pass through, so a mode can't reach the state a brand can't.
    if (chosen === null) {
      if (group !== 'code')
        throw new Error(`typography.families.${group}: null opts a category out of the system entirely, and only 'code' may do that — every other category is load-bearing. Omit the key to take the default face, or name one.`);
      continue;
    }
    const d = TYPE_FAMILY_DEFAULT[group];
    const face = (Array.isArray(chosen) ? chosen[0] : chosen) ?? d.face;
    out.push({ group, stack: asStack(chosen, d.face, tailFor(face, d.fallback)), variable: isVar(group) });
  }
  // MONO-NESS IS DECLARED BY `code`, and this pass is what restores the signal #415 removed. The
  // fallback tail is picked per CATEGORY, so binding a mono face anywhere but `code` produced
  // `['JetBrains Mono', …, 'sans-serif']` — a monospace face promising a proportional fallback. Worse,
  // `deriveTypefaces` dedupes by slug and walks in TYPE_GROUPS order, so `body` won the stack and
  // `font.typeface.jetbrains-mono` shipped a SANS tail for every consumer INCLUDING `code` itself.
  //
  // Before #415 the brand said "this face is mono" by putting it on `families.mono`; there is no such
  // channel now, so the face `code` binds IS the declaration. A brand that opts out of code
  // (`code: null`) has declared no mono face, and nothing is re-padded — correct, not a gap.
  //
  // Only AUTO-PADDED stacks are touched: a brand that supplied a full array is trusted verbatim,
  // which is the promise `asStack` makes everywhere else.
  const codeFace = out.find((b) => b.group === 'code')?.stack[0];
  if (codeFace) {
    for (const b of out) {
      if (b.group === 'code' || Array.isArray(fam[b.group]) || b.stack[0] !== codeFace) continue;
      b.stack = asStack(b.stack[0], b.stack[0], MONO_FALLBACK);
    }
  }
  return out;
};

/** Collapse a set of family bindings into the distinct TYPEFACE primitives they bind, UNIONED with the
 *  brand's authored typeface library (#287). Two categories on the same face share one primitive (NB
 *  binds every category to Inter); `variable` ORs, since it is a property of the face, not the binding.
 *
 *  BINDING SETS ARE WALKED FIRST, LIBRARY LAST, and that order is load-bearing twice over:
 *   1. A face that is BOTH staged and bound keeps its BINDING-derived stack. Reversed, a library entry
 *      would win the dedupe and a `code`-bound face would emit the sans fallback tail.
 *   2. An empty library appends nothing, so every existing brand derives the identical list in the
 *      identical order — this is what makes the feature byte-additive.
 *
 *  A library-only face has no binding to take a fallback tail from, so it gets the sans one. That is a
 *  real (small) guess: staging a mono face before binding it gives it a sans tail until a category
 *  claims it. Harmless because nothing consumes an unbound primitive's tail, and self-correcting
 *  because binding re-derives it — see the test that asserts exactly this transition. */
export const deriveTypefaces = (library: string[] = [], ...bindingSets: FontFamilyBinding[][]): Typeface[] => {
  const out: Typeface[] = [];
  for (const bindings of bindingSets) {
    for (const f of bindings) {
      const name = f.stack[0];
      const slug = typefaceSlug(name);
      const hit = out.find((t) => t.slug === slug);
      if (hit) { hit.variable = hit.variable || f.variable; continue; }
      out.push({ slug, name, stack: f.stack, variable: f.variable });
    }
  }
  for (const raw of library) {
    const name = raw.trim();
    const slug = typefaceSlug(name);
    if (out.some((t) => t.slug === slug)) continue;   // already bound — the binding's stack wins
    out.push({ slug, name, stack: asStack(name, name, tailFor(name, SANS_FALLBACK)), variable: false });
  }
  return out;
};

// The brand's leading/tracking ramps: the curated rungs, with any brand
// re-anchoring applied. Single source for the light build AND the per-mode
// re-derivation below, so a per-mode override layers on the BRAND's ramp rather
// than silently reverting to the curated default.
export const brandLineHeights = (t: TypographyInput = {}): { key: string; value: number }[] =>
  LINE_HEIGHTS.map((l) => ({ key: l.key, value: t.lineHeights?.[l.key] ?? l.value }));
export const brandLetterSpacings = (t: TypographyInput = {}): { key: string; em: number }[] => resolveLetterSpacings(t);

export const buildTypography = (t: TypographyInput = {}): Typography => {
  // Same bounds as the per-mode levers — guard typos, not taste.
  // #377 — a role BINDS a ladder step; it no longer re-anchors a free value. Two guards, and the second
  // is the one this issue was filed for.
  //
  // (1) ON-LADDER. A range check accepted 1.52, which is not a step, so the emitted primitive key
  //     (`line-height.152`) would name a value no other brand could reference — a private step invented
  //     by a typo. Refusing beats snapping: #341 removed silent quantisation from the size ramp for the
  //     same reason, and a per-brand leading that quietly became a different number is worse here,
  //     because nothing downstream looks wrong.
  // (2) ORDER. `tight` must stay tighter than `loose`. Previously UNGUARDED, and the engine accepted
  //     `{ tight: 2.5, loose: 0.9 }` — resolving to `2.5, 1.15, 1.25, 1.5, 1.65, 0.9`, a ramp where the
  //     rung named "tight" renders looser than the one named "loose", silently, across all 38
  //     composites. The names ARE the contract (relative emphasis, tight → loose); an inverted ramp
  //     makes every one of them lie. Font sizes already refuse this shape; weight roles warn. Leading
  //     and tracking did neither.
  const onLadder = (field: string, ladder: readonly number[], k: string, v: number): void => {
    if (!Number.isFinite(v)) throw new Error(`typography.${field} '${k}' ${v} is not a finite number`);
    if (!ladder.some((s) => Math.abs(s - v) < 1e-9))
      throw new Error(`typography.${field} '${k}' ${v} is not a step on the ladder — bind a role to an existing primitive rather than inventing a value. Available: ${ladder.join(', ')}`);
  };
  for (const [k, v] of Object.entries(t.lineHeights ?? {}))
    if (v !== undefined) onLadder('lineHeights', LINE_HEIGHT_LADDER, k, v);
  for (const [k, v] of Object.entries(t.letterSpacings ?? {}))
    if (v !== undefined) onLadder('letterSpacings', LETTER_SPACING_LADDER, k, v);
  const ordered = (field: string, keys: readonly string[], resolved: number[]): void => {
    for (let i = 1; i < resolved.length; i++)
      if (resolved[i] < resolved[i - 1])
        throw new Error(`typography.${field}: '${keys[i]}' (${resolved[i]}) resolves below '${keys[i - 1]}' (${resolved[i - 1]}) — the rung names are a relative-emphasis ramp, so they must stay in order. Re-point the roles instead of crossing them.`);
  };
  ordered('lineHeights', LINE_HEIGHT_KEYS, LINE_HEIGHTS.map((l) => t.lineHeights?.[l.key] ?? l.value));
  ordered('letterSpacings', LETTER_SPACING_KEYS, resolveLetterSpacings(t).map((l) => l.em));
  // A nudge beyond ±5 rungs is meaningless (the leading ramp is 7 long, tracking is 6) — almost certainly a typo.
  for (const [field, map] of [['leadingShift', t.leadingShift], ['trackingShift', t.trackingShift]] as const)
    for (const [g, n] of Object.entries(map ?? {}))
      if (n !== undefined && (!Number.isInteger(n) || n < -5 || n > 5))
        throw new Error(`typography.${field} '${g}' ${n} is invalid — must be an integer number of rungs in [-5, 5]`);
  // Cross-field, so it can't live in theme-schema.json: `compact` shifts title.xs 18→16, which is
  // exactly where titleFloor 16 pins title.2xs. The old code resolved the collision by DROPPING a
  // rung (leaving a gap mid-ramp); rejecting is the honest answer (#328).
  if ((t.typeScale ?? 'default') === 'compact' && t.titleFloor === 16)
    throw new Error(`typography: titleFloor 16 is incompatible with typeScale 'compact' — compact already shifts title.xs down to 16px, so title.2xs would duplicate it. Use titleFloor 18 with 'compact', or titleFloor 16 with 'default'/'expressive'.`);
  // Typeface library (#287) — guard typos, not taste, same as every other input bound above. A blank
  // entry would emit a `font.typeface.` leaf with an empty slug; two spellings of one face would emit
  // one primitive and silently swallow the other, which reads as "my font vanished".
  const librarySeen = new Set<string>();
  for (const raw of t.typefaceLibrary ?? []) {
    if (typeof raw !== 'string' || !raw.trim())
      throw new Error(`typography.typefaceLibrary contains an empty entry — every entry must be a non-empty font family name`);
    const slug = typefaceSlug(raw.trim());
    if (librarySeen.has(slug))
      throw new Error(`typography.typefaceLibrary lists '${raw.trim()}' twice (both resolve to '${slug}') — a face appears in the library once`);
    librarySeen.add(slug);
  }
  const families = deriveFamilies(t.families);
  const wr = { ...WEIGHT_ROLE_DEFAULT, ...(t.weightRoles ?? {}) };
  const fluid = t.responsive?.fluid ?? true;
  // #2068 (owner decision 2026-10-05: refuse). The fluid clamp() interpolates from minViewport to
  // maxViewport and divides by their difference (`fluidClamp`, tree.ts), so an equal pair emitted
  // `-Infinityrem + Infinityvw` (invalid CSS, the declaration dropped) and an inverted one a clamp() that
  // shrinks as the viewport grows, both building clean. Refused whether or not `fluid` is on (owner decision
  // Q16 = a): the pair is what the fluid regime reads, and a brand that turns fluid on later would inherit it.
  const vpMin = t.responsive?.minViewport ?? 375, vpMax = t.responsive?.maxViewport ?? 1280;
  // The wording is the owner's, approved 2026-10-05 on #2068: one sentence for both the equal and the
  // inverted pair, with the two values as entered.
  if (vpMin >= vpMax)
    throw new Error(`The minimum viewport (${vpMin}px) must be smaller than the maximum viewport (${vpMax}px).`);
  return {
    families,
    typefaces: deriveTypefaces(t.typefaceLibrary, families),
    sizesPx: fontSizeLadder(t.sizeFloor ?? 10),
    // Minted from need, not the full 100–900 axis (#328): emit only the numerics some
    // weight ROLE actually points at. Every `weight-role.<role>` aliases `font.weight.<n>`,
    // so the role values ARE the complete set of referenced numerics — anything else was a
    // dead leaf (default roles use 5 of 9). Per-mode weights union onto this below, which is
    // what keeps a mode's deviating numeric resolvable. The token contract's four standard
    // numerics (300/400/700/900) are ALWAYS minted on top (#1718): the contract guarantees them,
    // and a brand that remaps a role (prism3's `strong: 600`) would otherwise drop one. A brand
    // at the default roles already emits all four, so this moves no existing emission.
    weightsRef: [...new Set([...CONTRACT_WEIGHTS, ...WEIGHT_ROLE_ORDER.map((role) => wr[role])])].sort((a, b) => a - b),
    weightRoles: WEIGHT_ROLE_ORDER.map((role) => ({ role, value: wr[role] })),
    lineHeights: brandLineHeights(t),
    letterSpacings: brandLetterSpacings(t),
    typeScale: t.typeScale ?? 'default',
    composites: buildComposites(fontSizeLadder(t.sizeFloor ?? 10), t, fluid, families),
    fluid,
    // The values the refusal above compared, so each default is written once (#2172). Written twice, a change
    // to the comparison's default alone left every test green and refused against a range the theme never had.
    minViewport: vpMin,
    maxViewport: vpMax,
    underline: resolveUnderline(t.underline),
  };
};
