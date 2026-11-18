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
  re-read on the store's `brand`, `identity` and `origin` topics, so the prompt and the confirm cannot disagree. The
  listener is removed rather than left on and deciding inside, because a page holding a `beforeunload` listener can
  be kept out of the back/forward cache. The plugin gets no prompt: its panel is not a page the designer leaves.
- **Guide:** `theme-a-brand.md` says the question asks first, offers the two downloads, and that the web browser asks
  before leaving. Ten citations in five guides re-pointed to where `main.ts` and `bar.ts` lines moved.

### Owner decisions (OPEN)

1. **Labels (DRAFT):** "Download design.md" and "Download tokens", the issue's own words. Recommendation: keep them.
   "design.md" matches **Import design.md…** in the same menu, the name the designer loads it back by; the Export
   area's "Download brief" names the same file in that area's own terms.
2. **No new line.** The sentence already says the edits "are not saved anywhere else", which is why the downloads are
   there. Recommendation: no line.
3. **Placement:** the downloads sit in their own row, under the sentence and above Replace brand and Cancel, as
   secondary buttons with the download icon, so the order reads save, then answer.
4. **Scope:** built on the brand menu's confirm (an example, a design.md import). Not on the start window's guard
   (New brand › a path over edits), which asks with its own Discard dialog, nor on the plugin's held-restore confirm
   in the error strip. Recommendation: the start window's guard next, if wanted, as its own change.

### Verification

`apps/studio/test-leave-guard.ts` (12 assertions, new suite, floor 12): the guard against a recorder, the rule over the
store's real states, and the wiring read from `main.ts`. `test-smoke.mjs` §5 E drives the built web bundle: no prompt on
a just-opened example, a prompt after an edit, each download writes its file and leaves the confirm open, and Replace
brand disarms the prompt. `test-chrome.mjs` measures the two new buttons as chrome in the confirm and reads the prompt
before and after an edit. On `main`'s source, smoke fails `#3982 leaving after an edit asks first` by name, and the
unit suite fails four of its wiring arms. Mutations, each after a `wip:` commit, failing by name: a guard that never
disarms → `#3982 after Replace brand loads an untouched example, leaving no longer asks`; a download that drops the
staged load → `#3982 Download tokens leaves the confirm open`; `sync` without its no-change return → `#3982 arming
twice adds one listener`; the listener without `preventDefault` → `#3982 the armed listener cancels the leave`.
