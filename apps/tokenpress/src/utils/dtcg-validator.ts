/**
 * DTCG Specification Validator
 * Validates design tokens against the official DTCG specification
 * Reference: DTCG_SPECIFICATION.md
 */

import { DTCGToken, DTCGFile } from '../types/dtcg';

export interface ValidationError {
  path: string;
  type: 'error' | 'warning';
  code: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * DTCG Specification Constants
 * Based on official DTCG specification
 */
export const DTCG_SPEC = {
  /** Official media type for DTCG files */
  MEDIA_TYPE: 'application/design-tokens+json',

  /** Recommended file extensions */
  FILE_EXTENSIONS: ['.tokens', '.tokens.json'],

  /** Reserved property names that start with $ */
  RESERVED_PROPERTIES: ['$value', '$type', '$description', '$extensions', '$deprecated'],

  /** Core token types widely supported and stable */
  CORE_TYPES: [
    // Core primitive types - widely adopted
    'color',
    'dimension',
    'fontFamily',
    'fontWeight',
    'number',
    // Core composite types - widely adopted
    'typography',
    'shadow',
  ],

  /** Extended token types - may be draft or less widely supported */
  EXPERIMENTAL_TYPES: [
    'duration',
    'cubicBezier',
    'strokeStyle',
    'border',
    'transition',
    'gradient',
  ],

  /** Characters not allowed in token names */
  INVALID_NAME_CHARS: ['{', '}', '.'],

  /** Valid color spaces */
  COLOR_SPACES: ['srgb', 'p3', 'rec2020', 'hsl'],

  /** Valid dimension units */
  DIMENSION_UNITS: [
    'px',
    'rem',
    'em',
    '%',
    'pt',
    'pc',
    'in',
    'cm',
    'mm',
    'ex',
    'ch',
    'vh',
    'vw',
    'vmin',
    'vmax',
  ],

  /** Valid duration units (experimental) */
  DURATION_UNITS: ['ms', 's'],

  /** Valid border styles (experimental) */
  BORDER_STYLES: ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'],
} as const;

/**
 * DTCG Token Validator
 * Validates tokens against official DTCG specification
 */
export class DTCGValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  /**
   * Validate a complete DTCG file
   */
  validateFile(file: DTCGFile): ValidationResult {
    this.errors = [];
    this.warnings = [];

    this.validateTokensRecursive(file, '');

    return {
      isValid: this.errors.length === 0,
      errors: this.errors.slice(),
      warnings: this.warnings.slice(),
    };
  }

  /**
   * Validate tokens recursively through the token tree
   */
  private validateTokensRecursive(obj: any, currentPath: string): void {
    for (const [key, value] of Object.entries(obj)) {
      const path = currentPath ? `${currentPath}.${key}` : key;

      // Skip valid DTCG meta properties at file level only
      if (
        currentPath === '' &&
        key.startsWith('$') &&
        DTCG_SPEC.RESERVED_PROPERTIES.includes(key)
      ) {
        continue;
      }

      if (this.isToken(value)) {
        // For complete tokens, validate token structure first, then token name
        this.validateToken(value as DTCGToken, path);
        this.validateTokenName(key, path);
      } else if (this.isIncompleteToken(value)) {
        // For incomplete tokens, validate as token (which will catch missing $value) and validate name
        this.validateToken(value as DTCGToken, path);
        this.validateTokenName(key, path);
      } else if (this.isGroup(value)) {
        // For groups, validate name then recurse
        this.validateTokenName(key, path);
        this.validateTokensRecursive(value, path);
      } else {
        // For other objects, just validate the name
        this.validateTokenName(key, path);
      }
    }
  }

  /**
   * Check if an object is a token (has $value property)
   */
  private isToken(obj: any): boolean {
    return obj && typeof obj === 'object' && '$value' in obj;
  }

  /**
   * Check if an object appears to be an incomplete token (has token properties but no $value)
   */
  private isIncompleteToken(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      !('$value' in obj) &&
      ('$type' in obj || '$description' in obj || '$deprecated' in obj || '$extensions' in obj)
    );
  }

  /**
   * Check if an object is a group (object without $value or token properties)
   */
  private isGroup(obj: any): boolean {
    return obj && typeof obj === 'object' && !this.isToken(obj) && !this.isIncompleteToken(obj);
  }

  /**
   * Validate token name according to DTCG rules
   */
  private validateTokenName(name: string, path: string): void {
    // Cannot start with $
    if (name.startsWith('$')) {
      this.addError(path, 'INVALID_NAME_PREFIX', `Token name "${name}" cannot start with $`);
    }

    // Cannot contain restricted characters
    for (const char of DTCG_SPEC.INVALID_NAME_CHARS) {
      if (name.includes(char)) {
        this.addError(
          path,
          'INVALID_NAME_CHARS',
          `Token name "${name}" cannot contain character "${char}"`
        );
      }
    }
  }

  /**
   * Validate a single token
   */
  private validateToken(token: DTCGToken, path: string): void {
    // Required $value property - check this first, before other validations
    if (!('$value' in token) || token.$value === undefined) {
      this.addError(path, 'MISSING_VALUE', 'Token is missing required $value property');
      return; // Don't continue validation if $value is missing
    }

    // Validate $type if present
    if (token.$type) {
      this.validateTokenType(token, path);
    } else {
      this.addWarning(
        path,
        'MISSING_TYPE',
        'Token is missing $type property (recommended for better tooling support)'
      );
    }

    // Validate $description if present
    if (token.$description !== undefined && typeof token.$description !== 'string') {
      this.addError(path, 'INVALID_DESCRIPTION', '$description must be a string');
    }

    // Validate $deprecated if present
    if (token.$deprecated !== undefined) {
      const validTypes = ['boolean', 'string'];
      if (!validTypes.includes(typeof token.$deprecated)) {
        this.addError(path, 'INVALID_DEPRECATED', '$deprecated must be a boolean or string');
      }
    }

    // Validate $extensions if present
    if (token.$extensions !== undefined && typeof token.$extensions !== 'object') {
      this.addError(path, 'INVALID_EXTENSIONS', '$extensions must be an object');
    }
  }

  /**
   * Validate token type and corresponding value structure
   */
  private validateTokenType(token: DTCGToken, path: string): void {
    const type = token.$type;

    // Check if type is in core supported list (concat for ES2018 compatibility)
    const allSupportedTypes = DTCG_SPEC.CORE_TYPES.concat(DTCG_SPEC.EXPERIMENTAL_TYPES);
    if (!allSupportedTypes.includes(type as any)) {
      this.addWarning(
        path,
        'UNKNOWN_TYPE',
        `Token type "${type}" is not in the supported types list`
      );
    } else if (DTCG_SPEC.EXPERIMENTAL_TYPES.includes(type as any)) {
      this.addWarning(
        path,
        'EXPERIMENTAL_TYPE',
        `Token type "${type}" is experimental and may not be widely supported`
      );
    }

    // Type-specific validation for core, stable token types only
    switch (type) {
      case 'color':
        this.validateColorToken(token, path);
        break;
      case 'dimension':
        this.validateDimensionToken(token, path);
        break;
      case 'fontFamily':
        this.validateFontFamilyToken(token, path);
        break;
      case 'fontWeight':
        this.validateFontWeightToken(token, path);
        break;
      case 'number':
        this.validateNumberToken(token, path);
        break;
      case 'typography':
        this.validateTypographyToken(token, path);
        break;
      case 'shadow':
        this.validateShadowToken(token, path);
        break;
      // Experimental types - warn but don't validate structure
      case 'duration':
      case 'cubicBezier':
      case 'strokeStyle':
      case 'border':
      case 'transition':
      case 'gradient':
        // These are experimental - just warn, don't validate structure
        break;
    }
  }

  /**
   * Validate color token value structure
   */
  private validateColorToken(token: DTCGToken, path: string): void {
    const value = token.$value as any;

    if (typeof value === 'string' && this.isReference(value)) {
      return; // References are validated separately
    }

    if (!value || typeof value !== 'object') {
      this.addError(
        path,
        'INVALID_COLOR_VALUE',
        'Color token value must be an object with colorSpace and components'
      );
      return;
    }

    // Required properties
    if (!value.colorSpace) {
      this.addError(path, 'MISSING_COLOR_SPACE', 'Color token must have colorSpace property');
    } else if (!DTCG_SPEC.COLOR_SPACES.includes(value.colorSpace)) {
      this.addWarning(
        path,
        'UNKNOWN_COLOR_SPACE',
        `Color space "${value.colorSpace}" is not in standard list: ${DTCG_SPEC.COLOR_SPACES.join(', ')}`
      );
    }

    if (!Array.isArray(value.components)) {
      this.addError(path, 'MISSING_COLOR_COMPONENTS', 'Color token must have components array');
    } else if (value.components.length !== 3) {
      this.addError(
        path,
        'INVALID_COLOR_COMPONENTS',
        'Color components array must have exactly 3 values'
      );
    } else {
      // Validate component values based on color space
      const isHSL = value.colorSpace === 'hsl';
      value.components.forEach((component: any, index: number) => {
        if (typeof component !== 'number') {
          this.addError(
            path,
            'INVALID_COLOR_COMPONENT',
            `Color component ${index} must be a number`
          );
        } else if (isHSL) {
          const max = index === 0 ? 360 : 100; // H: 0-360, S: 0-100, L: 0-100
          if (component < 0 || component > max) {
            this.addError(
              path,
              'INVALID_COLOR_COMPONENT',
              `HSL component ${index} must be between 0 and ${max}`
            );
          }
        } else if (component < 0 || component > 1) {
          this.addError(
            path,
            'INVALID_COLOR_COMPONENT',
            `Color component ${index} must be a number between 0 and 1`
          );
        }
      });
    }

    // Optional alpha validation
    if (value.alpha !== undefined) {
      if (typeof value.alpha !== 'number' || value.alpha < 0 || value.alpha > 1) {
        this.addError(path, 'INVALID_COLOR_ALPHA', 'Color alpha must be a number between 0 and 1');
      }
    }
  }

  /**
   * Validate dimension token value structure
   */
  private validateDimensionToken(token: DTCGToken, path: string): void {
    const value = token.$value as any;

    if (typeof value === 'string' && this.isReference(value)) {
      return;
    }

    if (!value || typeof value !== 'object') {
      this.addError(
        path,
        'INVALID_DIMENSION_VALUE',
        'Dimension token value must be an object with value and unit'
      );
      return;
    }

    if (typeof value.value !== 'number') {
      this.addError(path, 'INVALID_DIMENSION_NUMBER', 'Dimension value must be a number');
    }

    if (typeof value.unit !== 'string') {
      this.addError(path, 'INVALID_DIMENSION_UNIT', 'Dimension unit must be a string');
    } else if (!DTCG_SPEC.DIMENSION_UNITS.includes(value.unit)) {
      this.addWarning(
        path,
        'UNKNOWN_DIMENSION_UNIT',
        `Dimension unit "${value.unit}" is not in standard list`
      );
    }
  }

  /**
   * Validate font family token
   */
  private validateFontFamilyToken(token: DTCGToken, path: string): void {
    const value = token.$value;

    if (typeof value === 'string' && this.isReference(value)) {
      return;
    }

    if (!Array.isArray(value)) {
      this.addError(
        path,
        'INVALID_FONT_FAMILY_VALUE',
        'Font family token value must be an array of font names'
      );
      return;
    }

    value.forEach((font: any, index: number) => {
      if (typeof font !== 'string') {
        this.addError(path, 'INVALID_FONT_NAME', `Font family item ${index} must be a string`);
      }
    });
  }

  /**
   * Validate font weight token
   */
  private validateFontWeightToken(token: DTCGToken, path: string): void {
    const value = token.$value;

    if (typeof value === 'string' && this.isReference(value)) {
      return;
    }

    if (typeof value === 'number') {
      if (value < 1 || value > 1000 || value % 1 !== 0) {
        this.addError(
          path,
          'INVALID_FONT_WEIGHT_NUMBER',
          'Font weight number must be an integer between 1 and 1000'
        );
      }
    } else if (typeof value === 'string') {
      const validKeywords = ['normal', 'bold', 'lighter', 'bolder'];
      if (!validKeywords.includes(value)) {
        this.addError(
          path,
          'INVALID_FONT_WEIGHT_KEYWORD',
          `Font weight keyword must be one of: ${validKeywords.join(', ')}`
        );
      }
    } else {
      this.addError(
        path,
        'INVALID_FONT_WEIGHT_VALUE',
        'Font weight value must be a number or string keyword'
      );
    }
  }

  // Removed experimental validation methods for duration and cubicBezier
  // These token types are not yet stable in the DTCG specification

  /**
   * Validate number token
   */
  private validateNumberToken(token: DTCGToken, path: string): void {
    const value = token.$value;

    if (typeof value === 'string' && this.isReference(value)) {
      return;
    }

    if (typeof value !== 'number') {
      this.addError(path, 'INVALID_NUMBER_VALUE', 'Number token value must be a number');
      return;
    }

    // Opacity range (#709). The type check above is all this method used to do, which is exactly
    // how a value 100× out of range shipped: `5` is a perfectly good number, and nothing here
    // asked what it MEANT. An opacity is a 0–1 fraction, so a value outside that band is either
    // an unconverted Figma percent or a genuine authoring error, and both are worth saying.
    //
    // SCOPED BY NAME, AND ONLY A WARNING — both halves are deliberate.
    //
    // Not a blanket 0–1 rule on `$type: number`: measured against the emitted brands, 98 of 250
    // number tokens are legitimately outside 0–1 (every line-height, every grid column count), so
    // a general rule would fire on almost 40% of our own correct output. `number` carries no unit
    // and no semantics — the NAME is the only signal available at this layer, since the Figma
    // OPACITY scope that drove the conversion is long gone by the time a DTCG file is validated.
    //
    // And a warning, not an error, because that name match is a heuristic: this validator runs
    // over arbitrary third-party files, where `opacity` could plausibly name something else. On
    // the two corpora we can check, all 112 opacity-named number tokens are inside 0–1, so the
    // false-positive rate is currently zero — but a heuristic that hard-failed someone else's
    // export on a naming coincidence would be worse than the bug it guards.
    if (/(^|[.\-_/])opacit/i.test(path) && (value < 0 || value > 1)) {
      this.addWarning(
        path,
        'OPACITY_OUT_OF_RANGE',
        `Opacity value ${value} is outside the 0–1 range; a Figma percent (0–100) may not have been converted`
      );
    }
  }

  /**
   * Validate typography composite token
   */
  private validateTypographyToken(token: DTCGToken, path: string): void {
    const value = token.$value as any;

    if (typeof value === 'string' && this.isReference(value)) {
      return;
    }

    if (!value || typeof value !== 'object') {
      this.addError(path, 'INVALID_TYPOGRAPHY_VALUE', 'Typography token value must be an object');
      return;
    }

    // Validate fontSize as dimension type (DTCG compliance)
    if (value.fontSize !== undefined) {
      if (typeof value.fontSize === 'string' && this.isReference(value.fontSize)) {
        // Reference is valid
      } else if (
        typeof value.fontSize === 'object' &&
        value.fontSize.value !== undefined &&
        value.fontSize.unit !== undefined
      ) {
        if (typeof value.fontSize.value !== 'number') {
          this.addError(
            path,
            'INVALID_TYPOGRAPHY_FONTSIZE_VALUE',
            'Typography fontSize value must be a number'
          );
        }
        if (typeof value.fontSize.unit !== 'string') {
          this.addError(
            path,
            'INVALID_TYPOGRAPHY_FONTSIZE_UNIT',
            'Typography fontSize unit must be a string'
          );
        }
      } else {
        this.addError(
          path,
          'INVALID_TYPOGRAPHY_FONTSIZE',
          'Typography fontSize must be a dimension object with value and unit, or a reference'
        );
      }
    }

    // Validate fontWeight as number (DTCG compliance)
    if (value.fontWeight !== undefined) {
      if (typeof value.fontWeight === 'string' && this.isReference(value.fontWeight)) {
        // Reference is valid
      } else if (typeof value.fontWeight === 'number') {
        if (value.fontWeight < 1 || value.fontWeight > 1000 || value.fontWeight % 1 !== 0) {
          this.addError(
            path,
            'INVALID_TYPOGRAPHY_FONTWEIGHT',
            'Typography fontWeight must be an integer between 1 and 1000'
          );
        }
      } else {
        this.addError(
          path,
          'INVALID_TYPOGRAPHY_FONTWEIGHT_TYPE',
          'Typography fontWeight must be a number or reference'
        );
      }
    }

    // Validate letterSpacing as dimension type (DTCG compliance)
    if (value.letterSpacing !== undefined) {
      if (typeof value.letterSpacing === 'string' && this.isReference(value.letterSpacing)) {
        // Reference is valid
      } else if (
        typeof value.letterSpacing === 'object' &&
        value.letterSpacing.value !== undefined &&
        value.letterSpacing.unit !== undefined
      ) {
        if (typeof value.letterSpacing.value !== 'number') {
          this.addError(
            path,
            'INVALID_TYPOGRAPHY_LETTERSPACING_VALUE',
            'Typography letterSpacing value must be a number'
          );
        }
        if (typeof value.letterSpacing.unit !== 'string') {
          this.addError(
            path,
            'INVALID_TYPOGRAPHY_LETTERSPACING_UNIT',
            'Typography letterSpacing unit must be a string'
          );
        }
      } else {
        this.addError(
          path,
          'INVALID_TYPOGRAPHY_LETTERSPACING',
          'Typography letterSpacing must be a dimension object with value and unit, or a reference'
        );
      }
    }

    // Validate fontStyle if present (DTCG compliance for italic extraction)
    if (value.fontStyle !== undefined) {
      if (typeof value.fontStyle === 'string' && this.isReference(value.fontStyle)) {
        // Reference is valid
      } else if (typeof value.fontStyle === 'string') {
        const validFontStyles = ['normal', 'italic', 'oblique'];
        if (!validFontStyles.includes(value.fontStyle)) {
          this.addError(
            path,
            'INVALID_TYPOGRAPHY_FONTSTYLE',
            `Typography fontStyle must be one of: ${validFontStyles.join(', ')}`
          );
        }
      } else {
        this.addError(
          path,
          'INVALID_TYPOGRAPHY_FONTSTYLE_TYPE',
          'Typography fontStyle must be a string or reference'
        );
      }
    }

    // Validate fontFamily as array of strings
    if (value.fontFamily !== undefined) {
      if (typeof value.fontFamily === 'string' && this.isReference(value.fontFamily)) {
        // Reference is valid
      } else if (Array.isArray(value.fontFamily)) {
        value.fontFamily.forEach((font: any, index: number) => {
          if (typeof font !== 'string') {
            this.addError(
              path,
              'INVALID_TYPOGRAPHY_FONTFAMILY_ITEM',
              `Typography fontFamily item ${index} must be a string`
            );
          }
        });
      } else {
        this.addError(
          path,
          'INVALID_TYPOGRAPHY_FONTFAMILY',
          'Typography fontFamily must be an array of font names or a reference'
        );
      }
    }

    // Validate lineHeight as number (unitless multiplier)
    if (value.lineHeight !== undefined) {
      if (typeof value.lineHeight === 'string' && this.isReference(value.lineHeight)) {
        // Reference is valid
      } else if (typeof value.lineHeight !== 'number') {
        this.addError(
          path,
          'INVALID_TYPOGRAPHY_LINEHEIGHT',
          'Typography lineHeight must be a unitless number or reference'
        );
      }
    }
  }

  /**
   * Validate shadow composite token
   */
  private validateShadowToken(token: DTCGToken, path: string): void {
    const value = token.$value;

    if (typeof value === 'string' && this.isReference(value)) {
      return;
    }

    // Shadow can be a single shadow object or array of shadow objects
    const shadows = Array.isArray(value) ? value : [value];

    shadows.forEach((shadow: any, index: number) => {
      if (!shadow || typeof shadow !== 'object') {
        this.addError(path, 'INVALID_SHADOW_OBJECT', `Shadow ${index} must be an object`);
        return;
      }

      // Validate required shadow properties
      const requiredProps = ['color', 'offsetX', 'offsetY', 'blur'];
      for (const prop of requiredProps) {
        if (shadow[prop] === undefined) {
          this.addError(
            path,
            'MISSING_SHADOW_PROPERTY',
            `Shadow ${index} is missing required property: ${prop}`
          );
        }
      }
    });
  }

  // Removed experimental validation method for border tokens
  // Border composite tokens are not yet stable in the DTCG specification

  /**
   * Check if a value is a token reference
   */
  private isReference(value: any): boolean {
    return typeof value === 'string' && value.startsWith('{') && value.endsWith('}');
  }

  /**
   * Add validation error
   */
  private addError(path: string, code: string, message: string): void {
    this.errors.push({
      path,
      type: 'error',
      code,
      message,
    });
  }

  /**
   * Add validation warning
   */
  private addWarning(path: string, code: string, message: string): void {
    this.warnings.push({
      path,
      type: 'warning',
      code,
      message,
    });
  }
}

/**
 * Convenience function to validate a DTCG file
 */
export function validateDTCGFile(file: DTCGFile): ValidationResult {
  const validator = new DTCGValidator();
  return validator.validateFile(file);
}
