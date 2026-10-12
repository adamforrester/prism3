/**
 * DEV-ONLY AGENT COMMANDS (#2530, owner Q239 A). DEV BUILDS ONLY: every caller reaches this module through a
 * `PRISM3_DEV &&` branch, which the release build folds away, so the module is not in `release/` at all
 * (`lint-release-bundle.ts` checks it). The published plugin's rule, "nothing in a command is evaluated", holds for
 * the release build; a dev build adds this one command so a lane can probe the file without swapping plugins.
 *
 * `run-code {code, timeoutMs?}` runs `code` in the plugin's main thread as the body of an async function, so it may
 * `await` and `return`. The result is our envelope: `result.data.value` is the returned value as JSON (or its string
 * form when it is not JSON), `result.logs` every console line printed while it ran (the dispatcher's `teeConsole`),
 * and a syntax error, a throw or a timeout comes back as `error.code: 'handler-threw'` with the message.
 *
 * THE EVALUATION PATTERN, PROVEN IN FIGMA'S MAIN THREAD (2026-10-12, the scratch file, read-only). An INDIRECT eval,
 * `(0, eval)(…)`, of an async IIFE: it runs in global scope, where `figma` is (`typeof figma` was `object`), `await`
 * works, a throw rejects, and a syntax error throws at once. The Figma Console MCP's Desktop Bridge uses a DIRECT eval
 * (its `EXECUTE_CODE`, v1.39.0: "AsyncFunction is restricted in Figma's plugin sandbox, but eval works"); a direct
 * eval stops esbuild from tree-shaking the module, so the release build would keep this file as unreachable text.
 * Figma's sandbox rejects a plugin whose source has `import` followed by `(` at load, and `lint-sandbox-reject.ts`
 * keeps that sequence out of our own bundles; nothing here spells it. What the sandbox does with it in code passed
 * to this command at run time is not verified here, so this file claims nothing about it.
 *
 * A TIMEOUT STOPS THE WAITING, NOT THE CODE (#2544 review). JavaScript cannot stop an async function from outside, so
 * a run past its `timeoutMs` is reported as timed out while its code may go on: a write it makes after that can still
 * land (seen: one landing 200 ms after the report). The message says so, and so do the READMEs.
 */

export const RUN_CODE = 'run-code' as const;
export type RunCodeArgs = { code: string; timeoutMs: number };

/** 30 s by default; the bridge server's own `figma_run` timeout is 600 s, so a run may not ask for longer. */
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 600_000;
/** A value bigger than this is cut, so one run cannot flood the mailbox or the socket. */
const MAX_VALUE_CHARS = 1_000_000;

/** `args` as `parseCommand` hands them over: the reason they are refused, or the args. */
export const parseRunCode = (args: Record<string, unknown>): RunCodeArgs | string => {
  if (typeof args.code !== 'string' || !args.code.trim()) return 'run-code needs args.code: the body of an async function, as a string';
  const t = args.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : args.timeoutMs;
  if (typeof t !== 'number' || !Number.isFinite(t) || t < 1 || t > MAX_TIMEOUT_MS) {
    return `run-code takes args.timeoutMs: milliseconds from 1 to ${MAX_TIMEOUT_MS}`;
  }
  return { code: args.code, timeoutMs: t };
};

/** The returned value as our envelope carries it: JSON when it is JSON, its string form when it is not. */
const asData = (value: unknown): { value: unknown; valueType: string; truncated?: true } => {
  const valueType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (value === undefined) return { value: null, valueType };
  let json: string | undefined;
  try { json = JSON.stringify(value); } catch { json = undefined; }
  if (json === undefined) return { value: String(value), valueType };
  if (json.length > MAX_VALUE_CHARS) return { value: json.slice(0, MAX_VALUE_CHARS), valueType, truncated: true };
  return { value: JSON.parse(json), valueType };
};

/** Run `code` and report its value. Throws on a syntax error, a throw or a timeout, which the dispatcher turns into
 *  `handler-threw`; console lines reach `result.logs` through the dispatcher. */
export const runCode = async (a: RunCodeArgs, data: (d: Record<string, unknown>) => void): Promise<void> => {
  const wrapped = `(async function () {\n${a.code}\n})()`;
  let pending: Promise<unknown>;
  try {
    // Indirect, so it runs in global scope, where `figma` is, and esbuild can still drop this module (see the header).
    pending = (0, eval)(wrapped) as Promise<unknown>;
  } catch (e) {
    throw new Error(`run-code: the code does not parse — ${(e as Error)?.message ?? String(e)}`);
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`run-code: timed out after ${a.timeoutMs} ms; the code may still be running, and anything it writes may still land`)), a.timeoutMs);
  });
  const t0 = Date.now();
  try {
    const value = await Promise.race([pending, timeout]);
    data({ ...asData(value), ms: Date.now() - t0 });
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};
