/**
 * Prism3 engine — COMPONENT DOCS PROJECTION (#1701). One projector, two shipped forms and one maintainer
 * record, from the same def data.
 *
 *   npx tsx packages/engine/emit-component-docs.ts
 *     → out/components/components.ai.json      (PAYLOAD, machine-readable: every registered def)
 *     → out/components/<id>.md                 (PAYLOAD, human-readable: one page per def)
 *     → schema/component-maintainer.json       (NOT payload: each def's `codeOnly`, `notes.*` and `docGaps`)
 *
 * THE PAGE IS THE FIRST READER OF THE SECTION MODEL (#846). `component-doc-sections.ts` turns a def into
 * the ordered sections of its usage doc, and the Figma panel and the docs-site page will read the same
 * model. The page renders the model's sections, in its order, and nothing else; what the model could not
 * draw is the maintainer record's `docGaps`.
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
 *    decision half (purpose, when to use, when to avoid in Overview; common partners in Related). The
 *    JSON keeps the whole `ai` block, and `composition.planned`, which the page leaves out (#846).
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
 *  · The Figma-only and paint layers (`tokens`, `paintKeys`, `figmaProperties`, `weightIntent`) are NOT
 *    documentation and are not projected. They reach Figma through the plan. `anatomy.parts` reaches the
 *    page only as the Anatomy section's part names and reader-register notes (#846), never the JSON.
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
import type { DocField } from './component-doc-sections';
import { docSections } from './component-doc-sections';
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
      anyOf: p.anyOf,
      minItems: p.minItems,
      maxItems: p.maxItems,
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
    'design-file component and a coded component are built from. Brand-independent: a definition binds token ' +
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
    projection: [...(def.notes?.projection ?? [])],
  },
  // What the usage doc could not draw (#846): each section's empty source fields, and each part note held
  // back as maintainer prose. Read from the section model, the same one every surface draws from.
  docGaps: docSections(def).gaps,
});

export const projectComponentMaintainer = (defs: readonly ComponentDef[]) => ({
  $comment: [
    'GENERATED by `packages/engine/emit-component-docs.ts` (#1701); edit the component definitions, not this file.',
    'MAINTAINER RECORD, NOT PAYLOAD. Each definition\'s `anatomy.codeOnly` and `notes.*`, which #1623 ruled',
    'maintainer-only. Classified `ours` in `payload-manifest.json`, listed in `regen.ts`\'s MAINTAINER_ARTIFACTS',
    'rather than SCHEMA_ARTIFACTS, and so outside the shipped-prose gates by construction. Complete: entries',
    'that cite an external reference system are kept here, because this file does not ship. `docGaps` (#846) lists',
    'what each usage doc could not draw: a section\'s empty source fields, and part notes still written for maintainers.',
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

/** The page: the lede and the identity lines, then the section model's sections, in its order, and nothing
 *  else. Every `##` heading is a model section's title, so the page cannot carry a section the model
 *  omitted or omit one it drew (`lint-component-docs.ts` arm F holds both against a rule of its own). */
export const renderMarkdown = (def: ComponentDef): string => {
  const out: string[] = [];
  const para = (s: string | undefined) => { if (s) out.push(mdEscape(s), ''); };
  const bullets = (xs: readonly string[]) => { for (const x of xs) out.push(`- ${mdEscape(x)}`); if (xs.length) out.push(''); };
  const fields = (fs: readonly DocField[]) => { for (const f of fs) out.push(`- **${f.label}:** ${mdEscape(f.text)}`); if (fs.length) out.push(''); };

  out.push(`# ${def.name}`, '');
  out.push(`> ${mdEscape(def.summary)}`, '');
  out.push(`- **ID:** ${code(def.id)}`);
  out.push(`- **Category:** ${def.category}`);
  out.push(`- **Status:** ${def.status}`);
  if (def.aliases?.length) out.push(`- **Also known as:** ${def.aliases.map(mdEscape).join(', ')}`);
  if (def.inherits) out.push(`- **Builds on:** ${code(def.inherits)}`);
  out.push('');

  // The page is brand-independent (#1701), so it passes no modes and has no Theming section.
  for (const s of docSections(def).sections) {
    out.push(`## ${s.title}`, '');
    switch (s.id) {
      case 'overview':
        para(s.description);
        fields(s.fields);
        break;
      case 'anatomy':
        if (s.specimen.length) out.push(`Shown on the default member: ${s.specimen.map((x) => `${x.axis} ${code(x.value)}`).join(', ')}.`, '');
        s.parts.forEach((p, i) => out.push(`${i + 1}. **${p.name}**${p.optional ? ' (optional)' : ''}${p.caption ? ` — ${mdEscape(p.caption)}` : ''}`));
        out.push('');
        break;
      case 'styles':
        if (s.axes.length) {
          out.push('| Axis | Values | Changes | Description |', '| --- | --- | --- | --- |');
          for (const a of s.axes) out.push(`| ${code(a.axis)} | ${list(a.values)} | ${a.kind === 'runtime' ? 'at runtime' : 'once, when authored'} | ${a.description ? mdEscape(a.description) : '—'} |`);
          out.push('');
        }
        if (s.states.length) out.push('### States', '', list(s.states), '');
        break;
      case 'usage':
        para(s.usage);
        if (s.do.length) { out.push('### Do', ''); bullets(s.do); }
        if (s.dont.length) { out.push("### Don't", ''); bullets(s.dont); }
        break;
      case 'accessibility':
        fields(s.fields);
        if (s.wcag.length) { out.push('### WCAG', ''); bullets(s.wcag); }
        if (s.motion.length) { out.push('### Motion', ''); fields(s.motion); }
        break;
      case 'content':
        para(s.guidelines);
        fields(s.patterns);
        break;
      case 'theming':
        out.push(`Modes: ${list(s.modes)}.`, '');
        break;
      case 'related':
        for (const l of s.lists) out.push(`- **${l.label}:** ${list(l.ids)}`);
        if (s.replaces.length) {
          out.push('- **Replaces:**');
          for (const r of s.replaces) out.push(`  - ${mdEscape(r)}`);
        }
        out.push('');
        break;
      case 'code':
        out.push('### Props', '');
        out.push('| Name | Type | Default | Required | Description |', '| --- | --- | --- | --- | --- |');
        for (const p of s.props) {
          // Values are listed only when the type prose does not already name every one of them.
          const values = p.values && !p.values.every((v) => p.type.includes(v)) ? ` (${p.values.map((v) => code(v)).join(', ')})` : '';
          const name = p.deprecated ? `${code(p.name)} (deprecated)` : code(p.name);
          // A slot prop (#2649): what each item may be and how many.
          const items = p.anyOf ? ` of ${p.anyOf.map((x) => code(x)).join(' or ')}, ${p.maxItems !== undefined ? `${p.minItems} to ${p.maxItems}` : `${p.minItems} or more`}` : '';
          out.push(`| ${name} | ${mdEscape(p.type)}${mdEscape(values)}${mdEscape(items)} | ${p.default === undefined ? '—' : code(String(p.default))} | ${p.required ? 'yes' : 'no'} | ${mdEscape(p.description)} |`);
        }
        out.push('');
        if (s.implementation.length) bullets(s.implementation);
        break;
    }
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
