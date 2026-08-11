// Plugin-specific types for Token Press

export interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  source: string;
  details?: any;
}

export interface CollectionSummary {
  /** Figma collection id — session-stable. */
  id: string;
  name: string;
  modeCount: number;
  variableCount: number;
  /**
   * Per-resolved-type variable counts within the collection. Lets the rail
   * recompute live totals when the user toggles a collection off without
   * triggering a fresh scan.
   */
  colorCount: number;
  stringCount: number;
  dimensionCount: number;
}

/**
 * One alias relationship: variable A in collection X aliases variable B in
 * collection Y. The UI uses these edges to surface "alias into excluded
 * collection" warnings reactively as the user toggles collections.
 */
export interface AliasEdge {
  sourceVariableId: string;
  sourceVariableName: string;
  sourceCollectionId: string;
  sourceCollectionName: string;
  targetVariableId: string;
  targetVariableName: string;
  targetCollectionId: string;
  targetCollectionName: string;
}

export interface ScanResult {
  collections: number;
  modes: number;
  /** Total exportable variables — excludes BOOLEAN (not exported). */
  variables: number;
  colorVariables: number;
  stringVariables: number;
  dimensionVariables: number;
  textStyles: number;
  effectStyles: number;
  /**
   * Cross-collection alias edges. Used by the UI to compute reactive
   * "alias into excluded collection" warnings without a rescan.
   */
  aliasEdges?: AliasEdge[];
  issues: ValidationIssue[];
  collectionDetails: CollectionSummary[];
}

/**
 * Casing mode for emitted DTCG token names.
 *
 * - `preserve` — keep the Figma name's casing verbatim ("onSuccessContainer").
 *   DTCG-conformant: the spec allows mixed case and calls names case-sensitive.
 *   Style Dictionary's stock `name/cti/kebab` transform splits the humps, so
 *   this also produces better CSS variables than `lower`.
 * - `kebab` — true kebab-case, splitting humps ("on-success-container").
 * - `lower` — legacy pre-3.0 behaviour: lowercase before separator replacement,
 *   which flattens humps entirely ("onsuccesscontainer").
 */
export type TokenNameCase = 'preserve' | 'kebab' | 'lower';

export interface ExportOptions {
  units: 'px' | 'rem';
  remMultiplier?: number;
  colorFormat: 'dtcg' | 'css';
  colorSpace: 'srgb' | 'hsl';
  lineHeightOutput: 'ratio' | 'dimension' | 'percentage';
  letterSpacingUnits: 'px' | 'percent';
  namespace?: string;
  includeFigmaExtensions: boolean;
  /**
   * Output shape for dimension tokens. Defaults to 'object' (DTCG spec).
   * 'string' is provided for Style Dictionary compatibility.
   */
  dimensionFormat: 'object' | 'string';
  /**
   * Output shape for letter-spacing dimensions. Defaults to 'object'.
   * Percent values are always strings regardless of this setting.
   */
  letterSpacingFormat: 'object' | 'string';
  /**
   * Output shape for motion-duration tokens. Defaults to 'object' (DTCG spec).
   * 'string' emits "50ms" for Style Dictionary compatibility — SD 4.x's
   * built-in time/seconds transform expects the legacy string form.
   */
  durationFormat: 'object' | 'string';
  /**
   * Casing for emitted token names. Defaults to 'preserve' as of v3.0.0;
   * pre-3.0 exports behaved as 'lower'.
   */
  tokenNameCase: TokenNameCase;
  formatCss?: boolean;
  formatRawFigma?: boolean;
  formatDotNotation?: boolean;
  /**
   * Names of variable collections to exclude from export. Stored by name
   * (not id) so the preference survives file reopens — Figma assigns new
   * collection ids on each load.
   */
  excludedCollections?: string[];
}

export interface PluginMessage {
  type: 'scan' | 'export' | 'get-options' | 'set-options';
  data?: any;
}

export interface PluginResponse {
  type: 'scan-result' | 'export-result' | 'options' | 'error';
  data?: any;
}
