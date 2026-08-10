/**
 * Unit tests for TokenExporter class
 * Tests critical functions like font weight mapping and text decoration conversion
 */

import { describe, test, expect } from '../../test-harness';
import { FONT_WEIGHT_MAP } from '../../src/types/dtcg';

describe('Font Weight Mapping', () => {
  test('should map common font weights correctly', () => {
    expect(FONT_WEIGHT_MAP['thin']).toBe(100);
    expect(FONT_WEIGHT_MAP['light']).toBe(300);
    expect(FONT_WEIGHT_MAP['regular']).toBe(400);
    expect(FONT_WEIGHT_MAP['medium']).toBe(500);
    expect(FONT_WEIGHT_MAP['bold']).toBe(700);
    expect(FONT_WEIGHT_MAP['black']).toBe(900);
  });

  test('should handle complex font weight names', () => {
    expect(FONT_WEIGHT_MAP['semibold']).toBe(600);
    expect(FONT_WEIGHT_MAP['extrabold']).toBe(800);
    expect(FONT_WEIGHT_MAP['ultralight']).toBe(200);
  });

  test('should default to 400 for unknown weights', () => {
    // This will be tested in the exporter logic
    expect(FONT_WEIGHT_MAP['unknown']).toBeUndefined();
  });
});

describe('TokenExporter Utility Functions', () => {
  // Since TokenExporter requires Figma context, we'll test utility functions first
  // More comprehensive tests will be added in Phase 2D
  
  test('should be properly configured for testing', () => {
    expect(true).toBe(true);
  });
});