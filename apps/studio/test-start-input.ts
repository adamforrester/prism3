/**
 * The start window's decisions (UI redesign S12), in Node, against the real engine.
 *
 *   npx tsx apps/studio/test-start-input.ts
 *
 * `src/state/start-input.ts` holds what each start path starts a brand from, the color card's hex check, the guard's
 * words, the design.md import check shared by every paste and every file, and where an import error points;
 * `src/provenance.ts` holds the count the guard names (`editCount`). The window that draws them is held in the browser
 * by `test:chrome` section 28 and `apps/plugin/test-start-screen.mjs`.
 *
 * INDEPENDENT OF WHAT IT CHECKS (docs/34). Every expected string is a literal typed here, from the owner's decisions
 * (S3, S6, S7, S10, G13, G15) and the approved strings table; every expected line number is counted by hand from the
 * fixture beside it; the Blank brand's values are concept v6's, restated; the color seed's expectation is built from
 * the engine's color conversion with today's shape written out, not from `seedFromColor`. "The engine takes it" is
 * the engine's own `brandTheme` and `resolvePreview`. `isDirty` is the oracle `editCount` must agree with at zero.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import { resolvePreview } from '@prism3/engine/resolve-preview';
import { hexToRgb, rgbToOklch } from '@prism3/engine/color';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as S from './src/state/start-input';
import { editCount, isDirty, provenanceOf } from './src/provenance';

const HERE = dirname(fileURLToPath(import.meta.url));
let executed = 0, failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  console.error(`  ✗ ${label}`);
};
const brands = exampleBrands as Record<string, BrandInput>;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

console.log('Start paths\n');
{
  // G13 A: a neutral gray primary and every default (concept v6's Blank), restated.
  const blank = S.BLANK_BRAND();
  ok(same(blank, { id: 'untitled', root: 'prism', modes: ['light'], primary: { l: 0.5, c: 0.03, h: 250 }, neutral: { hue: 250, chroma: 0.004, auto: true } }),
    `G13: "Start blank" loads a neutral gray (${JSON.stringify(blank)})`);
  ok(blank.primary.c <= 0.03, `G13: Blank's primary chroma is at most 0.03, a gray, not the indigo it was (0.15) — ${blank.primary.c}`);
  let resolves = true;
  try { resolvePreview(brandTheme(blank)); } catch { resolves = false; }
  ok(resolves, 'G13: the engine resolves Blank in every mode');
  ok(S.BLANK_BRAND() !== S.BLANK_BRAND(), 'each call is a fresh object, so a load cannot edit the next one');

  // The color path writes today's bytes: id, root, modes from the old NEW_BRAND, then the color's OKLCH and a neutral
  // on its hue. The shape is written out here; only the color conversion is the engine's.
  for (const hx of ['#5e4bc3', '#1E1EFF', '#006666']) {
    const o = rgbToOklch(hexToRgb(hx));
    const want = { id: 'untitled', root: 'prism', modes: ['light'], primary: o, neutral: { hue: o.h, chroma: 0.006 } };
    ok(JSON.stringify(S.seedFromColor(hx)) === JSON.stringify(want), `the color path seeds ${hx} byte for byte as before S12`);
  }
}

console.log('\nThe color card\'s hex (S3)\n');
{
  ok(S.HEX_ERROR === 'Enter a hex color as #rrggbb.', `S3: the bad-hex error is the approved sentence ("${S.HEX_ERROR}")`);
  for (const [t, want] of [['#1e1eff', '#1e1eff'], ['  #1E1EFF ', '#1E1EFF'], ['#abc', null], ['1e1eff', null], ['#1e1efg', null], ['', null], ['#1e1eff00', null]] as const) {
    ok(S.readHex(t) === want, `readHex(${JSON.stringify(t)}) is ${JSON.stringify(want)} (got ${JSON.stringify(S.readHex(t))})`);
  }
}

console.log('\nThe guard (G15, S10)\n');
{
  const g = S.guardText('harbor', 'the aurora example', 3);
  ok(g.title === 'Replace harbor with the aurora example?', `S10: the title is "Replace ‹brand› with ‹choice›?" ("${g.title}")`);
  ok(g.body === '3 edits to harbor are not saved to a file. Export or apply first to keep them.', `S10: the body is the approved sentence ("${g.body}")`);
  ok(g.discard === 'Discard 3 edits', `G15: the button says "Discard 3 edits" ("${g.discard}")`);
  const one = S.guardText('harbor', 'a new brand', 1);
  ok(one.body === '1 edit to harbor is not saved to a file. Export or apply first to keep it.' && one.discard === 'Discard 1 edit',
    `one edit takes the singular ("${one.body}" / "${one.discard}")`);
}

console.log('\nThe edit count the guard names\n');
{
  const base = structuredClone(brands.harbor);
  const p = provenanceOf({ kind: 'example', id: 'harbor' }, base);
  const cases: [string, (b: BrandInput) => void, number][] = [
    ['nothing changed', () => {}, 0],
    ['the primary color picked (one color, not three numbers)', (b) => { b.primary = { l: 0.6, c: 0.1, h: 30 }; }, 1],
    ['the primary hue alone', (b) => { b.primary = { ...b.primary, h: b.primary.h + 4 }; }, 1],
    ['Dark mode turned on (one list)', (b) => { b.modes = [...(b.modes ?? ['light']), 'dark']; }, 1],
    ['the name and the neutral chroma', (b) => { b.id = 'harbor-2'; b.neutral = { ...b.neutral, chroma: 0.02 }; }, 2],
    ['a setting added', (b) => { (b as Record<string, unknown>).buttonIcons = 'edges'; }, 1],
    ['the name, the primary and a mode', (b) => { b.id = 'x'; b.primary = { l: 0.4, c: 0.1, h: 10 }; b.modes = ['light', 'dark']; }, 3],
    ['a key reordered only', (b) => { const { id, ...rest } = b; Object.assign(b, {}); for (const k of Object.keys(b)) delete (b as Record<string, unknown>)[k]; Object.assign(b, rest, { id }); }, 0],
  ];
  for (const [what, edit, want] of cases) {
    const cur = structuredClone(base);
    edit(cur);
    const n = editCount(cur, p.baseline);
    ok(n === want, `${what}: ${want} edit${want === 1 ? '' : 's'} (counted ${n})`);
    ok((n === 0) === !isDirty(cur, p), `${what}: zero exactly when isDirty is false (count ${n}, dirty ${isDirty(cur, p)})`);
  }
}

console.log('\nImport errors name their line (S7)\n');
{
  ok(S.importErrorText({ text: 'Something is wrong. Fix it.', line: 4 }) === 'Line 4: Something is wrong. Fix it.', 'S7: a known line goes in front as "Line ‹n›: "');
  ok(S.importErrorText({ text: 'Something is wrong. Fix it.', line: null }) === 'Something is wrong. Fix it.', 'S7: no line, no prefix');
  ok(S.importErrorText({ text: 'no period', line: null }) === 'no period.', 'a message with no closing period gets one');

  // Each fixture's line is counted by hand: the opening --- is line 1.
  const cases: [string, string, number | null, RegExp][] = [
    ['no front matter', 'id: x\nprimary: { l: 0.5, c: 0.1, h: 200 }\n', 1, /must open with a '---'/],
    ['a repeated key', '---\nid: x\nid: y\n---\n', 3, /duplicate key 'id'/],
    ['a line that does not fit its block', '---\nid: x\n   primary: 3\n  foo: 2\n---\n', 3, /unparseable frontmatter/],
    ['a bare #hex color', '---\nname: x\ncolors:\n  primary: #3366ff\n---\n', 4, /color 'primary' has no value/],
    ['an unknown mode', '---\nid: x\nprimary: { l: 0.5, c: 0.1, h: 200 }\nneutral: { hue: 1, chroma: 0.01 }\nmodes: [light, purple]\n---\n', 5, /unknown mode 'purple'/],
    ['a surface the ramp lacks', '---\nid: x\nprimary: { l: 0.5, c: 0.1, h: 200 }\nneutral: { hue: 1, chroma: 0.01 }\nsurfaces:\n  light:\n    base: banana\n---\n', 7, /is not a surface/],
    ['a bad namespace', '---\nid: x\nroot: "a b"\nprimary: { l: 0.5, c: 0.1, h: 200 }\nneutral: { hue: 1, chroma: 0.01 }\n---\n', 3, /root namespace/],
    // A JavaScript error out of the engine names no line, and none is guessed.
    ['no primary at all', '---\nid: x\nneutral: { hue: 1, chroma: 0.01 }\n---\n', null, /engine rejected it/],
    ['an unclosed front matter', '---\nid: x\n', null, /not closed/],
  ];
  for (const [what, text, line, says] of cases) {
    const r = S.validatePaste(text);
    if (!('error' in r)) { ok(false, `${what}: refused — it was accepted`); continue; }
    const shown = S.importErrorText(r.error);
    ok(r.error.line === line, `${what}: points at line ${line ?? 'none'} (points at ${r.error.line ?? 'none'})`);
    ok(says.test(shown), `${what}: says what is wrong ("${shown}")`);
    ok(line === null ? !/^Line \d+:/.test(shown) : shown.startsWith(`Line ${line}: `), `${what}: ${line === null ? 'no "Line" prefix' : `opens "Line ${line}: "`}`);
    ok(!/\bat line \d+/.test(shown), `${what}: the parser's own "at line N" (counted inside the front matter) is not left to contradict it`);
  }

  ok(S.PASTE_EMPTY === 'Paste a design.md brief or choose a file first.', 'S2: the empty-box sentence is the approved one');
  for (const empty of ['', '   \n  ']) {
    const r = S.validatePaste(empty);
    ok('error' in r && S.importErrorText(r.error) === S.PASTE_EMPTY, `an empty paste box (${JSON.stringify(empty)}) asks for a brief`);
  }
  const file = S.validateDesignMd('');
  ok('error' in file && file.error.text === 'Nothing to import — the file is empty.', 'an empty FILE keeps today\'s sentence');

  for (const id of ['prism3', 'aurora', 'harbor', 'wendys']) {
    const text = readFileSync(join(HERE, `../../packages/engine/examples/${id}.design.md`), 'utf8');
    const r = S.validatePaste(text);
    ok('input' in r, `the ${id} example brief imports cleanly`);
  }
}

console.log('\nFile types (S6, G12)\n');
{
  ok(S.FILE_TYPE_ERROR === 'Choose a .md, .markdown or .txt file.', `S6: the wrong-type sentence is the approved one ("${S.FILE_TYPE_ERROR}")`);
  for (const [name, type, want] of [['a.md', '', true], ['a.markdown', '', true], ['a.TXT', '', true], ['brief', 'text/plain', true], ['a.png', 'image/png', false], ['a.pdf', 'application/pdf', false]] as const) {
    ok(S.isDesignMdFile({ name, type }) === want, `G12: "${name}" (${type || 'no type'}) is ${want ? 'accepted' : 'refused'}`);
  }
  ok(S.IMPORT_ACCEPT === '.md,.markdown,.txt,text/markdown,text/plain', 'G12: the pickers offer all three types');
}

console.log('\nOne check for both pastes (the S12 trap)\n');
{
  // Source scan: the brand menu (`main.ts`) and the start window (`shell/start.ts`) each import the shared check and
  // neither defines one of its own. A browser half (`test:chrome` section 28) shows both boxes the same words.
  const main = readFileSync(join(HERE, 'src/main.ts'), 'utf8');
  const start = readFileSync(join(HERE, 'src/shell/start.ts'), 'utf8');
  const importsShared = (src: string): boolean => /import\s*\{[^}]*\bvalidatePaste\b[^}]*\}\s*from\s*'(\.\.?\/)+state\/start-input'/.test(src);
  ok(importsShared(main), 'the brand menu imports validatePaste from state/start-input');
  ok(importsShared(start), 'the start window imports validatePaste from state/start-input');
  for (const [name, src] of [['main.ts', main], ['shell/start.ts', start]] as const) {
    ok(!/(const|function)\s+(validateDesignMd|validatePaste|parseDesignMd)\b/.test(src), `${name} defines no import check of its own`);
    ok(!/\b(parseDesignMd|parseStandardDesignMd|standardToBrandInput)\b/.test(src), `${name} does not parse a design.md itself`);
  }
}

console.log(`\n${executed - failed}/${executed} passed.`);
if (failed) process.exit(1);
