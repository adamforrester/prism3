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
 * defaults) writes under `:root, [data-theme="light"]`; each mode writes under `[data-theme="<mode>"]`. Names keep stock Style
 * Dictionary's root prefix, `--pds3-…` (Q98 A): no `prefix` option, no rename.
 *
 * A third source rides in every run: `prism3.css-only.json`, the custom-typed leaves whose value is already CSS
 * (each spring's `linear()` curve, #3510). DTCG has no type for them, so the projection leaves them out (#642);
 * this build is the one reader that can use them, and it does so with no transform.
 *
 *   dist/prism3/<mode>.css   one file per mode, straight out of Style Dictionary
 *   dist/prism3.css          those files joined in order (`:root` first), so one import carries every mode
 *
 * THE SYSTEM-PREFERENCE BLOCK (#4140, owner decision A). `dark.css` carries a second rule: the dark values again,
 * nested by stock `css/variables` under `@media (prefers-color-scheme: dark)` on `:root:not([data-theme])`, so a page
 * that sets no `data-theme` follows the OS with no script and no flash. It is a second stock run of the same dark
 * sources, written outside `dist/` and appended to `dark.css`: the same file plumbing as the join, no format. A page
 * or subtree that sets `data-theme` keeps the theme it asked for, because the selector excludes it.
 *
 * Joining finished files is file plumbing after Style Dictionary has run, not a format: no client runs it.
 * Modes are discovered from the engine's `out/`, so a new overlay ships the day it is emitted;
 * `check-package.mjs` asserts the promised ones by name.
 */
import StyleDictionary from 'style-dictionary';
import { readdirSync, readFileSync, writeFileSync, appendFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolve(here, '../engine/out');
export const DIST = resolve(here, 'dist');
export const BRAND = 'prism3';
/**
 * The light defaults' selector. `:root` makes them the page default; `[data-theme="light"]` makes them
 * reachable on a subtree, as every other mode is, so a light section inside a `data-theme="dark"` page
 * switches back (#4135). One stock `selector` option, one rule.
 */
const BASE_SELECTOR = ':root, [data-theme="light"]';

/**
 * Modes that also apply by system preference when no `data-theme` is set (#4140): the mode, and the stock nested
 * `selector` its second rule is written under. hc-dark and hc-light stay opt-in, by attribute only.
 */
const SYSTEM_SELECTORS = new Map([['dark', ['@media (prefers-color-scheme: dark)', ':root:not([data-theme])']]]);

/** `base` first, then every overlay the engine emits for the brand, sorted. */
export const discoverModes = () => [
  'base',
  ...readdirSync(OUT_ROOT)
    .map((f) => f.match(new RegExp(`^${BRAND}\\.([\\w-]+)\\.overlay\\.tokens\\.json$`))?.[1])
    .filter(Boolean)
    .sort(),
];

/** One stock run of a mode's sources: `css/variables` under `selector`, written to `buildPath/<mode>.css`. */
const runMode = async (mode, buildPath, selector, showFileHeader = true) => {
  const sd = new StyleDictionary({
    source: [
      resolve(OUT_ROOT, `${BRAND}.base.tokens.json`),
      ...(mode === 'base' ? [] : [resolve(OUT_ROOT, `${BRAND}.${mode}.overlay.tokens.json`)]),
      // The CSS-only source (#3510): each spring's `linear()` curve, which DTCG has no type for, so the
      // conforming projection above omits it. Stock Style Dictionary has no transform for its type and writes the
      // string as it stands. Every mode reads it, so every block defines the names; none of them varies by mode.
      resolve(OUT_ROOT, `${BRAND}.css-only.json`),
    ],
    usesDtcg: true,
    // The overlay overriding the base is the mechanism working; SD reports each override as a collision.
    log: { warnings: 'disabled', verbosity: 'silent' },
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: `${buildPath}/`,
        files: [{ destination: `${mode}.css`, format: 'css/variables', options: { outputReferences: true, selector, showFileHeader } }],
      },
    },
  });
  await sd.buildAllPlatforms();
  return resolve(buildPath, `${mode}.css`);
};

const buildMode = async (mode, systemDir) => {
  const file = await runMode(mode, resolve(DIST, BRAND), mode === 'base' ? BASE_SELECTOR : `[data-theme="${mode}"]`);
  const system = SYSTEM_SELECTORS.get(mode);
  if (system) appendFileSync(file, '\n' + readFileSync(await runMode(mode, systemDir, system, false), 'utf8'));
  return file;
};

export const buildShip = async () => {
  rmSync(DIST, { recursive: true, force: true });
  const systemDir = mkdtempSync(join(tmpdir(), 'prism3-ship-system-'));
  const files = [];
  try {
    for (const mode of discoverModes()) files.push(await buildMode(mode, systemDir));
  } finally {
    rmSync(systemDir, { recursive: true, force: true });
  }
  writeFileSync(resolve(DIST, `${BRAND}.css`), files.map((f) => readFileSync(f, 'utf8')).join('\n'));
  return resolve(DIST, `${BRAND}.css`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.error(`built ${await buildShip()}`);
}
