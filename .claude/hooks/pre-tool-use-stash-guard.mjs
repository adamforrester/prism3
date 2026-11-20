#!/usr/bin/env node
//
// .claude/hooks/pre-tool-use-stash-guard.mjs — NO BARE `git stash pop`, `apply` OR `drop` (#923).
//
// THE HAZARD. The stash stack (`refs/stash`) is one per repository, so every worktree and session on the
// machine shares it. A `git stash pop`, `git stash apply` or `git stash drop` that names no entry takes
// `stash@{0}`, whoever pushed it. On 2026-08-22 a session ran `git stash -u` on a clean tree, which saved
// nothing, and the bare `pop` that followed took another session's entry (#923). Commit-first makes this
// worse, not better: a clean tree is exactly when your own stash saves nothing and the pop reaches past
// it. Since #4064 the restore auto-stash hook (#1050) also pushes an entry for every restore of a dirty
// path, so `stash@{0}` is less likely than ever to be yours.
//
// THE SHAPE (owner decision on #923, 2026-11-18, A): deny a `pop`, `apply` or `drop` that names no
// explicit entry, and print the stack in the reason, so the next command names the entry it means. The
// predicate is checkable, not a judgment: the command names an entry or it does not. It does not try to
// decide whose `stash@{0}` is; it makes the operator look. The cost of a false denial is one retyped
// command with `stash@{n}` added.
//
//   • EXPLICIT means `stash@{n}` (or `refs/stash@{n}`), a bare index `n` (git reads it as `stash@{n}`),
//     or a commit SHA of 7 to 40 hex digits (the form the auto-stash hook reports). `stash` and
//     `refs/stash` are NOT explicit: git reads them as `stash@{0}`, the very entry this guard is about.
//     Anything else (a reflog date, a branch name) is denied too: it is rare, and the retype is cheap.
//   • The empty stack is not special-cased. The owner's decision names the command, not the stack, and a
//     bare pop on an empty stack does nothing either way.
//   • NOT GUARDED, stated rather than implied: `git stash clear` and `git stash branch <name>` (which pops
//     `stash@{0}`; #4290), a command built at runtime (`$(...)`, `eval`, `xargs`, a script file), and git aliases.
//
// WHAT IT SEES. The command is tokenized like a shell would (quotes, escapes, `&&` `||` `;` `|` `&`,
// newlines, subshell parens), each simple command is read separately, `cd <dir>` and `git -C <dir>` are
// followed (for the stack it prints), and a `sh -c '<script>'` / `bash -c` / `bash -lc` is read recursively.
// Wrappers (`time`, `env`, `nohup`, …) and `VAR=value` prefixes are skipped, and git is matched by its bare
// name or by a path to it (`/usr/bin/git`). The
// tokenizer is a copy of the restore auto-stash hook's, not an import: each hook stays one file its own
// battery can mutate without moving the other.
//
// ITS TEST is `tools/stash-guard/mutations.sh`: every bare form against a real repo with a real stack in
// $TMPDIR, the explicit forms and look-alikes that must pass silently, and mutants of this file, each of
// which must fail one arm BY NAME. A guard whose pattern stops matching is invisible (docs/34 shape 9).
//
// Input: the PreToolUse JSON on stdin (`tool_input.command`, `cwd`). Output: nothing, or one JSON object.
// It never blocks a command it cannot parse: any error lets the command through.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GUARDED = new Set(['pop', 'apply', 'drop']);

// ── Tokenize: shell words and control operators. ────────────────────────────────────────────────────
// Returns an array of { w: string } words and { op: string } operators. Good enough to find simple
// commands; it never needs to execute anything.
function tokenize(src) {
  const out = [];
  let i = 0;
  let word = null; // null = no word in progress; '' = an empty quoted word in progress
  const flush = () => { if (word !== null) { out.push({ w: word }); word = null; } };
  while (i < src.length) {
    const c = src[i];
    if (c === "'") {
      const j = src.indexOf("'", i + 1);
      const end = j === -1 ? src.length : j;
      word = (word ?? '') + src.slice(i + 1, end);
      i = end + 1;
    } else if (c === '"') {
      word = word ?? '';
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length && '"\\$`\n'.includes(src[i + 1])) { word += src[i + 1]; i += 2; }
        else { word += src[i]; i++; }
      }
      i++;
    } else if (c === '\\') {
      if (src[i + 1] === '\n') { i += 2; continue; }
      word = (word ?? '') + (src[i + 1] ?? '');
      i += 2;
    } else if (c === '#' && word === null) {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === ' ' || c === '\t') {
      flush(); i++;
    } else if (c === '\n' || c === ';' || c === '(' || c === ')') {
      flush(); out.push({ op: c === '\n' ? ';' : c }); i++;
    } else if (c === '&' || c === '|') {
      flush();
      const two = src.slice(i, i + 2);
      if (two === '&&' || two === '||') { out.push({ op: two }); i += 2; }
      else if (c === '&' && src[i + 1] === '>') { i += 2; } // &> redirection: not a separator
      else { out.push({ op: c }); i++; }
    } else {
      word = (word ?? '') + c; i++;
    }
  }
  flush();
  return out;
}

/** Split a token list into simple commands (arrays of words), dropping redirections' targets. */
function simpleCommands(tokens) {
  const cmds = [];
  let cur = [];
  for (const t of tokens) {
    if (t.op) { if (cur.length) cmds.push(cur); cur = []; continue; }
    cur.push(t.w);
  }
  if (cur.length) cmds.push(cur);
  // Redirections (`2>/dev/null`, `> out`, `<in`) are not arguments.
  return cmds.map((c) => {
    const words = [];
    for (let k = 0; k < c.length; k++) {
      const w = c[k];
      if (/^\d*(>>?|<)&?$/.test(w)) { k++; continue; } // operator alone: skip it and its target
      if (/^\d*(>>?|<)&?./.test(w)) continue;          // operator glued to its target
      words.push(w);
    }
    return words;
  }).filter((c) => c.length);
}

// ── Recognize a bare pop, apply or drop. Returns { dir, sub } or null. ─────────────────────────────
const WRAPPERS = new Set(['command', 'builtin', 'exec', 'nohup', 'time', 'env', 'sudo']);
const EXPLICIT = /^(?:(?:refs\/)?stash@\{\d+\}|\d+|[0-9a-f]{7,40})$/i;
// `git` by its bare name or by a path to it (`/usr/bin/git`).
const gitWord = (w) => typeof w === 'string' && w.replace(/^.*\//, '') === 'git';
// A shell's script flag: `-c` alone or combined with others (`-lc`, `-ec`). `--rcfile` and the like are not it.
const SHELL_C = /^-[A-Za-z]*c[A-Za-z]*$/;

function bareStashOf(words, dir) {
  let k = 0;
  while (k < words.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[k]) || WRAPPERS.has(words[k]))) k++;
  if (!gitWord(words[k])) return null;
  k++;
  // git's global options, before the subcommand.
  while (k < words.length && words[k].startsWith('-')) {
    const o = words[k];
    if (o === '-C') { dir = resolve(dir, words[k + 1] ?? '.'); k += 2; }
    else if (o === '-c' || o === '--git-dir' || o === '--work-tree' || o === '--namespace') k += 2;
    else k++;
  }
  if (words[k] !== 'stash') return null;
  const sub = words[k + 1];
  if (!GUARDED.has(sub)) return null;
  const refs = words.slice(k + 2).filter((a) => !a.startsWith('-'));
  if (refs.length && refs.every((r) => EXPLICIT.test(r))) return null;
  return { dir, sub };
}

/** Every bare pop/apply/drop a command line would run, following `cd` and reading `sh -c` scripts. */
function findBare(command, cwd, depth = 0) {
  const found = [];
  let dir = cwd;
  for (const words of simpleCommands(tokenize(command))) {
    if (words[0] === 'cd') { dir = resolve(dir, words[1] ?? process.env.HOME ?? '/'); continue; }
    if (depth < 3 && /^(?:\/\S*\/)?(?:ba|z|da)?sh$/.test(words[0])) {
      const c = words.findIndex((w, i) => i > 0 && SHELL_C.test(w));
      if (c !== -1 && words[c + 1] !== undefined) found.push(...findBare(words[c + 1], dir, depth + 1));
      continue;
    }
    const r = bareStashOf(words, dir);
    if (r) found.push(r);
  }
  return found;
}

// ── Act. ────────────────────────────────────────────────────────────────────────────────────────────
/** The stack as `git stash list` prints it, at most 10 lines; a note when it cannot be read. */
function stackOf(dir) {
  try {
    const out = execFileSync('git', ['-C', dir, 'stash', 'list', '--max-count=10'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    return out || '(the stack is empty)';
  } catch { return '(the stack could not be read here)'; }
}

function main() {
  let input;
  try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || !/stash/.test(command)) return;
  const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();

  const [hit] = findBare(command, cwd);
  if (!hit) return;
  const reason =
    `\`git stash ${hit.sub}\` with no explicit entry takes stash@{0}, and the stash stack is shared by every worktree and ` +
    `session on this machine, so the top entry may not be yours (#923). It was not run. Name the entry: ` +
    `git stash ${hit.sub} 'stash@{n}'. To read one file without consuming the entry: git show 'stash@{n}:<path>'.\n\n` +
    `The stack now:\n${stackOf(hit.dir)}`;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }) + '\n');
}

try { main(); } catch (e) { process.stderr.write(`stash-guard hook (#923): ${e?.message ?? e}\n`); }
