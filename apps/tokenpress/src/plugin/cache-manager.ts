/**
 * Cache management for efficient variable lookups.
 * Implements O(1) lookups for font weights and line heights using pre-built lookup maps.
 */

import { getExpectedFontWeight, extractWeightName } from '../utils/font-weight-utils';
import { TokenTypeDetector } from './type-detection';

/**
 * Cache manager for font weight and line height variables.
 * Pre-builds lookup maps to convert O(n) searches to O(1) lookups.
 */
export class VariableCacheManager {
  private typeDetector: TokenTypeDetector;

  constructor() {
    this.typeDetector = new TokenTypeDetector();
  }

  /**
   * Builds optimized caches for font weight and line height variable lookups.
   * Pre-processes all variables once to enable O(1) lookups during export.
   *
   * @param variables Array of all variables to index
   * @returns Object containing fontWeightCache and lineHeightCache lookup maps
   */
  buildVariableCaches(variables: Variable[]) {
    const fontWeightCache: Record<string, Variable> = {};
    const lineHeightCache: Record<string, Variable> = {};

    for (const variable of variables) {
      // Cache font weight variables (Figma uses FONT_STYLE scope)
      if (
        variable.scopes.includes('FONT_WEIGHT') ||
        variable.scopes.includes('FONT_STYLE') ||
        variable.name.toLowerCase().includes('weight')
      ) {
        const lowerName = variable.name.toLowerCase();

        // Skip italic-specific weight tokens since fontStyle:"italic" is handled in composites
        // This prevents conflicts where both "italic" and "regular" have the same weight value (400)
        if (this.typeDetector.isItalicFontWeightToken(lowerName)) {
          continue;
        }

        // Get first mode value for analysis
        const firstModeId = Object.keys(variable.valuesByMode)[0];
        if (firstModeId) {
          const value = variable.valuesByMode[firstModeId];

          if (typeof value === 'string') {
            // Cache by calculated weight value
            const weightValue = this.getExpectedFontWeight(value);
            fontWeightCache[weightValue.toString()] = variable;

            // Cache by weight name patterns
            const weightName = this.extractWeightName(value);
            fontWeightCache[weightName] = variable;
          } else if (typeof value === 'number') {
            // Cache numeric font weights
            fontWeightCache[value.toString()] = variable;
          }
        }

        // Cache by variable name patterns (excluding italic variants)
        if (lowerName.includes('thin') && !this.typeDetector.isItalicFontWeightToken(lowerName)) {
          fontWeightCache['thin'] = variable;
        }
        if (
          lowerName.includes('light') &&
          !lowerName.includes('extra') &&
          !this.typeDetector.isItalicFontWeightToken(lowerName)
        ) {
          fontWeightCache['light'] = variable;
        }
        if (
          (lowerName.includes('regular') || lowerName.includes('normal')) &&
          !this.typeDetector.isItalicFontWeightToken(lowerName)
        ) {
          fontWeightCache['regular'] = variable;
        }
        if (lowerName.includes('medium') && !this.typeDetector.isItalicFontWeightToken(lowerName)) {
          fontWeightCache['medium'] = variable;
        }
        if (
          (lowerName.includes('semibold') || lowerName.includes('semi-bold')) &&
          !this.typeDetector.isItalicFontWeightToken(lowerName)
        ) {
          fontWeightCache['semibold'] = variable;
        }
        if (
          lowerName.includes('bold') &&
          !lowerName.includes('semi') &&
          !lowerName.includes('extra') &&
          !this.typeDetector.isItalicFontWeightToken(lowerName)
        ) {
          fontWeightCache['bold'] = variable;
        }
        if (lowerName.includes('black') && !this.typeDetector.isItalicFontWeightToken(lowerName)) {
          fontWeightCache['black'] = variable;
        }
      }

      // Cache line height variables
      if (
        variable.scopes.includes('LINE_HEIGHT') ||
        variable.name.toLowerCase().includes('line') ||
        variable.name.toLowerCase().includes('leading')
      ) {
        const firstModeId = Object.keys(variable.valuesByMode)[0];
        if (firstModeId) {
          const value = variable.valuesByMode[firstModeId];

          if (typeof value === 'number') {
            // Cache by exact value (for percentage-based lookups)
            const key = value.toString();
            lineHeightCache[key] = variable;

            // Also cache by percentage equivalent (e.g., 1.5 → "150")
            const percentKey = Math.round(value * 100).toString();
            lineHeightCache[percentKey] = variable;
          }
        }
      }
    }

    return { fontWeightCache, lineHeightCache };
  }

  /**
   * Calculates expected numeric font weight from font style name.
   *
   * @param fontStyle Font style name (e.g., "Medium", "Bold Italic")
   * @returns Numeric font weight (100-900)
   */
  getExpectedFontWeight(fontStyle: string): number {
    return getExpectedFontWeight(fontStyle);
  }

  /**
   * Extracts weight name from font style string.
   * Delegates to the shared font-weight utility (single source of truth).
   *
   * @param fontStyle Font style name
   * @returns Weight name (e.g., "bold", "medium")
   */
  extractWeightName(fontStyle: string): string {
    return extractWeightName(fontStyle);
  }

  /**
   * Finds a font weight variable by analyzing font style.
   * Uses naming patterns and value matching (uncached - O(n) operation).
   *
   * @param fontStyle Font style name to match
   * @param allVariables All available variables
   * @returns Matching variable or null
   */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  findFontWeightVariable(fontStyle: string, allVariables: Variable[]): Variable | null {
    // Get the expected numeric weight
    const expectedWeight = this.getExpectedFontWeight(fontStyle);

    // Look for variables that match common naming patterns
    const weightName = this.extractWeightName(fontStyle);
    const possibleNames = [
      `font-weight-${weightName}`,
      `fontweight-${weightName}`,
      `weight-${weightName}`,
      `fw-${weightName}`,
      // Also try with numeric values
      `font-weight-${expectedWeight}`,
      `fontweight-${expectedWeight}`,
      `weight-${expectedWeight}`,
      `fw-${expectedWeight}`,
    ];

    // First, try to find by name pattern (excluding italic variants)
    for (const name of possibleNames) {
      const variable = allVariables.find(v => {
        const lowerName = v.name.toLowerCase();
        const nameMatch = lowerName.includes(name.toLowerCase());
        const typeMatch = v.resolvedType === 'STRING' || v.resolvedType === 'FLOAT';
        const scopeMatch =
          v.scopes.includes('FONT_WEIGHT') ||
          v.scopes.includes('FONT_STYLE') ||
          lowerName.includes('weight');
        const notItalic = !this.typeDetector.isItalicFontWeightToken(lowerName);
        return nameMatch && typeMatch && scopeMatch && notItalic;
      });
      if (variable) {
        return variable;
      }
    }

    // Second, try to find by matching value (excluding italic variants)
    const matchingVariable = allVariables.find(v => {
      const lowerName = v.name.toLowerCase();
      const scopeMatch =
        v.scopes.includes('FONT_WEIGHT') ||
        v.scopes.includes('FONT_STYLE') ||
        lowerName.includes('weight');
      const notItalic = !this.typeDetector.isItalicFontWeightToken(lowerName);

      if (!scopeMatch || !notItalic) {
        return false;
      }

      // Get the first mode value to compare
      const firstModeId = Object.keys(v.valuesByMode)[0];
      if (!firstModeId) {
        return false;
      }

      const value = v.valuesByMode[firstModeId];

      if (v.resolvedType === 'STRING' && typeof value === 'string') {
        // Convert the string value and see if it matches our expected weight
        const convertedWeight = this.getExpectedFontWeight(value);
        return convertedWeight === expectedWeight;
      }

      if (v.resolvedType === 'FLOAT' && typeof value === 'number') {
        // Check if the numeric value matches
        return Math.abs(value - expectedWeight) < 1;
      }

      return false;
    });

    return matchingVariable || null;
  }

  /**
   * Finds a line height variable by matching percentage value.
   * Uses value matching (uncached - O(n) operation).
   *
   * @param percentValue Line height percentage value
   * @param allVariables All available variables
   * @returns Matching variable or null
   */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  findLineHeightVariable(percentValue: number, allVariables: Variable[]): Variable | null {
    // Convert percentage to unitless ratio (e.g., 150% → 1.5)
    const targetUnitless = percentValue / 100;

    return (
      allVariables.find(v => {
        if (
          !v.scopes.includes('LINE_HEIGHT') &&
          !v.name.toLowerCase().includes('line') &&
          !v.name.toLowerCase().includes('leading')
        ) {
          return false;
        }

        const firstModeId = Object.keys(v.valuesByMode)[0];
        if (!firstModeId) {
          return false;
        }

        const value = v.valuesByMode[firstModeId];

        if (typeof value === 'number') {
          // Check for close match (within 0.01)
          return Math.abs(value - targetUnitless) < 0.01;
        }

        return false;
      }) || null
    );
  }
}
