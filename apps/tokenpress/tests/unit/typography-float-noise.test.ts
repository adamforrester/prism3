/**
 * Regression test for IEEE-754 noise in typography composites (VMLYR/token-forge#69).
 *
 * Reported from a real export: `shared/typography.json` carried
 * `"lineHeight": 1.0499999523162842` on six display styles. That value is
 * exactly `Math.fround(1.05)` — Figma stores the text style's line height as a
 * 32-bit float, so a 16.8px line height over a 16px base emits the noise
 * verbatim.
 *
 * v2.2.1 (#44) fixed this class of bug on the dimension/variable side by
 * rounding at the formatter boundary, but TypographyConverter never imported
 * `roundToPrecision` at all — so every numeric it emitted was raw. The
 * `lineHeight` case was merely the one whose divisor made the noise visible;
 * the rem fontSize, rem letter-spacing, and percentage paths had the same gap.
 *
 * Precision is deliberately split:
 *   - ratios use DECIMAL_3, matching TokenExporter's variable-side ratio path,
 *     so the same design intent rounds identically whichever route it takes
 *   - dimensions use the DECIMAL_4 default, matching DimensionConverter, which
 *     preserves sub-pixel letter-spacing intent like 0.04
 */

import { describe, test, expect } from '../../test-harness';
import { TypographyConverter } from '../../src/plugin/converters/typography-converter';
import { ConversionContext } from '../../src/types/converter-types';

function makeContext(overrides: Partial<ConversionContext> = {}): ConversionContext {
  return Object.assign(
    {
      variableMap: new Map(),
      fontWeightCache: {},
      lineHeightCache: {}, // empty -> forces the calculated path, not an alias
      useRem: false,
      baseFontSize: 16,
      letterSpacingUnits: 'px',
      lineHeightOutput: 'ratio',
      includeFigmaExtensions: false,
      dimensionFormat: 'object',
      letterSpacingFormat: 'object',
      durationFormat: 'object',
    },
    overrides
  ) as ConversionContext;
}

function makeTextStyle(overrides: Record<string, unknown> = {}): TextStyle {
  return Object.assign(
    {
      fontName: { family: 'Inter', style: 'Regular' },
      fontSize: 16,
      letterSpacing: { value: 0, unit: 'PIXELS' },
      lineHeight: { unit: 'AUTO' },
      textDecoration: 'NONE',
    },
    overrides
  ) as unknown as TextStyle;
}

const converter = new TypographyConverter();

describe('lineHeight ratio — the reported bug', () => {
  test('float32 16.8px over a 16px base emits 1.05, not 1.0499999523162842', () => {
    // Math.fround models how Figma stores the authored 16.8.
    const value = converter.convert(
      makeTextStyle({ lineHeight: { value: Math.fround(16.8), unit: 'PIXELS' } }),
      {},
      makeContext()
    );

    expect(value.lineHeight).toBe(1.05);
  });

  test('the pre-fix value is no longer produced', () => {
    const value = converter.convert(
      makeTextStyle({ lineHeight: { value: Math.fround(16.8), unit: 'PIXELS' } }),
      {},
      makeContext()
    );

    expect(value.lineHeight).not.toBe(1.0499999523162842);
  });

  test('PERCENT line heights round too', () => {
    const value = converter.convert(
      makeTextStyle({ lineHeight: { value: Math.fround(105), unit: 'PERCENT' } }),
      {},
      makeContext()
    );

    expect(value.lineHeight).toBe(1.05);
  });

  test('clean ratios pass through exactly', () => {
    const value = converter.convert(
      makeTextStyle({ lineHeight: { value: 24, unit: 'PIXELS' } }),
      {},
      makeContext()
    );

    expect(value.lineHeight).toBe(1.5);
  });

  test('ratio precision matches the variable-side path (3 decimals)', () => {
    // 22px / 16 = 1.375 exactly; a value needing a 4th decimal truncates to 3,
    // which is what TokenExporter's ratio path does.
    const value = converter.convert(
      makeTextStyle({ lineHeight: { value: 20.5, unit: 'PIXELS' } }),
      {},
      makeContext()
    );

    // 20.5 / 16 = 1.28125 -> 1.281 at DECIMAL_3
    expect(value.lineHeight).toBe(1.281);
  });
});

describe('lineHeight percentage output', () => {
  test('PIXELS + percentage emits 105%, not 104.99999523162842%', () => {
    const value = converter.convert(
      makeTextStyle({ lineHeight: { value: Math.fround(16.8), unit: 'PIXELS' } }),
      {},
      makeContext({ lineHeightOutput: 'percentage' })
    );

    expect(value.lineHeight).toBe('105%');
  });

  test('PERCENT + percentage rounds the raw percent value', () => {
    const value = converter.convert(
      makeTextStyle({ lineHeight: { value: Math.fround(105), unit: 'PERCENT' } }),
      {},
      makeContext({ lineHeightOutput: 'percentage' })
    );

    expect(value.lineHeight).toBe('105%');
  });
});

describe('lineHeight dimension output', () => {
  test('rem conversion off a float32 px value rounds', () => {
    const value = converter.convert(
      makeTextStyle({ lineHeight: { value: Math.fround(16.8), unit: 'PIXELS' } }),
      {},
      makeContext({ lineHeightOutput: 'dimension', useRem: true })
    );

    expect(value.lineHeight).toEqual({ value: 1.05, unit: 'rem' });
  });

  test('string form rounds as well as object form', () => {
    const value = converter.convert(
      makeTextStyle({ lineHeight: { value: Math.fround(16.8), unit: 'PIXELS' } }),
      {},
      makeContext({ lineHeightOutput: 'dimension', useRem: true, dimensionFormat: 'string' })
    );

    expect(value.lineHeight).toBe('1.05rem');
  });
});

describe('fontSize', () => {
  test('rem conversion off a float32 size rounds', () => {
    const value = converter.convert(
      makeTextStyle({ fontSize: Math.fround(16.8) }),
      {},
      makeContext({ useRem: true })
    );

    expect(value.fontSize).toEqual({ value: 1.05, unit: 'rem' });
  });

  test('px sizes are untouched when already clean', () => {
    const value = converter.convert(makeTextStyle({ fontSize: 16 }), {}, makeContext());

    expect(value.fontSize).toEqual({ value: 16, unit: 'px' });
  });
});

describe('letterSpacing', () => {
  test('px letter-spacing strips float32 noise', () => {
    const value = converter.convert(
      makeTextStyle({ letterSpacing: { value: Math.fround(-0.02), unit: 'PIXELS' } }),
      {},
      makeContext()
    );

    expect(value.letterSpacing).toEqual({ value: -0.02, unit: 'px' });
  });

  test('sub-pixel intent survives at DECIMAL_4 precision', () => {
    // The precision floor that #44 chose: 0.04 must not collapse to 0.
    const value = converter.convert(
      makeTextStyle({ letterSpacing: { value: Math.fround(0.04), unit: 'PIXELS' } }),
      {},
      makeContext()
    );

    expect(value.letterSpacing).toEqual({ value: 0.04, unit: 'px' });
  });

  test('percent letter-spacing rounds', () => {
    const value = converter.convert(
      makeTextStyle({ letterSpacing: { value: Math.fround(2.5), unit: 'PERCENT' } }),
      {},
      makeContext({ letterSpacingUnits: 'percent' })
    );

    expect(value.letterSpacing).toEqual({ value: 2.5, unit: '%' });
  });

  test('rem letter-spacing rounds after the baseFontSize divide', () => {
    const value = converter.convert(
      makeTextStyle({ letterSpacing: { value: Math.fround(-0.32), unit: 'PIXELS' } }),
      {},
      makeContext({ useRem: true })
    );

    // -0.32 / 16 = -0.02
    expect(value.letterSpacing).toEqual({ value: -0.02, unit: 'rem' });
  });

  test('string form rounds as well as object form', () => {
    const value = converter.convert(
      makeTextStyle({ letterSpacing: { value: Math.fround(-0.02), unit: 'PIXELS' } }),
      {},
      makeContext({ letterSpacingFormat: 'string' })
    );

    expect(value.letterSpacing).toBe('-0.02px');
  });
});
