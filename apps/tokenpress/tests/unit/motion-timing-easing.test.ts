/**
 * Figma's motion variable types export as DTCG (prism3 #2412).
 *
 * prism3 now writes durations as TIMING variables, which hold SECONDS, and easing curves, easing roles and
 * springs as EASING variables, which hold a `MotionEasing`. TIMING exports as a `duration` in the same
 * milliseconds a FLOAT motion duration always did, so a consumer sees no change. A CUSTOM_CUBIC_BEZIER
 * exports as a DTCG `cubicBezier`. A CUSTOM_SPRING has no DTCG type and Figma keeps only its normalized
 * `bounce`, so it exports as `spring` holding `{ bounce }`. An alias exports as an alias, typed by what it
 * resolves to. Driven through the real exporter.
 */

import { describe, test, expect } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';

function mkVar(id: string, name: string, resolvedType: string, value: unknown): any {
  return {
    id,
    name,
    resolvedType,
    valuesByMode: { m1: value },
    scopes: ['ALL_SCOPES'],
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

const bezier = { type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { x1: 0.2, y1: 0, x2: 0, y2: 1 } };
const vars = [
  // A float32 read of 0.26 s, as the live host returns it.
  mkVar('t1', 'ds/motion/duration-ms/260', 'TIMING', 0.25999999046325684),
  mkVar('t2', 'ds/motion/duration/normal', 'TIMING', { type: 'VARIABLE_ALIAS', id: 't1' }),
  mkVar('e1', 'ds/motion/easing/standard', 'EASING', bezier),
  mkVar('e2', 'ds/motion/easing-role/default', 'EASING', { type: 'VARIABLE_ALIAS', id: 'e1' }),
  mkVar('s1', 'ds/motion/spring/snappy', 'EASING', { type: 'CUSTOM_SPRING', easingFunctionSpring: { bounce: 0.10000000149011612 } }),
  mkVar('s2', 'ds/motion/spring/role', 'EASING', { type: 'VARIABLE_ALIAS', id: 's1' }),
  mkVar('p1', 'ds/motion/easing/preset', 'EASING', { type: 'EASE_OUT' }),
];

describe('Figma TIMING and EASING variables export as DTCG', () => {
  test('a TIMING value is a duration in milliseconds, float32 noise rounded away', () => {
    const file = build(vars);
    expect(file.ds.motion['duration-ms']['260'].$type).toBe('duration');
    expect(file.ds.motion['duration-ms']['260'].$value).toEqual({ value: 260, unit: 'ms' });
  });

  test('a TIMING alias is a duration alias', () => {
    const file = build(vars);
    expect(file.ds.motion.duration.normal.$type).toBe('duration');
    expect(file.ds.motion.duration.normal.$value).toBe('{ds.motion.duration-ms.260}');
  });

  test('the string duration format writes "260ms"', () => {
    const file = build(vars, { durationFormat: 'string' });
    expect(file.ds.motion['duration-ms']['260'].$value).toBe('260ms');
  });

  test('a CUSTOM_CUBIC_BEZIER is a cubicBezier array', () => {
    const file = build(vars);
    expect(file.ds.motion.easing.standard.$type).toBe('cubicBezier');
    expect(file.ds.motion.easing.standard.$value).toEqual([0.2, 0, 0, 1]);
  });

  test('an EASING alias to a curve is a cubicBezier alias', () => {
    const file = build(vars);
    expect(file.ds.motion['easing-role'].default.$type).toBe('cubicBezier');
    expect(file.ds.motion['easing-role'].default.$value).toBe('{ds.motion.easing.standard}');
  });

  test('a CUSTOM_SPRING is a spring holding its bounce', () => {
    const file = build(vars);
    expect(file.ds.motion.spring.snappy.$type).toBe('spring');
    expect(file.ds.motion.spring.snappy.$value).toEqual({ bounce: 0.1 });
  });

  test('an EASING alias to a spring is a spring alias', () => {
    const file = build(vars);
    expect(file.ds.motion.spring.role.$type).toBe('spring');
    expect(file.ds.motion.spring.role.$value).toBe('{ds.motion.spring.snappy}');
  });

  test('a built-in easing exports as its name', () => {
    const file = build(vars);
    expect(file.ds.motion.easing.preset.$type).toBe('string');
    expect(file.ds.motion.easing.preset.$value).toBe('EASE_OUT');
  });
});
