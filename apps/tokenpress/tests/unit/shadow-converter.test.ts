/**
 * Unit tests for ShadowConverter — covers F8 (dimensionFormat propagation
 * through the shadow path).
 */

import { describe, test, expect } from 'vitest';
import { ShadowConverter } from '../../src/plugin/converters/shadow-converter';

// Minimal fake EffectStyle / Effect to feed the converter without pulling in
// the real Figma plugin types.
function makeEffectStyle(overrides: Partial<any> = {}): any {
  return {
    id: 'test',
    name: 'test',
    description: '',
    effects: [
      {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.2 },
        offset: { x: 0, y: 4 },
        radius: 8,
        spread: 1,
        visible: true,
        blendMode: 'NORMAL',
      },
    ],
    ...overrides,
  };
}

describe('ShadowConverter — dimensionFormat (F8)', () => {
  test('default (object) emits DTCGDimension objects for offsets/blur/spread', () => {
    const converter = new ShadowConverter();
    const layer = converter.convert(makeEffectStyle(), false, 16) as any;

    expect(layer.offsetX).toEqual({ value: 0, unit: 'px' });
    expect(layer.offsetY).toEqual({ value: 4, unit: 'px' });
    expect(layer.blur).toEqual({ value: 8, unit: 'px' });
    expect(layer.spread).toEqual({ value: 1, unit: 'px' });
  });

  test("dimensionFormat='string' emits CSS strings for offsets/blur/spread (SD preset)", () => {
    const converter = new ShadowConverter();
    const layer = converter.convert(makeEffectStyle(), false, 16, 'string') as any;

    expect(layer.offsetX).toBe('0px');
    expect(layer.offsetY).toBe('4px');
    expect(layer.blur).toBe('8px');
    expect(layer.spread).toBe('1px');
  });

  test("dimensionFormat='object' + useRem emits rem objects", () => {
    const converter = new ShadowConverter();
    const layer = converter.convert(makeEffectStyle(), true, 16, 'object') as any;

    // 8 / 16 = 0.5
    expect(layer.blur).toEqual({ value: 0.5, unit: 'rem' });
  });

  test("dimensionFormat='string' + useRem emits rem strings", () => {
    const converter = new ShadowConverter();
    const layer = converter.convert(makeEffectStyle(), true, 16, 'string') as any;

    expect(layer.blur).toBe('0.5rem');
  });

  test('inset flag is preserved for INNER_SHADOW', () => {
    const converter = new ShadowConverter();
    const innerEffectStyle = makeEffectStyle({
      effects: [
        {
          type: 'INNER_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.5 },
          offset: { x: 0, y: 0 },
          radius: 4,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL',
        },
      ],
    });
    const layer = converter.convert(innerEffectStyle, false, 16, 'object') as any;
    expect(layer.inset).toBe(true);
  });
});

describe('ShadowConverter — colorFormat (F5)', () => {
  test("default (dtcg) emits DTCGColor object", () => {
    const converter = new ShadowConverter();
    const layer = converter.convert(makeEffectStyle(), false, 16) as any;

    expect(layer.color).toEqual({
      colorSpace: 'srgb',
      components: [0, 0, 0],
      alpha: 0.2,
    });
  });

  test("colorFormat='css' emits rgba string (SD preset)", () => {
    const converter = new ShadowConverter();
    const layer = converter.convert(makeEffectStyle(), false, 16, 'string', 'css') as any;

    expect(layer.color).toBe('rgba(0, 0, 0, 0.2)');
  });

  test("colorFormat='dtcg' fully-opaque alpha rounds to 1", () => {
    const converter = new ShadowConverter();
    const opaque = makeEffectStyle({
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 1, g: 0, b: 0 }, // no alpha
          offset: { x: 0, y: 0 },
          radius: 0,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL',
        },
      ],
    });
    const layer = converter.convert(opaque, false, 16, 'object', 'dtcg') as any;
    expect(layer.color).toEqual({
      colorSpace: 'srgb',
      components: [1, 0, 0],
      alpha: 1,
    });
  });

  test("colorFormat='css' opaque emits rgb (no alpha)", () => {
    const converter = new ShadowConverter();
    const opaque = makeEffectStyle({
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 1, g: 0, b: 0 },
          offset: { x: 0, y: 0 },
          radius: 0,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL',
        },
      ],
    });
    const layer = converter.convert(opaque, false, 16, 'string', 'css') as any;
    expect(layer.color).toBe('rgb(255, 0, 0)');
  });

  test("dimensionFormat and colorFormat are independent", () => {
    const converter = new ShadowConverter();
    // DTCG color + SD-style dimension strings (uncommon combo, but legal)
    const layer = converter.convert(makeEffectStyle(), false, 16, 'string', 'dtcg') as any;
    expect(layer.color).toEqual({
      colorSpace: 'srgb',
      components: [0, 0, 0],
      alpha: 0.2,
    });
    expect(layer.blur).toBe('8px');
  });
});
