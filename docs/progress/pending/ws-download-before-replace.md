## (2026-11-18) — The replace confirm offers the downloads, and leaving with unsaved edits asks first (#3982)

**Status:** Studio only (the confirm in both hosts; the leave prompt on the web). ENGINE unchanged (no change note: no
engine code moved, and `packages/engine/changes/README.md` says a change that owes no bump carries no note). CONTRACT
unchanged.

### What changed

- **Owner decision Q-WS1 A (2026-11-18), built as decided.** The replace confirm (`needsOverwriteConfirm`, "Replace the
  current brand with …?") now offers **Download design.md** and **Download tokens** between its sentence and its
  actions. They run the Export area's own downloads (`exportDesignMd`, `exportTokens`), of the brand at risk. Neither
  touches the staged load or the menu, so the confirm stays open and nothing loads until the designer answers it.
- **The browser's leave-page prompt (web).** `state/leave-guard.ts` adds a `beforeunload` listener while the brand has
  unsaved edits and removes it when it has none. "Unsaved edits" is the confirm's own rule, `needsOverwriteConfirm`,
  re-read on the store's `brand`, `identity` and `origin` topics, and once at boot: `entry.ts` calls `syncLeaving()`
  straight after `initSession`, which publishes no topic, so a reload that restored unsaved edits (#3880) asks
  before leaving with no further edit. The prompt and the confirm cannot disagree. The
  listener is removed rather than left on and deciding inside, because a page holding a `beforeunload` listener can
  be kept out of the back/forward cache. The plugin gets no prompt: its panel is not a page the designer leaves.
- **Guide:** `theme-a-brand.md` says the question asks first, offers the two downloads, and that the web browser asks
  before leaving. Ten citations in five guides re-pointed to where `main.ts` and `bar.ts` lines moved.

### Owner decision (2026-11-18): approved as built

The labels are "Download design.md" and "Download tokens", with no new line. They sit on their own row, under the
sentence and above Replace brand and Cancel. The scope is the brand menu's confirm only (an example, a design.md
import): not the start window's guard, which asks with its own Discard dialog, and not the plugin's held-restore
confirm in the error strip.

### Verification

`apps/studio/test-leave-guard.ts` (12 assertions, new suite, floor 12): the guard against a recorder, the rule over the
store's real states, and the wiring read from `main.ts`. `test-smoke.mjs` §5 E drives the built web bundle: no prompt on
a just-opened example, a prompt after an edit, each download writes its file and leaves the confirm open, and Replace
brand disarms the prompt. `test-chrome.mjs` measures the two new buttons as chrome in the confirm and reads the prompt
before and after an edit. Smoke case C reloads with unsaved edits and reads `#3982 after a reload with unsaved
edits, leaving asks first, before any further edit` (#3880's restore). On `main`'s source, smoke fails `#3982 leaving after an edit asks first` by name, and the
unit suite fails four of its wiring arms. Mutations, each after a `wip:` commit, failing by name: a guard that never
disarms → `#3982 after Replace brand loads an untouched example, leaving no longer asks`; a download that drops the
staged load → `#3982 Download tokens leaves the confirm open`; `sync` without its no-change return → `#3982 arming
twice adds one listener`; the listener without `preventDefault` → `#3982 the armed listener cancels the leave`.
