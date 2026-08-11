/**
 * A dependency-free stand-in for the slice of vitest this suite actually uses.
 *
 *   npx tsx apps/tokenpress/test.ts
 *
 * WHY this exists rather than `vitest`: the repo runs ONE bundler (esbuild), and vitest 4.x
 * both depends on and peer-requires vite — so keeping the runner would have kept vite in the
 * tree that the port exists to remove. The engine and plugin suites are already dependency-free
 * `ok(...)` scripts run through tsx, so this is the house pattern rather than a new one.
 *
 * The surface is deliberately CLOSED to what the ported tests call, measured rather than guessed:
 * `describe` / `test` / `it` / `beforeEach` / `expect`, `test.each` + `it.each`, and exactly 14
 * matchers plus `.not`. Nothing async — no `.resolves` / `.rejects` appears in the suite. Anything
 * outside that throws `unsupported matcher` instead of silently passing, which is the property that
 * matters: a harness that quietly no-ops an assertion it does not implement converts a real failure
 * into a green run, and the port's whole claim is that behavior did not change.
 *
 * `deepEqual` is its own implementation because `toEqual` is 77 of the 490 assertions and the
 * emitted DTCG trees it compares are nested objects with numeric leaves. Its NaN and
 * `undefined`-property semantics are pinned in `test.ts`'s self-check, because a comparison
 * function that returns `true` too easily is the same class of silent pass.
 */

let failed = 0;
let total = 0;
const stack: string[] = [];
/** Registered `beforeEach` hooks, innermost last — reset per `describe` on exit. */
const hooks: Array<() => void> = [];
/** Collected-but-not-yet-run tests, in declaration order. Drained by `run()`. */
const queue: Array<{ name: string; hooks: Array<() => void>; body: () => unknown }> = [];

export const describe = (label: string, body: () => void): void => {
  stack.push(label);
  const depth = hooks.length;
  try {
    body();
  } finally {
    hooks.length = depth; // a hook is scoped to its describe, like vitest's
    stack.pop();
  }
};

export const beforeEach = (fn: () => void): void => {
  hooks.push(fn);
};

type TestFn = ((label: string, body: () => unknown) => void) & {
  each: (rows: readonly unknown[][]) => (label: string, body: (...args: unknown[]) => unknown) => void;
};

/**
 * COLLECT, don't run. 15 of the ported test bodies are `async`, and `describe` bodies are
 * synchronous — so running a test the moment it is declared would fire those 15 concurrently and let
 * them race each other through the shared state `beforeEach` sets up. (Observed, not theorized: it
 * made blur-only-shadow-skip see another test's exporter.) vitest collects a file then runs it
 * sequentially; so does this. The hook list is snapshotted here because `describe` truncates it on
 * exit, which is before `run()` gets to it.
 */
const collect = (label: string, body: () => unknown): void => {
  queue.push({ name: [...stack, label].join(' › '), hooks: [...hooks], body });
};

/** Run everything collected so far, sequentially, and clear the queue. */
export const run = async (): Promise<void> => {
  const pending = queue.splice(0, queue.length);
  for (const { name, hooks: own, body } of pending) {
    total++;
    try {
      for (const h of own) h();
      await body();
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${name}\n      ${msg.split('\n').join('\n      ')}`);
    }
  }
};

const each =
  (rows: readonly unknown[][]) =>
  (label: string, body: (...args: unknown[]) => unknown): void => {
    for (const row of rows) {
      const args = Array.isArray(row) ? row : [row];
      // vitest substitutes %s/%d/%i/%f/%j/%o positionally; these tests only use %s and %d.
      let i = 0;
      const rendered = label.replace(/%[sdifjo]/g, () => String(args[i++]));
      collect(rendered === label ? `${label} [${args.join(', ')}]` : rendered, () => body(...args));
    }
  };

export const test = Object.assign(collect, { each }) as TestFn;
export const it = test;

/** Structural equality. Order-insensitive on keys, order-SENSITIVE on arrays (as vitest is). */
export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true; // covers NaN === NaN, unlike ===
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  // A key present-but-undefined is NOT equal to an absent key. vitest's toEqual treats them as
  // equal; this is deliberately stricter, and no ported assertion depends on the looser reading
  // (asserted in test.ts). Being stricter can only turn a silent pass into a visible failure.
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => Object.prototype.hasOwnProperty.call(bo, k) && deepEqual(ao[k], bo[k]));
};

const show = (v: unknown): string => {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'bigint') return `${v}n`;
  if (v === undefined) return 'undefined';
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
};

type Matchers = {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toHaveLength(n: number): void;
  toContain(needle: unknown): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeNaN(): void;
  toBeCloseTo(expected: number, digits?: number): void;
  toBeGreaterThan(n: number): void;
  toBeGreaterThanOrEqual(n: number): void;
  toBeLessThan(n: number): void;
  toBeLessThanOrEqual(n: number): void;
  toThrow(expected?: string | RegExp): void;
};

const build = (received: unknown, negated: boolean): Matchers => {
  // One assertion site: `pass` is what the matcher computed, `detail` is the message if it is wrong.
  const check = (pass: boolean, detail: string): void => {
    if (pass === negated) {
      throw new Error(negated ? `expected NOT: ${detail}` : detail);
    }
  };
  const asNumber = (label: string): number => {
    if (typeof received !== 'number') {
      throw new Error(`${label}: received is ${show(received)}, not a number`);
    }
    return received;
  };
  return {
    toBe: (expected) =>
      check(Object.is(received, expected), `expected ${show(expected)}, got ${show(received)}`),
    toEqual: (expected) =>
      check(deepEqual(received, expected), `expected ${show(expected)}, got ${show(received)}`),
    toHaveLength: (n) => {
      const len = (received as { length?: unknown } | null)?.length;
      check(len === n, `expected length ${n}, got ${show(len)}`);
    },
    toContain: (needle) => {
      if (typeof received === 'string') {
        check(
          received.includes(String(needle)),
          `expected ${show(received)} to contain ${show(needle)}`,
        );
        return;
      }
      if (!Array.isArray(received)) {
        throw new Error(`toContain: received ${show(received)} is neither string nor array`);
      }
      check(
        received.some((x) => Object.is(x, needle)),
        `expected ${show(received)} to contain ${show(needle)}`,
      );
    },
    toBeDefined: () => check(received !== undefined, `expected defined, got undefined`),
    toBeUndefined: () => check(received === undefined, `expected undefined, got ${show(received)}`),
    toBeNull: () => check(received === null, `expected null, got ${show(received)}`),
    toBeNaN: () => check(Number.isNaN(received), `expected NaN, got ${show(received)}`),
    toBeCloseTo: (expected, digits = 2) => {
      const got = asNumber('toBeCloseTo');
      // vitest's rule: |diff| < 10**-digits / 2.
      const pass = Math.abs(got - expected) < Math.pow(10, -digits) / 2;
      check(pass, `expected ${got} to be close to ${expected} (${digits} digits)`);
    },
    toBeGreaterThan: (n) => {
      const got = asNumber('toBeGreaterThan');
      check(got > n, `expected ${got} > ${n}`);
    },
    toBeGreaterThanOrEqual: (n) => {
      const got = asNumber('toBeGreaterThanOrEqual');
      check(got >= n, `expected ${got} >= ${n}`);
    },
    toBeLessThan: (n) => {
      const got = asNumber('toBeLessThan');
      check(got < n, `expected ${got} < ${n}`);
    },
    toBeLessThanOrEqual: (n) => {
      const got = asNumber('toBeLessThanOrEqual');
      check(got <= n, `expected ${got} <= ${n}`);
    },
    toThrow: (expected) => {
      if (typeof received !== 'function') {
        throw new Error(`toThrow: received ${show(received)} is not a function`);
      }
      let threw: unknown;
      let did = false;
      try {
        (received as () => unknown)();
      } catch (err) {
        did = true;
        threw = err;
      }
      if (!did) {
        check(false, 'expected the call to throw, and it did not');
        return;
      }
      const msg = threw instanceof Error ? threw.message : String(threw);
      if (expected === undefined) {
        check(true, '');
        return;
      }
      const pass = typeof expected === 'string' ? msg.includes(expected) : expected.test(msg);
      check(pass, `expected throw matching ${show(String(expected))}, got ${show(msg)}`);
    },
  };
};

/** A matcher this harness does not implement must FAIL LOUDLY, never no-op into a pass. */
const guard = (m: Matchers): Matchers =>
  new Proxy(m, {
    get(target, prop, recv) {
      if (prop in target) return Reflect.get(target, prop, recv);
      if (typeof prop === 'string' && prop.startsWith('to')) {
        throw new Error(
          `unsupported matcher \`${prop}\` — apps/tokenpress/test-harness.ts implements only the ` +
            `matchers this suite used at port time. Implement it there rather than working around it.`,
        );
      }
      return Reflect.get(target, prop, recv);
    },
  });

export const expect = (received: unknown): Matchers & { not: Matchers } => {
  const positive = guard(build(received, false));
  return Object.assign(positive, { not: guard(build(received, true)) }) as Matchers & {
    not: Matchers;
  };
};

export const summary = (): { total: number; failed: number } => ({ total, failed });

/**
 * Zero the counters. For `test.ts`'s self-check ONLY — its probe tests must not land in the census
 * that is compared against the vitest baseline. Never call this from a ported test file.
 */
export const resetCounters = (): void => {
  total = 0;
  failed = 0;
  queue.length = 0;
  hooks.length = 0;
  stack.length = 0;
};
