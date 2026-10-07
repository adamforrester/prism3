## (2026-10-07) — Plugin: the agent link's errors announced to screen readers, once, politely (#2275)

**Status:** branch `ui/2275-agent-status-live`. `apps/plugin/src/agent-link-ui.ts` (one live region, and when it is
written) and `test:chrome` section 33. UI only: no ENGINE bump (no emitted artifact moves), CONTRACT unchanged. Owner
decision Q86 B (2026-10-07: announce errors only). Closes #2275.

**No new strings.** The region speaks AS1 A's existing short status, "Agent error" or "Agent not listening", unchanged.

### What changed

The Activity drawer's short agent status (#2213) changed silently, so a screen-reader user learned the link had failed
only by landing on the row (WCAG 2.2 SC 4.1.3). Now one live region announces it.

- **One region, persistent, polite.** The Agent tile builds it once at mount: a visually hidden (`p3-sr`) `role="status"`
  with `aria-live="polite"`, appended to `<body>`. Not to the frame: the frame mounts and unmounts with the app view, and a
  live region that is moved or rebuilt is one a screen reader may stop hearing. Its text is set in place and the node is
  never replaced.
- **Only into an error state (Q86 B).** `render` keeps the short status it last drew. When the new one is an error state
  and differs from it, the region takes the short status's words. So listening → error, listening → not listening, not
  listening → error and off → error each announce once. A change of the full line alone (a new "last:" time, or a new
  inbox message under "Agent error") writes nothing.
- **Out of an error state, the region is emptied (the UI lane's call on #2285, 2026-10-07).** Recovery to "Agent
  listening" and switching off clear its text, the same node kept. Q86 B's "nothing for recovery" means no announcement,
  and removing text from a polite region with the default `aria-relevant` (additions text) announces nothing. So the
  meaning holds, and no stale "Agent error" is left for anyone reading the page in browse mode. The first review round
  left the text in place and held the question as a design call; it was settled as a technical one, since it does not
  change what is announced.

### Not done, on purpose

- **The existing Activity status line (`activity-status`) is not reused.** It announces write starts and lives in the
  drawer, which is rebuilt with the frame. Sharing it would let one announcement overwrite the other.
- **The web.** It has no agent link (N1 A), so it gets no region.

### Trap for whoever re-verifies

The page already holds an assertive region of its own: the error bar (`error-bar`, `role="alert"`), for engine errors.
A check for "no assertive region anywhere" fails on it. Section 33 checks that no region **carrying the agent's words** is
assertive, and reads the agent region's politeness from the accessibility tree (CDP `live`), not its attribute.

### Mutations

Each after a `wip:` commit, on a rebuilt plugin bundle, each failing by name in section 33 and nowhere else. The ✗ lines
are quoted in the section's header and in the PR: (a) recovery announced, 6 failures; (b) a full-line-only change
announced, 4; (c) the region replaced per announcement, 40; (d) `assertive`, 12; (e) the region not cleared on a change
out of an error state, 8. Today's code (no region) fails 66.
