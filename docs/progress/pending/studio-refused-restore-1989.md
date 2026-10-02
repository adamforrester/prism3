## (2026-10-02) — a saved brand the engine refuses no longer blanks the studio or lets Apply write the demo (#1989)

**Status:** studio and plugin UI only, under the owner's scoped freeze exception (`apps/studio/src/entry.ts`,
plus the plugin's Apply/Prune enable state and restore-error message in `main.ts`). No engine change, no
ENGINE bump. Migrating refused overrides at load stays out of scope: the engine keeps refusing them.

### The diagnosis

Both bugs had one cause: the restore check asks `brandTheme` to accept the brand, and the refusal fires
later, in `resolvePreview`. A ground override (`background.primary` since #956, the four tiers since #1972)
passes the first check and fails the second.

- **Web.** `bootBrand` booted on the brand, `initSession` threw with nothing to catch it, `#app` stayed
  empty, and the brand stayed in `localStorage`, so every reload was blank.
- **Plugin.** `loadInput` caught the throw, so `brandState` held the file's brand while `theme` and
  `lastGoodInput` stayed on the boot demo. Both writes post `lastGoodInput`. Mutation P1 below shows what
  that meant: Apply and Prune posted `{"id":"prism3"}`, the demo, over a file whose brand was another.

### What changed

- **Web:** `bootBrand` validates by resolving, `resolvePreview(brandTheme(restored))`, the same two calls
  `initSession` makes. A refusal boots the empty state and mounts a notice on `body` ahead of `#app`
  (re-rendered wholesale, so the notice has to sit outside it, like the resize grip). It offers Export
  (a design.md, which keeps the refused override, so the brand is not lost) and Clear. It wears the
  existing `.errbar`/`.barbtn` classes, because the freeze allows no stylesheet change. A shape failure
  that used to fall back silently now shows the same notice: it is also a saved brand that will be lost.
- **Plugin:** the restore dispatch records the refusal (`restoreRefusal`); the first rebuild that resolves
  clears it. While it is set, Apply Theme (bar and Figma menu), Prune stale, and the prune dialog's Delete
  are disabled, and the error bar says the file's brand did not resolve and why the writes are off.

### Review fixes (orchestrator, and the owner's copy answers, 2026-10-02)

- **The notice goes when a brand loads.** It used to outlive the choice: it sat under the frame, first in
  tab order, and its Clear would have deleted the brand just chosen. It now subscribes to the store's
  `origin` topic, which every load invalidates, and removes itself.
- **Smoke §9 now pins** that the saved brand is still in storage right after boot, before any click, and
  adds a third case: a mode list `brandTheme` itself rejects (`modes: ['light', 'bogus']`).
- **Copy:** strings 1–5 and 7 approved as written. The plugin's error bar (6) is trimmed to the owner's
  wording: "This file's saved brand didn't resolve: {reason} Apply Theme and Prune stale are off until a
  brand resolves. Load an example or import a design.md to continue."
- **The notice keeps `.errbar`.** The owner wants the new chrome's styling, and that is the UI lane's (#1999).

### Approaches tried and dropped

- **Guards in `runApply`/`runPrune`.** Written first, then measured: with the controls disabled, removing
  the guards left every test green, because the disabled controls are their only callers. Dead code no
  test can catch, so they were removed.
- **A guard on the prune dialog's Delete.** The dialog stays reachable (a host preview opens it whatever
  the Prune button's state), so it needed something. A guarded Delete that looked live and did nothing also
  left the modal open over Apply, which is how the test found it. It is disabled instead, with the reason.

### The tests and their mutations

Smoke (`test-smoke.mjs` §9) stores the brand by letting the studio persist an example and then adding the
override, so the persist format is the app's own. Plugin (`test-build-verdict.mjs`, `#1989`) posts a
refused restore, then a good one as the positive control.

| Mutation | Fails, all `#1989` |
|---|---|
| S1 `bootBrand` back to `brandTheme` alone | 19, both roles: `the page boots with no uncaught error`, `… boots to a usable studio — the start screen offers 0 example(s)`, the notice arms, the hook guard |
| S2 notice not mounted | 11: the notice, Export, Clear arms for both roles, the hook guard |
| S3 Clear leaves storage | 4: `Clear saved brand removes it from storage …`, `after Clear, a reload shows no notice` |
| P1 refusal never recorded | 5, including `posted [{"type":"prune","id":"prism3"},{"type":"apply-theme","id":"prism3"}]` |
| P2 controls left enabled | 3 |
| P4 Delete left enabled | 3, including `posted [{"type":"prune","id":"prism3"}]` |
| P5 bar copy reverted | 1: `the error bar says the file's brand did not resolve …` |
| S4 notice left mounted after a brand loads | 3, one per case: `choosing an example removes the notice, so its Clear cannot reach the chosen brand — notice in DOM true, Clear buttons 1` |

**The trap for whoever re-verifies this:** the smoke arm's last click (choosing an example after Clear)
originally threw on a blank page under S1 and ended the run before the second role and the summary. It
is caught now, so S1 reports all 19.

### Not fixed here

Two other restore failures leave Apply and Prune live on the boot demo: `restore-input-error` (a blob the
host cannot deserialize, #480's path) and a `restore-input` that `brandTheme` itself refuses (dropped
silently). Filed as #1994; whether the writes should be off there too is the owner's call.
