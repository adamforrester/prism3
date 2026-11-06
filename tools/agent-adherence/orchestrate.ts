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
 * THE CAPTURE FORMAT is the packet's "What to send back" (`packets.ts` `TASK`): each file between `=== FILE: <name> ===`
 * and `=== END FILE ===` on lines of their own. The last block for each name wins. A code fence just inside the markers
 * is dropped. A run whose final message lacks either file is recorded as captured with that file missing.
 *
 * CONTAMINATION (proposal §2, "checked on every run rather than assumed"): `capture` voids a run whose transcript, with
 * the packet's own text removed, shows a prism3 skill call, a CLAUDE.md, a read of `skills/prism3-*` or a fetch of the
 * repository. A void run is recorded, reported, and never scored.
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

/** Literals, fixed before any run. Each names what it found, so a void says why. */
const CONTAMINATION: [RegExp, string][] = [
  [/"skill"\s*:\s*"prism3-|Skill\(\s*prism3-|\/prism3-(?:build-ui|theme|rebind|build-component)\b/i, 'a prism3- skill was loaded'],
  [/CLAUDE\.md/, 'a CLAUDE.md appears'],
  [/skills\/prism3-/, 'a read of skills/prism3-*'],
  [/github\.com\/adamforrester\/prism3|raw\.githubusercontent\.com\/adamforrester\/prism3|api\.github\.com\/repos\/adamforrester\/prism3/i, 'a fetch of the repository'],
];
export const probeContamination = (transcript: string, packet: string): string[] => {
  const rest = transcript.split(packet).join(' ');
  // A JSON transcript escapes the packet's newlines and quotes, so remove that spelling of it too.
  const restJson = rest.split(JSON.stringify(packet).slice(1, -1)).join(' ');
  return CONTAMINATION.filter(([re]) => re.test(restJson)).map(([, why]) => why);
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
