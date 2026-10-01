## (2026-10-01) — Owner copy: "…" for pending labels, a plain ⚠, and "Apply Theme" (#1936)

**STATUS: PR from `ui/owner-copy`.** UI copy and glyphs only. No engine change and no emitted artifact moves, so no ENGINE bump, no change note, and `CONTRACT_VERSION` is unchanged.

**The three owner decisions (2026-10-01), as built.**

1. **"…" (U+2026) replaces "⋯" (U+22EF)** in every label the UI shows. Inter has no U+22EF, so each one drew from a device face. The embedded Inter has U+2026. The changed labels are all in the legacy `apps/studio/src/main.ts`: Apply's running label "… Applying…", the Figma menu's Prune item "… Checking…" and "… Removing…", and the page buttons "… Building…", "… Setting up…" and "… Drawing…". The status pills had no ⋯ ("Writing to Figma…" and its siblings), so they did not change. Three plugin comments that quoted the old label (`build-telemetry.ts`, `main.ts`, `messages.ts`) now quote it without the glyph. They ship in the unminified `dist/main.js`, and the bundles must carry no U+22EF.
2. **A plain ⚠ (U+26A0), without VS16 (U+FE0F), per #1936 ("Owner decision: plain").** The VS16 is gone from all 11 summary sites in `apps/plugin/src/main.ts` and from the inbox error in `agent-link-ui.ts` (`agentLinkStatusText`). The summaries now draw the same monochrome Inter ⚠ as the verdict headlines. The `FACE_LACKS` entry for U+FE0F in `apps/studio/chrome/glyphs.mjs` is deleted, as the issue said. It listed both files under one code point, so a single entry covered both.
3. **"Apply Theme" (concept v6) replaces "Apply to Figma"** on the plugin's bar button and on the Figma menu item. Its accessible name is its text, and there is no `aria-label`. Other places that quoted the old label were updated too: the Components button's tooltip ("Apply Theme first — it binds those variables."), the style-guide help line ("Run it after Apply Theme."), the comments in `main.ts`, `shell/figma.ts`, `shell/frame.ts` and `write-adapter.ts`, `apps/plugin/README.md` (its stale "brand menu → ↳ Apply to Figma variables" step now names the bar and the Figma menu), and `docs/23` (historical, so it notes the old label). **Unchanged on purpose:** the posted message (`apply-theme`), the "Writing to Figma…" pill, the behavior, and the hooks `apply-to-figma` and `figma-option-apply`. Hooks are identifiers, and S1.4 left the label in no hook name.

**The verdict suite's copy contract moved, on purpose.** `apps/plugin/test-build-verdict.mjs` pins literal verdict strings. Its "⋯ Building…", "⋯ Drawing…" and "⋯ Setting up…" are now "… Building…", "… Drawing…" and "… Setting up…". Its two `component-result` summaries lose the VS16. These are owner-decided changes to that contract, not drift. 191/191.

### What keeps it true

**`[glyphs]` gains `NEVER_DRAWN`** (`apps/studio/chrome/glyphs.mjs`). It is a literal list of code points that no string under a source root may carry: U+22EF and U+FE0F, each with its decision. It reads every file the face check reads, plus the `NOT_CHROME` legacy `main.ts`. That matters: the legacy studio is where Apply's label lives, and the face check skips it, so before this change only `test:chrome`'s as-drawn font check would have seen a ⋯ there. VS16 is banned outright, not only after an emoji-capable code point. No UI literal uses it any other way, and nothing in a text face honors it. Both builds run `[glyphs]`, so no new CI step and no new gate: verify stays at 69.

**`FACE_GAPS` in `apps/studio/test-chrome.mjs` is deleted, with its scope map** (`VERDICT_COPY`, `RUNNING_LABEL`, the per-node `gapScope`/`gapChars` plumbing). I chose deletion over keeping the mechanism and asserting it empty. An empty tolerance list with selectors and plumbing is code that does nothing until someone adds an entry. The place to record a face decision is `FACE_LACKS` in `[glyphs]`, which already has stale-entry checks. The font check now fails when any device-face glyph appears in any chrome text element (`gapFonts > 0`).

**`test:chrome` reads the bar's Apply by literal**, `APPLY_LABEL = 'Apply Theme'` and `APPLY_RUNNING = '… Applying…'`, typed in the test. It checks idle (the text, no `aria-label`, enabled) and while a write runs (the running text, disabled), on every figma column. `FIGMA_ITEMS` reads `APPLY_LABEL`.

### Mutations (each after a `wip:` commit, each failing by name)

| Mutation | Failure |
|---|---|
| `'⋯ Applying…'` back in `apps/studio/src/main.ts` | both builds: `[glyphs] U+22EF (⋯) is at apps/studio/src/main.ts:9099, and no chrome string may carry it: the midline ellipsis. …` |
| `⚠️` (VS16) back in the "no File Components page" summary | plugin build: `[glyphs] U+FE0F (VS16, emoji presentation) is at apps/plugin/src/main.ts:821, and no chrome string may carry it: …` |
| `'Apply to Figma'` back on the bar button | `test:chrome`, 6 failures, one per figma column: `figma light 1280: the bar's Apply reads "Apply Theme", named by its text, and can run (read {"text":"Apply to Figma",…})` |

**Trap for whoever re-runs mutation 3:** `test:chrome` drives the plugin's `dist/ui.html` for the figma host. If you rebuild only the studio, it passes on a stale plugin bundle. Rebuild both.

**Left alone:** the engine's icon-button guideline "more = ⋯" (`packages/engine/components/icon-button.ts`, emitted into `components.ai.json` and the component docs). It names the conventional "more" icon, not a UI label, and it does not reach either bundle (measured: zero U+22EF in `apps/studio/dist` and `apps/plugin/dist`). Changing it would be an engine prose change, and nobody asked for one. ⚠️ in Markdown docs and READMEs is not UI, so it stays.
