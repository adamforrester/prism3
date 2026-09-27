/**
 * Prism3 engine — COMPONENT DOCS PROJECTION (#1701). One projector, two forms, from the same def data.
 *
 *   npx tsx packages/engine/emit-component-docs.ts
 *     → out/components/components.ai.json   (machine-readable: every registered def, for agents and code)
 *     → out/components/<id>.md              (human-readable: one page per def, for people and payload skills)
 *
 * THE GAP THIS CLOSES. `component-schema.ts` carries `docs`, `accessibility`, `content`, `motion`,
 * `composition`, `ai` and `notes` "so docs are a projection, not a re-author" (docs/19 §6), and promised a
 * `.ai.json` projection. Nothing emitted them: `summary` reached Figma and `axisKinds` reached the plan, and
 * the rest reached only the validator and the prose lints. The owner chose option (c) on #1701 — both forms
 * from one projector, the Figma description staying the one-line `summary`.
 *
 * DECISIONS, stated so a reviewer can disagree with them rather than infer them:
 *
 *  · ONE BRAND-INDEPENDENT FILE, not a `components` section in each `<brand>.ai.json`. A def binds token
 *    NAMES, never values, so the same text would be written four times and could only ever agree with
 *    itself. Per-brand values belong to the token sidecar beside it, which already answers "what does
 *    `color.border.focus` resolve to in this brand".
 *  · FIELD NAMES MIRROR THE DEF. `docs.usage` in the def is `docs.usage` here; nothing is renamed. A reader
 *    who knows `component-schema.ts` knows this file, and the round-trip gate can compare a def field to its
 *    projection by path without a translation table.
 *  · `anatomy.codeOnly` IS PROJECTED as `codeOnly` in both forms — it is the list of structure Figma cannot
 *    carry, which is exactly what a code author building the component needs.
 *  · `notes.*` IS MAINTAINER RECORD. It is projected into the JSON only, under `maintainer`, labeled as
 *    such; the markdown leaves it out, because its register (open findings, resolved history, issue
 *    numbers) is not usage guidance (`docs/voice-standard.md` §4) and a person reading a component page
 *    should not have to sort guidance from working notes.
 *  · NO SHIPPED ARTIFACT CITES PRISM 2 (owner rule). A `codeOnly` or `notes` entry that names Prism 2 is
 *    WITHHELD — never rewritten — and the count is stated per component (`withheld`), so the omission is
 *    visible rather than silent. Rewording those entries is a def edit, not a projection decision; filed
 *    as #1703 so they can ship once they read without the citation (34 entries across 11 defs at landing).
 *  · The Figma-only and paint layers (`tokens`, `paintKeys`, `anatomy.parts`, `figmaProperties`,
 *    `weightIntent`) are NOT documentation and are not projected. They reach Figma through the plan.
 *
 * GATED BY `lint-component-docs.ts` — every registered def in both forms, every schema-required field
 * represented, a def's field values round-tripping into both, and no Prism 2 anywhere in either. The
 * machine-readable form validates against the AUTHORED `schema/component-docs.schema.json`.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComponentDef } from './component-schema';
import { axisKindOf } from './component-schema';
import { componentDefs } from './components/index';
import { ENGINE_VERSION } from './version';

/** The sidecar's schema id. `schema/component-docs.schema.json` carries the same `$id`; both move together. */
export const COMPONENT_DOCS_SCHEMA = 'prism3-component-docs/1.0';

/** The owner rule's pattern: an entry matching it does not ship. */
export const PRISM2 = /prism\s*2/i;

const withholding = (xs: readonly string[] | undefined): { kept: string[]; withheld: number } => {
  const all = xs ?? [];
  const kept = all.filter((s) => !PRISM2.test(s));
  return { kept, withheld: all.length - kept.length };
};

/** Drop `undefined` keys so an absent optional field is absent, not `null`. */
const compact = <T extends Record<string, unknown>>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** One def's machine-readable entry. Field names mirror `ComponentDef`. */
export const projectDef = (def: ComponentDef) => {
  const codeOnly = withholding(def.anatomy?.codeOnly);
  const contested = withholding(def.notes?.contested);
  const unverified = withholding(def.notes?.unverified);
  const evolution = withholding(def.notes?.evolution);
  return compact({
    id: def.id,
    name: def.name,
    aliases: def.aliases ?? [],
    category: def.category,
    status: def.status,
    summary: def.summary,
    description: def.description,
    inherits: def.inherits,
    props: def.props.map((p) => compact({
      name: p.name,
      type: p.type,
      default: p.default,
      required: p.required ?? false,
      values: p.values,
      deprecated: p.deprecated,
      description: p.description,
    })),
    states: [...def.states],
    variants: Object.fromEntries(Object.entries(def.variants).map(([axis, values]) => [axis, {
      values: [...(values ?? [])],
      kind: axisKindOf(def, axis),
    }])),
    accessibility: compact({ ...def.accessibility, wcag: def.accessibility.wcag ? [...def.accessibility.wcag] : undefined }),
    content: def.content ? compact({ ...def.content }) : undefined,
    docs: compact({ usage: def.docs.usage, do: def.docs.do ?? [], dont: def.docs.dont ?? [], contentGuidelines: def.docs.contentGuidelines }),
    ai: compact({ ...def.ai, commonPartners: def.ai.commonPartners ?? [], triggerKeywords: def.ai.triggerKeywords ?? [] }),
    motion: def.motion ? compact({ ...def.motion }) : undefined,
    composition: compact({
      composesWith: def.composition?.composesWith ?? [],
      alternativeTo: def.composition?.alternativeTo ?? [],
      supersedes: def.composition?.supersedes ?? [],
      supersededBy: def.composition?.supersededBy ?? [],
      planned: def.composition?.planned ?? [],
      replacesPatterns: def.composition?.replacesPatterns ?? [],
    }),
    codeOnly: codeOnly.kept,
    maintainer: {
      notes: { contested: contested.kept, unverified: unverified.kept, evolution: evolution.kept },
      withheld: codeOnly.withheld + contested.withheld + unverified.withheld + evolution.withheld,
    },
  });
};

export const projectComponentDocs = (defs: readonly ComponentDef[]) => ({
  $schema: COMPONENT_DOCS_SCHEMA,
  generated: true,
  engineVersion: ENGINE_VERSION,
  note:
    'Documentation for every registered component, projected from its definition — the same source the ' +
    'Figma component and a coded component are built from. Brand-independent: a definition binds token ' +
    'names, and each brand\'s `<brand>.ai.json` resolves them. Field names mirror the definition schema. ' +
    '`codeOnly` lists the structure Figma cannot carry, which code implements. `maintainer` is the ' +
    'definition\'s working record (open questions, unverified claims, resolved history), not usage ' +
    'guidance; `withheld` counts entries left out because they cite an external reference system.',
  components: Object.fromEntries(defs.map((d) => [d.id, projectDef(d)])),
});

// ---- markdown ---------------------------------------------------------------------------------

/** Escape for inline markdown: `|` everywhere (table cells), `<` outside code spans (so `<button>` is
 *  text, not HTML), and newlines folded to one line. Code spans are left verbatim. */
export const mdEscape = (s: string): string =>
  s.replace(/\s*\n\s*/g, ' ')
    .split(/(`[^`]*`)/)
    .map((seg, i) => (i % 2 ? seg.replace(/\|/g, '\\|') : seg.replace(/([<|])/g, '\\$1')))
    .join('');

const code = (s: string) => `\`${s}\``;
const list = (xs: readonly string[]) => xs.map(code).join(', ');

export const renderMarkdown = (def: ComponentDef): string => {
  const e = projectDef(def);
  const out: string[] = [];
  const para = (s: string | undefined) => { if (s) out.push(mdEscape(s), ''); };
  const bullets = (xs: readonly string[]) => { for (const x of xs) out.push(`- ${mdEscape(x)}`); if (xs.length) out.push(''); };
  const field = (label: string, v: string | undefined) => { if (v) out.push(`- **${label}:** ${mdEscape(v)}`); };

  out.push(`# ${def.name}`, '');
  out.push(`> ${mdEscape(def.summary)}`, '');
  para(def.description);
  out.push(`- **ID:** ${code(def.id)}`);
  out.push(`- **Category:** ${def.category}`);
  out.push(`- **Status:** ${def.status}`);
  if (e.aliases.length) out.push(`- **Also known as:** ${e.aliases.map(mdEscape).join(', ')}`);
  if (def.inherits) out.push(`- **Builds on:** ${code(def.inherits)}`);
  out.push('');

  out.push('## Usage', '');
  para(def.docs.usage);
  if (e.docs.do.length) { out.push('### Do', ''); bullets(e.docs.do); }
  if (e.docs.dont.length) { out.push("### Don't", ''); bullets(e.docs.dont); }
  if (def.docs.contentGuidelines) { out.push('### Content guidelines', ''); para(def.docs.contentGuidelines); }
  if (def.content) {
    out.push('### Copy patterns', '');
    field('Labels', def.content.labelPattern);
    field('Errors', def.content.errorPattern);
    field('Empty states', def.content.emptyPattern);
    field('Dialogs', def.content.dialogPattern);
    field('Metaphors', def.content.metaphorRules);
    out.push('');
  }

  out.push('## Choosing it', '');
  field('Purpose', def.ai.primaryPurpose);
  field('Use when', def.ai.whenToUse);
  field('Avoid when', def.ai.avoidWhen);
  if (e.ai.commonPartners.length) out.push(`- **Often used with:** ${list(e.ai.commonPartners)}`);
  if (e.ai.triggerKeywords.length) out.push(`- **Keywords:** ${e.ai.triggerKeywords.map(mdEscape).join(', ')}`);
  if (def.ai.generationPriority !== undefined) out.push(`- **Generation priority:** ${def.ai.generationPriority}`);
  out.push('');

  out.push('## Props', '');
  if (!def.props.length) out.push('No props.', '');
  else {
    out.push('| Name | Type | Default | Required | Description |', '| --- | --- | --- | --- | --- |');
    for (const p of e.props) {
      // Values are listed only when the type prose does not already name every one of them.
      const values = p.values && !p.values.every((v) => p.type.includes(v)) ? ` (${p.values.map((v) => code(v)).join(', ')})` : '';
      const name = p.deprecated ? `${code(p.name)} (deprecated)` : code(p.name);
      out.push(`| ${name} | ${mdEscape(p.type)}${mdEscape(values)} | ${p.default === undefined ? '—' : code(String(p.default))} | ${p.required ? 'yes' : 'no'} | ${mdEscape(p.description)} |`);
    }
    out.push('');
  }

  out.push('## States', '');
  out.push(def.states.length ? list(def.states) : 'None — not interactive.', '');

  out.push('## Variants', '');
  const axes = Object.entries(e.variants);
  if (!axes.length) out.push('No variant axes.', '');
  else {
    out.push('| Axis | Values | Changes |', '| --- | --- | --- |');
    for (const [axis, v] of axes) out.push(`| ${code(axis)} | ${list(v.values)} | ${v.kind === 'runtime' ? 'at runtime' : 'once, when authored'} |`);
    out.push('');
  }

  out.push('## Accessibility', '');
  field('Role', def.accessibility.role);
  if (def.accessibility.wcag?.length) {
    out.push('- **WCAG:**');
    for (const w of def.accessibility.wcag) out.push(`  - ${mdEscape(w)}`);
  }
  field('Keyboard', def.accessibility.keyboard);
  field('Focus', def.accessibility.focus);
  field('ARIA', def.accessibility.aria);
  out.push('');

  if (def.motion) {
    out.push('## Motion', '');
    field('Enter', def.motion.enter);
    field('Exit', def.motion.exit);
    field('Reduced motion', def.motion.reduceMotion);
    out.push('');
  }

  const c = e.composition;
  if (Object.values(c).some((xs) => xs.length)) {
    out.push('## Composition', '');
    if (c.composesWith.length) out.push(`- **Composes with:** ${list(c.composesWith)}`);
    if (c.alternativeTo.length) out.push(`- **Alternative to:** ${list(c.alternativeTo)}`);
    if (c.supersedes.length) out.push(`- **Supersedes:** ${list(c.supersedes)}`);
    if (c.supersededBy.length) out.push(`- **Superseded by:** ${list(c.supersededBy)}`);
    if (c.planned.length) out.push(`- **Planned:** ${list(c.planned)}`);
    if (c.replacesPatterns.length) {
      out.push('- **Replaces:**');
      for (const r of c.replacesPatterns) out.push(`  - ${mdEscape(r)}`);
    }
    out.push('');
  }

  if (e.codeOnly.length) {
    out.push('## In code, not in Figma', '');
    out.push('Structure and behavior the Figma component cannot carry. Code implements each one.', '');
    bullets(e.codeOnly);
  }

  out.push('---', '');
  out.push(`Generated from the ${code(def.id)} definition by Prism3 ${ENGINE_VERSION}. Maintainer notes are in ${code('components.ai.json')}.`, '');
  return out.join('\n');
};

// ---- I/O shell --------------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
export const COMPONENT_DOCS_DIR = resolve(here, 'out', 'components');

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Cleared first, so a def that leaves the registry leaves no stale page behind for `regen --check` to miss.
  rmSync(COMPONENT_DOCS_DIR, { recursive: true, force: true });
  mkdirSync(COMPONENT_DOCS_DIR, { recursive: true });
  writeFileSync(resolve(COMPONENT_DOCS_DIR, 'components.ai.json'), JSON.stringify(projectComponentDocs(componentDefs), null, 2) + '\n');
  for (const def of componentDefs) writeFileSync(resolve(COMPONENT_DOCS_DIR, `${def.id}.md`), renderMarkdown(def));
  console.log(`[emit-component-docs] wrote ${COMPONENT_DOCS_DIR} — components.ai.json + ${componentDefs.length} pages`);
}
