/**
 * Unit tests for DTCG validator
 */

import { describe, test, expect, beforeEach } from '../../test-harness';
import { DTCGValidator, validateDTCGFile, DTCG_SPEC } from '../../src/utils/dtcg-validator';
import { DTCGFile, DTCGToken } from '../../src/types/dtcg';

describe('DTCG Validator', () => {
  let validator: DTCGValidator;

  beforeEach(() => {
    validator = new DTCGValidator();
  });

  describe('DTCG Specification Constants', () => {
    test('should define correct media type', () => {
      expect(DTCG_SPEC.MEDIA_TYPE).toBe('application/design-tokens+json');
    });

    test('should define correct file extensions', () => {
      expect(DTCG_SPEC.FILE_EXTENSIONS).toContain('.tokens');
      expect(DTCG_SPEC.FILE_EXTENSIONS).toContain('.tokens.json');
    });

    test('should define core and experimental token types', () => {
      expect(DTCG_SPEC.CORE_TYPES).toContain('color');
      expect(DTCG_SPEC.CORE_TYPES).toContain('dimension');
      expect(DTCG_SPEC.CORE_TYPES).toContain('typography');
      expect(DTCG_SPEC.CORE_TYPES).toContain('shadow');
      
      expect(DTCG_SPEC.EXPERIMENTAL_TYPES).toContain('duration');
      expect(DTCG_SPEC.EXPERIMENTAL_TYPES).toContain('border');
    });

    test('should define invalid name characters', () => {
      expect(DTCG_SPEC.INVALID_NAME_CHARS).toContain('{');
      expect(DTCG_SPEC.INVALID_NAME_CHARS).toContain('}');
      expect(DTCG_SPEC.INVALID_NAME_CHARS).toContain('.');
    });
  });

  describe('Token Name Validation', () => {
    test('should reject names starting with $', () => {
      const file: DTCGFile = {
        '$invalid': {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] }
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_NAME_PREFIX');
    });

    test('should reject names with invalid characters', () => {
      const file: DTCGFile = {
        'invalid{name}': {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] }
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_NAME_CHARS')).toBe(true);
    });

    test('should accept valid names', () => {
      const file: DTCGFile = {
        'valid-name_123': {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] }
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Token Structure Validation', () => {
    test('should require $value property', () => {
      const file: DTCGFile = {
        'valid-name': {
          $type: 'color'
          // Missing $value
        } as DTCGToken
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MISSING_VALUE');
    });

    test('should warn about missing $type', () => {
      const file: DTCGFile = {
        'warning': {
          $value: { colorSpace: 'srgb', components: [1, 0, 0] }
          // Missing $type
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(true); // Valid but with warnings
      expect(result.warnings[0].code).toBe('MISSING_TYPE');
    });

    test('should validate $description type', () => {
      const file: DTCGFile = {
        'invalid': {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
          $description: 123 // Should be string
        } as any
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_DESCRIPTION');
    });

    test('should validate $deprecated type', () => {
      const file: DTCGFile = {
        'invalid': {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
          $deprecated: 123 // Should be boolean or string
        } as any
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_DEPRECATED');
    });
  });

  describe('Color Token Validation', () => {
    test('should validate valid color token', () => {
      const file: DTCGFile = {
        'valid-color': {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0.5, 0],
            alpha: 0.8
          }
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(true);
    });

    test('should require colorSpace', () => {
      const file: DTCGFile = {
        'invalid-color': {
          $type: 'color',
          $value: {
            components: [1, 0, 0]
            // Missing colorSpace
          } as any
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MISSING_COLOR_SPACE');
    });

    test('should require components array', () => {
      const file: DTCGFile = {
        'invalid-color': {
          $type: 'color',
          $value: {
            colorSpace: 'srgb'
            // Missing components
          } as any
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MISSING_COLOR_COMPONENTS');
    });

    test('should validate components array length', () => {
      const file: DTCGFile = {
        'invalid-color': {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0] // Should have 3 components
          }
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_COLOR_COMPONENTS');
    });

    test('should validate component values range', () => {
      const file: DTCGFile = {
        'invalid-color': {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1.5, 0, 0] // Values should be 0-1
          }
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_COLOR_COMPONENT');
    });

    test('should validate alpha range', () => {
      const file: DTCGFile = {
        'invalid-color': {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
            alpha: 1.5 // Should be 0-1
          }
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_COLOR_ALPHA');
    });
  });

  describe('Dimension Token Validation', () => {
    test('should validate valid dimension token', () => {
      const file: DTCGFile = {
        'valid-dimension': {
          $type: 'dimension',
          $value: {
            value: 16,
            unit: 'px'
          }
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(true);
    });

    test('should require numeric value', () => {
      const file: DTCGFile = {
        'invalid-dimension': {
          $type: 'dimension',
          $value: {
            value: '16', // Should be number
            unit: 'px'
          } as any
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_DIMENSION_NUMBER');
    });

    test('should require string unit', () => {
      const file: DTCGFile = {
        'invalid-dimension': {
          $type: 'dimension',
          $value: {
            value: 16,
            unit: 123 // Should be string
          } as any
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_DIMENSION_UNIT');
    });
  });

  describe('Font Family Token Validation', () => {
    test('should validate valid font family token', () => {
      const file: DTCGFile = {
        'valid-font': {
          $type: 'fontFamily',
          $value: ['Inter', 'Helvetica', 'sans-serif']
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(true);
    });

    test('should require array value', () => {
      const file: DTCGFile = {
        'invalid-font': {
          $type: 'fontFamily',
          $value: 'Inter' // Should be array
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FONT_FAMILY_VALUE');
    });

    test('should require string font names', () => {
      const file: DTCGFile = {
        'invalid-font': {
          $type: 'fontFamily',
          $value: ['Inter', 123] // Font names should be strings
        } as any
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FONT_NAME');
    });
  });

  describe('Font Weight Token Validation', () => {
    test('should validate numeric font weight', () => {
      const file: DTCGFile = {
        'valid-weight': {
          $type: 'fontWeight',
          $value: 400
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(true);
    });

    test('should validate keyword font weight', () => {
      const file: DTCGFile = {
        'valid-weight': {
          $type: 'fontWeight',
          $value: 'bold'
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Experimental Type Handling', () => {
    test('should warn about experimental token types', () => {
      const file: DTCGFile = {
        'experimental': {
          $type: 'duration',
          $value: { value: 250, unit: 'ms' }
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(true); // Valid but with warnings
      expect(result.warnings.some(w => w.code === 'EXPERIMENTAL_TYPE')).toBe(true);
    });

    test('should not validate structure of experimental types', () => {
      const file: DTCGFile = {
        'experimental': {
          $type: 'border',
          $value: 'invalid-structure' // This won't be validated since it's experimental
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(true); // No structure validation for experimental types
      expect(result.warnings.some(w => w.code === 'EXPERIMENTAL_TYPE')).toBe(true);
    });
  });

  describe('Font Weight Token Validation (continued)', () => {
    test('should reject invalid numeric range', () => {
      const file: DTCGFile = {
        'invalid-weight': {
          $type: 'fontWeight',
          $value: 1500 // Out of valid range
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FONT_WEIGHT_NUMBER');
    });

    test('should reject invalid keyword', () => {
      const file: DTCGFile = {
        'invalid-weight': {
          $type: 'fontWeight',
          $value: 'invalid'
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FONT_WEIGHT_KEYWORD');
    });
  });

  describe('Reference Validation', () => {
    test('should allow references in token values', () => {
      const file: DTCGFile = {
        'base-color': {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] }
        },
        'ref-color': {
          $type: 'color',
          $value: '{base-color}'
        }
      };

      const result = validator.validateFile(file);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Convenience Function', () => {
    test('validateDTCGFile should work', () => {
      const file: DTCGFile = {
        'valid': {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] }
        }
      };

      const result = validateDTCGFile(file);
      expect(result.isValid).toBe(true);
    });
  });
});