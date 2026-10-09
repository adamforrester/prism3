/**
 * Motion FLOATs export as DTCG durations, `motion/stagger` included (prism3 #2394).
 *
 * prism3 writes motion into Figma as plain FLOAT milliseconds with no scope (Figma has no time scope).
 * Names under `motion/duration…` were already typed `duration` by name; `motion/stagger` carries none
 * of the MOTION patterns and came back as a plain number. Driven through the real exporter, so the
 * type, the value shape and the alias are checked together.
 */

import { describe, test, expect } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';

function mkVar(id: string, name: string, value: unknown): any {
  return {
    id,
    name,
    resolvedType: 'FLOAT',
    valuesByMode: { m1: value },
    scopes: [],
    description: '',
    variableCollectionId: 'c1',
  };
}

const collection: any = {
  id: 'c1',
  name: 'motion',
  defaultModeId: 'm1',
  modes: [{ modeId: 'm1', name: 'Default' }],
};

function build(vars: any[], options: Record<string, unknown> = {}) {
  const exporter = new TokenExporter(Object.assign({ tokenNameCase: 'preserve' }, options) as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (exporter as any).buildDTCGFile(collection, collection.modes[0], vars, vars) as any;
}

const vars = [
  mkVar('v1', 'nbds/motion/duration-ms/40', 40),
  mkVar('v2', 'nbds/motion/stagger', { type: 'VARIABLE_ALIAS', id: 'v1' }),
  mkVar('v3', 'nbds/layout/stagger', 3),
];

describe('motion stagger exports as a duration', () => {
  test('the stagger alias is a duration pointing at its primitive', () => {
    const file = build(vars);
    expect(file.nbds.motion.stagger.$type).toBe('duration');
    expect(file.nbds.motion.stagger.$value).toBe('{nbds.motion.duration-ms.40}');
  });

  test('the primitive it aliases is a duration in milliseconds', () => {
    const file = build(vars);
    expect(file.nbds.motion['duration-ms']['40'].$type).toBe('duration');
    expect(file.nbds.motion['duration-ms']['40'].$value).toEqual({ value: 40, unit: 'ms' });
  });

  test('the string duration format writes "40ms"', () => {
    const file = build(vars, { durationFormat: 'string' });
    expect(file.nbds.motion['duration-ms']['40'].$value).toBe('40ms');
  });

  test('a stagger outside motion is not a duration', () => {
    const file = build(vars);
    expect(file.nbds.layout.stagger.$type).not.toBe('duration');
  });
});
