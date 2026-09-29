/**
 * A REMOVED OBJECT IS DEAD — the host rule every offline shim that models `remove()` shares (#1791, #1790).
 *
 * MOVED HERE from `test-prune.ts` (#1791), where `dead`, `dieOnRemove` and `removeOnce` are unchanged, so
 * `test-mcp-paste.ts` models the same host rather than a second, more forgiving one. In Figma, reading any
 * property of a removed style, variable or collection but `id` and `removed` throws the host's own error;
 * the style message is the one a confirmed prune hit live, on a real Figma test file, at engine 0.202.0:
 * `prune failed: in get_name: The style with id "S:…" does not exist`. A shim whose `remove()` only set a
 * flag let an executor that read `.name` after `.remove()` pass in Node and throw in Figma. The messages are
 * literals, not derived from any executor.
 *
 * Two ways to attach the rule, for the two shapes of shim:
 *   · `dieOnRemove` — CLASS shims (`test-prune.ts`) name the properties they model; each becomes an
 *     accessor that throws once `obj.removed` is set.
 *   · `deadOnRemove` — OBJECT-LITERAL shims (`test-mcp-paste.ts`) whose objects gain properties as the
 *     executors write them (`effects`, `paints`, `layoutGrids`, a text style's metrics). A list would miss
 *     whatever an executor adds later, so the object is wrapped whole: EVERY read or write but `id` and
 *     `removed` throws once removed, methods included — which makes a second `remove()` throw at the read.
 *
 * Nothing here imports an executor: the shim is a HOST.
 */

export const dead = (what: string, id: string, prop: string): Error =>
  new Error(`in get_${prop}: The ${what} with id "${id}" does not exist`);

/** Define `props` on `obj` as accessors that throw once `obj.removed` is set. Initial values are kept. */
export const dieOnRemove = (obj: { id: string; removed: boolean }, what: string, props: string[]): void => {
  for (const prop of props) {
    let value = (obj as unknown as Record<string, unknown>)[prop];
    Object.defineProperty(obj, prop, {
      get: () => { if (obj.removed) throw dead(what, obj.id, prop); return value; },
      set: (v: unknown) => { if (obj.removed) throw dead(what, obj.id, prop); value = v; },
      enumerable: true,
      configurable: true,
    });
  }
};

/** `remove()` on an object that is already gone throws too — the host has nothing left to remove. */
export const removeOnce = (obj: { id: string; removed: boolean }, what: string): void => {
  if (obj.removed) throw dead(what, obj.id, 'remove');
  obj.removed = true;
};

/**
 * Wrap `obj` so that, once its `removed` flag is set, every property read or write but `id` and `removed`
 * throws `dead(what, id, prop)`. `removed` is added NON-enumerable, so a snapshot that spreads the object
 * sees exactly what it saw before. Use the returned proxy everywhere, including inside the object's own
 * methods (their `this` is the proxy when called through it), so identity checks see one object.
 */
export const deadOnRemove = <T extends { id: string }>(obj: T, what: string): T & { removed: boolean } => {
  Object.defineProperty(obj, 'removed', { value: false, writable: true, enumerable: false, configurable: true });
  const live = obj as T & { removed: boolean };
  return new Proxy(live, {
    get(t, p, receiver) {
      if (t.removed && p !== 'id' && p !== 'removed') throw dead(what, t.id, String(p));
      return Reflect.get(t, p, receiver);
    },
    set(t, p, v, receiver) {
      if (t.removed && p !== 'removed') throw dead(what, t.id, String(p));
      return Reflect.set(t, p, v, receiver);
    },
  });
};
