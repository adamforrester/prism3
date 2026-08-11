// Main plugin code - runs in the Figma plugin sandbox
import { API_CONFIG, PERFORMANCE_LIMITS, PROGRESS_CONFIG } from './constants';
import { TokenExporter } from './plugin/exporter';
import { MultiFormatTokenExporter, MultiFormatExportOptions } from './plugin/multi-format-exporter';
import { TokenScanner } from './plugin/scanner';
import { TokenValidator } from './plugin/validator';
import { FormatOptions } from './types/export-formats';
import {
  ScanResult,
  ExportOptions,
  PluginMessage,
  ValidationIssue,
  AliasEdge,
} from './types/plugin';

// Show the plugin UI
figma.showUI(__html__, { width: 1080, height: 720, themeColors: true });

// Storage key for export options
const STORAGE_KEY = 'token-press-options';

// Default export options
const DEFAULT_OPTIONS: ExportOptions = {
  units: 'px',
  remMultiplier: 16,
  colorFormat: 'dtcg',
  colorSpace: 'srgb',
  lineHeightOutput: 'ratio',
  letterSpacingUnits: 'px',
  dimensionFormat: 'object',
  letterSpacingFormat: 'object',
  durationFormat: 'object',
  tokenNameCase: 'preserve',
  includeFigmaExtensions: true,
  formatCss: false,
  formatRawFigma: false,
  formatDotNotation: false,
  excludedCollections: [],
};

// Message handler
figma.ui.onmessage = async (message: PluginMessage) => {
  try {
    switch (message.type) {
      case 'scan':
        await handleScan();
        break;

      case 'export': {
        // Ensure we have valid options with defaults
        const exportOptions = message.data || DEFAULT_OPTIONS;
        await handleExport(exportOptions);
        break;
      }

      case 'get-options':
        await handleGetOptions();
        break;

      case 'set-options':
        await handleSetOptions(message.data);
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  } catch (error) {
    console.error(`Error handling message ${message.type}:`, error);

    figma.ui.postMessage({
      type: 'error',
      data: { message: error instanceof Error ? error.message : 'Unknown error occurred' },
    });
  }
};

/**
 * Checks if the current user has sufficient permissions to access the file.
 * This helps provide clear error messages for permission issues.
 */
async function checkFilePermissions(): Promise<void> {
  try {
    // Try to access basic file properties that require edit permissions
    // If the user doesn't have proper access, these operations may fail
    const currentUser = figma.currentUser;

    if (!currentUser) {
      throw new Error(
        'Unable to access user information. Please ensure you are logged into Figma.'
      );
    }

    // Attempt to access file properties that require proper permissions
    const fileName = figma.root.name;

    // Try to access variables API to detect permission issues early
    await figma.variables.getLocalVariableCollectionsAsync();
  } catch (error) {
    // Transform technical errors into user-friendly messages
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check for common permission-related error patterns
    if (
      errorMessage.includes('currentUser') ||
      errorMessage.includes('fileRoleUpdates') ||
      errorMessage.includes('permissions') ||
      errorMessage.includes('access')
    ) {
      throw new Error(
        'Unable to access file. Please ensure you have "Can Edit" permissions for this file. ' +
          'If you only have view access, contact the file owner to upgrade your permissions.'
      );
    }

    // Re-throw the original error if it's not permission-related
    throw error;
  }
}

/**
 * Scans the current Figma file for design tokens and validates them.
 * Reports results back to the UI with token counts and validation issues.
 */
async function handleScan(): Promise<void> {
  try {
    // Check permissions first to provide clear error messages
    await checkFilePermissions();

    const scanner = new TokenScanner();
    const validator = new TokenValidator();

    // Enumerate all local resources using async APIs with timeout protection
    // Generic, not `Promise<any>`: the race erased every Figma getter's return type, so `collections`
    // and `variables` arrived as `any[]` and eleven downstream callbacks were implicitly `any`.
    const timeoutPromise = <T,>(promise: Promise<T>, name: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${name} API call timed out after ${API_CONFIG.TIMEOUT_MS}ms`)),
            API_CONFIG.TIMEOUT_MS
          )
        ),
      ]);
    };

    const [collections, variables, textStyles, effectStyles] = await Promise.all([
      timeoutPromise(
        figma.variables.getLocalVariableCollectionsAsync(),
        'getLocalVariableCollections'
      ),
      timeoutPromise(figma.variables.getLocalVariablesAsync(), 'getLocalVariables'),
      timeoutPromise(figma.getLocalTextStylesAsync(), 'getLocalTextStyles'),
      timeoutPromise(figma.getLocalEffectStylesAsync(), 'getLocalEffectStyles'),
    ]);

    // Count total modes across all collections
    const totalModes = collections.reduce((sum, collection) => sum + collection.modes.length, 0);

    // Filter out BOOLEAN variables — they aren't exported, so they shouldn't
    // affect the rail counts.
    const exportableVariables = variables.filter(variable => variable.resolvedType !== 'BOOLEAN');
    const colorVariables = exportableVariables.filter(
      variable => variable.resolvedType === 'COLOR'
    ).length;
    const stringVariables = exportableVariables.filter(
      variable => variable.resolvedType === 'STRING'
    ).length;
    const dimensionVariables = exportableVariables.filter(
      variable => variable.resolvedType === 'FLOAT'
    ).length;

    // Build per-collection summaries for the rail UI. Per-type counts let the
    // UI recompute live totals when the user toggles a collection off without
    // re-scanning.
    const collectionDetails = collections.map(collection => {
      const collectionVars = exportableVariables.filter(
        variable => variable.variableCollectionId === collection.id
      );
      return {
        id: collection.id,
        name: collection.name,
        modeCount: collection.modes.length,
        variableCount: collectionVars.length,
        colorCount: collectionVars.filter(v => v.resolvedType === 'COLOR').length,
        stringCount: collectionVars.filter(v => v.resolvedType === 'STRING').length,
        dimensionCount: collectionVars.filter(v => v.resolvedType === 'FLOAT').length,
      };
    });

    // Run validation
    const issues = await validator.validateAll({
      collections,
      variables,
      textStyles,
      effectStyles,
    });

    // Build alias edges so the UI can compute "alias into excluded collection"
    // warnings reactively as the user toggles collections — no rescan needed.
    // Only cross-collection edges matter; same-collection aliases can never
    // become broken via exclusion (you can't exclude only part of a collection).
    const variableLookup = new Map<string, Variable>();
    variables.forEach((v: Variable) => variableLookup.set(v.id, v));
    const collectionLookup = new Map<string, VariableCollection>();
    collections.forEach((c: VariableCollection) => collectionLookup.set(c.id, c));

    const aliasEdges: AliasEdge[] = [];
    exportableVariables.forEach((sourceVar: Variable) => {
      const sourceCollection = collectionLookup.get(sourceVar.variableCollectionId);
      if (!sourceCollection) {
        return;
      }

      // Track unique target variable ids per source — a variable that aliases
      // the same target across multiple modes only needs one edge.
      const seenTargets = new Set<string>();
      Object.values(sourceVar.valuesByMode).forEach(value => {
        if (
          typeof value === 'object' &&
          value !== null &&
          (value as VariableAlias).type === 'VARIABLE_ALIAS'
        ) {
          const targetId = (value as VariableAlias).id;
          if (seenTargets.has(targetId)) {
            return;
          }
          seenTargets.add(targetId);

          const targetVar = variableLookup.get(targetId);
          if (!targetVar) {
            return;
          } // Broken alias — already flagged by validator
          if (targetVar.variableCollectionId === sourceVar.variableCollectionId) {
            return;
          }

          const targetCollection = collectionLookup.get(targetVar.variableCollectionId);
          if (!targetCollection) {
            return;
          }

          aliasEdges.push({
            sourceVariableId: sourceVar.id,
            sourceVariableName: sourceVar.name,
            sourceCollectionId: sourceCollection.id,
            sourceCollectionName: sourceCollection.name,
            targetVariableId: targetVar.id,
            targetVariableName: targetVar.name,
            targetCollectionId: targetCollection.id,
            targetCollectionName: targetCollection.name,
          });
        }
      });
    });

    const result: ScanResult = {
      collections: collections.length,
      modes: totalModes,
      variables: exportableVariables.length,
      colorVariables,
      stringVariables,
      dimensionVariables,
      textStyles: textStyles.length,
      effectStyles: effectStyles.length,
      issues,
      collectionDetails,
      aliasEdges,
    };

    figma.ui.postMessage({
      type: 'scan-result',
      data: result,
    });
  } catch (error) {
    console.error('Scan failed:', error);

    // Provide clear error message to user
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred while scanning';

    figma.ui.postMessage({
      type: 'error',
      data: { message: errorMessage },
    });
  }
}

/**
 * Sends export progress updates to the UI.
 *
 * @param progress Progress percentage (0-100)
 * @param message Status message to display
 */
function sendExportProgress(progress: number, message: string): void {
  figma.ui.postMessage({
    type: 'export-progress',
    data: { progress, message },
  });
}

/**
 * Handles the token export process, creating a ZIP file with DTCG-formatted tokens.
 *
 * @param options Export configuration options
 */
async function handleExport(options: ExportOptions): Promise<void> {
  try {
    sendExportProgress(PROGRESS_CONFIG.PHASES.INIT, 'Initializing export...');

    // Build additional formats array based on user selections
    const additionalFormats: FormatOptions[] = [];

    if (options.formatCss) {
      additionalFormats.push({
        format: 'css',
        config: {
          css: {
            // Don't pass namespace as prefix - DTCG paths already include it
            prefix: '',
            useCustomProperties: true,
            generateUtilities: false,
          },
        },
      });
    }

    if (options.formatRawFigma) {
      additionalFormats.push({ format: 'raw-figma' });
    }

    if (options.formatDotNotation) {
      additionalFormats.push({ format: 'dot-notation' });
    }

    // Use multi-format exporter if additional formats are selected
    let zipBlob: ArrayBuffer;
    let fileCount: number;
    let skippedBlurStyles: string[] = [];

    if (additionalFormats.length > 0) {
      const multiFormatOptions: MultiFormatExportOptions = Object.assign({}, options, {
        additionalFormats: additionalFormats,
        includeDTCG: true,
      });

      const multiExporter = new MultiFormatTokenExporter(multiFormatOptions);
      sendExportProgress(20, 'Scanning design tokens...');

      zipBlob = await multiExporter.exportToZipWithFormats(sendExportProgress);
      fileCount = multiExporter.getFileCount();
      skippedBlurStyles = multiExporter.getSkippedBlurStyles();
    } else {
      // Use standard exporter for DTCG only
      const exporter = new TokenExporter(options);
      sendExportProgress(20, 'Scanning design tokens...');

      zipBlob = await exporter.exportToZip(sendExportProgress);
      fileCount = exporter.getFileCount();
      skippedBlurStyles = exporter.getSkippedBlurStyles();
    }

    sendExportProgress(95, 'Finalizing export...');

    // Convert ArrayBuffer to Uint8Array for transmission with memory check
    if (zipBlob.byteLength > PERFORMANCE_LIMITS.MAX_ZIP_SIZE_BYTES) {
      throw new Error(
        `Export file too large: ${(zipBlob.byteLength / 1000000).toFixed(1)}MB. Try reducing the number of tokens or splitting into smaller collections.`
      );
    }

    const zipArray = new Uint8Array(zipBlob);

    figma.ui.postMessage({
      type: 'export-result',
      data: {
        success: true,
        fileCount: fileCount,
        zipData: Array.from(zipArray),
        skippedBlurStyles: skippedBlurStyles,
      },
    });
  } catch (error) {
    console.error('Export failed:', error);

    try {
      figma.ui.postMessage({
        type: 'error',
        data: { message: error instanceof Error ? error.message : 'Unknown export error' },
      });
    } catch (uiError) {
      console.error('Failed to send error to UI:', uiError);
    }
  }
}

async function handleGetOptions(): Promise<void> {
  try {
    const stored = await figma.clientStorage.getAsync(STORAGE_KEY);
    const options = stored ? Object.assign({}, DEFAULT_OPTIONS, stored) : DEFAULT_OPTIONS;

    figma.ui.postMessage({
      type: 'options',
      data: options,
    });
  } catch (error) {
    // If storage fails, return defaults
    figma.ui.postMessage({
      type: 'options',
      data: DEFAULT_OPTIONS,
    });
  }
}

async function handleSetOptions(options: ExportOptions): Promise<void> {
  await figma.clientStorage.setAsync(STORAGE_KEY, options);
}
