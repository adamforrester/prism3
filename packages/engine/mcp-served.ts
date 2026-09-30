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
 *
 * WHY `servedStrings` AND NOT THE JSON TEXT (#1806 review). The first cut ran the rules over
 * `JSON.stringify(tool, null, 2)`. JSON escapes a newline inside a string as the two characters `\n`,
 * so the word after it starts with `n` glued to it (`\nSimply` reads as `nSimply`) and every
 * word-boundary rule missed it: measured, a description with `\nSimply` and `\nMUST NOT` caught 1 of 3,
 * and `\nprogramme` passed the US-English rules. So the gates now walk the PARSED reply and scan each
 * string on its own, values AND keys, reporting its JSON path. The same blind spot in the file scans of
 * `out/*.json` and `schema/*.json` is filed separately.
 *
 * THE SPAWN. Under `tsx` (how every gate runs), `process.execArgv` carries tsx's loader flags, so this
 * starts ONE node process with them rather than `npx tsx`, which forks a node under a node: a
 * `spawnSync` timeout kills only the direct child, and the grandchild would be orphaned. Outside tsx it
 * falls back to `npx tsx`, the command `mcp-test.ts` uses. tsx is not a repo dependency (CI fetches it
 * with `npx --yes tsx@4`), so its path cannot be named here directly.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

export type ServedTool = { name: string; [k: string]: unknown };
export type Served = { tools: ServedTool[] } | { error: string };

const ID = 'prose-gate-tools-list';

export const servedToolsList = (repo: string): Served => {
  const request = JSON.stringify({ jsonrpc: '2.0', id: ID, method: 'tools/list' }) + '\n';
  // stdin closes after the one request, so the server answers and exits on its own.
  const server = join(repo, 'packages/engine/mcp.ts');
  const underTsx = process.execArgv.some((a) => /[\\/]tsx[\\/]/.test(a));
  const [cmd, args] = underTsx ? [process.execPath, [...process.execArgv, server]] : ['npx', ['tsx', server]];
  const run = spawnSync(cmd, args, {
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

/** Every string in a served tool, values and keys, each with its JSON path (`theme_from_brief.inputSchema.
 *  properties.brief.description`; a key reports as `….properties.brief (key)`). The gates run their rules
 *  on each string alone, never on serialized JSON: see the header on `\n`. */
export const servedStrings = (tool: ServedTool): { path: string; text: string }[] => {
  const out: { path: string; text: string }[] = [];
  const walk = (node: unknown, path: string): void => {
    if (typeof node === 'string') { out.push({ path, text: node }); return; }
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        out.push({ path: `${path}.${k} (key)`, text: k });
        walk(v, `${path}.${k}`);
      }
    }
  };
  walk(tool, String(tool.name));
  return out;
};
