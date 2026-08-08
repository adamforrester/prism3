/**
 * Prism3 web dashboard — the LOCAL-STORAGE persistence adapter (first-run + brand round-trip).
 *
 * The web analogue of the plugin's `persist-figma.ts`: on every successful apply the UI stores the
 * live `BrandInput` in the browser's `localStorage`; on boot it reads it back, so a reload reopens on
 * the working brand instead of resetting to a demo. This is the thin port over `localStorage` around
 * the same pure `persist-input.ts` core (serialise + version guard) — the identical pure-core / thin-
 * port split as `persist-figma.ts` (`SharedDataPort`), just `localStorage` instead of `figma.root`.
 *
 * A missing/corrupt/version-drifted blob resolves to `null` — the single "no stored brand" signal the
 * boot path branches on to decide first-run (show the start screen) vs. returning (restore). The
 * payload is the same knobs the UI shows (no secrets), and `BrandInput` is small plain JSON.
 *
 * #480 gave the engine's `deserializeBrandInput` a loud `throw` for a present-but-untrusted blob, so
 * a Figma file can tell the designer their saved brand needs re-import instead of silently opening on
 * defaults. This adapter deliberately does NOT propagate that: `localStorage` is a browser cache, not
 * a shared artifact someone themed and handed off — a stale entry from a previous engine version is
 * routine (every deploy can bump `PERSIST_VERSION`), there is no "file" to explain a refusal about,
 * and interrupting boot over it would break the editor for a cache the user never had to think about.
 * `restoreInput` here catches the throw and treats it exactly like absence, same as before #480.
 *
 * PURE-adjacent: imports only the engine's persist core + types. `LocalStore` is the minimal slice of
 * the Web Storage API the adapter touches, so it's unit-testable against a `Map`-backed shim, and the
 * real `window.localStorage` structurally satisfies it. All calls are wrapped — a storage access can
 * throw (private-mode quota, disabled storage), and persistence must never break the editor.
 */
import type { BrandInput } from '@prism3/engine/theme';
import { serializeBrandInput, deserializeBrandInput } from '@prism3/engine/persist-input';

/** The minimal Web-Storage surface the adapter needs — the slice of `localStorage` it touches.
 *  Declaring it as a port lets a test drive persist/restore with a `Map`-backed shim; the real
 *  `window.localStorage` structurally satisfies it. */
export interface LocalStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Storage key for the working brand blob. Namespaced to avoid collision with any other app state. */
export const BRAND_KEY = 'prism3:brandInput';

/** Persist the live brand (called after a successful apply). Swallows storage errors — persistence is
 *  best-effort and must never break the editor (private mode / quota / disabled storage can throw). */
export const persistInput = (store: LocalStore, input: BrandInput): void => {
  try {
    store.setItem(BRAND_KEY, serializeBrandInput(input));
  } catch {
    /* storage unavailable (private mode, quota, disabled) — skip; the editor keeps working in-memory */
  }
};

/**
 * Read the persisted brand back, or `null` if none is stored / the blob can't be trusted (absence,
 * corruption, or schema drift all collapse to `null`) — the "first run, start from the start screen"
 * signal. A throwing/absent store also yields `null`. #480: `deserializeBrandInput` now THROWS for a
 * present-but-untrusted blob rather than returning `null` — caught here and folded back into `null`,
 * since a stale local cache is not the loud-refusal case #480 is about (see the module doc above).
 */
export const restoreInput = (store: LocalStore): BrandInput | null => {
  let raw: string | null;
  try {
    raw = store.getItem(BRAND_KEY);
  } catch {
    return null; // storage unavailable — treat as first-run
  }
  if (!raw) return null;
  try {
    return deserializeBrandInput(raw);
  } catch {
    return null; // corrupt / version-drifted local cache — same as first-run, no file to warn about
  }
};

/** Clear the persisted brand (for an explicit "start over" / new-brand reset). Best-effort. */
export const clearInput = (store: LocalStore): void => {
  try {
    store.removeItem(BRAND_KEY);
  } catch {
    /* nothing to do — a store that can't remove also can't have persisted */
  }
};
