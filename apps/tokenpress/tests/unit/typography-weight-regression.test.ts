/**
 * Regression test for the TypographyConverter composite-weight fallback path.
 *
 * When a text style's weight is NOT bound to a variable, the converter infers
 * the numeric weight from the Figma face name. The previous inline ladder tested
 * spaced forms only, so the unspaced canonical faces "ExtraBold"/"ExtraLight"
 * fell through to 700/300 instead of 800/200. This drives the REAL converter
 * end-to-end to prove the production path is fixed. VMLYR/token-forge#53.
 */

import { describe, test, expect } from '../../test-harness';
import { TypographyConverter } from '../../src/plugin/converters/typography-converter';
import { ConversionContext } from '../../src/types/converter-types';

function makeContext(): ConversionContext {
  return {
    variableMap: new Map(),
    fontWeightCache: {}, // empty -> forces the face-name inference path
    lineHeightCache: {},
    useRem: false,
    baseFontSize: 16,
    letterSpacingUnits: 'px',
    lineHeightOutput: 'ratio',
    includeFigmaExtensions: false,
    dimensionFormat: 'object',
    letterSpacingFormat: 'object',
    durationFormat: 'object',
  };
}

function makeTextStyle(style: string): TextStyle {
  // Minimal shape the converter reads; cast through unknown for the test.
  return {
    fontName: { family: 'Inter', style },
    fontSize: 16,
    letterSpacing: { value: 0, unit: 'PIXELS' },
    lineHeight: { unit: 'AUTO' },
    textDecoration: 'NONE',
  } as unknown as TextStyle;
}

describe('TypographyConverter unbound weight inference (real path)', () => {
  const converter = new TypographyConverter();

  test('infers 800 for an unspaced ExtraBold face', () => {
    const value = converter.convert(makeTextStyle('ExtraBold'), {}, makeContext());
    expect(value.fontWeight).toBe(800);
  });

  test('infers 200 for an unspaced ExtraLight face', () => {
    const value = converter.convert(makeTextStyle('ExtraLight'), {}, makeContext());
    expect(value.fontWeight).toBe(200);
  });

  test('infers 600 for an unspaced SemiBold face', () => {
    const value = converter.convert(makeTextStyle('SemiBold'), {}, makeContext());
    expect(value.fontWeight).toBe(600);
  });

  test('carries italic separately as fontStyle, weight unaffected', () => {
    const value = converter.convert(makeTextStyle('ExtraBold Italic'), {}, makeContext());
    expect(value.fontWeight).toBe(800);
    expect(value.fontStyle).toBe('italic');
  });
});
