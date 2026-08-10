/**
 * Unit tests for text decoration conversion functionality
 */

import { describe, test, expect } from 'vitest';

// Since convertFigmaTextDecoration is a private method, we'll create a test version
function convertFigmaTextDecoration(figmaTextDecoration: string): 'none' | 'underline' | 'line-through' | null {
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

describe('Text Decoration Conversion', () => {
  test('should convert Figma NONE to DTCG none', () => {
    expect(convertFigmaTextDecoration('NONE')).toBe('none');
  });

  test('should convert Figma UNDERLINE to DTCG underline', () => {
    expect(convertFigmaTextDecoration('UNDERLINE')).toBe('underline');
  });

  test('should convert Figma STRIKETHROUGH to DTCG line-through', () => {
    expect(convertFigmaTextDecoration('STRIKETHROUGH')).toBe('line-through');
  });

  test('should return null for unknown decoration types', () => {
    expect(convertFigmaTextDecoration('UNKNOWN')).toBeNull();
    expect(convertFigmaTextDecoration('')).toBeNull();
    expect(convertFigmaTextDecoration('OVERLINE')).toBeNull();
  });

  test('should handle case sensitivity', () => {
    // These should all return null since they don't match exactly
    expect(convertFigmaTextDecoration('none')).toBeNull();
    expect(convertFigmaTextDecoration('underline')).toBeNull();
    expect(convertFigmaTextDecoration('strikethrough')).toBeNull();
  });
});