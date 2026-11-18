/**
 * EXPORT COMPONENT SPECS (#3425, owner decision Q45 A) — the slot the Export dialog's Component specs artifact reads.
 *
 * The export is the engine's component-defs export for the brand on screen (`@prism3/engine/component-defs-export`):
 * every component definition with the brand's component settings resolved, and the same as a Specs components set. It
 * is computed from the definitions, and the web bundle carries none (`test-shell-imports.ts` holds that in the source,
 * `vercel-ignore-check.mjs` on the built bundle). So, like the component catalog (`component-catalog.ts`), the plugin's
 * iframe entry computes it from the definitions it bundles and PROVIDES it here before the studio boots
 * (`apps/plugin/src/ui/component-specs-export.ts`). The web provides none, and the dialog draws the artifact off, with
 * the reason (`main.ts`, `SPECS_WEB_OFF`).
 *
 * Types only from the engine: nothing here reaches a definition at run time.
 */
import type { BrandInput } from '@prism3/engine';

export type ComponentSpecsExporter = {
  /** The two files' names for a brand slug, before anything is computed (the dialog lists them). */
  fileNames: (slug: string) => string[];
  /** The two files for the brand on screen: the export, then its Specs projection. */
  files: (input: BrandInput, slug: string) => { name: string; text: string }[];
};

let provided: ComponentSpecsExporter | null = null;
/** Called once by the plugin's iframe entry, before the studio evaluates. Never by the web. */
export const provideComponentSpecsExporter = (e: ComponentSpecsExporter): void => { provided = e; };
/** The exporter the plugin provided, or `null` on the web. */
export const componentSpecsExporter = (): ComponentSpecsExporter | null => provided;
