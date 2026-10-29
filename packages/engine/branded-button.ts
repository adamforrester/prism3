/**
 * The branded-button helpers — the skeleton WalletButton and SignInButton share (#2343, owner decisions Q-B4 A,
 * Q-W3 A, Q-S11 A). Helpers, not a whole-def generator: the two components differ in their code contract, props,
 * states, paint and prose, so a `makeBrandedButton(config)` would carry a config as large as either def. What they
 * share is below: the provider → mark map, the height and ring token blocks, the nested mark part, the focus-ring
 * part and the height exclusions a provider's floor and ceiling imply.
 *
 * ITS OWN MODULE, outside `components/`, for the reason `button-spacing.ts` gives: that directory holds defs only
 * (`typecheck-components.ts` fails a tracked file there that adds nothing to `componentDefs`).
 *
 * Each helper returns a fresh object, in the key order WalletButton wrote by hand before the extraction, so its
 * projected plans are byte-identical (`regen.ts --check` and `lint-component-surface.ts` with no `--accept`).
 * The factory arm in `test.ts` (`#2343 branded-button factory`) holds the shared blocks equal across every def
 * built from them. The provider-rule arms stay independent of these helpers and of each def's numbers (docs/34):
 * they type each provider's limits again from its guidelines.
 */
import type { NestingRelation, PartDef } from './component-schema';

/** The size axis every branded button carries, medium first (the code default, #2752). */
export const BRANDED_SIZES = ['medium', 'small', 'large'] as const;
export type BrandedSize = (typeof BRANDED_SIZES)[number];

/** One provider's rule record, as far as the skeleton reads it: the mark it nests and the heights it allows. A
 *  component's own record extends this with what only it reads (SignInButton's paint and wording). */
export type BrandedProviderRule = {
  /** The mark, `<kind>/<name>` in the brand-mark vocabulary. */
  mark: string;
  /** The provider's smallest allowed height, in px. A size rung under it has no member. */
  minHeight?: number;
  /** The provider's largest allowed height, in px. A size rung over it has no member. */
  maxHeight?: number;
};

/** Provider id → mark name, so the provider list stays data: a provider joins with a rule record, not code. */
export const providerMap = <P extends string>(rules: Readonly<Record<P, BrandedProviderRule>>): Record<P, string> =>
  Object.fromEntries(Object.entries<BrandedProviderRule>(rules).map(([p, r]) => [p, r.mark])) as Record<P, string>;

/** The shared height rungs, 36 / 44 / 56 at comfortable density: one size axis for every branded button, so a stack
 *  of them lines up by construction. */
export const heightTokens = (): Record<string, string> => ({
  'size.small.height': 'size.sm.height',
  'size.medium.height': 'size.md.height',
  'size.large.height': 'size.lg.height',
});

/** The brand's own corner. No branded button carries a shape axis (Q-W5 A, Q-S12 A). */
export const radiusToken = (): Record<string, string> => ({ radius: 'radius.md' });

/** The focus ring's width and its offset outside the button. */
export const ringTokens = (): Record<string, string> => ({
  'ring-width': 'focus.ring.width',
  'ring-offset': 'focus.ring.offset',
});

/** The nested brand mark: `nest-fixed`, its coordinate picked per member, its height bound and its width from its
 *  own proportion (`aspectLock`), keeping its own paint (`fixedPaint`). `nesting` carries the variant and the
 *  mapping that picks the mark per member; the caller builds it from its provider map. */
export const markPart = (o: {
  nesting: Extract<NestingRelation, { kind: 'nest-fixed' }>;
  height: string;
  note: string;
  /** Reads the def's literal record for a glyph tint (Q846 A, SignInButton only). */
  literal?: 'mark';
}): PartDef => ({
  kind: 'nest',
  nests: 'brand-mark',
  nesting: o.nesting,
  height: o.height,
  aspectLock: true,
  fixedPaint: true,
  ...(o.literal ? { literal: o.literal } : {}),
  note: o.note,
});

/** The shared focus ring, outside the button at focus-visible, inset by the ring offset and cleared of its stroke. */
export const focusRingPart = (note: string): PartDef => ({
  kind: 'absolute',
  when: 'focus-visible',
  nests: 'focus-ring',
  inset: 'ring-offset',
  strokeInset: 'ring-width',
  nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
  note,
});

/** The members a provider's height range rules out, as `excludeCoordinates` entries: one per (rung, provider), in
 *  rung order and then provider order. `rungs` is each size's nominal height at comfortable density; compact and
 *  spacious move every rung, and each component's code clamps there. */
export const heightExclusions = <P extends string>(
  rules: Readonly<Record<P, BrandedProviderRule>>,
  rungs: Readonly<Record<BrandedSize, number>>,
  order: readonly BrandedSize[] = ['small', 'medium', 'large'],
): Array<{ provider: P[]; size: BrandedSize[] }> =>
  order.flatMap((size) =>
    (Object.entries(rules) as Array<[P, BrandedProviderRule]>)
      .filter(([, r]) => rungs[size] < (r.minHeight ?? 0) || rungs[size] > (r.maxHeight ?? Infinity))
      .map(([p]) => ({ provider: [p], size: [size] })));
