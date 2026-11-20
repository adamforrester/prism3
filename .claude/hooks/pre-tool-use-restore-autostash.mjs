#!/usr/bin/env node
//
// .claude/hooks/pre-tool-use-restore-autostash.mjs — SAVE UNCOMMITTED WORK BEFORE A RESTORE (#1050).
//
// THE HAZARD. A restore — `git checkout -- <path>`, `git checkout <ref> -- <path>`, `git restore <path>`
// — overwrites the working copy of every path it names, and git keeps no copy of what it overwrote.
// A mutation battery's cleanup is exactly that command, so an uncommitted edit in the restored path is
// destroyed by the CLEANUP, not by the mutation. #1048 lost work this way once and was saved by which
// file the cleanup happened to target once; the same lane lost work a third time after the rule —
// "commit before every mutation" — was stated in the second paragraph of its own brief (#1050's
// comments). A rule that cannot be made more prominent and still fails is a precondition, not prose.
//
// THE SHAPE (owner decision on #1050, 2026-11-18, A): never deny, never ask. When a Bash command will
// restore a path that carries uncommitted work, save ALL of the tree's uncommitted tracked work to a
// NAMED stash entry, report the entry, and let the command run unchanged.
//
//   • `git stash create` + `git stash store -m <name>`, never `git stash push`. `create` builds the
//     stash commit WITHOUT touching the index or the working tree, so the restore that follows does
//     exactly what it would have done with no hook — the same bytes land in the same files. `push`
//     would reset the paths to HEAD first, which changes the result of a restore-from-index
//     (`git checkout -- p` with staged work restores the STAGED version; after a push it would
//     restore HEAD's). A guard that changes what the guarded command does is a second hazard.
//   • NAMED, never anonymous: the stash stack is shared by every worktree and session on the machine,
//     and a bare `git stash pop` took another session's entry (#923). The report gives the entry's
//     commit SHA, which never moves, rather than leaning on `stash@{n}`, which shifts as others push.
//   • FALSE-DENIAL COST: zero — the hook never refuses a restore. Its cost is one stash entry per
//     restore of a dirty path, including a deliberate discard. Entries accumulate; drop them by explicit
//     index (`git stash drop stash@{n}`). #923's guard (`pre-tool-use-stash-guard.mjs`) allows that form
//     and denies a bare pop, apply or drop, once `.claude/settings.json` wires it.
//   • DURING A MERGE CONFLICT (#4195) `git stash create` cannot run: it refuses an index with unmerged
//     entries ("Cannot save the current index state"). Taking one side (`git checkout --ours/--theirs`)
//     is how a conflict is resolved, so a deny there blocks the resolution itself. Instead the entry is
//     built from a TEMPORARY index (`GIT_INDEX_FILE`): HEAD's tree plus the working copy of every tracked
//     path and every path the merge staged. It has the stash shape `git stash store` requires (parents
//     HEAD and an index commit), the index commit is HEAD's tree because an unmerged index has no single
//     state to record, and the real index and working tree are never touched, so the restore still does
//     what it would have done. A hand-edited conflicted file is saved with its markers, as it stands.
//   • FAIL CLOSED ON ONE CASE ONLY: the restore names dirty paths AND the stash could not be written.
//     Then the work is known to be at risk and known to be unsaved, so the command is denied with the
//     reason. Anything else that goes wrong (not a repo, unparseable input) lets the command through:
//     the hook never blocks a command it has no evidence about.
//
// WHAT IT SEES. The command is tokenized like a shell would (quotes, escapes, `&&` `||` `;` `|` `&`,
// newlines, subshell parens), each simple command is read separately, and `cd <dir>` and `git -C <dir>`
// are followed, so `cd sub && git checkout -- f` checks `sub/f`. A `sh -c '<script>'` / `bash -c` is
// read recursively. Dirtiness is asked of git (`git status -- <pathspec>` in the command's directory),
// so pathspecs, globs, `.` and directories mean what git says they mean.
//
// WHAT IT DOES NOT SEE, stated rather than implied: a restore built at runtime (`$(...)`, `eval`,
// `xargs`, a script file), and an UNTRACKED file a `git checkout <ref> -- <path>` overwrites because
// `<ref>` tracks it — `git stash create` holds tracked work only. Other ways to discard work
// (`git reset --hard`, `git checkout -f <branch>`, `git clean`) are not restores of a path and are out
// of this hook's scope.
//
// ITS TEST is `tools/restore-autostash/mutations.sh`: every form above against a real repo in $TMPDIR,
// the negative direction (clean paths, branch switches, look-alikes), and mutants of this file — a
// broken matcher, an anonymous stash, an always-dirty check — each of which must fail an arm BY NAME.
// A hook whose pattern stops matching is invisible (docs/34 shape 9), so the battery's job is to prove
// it still would fire, not that it once did.
//
// Input: the PreToolUse JSON on stdin (`tool_input.command`, `cwd`). Output: nothing, or one JSON object.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const STASH_PREFIX = 'auto-before-restore-';

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

// ── Recognize a restore and return { dir, pathspecs } or null. ──────────────────────────────────────
const WRAPPERS = new Set(['command', 'builtin', 'exec', 'nohup', 'time', 'env', 'sudo']);

function gitIsCommit(dir, ref) {
  try {
    execFileSync('git', ['-C', dir, 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

function restoreOf(words, dir) {
  let k = 0;
  while (k < words.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[k]) || WRAPPERS.has(words[k]))) k++;
  if (words[k] !== 'git') return null;
  k++;
  // git's global options, before the subcommand.
  while (k < words.length && words[k].startsWith('-')) {
    const o = words[k];
    if (o === '-C') { dir = resolve(dir, words[k + 1] ?? '.'); k += 2; }
    else if (o === '-c' || o === '--git-dir' || o === '--work-tree' || o === '--namespace') k += 2;
    else k++;
  }
  const sub = words[k];
  const args = words.slice(k + 1);
  const dd = args.indexOf('--');
  const before = dd === -1 ? args : args.slice(0, dd);
  const after = dd === -1 ? [] : args.slice(dd + 1);

  if (sub === 'checkout') {
    const VALUED = new Set(['-b', '-B', '--orphan', '--conflict', '--pathspec-from-file']);
    const positional = [];
    let creates = false;
    let fromFile = false;
    for (let j = 0; j < before.length; j++) {
      const a = before[j];
      if (a === '-b' || a === '-B' || a === '--orphan') creates = true;
      if (a.startsWith('--pathspec-from-file')) fromFile = true;
      if (VALUED.has(a)) { j++; continue; }
      if (a.startsWith('-')) continue;
      positional.push(a);
    }
    if (dd !== -1) return after.length ? { dir, pathspecs: after } : (fromFile ? { dir, pathspecs: ['.'] } : null);
    if (fromFile) return { dir, pathspecs: ['.'] };
    if (creates || positional.length === 0) return null;
    // No `--`: git reads the first word as a commit when it names one, and the rest as paths.
    const paths = gitIsCommit(dir, positional[0]) ? positional.slice(1) : positional;
    return paths.length ? { dir, pathspecs: paths } : null; // `git checkout <branch>` is a switch, not a restore
  }

  if (sub === 'restore') {
    const VALUED = new Set(['-s', '--source', '--pathspec-from-file', '-U', '--unified']);
    const paths = [];
    let fromFile = false;
    for (let j = 0; j < before.length; j++) {
      const a = before[j];
      if (a.startsWith('--pathspec-from-file')) fromFile = true;
      if (VALUED.has(a)) { j++; continue; }
      if (a.startsWith('-')) continue;
      paths.push(a);
    }
    paths.push(...after);
    if (!paths.length && fromFile) paths.push('.');
    return paths.length ? { dir, pathspecs: paths } : null;
  }
  return null;
}

/** Every restore a command line would run, following `cd` and reading `sh -c` scripts. */
function findRestores(command, cwd, depth = 0) {
  const found = [];
  let dir = cwd;
  for (const words of simpleCommands(tokenize(command))) {
    if (words[0] === 'cd') { dir = resolve(dir, words[1] ?? process.env.HOME ?? '/'); continue; }
    if (depth < 3 && /^(?:\/\S*\/)?(?:ba|z|da)?sh$/.test(words[0])) {
      const c = words.indexOf('-c');
      if (c !== -1 && words[c + 1] !== undefined) found.push(...findRestores(words[c + 1], dir, depth + 1));
      continue;
    }
    const r = restoreOf(words, dir);
    if (r) found.push(r);
  }
  return found;
}

// ── Act. ────────────────────────────────────────────────────────────────────────────────────────────
function git(dir, args, env) {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...(env ? { env } : {}) });
}

/** Whether the index holds unmerged entries (a merge, rebase or cherry-pick stopped on a conflict). */
function hasUnmerged(dir) {
  try { return git(dir, ['ls-files', '-u', '-z']).length > 0; } catch { return false; }
}

/** A stash-shaped commit of the working tree's tracked work, built without the real index (#4195), for the case
 *  `git stash create` refuses: unmerged entries. Returns the commit; touches neither the index nor the tree. */
function conflictSnapshot(dir, name) {
  const top = git(dir, ['rev-parse', '--show-toplevel']).trim();
  const tmp = mkdtempSync(join(tmpdir(), 'p3-autostash-'));
  const env = { ...process.env, GIT_INDEX_FILE: join(tmp, 'index') };
  try {
    git(top, ['read-tree', 'HEAD'], env);
    git(top, ['add', '-u'], env);
    // The paths the merge staged that HEAD may not have (added on one side, or both), as they stand on disk.
    const staged = [...git(top, ['diff', '--cached', '--name-only', '-z']).split('\0'), ...git(top, ['ls-files', '-u', '-z']).split('\0').map((l) => l.split('\t')[1])]
      .filter((p) => p && existsSync(join(top, p)));
    // `-f`: each path is already in the real index (staged or unmerged), so an ignore rule that matches it
    // (a path force-added upstream) must not refuse the save and turn it into a deny (#4357 review).
    if (staged.length) git(top, ['--literal-pathspecs', 'add', '-f', '--', ...new Set(staged)], env);
    const tree = git(top, ['write-tree'], env).trim();
    const index = git(top, ['commit-tree', 'HEAD^{tree}', '-p', 'HEAD', '-m', `index on ${name}: unmerged, so not recorded`]).trim();
    return git(top, ['commit-tree', tree, '-p', 'HEAD', '-p', index, '-m', name]).trim();
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/** The tracked paths with uncommitted work that this restore names ([] when clean or not a repo). */
function dirtyPaths(r) {
  try {
    const out = git(r.dir, ['status', '--porcelain=v1', '-z', '--untracked-files=no', '--', ...r.pathspecs]);
    return out.split('\0').filter(Boolean).map((l) => l.slice(3));
  } catch { return []; }
}

function emit(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }

function main() {
  let input;
  try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || !/checkout|restore/.test(command)) return;
  const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();

  let hit = null;
  for (const r of findRestores(command, cwd)) {
    const dirty = dirtyPaths(r);
    if (dirty.length) { hit = { ...r, dirty }; break; }
  }
  if (!hit) return;

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const name = `${STASH_PREFIX}${stamp}`;
  const shown = hit.dirty.slice(0, 5).join(', ') + (hit.dirty.length > 5 ? `, +${hit.dirty.length - 5} more` : '');
  let sha;
  const conflicted = hasUnmerged(hit.dir);
  try {
    if (conflicted) sha = conflictSnapshot(hit.dir, name);
    else { sha = git(hit.dir, ['stash', 'create', name]).trim(); }
    if (!sha) throw new Error('git stash create wrote no commit');
    git(hit.dir, ['stash', 'store', '-m', `${name} -- ${shown}`, sha]);
  } catch (e) {
    const why = String(e?.stderr || e?.message || e).trim();
    emit({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `This command restores paths with uncommitted work (${shown}), and saving that work to a named stash entry failed, ` +
          `so it was not run (#1050). Commit the work, or save it yourself, then run the restore again.\n\n${why}`,
      },
    });
    return;
  }
  const msg =
    `Saved uncommitted work before a restore (#1050): stash entry "${name}", commit ${sha}, holding ${shown}. ` +
    (conflicted ? `The index has unmerged paths, which a stash cannot hold, so the entry holds each path's working copy as it stood (conflict markers included) and not the index (#4195). ` : '') +
    `The restore runs unchanged. To get a file back: git show ${sha}:<path-from-repo-root> > <path>. ` +
    `To list entries: git stash list. Drop this one by its explicit index once it is not needed (never a bare pop or drop, #923).`;
  emit({ systemMessage: msg, hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: msg } });
}

try { main(); } catch (e) { process.stderr.write(`restore-autostash hook (#1050): ${e?.message ?? e}\n`); process.exit(1); }
