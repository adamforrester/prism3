/**
 * The "no absolute filesystem path reaches the bundle" scan (#1117 instance 2), split out of `build.mjs` so a test
 * can drive it without running a build (#2028). `build.mjs` owns the error message and calls `findAbsolutePaths`.
 *
 * #2028: the bundles embed the chrome's fonts as base64 `data:` URIs (#1905). Base64's alphabet includes `/`, so
 * encoded font bytes can spell `/tmp/x`, `/var/x` or `/root` by chance, and a font swap would then fail the build
 * with a path message pointing at font data. A base64 payload is file contents, not a path the build machine could
 * leak, so it is blanked before the scan. Only base64 payloads are blanked: a plain-text `data:` URI (an inline SVG,
 * say) is still scanned, because a path written into one would ship readable.
 */

/** Two kinds of check, because they fail differently — see the block above `assertNoAbsolutePath` in `build.mjs`. */
export const ABSOLUTE_SHAPES = [
  { label: 'a macOS/Linux home directory', re: /\/(?:Users|home)\/[A-Za-z0-9._-]+\//g },
  { label: 'a system temp or private path', re: /\/(?:private|tmp|var)\/[A-Za-z0-9._-]+/g },
];

/** A base64 `data:` URI: media type, optional parameters, `;base64,`, then the payload up to its padding. */
const BASE64_DATA_URI = /data:[A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+(?:;[A-Za-z0-9.+=-]+)*;base64,[A-Za-z0-9+/]*={0,2}/g;

/** The text with every base64 `data:` payload replaced by a space, so nothing either side can join across it. */
export const withoutBase64Payloads = (text) => text.replace(BASE64_DATA_URI, ' ');

/**
 * Every absolute-path occurrence in `text`, as `label: match` strings. `needles` are `[label, exact string]` pairs
 * (the building tree, the builder's home directory); an empty needle is skipped.
 */
export const findAbsolutePaths = (text, needles) => {
  const scanned = withoutBase64Payloads(text);
  const found = [];
  for (const [label, needle] of needles) {
    if (needle && scanned.includes(needle)) found.push(`${label}: ${needle}`);
  }
  for (const { label, re } of ABSOLUTE_SHAPES) {
    for (const m of scanned.matchAll(re)) found.push(`${label}: ${m[0]}`);
  }
  return found;
};
