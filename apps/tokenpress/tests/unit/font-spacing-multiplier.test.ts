/**
 * Line-height and letter-spacing multipliers with no matching scope export as `number`, typed by their path
 * (prism3 #2423).
 *
 * prism3 writes its `font/line-height/*` and `font/letter-spacing/*` ladders, and their `-role` aliases, as
 * unscoped FLOAT variables holding the multiplier (1.05, -0.04): Figma binds those two fields as pixels, so
 * no picker may offer them. Typed by the older rules, `line-height/105` read as a bare-number breakpoint and
 * `letter-spacing/neg-40` as a negative dimension, so both came back in px. Driven through the real exporter,
 * so the type, the value and the alias are checked together.
 */

import { describe, test, expect } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';

function mkVar(id: string, name: string, value: unknown, scopes: string[] = []): any {
  return {
    id,
    name,
    resolvedType: 'FLOAT',
    valuesByMode: { m1: value },
    scopes,
    description: '',
    variableCollectionId: 'c1',
  };
}

const collection: any = {
  id: 'c1',
  name: 'text-spacing',
  defaultModeId: 'm1',
  modes: [{ modeId: 'm1', name: 'Default' }],
};

function build(vars: any[]) {
  const exporter = new TokenExporter({ tokenNameCase: 'preserve' } as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (exporter as any).buildDTCGFile(collection, collection.modes[0], vars, vars) as any;
}

const vars = [
  mkVar('v1', 'ds/core/font/line-height/105', 1.05),
  mkVar('v2', 'ds/core/font/line-height-role/tight', { type: 'VARIABLE_ALIAS', id: 'v1' }),
  mkVar('v3', 'ds/core/font/letter-spacing/neg-40', -0.04),
  mkVar('v4', 'ds/core/font/letter-spacing/10', 0.01, ['ALL_SCOPES']),
  mkVar('v5', 'ds/core/font/letter-spacing-role/tightest', { type: 'VARIABLE_ALIAS', id: 'v3' }),
  mkVar('v6', 'ds/odd/font/line-height/24', 24, ['LINE_HEIGHT']),
  mkVar('v7', 'ds/odd/font/letter-spacing/2', 2, ['LETTER_SPACING']),
  mkVar('v8', 'ds/layout/breakpoint/768', 768),
];

describe('line-height and letter-spacing multipliers are typed by path', () => {
  test('a numeric line-height step is a number holding the multiplier, not a breakpoint dimension', () => {
    const file = build(vars);
    expect(file.ds.core.font['line-height']['105'].$type).toBe('number');
    expect(file.ds.core.font['line-height']['105'].$value).toBe(1.05);
  });

  test('a neg- letter-spacing step is a number, not a negative dimension', () => {
    const file = build(vars);
    expect(file.ds.core.font['letter-spacing']['neg-40'].$type).toBe('number');
    expect(file.ds.core.font['letter-spacing']['neg-40'].$value).toBe(-0.04);
    expect(file.ds.core.font['letter-spacing']['10'].$type).toBe('number');
  });

  test('a -role alias is a number pointing at its step', () => {
    const file = build(vars);
    expect(file.ds.core.font['line-height-role'].tight.$value).toBe('{ds.core.font.line-height.105}');
    expect(file.ds.core.font['letter-spacing-role'].tightest.$type).toBe('number');
  });

  test('a line-height or letter-spacing scope still wins over the path', () => {
    const file = build(vars);
    expect(file.ds.odd.font['line-height']['24'].$type).toBe('dimension');
    expect(file.ds.odd.font['letter-spacing']['2'].$type).toBe('dimension');
  });

  test('a path with no font segment keeps its old type', () => {
    const file = build(vars);
    expect(file.ds.layout.breakpoint['768'].$type).toBe('dimension');
  });
});
