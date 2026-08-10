/**
 * Unit tests for token naming and sanitization functions
 */

import { describe, test, expect } from 'vitest';
import {
  sanitizeTokenName as sanitizeTokenNameShared,
  sanitizeFileName,
} from '../../src/utils/token-name-utils';

// These cases were written against the pre-3.0 lowercase behaviour, so they
// pin the 'lower' mode explicitly. Casing-mode coverage (preserve/kebab) lives
// in token-name-utils.test.ts. Previously this file re-implemented the
// sanitizers locally, which meant it passed regardless of the real source —
// it now exercises the shared utility so drift is caught.
function sanitizeTokenName(name: string): string {
  return sanitizeTokenNameShared(name, 'lower');
}

describe('Token Name Sanitization', () => {
  describe('sanitizeTokenName', () => {
    test('should convert basic names to kebab-case', () => {
      expect(sanitizeTokenName('Primary Color')).toBe('primary-color');
      expect(sanitizeTokenName('Button Text')).toBe('button-text');
      expect(sanitizeTokenName('Large Heading')).toBe('large-heading');
    });

    test('should handle path structures', () => {
      expect(sanitizeTokenName('Colors/Primary/Blue')).toBe('colors/primary/blue');
      expect(sanitizeTokenName('Typography/Heading/Large')).toBe('typography/heading/large');
      expect(sanitizeTokenName('Spacing/Margin/Small')).toBe('spacing/margin/small');
    });

    test('should remove special characters', () => {
      expect(sanitizeTokenName('Color (Primary)')).toBe('color-primary');
      expect(sanitizeTokenName('Button & Text')).toBe('button-text');
      expect(sanitizeTokenName('Text@Large#Size')).toBe('text-large-size');
    });

    test('should handle numbers', () => {
      expect(sanitizeTokenName('Heading 1')).toBe('heading-1');
      expect(sanitizeTokenName('Size 16px')).toBe('size-16px');
      expect(sanitizeTokenName('Weight 400')).toBe('weight-400');
    });

    test('should handle edge cases', () => {
      expect(sanitizeTokenName('')).toBe('');
      expect(sanitizeTokenName('---')).toBe('');
      expect(sanitizeTokenName('   ')).toBe('');
      expect(sanitizeTokenName('a')).toBe('a');
    });

    test('should handle complex hierarchical names', () => {
      expect(sanitizeTokenName('Design System/Colors/Primary/Blue 500')).toBe('design-system/colors/primary/blue-500');
      expect(sanitizeTokenName('Components/Button/Text (Hover)')).toBe('components/button/text-hover');
    });
  });

  describe('sanitizeFileName', () => {
    test('should convert names to valid file names', () => {
      expect(sanitizeFileName('Primary Colors')).toBe('primary-colors');
      expect(sanitizeFileName('Button Styles')).toBe('button-styles');
      expect(sanitizeFileName('Text Typography')).toBe('text-typography');
    });

    test('should handle special characters', () => {
      expect(sanitizeFileName('Colors (Light Theme)')).toBe('colors-light-theme');
      expect(sanitizeFileName('Buttons & Links')).toBe('buttons-links');
      expect(sanitizeFileName('Spacing/Margins')).toBe('spacing-margins');
    });

    test('should handle numbers and mixed case', () => {
      expect(sanitizeFileName('Theme2022')).toBe('theme2022');
      expect(sanitizeFileName('Version 2.1')).toBe('version-2-1');
      expect(sanitizeFileName('ComponentsV3')).toBe('componentsv3');
    });

    test('should handle edge cases', () => {
      expect(sanitizeFileName('')).toBe('');
      expect(sanitizeFileName('---')).toBe('');
      expect(sanitizeFileName('@#$%')).toBe('');
      expect(sanitizeFileName('a')).toBe('a');
    });

    test('should not include path separators', () => {
      expect(sanitizeFileName('Colors/Primary')).toBe('colors-primary');
      expect(sanitizeFileName('Assets\\Icons')).toBe('assets-icons');
    });
  });
});