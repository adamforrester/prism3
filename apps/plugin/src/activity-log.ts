/**
 * THE ACTIVITY LOG (#3309): what the Activity drawer was told this session, kept in the main thread so the agent link's
 * read-only `activity` command can answer it.
 *
 * WHY THE MAIN THREAD KEEPS A COPY. The drawer lives in the panel (`apps/studio/src/shell/activity.ts`, fed by
 * `state/host-session.ts`), and an agent command runs here, in the main thread. Everything the drawer shows reaches it
 * one of two ways, and both pass through this thread:
 *   · a write's verdict, which the main thread posts to the panel (`apply-result`, `component-result`, …), whoever ran
 *     the write: the panel's own buttons and an agent's commands, forwarded, alike. `main.ts` records each as it posts it;
 *   · the panel's own summary of a run of several writes, which only the panel computes: a build of several sets (the
 *     queue's `runVerdict`) and Update file's run (its status-strip verdict line). The panel posts each as an
 *     `activity-note` when the run ends, and `main.ts` records it.
 * So the log holds the drawer's results without reading the panel's DOM, and persists nothing: it is memory, gone when
 * the plugin closes, like the drawer's own history. Nothing here writes to the file.
 *
 * PER-SET PROBLEMS. A build's verdict says "built with problems" and names its misses only in prose. The build knows
 * them as data, so `buildComponents` attaches them to its run (`annotate`): one entry per set that was not clean, with
 * the reasons that made it so, the same rule its verdict's `ok` reads (a miss that is not a skipped member, a missing
 * canvas template).
 *
 * Pure: no `figma`, no clock of its own. `test-agent-link.ts` and `test-agent-bridge.ts` drive it through `main.ts`.
 */

/** The operations, by the drawer's own keys (`OpKey` in `host-session.ts`), plus `update`: Update file's run. */
export type ActivityOp = 'apply' | 'components' | 'filesetup' | 'styleguide' | 'prune' | 'readback' | 'specs' | 'update' | 'override';

/** One set that was not clean, and why. */
export type ActivityProblem = { readonly set: string; readonly reasons: readonly string[] };

/** One run, as the `activity` command returns it. Field order is the envelope's, held by literals in the tests. */
export type ActivityRun = {
  /** This session's sequence number, from 1. `activity { since }` returns the runs after it. */
  readonly seq: number;
  readonly op: ActivityOp;
  /** Who started it: the panel, or an agent command (named in `cmd`). */
  readonly by: 'panel' | 'agent';
  readonly cmd: string | null;
  /** When the main thread recorded it, ISO 8601. */
  readonly at: string;
  /** The message kind it came from (`component-result`, or `activity-note` for a panel summary), and its `ok`. */
  readonly verdict: { readonly type: string; readonly ok: boolean };
  readonly headline: string;
  readonly summary: string;
  readonly lines: readonly string[];
  readonly problems: readonly ActivityProblem[];
  /** The build the run was made with: the stamp `build.mjs` wrote, and the commit in it (`null` when the stamp has none). */
  readonly built: { readonly commit: string | null; readonly build: string };
};

/** The kinds that carry a verdict the drawer shows, and the operation each is (`VERDICT_OP` in `host-session.ts`). */
export const VERDICT_KINDS: Readonly<Record<string, ActivityOp>> = {
  'apply-result': 'apply', 'component-result': 'components', 'component-update-result': 'components', 'file-setup-result': 'filesetup',
  'style-guide-result': 'styleguide', 'prune-result': 'prune', 'seed-info': 'readback',
  // #3394 Q3394.7 A: the agent link's color overrides, a row of their own.
  'override-result': 'override',
};

/** How many runs the log keeps; the oldest goes first. */
export const ACTIVITY_KEEP = 50;
/** How many reasons one problem lists before it counts the rest. */
export const REASONS_MAX = 20;

/** A list of reasons, capped: the first `REASONS_MAX`, then how many more. */
export const capReasons = (rs: readonly string[]): string[] =>
  rs.length > REASONS_MAX ? [...rs.slice(0, REASONS_MAX), `…and ${rs.length - REASONS_MAX} more`] : [...rs];

type Msg = { readonly type: string; readonly ok?: boolean; readonly headline?: string; readonly summary?: string; readonly lines?: readonly string[];
  readonly applied?: boolean; readonly preview?: boolean; readonly pillOnly?: boolean };

export const createActivityLog = (o: { readonly now: () => Date; readonly commit: string | null; readonly build: string; readonly keep?: number }) => {
  const keep = o.keep ?? ACTIVITY_KEEP;
  const runs: ActivityRun[] = [];
  let seq = 0;
  const push = (r: Omit<ActivityRun, 'seq' | 'at' | 'built'>): void => {
    runs.push({ seq: ++seq, op: r.op, by: r.by, cmd: r.cmd, at: o.now().toISOString(), verdict: r.verdict, headline: r.headline, summary: r.summary,
      lines: r.lines, problems: r.problems, built: { commit: o.commit, build: o.build } });
    if (runs.length > keep) runs.splice(0, runs.length - keep);
  };
  return {
    /** Record `m` if it is a verdict the drawer shows. A prune preview is not one: it opens the confirm, or is a pill. Nor
     *  is a `set-override` preview (#3394): it writes nothing. A refused write is recorded. */
    post(m: Msg, by: 'panel' | 'agent', cmd: string | null): void {
      const op = VERDICT_KINDS[m.type];
      if (!op || (m.type === 'prune-result' && !m.applied) || (m.type === 'override-result' && m.preview)) return;
      const summary = typeof m.summary === 'string' ? m.summary : '';
      push({ op, by, cmd, verdict: { type: m.type, ok: !!m.ok }, headline: typeof m.headline === 'string' ? m.headline : '', summary,
        lines: Array.isArray(m.lines) ? [...m.lines] : summary ? [summary] : [], problems: [] });
    },
    /** Record the panel's own summary of a run of several writes (`activity-note`). */
    note(n: { readonly op: 'components' | 'update'; readonly ok: boolean; readonly headline: string; readonly lines: readonly string[] }): void {
      push({ op: n.op, by: 'panel', cmd: null, verdict: { type: 'activity-note', ok: n.ok }, headline: n.headline, summary: n.lines.join(' '), lines: [...n.lines], problems: [] });
    },
    /** Attach a build's per-set problems to the newest run of `op`. */
    annotate(op: ActivityOp, problems: readonly ActivityProblem[]): void {
      for (let i = runs.length - 1; i >= 0; i--) if (runs[i].op === op) { runs[i] = { ...runs[i], problems: problems.map((p) => ({ set: p.set, reasons: capReasons(p.reasons) })) }; return; }
    },
    /** The runs after `since` (a `seq`), newest first, at most `limit`. */
    list(a: { readonly since?: number; readonly limit?: number } = {}): { runs: ActivityRun[]; total: number; latest: number } {
      const after = runs.filter((r) => r.seq > (a.since ?? 0)).reverse();
      return { runs: after.slice(0, a.limit ?? keep), total: runs.length, latest: seq };
    },
  };
};
export type ActivityLog = ReturnType<typeof createActivityLog>;
