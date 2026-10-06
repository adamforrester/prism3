## (2026-10-06) — Plugin: the agent link's status in the Activity drawer, and the drawer row on one baseline (#2213)

**Status:** branch `ui/2213-agent-status-drawer`, held for the owner's screenshot review. `apps/studio/src/shell/activity.ts`
(`setAgentLinkStatus`, the row's text runs, the open drawer's agent line), `apps/studio/src/chrome.css`
(`.p3-drawer-text`, `.p3-drawer-link`), `apps/plugin/src/agent-link-ui.ts` (`agentLinkShortStatus`), and tests in
`apps/plugin/test-agent-link.ts` and `test:chrome` section 31. UI only: no ENGINE bump (no emitted artifact moves), CONTRACT
unchanged. Owner decisions N1 A, AS1 A and DE1 A (2026-10-06). Closes #2213.

**New strings, approved by the owner (AS1 A):** "Agent listening", "Agent not listening", "Agent error". The full line is
`agentLinkStatusText`'s existing words, in their existing order (DE1 A).

### What changed

#2124 removed the Agent popover, so the link's status was drawn nowhere. It is now in the Activity drawer, in the plugin
only.

- **The closed row's short status (AS1 A)**, at the far right of the drawer's bar row, last before the caret.
  `agentLinkShortStatus` is a small pure formatter beside `agentLinkStatusText`. It returns nothing while the link is off
  (an old inbox error kept after switch-off included: the UI lane's call on Q1). With the link on, an inbox error reads
  "Agent error" in the error ink; no transport listening (neither the mailbox nor the bridge) reads "Agent not listening",
  also in the error ink; otherwise "Agent listening", quiet (`text-2`). The status's `title` is the full line, and its
  accessible name carries its words and then the full line (a screen-reader-only span after them).
- **The full line moves into the open drawer.** `agentLinkStatusText(state)` is the body's first line, above the run rows,
  in the body's note style (`p3-note`). It shows while the link is on, or while it holds an inbox error. So the link
  switched off with an old error shows "Off — agent commands are ignored." there.
- **One baseline (the owner's review).** The time ("19:49") sat 1.5px higher than "Clean". The row's items were each
  centered (`align-items: center`), and centering a 12px run beside a 14px one sets their baselines apart. The text runs
  (the summary, its time, the counts and the agent status) now sit in one `.p3-drawer-text` run with
  `align-items: baseline`, and that run is centered in the row with the dot and the caret. The strip's progress bar stays
  centered. Tokens only: no new value.
- **The status takes only leftover room.** It keeps the rule from round one: `flex: 1000 1 0%; max-width: max-content`. It
  starts at no width and grows into the room the row has left, so the summary is never squeezed. The short words fit
  whole at 380.

### The approach tried and discarded

In round one, `flex: 0 1000 auto` was tried first, to shrink the line before anything else. Flexbox weights shrinking by the
basis, so the summary still gave up 0.08px, enough to draw "Read-back · Cle…". A `scrollWidth` probe missed it because it
rounds to whole pixels. The summary is now measured with a `Range` over its contents against its box.

For the baseline, `align-items: baseline` on the whole row was considered and not built. A baseline group sits at the
row's cross-start, so the text would hug the top of the 36px row while the glyphs stayed centered. A centered run that
aligns on its baseline inside keeps both.

### Gates, and the mutations that fail them by name

`apps/plugin/test-agent-link.ts` tests `agentLinkShortStatus` on its own, against literal strings, for eight states.
`test:chrome` section 31 runs the plugin in light and dark, at 1280 and 380. It covers five states (off, listening, on with
no transport, an inbox error, off with an old error) after a boot read-back, and the web's row for the baseline. The full
line is `agentLinkStatusText`, bundled from the plugin source and called in the test. The inks are walked from the committed
emission. The names are read through CDP `getPartialAXTree`. The baselines come from a zero-size inline-block probe after
each text node. Each mutation was run against rebuilt bundles, with a `wip:` commit first:

- the short status showing the long text → `#2213 figma light 1280 listening: the bar row's agent status reads "Agent listening" (read "Listening — file mailbox, every 1 s · last: status ✓ done (16:35:12)", shown true)` (32 in all).
- the full line missing from the open drawer → `#2213 figma light 1280 listening: the open drawer's first line is the full line, agentLinkStatusText(state), above the runs (want "Listening — file mailbox, every 1 s · last: status ✓ done (16:35:12)", read null, first false, above the runs true)` (16).
- "Agent error" in the quiet ink → `#2213 figma light 1280 error: "Agent error" draws in the chrome's error ink, the emission's color.text.danger #a82e2e (read #67696b)` (4).
- the old alignment (the row's text centered item by item) → `#2213 figma light 1280 off: every text run in the drawer's bar row sits on one baseline, within 0.5px (3 runs, spread 1.5px: "Read-back" 877.5, "· Clean" 877.5, "22:00" 876)` (24).

### Not done, on purpose

- The link does not clear an old inbox error on switch-off (`agent-link.ts`). The UI lane ruled that out of scope.
- The full line in the open drawer is in the body's quiet note style even when it carries an error. The owner asked for
  the body's style, and the error is already told in the closed row.
- The short status stays in the row while the drawer is open, because it is the same row.
- No dependency on #2177/#2271 (mono detail lines). Whichever lands second takes the merge.
