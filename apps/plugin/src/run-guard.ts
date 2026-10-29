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

/** Each operation's title, as the Activity drawer shows it (`apps/studio/src/shell/activity.ts` `OP_TITLE`). Two copies, because the
 *  plugin's main thread does not bundle the shell; `test-agent-link.ts`'s `busy/titles` keeps them equal (#1995). */
export const TITLE: Readonly<Record<WriteCmd, string>> = {
  'apply-theme': 'Apply Theme', 'build-components': 'Build set', 'file-setup': 'Set up file', 'style-guide': 'Style guides', prune: 'Prune stale',
};

export const isWriteCmd = (cmd: string): cmd is WriteCmd => Object.prototype.hasOwnProperty.call(TITLE, cmd);

/** The operation a command holds while it runs, or `null` for one that holds none. Every write holds its own.
 *  The in-place update's two commands (#2265) hold the BUILD: a dry run read while a build writes the same
 *  set would describe a set half built, and a baseline capture writes the members a build writes. While
 *  either runs, a build is refused with the build's own words, which name the build rather than the check;
 *  a known imprecision, kept so the panel and the guard share one operation per Activity row. `draw-specs` (#2830)
 *  holds it too: its specimens read the members a build or an update writes. */
export const guardFor = (cmd: string): WriteCmd | null =>
  isWriteCmd(cmd) ? cmd : cmd === 'update-components' || cmd === 'capture-baseline' || cmd === 'adopt-members' || cmd === 'draw-specs' ? 'build-components' : null;

/** Whether this call of `cmd` writes: every call does, except a prune preview. */
export const writes = (cmd: WriteCmd, confirm?: boolean): boolean => cmd !== 'prune' || confirm === true;

/** The refusal's words (the owner's copy). */
export const busyMessage = (cmd: WriteCmd): string => `${TITLE[cmd]} is already running. Try again when it finishes.`;

export const createRunGuard = () => {
  /** Each held operation, by the hold that holds it, so a run's own end never releases a later run's hold. */
  const running = new Map<WriteCmd, object>();
  return {
    busy: (cmd: WriteCmd): boolean => running.has(cmd),
    /** Run `fn` holding `cmd`, released however it ends. The caller checks `busy` first, with no await
     *  between, so the check and the hold are one step on the main thread. */
    async run(cmd: WriteCmd, fn: () => Promise<void>): Promise<void> {
      const hold = {};
      running.set(cmd, hold);
      try { await fn(); } finally { if (running.get(cmd) === hold) running.delete(cmd); }
    },
    /** #3128: release `cmd` before its run returns, once the run has written its last and posted its verdict. Called
     *  only by the run that holds it. A build's settle probe (#908) runs after its verdict and writes nothing, and the
     *  panel posts its next set the moment that verdict lands: held through the probe, the next set was refused and
     *  the panel waited on a verdict that had already been sent. */
    release(cmd: WriteCmd): void { running.delete(cmd); },
  };
};
export type RunGuard = ReturnType<typeof createRunGuard>;
