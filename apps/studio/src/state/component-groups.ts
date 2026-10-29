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
 * SECTIONS WITH SETTINGS (#2905 phase 1, owner decisions Q538 and Q548 on wireframe v2, every call A). A group of
 * components that shares settings is one section, its title standing in for the family row (Q8 A): **Buttons** (the
 * Buttons page's sets) and **Fields** (the sets Field style draws). Its rows are FLAT: a family's sets are listed at the
 * section's row edge, each set its own row, so rows and the settings block after them share one edge. Every other
 * component row stays as it was, in **Other components** (Q6 A), and Subcomponents is unchanged. A component moves into
 * a section when it gets a setting, by an entry in `SETTING_SECTIONS`: **Tag** (the set Tag style draws)
 * joined so, by owner decision Q578 part 2 (A on #2931's wireframe).
 *
 * TIERS (#2909 Q2909.17 A; the owner's four-tier hierarchy, Q659 A, working names): the sections sit under four tiers,
 * Components / Subcomponents / Content components / Blocks (`TIERS`). A section's tier is its sets' file section, the
 * plugin's `file-taxonomy.ts` (`CatalogEntry.section`): the Components pages are the Components tier, and everything else
 * a build places is Subcomponents, Icon included (call 11 A above). No definition is placed in Content components or
 * Blocks yet, so those two hold nothing; no tier is guessed for a definition that does not name one.
 *
 * THE BOXES (#3129, Q832 A, Q3129.4–6 A) act on the file's add queue, a set of def ids, not on a selection of the
 * session's: a set's box queues it, and a family's and a section's box is three-state over the sets it holds that the
 * file could add, buildable and not in the file (call 8 A, `addableOf`). A set the file holds, or one that can't be
 * built (listed with its reason, G4), has no box, and a family or section with none to add has none either.
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

/** A section: one with settings (`SETTING_SECTIONS`), or Other components, or Subcomponents. */
export type SectionKind = 'buttons' | 'fields' | 'tags' | 'dialogs' | 'banners' | 'links' | 'radios' | GroupKind;

export type GroupSection = {
  readonly kind: SectionKind;
  readonly title: string;
  readonly rows: readonly GroupRow[];
  /** A section with settings lists each set as its own row at the section's edge, with no family row (Q8 A). */
  readonly flat: boolean;
};

/** The sections with settings, in the page's order (#2905, Q548). A row joins the first whose `pages` holds its page or
 *  whose `ids` hold every one of its sets. Fields holds the sets Field style draws (`FIELD_FRAME_PARTS` in the engine's
 *  `anatomy-figma.ts`, typed here so no definition reaches the web bundle; `test-component-groups.ts` holds the two
 *  together). Search field (#2888) is in Fields (Q5 A), with its own Search options block (`SECTION_BLOCKS`). Code input
 *  (#2428) is in Fields because Field style draws its cell, a part the field nests (owner decision Q-2789.3 A), which shares
 *  its page since #2989 (Q656 A).
 *  Tag holds the sets Tag style draws (`TAG_STYLE_PARTS`, held the same way). Dialog holds the sets Dialog title size
 *  reaches (`DIALOG_TITLE_TYPE_KEYS`, #2958, held the same way). Banner holds the sets Banner style reaches
 *  (`BANNER_STYLE_FILL_KEYS`, #2924, held the same way). Radio holds the Radio family, whose control's dot Radio dot
 *  size sets (#3086; held to the defs that nest `radio-control`). */
export const SETTING_SECTIONS: readonly { readonly kind: 'buttons' | 'fields' | 'tags' | 'dialogs' | 'banners' | 'links' | 'radios'; readonly pages: readonly string[]; readonly ids: readonly string[] }[] = [
  { kind: 'buttons', pages: ['Buttons'], ids: [] },
  // #2888 shipped Search field; Q5 A on #2905 puts it inside Fields, with its own Search options block (#2952).
  // #2428: Code input joins Fields, as the component that nests the cell Field style draws (Q-2789.3 A). Since #2989 (Q656 A)
  // the cell shares the Code input page, so the page's row holds both sets and both are listed here.
  { kind: 'fields', pages: [], ids: ['code-input', 'code-input-cell', 'card-number-field', 'password-field', 'search-field', 'select', 'text-field', 'textarea'] },
  { kind: 'tags', pages: [], ids: ['tag'] },
  // #2958: Dialog title size's home (Q578: component settings live with their components), built as Tag's is (Q579 A).
  { kind: 'dialogs', pages: [], ids: ['dialog'] },
  // #2924: Banner style's home (Q693 A: with Banner on the Components page), built as Dialog's is (#2962).
  { kind: 'banners', pages: [], ids: ['banner'] },
  // #2942 (owner Q3 A): Link's first settings block, a read-only line for the underline, whose home is Theme › Type.
  { kind: 'links', pages: [], ids: ['link'] },
  // #3086: Radio dot size's home (Q578), built as Banner's is (#2924). The whole family: the dot is the control's, and
  // the row and the group draw it through the control they nest.
  { kind: 'radios', pages: [], ids: ['radio-control', 'radio-group', 'radio-row'] },
];

/** A settings block on the page: its key names its disclosure line (`opts=<key>`) and its open state. */
export type BlockKey = 'buttons' | 'fields' | 'search' | 'tags' | 'dialogs' | 'banners' | 'links' | 'radios';

/** Each section's settings blocks, in the order they draw after its sets (#2952): a section holds a LIST, not one
 *  block, because Fields holds two, Field options and then Search options below it (#2905 Q5 A). Each block has its own
 *  disclosure line (Q7 A). A section with no settings has no entry. The blocks' copy and builders are
 *  `domains/components.ts`'s; this is the order, which `test-component-groups.ts` holds. */
export const SECTION_BLOCKS: Readonly<Partial<Record<SectionKind, readonly BlockKey[]>>> = {
  buttons: ['buttons'],
  fields: ['fields', 'search'],
  tags: ['tags'],
  dialogs: ['dialogs'],
  banners: ['banners'],
  links: ['links'],
  radios: ['radios'],
};

/** The page's copy. DRAFT: the approved wireframe's own words (#2700), pending the owner's copy sign-off. */
export const GROUPS_COPY = {
  intro: (n: number): string => `The ${n} component sets the engine defines, in families. A build places each on its page in this file.`,
  /** #3129 (Q3129.4–5 A): the plugin's intro, its page control and its boxes' names. DRAFT, the wireframe's words. */
  introPlugin: (n: number): string => `The ${n} component sets the engine defines, in families. Tick a set to add it to this file; Update file adds it.`,
  addEvery: 'Add every set not in this file',
  addCount: (n: number, of: number): string => `${fmt(n)} of ${fmt(of)} to add`,
  addSet: (name: string): string => `Add ${name} to file`,
  addAllOf: (label: string): string => `Add all of ${label} to file`,
  addAll: (title: string): string => `Add all ${title} to file`,
  /** Q10 A on #2905: the section titles as drafted in wireframe v2, Tag's included (placed by #2931 Q579 A). */
  sections: { buttons: 'Buttons', fields: 'Fields', tags: 'Tag', dialogs: 'Dialog', banners: 'Banner', links: 'Link', radios: 'Radio', components: 'Other components', subcomponents: 'Subcomponents' } as Record<SectionKind, string>,
  sectionCount: (kind: SectionKind, rows: number, sets: number): string =>
    kind !== 'components' && kind !== 'subcomponents' ? plural(sets, 'set')
      : `${rows} ${kind === 'components' ? 'families and sets' : rows === 1 ? 'entry' : 'entries'} · ${plural(sets, 'set')}`,
  sets: (n: number): string => plural(n, 'set'),
  page: (page: string): string => `↳ ${page}`,
  members: (n: number, unit: CatalogEntry['unit']): string => `${fmt(n)} ${unit === 'components' ? (n === 1 ? 'component' : 'components') : (n === 1 ? 'variant' : 'variants')}`,
  open: (label: string): string => `Open ${label}`,
  close: (label: string): string => `Close ${label}`,
  noMatch: 'No set matches your search.',
  /** Q2909.17 A: a tier's caption, and the line for the tiers no definition is in yet (after the round-4 wireframe's). */
  tier: (title: string, sets: number): string => `${title} · ${plural(sets, 'set')}`,
  tiersEmpty: (titles: readonly string[]): string => `${titles.join(' and ')}: no component sets yet.`,
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

/** The sections, in order: those with settings (`SETTING_SECTIONS`), Other components, Subcomponents. Rows alphabetical
 *  in each, sets alphabetical in each family. A section with no rows is dropped. */
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
  const sectionOf = (r: GroupRow): SectionKind =>
    (r.kind === 'components' && SETTING_SECTIONS.find((s) => (r.page !== null && s.pages.includes(r.page)) || (s.ids.length > 0 && r.ids.every((id) => s.ids.includes(id))))?.kind) || r.kind;
  const sorted = (k: SectionKind) => rows.filter((r) => sectionOf(r) === k).sort((a, b) => a.label.localeCompare(b.label, 'en'));
  return ([...SETTING_SECTIONS.map((s) => s.kind), 'components', 'subcomponents'] as const)
    .map((kind) => ({ kind, title: GROUPS_COPY.sections[kind], rows: sorted(kind), flat: kind !== 'components' && kind !== 'subcomponents' }))
    .filter((s) => s.rows.length > 0);
};

/** The four tiers, in order (Q2909.17 A, Q659 A). Titles are the owner's working names. */
export const TIERS = [
  { id: 'components', title: 'Components' },
  { id: 'subcomponents', title: 'Subcomponents' },
  { id: 'content', title: 'Content components' },
  { id: 'blocks', title: 'Blocks' },
] as const;
export type TierId = (typeof TIERS)[number]['id'];

/** A section's tier: its rows' kind, which is their file section (`kindOf`). Every section a build places today is
 *  Components or Subcomponents; nothing names Content components or Blocks yet. */
export const tierOf = (sec: GroupSection): TierId => (sec.rows.every((r) => r.kind === 'subcomponents') ? 'subcomponents' : 'components');

/** The tiers, in order, each with its sections in `groupsOf`'s order, an empty tier included. */
export const tiersOf = (catalog: Catalog): { readonly id: TierId; readonly title: string; readonly sections: readonly GroupSection[] }[] => {
  const secs = groupsOf(catalog);
  return TIERS.map((t) => ({ id: t.id, title: t.title, sections: secs.filter((s) => tierOf(s) === t.id) }));
};

/** A focus key for one set in a flat section, where the set's family has no row of its own to focus (Q8 A). */
export const setFocusKey = (id: string): string => `set=${id}`;

/** The row a focus key names: a row by its key, or the row holding the set a `setFocusKey` names. */
export const rowOfFocus = (catalog: Catalog, focus: string | null): GroupRow | undefined => {
  if (!focus) return undefined;
  const rows = groupsOf(catalog).flatMap((s) => s.rows);
  const set = focus.startsWith('set=') ? focus.slice(4) : null;
  return rows.find((r) => r.key === focus) ?? (set ? rows.find((r) => r.ids.includes(set)) : undefined);
};

/** The entry for an id. */
export const entryOf = (catalog: Catalog, id: string): CatalogEntry | undefined => catalog.find((e) => e.id === id);

/** The sets of `ids` a build is offered for (G4). */
export const buildableOf = (catalog: Catalog, ids: readonly string[]): string[] => ids.filter((id) => entryOf(catalog, id)?.buildable === true);

/** The sets of `ids` the file could add (#3129): buildable, and not in the file. A box acts on these alone. */
export const addableOf = (catalog: Catalog, ids: readonly string[], present: readonly string[]): string[] =>
  buildableOf(catalog, ids).filter((id) => !present.includes(id));

export type BoxState = 'on' | 'mixed' | 'off';
/** A box over several sets (call 8 A, #3129): on when every set it could add is queued, off when none is, mixed
 *  between. A box over no set to add is off, and is not drawn (Q3129.6 A). */
export const boxOfSets = (catalog: Catalog, ids: readonly string[], queue: ReadonlySet<string>, present: readonly string[]): BoxState => {
  const ok = addableOf(catalog, ids, present);
  const on = ok.filter((id) => queue.has(id)).length;
  return on === 0 ? 'off' : on === ok.length ? 'on' : 'mixed';
};

/** A box's toggle, as the queue write it posts (`add-queue`): an all-on box takes its sets out of the queue, any other
 *  queues the ones it could add that are not queued yet. */
export const toggleSets = (catalog: Catalog, ids: readonly string[], queue: ReadonlySet<string>, present: readonly string[]): { readonly ids: string[]; readonly on: boolean } => {
  const ok = addableOf(catalog, ids, present);
  return boxOfSets(catalog, ids, queue, present) === 'on' ? { ids: ok, on: false } : { ids: ok.filter((id) => !queue.has(id)), on: true };
};

/** Whether a set's own name or summary holds a search, case-insensitively. An empty search matches nothing here. */
export const setMatches = (catalog: Catalog, id: string, q: string): boolean => {
  const t = q.trim().toLowerCase();
  const e = entryOf(catalog, id);
  return !!t && !!e && [e.name, e.summary].some((x) => x.toLowerCase().includes(t));
};

/** Whether a row stays under a search (#2700's edge state: "a family stays when any of its sets matches"): its label,
 *  its page, or any of its sets' names or summaries holds the query, case-insensitively. */
export const rowMatches = (catalog: Catalog, row: GroupRow, q: string): boolean => {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  return [row.label, row.page ?? ''].some((x) => x.toLowerCase().includes(t)) || row.ids.some((id) => setMatches(catalog, id, t));
};

/** The families a search opens (owner decision on #2812, call 7): each family one of whose sets matches, so the match is
 *  shown rather than folded away. */
export const familiesToOpen = (catalog: Catalog, q: string): string[] =>
  groupsOf(catalog).flatMap((sec) => sec.rows).filter((r) => r.family && r.ids.some((id) => setMatches(catalog, id, q))).map((r) => r.key);

/** Sets in the list's order, whatever order they were selected in (review N1 on #2812): a run builds them as the list
 *  reads, top to bottom. An id the list doesn't hold goes last. */
export const inListOrder = (catalog: Catalog, ids: Iterable<string>): string[] => {
  const order = groupsOf(catalog).flatMap((sec) => sec.rows.flatMap((r) => r.ids));
  const at = (id: string): number => { const i = order.indexOf(id); return i < 0 ? order.length : i; };
  return [...ids].sort((a, b) => at(a) - at(b));
};

/** A set named as people read it (owner decision Q392 on #2812): a set alone on its row by the row's label ("Focus
 *  ring"), a part set by its base in words and its part ("Icon button Neutral"), any other set by its name in words. */
export const displayNameOf = (catalog: Catalog, id: string): string => {
  const e = entryOf(catalog, id);
  if (!e) return id;
  const row = groupsOf(catalog).flatMap((sec) => sec.rows).find((r) => r.ids.includes(id));
  if (row && !row.family) return row.label;
  const dot = e.name.indexOf('.');
  return dot < 0 ? words(e.name) : `${words(e.name.slice(0, dot))} ${e.name.slice(dot + 1)}`;
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
 *  it does not hold itself, in first-seen order, named as the list names them (`displayNameOf`). */
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
  return out.map((id) => displayNameOf(catalog, id));
};
