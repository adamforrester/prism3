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
  listening → error and off → error each announce once. Recovery to "Agent listening", switching off, and a change of the
  full line alone (a new "last:" time, or a new inbox message under "Agent error") write nothing.
- **Re-entry announces again.** Error → listening → error sets the same words a second time. Setting `textContent`
  replaces the text node even when the words match, so it is a change the screen reader hears.

### Not done, on purpose

- **The region keeps its last words after recovery.** Clearing it on recovery would be a change to the region, and Q86 B
  says recovery writes nothing. The text is visually hidden; a browse-mode reader can still land on the stale "Agent
  error" after the link has recovered. If that matters, it is a design call for the owner, not a technical one.
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
announced, 4; (c) the region replaced per announcement, 40; (d) `assertive`, 12. Today's code (no region) fails 66.
