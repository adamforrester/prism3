/**
 * The text-style reader keeps the underline's thickness and offset (prism3 #3085).
 *
 * A Figma text style carries `textDecorationThickness` and `textDecorationOffset`
 * (`{ value, unit: 'PIXELS' | 'PERCENT' } | { unit: 'AUTO' }`) beside `textDecoration`.
 * TokenPress exported `textDecoration` only, so a style with a 5% / 25% underline came
 * back at the default. Neither field takes a variable, so each is the style's literal,
 * written into the composite beside `textDecoration`: PERCENT as '%', PIXELS as px (or
 * rem), AUTO left out, and nothing at all when no decoration is drawn. The expected
 * values are typed here, never read off the converter.
 */

import { describe, test, expect } from '../../test-harness';
import { TypographyConverter } from '../../src/plugin/converters/typography-converter';
import { CSSFormatExporter } from '../../src/plugin/format-exporters/css-exporter';
import { ConversionContext } from '../../src/types/converter-types';
import { DTCGFile } from '../../src/types/dtcg';
import { FormatOptions } from '../../src/types/export-formats';

function makeContext(overrides: Partial<ConversionContext> = {}): ConversionContext {
  return Object.assign(
    {
      variableMap: new Map(),
      fontWeightCache: {},
      lineHeightCache: {},
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
      textDecoration: 'UNDERLINE',
    },
    overrides
  ) as unknown as TextStyle;
}

const converter = new TypographyConverter();
const convert = (style: Record<string, unknown>, ctx: Partial<ConversionContext> = {}) =>
  converter.convert(makeTextStyle(style), {}, makeContext(ctx));

const percentUnderline = {
  textDecorationThickness: { value: 5, unit: 'PERCENT' },
  textDecorationOffset: { value: 25, unit: 'PERCENT' },
};

describe('Text decoration thickness and offset (prism3 #3085)', () => {
  test('a PERCENT underline keeps its thickness and offset as % dimensions', () => {
    const v = convert(percentUnderline);
    expect(v.textDecoration).toBe('underline');
    expect(v.textDecorationThickness).toEqual({ value: 5, unit: '%' });
    expect(v.textDecorationOffset).toEqual({ value: 25, unit: '%' });
  });

  test('the string dimension format writes them as strings', () => {
    const v = convert(percentUnderline, { dimensionFormat: 'string' });
    expect(v.textDecorationThickness).toBe('5%');
    expect(v.textDecorationOffset).toBe('25%');
  });

  test('PIXELS follows the px/rem preference', () => {
    const px = { textDecorationThickness: { value: 2, unit: 'PIXELS' }, textDecorationOffset: { value: 4, unit: 'PIXELS' } };
    expect(convert(px).textDecorationThickness).toEqual({ value: 2, unit: 'px' });
    expect(convert(px).textDecorationOffset).toEqual({ value: 4, unit: 'px' });
    expect(convert(px, { useRem: true }).textDecorationOffset).toEqual({ value: 0.25, unit: 'rem' });
  });

  test('AUTO and a missing field are left out', () => {
    const auto = convert({ textDecorationThickness: { unit: 'AUTO' }, textDecorationOffset: { unit: 'AUTO' } });
    expect(auto.textDecoration).toBe('underline');
    expect('textDecorationThickness' in auto).toBe(false);
    expect('textDecorationOffset' in auto).toBe(false);
    const missing = convert({});
    expect('textDecorationThickness' in missing).toBe(false);
    expect('textDecorationOffset' in missing).toBe(false);
  });

  test('no decoration, no thickness or offset', () => {
    const v = convert(Object.assign({ textDecoration: 'NONE' }, percentUnderline));
    expect('textDecoration' in v).toBe(false);
    expect('textDecorationThickness' in v).toBe(false);
    expect('textDecorationOffset' in v).toBe(false);
  });

  test('a strikethrough keeps its thickness too', () => {
    const v = convert({ textDecoration: 'STRIKETHROUGH', textDecorationThickness: { value: 10, unit: 'PERCENT' } });
    expect(v.textDecoration).toBe('line-through');
    expect(v.textDecorationThickness).toEqual({ value: 10, unit: '%' });
  });

  test('the CSS export writes text-decoration-thickness and text-underline-offset', async () => {
    const tokens: DTCGFile = {
      typography: {
        link: {
          $type: 'typography',
          // The composite the converter writes for the PERCENT underline above.
          $value: convert(percentUnderline),
        },
      },
    } as unknown as DTCGFile;
    const options: FormatOptions = { format: 'css', config: { css: { useCustomProperties: true } } } as FormatOptions;
    const [out] = await new CSSFormatExporter().export(tokens, options);
    expect(out.content).toContain('--typography-link-text-decoration-thickness: 5%;');
    expect(out.content).toContain('--typography-link-text-underline-offset: 25%;');
  });
});
