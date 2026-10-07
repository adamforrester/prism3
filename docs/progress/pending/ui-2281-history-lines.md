## (2026-10-07) — Activity: earlier results read one line per item (#2281)

Owner decision Q90 A. The Activity drawer's "Earlier results" now use the format #2271 (#2177, AL1 A) gave a run's current details. Each earlier result is its time and verdict, then its items one per line: the same mono font, an unbulleted list, and no separator at a line's end. AL1 A's single-line items stay one line: a conflict refusal, "Also built: …", and the style guide's per-table update. A result sent without items shows its summary as one line. UI only: no copy changed, no ENGINE note is owed, and the agent link's result is byte-identical, because `forAgent` already leaves `lines` out.

- **The owner's choice on the visible layout:** the entries keep their bullets and indent, and the head (time · verdict) stays in the chrome's UI font. Only the items below it are mono, set in a little (`.p3-op-entry > .p3-op-summary`). The colon that joined head and summary is gone.
- **Tests** (`test-build-verdict.mjs`, the `#2281` arms, per run kind at 1280 and 380). Two earlier results show their authored items as lines, newest first. Each head reads time · verdict and nothing after it. Every line's computed font equals `--p3-font-mono`. CDP's AX tree reads each result as a `list` of its `listitem`s in order. No history node sits under `aria-live` or a status, log or alert role, and none sits in `activity-status`.

### Traps for whoever re-verifies

- **A mutation must be tested against a rebuilt bundle.** The suite drives `dist/ui.html`, so a source edit without `npm run -w @prism3/plugin build` measures the old UI. After `git checkout -- <file>`, rebuild again, or the next run tests the mutant.
- The hook guard refuses a `data-p3^="…"` prefix that no member names literally, and any click outside `hooks.click`. The live-region arm spells each history hook out for that reason.
- Three older history reads (S11's five earlier results, and #1957's two "Refused" arms) read `li` under `op-history`. Since each entry now nests its own list, they read `op-history-entry` instead.
