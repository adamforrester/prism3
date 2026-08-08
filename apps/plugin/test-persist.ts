/**
 * Plugin persistence round-trip test (#131, #480) — drives the REAL persist/restore adapter against
 * an in-memory shared-data shim, so the whole knob-rehydration path is verified with no live Figma.
 *
 *   npx tsx apps/plugin/test-persist.ts
 *
 * The shim implements the minimal `SharedDataPort` (`getSharedPluginData`/`setSharedPluginData`) as
 * a Map keyed by `namespace\x00key`, modelling Figma's contract that an unset key reads back as ''.
 * Then: restore before any persist → null (unthemed file → defaults); persist a brand then restore →
 * the EXACT input back (the round-trip that closes #110's informational-only seed); the blob lands
 * under the documented `prism3`/`brandInput` namespace/key; and (#480) a NON-EMPTY blob that can't be
 * trusted — corrupt JSON, or a recognizable-but-wrong/missing schema version, the pre-#341/#415 shape
 * being the real-world case that motivated this — THROWS `UnrecognizedPersistedInputError` rather
 * than quietly returning `null`, so a designer re-opening an old file is told instead of silently
 * landing on defaults. Mirrors test-write.ts's `ok(...)` style; exits non-zero on any failure.
 */
import { persistInput, restoreInput, NS, KEY, type SharedDataPort } from './src/persist-figma';
import { serializeBrandInput, PERSIST_VERSION, UnrecognizedPersistedInputError } from '@prism3/engine/persist-input';
import { exampleBrands } from '@prism3/engine/emit-brandinput';
import type { BrandInput } from '@prism3/engine/theme';

/** Assert `fn` throws an `UnrecognizedPersistedInputError`; returns its message for further checks. */
const throwsUnrecognized = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof UnrecognizedPersistedInputError ? e.message : null;
  }
};

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// ---- the in-memory shared-data shim ---------------------------------------------------------
class SharedDataShim implements SharedDataPort {
  private store = new Map<string, string>();
  private k(ns: string, key: string): string { return `${ns}\x00${key}`; }
  getSharedPluginData(ns: string, key: string): string { return this.store.get(this.k(ns, key)) ?? ''; }
  setSharedPluginData(ns: string, key: string, value: string): void { this.store.set(this.k(ns, key), value); }
}

const brand = exampleBrands()['aurora'] as BrandInput;

// (1) restore before any persist — an unthemed file reads back null (→ UI keeps its defaults).
const fresh = new SharedDataShim();
ok(restoreInput(fresh) === null, 'persist: restore on a fresh file → null (start from defaults)');

// (2) persist → restore round-trips the exact brand (the knob rehydration #110 couldn't do).
persistInput(fresh, brand);
const back = restoreInput(fresh);
ok(back !== null && JSON.stringify(back) === JSON.stringify(brand), 'persist: persist→restore returns the exact BrandInput (round-trip closed)');

// (3) the blob is stored under the documented namespace/key, as the serialised version-tagged JSON.
ok(fresh.getSharedPluginData(NS, KEY) === serializeBrandInput(brand), `persist: blob stored under ${NS}/${KEY} as the versioned serialisation`);

// (4) #480: a corrupt (non-empty) blob at the key REFUSES LOUDLY — it must not be treated the same
// as "nothing was ever stored" (test 1), which is what let a real drift case pass silently before.
const dirty = new SharedDataShim();
dirty.setSharedPluginData(NS, KEY, '{ broken');
ok(throwsUnrecognized(() => restoreInput(dirty)) !== null, 'persist: corrupt stored blob → throws UnrecognizedPersistedInputError, not null (#480)');

// (5) #480 — the actual reported case: a pre-#341/#415 shape (old `families.display/text/mono` role
// names, numeric `displayCeiling`) stamped `v: 1` (the version in force before those PRs, and before
// this fix). It must be REFUSED, not silently accepted as if it were the current v${PERSIST_VERSION}
// shape — accepting it is exactly how a numeric `displayCeiling` would parse as SOMETHING wrong.
const oldShapeFile = new SharedDataShim();
const oldShapeBlob = JSON.stringify({
  v: 1,
  input: {
    primary: { l: 0.6, c: 0.15, h: 250 },
    typography: {
      families: { display: 'Inter', text: 'Inter', mono: 'IBM Plex Mono' }, // pre-#415 role names
      displayCeiling: 128, // pre-#341: a px number, not a rung name
    },
  },
});
oldShapeFile.setSharedPluginData(NS, KEY, oldShapeBlob);
const oldShapeMsg = throwsUnrecognized(() => restoreInput(oldShapeFile));
ok(oldShapeMsg !== null, 'persist: pre-#341/#415 shape (v:1) → throws UnrecognizedPersistedInputError, not silently mis-parsed');
ok(!!oldShapeMsg && /schema v1/.test(oldShapeMsg) && /re-theme|re-import/.test(oldShapeMsg), 'persist: refusal message names the mismatched version and tells the designer to re-theme/re-import');

// (6) current-version blob (what `persistInput` writes today) restores cleanly — the guard only
// refuses UNRECOGNIZED versions, not the one this build actually writes.
ok(JSON.parse(serializeBrandInput(brand)).v === PERSIST_VERSION, `persist: serializeBrandInput stamps the current PERSIST_VERSION (${PERSIST_VERSION})`);

console.log(`\nPlugin persist test: ${failed === 0 ? 'all passed' : failed + ' FAILED'}`);
if (failed) process.exitCode = 1;
