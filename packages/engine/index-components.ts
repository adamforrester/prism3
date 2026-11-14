/**
 * `@prism3/engine/components` — the definitions, their schema and the Figma projector, for the surfaces (#3698).
 * Not for the web studio's run time: `test-shell-imports.ts` refuses this entry there, and `vercel-ignore-check.mjs`
 * measures that no definition reaches the web bundle. The entry map and the rule are in `index.ts`.
 */
export { componentDefs } from './components/index';
export { button } from './components/button';
export { fieldLabel } from './components/field-label';
export { fieldMessage } from './components/field-message';
export { densitySpacingKeys, validateComponentDef } from './component-schema';
export type { ComponentDef, PartDef } from './component-schema';
export {
  BANNER_STYLE_FILL_KEYS, CANVAS_FURNITURE, DEFAULT_BUTTON_LAYOUT, DEFAULT_WEIGHT_AVAILABILITY,
  DIALOG_TITLE_TYPE_KEYS, FIELD_FRAME_PARTS, SWAP_NO_PROPERTY, SWAP_PLACEHOLDER, TAG_STYLE_PARTS, applyBannerStyle,
  applyButtonLayout, applyControlShape, applyCurrentIndicator, applyDialogTitleSize, applyFieldStyle,
  applyMinWidthRatio, applyNestItemPrefers, applyNestOverrides, applyOutlineInteraction, applySpacingDensity,
  applyTagStyle, applyWeightIntent, checkAnatomySet, fieldStyleFor, figmaAnatomyMembers, figmaAnatomyPlan,
  figmaAnatomySet, figmaTextStyleName, figmaVarName, glyphLayerOpacities, nestMissAdvice, nestVariantMatch,
  nestVariantMissAdvice, planBoundVars, planComponentName, planEffectStyles, planPaintVars, planSetChunks,
  planSetLayout, planSetProperties, planStamp, planTextStyles, planToPluginJs, resolveNestMember, swapMissAdvice,
} from './anatomy-figma';
export type { AnatomyPlan, ButtonLayout, FigmaNodePlan, SwapFound, WeightAvailability } from './anatomy-figma';
export { diffAnatomy, fieldCoverage, unclassifiedFields } from './anatomy-readback';
export type { Divergence, HostNode, ReadPorts } from './anatomy-readback';
export { componentSpec, specMaterialize } from './component-specs';
export type { ComponentSpec, SpecValue } from './component-specs';
export {
  brandMaterializer, componentDefsFileNames, exportComponentDefs, toSpecsComponents,
} from './component-defs-export';
export { MAINTAINER_REGISTER, NAMES_A_TOOL, docSections, partName } from './component-doc-sections';
export type { DocSection, DocSectionId } from './component-doc-sections';
