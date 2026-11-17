/**
 * prism3 #731 — gradient paint styles are exported as DTCG `gradient` tokens.
 *
 * Before this, the scanner read four channels (variable collections, variables, text styles,
 * effect styles) and never asked Figma for paint styles, which is where a file keeps its
 * gradients. Every gradient was missing from the export, with no warning.
 *
 * These tests drive the whole path — `exportToZip` constructs its own scanner, so the only seam
 * is the global `figma` — and read the ZIP back. A paint channel that is not scanned, or a
 * gradient that is scanned but not written, both fail here.
 */

import JSZip from 'jszip';
import { describe, test, expect } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';

const IDENTITY = [
  [1, 0, 0],
  [0, 1, 0],
];

function gradientPaint(type: string, stops: any[], extra: Record<string, unknown> = {}): any {
  return Object.assign(
    { type, visible: true, opacity: 1, blendMode: 'NORMAL', gradientTransform: IDENTITY, gradientStops: stops },
    extra
  );
}

function paintStyle(name: string, paints: any[], description = ''): any {
  return { id: `S:${name}`, type: 'PAINT', name, description, paints };
}

const PRIMARY = {
  id: 'VariableID:1',
  name: 'palette/primary/600',
  resolvedType: 'COLOR',
  scopes: ['ALL_FILLS'],
  variableCollectionId: 'c1',
  valuesByMode: { m1: { r: 0.1, g: 0.2, b: 0.9, a: 1 } },
  description: '',
};

function installFigma(paintStyles: any[]): void {
  (globalThis as Record<string, unknown>).figma = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [
        { id: 'c1', name: 'core', defaultModeId: 'm1', modes: [{ modeId: 'm1', name: 'Default' }] },
      ],
      getLocalVariablesAsync: async () => [PRIMARY],
    },
    getLocalTextStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalPaintStylesAsync: async () => paintStyles,
  };
}

async function exportFiles(options: Record<string, unknown> = {}): Promise<{
  files: Record<string, any>;
  exporter: TokenExporter;
}> {
  const exporter = new TokenExporter(Object.assign({ tokenNameCase: 'preserve' }, options) as any);
  const buf = await exporter.exportToZip();
  const zip = await JSZip.loadAsync(buf);
  const files: Record<string, any> = {};
  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];
    if (!entry.dir) files[name] = JSON.parse(await entry.async('string'));
  }
  return { files, exporter };
}

describe('gradient paint styles → DTCG gradient (#731)', () => {
  test('a linear gradient paint style exports as a gradient token in gradients.json', async () => {
    installFigma([
      paintStyle(
        'gradient/brand',
        [
          gradientPaint('GRADIENT_LINEAR', [
            { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 1, a: 0.5 } },
          ]),
        ],
        'brand gradient'
      ),
    ]);
    const { files } = await exportFiles();
    expect(Object.keys(files)).toContain('gradients.json');
    const token = files['gradients.json'].gradient.brand;
    expect(token.$type).toBe('gradient');
    expect(token.$description).toBe('brand gradient');
    expect(token.$value).toEqual([
      { color: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 }, position: 0 },
      { color: { colorSpace: 'srgb', components: [0, 0, 1], alpha: 0.5 }, position: 1 },
    ]);
  });

  test('a stop bound to a color variable exports as an alias to it', async () => {
    installFigma([
      paintStyle('gradient/glow', [
        gradientPaint('GRADIENT_RADIAL', [
          {
            position: 0,
            color: { r: 0.1, g: 0.2, b: 0.9, a: 1 },
            boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'VariableID:1' } },
          },
          { position: 1, color: { r: 0, g: 0, b: 0, a: 0 } },
        ]),
      ]),
    ]);
    const { files } = await exportFiles();
    const stops = files['gradients.json'].gradient.glow.$value;
    expect(stops[0].color).toBe('{palette.primary.600}');
    expect(stops[1].color).toEqual({ colorSpace: 'srgb', components: [0, 0, 0], alpha: 0 });
  });

  test('the gradient kind, transform and paint opacity go in $extensions.figma', async () => {
    const transform = [
      [0.5, 0.5, 0],
      [-0.5, 0.5, 0.5],
    ];
    installFigma([
      paintStyle('sweep', [
        gradientPaint(
          'GRADIENT_ANGULAR',
          [
            { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } },
          ],
          { gradientTransform: transform, opacity: 0.8 }
        ),
      ]),
    ]);
    const { files } = await exportFiles({ includeFigmaExtensions: true });
    expect(files['gradients.json'].sweep.$extensions.figma).toEqual({
      styleId: 'S:sweep',
      gradientType: 'GRADIENT_ANGULAR',
      gradientTransform: transform,
      opacity: 0.8,
    });
  });

  test('solid paint styles are not gradients, and no gradients.json is written for them', async () => {
    installFigma([
      paintStyle('surface', [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 1, b: 1 } }]),
    ]);
    const { files, exporter } = await exportFiles();
    expect(Object.keys(files)).not.toContain('gradients.json');
    expect(exporter.getSkippedGradientStyles()).toEqual([]);
  });

  test('a gradient layered with another visible paint is skipped by name, not dropped silently', async () => {
    installFigma([
      paintStyle('gradient/layered', [
        { type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 1, b: 1 } },
        gradientPaint('GRADIENT_LINEAR', [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
        ]),
      ]),
      paintStyle('gradient/hidden-under', [
        { type: 'SOLID', visible: false, opacity: 1, color: { r: 1, g: 1, b: 1 } },
        gradientPaint('GRADIENT_DIAMOND', [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
        ]),
      ]),
    ]);
    const { files, exporter } = await exportFiles();
    expect(exporter.getSkippedGradientStyles()).toEqual(['gradient/layered']);
    const tree = files['gradients.json'].gradient;
    expect(tree.layered).toBeUndefined();
    expect(tree['hidden-under'].$type).toBe('gradient');
  });

  test('in a multi-mode export, gradients.json goes in shared/ and aliases carry the namespace', async () => {
    installFigma([
      paintStyle('gradient/brand', [
        gradientPaint('GRADIENT_LINEAR', [
          {
            position: 0,
            color: { r: 0.1, g: 0.2, b: 0.9, a: 1 },
            boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'VariableID:1' } },
          },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
        ]),
      ]),
    ]);
    (globalThis as any).figma.variables.getLocalVariableCollectionsAsync = async () => [
      {
        id: 'c1',
        name: 'core',
        defaultModeId: 'm1',
        modes: [
          { modeId: 'm1', name: 'Light' },
          { modeId: 'm2', name: 'Dark' },
        ],
      },
    ];
    const { files } = await exportFiles({ namespace: 'pds' });
    expect(Object.keys(files)).toContain('shared/gradients.json');
    const stops = files['shared/gradients.json'].pds.gradient.brand.$value;
    expect(stops[0].color).toBe('{pds.palette.primary.600}');
  });
});
