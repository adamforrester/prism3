/**
 * prism3 #2365 × #4166 — a tinted wash whose color (or opacity) is an alias to a team-library variable, or to an id
 * nothing resolves.
 *
 * The scanner collected library targets only from a BARE alias, so the color half of a wash over a library variable
 * never entered the variable map: the wash fell back to `{VariableID:…}`, the shape #4166 fixed for a bare alias. The
 * validator read only bare aliases too, so a wash over a dangling id was not reported, although the exporter's comment
 * promised it would be.
 *
 * Now both halves of a wash are alias targets like any other: a library target resolves, through its library
 * collection's DEFAULT mode (as an alias into any other collection does), and an id nothing resolves is a broken alias.
 *
 * THE EXPECTED VALUES ARE NOT DERIVED FROM THE CODE UNDER TEST (docs/34). The library colors are 8-bit colors written
 * out by hand (`#ff8000` = 1, 128/255, 0, rounded to 4 places as the exporter's other colors are; `#00ff00` = 0, 1, 0),
 * and 0.3 is 30%, 0.5 is 50%.
 */

import JSZip from 'jszip';
import { describe, test, expect } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';
import { TokenScanner } from '../../src/plugin/scanner';
import { TokenValidator } from '../../src/plugin/validator';

const MODE = '1:0';
const LIB = 'VariableCollectionId:lib/1:0';
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

function makeVariable(overrides: Record<string, unknown>): Variable {
  return Object.assign(
    { key: 'key-0', remote: false, resolvedType: 'COLOR', scopes: [], description: '', variableCollectionId: 'VariableCollectionId:local' },
    overrides
  ) as unknown as Variable;
}

// The library color has two modes, and its collection's default mode is NOT its first key, so a walk that read the
// first key would get green instead of orange.
const libColor = makeVariable({
  id: 'VariableID:abc123/7:1',
  name: 'brand/primary',
  key: 'abc123',
  remote: true,
  variableCollectionId: LIB,
  valuesByMode: { 'lib-first': { r: 0, g: 1, b: 0, a: 1 }, 'lib-default': { r: 1, g: 128 / 255, b: 0, a: 1 } },
});
const libOpacity = makeVariable({
  id: 'VariableID:abc125/7:3',
  name: 'brand/opacity/50',
  key: 'abc125',
  remote: true,
  resolvedType: 'FLOAT',
  variableCollectionId: LIB,
  valuesByMode: { 'lib-first': 50, 'lib-default': 50 },
});
const wash = makeVariable({
  id: 'VariableID:2:1',
  name: 'button/wash',
  valuesByMode: { [MODE]: { color: alias(libColor.id), opacity: 30 } },
});
const washLibOpacity = makeVariable({
  id: 'VariableID:2:2',
  name: 'button/wash-half',
  valuesByMode: { [MODE]: { color: alias(libColor.id), opacity: alias(libOpacity.id) } },
});
const washGone = makeVariable({
  id: 'VariableID:2:3',
  name: 'button/wash-gone',
  valuesByMode: { [MODE]: { color: alias('VariableID:gone/9:9'), opacity: 30 } },
});

function installFigma(): void {
  (globalThis as Record<string, unknown>).figma = {
    variables: {
      getVariableByIdAsync: (id: string) => Promise.resolve([libColor, libOpacity].find(v => v.id === id) || null),
      getVariableCollectionByIdAsync: (id: string) =>
        Promise.resolve(id === LIB ? { id, name: 'Brand library', remote: true, defaultModeId: 'lib-default' } : null),
      getLocalVariableCollectionsAsync: () =>
        Promise.resolve([
          { id: 'VariableCollectionId:local', name: 'core', defaultModeId: MODE, modes: [{ modeId: MODE, name: 'Default' }] },
        ]),
      getLocalVariablesAsync: () => Promise.resolve([wash, washLibOpacity]),
    },
    getLocalTextStylesAsync: () => Promise.resolve([]),
    getLocalEffectStylesAsync: () => Promise.resolve([]),
    getLocalPaintStylesAsync: () => Promise.resolve([]),
  };
}

async function exportToken(path: string[], options: Record<string, unknown> = {}): Promise<any> {
  const exporter = new TokenExporter(Object.assign({ tokenNameCase: 'preserve' }, options) as never);
  const zip = await JSZip.loadAsync(await exporter.exportToZip());
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir || !name.endsWith('.json')) continue;
    let node = JSON.parse(await zip.files[name].async('string'));
    for (const key of path) node = node && typeof node === 'object' ? node[key] : undefined;
    if (node && node.$value !== undefined) return node;
  }
  return undefined;
}

describe('a tinted wash over a team-library variable (#2365, #4166)', () => {
  test('the scanner resolves both halves of a wash as alias targets', async () => {
    installFigma();
    const found = await new TokenScanner().resolveExternalAliasTargets([wash, washLibOpacity]);
    expect(found.variables.map(v => v.id)).toEqual([libColor.id, libOpacity.id]);
  });

  test('the real export writes the library color, in its default mode, at 30% — channels of #ff8000', async () => {
    installFigma();
    const t = await exportToken(['button', 'wash']);
    expect(t && t.$value).toEqual({ colorSpace: 'srgb', components: [1, 0.502, 0], alpha: 0.3 });
  });

  test('a library opacity resolves too: the library color at 50%', async () => {
    installFigma();
    const t = await exportToken(['button', 'wash-half']);
    expect(t && t.$value).toEqual({ colorSpace: 'srgb', components: [1, 0.502, 0], alpha: 0.5 });
  });

  test('with Figma extensions on, aliasOf names the library color by its name', async () => {
    installFigma();
    const t = await exportToken(['button', 'wash'], { includeFigmaExtensions: true });
    expect(t && t.$extensions.figma.aliasOf).toEqual({ color: '{brand.primary}' });
  });

  test('the validator reports a wash over a dangling id, and accepts one over a library variable', async () => {
    installFigma();
    const found = await new TokenScanner().resolveExternalAliasTargets([wash, washLibOpacity, washGone]);
    const issues = await new TokenValidator().validateAll({
      collections: [],
      variables: [wash, washLibOpacity, washGone],
      textStyles: [],
      effectStyles: [],
      externalVariables: found.variables,
    });
    const broken = issues.filter(i => /Broken alias/.test(i.message)).map(i => i.message);
    expect(broken).toEqual(['Broken alias reference in variable "button/wash-gone"']);
  });
});
