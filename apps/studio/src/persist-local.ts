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
import { type BrandInput, serializeBrandInput, deserializeBrandInput } from '@prism3/engine';
import type { Origin, Provenance } from './provenance';

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

/**
 * Storage key for the brand's ORIGIN and BASELINE (#3880, owner decision A, 2026-11-18): where the working brand came
 * from and the input it is measured against, so a reload changes nothing about what is dirty. Before it, a reload
 * restored the brand as its own baseline (`{ kind: 'file' }`), edits made before the reload stopped counting, and the
 * next brand chosen replaced them, and the only stored copy, without the overwrite confirm.
 *
 * A second key beside `BRAND_KEY`, written by the same `persistInput` call. It carries a fingerprint of the brand blob
 * it was written with, so the two are only ever read back as a pair: a store holding a brand from before this key
 * existed, or a pair one write of which failed, restores as before the change.
 */
export const ORIGIN_KEY = 'prism3:origin';

/** A short, stable fingerprint of a stored brand blob: its length and a 32-bit FNV-1a hash. It pairs the origin entry
 *  with the brand entry it was written beside; it is not a security measure. */
const fingerprint = (blob: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < blob.length; i++) { h ^= blob.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `${blob.length}:${(h >>> 0).toString(16)}`;
};

/** Persist the live brand (called after a successful apply), and beside it the provenance it is measured against
 *  (#3880). Swallows storage errors — persistence is best-effort and must never break the editor (private mode / quota
 *  / disabled storage can throw). The empty state's origin (`none`) is not kept: its entry is removed, so a reload
 *  restores the brand as before #3880. */
export const persistInput = (store: LocalStore, input: BrandInput, provenance: Provenance): void => {
  let blob: string;
  try {
    blob = serializeBrandInput(input);
    store.setItem(BRAND_KEY, blob);
  } catch {
    return; /* storage unavailable (private mode, quota, disabled) — skip; the editor keeps working in-memory */
  }
  try {
    if (provenance.origin.kind === 'none') store.removeItem(ORIGIN_KEY);
    else store.setItem(ORIGIN_KEY, JSON.stringify({ origin: provenance.origin, baseline: serializeBrandInput(provenance.baseline), brand: fingerprint(blob) }));
  } catch {
    /* the origin entry stays as it was; its fingerprint no longer matches the brand, so a reload restores as before */
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

/** An origin as read back from storage, or `null` for anything else. `none` is never stored (`persistInput`). */
const asOrigin = (v: unknown): Origin | null => {
  if (v === null || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (o.kind === 'new' || o.kind === 'file') return { kind: o.kind };
  if (o.kind === 'example' && typeof o.id === 'string') return { kind: 'example', id: o.id };
  if (o.kind === 'import' && typeof o.label === 'string') return { kind: 'import', label: o.label };
  return null;
};

/**
 * What a web reload restores (#3880): the persisted brand, with the origin and baseline it was persisted beside. When
 * the origin entry is absent, unreadable, or was not written beside this exact brand (its fingerprint differs), the
 * brand restores as before #3880: as its own baseline, origin `file`. `null` when no brand is stored, as
 * `restoreInput`.
 */
export const restoreSession = (store: LocalStore): { input: BrandInput; origin: Origin; baseline: BrandInput } | null => {
  const input = restoreInput(store);
  if (!input) return null;
  const asToday = { input, origin: { kind: 'file' } as Origin, baseline: input };
  try {
    const raw = store.getItem(ORIGIN_KEY);
    const blob = store.getItem(BRAND_KEY);
    if (!raw || !blob) return asToday;
    const kept = JSON.parse(raw) as Record<string, unknown>;
    const origin = asOrigin(kept.origin);
    if (!origin || kept.brand !== fingerprint(blob) || typeof kept.baseline !== 'string') return asToday;
    const baseline = deserializeBrandInput(kept.baseline);
    return baseline ? { input, origin, baseline } : asToday;
  } catch {
    return asToday; // a corrupt or version-drifted origin entry: restore the brand as before, never refuse it
  }
};

/** Clear the persisted brand (for an explicit "start over" / new-brand reset), and its origin entry (#3880). Best-effort. */
export const clearInput = (store: LocalStore): void => {
  try {
    store.removeItem(BRAND_KEY);
    store.removeItem(ORIGIN_KEY);
  } catch {
    /* nothing to do — a store that can't remove also can't have persisted */
  }
};

// ---- the chrome theme (UI redesign S1.2, plan §3.3) ----------------------------------------------
// The studio's light / dark / system choice is kept per viewer, beside the brand but never inside it: a
// theme choice stored in the brand input would read as a brand edit, the same reason export settings
// stay out of it. Same best-effort rule as the brand: a store that throws or holds junk reads as the
// default, and a write that throws is skipped.

/** The chrome theme a viewer can choose. `system` follows the device. */
export type ThemePref = 'light' | 'dark' | 'system';
/** Storage key for the chrome theme. */
export const THEME_KEY = 'prism3:chromeTheme';
const THEME_PREFS: readonly ThemePref[] = ['light', 'dark', 'system'];

/** The stored theme, or `system` when nothing valid is stored or the store throws. */
export const restoreThemePref = (store: LocalStore): ThemePref => {
  try {
    const v = store.getItem(THEME_KEY);
    return (THEME_PREFS as readonly string[]).includes(v ?? '') ? (v as ThemePref) : 'system';
  } catch {
    return 'system';
  }
};

/** Keep the theme choice. Best-effort, like `persistInput`. */
export const persistThemePref = (store: LocalStore, pref: ThemePref): void => {
  try {
    store.setItem(THEME_KEY, pref);
  } catch {
    /* storage unavailable: the choice holds for this session only */
  }
};
