/**
 * THE ORACLE (#3440): the files the adherence scorer reads, read at a PINNED commit and checked against a recorded sha256.
 *
 * INDEPENDENCE (`docs/34`): the scorer judges an agent that may have been handed `skills/prism3-build-ui/SKILL.md`. So
 * every expectation here comes from the generated tree and component docs under `packages/engine/out/`, and the engine's
 * own `contrast()`, never from the skill text under test. A scorer that read the skill would agree with whatever the skill
 * says by construction, and C1 would score itself. `ORACLE_PATHS` is the whole list of files the scorer may open, and
 * `readPinned` records each read so the self-test can prove no read reached `skills/` (`independence/reads`).
 *
 * PINNED (Q3440 proposal §1): oracle files are read with `git show <pin.commit>:<path>`, never from the working tree, so a
 * later regen can't move a score. The outside reference's control arm drifted 65 → 69 as its catalog widened. Each read
 * is checked against `pin.json`'s sha256; a path that is not in the pin, or whose bytes moved, throws by name.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '../..');
export const PIN_FILE = resolve(HERE, 'pin.json');

/** The house brand's namespace root in the tree. */
export const BRAND_ROOT = 'pds3';
/** R1's token oracle: every name in the generated tree. */
export const TOKEN_TREE = 'packages/engine/out/prism3.tokens.json';
/** R4's values: the base (light) tree and one overlay per extra mode, the set a stock DTCG reader builds from. */
export const TOKEN_BASE = 'packages/engine/out/prism3.base.tokens.json';
export const TOKEN_OVERLAYS: Record<string, string> = {
  dark: 'packages/engine/out/prism3.dark.overlay.tokens.json',
  'hc-light': 'packages/engine/out/prism3.hc-light.overlay.tokens.json',
  'hc-dark': 'packages/engine/out/prism3.hc-dark.overlay.tokens.json',
};
/** R1's component oracle: ids, props, variants and enum values. */
export const COMPONENTS = 'packages/engine/out/components/components.ai.json';

/** Every file the scorer may open. Nothing under `skills/`: that is the subject, not the oracle. */
export const ORACLE_PATHS = [TOKEN_TREE, TOKEN_BASE, ...Object.values(TOKEN_OVERLAYS), COMPONENTS];

export type Pin = { commit: string; oracle: Record<string, string>; packet: Record<string, string> };
export const sha256 = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');
export const loadPin = (): Pin => JSON.parse(readFileSync(PIN_FILE, 'utf8'));

const gitShow = (commit: string, path: string): string =>
  execFileSync('git', ['show', `${commit}:${path}`], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const reads: string[] = [];
/** Every path `readPinned` has opened in this process, in order (the self-test's independence probe). */
export const oracleReads = (): string[] => [...reads];

/** Read one pinned file. `kind` picks the pin's list: the scorer reads `oracle` only; the packet builder reads `packet`. */
export const readPinned = (path: string, kind: 'oracle' | 'packet' = 'oracle', pin: Pin = loadPin()): string => {
  reads.push(path);
  const want = pin[kind][path];
  if (!want) throw new Error(`${path} is not a pinned ${kind} file (pin.json at ${pin.commit.slice(0, 8)})`);
  const text = gitShow(pin.commit, path);
  const got = sha256(text);
  if (got !== want) throw new Error(`${path} at ${pin.commit.slice(0, 8)} has sha256 ${got.slice(0, 12)}, not the pinned ${want.slice(0, 12)}`);
  return text;
};

/** The packet's inputs: the oracle slice it shows the agent, plus the skill C1 adds. Read by `packets.ts` only. */
export const SKILL = 'skills/prism3-build-ui/SKILL.md';
export const PACKET_PATHS = [TOKEN_TREE, COMPONENTS, SKILL];

/** `orchestrate.ts pin <commit>`: record the commit and each file's sha256 at it. */
export const writePin = (commit: string): Pin => {
  const full = execFileSync('git', ['rev-parse', `${commit}^{commit}`], { cwd: REPO, encoding: 'utf8' }).trim();
  const rec = (paths: string[]) => Object.fromEntries(paths.map((p) => [p, sha256(gitShow(full, p))]));
  const pin: Pin = { commit: full, oracle: rec(ORACLE_PATHS), packet: rec(PACKET_PATHS) };
  writeFileSync(PIN_FILE, JSON.stringify(pin, null, 2) + '\n');
  return pin;
};
