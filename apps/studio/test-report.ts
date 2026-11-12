/**
 * Report a problem's model (#2069, owner decision Q116 A), `src/state/report.ts`, in Node with no DOM.
 *
 *   npx tsx apps/studio/test-report.ts
 *
 * INDEPENDENCE (docs/34). Every input and every expected word is a literal typed here, read off the owner's decision
 * (Q116 A: a diagnostic bundle and a prefilled issue link, no backend; the brand input only on opt-in, off by default)
 * and the task's rule (no file names, no keys). Nothing expected is computed by the module under test.
 *
 * Mutations that fail here by name: the brand block written without the opt-in → `Q116 opt-in: off, the brand's
 * settings are not in the report`; `brandWords` left out of the scrub → `Q116 opt-in: off, the brand's prefix and name
 * are replaced`; the hex rule dropped from `scrub` → `no keys: a long hex run is removed`; the token rule dropped →
 * `no keys: a token-shaped run is removed`; the Figma URL rule dropped → `no file names: a Figma file link is removed`;
 * `issueUrl` not cutting → `link: a long report is cut to fit`; `isIssueUrl` accepting any https URL → `link: the
 * plugin opens nothing but the issue form`.
 *
 * The review at 03d62700 (findings 1, 2, 3, 5, 6), each fixture the reviewer's: short words matched by substring, or
 * not at all → `#3522 R1 …`; the cut not backing off a high surrogate → `#3522 R2 link: a cut inside an emoji …`;
 * `URL_LIMIT` raised past the literal 7000 → `#3522 R3 link: a long report is cut to at most 7000`; `isIssueUrl`'s
 * length bound dropped → `#3522 R3 link: an issue URL over 7000 is not opened`; a scrub rule dropped → its `#3522 R5`
 * arm; the verdict left unscrubbed → `#3522 R6 …`.
 *
 * #3523 (owner decision Q147 A: palette and custom mode names are brand input), each fixture the #3522 reviewer's
 * finding 4: `brandColors[].name` left out of `brandWords` → `#3523 Q147 opt-in: off, a palette name is replaced`;
 * `customModes[].name` left out → `#3523 Q147 opt-in: off, a custom mode name is replaced`; either matched by substring
 * instead of as a whole segment → `#3523 Q147 a palette or mode name inside an ordinary word is left`.
 *
 * #3561 (owner decision A: every brand-authored path segment is a brand word): `interactivePalettes[].name`,
 * `glassRoles` keys or `gradients[].name` left out of `brandWords` → the matching `#3561 A opt-in: off, … is replaced`
 * arm, and `#3561 A every brand-authored segment the engine emits is replaced … LEAKED <name>`, which finds the authored
 * segments by building the brand twice with every authored name renamed, not from `brandWords`' own list.
 *
 * #3525 review finding 1 (a name next to `,` `:` `;` `(` `)` leaked): `SEGMENT` narrowed to a list like `/.\\- "'` → each
 * `#3525 R1 … bounded by punctuation is replaced (…)` arm; letters added to `SEGMENT` → `#3525 R1 an ordinary word
 * holding a name stays whole next to punctuation` and `#3525 R1 a short root inside an ordinary word stays whole …`.
 * Delta review: curly quotes, the backtick or `{}` dropped, or straight quotes dropped → the matching quote arm of
 * `#3525 R1 … bounded by punctuation is replaced (…)`; `0-9` added → `#3525 R1 an ordinary word holding a name stays whole …`.
 *
 * #3697 H4 (every string leaf of the brand input is a brand word, the engine's closed words excepted): a value put in
 * `ENGINE_VOCABULARY` that the schema does not close → `#3697 H4 every engine word … is a value the schema closes`,
 * read from `theme-schema.json`, not from the list; typeface families dropped from `brandWords` → `#3697 H4 opt-in:
 * off, a typeface family is replaced`. The same drop fails `apps/plugin/test-report-redaction.ts` over the plugin's
 * own lines.
 */
import { ENGINE_VOCABULARY, brandWords, buildReport, isIssueUrl, issueUrl, scrub, ISSUE_BASE, URL_LIMIT, type ReportInput } from './src/state/report';
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import { buildTree } from '@prism3/engine/tree';
import { readFileSync } from 'node:fs';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// A brand with an id, a display name and a token root, as a client's would carry. Fictional.
const BRAND = { id: 'harbor', name: 'Harbor Fleet', root: 'hbr', primary: 'oklch(0.55 0.2 250)' };
const BASE: ReportInput = {
  stamp: '2026-11-07T21:00:00Z tree-a59be505 0899c2d5', engine: '0.237.0', host: 'figma', brand: BRAND, includeBrand: false,
  activity: [
    { title: 'Apply Theme', verdict: '✗ 1 conflict', lines: ['Nothing was written. 1 conflict with existing content: variable "hbr/color/background/primary" is STRING in "color"'], agent: false },
    { title: 'Build', verdict: '✓ built', lines: ['button: 24 members, Harbor Fleet look'], agent: true },
    { title: 'Prune', verdict: null, lines: [], agent: false },
  ],
};

console.log('Report a problem (#2069, Q116 A) — the bundle, the scrub and the link\n');

// ── the bundle's fields ──
const off = buildReport(BASE);
ok(off.includes('- Build: 2026-11-07T21:00:00Z tree-a59be505 0899c2d5') && off.includes('- Engine: 0.237.0') && off.includes('- Host: Figma plugin'),
  'bundle: the build, the engine version and the host');
ok(off.includes('- Apply Theme: ✗ 1 conflict') && off.includes('- Build (agent): ✓ built') && !off.includes('Prune'),
  'bundle: each operation that ran, with its verdict, and who ran it; one that never ran is left out');
ok(off.includes('### What happened'), 'bundle: it opens with a place for the person\'s own words');

// ── the opt-in: off by default ──
ok(!off.includes('oklch(0.55 0.2 250)') && !off.includes('Brand settings'), 'Q116 opt-in: off, the brand\'s settings are not in the report');
ok(!/hbr|harbor/i.test(off) && off.includes('[brand]/color/background/primary') && off.includes('[brand] look'),
  'Q116 opt-in: off, the brand\'s prefix and name are replaced with [brand] wherever a line carries them');
const on = buildReport({ ...BASE, includeBrand: true });
ok(on.includes('### Brand settings (included by the reporter)') && on.includes('"primary": "oklch(0.55 0.2 250)"') && on.includes('hbr/color/background/primary'),
  'Q116 opt-in: on, the brand\'s settings are included as they are, and its words are left in');

// ── no file names, no keys ──
ok(scrub('see https://www.figma.com/design/AbC123xyz/Client-Checkout?node-id=1-2 for it') === 'see [removed] for it', 'no file names: a Figma file link is removed');
// 18 hex characters: under the token rule's 20, so only the hex rule catches it.
ok(scrub('library key 0f4e2a9c1b3d5e7f9a') === 'library key [removed]', 'no keys: a long hex run is removed');
ok(scrub('library key 0f4e2a9c1b3d5e7f9a1b2c3d4e5f6a7b8c9d0e1f') === 'library key [removed]', 'no keys: a 40-hex key is removed');
ok(scrub('token p3bridge_9Fz2Qk7LmN4xR8tV1wY6') === 'token [removed]', 'no keys: a token-shaped run is removed');
ok(scrub('hbr/color/background/primary at tree-a59be505, commit 0899c2d5') === 'hbr/color/background/primary at tree-a59be505, commit 0899c2d5',
  'no keys: a token name, the 8-hex tree and the short commit stay (they name no file and open nothing)');
ok(JSON.stringify(brandWords({ id: 'ab', name: 'Harbor Fleet', root: 'hbr' })) === JSON.stringify(['Harbor Fleet', 'hbr', 'ab']), 'brand words: longest first, and a word under 3 letters counts too (scrub matches it as a whole segment)');
ok(JSON.stringify(brandWords({ id: 'prism3', name: 'Prism3', root: 'pds3' })) === JSON.stringify(['pds3']), 'brand words: the product\'s own name is never taken out (the house brand carries it)');
const keyed = buildReport({ ...BASE, includeBrand: true, activity: [{ title: 'Apply Theme', verdict: '✗ failed', lines: ['key 0f4e2a9c1b3d5e7f9a1b'], agent: false }] });
ok(keyed.includes('key [removed]'), 'no keys: the scrub holds with the brand included too');

// ── #3522 review R1: a short root or name is taken out as a whole segment, and only so ──
const SHORT = { id: 'harbor', root: 'hf' };
const shortOff = buildReport({ ...BASE, brand: SHORT, activity: [{ title: 'Apply Theme', verdict: '✗ 1 conflict', lines: ['variable "hf/color/background/primary" conflicts', 'shelf.hf-x stays half'], agent: false }] });
ok(!shortOff.includes('hf/color') && shortOff.includes('variable "[brand]/color/background/primary" conflicts'),
  '#3522 R1 Q116 opt-in: off, a 2-letter token root is replaced with [brand] as a whole segment');
ok(shortOff.includes('shelf.[brand]-x stays half'), '#3522 R1 a short brand word inside an ordinary word is left: only a whole segment is replaced');
ok(scrub('g/color/background/primary at the gate', ['g']) === '[brand]/color/background/primary at the gate', '#3522 R1 a 1-letter root (root: \'g\') is replaced as a segment, and words holding the letter stay whole');

// ── #3522 review R5: no file names, no keys, no people, in more shapes ──
ok(scrub('figma.com/design/AbCdEfGhIjKlMnOpQrStUv/Client-Checkout') === '[removed]', '#3522 R5 no file names: a Figma link without https:// is removed, file name and all');
ok(scrub('file AbCdEfGhIjKlMnOpQrStUv') === 'file [removed]', '#3522 R5 no keys: a 22-letter file key with no digit is removed');
ok(scrub('at /Users/jane.doe/acme/brand.md') === 'at [removed]' && scrub('at /home/jane/acme/brand.md') === 'at [removed]' && scrub('at C:\\Users\\jane\\brand.md') === 'at [removed]',
  '#3522 R5 no file names: an absolute path (/Users, /home, C:\\) is removed');
ok(scrub('ask jane.doe@acme.com about it') === 'ask [removed] about it', '#3522 R5 no people: an email address is removed');
ok(scrub('color/background/primary in light-mode') === 'color/background/primary in light-mode', '#3522 R5 a lower-case token name and ordinary words stay');

// ── #3522 review R6: the verdict is scrubbed as the lines are ──
const verdictOff = buildReport({ ...BASE, activity: [{ title: 'Apply Theme', verdict: '✗ hbr/color for Harbor Fleet, key 0f4e2a9c1b3d5e7f9a', lines: [], agent: false }] });
ok(verdictOff.includes('- Apply Theme: ✗ [brand]/color for [brand], key [removed]') && !/hbr|harbor|0f4e2a9c/i.test(verdictOff),
  '#3522 R6 the verdict is scrubbed: no brand word and no key reaches it');

// ── #3523 (Q147 A): palette and custom mode names are brand input, replaced as whole segments ──
const NAMED = { id: 'harbor', root: 'hf', brandColors: [{ name: 'tidewater', oklch: { l: 0.6, c: 0.1, h: 200 } }], customModes: [{ name: 'night-watch', base: 'dark' }] };
const namedOff = buildReport({ ...BASE, brand: NAMED, activity: [{ title: 'Apply Theme', verdict: '✓ applied, mode night-watch', lines: ['wrote hf/core/palette/tidewater/500', 'tidewaters and overnight-watchers stay'], agent: false }] });
ok(namedOff.includes('wrote [brand]/core/palette/[brand]/500') && !/tidewater\//.test(namedOff),
  '#3523 Q147 opt-in: off, a palette name is replaced with [brand] in a token name (hf/core/palette/tidewater/500)');
ok(namedOff.includes('- Apply Theme: ✓ applied, mode [brand]') && !namedOff.includes('mode night-watch'),
  '#3523 Q147 opt-in: off, a custom mode name is replaced with [brand] (mode night-watch)');
ok(namedOff.includes('tidewaters and overnight-watchers stay'), '#3523 Q147 a palette or mode name inside an ordinary word is left: only a whole segment is replaced');
const namedOn = buildReport({ ...BASE, brand: NAMED, includeBrand: true, activity: [{ title: 'Apply Theme', verdict: '✓ applied, mode night-watch', lines: ['wrote hf/core/palette/tidewater/500'], agent: false }] });
ok(namedOn.includes('wrote hf/core/palette/tidewater/500') && namedOn.includes('mode night-watch'), '#3523 Q147 opt-in: on, palette and mode names are left in');

// ── #3561 (owner decision A): EVERY brand-authored path segment is a brand word ──
// The issue's reproduction, word for word: a collision refusal naming an interactive palette's and a glass role's variable.
const AUTHORED = { id: 'harbor', root: 'hds', brandColors: [{ name: 'tidewater', oklch: { l: 0.6, c: 0.1, h: 200 } }],
  interactivePalettes: [{ palette: 'tidewater', name: 'seaside' }], glassRoles: { lagoon: { palette: 'tidewater.500', alpha: 40 } },
  gradients: [{ name: 'sunrise', stops: [{ palette: 'tidewater', step: 300, position: 0 }, { palette: 'primary', step: 600, position: 1 }] }] };
const collide = 'Nothing was written. 2 conflicts with existing content: variable "hds/color/interactive/seaside/fill/rest" is STRING in "color"; variable "hds/color/glass/lagoon" is FLOAT in "color"; gradient hds/gradient/sunrise';
const authoredOff = buildReport({ ...BASE, brand: AUTHORED, activity: [{ title: 'Apply Theme', verdict: '✗ 2 conflicts', lines: [collide, 'a seasides lagoons sunrises line stays'], agent: false }] });
ok(authoredOff.includes('"[brand]/color/interactive/[brand]/fill/rest"') && !/\bseaside\//.test(authoredOff),
  '#3561 A opt-in: off, an interactive palette name is replaced with [brand] (color/interactive/seaside)');
ok(authoredOff.includes('"[brand]/color/glass/[brand]"') && !/glass\/lagoon/.test(authoredOff),
  '#3561 A opt-in: off, a glass role key is replaced with [brand] (color/glass/lagoon)');
ok(authoredOff.includes('gradient [brand]/gradient/[brand]') && !/gradient\/sunrise/.test(authoredOff),
  '#3561 A opt-in: off, a gradient name is replaced with [brand] (gradient/sunrise)');
ok(authoredOff.includes('a seasides lagoons sunrises line stays'), '#3561 A an authored name inside an ordinary word is left: only a whole segment is replaced');
ok(brandWords({ ...AUTHORED, gradients: true }).every((w) => typeof w === 'string' || w.whole !== 'brand'),
  '#3561 A `gradients: true` names no gradient: the engine\'s default set adds no brand word');
const authoredOn = buildReport({ ...BASE, brand: AUTHORED, includeBrand: true, activity: [{ title: 'Apply Theme', verdict: '✗ 2 conflicts', lines: [collide], agent: false }] });
ok(authoredOn.includes('hds/color/interactive/seaside/fill/rest') && authoredOn.includes('hds/color/glass/lagoon'), '#3561 A opt-in: on, authored names are left in');

// REPRESENTED, NOT LISTED (docs/34): which segments the author named is read from the ENGINE, not from `brandWords`'
// field list. The same brand is built twice, every authored name renamed and nothing else changed: a key that differs
// between the two trees can only have come from the author. Every one of them, in every token path the brand emits
// (and every mode key), must come out of a scrubbed line as [brand].
{
  const ALT: Record<string, string> = { tidewater: 'brinewood', 'night-watch': 'dog-watch', seaside: 'shoreline', lagoon: 'estuary', sunrise: 'daybreak' };
  const mk = (n: (w: string) => string): BrandInput => ({ id: 'harbor', root: 'hds', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 },
    brandColors: [{ name: n('tidewater'), oklch: { l: 0.6, c: 0.1, h: 200 } }], customModes: [{ name: n('night-watch'), base: 'dark' }],
    interactivePalettes: [{ palette: n('tidewater'), name: n('seaside') }], glassRoles: { [n('lagoon')]: { palette: `${n('tidewater')}.500`, alpha: 40 } },
    gradients: [{ name: n('sunrise'), stops: [{ palette: n('tidewater'), step: 300, position: 0 }, { palette: 'primary', step: 600, position: 1 }] }] } as BrandInput);
  const keysOf = (b: BrandInput): Set<string> => {
    const out = new Set<string>();
    const walk = (o: unknown): void => { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (!k.startsWith('$')) out.add(k); walk(v); } };
    walk(buildTree(brandTheme(b)).tree);
    return out;
  };
  const paths = (b: BrandInput): string[] => {
    const out: string[] = [];
    const walk = (o: unknown, at: string[]): void => { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (k.startsWith('$')) continue; if (v && typeof v === 'object' && '$value' in v) out.push([...at, k].join('/')); walk(v, [...at, k]); } };
    walk(buildTree(brandTheme(b)).tree, []);
    return out;
  };
  const real = mk((w) => w), alt = mk((w) => ALT[w]);
  const realKeys = keysOf(real), altKeys = keysOf(alt);
  const authored = [...realKeys].filter((k) => !altKeys.has(k));
  const realPaths = paths(real);
  // The diff must find each name the fixture authors, or the arm below would pass on an empty set.
  ok(Object.keys(ALT).every((w) => authored.includes(w)),
    `#3561 A the engine emits every authored name as a key (${Object.keys(ALT).filter((w) => !authored.includes(w)).join(', ') || 'all found'}; diff ${JSON.stringify(authored)})`);
  const words = brandWords(real as unknown as Record<string, unknown>);
  // A compound key (`tidewater-500-alpha`, a glass role's alpha step) holds the name as a `-` segment: it leaks only if
  // the key comes back whole. Mode names live under `$extensions`, never in a path, so a mode line carries them.
  const leaked = authored.filter((seg) => realPaths.some((p) => p.split('/').includes(seg) && scrub(p, words).split('/').includes(seg)))
    .concat(authored.filter((seg) => scrub(`mode ${seg}`, words).includes(seg)));
  ok(leaked.length === 0 && realPaths.length > 100,
    `#3561 A every brand-authored segment the engine emits is replaced with [brand] in every one of ${realPaths.length} token paths${leaked.length ? ` — LEAKED ${[...new Set(leaked)].join(', ')}` : ''}`);
}

// ── #3697 H4: every string leaf of the brand input, typeface families included ──
{
  // The schema's closed values, read from the schema: an engine word the list exempts must be one of them, or an
  // authored word could pass the scrub. (A value the list misses is only over-redacted: the safe direction.)
  const closed = new Set<string>();
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    const o = n as Record<string, unknown>;
    if (Array.isArray(o.enum)) for (const v of o.enum) if (typeof v === 'string') closed.add(v);
    if (typeof o.const === 'string') closed.add(o.const);
    for (const v of Object.values(o)) walk(v);
  };
  walk(JSON.parse(readFileSync(new URL('../../packages/engine/schema/theme-schema.json', import.meta.url), 'utf8')));
  const open = [...ENGINE_VOCABULARY].filter((w) => !closed.has(w));
  ok(open.length === 0 && closed.size > 50, `#3697 H4 every engine word the scrub keeps is a value the schema closes (${open.join(', ') || `all ${ENGINE_VOCABULARY.size} of ${closed.size}`})`);
  const TYPED = { id: 'harbor', root: 'hfs', density: 'comfortable',
    typography: { families: { display: 'Ivar Headline', body: 'Calibre Office' }, weights: { display: ['strong'] }, facePins: { display: { family: 'Ivar Headline', style: 'Hairline' } } } };
  const typed = buildReport({ ...BASE, brand: TYPED, activity: [{ title: 'Apply Theme', verdict: '✓ applied, 1 skipped',
    lines: ['⚠ 2 typefaces unavailable (Calibre Office|Regular, Ivar Headline Hairline)', 'type/display/strong, body text, comfortable density'], agent: false }] });
  ok(typed.includes('⚠ 2 typefaces unavailable ([brand]|Regular, [brand] [brand])') && !/Calibre|Ivar/.test(typed),
    '#3697 H4 opt-in: off, a typeface family is replaced with [brand], next to the `|` the plugin joins a face with');
  ok(typed.includes('type/display/strong, body text, comfortable density'), '#3697 H4 the engine\'s own words stay: a closed value names no brand');
  ok(brandWords({ id: 'harbor', actionPalette: 'primary', gradients: [{ name: 'dawn', stops: [{ palette: 'neutral' }] }] })
    .every((w) => !['primary', 'neutral'].includes(typeof w === 'string' ? w : w.whole)), '#3697 H4 a reserved palette (primary, neutral) is the engine\'s name, not a brand word');
}

// ── #3525 review finding 1: a name next to prose punctuation is still a whole segment ──
// Each fixture is the reviewer's, or a plugin line shape it cited (`style-guide.ts` `per mode (…)`, `prune-figma.ts` `→ …;`).
const PUNCT = brandWords(NAMED);
const punct: readonly [string, string][] = [
  ['mode night-watch, then light', 'mode [brand], then light'],
  ['modes: night-watch; dark', 'modes: [brand]; dark'],
  ['(tidewater) ramp', '([brand]) ramp'],
  ['tidewater: 12 steps', '[brand]: 12 steps'],
  ['tidewater,sea', '[brand],sea'],
  ['per mode (light, dark, night-watch)', 'per mode (light, dark, [brand])'],
  ['→ light, night-watch;', '→ light, [brand];'],
  ['[tidewater] and night-watch! or tidewater?', '[[brand]] and [brand]! or [brand]?'],
  ['palette tidewater.500', 'palette [brand].500'],
  ['"night-watch" and \'tidewater\'', '"[brand]" and \'[brand]\''],
  ['“tidewater” ‘night-watch’ `tidewater` {night-watch}', '“[brand]” ‘[brand]’ `[brand]` {[brand]}'],
];
for (const [inp, want] of punct) {
  const got = scrub(inp, PUNCT);
  ok(got === want, `#3525 R1 a palette or mode name bounded by punctuation is replaced (${inp} → ${got})`);
}
ok(scrub('overnight-watch, tidewaters: overnight-watchers; tidewater2, night-watch9;', PUNCT) === 'overnight-watch, tidewaters: overnight-watchers; tidewater2, night-watch9;',
  '#3525 R1 an ordinary word holding a name stays whole next to punctuation: a letter is never a boundary');
const ROOT = brandWords(SHORT);
ok(scrub('hf, then hf: and (hf)', ROOT) === '[brand], then [brand]: and ([brand])',
  '#3525 R1 a short root bounded by punctuation is replaced (hf, / hf: / (hf))');
ok(scrub('shelf, half: hfx;', ROOT) === 'shelf, half: hfx;', '#3525 R1 a short root inside an ordinary word stays whole next to punctuation');
// #3560: a line break or a tab bounds a name too. A run's summary spans lines (the plugin's file-setup summary holds
// `\n`), and `^`/`$` match only at the ends of the whole text. Literal inputs and outputs.
const ws: [string, string][] = [
  ['modes: light, night-watch\nnext line', 'modes: light, [brand]\nnext line'],
  ['first line\nnight-watch is on', 'first line\n[brand] is on'],
  ['tidewater\tramp', '[brand]\tramp'],
  ['a\r\ntidewater\r\n', 'a\r\n[brand]\r\n'],
];
for (const [inp, want] of ws) {
  const got = scrub(inp, PUNCT);
  ok(got === want, `#3560 a palette or mode name bounded by a newline or a tab is replaced (${JSON.stringify(inp)} → ${JSON.stringify(got)})`);
}
ok(scrub('ends hf\nhf starts\tthen hf', ROOT) === 'ends [brand]\n[brand] starts\tthen [brand]', '#3560 a short root bounded by a newline or a tab is replaced');
ok(scrub('tidewaters\novernight-watch\tshelf', [...PUNCT, ...ROOT]) === 'tidewaters\novernight-watch\tshelf', '#3560 an ordinary word holding a name stays whole next to a newline or a tab');

// ── the link ──
const url = issueUrl(off);
ok(url.startsWith(`${ISSUE_BASE}?title=Problem%20report&body=`) && decodeURIComponent(url.split('&body=')[1]) === off, 'link: the issue form, prefilled with the whole report');
const long = buildReport({ ...BASE, activity: [{ title: 'Build', verdict: '✗ failed', lines: Array.from({ length: 400 }, (_, i) => `member ${i} failed to bind its fill`), agent: false }] });
const cut = issueUrl(long);
// GitHub refuses a prefilled issue URL past roughly 8 KB (observed; GitHub does not document the figure), so the
// ceiling is typed here as a literal, 7000, and never read from the module under test (docs/34).
const GITHUB_SAFE = 7000;
ok(URL_LIMIT <= GITHUB_SAFE && cut.length <= GITHUB_SAFE, `#3522 R3 link: a long report is cut to at most 7000 characters (${cut.length})`);
ok(cut.length <= URL_LIMIT && decodeURIComponent(cut.split('&body=')[1]).endsWith('The full report is on your clipboard: paste it here.)'), `link: a long report is cut to fit (${cut.length} ≤ ${URL_LIMIT}) and says where the rest is`);
ok(isIssueUrl(url) && isIssueUrl(cut), 'link: the plugin opens the issue form it built');
const over = `${ISSUE_BASE}?body=`.padEnd(7001, 'x');
const atLimit = `${ISSUE_BASE}?body=`.padEnd(7000, 'x');
ok(over.length === 7001 && !isIssueUrl(over), '#3522 R3 link: an issue URL over 7000 characters is not opened');
ok(atLimit.length === 7000 && isIssueUrl(atLimit), '#3522 R3 link: an issue URL of exactly 7000 characters is opened');
// #3522 review R2: a cut that lands inside an emoji (a surrogate pair) backs off it, and does not throw.
const emoji = buildReport({ ...BASE, activity: [{ title: 'Build', verdict: '✗ failed', lines: Array.from({ length: 400 }, (_, i) => `member ${i} on page "🎨 Components"`), agent: false }] });
let emojiCuts = 0;
let emojiErr = '';
for (let pad = 0; pad < 12; pad++) {
  try { const u = issueUrl('x'.repeat(pad) + emoji); decodeURIComponent(u); if (u.length <= 7000) emojiCuts++; } catch (e) { emojiErr = String(e); }
}
ok(emojiCuts === 12 && !emojiErr, `#3522 R2 link: a cut inside an emoji backs off it, and the link still opens (${emojiCuts}/12 cut${emojiErr ? `, ${emojiErr}` : ''})`);
ok(!isIssueUrl('https://example.com/collect?d=1') && !isIssueUrl('https://github.com/someone-else/repo/issues/new?body=x') && !isIssueUrl(`${ISSUE_BASE}x?body=1`) && !isIssueUrl(42),
  'link: the plugin opens nothing but the issue form');

console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ report: all checks passed');
process.exit(failed ? 1 : 0);
