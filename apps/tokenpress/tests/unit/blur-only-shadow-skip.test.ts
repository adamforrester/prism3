/**
 * Regression test for v2.2.2 — skip blur-only effect styles.
 *
 * DTCG `shadow` cannot represent BACKGROUND_BLUR / LAYER_BLUR. Prior to v2.2.2
 * the exporter still emitted a token with `$value: []` for these styles, which
 * downstream-crashed Style Dictionary's composite resolver. Fix: when an effect
 * style contains only blur effects (no DROP_SHADOW / INNER_SHADOW), skip the
 * token and collect the name so the UI can surface a toast warning. Mixed
 * shadow+blur styles still emit (only the shadow layers, since the converter
 * already filters blur out).
 */

import { describe, test, expect, beforeEach } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';

function makeEffect(overrides: Partial<any> = {}): any {
  return {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.2 },
    offset: { x: 0, y: 4 },
    radius: 8,
    spread: 1,
    visible: true,
    blendMode: 'NORMAL',
    ...overrides,
  };
}

function makeEffectStyle(name: string, effects: any[]): any {
  return {
    id: `style-${name}`,
    name,
    description: '',
    effects,
  };
}

// Minimal JSZip stand-in capturing files written by exportShadows.
function makeZip(): any {
  const files: Record<string, string> = {};
  return {
    files,
    file(path: string, content: string) {
      files[path] = content;
    },
  };
}

describe('TokenExporter.exportShadows — blur-only skip (v2.2.2)', () => {
  let exporter: TokenExporter;

  beforeEach(() => {
    exporter = new TokenExporter({} as any);
    // Reset internal state the way exportToZip would.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (exporter as any).fileCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (exporter as any).skippedBlurStyles = [];
  });

  async function runExport(effectStyles: any[]): Promise<{ files: Record<string, string>; skipped: string[] }> {
    const zip = makeZip();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (exporter as any).exportShadows(zip, effectStyles, false);
    return { files: zip.files, skipped: exporter.getSkippedBlurStyles() };
  }

  test('blur-only style is skipped and name collected', async () => {
    const blurOnly = makeEffectStyle('glass/backdrop', [
      { type: 'BACKGROUND_BLUR', radius: 12, visible: true, blendMode: 'NORMAL' },
    ]);

    const { files, skipped } = await runExport([blurOnly]);

    expect(skipped).toEqual(['glass/backdrop']);
    // No shadows.json should be emitted when every style was skipped.
    expect(Object.keys(files)).toHaveLength(0);
  });

  test('layer-blur-only style is also skipped', async () => {
    const layerBlur = makeEffectStyle('frost', [
      { type: 'LAYER_BLUR', radius: 6, visible: true, blendMode: 'NORMAL' },
    ]);

    const { skipped } = await runExport([layerBlur]);
    expect(skipped).toEqual(['frost']);
  });

  test('multiple blur-only styles all collected in order', async () => {
    const a = makeEffectStyle('glass/a', [{ type: 'BACKGROUND_BLUR', radius: 4, visible: true, blendMode: 'NORMAL' }]);
    const b = makeEffectStyle('glass/b', [{ type: 'LAYER_BLUR', radius: 8, visible: true, blendMode: 'NORMAL' }]);

    const { skipped } = await runExport([a, b]);
    expect(skipped).toEqual(['glass/a', 'glass/b']);
  });

  test('normal shadow style is emitted; nothing skipped', async () => {
    const shadow = makeEffectStyle('elevation/100', [makeEffect()]);

    const { files, skipped } = await runExport([shadow]);
    expect(skipped).toEqual([]);
    expect(Object.keys(files)).toContain('shadows.json');

    const json = JSON.parse(files['shadows.json']);
    expect(json.elevation['100'].$type).toBe('shadow');
    expect(json.elevation['100'].$value).not.toEqual([]);
  });

  test('mixed shadow+blur effects still emit (only shadow layers); not skipped', async () => {
    const mixed = makeEffectStyle('elevation/glass', [
      makeEffect(),
      { type: 'BACKGROUND_BLUR', radius: 6, visible: true, blendMode: 'NORMAL' },
    ]);

    const { files, skipped } = await runExport([mixed]);
    // Has at least one shadow effect → not skipped.
    expect(skipped).toEqual([]);
    expect(Object.keys(files)).toContain('shadows.json');

    const json = JSON.parse(files['shadows.json']);
    const token = json.elevation.glass;
    expect(token.$type).toBe('shadow');
    // Single shadow layer collapses to object form per ShadowConverter.
    expect(Array.isArray(token.$value) ? token.$value.length : 1).toBeGreaterThan(0);
  });

  test('mix of blur-only and real shadow styles: real ones emit, blur-only skipped', async () => {
    const blur = makeEffectStyle('glass/backdrop', [
      { type: 'BACKGROUND_BLUR', radius: 12, visible: true, blendMode: 'NORMAL' },
    ]);
    const shadow = makeEffectStyle('elevation/200', [makeEffect()]);

    const { files, skipped } = await runExport([blur, shadow]);
    expect(skipped).toEqual(['glass/backdrop']);
    expect(Object.keys(files)).toContain('shadows.json');

    const json = JSON.parse(files['shadows.json']);
    expect(json.elevation['200']).toBeDefined();
    expect(json.glass).toBeUndefined();
  });

  test('getSkippedBlurStyles returns a copy (defensive)', async () => {
    const blur = makeEffectStyle('glass', [
      { type: 'BACKGROUND_BLUR', radius: 4, visible: true, blendMode: 'NORMAL' },
    ]);

    await runExport([blur]);
    const first = exporter.getSkippedBlurStyles();
    first.push('mutated');
    const second = exporter.getSkippedBlurStyles();
    expect(second).toEqual(['glass']);
  });
});
