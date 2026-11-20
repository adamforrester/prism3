/**
 * THE COMPONENT-DEFS EXPORT'S FILE NAMES (#3429), apart from the export itself.
 *
 * `component-defs-export.ts` reaches the definitions' projector, so the web studio's main bundle cannot import it. The
 * web Studio lists these names in the Export dialog before it loads the definitions on demand, so the names and the
 * stems they use live here, with no imports, and both the export and the web reach them.
 */

/**
 * THE PUBLISHED NAME (#1325, owner decision Q-CC1 A item 2). Each entry in the export is one component's COMPONENT
 * CONTRACT, its spec as data (Nathan Curtis, *Component Contracts and Schemas*), so the file is published under a
 * contract name. The exact name is the owner's: `component-contracts` is the recommendation built here, held in this one
 * constant so a rename is a one-line change. The `ComponentDef` type keeps its name (decision item 3).
 */
export const COMPONENT_CONTRACTS_STEM = 'component-contracts';
/**
 * The COMPATIBILITY COPY (decision item 2): the export's old name, written beside the contract-named file with the same
 * bytes for one release, so a reader of `component-defs.json` keeps working while it moves. Its Specs projection keeps
 * the old stem (`component-defs.specs.json`): only the export itself was renamed.
 */
export const COMPONENT_DEFS_COMPAT_STEM = 'component-defs';

/** The file names an export is written under: the contract-named file, its compatibility copy and its Specs projection,
 *  brand-neutral (`component-contracts.json`) or prefixed with a brand id (`<brand>.component-contracts.json`). */
export const componentDefsFileNames = (brandId: string | null): { contracts: string; defs: string; specs: string } => {
  const pre = brandId ? `${brandId}.` : '';
  return {
    contracts: `${pre}${COMPONENT_CONTRACTS_STEM}.json`,
    defs: `${pre}${COMPONENT_DEFS_COMPAT_STEM}.json`,
    specs: `${pre}${COMPONENT_DEFS_COMPAT_STEM}.specs.json`,
  };
};
