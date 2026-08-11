/**
 * Color token converter.
 * Handles conversion of Figma color variables to DTCG color format.
 */

import { PRECISION } from '../../constants';
import { ConversionContext, RGBColor } from '../../types/converter-types';
import { DTCGColor } from '../../types/dtcg';
import { BaseConverter } from './base-converter';

/**
 * Converter for color tokens.
 * Converts Figma RGB colors to DTCG sRGB color space format.
 */
export class ColorConverter extends BaseConverter<DTCGColor | string> {
  /**
   * Checks if this converter can handle the given variable.
   */
  canConvert(variable: Variable, context: ConversionContext): boolean {
    return variable.resolvedType === 'COLOR';
  }

  /**
   * Converts a color variable to DTCG format.
   */
  convert(variable: Variable, context: ConversionContext): DTCGColor | string {
    // Get the first mode value (all modes should have the same type)
    const firstModeId = Object.keys(variable.valuesByMode)[0];
    if (!firstModeId) {
      return this.createDefaultColor();
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

    // Convert RGB to DTCG color
    return this.convertToDTCG(value as RGB);
  }

  /**
   * Converts RGB color to DTCG sRGB format.
   * Public so the shadow converter can emit DTCG color objects when the
   * user has selected colorFormat='dtcg'.
   *
   * @param color RGB color from Figma
   * @returns DTCG color object
   */
  // RGB | RGBA: Figma hands both, and the alpha read below is already guarded for the RGB case.
  // Typed as bare RGB the guard was unreachable code the compiler rejected.
  convertToDTCG(color: RGB | RGBA): DTCGColor {
    return {
      colorSpace: 'srgb',
      components: [
        Math.round(color.r * 10000) / 10000, // 4 decimal precision
        Math.round(color.g * 10000) / 10000,
        Math.round(color.b * 10000) / 10000,
      ],
      // `'a' in color`, not `color.a !== undefined`: RGB has no `a` at all, so the undefined-check
      // could not narrow the union. Same runtime result — absent alpha still falls through to 1.
      alpha:
        'a' in color ? Math.round(color.a * PRECISION.DECIMAL_3) / PRECISION.DECIMAL_3 : 1,
    };
  }

  /**
   * Converts RGB color to CSS color string.
   * Used for shadow tokens where Style Dictionary expects strings.
   *
   * @param color RGB color from Figma
   * @returns CSS color string (rgb or rgba)
   */
  convertToCSS(color: RGB | RGBA): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a =
      'a' in color ? Math.round(color.a * PRECISION.DECIMAL_3) / PRECISION.DECIMAL_3 : 1;

    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Converts RGB to hex color string.
   *
   * @param r Red component (0-1)
   * @param g Green component (0-1)
   * @param b Blue component (0-1)
   * @param alpha Optional alpha component (0-1)
   * @returns Hex color string (e.g., "#ff0000" or "#ff000080" with alpha)
   */
  convertToHex(r: number, g: number, b: number, alpha?: number): string {
    const toHex = (component: number): string => {
      const value = Math.round(component * 255);
      const hex = value.toString(16).padStart(2, '0');
      return hex;
    };

    const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    // Add alpha channel if present and not fully opaque
    if (alpha !== undefined && alpha < 1) {
      return `${hexColor}${toHex(alpha)}`;
    }

    return hexColor;
  }

  /**
   * Creates a default black color.
   */
  private createDefaultColor(): DTCGColor {
    return {
      colorSpace: 'srgb',
      components: [0, 0, 0],
      alpha: 1,
    };
  }
}
