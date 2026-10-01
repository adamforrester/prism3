## (2026-10-01) — A verdict's bar-before-detail repaint order is observed in the built panel, not only pinned by a Node literal (#1890)

**STATUS: PR open from `lane/repaint-order-arm`, labeled DO NOT MERGE.** Test-only: no ENGINE bump, no CONTRACT bump, no change note. No file under `apps/studio/src` is changed. The mutations below edited it locally, and each edit was restored.

**What was wrong.** For each of the four verdict kinds, `topicsFor` (`apps/studio/src/state/host-session.ts`) returns `host` and then `host:detail`. `host` rebuilds the bar. `host:detail` opens the detail row and then re-measures `--chrome-h`, which every sticky surface below the chrome positions from. So the order is what lets that measurement read the new bar. Reversing every verdict's order left `test:verdict` green. Only `test-host-session.ts` caught it, through its literal topic array.

**What changed.** `apps/plugin/test-build-verdict.mjs` has a new arm that drives all four verdict kinds through the real bridge, one fresh panel each. A MutationObserver is installed before the verdict is posted, and it records which region each DOM write lands in: the bar, the detail row, or the root element's `--chrome-h`. A root style write counts as a `--chrome-h` write only if the variable's value actually moved. The arm asserts:
- the observer saw all three regions written, so the orderings that follow compare real writes;
- the bar is written before the detail row;
- the last `--chrome-h` write comes after the last bar write;
- `--chrome-h` ends up equal to the chrome's rendered `offsetHeight` with the detail open.

The expected order is a literal in the test, and nothing reads `topicsFor`.

**Why the order and not only its consequence.** On the built panel, at widths from 1280 down to 480, a verdict does not change the bar's height at any of them, to within 1px of rounding. So the reversed order leaves `--chrome-h` correct on screen today, and an end-state check alone stays green under it. That was confirmed by mutation M1 below: the end-state assertion did not fire. What can be observed honestly is the write order, and that is what the comment beside the subscriptions claims, so the arm pins it directly. The end-state assertion is kept for the day a verdict does change the bar's height, and M4 shows it can fail.

**Mutations** (each after a `wip:` commit, rebuilt with `npm run -w @prism3/plugin build`, diff checked non-empty, source restored with `git checkout --`; the baseline is 187 of 187, and every mutated run executed 187):

| Mutation | `test:verdict` | Fails by name |
|---|---|---|
| M1: `component-result` topics reversed in `topicsFor` | 185 of 187 | `#1890 component-result: the bar repaints before the detail row it opens — write order detail → chrome-h → bar`, and `…: --chrome-h is measured after the bar's last repaint…` |
| M2: all four verdicts reversed (the issue's case) | 179 of 187 | the same two arms for each of `apply-result`, `component-result`, `file-setup-result` and `style-guide-result`; `test-host-session.ts` also fails, 4 checks |
| M3: swap the two `subscribe('host…')` registrations in `main.ts` | 187 of 187 (green) | none, and correctly so. `invalidate` runs one topic at a time in the order `topicsFor` gives, and each of these topics has one subscriber, so registration order is not the repaint order. |
| M4: drop `syncChromeHeight()` from `syncApplyDetail` | 175 of 187 | `…the observer saw the bar, the detail row and --chrome-h each written — saw bar → detail`, `…measured after the bar's last repaint…`, and `…--chrome-h equals the chrome's rendered height… — --chrome-h 77px, chrome 118px`, for all four |

**Traps for whoever re-verifies.**
- **M3 is not a hole.** A mutation in the subscriber *registration* is behavior-neutral, so it is expected to stay green. The order lives in `topicsFor`'s arrays, and the comment at the subscriptions says so.
- **Found on the way, filed as #1914, not fixed here:** `--chrome-h` is never re-measured on a viewport resize. When the panel narrows past the bar's wrap point, the chrome grows from 78 to 149px while `--chrome-h` stays at 77px, so the sticky rail and mode bar pin under the chrome until something else syncs. That is why this arm opens every panel at its final size and never resizes it.
