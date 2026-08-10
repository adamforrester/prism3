/**
 * Typography token converter.
 * Handles conversion of Figma text styles to DTCG typography format.
 */

import { PRECISION, roundToPrecision } from '../../constants';
import { ConversionContext, TypographyValue } from '../../types/converter-types';
import { DTCGDimension } from '../../types/dtcg';
import { TokenNameCase } from '../../types/plugin';
import { getExpectedFontWeight, extractWeightName } from '../../utils/font-weight-utils';
import { createAliasReference } from '../../utils/token-name-utils';

/**
 * Bound variables for a text style.
 * These are Figma variable bindings for text style properties.
 */
export interface BoundTypographyVariables {
  fontFamily?: VariableAlias;
  fontSize?: VariableAlias;
  fontWeight?: VariableAlias;
  letterSpacing?: VariableAlias;
  lineHeight?: VariableAlias;
}

/**
 * Converter for typography tokens.
 * Handles complex text style conversion with proper variable resolution,
 * caching, and unit conversion.
 */
export class TypographyConverter {
  /**
   * Converts a Figma text style to DTCG typography format.
   *
   * @param textStyle Figma text style object
   * @param boundVars Bound variables for the text style
   * @param context Conversion context with caches and preferences
   * @returns Typography value object
   */
  convert(
    textStyle: TextStyle,
    boundVars: BoundTypographyVariables,
    context: ConversionContext
  ): TypographyValue {
    // Build typography value object
    const typographyValue: TypographyValue = {
      fontFamily: this.resolveTypographyValue(
        textStyle.fontName.family,
        boundVars.fontFamily,
        context,
        'string'
      ),
      fontSize: this.resolveTypographyValue(
        { value: textStyle.fontSize },
        boundVars.fontSize,
        context,
        'dimension'
      ),
      fontWeight: this.resolveFontWeight(textStyle.fontName.style, boundVars.fontWeight, context),
      letterSpacing: this.resolveLetterSpacing(
        textStyle.letterSpacing,
        boundVars.letterSpacing,
        context
      ),
      lineHeight: this.resolveLineHeight(textStyle.lineHeight, boundVars.lineHeight, context),
    };

    // Add textDecoration if present
    const textDecoration = this.convertFigmaTextDecoration(textStyle.textDecoration);
    if (textDecoration && textDecoration !== 'none') {
      typographyValue.textDecoration = textDecoration;
    }

    // Add fontStyle for italic/oblique fonts
    const fontStyle = this.extractFontStyle(textStyle.fontName.style);
    if (fontStyle && fontStyle !== 'normal') {
      typographyValue.fontStyle = fontStyle;
    }

    return typographyValue;
  }

  /**
   * Resolves typography property values with alias and unit handling.
   *
   * @param fallback Direct value to use if no alias
   * @param boundVariable Optional bound variable alias
   * @param context Conversion context
   * @param type Property type (string or dimension)
   * @returns Resolved value (string, alias, or dimension)
   */
  private resolveTypographyValue(
    fallback: any,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    boundVariable: VariableAlias | undefined,
    context: ConversionContext,
    type: 'string' | 'dimension'
  ): any {
    // Check for bound variable alias first
    if (boundVariable) {
      const targetVariable = context.variableMap.get(boundVariable.id);
      if (targetVariable) {
        return this.createAlias(targetVariable, context.tokenNameCase, context.namespace);
      }
    }

    // For dimension types (fontSize), handle px/rem conversion
    if (
      type === 'dimension' &&
      fallback &&
      typeof fallback === 'object' &&
      fallback.value !== undefined
    ) {
      if (context.useRem) {
        const remValue = fallback.value / context.baseFontSize;
        return this.formatDimension(remValue, 'rem', context);
      }
      return this.formatDimension(fallback.value, 'px', context);
    }

    return fallback;
  }

  /**
   * Formats a dimension value/unit pair according to context.dimensionFormat.
   *
   * Rounds at this boundary — every dimension this converter emits funnels
   * through here, so one call sanitizes the string and object forms together.
   * Text-style values arrive as Figma 32-bit floats and the rem paths divide by
   * baseFontSize, either of which reintroduces representation noise.
   */
  private formatDimension(
    value: number,
    unit: 'px' | 'rem' | 'em' | '%',
    context: ConversionContext
  ): string | DTCGDimension {
    const clean = roundToPrecision(value);

    if (context.dimensionFormat === 'object') {
      return { value: clean, unit };
    }
    return `${clean}${unit}`;
  }

  /**
   * Formats a letter-spacing value/unit pair according to context.letterSpacingFormat.
   * '%' is a valid DTCGDimension unit per spec, so percent honors the flag too.
   *
   * Rounds for the same reason as `formatDimension`; letter-spacing is where the
   * noise was first reported, since sub-pixel values make it most visible.
   */
  private formatLetterSpacing(
    value: number,
    unit: 'px' | 'rem' | '%',
    context: ConversionContext
  ): string | DTCGDimension {
    const clean = roundToPrecision(value);

    if (context.letterSpacingFormat === 'object') {
      return { value: clean, unit };
    }
    return `${clean}${unit}`;
  }

  /**
   * Resolves font weight with caching for O(1) lookups.
   * Uses pre-built cache to match font styles to weight variables.
   *
   * @param fontStyle Figma font style name (e.g., "Medium", "Bold Italic")
   * @param boundVariable Optional bound variable alias
   * @param context Conversion context with font weight cache
   * @returns Font weight as number or variable reference string
   */
  private resolveFontWeight(
    fontStyle: string,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    boundVariable: VariableAlias | undefined,
    context: ConversionContext
  ): number | string {
    // Check for bound variable alias first
    if (boundVariable) {
      const targetVariable = context.variableMap.get(boundVariable.id);
      if (targetVariable) {
        return this.createAlias(targetVariable, context.tokenNameCase, context.namespace);
      }
    }

    // Try cached lookup (O(1) instead of O(n))
    const expectedWeight = this.getExpectedFontWeight(fontStyle);
    const weightName = this.extractWeightName(fontStyle);

    // Try multiple cache keys for maximum hit rate
    const cacheKeys = [
      expectedWeight.toString(),
      weightName,
      weightName.replace('-', ''),
      weightName.replace(' ', ''),
    ];

    for (const key of cacheKeys) {
      const cachedVariable = context.fontWeightCache[key];
      if (cachedVariable) {
        return this.createAlias(cachedVariable, context.tokenNameCase, context.namespace);
      }
    }

    // Fall back to calculated value
    return expectedWeight;
  }

  /**
   * Resolves letter spacing with unit conversion.
   *
   * @param letterSpacing Figma letter spacing object
   * @param boundVariable Optional bound variable alias
   * @param context Conversion context
   * @returns Letter spacing as dimension string or alias
   */
  private resolveLetterSpacing(
    letterSpacing: LetterSpacing,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    boundVariable: VariableAlias | undefined,
    context: ConversionContext
  ): DTCGDimension | string {
    // Check for bound variable alias first
    if (boundVariable) {
      const targetVariable = context.variableMap.get(boundVariable.id);
      if (targetVariable) {
        return this.createAlias(targetVariable, context.tokenNameCase, context.namespace);
      }
    }

    // Handle different unit preferences
    if (context.letterSpacingUnits === 'percent') {
      // Route through formatLetterSpacing so percent honors letterSpacingFormat
      // like every other dimension. '%' is a valid DTCGDimension unit per spec.
      return this.formatLetterSpacing(letterSpacing.value, '%', context);
    } else {
      // Use the main units preference (px or rem)
      if (context.useRem) {
        const remValue = letterSpacing.value / context.baseFontSize;
        return this.formatLetterSpacing(remValue, 'rem', context);
      } else {
        return this.formatLetterSpacing(letterSpacing.value, 'px', context);
      }
    }
  }

  /**
   * Resolves line height with caching for O(1) lookups.
   * Uses pre-built cache to match line heights to variables.
   *
   * @param lineHeight Figma line height object
   * @param boundVariable Optional bound variable alias
   * @param context Conversion context with line height cache
   * @returns Line height as number, dimension string, or alias
   */
  private resolveLineHeight(
    lineHeight: LineHeight,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    boundVariable: VariableAlias | undefined,
    context: ConversionContext
  ): number | string {
    // Check for bound variable alias first
    if (boundVariable) {
      const targetVariable = context.variableMap.get(boundVariable.id);
      if (targetVariable) {
        return this.createAlias(targetVariable, context.tokenNameCase, context.namespace);
      }
    }

    // Try cached lookup for PERCENT values (O(1))
    if (lineHeight.unit === 'PERCENT') {
      const targetUnitless = lineHeight.value / 100;

      // Try multiple cache keys
      const cacheKeys = [
        targetUnitless.toString(),
        Math.round(lineHeight.value).toString(), // percentage value
        lineHeight.value.toString(),
      ];

      for (const key of cacheKeys) {
        const cachedVariable = context.lineHeightCache[key];
        if (cachedVariable) {
          return this.createAlias(cachedVariable, context.tokenNameCase, context.namespace);
        }
      }
    }

    // Fall back to calculated value based on user preference
    return this.calculateLineHeight(lineHeight, context);
  }

  /**
   * Rounds a unitless line-height ratio.
   *
   * DECIMAL_3, not the `roundToPrecision` default, so this matches the
   * variable-side ratio path in `TokenExporter.convertVariableValue`. The same
   * conceptual token can reach the output either way — bound to a
   * LINE_HEIGHT-scoped variable, or read off a text style — and the two must not
   * disagree on precision for the same design intent.
   */
  private formatRatio(value: number): number {
    return roundToPrecision(value, PRECISION.DECIMAL_3);
  }

  /**
   * Calculates line height value based on output preference.
   *
   * @param lineHeight Figma line height object
   * @param context Conversion context
   * @returns Line height as number, percentage, or dimension string
   */
  private calculateLineHeight(
    lineHeight: LineHeight,
    context: ConversionContext
  ): number | string | DTCGDimension {
    switch (lineHeight.unit) {
      case 'PERCENT': {
        const unitless = lineHeight.value / 100;

        if (context.lineHeightOutput === 'ratio') {
          return this.formatRatio(unitless);
        } else if (context.lineHeightOutput === 'percentage') {
          return `${roundToPrecision(lineHeight.value)}%`;
        } else {
          // Convert to dimension format
          if (context.useRem) {
            return this.formatDimension(unitless, 'rem', context);
          } else {
            const pxValue = unitless * context.baseFontSize;
            return this.formatDimension(pxValue, 'px', context);
          }
        }
      }

      case 'PIXELS':
        if (context.lineHeightOutput === 'ratio') {
          // Convert pixels to unitless ratio (assuming base font size)
          return this.formatRatio(lineHeight.value / context.baseFontSize);
        } else if (context.lineHeightOutput === 'percentage') {
          const percentValue = (lineHeight.value / context.baseFontSize) * 100;
          return `${roundToPrecision(percentValue)}%`;
        } else {
          // Return as dimension
          if (context.useRem) {
            const remValue = lineHeight.value / context.baseFontSize;
            return this.formatDimension(remValue, 'rem', context);
          } else {
            return this.formatDimension(lineHeight.value, 'px', context);
          }
        }

      case 'AUTO':
      default:
        // Default multiplier
        if (context.lineHeightOutput === 'percentage') {
          return '120%';
        }
        return 1.2;
    }
  }

  /**
   * Extracts font style (italic/oblique) from font weight string.
   *
   * @param fontStyle Figma font style name (e.g., "Bold Italic")
   * @returns Font style value
   */
  private extractFontStyle(fontStyle: string): 'normal' | 'italic' | 'oblique' {
    const lowerStyle = fontStyle.toLowerCase();

    if (lowerStyle.includes('italic')) {
      return 'italic';
    }

    if (lowerStyle.includes('oblique')) {
      return 'oblique';
    }

    return 'normal';
  }

  /**
   * Converts Figma text decoration to DTCG format.
   *
   * @param figmaTextDecoration Figma text decoration value
   * @returns DTCG text decoration value
   */
  private convertFigmaTextDecoration(
    figmaTextDecoration: string
  ): 'none' | 'underline' | 'line-through' | null {
    switch (figmaTextDecoration) {
      case 'NONE':
        return 'none';
      case 'UNDERLINE':
        return 'underline';
      case 'STRIKETHROUGH':
        return 'line-through';
      default:
        return null;
    }
  }

  /**
   * Extracts weight name from font style string.
   * Delegates to the shared font-weight utility (single source of truth).
   *
   * @param fontStyle Font style name (e.g., "Bold Italic")
   * @returns Weight name (e.g., "bold")
   */
  private extractWeightName(fontStyle: string): string {
    return extractWeightName(fontStyle);
  }

  /**
   * Gets expected numeric font weight from style name.
   * Delegates to the shared font-weight utility (single source of truth) so
   * the composite fallback path and the standalone-weight path cannot drift.
   *
   * @param fontStyle Font style name
   * @returns Numeric font weight
   */
  private getExpectedFontWeight(fontStyle: string): number {
    return getExpectedFontWeight(fontStyle);
  }

  /**
   * Creates a DTCG alias reference from a variable, honouring the caller's
   * token-name casing mode. Delegates to the shared token-name utility so this
   * cannot drift from the exporter or BaseConverter.
   *
   * @param variable Variable to reference
   * @param nameCase Casing mode; defaults to 'preserve'
   * @param namespace Export namespace, so the reference resolves through the
   *   root wrapper the exporter adds
   * @returns DTCG alias string
   */
  private createAlias(variable: Variable, nameCase?: TokenNameCase, namespace?: string): string {
    return createAliasReference(variable.name, nameCase, namespace);
  }
}
