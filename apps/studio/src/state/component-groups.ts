/**
 * The Components page's list, as a pure model (#2700; the owner's approved wireframe, every call A). No DOM, so
 * `test-component-groups.ts` runs it in Node over the real catalog and over planted ones.
 *
 * WHAT IT GROUPS BY: the Figma page a build places a set on (`CatalogEntry.page`, from the plugin's `file-taxonomy.ts`),
 * so the list reads as the file does (call 3, note 3). A page holding several sets is a FAMILY, one row that opens to its
 * sets (Buttons, Checkbox, Accordion…); a page holding one set is a row of its own. Two sections: **Components**, the
 * file's Components pages, and **Subcomponents**, everything else a build places, Icon included (call 11 A: 23 sets
 * nest it, so "Build all" should make it; it still lands on its own page). Part sets such as Checkbox.Control stay in
 * their family (call 12 A).
 *
 * ORDER (note 2): rows alphabetical by their label in each section; a family's sets alphabetical by component name.
 *
 * LABELS (call 14 A): a row by its page's name in sentence case ("Text field", "Field label"); a set inside a family by
 * its component name ("Button.Destructive"). A row whose page is not a component page (Icon, on "Icons & assets") takes
 * its set's own name, so the list never names a page that holds other things.
 *
 * SELECTION is a set of def ids. A family's and a section's box is three-state over the sets it holds that can be built
 * (call 8 A); a set that can't be built is listed with its reason and never selected (G4).
 *
 * Copy here is the wireframe's, which the owner approved as DRAFT (#2700): every string is DRAFT until the owner signs
 * the copy off. US English, `docs/voice-standard.md`.
 */
import type { Catalog, CatalogEntry } from './component-catalog';

export type GroupKind = 'components' | 'subcomponents';

/** One row: a family (several sets on one page) or a set of its own. */
export type GroupRow = {
  /** Stable across repaints: the section and the page (or the set's id, for a set with no page). */
  readonly key: string;
  readonly label: string;
  /** The Figma page its sets land on, without the `↳ ` prefix (idea 12), or null. */
  readonly page: string | null;
  readonly kind: GroupKind;
  /** Its sets, alphabetical by component name. */
  readonly ids: readonly string[];
  readonly family: boolean;
};

export type GroupSection = { readonly kind: GroupKind; readonly title: string; readonly rows: readonly GroupRow[] };

/** The page's copy. DRAFT: the approved wireframe's own words (#2700), pending the owner's copy sign-off. */
export const GROUPS_COPY = {
  intro: (n: number): string => `The ${n} component sets the engine defines, in families. A build places each on its page in this file.`,
  sections: { components: 'Components', subcomponents: 'Subcomponents' } as Record<GroupKind, string>,
  sectionCount: (kind: GroupKind, rows: number, sets: number): string =>
    `${rows} ${kind === 'components' ? 'families and sets' : rows === 1 ? 'entry' : 'entries'} · ${plural(sets, 'set')}`,
  sets: (n: number): string => plural(n, 'set'),
  page: (page: string): string => `↳ ${page}`,
  members: (n: number, unit: CatalogEntry['unit']): string => `${fmt(n)} ${unit === 'components' ? (n === 1 ? 'component' : 'components') : (n === 1 ? 'variant' : 'variants')}`,
  selectSet: (name: string): string => `Select ${name}`,
  selectAllOf: (label: string): string => `Select all of ${label}`,
  selectAll: (title: string): string => `Select all ${title}`,
  open: (label: string): string => `Open ${label}`,
  close: (label: string): string => `Close ${label}`,
  buildAll: (n: number): string => `Build all ${n}`,
  buildingAll: (at: number, n: number): string => `Building ${at} of ${n}…`,
  noMatch: 'No set matches your search.',
  noCatalog: 'No component sets to list. Close the plugin and open it again.',
} as const;

export const fmt = (n: number): string => n.toLocaleString('en-US');
const plural = (n: number, word: string): string => `${fmt(n)} ${word}${n === 1 ? '' : 's'}`;

/** Which section a catalog entry lists under (call 11 A): the file's Components pages, else Subcomponents. */
export const kindOf = (e: CatalogEntry): GroupKind => (e.section === 'Components' ? 'components' : 'subcomponents');

/** A page name in sentence case: "Field Label" → "Field label". Words after the first are lowercased unless they are an
 *  acronym or a symbol. */
export const sentenceCase = (s: string): string =>
  s.split(' ').map((w, i) => (i === 0 || /^[A-Z0-9&]{2,}$/.test(w) ? w : w.toLowerCase())).join(' ');

/** A component name as words: "ImagePlaceholder" → "Image placeholder", "Icon" → "Icon". */
const words = (name: string): string => sentenceCase(name.replace(/\./g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'));

/** The two sections, rows alphabetical, sets alphabetical in each family. */
export const groupsOf = (catalog: Catalog): GroupSection[] => {
  const byKey = new Map<string, { kind: GroupKind; page: string | null; section: string | null; ids: string[] }>();
  for (const e of catalog) {
    const kind = kindOf(e);
    const key = `${kind}|${e.page ?? `#${e.id}`}`;
    const g = byKey.get(key) ?? { kind, page: e.page, section: e.section, ids: [] };
    g.ids.push(e.id);
    byKey.set(key, g);
  }
  const nameOf = (id: string): string => catalog.find((e) => e.id === id)?.name ?? id;
  const rows: GroupRow[] = [...byKey].map(([key, g]) => {
    const ids = [...g.ids].sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'en'));
    const pageIsComponents = g.section === 'Components' || g.section === 'Subcomponents';
    const label = g.page && (pageIsComponents || ids.length > 1) ? sentenceCase(g.page) : words(nameOf(ids[0]));
    return { key, label, page: g.page, kind: g.kind, ids, family: ids.length > 1 };
  });
  const sorted = (k: GroupKind) => rows.filter((r) => r.kind === k).sort((a, b) => a.label.localeCompare(b.label, 'en'));
  return (['components', 'subcomponents'] as const)
    .map((kind) => ({ kind, title: GROUPS_COPY.sections[kind], rows: sorted(kind) }))
    .filter((s) => s.rows.length > 0);
};

/** The entry for an id. */
export const entryOf = (catalog: Catalog, id: string): CatalogEntry | undefined => catalog.find((e) => e.id === id);

/** The sets of `ids` a build is offered for (G4). */
export const buildableOf = (catalog: Catalog, ids: readonly string[]): string[] => ids.filter((id) => entryOf(catalog, id)?.buildable === true);

export type BoxState = 'on' | 'mixed' | 'off';
/** A box over several sets (call 8 A): on when every buildable set is selected, off when none is, mixed between. A box
 *  over no buildable set is off. */
export const boxOfSets = (catalog: Catalog, ids: readonly string[], sel: ReadonlySet<string>): BoxState => {
  const ok = buildableOf(catalog, ids);
  const on = ok.filter((id) => sel.has(id)).length;
  return on === 0 ? 'off' : on === ok.length ? 'on' : 'mixed';
};

/** A box's toggle: an all-on box clears its sets, any other selects every buildable one. Returns a new selection. */
export const toggleSets = (catalog: Catalog, ids: readonly string[], sel: ReadonlySet<string>): Set<string> => {
  const ok = buildableOf(catalog, ids);
  const next = new Set(sel);
  if (boxOfSets(catalog, ids, sel) === 'on') for (const id of ok) next.delete(id);
  else for (const id of ok) next.add(id);
  return next;
};

/** Whether a row stays under a search (#2700's edge state: "a family stays when any of its sets matches"): its label,
 *  its page, or any of its sets' names or summaries holds the query, case-insensitively. */
export const rowMatches = (catalog: Catalog, row: GroupRow, q: string): boolean => {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const said = [row.label, row.page ?? '', ...row.ids.flatMap((id) => { const e = entryOf(catalog, id); return e ? [e.name, e.summary] : []; })];
  return said.some((x) => x.toLowerCase().includes(t));
};

/** What a selection costs, per unit: the variants of the sets built as one component set, and the components of the
 *  sets built as separate components (Icon, Spinner). */
export const costOf = (catalog: Catalog, ids: Iterable<string>): { sets: number; variants: number; components: number } => {
  let sets = 0, variants = 0, components = 0;
  for (const id of ids) {
    const e = entryOf(catalog, id);
    if (!e?.buildable || e.members === null) continue;
    sets++;
    if (e.unit === 'components') components += e.members; else variants += e.members;
  }
  return { sets, variants, components };
};

/** The sets a build makes first when the file lacks them (idea 7, #1633): what the selection nests, transitively, that
 *  it does not hold itself, in first-seen order, by component name. */
export const alsoBuilds = (catalog: Catalog, sel: Iterable<string>): string[] => {
  const chosen = new Set(sel);
  const out: string[] = [];
  const walk = (id: string): void => {
    for (const n of entryOf(catalog, id)?.nests ?? []) {
      if (chosen.has(n) || out.includes(n)) continue;
      out.push(n);
      walk(n);
    }
  };
  for (const id of chosen) walk(id);
  return out.map((id) => entryOf(catalog, id)?.name ?? id);
};
