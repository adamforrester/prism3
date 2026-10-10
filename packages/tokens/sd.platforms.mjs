/**
 * THE PLATFORM BUILD (#2424) — the same stranger's Style Dictionary as `sd.consumer.mjs`, asked for
 * every platform a product team ships to rather than CSS alone: CSS, SCSS, JavaScript (ES module plus
 * its `.d.ts`), iOS (Swift) and Android (resource XML and Compose).
 *
 * The rule is the consumer config's rule, unchanged, and `check-platforms.mjs` asserts it against this
 * file's source the same way:
 *
 *   NO CUSTOM CODE. No preprocessors, no custom transforms, no custom formats. Built-in transform
 *   groups and built-in formats only. A gap this build exposes is FILED against the emitter, never
 *   patched here.
 *
 * Every option below is one a consumer would type into their own config: `outputReferences` (CSS and
 * SCSS keep the semantic→primitive aliases, the same choice the consumer build makes), a class or
 * package name the Swift and Compose formats ask for, and `log` to quiet the collision notice that a
 * base + overlay merge is supposed to raise and the per-file success lines (errors still throw).
 *
 * `platformsConfig` is plain data with no Style Dictionary import, so `tools/sd-version-matrix/`
 * can hand the identical object to Style Dictionary 3, 4 and 5 and measure what each version does
 * with it. Only `buildPlatforms`, the gate's entry point, binds it to the installed version.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const OUT_ROOT = resolve(here, '../engine/out');
export const BUILD_ROOT = resolve(here, 'build/platforms');

/** The files each platform writes, by platform. The gate and the version matrix both read this list
 *  to know what to look for, so a platform added here is measured everywhere at once. */
export const PLATFORM_FILES = {
  css: ['tokens.css'],
  scss: ['_tokens.scss'],
  js: ['tokens.js', 'tokens.d.ts'],
  ios: ['Tokens.swift'],
  android: ['tokens.xml'],
  compose: ['Tokens.kt'],
};

/** The token sources for one build of one brand. `canonical` is the extension-based tree; `base` is
 *  the conforming projection; any other name is a mode, built as base + that mode's overlay (#609). */
export const sourcesFor = (brand, set) =>
  set === 'canonical' ? [resolve(OUT_ROOT, `${brand}.tokens.json`)]
    : set === 'base' ? [resolve(OUT_ROOT, `${brand}.base.tokens.json`)]
      : [resolve(OUT_ROOT, `${brand}.base.tokens.json`), resolve(OUT_ROOT, `${brand}.${set}.overlay.tokens.json`)];

export const platformsConfig = (source, buildPath) => ({
  source,
  usesDtcg: true,
  log: { warnings: 'disabled', verbosity: 'silent' },
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: `${buildPath}/css/`,
      files: [{ destination: 'tokens.css', format: 'css/variables', options: { outputReferences: true } }],
    },
    scss: {
      transformGroup: 'scss',
      buildPath: `${buildPath}/scss/`,
      files: [{ destination: '_tokens.scss', format: 'scss/variables', options: { outputReferences: true } }],
    },
    js: {
      transformGroup: 'js',
      buildPath: `${buildPath}/js/`,
      files: [
        { destination: 'tokens.js', format: 'javascript/es6' },
        { destination: 'tokens.d.ts', format: 'typescript/es6-declarations' },
      ],
    },
    ios: {
      transformGroup: 'ios-swift',
      buildPath: `${buildPath}/ios/`,
      files: [{ destination: 'Tokens.swift', format: 'ios-swift/class.swift', options: { className: 'Tokens' } }],
    },
    android: {
      transformGroup: 'android',
      buildPath: `${buildPath}/android/`,
      files: [{ destination: 'tokens.xml', format: 'android/resources' }],
    },
    compose: {
      transformGroup: 'compose',
      buildPath: `${buildPath}/compose/`,
      files: [{ destination: 'Tokens.kt', format: 'compose/object', options: { className: 'Tokens', packageName: 'tokens' } }],
    },
  },
});

/** Build one brand's set through the INSTALLED Style Dictionary. Returns the directory it wrote. */
export const buildPlatforms = async (brand, set) => {
  const { default: StyleDictionary } = await import('style-dictionary');
  const dir = resolve(BUILD_ROOT, brand, set);
  const sd = new StyleDictionary(platformsConfig(sourcesFor(brand, set), dir));
  await sd.buildAllPlatforms();
  return dir;
};
