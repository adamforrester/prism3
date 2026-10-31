/**
 * THE USAGE PANEL BESIDE EACH SET (#846 phase 2; wireframe approved 2026-10-19, Q406 follow-ups A) — the component's
 * usage doc, drawn on its page from `_Doc-block` instances, right of the set and top-aligned with it.
 *
 * ONE SOURCE. The panel reads the engine's doc section model (`component-doc-sections.ts` `docSections`), the same
 * function the Markdown page renders, so the panel and the page cannot disagree about which sections a def has or what
 * each holds. A section the model omits is not drawn; nothing here decides that a second time.
 *
 * SHORTER THAN THE PAGE (Q406.2 A). The panel draws every section the model returns except `PANEL_OMITS` (Building it
 * in code, which is site-only), and inside the rest:
 *   - Overview: the summary as the lede under the title, then the model's rows, each cut to two sentences;
 *   - Anatomy: the default member as a live specimen with a numbered marker on each part the build named, then each
 *     part with its caption cut to one sentence. The caption is the model's, so a note in the maintainer register,
 *     or one naming a tool, is a part name with no caption (the model holds it back);
 *   - Styles: "Every member is in the set to the left.", then each axis as chips with when it changes, then the states;
 *   - Usage guidelines: the usage cut to two sentences, and `PANEL_DO_ITEMS` Do and Don't items, with a line saying
 *     how many of how many when the def has more;
 *   - Accessibility: Keyboard, Focus and Screen readers, one sentence each. WCAG and Motion stay on the page;
 *   - Content guidelines: the guidelines and each pattern, two sentences each;
 *   - Theming: the default member in light and in dark side by side (Q406.6 A), each its mode pinned on the instance,
 *     stacked instead when side by side would make the panel `THEMING_ROW_MAX` wide (#2970 Q2 A). The model draws
 *     Theming only when it is given modes, so the panel passes the file's: those of the color collection, `light` and
 *     `dark` among them;
 *   - Related components: each list as a bulleted list of component names, each name a link to that component's set
 *     in the file (#2970 item 3); a name with no set in the file, and each Replaces entry, is plain text. A family's
 *     member reads as its family, linked to the lead's set, once per list, and the panel's own family is left out
 *     (#2970 Q5 A).
 *
 * EVERY SPECIMEN AT ITS MEMBER'S OWN WIDTH (#2970 Q1 A). The panel is as wide as its widest stage needs and never
 * narrower than `PANEL_WIDTH` (`panelLayout`), read off the set alone, so the seat, the dry run and the apply agree.
 *
 * A FAMILY AS ONE COMPONENT (#2970 item 4, Q3 A, Q4 A): titled with its taxonomy page's name, the lead's summary as
 * its lede, and "In this family" a bulleted list of its parts, the lead first, each with its own summary and a link.
 *
 * CANVAS FURNITURE, KEPT APART FROM ITS LABELS. The panel is a frame on the set's own parent, never inside the set, so
 * the update's hand-edit check and the as-built record stay blind to it, as they are to the labels. It carries its own
 * tag (`prism3`/`docPanel`), not the labels' `furniture` tag, because the labels' clear removes what it finds, and a
 * panel a designer edited must never be removed.
 *
 * RE-PLANNED ON EVERY BUILD AND UPDATE, AND HAND EDITS ARE KEPT (Q406.9 A). The panel records two things when it is
 * drawn: what it holds (the style guide's `fingerprintOf`, reused rather than restated) and the plan it was drawn from
 * (`PanelPlan.hash`). A build draws it fresh; an update draws it when the dry run found it due: missing, drawn from an
 * older plan, or not where the set now puts it (`docPanelDue`). Drawing fresh, an earlier panel of the set that still
 * holds what was written is removed; one that does not was edited by hand, so it is kept: renamed "(edited)", moved
 * below everything in its column, and named in the run's result. Nothing is lost silently. A kept panel is never
 * touched again, except to move it down when a fresh panel would cover it.
 *
 * NEVER ON TOP OF ANYTHING. The panel goes `PANEL_GAP` right of the set, top-aligned. Labels sit above and left of
 * the set and a backdrop reaches `BACKDROP_PAD` (12) past it, so none of them is in that spot; another set may be. A
 * panel that would overlap any node on the parent is not drawn, and the run says so and what to do. The set's own
 * furniture is the exception: Prism3 draws it to fit the set, so it never keeps the set's panel out (#2902). When what is in
 * the way is a Prism3 set later in the set's row (or its labels or panel), Update makes room: each set's box reaches
 * past its panel when the update spaces the sets (`docPanelReach`, `pageSetMoves`), so it moves that set `SET_GAP`
 * past the panel. Anything else is the designer's to move, and the run says that instead. A new set is seated with
 * room for its panel (`seatNewSet`) and past every panel already on the page, which `placeNewSet` reads as content.
 * A blocked panel is recorded on the parent with the height it would have had, so the dry run counts it as due only
 * once the spot is clear, or when the update itself would clear it (`docPanelBlockers`): never on every run.
 *
 * NEVER THROWS FOR A MISSING TEMPLATE. A file without `_Doc-block` draws no panel and keeps any it has; the run's
 * Set up file line names it (`templatesLine`), as for the labels.
 *
 * HELD FOR THE OWNER: `PANEL_GAP`, `PANEL_PAD`, `SECTION_GAP`, `MODE_GAP`, the panel's name, and every sentence this
 * file writes (DRAFT wording). `PANEL_WIDTH` and `THEMING_ROW_MAX` are the owner's (#2970 Q1 A, Q2 A).
 */
import { docSections, type DocSection, type DocSectionId } from '@prism3/engine/component-doc-sections';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { componentDefs } from '@prism3/engine/components/index';
import { CANVAS_FURNITURE } from '@prism3/engine/anatomy-figma';
import { leadOf, leafForDef } from './file-taxonomy';
import { isTemplateSet } from './file-components';
import { fingerprintOf, fnv, type SgNode } from './style-guide';
import { NS } from './persist-figma';
import { STAMP_KEY } from './write-components';
import { builtByPrism3, readBaseline } from './member-baseline';
import { readTag } from './canvas-furniture';
import { readSpecTag } from './spec-tag';
import { CAPTION, CHIP_SLOTS, DOC_BLOCK_SET, DO_ROWS, SPECIMEN, STAGE_PAD, TOP_PADDING, docBlockVariant, variantValues, type DocBlockSize, type DocBlockType } from './doc-block';

export const DOC_PANEL_NS = 'prism3';
export const DOC_PANEL_KEY = 'docPanel';
/** What the panel held when it was drawn, and the plan it was drawn from. Shared, so another tool can read them. */
export const DOC_PANEL_PRINT = 'docPanelPrint';
export const DOC_PANEL_PLAN = 'docPanelPlan';
/** The sets Related's names linked to when the panel was drawn, by def id (#2970): a set built, rebuilt or deleted since
 *  makes the panel due, so its links never point at a node that is gone or miss one that is now there. */
export const DOC_PANEL_LINKS = 'docPanelLinks';
/** The width the panel's rule gave when it was drawn (`panelLayout`): a member resized since makes the panel due. */
export const DOC_PANEL_WIDTH = 'docPanelWidth';
/** On the set's parent: each set whose panel the last draw found blocked, with the panel's height and plan then
 *  (`docPanelBlockers`). Cleared when the panel is drawn. */
export const DOC_PANEL_BLOCKED = 'docPanelBlocked';
/** On each section frame: the model section it draws. */
export const DOC_SECTION_KEY = 'docSection';
/** The panel's narrowest width. A set whose specimens need more widens its panel (`panelWidthFor`, #2970 Q1 A). */
export const PANEL_WIDTH = 560;
/** THEMING SIDE BY SIDE (#2970 Q2 A): the two modes sit in a row `MODE_GAP` apart, unless that row would make the panel
 *  this wide or wider; then they stack. No cap otherwise: a single wide specimen widens the panel as far as it needs. */
export const THEMING_ROW_MAX = 960;
export const MODE_GAP = 16;
/** What the width rule allows for one part marker across, before the host lays the Badge out: a bracket's tier is this
 *  plus `MARK_SEP` on each side. The draw measures the real Badge and widens the panel further if it needs to. */
export const MARK_ROOM = 24;
/** Between the set's right edge and the panel. More than `BACKDROP_PAD`, so a backdrop never reaches it. */
export const PANEL_GAP = 40;
export const PANEL_PAD = 24;
export const SECTION_GAP = 24;
/** THE SPEC COLUMN (#2830 phase 2, Q2830.1 B): the spec panel's own column, `SPEC_GAP` right of the usage panel and
 *  top-aligned with it, `SPEC_WIDTH` wide so a color table keeps each variable on one line (`spec-panel.ts`). */
export const SPEC_WIDTH = 880;
export const SPEC_GAP = PANEL_GAP;
/** How far a set's box reaches right once its panels are drawn: past the usage panel and the spec column, whether or not
 *  specs are drawn yet (Q2830.1 B: every set moves once, on the next Update). What the update spaces the next set from,
 *  for a panel at its narrowest; a set whose panel widens reaches further (`panelReachFor`). */
export const PANEL_REACH = PANEL_GAP + PANEL_WIDTH + SPEC_GAP + SPEC_WIDTH;
/** The sections the panel leaves to the docs site (Q406.2 A). */
export const PANEL_OMITS: readonly DocSectionId[] = ['code'];
export const PANEL_DO_ITEMS = DO_ROWS;
/** The modes the Theming section shows side by side, when the file's color collection has them (Q406.6 A). */
export const PANEL_MODES = ['light', 'dark'] as const;
const SIZE: DocBlockSize = 'sm';
/** Raise when the panel's layout moves without its plan moving, so every drawn panel reads as due again. 2: one panel
 *  per family, and the anatomy markers with their leaders (#2927). 3: the title sizes, the space above Do and Don't, and
 *  Related as linked lists (#2970). 4: each specimen at its member's own width, the panel widening to fit (#2970 items 1
 *  and 4, #2916). 5: a specimen never under what its def declares, so Dialog's anatomy no longer collapses (#3205). */
const PANEL_FORMAT = 5;
/** THE TITLES (#2970 item 5, owner decision): the panel's title and each section's, in px, with their letter-spacing
 *  in percent. The tracking is the studio's: its 20px page titles take `ls-tightest` (−4%) and its 16px section titles
 *  `ls-tighter` (−3%), the default theme's values (`theme.ts` `LETTER_SPACINGS`). Written over the block's text style,
 *  whose face and weight (`title/…/strong`) stay. */
export const TITLE_TYPE = { size: 18, tracking: -4 } as const;
export const SECTION_TYPE = { size: 16, tracking: -3 } as const;
/** THE ANATOMY MARKERS' GEOMETRY (#2916, #2927; HELD FOR THE OWNER): the shortest leader, and its gap from the
 *  specimen's edge; the space between two markers, or a marker and its bracket; how far a leader or a bracket's tick
 *  reaches into its part, so it reads as touching it. */
export const MARK_GAP = 8;
export const MARK_SEP = 4;
export const MARK_INSET = 2;
/** The width of a leader or a bracket line. */
export const LEADER = 1;

/* ── the pure planner ──────────────────────────────────────────────────────────────────────────────────── */

export type PanelBlock =
  | { type: 'Heading'; text: string; size: DocBlockSize }
  | { type: 'Paragraph'; text: string; size: DocBlockSize }
  | { type: 'Field'; label: string; text: string }
  | { type: 'Do-Dont'; do: string[]; dont: string[] }
  | { type: 'Chips'; label: string; chips: string[]; note?: string }
  /** A bulleted list (#2970 item 3): each item's name, the def whose set it links to when the file has one, and a line
   *  after the name (`note`, "In this family"'s summaries, #2970 item 4). */
  | { type: 'Links'; label: string; items: LinkItem[] }
  /** The documented set's default member; `mode` pins one, `marks` numbers the parts on it (and on the members the
   *  draw adds for parts the default does not show). */
  | { type: 'Specimen'; mode?: string; caption?: string; marks?: AnatomyMark[] };
export interface LinkItem { name: string; def?: string; note?: string }
/** One line of a Links block as the panel writes it: the name, then its note after a colon. */
export const linkLine = (i: LinkItem): string => (i.note ? `${i.name}: ${i.note}` : i.name);
export interface PanelSection { id: DocSectionId; title: string; blocks: PanelBlock[]; row?: boolean }
/** `family`: every def on the lead's taxonomy page, the lead included, when it holds more than one (#2927): the panel
 *  lists them under the lede, the lead first, each by its name in the family and its own summary's first sentence,
 *  linked to its set (#2970 Q4 A). */
export interface PanelPlan { def: string; title: string; lede: string; family?: LinkItem[]; sections: PanelSection[]; hash: string }
/**
 * ONE NUMBERED ENTRY OF THE ANATOMY (#2916, #2927): its number, the part it marks, and that part's path below the
 * def's root, by part id (empty for the root itself: the specimen is the root). `bracket` marks a part that holds
 * another marked part, the root among them (Q551 A on Q5): a bracket along its left edge instead of a leader. `parts`
 * counts the repeats merged into it (Q4): siblings with the same nest settings are one entry, marked on the first.
 */
export interface AnatomyMark { n: number; part: string; path: string[]; bracket: boolean; parts: number }

/** THE FAMILY A DEF'S PANEL COVERS (#2927, owner decision Q551 A on Q1): the defs on its taxonomy page that draw canvas
 *  furniture, in page order, and the one that leads (`leadOf`). A def on no page is a family of one. Null for a def
 *  with no furniture, which draws no panel. */
export interface PanelFamily { page: string; lead: string; members: string[] }
export const panelFamily = (defId: string): PanelFamily | null => {
  if (!CANVAS_FURNITURE.has(defId)) return null;
  const found = leafForDef(defId);
  if (!found) return { page: defId, lead: defId, members: [defId] };
  const lead = leadOf(found.leaf) ?? defId;
  return CANVAS_FURNITURE.has(lead) ? { page: found.leaf.page, lead, members: found.leaf.defs.filter((d) => CANVAS_FURNITURE.has(d)) } : null;
};
/** Whether `defId`'s set carries its family's panel: only the lead's does. */
export const leadsPanel = (defId: string): boolean => panelFamily(defId)?.lead === defId;
/** A def as another panel's Related names it (#2970 Q5 A): a member of a family of more than one by the family's page
 *  name, linked to its lead's set; any other def by its own name and set. */
export const familyRef = (id: string, name: (id: string) => string): { name: string; def: string } => {
  const f = panelFamily(id);
  return f && f.members.length > 1 ? { name: f.page, def: f.lead } : { name: name(id), def: id };
};
/** A member's name within its family (#2970 Q4 A): its display name less the family's page name and a dot, so
 *  "Checkbox.Row" on the Checkbox page reads "Row"; a name the page does not prefix ("Button.Group" on Buttons) stays. */
export const nameInFamily = (name: string, page: string): string => (name.startsWith(`${page}.`) && name.length > page.length + 1 ? name.slice(page.length + 1) : name);

/** A variant value or axis as text: hyphens to spaces, first letter capitalized. The labels' rule (`sentenceCase`). */
const sentence = (s: string): string => { const t = s.replace(/-/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
/** Prose as the panel shows it: code spans as plain text, whitespace folded. */
export const plain = (s: string): string => s.replace(/`/g, '').replace(/\s+/g, ' ').trim();
/** The first `n` sentences of `s`, the wireframe's cut: a sentence ends at `.` or `)` before a capital or a quote. */
export const firstSentences = (s: string, n: number): string => plain(s).split(/(?<=[.)])\s+(?=[A-Z"(])/).slice(0, n).join(' ');

/**
 * THE ANATOMY'S NUMBERED ENTRIES (#2916, #2927), from the def's part tree: pure, so the merge and the bracket rule are
 * checked with no host. `listed` is the model's parts, in its order. Repeats (Q551 A on Q4) are numbered siblings of
 * one name (`item1`, `item2`) that nest the same component with the same settings, variant, follows and presence; their
 * overrides (an item's own text) are content, not settings. The first of them carries the entry; the numbering runs over the entries.
 */
export const anatomyMarks = (def: ComponentDef, listed: readonly string[]): AnatomyMark[] => {
  const parts = (def.anatomy?.parts ?? {}) as Record<string, { kind?: string; children?: string[]; nests?: string; nesting?: unknown; presentWhen?: unknown }>;
  const root = def.anatomy?.root;
  const parentOf = new Map<string, string>();
  for (const [id, p] of Object.entries(parts)) for (const c of p.children ?? []) parentOf.set(c, id);
  const pathOf = (id: string): string[] => { const out: string[] = []; for (let q: string | undefined = id; q && q !== root; q = parentOf.get(q)) out.unshift(q); return out; };
  // A numbered part (`item2`) nesting what its numbered sibling nests, the same way: a repeat. Two parts with different
  // names (`decrement`, `increment`) nest one component for different jobs, so they stay apart.
  const key = (id: string): string => {
    const p = parts[id];
    return p?.kind === 'nest' && /\d$/.test(id) ? JSON.stringify([id.replace(/\d+$/, ''), parentOf.get(id) ?? '', p.nests, p.nesting ?? null, p.presentWhen ?? null]) : `part:${id}`;
  };
  const firsts: { part: string; parts: number }[] = [];
  const byKey = new Map<string, { part: string; parts: number }>();
  for (const id of listed) {
    const k = key(id);
    const had = byKey.get(k);
    if (had) { had.parts++; continue; }
    const e = { part: id, parts: 1 };
    byKey.set(k, e);
    firsts.push(e);
  }
  const marked = new Set(firsts.map((e) => e.part));
  const holds = (id: string): boolean => [...marked].some((o) => o !== id && pathOf(o).includes(id));
  return firsts.map((e, i) => ({ n: i + 1, part: e.part, path: pathOf(e.part), bracket: e.part === root || holds(e.part), parts: e.parts }));
};

/**
 * The panel for one def, from the doc section model: pure, so the whole content rule is checked with no host
 * (`test-doc-panel.ts`). `names` gives a component id its display name, for Related's chips; an id it does not know
 * shows as the id.
 */
export const planDocPanel = (def: ComponentDef, ctx: { modes?: readonly string[]; names?: (id: string) => string } = {}): PanelPlan => {
  const name = ctx.names ?? ((id: string) => id);
  const sections: PanelSection[] = [];
  const model = docSections(def, { modes: ctx.modes }).sections;
  // THE FAMILY (#2927): the lead's own sections, with the other members' Do and Don't items merged in (Q551 A on Q2).
  const fam = panelFamily(def.id);
  const others = (fam && fam.lead === def.id ? fam.members.filter((m) => m !== def.id) : [])
    .flatMap((m) => componentDefs.filter((d) => d.id === m));
  for (const s of model as DocSection[]) {
    if (PANEL_OMITS.includes(s.id)) continue;
    const blocks: PanelBlock[] = [];
    const field = (label: string, text: string, n: number) => blocks.push({ type: 'Field', label, text: firstSentences(text, n) });
    let row = false;
    switch (s.id) {
      case 'overview':
        if (s.fields.length) for (const f of s.fields) field(f.label, f.text[0], 2);
        else blocks.push({ type: 'Paragraph', text: firstSentences(s.description, 2), size: SIZE });
        break;
      case 'anatomy': {
        const marks = anatomyMarks(def, s.parts.map((p) => p.id));
        blocks.push({ type: 'Specimen', caption: `Shown on the default member: ${s.specimen.map((x) => `${x.axis} ${x.value}`).join(', ')}`, marks });
        for (const m of marks) {
          const p = s.parts.find((x) => x.id === m.part)!;
          // DRAFT wording (Q10): a merged repeat reads as its first part's name without the number, and how many.
          const label = m.parts > 1 ? `${p.name.replace(/\s*\d+$/, '')} ×${m.parts}` : p.name;
          field(`${m.n}  ${label}${p.optional ? ' (optional)' : ''}`, p.caption ?? '', 1);
        }
        break;
      }
      case 'styles':
        blocks.push({ type: 'Paragraph', text: 'Every member is in the set to the left.', size: SIZE });
        for (const a of s.axes) blocks.push({ type: 'Chips', label: sentence(a.axis), chips: a.values.map(sentence), note: a.kind === 'runtime' ? 'Changes while in use' : 'Chosen once, when placed' });
        if (s.states.length) blocks.push({ type: 'Chips', label: 'States', chips: s.states.map(sentence) });
        break;
      case 'usage': {
        if (s.usage) blocks.push({ type: 'Paragraph', text: firstSentences(s.usage, 2), size: SIZE });
        // The family's items, the lead's first, each once (Q551 A on Q2): the counts are of the merged lists.
        const merged = (pick: (u: { do: string[]; dont: string[] }) => string[]): string[] => [...new Set([s, ...others.map((o) => {
          const u = docSections(o).sections.find((x) => x.id === 'usage');
          return u && u.id === 'usage' ? u : { do: [], dont: [] };
        })].flatMap((u) => pick(u).map(plain)))];
        const all = merged((u) => u.do), allDont = merged((u) => u.dont);
        const d = all.slice(0, PANEL_DO_ITEMS);
        const dn = allDont.slice(0, PANEL_DO_ITEMS);
        if (d.length || dn.length) blocks.push({ type: 'Do-Dont', do: d, dont: dn });
        if (all.length > d.length || allDont.length > dn.length)
          blocks.push({ type: 'Paragraph', text: `Showing ${d.length} of ${all.length} Do items and ${dn.length} of ${allDont.length} Don't items.`, size: SIZE });
        break;
      }
      case 'accessibility':
        for (const f of s.fields) field(f.label, f.text[0], 1);
        // A def whose only accessibility data is its WCAG list or its motion still has the section: it lists the first.
        if (!s.fields.length && s.wcag.length) field('WCAG', s.wcag[0], 1);
        if (!s.fields.length && !s.wcag.length && s.motion.length) field(s.motion[0].label, s.motion[0].text[0], 1);
        break;
      case 'content':
        if (s.guidelines) blocks.push({ type: 'Paragraph', text: firstSentences(s.guidelines, 2), size: SIZE });
        for (const f of s.patterns) field(f.label, f.text[0], 2);
        break;
      case 'theming':
        row = true;
        for (const m of s.modes) blocks.push({ type: 'Specimen', mode: m, caption: sentence(m) });
        break;
      case 'related':
        // By family (#2970 Q5 A): each member shows as its family, once per list, and the panel's own family is dropped.
        for (const l of s.lists) {
          const items: LinkItem[] = [];
          for (const id of l.ids) {
            const r = familyRef(id, name);
            if ((fam && r.def === fam.lead) || items.some((x) => x.def === r.def)) continue;
            items.push(r);
          }
          if (items.length) blocks.push({ type: 'Links', label: l.label, items });
        }
        if (s.replaces.length) blocks.push({ type: 'Links', label: 'Replaces', items: s.replaces.map((r) => ({ name: plain(r) })) });
        break;
    }
    if (!blocks.length) continue;
    sections.push({ id: s.id, title: s.title, blocks, ...(row ? { row } : {}) });
  }
  // THE FAMILY AS ONE COMPONENT (#2970 item 4, Q3 A and Q4 A): titled with its page's name, the lede the lead's summary,
  // and its parts listed, the lead first and then the page's order.
  const family = others.length ? [def, ...others].map((d) => ({ name: nameInFamily(name(d.id), fam!.page), def: d.id, note: firstSentences(d.summary, 1) })) : undefined;
  const body = { def: def.id, title: family ? fam!.page : def.name, lede: plain(def.summary), ...(family ? { family } : {}), sections };
  return { ...body, hash: `${PANEL_FORMAT}:${fnv(JSON.stringify(body), false)}${fnv(JSON.stringify(body), true)}` };
};

/** A box on the set's parent. */
export interface Box { x: number; y: number; width: number; height: number }
export const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** Where the panel goes: `PANEL_GAP` right of the set, top-aligned with it. */
export const panelSpot = (set: { x?: number; y?: number; width?: number }): { x: number; y: number } =>
  ({ x: (set.x ?? 0) + (set.width ?? 0) + PANEL_GAP, y: set.y ?? 0 });

/* ── the executor ──────────────────────────────────────────────────────────────────────────────────────── */

/** The node surface this module touches — optional-everything, as in `canvas-furniture.ts`. */
export interface PNode {
  readonly id?: string;
  readonly type?: string;
  name?: string;
  x?: number;
  y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly removed?: boolean;
  readonly parent?: unknown;
  readonly children?: readonly PNode[];
  characters?: string;
  readonly fontName?: unknown;
  fontSize?: unknown;
  letterSpacing?: unknown;
  setRangeHyperlink?(start: number, end: number, link: { type: 'NODE' | 'URL'; value: string } | null): void;
  setRangeListOptions?(start: number, end: number, options: { type: 'ORDERED' | 'UNORDERED' | 'NONE' }): void;
  setRangeTextDecoration?(start: number, end: number, decoration: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH'): void;
  visible?: boolean;
  fills?: unknown;
  strokes?: unknown;
  strokeWeight?: unknown;
  layoutMode?: unknown;
  layoutPositioning?: unknown;
  layoutSizingHorizontal?: unknown;
  layoutSizingVertical?: unknown;
  layoutGrow?: unknown;
  /** Figma's auto-layout floor (#3205): the specimen of a member built at a width never goes under it. */
  minWidth?: unknown;
  itemSpacing?: unknown;
  paddingTop?: unknown;
  paddingRight?: unknown;
  paddingBottom?: unknown;
  paddingLeft?: unknown;
  readonly componentProperties?: Readonly<Record<string, unknown>>;
  /** The component property a layer's visibility follows (`visible`), by its key: how a hidden part is shown. */
  readonly componentPropertyReferences?: Readonly<Record<string, string>> | null;
  /** Where the node sits on the canvas, laid out: the one box a marker is placed from (#2916). */
  readonly absoluteBoundingBox?: { x: number; y: number; width: number; height: number } | null;
  clipsContent?: boolean;
  setProperties?(props: Record<string, string | boolean>): void;
  setExplicitVariableModeForCollection?(collection: unknown, modeId: string): void;
  resize?(w: number, h: number): void;
  appendChild?(child: unknown): void;
  createInstance?(): PNode;
  remove?(): void;
  getSharedPluginData?(ns: string, key: string): string;
  setSharedPluginData?(ns: string, key: string, value: string): void;
}
export interface PanelParent {
  readonly name?: string;
  readonly children: readonly unknown[];
  appendChild(child: unknown): void;
  insertChild(index: number, child: unknown): void;
  getSharedPluginData?(ns: string, key: string): string;
  setSharedPluginData?(ns: string, key: string, value: string): void;
}
export interface PanelVariable { id: string; name: string; variableCollectionId?: string }
export interface PanelApi {
  root: { findAllWithCriteria(criteria: { types: ('COMPONENT' | 'COMPONENT_SET' | 'INSTANCE' | 'FRAME')[]; sharedPluginData?: { namespace: string; keys: string[] } }): readonly unknown[] };
  loadFontAsync(font: { family: string; style: string }): Promise<void>;
  createFrame(): PNode;
  variables?: {
    getLocalVariablesAsync(): Promise<readonly PanelVariable[]>;
    getLocalVariableCollectionsAsync?(): Promise<readonly { id: string; name: string; modes: readonly { modeId: string; name: string }[] }[]>;
    setBoundVariableForPaint(paint: never, field: 'color', variable: never): unknown;
  };
}

/** The tag on a panel. `live` is the panel the plugin keeps drawn; `kept` is one a designer edited, set aside. `def` is
 *  the family's lead and `set` its set; `family` names the taxonomy page the panel covers (#2927), absent on a panel
 *  drawn before one panel per family. */
export interface PanelTag { v: 1; def: string; set: string; state: 'live' | 'kept'; family?: string }
export const readPanelTag = (n: PNode): PanelTag | null => {
  try {
    const raw = n.getSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as Partial<PanelTag>;
    return t && t.v === 1 && typeof t.def === 'string' && typeof t.set === 'string' && (t.state === 'live' || t.state === 'kept') ? (t as PanelTag) : null;
  } catch { return null; }
};
/** A panel the plugin keeps drawn: it follows its set when the update spaces the sets. */
export const isLivePanel = (n: PNode): boolean => readPanelTag(n)?.state === 'live';
const writeTag = (n: PNode, t: PanelTag): void => n.setSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_KEY, JSON.stringify(t));

/** What drawing did for one set. */
export interface PanelOutcome {
  def: string;
  drawn: boolean;
  /** The model sections the drawn panel holds, in order. */
  sections: DocSectionId[];
  /** Earlier panels of this set removed because they still held what was written. */
  replaced: number;
  /** Earlier panels a designer edited, kept aside under these names. */
  kept: string[];
  skipped: string[];
  missing?: string[];
  /** Part markers placed on the Anatomy specimen. */
  marked?: number;
  /** Text a font kept from being written, a part the specimen does not name, a variable or member not found. */
  misses: string[];
}

const byTail = <T extends { name: string }>(all: readonly T[], tail: string): T | undefined =>
  all.find((v) => v.name === tail || v.name.endsWith(`/${tail}`));

/** The file's `_Doc-block` set: exact name first, then any case — the furniture's template rule. */
export const findDocBlock = (api: Pick<PanelApi, 'root'>): PNode | undefined => {
  const all = api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly PNode[];
  return all.find((n) => n.type === 'COMPONENT_SET' && n.name === DOC_BLOCK_SET) ?? all.find((n) => n.type === 'COMPONENT_SET' && isTemplateSet(n.name, DOC_BLOCK_SET));
};
/** THE SETS RELATED LINKS TO (#2970 item 3): for each def a Links item names, its set in the file, found as the executor
 *  finds it, by its exact name, document-wide. A def with no set, or with more than one, is left out: its name is plain. */
export const panelLinks = (api: Pick<PanelApi, 'root'>, plan: PanelPlan): Record<string, string> => {
  const items = [...(plan.family ?? []), ...plan.sections.flatMap((s) => s.blocks).flatMap((b) => (b.type === 'Links' ? b.items : []))];
  const want = new Set(items.flatMap((i) => (i.def ? [i.def] : [])));
  if (!want.size) return {};
  const sets = (api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly PNode[]).filter((n) => n.type === 'COMPONENT_SET' && !n.removed && want.has(String(n.name)));
  const out: Record<string, string> = {};
  for (const d of [...want].sort()) { const hit = sets.filter((n) => n.name === d); if (hit.length === 1 && hit[0].id) out[d] = String(hit[0].id); }
  return out;
};
const linksKey = (l: Record<string, string>): string => JSON.stringify(l);

/** How far `set`'s box reaches right for the update's spacing: past its panel when the file can draw one, at the width
 *  its panel takes (`panelReachFor`); `PANEL_REACH` with no set. */
export const docPanelReach = (api: Pick<PanelApi, 'root'>, set?: PNode): number => (findDocBlock(api) ? (set ? panelReachFor(set) : PANEL_REACH) : 0);
/** Each set's reach, as `pageSetMoves` takes it: 0 when the file cannot draw a panel, so the template is looked up once. */
export type PanelReach = number | ((set: unknown) => number);
export const docPanelReaches = (api: Pick<PanelApi, 'root'>): PanelReach => (findDocBlock(api) ? (set) => panelReachFor(set as PNode) : 0);

/** The modes Theming shows: those of the file's color collection (the one holding `color/background/primary`) that
 *  `PANEL_MODES` names, in that order, with each one's collection and id for pinning. None before a theme. */
export const panelModes = async (api: Pick<PanelApi, 'variables'>): Promise<{ modes: string[]; pin: Map<string, { collection: unknown; modeId: string }> }> => {
  const pin = new Map<string, { collection: unknown; modeId: string }>();
  const vars = api.variables;
  if (!vars?.getLocalVariableCollectionsAsync) return { modes: [], pin };
  const ground = byTail(await vars.getLocalVariablesAsync(), 'color/background/primary');
  const cols = await vars.getLocalVariableCollectionsAsync();
  const col = cols.find((c) => c.id === ground?.variableCollectionId);
  if (!col) return { modes: [], pin };
  for (const m of PANEL_MODES) {
    const mode = col.modes.find((x) => x.name.toLowerCase() === m);
    if (mode) pin.set(m, { collection: col, modeId: mode.modeId });
  }
  return { modes: [...pin.keys()], pin };
};

/** Every panel in the file, with its tag. */
const allPanels = (api: Pick<PanelApi, 'root'>): { node: PNode; tag: PanelTag }[] =>
  (api.root.findAllWithCriteria({ types: ['FRAME'], sharedPluginData: { namespace: DOC_PANEL_NS, keys: [DOC_PANEL_KEY] } }) as readonly PNode[])
    .flatMap((node) => { const tag = readPanelTag(node); return tag && !node.removed ? [{ node, tag }] : []; });
/** This set's live panels: by its id anywhere in the file, its def's on its parent whose set is gone, and, on its
 *  parent, the panels its family's other members carried before one panel per family (#2927): the family's panel
 *  replaces them, so they go as an earlier panel of this set does (removed unedited, kept aside edited). */
const earlierPanels = (api: Pick<PanelApi, 'root'>, set: PNode, defId: string): PNode[] => {
  const setIds = new Set((api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly PNode[]).map((s) => String(s.id ?? '')));
  const others = new Set((panelFamily(defId)?.members ?? []).filter((m) => m !== defId));
  return allPanels(api).filter(({ node, tag }) => tag.state === 'live'
    && (tag.set === String(set.id ?? '') || (node.parent === set.parent && ((tag.def === defId && !setIds.has(tag.set)) || others.has(tag.def))))).map((p) => p.node);
};

/**
 * THE PANEL AS ITS PRINT READS IT (#2927 P0, the stacked panels). The print is the style guide's `fingerprintOf`, read
 * through this view, which leaves out what the panel shows but does not hold:
 *   - a specimen's content: its layers, its member and its properties are the documented set's, so a set rebuilt or
 *     updated changes them with no one touching the panel;
 *   - every width and height, since a specimen's size reaches every frame that hugs it, up to the panel;
 *   - every instance's main component: rebuilding Badge, Tag or List.Item gives the panel's markers, chips and items a
 *     new one. Their properties, text and visibility stay in.
 * Read whole, a panel whose member was rebuilt read as edited by hand: it was kept aside below a fresh one, so the set
 * showed two panels stacked (Progress, owner QA 2026-10-22). What a designer edits, text, fills, a hidden or deleted
 * layer, still moves the print.
 */
// The proxy's target is a plain object, never the node: a host node's own fixed properties would bind the trap to them.
const printView = (n: SgNode): SgNode => new Proxy({}, {
  get(_, k) {
    const t = n as object, own = n as unknown as PNode;
    if (k === 'width' || k === 'height') return 0;
    if (k === 'getMainComponentAsync' || k === 'mainComponent') return undefined;
    const specimen = own.type === 'INSTANCE' && own.name === 'specimen';
    if (k === 'children') return specimen ? [] : ((own.children ?? []) as unknown as SgNode[]).map(printView);
    if (specimen && k === 'componentProperties') return undefined;
    const v = Reflect.get(t, k, t) as unknown;
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v;
  },
}) as SgNode;
/** A print in this form starts with this, so one recorded before it is still read the old way. */
const PRINT_V2 = '2:';
export const panelPrint = async (n: PNode): Promise<string> => `${PRINT_V2}${await fingerprintOf(printView(n as unknown as SgNode))}`;
/**
 * THE TEXT PRISM3 WRITES INTO `defId`'s PANEL (#2968), today or before one panel per family (#2927): every string of its
 * plan; the wording #2927 changed (each part's own anatomy line, the def's own Do and Don't items and their count); a
 * chip row's "+n more"; the family line; and every text the file's `_Doc-block` template holds. Null for a def the
 * engine no longer has, whose panel then reads as edited: the safe direction.
 */
const SHOWN_ON = 'Shown on ';
const writtenTexts = (api: Pick<PanelApi, 'root'>, defId: string): Set<string> | null => {
  const def = componentDefs.find((d) => d.id === defId);
  if (!def) return null;
  const names = (id: string): string => componentDefs.find((d) => d.id === id)?.name ?? id;
  const out = new Set<string>(['In this family']);
  const strings = (v: unknown): void => {
    if (typeof v === 'string') out.add(v);
    else if (Array.isArray(v)) v.forEach(strings);
    else if (v && typeof v === 'object') Object.values(v).forEach(strings);
  };
  const plan = planDocPanel(def, { modes: PANEL_MODES, names });
  strings(plan);
  // The family as one comma line, before #2970 listed it.
  const fam = panelFamily(defId);
  if (fam && fam.members.length > 1) out.add(fam.members.map(names).join(', '));
  if (plan.family) out.add(plan.family.map(linkLine).join('\n'));
  for (const b of plan.sections.flatMap((s) => s.blocks)) if (b.type === 'Chips' && b.chips.length > CHIP_SLOTS) out.add(`+${b.chips.length - CHIP_SLOTS + 1} more`);
  for (const b of plan.sections.flatMap((s) => s.blocks)) if (b.type === 'Links') out.add(b.items.map(linkLine).join('\n'));
  for (const s of docSections(def, { modes: PANEL_MODES }).sections as DocSection[]) {
    // A further specimen's caption names what its member changes (`markSpecimens`): each pair, joined by commas.
    if (s.id === 'styles') for (const pair of [...s.axes.flatMap((a) => a.values.map((v) => `${a.axis} ${v}`)), ...s.states.map((v) => `state ${v}`)]) out.add(`${SHOWN_ON}${pair}`);
    // Related by each def's own name, before #2970 named families.
    if (s.id === 'related') for (const l of s.lists) out.add(l.ids.map(names).join('\n'));
    if (s.id === 'anatomy') s.parts.forEach((p, i) => { out.add(`${i + 1}  ${p.name}${p.optional ? ' (optional)' : ''}`); out.add(firstSentences(p.caption ?? '', 1)); });
    if (s.id === 'usage') {
      [...s.do, ...s.dont].forEach((t) => out.add(plain(t)));
      out.add(`Showing ${Math.min(s.do.length, PANEL_DO_ITEMS)} of ${s.do.length} Do items and ${Math.min(s.dont.length, PANEL_DO_ITEMS)} of ${s.dont.length} Don't items.`);
    }
  }
  const walkAll = (n: PNode | undefined): void => {
    if (!n) return;
    if (n.type === 'TEXT' && typeof n.characters === 'string') out.add(n.characters);
    for (const c of n.children ?? []) walkAll(c);
  };
  walkAll(findDocBlock(api));
  return out;
};
/**
 * A PRINT FROM BEFORE `printView` (#2968). It was taken over the whole panel, its specimens' content and every size
 * included, so once the documented set is rebuilt it can never match again, and a hash cannot say what moved: read
 * whole, every such panel was kept aside as "(edited)" below a fresh one (42 panels on the owner's copy, 2026-10-23).
 * When it still matches, nothing moved. When it does not, the panel is read by what a designer writes instead: it is
 * unedited when every text it shows outside its specimens is one Prism3 writes there (`writtenTexts`) or a marker's
 * number. A line a designer typed or rewrote reads as an edit, so that panel is still kept. A fill, a hidden or deleted
 * layer is not read on these panels: the old print cannot separate it from the rebuild.
 */
const legacyUnedited = async (api: Pick<PanelApi, 'root'>, n: PNode, print: string): Promise<boolean> => {
  if ((await fingerprintOf(n as unknown as SgNode)) === print) return true;
  const def = readPanelTag(n)?.def;
  const known = def ? writtenTexts(api, def) : null;
  if (!known) return false;
  const shown: string[] = [];
  const walk = (q: PNode): void => {
    if (q.visible === false || (q.type === 'INSTANCE' && q.name === 'specimen')) return;
    if (q.type === 'TEXT') shown.push(String(q.characters ?? ''));
    for (const c of q.children ?? []) walk(c);
  };
  walk(n);
  const caption = (t: string): boolean => t.startsWith(SHOWN_ON) && t.slice(SHOWN_ON.length).split(', ').every((pair) => known.has(`${SHOWN_ON}${pair}`));
  return shown.every((t) => known.has(t) || /^\d+$/.test(t) || caption(t));
};
/** Whether a panel still holds what it was drawn with. A panel with no record reads as edited: the safe direction. A
 *  print recorded before `printView` is read as `legacyUnedited` reads it. */
export const panelUnedited = async (api: Pick<PanelApi, 'root'>, n: PNode): Promise<boolean> => {
  const print = n.getSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_PRINT) ?? '';
  if (!print) return false;
  return print.startsWith(PRINT_V2) ? (await panelPrint(n)) === print : legacyUnedited(api, n, print);
};

/**
 * THE DRY RUN'S PANEL CHECK: 1 when an update would draw the set's panel, else 0. Read as the draw would draw it: the
 * same template lookup and the same plan. Due when the file can draw a panel and the set has none, or its panel was
 * drawn from another plan, or it is not where the set now puts it. A panel that is current is not due, edited or not,
 * and neither is one whose last draw was blocked by what still sits where it goes (`docPanelBlockers`).
 */
export const docPanelDue = (api: Pick<PanelApi, 'root'>, set: PNode, plan: PanelPlan): number => {
  if (!findDocBlock(api) || !set.parent) return 0;
  // Blocked when last drawn, and the spot is still taken: the draw would be refused again (`docPanelBlockers`).
  if (docPanelBlockers(api, set, plan).length) return 0;
  const live = allPanels(api).filter(({ node, tag }) => tag.state === 'live' && tag.set === String(set.id ?? '') && node.parent === set.parent);
  if (live.length !== 1) return 1;
  // A panel a family member still carries from before one panel per family (#2927): the draw replaces it.
  const others = new Set((panelFamily(plan.def)?.members ?? []).filter((m) => m !== plan.def));
  if (allPanels(api).some(({ node, tag }) => tag.state === 'live' && others.has(tag.def) && node.parent === set.parent)) return 1;
  const p = live[0].node;
  const at = panelSpot(set);
  const near = (a: number | undefined, b: number) => Math.abs((a ?? 0) - b) <= 0.5;
  return p.getSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_PLAN) === plan.hash && near(p.x, at.x) && near(p.y, at.y)
    && (p.getSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_LINKS) ?? '') === linksKey(panelLinks(api, plan))
    && (p.getSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_WIDTH) ?? '') === String(panelWidthFor(set)) ? 0 : 1;
};

/** Whether a node is a set Prism3 built: one of its members is, by the shared member test (`builtByPrism3`, #2510). */
export const prism3Set = (n: PNode | undefined): boolean => {
  if (!n || n.type !== 'COMPONENT_SET') return false;
  const reads = (n.children ?? []).map((m) => ({ id: m.id === undefined ? undefined : String(m.id), stamp: m.getSharedPluginData?.(NS, STAMP_KEY) ?? '', recordId: readBaseline(m as never)?.id }));
  return reads.some(builtByPrism3(reads));
};
/** The set a node on the page stands for, as an obstacle: a set is itself, and a set's labels, backdrop or live
 *  panel are that set's. Anything else stands for nothing. */
export const ownerSet = (n: PNode, kids: readonly PNode[]): PNode | undefined => {
  if (n.type === 'COMPONENT_SET') return n;
  const id = readTag(n as never)?.set ?? (readPanelTag(n)?.state === 'live' ? readPanelTag(n)?.set : undefined);
  return id ? kids.find((k) => k.type === 'COMPONENT_SET' && String(k.id ?? '') === id) : undefined;
};
const boxOf = (n: PNode): Box => ({ x: n.x ?? 0, y: n.y ?? 0, width: n.width ?? 0, height: n.height ?? 0 });
/** THE NODES A PANEL AT `spot` WOULD LIE ON, as the draw tests it: every node on the parent but `skip` (the panels
 *  this draw replaces or moves aside) and `set`'s own furniture (#2902). Its labels and backdrop are Prism3's, drawn to
 *  fit the set and redrawn with it, so they never keep its panel out. Only by the furniture tag: an untagged
 *  `inverse-bg` is the designer's (Q172.5) and still blocks, as does another set's furniture, which stands for that set.
 *  Shared by the draw and the dry run, so the two cannot disagree. */
const blockersAt = (kids: readonly PNode[], spot: Box, skip: ReadonlySet<PNode>, set: PNode): PNode[] =>
  kids.filter((c) => !skip.has(c) && !c.removed && readTag(c as never)?.set !== String(set.id ?? '\u0000') && !ownSpecPanel(c, set) && overlaps(spot, boxOf(c)));
/** The set's live spec panel (#2830): it sits right of the usage panel and moves right when the usage panel is drawn
 *  further right (`drawDocPanel`), so it never keeps the usage panel out. */
const ownSpecPanel = (c: PNode, set: PNode): boolean => { const t = readSpecTag(c); return t?.state === 'live' && t.set === String(set.id ?? '\u0000'); };
/** Whether Update makes room past these blockers: each one is, or belongs to, a Prism3 set in the set's row and right of
 *  it, which the re-spacing moves `SET_GAP` past the panel (`respaceSets`). The dry run reads the moves themselves. */
const updateMakesRoom = (set: PNode, hits: readonly PNode[], kids: readonly PNode[]): boolean => hits.every((h) => {
  const o = ownerSet(h, kids);
  return !!o && o !== set && prism3Set(o) && (o.x ?? 0) > (set.x ?? 0)
    && (o.y ?? 0) < (set.y ?? 0) + (set.height ?? 0) && (o.y ?? 0) + (o.height ?? 0) > (set.y ?? 0);
});
type Blocked = Record<string, { h: number; w?: number; plan: string }>;
const readBlocked = (parent: PanelParent): Blocked => {
  try { return JSON.parse(parent.getSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_BLOCKED) || '{}') as Blocked; } catch { return {}; }
};
const writeBlocked = (parent: PanelParent, setId: string, rec: { h: number; w: number; plan: string } | null): void => {
  if (!parent.setSharedPluginData) return;
  const all = readBlocked(parent);
  if (rec) all[setId] = rec;
  else if (!(setId in all)) return;
  else delete all[setId];
  parent.setSharedPluginData(DOC_PANEL_NS, DOC_PANEL_BLOCKED, Object.keys(all).length ? JSON.stringify(all) : '');
};

/**
 * THE NODES THAT KEPT THIS SET'S PANEL FROM BEING DRAWN, and still would: read from the record the blocked draw left
 * (its height and plan) with the draw's own overlap test. Empty when there is no record for this plan, or the spot is
 * now clear: then the draw is worth trying, and `docPanelDue` counts it.
 */
export const docPanelBlockers = (api: Pick<PanelApi, 'root'>, set: PNode, plan: PanelPlan): PNode[] => {
  const parent = set.parent as PanelParent | null | undefined;
  if (!parent) return [];
  const rec = readBlocked(parent)[String(set.id ?? '')];
  if (!rec || rec.plan !== plan.hash) return [];
  const at = panelSpot(set);
  const skip = new Set<PNode>([...earlierPanels(api, set, plan.def), ...(parent.children as readonly PNode[]).filter((c) => readPanelTag(c)?.state === 'kept' && readPanelTag(c)?.def === plan.def)]);
  return blockersAt(parent.children as readonly PNode[], { x: at.x, y: at.y, width: rec.w ?? PANEL_WIDTH, height: rec.h }, skip, set);
};

/** List.Item's text layer in a Do or Don't row: the part its item text is written into, read from the def (#2902).
 *  The text PROPERTY is named `text`; the LAYER is the part, `label`. */
const ITEM_TEXT = componentDefs.find((d) => d.id === 'list-item')?.figmaProperties?.texts?.children?.part ?? '';
/** The descendant named `name`, depth first. */
const find = (n: PNode | undefined, name: string): PNode | undefined => {
  for (const c of n?.children ?? []) { if (c.name === name) return c; const d = find(c, name); if (d) return d; }
  return undefined;
};
/** The TEXT layer named `name` under `n`, or `n` itself when it is that layer. */
const findText = (n: PNode | undefined, name: string): PNode | undefined =>
  n?.type === 'TEXT' && n.name === name ? n : (n?.children ?? []).reduce<PNode | undefined>((f, c) => f ?? findText(c, name), undefined);
/** A component property's key by its name: Figma suffixes it with `#id` on an instance. */
const propKey = (n: PNode, name: string): string | undefined =>
  Object.keys(n.componentProperties ?? {}).find((k) => k === name || k.startsWith(`${name}#`));

/** The node at `path` below `root`, one part at a time, each found depth first below the last: so a part inside a slot
 *  or a nested instance is reached, and a part's name inside a nested component of another part's is not taken for it
 *  (#2916). The root itself for an empty path. */
const locate = (root: PNode, path: readonly string[]): PNode | undefined => {
  let at: PNode | undefined = root;
  for (const step of path) at = find(at, step);
  return at;
};
/** `n` and its ancestors up to `root`, `root` included. */
const chain = (n: PNode, root: PNode): PNode[] => {
  const out: PNode[] = [];
  for (let q: PNode | undefined = n; q; q = q === root ? undefined : q.parent as PNode | undefined) out.push(q);
  return out;
};
/** Whether `member` holds the part at `path`, shown or behind a boolean that shows it. */
const showable = (member: PNode, path: readonly string[]): boolean => {
  const n = locate(member, path);
  return !!n && chain(n, member).every((q) => q.visible !== false || !!q.componentPropertyReferences?.visible);
};
/** Show the part at `path` in the specimen, turning on each boolean that hides it on the instance that owns the layer.
 *  True when the part is then shown. */
const reveal = (specimen: PNode, path: readonly string[]): boolean => {
  const n = locate(specimen, path);
  if (!n) return false;
  const up = chain(n, specimen);
  up.forEach((q, i) => {
    const key = q.visible === false ? q.componentPropertyReferences?.visible : undefined;
    const owner = key ? up.slice(i + 1).find((a) => a.type === 'INSTANCE') : undefined;
    if (key && owner && key in (owner.componentProperties ?? {})) { try { owner.setProperties?.({ [key]: true }); } catch { /* left hidden: reported below */ } }
  });
  return up.every((q) => q.visible !== false);
};

/**
 * THE MEMBERS THE ANATOMY SHOWS (#2916, Q551 A on Q3): the set's default first, with the marks whose parts it holds, then
 * for what is left the member that holds the most of it, and so on. The selection `markSpecimens` draws, read off the set
 * alone, so the panel's width is known before anything is drawn.
 */
export const anatomyMembers = (set: PNode, marks: readonly AnatomyMark[]): { member: PNode; marks: AnatomyMark[] }[] => {
  const all = set.children ?? [];
  const out: { member: PNode; marks: AnatomyMark[] }[] = [];
  let left = [...marks];
  for (let m: PNode | undefined = all[0]; m; ) {
    const at: PNode = m;
    const here = left.filter((x) => showable(at, x.path));
    if (!here.length && out.length) break;
    out.push({ member: at, marks: here });
    left = left.filter((x) => !here.includes(x));
    let best: PNode | undefined, most = 0;
    for (const c of all) {
      if (out.some((o) => o.member === c)) continue;
      const n = left.filter((x) => showable(c, x.path)).length;
      if (n > most) { best = c; most = n; }
    }
    m = best;
  }
  return out;
};
/**
 * HOW MANY BRACKET TIERS A SPECIMEN TAKES, read off the member's layers as the draw lays them out (`drawMarkers`): the
 * innermost first, each in the lowest tier no bracket it overlaps already holds. Two brackets overlap down the page when
 * one holds the other, or when the layer that holds both lays them side by side; stacked siblings share a tier.
 */
const bracketTiers = (member: PNode, marks: readonly AnatomyMark[]): number => {
  const nodes = [...marks].filter((m) => m.bracket).sort((a, b) => b.path.length - a.path.length).flatMap((m) => {
    const n = locate(member, m.path);
    return n ? [chain(n, member)] : [];
  });
  const tiers: PNode[][][] = [];
  const meets = (a: PNode[], b: PNode[]): boolean => {
    if (a.includes(b[0]) || b.includes(a[0])) return true;
    const common = a.find((q) => b.includes(q));
    return common?.layoutMode === 'HORIZONTAL';
  };
  for (const up of nodes) {
    let t = 0;
    while ((tiers[t] ?? []).some((o) => meets(o, up))) t++;
    (tiers[t] ??= []).push(up);
  }
  return tiers.length;
};
/** The stage a specimen `w` wide needs: its padding on the right, and on the left its padding or, when the specimen
 *  carries brackets, room for each tier (`MARK_ROOM`), whichever is more. */
const stageFor = (w: number, tiers: number): number =>
  w + STAGE_PAD + Math.max(STAGE_PAD, tiers ? MARK_GAP + tiers * (MARK_ROOM + 2 * MARK_SEP) + LEADER : 0);
/**
 * THE NARROWEST AN EXAMPLE MAY BE (#3205), from the def alone, never from the sizing the member reports. A root the def
 * builds at a width (`placementWidth`, or `builtSize` naming the member's value on its axis) is `built`, and its floor
 * is the member's own width, the width the executor built it at; Dialog's center member 560, Banner's 480. Otherwise the
 * root's literal `minWidth`, per size where it is one per size (the member's `size`, else the def's default); else 0.
 */
export const exampleFloor = (def: ComponentDef | undefined, m: PNode | undefined): { built: boolean; width: number } => {
  const a = def?.anatomy;
  const root = a?.parts[a.root] as { kind?: string; placementWidth?: number; builtSize?: { axis: string; widths: Record<string, unknown> }; minWidth?: number | Record<string, number> } | undefined;
  if (!root || root.kind !== 'box' || !m) return { built: false, width: 0 };
  const v = variantValues(m.name);
  const size = v.size ?? String(def?.props?.find((p) => p.name === 'size')?.default ?? '');
  const b = root.builtSize;
  const axisValue = b ? (b.axis === 'size' ? size : v[b.axis]) : undefined;
  // A member whose name does not carry the axis (a set built before it was one) is read as built: the def builds every
  // listed value at a width, so a fixed specimen at the member's width is right for each.
  const built = typeof root.placementWidth === 'number' || (!!b && (axisValue === undefined || axisValue in b.widths));
  if (built) return { built, width: Math.round(Number(m.width ?? 0)) };
  const min = root.minWidth;
  const w = typeof min === 'number' ? min : min && size in min ? min[size] : 0;
  return { built: false, width: w > 0 ? w : 0 };
};
/**
 * HOW WIDE A SET'S PANEL IS (#2970 Q1 A, Q2 A): every specimen at its member's own width, so the panel is as wide as its
 * widest stage needs plus its padding, never narrower than `PANEL_WIDTH`. Theming shows the default member twice side by
 * side, unless that row would make the panel `THEMING_ROW_MAX` or wider: then the two stack (`stack`). Pure on the set,
 * so Build's seat, the dry run's spacing and the apply all read the one number. A set with no def: its default only.
 */
export const panelLayout = (set: PNode, def: ComponentDef | undefined = componentDefs.find((d) => d.id === set.name)): { width: number; stack: boolean } => {
  const w0 = (set.children ?? [])[0]?.width ?? 0;
  const anatomy = def?.anatomy ? docSections(def).sections.find((s) => s.id === 'anatomy') : undefined;
  const marks = anatomy && anatomy.id === 'anatomy' ? anatomyMarks(def!, anatomy.parts.map((p) => p.id)) : [];
  const stages = anatomyMembers(set, marks).map((a) => stageFor(a.member.width ?? 0, bracketTiers(a.member, a.marks)));
  const row = 2 * stageFor(w0, 0) + MODE_GAP;
  const stack = row + 2 * PANEL_PAD >= THEMING_ROW_MAX;
  return { width: Math.ceil(Math.max(PANEL_WIDTH - 2 * PANEL_PAD, stageFor(w0, 0), ...stages, stack ? 0 : row) + 2 * PANEL_PAD), stack };
};
export const panelWidthFor = (set: PNode): number => panelLayout(set).width;
/** How far a set's box reaches right once its panels are drawn, its own panel's width in. */
export const panelReachFor = (set: PNode): number => PANEL_GAP + panelWidthFor(set) + SPEC_GAP + SPEC_WIDTH;

/**
 * Draw the usage panel for `def`'s family beside `def`'s set fresh: remove the set's earlier panels that are unedited
 * (its family's per-def panels among them, #2927), keep aside the edited ones, and place a new panel beside the set
 * unless something sits there. Only the family's lead draws one (`leadsPanel`): for any other member this returns at
 * once, having drawn and removed nothing. Never throws for a missing template.
 */
export const drawDocPanel = async (
  api: PanelApi,
  set: PNode,
  def: ComponentDef,
  opts: { names?: (id: string) => string } = {},
): Promise<PanelOutcome> => {
  const out: PanelOutcome = { def: def.id, drawn: false, sections: [], replaced: 0, kept: [], skipped: [], misses: [] };
  const fam = panelFamily(def.id);
  if (fam && fam.lead !== def.id) return out;
  const parent = set.parent as PanelParent | null | undefined;
  if (!parent || typeof parent.insertChild !== 'function') { out.skipped.push(`No usage panel for ${def.id}: the set has no parent to place it on`); return out; }
  const blocks = findDocBlock(api);
  if (!blocks) { out.missing = [DOC_BLOCK_SET]; return out; }
  const variant = (type: DocBlockType, size: DocBlockSize = SIZE): PNode | undefined => (blocks.children ?? []).find((m) => m.name === docBlockVariant(type, size));
  const { modes, pin } = await panelModes(api);
  const plan = planDocPanel(def, { modes, names: opts.names });

  // THE EARLIER PANELS: unedited ones go now, so they are not in the fresh panel's way; edited ones wait for the
  // fresh panel to land, and stay exactly as they are if it cannot.
  const edited: PNode[] = [];
  for (const p of earlierPanels(api, set, def.id)) {
    if (await panelUnedited(api, p)) { p.remove?.(); out.replaced++; }
    else edited.push(p);
  }

  const vars = api.variables ? await api.variables.getLocalVariablesAsync() : [];
  const paint = (tail: string): unknown[] => {
    const v = byTail(vars, tail);
    if (!v || !api.variables) { out.misses.push(tail); return []; }
    return [api.variables.setBoundVariableForPaint({ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 1, g: 1, b: 1 } } as never, 'color', v as never)];
  };
  const frame = (name: string, dir: 'HORIZONTAL' | 'VERTICAL', gap: number): PNode => {
    const f = api.createFrame();
    f.name = name;
    f.fills = [];
    f.layoutMode = dir;
    f.itemSpacing = gap;
    return f;
  };
  const fill = (n: PNode): void => { try { n.layoutSizingHorizontal = 'FILL'; } catch { /* outside auto layout */ } };
  /** Write `text` into a layer, and when `type` is given, its size and letter-spacing over the block's text style. */
  const write = async (n: PNode | undefined, text: string, what: string, type?: { size: number; tracking: number }): Promise<boolean> => {
    if (!n) { out.misses.push(`${DOC_BLOCK_SET} has no ${what} layer`); return false; }
    const f = n.fontName as { family?: unknown; style?: unknown } | undefined;
    if (!f || typeof f.family !== 'string' || typeof f.style !== 'string') { out.misses.push(`${what}: mixed or unreadable font`); return false; }
    try { await api.loadFontAsync({ family: f.family, style: f.style }); } catch { out.misses.push(`${f.family} ${f.style} unavailable`); return false; }
    n.characters = text;
    if (type) {
      try { n.fontSize = type.size; n.letterSpacing = { value: type.tracking, unit: 'PERCENT' }; } catch { out.misses.push(`${what}: size not set`); }
    }
    return true;
  };
  const links = panelLinks(api, plan);
  const block = (type: DocBlockType, size?: DocBlockSize): PNode | undefined => {
    const v = variant(type, size);
    const i = v?.createInstance?.();
    if (!i) out.misses.push(`${DOC_BLOCK_SET} has no ${docBlockVariant(type, size ?? SIZE)} variant`);
    return i;
  };
  const setBool = (i: PNode, name: string, value: boolean): void => { const k = propKey(i, name); if (k) i.setProperties?.({ [k]: value }); };

  // The member the specimens show: the set's own default, its first.
  const member = (set.children ?? [])[0];
  const layout = panelLayout(set, def);
  const panel = frame(`${plan.title} usage`, 'VERTICAL', SECTION_GAP);
  panel.paddingTop = PANEL_PAD; panel.paddingRight = PANEL_PAD; panel.paddingBottom = PANEL_PAD; panel.paddingLeft = PANEL_PAD;
  panel.fills = paint('color/background/primary');
  panel.strokes = paint('color/border/secondary');
  panel.strokeWeight = 1;
  panel.resize?.(layout.width, 1);
  panel.layoutSizingHorizontal = 'FIXED';
  panel.layoutSizingVertical = 'HUG';
  // The anatomy's specimens, each with the marks whose parts it shows (#2916).
  const anatomy: { spec: PNode; stage?: PNode; marks: AnatomyMark[] }[] = [];
  /** THE SPECIMEN AT ITS MEMBER'S OWN WIDTH (#2970 Q1 A), NEVER UNDER WHAT THE DEF DECLARES (#3205). The swap keeps the
   *  sizing the template's placeholder had, a Badge's hug, so a member built at a width that hugs its content instead
   *  lays its fill-width text out at its narrowest: Banner's text went one letter per line, Checkbox.Row's label
   *  wrapped, and Dialog's anatomy drew about 60px wide, its title one letter per line (#3205). One rule
   *  (`exampleFloor`): a def that builds its root at a width (`placementWidth`, `builtSize`) gets a fixed specimen at
   *  its member's width, with that width as the specimen's `minWidth` too, whatever sizing the member reports, so
   *  nothing that sets the instance back to hug can collapse it; a def that declares a literal minimum (`minWidth`)
   *  gets that floor on a specimen that hugs. Any other member: fixed at its width when it is fixed, hugging when it hugs. */
  const sizeSpecimen = (i: PNode, m: PNode): void => {
    const sp = find(i, 'specimen');
    if (!sp) return;
    const floor = exampleFloor(def, m);
    try {
      if (floor.built || m.layoutSizingHorizontal !== 'HUG') {
        sp.layoutSizingHorizontal = 'FIXED';
        sp.resize?.(m.width ?? sp.width ?? 0, sp.height ?? 0);
        if (m.layoutSizingVertical === 'HUG' || floor.built) sp.layoutSizingVertical = 'HUG';
      } else sp.layoutSizingHorizontal = 'HUG';
    } catch { out.misses.push(`the specimen of ${def.id} could not take its member's width`); }
    if (floor.width > 0) { try { sp.minWidth = floor.width; } catch { out.misses.push(`the specimen of ${def.id} could not take its ${floor.width}px floor`); } }
  };
  const showSpecimen = async (i: PNode, m: PNode | undefined, mode?: string, caption?: string): Promise<void> => {
    const key = propKey(i, SPECIMEN);
    if (key && m?.id) { i.setProperties?.({ [key]: String(m.id) }); sizeSpecimen(i, m); }
    else out.misses.push(`No specimen for ${def.id}: ${key ? 'the set has no member' : `${DOC_BLOCK_SET} has no ${SPECIMEN} property`}`);
    if (mode) {
      const pm = pin.get(mode);
      if (pm && i.setExplicitVariableModeForCollection) i.setExplicitVariableModeForCollection(pm.collection, pm.modeId);
      else out.misses.push(`the ${mode} mode could not be pinned`);
    }
    if (caption) await write(findText(i, 'caption'), caption, 'caption');
    else setBool(i, CAPTION, false);
  };
  /**
   * EVERY LISTED NUMBER ON A SPECIMEN (#2916, Q551 A on Q3). The default member shows what it can, a hidden part shown
   * through the boolean that hides it. A part it cannot show is drawn on one more specimen, of the member that shows
   * the most of what is left, and so on, numbered across them. A part no member shows is listed and named in the run.
   */
  const markSpecimens = async (into: PNode, first: PNode, marks: readonly AnatomyMark[]): Promise<void> => {
    let left = [...marks];
    const take = (i: PNode): number => {
      const spec = find(i, 'specimen');
      if (!spec) return 0;
      const here = left.filter((m) => reveal(spec, m.path));
      left = left.filter((m) => !here.includes(m));
      if (here.length) anatomy.push({ spec, stage: find(i, 'stage'), marks: here });
      return here.length;
    };
    take(first);
    const used = new Set<PNode | undefined>([member]);
    const was = variantValues(member?.name);
    while (left.length) {
      let best: PNode | undefined, most = 0;
      for (const m of set.children ?? []) {
        if (used.has(m)) continue;
        const c = left.filter((x) => showable(m, x.path)).length;
        if (c > most) { best = m; most = c; }
      }
      if (!best) break;
      used.add(best);
      const i = block('Specimen');
      if (!i) break;
      into.appendChild?.(i);
      fill(i);
      const now = variantValues(best.name);
      // DRAFT wording (Q10): the axes on which this member differs from the default.
      await showSpecimen(i, best, undefined, `${SHOWN_ON}${Object.keys(now).filter((k) => now[k] !== was[k]).map((k) => `${k} ${now[k]}`).join(', ') || best.name}`);
      // A member that held the parts but could not show them (a boolean the host refused): no specimen, and no more.
      if (!take(i)) { i.remove?.(); break; }
    }
    for (const m of left) out.misses.push(`part ${m.n} (${m.part}) is shown by no member of ${def.id}'s set`);
  };

  const header = frame('header', 'VERTICAL', 8);
  panel.appendChild?.(header);
  fill(header);
  for (const [type, size, text] of [['Heading', 'lg', plan.title], ['Paragraph', 'md', plan.lede]] as const) {
    const i = block(type, size);
    if (!i) continue;
    header.appendChild?.(i); fill(i);
    await write(findText(i, 'text'), text, 'text', type === 'Heading' ? TITLE_TYPE : undefined);
  }

  const draw = async (into: PNode, b: PanelBlock): Promise<void> => {
    const i = block(b.type === 'Links' ? 'Field' : b.type, b.type === 'Heading' || b.type === 'Paragraph' ? b.size : SIZE);
    if (!i) return;
    into.appendChild?.(i);
    fill(i);
    switch (b.type) {
      case 'Heading': case 'Paragraph': await write(findText(i, 'text'), b.text, 'text'); break;
      case 'Field': await write(findText(find(i, 'row') ?? i, 'label'), b.label, 'label'); await write(findText(find(i, 'row') ?? i, 'text'), b.text, 'text'); break;
      case 'Do-Dont':
        // More room above the columns (#2970 item 2): the block's own Top padding spacer, over the section's gap.
        setBool(i, TOP_PADDING, true);
        for (const [col, items] of [['do', b.do], ['dont', b.dont]] as const) {
          const c = find(i, col);
          if (!c) { out.misses.push(`${DOC_BLOCK_SET} has no ${col} column`); continue; }
          if (!items.length) { c.visible = false; continue; }
          for (let k = 1; k <= DO_ROWS; k++) {
            const row = find(c, `item${k}`);
            if (!row) { if (k <= items.length) out.misses.push(`${DOC_BLOCK_SET} has no item${k} in ${col}`); continue; }
            if (k > items.length) { row.visible = false; continue; }
            await write(findText(row, ITEM_TEXT), items[k - 1], 'item text');
          }
        }
        break;
      case 'Chips': {
        await write(findText(i, 'label'), b.label, 'label');
        const shown = b.chips.length > CHIP_SLOTS ? [...b.chips.slice(0, CHIP_SLOTS - 1), `+${b.chips.length - CHIP_SLOTS + 1} more`] : b.chips;
        for (let k = 1; k <= CHIP_SLOTS; k++) {
          const chip = find(i, `chip${k}`);
          if (!chip) { if (k <= shown.length) out.misses.push(`${DOC_BLOCK_SET} has no chip${k}`); continue; }
          if (k > shown.length) { chip.visible = false; continue; }
          await write(findText(chip, 'label'), shown[k - 1], 'chip label');
        }
        if (b.note) await write(findText(i, 'note'), b.note, 'note');
        else setBool(i, CAPTION, false);
        break;
      }
      case 'Links': {
        // One line per item, bulleted, each name a link to its component's set where the file has one (#2970 item 3).
        const row = find(i, 'row') ?? i;
        await write(findText(row, 'label'), b.label, 'label');
        const t = findText(row, 'text');
        if (!(await write(t, b.items.map(linkLine).join('\n'), 'text')) || !t) break;
        try { t.setRangeListOptions?.(0, String(t.characters).length, { type: 'UNORDERED' }); } catch { out.misses.push(`${b.label}: list bullets not set`); }
        // Only the name is the link; a note after it is plain.
        let at = 0;
        for (const x of b.items) {
          const node = x.def ? links[x.def] : undefined;
          if (node) {
            try { t.setRangeHyperlink?.(at, at + x.name.length, { type: 'NODE', value: node }); t.setRangeTextDecoration?.(at, at + x.name.length, 'UNDERLINE'); }
            catch { out.misses.push(`${b.label}: no link to ${x.name}`); }
          }
          at += linkLine(x).length + 1;
        }
        break;
      }
      case 'Specimen':
        await showSpecimen(i, member, b.mode, b.caption);
        if (b.marks?.length) await markSpecimens(into, i, b.marks);
        break;
    }
  };

  /**
   * THE PART MARKERS (#2916, Q551 A on Q3–Q5), once the panel has its layout: a numbered Badge per mark, over the panel,
   * placed from the boxes the host lays out (`absoluteBoundingBox`), never from summed offsets, which miss a part inside
   * a slot or a nested instance. A part is marked in the specimen's gutter with a 1px leader to it: above when its
   * middle is in the specimen's top half, else below, at its middle across. A part that holds another marked part (the
   * root among them) gets a bracket along its left edge, its marker beside the bracket, the innermost nearest. A marker
   * that would touch another on the same side moves one tier out, and the stage's padding grows to hold every tier.
   * Each marker and its lines are one frame, `part <n>`. Returns how many parts were marked.
   */
  const drawMarkers = async (): Promise<number> => {
    const rect = (n: PNode): Box => {
      const r = n.absoluteBoundingBox;
      if (r) return { x: r.x, y: r.y, width: r.width, height: r.height };
      let x = 0, y = 0;
      for (let q: PNode | undefined = n; q; q = q.parent as PNode | undefined) { x += q.x ?? 0; y += q.y ?? 0; }
      return { x, y, width: n.width ?? 0, height: n.height ?? 0 };
    };
    type Laid = { mark: AnatomyMark; part: PNode; group: PNode; badge: PNode; inner: PNode; side: 'top' | 'bottom' | 'left'; tier: number };
    const all: { spec: PNode; stage?: PNode; laid: Laid[] }[] = [];
    for (const a of anatomy) {
      const laid: Laid[] = [];
      for (const mark of a.marks) {
        const part = locate(a.spec, mark.path);
        const badge = block('Part-marker');
        if (!part || !badge) continue;
        const group = api.createFrame();
        group.name = `part ${mark.n}`;
        group.fills = [];
        group.clipsContent = false;
        panel.appendChild?.(group);
        group.layoutPositioning = 'ABSOLUTE';
        group.appendChild?.(badge);
        try { badge.layoutSizingHorizontal = 'HUG'; } catch { /* the block keeps its width; the Badge inside is what is placed */ }
        await write(findText(badge, 'count'), String(mark.n), 'marker count');
        laid.push({ mark, part, group, badge, inner: find(badge, 'marker') ?? badge, side: 'top', tier: 0 });
      }
      all.push({ spec: a.spec, stage: a.stage, laid });
    }
    const every = all.flatMap((a) => a.laid);
    if (!every.length) return 0;
    const mw = Math.max(...every.map((l) => rect(l.inner).width)), mh = Math.max(...every.map((l) => rect(l.inner).height));
    // THE TIERS, from the boxes as first laid out: padding moves the specimen as a whole, so they hold after it.
    for (const { spec, stage, laid } of all) {
      const P = rect(spec);
      const rows: Record<Laid['side'], [number, number][][]> = { top: [], bottom: [], left: [] };
      const tier = (side: Laid['side'], lo: number, hi: number): number => {
        for (let t = 0; ; t++) {
          const row = (rows[side][t] ??= []);
          if (!row.some(([a, b]) => lo < b + MARK_SEP && a < hi + MARK_SEP)) { row.push([lo, hi]); return t; }
        }
      };
      // Brackets innermost first, so the deepest part sits nearest its specimen.
      for (const l of [...laid].filter((x) => x.mark.bracket).sort((a, b) => b.mark.path.length - a.mark.path.length)) {
        const B = rect(l.part);
        l.side = 'left';
        l.tier = tier('left', B.y, B.y + B.height);
      }
      for (const l of laid.filter((x) => !x.mark.bracket)) {
        const B = rect(l.part);
        const cx = B.x + B.width / 2;
        l.side = B.y + B.height / 2 <= P.y + P.height / 2 ? 'top' : 'bottom';
        l.tier = tier(l.side, cx - mw / 2, cx + mw / 2);
      }
      if (!stage) continue;
      const deepest = (side: Laid['side']) => Math.max(-1, ...laid.filter((l) => l.side === side).map((l) => l.tier));
      const need = (side: Laid['side'], step: number) => (deepest(side) < 0 ? 0 : MARK_GAP + (deepest(side) + 1) * step + (side === 'left' ? LEADER : 0));
      for (const [k, side, step] of [['paddingTop', 'top', mh + MARK_SEP], ['paddingBottom', 'bottom', mh + MARK_SEP], ['paddingLeft', 'left', mw + 2 * MARK_SEP]] as const) {
        const n = need(side, step);
        if (n > Number(stage[k] ?? 0)) { try { stage[k] = Math.ceil(n); } catch { out.misses.push(`the specimen's ${side} gutter could not grow`); } }
      }
    }
    // A GUTTER WIDER THAN THE RULE ALLOWED (the real Badge wider than `MARK_ROOM`): the panel widens again, before the
    // places are read, so every specimen keeps its own width inside its stage.
    const need = Math.max(0, ...all.map(({ spec, stage }) => (stage ? rect(spec).width + Number(stage.paddingLeft ?? 0) + Number(stage.paddingRight ?? 0) : 0))) + 2 * PANEL_PAD;
    if (need > (panel.width ?? 0)) { panel.resize?.(Math.ceil(need), panel.height ?? 1); panel.layoutSizingVertical = 'HUG'; }
    // THE PLACES, from the boxes as now laid out, each relative to the panel.
    const at = rect(panel);
    let marked = 0;
    for (const { spec, laid } of all) {
      const P = rect(spec);
      for (const l of laid) {
        const B = l.part === spec ? P : rect(l.part);
        const lines: Box[] = [];
        let mx: number, my: number;
        if (l.side === 'left') {
          const lx = P.x - MARK_GAP - LEADER - l.tier * (mw + 2 * MARK_SEP);
          const tick = B.x + MARK_INSET - lx;
          lines.push({ x: lx, y: B.y, width: LEADER, height: B.height }, { x: lx, y: B.y, width: tick, height: LEADER }, { x: lx, y: B.y + B.height - LEADER, width: tick, height: LEADER });
          mx = lx - MARK_SEP - mw;
          my = B.y + B.height / 2 - mh / 2;
        } else {
          const cx = Math.round(B.x + B.width / 2);
          mx = cx - mw / 2;
          if (l.side === 'top') {
            my = P.y - MARK_GAP - mh - l.tier * (mh + MARK_SEP);
            lines.push({ x: cx, y: my + mh, width: LEADER, height: B.y + MARK_INSET - (my + mh) });
          } else {
            my = P.y + P.height + MARK_GAP + l.tier * (mh + MARK_SEP);
            const from = B.y + B.height - MARK_INSET;
            lines.push({ x: cx, y: from, width: LEADER, height: my - from });
          }
        }
        const boxes = [{ x: mx, y: my, width: mw, height: mh }, ...lines];
        const u = { x: Math.min(...boxes.map((b) => b.x)), y: Math.min(...boxes.map((b) => b.y)) };
        const w = Math.max(...boxes.map((b) => b.x + b.width)) - u.x, h = Math.max(...boxes.map((b) => b.y + b.height)) - u.y;
        l.group.x = u.x - at.x;
        l.group.y = u.y - at.y;
        l.group.resize?.(w, h);
        // The Badge's own place inside its block, so the Badge, not the block, lands on the mark.
        const inner = rect(l.inner), outer = rect(l.badge);
        l.badge.x = mx - u.x - (inner.x - outer.x);
        l.badge.y = my - u.y - (inner.y - outer.y);
        lines.forEach((b, k) => {
          const f = api.createFrame();
          f.name = k ? 'tick' : 'leader';
          f.fills = paint('color/text/secondary');
          l.group.appendChild?.(f);
          f.x = b.x - u.x;
          f.y = b.y - u.y;
          f.resize?.(Math.max(LEADER, b.width), Math.max(LEADER, b.height));
        });
        marked++;
      }
    }
    return marked;
  };

  // THE FAMILY (#2927, #2970 Q4 A): every set the panel covers, as a bulleted list under the lede, each name linked to its
  // set and followed by its own summary. DRAFT label (Q10).
  if (plan.family) await draw(header, { type: 'Links', label: 'In this family', items: plan.family });

  for (const s of plan.sections) {
    const d = block('Divider');
    if (d) { panel.appendChild?.(d); fill(d); }
    const sec = frame(s.title, 'VERTICAL', 8);
    sec.setSharedPluginData?.(DOC_PANEL_NS, DOC_SECTION_KEY, s.id);
    panel.appendChild?.(sec);
    fill(sec);
    const h = block('Heading', SIZE);
    if (h) { sec.appendChild?.(h); fill(h); await write(findText(h, 'text'), s.title, 'text', SECTION_TYPE); }
    // Theming's modes side by side, or stacked when side by side would be too wide (#2970 Q2 A).
    const side = !!s.row && !layout.stack;
    const into = s.row ? frame('modes', side ? 'HORIZONTAL' : 'VERTICAL', MODE_GAP) : sec;
    if (s.row) { sec.appendChild?.(into); fill(into); }
    for (const b of s.blocks) {
      await draw(into, b);
      if (side) { const last = (into.children ?? []).slice(-1)[0]; if (last) last.layoutGrow = 1; }
    }
    out.sections.push(s.id);
  }

  const at = panelSpot(set);
  parent.appendChild(panel);
  panel.x = at.x;
  panel.y = at.y;
  out.marked = await drawMarkers();

  // NOTHING UNDER IT: every other node on the parent, the set and its labels included, but the edited panels this
  // draw is about to move, and the kept ones it moves when they are in the way.
  const box = boxOf;
  const kids = parent.children as readonly PNode[];
  const kept = kids.filter((c) => readPanelTag(c)?.state === 'kept' && readPanelTag(c)?.def === def.id);
  const movers = new Set<PNode>([panel, ...edited.filter((e) => e.parent === parent), ...kept]);
  const hits = blockersAt(kids, box(panel), movers, set);
  if (hits.length) {
    // Recorded, so the dry run does not list it as due again until the spot is clear (`docPanelBlockers`).
    writeBlocked(parent, String(set.id ?? ''), { h: panel.height ?? 0, w: panel.width ?? PANEL_WIDTH, plan: plan.hash });
    panel.remove?.();
    out.sections = [];
    delete out.marked;
    const hit = hits[0];
    out.skipped.push(updateMakesRoom(set, hits, kids)
      ? `No usage panel for ${def.id}: "${hit.name ?? 'a layer'}" sits right of the set, where the panel goes. Run Update to make room, then the panel is drawn`
      : `No usage panel for ${def.id}: "${hit.name ?? 'a layer'}" sits right of the set, where the panel goes. Move it, then build or update again`);
    return out;
  }
  writeBlocked(parent, String(set.id ?? ''), null);

  const family = fam && fam.members.length > 1 ? { family: fam.page } : {};
  writeTag(panel, { v: 1, def: def.id, set: String(set.id ?? ''), state: 'live', ...family });
  panel.setSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_PLAN, plan.hash);
  panel.setSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_LINKS, linksKey(links));
  panel.setSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_WIDTH, String(layout.width));
  panel.setSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_PRINT, await panelPrint(panel));
  out.drawn = true;

  // THE EDITED PANELS, KEPT ASIDE: renamed, retagged, and moved below everything in the panel's column on this parent.
  const below = (n: PNode): void => {
    const x = panel.x ?? 0;
    const col = (parent.children as readonly PNode[]).filter((c) => c !== n && !c.removed && (c.x ?? 0) < x + (n.width ?? 0) && x < (c.x ?? 0) + (c.width ?? 0));
    n.x = x;
    n.y = Math.max(...col.map((c) => (c.y ?? 0) + (c.height ?? 0))) + PANEL_GAP;
  };
  // THE SET'S SPEC PANEL (#2830, Q2830.1 B) sits `SPEC_GAP` right of its usage panel: a usage panel drawn further right
  // (its set grew wider) pushes it right, so the two never overlap and the spec panel keeps its gap. Done before the
  // edited panels go below everything, so they are measured clear of it. A kept spec panel is the designer's and stays put.
  const specs = (parent.children as readonly PNode[]).filter((c) => !c.removed && ownSpecPanel(c, set));
  for (const sp of specs) {
    if (overlaps({ ...box(panel), width: (panel.width ?? 0) + SPEC_GAP }, box(sp))) sp.x = (panel.x ?? 0) + (panel.width ?? 0) + SPEC_GAP;
  }
  for (const e of edited) {
    if (!String(e.name ?? '').endsWith(' (edited)')) e.name = `${e.name ?? `${def.name} usage`} (edited)`;
    writeTag(e, { v: 1, def: def.id, set: String(set.id ?? ''), state: 'kept', ...family });
    if (e.parent === parent) below(e);
    out.kept.push(String(e.name));
  }
  for (const k of kept) if (overlaps(box(panel), box(k)) || specs.some((sp) => overlaps(box(sp), box(k)))) below(k);
  out.misses = [...new Set(out.misses)];
  return out;
};

/**
 * Before a set is built on `page`: its def's unedited panels whose set is gone come off, as its labels do, so the new
 * set's placement does not measure them. An edited one stays. Returns how many went.
 */
export const clearOrphanPanels = async (api: Pick<PanelApi, 'root'>, page: unknown, defId: string): Promise<number> => {
  const setIds = new Set((api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly PNode[]).map((s) => String(s.id ?? '')));
  let n = 0;
  for (const { node, tag } of allPanels(api)) {
    if (tag.state !== 'live' || tag.def !== defId || node.parent !== page || setIds.has(tag.set)) continue;
    if (await panelUnedited(api, node)) { node.remove?.(); n++; }
  }
  return n;
};

/** The run's clauses for a panel: each skip, each panel kept aside, and what could not be written. DRAFT wording. */
export const panelItems = (o: PanelOutcome | undefined): string[] => {
  if (!o) return [];
  const parts = [...o.skipped];
  for (const k of o.kept) parts.push(`The usage panel for ${o.def} was edited by hand, so it is kept as "${k}" below the new one. Move the change into the component's definition to keep it in the panel`);
  if (o.drawn && o.misses.length) parts.push(`Parts of the usage panel for ${o.def} were not written (${o.misses.slice(0, 3).join('; ')}${o.misses.length > 3 ? '; …' : ''})`);
  return parts;
};
