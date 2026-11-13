/**
 * ONE WRITE AT A TIME, FILE-WIDE (#3697 R7, owner decision 2026-11-12; was one run per operation, #1957).
 *
 * MAIN THREAD. The panel's busy controls (owner decision #4 on #1956) stop the designer re-firing a write
 * the panel can see running, but the main thread is where both callers meet: the panel's buttons and the
 * agent link reach the same `ACTIONS` entries, and an agent's command can arrive while a panel write is still
 * going, or the other way round. So the main thread holds ONE write at a time for the whole file, whoever
 * started it, and refuses any other write while it runs.
 *
 * THE RECORDED DECISION THIS REPLACES. #1957 held each operation on its own and left different operations
 * unserialized ("that is not what was asked"). #3697's review (M2) showed what that let through: Apply Theme
 * yields between its seven stages, so an agent's `build-components` or prune confirm arriving mid-apply ran
 * against a half-written variable layer. The owner chose R7: Apply Theme, prune, build, update, setup, style
 * guides and the agent's writes all share this one hold. A refusal still names the operation that was asked
 * for (`cmd`), so the panel clears that operation's own pending state, and now also the one that holds the
 * file (`held`), which can differ.
 *
 * A prune PREVIEW reads and writes nothing, so it is never refused and never holds the file; only the
 * delete (`confirm: true`) does. The read-back writes nothing and is not guarded.
 */

/** The operations that write, by the agent command's name (the wire's names for them). */
export type WriteCmd = 'apply-theme' | 'build-components' | 'file-setup' | 'style-guide' | 'prune';

/** Each operation's title, as the Activity drawer shows it (`apps/studio/src/shell/activity.ts` `OP_TITLE`). Two copies, because the
 *  plugin's main thread does not bundle the shell; `test-agent-link.ts`'s `busy/titles` keeps them equal (#1995). */
export const TITLE: Readonly<Record<WriteCmd, string>> = {
  'apply-theme': 'Theme', 'build-components': 'Build set', 'file-setup': 'Set up file', 'style-guide': 'Style guides', prune: 'Prune stale',
};

export const isWriteCmd = (cmd: string): cmd is WriteCmd => Object.prototype.hasOwnProperty.call(TITLE, cmd);

/** The operation a command runs as while it holds the file, or `null` for one that holds none. It names the run in a
 *  refusal and in the Activity row; since #3697 R7 every one of them takes the same file-wide hold.
 *  The in-place update's two commands (#2265) hold the BUILD: a dry run read while a build writes the same
 *  set would describe a set half built, and a baseline capture writes the members a build writes. While
 *  either runs, a build is refused with the build's own words, which name the build rather than the check;
 *  a known imprecision, kept so the panel and the guard share one operation per Activity row. `draw-specs` (#2830)
 *  holds it too: its specimens read the members a build or an update writes. `panels-clean` (#3137) holds the prune's:
 *  it only removes, and its count, like a prune preview, writes nothing. `set-override` (#3394) holds Theme's. */
export const guardFor = (cmd: string): WriteCmd | null =>
  isWriteCmd(cmd) ? cmd : cmd === 'update-components' || cmd === 'capture-baseline' || cmd === 'adopt-members' || cmd === 'draw-specs' ? 'build-components' : cmd === 'panels-clean' ? 'prune'
    // #3394: a confirmed `set-override` is a Theme write, through `applyTheme`'s own guarded entry; its preview writes nothing.
    : cmd === 'set-override' ? 'apply-theme' : null;

/** Whether this call of `cmd` writes: every call does, except a prune preview. */
export const writes = (cmd: WriteCmd, confirm?: boolean): boolean => cmd !== 'prune' || confirm === true;

/** The refusal's words. Since IA v2 every panel write goes through Update file, so the refusal names it rather than
 *  the operation (#3264 decision 2, DRAFT wording). `cmd` stays in the signature: the refusal's `cmd` field names the
 *  operation asked for, for the Activity row it belongs to, and its `held` field the one holding the file (#3697 R7). */
export const busyMessage = (_cmd: WriteCmd): string => 'Update file is already running. Try again when it finishes.';

export const createRunGuard = () => {
  /** The one write holding the file, with the hold object of its run, so a run's own end never releases a later run's
   *  hold. One slot, not one per operation: that is the whole of #3697 R7. */
  let running: { cmd: WriteCmd; hold: object } | null = null;
  return {
    /** Whether ANY write holds the file: the check every write makes before it starts. */
    busy: (): boolean => running !== null,
    /** The write holding the file, or `null`: what a refusal names, and what a Stop asks about. */
    held: (): WriteCmd | null => running?.cmd ?? null,
    /** Whether `cmd` is the write holding the file — for a Stop or a stale read that belongs to one operation. */
    holding: (cmd: WriteCmd): boolean => running?.cmd === cmd,
    /** Run `fn` holding the file as `cmd`, released however it ends. The caller checks `busy` first, with no await
     *  between, so the check and the hold are one step on the main thread. */
    async run(cmd: WriteCmd, fn: () => Promise<void>): Promise<void> {
      const hold = {};
      running = { cmd, hold };
      try { await fn(); } finally { if (running?.hold === hold) running = null; }
    },
    /** #3128: release the file before `cmd`'s run returns, once the run has written its last and posted its verdict.
     *  Called only by the run that holds it. A build's settle probe (#908) runs after its verdict and writes nothing, and
     *  the panel posts its next set the moment that verdict lands: held through the probe, the next set was refused and
     *  the panel waited on a verdict that had already been sent. */
    release(cmd: WriteCmd): void { running = null; },
  };
};
export type RunGuard = ReturnType<typeof createRunGuard>;
