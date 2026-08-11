/**
 * Namespace behaviour driven through the real TokenExporter.
 *
 * The existing namespace tests all call `createAliasReference` directly, which
 * cannot catch a disagreement between the alias builder and the exporter's root
 * wrapper — and every namespace bug so far has been exactly that kind of
 * disagreement. These tests go through `buildDTCGFile` so the two sides are
 * exercised together.
 *
 * Two regressions this file pins down:
 *
 *  1. Namespaced aliases resolving one level too high, because the wrapper is
 *     applied after conversion while aliases are built during it (#61).
 *  2. Namespaced transitions silently losing their easing curve. `resolveEasingValue`
 *     used to reverse-parse the alias back into a variable name; once aliases
 *     gained a namespace prefix nothing matched, and every transition fell
 *     through to the linear `[0, 0, 1, 1]` default with no warning.
 */

import { describe, test, expect } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';
import { TokenNameCase } from '../../src/types/plugin';

function mkVar(
  id: string,
  name: string,
  value: unknown,
  resolvedType: string = 'STRING'
): any {
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
  modes: [{ modeId: 'm1', name: 'light' }],
};

function build(vars: any[], options: Record<string, unknown>) {
  const exporter = new TokenExporter(options as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (exporter as any).buildDTCGFile(collection, collection.modes[0], vars, vars) as any;
}

/** Returns the single token-bearing root, unwrapping a namespace key if present. */
function unwrap(file: any): any {
  const keys = Object.keys(file).filter(k => !k.startsWith('$'));
  if (keys.length === 1 && !('$type' in (file[keys[0]] || {})) && !file.motion && !file.palette) {
    return file[keys[0]];
  }
  return file;
}

function collectRefs(node: any, acc: string[] = []): string[] {
  if (!node || typeof node !== 'object') {
    return acc;
  }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (typeof v === 'string' && /^\{.+\}$/.test(v)) {
      acc.push(v);
    } else if (v && typeof v === 'object') {
      collectRefs(v, acc);
    }
  }
  return acc;
}

function resolves(file: any, ref: string): boolean {
  let cur = file;
  for (const seg of ref.replace(/^\{|\}$/g, '').split('.')) {
    if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, seg)) {
      return false;
    }
    cur = cur[seg];
  }
  return !!(cur && typeof cur === 'object' && '$value' in cur);
}

describe('namespaced transitions keep their easing curve', () => {
  const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
  const CURVE = [0.2, 0, 0, 1];

  function transitionVars(easingName: string) {
    return [
      mkVar('v1', easingName, EASE),
      mkVar('v2', 'motion/duration/fast', 200, 'FLOAT'),
      mkVar('v3', 'motion/transition/enter/duration', { type: 'VARIABLE_ALIAS', id: 'v2' }, 'FLOAT'),
      mkVar('v4', 'motion/transition/enter/timingFunction', { type: 'VARIABLE_ALIAS', id: 'v1' }),
    ];
  }

  function easingOf(file: any): unknown {
    const value = unwrap(file).motion.transition.enter.$value;
    return value && value.timingFunction;
  }

  test('resolves the real curve with no namespace (baseline)', () => {
    const file = build(transitionVars('motion/easing/easeOut'), { tokenNameCase: 'preserve' });
    expect(easingOf(file)).toEqual(CURVE);
  });

  test('resolves the real curve WITH a namespace — not the linear default', () => {
    // The regression: this returned [0, 0, 1, 1] silently.
    const file = build(transitionVars('motion/easing/easeOut'), {
      tokenNameCase: 'preserve',
      namespace: 'nbds',
    });
    expect(easingOf(file)).toEqual(CURVE);
    expect(easingOf(file)).not.toEqual([0, 0, 1, 1]);
  });

  test.each(['preserve', 'kebab', 'lower'] as TokenNameCase[])(
    'resolves under a namespace in %s casing mode',
    tokenNameCase => {
      // The easing name is camelCase, so each mode rewrites it differently. The
      // lookup must follow whatever the alias builder emitted.
      const file = build(transitionVars('motion/easing/easeOut'), {
        tokenNameCase,
        namespace: 'nbds',
      });
      expect(easingOf(file)).toEqual(CURVE);
    }
  );

  test('resolves when variable names already carry the namespace', () => {
    // Here the wrapper is skipped, so the alias has no added prefix — the other
    // side of the same branch.
    const file = build(transitionVars('nbds/motion/easing/easeOut'), {
      tokenNameCase: 'preserve',
      namespace: 'nbds',
    });
    expect(easingOf(file)).toEqual(CURVE);
  });

  test('resolves when the namespace needs sanitizing', () => {
    // "a.b" is illegal in a DTCG name; both the wrapper and the alias must use
    // the same sanitized form, and the easing lookup must agree with both.
    const file = build(transitionVars('motion/easing/easeOut'), {
      tokenNameCase: 'preserve',
      namespace: 'a.b',
    });
    expect(Object.keys(file).filter(k => !k.startsWith('$'))).toEqual(['a-b']);
    expect(easingOf(file)).toEqual(CURVE);
  });

  test('still falls back to linear when the easing target genuinely is missing', () => {
    // Guards against the fix papering over real breakage: a dangling alias must
    // not resolve to some other variable's curve.
    const vars = transitionVars('motion/easing/easeOut');
    vars[3].valuesByMode.m1 = { type: 'VARIABLE_ALIAS', id: 'does-not-exist' };
    const file = build(vars, { tokenNameCase: 'preserve', namespace: 'nbds' });
    expect(easingOf(file)).toEqual([0, 0, 1, 1]);
  });
});

describe('wrapper and aliases agree through the real exporter', () => {
  const vars = [
    mkVar('v1', 'palette/white', { r: 1, g: 1, b: 1, a: 1 }, 'COLOR'),
    mkVar('v2', 'color/onSuccessContainer', { type: 'VARIABLE_ALIAS', id: 'v1' }, 'COLOR'),
  ];

  test('every alias resolves in a namespaced file', () => {
    const file = build(vars, { tokenNameCase: 'preserve', namespace: 'nbds' });
    const refs = collectRefs(file);
    expect(refs).toEqual(['{nbds.palette.white}']);
    expect(refs.filter(r => !resolves(file, r))).toEqual([]);
  });

  test('every alias resolves without a namespace', () => {
    const file = build(vars, { tokenNameCase: 'preserve' });
    const refs = collectRefs(file);
    expect(refs).toEqual(['{palette.white}']);
    expect(refs.filter(r => !resolves(file, r))).toEqual([]);
  });

  test('every alias resolves when variable names already carry the namespace', () => {
    const prefixed = [
      mkVar('v1', 'nbds/palette/white', { r: 1, g: 1, b: 1, a: 1 }, 'COLOR'),
      mkVar('v2', 'nbds/color/bg', { type: 'VARIABLE_ALIAS', id: 'v1' }, 'COLOR'),
    ];
    const file = build(prefixed, { tokenNameCase: 'preserve', namespace: 'nbds' });
    expect(collectRefs(file).filter(r => !resolves(file, r))).toEqual([]);
  });

  test('a namespace coinciding with a real top-level group does not break aliases', () => {
    // `namespace: 'color'` over a file that already has a `color/` group: the
    // wrapper is skipped because `color` is already a root key, so NO alias may
    // be prefixed. Deciding the prefix per-path instead of per-file emitted
    // `{color.palette.white}` here, which resolves to nothing.
    const coinciding = [
      mkVar('v1', 'palette/white', { r: 1, g: 1, b: 1, a: 1 }, 'COLOR'),
      mkVar('v2', 'color/base', { r: 0, g: 0, b: 0, a: 1 }, 'COLOR'),
      mkVar('v3', 'color/bg', { type: 'VARIABLE_ALIAS', id: 'v1' }, 'COLOR'),
      mkVar('v4', 'color/fg', { type: 'VARIABLE_ALIAS', id: 'v2' }, 'COLOR'),
    ];
    const file = build(coinciding, { tokenNameCase: 'preserve', namespace: 'color' });

    expect(Object.keys(file).filter(k => !k.startsWith('$')).sort()).toEqual(['color', 'palette']);
    expect(collectRefs(file).sort()).toEqual(['{color.base}', '{palette.white}']);
    expect(collectRefs(file).filter(r => !resolves(file, r))).toEqual([]);
  });

  test('a file mixing prefixed and unprefixed names keeps every alias resolvable', () => {
    // One variable supplies the `nbds` root key itself, so the wrapper is
    // skipped and the unprefixed tokens stay at the top level. Prefixing their
    // aliases pointed them into a level that does not exist.
    const mixed = [
      mkVar('v1', 'palette/white', { r: 1, g: 1, b: 1, a: 1 }, 'COLOR'),
      mkVar('v2', 'nbds/legacy/token', { r: 0, g: 0, b: 0, a: 1 }, 'COLOR'),
      mkVar('v3', 'color/toUnprefixed', { type: 'VARIABLE_ALIAS', id: 'v1' }, 'COLOR'),
      mkVar('v4', 'color/toPrefixed', { type: 'VARIABLE_ALIAS', id: 'v2' }, 'COLOR'),
    ];
    const file = build(mixed, { tokenNameCase: 'preserve', namespace: 'nbds' });

    expect(collectRefs(file).sort()).toEqual(['{nbds.legacy.token}', '{palette.white}']);
    expect(collectRefs(file).filter(r => !resolves(file, r))).toEqual([]);
  });

  test('the wrapper decision does not leak between files', () => {
    // activeNamespace is exporter state, so a file that skips the wrapper must
    // not suppress the prefix for the next file built by the same instance.
    const exporter = new TokenExporter({
      tokenNameCase: 'preserve',
      namespace: 'nbds',
    } as never);
    const prefixed = [
      mkVar('v1', 'nbds/palette/white', { r: 1, g: 1, b: 1, a: 1 }, 'COLOR'),
      mkVar('v2', 'nbds/color/bg', { type: 'VARIABLE_ALIAS', id: 'v1' }, 'COLOR'),
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = (vs: any[]) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (exporter as any).buildDTCGFile(collection, collection.modes[0], vs, vs) as any;

    const skipped = b(prefixed);
    expect(collectRefs(skipped)).toEqual(['{nbds.palette.white}']);
    expect(collectRefs(skipped).filter(r => !resolves(skipped, r))).toEqual([]);

    // Same exporter, a file that DOES need the wrapper.
    const wrapped = b(vars);
    expect(Object.keys(wrapped).filter(k => !k.startsWith('$'))).toEqual(['nbds']);
    expect(collectRefs(wrapped)).toEqual(['{nbds.palette.white}']);
    expect(collectRefs(wrapped).filter(r => !resolves(wrapped, r))).toEqual([]);
  });

  test('a sanitized namespace is used for BOTH the root key and the alias', () => {
    const file = build(vars, { tokenNameCase: 'preserve', namespace: 'My Brand' });
    expect(Object.keys(file).filter(k => !k.startsWith('$'))).toEqual(['My-Brand']);
    expect(collectRefs(file)).toEqual(['{My-Brand.palette.white}']);
    expect(collectRefs(file).filter(r => !resolves(file, r))).toEqual([]);
  });
});
