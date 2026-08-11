/**
 * Unit tests for the shared font weight utility functions.
 *
 * These test the REAL production functions in src/utils/font-weight-utils.ts,
 * which are the single source of truth consumed by both the TypographyConverter
 * (composite fallback path) and the VariableCacheManager (standalone weight path).
 * Previously each caller had its own name->number implementation; they could
 * drift, and the inline ladder in TypographyConverter mis-mapped the unspaced
 * canonical face names (ExtraLight -> 300, ExtraBold -> 700). See
 * VMLYR/token-forge#53 and adamforrester/prism3-tokens#105.
 */

import { describe, test, expect } from '../../test-harness';
import { getExpectedFontWeight, extractWeightName } from '../../src/utils/font-weight-utils';

describe('Font Weight Parsing', () => {
  describe('getExpectedFontWeight', () => {
    test('should parse numeric weights from font styles', () => {
      expect(getExpectedFontWeight('Inter 400')).toBe(400);
      expect(getExpectedFontWeight('Inter 700')).toBe(700);
      expect(getExpectedFontWeight('Roboto 300')).toBe(300);
      expect(getExpectedFontWeight('OpenSans 600')).toBe(600);
    });

    test('should handle named weights', () => {
      expect(getExpectedFontWeight('Regular')).toBe(400);
      expect(getExpectedFontWeight('Bold')).toBe(700);
      expect(getExpectedFontWeight('Light')).toBe(300);
      expect(getExpectedFontWeight('Medium')).toBe(500);
      expect(getExpectedFontWeight('Thin')).toBe(100);
      expect(getExpectedFontWeight('Black')).toBe(900);
    });

    test('should handle italic variants', () => {
      expect(getExpectedFontWeight('Bold Italic')).toBe(700);
      expect(getExpectedFontWeight('Medium Italic')).toBe(500);
      expect(getExpectedFontWeight('Light Italic')).toBe(300);
      expect(getExpectedFontWeight('Italic')).toBe(400); // Should default to regular
    });

    test('should handle oblique variants', () => {
      expect(getExpectedFontWeight('Bold Oblique')).toBe(700);
      expect(getExpectedFontWeight('Medium Oblique')).toBe(500);
    });

    test('should default to 400 for unknown styles', () => {
      expect(getExpectedFontWeight('UnknownStyle')).toBe(400);
      expect(getExpectedFontWeight('')).toBe(400);
      expect(getExpectedFontWeight('Mystery Weight')).toBe(400);
    });

    // Regression: the inline-ladder path returned 300/700 for these because it
    // tested spaced forms ('extra light'/'extra bold') while the canonical
    // Figma face names are UNSPACED. token-forge#53.
    test('should map unspaced compound face names to the correct weight', () => {
      expect(getExpectedFontWeight('Inter SemiBold')).toBe(600);
      expect(getExpectedFontWeight('Roboto ExtraBold')).toBe(800);
      expect(getExpectedFontWeight('OpenSans ExtraLight')).toBe(200);
      expect(getExpectedFontWeight('ExtraLight')).toBe(200);
      expect(getExpectedFontWeight('ExtraBold')).toBe(800);
      expect(getExpectedFontWeight('UltraLight')).toBe(200);
      expect(getExpectedFontWeight('UltraBold')).toBe(800);
    });

    // Regression: a non-weight number embedded in the face name must NOT be
    // read as the weight. Only a standalone 3-digit token is a weight (100-900).
    // Helvetica Neue Linotype names ("45 Light", "75 Bold") and optical-size
    // strings ("Inter 18pt Regular") are real Figma fontName.style values.
    test('should not treat non-weight embedded numbers as the weight', () => {
      expect(getExpectedFontWeight('45 Light')).toBe(300);
      expect(getExpectedFontWeight('55 Roman')).toBe(400);
      expect(getExpectedFontWeight('75 Bold')).toBe(700);
      expect(getExpectedFontWeight('Inter 18pt Regular')).toBe(400);
      expect(getExpectedFontWeight('V2 Bold')).toBe(700);
    });

    // Regression: family-prefixed hairline/roman must resolve via the substring
    // scan, not fall through to 400.
    test('should resolve family-prefixed hairline and roman faces', () => {
      expect(getExpectedFontWeight('Hairline')).toBe(100);
      expect(getExpectedFontWeight('Inter Hairline')).toBe(100);
      expect(getExpectedFontWeight('Roman')).toBe(400);
      expect(getExpectedFontWeight('Inter Roman')).toBe(400);
    });

    // getExpectedFontWeight and extractWeightName feed the same cache-key
    // machinery, so they must recognize the same set of weight faces.
    test('should agree with extractWeightName on recognized faces', () => {
      expect(extractWeightName('Hairline')).toBe('hairline');
      expect(extractWeightName('Roman')).toBe('roman');
    });

    // Regression: hyphenated compound faces must resolve the same as spaced /
    // unspaced forms, and both functions must agree. normalizeStyle strips
    // hyphens so "Extra-Bold" == "extrabold".
    test('should handle hyphenated compound faces', () => {
      expect(getExpectedFontWeight('Extra-Bold')).toBe(800);
      expect(getExpectedFontWeight('Semi-Bold')).toBe(600);
      expect(getExpectedFontWeight('Extra-Light')).toBe(200);
      expect(extractWeightName('Extra-Bold')).toBe('extrabold');
      expect(extractWeightName('Semi-Bold')).toBe('semibold');
      expect(extractWeightName('Extra-Light')).toBe('extralight');
    });

    // Cross-function parity guard: whenever a face resolves to a non-default
    // weight, it must also yield a non-default weight NAME. These feed the same
    // cache-key machinery (cache-manager.ts) and must not desync.
    test('getExpectedFontWeight and extractWeightName agree on recognized faces', () => {
      const faces = [
        'Thin', 'ExtraLight', 'Extra-Light', 'Light', 'Regular', 'Medium',
        'Semi Bold', 'SemiBold', 'Semi-Bold', 'Bold', 'ExtraBold', 'Extra-Bold',
        'Black', 'Hairline', 'Roman', 'Bold Italic', 'ExtraBold Italic',
      ];
      for (const face of faces) {
        if (getExpectedFontWeight(face) !== 400) {
          expect(extractWeightName(face)).not.toBe('regular');
        }
      }
    });

    // The exact forward-emit table the Prism3 engine produces (prism3-tokens#105).
    // Reverse path must recognize every roman + italic spelling and map back to
    // the same numeric. Italic is stripped before lookup; the 400 italic face is
    // the bare string "Italic".
    test('should reverse the Prism3 engine forward-emit table verbatim', () => {
      const table: Array<[string, string, number]> = [
        ['Thin', 'Thin Italic', 100],
        ['ExtraLight', 'ExtraLight Italic', 200],
        ['Light', 'Light Italic', 300],
        ['Regular', 'Italic', 400],
        ['Medium', 'Medium Italic', 500],
        ['Semi Bold', 'Semi Bold Italic', 600],
        ['Bold', 'Bold Italic', 700],
        ['ExtraBold', 'ExtraBold Italic', 800],
        ['Black', 'Black Italic', 900],
      ];
      for (const [roman, italic, expected] of table) {
        expect(getExpectedFontWeight(roman)).toBe(expected);
        expect(getExpectedFontWeight(italic)).toBe(expected);
      }
    });
  });

  describe('extractWeightName', () => {
    test('should extract basic weight names', () => {
      expect(extractWeightName('Bold')).toBe('bold');
      expect(extractWeightName('Medium')).toBe('medium');
      expect(extractWeightName('Light')).toBe('light');
      expect(extractWeightName('Regular')).toBe('regular');
    });

    test('should handle italic variants', () => {
      expect(extractWeightName('Bold Italic')).toBe('bold');
      expect(extractWeightName('Medium Italic')).toBe('medium');
      expect(extractWeightName('Italic')).toBe('regular'); // No weight specified
    });

    test('should handle compound weight names', () => {
      expect(extractWeightName('SemiBold')).toBe('semibold');
      expect(extractWeightName('ExtraBold')).toBe('extrabold');
      expect(extractWeightName('ExtraLight')).toBe('extralight');
      expect(extractWeightName('UltraLight')).toBe('ultralight');
    });

    test('should handle spaced weight names', () => {
      expect(extractWeightName('Semi Bold')).toBe('semibold');
      expect(extractWeightName('Extra Bold')).toBe('extrabold');
      expect(extractWeightName('Extra Light')).toBe('extralight');
    });

    test('should default to regular for unknown weights', () => {
      expect(extractWeightName('UnknownWeight')).toBe('regular');
      expect(extractWeightName('')).toBe('regular');
      expect(extractWeightName('Mystery')).toBe('regular');
    });

    test('should prioritize longer/more specific weight names', () => {
      // Should find 'extrabold' not just 'bold'
      expect(extractWeightName('ExtraBold')).toBe('extrabold');
      // Should find 'semibold' not just 'bold'
      expect(extractWeightName('SemiBold')).toBe('semibold');
    });
  });
});
