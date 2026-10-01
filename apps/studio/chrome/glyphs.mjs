/**
 * The `[glyphs]` build check (#1924): every code point the chrome can be handed to draw is in the
 * embedded UI face, so no character falls back to a device font.
 *
 * WHAT IT COMPARES (docs/34). Two things, from two places that share nothing:
 *   - THE ORACLE is the committed woff2 itself. `woff2Cmap` reads its `cmap` table here, in Node, with
 *     no dependency (the brotli stream is Node's own `zlib`). No sidecar list is committed, so there is
 *     nothing that could agree with the subject while disagreeing with the font. The tool that made the
 *     subset (fonttools) is not used to read it back.
 *   - THE SUBJECT is the text the chrome is given to draw, from three surfaces:
 *       notes     the engine's decision notes, `$extensions.prism3.decisions` in every emitted
 *                 `packages/engine/out/*.tokens.json` that is not an overlay. Inspect › Decisions log
 *                 shows them word for word (D4).
 *       verdicts  every string literal in `apps/plugin/src/**`. The host's verdict headlines and
 *                 summaries are composed across the main thread (`apply-summary.ts`, `main.ts`,
 *                 `style-guide.ts`, `prune-figma.ts`, …), so the scope is the directory, not a list of
 *                 the files that happen to post one today.
 *       chrome    every string literal in `apps/studio/src/**`: the shell's own copy, the store's
 *                 verdict lines, the studio's write verdicts (`write-adapter.ts`) and the build note
 *                 appended to every summary (`build-identity.ts`).
 *     String literals are read with the TypeScript parser, so comments (which ship nothing) are not
 *     read, and a template literal's text parts are.
 *
 * WHAT IT DOES NOT READ, BY LITERAL, EACH WITH ITS REASON (`NOT_CHROME`). A listed file that no longer
 * exists fails the check, so an exclusion cannot outlive its file.
 *
 * WHAT THE FACE MAY LACK, BY LITERAL (`FACE_LACKS`). Only code points that Inter itself does not carry
 * at all (so a re-subset cannot add them), each scoped to the files it occurs in, with its reason. An
 * entry fails as stale once the face carries its code point, or once a listed file stops using it, so
 * the list can only shrink toward what is true. A code point Inter does carry is never listed: the fix
 * for that is a re-subset (the recipe is beside `CHROME_FONTS` in `tokens.mjs`).
 *
 * REPRESENTED, NOT COUNTED (docs/34 question 3). Each surface must yield text: at least `NOTES_FLOOR`
 * emitted trees each with at least one note, and each file in `MUST_READ` parsed with at least one
 * string literal. An emptied or moved surface fails by name rather than passing on nothing.
 *
 * Node only; it never reaches a bundle.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';
import ts from 'typescript';
import { ROOT, FONTS_DIR, CHROME_FONTS } from './tokens.mjs';

const rel = (p) => relative(ROOT, p).split('\\').join('/');
export const U = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
const show = (cp) => (cp === 0xfe0f ? '(VS16, emoji presentation)' : `(${String.fromCodePoint(cp)})`);

// ── the oracle: a woff2's cmap, read directly ───────────────────────────────────────────────────
// WOFF2 (W3C, 2018) §5: a 48-byte header, a table directory of variable-length entries, then one
// brotli stream holding every table back to back in directory order. `cmap` is known-tag index 0.
// `glyf` (10) and `loca` (11) are transformed at version 0 and stored as-is at version 3; every other
// table is stored as-is at version 0. A transformed table's stream length is its `transformLength`.
const readBase128 = (b, at) => {
  let v = 0;
  for (let i = 0; i < 5; i++) {
    const byte = b[at.i++];
    v = v * 128 + (byte & 0x7f);
    if (!(byte & 0x80)) return v;
  }
  throw new Error('bad UIntBase128');
};

/** The set of code points a woff2 file's cmap maps (every Unicode subtable, formats 4 and 12). */
export function woff2Cmap(buf) {
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not a woff2 file (no wOF2 signature)');
  const numTables = buf.readUInt16BE(12);
  const compressed = buf.readUInt32BE(20);
  const at = { i: 48 };
  let offset = 0;
  let cmap = null;
  for (let t = 0; t < numTables; t++) {
    const flags = buf[at.i++];
    const tagIndex = flags & 0x3f;
    if (tagIndex === 63) at.i += 4;
    const version = (flags >> 6) & 3;
    const origLength = readBase128(buf, at);
    const transformed = tagIndex === 10 || tagIndex === 11 ? version !== 3 : version !== 0;
    const length = transformed ? readBase128(buf, at) : origLength;
    if (tagIndex === 0) cmap = { offset, length };
    offset += length;
  }
  if (!cmap) throw new Error('no cmap table');
  const tables = brotliDecompressSync(buf.subarray(at.i, at.i + compressed));
  const c = tables.subarray(cmap.offset, cmap.offset + cmap.length);
  const out = new Set();
  const n = c.readUInt16BE(2);
  const seen = new Set();
  for (let r = 0; r < n; r++) {
    const platform = c.readUInt16BE(4 + r * 8);
    const encoding = c.readUInt16BE(6 + r * 8);
    const sub = c.readUInt32BE(8 + r * 8);
    // Unicode subtables only: platform 0, or Windows BMP (3,1) and full repertoire (3,10).
    if (!(platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10))) || seen.has(sub)) continue;
    seen.add(sub);
    const format = c.readUInt16BE(sub);
    if (format === 4) {
      const segX2 = c.readUInt16BE(sub + 6);
      const ends = sub + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = c.readUInt16BE(ends + s * 2), start = c.readUInt16BE(starts + s * 2);
        const delta = c.readInt16BE(deltas + s * 2), rangeAt = ranges + s * 2, range = c.readUInt16BE(rangeAt);
        for (let cp = start; cp <= end && cp !== 0xffff; cp++) {
          const gid = range === 0 ? (cp + delta) & 0xffff
            : (() => { const g = c.readUInt16BE(rangeAt + range + (cp - start) * 2); return g ? (g + delta) & 0xffff : 0; })();
          if (gid) out.add(cp);
        }
      }
    } else if (format === 12) {
      const groups = c.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g++) {
        const start = c.readUInt32BE(sub + 16 + g * 12), end = c.readUInt32BE(sub + 20 + g * 12);
        const gid = c.readUInt32BE(sub + 24 + g * 12);
        for (let cp = start; cp <= end; cp++) if (gid + (cp - start)) out.add(cp);
      }
    }
  }
  return out;
}

// ── the subject: the text the chrome is handed ──────────────────────────────────────────────────
const OUT_DIR = join(ROOT, 'packages', 'engine', 'out');
/** At least this many emitted trees must carry notes (five brands emit today, each base and full). */
export const NOTES_FLOOR = 5;
/** The source roots whose string literals the chrome can draw. */
export const SOURCE_ROOTS = [join(ROOT, 'apps', 'plugin', 'src'), join(ROOT, 'apps', 'studio', 'src')];
/** Files that must be read, each yielding a string literal: the ones this check was written for. */
export const MUST_READ = [
  'apps/plugin/src/apply-summary.ts', // the write verdict headlines (✓ ✗ ⚠)
  'apps/plugin/src/main.ts', // the summaries behind them, and the other writes' headlines
  'apps/studio/src/write-adapter.ts', // the studio's own write verdicts
  'apps/studio/src/shell/preview.ts', // the chrome that shows the Decisions log
];
/** Files under a source root that the chrome does not draw, by literal, each with its reason. */
export const NOT_CHROME = {
  'apps/studio/src/main.ts': 'the legacy studio, drawn in its own face (styles.css) and taken apart page by page '
    + '(LEGACY_PAGES in test-chrome.mjs). The chrome copy it still paints (the Apply label, the pending pills) '
    + 'is measured as drawn by test:chrome, under FACE_GAPS.',
};
/** Code points Inter itself does not carry, so no subset can add them: where each may occur, and why. */
export const FACE_LACKS = {
  0xfe0f: {
    files: ['apps/plugin/src/main.ts', 'apps/plugin/src/agent-link-ui.ts'],
    why: 'VS16 after ⚠ asks for the emoji presentation, which a browser draws from an emoji face whatever '
      + 'the text face carries. Text or emoji presentation for these summaries is the owner\'s call (#1936).',
  },
  0x241f: { files: ['apps/plugin/src/style-guide.ts'], why: 'a key separator joined into a cache key, never drawn' },
  0x2500: { files: ['apps/plugin/src/build-telemetry.ts'], why: 'the console readout\'s rule (#684), never posted to the UI' },
};

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) && !n.endsWith('.d.ts') ? [p] : [];
});

/** Every string literal's text in one TypeScript file, with its line. Comments are not literals. */
export function literalsOf(file, text = readFileSync(file, 'utf8')) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const out = [];
  const visit = (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      out.push({ text: n.text, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1 });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** The texts the chrome can be handed, each with where it came from, plus any surface that was empty. */
export function chromeTexts() {
  const texts = [];
  const missing = [];
  let trees = 0;
  for (const f of readdirSync(OUT_DIR).filter((n) => n.endsWith('.tokens.json') && !n.includes('.overlay.')).sort()) {
    const p = join(OUT_DIR, f);
    const notes = JSON.parse(readFileSync(p, 'utf8'))?.$extensions?.prism3?.decisions;
    if (!Array.isArray(notes) || !notes.some((n) => typeof n === 'string')) { missing.push(`${rel(p)} carries no decision notes ($extensions.prism3.decisions)`); continue; }
    trees++;
    notes.forEach((n, i) => { if (typeof n === 'string') texts.push({ text: n, where: `${rel(p)} decision ${i + 1}`, file: rel(p) }); });
  }
  if (trees < NOTES_FLOOR) missing.push(`decision notes read from ${trees} emitted trees (floor ${NOTES_FLOOR})`);
  const read = new Map();
  for (const root of SOURCE_ROOTS) {
    if (!existsSync(root)) { missing.push(`source root ${rel(root)} is missing`); continue; }
    for (const p of walk(root)) {
      const r = rel(p);
      if (r in NOT_CHROME) continue;
      const lits = literalsOf(p);
      read.set(r, lits.length);
      for (const l of lits) texts.push({ text: l.text, where: `${r}:${l.line}`, file: r });
    }
  }
  for (const f of MUST_READ) if (!read.get(f)) missing.push(`${f} was not read, or holds no string literal`);
  for (const f of Object.keys(NOT_CHROME)) if (!existsSync(join(ROOT, f))) missing.push(`NOT_CHROME lists ${f}, which no longer exists; remove the entry`);
  return { texts, missing, files: [...read.keys()] };
}

/** The `[glyphs]` messages: each code point the UI face lacks, with every place it occurs. Empty = pass. */
export function glyphGaps({ fontFile = join(FONTS_DIR, CHROME_FONTS.find(([n]) => n === 'font-ui')[2]), source = chromeTexts() } = {}) {
  const errors = [];
  let face;
  try { face = woff2Cmap(readFileSync(fontFile)); } catch (e) { return [`cannot read the cmap of ${rel(fontFile)}: ${e.message}`]; }
  const faceName = rel(fontFile);
  errors.push(...source.missing);
  const where = new Map();
  for (const t of source.texts) {
    for (const ch of t.text) {
      const cp = ch.codePointAt(0);
      if (cp < 0x20 || cp === 0x7f || face.has(cp)) continue;
      if (!where.has(cp)) where.set(cp, new Map());
      if (!where.get(cp).has(t.file)) where.get(cp).set(t.file, t.where);
    }
  }
  for (const [cp, files] of [...where].sort((a, b) => a[0] - b[0])) {
    const allowed = FACE_LACKS[cp]?.files ?? [];
    const off = [...files].filter(([f]) => !allowed.includes(f));
    if (off.length) {
      errors.push(`${U(cp)} ${show(cp)} is not in the embedded face ${faceName}, and the chrome can be handed it at ${off.slice(0, 4).map(([, w]) => w).join(', ')}${off.length > 4 ? ` and ${off.length - 4} more files` : ''} (re-subset: the recipe is beside CHROME_FONTS in tokens.mjs)`);
    }
  }
  for (const [k, { files }] of Object.entries(FACE_LACKS)) {
    const cp = Number(k);
    if (face.has(cp)) { errors.push(`FACE_LACKS lists ${U(cp)} ${show(cp)}, which ${faceName} now carries; remove the entry`); continue; }
    for (const f of files) {
      if (!where.get(cp)?.has(f)) errors.push(`FACE_LACKS lists ${U(cp)} ${show(cp)} for ${f}, which no longer uses it; remove it there`);
    }
  }
  return errors;
}

/** The files the check reads, so `dev` re-runs it when one changes. */
export const glyphWatchFiles = () => [
  ...readdirSync(OUT_DIR).filter((n) => n.endsWith('.tokens.json') && !n.includes('.overlay.')).map((n) => join(OUT_DIR, n)),
  ...SOURCE_ROOTS.filter(existsSync).flatMap(walk),
];
