// Export and ZIP packaging logic
import JSZip from 'jszip';
import {
  PERFORMANCE_LIMITS,
  PROGRESS_CONFIG,
  ZIP_CONFIG,
  PRECISION,
  CUBIC_BEZIER_MAP,
  roundToPrecision,
} from '../constants';
import {
  DTCGFile,
  DTCGToken,
  DTCGColor,
  DTCGDimension,
  DTCGTypography,
  DTCGShadow,
  VariableConversionValue,
  JsonObject,
  UnknownValue,
} from '../types/dtcg';
import { ExportOptions } from '../types/plugin';
import { BatchOptimizer } from '../utils/batch-optimizer';
import {
  sanitizeTokenName as sanitizeTokenNameShared,
  sanitizeFileName as sanitizeFileNameShared,
  createAliasReference,
  sanitizeNamespace,
} from '../utils/token-name-utils';
import { VariableCacheManager } from './cache-manager';
import { ColorConverter } from './converters/color-converter';
import { DimensionConverter } from './converters/dimension-converter';
import { ShadowConverter } from './converters/shadow-converter';
import { TypographyConverter } from './converters/typography-converter';
import { TokenScanner } from './scanner';
import { TokenTypeDetector } from './type-detection';
import { isVariableAlias, hasAlpha } from '../types/figma-guards';

/**
 * Exports Figma design tokens to a ZIP archive containing DTCG-compliant JSON files.
 * Handles variables, typography composites, and shadow effects with performance optimization.
 */
export class TokenExporter {
  private scanner: TokenScanner;
  private typeDetector: TokenTypeDetector;
  private cacheManager: VariableCacheManager;
  private colorConverter: ColorConverter;
  private dimensionConverter: DimensionConverter;
  private typographyConverter: TypographyConverter;
  private shadowConverter: ShadowConverter;
  // `protected`, not `private`: MultiFormatTokenExporter extends this class and reads both.
  // Declared private, the subclass could not compile and TS reported the extends clause itself as bad.
  protected fileCount = 0;
  private skippedBlurStyles: string[] = [];

  /**
   * The namespace prefix that aliases in the file currently being built must
   * carry — '' when this file gets no root wrapper.
   *
   * This exists because the wrapper decision is per FILE (skip it if any root
   * key already equals the namespace) while aliases are built per TOKEN. Reading
   * `options.namespace` directly at the alias site made the two disagree: in a
   * file where the wrapper was skipped, aliases still got a prefix and pointed
   * at a level that does not exist. Precomputing the decision from the root-key
   * set before conversion — which is knowable, since it only depends on the
   * variable names — keeps both sides definitionally in sync.
   *
   * Set by `beginFile` at the top of every file build.
   */
  private activeNamespace = '';

  constructor(protected options: ExportOptions) {
    this.scanner = new TokenScanner();
    this.typeDetector = new TokenTypeDetector();
    this.cacheManager = new VariableCacheManager();
    this.colorConverter = new ColorConverter();
    this.dimensionConverter = new DimensionConverter();
    this.typographyConverter = new TypographyConverter();
    this.shadowConverter = new ShadowConverter();
  }

  /**
   * Checks if the given tokens object already has the specified namespace at the root level.
   *
   * @param tokens The tokens object to check
   * @param namespace The namespace to look for
   * @returns True if namespace already exists at root level
   */
  private hasExistingNamespace(tokens: JsonObject, namespace: string): boolean {
    return Object.prototype.hasOwnProperty.call(tokens, namespace);
  }

  /**
   * Decides, before any token is converted, whether this file will get a root
   * wrapper — and therefore whether its aliases need the namespace prefix.
   *
   * The wrapper is skipped when a token's own first path segment already equals
   * the namespace, because that token supplies the root key itself. Deriving the
   * set of first segments straight from the variable names reproduces exactly
   * what `applyNamespaceIfNeeded` will later see at the root of the built tree,
   * without needing the tree.
   *
   * Two cases this gets right that reading the raw option could not:
   *   - a namespace that coincides with a real top-level group (`namespace:
   *     'color'` over a file that already has a `color/` group)
   *   - a file mixing prefixed and unprefixed variable names
   * In both, the wrapper is skipped for everyone, so nobody may be prefixed.
   *
   * @param names Raw Figma names of every variable going into this file
   */
  private beginFile(names: string[]): void {
    const namespace = sanitizeNamespace(this.options.namespace);

    if (!namespace) {
      this.activeNamespace = '';
      return;
    }

    for (let i = 0; i < names.length; i++) {
      const firstSegment = this.sanitizeTokenName(names[i]).split('/')[0];
      if (firstSegment === namespace) {
        // This file supplies its own root key; the wrapper will be skipped.
        this.activeNamespace = '';
        return;
      }
    }

    this.activeNamespace = namespace;
  }

  /**
   * Applies namespace to tokens if user provided one and it doesn't already exist.
   *
   * @param tokens The tokens object
   * @param extensions The $extensions object to preserve
   * @returns The tokens object with namespace applied if needed
   */
  private applyNamespaceIfNeeded(tokens: JsonObject, extensions?: JsonObject): DTCGFile {
    // `activeNamespace`, not the raw option: this value is the root key AND the
    // leading segment of every alias in the file, and `beginFile` already made
    // that one decision for both. Re-deriving it here is what let the two drift.
    const namespace = this.activeNamespace;

    if (!namespace) {
      // No namespace in play for this file, return as-is
      const result = Object.assign({}, tokens);
      if (extensions) {
        result.$extensions = extensions;
      }
      return result;
    }

    if (this.hasExistingNamespace(tokens, namespace)) {
      // Defensive: beginFile should already have cleared activeNamespace in this
      // case. Kept so the wrapper can never overwrite a real token group.
      const result = Object.assign({}, tokens);
      if (extensions) {
        result.$extensions = extensions;
      }
      return result;
    }

    // Apply namespace as root wrapper
    const result: JsonObject = {
      [namespace]: tokens,
    };

    if (extensions) {
      result.$extensions = extensions;
    }

    return result;
  }

  /**
   * Exports all design tokens to a ZIP archive with DTCG format.
   *
   * @param progressCallback Optional callback to report export progress
   * @returns Promise resolving to ZIP file as ArrayBuffer
   */
  async exportToZip(
    progressCallback?: (progress: number, message: string) => void
  ): Promise<ArrayBuffer> {
    const startTime = Date.now();
    const zip = new JSZip();
    this.fileCount = 0;
    this.skippedBlurStyles = [];

    const reportProgress = (progress: number, message: string) => {
      if (progressCallback) {
        progressCallback(progress, message);
      }
    };

    // Get all data
    reportProgress(PROGRESS_CONFIG.PHASES.SCAN_START, 'Analyzing design tokens...');
    const { collections, variables, textStyles, effectStyles } = await this.scanner.scanAll({
      excludedCollectionNames: this.options.excludedCollections,
    });

    // When any collection has multiple modes we lay the ZIP out as
    //   tokens/shared/<single-mode files>      ← apply to every mode
    //   tokens/<mode>/<multi-mode files>       ← per-mode variants
    // so consumers can run Style Dictionary once per mode without merge
    // collisions. Single-mode-only exports stay flat (`tokens/<file>.json`)
    // to avoid forcing everyone through a directory layer they don't need.
    const hasMultiMode = collections.some(c => c.modes.length > 1);

    // Export variables by collection/mode
    reportProgress(PROGRESS_CONFIG.PHASES.VARIABLES_START, 'Exporting variable tokens...');
    await this.exportVariables(zip, collections, variables, hasMultiMode, reportProgress);

    // Export typography composites
    reportProgress(PROGRESS_CONFIG.PHASES.TYPOGRAPHY_START, 'Processing typography tokens...');
    await this.exportTypography(zip, textStyles, variables, hasMultiMode, reportProgress);

    // Export shadow composites
    reportProgress(PROGRESS_CONFIG.PHASES.SHADOWS_START, 'Exporting shadow tokens...');
    await this.exportShadows(zip, effectStyles, hasMultiMode);

    // Generate ZIP with memory management
    reportProgress(PROGRESS_CONFIG.PHASES.ZIP_START, 'Creating ZIP file...');
    try {
      const result = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: ZIP_CONFIG.COMPRESSION_LEVEL },
      });

      const totalTime = Date.now() - startTime;
      console.log(`Export completed in ${totalTime}ms`);

      return result;
    } catch (zipError) {
      console.error('ZIP generation failed:', zipError);
      throw new Error(
        `Failed to create ZIP file: ${zipError instanceof Error ? zipError.message : 'Unknown error'}`
      );
    }
  }

  private async exportVariables(
    zip: JSZip,
    collections: VariableCollection[],
    variables: Variable[],
    hasMultiMode: boolean,
    reportProgress?: (progress: number, message: string) => void
  ): Promise<void> {
    try {
      const variablesByCollection = this.scanner.getVariablesByCollectionAndMode(
        variables,
        collections
      );

      let processedCollections = 0;
      const totalCollections = Array.from(variablesByCollection.values()).reduce(
        (sum, modeMap) => sum + modeMap.size,
        0
      );

      for (const [collectionId, modeMap] of variablesByCollection) {
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) {
          continue;
        }

        for (const [modeId, modeVariables] of modeMap) {
          const mode = collection.modes.find(m => m.modeId === modeId);
          if (!mode) {
            continue;
          }

          try {
            const fileName = this.getVariableFileName(collection, mode, hasMultiMode);
            const dtcgFile = this.buildDTCGFile(collection, mode, modeVariables, variables);

            // Limit JSON string size to prevent memory issues
            const jsonString = JSON.stringify(dtcgFile, null, 2);
            if (jsonString.length > PERFORMANCE_LIMITS.MAX_JSON_SIZE_BYTES) {
              console.warn(
                `Large file warning: ${fileName} is ${(jsonString.length / 1000000).toFixed(1)}MB`
              );
            }

            zip.file(fileName, jsonString);
            this.fileCount++;

            processedCollections++;
            if (reportProgress && totalCollections > 0) {
              const progress = Math.round((processedCollections / totalCollections) * 40) + 30; // 30-70% range
              reportProgress(progress, `Processed ${fileName}`);
            }

            // Yield control periodically to prevent blocking
            if (processedCollections % PERFORMANCE_LIMITS.YIELD_INTERVAL === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          } catch (fileError) {
            console.error(
              `Failed to export collection ${collection.name} mode ${mode.name}:`,
              fileError
            );
            // Continue with other files rather than crashing
          }
        }
      }
    } catch (error) {
      console.error('Failed to export variables:', error);
      throw new Error(
        `Variable export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Exports typography composite tokens with variable resolution and text decoration support.
   * Implements performance optimizations including variable caching and batch processing.
   *
   * @param zip JSZip instance to add files to
   * @param textStyles Figma text styles to export
   * @param variables Available variables for reference resolution
   * @param reportProgress Optional progress reporting callback
   */
  private async exportTypography(
    zip: JSZip,
    textStyles: TextStyle[],
    variables: Variable[],
    hasMultiMode: boolean,
    reportProgress?: (progress: number, message: string) => void
  ): Promise<void> {
    if (textStyles.length === 0) {
      return;
    }

    const typographyTokens: JsonObject = {};

    // Root keys here come from the text-style names, so that is what decides
    // whether this file gets a wrapper. Must run before the context below is
    // built, since the context carries the namespace into every alias.
    this.beginFile(textStyles.map(s => s.name));

    // Build variable map and caches for efficient lookups
    const variableMap = new Map(variables.map(v => [v.id, v]));
    const { fontWeightCache, lineHeightCache } = this.cacheManager.buildVariableCaches(variables);

    // Build conversion context for the typography converter
    const context = {
      variableMap,
      fontWeightCache,
      lineHeightCache,
      useRem: this.options.units === 'rem',
      baseFontSize: this.options.remMultiplier || 16,
      letterSpacingUnits: this.options.letterSpacingUnits || 'px',
      lineHeightOutput: this.options.lineHeightOutput || 'ratio',
      includeFigmaExtensions: this.options.includeFigmaExtensions || false,
      dimensionFormat: this.options.dimensionFormat || 'object',
      letterSpacingFormat: this.options.letterSpacingFormat || 'object',
      durationFormat: this.options.durationFormat || 'object',
      tokenNameCase: this.options.tokenNameCase || 'preserve',
      namespace: this.activeNamespace,
    };

    // Process text styles with adaptive batch sizing
    const totalStyles = Math.min(textStyles.length, PERFORMANCE_LIMITS.MAX_TEXT_STYLES);

    // Create adaptive batch optimizer for dynamic batch sizing
    const batchOptimizer = new BatchOptimizer({
      minBatchSize: 10,
      maxBatchSize: PERFORMANCE_LIMITS.TEXT_STYLE_BATCH_SIZE * 2, // Allow up to 100
      initialBatchSize: PERFORMANCE_LIMITS.TEXT_STYLE_BATCH_SIZE,
      targetBatchTime: 16, // Target 16ms per batch (~60fps)
    });

    let processedCount = 0;
    let batchStart = 0;

    while (batchStart < totalStyles) {
      const batchSize = batchOptimizer.getBatchSize();
      const batchEnd = Math.min(batchStart + batchSize, totalStyles);
      const batch = textStyles.slice(batchStart, batchEnd);

      const batchStartTime = Date.now();

      // Process current batch
      for (let i = 0; i < batch.length; i++) {
        const globalIndex = batchStart + i;

        try {
          const textStyle = batch[i];

          // Validate text style
          if (!textStyle || !textStyle.name) {
            console.warn(`Skipping invalid text style at index ${globalIndex}`);
            continue;
          }

          // Report progress less frequently for better performance
          if (globalIndex % PROGRESS_CONFIG.TEXT_STYLE_REPORT_INTERVAL === 0 && reportProgress) {
            const progressPercent =
              PROGRESS_CONFIG.PHASES.TYPOGRAPHY_START +
              Math.floor((globalIndex / totalStyles) * 30);
            reportProgress(
              progressPercent,
              `Processing typography ${globalIndex + 1} of ${totalStyles}...`
            );
          }

          const tokenPath = this.sanitizeTokenName(textStyle.name);
          const boundVars = this.scanner.getBoundVariablesForTextStyle(textStyle);

          // Use typography converter to build the value
          const typographyValue = this.typographyConverter.convert(textStyle, boundVars, context);

          const token: DTCGToken = {
            $type: 'typography',
            $value: typographyValue,
          };

          if (textStyle.description) {
            token.$description = textStyle.description;
          }

          if (this.options.includeFigmaExtensions) {
            token.$extensions = {
              figma: {
                styleId: textStyle.id,
                paragraphSpacing: textStyle.paragraphSpacing,
                paragraphIndent: textStyle.paragraphIndent,
                textCase: textStyle.textCase,
                textDecoration: textStyle.textDecoration,
              },
            };
          }

          this.setNestedProperty(typographyTokens, tokenPath.split('/'), token);
          processedCount++;
        } catch (styleError) {
          console.error(`Error processing text style at index ${globalIndex}:`, styleError);
          console.error('Text style name:', textStyles[globalIndex]?.name || 'Unknown');
          // Continue processing other styles
        }
      }

      // Record batch metrics and adjust batch size
      const batchTime = Date.now() - batchStartTime;
      batchOptimizer.recordBatch(batch.length, batchTime);

      // Yield control between batches to prevent UI blocking
      if (batchEnd < totalStyles) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      batchStart = batchEnd;
    }

    // Log processing summary for monitoring
    if (processedCount > 0) {
      console.log(`Processed ${processedCount} typography tokens`);
    }

    const typographyData = { typography: typographyTokens };
    const typographyFile = this.applyNamespaceIfNeeded(typographyData, this.getFileExtensions());

    const typographyPath = hasMultiMode ? 'shared/typography.json' : 'typography.json';
    zip.file(typographyPath, JSON.stringify(typographyFile, null, 2));
    this.fileCount++;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async exportShadows(
    zip: JSZip,
    effectStyles: EffectStyle[],
    hasMultiMode: boolean
  ): Promise<void> {
    if (effectStyles.length === 0) {
      return;
    }

    const shadowTokens: JsonObject = {};

    // ShadowConverter emits no aliases, but the wrapper decision still has to be
    // made from this file's own root keys.
    this.beginFile(effectStyles.map(s => s.name));

    const useRem = this.options.units === 'rem';
    const baseFontSize = this.options.remMultiplier || 16;

    effectStyles.forEach(effectStyle => {
      // DTCG `shadow` cannot represent BACKGROUND_BLUR / LAYER_BLUR — emitting
      // a token with $value: [] downstream-crashes Style Dictionary's composite
      // resolver. Skip blur-only styles and surface the names so authors can
      // either remove the style or re-author it as a real shadow.
      const hasShadowEffect = effectStyle.effects.some(
        e => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'
      );
      if (!hasShadowEffect) {
        this.skippedBlurStyles.push(effectStyle.name);
        return;
      }

      const tokenPath = this.sanitizeTokenName(effectStyle.name);

      // Use shadow converter to build the value
      const shadowValue = this.shadowConverter.convert(
        effectStyle,
        useRem,
        baseFontSize,
        this.options.dimensionFormat || 'object',
        this.options.colorFormat || 'dtcg'
      );

      const token: DTCGToken = {
        $type: 'shadow',
        $value: shadowValue,
      };

      if (effectStyle.description) {
        token.$description = effectStyle.description;
      }

      if (this.options.includeFigmaExtensions) {
        token.$extensions = {
          figma: {
            styleId: effectStyle.id,
            effectTypes: effectStyle.effects.map(e => e.type),
          },
        };
      }

      this.setNestedProperty(shadowTokens, tokenPath.split('/'), token);
    });

    // If every effect style was blur-only, don't emit an empty shadows.json
    if (Object.keys(shadowTokens).length === 0) {
      return;
    }

    const shadowFile = this.applyNamespaceIfNeeded(shadowTokens, this.getFileExtensions());

    const shadowsPath = hasMultiMode ? 'shared/shadows.json' : 'shadows.json';
    zip.file(shadowsPath, JSON.stringify(shadowFile, null, 2));
    this.fileCount++;
  }

  private buildDTCGFile(
    collection: VariableCollection,
    mode: VariableCollection['modes'][number],
    variables: Variable[],
    allVariables: Variable[]
  ): DTCGFile {
    const tokens: JsonObject = {};
    const variableMap = new Map(allVariables.map(v => [v.id, v]));

    // Decide the wrapper/alias namespace once, before any token is converted.
    this.beginFile(variables.map(v => v.name));

    variables.forEach(variable => {
      const value = variable.valuesByMode[mode.modeId];
      if (value === undefined) {
        return;
      }

      const tokenPath = this.sanitizeTokenName(variable.name);
      const dtcgToken = this.convertVariableToDTCG(variable, value, variableMap);

      this.setNestedProperty(tokens, tokenPath.split('/'), dtcgToken);
    });

    // Compile transition composites before finalizing the file
    this.compileTransitionComposites(tokens, variableMap);

    const fileExtensions = Object.assign({}, this.getFileExtensions(), {
      figma: {
        collection: {
          id: collection.id,
          name: collection.name,
          defaultModeId: collection.defaultModeId,
        },
        mode: mode.name,
      },
    });

    return this.applyNamespaceIfNeeded(tokens, fileExtensions);
  }

  private convertVariableToDTCG(
    variable: Variable,
    value: VariableValue,
    variableMap: Map<string, Variable>
  ): DTCGToken {
    // For aliases without explicit scopes, walk the chain to inherit scopes
    // from the source. Reported in the community: an alias FLOAT named "0"
    // with empty scopes was typing as `number` even though its source had
    // FONT_SIZE / LINE_HEIGHT / WIDTH_HEIGHT scopes that should resolve to
    // `dimension`. Figma allows aliases to ship with no scopes ("All scopes"
    // default), so trusting alias-only scopes drops information the user
    // already encoded on the primitive.
    const effectiveScopes =
      variable.scopes.length > 0
        ? variable.scopes
        : this.resolveAliasSourceScopes(value, variableMap, variable.scopes);

    const dtcgType = this.mapVariableTypeToDTCG(
      variable.resolvedType,
      effectiveScopes,
      variable.name
    );
    const token: DTCGToken = {
      $type: dtcgType,
      $value: this.convertVariableValue(
        value,
        variable.resolvedType,
        variableMap,
        dtcgType,
        variable.scopes,
        variable.name
      ),
    };

    if (variable.description) {
      token.$description = variable.description;
    }

    // Add Figma metadata if requested
    if (this.options.includeFigmaExtensions) {
      token.$extensions = {
        figma: {
          variableId: variable.id,
          collection: variable.variableCollectionId,
          scopes: variable.scopes,
        },
      };
      if (variable.codeSyntax) {
        token.$extensions.figma.codeSyntax = variable.codeSyntax;
      }
    }

    return token;
  }

  // Walks an alias chain to the deepest non-alias source and returns its
  // scopes. Used when an alias variable was created with no explicit scopes
  // ("All scopes" default in Figma) — without this, the type-mapping fallback
  // would land on `number` for anything not caught by name-based heuristics.
  // Cycle-protected via a hop limit; returns the alias's own scopes (which
  // the caller already knows are empty) if resolution fails.
  private resolveAliasSourceScopes(
    value: VariableValue,
    variableMap: Map<string, Variable>,
    fallback: VariableScope[]
  ): VariableScope[] {
    if (!isVariableAlias(value)) {
      return fallback;
    }

    const seen = new Set<string>();
    let currentId = value.id;
    let hops = 0;
    const MAX_HOPS = 10;

    while (hops < MAX_HOPS) {
      if (seen.has(currentId)) {
        return fallback; // Cycle detected
      }
      seen.add(currentId);

      const source = variableMap.get(currentId);
      if (!source) {
        return fallback;
      }

      // Read whichever mode value exists; for type resolution any mode works
      // since Figma enforces uniform resolvedType across modes.
      const modeIds = Object.keys(source.valuesByMode);
      if (modeIds.length === 0) {
        return source.scopes.length > 0 ? source.scopes : fallback;
      }
      const sourceValue = source.valuesByMode[modeIds[0]];

      // If the source is itself an alias, follow it.
      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        'type' in sourceValue &&
        sourceValue.type === 'VARIABLE_ALIAS'
      ) {
        currentId = sourceValue.id;
        hops++;
        continue;
      }

      // Reached a non-alias source — return its scopes, or fallback if it
      // also has none.
      return source.scopes.length > 0 ? source.scopes : fallback;
    }

    return fallback;
  }

  private mapVariableTypeToDTCG(
    type: VariableResolvedDataType,
    scopes: VariableScope[],
    variableName?: string
  ): string {
    switch (type) {
      case 'COLOR':
        return 'color';
      case 'FLOAT':
        // Grid token detection - MUST be first to override all scopes
        if (variableName && this.typeDetector.isGridVariable(variableName)) {
          if (this.typeDetector.isGridColumnsVariable(variableName)) {
            return 'number'; // Column count is unitless
          } else {
            return 'dimension'; // Gutter, margin, containermax, columnwidth are dimensions
          }
        }

        // Motion duration detection - should be duration type with ms units
        if (variableName && this.typeDetector.isMotionDurationVariable(variableName)) {
          return 'duration';
        }

        if (scopes.includes('FONT_WEIGHT')) {
          return 'fontWeight';
        }
        if (scopes.includes('LINE_HEIGHT')) {
          // Line height type depends on user preference: dimension for px/rem/percentage, number for unitless ratio
          return this.options.lineHeightOutput === 'ratio' ? 'number' : 'dimension';
        }
        if (scopes.includes('OPACITY')) {
          return 'number';
        }
        // Font size and letter spacing should be mapped as dimension for DTCG compliance
        if (scopes.includes('FONT_SIZE')) {
          return 'dimension';
        }
        if (scopes.includes('LETTER_SPACING')) {
          return 'dimension';
        }

        // Breakpoint detection - should be dimension with px units for DTCG compliance
        if (variableName && this.typeDetector.isBreakpointVariable(variableName)) {
          return 'dimension';
        }

        // Negative dimension detection - tokens with names like "neg-06", "neg-04" should be dimensions
        if (variableName && this.typeDetector.isNegativeDimensionVariable(variableName)) {
          return 'dimension';
        }

        // Border dimension detection - border radius and width tokens should be dimensions
        if (variableName && this.typeDetector.isBorderDimensionVariable(variableName)) {
          return 'dimension';
        }

        // Scope-based dimension detection. These Figma scopes all carry
        // spatial values that should map to DTCG `dimension`. Without this,
        // a FLOAT variable named `0` aliased into a stroke/radius/effect
        // slot would fall through to `number` because none of the
        // name-based heuristics above match. Reported in the community by
        // a user whose `0` source typed as `dimension` for the radius
        // alias (name match) but `number` for the stroke alias.
        {
          // FONT_SIZE is also handled by an explicit check above; including
          // it here is defensive — it documents the full set of spatial
          // FLOAT scopes in one place and stays correct if the explicit
          // check is ever refactored. LINE_HEIGHT is intentionally NOT in
          // this list: ratio output mode legitimately produces `number`,
          // so the explicit check (which honors options.lineHeightOutput)
          // is the only safe place for it.
          const dimensionScopes: VariableScope[] = [
            'WIDTH_HEIGHT',
            'GAP',
            'CORNER_RADIUS',
            'STROKE_FLOAT',
            'EFFECT_FLOAT',
            'FONT_SIZE',
          ];
          return scopes.some(s => dimensionScopes.includes(s)) ? 'dimension' : 'number';
        }
      case 'STRING':
        // Check for cubic bezier / easing tokens by name pattern
        if (variableName) {
          const lowerName = variableName.toLowerCase();
          const easingKeywords = [
            'easing',
            'ease',
            'timing',
            'curve',
            'bezier',
            'cubic-bezier',
            'timing-function',
            'timingfunction',
          ];

          if (easingKeywords.some(keyword => lowerName.includes(keyword))) {
            // This is likely an easing variable, return cubicBezier type
            return 'cubicBezier';
          }
        }

        if (scopes.includes('FONT_FAMILY')) {
          return 'fontFamily';
        }
        // Figma uses FONT_STYLE scope for font weight variables
        if (scopes.includes('FONT_WEIGHT') || scopes.includes('FONT_STYLE')) {
          return 'fontWeight';
        }
        return 'string';
      case 'BOOLEAN':
        return 'number';
      default:
        return 'string';
    }
  }

  private convertVariableValue(
    value: VariableValue,
    type: VariableResolvedDataType,
    variableMap: Map<string, Variable>,
    dtcgType?: string,
    scopes?: VariableScope[],
    variableName?: string
  ): VariableConversionValue {
    if (isVariableAlias(value)) {
      const targetVariable = variableMap.get(value.id);
      if (!targetVariable) {
        // Unresolvable target — emit the raw id so the validator reports it as a
        // broken alias rather than silently namespacing a non-path.
        return `{${value.id}}`;
      }
      return createAliasReference(
        targetVariable.name,
        this.options.tokenNameCase,
        this.activeNamespace
      );
    }

    switch (type) {
      case 'COLOR':
        return this.options.colorFormat === 'css'
          ? this.convertColorToCSS(value as RGB)
          : this.convertColor(value as RGB);
      case 'FLOAT':
        // Special handling for line height variables
        if (scopes && scopes.includes('LINE_HEIGHT') && typeof value === 'number') {
          if (this.options.lineHeightOutput === 'ratio') {
            // Return as unitless ratio rounded to 3 decimal places
            return Math.round(value * PRECISION.DECIMAL_3) / PRECISION.DECIMAL_3;
          } else if (this.options.lineHeightOutput === 'percentage') {
            // Route through formatDimensionValue so percentage line-heights
            // honor dimensionFormat like every other dimension. '%' is a valid
            // DTCGDimension unit per the spec.
            const percentValue =
              Math.round(value * 100 * PRECISION.PERCENT_1) / PRECISION.PERCENT_1;
            return this.formatDimensionValue(percentValue, '%');
          } else {
            // Convert to dimension with px/rem units
            const remMultiplier = this.options.remMultiplier || 16;

            if (this.options.units === 'rem') {
              const remValue =
                Math.round((value / remMultiplier) * PRECISION.DECIMAL_3) / PRECISION.DECIMAL_3;
              return this.formatDimensionValue(remValue, 'rem');
            } else {
              const pxValue = Math.round(value * 100) / 100; // Round to 2 decimals for px
              return this.formatDimensionValue(pxValue, 'px');
            }
          }
        }

        // Grid columns should be pure numbers (unitless)
        if (
          variableName &&
          this.typeDetector.isGridColumnsVariable(variableName) &&
          typeof value === 'number'
        ) {
          return value; // Return as pure number for column count
        }

        // If DTCG type is duration, format per durationFormat preference.
        // Object form is DTCG-spec; string form is for Style Dictionary
        // compatibility — SD 4.x's time/seconds transform expects "50ms".
        if (dtcgType === 'duration' && typeof value === 'number') {
          return this.formatDurationValue(value);
        }

        // If DTCG type is dimension, format per dimensionFormat preference
        if (dtcgType === 'dimension' && typeof value === 'number') {
          // Special case: containermax 'full' should be 100% (1 → 100%)
          if (variableName && this.typeDetector.isContainerMaxFullVariable(variableName, value)) {
            return this.formatDimensionValue(100, '%');
          }

          // Breakpoints should always use px units regardless of user preference
          if (variableName && this.typeDetector.isBreakpointVariable(variableName)) {
            return this.formatDimensionValue(value, 'px');
          }

          // Grid tokens (except columns) should always use px units
          if (
            variableName &&
            this.typeDetector.isGridVariable(variableName) &&
            !this.typeDetector.isGridColumnsVariable(variableName)
          ) {
            return this.formatDimensionValue(value, 'px');
          }

          const remMultiplier = this.options.remMultiplier || 16;

          if (this.options.units === 'rem') {
            return this.formatDimensionValue(value / remMultiplier, 'rem');
          } else {
            return this.formatDimensionValue(value, 'px');
          }
        }
        // OPACITY — PERCENT (0–100) LEAVING FIGMA, FRACTION (0–1) ARRIVING IN DTCG (#709).
        //
        // Figma interprets an OPACITY-scoped FLOAT as a percent, so `5` in the file means 5%.
        // DTCG `number` opacity is a 0–1 fraction, so emitting `5` is out of range by 100× and a
        // consumer applying it gets FULL opacity where 5% was authored. This is the boundary where
        // the percent convention is being LEFT, so it is where the conversion belongs.
        //
        // The divide comes BEFORE the rounding, and the precision moves with it. Both halves matter:
        // dividing by 100 INTRODUCES IEEE-754 noise (33.3 → 0.33299999999999996), so rounding after
        // is what keeps the output clean — while rounding first, as this line used to, leaves the
        // noise in whatever the divide creates. And the precision shifts two places because the
        // value did: at DECIMAL_3 the fraction would truncate exactly the digits the divide moved
        // right, collapsing 5.001% to 0.05 and 0.05% to 0.001. DECIMAL_5 preserves what DECIMAL_3
        // preserved on the percent scale — no more and no less.
        //
        // NOT a magnitude heuristic. `v > 1 ? v / 100 : v` reads plausibly and is wrong: 0.5 is a
        // legitimate half-percent, which that rule would emit as 0.5 (full opacity) instead of 0.005.
        // Every OPACITY-scoped value is a percent, so every one is divided.
        if (scopes && scopes.includes('OPACITY') && typeof value === 'number') {
          return roundToPrecision(value / 100, PRECISION.DECIMAL_5);
        }
        return typeof value === 'number' ? roundToPrecision(value) : 0;
      case 'STRING':
        // If this is a cubic bezier / easing value, parse to array
        if (dtcgType === 'cubicBezier') {
          const bezierArray = this.parseCubicBezier(String(value));
          return bezierArray || [0, 0, 1, 1]; // Default to linear if parsing fails
        }
        // If this is a font weight variable with a string value, convert to numeric and strip italic
        if (dtcgType === 'fontWeight' && typeof value === 'string') {
          return this.cacheManager.getExpectedFontWeight(value);
        }
        return String(value);
      case 'BOOLEAN':
        return value ? 1 : 0;
      default:
        return value;
    }
  }

  /**
   * Formats a dimension per options.dimensionFormat.
   * Object form is DTCG-spec compliant; string form is provided for
   * Style Dictionary compatibility.
   */
  private formatDimensionValue(
    value: number,
    unit: 'px' | 'rem' | 'em' | '%'
  ): string | { value: number; unit: string } {
    // Always sanitize: Figma stores variable values as 32-bit floats, so a
    // human-entered 0.04 surfaces as 0.03999999910593033. Rounding at the
    // formatter boundary ensures every dimension emission — regardless of
    // which scope path produced it — is free of IEEE-754 noise.
    const clean = roundToPrecision(value);
    if ((this.options.dimensionFormat || 'object') === 'object') {
      return { value: clean, unit };
    }
    return `${clean}${unit}`;
  }

  /**
   * Formats a motion-duration value per options.durationFormat. Object form
   * is DTCG-spec; string form is for Style Dictionary compatibility (SD 4.x's
   * built-in time/seconds transform expects "50ms", not the object shape).
   */
  private formatDurationValue(value: number): string | { value: number; unit: 'ms' } {
    const clean = roundToPrecision(value);
    if ((this.options.durationFormat || 'object') === 'object') {
      return { value: clean, unit: 'ms' };
    }
    return `${clean}ms`;
  }

  private convertColor(color: RGB): DTCGColor {
    const alpha =
      hasAlpha(color) ? Math.round(color.a * PRECISION.DECIMAL_3) / PRECISION.DECIMAL_3 : 1;

    if (this.options.colorSpace === 'hsl') {
      const [h, s, l] = this.rgbToHSL(color.r, color.g, color.b);
      return { colorSpace: 'hsl', components: [h, s, l], alpha };
    }

    return {
      colorSpace: 'srgb',
      components: [
        Math.round(color.r * 10000) / 10000,
        Math.round(color.g * 10000) / 10000,
        Math.round(color.b * 10000) / 10000,
      ],
      alpha,
    };
  }

  /**
   * Converts sRGB 0-1 values to HSL.
   * Returns [H: 0-360, S: 0-100, L: 0-100] rounded to 2 decimal places.
   */
  private rgbToHSL(r: number, g: number, b: number): [number, number, number] {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;

    if (d === 0) {
      return [0, 0, Math.round(l * 10000) / 100];
    }

    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h: number;
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }

    return [Math.round(h * 36000) / 100, Math.round(s * 10000) / 100, Math.round(l * 10000) / 100];
  }

  /**
   * Converts RGB color to CSS color string for Style Dictionary compatibility.
   * Shadow tokens need color as a string, not a DTCG color object.
   */
  private convertColorToCSS(color: RGB): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a =
      hasAlpha(color) ? Math.round(color.a * PRECISION.DECIMAL_3) / PRECISION.DECIMAL_3 : 1;

    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Parses easing strings to cubic bezier arrays for DTCG compliance.
   * Handles: named easings (linear, ease-out), cubic-bezier() functions, and arrays.
   *
   * @param value The easing value to parse
   * @returns [p1x, p1y, p2x, p2y] array or null if parsing fails
   */
  private parseCubicBezier(value: UnknownValue): [number, number, number, number] | null {
    if (!value) {
      return null;
    }

    // If it's already an array, return it
    if (Array.isArray(value) && value.length === 4) {
      return value as [number, number, number, number];
    }

    // Handle non-primitive values - return null for objects that aren't arrays
    if (typeof value === 'object' && value !== null) {
      return null;
    }

    // Convert to string and normalize (objects filtered above)
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const normalized = String(value).toLowerCase().trim();

    // Try direct map lookup first
    if (CUBIC_BEZIER_MAP[normalized]) {
      return CUBIC_BEZIER_MAP[normalized];
    }

    // Try to parse cubic-bezier() function format
    const match = normalized.match(
      /cubic-bezier\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/
    );
    if (match) {
      return [
        parseFloat(match[1]),
        parseFloat(match[2]),
        parseFloat(match[3]),
        parseFloat(match[4]),
      ];
    }

    return null;
  }

  /**
   * Resolves easing references to cubic bezier arrays.
   * Handles both direct values and variable references like {pds.motion.easing.ease-out}.
   *
   * @param value The easing value or reference
   * @param variableMap Map of all variables for resolving references
   * @returns [p1x, p1y, p2x, p2y] array, defaults to linear [0, 0, 1, 1]
   */
  private resolveEasingValue(
    value: UnknownValue,
    variableMap: Map<string, Variable>
  ): [number, number, number, number] {
    // If value is undefined or null, return default
    if (value === undefined || value === null) {
      return [0, 0, 1, 1]; // Default to linear
    }

    // If it's a reference string like "{pds.motion.easing.ease-out}"
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      // Compare against a freshly BUILT alias rather than reverse-parsing this
      // one. The alias was produced by createAliasReference, which applies both
      // the casing mode and the namespace; reconstructing the variable name by
      // hand (dots back to slashes) has to re-derive both and silently stops
      // matching whenever either changes. Namespacing aliases broke exactly that
      // way: the reference gained an "nbds." prefix, the reconstructed name did
      // not, no variable matched, and every namespaced transition fell through
      // to the linear default with no warning.
      for (const [_, targetVariable] of variableMap) {
        const targetAlias = createAliasReference(
          targetVariable.name,
          this.options.tokenNameCase,
          this.activeNamespace
        );
        if (targetAlias === value) {
          // Get the first mode's value
          const firstModeId = Object.keys(targetVariable.valuesByMode)[0];
          const targetValue = targetVariable.valuesByMode[firstModeId];

          // Parse the target value
          const bezierArray = this.parseCubicBezier(targetValue);
          if (bezierArray) {
            return bezierArray;
          }
          break;
        }
      }
    }

    // Try to parse the value directly
    const bezierArray = this.parseCubicBezier(value);
    if (bezierArray) {
      return bezierArray;
    }

    // Default to linear if all else fails
    return [0, 0, 1, 1];
  }

  /**
   * Compiles transition property tokens into DTCG-compliant transition composite tokens.
   * Recursively processes the token tree to find transition groups and compile them.
   *
   * @param tokens The tokens object to process
   * @param variableMap Map of all variables for resolving easing references
   */
  private compileTransitionComposites(
    tokens: JsonObject,
    variableMap: Map<string, Variable>
  ): void {
    const processObject = (obj: JsonObject): void => {
      if (!obj || typeof obj !== 'object') {
        return;
      }

      // Check if this object is a transition group
      // A transition group has children named: duration, delay, timingfunction (or variations)
      const keys = Object.keys(obj);
      const hasDuration = keys.some(k => k.toLowerCase().includes('duration'));
      const hasDelay = keys.some(k => k.toLowerCase().includes('delay'));
      const hasTimingFunction = keys.some(k => {
        const lk = k.toLowerCase();
        return lk.includes('timing') || lk.includes('easing');
      });

      // If this looks like a transition group, try to compile it
      if ((hasDuration || hasDelay || hasTimingFunction) && !obj.$type) {
        // Find the actual property tokens
        let durationToken: DTCGToken | null = null;
        let delayToken: DTCGToken | null = null;
        let timingFunctionToken: DTCGToken | null = null;
        let durationKey: string | null = null;
        let delayKey: string | null = null;
        let timingFunctionKey: string | null = null;

        for (const key of keys) {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('duration') && obj[key].$type) {
            durationToken = obj[key];
            durationKey = key;
          }
          if (lowerKey.includes('delay') && obj[key].$type) {
            delayToken = obj[key];
            delayKey = key;
          }
          if ((lowerKey.includes('timing') || lowerKey.includes('easing')) && obj[key].$type) {
            timingFunctionToken = obj[key];
            timingFunctionKey = key;
          }
        }

        // If we found at least one transition property token, compile the composite
        if (durationToken || delayToken || timingFunctionToken) {
          // Extract values with defaults. Fallback shape mirrors the active
          // durationFormat so the composite doesn't mix object + string shapes
          // when one of the sub-tokens is missing.
          const zeroDuration = this.formatDurationValue(0);
          const duration = durationToken?.$value || zeroDuration;
          const delay = delayToken?.$value || zeroDuration;
          let timingFunction: [number, number, number, number] = [0, 0, 1, 1]; // Default to linear

          // Resolve timing function
          if (timingFunctionToken) {
            timingFunction = this.resolveEasingValue(timingFunctionToken.$value, variableMap);
          }

          // Collect descriptions from any of the individual tokens
          const description =
            durationToken?.$description ||
            delayToken?.$description ||
            timingFunctionToken?.$description;

          // Build the composite transition token
          const compositeToken: DTCGToken = {
            $type: 'transition',
            $value: {
              duration: duration,
              delay: delay,
              timingFunction: timingFunction,
            },
          };

          if (description) {
            compositeToken.$description = description;
          }

          // Remove the individual property tokens
          if (durationKey) {
            delete obj[durationKey];
          }
          if (delayKey) {
            delete obj[delayKey];
          }
          if (timingFunctionKey) {
            delete obj[timingFunctionKey];
          }

          // Replace with composite (merge into the current object)
          Object.assign(obj, compositeToken);

          return; // Don't recurse into this object since we've converted it
        }
      }

      // Recursively process child objects
      for (const key of Object.keys(obj)) {
        if (key.startsWith('$')) {
          continue;
        } // Skip DTCG metadata properties
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          processObject(obj[key]);
        }
      }
    };

    processObject(tokens);
  }

  private getVariableFileName(
    collection: VariableCollection,
    mode: VariableCollection['modes'][number],
    hasMultiMode: boolean
  ): string {
    const baseName = this.sanitizeFileName(collection.name);
    const modeName = this.sanitizeFileName(mode.name);

    // Single-mode-only export: keep the flat layout consumers expect.
    if (!hasMultiMode) {
      return `${baseName}.json`;
    }

    // Mixed export: route single-mode collections to shared/ and multi-mode
    // collections to <mode>/. This is what lets Style Dictionary consume the
    // output one mode at a time without merge collisions on shared paths.
    if (collection.modes.length === 1) {
      return `shared/${baseName}.json`;
    }

    return `${modeName}/${baseName}.json`;
  }

  /**
   * Sanitizes a collection/mode name for use in a filename. Always lowercase,
   * independent of the token-name casing option.
   */
  private sanitizeFileName(name: string): string {
    return sanitizeFileNameShared(name);
  }

  /**
   * Sanitizes a Figma token name into a DTCG token path, honouring the
   * `tokenNameCase` option. Delegates to the shared utility so this and the
   * converters cannot drift.
   */
  private sanitizeTokenName(name: string): string {
    return sanitizeTokenNameShared(name, this.options.tokenNameCase);
  }

  private setNestedProperty(obj: JsonObject, path: string[], value: unknown): void {
    const lastKey = path.pop()!;
    const target = path.reduce((current, key) => {
      return (current[key] = current[key] || {});
    }, obj);
    target[lastKey] = value;
  }

  private getFileExtensions() {
    // __PLUGIN_VERSION__ is injected by the bundler's define from package.json so this
    // tracks the real release. See build.mjs and src/types/build-globals.d.ts.
    return {
      generator: {
        name: 'Token Press',
        version: __PLUGIN_VERSION__,
      },
    };
  }

  /**
   * Converts RGB components (0-1 range) to hex color string.
   *
   * @param r Red component (0-1)
   * @param g Green component (0-1)
   * @param b Blue component (0-1)
   * @param alpha Optional alpha component (0-1)
   * @returns Hex color string (e.g., "#ff0000" or "#ff000080" with alpha)
   */
  private rgbToHex(r: number, g: number, b: number, alpha?: number): string {
    // Convert 0-1 range to 0-255
    const toHex = (component: number): string => {
      const value = Math.round(component * 255);
      return value.toString(16).padStart(2, '0');
    };

    const hexR = toHex(r);
    const hexG = toHex(g);
    const hexB = toHex(b);

    if (alpha !== undefined && alpha < 1) {
      const hexA = toHex(alpha);
      return `#${hexR}${hexG}${hexB}${hexA}`;
    }

    return `#${hexR}${hexG}${hexB}`;
  }

  /**
   * Returns the total number of files added to the export ZIP.
   *
   * @returns Number of files in the current export
   */
  getFileCount(): number {
    return this.fileCount;
  }

  /**
   * Returns the names of effect styles that were skipped during export because
   * they contain only background/layer blur effects (which DTCG `shadow`
   * cannot represent). Cleared at the start of each export.
   */
  getSkippedBlurStyles(): string[] {
    return this.skippedBlurStyles.slice();
  }
}
