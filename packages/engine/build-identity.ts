/**
 * THE BUILD IDENTITY (#3698 R1, owner decision 2026-11-12): the engine version plus the number of change notes
 * still pending, so output from two states between folds is told apart.
 *
 * WHY. `ENGINE_VERSION` moves only at a fold (#1807). Between folds every merged change still stamps the same
 * version, so two outputs with different behavior read as one build. The review behind #3698 counted 303 pending
 * notes under one version. `<version>+pending.<n>` keeps the version, which still answers "which release", and adds
 * how far past it the code is. It is semver build metadata, so a reader that compares versions ignores it.
 *
 * WHERE IT IS STAMPED. In live output only: the MCP server's `serverInfo.version`, and the token tree and component-defs
 * export that the MCP and the CLI write for a brand. NOT the committed corpus `regen` writes. Each PR that adds a change
 * note would then rewrite every committed tree's stamp. Two such PRs would leave `main` stale, and
 * `lint-emission-version.ts` already fails a PR that edits an `out/` stamp. A committed file is identified by its commit.
 * The PR that added this asks the owner to confirm that boundary.
 *
 * A folded state (no notes pending) is the plain version, so a release build reads as the release. When the notes
 * directory cannot be read (an engine installed without its repo), the count is unknown and the identity is the plain
 * version, never a guessed count.
 *
 * Node-only, deliberately outside the pure core: it reads the filesystem. `tree.ts` and `component-defs-export.ts` stay
 * pure, and take the identity as an argument from the shell that has it.
 */
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_VERSION } from './version';

const here = dirname(fileURLToPath(import.meta.url));
export const CHANGES_DIR = resolve(here, 'changes');

/** Pending change notes: every `*.md` in `changes/` but its README. `null` when the directory cannot be read. */
export const pendingNoteCount = (dir: string = CHANGES_DIR): number | null => {
  try { return readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md').length; }
  catch { return null; }
};

/** `<version>+pending.<n>`, or the plain version when nothing is pending or the count is unknown. */
export const buildIdentity = (pending: number | null, version: string = ENGINE_VERSION): string =>
  pending ? `${version}+pending.${pending}` : version;

/** The identity of the code running now. */
export const BUILD_IDENTITY = buildIdentity(pendingNoteCount());
