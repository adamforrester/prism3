/**
 * THE AGENT LINK'S DISPATCHER — one command in, one result envelope out, through the UI's own handlers.
 *
 * MAIN THREAD. Both transports hand a raw envelope to `dispatch`; it validates (`parseCommand`), routes the
 * command to an entry of the `AgentActions` table, captures what that entry reports, and returns an
 * `AgentResult`. It has no handler of its own for anything that writes to the file.
 *
 * NO PARALLEL PATH. `AgentActions` is the table `main.ts` builds from its own `applyTheme` /
 * `buildComponents` / `fileSetup` / `prune` / `seedFromFile` — the functions its UI message switch calls —
 * and `main.ts`'s switch calls THROUGH that same table. So an agent's `apply-theme` and the designer's Apply
 * button reach one function object, and `test-agent-link.ts` proves it by spying on the table and driving
 * both paths: pointing a route below at a copy of a handler fails that suite by the command's name.
 *
 * WHAT A HANDLER REPORTS TO. Each handler takes an `ActionSink`. The UI's sink posts to the panel
 * (`postToUi`), exactly as before; the dispatcher's sink CAPTURES instead — the terminal verdict (the same
 * message, headline and summary the panel would render), the `component-progress` readings, and the
 * structured `data` the handler exposes beside its prose. Each terminal verdict is ALSO forwarded to the
 * panel (`forward`), so its status pills show an agent's command the way they show a button's (the owner's
 * call). `main.ts` marks an agent's prune preview pill-only on the way: opened as the confirm dialog, the
 * owner's Confirm would prune against the panel's own knobs, not the input the agent previewed.
 *
 * `status` is the one command with no UI twin: it reads the link state and the file, and writes nothing.
 * `readback` is the UI's boot read-back (`seedFromFile`, through the table) plus a READ-ONLY census of every
 * component page — each set's variant count, properties and the report its build left on it (#1579).
 *
 * `cleanup` is deliberately absent. No UI action removes components (the paste harness's `runCleanupPage`
 * is a harness step, not a handler the panel reaches), and this dispatcher routes only to those.
 */
import { ENGINE_VERSION } from '@prism3/engine/version';
import { AGENT_PROTOCOL_VERSION, parseCommand, failedResult } from './agent-protocol';
import type { AgentResult, AgentTransport, AgentProgress, ValidCommand, AgentCmd } from './agent-protocol';
import type { MainToUi } from './messages';
import type { BrandInput } from '@prism3/engine/theme';
import { allLeaves, leafPageName } from './file-taxonomy';

/** Where a handler sends what it would show the designer, and the structured facts behind it. */
export type ActionSink = {
  post(m: MainToUi): void;
  /** Structured facts for an agent. The UI's sink ignores them; a handler must not depend on them landing. */
  data(d: Record<string, unknown>): void;
};

/** The main-thread handlers the UI's buttons reach — built by `main.ts` from its own functions. */
export type AgentActions = {
  applyTheme(input: BrandInput, sink: ActionSink): Promise<void>;
  buildComponents(def: string | undefined, sink: ActionSink): Promise<void>;
  fileSetup(sink: ActionSink): Promise<void>;
  prune(input: BrandInput, confirm: boolean, sink: ActionSink): Promise<void>;
  seedFromFile(sink: ActionSink): Promise<void>;
};

/** The slice of a page node the census reads. */
type CensusNode = {
  name: string;
  type: string;
  children?: readonly unknown[];
  componentPropertyDefinitions?: Record<string, unknown>;
  getSharedPluginData?(ns: string, key: string): string;
};
type CensusPage = { name: string; children: readonly CensusNode[]; loadAsync?(): Promise<void> };
export type CensusHost = { root: { children: readonly CensusPage[] } };

/**
 * A READ-ONLY census of the component pages the taxonomy names: every top-level set or component on each
 * one that exists, with its variant count, its declared properties and the build's own report (#1579).
 * Pages are LOADED, never switched to, so the owner's view does not move. A page that is absent is listed
 * as absent — the build creates pages on demand, so absence is the ordinary state of an unbuilt family.
 */
export const componentCensus = async (host: CensusHost, engineVersion: string) => {
  const leaves = allLeaves().filter(({ leaf }) => leaf.defs.length > 0);
  const pages: Record<string, unknown>[] = [];
  for (const { leaf } of leaves) {
    const name = leafPageName(leaf);
    const page = host.root.children.find((p) => p.name === name);
    if (!page) { pages.push({ page: name, defs: leaf.defs, present: false }); continue; }
    let loadError: string | undefined;
    try { await page.loadAsync?.(); } catch (e) { loadError = (e as Error)?.message ?? String(e); }
    const found = page.children
      .filter((n) => n.type === 'COMPONENT_SET' || n.type === 'COMPONENT')
      .map((n) => {
        let properties: string[] | undefined;
        let unreadable: string | undefined;
        if (n.type === 'COMPONENT_SET') {
          try { properties = Object.keys(n.componentPropertyDefinitions ?? {}); } catch (e) { unreadable = (e as Error)?.message; }
        }
        let report: Record<string, unknown> | null = null;
        try {
          const raw = n.getSharedPluginData?.('prism3', 'build') ?? '';
          report = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
        } catch { report = { unparseable: true }; }
        // A set built by another engine version is exactly the #827 STALE reading; said here so an agent
        // does not have to compare version strings itself.
        const stale = report && typeof report.engine === 'string' ? report.engine !== engineVersion : null;
        return {
          name: n.name, type: n.type,
          ...(n.type === 'COMPONENT_SET' ? { variants: n.children?.length ?? 0, properties } : {}),
          ...(unreadable ? { unreadable } : {}),
          buildReport: report, builtByOtherEngine: stale,
        };
      });
    pages.push({ page: name, defs: leaf.defs, present: true, ...(loadError ? { loadError } : {}), found });
  }
  return pages;
};

type Deps = {
  actions: AgentActions;
  /** The `status` payload: link state, build, the file's themed state. */
  status(): Promise<Record<string, unknown>>;
  /** The component-page census for `readback`. */
  census(): Promise<unknown>;
  now?: () => Date;
  /** Each progress reading as it arrives (the bridge streams these). */
  onProgress?(id: string, p: AgentProgress): void;
  /** Each console line as it is printed during a command (the bridge streams these). */
  onLog?(id: string, line: string): void;
  /** Each terminal verdict as it lands, so the panel's status pills show an agent's command the way they
   *  show a button's (the owner's call). Progress readings are not forwarded: the panel only counts a build
   *  it started itself. */
  forward?(m: MainToUi): void;
};

/** Per-command routes into the table. The ONLY place a command meets a handler — see the header. */
type Route = (c: ValidCommand, a: AgentActions, sink: ActionSink, d: Deps) => Promise<void>;
export const ROUTES: { [C in AgentCmd]: Route } = {
  status: async (_c, _a, sink, d) => { sink.data(await d.status()); },
  'apply-theme': (c, a, sink) => a.applyTheme((c as Extract<ValidCommand, { cmd: 'apply-theme' }>).args.input, sink),
  'build-components': (c, a, sink) => a.buildComponents((c as Extract<ValidCommand, { cmd: 'build-components' }>).args.def, sink),
  'file-setup': (_c, a, sink) => a.fileSetup(sink),
  prune: (c, a, sink) => {
    const { input, confirm } = (c as Extract<ValidCommand, { cmd: 'prune' }>).args;
    return a.prune(input, confirm, sink);
  },
  readback: async (_c, a, sink, d) => {
    await a.seedFromFile(sink);
    sink.data({ components: await d.census() });
  },
};

const LOG_CAP = 500;
const PROGRESS_CAP = 400;

const fmt = (args: unknown[]): string =>
  args.map((x) => {
    if (typeof x === 'string') return x;
    if (x instanceof Error) return `${x.name}: ${x.message}`;
    try { return JSON.stringify(x); } catch { return String(x); }
  }).join(' ');

/**
 * Copy every console line printed while `run` is in flight into `sink`. Best-effort: a host whose
 * `console` cannot be reassigned simply yields no logs, and the command still runs.
 */
const teeConsole = async <T>(sink: (line: string) => void, run: () => Promise<T>): Promise<T> => {
  const c = console as unknown as Record<'log' | 'warn' | 'error', (...a: unknown[]) => void>;
  const orig = { log: c.log, warn: c.warn, error: c.error };
  let teed = false;
  try {
    for (const k of ['log', 'warn', 'error'] as const) {
      c[k] = (...a: unknown[]) => { try { sink(k === 'log' ? fmt(a) : `[${k}] ${fmt(a)}`); } catch { /* never fail a log */ } orig[k].apply(console, a); };
    }
    teed = true;
  } catch { /* a frozen console: no logs, same run */ }
  try {
    return await run();
  } finally {
    if (teed) { c.log = orig.log; c.warn = orig.warn; c.error = orig.error; }
  }
};

/**
 * Build the dispatcher. `dispatch(raw, transport)` never throws and always resolves to a result.
 *
 * ONE COMMAND AT A TIME, across transports: every call queues behind the previous one, so a mailbox
 * command and a bridge command can never interleave their writes into one file.
 */
export const createDispatcher = (deps: Deps) => {
  const now = deps.now ?? (() => new Date());
  let queue: Promise<unknown> = Promise.resolve();
  const dispatch = (raw: unknown, transport: AgentTransport): Promise<AgentResult> => {
    const next = queue.then(() => runOne(raw, transport));
    queue = next.catch(() => undefined);
    return next;
  };
  const runOne = async (raw: unknown, transport: AgentTransport): Promise<AgentResult> => {
    const startedAt = now().toISOString();
    const parsed = parseCommand(raw);
    if (!parsed.ok) {
      return failedResult({ id: parsed.id ?? '', cmd: parsed.cmd, transport, engineVersion: ENGINE_VERSION, at: startedAt }, parsed.error);
    }
    const c = parsed.command;
    const verdicts: MainToUi[] = [];
    const progress: AgentProgress[] = [];
    const data: Record<string, unknown> = {};
    const logs: string[] = [];
    let logsDropped = 0;
    const sink: ActionSink = {
      post(m) {
        if (m.type === 'component-progress') {
          const p: AgentProgress = { at: now().toISOString(), phase: m.phase, done: m.done, total: m.total, chunkMs: m.chunkMs };
          if (progress.length < PROGRESS_CAP) progress.push(p);
          deps.onProgress?.(c.id, p);
        } else {
          verdicts.push(m);
          try { deps.forward?.(m); } catch { /* the panel is a reader; its failure never fails the command */ }
        }
      },
      data(d) { Object.assign(data, d); },
    };
    const onLine = (line: string) => {
      if (logs.length < LOG_CAP) logs.push(line); else logsDropped++;
      deps.onLog?.(c.id, line);
    };
    try {
      await teeConsole(onLine, () => ROUTES[c.cmd](c, deps.actions, sink, deps));
    } catch (e) {
      return {
        ...failedResult({ id: c.id, cmd: c.cmd, transport, engineVersion: ENGINE_VERSION, at: startedAt },
          { code: 'handler-threw', message: (e as Error)?.message ?? String(e) }),
        finishedAt: now().toISOString(),
        ...(progress.length ? { progress } : {}),
      };
    }
    if (logsDropped) logs.push(`… ${logsDropped} more lines not kept`);
    // One terminal verdict per action is the handlers' own invariant (#908); if more than one arrived,
    // the LAST is what the panel would be showing, and every one of them must be ok for the command to be.
    const verdict = verdicts.length ? verdicts[verdicts.length - 1] : null;
    if (verdicts.length > 1) data.earlierVerdicts = verdicts.slice(0, -1);
    // A write command that posted no verdict at all is not a success: the panel would still say pending.
    if (!verdict && c.cmd !== 'status') data.noVerdict = 'the handler returned without reporting a verdict';
    const ok = (verdict !== null || c.cmd === 'status') && verdicts.every((v) => !('ok' in v) || v.ok);
    return {
      v: AGENT_PROTOCOL_VERSION, id: c.id, cmd: c.cmd, ok,
      startedAt, finishedAt: now().toISOString(), engineVersion: ENGINE_VERSION, transport,
      result: { verdict, data, logs },
      ...(progress.length ? { progress } : {}),
    };
  };
  return dispatch;
};
export type Dispatch = ReturnType<typeof createDispatcher>;
