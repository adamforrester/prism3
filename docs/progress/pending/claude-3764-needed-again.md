## (2026-11-16) — The pairing prompt says why it asks for a code again (#3764, Q-PC1 B)

**What.** #3806 made the relay forget a pairing code once the connection that carried it fails (a close, an error, a
`paired` whose proof fails, or no `paired` within 250 ms). The prompt then fell back to the plain `needed` line, with no
reason given. The owner chose Q-PC1 B: a new pairing state, `needed-again`, which `forgetSentCode()` sets instead of
`needed`. The prompt shows the same line plus an error under the field, approved verbatim: "The connection closed before
pairing finished. Ask your agent for a new code." It tells the person to get a *fresh* code, which is what makes the
forget effective: re-typing the same code is the one exposure #3806 left open. A first prompt (no token, no code tried,
or the link switched off and on) still sets `needed` and shows no error. `waitingForCode()` treats `needed-again` like
`needed`, so nothing retries until a code is entered.

**When the line clears.** It follows the existing `wrong-code` line: `pair()` moves the state to `pairing`, whose prompt
has no error, so the line clears when the next code is submitted, and a pairing that succeeds hides the prompt. It does
not clear on the first keystroke. That timing is held as OWNER DECISION Q-PC3 in the PR. The choice is between keeping
the line on screen while a code is typed, which is the existing pattern, and clearing it on the first keystroke.

**Measured.** `test-agent-bridge.ts` `needed-again/shown`, `/first` (twice: a first prompt, and one after the link is
switched off and on) and `/cleared` each fail on main and pass with the fix. The approved words are the test's own
literal. Each absence check is read against the line shown after a forgotten code, so none can pass where the line is
never shown. Mutations, each failing by name: `forgetSentCode` back to `needed` → `shown`, `first`, `cleared`; the
`pairPromptText` row removed → the same; the first prompt set to `needed-again` → `first`; the submit leaving the prior
state → `cleared`; `needed-again` dropped from `waitingForCode` → `forget-code/closed`, `/error`, `/impostor-paired`,
`/hold-open`. The `forget-code/*` arms from #3806 now read `needed-again`.
