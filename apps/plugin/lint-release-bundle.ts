/**
 * THE RELEASE BUNDLE CARRIES NO DEV-ONLY CODE (#2530, owner Q239 A).
 *
 *   npx tsx apps/plugin/lint-release-bundle.ts      (after `build` AND `build:release`, which builds both releases)
 *
 * The plugin has two builds. `dist/` is the DEV build every lane imports: `PRISM3_DEV` true, the agent link's
 * desktop bridge relay (`ws://localhost:17331`) and the manifest's `devAllowedDomains`. `release/` is the RELEASE
 * build (`node build.mjs --release`): `PRISM3_DEV` false, every `if (PRISM3_DEV)` branch dropped, and a manifest with
 * no dev domains. Figma honours `devAllowedDomains` only for a development import, so nothing in Figma itself keeps
 * dev code out of a release. This gate does.
 *
 * ── HOW IT COMPARES TWO INDEPENDENT THINGS (docs/34) ───────────────────────────────────────────────
 *
 * SUBJECT: the built `release/main.js`, `release/ui.html` and `release/manifest.json`, the bytes a release hands Figma.
 *
 * EXPECTED: `DEV_ONLY` and `NETWORK_ONLY` below, authored here from what that code IS (`run-code`; the relay's URL and factory), never
 * read from either bundle. A list derived from the bundle could not fail (docs/34 shape 2).
 *
 * ── THE MARKERS ARE NOT VACUOUS ───────────────────────────────────────────────────────────────────
 *
 * A marker that names nothing passes on every release bundle. So each marker must also be FOUND in the dev build
 * (`dist/`) it came from. When the dev code is renamed or removed, that check fails and names the marker, rather than
 * leaving a gate that checks for code nobody writes any more. And `selfCheck()` runs each pattern on a positive
 * control (which must match) and a negative one (which must not).
 *
 * ── THE MANIFEST ──────────────────────────────────────────────────────────────────────────────────
 *
 * `release/manifest.json` must be the plugin's own `manifest.json` with exactly two differences: the bundle paths
 * point beside it (`main.js`, `ui.html`), and `networkAccess.devAllowedDomains` is gone. Anything else that differs
 * fails by name.
 *
 * ── TWO RELEASES (#3138) ──────────────────────────────────────────────────────────────────────────
 *
 * `build:release` builds "Prism3 Studio" (`release/`) and "Prism3 Studio Offline" (`release-offline/`). Both are held
 * to the dev-only markers above. The offline manifest is the release one plus `manifest-offline.json` (its name, id
 * and networkAccess), and its `allowedDomains` is `["none"]`, written here as a literal: the literal that held
 * `release/` until the network build listed its domains. Those domains are `lint-network-reach.ts`'s.
 *
 * ── THE RELAY IS NETWORK-ONLY (#3147) ─────────────────────────────────────────────────────────────
 *
 * Since #3147 Phase 1 the desktop bridge relay is not dev-only: it sits behind `PRISM3_NETWORK`, so it ships in
 * "Prism3 Studio" (`release/`) and its origin is in that manifest's `allowedDomains`. Its two markers moved from
 * `DEV_ONLY` to `NETWORK_ONLY`: present in `dist/` and `release/`, absent from `release-offline/`. `run-code` stays
 * in `DEV_ONLY`, absent from both releases (Q3147.4 A: no arbitrary code in a release).
 *
 * BY-NAME MUTATIONS (each proven red, then restored; #3147's are in its PR's table): the relay's `if (PRISM3_NETWORK)`
 * changed to `if (true)` → `[bridge-relay-url]` and `[bridge-relay]` fail on `release-offline/ui.html`; changed back to
 * `if (PRISM3_DEV)` → both fail as absent from `release/ui.html`; the dispatcher's `PRISM3_DEV &&` guard on `run-code`
 * removed → `[dev-command-name]` fails on both releases. Before #3147: the dispatcher's `PRISM3_DEV &&` guards removed (#2530 PR 2) →
 * `[dev-command-name]` and `[dev-command-eval]` fail on `release/main.js`; `dev-commands.ts` back to a DIRECT eval →
 * the same two (a direct eval stops esbuild dropping the module); the relay's `if (PRISM3_DEV)` guard removed in
 * `agent-link-ui.ts` → `[bridge-relay-url]` and `[bridge-relay]` failed on `release/ui.html` (they are network-only
 * now); `minifySyntax` dropped from the release build → the dead branch kept as text keeps the module; the manifest's
 * `delete … devAllowedDomains` removed in `build.mjs` → `release/manifest.json carries no devAllowedDomains` fails.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, 'dist');
const RELEASE = resolve(HERE, 'release');
/** The offline variant (#3138): `build.mjs --release --offline`, built by `build:release` beside `release/`. */
const RELEASE_OFFLINE = resolve(HERE, 'release-offline');

type Bundle = 'main.js' | 'ui.html';
type Marker = { name: string; re: RegExp; in: readonly Bundle[]; positive: string; negative: string; what: string };

// Authored from what the dev-only code is, NOT read from a bundle (docs/34). A new dev-only piece adds its marker here.
// Absent from BOTH releases.
const DEV_ONLY: readonly Marker[] = [
  {
    name: 'dev-command-name',
    re: /\brun-code\b/,
    in: ['main.js'],
    positive: 'var RUN_CODE = "run-code";',
    negative: 'var RUN_CODE = "run-codes";',
    what: 'the dev-only `run-code` command (`dev-commands.ts`), its name, parse and messages',
  },
  {
    name: 'dev-command-eval',
    re: /\(0,\s*eval\)/,
    in: ['main.js'],
    positive: 'pending = (0, eval)(wrapped);',
    negative: 'pending = (0, evaluate)(wrapped);',
    what: "the dev-only command's evaluation (`dev-commands.ts`): no eval of any kind ships in a release",
  },
];

/** THE NETWORK-ONLY CODE (#3147, the owner's Q3147.1 A and Q3147.5 A): the desktop bridge relay left dev-only and ships in
 *  "Prism3 Studio", behind `PRISM3_NETWORK`. So each marker must be PRESENT in the dev build and in `release/`, and ABSENT
 *  from `release-offline/`, which offers the mailbox only. Authored from what the relay is, not read from a bundle. */
const NETWORK_ONLY: readonly Marker[] = [
  {
    name: 'bridge-relay-url',
    re: /localhost:17331|\b17331\b/,
    in: ['ui.html'],
    positive: 'var BRIDGE_PORT = 17331;',
    negative: 'var BRIDGE_PORT = 173310;',
    what: "the agent link's desktop bridge port (`agent-bridge-relay.ts`), listed in the network manifest's allowedDomains",
  },
  {
    name: 'bridge-relay',
    re: /\bcreateBridgeRelay\b/,
    in: ['ui.html'],
    positive: 'relay = createBridgeRelay({',
    negative: 'relay = createBridgeRelayed({',
    what: "the relay's factory (`agent-bridge-relay.ts`)",
  },
];

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
  const m = re.exec(text);
  return m ? `…${text.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, ' ')}…` : '';
};

console.log('\nRelease bundle — no dev-only code (#2530)\n');

// The detector first: a pattern that cannot match, or matches everything, makes every other check meaningless.
for (const m of [...DEV_ONLY, ...NETWORK_ONLY]) {
  ok(m.re.test(m.positive) && !m.re.test(m.negative), `detector [${m.name}]: matches its positive control and not its negative`);
}

const dev: Record<Bundle, string> = { 'main.js': read(DIST, 'main.js'), 'ui.html': read(DIST, 'ui.html') };
// Both release builds (#3138): "Prism3 Studio" in release/, "Prism3 Studio Offline" in release-offline/.
const RELEASES = [['release', RELEASE], ['release-offline', RELEASE_OFFLINE]] as const;
const rels = RELEASES.map(([name, dir]) => [name, { 'main.js': read(dir, 'main.js'), 'ui.html': read(dir, 'ui.html') }] as const);
for (const f of ['main.js', 'ui.html'] as const) {
  ok(dev[f].length > 100_000, `dist/${f} is a real bundle (${dev[f].length} bytes)`, 'run `npm run -w @prism3/plugin build` first');
  for (const [name, rel] of rels) {
    ok(rel[f].length > 100_000, `${name}/${f} is a real bundle (${rel[f].length} bytes)`, 'run `npm run -w @prism3/plugin build:release` first');
  }
}

for (const m of DEV_ONLY) {
  for (const f of m.in) {
    ok(m.re.test(dev[f]), `[${m.name}] is in the dev build's dist/${f}, so its absence from a release means something`,
      `the marker no longer names code the dev build carries (${m.what}): update DEV_ONLY with the code`);
    for (const [name, rel] of rels) ok(rel[f].length > 0 && !m.re.test(rel[f]), `[${m.name}] is absent from ${name}/${f}: ${m.what}`, near(rel[f], m.re));
  }
}

// The relay (#3147): in the dev build and "Prism3 Studio", never in "Prism3 Studio Offline".
const [, netRel] = rels[0];
const [, offRel] = rels[1];
for (const m of NETWORK_ONLY) {
  for (const f of m.in) {
    ok(m.re.test(dev[f]), `[${m.name}] is in the dev build's dist/${f}`, `the marker no longer names code the dev build carries (${m.what}): update NETWORK_ONLY with the code`);
    ok(m.re.test(netRel[f]), `[${m.name}] is present in release/${f}: the network build ships ${m.what}`,
      'the relay is gated out of the network release: it sits behind PRISM3_NETWORK since #3147, not PRISM3_DEV');
    ok(offRel[f].length > 0 && !m.re.test(offRel[f]), `[${m.name}] is absent from release-offline/${f}: the offline build offers the mailbox only`, near(offRel[f], m.re));
  }
}

// The manifests: the plugin's own, less the dev domains, with the bundle paths beside it; the offline one also takes
// `manifest-offline.json`'s name, id and networkAccess (#3138).
const devManifest = JSON.parse(read(HERE, 'manifest.json') || '{}');
const offlineOverlay = JSON.parse(read(HERE, 'manifest-offline.json') || '{}');
for (const [name, dir] of RELEASES) {
  const relText = read(dir, 'manifest.json');
  const relManifest = relText ? JSON.parse(relText) : null;
  ok(!!relManifest, `${name}/manifest.json exists`);
  ok(!!relManifest && !relText.includes('devAllowedDomains'), `${name}/manifest.json carries no devAllowedDomains`);
  // #2879 (Q613 1 A): the release asks Figma for the team-library list, the library home's one source for a library's name.
  // A literal, not read off `manifest.json`: the equality below is derived from the dev manifest, so it alone cannot see a
  // permission dropped from both.
  ok(!!relManifest && isDeepStrictEqual(relManifest.permissions, ['teamlibrary']),
    `${name}/manifest.json asks for the teamlibrary permission and no other (got ${JSON.stringify(relManifest?.permissions)})`);
  if (relManifest) {
    const expected = structuredClone(devManifest);
    expected.main = 'main.js';
    expected.ui = 'ui.html';
    if (expected.networkAccess) delete expected.networkAccess.devAllowedDomains;
    if (name === 'release-offline') Object.assign(expected, offlineOverlay);
    ok(isDeepStrictEqual(relManifest, expected),
      `${name}/manifest.json is manifest.json with only the bundle paths and devAllowedDomains changed${name === 'release-offline' ? ', plus manifest-offline.json' : ''}`,
      `${name} ${JSON.stringify(relManifest)}`);
  }
}
// `["none"]`, as a literal, now holds the OFFLINE build (#3138): "Prism3 Studio" lists its domains, and
// `lint-network-reach.ts` holds that list. The equality above is derived from the source manifests, so it alone cannot
// see the offline build given a domain.
const offText = read(RELEASE_OFFLINE, 'manifest.json');
ok(!!offText && isDeepStrictEqual(JSON.parse(offText).networkAccess?.allowedDomains, ['none']),
  `release-offline/manifest.json allows no network (allowedDomains ["none"]; got ${offText ? JSON.stringify(JSON.parse(offText).networkAccess?.allowedDomains) : 'no manifest'})`);

console.log(failed ? `\n✗ lint-release-bundle — ${failed} check(s) failed` : '\n✓ lint-release-bundle — the release build carries no dev-only code');
process.exit(failed ? 1 : 0);
