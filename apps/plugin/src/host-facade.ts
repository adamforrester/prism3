/**
 * A STAND-IN FOR A HOST OBJECT THAT IS NEVER A `Proxy` OVER IT (#3209).
 *
 * On Figma, `figma`'s methods (`getLocalTextStylesAsync` and the rest) are own data properties that are neither writable
 * nor configurable. A `Proxy` whose target is such an object must return the property's own value from its `get` trap;
 * a bound copy or a substitute throws on every read. #3177 wrapped `figma` in a `Proxy` to answer the root's searches
 * from one read, and every Update check and apply on real Figma threw on the first method it read.
 *
 * `facade(host, own)` is a plain object. Each member of `own` is its own value. Each of `host`'s members, its own and
 * its prototypes', is a getter that reads `host` as it is now (a method bound to `host`, so the host's receiver checks
 * still pass) and a setter that writes `host`. A member `host` does not list (added later, or answered by a trap of its
 * own) is reached through the facade's prototype, a `Proxy` over an EMPTY object: its target holds nothing, so no
 * invariant can bind its trap, whatever `host` holds.
 */
const read = (host: object, k: PropertyKey): unknown => {
  const v = Reflect.get(host, k);
  return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(host) : v;
};

export const facade = <T extends object>(host: T, own: Record<string, unknown>): T => {
  const rest = new Proxy({}, {
    get: (_t, k) => read(host, k),
    set: (_t, k, x) => Reflect.set(host, k, x),
    has: (_t, k) => k in host,
  });
  const out: Record<PropertyKey, unknown> = Object.create(rest);
  const keys = new Set<PropertyKey>();
  for (let o: object | null = host; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) for (const k of Reflect.ownKeys(o)) keys.add(k);
  for (const k of keys) {
    if (k === 'constructor' || Object.prototype.hasOwnProperty.call(own, k)) continue;
    Object.defineProperty(out, k, { enumerable: true, configurable: true, get: () => read(host, k), set: (x: unknown) => { Reflect.set(host, k, x); } });
  }
  for (const k of Object.keys(own)) Object.defineProperty(out, k, { value: own[k], enumerable: true, configurable: true, writable: true });
  return out as T;
};
