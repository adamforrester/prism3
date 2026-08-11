/**
 * Regression test for scope-based dimension detection.
 *
 * Reported in the community: a FLOAT variable named `0`, aliased into two
 * different consumer scopes, exported with two different DTCG types — the
 * radius alias correctly typed as `dimension`, the stroke alias incorrectly
 * typed as `number`. Root cause: the FLOAT fall-through in
 * mapVariableTypeToDTCG only treated WIDTH_HEIGHT and GAP scopes as
 * dimensions; CORNER_RADIUS, STROKE_FLOAT, and EFFECT_FLOAT all fell to
 * `number`. CORNER_RADIUS happened to work in many cases via the
 * isBorderDimensionVariable name heuristic, but the heuristic doesn't fire
 * when source/alias names are short numerics like `0`.
 *
 * Fix: include CORNER_RADIUS, STROKE_FLOAT, and EFFECT_FLOAT in the
 * dimension fall-through alongside WIDTH_HEIGHT and GAP.
 */

import { describe, test, expect } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';

// Reach into the private method without hitting Figma globals.
function mapType(scopes: any[], variableName?: string): string {
  const exporter = new TokenExporter({} as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (exporter as any).mapVariableTypeToDTCG('FLOAT', scopes, variableName);
}

describe('mapVariableTypeToDTCG — scope-based dimension detection', () => {
  test('CORNER_RADIUS scope maps to dimension regardless of name', () => {
    expect(mapType(['CORNER_RADIUS'], '0')).toBe('dimension');
    expect(mapType(['CORNER_RADIUS'], 'arbitrary-name')).toBe('dimension');
  });

  test('STROKE_FLOAT scope maps to dimension (regression: was number)', () => {
    expect(mapType(['STROKE_FLOAT'], '0')).toBe('dimension');
    expect(mapType(['STROKE_FLOAT'], 'arbitrary-name')).toBe('dimension');
  });

  test('EFFECT_FLOAT scope maps to dimension', () => {
    expect(mapType(['EFFECT_FLOAT'], '0')).toBe('dimension');
  });

  // FONT_SIZE has an explicit check higher in the function, but it's also
  // included in the fallback list as documentation + a safety net (see the
  // comment on dimensionScopes in src/plugin/exporter.ts). This test
  // exercises both paths via the same public outcome.
  test('FONT_SIZE scope maps to dimension', () => {
    expect(mapType(['FONT_SIZE'], '0')).toBe('dimension');
    expect(mapType(['FONT_SIZE'], 'body-md')).toBe('dimension');
  });

  test('WIDTH_HEIGHT and GAP still map to dimension', () => {
    expect(mapType(['WIDTH_HEIGHT'], '16')).toBe('dimension');
    expect(mapType(['GAP'], '8')).toBe('dimension');
  });

  test('multiple scopes — any dimension scope wins', () => {
    expect(mapType(['CORNER_RADIUS', 'STROKE_FLOAT'], '0')).toBe('dimension');
    expect(mapType(['ALL_SCOPES', 'CORNER_RADIUS'], '0')).toBe('dimension');
  });

  test('FLOAT with no dimension scope still falls back to number', () => {
    expect(mapType([], 'arbitrary')).toBe('number');
    expect(mapType(['ALL_SCOPES'], 'arbitrary')).toBe('number');
  });

  test('OPACITY scope still maps to number (more specific rule wins)', () => {
    expect(mapType(['OPACITY'], 'opacity-50')).toBe('number');
  });

  test('scope-based detection does not regress earlier name heuristics', () => {
    // Border-dimension name heuristic still fires even without a matching scope
    expect(mapType([], 'border-radius-md')).toBe('dimension');
  });
});
