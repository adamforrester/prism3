## (2026-11-07) — A short host notice when a run ends while the plugin is minimized (#533, Q110 A)

The owner decided (Q110 A) that when a run finishes with the panel closed, the plugin shows a short completion notice
and nothing more; the detail stays in Activity. The owner's note: it should read like a snackbar.

### What "closed" means here

Closing a Figma plugin's window ends the plugin (`figma.on('close')`), so no run can finish after it. The one state in
which the panel is out of sight and a run still finishes is the link strip (#2949): the window is 480×40, the UI stays
mounted and the Activity drawer still records the run. So the notice shows while the window is minimized to the strip,
and never while the full window is up, where it would repeat what Activity shows.

### Who decides what

- **The panel knows when a run ends.** The Activity drawer reads one result per run, even for a build of several sets
  (the queue records each set before its topics fire) and for Update file's steps. So `shell/activity.ts` calls a new
  `ActivityLend.ended` with a short line once nothing else runs: the worst of what ended, in the status line's words
  without the reason (`noticeLine`). An agent's command answers the agent, so it is not reported. The ends are kept
  across readings until nothing runs (the review: a panel run that ended beside an agent's command was otherwise lost),
  and `shell/run-ended.ts` `worstEnd` picks the one the line names.
- **The main thread knows whether the window is the strip,** and only it can call `figma.notify`. The panel posts
  `run-ended`; `main.ts` asks `run-notice.ts` and shows the notice only while minimized.

### The snackbar feel

`figma.notify` already has a snackbar's shape: one line, gone on its own, at most one action button. So it is used
as it comes: a 6000 ms timeout (the host's default is 3000), Restore as the button (the strip's own word, for the same
action), and not the host's error style, so the tool's voice stays recessive on the person's canvas. The timeout, the
error style and the notice lines are listed in the PR as proposals for the owner.

### Gates

- `apps/plugin/test-agent-link.ts` `run-notice/*` drives the real `main.ts`: no notice with the full window up or after
  Restore, one notice while minimized with the panel's line, 6000 ms, not the error style, and Restore restoring the
  window.
- `test:chrome` section 10 reads every `run-ended` the panel posts: one, "Update file failed.", when the panel's Update
  file run stops; none for an agent's command.
  The review added two arms there: the panel's confirmed prune, ending while an agent's build runs, is told only once
  the build ends too, as "Prune stale finished.". `apps/studio/test-run-ended.ts` holds `worstEnd` to literals: a
  failure, else a warning, else the first.
