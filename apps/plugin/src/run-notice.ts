/**
 * THE RUN NOTICE (#533, the owner's Q110 A, 2026-11-07): when a run finishes while the window is minimized to the link
 * strip, the main thread shows a short completion notice through `figma.notify`. The detail stays in Activity.
 *
 * WHY "CLOSED" MEANS THE STRIP. Closing a Figma plugin's window ends the plugin (`figma.on('close')`), so no run can
 * finish after it. The one state in which the panel is out of sight and a run still finishes is the strip (#2949):
 * the UI stays mounted, the Activity drawer still records the run, and nobody can read it at 480×40.
 *
 * WHO DECIDES WHAT. The panel knows when a run ends: the Activity drawer reads one result per run, even for a build of
 * several sets or Update file's steps (`apps/studio/src/shell/activity.ts`, `ActivityLend.ended`). So the panel posts
 * `run-ended` with the drawer's own short line, and only for a run it started (an agent's command answers the agent).
 * The main thread knows whether the window is the strip, and only it can call `figma.notify`, so it decides whether to
 * show the notice. Shown while the full window is up, the notice would repeat what Activity already shows.
 *
 * THE SNACKBAR FEEL (the owner's note on Q110). `figma.notify` is the host's toast: one line, gone on its own after its
 * timeout, with at most one action button. That is a snackbar's shape, so it is used as it comes: a longer timeout
 * than the host's 3 s default, so a one-line verdict can be read, and Restore as the action, which brings the window
 * back so the run's detail in Activity can be read. Not the host's error style: the notice is the tool's voice over
 * the person's canvas, so it stays recessive whatever the verdict (DRAFT, listed in the PR for the owner).
 *
 * Pure: no `figma`. `main.ts` calls it and owns the `notify`; `test-agent-link.ts` drives both.
 */

/** How long the notice stays up, in ms (the host's default is 3000). DRAFT, listed in the PR for the owner. */
export const RUN_NOTICE_MS = 6000;
/** The action's label: the strip's own Restore button's word (#2949), for the same action. */
export const RUN_NOTICE_ACTION = 'Restore';

export type RunNotice = { readonly message: string; readonly timeout: number; readonly action: string };

/** The notice for a run that ended with the drawer's line `line`, or `null` when none is shown: the window is not the
 *  strip, or the line is empty. */
export const runNotice = (line: unknown, minimized: boolean): RunNotice | null => {
  if (!minimized || typeof line !== 'string') return null;
  const message = line.trim();
  return message ? { message, timeout: RUN_NOTICE_MS, action: RUN_NOTICE_ACTION } : null;
};
