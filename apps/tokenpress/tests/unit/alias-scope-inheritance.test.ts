/**
 * Regression test for alias scope inheritance.
 *
 * Reported in the community after the v2.0.2 stroke fix: aliases of FLOAT
 * primitives still typed as `number` for line-height, font-size, and
 * unscoped values when the alias itself shipped with empty scopes ("All
 * scopes" default in Figma). The previous fix only patched the FLOAT
 * fall-through to recognize spatial scopes — it didn't address aliases
 * that drop the source's scopes entirely.
 *
 * Fix: when an alias has no explicit scopes, walk the alias chain to its
 * source and inherit the source's scopes for type resolution.
 */

import { describe, test, expect } from 'vitest';
import { TokenExporter } from '../../src/plugin/exporter';

function makeVariable(overrides: Partial<Variable>): Variable {
  return {
    id: overrides.id || 'VariableID:0',
    name: overrides.name || 'token',
    resolvedType: overrides.resolvedType || 'FLOAT',
    scopes: overrides.scopes || [],
    valuesByMode: overrides.valuesByMode || { '1:0': 0 },
    description: overrides.description || '',
    codeSyntax: overrides.codeSyntax,
  } as unknown as Variable;
}

function convert(
  alias: Variable,
  aliasValue: VariableValue,
  variableMap: Map<string, Variable>
): { $type: string } {
  const exporter = new TokenExporter({} as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (exporter as any).convertVariableToDTCG(alias, aliasValue, variableMap);
}

describe('alias scope inheritance — empty alias scopes walk to source', () => {
  test('alias of FONT_SIZE primitive types as dimension when alias has no scopes', () => {
    const source = makeVariable({
      id: 'VariableID:source',
      name: 'core/0',
      scopes: ['FONT_SIZE'],
      valuesByMode: { '1:0': 0 },
    });
    const alias = makeVariable({
      id: 'VariableID:alias',
      name: 'semantic/font-size/none',
      scopes: [], // No explicit scopes — the bug case
      valuesByMode: { '1:0': { type: 'VARIABLE_ALIAS', id: source.id } },
    });
    const aliasValue = alias.valuesByMode['1:0'];
    const variableMap = new Map([source, alias].map(v => [v.id, v]));

    expect(convert(alias, aliasValue, variableMap).$type).toBe('dimension');
  });

  test('alias of WIDTH_HEIGHT primitive (unscoped alias) inherits dimension', () => {
    const source = makeVariable({
      id: 'VariableID:source',
      name: '0',
      scopes: ['WIDTH_HEIGHT'],
    });
    const alias = makeVariable({
      id: 'VariableID:alias',
      name: 'spacing/none',
      scopes: [],
      valuesByMode: { '1:0': { type: 'VARIABLE_ALIAS', id: source.id } },
    });
    const variableMap = new Map([source, alias].map(v => [v.id, v]));

    expect(convert(alias, alias.valuesByMode['1:0'], variableMap).$type).toBe('dimension');
  });

  test('alias chain (alias → alias → source) walks to deepest source', () => {
    const source = makeVariable({
      id: 'VariableID:source',
      name: '0',
      scopes: ['STROKE_FLOAT'],
    });
    const mid = makeVariable({
      id: 'VariableID:mid',
      name: 'mid/0',
      scopes: [],
      valuesByMode: { '1:0': { type: 'VARIABLE_ALIAS', id: source.id } },
    });
    const alias = makeVariable({
      id: 'VariableID:alias',
      name: 'top/none',
      scopes: [],
      valuesByMode: { '1:0': { type: 'VARIABLE_ALIAS', id: mid.id } },
    });
    const variableMap = new Map([source, mid, alias].map(v => [v.id, v]));

    expect(convert(alias, alias.valuesByMode['1:0'], variableMap).$type).toBe('dimension');
  });

  test('alias with explicit scopes uses its own (does not walk)', () => {
    // Alias scopes win — the user has expressed intent specifically on the alias.
    const source = makeVariable({
      id: 'VariableID:source',
      name: '0',
      scopes: ['WIDTH_HEIGHT'],
    });
    const alias = makeVariable({
      id: 'VariableID:alias',
      name: 'opacity/none',
      scopes: ['OPACITY'], // alias explicitly scoped to OPACITY → number
      valuesByMode: { '1:0': { type: 'VARIABLE_ALIAS', id: source.id } },
    });
    const variableMap = new Map([source, alias].map(v => [v.id, v]));

    expect(convert(alias, alias.valuesByMode['1:0'], variableMap).$type).toBe('number');
  });

  test('cycle in alias chain falls back to alias scopes (no infinite loop)', () => {
    const a = makeVariable({ id: 'VariableID:a', name: 'a', scopes: [] });
    const b = makeVariable({ id: 'VariableID:b', name: 'b', scopes: [] });
    a.valuesByMode = { '1:0': { type: 'VARIABLE_ALIAS', id: b.id } };
    b.valuesByMode = { '1:0': { type: 'VARIABLE_ALIAS', id: a.id } };
    const variableMap = new Map([a, b].map(v => [v.id, v]));

    // Should not throw, should not hang. Falls back to `number` because
    // neither variable has scopes and the cycle terminates resolution.
    expect(() => convert(a, a.valuesByMode['1:0'], variableMap)).not.toThrow();
    expect(convert(a, a.valuesByMode['1:0'], variableMap).$type).toBe('number');
  });

  test('source also has empty scopes → falls back to number (no false dimension)', () => {
    // Both alias and source unscoped — we have no signal of intent, so the
    // existing fallback (number) is correct.
    const source = makeVariable({ id: 'VariableID:source', name: '0', scopes: [] });
    const alias = makeVariable({
      id: 'VariableID:alias',
      name: 'something/none',
      scopes: [],
      valuesByMode: { '1:0': { type: 'VARIABLE_ALIAS', id: source.id } },
    });
    const variableMap = new Map([source, alias].map(v => [v.id, v]));

    expect(convert(alias, alias.valuesByMode['1:0'], variableMap).$type).toBe('number');
  });
});
