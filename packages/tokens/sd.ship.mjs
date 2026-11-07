/**
 * THE SHIPPABLE BUILD — the token CSS a client installs as `@prism3/tokens` (#3408 S1, `docs/35` §9.3).
 *
 * `packages/tokens` is still the consumability gate (`sd.consumer.mjs`); since Q99 A it ALSO builds this
 * output, and the two stay separate files so the gate's configuration stays naive and is never bent to
 * suit a deliverable (`docs/35` §2).
 *
 * The same rule binds this file, and `check-consumability.mjs` asserts it against this source too:
 *
 *   NO CUSTOM CODE. No preprocessors, no custom transforms, no custom formats. Stock Style Dictionary v5,
 *   standard config options only.
 *
 * What it builds: the house brand, `prism3`, from the conforming projection the engine emits
 * (`prism3.base.tokens.json` plus one `prism3.<mode>.overlay.tokens.json` per theme mode), one stock
 * Style Dictionary run per mode — the shape the consumer build already proves. The base run (the light
 * defaults) writes under `:root`; each mode writes under `[data-theme="<mode>"]`. Names keep stock Style
 * Dictionary's root prefix, `--pds3-…` (Q98 A): no `prefix` option, no rename.
 *
 *   dist/prism3/<mode>.css   one file per block, straight out of Style Dictionary
 *   dist/prism3.css          those files joined in order (`:root` first), so one import carries every mode
 *
 * Joining finished files is file plumbing after Style Dictionary has run, not a format: no client runs it.
 * Modes are discovered from the engine's `out/`, so a new overlay ships the day it is emitted;
 * `check-package.mjs` asserts the promised ones by name.
 */
import StyleDictionary from 'style-dictionary';
import { readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolve(here, '../engine/out');
export const DIST = resolve(here, 'dist');
export const BRAND = 'prism3';

/** `base` first, then every overlay the engine emits for the brand, sorted. */
export const discoverModes = () => [
  'base',
  ...readdirSync(OUT_ROOT)
    .map((f) => f.match(new RegExp(`^${BRAND}\\.([\\w-]+)\\.overlay\\.tokens\\.json$`))?.[1])
    .filter(Boolean)
    .sort(),
];

const buildMode = async (mode) => {
  const sd = new StyleDictionary({
    source: [
      resolve(OUT_ROOT, `${BRAND}.base.tokens.json`),
      ...(mode === 'base' ? [] : [resolve(OUT_ROOT, `${BRAND}.${mode}.overlay.tokens.json`)]),
    ],
    usesDtcg: true,
    // The overlay overriding the base is the mechanism working; SD reports each override as a collision.
    log: { warnings: 'disabled', verbosity: 'silent' },
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: `${DIST}/${BRAND}/`,
        files: [{
          destination: `${mode}.css`,
          format: 'css/variables',
          options: { outputReferences: true, selector: mode === 'base' ? ':root' : `[data-theme="${mode}"]` },
        }],
      },
    },
  });
  await sd.buildAllPlatforms();
  return resolve(DIST, BRAND, `${mode}.css`);
};

export const buildShip = async () => {
  rmSync(DIST, { recursive: true, force: true });
  const files = [];
  for (const mode of discoverModes()) files.push(await buildMode(mode));
  writeFileSync(resolve(DIST, `${BRAND}.css`), files.map((f) => readFileSync(f, 'utf8')).join('\n'));
  return resolve(DIST, `${BRAND}.css`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.error(`built ${await buildShip()}`);
}
