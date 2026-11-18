/**
 * BEFORE WORK IS LOST (#3982; owner decision Q-WS1 A, 2026-11-18).
 *
 * Two places where a brand with unsaved edits could go without a way to keep it:
 *
 * 1. THE REPLACE CONFIRM (`needsOverwriteConfirm`, the brand menu's "Replace the current brand with …?"). It offered
 *    Replace brand and Cancel, so the only way to keep the edits was to say no. It now also offers the two downloads
 *    the Export area already writes (design.md and the token set), through the same export functions. A download
 *    leaves the confirm open and does not proceed: the designer saves, then answers it.
 * 2. LEAVING THE PAGE (web only). The browser's own leave-page prompt (`beforeunload`) is armed while the brand has
 *    unsaved edits and disarmed when it does not. Browsers show only their generic wording, so the download offers
 *    live in the confirm, not here.
 *
 * ONE MEANING OF "UNSAVED EDITS": `needsOverwriteConfirm`, the rule the confirm itself asks. A prompt armed on a
 * different rule would ask on leaving where a load does not ask, or the other way round.
 *
 * ADDED AND REMOVED, NOT LEFT ON. The listener is added only while armed. A permanent listener that decided inside
 * would behave the same at the prompt, but a page with a `beforeunload` listener is kept out of the back/forward cache
 * by some browsers, so an untouched brand would pay for a prompt it never shows.
 *
 * Pure: `main.ts` decides when to `sync`; this holds whether the listener is on.
 */

/** DRAFT copy (#3982): the confirm's two download buttons. Pending the owner; see the PR. */
export const SAVE_FIRST = {
  brief: 'Download design.md',
  tokens: 'Download tokens',
} as const;

/** The part of `window` the guard uses, so a test can hand it a recorder. */
export type LeaveTarget = {
  addEventListener(type: 'beforeunload', fn: (e: BeforeUnloadEvent) => void): void;
  removeEventListener(type: 'beforeunload', fn: (e: BeforeUnloadEvent) => void): void;
};

export type LeaveGuard = {
  /** Arm while `dirty`, disarm otherwise. Idempotent: the listener is added or removed only on a change. */
  readonly sync: (dirty: boolean) => void;
  readonly armed: () => boolean;
};

/** Ask the browser to confirm leaving. Both calls, because browsers differ in which one they read. */
export const askBeforeLeaving = (e: BeforeUnloadEvent): void => {
  e.preventDefault();
  e.returnValue = '';
};

export const leaveGuard = (target: LeaveTarget): LeaveGuard => {
  let on = false;
  return {
    sync: (dirty) => {
      if (dirty === on) return;
      on = dirty;
      if (on) target.addEventListener('beforeunload', askBeforeLeaving);
      else target.removeEventListener('beforeunload', askBeforeLeaving);
    },
    armed: () => on,
  };
};
