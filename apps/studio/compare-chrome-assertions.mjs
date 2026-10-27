/**
 * THE CHROME SUITE'S ASSERTIONS, BEFORE AND AFTER (#2898): do two sets of runs make the same assertions?
 *
 *   node apps/studio/compare-chrome-assertions.mjs --before <record>… --after <record>…
 *
 * Each side is one or more run records: `apps/studio/chrome-record/*.json` as `test-chrome.mjs` writes them (every
 * assertion under its section), or a bare `{ "assertions": [label, …] }` from a suite older than the records. A side's
 * assertions are the multiset of every label in its records, so the shards and the merge of a sharded run, read
 * together, are one side, and the whole suite, run once, the other.
 *
 * TWO DIFFS. Many labels carry a reading of their run: a clock on the Activity bar ("01:36"), a server port, the frames
 * a glide took. Two whole runs of the same code differ there, so the exact labels cannot be the assertion's name.
 *   · NAMES: each label with every run of digits written `#`. This is the diff that must be empty, and the exit status
 *     is its verdict (1 when any name is made a different number of times).
 *   · EXACT: the labels as written, printed with both counts so a reader can see each difference is a reading.
 *
 * #2898 ran it once, to prove the sharding kept every assertion: main's suite, unchanged but for a line logging each
 * label, run whole, against the three CI shards and the merge, run from the sharded suite. `test:chrome-shards` holds
 * every CI run to the same promise by section, which needs no stored list of labels.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const side = (flag) => {
  const at = args.indexOf(flag);
  if (at < 0) return [];
  const end = args.findIndex((a, i) => i > at && a.startsWith('--'));
  return args.slice(at + 1, end < 0 ? undefined : end);
};
const before = side('--before');
const after = side('--after');
const out = side('--write')[0];
if (!before.length || !after.length) {
  console.error('usage: node compare-chrome-assertions.mjs --before <record>… --after <record>… [--write <prefix>]');
  process.exit(2);
}
const labelsOf = (files) => files.flatMap((f) => {
  const r = JSON.parse(readFileSync(f, 'utf8'));
  return r.assertions ?? r.sections.flatMap((s) => s.assertions);
});
const count = (labels) => labels.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
const a = labelsOf(before);
const b = labelsOf(after);
const ca = count(a);
const cb = count(b);
const diffOf = (x, y) => [...new Set([...x.keys(), ...y.keys()])].filter((l) => x.get(l) !== y.get(l)).sort();
const name = (l) => l.replace(/\d+/g, '#');
const na = count(a.map(name));
const nb = count(b.map(name));
const exact = diffOf(ca, cb);
const names = diffOf(na, nb);
console.log(`before: ${a.length} assertion(s), ${ca.size} distinct labels, ${na.size} distinct names, from ${before.length} record(s)`);
console.log(`after:  ${b.length} assertion(s), ${cb.size} distinct labels, ${nb.size} distinct names, from ${after.length} record(s)`);
console.log(`\nEXACT: ${exact.length} label(s) differ in count${exact.length ? ' (each should be a reading: the same name on both sides)' : ''}`);
for (const l of exact) console.log(`  ${ca.get(l) ?? 0} → ${cb.get(l) ?? 0}  ${l}`);
console.log(`\nNAMES: ${names.length} name(s) differ in count`);
for (const l of names) console.log(`  ${na.get(l) ?? 0} → ${nb.get(l) ?? 0}  ${l}`);
if (out) {
  writeFileSync(`${out}.before.txt`, `${a.map(name).sort().join('\n')}\n`);
  writeFileSync(`${out}.after.txt`, `${b.map(name).sort().join('\n')}\n`);
}
console.log(names.length ? `\n${names.length} assertion name(s) differ in count.` : '\nThe diff of names is empty: every assertion made as often on both sides.');
if (names.length) process.exit(1);
