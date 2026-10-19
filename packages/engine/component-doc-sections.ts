/**
 * Prism3 engine — THE COMPONENT DOC SECTION MODEL (#846, wireframe approved 2026-10-19). One pure
 * function from a `ComponentDef` to the ordered sections of its usage doc, which every surface reads:
 * `out/components/<id>.md` today (`emit-component-docs.ts`), the Figma panel beside each set and the
 * docs-site page next (phases 2 and 3). One model, so the three cannot disagree about what a section
 * holds or whether it is drawn.
 *
 * THE SECTIONS AND THEIR FIELDS — the wireframe's field map (#846, comment of 2026-10-18), in its order:
 *
 *   Overview              `description`, `ai.primaryPurpose`, `ai.whenToUse`, `ai.avoidWhen` (`summary` is
 *                         the page's lede, above every section)
 *   Anatomy               the default member as the specimen; each part with a `note`, the note as its caption
 *   Styles                `variants` + `axisKinds`, each axis prop's `description`, `states`
 *   Usage guidelines      `docs.usage`, `docs.do`, `docs.dont`
 *   Accessibility         `accessibility.*`, and `motion.*` beside it
 *   Content guidelines    `docs.contentGuidelines`, `content.*`
 *   Theming               the brand's modes; no def field
 *   Related components    `composition.composesWith`, `.alternativeTo`, `ai.commonPartners`, and
 *                         `.supersedes`, `.supersededBy`, `.replacesPatterns`
 *   Building it in code   `props`; `docs.implementation` once Q362 adds it
 *
 * Three placements go past the wireframe's table, which names no section for them: the `props` table,
 * `motion` and the remaining composition lists. The wireframe puts Props and Motion on the site and not in
 * the panel; this model puts Props in "Building it in code" and Motion in Accessibility, and the other
 * composition lists in Related. `composition.planned` names components that are not built, so it stays
 * off the doc, as the wireframe says. Each call is an owner question on the PR that landed this.
 *
 * THE MISSING-DATA RULE. A section whose source fields are all empty is not in the result, so no surface
 * can draw its heading, its nav entry or its divider. The same rule holds per block: an absent content
 * pattern is no row, not an empty one. What is missing is returned in `gaps` instead, for the maintainer
 * record (`schema/component-maintainer.json`), never for a reader.
 *
 * ANATOMY CAPTIONS AND THE MAINTAINER REGISTER. A part `note` is the caption (Q406 follow-up 4, A), but
 * 64 of them are written for maintainers: issue numbers, doc paths, code spans. Until those are rewritten
 * (a follow-up the owner split out), such a part is listed by name with no caption, and its note is a gap.
 * So is a note that names a tool (Figma, a plugin, an exporter): consumer prose names none (#2411).
 *
 * THEMING NEEDS A BRAND. The modes come from the brand, not the def, so the section is drawn only when
 * the caller passes them. The Markdown page is brand-independent (#1701), so it passes none and has no
 * Theming section; the panel and the site page render inside a brand and will pass its modes.
 *
 * GATED BY `lint-component-docs.ts` (arm F), which holds this model and the committed pages against a
 * section map and a presence rule of its own, never this file's.
 */
import type { ComponentDef, PropDef } from './component-schema';
import { axisKindOf } from './component-schema';

/** The sections, in the order every surface draws them. */
export const DOC_SECTIONS = [
  { id: 'overview', title: 'Overview' },
  { id: 'anatomy', title: 'Anatomy' },
  { id: 'styles', title: 'Styles' },
  { id: 'usage', title: 'Usage guidelines' },
  { id: 'accessibility', title: 'Accessibility' },
  { id: 'content', title: 'Content guidelines' },
  { id: 'theming', title: 'Theming' },
  { id: 'related', title: 'Related components' },
  { id: 'code', title: 'Building it in code' },
] as const;
export type DocSectionId = (typeof DOC_SECTIONS)[number]['id'];

/** A part note in the maintainer register: it cites an issue, a doc path or a section sign, or carries a
 *  code span. Such a note is a gap until it is rewritten for a reader. */
export const MAINTAINER_REGISTER = /`|#\d|docs\/|§|prism\s*2/i;
/** A part note that names a design or delivery tool. Consumer prose names none (#2411), so such a note is
 *  a gap too, until its tool-specific half moves to `notes.projection`. */
export const NAMES_A_TOOL = /\b(?:figma|figjam|dev\s+mode|code\s+connect|style\s+dictionary|tokens\s+studio|tokenpress|penpot|sketch|plugin\s+api|plugins?|exporters?|mcp|prism\s?3)\b/i;

export type DocPart = { id: string; name: string; optional: boolean; caption?: string };
export type DocAxis = { axis: string; values: string[]; kind: 'runtime' | 'authoring'; description?: string };
export type DocField = { label: string; text: string };

export type DocSection =
  | { id: 'overview'; title: string; description: string; fields: DocField[] }
  | { id: 'anatomy'; title: string; specimen: { axis: string; value: string }[]; parts: DocPart[] }
  | { id: 'styles'; title: string; axes: DocAxis[]; states: string[] }
  | { id: 'usage'; title: string; usage?: string; do: string[]; dont: string[] }
  | { id: 'accessibility'; title: string; fields: DocField[]; wcag: string[]; motion: DocField[] }
  | { id: 'content'; title: string; guidelines?: string; patterns: DocField[] }
  | { id: 'theming'; title: string; modes: string[] }
  | { id: 'related'; title: string; lists: { label: string; ids: string[] }[]; replaces: string[] }
  | { id: 'code'; title: string; props: PropDef[]; implementation: string[] };

/** One missing piece, for the maintainer record. `field` is the def path, as `component-schema.ts` names it. */
export type DocGap = { section: DocSectionId; field: string; reason: 'empty' | 'maintainer register' | 'names a tool' | 'not in the schema yet' };

/** What the caller knows that the def does not: the brand's modes. Absent for a brand-independent page. */
export type DocContext = { modes?: readonly string[] };

const title = (id: DocSectionId) => DOC_SECTIONS.find((s) => s.id === id)!.title;
const has = (s: string | undefined): s is string => !!s && s.trim() !== '';
/** `leadingVisual` → `Leading visual`. */
export const partName = (id: string) => {
  const words = id.replace(/^_/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** The def's doc as ordered sections, plus what is missing. Pure: the same def and context give the same result. */
export const docSections = (def: ComponentDef, ctx: DocContext = {}): { sections: DocSection[]; gaps: DocGap[] } => {
  const gaps: DocGap[] = [];
  const gap = (section: DocSectionId, field: string, reason: DocGap['reason'] = 'empty') => gaps.push({ section, field, reason });
  const fields = (section: DocSectionId, rows: [string, string, string | undefined][]): DocField[] =>
    rows.flatMap(([label, path, text]) => (has(text) ? [{ label, text }] : (gap(section, path), [])));
  const all: (DocSection | undefined)[] = [];

  // Overview. `summary` is required and is the lede above the sections, so it is not a field here.
  {
    const f = fields('overview', [
      ['Purpose', 'ai.primaryPurpose', def.ai.primaryPurpose],
      ['Use when', 'ai.whenToUse', def.ai.whenToUse],
      ['Avoid when', 'ai.avoidWhen', def.ai.avoidWhen],
    ]);
    if (!has(def.description)) gap('overview', 'description');
    all.push(has(def.description) || f.length ? { id: 'overview', title: title('overview'), description: def.description ?? '', fields: f } : undefined);
  }

  // Anatomy: every part with a note, in tree order; the note is the caption unless it is maintainer prose.
  {
    const parts: DocPart[] = [];
    for (const [id, p] of Object.entries(def.anatomy?.parts ?? {})) {
      if (!has(p.note)) continue;
      const held = MAINTAINER_REGISTER.test(p.note) ? 'maintainer register' : NAMES_A_TOOL.test(p.note) ? 'names a tool' : undefined;
      const ready = !held;
      if (held) gap('anatomy', `anatomy.parts.${id}.note`, held);
      parts.push({ id, name: partName(id), optional: !!p.optional, ...(ready ? { caption: p.note } : {}) });
    }
    if (!parts.length) gap('anatomy', 'anatomy.parts[*].note');
    const specimen = Object.entries(def.variants).flatMap(([axis, values]) => (values?.length ? [{ axis, value: values[0] }] : []));
    all.push(parts.length ? { id: 'anatomy', title: title('anatomy'), specimen, parts } : undefined);
  }

  // Styles: each axis with its values, when it changes, and its prop's description; then the states.
  {
    const axes: DocAxis[] = Object.entries(def.variants).map(([axis, values]) => {
      const description = def.props.find((p) => p.name === axis)?.description;
      return { axis, values: [...(values ?? [])], kind: axisKindOf(def, axis), ...(has(description) ? { description } : {}) };
    });
    if (!axes.length) gap('styles', 'variants');
    if (!def.states.length) gap('styles', 'states');
    all.push(axes.length || def.states.length ? { id: 'styles', title: title('styles'), axes, states: [...def.states] } : undefined);
  }

  // Usage guidelines.
  {
    const d = [...(def.docs.do ?? [])];
    const dn = [...(def.docs.dont ?? [])];
    if (!has(def.docs.usage)) gap('usage', 'docs.usage');
    if (!d.length) gap('usage', 'docs.do');
    if (!dn.length) gap('usage', 'docs.dont');
    all.push(has(def.docs.usage) || d.length || dn.length
      ? { id: 'usage', title: title('usage'), ...(has(def.docs.usage) ? { usage: def.docs.usage } : {}), do: d, dont: dn } : undefined);
  }

  // Accessibility, with Motion beside it.
  {
    const a = def.accessibility;
    const f = fields('accessibility', [
      ['Role', 'accessibility.role', a.role],
      ['Keyboard', 'accessibility.keyboard', a.keyboard],
      ['Focus', 'accessibility.focus', a.focus],
      ['ARIA', 'accessibility.aria', a.aria],
    ]);
    const wcag = [...(a.wcag ?? [])];
    if (!wcag.length) gap('accessibility', 'accessibility.wcag');
    const motion = fields('accessibility', [
      ['Enter', 'motion.enter', def.motion?.enter],
      ['Exit', 'motion.exit', def.motion?.exit],
      ['Reduced motion', 'motion.reduceMotion', def.motion?.reduceMotion],
    ]);
    all.push(f.length || wcag.length || motion.length ? { id: 'accessibility', title: title('accessibility'), fields: f, wcag, motion } : undefined);
  }

  // Content guidelines.
  {
    const c = def.content ?? {};
    const patterns = fields('content', [
      ['Labels', 'content.labelPattern', c.labelPattern],
      ['Errors', 'content.errorPattern', c.errorPattern],
      ['Empty states', 'content.emptyPattern', c.emptyPattern],
      ['Dialogs', 'content.dialogPattern', c.dialogPattern],
      ['Metaphors', 'content.metaphorRules', c.metaphorRules],
    ]);
    const g = def.docs.contentGuidelines;
    if (!has(g)) gap('content', 'docs.contentGuidelines');
    all.push(has(g) || patterns.length ? { id: 'content', title: title('content'), ...(has(g) ? { guidelines: g } : {}), patterns } : undefined);
  }

  // Theming: the brand's modes, when the caller has a brand.
  {
    const modes = [...(ctx.modes ?? [])];
    all.push(modes.length ? { id: 'theming', title: title('theming'), modes } : undefined);
  }

  // Related components. `planned` ids are not built, so they stay off the doc.
  {
    const c = def.composition ?? {};
    const lists = ([
      ['Built from', 'composition.composesWith', c.composesWith],
      ['Instead, consider', 'composition.alternativeTo', c.alternativeTo],
      ['Often used with', 'ai.commonPartners', def.ai.commonPartners],
      ['Supersedes', 'composition.supersedes', c.supersedes],
      ['Superseded by', 'composition.supersededBy', c.supersededBy],
    ] as [string, string, string[] | undefined][]).flatMap(([label, path, ids]) => (ids?.length ? [{ label, ids: [...ids] }] : (gap('related', path), [])));
    const replaces = [...(c.replacesPatterns ?? [])];
    if (!replaces.length) gap('related', 'composition.replacesPatterns');
    all.push(lists.length || replaces.length ? { id: 'related', title: title('related'), lists, replaces } : undefined);
  }

  // Building it in code. `docs.implementation` is the wireframe's proposed field; Q362 is still the
  // owner's, so the schema does not carry it yet and the section holds the props table alone.
  {
    gap('code', 'docs.implementation', 'not in the schema yet');
    if (!def.props.length) gap('code', 'props');
    all.push(def.props.length ? { id: 'code', title: title('code'), props: [...def.props], implementation: [] } : undefined);
  }

  return { sections: all.filter((s): s is DocSection => !!s), gaps };
};
