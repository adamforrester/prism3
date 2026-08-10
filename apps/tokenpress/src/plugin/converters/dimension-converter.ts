/**
 * Dimension token converter.
 * Handles conversion of Figma numeric variables to DTCG dimension format with proper units.
 */

import { PRECISION, roundToPrecision } from '../../constants';
import { ConversionContext } from '../../types/converter-types';
import { DTCGDimension } from '../../types/dtcg';
import { TokenTypeDetector } from '../type-detection';
import { BaseConverter } from './base-converter';

/**
 * Converter for dimension tokens.
 * Handles px/rem units, grid tokens, breakpoints, line heights, and special cases.
 */
export class DimensionConverter extends BaseConverter<string | number | DTCGDimension> {
  private typeDetector: TokenTypeDetector;

  constructor() {
    super();
    this.typeDetector = new TokenTypeDetector();
  }

  /**
   * Checks if this converter can handle the given variable.
   */
  canConvert(variable: Variable, context: ConversionContext): boolean {
    return variable.resolvedType === 'FLOAT';
  }

  /**
   * Converts a dimension variable to appropriate format.
   */
  convert(variable: Variable, context: ConversionContext): string | number | DTCGDimension {
    const firstModeId = Object.keys(variable.valuesByMode)[0];
    if (!firstModeId) {
      return context.useRem ? '0rem' : '0px';
    }

    const value = variable.valuesByMode[firstModeId];

    // Handle alias
    const resolved = this.resolveValue(
      value,
      context.variableMap,
      context.tokenNameCase,
      context.namespace
    );
    if (typeof resolved === 'string') {
      return resolved; // Alias reference
    }

    const numericValue = value as number;
    const variableName = variable.name;
    const scopes = variable.scopes || [];

    // Special handling for line height variables
    if (scopes.includes('LINE_HEIGHT')) {
      return this.convertLineHeight(numericValue, context);
    }

    // Grid columns should be pure numbers (unitless)
    if (this.typeDetector.isGridColumnsVariable(variableName)) {
      return roundToPrecision(numericValue);
    }

    // Motion duration tokens
    if (this.typeDetector.isMotionDurationVariable(variableName)) {
      return {
        value: roundToPrecision(numericValue),
        unit: 'ms',
      };
    }

    // Opacity values (unitless, 3 decimal precision)
    if (scopes.includes('OPACITY')) {
      return roundToPrecision(numericValue, PRECISION.DECIMAL_3);
    }

    // Dimension tokens with units
    return this.convertDimension(numericValue, variableName, context);
  }

  /**
   * Converts line height based on output preference.
   */
  private convertLineHeight(
    value: number,
    context: ConversionContext
  ): string | number | DTCGDimension {
    if (context.lineHeightOutput === 'ratio') {
      // Return as unitless ratio rounded to 3 decimal places
      return Math.round(value * PRECISION.DECIMAL_3) / PRECISION.DECIMAL_3;
    } else if (context.lineHeightOutput === 'percentage') {
      // Route through formatDimension so percentage line-heights honor
      // dimensionFormat like every other dimension. '%' is a valid
      // DTCGDimension unit per the spec.
      const percentValue = Math.round(value * 100 * PRECISION.PERCENT_1) / PRECISION.PERCENT_1;
      return this.formatDimension(percentValue, '%', context);
    } else {
      // Convert to dimension with px/rem units
      if (context.useRem) {
        const remValue =
          Math.round((value / context.baseFontSize) * PRECISION.DECIMAL_3) / PRECISION.DECIMAL_3;
        return this.formatDimension(remValue, 'rem', context);
      } else {
        const pxValue = Math.round(value * 100) / 100; // Round to 2 decimals for px
        return this.formatDimension(pxValue, 'px', context);
      }
    }
  }

  /**
   * Converts regular dimension with appropriate units.
   */
  private convertDimension(
    value: number,
    variableName: string,
    context: ConversionContext
  ): string | DTCGDimension {
    // Special case: containermax 'full' should be 100% (1 → 100%)
    if (this.typeDetector.isContainerMaxFullVariable(variableName, value)) {
      return this.formatDimension(100, '%', context);
    }

    // Breakpoints should always use px units regardless of user preference
    if (this.typeDetector.isBreakpointVariable(variableName)) {
      return this.formatDimension(value, 'px', context);
    }

    // Grid tokens (except columns) should always use px units
    if (
      this.typeDetector.isGridVariable(variableName) &&
      !this.typeDetector.isGridColumnsVariable(variableName)
    ) {
      return this.formatDimension(value, 'px', context);
    }

    // Handle negative dimensions
    if (this.typeDetector.isNegativeDimensionVariable(variableName)) {
      const absValue = Math.abs(value);
      if (context.useRem) {
        return this.formatDimension(-(absValue / context.baseFontSize), 'rem', context);
      } else {
        return this.formatDimension(-absValue, 'px', context);
      }
    }

    // Regular dimensions with user preference for units
    if (context.useRem) {
      return this.formatDimension(value / context.baseFontSize, 'rem', context);
    } else {
      return this.formatDimension(value, 'px', context);
    }
  }

  /**
   * Formats a dimension value/unit pair according to context.dimensionFormat.
   * Object form: { value, unit } per DTCG spec.
   * String form: "16px" for Style Dictionary compatibility.
   */
  private formatDimension(
    value: number,
    unit: 'px' | 'rem' | 'em' | '%',
    context: ConversionContext
  ): string | DTCGDimension {
    // Always sanitize: Figma stores variable values as 32-bit floats, so a
    // human-entered 0.04 surfaces as 0.03999999910593033. Rounding here
    // catches every dimension regardless of scope path.
    const clean = roundToPrecision(value);
    if (context.dimensionFormat === 'object') {
      return { value: clean, unit };
    }
    return `${clean}${unit}`;
  }
}
