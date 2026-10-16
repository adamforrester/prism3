/**
 * Font variables with no font scope export as `fontFamily` / `fontWeight`, typed by their path (prism3 #2616).
 *
 * TokenPress typed a font variable only from its Figma scope. prism3 leaves its primitives unscoped so they
 * stay out of the pickers, and unscoped `font/family/*` came back as `string`, `font/weight/700` as
 * `dimension` (the bare-number breakpoint rule) and the `font/weight-role/*` alias onto it as `number`.
 * Driven through the real exporter, so the type, the value and the alias are checked together.
 */

import { describe, test, expect } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';

function mkVar(id: string, name: string, type: string, value: unknown, scopes: string[] = []): any {
  return {
    id,
    name,
    resolvedType: type,
    valuesByMode: { m1: value },
    scopes,
    description: '',
    variableCollectionId: 'c1',
  };
}

const collection: any = {
  id: 'c1',
  name: 'core',
  defaultModeId: 'm1',
  modes: [{ modeId: 'm1', name: 'Default' }],
};

function build(vars: any[]) {
  const exporter = new TokenExporter({ tokenNameCase: 'preserve' } as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (exporter as any).buildDTCGFile(collection, collection.modes[0], vars, vars) as any;
}

const vars = [
  mkVar('v1', 'ds/core/font/weight/700', 'FLOAT', 700),
  mkVar('v2', 'ds/core/font/weight-role/strong', 'FLOAT', { type: 'VARIABLE_ALIAS', id: 'v1' }),
  mkVar('v3', 'ds/core/font/family/body', 'STRING', 'Inter'),
  mkVar('v4', 'ds/type/fontWeight/bold', 'FLOAT', 700),
  mkVar('v5', 'ds/core/font/size/16', 'FLOAT', 16),
  mkVar('v6', 'ds/icon/stroke-weight/2', 'FLOAT', 2),
  mkVar('v7', 'ds/brand/family/name', 'STRING', 'Acme'),
  mkVar('v8', 'ds/type/font/weight/600', 'FLOAT', 600, ['ALL_SCOPES']),
  mkVar('v9', 'ds/type/font/family/display', 'STRING', 'Inter', ['ALL_SCOPES']),
  mkVar('v10', 'ds/odd/font/weight/14', 'FLOAT', 14, ['FONT_SIZE']),
  mkVar('v11', 'ds/odd/font/family/bold', 'STRING', 'Bold', ['FONT_STYLE']),
];

describe('font variables with no font scope are typed by path', () => {
  test('a numeric weight primitive is a fontWeight, not a dimension', () => {
    const file = build(vars);
    expect(file.ds.core.font.weight['700'].$type).toBe('fontWeight');
    expect(file.ds.core.font.weight['700'].$value).toBe(700);
  });

  test('a weight-role alias onto it is a fontWeight pointing at the primitive', () => {
    const file = build(vars);
    expect(file.ds.core.font['weight-role'].strong.$type).toBe('fontWeight');
    expect(file.ds.core.font['weight-role'].strong.$value).toBe('{ds.core.font.weight.700}');
  });

  test('a family primitive is a fontFamily', () => {
    const file = build(vars);
    expect(file.ds.core.font.family.body.$type).toBe('fontFamily');
    expect(file.ds.core.font.family.body.$value).toBe('Inter');
  });

  test('a single fontWeight segment is a fontWeight', () => {
    const file = build(vars);
    expect(file.ds.type.fontWeight.bold.$type).toBe('fontWeight');
  });

  test("Figma's default ALL_SCOPES is not a font scope, so the path types it", () => {
    const file = build(vars);
    expect(file.ds.type.font.weight['600'].$type).toBe('fontWeight');
    expect(file.ds.type.font.family.display.$type).toBe('fontFamily');
  });

  test('a font scope still wins over the path', () => {
    const file = build(vars);
    expect(file.ds.odd.font.weight['14'].$type).toBe('dimension');
    expect(file.ds.odd.font.family.bold.$type).toBe('fontWeight');
  });

  test('a path with no font segment keeps its old type', () => {
    const file = build(vars);
    expect(file.ds.core.font.size['16'].$type).toBe('dimension');
    expect(file.ds.icon['stroke-weight']['2'].$type).toBe('dimension');
    expect(file.ds.brand.family.name.$type).toBe('string');
  });
});
