/**
 * Regression test for IEEE-754 noise in dimension exports (v2.2.1).
 *
 * Reported by an SD-consumer agent against a real export: letter-spacing
 * primitives surfaced as "-0.019999999552965164px" / "0.03999999910593033px"
 * instead of "-0.02px" / "0.04px". Root cause: Figma stores variable values
 * as 32-bit floats, so a human-entered 0.04 round-trips with representation
 * noise. The LINE_HEIGHT and OPACITY paths already rounded; the generic
 * dimension path did not, so LETTER_SPACING (and any other FLOAT/dimension
 * scope without a special case) leaked the raw float through
 * formatDimension/formatDimensionValue.
 *
 * Fix: round at the formatter boundary so every dimension emission — string
 * or object form, px or rem — is sanitized regardless of which scope path
 * produced it. DECIMAL_4 (4 decimals) is the precision: enough to preserve
 * sub-pixel intent on small values like 0.04, tight enough to strip noise.
 */

import { describe, test, expect } from '../../test-harness';
import { roundToPrecision, PRECISION } from '../../src/constants';
import { TokenExporter } from '../../src/plugin/exporter';
import { DimensionConverter } from '../../src/plugin/converters/dimension-converter';

describe('roundToPrecision', () => {
  test('strips IEEE-754 noise at 4-decimal precision by default', () => {
    expect(roundToPrecision(-0.019999999552965164)).toBe(-0.02);
    expect(roundToPrecision(0.03999999910593033)).toBe(0.04);
  });

  test('preserves clean values exactly', () => {
    expect(roundToPrecision(0)).toBe(0);
    expect(roundToPrecision(16)).toBe(16);
    expect(roundToPrecision(-0.02)).toBe(-0.02);
    expect(roundToPrecision(1.5)).toBe(1.5);
  });

  test('honors caller-provided multiplier (DECIMAL_3)', () => {
    expect(roundToPrecision(0.123456, PRECISION.DECIMAL_3)).toBe(0.123);
    expect(roundToPrecision(0.999999, PRECISION.DECIMAL_3)).toBe(1);
  });

  test('returns non-finite values unchanged', () => {
    expect(roundToPrecision(NaN)).toBeNaN();
    expect(roundToPrecision(Infinity)).toBe(Infinity);
    expect(roundToPrecision(-Infinity)).toBe(-Infinity);
  });
});

describe('TokenExporter.formatDimensionValue — IEEE noise', () => {
  function format(
    value: number,
    unit: 'px' | 'rem' | 'em' | '%',
    dimensionFormat: 'object' | 'string' = 'object'
  ): unknown {
    const exporter = new TokenExporter({ dimensionFormat } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (exporter as any).formatDimensionValue(value, unit);
  }

  test('object form rounds noisy float to clean value', () => {
    expect(format(-0.019999999552965164, 'px')).toEqual({ value: -0.02, unit: 'px' });
    expect(format(0.03999999910593033, 'px')).toEqual({ value: 0.04, unit: 'px' });
  });

  test('string form rounds noisy float to clean value', () => {
    expect(format(-0.019999999552965164, 'px', 'string')).toBe('-0.02px');
    expect(format(0.03999999910593033, 'px', 'string')).toBe('0.04px');
  });

  test('clean dimensions pass through unchanged', () => {
    expect(format(16, 'px')).toEqual({ value: 16, unit: 'px' });
    expect(format(0, 'px', 'string')).toBe('0px');
    expect(format(1.5, 'rem', 'string')).toBe('1.5rem');
  });
});

describe('DimensionConverter.formatDimension — IEEE noise', () => {
  function format(
    value: number,
    unit: 'px' | 'rem' | 'em' | '%',
    dimensionFormat: 'object' | 'string' = 'object'
  ): unknown {
    const converter = new DimensionConverter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (converter as any).formatDimension(value, unit, { dimensionFormat });
  }

  test('object form rounds noisy float to clean value', () => {
    expect(format(-0.019999999552965164, 'px')).toEqual({ value: -0.02, unit: 'px' });
    expect(format(0.03999999910593033, 'px')).toEqual({ value: 0.04, unit: 'px' });
  });

  test('string form rounds noisy float to clean value', () => {
    expect(format(0.03999999910593033, 'px', 'string')).toBe('0.04px');
  });

  test('clean dimensions pass through unchanged', () => {
    expect(format(16, 'px', 'string')).toBe('16px');
    expect(format(1.5, 'rem')).toEqual({ value: 1.5, unit: 'rem' });
  });
});
