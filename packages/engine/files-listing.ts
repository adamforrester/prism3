/**
 * files-listing.ts — a `--files` listing that arrives whole, and a reader that can tell when it did not (#3843).
 *
 * `lint-us-english.ts --files` and `lint-voice.ts --files` print the set each gate walks, and
 * `lint-schema-classification.ts` reads that set back through `spawnSync`. Both gates printed it with one
 * `console.log` per line and then called `process.exit(0)`. Node writes to a pipe or a socket without
 * blocking: when the kernel buffer is full, a write is queued in the process and finished later. And
 * `process.exit` does not wait for queued writes. `spawnSync` hands the child a UNIX socket, which
 * accepts a few hundred small writes before it is full; so whenever the reader fell behind, every line
 * after that point was dropped and the child still exited 0. In CI the cut fell before line 216, where the
 * schema files begin, and the classification gate reported "exited 0 and listed 0 schema file(s)". It hit
 * five engine jobs in a day (three PRs and two pushes to main) and never failed on an idle machine,
 * because only a busy CPU leaves the reader that far behind.
 *
 * Two halves, so each catches what the other could miss:
 *   · `printListing` writes the whole list as ONE write, waits until it has all been handed to the kernel,
 *     then writes `<N> line(s) listed, complete` to stderr, waits again, and only then exits.
 *   · `readListing` (the parent) takes the child's own count from stderr and compares it with the lines
 *     that actually arrived. A missing count or a short delivery is a CUT-OFF listing, named so; a
 *     non-zero exit, a signal or a spawn error is a FAILED one. Neither reads as "listed 0 files".
 * The count and the delivered lines come from different streams, so a child that goes back to exiting
 * before its writes finish loses lines from stdout while its count still claims them, and the parent says
 * so. The two do not depend on each other.
 */
import type { SpawnSyncReturns } from 'node:child_process';

/** The stderr line `printListing` writes after the list has gone out whole: `--files: 283 line(s) listed, complete`. */
export const LISTING_COMPLETE = /^--files: (\d+) line\(s\) listed, complete$/m;

const writeAll = (stream: NodeJS.WriteStream, text: string): Promise<void> =>
  new Promise((done, fail) => stream.write(text, (e) => (e ? fail(e) : done())));

/** Print `lines` on stdout, one per line, then the completion count on stderr, then exit 0. Exits 1, naming why, if
 *  either write fails (a reader that hung up has not received the listing). Never returns. */
export async function printListing(lines: readonly string[]): Promise<never> {
  try {
    await writeAll(process.stdout, lines.map((l) => `${l}\n`).join(''));
    await writeAll(process.stderr, `--files: ${lines.length} line(s) listed, complete\n`);
  } catch (e) {
    process.stderr.write(`--files: the listing could not be written whole (${(e as Error).message})\n`);
    process.exit(1);
  }
  process.exit(0);
}

export type Listing = { lines: string[] } | { fault: string };

/** Read a `--files` child's result. `lines` only when the child exited 0 AND every line it counted arrived. */
export function readListing(r: Pick<SpawnSyncReturns<string>, 'status' | 'signal' | 'error' | 'stdout' | 'stderr'>): Listing {
  const stdout = r.stdout ?? '';
  const stderr = (r.stderr ?? '').trim();
  const tail = stderr ? ` stderr: ${stderr.slice(-300)}` : '';
  if (r.error) return { fault: `LISTING FAILED: it could not run to completion (${r.error.message}).${tail}` };
  if (r.signal) return { fault: `LISTING FAILED: it was killed by ${r.signal}.${tail}` };
  if (r.status !== 0) return { fault: `LISTING FAILED: it exited ${r.status}.${tail}` };
  const claimed = LISTING_COMPLETE.exec(stderr);
  const arrived = stdout.split('\n').length - 1; // whole lines only: a line cut mid-way has no newline
  if (!claimed) {
    return { fault: `LISTING CUT OFF: it exited 0 but never wrote its "N line(s) listed, complete" line, so the ${arrived} line(s) that arrived cannot be known to be all of them.${tail}` };
  }
  if (Number(claimed[1]) !== arrived) {
    return { fault: `LISTING CUT OFF: it listed ${claimed[1]} line(s) but ${arrived} arrived; the rest was lost before it reached this reader.` };
  }
  return { lines: stdout.split('\n').slice(0, -1) };
}
