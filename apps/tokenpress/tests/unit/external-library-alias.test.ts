/**
 * prism3 #4166 — an alias to a team-library variable.
 *
 * The scanner reads `figma.variables.getLocalVariablesAsync()` only, so a local variable that aliases a variable from an
 * enabled team library pointed at an id the export had no record of. The DTCG exporter wrote `{VariableID:…}`, the
 * validator called it a broken alias (an error, which blocks the export), and the raw-figma exporter named the target
 * 'Unknown'. The Plugin API resolves such an id with `figma.variables.getVariableByIdAsync`, for any variable the file
 * has imported.
 *
 * Owner decision C on #4166 (2026-11-19): the alias exports as a normal reference by the target's name, and
 * `$extensions.figma.externalAlias` marks it as living outside this export. An id the API cannot resolve keeps today's
 * broken-alias behavior.
 */

import { describe, test, expect } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';
import { TokenScanner } from '../../src/plugin/scanner';
import { TokenValidator } from '../../src/plugin/validator';
import { RawFigmaExporter } from '../../src/plugin/format-exporters/raw-figma-exporter';

const MODE = '1:0';

function makeVariable(overrides: Partial<Variable>): Variable {
  return {
    id: overrides.id || 'VariableID:0',
    name: overrides.name || 'token',
    key: overrides.key || 'key-0',
    remote: overrides.remote || false,
    resolvedType: overrides.resolvedType || 'COLOR',
    scopes: overrides.scopes || [],
    valuesByMode: overrides.valuesByMode || { [MODE]: { r: 1, g: 0, b: 0, a: 1 } },
    variableCollectionId: overrides.variableCollectionId || 'VariableCollectionId:local',
    description: overrides.description || '',
  } as unknown as Variable;
}

// The library variable: imported into the file, so `getVariableByIdAsync` knows it; not local.
const remote = makeVariable({
  id: 'VariableID:abc123/7:1',
  name: 'brand/primary',
  key: 'abc123',
  remote: true,
  variableCollectionId: 'VariableCollectionId:lib/1:0',
});
const local = makeVariable({
  id: 'VariableID:2:1',
  name: 'button/fill',
  valuesByMode: { [MODE]: { type: 'VARIABLE_ALIAS', id: remote.id } },
});
const dangling = makeVariable({
  id: 'VariableID:2:2',
  name: 'button/stroke',
  valuesByMode: { [MODE]: { type: 'VARIABLE_ALIAS', id: 'VariableID:gone/9:9' } },
});

/** A stand-in for the slice of `figma.variables` the resolver calls, counting lookups. */
function installFigma(): { lookups: string[] } {
  const lookups: string[] = [];
  (globalThis as Record<string, unknown>).figma = {
    variables: {
      getVariableByIdAsync: (id: string) => {
        lookups.push(id);
        return Promise.resolve(id === remote.id ? remote : null);
      },
      getVariableCollectionByIdAsync: (id: string) =>
        Promise.resolve(id === remote.variableCollectionId ? { id, name: 'Brand library', remote: true } : null),
    },
  };
  return { lookups };
}

describe('team-library alias (#4166)', () => {
  test('the scanner resolves an alias target that is not local, once, and skips an id it cannot resolve', async () => {
    const { lookups } = installFigma();
    const found = await new TokenScanner().resolveExternalAliasTargets([local, dangling, local]);
    expect(found.variables.map(v => v.id)).toEqual([remote.id]);
    expect(found.collectionNames[remote.variableCollectionId]).toBe('Brand library');
    expect(lookups.filter(id => id === remote.id).length).toBe(1);
  });

  test('the DTCG token is a reference by the target name, marked external', async () => {
    installFigma();
    const exporter = new TokenExporter({ tokenNameCase: 'preserve' } as never);
    const found = await new TokenScanner().resolveExternalAliasTargets([local]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = exporter as any;
    e.setExternalAliasTargets(found);
    const token = e.convertVariableToDTCG(local, local.valuesByMode[MODE], e.variableMapOf([local]));
    expect(token.$value).toBe('{brand.primary}');
    expect(token.$extensions.figma.externalAlias).toEqual({
      variableId: remote.id,
      variableKey: 'abc123',
      collection: 'Brand library',
    });
  });

  test('an alias the API cannot resolve keeps the raw id, unmarked', async () => {
    installFigma();
    const exporter = new TokenExporter({ tokenNameCase: 'preserve' } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = exporter as any;
    e.setExternalAliasTargets(await new TokenScanner().resolveExternalAliasTargets([dangling]));
    const token = e.convertVariableToDTCG(dangling, dangling.valuesByMode[MODE], e.variableMapOf([dangling]));
    expect(token.$value).toBe('{VariableID:gone/9:9}');
    expect(token.$extensions).toBeUndefined();
  });

  test('the validator accepts a resolved library target and still reports the dangling one', async () => {
    installFigma();
    const found = await new TokenScanner().resolveExternalAliasTargets([local, dangling]);
    const issues = await new TokenValidator().validateAll({
      collections: [],
      variables: [local, dangling],
      textStyles: [],
      effectStyles: [],
      externalVariables: found.variables,
    });
    const broken = issues.filter(i => /Broken alias/.test(i.message)).map(i => i.message);
    expect(broken).toEqual(['Broken alias reference in variable "button/stroke"']);
  });

  test('the raw-figma export names the library target, not "Unknown"', async () => {
    installFigma();
    const found = await new TokenScanner().resolveExternalAliasTargets([local]);
    const variableMap = new Map([local].concat(found.variables).map(v => [v.id, v]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (new RawFigmaExporter() as any).formatVariable(local, MODE, variableMap);
    expect(raw.alias.name).toBe('brand/primary');
  });
});
