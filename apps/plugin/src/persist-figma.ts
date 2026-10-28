/**
 * Prism3 Figma plugin — the MAIN-THREAD persistence adapter (docs/22 / #131).
 *
 * The knob-rehydration half of the round-trip: on every apply the controller stores the live
 * `BrandInput` in the file's shared plugin-data; on boot it reads it back so the shared UI opens on
 * the persisted brand instead of the default. This is the thin port over `figma.root` around the
 * pure `persist-input.ts` core (serialise + version guard) — the same pure-core / thin-port split as
 * `write-plan.ts` behind `write-figma.ts`.
 *
 * Shared-data (not private plugin-data) so a companion tool could read the brand too; the payload is
 * public by design (no secrets — it's the same knobs the UI shows). Stored on `figma.root` (one blob
 * per file, document-scoped), keyed by a fixed namespace/key.
 *
 * Compiled under `tsconfig.main.json` — has `figma.*`, NO `document`. `SharedDataPort` is the minimal
 * slice of the node API the adapter touches, so it's unit-testable against an in-memory shim
 * (`apps/plugin/test-persist.ts`) with no live Figma; `figma.root` structurally satisfies it.
 */
import type { BrandInput } from '@prism3/engine/theme';
import { serializeBrandInput, deserializeBrandInput } from '@prism3/engine/persist-input';

/** The minimal shared-plugin-data surface the adapter needs — the slice of Figma's `PluginDataMixin`
 *  that `figma.root` exposes. Declaring it as a port is what lets the Node harness drive persist/
 *  restore with a `Map`-backed shim. `getSharedPluginData` returns `''` for an unset key. */
export interface SharedDataPort {
  getSharedPluginData(namespace: string, key: string): string;
  setSharedPluginData(namespace: string, key: string, value: string): void;
}

/** Shared-data namespace — must be ≥3 alphanumerics (Figma requirement). Key holds the brand blob. */
export const NS = 'prism3';
export const KEY = 'brandInput';

/** Persist the live brand into the file's shared-data (called after a successful apply). */
export const persistInput = (root: SharedDataPort, input: BrandInput): void =>
  root.setSharedPluginData(NS, KEY, serializeBrandInput(input));

/**
 * Read the persisted brand back, or `null` if none is stored — `getSharedPluginData` returns `''`
 * when unset, which is the "start from defaults" signal (a genuinely fresh file).
 *
 * #480: a NON-EMPTY blob that can't be trusted (old/foreign/corrupt shape, or a schema version this
 * build doesn't recognize) THROWS `UnrecognizedPersistedInputError` from the pure guard rather than
 * collapsing to `null` — absence and drift are no longer the same signal. The caller (`main.ts`'s
 * `restoreToUi`) must catch it and surface a loud, user-visible refusal instead of silently keeping
 * the UI on defaults, which is what let a pre-#341/#415 blob's numeric `displayCeiling` risk a silent
 * mis-parse.
 */
export const restoreInput = (root: SharedDataPort): BrandInput | null => {
  const raw = root.getSharedPluginData(NS, KEY);
  return deserializeBrandInput(raw);
};

/** Recursively key-sorted JSON: two brands are the same when these match, whatever order their keys were set in. */
const canon = (v: unknown): string => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, (x as Record<string, unknown>)[k]])) : x));

/**
 * #3081 Q810 A: whether the file holds `input` as its brand, as Apply Theme stores it (`persistInput`). Update file's
 * badge counts unapplied Theme changes as one item from this. It does not use the panel's `isDirty`: that baseline is
 * the brand as it was loaded, and Apply Theme does not reset it. Both sides go through the same serialize and parse and
 * are compared with keys sorted. False when the file holds no brand, or one this build can't read: Theme would write it.
 */
export const holdsInput = (root: SharedDataPort, input: BrandInput): boolean => {
  try {
    const held = restoreInput(root);
    return !!held && canon(held) === canon(deserializeBrandInput(serializeBrandInput(input)));
  } catch { return false; }
};
