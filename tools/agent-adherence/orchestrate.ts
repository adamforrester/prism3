/**
 * THE ORCHESTRATOR (#3440, proposal §3): plans the code runs, captures each run's output, and records it so the scorer can
 * tell a captured output from a stale one.
 *
 *   npx tsx tools/agent-adherence/orchestrate.ts pin <commit>                  # record the pin (pin.json), then rebuild packets
 *   npx tsx tools/agent-adherence/orchestrate.ts plan <runs-dir> [--n 5]       # one SEND.md per run, and plan.json
 *   npx tsx tools/agent-adherence/orchestrate.ts capture <runs-dir> <id> --final <final.md> --transcript <transcript>
 *   npx tsx tools/agent-adherence/score-code.ts <runs-dir>                     # results.json and results.md
 *
 * THE RUN (Q3440.2 A): for each planned run, an orchestrator session starts ONE fresh cloud session with no `source_url`
 * (no repo, no CLAUDE.md, no repo skills), in an environment with no allowed hosts, and sends it `<id>/SEND.md`
 * verbatim as its first and only message. When the session is idle, save its final assistant message to a file and the
 * whole transcript (every event, as text or JSON) to another, then `capture` them. Never edit either file by hand: the
 * record holds each output's sha256, and the scorer refuses an output that no longer matches (proposal §1).
 *
 * THE CAPTURE FORMAT is the packet's "What to send back" (`packets.ts` `task`): each file between `=== FILE: <name> ===`
 * and `=== END FILE ===` on lines of their own. The last block for each name wins. A code fence just inside the markers
 * is dropped. A run whose final message lacks either file is recorded as captured with that file missing.
 *
 * CONTAMINATION (proposal §2, "checked on every run rather than assumed"): `capture` voids a run whose transcript shows
 * a TOOL CALL that loads a prism3 skill (`Skill`), or a `Read` / `WebFetch` / `Bash` / `Grep` / `Glob` / `Agent` /
 * `Task` or any MCP (`mcp__…`) call whose input names a CLAUDE.md (any case), `skills/prism3-*` or the repository (#3567). Prose is never matched: the C1 packet itself names `skills/prism3-rebind/…`, so
 * a free-text match voided C1 runs that C0 runs could not reach (review S1, selection bias). A void run is recorded,
 * reported, and never scored.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPin, sha256, writePin } from './oracle';
import { ARMS, buildPacket, packetPath } from './packets';

export const CAPTURE_FILES = ['index.html', 'REPORT.md'];

/** Pull each `=== FILE: name ===` block out of a final message. */
export const extractFiles = (message: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const m of message.matchAll(/^=== FILE: (\S+) ===\n([\s\S]*?)\n=== END FILE ===$/gm)) {
    let body = m[2];
    const fence = /^```[\w-]*\n([\s\S]*?)\n?```$/.exec(body);
    if (fence) body = fence[1];
    out[m[1]] = body.endsWith('\n') ? body : `${body}\n`;
  }
  return out;
};

/** Literals, fixed before any run. Each names what it found, so a void says why. Matched against TOOL-CALL INPUTS only. */
const CONTAMINATION: [RegExp, string][] = [
  [/CLAUDE\.md/i, 'a CLAUDE.md appears'],   // any case: `find / -iname claude.md` reaches the file too (#3567)
  // No hyphen required, either slash, any case (#3584): `cat skills/prism3*/SKILL.md` reads the skill through a glob.
  [/skills[\\/]+prism3/i, 'a read of skills/prism3-*'],
  [/github\.com\/adamforrester\/prism3|raw\.githubusercontent\.com\/adamforrester\/prism3|api\.github\.com\/repos\/adamforrester\/prism3/i, 'a fetch of the repository'],
];
/** The tools whose input can reach the repo, a CLAUDE.md or a skill file. A `Skill` call is judged by its skill name. */
/** `Grep`, `Glob` and a sub-agent (`Agent`, `Task`) can reach a skill file too (delta review nit). */
const READ_TOOLS = ['Read', 'WebFetch', 'Bash', 'Grep', 'Glob', 'Agent', 'Task'];
/** Any MCP tool (`mcp__<server>__<tool>`) is a read too (#3567): a run session gets MCP servers by default, and the
 *  GitHub server's `get_file_contents` reaches a skill file as well as `Read` does. */
const MCP_RE = /^mcp__[\w-]+$/;
const readsFiles = (name: string): boolean => READ_TOOLS.includes(name) || MCP_RE.test(name);
const SKILL_RE = /prism3-/i;

/** One tool call, however the transcript spells it: its tool name and its input as text. */
type ToolCall = { name: string; input: string };
/**
 * The tool calls in a transcript, and nothing else: prose (the packet, the agent's reasoning, its final message) is never
 * read, so an agent that only MENTIONS `skills/prism3-rebind/…` (as the C1 packet does) is not void (review S1).
 *   · JSON: the whole file, or one event per line (JSONL). Every object with `type: "tool_use"`, a `name` and an `input`,
 *     at any depth. Parsing undoes every escape spelling (`\uXXXX` included), so no spelling of the packet matters.
 *   · Text: a line that starts (after bullets or symbols) with `Skill(` or one of `READ_TOOLS` and `(`, and ends at
 *     its closing `)`, as a terminal transcript prints a call. A sentence that names a tool mid-line is prose.
 *     Claude Code prints an MCP call as `<server> - <tool>(<args>) (MCP)` (its `userFacingName`, the ` (MCP)` moved
 *     after the arguments), never as the `mcp__…` name; such a line is read as `mcp__<server>__<tool>`, the server
 *     name normalized the way the JSON name is (#3567 review). A server name with a space is not read (see the README).
 */
export const toolCalls = (transcript: string): ToolCall[] => {
  const calls: ToolCall[] = [];
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) { for (const x of n) walk(x); return; }
    if (!n || typeof n !== 'object') return;
    const o = n as Record<string, unknown>;
    if (o.type === 'tool_use' && typeof o.name === 'string' && o.input !== undefined)
      calls.push({ name: o.name, input: typeof o.input === 'string' ? o.input : JSON.stringify(o.input) });
    for (const v of Object.values(o)) walk(v);
  };
  const json = (s: string): unknown => { try { return JSON.parse(s); } catch { return undefined; } };
  const whole = json(transcript);
  if (whole !== undefined && typeof whole === 'object') { walk(whole); return calls; }
  for (const line of transcript.split('\n')) {
    const ev = line.trim().startsWith('{') ? json(line) : undefined;
    if (ev !== undefined) { walk(ev); continue; }
    const m = /^[^\p{L}\p{N}]*(Skill|Read|WebFetch|Bash|Grep|Glob|Agent|Task)\((.*)\)\s*$/u.exec(line);
    if (m) { calls.push({ name: m[1], input: m[2] }); continue; }
    const mcp = /^[^\p{L}\p{N}]*([\w.-]+) - ([\w-]+)\((.*)\) \(MCP\)\s*$/u.exec(line);
    if (mcp) calls.push({ name: `mcp__${mcp[1].replace(/[^\w-]/g, '_')}__${mcp[2]}`, input: mcp[3] });
  }
  return calls;
};

export const probeContamination = (transcript: string, packet: string): string[] => {
  const found = new Set<string>();
  for (const c of toolCalls(transcript)) {
    // A tool input that quotes the packet (a heredoc of it, say) is not a read of what the packet names.
    const input = c.input.split(packet).join(' ').split(JSON.stringify(packet).slice(1, -1)).join(' ');
    if (c.name === 'Skill') { if (SKILL_RE.test(input)) found.add('a prism3- skill was loaded'); continue; }
    if (!readsFiles(c.name)) continue;
    for (const [re, why] of CONTAMINATION) if (re.test(input)) found.add(why);
  }
  return [...found];
};

const plan = (dir: string, n: number) => {
  const pin = loadPin();
  mkdirSync(dir, { recursive: true });
  const runs: { id: string; arm: string; packetSha256: string }[] = [];
  const packets = Object.fromEntries(ARMS.map((a) => {
    const text = buildPacket(a);
    if (readFileSync(packetPath(a), 'utf8') !== text) throw new Error(`packets/${a}.md differs from a rebuild at the pin; run packets.ts`);
    return [a, text];
  }));
  for (let i = 1; i <= n; i++) for (const a of ARMS) runs.push({ id: `${a}-${i}`, arm: a, packetSha256: sha256(packets[a]) });
  for (const r of runs) {
    mkdirSync(resolve(dir, r.id), { recursive: true });
    writeFileSync(resolve(dir, r.id, 'SEND.md'), packets[r.arm]);
  }
  const capture = 'Save the final assistant message and the whole transcript, then run: orchestrate.ts capture <runs-dir> <id> --final <file> --transcript <file>';
  writeFileSync(resolve(dir, 'plan.json'), JSON.stringify({ pin: pin.commit, n, capture, runs }, null, 2) + '\n');
  console.log(`planned ${runs.length} runs in ${dir} at pin ${pin.commit.slice(0, 8)}, interleaved: ${runs.map((r) => r.id).join(' ')}`);
  for (const a of ARMS) console.log(`  ${a}: send ${a}-<i>/SEND.md verbatim (${packets[a].length} chars, sha256 ${sha256(packets[a]).slice(0, 12)})`);
};

const capture = (dir: string, id: string, finalFile: string, transcriptFile: string) => {
  const p = JSON.parse(readFileSync(resolve(dir, 'plan.json'), 'utf8'));
  const run = p.runs.find((r: any) => r.id === id);
  if (!run) throw new Error(`${id} is not a planned run`);
  const packet = readFileSync(resolve(dir, id, 'SEND.md'), 'utf8');
  if (sha256(packet) !== run.packetSha256) throw new Error(`${id}/SEND.md is not the planned packet`);
  const files = extractFiles(readFileSync(finalFile, 'utf8'));
  const out = resolve(dir, id, 'out');
  mkdirSync(out, { recursive: true });
  const shas: Record<string, string> = {};
  for (const f of CAPTURE_FILES) if (files[f] !== undefined) { writeFileSync(resolve(out, f), files[f]); shas[f] = sha256(files[f]); }
  const contamination = probeContamination(readFileSync(transcriptFile, 'utf8'), packet);
  writeFileSync(resolve(dir, id, 'final.md'), readFileSync(finalFile));
  writeFileSync(resolve(dir, id, 'record.json'), JSON.stringify({ id, arm: run.arm, pin: p.pin, packetSha256: run.packetSha256, files: shas, contamination, transcriptSha256: sha256(readFileSync(transcriptFile)) }, null, 2) + '\n');
  console.log(`${id}: captured ${Object.keys(shas).join(', ') || 'no files'}${contamination.length ? `; VOID: ${contamination.join('; ')}` : ''}`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [cmd, ...a] = process.argv.slice(2);
  const flag = (k: string) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  if (cmd === 'pin' && a[0]) { const pin = writePin(a[0]); console.log(`pinned ${pin.commit}; now run packets.ts`); }
  else if (cmd === 'plan' && a[0]) plan(resolve(a[0]), Number(flag('--n') ?? 5));
  else if (cmd === 'capture' && a[0] && a[1] && flag('--final') && flag('--transcript') && existsSync(flag('--final')!) && existsSync(flag('--transcript')!))
    capture(resolve(a[0]), a[1], flag('--final')!, flag('--transcript')!);
  else { console.error('usage: orchestrate.ts pin <commit> | plan <runs-dir> [--n 5] | capture <runs-dir> <id> --final <file> --transcript <file>'); process.exit(2); }
}
