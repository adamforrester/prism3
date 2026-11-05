/**
 * Prism3 engine — ONE DEF'S SHIPPED FIELDS, as data (#1701). The `components.ai.json` entry, and the `def` of every
 * entry in the component-defs export (#3425). Its own module, free of I/O and of the def registry, so a surface that
 * bundles the engine (the Studio's Export component specs) can import it; `emit-component-docs.ts` re-exports it.
 */
import type { ComponentDef } from './component-schema';
import { axisKindOf } from './component-schema';

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
