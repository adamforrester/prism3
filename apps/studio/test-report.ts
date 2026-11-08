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
 */
import { brandWords, buildReport, isIssueUrl, issueUrl, scrub, ISSUE_BASE, URL_LIMIT, type ReportInput } from './src/state/report';

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
