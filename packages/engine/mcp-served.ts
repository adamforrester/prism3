/**
 * The MCP server's `tools/list`, obtained the way a client obtains it (#1806).
 *
 * The prose gates (`lint-us-english.ts`, `lint-voice.ts`) scan shipped text, and the tool and argument
 * descriptions an agent reads on connecting are shipped text. They are not a file: `toolDefs` assembles
 * them at request time from `mcp.ts` and the inlined theme schema. So a source grep of `mcp.ts` is the
 * wrong surface twice over. It sees comments that never ship, and it misses prose that arrives from the
 * schema. This spawns the real server over stdio, as `mcp-test.ts` does, sends one `tools/list`, and
 * returns what came back.
 *
 * Only the ACQUISITION is shared between the two gates, never a rule: each gate applies its own rules to
 * the result and asserts, with its own literal list of tool names, that the surface was represented. A
 * failure here is a verdict (`error`), never an empty list, so a server that stops answering makes both
 * gates blind rather than clean.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

export type ServedTool = { name: string; [k: string]: unknown };
export type Served = { tools: ServedTool[] } | { error: string };

const ID = 'prose-gate-tools-list';

export const servedToolsList = (repo: string): Served => {
  const request = JSON.stringify({ jsonrpc: '2.0', id: ID, method: 'tools/list' }) + '\n';
  // stdin closes after the one request, so the server answers and exits on its own.
  const run = spawnSync('npx', ['tsx', join(repo, 'packages/engine/mcp.ts')], {
    cwd: repo, input: request, encoding: 'utf8', timeout: 120_000, maxBuffer: 64 * 1024 * 1024,
  });
  if (run.error) return { error: `the MCP server did not run (${run.error.message})` };
  const replies = run.stdout.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return undefined; }
  });
  const reply = replies.find((m) => m?.id === ID);
  if (!reply) return { error: `no reply to tools/list (exit ${run.status}; stderr: ${run.stderr.trim().slice(0, 300)})` };
  if (reply.error) return { error: `tools/list returned RPC error ${reply.error.code}: ${reply.error.message}` };
  const tools = reply.result?.tools;
  if (!Array.isArray(tools)) return { error: 'the tools/list reply carried no tools array' };
  return { tools };
};
