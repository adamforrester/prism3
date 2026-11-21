/**
 * A tinted wash (a color alias at an opacity) exports as the resolved color with that alpha (prism3 #2365).
 *
 * Since prism3 #1646, Apply Theme writes a tinted wash as an ALIAS WITH OPACITY: a COLOR variable whose mode value is
 * `{ color: VARIABLE_ALIAS, opacity: VARIABLE_ALIAS | number }`, the opacity a PERCENT (Figma's opacity convention, as
 * #709 records). DTCG 2025.10 cannot put an alpha on an alias, and the exporter used to read the shape as a plain
 * color and write `components: [null, null, null]`, which is not valid DTCG.
 *
 * Owner decision on #2365 (A): `$value` is the color the alias resolves to IN THIS MODE, its alpha multiplied by the
 * opacity, so every consumer gets the color a designer sees. With "Include Figma extensions" on, both aliases are kept
 * in `$extensions.figma.aliasOf`, so a tool that wants the reference can rebuild it.
 *
 * THE EXPECTED VALUES ARE NOT DERIVED FROM THE CODE UNDER TEST (docs/34). The fill's channels below are an 8-bit
 * color written out by hand (`#3d68fc` = 61/255, 104/255, 252/255, rounded to 4 places as the exporter's other
 * colors are), and 0.3 is 30%.
 */

import { describe, test, expect } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';
import { validateDTCGFile } from '../../src/utils/dtcg-validator';

const LIGHT = { r: 30 / 255, g: 30 / 255, b: 1, a: 1 };   // #1e1eff
const DARK = { r: 61 / 255, g: 104 / 255, b: 252 / 255, a: 1 }; // #3d68fc

function mkVar(id: string, name: string, resolvedType: string, valuesByMode: Record<string, unknown>, collection: string): any {
  return { id, name, resolvedType, valuesByMode, scopes: ['ALL_SCOPES'], description: '', variableCollectionId: collection };
}

// `color` has two modes; the opacity step lives in a single-mode collection of its own, so its alias resolves through
// that collection's default mode, not the wash's.
const color: any = { id: 'cc', name: 'color', defaultModeId: 'light', modes: [{ modeId: 'light', name: 'light' }, { modeId: 'dark', name: 'dark' }] };
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const vars = [
  mkVar('o30', 'ds/opacity/30', 'FLOAT', { 'op-default': 30 }, 'co'),
  mkVar('fill', 'ds/color/fill/rest', 'COLOR', { light: LIGHT, dark: DARK }, 'cc'),
  mkVar('fill2', 'ds/color/fill/alias', 'COLOR', { light: alias('fill'), dark: alias('fill') }, 'cc'),
  mkVar('wash', 'ds/color/subtle-fill/selected', 'COLOR', {
    light: { color: alias('fill'), opacity: alias('o30') },
    dark: { color: alias('fill2'), opacity: alias('o30') },
  }, 'cc'),
  mkVar('lit', 'ds/color/subtle-fill/literal', 'COLOR', { light: { color: alias('fill'), opacity: 50 }, dark: { color: alias('fill'), opacity: 50 } }, 'cc'),
];

function build(mode: string, options: Record<string, unknown> = {}) {
  const exporter = new TokenExporter(Object.assign({ tokenNameCase: 'preserve' }, options) as never);
  const m = color.modes.find((x: any) => x.modeId === mode);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (exporter as any).buildDTCGFile(color, m, vars.filter((v) => v.variableCollectionId === 'cc'), vars) as any;
}

describe('a tinted wash exports as the resolved color with alpha (#2365)', () => {
  test('light: the fill at 30% — channels of #1e1eff, alpha 0.3', () => {
    const t = build('light').ds.color['subtle-fill'].selected;
    expect(t.$type).toBe('color');
    expect(t.$value).toEqual({ colorSpace: 'srgb', components: [0.1176, 0.1176, 1], alpha: 0.3 });
  });

  test('dark: resolved in the wash\'s own mode, through an alias chain — channels of #3d68fc', () => {
    const t = build('dark').ds.color['subtle-fill'].selected;
    expect(t.$value).toEqual({ colorSpace: 'srgb', components: [0.2392, 0.4078, 0.9882], alpha: 0.3 });
  });

  test('a literal opacity is a percent too', () => {
    expect(build('light').ds.color['subtle-fill'].literal.$value.alpha).toBe(0.5);
  });

  test('the CSS color format writes rgba() with the alpha', () => {
    expect(build('light', { colorFormat: 'css' }).ds.color['subtle-fill'].selected.$value).toBe('rgba(30, 30, 255, 0.3)');
  });

  test('with Figma extensions on, both aliases are kept in $extensions.figma.aliasOf', () => {
    const t = build('light', { includeFigmaExtensions: true }).ds.color['subtle-fill'].selected;
    expect(t.$extensions.figma.aliasOf).toEqual({ color: '{ds.color.fill.rest}', opacity: '{ds.opacity.30}' });
  });

  test('with Figma extensions off, there is no $extensions at all', () => {
    expect(build('light').ds.color['subtle-fill'].selected.$extensions).toBe(undefined);
  });

  // The opacity step lives in a TWO-mode collection whose default mode is NOT its first key, so the default mode and
  // the first-mode fallback give different values: 40% from the default, 10% from the first key. The value 0.4 is
  // written by hand, not read from the code (docs/34). `exportVariables` fills the default modes; this test seeds them
  // as it would, because `buildDTCGFile` is called directly.
  test('an alias into another collection resolves through that collection\'s default mode, not its first', () => {
    const multi = [
      mkVar('o-multi', 'ds/opacity/multi', 'FLOAT', { 'op-first': 10, 'op-default': 40 }, 'co2'),
      mkVar('fill', 'ds/color/fill/rest', 'COLOR', { light: LIGHT, dark: DARK }, 'cc'),
      mkVar('wash-multi', 'ds/color/subtle-fill/multi', 'COLOR', {
        light: { color: alias('fill'), opacity: alias('o-multi') },
        dark: { color: alias('fill'), opacity: alias('o-multi') },
      }, 'cc'),
    ];
    const exporter = new TokenExporter({ tokenNameCase: 'preserve' } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (exporter as any).collectionDefaultModes = new Map([['cc', 'light'], ['co2', 'op-default']]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = (exporter as any).buildDTCGFile(color, color.modes[1], multi.filter((v) => v.variableCollectionId === 'cc'), multi) as any;
    expect(out.ds.color['subtle-fill'].multi.$value.alpha).toBe(0.4);
  });

  test('the exported file is valid DTCG', () => {
    expect(validateDTCGFile(build('dark')).isValid).toBe(true);
  });
});
