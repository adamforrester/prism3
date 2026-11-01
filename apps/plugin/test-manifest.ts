/**
 * MANIFEST test (2026-10-04) — the plugin's name in Figma, and the id that must not move with it.
 *
 *   npx tsx apps/plugin/test-manifest.ts
 *
 * The owner decided on 2026-10-04 that the product is called "Prism3 Studio" everywhere, so the name Figma
 * shows for the plugin (`manifest.json`'s `name`) is "Prism3 Studio". The `id` stays as it was: Figma keys a
 * user's installed plugin and its stored data by it, so a rename that also moved it would read as a new plugin.
 *
 * INDEPENDENCE (docs/34): both expected values are literals written here, never read off the manifest or any
 * other file. The manifest is parsed as Figma reads it, as JSON from disk.
 *
 * #2879 (the owner's Q613 1 A, 2026-10-23): the plugin asks for one permission, `teamlibrary`, read-only, the one way to
 * read an enabled library's name for the library home (`src/file-kind.ts`). Exactly that list: a second permission is
 * a change the Community listing shows, so it is the owner's to make, not a side effect of another PR.
 *
 * BY-NAME MUTATIONS (each proven red, then restored):
 *   - `name` back to "Prism3" → "the plugin is named \"Prism3 Studio\"" fails;
 *   - `id` changed → "the plugin keeps its id" fails;
 *   - `permissions` dropped → "the plugin asks for the teamlibrary permission and no other" fails;
 *   - a fourth domain in `allowedDomains` → "the plugin allows the two Google Fonts hosts and the local desktop bridge, and
 *     no other domain" fails (#3147: the bridge's `ws://localhost:17331` is the third);
 *   - `manifest-offline.json`'s `allowedDomains` → `["*"]` → "the offline plugin allows no network" fails.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let failures = 0;
const ok = (cond: boolean, label: string): void => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
};

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(here, 'manifest.json'), 'utf8')) as { name?: unknown; id?: unknown; permissions?: unknown; networkAccess?: { allowedDomains?: unknown; devAllowedDomains?: unknown } };
const offline = JSON.parse(readFileSync(join(here, 'manifest-offline.json'), 'utf8')) as { name?: unknown; id?: unknown; networkAccess?: { allowedDomains?: unknown } };

ok(manifest.name === 'Prism3 Studio', `the plugin is named "Prism3 Studio" (manifest name: ${JSON.stringify(manifest.name)})`);
ok(manifest.id === 'prism3-theming-plugin', `the plugin keeps its id "prism3-theming-plugin" (manifest id: ${JSON.stringify(manifest.id)})`);
ok(JSON.stringify(manifest.permissions) === '["teamlibrary"]',
  `the plugin asks for the teamlibrary permission and no other (Q613 1 A; manifest permissions: ${JSON.stringify(manifest.permissions)})`);

// #3138 (the owner's network model): the dev and "Prism3 Studio" manifest lists the two Google Fonts hosts and no other
// domain; the offline overlay names the second plugin, gives it its own id, and allows no network.
// #3147 (the owner's Q3147.3 A): exactly the two Google Fonts hosts and the agent link's local desktop bridge. The bridge's
// origin moved from `devAllowedDomains` (dev imports only) to `allowedDomains`, so nothing is left under the dev list.
ok(JSON.stringify(manifest.networkAccess?.allowedDomains) === '["https://fonts.googleapis.com","https://fonts.gstatic.com","ws://localhost:17331"]',
  `the plugin allows the two Google Fonts hosts and the local desktop bridge, and no other domain (#3138, #3147; allowedDomains: ${JSON.stringify(manifest.networkAccess?.allowedDomains)})`);
ok(manifest.networkAccess?.devAllowedDomains === undefined,
  `the plugin lists no dev-only domain: the bridge ships in the network build (#3147; devAllowedDomains: ${JSON.stringify(manifest.networkAccess?.devAllowedDomains)})`);
// Figma requires a `reasoning` when `allowedDomains` lists a local server, and the reasoning is what an org admin reads.
ok(typeof (manifest.networkAccess as { reasoning?: unknown })?.reasoning === 'string' && /\blocalhost\b/.test((manifest.networkAccess as { reasoning: string }).reasoning),
  'the network reasoning names the local connection (Figma requires a reasoning for a localhost domain; #3147)');
ok(offline.name === 'Prism3 Studio Offline', `the offline plugin is named "Prism3 Studio Offline" (manifest-offline name: ${JSON.stringify(offline.name)})`);
ok(offline.id === 'prism3-theming-plugin-offline', `the offline plugin has its own id (manifest-offline id: ${JSON.stringify(offline.id)})`);
ok(JSON.stringify(offline.networkAccess?.allowedDomains) === '["none"]',
  `the offline plugin allows no network (manifest-offline allowedDomains: ${JSON.stringify(offline.networkAccess?.allowedDomains)})`);

console.log(failures ? `\n${failures} failure(s)` : '\nmanifest: all checks pass');
if (failures > 0) process.exit(1);
