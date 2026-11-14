/**
 * `@prism3/engine/figma` — the plugin's writers: write plans, Figma emitters, readback, file facts, and the variable
 * and style rename records an update applies (#3698).
 * Every module here is plugin-side; none is in the web bundle. The entry map and the rule are in `index.ts`.
 */
export {
  buildFloatWritePlan, buildFontVarPlan, buildGridStylePlan, buildMotionVarPlan, buildStylesPlan, buildTextStylePlan,
  buildWritePlan,
} from './write-plan';
export type {
  FloatCollectionPlan, GradientTransform, GridStylePlan, Rgba, StylesPlan, TextStylePlan, VarCollectionPlan,
  WritePlan,
} from './write-plan';
export { CORE_COLLECTION, UNSCOPED_TYPES, buildFigmaColor } from './emit-figma-color';
export type { FigmaEasing } from './emit-figma-color';
export { buildFigmaTextStyles } from './emit-figma-font';
export type { FigmaEffect } from './emit-figma-styles';
export { verifyFloatReadback, verifyReadback, verifyStylesReadback } from './read-back';
export type { DeclaredModesInput, ReadValue, ReadbackSnapshot, ReadbackVerdict } from './read-back';
export {
  COLLECTION_RENAMES, deriveVariableRenames, isRefusal, openMigration, planCollectionRenames, renameCollections,
  renameMap, renameVariables, validateRenameMap,
} from './rename-map';
export type { MaterializationStep, Migration, RenameMap } from './rename-map';
export { MATERIALIZATION_RENAMES, STYLE_RENAMES, planStyleRenames } from './materialization-renames';
export type { StyleRenameStep, StyleRule } from './materialization-renames';
export { axisSource, coreGroupOf, inAxis, ownedCoreGroup, rootOf, tailOf } from './figma-names';
export { STYLE_GUIDE_GROUPS, styleGuideGroup, styleGuideGroupOf } from './style-guide-groups';
export { FILE_FACTS_FORMAT, scanFileFacts, sourceFromSnapshot } from './file-facts';
export type {
  Binding, FactsComponent, FactsNode, FactsPage, FactsSource, FactsStyle, FileFactsReport, TextRun,
} from './file-facts';
