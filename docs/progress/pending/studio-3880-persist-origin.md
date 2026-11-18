## (2026-11-18) — Web: a reload keeps the brand's origin and baseline, so unsaved edits still ask before a load (#3880)

**What changed.** On the web, every good rebuild stores the working brand in `localStorage`, and a reload reopens on it. Before this change, the reload gave the restored brand the origin `file` and made the brand its own baseline. Edits made before the reload stopped counting. The next example or start-window pick then loaded with no overwrite confirm, and its rebuild wrote over the only stored copy.

Owner decision A (2026-11-18): persist the origin and baseline beside the brand and restore both, so a reload changes nothing about what is dirty.

- **A second key, `prism3:origin`, beside `prism3:brandInput`.** `persistInput` writes it in the same call. It holds the origin, the baseline (serialized like the brand) and a fingerprint of the brand blob it was written with. The store's persist hook now gets the provenance as well as the brand, at every place it writes.
- **`restoreSession`** (in `persist-local.ts`, where a Node test can reach it) reads the pair back. `bootBrand` boots on it, and `initSession` takes the restored baseline. The confirm then names the original example again, not "this file's brand", which never fit the web.
- **Storage from before the change restores as it did.** This covers a missing origin entry, an unreadable one, and one whose fingerprint doesn't match the stored brand (a write that failed halfway, or a brand stored over it). In each case the brand is its own baseline, origin `file`. A stored baseline the engine now refuses falls back the same way.
- **The empty state's origin (`none`) is never stored.** Its entry is removed, and `clearInput` removes both keys.

### Verification

- `test-store.ts` (#3880 arms): a state test persists an edit to the aurora example through `persistInput` over a `Map`-backed store, then reloads with `restoreSession` and `initSession` as `bootBrand` does. It asserts:
  - the edit still counts (origin `example`/aurora, 1 edit);
  - the next load is guarded (`needsOverwriteConfirm`);
  - the baseline is the example as shipped;
  - each fallback restores as before.
  - a slider drag, stored once on release (`holdPersist` … `releasePersist`), still counts after the reload (review follow-up).
- `test-smoke.mjs` §C commits the issue's own reproduction against the built studio: edit, reload, pick another example. The confirm shows and names the example at risk, and the stored brand is still the edited one.
- On main's source, the state test fails: there is no origin entry to read.
- Mutations, each failing by name:
  - `bootBrand` restoring origin `file`, as before: both smoke arms, and the stored brand is replaced, as in the issue.
  - `persistInput` not writing the origin entry: `#3880 reload: the edit still counts`, and the guard and baseline arms.
  - `initSession` ignoring the restored baseline: the same three arms.
  - `restoreSession` skipping the fingerprint: `#3880 reload: an origin entry written beside another brand is not read`.
  - `releasePersist` pairing the brand with `bootProvenance`: `#3880 reload: a dragged edit still counts`.

**Guide.** "Theme a brand" says a reload keeps what the brand started from, so choosing another brand still asks first. The two `persist-local.ts` citations were re-read and re-stamped.
