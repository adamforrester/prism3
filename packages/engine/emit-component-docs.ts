/**
 * Prism3 engine — COMPONENT DOCS PROJECTION (#1701). One projector, two shipped forms and one maintainer
 * record, from the same def data.
 *
 *   npx tsx packages/engine/emit-component-docs.ts
 *     → out/components/components.ai.json      (PAYLOAD, machine-readable: every registered def)
 *     → out/components/<id>.md                 (PAYLOAD, human-readable: one page per def)
 *     → schema/component-maintainer.json       (NOT payload: each def's `codeOnly` and `notes.*`)
 *
 * THE GAP THIS CLOSES. `component-schema.ts` carries `docs`, `accessibility`, `content`, `motion`,
 * `composition`, `ai` and `notes` "so docs are a projection, not a re-author" (docs/19 §6), and promised a
 * `.ai.json` projection. Nothing emitted them: `summary` reached Figma and `axisKinds` reached the plan, and
 * the rest reached only the validator and the prose lints. The owner chose option (c) on #1701 — both forms
 * from one projector, the Figma description staying the one-line `summary`.
 *
 * DECISIONS, stated so a reviewer can disagree with them rather than infer them:
 *
 *  · WHAT SHIPS IS WHAT #1623 ALREADY SHIPS (owner decision, 2026-09-27). #1623 ruled `notes.*` and
 *    `anatomy.codeOnly` maintainer-only — `apps/plugin/lint-bundle-prose.ts` strips them from the plugin —
 *    and they read that way: issue numbers, brief section references, ALL-CAPS headings. So the payload
 *    carries the shipped fields only: identity (`id`, `name`, `aliases`, `category`, `status`, `inherits`),
 *    the code API (`props`, `states`, `variants`), and the prose `summary`, `description`, `docs`,
 *    `accessibility`, `content`, `motion`, `composition`, plus `ai` in the JSON. Neither form carries a
 *    `codeOnly` or a `notes` entry.
 *  · THE PAGE IS FOR PEOPLE. It leaves out the agent-only half of `ai` — `triggerKeywords` and
 *    `generationPriority` are search and tiebreak metadata a person does not act on — and keeps the
 *    decision half (purpose, when to use, when to avoid, common partners) as "Choosing it". The JSON keeps
 *    the whole `ai` block.
 *  · THE MAINTAINER RECORD IS A SEPARATE, NON-SHIPPING FILE: `schema/component-maintainer.json`. It sits in
 *    `schema/` beside the engine's other contracts rather than in `out/`, because every `out/` file is
 *    scanned as shipped prose by `lint-us-english.ts` and `lint-voice.ts`, and keeping one out would mean
 *    narrowing their scan. In `schema/` it is listed in `regen.ts`'s `MAINTAINER_ARTIFACTS` — drift-checked
 *    like every artifact, classified `ours` in `payload-manifest.json`, and a class of its own in
 *    `lint-schema-classification.ts` — and never in `SCHEMA_ARTIFACTS`, the list the prose gates read.
 *  · THE MAINTAINER RECORD IS COMPLETE. The owner rule is that no SHIPPED artifact cites Prism 2; this file
 *    does not ship, so its entries that name Prism 2 are kept rather than withheld — withholding them would
 *    make the record disagree with the def it records, and hide the entries a rewording pass needs to find.
 *    The payload carries no `codeOnly` or `notes` field, so there is nothing left to withhold there.
 *  · ONE BRAND-INDEPENDENT FILE, not a `components` section in each `<brand>.ai.json`. A def binds token
 *    NAMES, never values, so the same text would be written four times and could only ever agree with
 *    itself. Per-brand values belong to the token sidecar beside it.
 *  · FIELD NAMES MIRROR THE DEF. `docs.usage` in the def is `docs.usage` here, and `notes.contested` is
 *    `notes.contested` in the maintainer record. The one reshaping: `variants.<axis>` is `{ values, kind }`.
 *  · THE VERSION STAMP IS IN THE JSON'S TOP LEVEL ONLY. A page names no engine version, and the maintainer
 *    record carries none, so an engine bump rewrites one file here rather than every page.
 *  · The Figma-only and paint layers (`tokens`, `paintKeys`, `anatomy.parts`, `figmaProperties`,
 *    `weightIntent`) are NOT documentation and are not projected. They reach Figma through the plan.
 *
 * GATED BY `lint-component-docs.ts` — every registered def in all three files, every schema-required field
 * represented, each def field value round-tripping to its JSON path and into its own page section, no
 * maintainer prose in either payload form, and no Prism 2 in either. The machine-readable form validates
 * against the AUTHORED `schema/component-docs.schema.json`.
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

/** Drop `undefined` keys so an absent optional field is absent, not `null`. */
const compact = <T extends Record<string, unknown>>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** One def's machine-readable entry: the shipped fields only. Field names mirror `ComponentDef`. */
export const projectDef = (def: ComponentDef) =>
  compact({
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
  });

export const projectComponentDocs = (defs: readonly ComponentDef[]) => ({
  $schema: COMPONENT_DOCS_SCHEMA,
  generated: true,
  engineVersion: ENGINE_VERSION,
  note:
    'Documentation for every registered component, projected from its definition — the same source the ' +
    'Figma component and a coded component are built from. Brand-independent: a definition binds token ' +
    'names, and each brand\'s `<brand>.ai.json` resolves them. Field names mirror the definition schema. ' +
    '`ai` is the decision surface for choosing a component; the other fields are usage guidance and the ' +
    'code API.',
  components: Object.fromEntries(defs.map((d) => [d.id, projectDef(d)])),
});

/** One def's maintainer record: the two fields #1623 ruled maintainer-only, kept whole (see the header). */
export const projectMaintainer = (def: ComponentDef) => ({
  codeOnly: [...(def.anatomy?.codeOnly ?? [])],
  notes: {
    contested: [...(def.notes?.contested ?? [])],
    unverified: [...(def.notes?.unverified ?? [])],
    evolution: [...(def.notes?.evolution ?? [])],
  },
});

export const projectComponentMaintainer = (defs: readonly ComponentDef[]) => ({
  $comment: [
    'GENERATED by `packages/engine/emit-component-docs.ts` (#1701); edit the component definitions, not this file.',
    'MAINTAINER RECORD, NOT PAYLOAD. Each definition\'s `anatomy.codeOnly` and `notes.*`, which #1623 ruled',
    'maintainer-only. Classified `ours` in `payload-manifest.json`, listed in `regen.ts`\'s MAINTAINER_ARTIFACTS',
    'rather than SCHEMA_ARTIFACTS, and so outside the shipped-prose gates by construction. Complete: entries',
    'that cite an external reference system are kept here, because this file does not ship.',
  ],
  generated: true,
  components: Object.fromEntries(defs.map((d) => [d.id, projectMaintainer(d)])),
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
  // `triggerKeywords` and `generationPriority` are agent-only metadata; they stay in the JSON's `ai` block.
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

  out.push('---', '');
  out.push(`Generated from the ${code(def.id)} component definition.`, '');
  return out.join('\n');
};

// ---- I/O shell --------------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
export const COMPONENT_DOCS_DIR = resolve(here, 'out', 'components');
export const COMPONENT_MAINTAINER_FILE = resolve(here, 'schema', 'component-maintainer.json');

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Cleared first, so a def that leaves the registry leaves no stale page behind for `regen --check` to miss.
  rmSync(COMPONENT_DOCS_DIR, { recursive: true, force: true });
  mkdirSync(COMPONENT_DOCS_DIR, { recursive: true });
  writeFileSync(resolve(COMPONENT_DOCS_DIR, 'components.ai.json'), JSON.stringify(projectComponentDocs(componentDefs), null, 2) + '\n');
  for (const def of componentDefs) writeFileSync(resolve(COMPONENT_DOCS_DIR, `${def.id}.md`), renderMarkdown(def));
  writeFileSync(COMPONENT_MAINTAINER_FILE, JSON.stringify(projectComponentMaintainer(componentDefs), null, 2) + '\n');
  console.log(`[emit-component-docs] wrote ${COMPONENT_DOCS_DIR} — components.ai.json + ${componentDefs.length} pages; and ${COMPONENT_MAINTAINER_FILE}`);
}
