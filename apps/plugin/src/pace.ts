/**
 * THE #3170 CADENCE, in one place (Q3170.5 A): work on the main thread hands it back at every boundary it has (a page, a
 * set, a stage) and again once about `PACE_MS` of work has run inside one, so Figma's panel and canvas answer between.
 * `main.ts` paces the writes and the read after open by it, and `update-plan.ts` paces its reads of a set's members by it
 * (#3301): a set whose members are large held the thread for 24 members' reads at a time.
 */
export const PACE_MS = 50;

/** A hand-back offered after each small piece of work (a member read, a plan projected), taken only once about
 *  `PACE_MS` has run since the last one was taken. `handBack` is the caller's own (`breathe`). */
export const pacer = (handBack: () => Promise<void>): (() => Promise<void>) => {
  let last = Date.now();
  return async (): Promise<void> => {
    if (Date.now() - last < PACE_MS) return;
    await handBack();
    last = Date.now();
  };
};
