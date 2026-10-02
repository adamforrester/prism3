/**
 * ONE RUN OF A WRITE AT A TIME, PER OPERATION (#1957, owner decision 2026-10-02).
 *
 * MAIN THREAD. The panel's busy controls (owner decision #4 on #1956) stop the designer re-firing a write
 * the panel can see running, but the main thread is where both callers meet: the panel's buttons and the
 * agent link reach the same `ACTIONS` entries, and an agent's command can arrive while the panel's write
 * of the same operation is still going, or the other way round. So the main thread refuses a second
 * write of an operation while one is running, whoever started either. Different operations are not
 * serialized here: that is not what was asked, and the agent link already runs its own commands one at
 * a time (`agent-dispatch.ts`).
 *
 * A prune PREVIEW reads and writes nothing, so it is never refused and never holds the prune; only the
 * delete (`confirm: true`) does. The read-back writes nothing and is not guarded.
 */

/** The operations that write, by the agent command's name (the wire's names for them). */
export type WriteCmd = 'apply-theme' | 'build-components' | 'file-setup' | 'style-guide' | 'prune';

/** Each operation's title, as the Activity drawer shows it (`apps/studio/src/shell/activity.ts` `OP_TITLE`). */
const TITLE: Readonly<Record<WriteCmd, string>> = {
  'apply-theme': 'Apply Theme', 'build-components': 'Build set', 'file-setup': 'Set up file', 'style-guide': 'Style guide', prune: 'Prune stale',
};

export const isWriteCmd = (cmd: string): cmd is WriteCmd => Object.prototype.hasOwnProperty.call(TITLE, cmd);

/** Whether this call of `cmd` writes: every call does, except a prune preview. */
export const writes = (cmd: WriteCmd, confirm?: boolean): boolean => cmd !== 'prune' || confirm === true;

/** The refusal's words (the owner's copy). */
export const busyMessage = (cmd: WriteCmd): string => `${TITLE[cmd]} is already running. Try again when it finishes.`;

export const createRunGuard = () => {
  const running = new Set<WriteCmd>();
  return {
    busy: (cmd: WriteCmd): boolean => running.has(cmd),
    /** Run `fn` holding `cmd`, released however it ends. The caller checks `busy` first, with no await
     *  between, so the check and the hold are one step on the main thread. */
    async run(cmd: WriteCmd, fn: () => Promise<void>): Promise<void> {
      running.add(cmd);
      try { await fn(); } finally { running.delete(cmd); }
    },
  };
};
export type RunGuard = ReturnType<typeof createRunGuard>;
