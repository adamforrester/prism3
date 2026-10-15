/**
 * Refresh `schema/kb-briefs.json`, the knowledge base's component-brief catalogue as `test.ts` reads it (#2488).
 *
 *   npx tsx packages/engine/kb-briefs-refresh.ts <path to a knowledge-base checkout>
 *
 * The #1700 arm in `test.ts` holds each def's header to the knowledge base: a def that cites a brief takes the
 * brief's category, and a def that says "No KB brief" must be telling the truth. CI cannot read the knowledge
 * base, so the test reads this committed snapshot of it: every `components/<name>.md` whose front matter says
 * `type: component-brief`, with its `category` (lowercased, the def schema's spelling) and its `aliases`.
 *
 * Run it when the knowledge base adds, renames or recategorizes a brief, and commit the result; the diff is
 * the review. It writes only what it read: a brief with no category fails the run rather than being skipped,
 * since a dropped row would turn a cited brief into "not in the catalogue" and a skipped one would let a
 * "No KB brief" claim stand. The snapshot records the commit it was read at.
 *
 * Not a gate and not in `regen.ts`: it reads a repository outside this one, which neither CI nor regen has.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const KB_BRIEFS_PATH = resolve(HERE, 'schema', 'kb-briefs.json');

export interface KbBriefs {
  source: { repo: string; commit: string; read: string };
  briefs: Record<string, { category: string; aliases: string[] }>;
}

const die = (msg: string): never => { console.error(`❌ ${msg}`); process.exit(1); };

/** The front matter's flat `key: value` lines. Enough for `type`, `category` and a `[a, b]` alias list. */
const frontMatter = (src: string): Record<string, string> => {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(src.replace(/\r\n/g, '\n'));
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([a-z][a-z0-9_-]*):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return out;
};
const list = (v: string | undefined): string[] =>
  !v ? [] : v.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);

if (process.argv[1] && /kb-briefs-refresh\.ts$/.test(process.argv[1])) {
  const kb = process.argv[2];
  if (!kb) die('usage: npx tsx packages/engine/kb-briefs-refresh.ts <path to a knowledge-base checkout>');
  const dir = join(resolve(kb), 'components');
  let files: string[] = [];
  try { files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort(); } catch { die(`no components/ directory under ${resolve(kb)}`); }
  const briefs: KbBriefs['briefs'] = {};
  for (const f of files) {
    const fm = frontMatter(readFileSync(join(dir, f), 'utf8'));
    if (fm.type !== 'component-brief') continue;
    if (!fm.category) die(`components/${f} is a component brief with no category`);
    briefs[f] = { category: fm.category.toLowerCase(), aliases: list(fm.aliases) };
  }
  if (Object.keys(briefs).length < 10) die(`found ${Object.keys(briefs).length} component brief(s) under ${dir} — is that a knowledge-base checkout?`);
  const head = spawnSync('git', ['-C', resolve(kb), 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (head.status !== 0) die(`${resolve(kb)} is not a git checkout, so the snapshot could not record its commit`);
  const snapshot: KbBriefs = {
    source: { repo: 'adamforrester/knowledge-base', commit: head.stdout.trim(), read: new Date().toISOString().slice(0, 10) },
    briefs,
  };
  writeFileSync(KB_BRIEFS_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`✓ wrote ${Object.keys(briefs).length} component briefs to packages/engine/schema/kb-briefs.json (knowledge-base ${snapshot.source.commit.slice(0, 8)})`);
}
