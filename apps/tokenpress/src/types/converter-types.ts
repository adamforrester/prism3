/**
 * Type definitions for token converters.
 * Provides proper typing for intermediate values during conversion.
 */

import { DTCGDimension, DTCGColor, DTCGAlias } from './dtcg';
import { TokenNameCase } from './plugin';

/**
 * Typography value structure before DTCG conversion.
 * Represents the intermediate state during typography token processing.
 */
export interface TypographyValue {
  fontFamily: string | DTCGAlias;
  fontSize: DTCGDimension | string | DTCGAlias;
  fontWeight: number | string | DTCGAlias;
  letterSpacing: DTCGDimension | string | DTCGAlias;
  lineHeight: number | DTCGDimension | string | DTCGAlias;
  textDecoration?: string;
  fontStyle?: string;
}

/**
 * Shadow layer structure before DTCG conversion.
 * Represents a single shadow layer with all properties.
 */
export interface ShadowLayer {
  // Color emits as a DTCGColor object under colorFormat='dtcg' (DTCG-spec
  // default) and as a CSS rgb/rgba string under colorFormat='css' (Style
  // Dictionary preset). The CSS shadow formatter handles both shapes.
  color: DTCGColor | string;
  // Dimensions emit as DTCGDimension objects under dimensionFormat=object (the
  // DTCG-spec default) and as CSS-style strings under dimensionFormat=string
  // (Style Dictionary preset). The CSS shadow formatter handles both shapes.
  offsetX: DTCGDimension | string;
  offsetY: DTCGDimension | string;
  blur: DTCGDimension | string;
  spread: DTCGDimension | string;
  inset?: boolean;
}

/**
 * Conversion context passed to converters.
 * Provides access to shared resources needed during conversion.
 */
export interface ConversionContext {
  /** Map of variable IDs to Variable objects for quick lookup */
  variableMap: Map<string, Variable>;
  /** Pre-built cache for O(1) font weight lookups */
  fontWeightCache: Record<string, Variable>;
  /** Pre-built cache for O(1) line height lookups */
  lineHeightCache: Record<string, Variable>;
  /** Whether to use rem units instead of px */
  useRem: boolean;
  /** Base font size for rem calculations (default: 16) */
  baseFontSize: number;
  /** Letter spacing unit preference */
  letterSpacingUnits: 'px' | 'percent';
  /** Line height output format */
  lineHeightOutput: 'ratio' | 'percentage' | 'dimension';
  /** Whether to include Figma-specific extensions */
  includeFigmaExtensions: boolean;
  /**
   * Output shape for dimension tokens.
   * - 'object' (default): DTCG-spec object `{ value, unit }`
   * - 'string': Style Dictionary-friendly string `"16px"`
   */
  dimensionFormat: 'object' | 'string';
  /**
   * Output shape for letter-spacing dimensions.
   * - 'object' (default): DTCG-spec object `{ value, unit }`
   * - 'string': string form `"0.5px"`
   * Percent letter spacing always emits as string regardless of this flag.
   */
  letterSpacingFormat: 'object' | 'string';
  /**
   * Output shape for motion-duration tokens.
   * - 'object' (default): DTCG-spec object `{ value, unit: 'ms' }`
   * - 'string': legacy string form `"50ms"` (Style Dictionary preset)
   */
  durationFormat: 'object' | 'string';
  /**
   * Casing for emitted token names / alias references. Defaults to 'preserve'
   * when absent so converters match the exporter's default.
   */
  tokenNameCase?: TokenNameCase;
  /**
   * Export namespace, when one is configured. Alias references must include it
   * because the exporter wraps each file's tokens under this root key after
   * conversion; without it every reference resolves one level too high.
   */
  namespace?: string;
}

/**
 * Result of a variable value conversion.
 * Can be a primitive value, DTCG dimension, or alias reference.
 */
export type ConvertedValue =
  | string
  | number
  | DTCGDimension
  | DTCGColor
  | DTCGAlias
  | TypographyValue
  | ShadowLayer[];

/**
 * Converter interface for token type conversion.
 * Each token type (color, dimension, etc.) implements this interface.
 */
export interface TokenConverter<T = ConvertedValue> {
  /**
   * Checks if this converter can handle the given variable.
   *
   * @param variable Variable to check
   * @param context Conversion context
   * @returns True if this converter can handle the variable
   */
  canConvert(variable: Variable, context: ConversionContext): boolean;

  /**
   * Converts a variable to its DTCG representation.
   *
   * @param variable Variable to convert
   * @param context Conversion context
   * @returns Converted value
   */
  convert(variable: Variable, context: ConversionContext): T;
}

/**
 * RGB color with optional alpha.
 * Used for color conversion operations.
 */
export interface RGBColor {
  r: number; // 0-1 range
  g: number; // 0-1 range
  b: number; // 0-1 range
  a?: number; // 0-1 range (optional alpha)
}
