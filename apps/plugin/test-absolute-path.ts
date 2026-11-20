/**
 * ABSOLUTE-PATH SCAN test (#2028) — the plugin build's "no absolute filesystem path reaches the bundle" scan
 * (#1117) ignores base64 `data:` payloads, and still catches a real path everywhere else.
 *
 *   npx tsx apps/plugin/test-absolute-path.ts
 *
 * THE BUG. The bundles embed the chrome's fonts as base64 `data:` URIs (#1905). Base64's alphabet includes `/`, so a
 * font's encoding can spell `/tmp/x` or `/root` by chance, and the build then fails with a path message that points
 * at font data. Today's two faces happen not to; a font swap could.
 *
 * INDEPENDENCE (docs/34): every fixture is a literal written here, and each payload is checked to decode as base64
 * (so it is a payload a real file could produce, not a string the scan was tuned to). ACTUAL is the real
 * `findAbsolutePaths` that `build.mjs` calls.
 *
 * BY-NAME MUTATION (proven red, then restored): `findAbsolutePaths` scanning `text` instead of the blanked text (the
 * pre-#2028 scan) → "#2028 font payload spelling /tmp/x", "#2028 font payload spelling /var/x", "#2028 font
 * payload spelling the home directory" and "#2028 a real /tmp path beside a font payload is still caught, once" fail.
 * Blanking every `data:` URI, not only base64 ones → "#2028 plain-text data: URI is still scanned" fails.
 */
import { findAbsolutePaths, withoutBase64Payloads } from './absolute-path.mjs';

let executed = 0;
let failures = 0;
const ok = (cond: boolean, label: string) => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failures++; console.log(`  ✗ ${label}`); }
};

const HOME = '/root';
const TREE = '/srv/build/prism3';
const needles: [string, string][] = [['the building tree', TREE], ['the builder home directory', HOME]];
const decodes = (b64: string) => Buffer.from(b64, 'base64').toString('base64') === b64;
const font = (b64: string) => `@font-face{font-family:x;src:url(data:font/woff2;base64,${b64}) format("woff2")}`;

// Each payload is a whole number of 4-character groups, so it decodes and re-encodes to itself.
const PAYLOADS: [string, string][] = [
  ['/tmp/x', 'd09GMgABAAAA/tmp/xAAAAAA'],
  ['/var/x', 'AAAAd09G/var/xyzAAAAAAAA'],
  ['the home directory', 'AAAA/rootAAAAAAAAAAA'],
];
for (const [what, b64] of PAYLOADS) {
  ok(decodes(b64), `#2028 fixture for ${what} is a real base64 payload (decodes and re-encodes to itself)`);
  const found = findAbsolutePaths(font(b64), needles);
  ok(found.length === 0, `#2028 font payload spelling ${what} is not read as a path (found ${JSON.stringify(found)})`);
}

// The same payload with a real path beside it, outside the URI: the path is still caught, the payload is not.
const mixed = `${font(PAYLOADS[0][1])}\nconst stamp = "/tmp/p3-lane/apps/plugin";`;
const mixedFound = findAbsolutePaths(mixed, needles);
ok(mixedFound.length === 1 && mixedFound[0] === 'a system temp or private path: /tmp/p3-lane',
  `#2028 a real /tmp path beside a font payload is still caught, once (found ${JSON.stringify(mixedFound)})`);

const shapes: [string, string][] = [
  ['const p = "/Users/someone/work/x";', 'a macOS/Linux home directory: /Users/someone/'],
  ['const p = "/home/someone/work/x";', 'a macOS/Linux home directory: /home/someone/'],
  ['const p = "/private/var/folders";', 'a system temp or private path: /private/var'],
  ['const p = "/var/lib/x";', 'a system temp or private path: /var/lib'],
];
for (const [text, want] of shapes) {
  const got = findAbsolutePaths(text, needles);
  ok(got.includes(want), `#2028 a path outside any data: URI still fails the scan: ${want} (found ${JSON.stringify(got)})`);
}
const treeFound = findAbsolutePaths(`x="${TREE}"`, needles);
ok(treeFound.includes(`the building tree: ${TREE}`), `#2028 the building tree's own path still fails the scan (found ${JSON.stringify(treeFound)})`);
const homeFound = findAbsolutePaths(`x="${HOME}/.npm"`, needles);
ok(homeFound.includes(`the builder home directory: ${HOME}`), `#2028 the builder's home directory still fails the scan (found ${JSON.stringify(homeFound)})`);

// Only base64 payloads are blanked: a plain-text data: URI ships readable, so a path in it still fails.
const svg = `url("data:image/svg+xml;utf8,<svg><image href='file:///tmp/leak/x.png'/></svg>")`;
const svgFound = findAbsolutePaths(svg, needles);
ok(svgFound.includes('a system temp or private path: /tmp/leak'),
  `#2028 plain-text data: URI is still scanned (found ${JSON.stringify(svgFound)})`);

console.log(failures ? `\n❌ ${failures} FAILED — ${executed} assertions executed` : `\n✅ ALL PASS — ${executed} assertions executed`);
if (failures) process.exit(1);
