/**
 * AN AGENT'S RUN, SEEN FROM THE CANVAS (#2368, owner decision A, 2026-11-18). During an agent-link run the owner could
 * not tell whether anything was running, so did not know when it was safe to look at the file, touch the plugin or close
 * it. Closing the plugin mid-run stops the run partway. So a run that writes the file shows:
 *   · a busy mark on the Agent switch in the plugin's bar, from the run's start until its result is written;
 *   · a host notice (`figma.notify`) at the start, which says that closing Prism3 stops the run, and stays up until
 *     the run's result is written;
 *   · a host notice at the finish, with the command's headline.
 *
 * WHY THE WARNING IS IN THE START NOTICE. A Figma plugin cannot hold its window open: the host's close button ends the
 * plugin (`figma.on('close')` runs, and cannot cancel it). So the warning is said before anyone closes: in the notice that
 * stays over the canvas for the run's length, and in the busy mark's tooltip and accessible description.
 *
 * WHICH RUNS. A command that writes the file: every command the run guard holds the file for (`guardFor`), less the
 * previews that write nothing (a prune or a usage-panel clean without `confirm`, a `set-override` preview, an
 * `update-components` dry run). The read commands, and `status` (which an agent may poll every few seconds), show
 * nothing: closing the plugin during a read loses nothing.
 *
 * "DONE" IS THE RESULT WRITTEN. The run's end is when the agent link publishes the command as its `lastCommand`, which
 * it does after the result is stored in the mailbox (`agent-link.ts` `poll`) or sent over the bridge (`noteCommand`),
 * not when the handler returns (`agent-finished`), which comes first. Before that moment the agent has no answer.
 *
 * All wording here was approved by the owner as built on 2026-11-18 (#2368, on #4063).
 *
 * Pure: no `figma` and no DOM. `main.ts` owns the notices, `agent-link-ui.ts` the busy mark; `test-agent-link.ts` and
 * `test-start-screen.mjs` drive both.
 */
import { guardFor } from './run-guard';

/** The command in operation words: the Activity drawer's titles, as `agent-link-ui.ts` `AGENT_CMD_WORDS` has them. A
 *  copy, because the main thread does not bundle the shell; `test-agent-link.ts`'s `#2368 words` keeps them equal. */
export const AGENT_RUN_WORDS: Readonly<Record<string, string>> = {
  'apply-theme': 'Theme', 'build-components': 'Build set', 'file-setup': 'Set up file', 'style-guide': 'Style guides',
  prune: 'Prune stale', 'draw-specs': 'Specs', 'update-components': 'Update sets', 'capture-baseline': 'Record the sets',
  'adopt-members': 'Adopt members', 'panels-clean': 'Clean up usage panels', 'set-override': 'Color override',
};

/** The commands whose call writes only with `confirm: true`; without it each is a preview. */
const PREVIEWS: ReadonlySet<string> = new Set(['prune', 'panels-clean', 'set-override', 'update-components']);

/** Whether a call of `cmd` is announced: it writes the file. */
export const announces = (cmd: string, confirm: boolean): boolean =>
  guardFor(cmd) !== null && (!PREVIEWS.has(cmd) || confirm);

const words = (cmd: string): string => AGENT_RUN_WORDS[cmd] ?? cmd;

/** How long the finish notice stays up, in ms: the run notice's (#533). The start notice stays until the finish. */
export const AGENT_DONE_MS = 6000;

/** The start notice and the busy mark's description. */
export const agentStartLine = (cmd: string): string => `Agent running ${words(cmd)} — closing Prism3 now stops it partway.`;

/** The finish notice for the run `announced` once the link publishes `last`, or `null` when `last` is not that run.
 *  The headline loses its leading mark ("✓ ", "⚠ "), as the drawer's status line does. */
export const agentDoneNotice = (
  announced: { readonly id: string; readonly cmd: string } | null,
  last: { readonly id: string; readonly ok: boolean; readonly headline?: string | null } | null | undefined,
): { readonly message: string; readonly timeout: number } | null => {
  if (!announced || !last || last.id !== announced.id) return null;
  const h = String(last.headline ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const head = last.ok ? `Agent finished ${words(announced.cmd)}` : `Agent's ${words(announced.cmd)} did not finish`;
  return { message: h ? `${head} — ${h}` : `${head}.`, timeout: AGENT_DONE_MS };
};

/** The busy mark's state: the announced run the panel was told started, until the link publishes its result. Starts on
 *  an `agent-started` that carries `busy`; ends on an `agent-link-state` whose `lastCommand` is that run. Pure. */
export type AgentBusy = { readonly id: string; readonly cmd: string } | null;
export const nextAgentBusy = (busy: AgentBusy, m: unknown): AgentBusy => {
  const x = m as { type?: unknown; id?: unknown; cmd?: unknown; busy?: unknown; state?: { lastCommand?: { id?: unknown } | null } } | null;
  if (!x || typeof x.type !== 'string') return busy;
  if (x.type === 'agent-started') return x.busy === true ? { id: String(x.id ?? ''), cmd: String(x.cmd ?? '') } : busy;
  if (x.type === 'agent-link-state' && busy && x.state?.lastCommand?.id === busy.id) return null;
  return busy;
};
