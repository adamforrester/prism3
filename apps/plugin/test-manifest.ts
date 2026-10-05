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
 * BY-NAME MUTATIONS (each proven red, then restored):
 *   - `name` back to "Prism3" → "the plugin is named \"Prism3 Studio\"" fails;
 *   - `id` changed → "the plugin keeps its id" fails.
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
const manifest = JSON.parse(readFileSync(join(here, 'manifest.json'), 'utf8')) as { name?: unknown; id?: unknown };

ok(manifest.name === 'Prism3 Studio', `the plugin is named "Prism3 Studio" (manifest name: ${JSON.stringify(manifest.name)})`);
ok(manifest.id === 'prism3-theming-plugin', `the plugin keeps its id "prism3-theming-plugin" (manifest id: ${JSON.stringify(manifest.id)})`);

console.log(failures ? `\n${failures} failure(s)` : '\nmanifest: all checks pass');
if (failures > 0) process.exit(1);
