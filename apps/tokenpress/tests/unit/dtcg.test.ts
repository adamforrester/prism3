/**
 * Unit tests for DTCG types and utilities
 */

import { describe, test, expect } from '../../test-harness';
import { FONT_WEIGHT_MAP } from '../../src/types/dtcg';

describe('DTCG Font Weight Constants', () => {
  test('should provide comprehensive font weight mapping', () => {
    // Test all standard weights are present
    const expectedWeights = [
      'thin', 'extralight', 'ultralight', 'light', 'regular', 'normal',
      'medium', 'semibold', 'demibold', 'bold', 'extrabold', 'ultrabold', 'black', 'heavy'
    ];
    
    expectedWeights.forEach(weight => {
      expect(FONT_WEIGHT_MAP[weight]).toBeDefined();
      expect(typeof FONT_WEIGHT_MAP[weight]).toBe('number');
      expect(FONT_WEIGHT_MAP[weight]).toBeGreaterThanOrEqual(100);
      expect(FONT_WEIGHT_MAP[weight]).toBeLessThanOrEqual(900);
    });
  });

  test('should maintain proper weight ordering', () => {
    expect(FONT_WEIGHT_MAP['thin']).toBeLessThan(FONT_WEIGHT_MAP['light']);
    expect(FONT_WEIGHT_MAP['light']).toBeLessThan(FONT_WEIGHT_MAP['regular']);
    expect(FONT_WEIGHT_MAP['regular']).toBeLessThan(FONT_WEIGHT_MAP['medium']);
    expect(FONT_WEIGHT_MAP['medium']).toBeLessThan(FONT_WEIGHT_MAP['semibold']);
    expect(FONT_WEIGHT_MAP['semibold']).toBeLessThan(FONT_WEIGHT_MAP['bold']);
    expect(FONT_WEIGHT_MAP['bold']).toBeLessThan(FONT_WEIGHT_MAP['black']);
  });
});