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
 * `isIssueUrl` accepting any https URL → `link: the plugin opens nothing but the issue form`. Since the owner's
 * 2026-11-17 direction the link carries the title and a paste instruction alone: the report given back to `issueUrl`
 * as its body → `paste: the issue opens with the title and the instruction alone`.
 *
 * The review at 03d62700 (findings 1, 2, 3, 5, 6), each fixture the reviewer's: short words matched by substring, or
 * not at all → `#3522 R1 …`; `URL_LIMIT` raised past the literal 7000 → `#3522 R3 link: the main thread opens no issue
 * URL over 7000` (the cut and its #3522 R2 surrogate arm went with the 2026-11-17 change: the link holds no report); `isIssueUrl`'s
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
 * own lines. D3703.1 B (the drawer keeps the host's message; only the report reduces a `write failed:` or `prune failed:`
 * line to the error's class): `reduceFailure` dropped from `buildReport` → `#3697 H4 D3703.1 B a thrown write's and
 * prune's lines keep the error's class, not the host's message`. #3702 (every other line that carries a host's message):
 * the `DETAIL` rule dropped from `reduceLine` → `#3702 component build: the report keeps the error's class, not the host's
 * message`, and each other site of the table by name. #3702 review: `HEAD_DETAIL`'s class back to `…Error` → `#3702
 * review, class DOMException: …` (and `FigmaException`, `invariant`); the refused-writes name back to `[^:()]*` →
 * `#3702 review, refused writes, a renamed variable: …`. #3702 second review: `HEAD_DETAIL` ending in `.*$` again →
 * `#3702 second review, U+2028 in a DOMException's message: …` (and CR, U+2029); `DETAIL` ending in `.*$` again → `#3702
 * second review, U+2028 in a Error's message: …` (and TypeError; CR, U+2029), through its headless `Run stopped (` line.
 */
import * as reportModule from './src/state/report';
import { ENGINE_VOCABULARY, brandWords, buildReport, isIssueUrl, issueUrl, scrub, ISSUE_BASE, URL_LIMIT, type ReportInput } from './src/state/report';
import { brandTheme, type BrandInput, buildTree, EXAMPLE_BRANDS_JSON } from '@prism3/engine';
import * as store from './src/state/store';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// A brand with an id, a display name and a token root, as a client's would carry. Fictional.
const BRAND = { id: 'harbor', name: 'Harbor Fleet', root: 'hbr', primary: 'oklch(0.55 0.2 250)' };
const BASE: ReportInput = {
  stamp: '2026-11-07T21:00:00Z tree-a59be505 0899c2d5', engine: '0.237.0', host: 'figma', brand: BRAND, includeBrand: false, seen: [],
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

// ── #3697 H4, D3703.1 B: the drawer shows the host's message; the report keeps only the error's class ──
// The lines are typed as the plugin posts them (`write failed: <Class>: <message>`), and every expected string is a
// literal, so a `reduceFailure` dropped from `buildReport`, or one that keeps the message, fails here by name.
{
  const failedRep = (includeBrand: boolean): string => buildReport({ ...BASE, includeBrand, activity: [
    { title: 'Apply Theme', verdict: '✗ write failed', lines: ['write failed: TypeError: cannot write to Checkout Hero / Q3 launch'], agent: false },
    { title: 'Prune', verdict: '✗ failed', lines: ['prune failed: Error: in remove: node "Unannounced pricing"'], agent: true },
    { title: 'Build', verdict: '✗ failed', lines: ['write failed: cannot write to Checkout Hero', 'member 3 failed to bind: Checkout Hero'], agent: false },
  ] });
  for (const on of [false, true]) {
    const rep = failedRep(on);
    ok(rep.includes('  - write failed: TypeError\n') && rep.includes('  - prune failed: Error\n') && !/Q3 launch|Unannounced|in remove/.test(rep),
      `#3697 H4 D3703.1 B a thrown write's and prune's lines keep the error's class, not the host's message (brand ${on ? 'included' : 'left out'})`);
  }
  const rep = failedRep(false);
  ok(rep.includes('  - write failed: Error\n'), '#3697 H4 D3703.1 B a failure line with no class at its head reads `Error`, never the message');
  ok(rep.includes('  - member 3 failed to bind: Checkout Hero'), '#3697 H4 D3703.1 B a line that is not a write or prune failure is left as it is');
}

// ── #3702: every other line that carries a host's message keeps only the error's class in the report ──
// D3703.1 B again: each line posts `failureDetail` (`<Class>: <message>`), the drawer shows it whole, and the report cuts
// it to the class. Each line is typed as `main.ts` posts it, one per site #3702 names; each expected line is a literal.
{
  const SECRET = 'in appendChild: node "Checkout Hero / Q3 launch" on page "Unannounced"';
  const cases: readonly [site: string, posted: string, reported: string][] = [
    ['component build', `component build failed: TypeError: ${SECRET} — 2 nodes had already reached the file; they are parked in the frame 'Q3 launch' on this page`, 'component build failed: TypeError'],
    ['canvas labels', `No canvas labels for button: Figma refused the write (Error: ${SECRET})`, 'No canvas labels for button: Figma refused the write (Error)'],
    ['usage panel', `No usage panel for button: Figma refused the write (TypeError: ${SECRET})`, 'No usage panel for button: Figma refused the write (TypeError)'],
    ['spec panel', `No spec panel for button: Figma refused the write (Error: ${SECRET})`, 'No spec panel for button: Figma refused the write (Error)'],
    ['cover', `Cover: not drawn, Figma refused the write (Error: ${SECRET}).`, 'Cover: not drawn, Figma refused the write (Error)'],
    ['engine plan', `button: can't be checked. the engine could not plan it (Error: ${SECRET}).`, 'button: can\'t be checked. the engine could not plan it (Error)'],
    ['version save', `Sets not moved to their pages: the named version could not be saved (Error: ${SECRET}).`, 'Sets not moved to their pages: the named version could not be saved (Error)'],
    ['file setup', `file setup failed: Error: ${SECRET}. Built from tree-test0000 at 2026-11-12T00:00:00Z.`, 'file setup failed: Error'],
    ['style guide', `style guide failed: TypeError: ${SECRET}`, 'style guide failed: TypeError'],
    ['read-back', `read-back failed: Error: ${SECRET}`, 'read-back failed: Error'],
    ['cleanup', `Cleanup failed: Error: ${SECRET}`, 'Cleanup failed: Error'],
    ['prune version', `Nothing removed — the named version could not be saved (Error: ${SECRET}).`, 'Nothing removed — the named version could not be saved (Error)'],
    ['variable writes', `⚠ 3 variable writes refused by Figma (pds/color/blue: ${SECRET.slice(0, 60)})`, '⚠ 3 variable writes refused by Figma (pds/color/blue)'],
  ];
  for (const [site, posted, reported] of cases) {
    const rep = buildReport({ ...BASE, includeBrand: false, activity: [{ title: 'Run', verdict: '✗ failed', lines: [posted], agent: false }] });
    const line = rep.split('\n').find((l) => l.startsWith('  - ')) ?? '';
    ok(line === `  - ${reported}` && !/Checkout Hero|Q3 launch|Unannounced|appendChild/.test(rep),
      `#3702 ${site}: the report keeps the error's class, not the host's message (${JSON.stringify(line)})`);
  }
  // A line of several, the host's message on one of them (`fileSetup`'s summary): only that line is cut.
  const multi = buildReport({ ...BASE, includeBrand: false, activity: [{ title: 'Set up file', verdict: '✓ file set up',
    lines: [`pages: 2 created (Cover, Docs)\nSets not moved to their pages: the named version could not be saved (Error: ${SECRET}).\nCover: drawn.`], agent: false }] });
  ok(multi.includes('pages: 2 created (Cover, Docs)\nSets not moved to their pages: the named version could not be saved (Error)\nCover: drawn.') && !/Checkout Hero|Unannounced/.test(multi),
    `#3702 a multi-line summary: only the line with the host's message is cut (${JSON.stringify(multi.split('Activity').pop())})`);
  // A line that only mentions an error, with no class-and-message detail, is left as it is.
  const plain = buildReport({ ...BASE, includeBrand: false, activity: [{ title: 'Run', verdict: '✓ done', lines: ['Errors: none', 'TypeError counts: 0 (button)'], agent: false }] });
  ok(plain.includes('  - Errors: none\n') && plain.includes('  - TypeError counts: 0 (button)'), '#3702 a line with no class-and-message detail is left as it is');
}

// ── #3702 review: a class `errorClass` admits but `DETAIL`'s `…Error` does not, after every head a site posts ──
// `errorClass` passes any one-word name (`DOMException`, a host's `FigmaException`, a lowercase `invariant`), so each
// site's line is typed with each, and the report must keep the class alone. Heads typed here as `main.ts` posts them.
{
  const SECRET = 'page "SecretPage" is locked';
  const sites: readonly [posted: (d: string) => string, reported: (c: string) => string][] = [
    [(d) => `component build failed: ${d}`, (c) => `component build failed: ${c}`],
    [(d) => `file setup failed: ${d}. Built from tree-test0000 at 2026-11-12T00:00:00Z.`, (c) => `file setup failed: ${c}`],
    [(d) => `style guide failed: ${d}`, (c) => `style guide failed: ${c}`],
    [(d) => `read-back failed: ${d}`, (c) => `read-back failed: ${c}`],
    [(d) => `Cleanup failed: ${d}`, (c) => `Cleanup failed: ${c}`],
    [(d) => `No canvas labels for button: Figma refused the write (${d})`, (c) => `No canvas labels for button: Figma refused the write (${c})`],
    [(d) => `Cover: not drawn, Figma refused the write (${d}).`, (c) => `Cover: not drawn, Figma refused the write (${c})`],
    [(d) => `button: can't be checked. the engine could not plan it (${d}).`, (c) => `button: can't be checked. the engine could not plan it (${c})`],
    [(d) => `Sets not moved to their pages: the named version could not be saved (${d}).`, (c) => `Sets not moved to their pages: the named version could not be saved (${c})`],
    [(d) => `Nothing removed — the named version could not be saved (${d}).`, (c) => `Nothing removed — the named version could not be saved (${c})`],
  ];
  for (const cls of ['DOMException', 'FigmaException', 'invariant']) {
    const bad: string[] = [];
    for (const [posted, reported] of sites) {
      const rep = buildReport({ ...BASE, includeBrand: false, activity: [{ title: 'Run', verdict: '✗ failed', lines: [posted(`${cls}: ${SECRET}`)], agent: false }] });
      const line = rep.split('\n').find((l) => l.startsWith('  - ')) ?? '';
      if (line !== `  - ${reported(cls)}` || rep.includes('SecretPage')) bad.push(line);
    }
    ok(bad.length === 0, `#3702 review, class ${cls}: after each of the ${sites.length} heads the report keeps the class, not the host's message (${JSON.stringify(bad)})`);
  }
}

// ── #4257 review: a bare line, no head in front, thrown as a class that is not an `…Error` ──
// Update file's four `main.ts` catches (the check or apply, Record as built, Adopt, Draw specs) post `failureDetail(e)`
// as the whole line. With no head, only `DETAIL`'s class rule cuts it, so a host's `…Exception` must be a class there
// too; an ordinary `Word: …` line is not a class and stays whole.
{
  const SECRET = 'in get_name: node "SecretLayer" on page "SecretPage"';
  const bad: string[] = [];
  for (const cls of ['DOMException', 'FigmaException', 'Exception', 'TypeError']) {
    for (const [posted, reported] of [[`${cls}: ${SECRET}`, cls], [`Run stopped (${cls}: ${SECRET})`, `Run stopped (${cls})`]]) {
      const rep = buildReport({ ...BASE, includeBrand: false, activity: [{ title: 'Run', verdict: '✗ check failed', lines: [posted], agent: false }] });
      const line = rep.split('\n').find((l) => l.startsWith('  - ')) ?? '';
      if (line !== `  - ${reported}` || /Secret/.test(rep)) bad.push(line);
    }
  }
  ok(bad.length === 0, `#4257 review: a bare line thrown as an …Exception keeps the class, not the host's message (${JSON.stringify(bad)})`);
  const plain = buildReport({ ...BASE, includeBrand: false, activity: [{ title: 'Run', verdict: '✓ done', lines: ['Note: keep this line', 'Exceptions: none', 'Exception counts: 0 (button)'], agent: false }] });
  ok(plain.includes('  - Note: keep this line\n') && plain.includes('  - Exceptions: none\n') && plain.includes('  - Exception counts: 0 (button)'),
    '#4257 review: a line that is not a class and its message is left as it is');
}

// ── #3702 second review: a line terminator inside a line, after every head a site posts ──
// JS's `.` matches none of CR, U+2028 or U+2029, so a detail cut with `.*$` stopped short of them and the line went
// through whole. `failureDetail` collapses them at the source; the report holds the cut whatever the producer does.
// LF is the report's own line separator (`reduceFailure` splits on it), held at the source by `test-report-redaction.ts`.
{
  const SECRET = 'page "SecretPage" is locked';
  const heads: readonly [posted: (d: string) => string, reported: (c: string) => string][] = [
    [(d) => `component build failed: ${d}`, (c) => `component build failed: ${c}`],
    [(d) => `file setup failed: ${d}. Built from tree-test0000 at 2026-11-12T00:00:00Z.`, (c) => `file setup failed: ${c}`],
    [(d) => `style guide failed: ${d}`, (c) => `style guide failed: ${c}`],
    [(d) => `read-back failed: ${d}`, (c) => `read-back failed: ${c}`],
    [(d) => `Cleanup failed: ${d}`, (c) => `Cleanup failed: ${c}`],
    [(d) => `No canvas labels for button: Figma refused the write (${d})`, (c) => `No canvas labels for button: Figma refused the write (${c})`],
    [(d) => `button: can't be checked. the engine could not plan it (${d}).`, (c) => `button: can't be checked. the engine could not plan it (${c})`],
    [(d) => `Sets not moved to their pages: the named version could not be saved (${d}).`, (c) => `Sets not moved to their pages: the named version could not be saved (${c})`],
    [(d) => `write failed: ${d}`, (c) => `write failed: ${c}`],
    [(d) => `Run stopped (${d})`, (c) => `Run stopped (${c})`],
  ];
  for (const [name, t] of [['CR', '\r'], ['U+2028', '\u2028'], ['U+2029', '\u2029']] as const) {
    for (const cls of ['Error', 'TypeError', 'DOMException']) {
      const bad: string[] = [];
      for (const [i, [posted, reported]] of heads.entries()) {
        if (i === heads.length - 1 && !cls.endsWith('Error')) continue; // no head: only `DETAIL`'s `…Error` rule applies
        const rep = buildReport({ ...BASE, includeBrand: false, activity: [{ title: 'Run', verdict: '✗ failed', lines: [posted(`${cls}: in loadAllPagesAsync: failed${t}${SECRET}`)], agent: false }] });
        const line = rep.split('\n').find((l) => l.startsWith('  - ')) ?? '';
        if (line !== `  - ${reported(cls)}` || rep.includes('SecretPage')) bad.push(line);
      }
      ok(bad.length === 0, `#3702 second review, ${name} in a ${cls}'s message: the report keeps the class, not the host's message (${JSON.stringify(bad)})`);
    }
  }
}

// ── #3702 review: the refused-writes note, when the variable's name holds `(` or `:` ──
// A collision Rename writes a variable as `<name> (Prism3)` (#1909), and the host's reason can hold `: ` itself. The
// report keeps the name, parentheses and all; with no `: ` outside the name's parentheses, it keeps nothing of either.
{
  const cases: readonly [label: string, posted: string, reported: string][] = [
    ['a renamed variable', '⚠ 1 variable writes refused by Figma (hds/color/brand (Prism3): in set_value: SecretPage is locked)', '⚠ 1 variable writes refused by Figma (hds/color/brand (Prism3))'],
    ['a name with a colon', '⚠ 2 variable writes refused by Figma (hds/ratio/16:9: in set_value: SecretPage is locked)', '⚠ 2 variable writes refused by Figma (hds/ratio/16:9)'],
    ['an unclosed parenthesis', '⚠ 1 variable writes refused by Figma (hds/odd (x: in set_value: SecretPage is locked)', '⚠ 1 variable writes refused by Figma ([removed])'],
    ['a clause of the one-line summary', 'applied · ⚠ 3 variable writes refused by Figma (hds/color/brand (Prism3): SecretPage) · 2 fonts', 'applied · ⚠ 3 variable writes refused by Figma (hds/color/brand (Prism3))'],
  ];
  for (const [label, posted, reported] of cases) {
    const rep = buildReport({ ...BASE, includeBrand: false, activity: [{ title: 'Apply Theme', verdict: '✓ applied', lines: [posted], agent: false }] });
    const line = rep.split('\n').find((l) => l.startsWith('  - ')) ?? '';
    ok(line === `  - ${reported}` && !rep.includes('SecretPage'),
      `#3702 review, refused writes, ${label}: the report keeps at most the variable's name, never the host's reason (${JSON.stringify(line)})`);
  }
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
// The owner (2026-11-17): "prepopulate with the title, but then the body has instructions to paste the rest". The issue
// opens with the title and a body that only asks for the report, which travels on the clipboard. The expected URL is
// typed here whole, so a body built from the report, or any change to the title or the instruction, fails by name.
// MUTATION: `issueUrl` given the report back as its body → `paste: the issue opens with the title and the instruction alone`.
const PASTE_URL = 'https://github.com/adamforrester/prism3/issues/new?title=Problem%20report&body='
  + 'Paste%20the%20report%20here%20%E2%80%94%20Prism3%20copies%20it%20to%20your%20clipboard%20as%20it%20opens%20this%20page.'
  + '%20Copy%20in%20the%20Report%20a%20problem%20dialog%20copies%20it%20again.';
const url = issueUrl();
ok(url === PASTE_URL, `paste: the issue opens with the title and the instruction alone (${url})`);
const long = buildReport({ ...BASE, activity: [{ title: 'Build', verdict: '✗ failed', lines: Array.from({ length: 400 }, (_, i) => `member ${i} failed to bind its fill`), agent: false }] });
ok(!decodeURIComponent(url).includes('### Diagnostics') && !decodeURIComponent(url).includes(long.slice(0, 40)) && url.length < 400,
  `paste: the link carries nothing from the report, whatever its length (${url.length} characters)`);
// GitHub refuses a prefilled issue URL past roughly 8 KB (observed; GitHub does not document the figure), so the
// ceiling is typed here as a literal, 7000, and never read from the module under test (docs/34).
const GITHUB_SAFE = 7000;
ok(URL_LIMIT <= GITHUB_SAFE, `#3522 R3 link: the main thread opens no issue URL over 7000 characters (${URL_LIMIT})`);
ok(isIssueUrl(url), 'link: the plugin opens the issue form it built');
const over = `${ISSUE_BASE}?body=`.padEnd(7001, 'x');
const atLimit = `${ISSUE_BASE}?body=`.padEnd(7000, 'x');
ok(over.length === 7001 && !isIssueUrl(over), '#3522 R3 link: an issue URL over 7000 characters is not opened');
ok(atLimit.length === 7000 && isIssueUrl(atLimit), '#3522 R3 link: an issue URL of exactly 7000 characters is opened');
ok(!isIssueUrl('https://example.com/collect?d=1') && !isIssueUrl('https://github.com/someone-else/repo/issues/new?body=x') && !isIssueUrl(`${ISSUE_BASE}x?body=1`) && !isIssueUrl(42),
  'link: the plugin opens nothing but the issue form');

// ── #3883: the words of every brand the session held, not only the one on screen ──
// The Activity lines are each operation's latest result, which stays across a brand load, a rename and a failed
// restore. A fictional client's run, then the report opened on a shipped example: before #3883 the scrub list came
// from the example alone, and every client word went into the report.
{
  // Read through the namespace, so a tree without these (main before #3883) fails the arms by name, not at import.
  const mergeWords = (reportModule as { mergeWords?: typeof reportModule.mergeWords }).mergeWords ?? ((...l: unknown[][]) => l.flat());
  const sessionBrandWords = (store as { sessionBrandWords?: () => readonly unknown[] }).sessionBrandWords ?? (() => []);
  const CLIENT = { id: 'acme', name: 'Acme Corp', root: 'acme', brandColors: [{ name: 'acmeblue', oklch: { l: 0.5, c: 0.1, h: 250 } }], customModes: [{ name: 'acme-night', base: 'dark' }], typography: { families: { body: 'Quillmark Sans Pro' } } };
  const RUN = { title: 'Apply Theme', verdict: '✓ applied, mode acme-night', lines: ['wrote acme/core/palette/acmeblue/500', 'typefaces unavailable (Quillmark Sans Pro)'], agent: false };
  const leaks = (t: string): string[] => ['acme', 'Acme', 'acmeblue', 'acme-night', 'Quillmark'].filter((w) => t.includes(w));
  const example = (EXAMPLE_BRANDS_JSON as Record<string, Record<string, unknown>>).harbor!;
  const later = buildReport({ ...BASE, brand: example, seen: brandWords(CLIENT), activity: [RUN] });
  ok(leaks(later).length === 0 && later.includes('mode [brand]') && later.includes('[brand]/core/palette/[brand]/500'),
    `#3883: a report on another brand scrubs the words of the brand the activity ran on (leaked: ${JSON.stringify(leaks(later))})`);
  const later_on = buildReport({ ...BASE, brand: example, includeBrand: true, seen: brandWords(CLIENT), activity: [RUN] });
  ok(leaks(later_on).length === 0 && later_on.includes('"id": "harbor"'),
    `#3883: including the brand on screen includes it, and still scrubs an earlier brand's words (leaked: ${JSON.stringify(leaks(later_on))})`);
  const same_on = buildReport({ ...BASE, brand: CLIENT, includeBrand: true, seen: brandWords(CLIENT), activity: [RUN] });
  ok(same_on.includes('wrote acme/core/palette/acmeblue/500'),
    '#3883: the included brand keeps its own words in the lines, though the session list holds them');
  ok(JSON.stringify(mergeWords([{ whole: 'Acme' }], ['acme', 'b'], [{ whole: 'zz' }])) === JSON.stringify(['acme', { whole: 'zz' }, 'b']),
    '#3883: mergeWords keeps one entry per word ignoring case, a plain string over { whole }, longest first');

  // The session list, as the store collects it: the brand the session started on, a rename that resolved, and a load.
  // A brand that resolves: the harbor example under the client's identity and typeface.
  const client = { ...structuredClone(example), id: 'acme', name: 'Acme Corp', root: 'acme' } as Record<string, any>;
  client.typography = { ...(client.typography ?? {}), families: { ...(client.typography?.families ?? {}), body: 'Quillmark Sans Pro' } };
  store.initSession(client as unknown as BrandInput, { kind: 'file' });
  store.brandState.root = 'acmeco';
  store.rebuild();
  store.loadInput(structuredClone((EXAMPLE_BRANDS_JSON as Record<string, unknown>).aurora) as BrandInput, { kind: 'example', id: 'aurora' });
  const seen = sessionBrandWords() as ReturnType<typeof brandWords>;
  const has = (w: string): boolean => seen.some((x) => (typeof x === 'string' ? x : x.whole).toLowerCase() === w);
  const want = ['acme', 'acme corp', 'acmeco', 'quillmark sans pro', 'aurora'];
  ok(want.every(has),
    `#3883: the store keeps the words of every brand the session resolved: the first, a renamed root, a loaded example (missing: ${want.filter((w) => !has(w)).join(', ') || 'none'})`);
  const viaStore = buildReport({ ...BASE, brand: store.lastGoodInput as unknown as Record<string, unknown>, seen, activity: [{ ...RUN, verdict: '✓ applied', lines: ['wrote acme/color/text/primary', 'wrote acmeco/color/text/primary', 'typefaces unavailable (Quillmark Sans Pro)'] }] });
  ok(leaks(viaStore).length === 0, `#3883: a report built from the store's session list leaks no earlier brand's words (leaked: ${JSON.stringify(leaks(viaStore))})`);

  // A rename skips `rebuild()`, so the post records its words (`postedInput`, review of #3961): rename the root the way
  // Brand › Identity does (`syncIdentity`), post, then load another brand. The renamed root must still be on the list.
  const postedInput = (store as { postedInput?: () => BrandInput }).postedInput ?? (() => store.lastGoodInput);
  store.initSession(structuredClone(client) as unknown as BrandInput, { kind: 'file' });
  store.brandState.root = 'acmezed';
  store.syncIdentity();
  const carried = postedInput();
  store.loadInput(structuredClone((EXAMPLE_BRANDS_JSON as Record<string, unknown>).aurora) as BrandInput, { kind: 'example', id: 'aurora' });
  ok(carried.root === 'acmezed' && (sessionBrandWords() as ReturnType<typeof brandWords>).some((x) => (typeof x === 'string' ? x : x.whole) === 'acmezed'),
    '#3883: a renamed root that was posted without a rebuild stays on the session list after another brand loads');
  // The brand the session starts on is noted by `initSession` itself, with no rebuild after it.
  store.initSession(structuredClone(client) as unknown as BrandInput, { kind: 'file' });
  ok((sessionBrandWords() as ReturnType<typeof brandWords>).some((x) => (typeof x === 'string' ? x : x.whole).toLowerCase() === 'quillmark sans pro'),
    '#3883: initSession puts the starting brand\'s words on the session list before any rebuild');

  // main.ts touches the DOM at import, so its wiring is read as source: every post that carries the brand records it
  // first (a rename skips the rebuild, so a post is the one moment its words are known), and the report reads the list.
  // The claim is POSITIVE and PARSED (#4244): a grep for one bad spelling, `commit.x(lastGoodInput`, passed
  // `const brief = lastGoodInput; commit.postTheme(brief)`. The brand-carrying methods are the `HostCommit` methods with
  // an `input` parameter (`write-adapter.ts`, the contract main.ts posts through), and at that position every call in
  // main.ts must pass `posted()` or `panelBrand(…)`, whose body must be `brandFor(theme, posted())`. MUTATIONS VERIFIED
  // (#4244, each fails the arm by name): the issue's alias above · `panelBrand` returning `lastGoodInput`.
  const main = readFileSync(new URL('./src/main.ts', import.meta.url), 'utf8');
  const parse = (name: string, text: string) => ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  const adapter = parse('write-adapter.ts', readFileSync(new URL('./src/write-adapter.ts', import.meta.url), 'utf8'));
  const inputAt = new Map<string, number>();
  adapter.forEachChild((n) => {
    if (ts.isInterfaceDeclaration(n) && n.name.text === 'HostCommit')
      for (const m of n.members) if (ts.isMethodSignature(m)) {
        const at = m.parameters.findIndex((p) => p.name.getText(adapter) === 'input');
        if (at >= 0) inputAt.set(m.name.getText(adapter), at);
      }
  });
  const sf = parse('main.ts', main);
  const viaSession: string[] = [], bare: string[] = [];
  let panelBody = '', postedInit = '';
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && inputAt.has(n.expression.name.text)) {
      const arg = n.arguments[inputAt.get(n.expression.name.text)!];
      const text = arg ? arg.getText(sf) : '(none)';
      const viaPosted = !!arg && ts.isCallExpression(arg) && ts.isIdentifier(arg.expression) && (arg.expression.text === 'posted' ? arg.arguments.length === 0 : arg.expression.text === 'panelBrand');
      (viaPosted ? viaSession : bare).push(`${n.expression.getText(sf)}(${text})`);
    }
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      if (n.name.text === 'panelBrand' && ts.isArrowFunction(n.initializer)) panelBody = n.initializer.body.getText(sf);
      if (n.name.text === 'posted') postedInit = n.initializer.getText(sf);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  ok(inputAt.size >= 4 && viaSession.length >= 4 && bare.length === 0 && panelBody === 'brandFor(theme, posted())',
    `#3883: every post to the host that carries the brand passes posted() or panelBrand(), which adds its words to the session (${inputAt.size} brand-carrying methods, ${viaSession.length} posts; bare: ${JSON.stringify(bare)}; panelBrand: ${JSON.stringify(panelBody)})`);
  ok(/seen: mergeWords\(sessionBrandWords\(\)/.test(main) && /brand: briefInput\(\)/.test(main),
    '#3883: the report reads the session list, and includes the failed restore\'s brand, not the boot demo');
  ok(postedInit === 'postedInput' && /restoreFailure\?\.brand, heldRestore\]/.test(main),
    '#3883: every post goes through the store\'s postedInput, and the scrub list takes a held restore\'s brand');
}

// #3957: a brand word the scrub's own placeholder holds (`brand`, `remove`) wrapped the placeholder again (`[[brand]]`).
// The words are typed here (`{ whole }` and plain, short and long), so the check does not read `brandWords`. Mutation:
// `scrub` looking inside a placeholder again → `#3957 … [[brand]]` by name.
{
  const aurora = buildReport({ stamp: 's', engine: 'e', host: 'figma', includeBrand: false, seen: [], brand: EXAMPLE_BRANDS_JSON.aurora as never,
    activity: [{ title: 'Apply Theme', verdict: '✓ applied', lines: ['wrote aurora/color/text/brand'], agent: false }] });
  ok(aurora.includes('  - wrote [brand]/color/text/[brand]') && !aurora.includes('[['),
    `#3957: the aurora example's gradient named "brand" does not wrap the placeholder again (${JSON.stringify(aurora.split('\n').filter((l) => l.includes('wrote')))})`);
  const cases: [string, string, Parameters<typeof scrub>[1], string][] = [
    ['a whole word "brand"', 'zephyr/color/text/brand', ['zephyr', { whole: 'brand' }], '[brand]/color/text/[brand]'],
    ['a plain word "bran"', 'zephyr-bran/x', ['zephyr', 'bran'], '[brand]-[brand]/x'],
    ['a plain word "remove" over a key', `see figma.com/file/abc and remove it`, ['remove'], 'see [removed] and [brand] it'],
    ['a short word "b"', 'zephyr/b', ['zephyr', { whole: 'b' }], '[brand]/[brand]'],
  ];
  for (const [name, text, words, want] of cases) {
    const got = scrub(text, words);
    ok(got === want, `#3957: ${name} never looks inside a placeholder the scrub wrote ([[brand]]: ${JSON.stringify(got)}, wanted ${JSON.stringify(want)})`);
  }
}

console.log(`${failed ? `\n✗ ${failed} check(s) failed` : '\n✓ report: all checks passed'} — ${executed} assertions executed`);
process.exit(failed ? 1 : 0);
