/**
 * Raw Figma Variables Exporter.
 * Exports Figma variables as-is in JSON format with full metadata.
 * Creates one file per collection/mode.
 */

import { DTCGFile } from '../../types/dtcg';
import { PlatformExport, FormatOptions, FormatExporter } from '../../types/export-formats';
import { TokenNameCase } from '../../types/plugin';
import { sanitizeFileName as sanitizeFileNameShared } from '../../utils/token-name-utils';

/**
 * Raw variable data structure for export
 */
export interface RawFigmaVariable {
  id: string;
  name: string;
  resolvedType: string;
  scopes: string[];
  description: string;
  value: unknown;
  alias: {
    type: string;
    id: string;
    name: string;
  } | null;
  codeSyntax: Record<string, string>;
}

/**
 * Raw Figma export file structure
 */
export interface RawFigmaExportFile {
  $collection: string;
  $mode: string;
  variables: RawFigmaVariable[];
}

/**
 * Input data for raw Figma export
 */
export interface RawFigmaExportInput {
  variables: Variable[];
  collections: VariableCollection[];
  variableMap: Map<string, Variable>;
  /**
   * Casing for emitted token paths. Consumed by the dot-notation exporter,
   * which shares this input shape. The raw-Figma exporter deliberately ignores
   * it — raw output mirrors Figma's own names verbatim.
   */
  tokenNameCase?: TokenNameCase;
}

/**
 * Exporter for raw Figma variables in JSON format.
 * Provides full variable metadata including aliases and resolved values.
 */
export class RawFigmaExporter implements FormatExporter {
  /**
   * Export raw Figma variables to JSON files.
   * Creates one file per collection/mode combination.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async export(_tokens: DTCGFile, _options: FormatOptions): Promise<PlatformExport[]> {
    // This method is required by FormatExporter interface but won't be used
    // Raw Figma export uses exportRaw() instead
    return [];
  }

  /**
   * Export raw Figma variables.
   * Main export method for raw Figma data.
   */
  exportRaw(input: RawFigmaExportInput): PlatformExport[] {
    const { variables, collections, variableMap } = input;
    const exports: PlatformExport[] = [];

    for (const collection of collections) {
      for (const mode of collection.modes) {
        // Filter variables for this collection and mode
        const modeVariables = variables.filter(
          v => v.variableCollectionId === collection.id && v.valuesByMode[mode.modeId] !== undefined
        );

        if (modeVariables.length === 0) {
          continue;
        }

        // Build the export file structure
        const exportFile: RawFigmaExportFile = {
          $collection: collection.name,
          $mode: mode.name,
          variables: modeVariables.map(v => this.formatVariable(v, mode.modeId, variableMap)),
        };

        // Generate filename
        const fileName = this.generateFileName(collection.name, mode.name, collection.modes.length);

        exports.push({
          fileName,
          content: JSON.stringify(exportFile, null, 2),
          extension: 'json',
          mimeType: 'application/json',
        });
      }
    }

    return exports;
  }

  /**
   * Format a single variable for export
   */
  private formatVariable(
    variable: Variable,
    modeId: string,
    variableMap: Map<string, Variable>
  ): RawFigmaVariable {
    const rawValue = variable.valuesByMode[modeId];
    let resolvedValue: unknown = rawValue;
    let aliasInfo: RawFigmaVariable['alias'] = null;

    // Check if this is an alias
    if (this.isVariableAlias(rawValue)) {
      const aliasValue = rawValue;
      const targetVariable = variableMap.get(aliasValue.id);

      aliasInfo = {
        type: 'VARIABLE_ALIAS',
        id: aliasValue.id,
        name: targetVariable?.name || 'Unknown',
      };

      // Resolve the actual value from the target variable
      if (targetVariable) {
        const targetModeId = Object.keys(targetVariable.valuesByMode)[0];
        resolvedValue = targetVariable.valuesByMode[targetModeId];

        // If the target is also an alias, resolve recursively
        if (this.isVariableAlias(resolvedValue)) {
          resolvedValue = this.resolveAliasValue(resolvedValue, variableMap, modeId);
        }
      }
    }

    return {
      id: variable.id,
      name: variable.name,
      resolvedType: variable.resolvedType,
      scopes: Array.from(variable.scopes || []),
      description: variable.description || '',
      value: resolvedValue,
      alias: aliasInfo,
      codeSyntax: variable.codeSyntax || {},
    };
  }

  /**
   * Check if a value is a variable alias
   */
  private isVariableAlias(value: unknown): value is VariableAlias {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      (value as any).type === 'VARIABLE_ALIAS'
    );
  }

  /**
   * Recursively resolve alias values
   */
  private resolveAliasValue(
    alias: VariableAlias,
    variableMap: Map<string, Variable>,
    preferredModeId: string,
    depth: number = 0
  ): unknown {
    // Prevent infinite loops
    if (depth > 10) {
      return null;
    }

    const targetVariable = variableMap.get(alias.id);
    if (!targetVariable) {
      return null;
    }

    // Try to get value for the preferred mode, or fall back to first mode
    let value = targetVariable.valuesByMode[preferredModeId];
    if (value === undefined) {
      const firstModeId = Object.keys(targetVariable.valuesByMode)[0];
      value = targetVariable.valuesByMode[firstModeId];
    }

    if (this.isVariableAlias(value)) {
      return this.resolveAliasValue(value, variableMap, preferredModeId, depth + 1);
    }

    return value;
  }

  /**
   * Generate filename for export
   */
  private generateFileName(collectionName: string, modeName: string, totalModes: number): string {
    const sanitizedCollection = this.sanitizeFileName(collectionName);

    // If only one mode, don't include mode name in filename
    if (totalModes === 1) {
      return `${sanitizedCollection}.json`;
    }

    const sanitizedMode = this.sanitizeFileName(modeName);
    return `${sanitizedCollection}-${sanitizedMode}.json`;
  }

  /**
   * Sanitize a string for use in filenames
   */
  private sanitizeFileName(name: string): string {
    return sanitizeFileNameShared(name);
  }

  getSupportedExtensions(): string[] {
    return ['json'];
  }

  getDisplayName(): string {
    return 'Raw Figma JSON';
  }

  validateTokens(): { isValid: boolean; errors: string[] } {
    // Raw Figma export doesn't use DTCG tokens, always valid
    return { isValid: true, errors: [] };
  }
}
