// DTCG (W3C Design Tokens Community Group) TypeScript definitions
// Based on latest draft specification

export type DTCGTokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'string'
  | 'typography'
  | 'shadow'
  | 'border'
  | 'transition';

export interface DTCGColor {
  colorSpace: 'srgb' | 'hsl' | 'hwb' | 'lab' | 'lch' | 'oklch' | 'oklab';
  components: number[];
  alpha?: number;
}

export interface DTCGDimension {
  value: number;
  unit: 'px' | 'rem' | 'em' | '%';
}

export interface DTCGTypography {
  fontFamily: string | DTCGAlias;
  fontSize: DTCGDimension | DTCGAlias;
  fontWeight: number | DTCGAlias;
  letterSpacing: DTCGDimension | DTCGAlias;
  lineHeight: number | DTCGAlias; // DTCG specifies this as a number multiplier
  textDecoration?: 'none' | 'underline' | 'overline' | 'line-through' | DTCGAlias;
}

export interface DTCGShadowLayer {
  color: DTCGColor | DTCGAlias;
  offsetX: DTCGDimension | DTCGAlias;
  offsetY: DTCGDimension | DTCGAlias;
  blur: DTCGDimension | DTCGAlias;
  spread: DTCGDimension | DTCGAlias;
  inset?: boolean;
}

export type DTCGShadow = DTCGShadowLayer | DTCGShadowLayer[];

export interface DTCGAlias {
  $alias: string; // Reference like "{path.to.token}"
}

export type DTCGValue =
  | string
  | number
  | DTCGColor
  | DTCGDimension
  | DTCGTypography
  | DTCGShadow
  | DTCGAlias
  | { value: number; unit: string }; // Duration and other structured values

export interface DTCGToken {
  $type: DTCGTokenType;
  $value: DTCGValue;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, unknown>;
}

// Type for variable conversion return values
export type VariableConversionValue =
  | string
  | number
  | DTCGColor
  | DTCGDimension
  | { value: number; unit: string };

// Type for dynamic JSON object building
export type JsonObject = Record<string, unknown>;

// Type for unknown input that needs runtime validation
export type UnknownValue = unknown;

export interface DTCGTokenGroup {
  [key: string]: DTCGToken | DTCGTokenGroup;
  $extensions?: Record<string, unknown>;
}

export interface DTCGFile extends DTCGTokenGroup {
  $extensions: {
    generator: {
      name: string;
      version: string;
    };
    figma?: {
      collection?: {
        id: string;
        name: string;
        defaultModeId: string;
      };
      mode?: string;
    };
  };
}

// Comprehensive font weight mapping table
export const FONT_WEIGHT_MAP: Record<string, number> = {
  // Standard weights
  thin: 100,
  hairline: 100,
  extralight: 200,
  'extra-light': 200,
  'extra light': 200,
  ultralight: 200,
  'ultra-light': 200,
  'ultra light': 200,
  light: 300,
  regular: 400,
  normal: 400,
  book: 400,
  roman: 400,
  medium: 500,
  semibold: 600,
  'semi-bold': 600,
  'semi bold': 600,
  demibold: 600,
  'demi-bold': 600,
  'demi bold': 600,
  bold: 700,
  extrabold: 800,
  'extra-bold': 800,
  'extra bold': 800,
  ultrabold: 800,
  'ultra-bold': 800,
  'ultra bold': 800,
  black: 900,
  heavy: 900,

  // Italic variations (same numeric values)
  'thin italic': 100,
  'hairline italic': 100,
  'extralight italic': 200,
  'extra-light italic': 200,
  'extra light italic': 200,
  'ultralight italic': 200,
  'ultra-light italic': 200,
  'ultra light italic': 200,
  'light italic': 300,
  'regular italic': 400,
  italic: 400,
  'book italic': 400,
  'roman italic': 400,
  'medium italic': 500,
  'semibold italic': 600,
  'semi-bold italic': 600,
  'semi bold italic': 600,
  'demibold italic': 600,
  'demi-bold italic': 600,
  'demi bold italic': 600,
  'bold italic': 700,
  'extrabold italic': 800,
  'extra-bold italic': 800,
  'extra bold italic': 800,
  'ultrabold italic': 800,
  'ultra-bold italic': 800,
  'ultra bold italic': 800,
  'black italic': 900,
  'heavy italic': 900,
};
