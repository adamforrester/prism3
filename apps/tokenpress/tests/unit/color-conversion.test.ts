/**
 * Unit tests for color conversion functionality
 */

import { describe, test, expect } from '../../test-harness';

// Test version of color conversion function from TokenExporter
function convertColor(color: { r: number; g: number; b: number; a?: number }): {
  colorSpace: string;
  components: number[];
  alpha?: number;
} {
  const result: any = {
    colorSpace: 'srgb',
    components: [
      Math.round(color.r * 255) / 255,
      Math.round(color.g * 255) / 255,
      Math.round(color.b * 255) / 255
    ]
  };
  if (color.a !== undefined && color.a < 1) {
    result.alpha = color.a;
  }
  return result;
}

describe('Color Conversion', () => {
  test('should convert RGB colors to DTCG format', () => {
    const red = { r: 1, g: 0, b: 0 };
    const result = convertColor(red);
    
    expect(result.colorSpace).toBe('srgb');
    expect(result.components).toEqual([1, 0, 0]);
    expect(result.alpha).toBeUndefined();
  });

  test('should handle colors with alpha channel', () => {
    const transparentBlue = { r: 0, g: 0, b: 1, a: 0.5 };
    const result = convertColor(transparentBlue);
    
    expect(result.colorSpace).toBe('srgb');
    expect(result.components).toEqual([0, 0, 1]);
    expect(result.alpha).toBe(0.5);
  });

  test('should not include alpha for fully opaque colors', () => {
    const opaqueGreen = { r: 0, g: 1, b: 0, a: 1 };
    const result = convertColor(opaqueGreen);
    
    expect(result.alpha).toBeUndefined();
  });

  test('should round color values properly', () => {
    // Test rounding behavior for edge cases
    const color = { r: 0.996, g: 0.004, b: 0.5 };
    const result = convertColor(color);
    
    // 0.996 * 255 = 254.28, rounded = 254, then 254/255 ≈ 0.996
    // 0.004 * 255 = 1.02, rounded = 1, then 1/255 ≈ 0.004
    // 0.5 * 255 = 127.5, rounded = 128, then 128/255 ≈ 0.502
    expect(result.components[0]).toBeCloseTo(0.996, 3);
    expect(result.components[1]).toBeCloseTo(0.004, 3);
    expect(result.components[2]).toBeCloseTo(0.502, 3);
  });

  test('should handle edge values (0 and 1)', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 1, g: 1, b: 1 };
    
    const blackResult = convertColor(black);
    const whiteResult = convertColor(white);
    
    expect(blackResult.components).toEqual([0, 0, 0]);
    expect(whiteResult.components).toEqual([1, 1, 1]);
  });

  test('should handle mid-range values', () => {
    const gray = { r: 0.5, g: 0.5, b: 0.5 };
    const result = convertColor(gray);
    
    // 0.5 * 255 = 127.5, rounded = 128, then 128/255 ≈ 0.502
    expect(result.components[0]).toBeCloseTo(0.502, 3);
    expect(result.components[1]).toBeCloseTo(0.502, 3);
    expect(result.components[2]).toBeCloseTo(0.502, 3);
  });

  test('should handle zero alpha', () => {
    const transparent = { r: 1, g: 1, b: 1, a: 0 };
    const result = convertColor(transparent);
    
    expect(result.alpha).toBe(0);
  });

  test('should handle near-opaque alpha', () => {
    const nearOpaque = { r: 1, g: 1, b: 1, a: 0.99 };
    const result = convertColor(nearOpaque);
    
    expect(result.alpha).toBe(0.99);
  });
});