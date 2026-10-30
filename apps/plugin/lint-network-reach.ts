/**
 * THE TWO PLUGINS' NETWORK REACH (#3138, the owner's network model).
 *
 *   npx tsx apps/plugin/lint-network-reach.ts      (after `build:release`, which builds both)
 *
 * One codebase builds two plugins. "Prism3 Studio" (`release/`) may reach the domains its manifest lists, today the
 * two Google Fonts hosts the preview loads a brand's face from. "Prism3 Studio Offline" (`release-offline/`,
 * `build.mjs --release --offline`) reaches none: `allowedDomains: ["none"]`, for client files and locked-down setups.
 * Figma enforces a manifest's list with a CSP, but nothing in Figma says the list is the one we meant, or that the
 * offline build degrades rather than tries. This gate does, by reading the bytes each build hands Figma.
 *
 * ── HOW IT COMPARES TWO INDEPENDENT THINGS (docs/34) ───────────────────────────────────────────────
 *
 * SUBJECT: `release/` and `release-offline/` — each build's `main.js`, `ui.html` and `manifest.json`.
 *
 * EXPECTED: three lists authored here, never read from a bundle or a manifest (docs/34 shape 2):
 *   · `ALLOWED`: the network build's domains, as the owner decided them. The manifest must equal it, with no `*`.
 *   · `REFERENCE_ONLY`: hosts a bundle names but never requests (an SVG namespace, a license line, a docs link the
 *     user opens in their browser). Each carries its reason. A host in a bundle that is in neither list fails by name:
 *     that is "Prism3 Studio reaches only its listed domains".
 *   · `PRIMITIVES`: every way a page or the main thread makes a request. The offline build carries none of them, and
 *     no allowed host either: that is "Prism3 Studio Offline makes no network calls".
 *
 * ── THE CHECKS ARE NOT VACUOUS ─────────────────────────────────────────────────────────────────────
 *
 * A primitive the offline build lacks means something only if the network build has it: so the network build's
 * `ui.html` must carry the web-font loader's request (`fetch(` and the Google Fonts host). When the loader is renamed
 * or removed, that check fails and names it. `selfCheck` runs every pattern on a positive and a negative control.
 *
 * BY-NAME MUTATIONS (each proven red, then restored; the PR's table records them): a `fetch` outside the
 * `PRISM3_NETWORK` gate in `web-fonts.ts` → `[fetch] is absent from release-offline/ui.html`; the offline manifest's
 * `allowedDomains` set to `["*"]` → `release-offline/manifest.json allows no network`; a third domain added to
 * `manifest.json` → `release/manifest.json allows exactly the listed domains`; a request to an unlisted host in the
 * loader → `[host example.com] in release/ui.html is allowed or reference-only`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILDS = {
  network: { dir: resolve(HERE, 'release'), name: 'release', label: 'Prism3 Studio', id: 'prism3-theming-plugin' },
  offline: { dir: resolve(HERE, 'release-offline'), name: 'release-offline', label: 'Prism3 Studio Offline', id: 'prism3-theming-plugin-offline' },
} as const;

/** The network build's domains (#3138, owner decision: explicit domains, no `*`, starting with the Google Fonts hosts). */
const ALLOWED = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'] as const;
const ALLOWED_HOSTS = ALLOWED.map((d) => new URL(d).host);

/** Hosts a bundle names without requesting them, each with its reason. A new one is added here with its reason. */
const REFERENCE_ONLY: Record<string, string> = {
  'www.w3.org': 'the SVG and XHTML namespace URIs, an identifier and never fetched',
  'openfontlicense.org': "the embedded chrome fonts' license line, in a comment",
  'github.com': 'license and source lines in comments',
  'tabler.io': "the icon set's license line, in a comment",
  'prism3-ds.vercel.app': 'the docs site, opened in the browser by `figma.openExternal`, never fetched by the plugin',
};

type Pattern = { name: string; re: RegExp; positive: string; negative: string };
/** Every way the plugin could make a request. Authored from the platform's APIs, not from a bundle. */
const PRIMITIVES: readonly Pattern[] = [
  { name: 'fetch', re: /\bfetch\s*\(/, positive: 'fetch(webFontUrl(family))', negative: 'prefetch = 1; refetchAll()' },
  { name: 'XMLHttpRequest', re: /\bXMLHttpRequest\b/, positive: 'new XMLHttpRequest()', negative: 'new XMLHttpRequester()' },
  { name: 'WebSocket', re: /\bnew\s+WebSocket\b/, positive: 'new WebSocket(url)', negative: 'type WebSocketLike = {}' },
  { name: 'EventSource', re: /\bnew\s+EventSource\b/, positive: 'new EventSource(u)', negative: 'new EventSourced(u)' },
  { name: 'sendBeacon', re: /\bsendBeacon\b/, positive: 'navigator.sendBeacon(u)', negative: 'navigator.sendBeacons' },
  { name: 'importScripts', re: /\bimportScripts\b/, positive: 'importScripts(u)', negative: 'importScript(u)' },
  { name: 'css-url', re: /url\(\s*["']?(?:https?:)?\/\//, positive: 'src: url(https://fonts.gstatic.com/a.woff2)', negative: 'src: url(data:font/woff2;base64,AA)' },
  { name: 'css-import', re: /@import\s/, positive: '@import url(x.css);', negative: '@importance' },
];
const URL_HOST = /\b(?:https?|wss?):\/\/([a-z0-9.-]+\.[a-z]{2,})/gi;

let failed = 0;
const ok = (cond: boolean, label: string, detail = ''): void => {
  console.log(`  ${cond ? '✓' : '✗'} ${label}${!cond && detail ? `\n      ${detail}` : ''}`);
  if (!cond) failed++;
};
const read = (dir: string, f: string): string => {
  const p = resolve(dir, f);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
};
const near = (text: string, re: RegExp): string => {
  const m = new RegExp(re.source, re.flags.replace('g', '')).exec(text);
  return m ? `…${text.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, ' ')}…` : '';
};
const json = (dir: string): Record<string, any> | null => { const t = read(dir, 'manifest.json'); return t ? JSON.parse(t) : null; };

console.log('\nNetwork reach — Prism3 Studio reaches only its listed domains; Prism3 Studio Offline makes no calls (#3138)\n');

// The detector first: a pattern that cannot match, or matches everything, makes every other check meaningless.
for (const p of PRIMITIVES) ok(p.re.test(p.positive) && !p.re.test(p.negative), `detector [${p.name}]: matches its positive control and not its negative`);
ok([...'x https://fonts.gstatic.com/s/a.woff2 y'.matchAll(URL_HOST)].map((m) => m[1]).join() === 'fonts.gstatic.com', 'detector [host]: reads the host of a URL');

const bundles = (dir: string) => ({ 'main.js': read(dir, 'main.js'), 'ui.html': read(dir, 'ui.html') });
const net = bundles(BUILDS.network.dir);
const off = bundles(BUILDS.offline.dir);
for (const [b, files] of [[BUILDS.network, net], [BUILDS.offline, off]] as const) {
  for (const [f, text] of Object.entries(files)) {
    ok(text.length > 100_000, `${b.name}/${f} is a real bundle (${text.length} bytes)`, 'run `npm run -w @prism3/plugin build:release` first (it builds both)');
  }
}

// ── Prism3 Studio Offline: no network calls ─────────────────────────────────────────────────────────
for (const [f, text] of Object.entries(off)) {
  for (const p of PRIMITIVES) ok(text.length > 0 && !p.re.test(text), `[${p.name}] is absent from release-offline/${f}`, near(text, p.re));
  for (const h of ALLOWED_HOSTS) ok(text.length > 0 && !text.includes(h), `[host ${h}] is absent from release-offline/${f}`, near(text, new RegExp(h.replace(/\./g, '\\.'))));
}
const offM = json(BUILDS.offline.dir);
ok(!!offM, 'release-offline/manifest.json exists');
ok(isDeepStrictEqual(offM?.networkAccess?.allowedDomains, ['none']),
  `release-offline/manifest.json allows no network (allowedDomains ["none"]; got ${JSON.stringify(offM?.networkAccess?.allowedDomains)})`);
ok(!!offM && !('devAllowedDomains' in (offM.networkAccess ?? {})), 'release-offline/manifest.json carries no devAllowedDomains');

// ── Prism3 Studio: only its listed domains ──────────────────────────────────────────────────────────
const netM = json(BUILDS.network.dir);
ok(!!netM, 'release/manifest.json exists');
ok(isDeepStrictEqual(netM?.networkAccess?.allowedDomains, [...ALLOWED]),
  `release/manifest.json allows exactly the listed domains ${JSON.stringify(ALLOWED)} (got ${JSON.stringify(netM?.networkAccess?.allowedDomains)})`);
ok(!!netM && !JSON.stringify(netM.networkAccess ?? {}).includes('*'), 'release/manifest.json allows no wildcard domain');
// Vacuity: the loader is in the network build, so its absence from the offline one means something.
ok(/\bfetch\s*\(/.test(net['ui.html']) && net['ui.html'].includes('fonts.googleapis.com'),
  "release/ui.html carries the web-font loader's request (`fetch(` and the Google Fonts host), so the offline absence means something",
  'the loader (apps/studio/src/ui/web-fonts.ts) moved or was renamed: update this gate with it');
for (const p of PRIMITIVES) ok(!p.re.test(net['main.js']), `[${p.name}] is absent from release/main.js (the main thread makes no request)`, near(net['main.js'], p.re));
for (const [f, text] of Object.entries(net)) {
  const hosts = new Set([...text.matchAll(URL_HOST)].map((m) => m[1].toLowerCase()));
  for (const h of [...hosts].sort()) {
    ok(ALLOWED_HOSTS.includes(h) || h in REFERENCE_ONLY, `[host ${h}] in release/${f} is allowed or reference-only`,
      `${h} is in neither ALLOWED nor REFERENCE_ONLY: a request there is refused by Figma's CSP, and a reference needs its reason here`);
  }
}

// ── Two plugins, loadable at once ───────────────────────────────────────────────────────────────────
for (const [key, m] of [['network', netM], ['offline', offM]] as const) {
  const b = BUILDS[key];
  ok(m?.name === b.label, `${b.name}/manifest.json is named "${b.label}" (got ${JSON.stringify(m?.name)})`);
  ok(m?.id === b.id, `${b.name}/manifest.json has the id "${b.id}" (got ${JSON.stringify(m?.id)})`);
}
ok(!!netM && !!offM && netM.id !== offM.id && netM.name !== offM.name, 'the two builds have distinct ids and names, so both can be loaded at once');

console.log(failed ? `\n✗ lint-network-reach — ${failed} check(s) failed` : '\n✓ lint-network-reach — each build reaches only what its manifest allows');
process.exit(failed ? 1 : 0);
