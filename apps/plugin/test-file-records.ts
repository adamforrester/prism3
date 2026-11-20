/**
 * #4154: the file-level records cross between the two plugin builds.
 *
 *   npx tsx apps/plugin/test-file-records.ts
 *
 * Prism3 ships two plugins with different ids ("Prism3 Studio", `prism3-theming-plugin`; "Prism3 Studio Offline",
 * `prism3-theming-plugin-offline`). Figma keeps `setPluginData` per plugin id and `setSharedPluginData` per namespace,
 * so a record written privately by one build is not there for the other.
 *
 * INDEPENDENCE (docs/34). EXPECTED is Figma's documented storage rule, modelled here by hand: one shared map per file,
 * and one private map per plugin id. It is not `file-shim.ts` (whose root models shared data only) and not
 * `file-record.ts` (the subject). ACTUAL is what `readDocSettings` returns in one build after `writeDocSettings` ran in
 * the other. The register below is read from the source as text, so a new private read or write fails by file name.
 *
 * BY-NAME MUTATIONS: make `writeRecord` write `setPluginData` only → `#4154: the offline build reads the doc settings
 * the online build wrote` fails; drop the private fallback from `readRecord` → `#4154: a file saved before keeps its
 * doc settings` fails; set `RECORD_NS` to any other value → `#4154: the record is kept in shared data under the prism3
 * namespace` fails; put `figma.root.getPluginData(FILE_ID_KEY)` back in main.ts → the register arm names main.ts.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDocSettings, writeDocSettings, DOC_SETTINGS_KEY } from './src/doc-settings';

let pass = 0; const fails: string[] = [];
const ok = (cond: boolean, msg: string): void => { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else fails.push(msg); };

const ONLINE = 'prism3-theming-plugin';
const OFFLINE = 'prism3-theming-plugin-offline';
/** One file's root, as Figma stores plugin data on it. */
const fileRoot = () => {
  const shared = new Map<string, string>();
  const priv = new Map<string, Map<string, string>>();
  const mine = (id: string) => { if (!priv.has(id)) priv.set(id, new Map()); return priv.get(id)!; };
  return {
    shared, priv: mine,
    /** The root as plugin `id` sees it. */
    as: (id: string) => ({
      getSharedPluginData: (ns: string, k: string) => shared.get(`${ns}/${k}`) ?? '',
      setSharedPluginData: (ns: string, k: string, v: string) => { if (v === '') shared.delete(`${ns}/${k}`); else shared.set(`${ns}/${k}`, v); },
      getPluginData: (k: string) => mine(id).get(k) ?? '',
      setPluginData: (k: string, v: string) => { if (v === '') mine(id).delete(k); else mine(id).set(k, v); },
    }),
  };
};

console.log('Plugin records both builds read (#4154)\n');
{
  const file = fileRoot();
  writeDocSettings(file.as(ONLINE), { panels: false, cover: true, styleGuide: { colors: true } });
  const off = readDocSettings(file.as(OFFLINE));
  ok(off.panels === false && JSON.stringify(off.styleGuide) === '{"colors":true}',
    `#4154: the offline build reads the doc settings the online build wrote (${JSON.stringify(off)})`);
  writeDocSettings(file.as(OFFLINE), { panels: true, cover: false, styleGuide: null });
  const on = readDocSettings(file.as(ONLINE));
  ok(on.cover === false && on.panels === true, `#4154: and the online build reads the offline build's change (${JSON.stringify(on)})`);
  // The namespace is pinned here, not read from file-record.ts: a record under any other namespace is one the
  // ownership marks and the brand input (provenance.ts, persist-figma.ts) do not share.
  ok(file.shared.has(`prism3/${DOC_SETTINGS_KEY}`), `#4154: the record is kept in shared data under the prism3 namespace (keys: ${[...file.shared.keys()].join(', ')})`);
}
{
  // A file saved before #4154: the online build kept the record privately.
  const file = fileRoot();
  file.priv(ONLINE).set(DOC_SETTINGS_KEY, JSON.stringify({ panels: false, cover: false, styleGuide: null }));
  const old = readDocSettings(file.as(ONLINE));
  ok(old.panels === false && old.cover === false, `#4154: a file saved before keeps its doc settings for the build that wrote them (${JSON.stringify(old)})`);
  writeDocSettings(file.as(OFFLINE), { panels: true, cover: true, styleGuide: null });
  ok(readDocSettings(file.as(ONLINE)).panels === true, '#4154: once either build writes, the shared record wins over the old private copy');
}

// THE REGISTER: every private plugin-data read or write left in apps/plugin/src, by file, with the reason it stays.
// A file not listed fails by name, so a new record cannot go private unnoticed; a listed file with no calls left fails
// too, so the list shrinks as the follow-ups land.
const PRIVATE_DATA: Record<string, string> = {
  'file-record.ts': 'the fallback read for a file saved before #4154, and the write for a node with no shared-data methods',
  'as-built-ledger.ts': '#4154 follow-up: moves to file-record.ts after #4267, which rewrites every call here',
  'style-guide.ts': '#4154 follow-up: the table and group marks, after the open style-guide PRs land',
  'style-guide-cells.ts': '#4154 follow-up: the swatch mark, with style-guide.ts',
};
{
  const src = join(dirname(fileURLToPath(import.meta.url)), 'src');
  const found = new Map<string, number>();
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.ts$/.test(e.name)) continue;
      const code = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      const n = (code.match(/\.(get|set)PluginData\b/g) ?? []).length;
      if (n) found.set(p.slice(src.length + 1), n);
    }
  };
  walk(src);
  const unlisted = [...found.keys()].filter((f) => !(f in PRIVATE_DATA));
  ok(found.size > 0 && unlisted.length === 0,
    `#4154: every private plugin-data read or write in apps/plugin/src is in the register (${found.size} files; unlisted: ${unlisted.map((f) => `${f} (${found.get(f)})`).join(', ') || 'none'})`);
  const stale = Object.keys(PRIVATE_DATA).filter((f) => !found.has(f));
  ok(stale.length === 0, `#4154: every file in the register still has a private read or write (stale: ${stale.join(', ') || 'none'})`);
}

// The count goes last, in the form run-suites.ts reads, so the runner can hold this suite to its floor.
fails.forEach((f) => console.log(`  ❌ ${f}`));
console.log(fails.length ? `\n❌ ${fails.length} FAILED — ${pass + fails.length} assertions executed` : `\n✅ ALL PASS — ${pass} assertions executed`);
if (fails.length) process.exitCode = 1;
