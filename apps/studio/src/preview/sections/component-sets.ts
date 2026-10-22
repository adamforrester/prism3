/** What each component set says (UI redesign S8.2; owner decisions G1, G3, G4 and G9, all A): its one-line summary, its
 *  category, the sets it contains, the spacing that follows density at the brand's density, and how its last build in
 *  this session went (G9, C1). Since #2700 the Components page's focused-family block draws these lines
 *  (`preview/components.ts`), and the list and the build are the levers pane's (`domains/components.ts`).
 *
 *  PURE (no DOM, so `test-component-catalog.ts` runs it in Node over planted catalogs): what each entry says, and
 *  whether it is OFFERED for building, which is what lets G4's path be tested while no set is unbuildable.
 *
 *  A SET THAT CAN'T BE BUILT (G4 A) is listed, grayed, with its reason, and is not offered: it has no radio, and the
 *  build refuses it (`main.ts`'s `runBuild` asks the catalog again). Its reason is the definition's own `notStandalone`
 *  string with the machine-readable `<id>:` lead stripped (#869's reasoning: the def is the authority on the claim), or,
 *  when the projector cannot build the definition at all, the page's own words.
 *
 *  COUNTS ARE DERIVED, NEVER TYPED (#804, #869): the parts come from the catalog's projection, and the page intro's set
 *  count from the catalog's length.
 *
 *  Classes are the legacy card's (`cset-*`), drawn on the section's ground in the ground's own inks. */
import { densitySpacingStep, type Density } from '@prism3/engine/scale';
import type { Catalog, CatalogEntry } from '../../state/component-catalog';
import type { SetBuild } from '../../state/host-session';

/** The section's copy. APPROVED (owner, 2026-10-05, #2090; "Build failed" added by C1 A). */
export const SETS_COPY = {
  parts: (n: number, unit: CatalogEntry['unit']): string => `${n} ${unit === 'components' ? (n === 1 ? 'component' : 'components') : (n === 1 ? 'part' : 'parts')}`,
  contains: (names: readonly string[]): string => (names.length ? `Contains ${names.join(', ')}` : 'Contains no other set'),
  cannot: (reason: string): string => `Can't be built yet: ${reason}`,
  /** The reason when the projector cannot build the definition (it declares no reason of its own). */
  noProjection: "the Figma build can't read its definition yet",
  web: 'Building sets needs the Figma plugin.',
  buildSet: (name: string): string => `Build ${name}`,
  busy: 'Building…',
  buildHint: "Builds any set it contains first, then switches Figma to the set's page.",
  orderHint: 'Apply Theme first, so the set can use your variables.',
  built: 'Built just now',
  problems: 'Built with problems',
  failed: 'Build failed',
  notBuilt: 'Not built in this session',
  spacingAt: (density: string): string => `Spacing at ${density} density, in px.`,
  picker: 'Set to build',
} as const;

export type SetEntryView = {
  id: string; name: string; summary: string; category: string;
  /** "432 parts", or "44 components" for a set built as separate components; null when it can't be built. */
  parts: string | null;
  contains: string;
  /** One short line per size (or one for spacing with no size), each its padding and gap only: "Small: padding-x 16 ·
   *  padding-y 6 · gap 8" (owner decision C2 A; `SPACING_SHOWN`). The full list is Inspect › Tokens'. */
  spacing: string[];
  /** Offered for building (G4): only a set that can be built. */
  offered: boolean;
  /** The "Can't be built yet: …" line, or null. */
  reason: string | null;
  /** The plugin's last-build line for this session (G9), or null on the web and for a set not offered. */
  last: string | null;
};

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Which density-following keys the set list shows (owner decision C2 A, "only the padding and gap values"): a key whose
 *  name, after its `size.<size>.` lead, is exactly `padding-x`, `padding-y`, `pad-x`, `pad-y`, `pad` (Banner's one padding,
 *  block and inline alike) or `gap`. Left out: every qualified name, the visual padding (`padding-x-visual`), the per-part
 *  gaps and paddings (`select.gap`, `dismissible.visible-gap`, `check-gap`, `select.padding-end`, accordion's
 *  `panel-pad-end`, Banner's `actions-gap`). */
export const SPACING_SHOWN = /^(?:padding-x|padding-y|pad-x|pad-y|pad|gap)$/;

/** What each entry of `catalog` says, in its order. `spacePx` resolves a `space.*` step to px on the brand's ladder;
 *  `density` is the brand's; `plugin` says whether this host builds; `lastOf` is the session's result per set. */
export const setsView = (catalog: Catalog, o: {
  density: Density; spacePx: (ref: string) => number | undefined; plugin: boolean; lastOf: (id: string) => SetBuild | undefined;
}): SetEntryView[] => catalog.map((e) => {
  const nameOf = (id: string): string => catalog.find((x) => x.id === id)?.name ?? id;
  const groups = new Map<string, string[]>();
  for (const s of e.spacing) {
    const m = /^size\.([^.]+)\.(.+)$/.exec(s.key);
    const size = m ? cap(m[1]) : '';
    const name = m ? m[2] : s.key;
    if (!SPACING_SHOWN.test(name)) continue;
    const px = o.spacePx(densitySpacingStep(s.key, s.ref, o.density));
    groups.set(size, [...(groups.get(size) ?? []), `${name} ${px ?? '?'}`]);
  }
  const spacing = [...groups].map(([size, parts]) => `${size ? `${size}: ` : ''}${parts.join(' · ')}`);
  const reason = e.buildable ? null : SETS_COPY.cannot(e.reason ? e.reason.replace(/^\S+:\s*/, '') : SETS_COPY.noProjection);
  const r = o.lastOf(e.id);
  return {
    id: e.id, name: e.name, summary: e.summary, category: cap(e.category),
    parts: e.buildable && e.members !== null ? SETS_COPY.parts(e.members, e.unit) : null,
    contains: SETS_COPY.contains(e.nests.map(nameOf)),
    spacing,
    offered: e.buildable,
    reason,
    last: o.plugin && e.buildable ? (r === 'ok' ? SETS_COPY.built : r === 'issues' ? SETS_COPY.problems : r === 'failed' ? SETS_COPY.failed : SETS_COPY.notBuilt) : null,
  };
});
