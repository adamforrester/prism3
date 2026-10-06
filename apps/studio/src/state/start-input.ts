/**
 * The start window's decisions, with no DOM (UI redesign S12). The window itself is `shell/start.ts`; what it starts a
 * brand from, how it reads a hex, how it counts what the guard would discard, and the design.md import check live
 * here, so a Node test can hold each of them (`test-start-input.ts`).
 *
 * ONE IMPORT CHECK FOR EVERY PASTE AND EVERY FILE (the S12 scoping report's trap). The brand menu's paste box and the
 * start window's paste box both call `validatePaste`; the two file pickers call `validateDesignMd`. Two copies would
 * drift, and the failure is one of them accepting a brief the other refuses.
 *
 * WHERE AN IMPORT ERROR POINTS (owner decision S7). An error reads "Line ‹n›: ‹what is wrong›. ‹How to fix it›.", and
 * an error with no line drops the "Line ‹n›: " prefix. The engine's parser says "at line N" counted from the first
 * line INSIDE the front matter, so the file line is N + 1 (the opening `---` is line 1, and the parser refuses a
 * brief that does not open with it). An engine refusal that names a key (`surfaces.light.base: …`) or quotes one is
 * found in the front matter by name. A JavaScript error out of the engine (a `TypeError` on a missing key) names no
 * line, so it is never guessed at: a wrong line is worse than none.
 */
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import { hexToRgb, rgbToOklch } from '@prism3/engine/color';
import { parseDesignMd } from '@prism3/engine/design-md';
import { parseStandardDesignMd, standardToBrandInput, isStandardDesignMd } from '@prism3/engine/standard-design-md';

// ---- the brands a start path makes ------------------------------------------------------------------

/** The starting point a color seeds: one mid-indigo primary and a derived neutral, action defaults to primary, the
 *  namespace at the `prism` placeholder. Only its id, root and modes reach a seeded brand: `seedFromColor` replaces the
 *  primary and the neutral. Unchanged from `main.ts`'s `NEW_BRAND`, so the color path writes the same bytes. */
const NEW_BRAND = (): BrandInput => ({
  id: 'untitled', root: 'prism',
  modes: ['light'],
  primary: { l: 0.55, c: 0.15, h: 262 },
  neutral: { hue: 262, chroma: 0.006, auto: true },
});

/** Seed a fresh brand from one hex color: the color's OKLCH becomes the primary, and the neutral leans to its hue. */
export const seedFromColor = (hexVal: string): BrandInput => {
  const o = rgbToOklch(hexToRgb(hexVal));
  return { ...NEW_BRAND(), primary: o, neutral: { hue: o.h, chroma: 0.006 } };
};

/** "Start with a neutral default" (owner decision G13 A): a neutral gray primary and every default, concept v6's Blank
 *  (`l 0.5, c 0.03, h 250`, its neutral at hue 250 and chroma 0.004). The neutral follows the primary's hue, as every
 *  new brand's does. It replaced `NEW_BRAND()`, a saturated indigo, which the card's own words called neutral. */
export const BLANK_BRAND = (): BrandInput => ({
  id: 'untitled', root: 'prism',
  modes: ['light'],
  primary: { l: 0.5, c: 0.03, h: 250 },
  neutral: { hue: 250, chroma: 0.004, auto: true },
});

// ---- the color card's hex ---------------------------------------------------------------------------

/** What a bad hex shows (owner decision S3). */
export const HEX_ERROR = 'Enter a hex color as #rrggbb.';
/** The hex the color card starts from, or null when the field does not hold one. Six digits after a `#`; spaces
 *  around it are ignored. The color picker only writes this form, so a refusal is always about the typed text. */
export const readHex = (text: string): string | null => {
  const t = text.trim();
  return /^#[0-9a-f]{6}$/i.test(t) ? t : null;
};

// ---- the guard (owner decisions G15 A, S10) ---------------------------------------------------------

/** The guard's three strings, for `n` edits to `brand`, replaced by `choice`. The approved wording is plural; one
 *  edit takes its singular form. */
export type GuardText = { readonly title: string; readonly body: string; readonly discard: string };
export const guardText = (brand: string, choice: string, n: number): GuardText => ({
  title: `Replace ${brand} with ${choice}?`,
  body: n === 1
    ? `1 edit to ${brand} is not saved to a file. Export or apply first to keep it.`
    : `${n} edits to ${brand} are not saved to a file. Export or apply first to keep them.`,
  discard: n === 1 ? 'Discard 1 edit' : `Discard ${n} edits`,
});

// ---- design.md import --------------------------------------------------------------------------------

/** An import refused: what to say, and the file line it is about, when one is known. */
export type ImportError = { readonly text: string; readonly line: number | null };
export type ImportResult = { readonly input: BrandInput } | { readonly error: ImportError };

/** The empty paste box (owner decision S2). */
export const PASTE_EMPTY = 'Paste a design.md brief or choose a file first.';

/** The words a designer reads: "Line ‹n›: " ahead of the message when the line is known (S7), and a closing period
 *  when the message has none. */
export const importErrorText = (e: ImportError): string => {
  const t = /[.!?]$/.test(e.text.trim()) ? e.text.trim() : `${e.text.trim()}.`;
  return e.line ? `Line ${e.line}: ${t}` : t;
};

/** A comment-free front-matter line: the parser's own rule, a `#` at the start or after a space. */
const uncommented = (line: string): string => line.replace(/(^|\s)#.*$/, '$1');
const indentOf = (line: string): number => line.length - line.trimStart().length;
const isKey = (line: string, key: string): boolean => {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*(?:- )?["']?${esc}["']?\\s*:`).test(uncommented(line));
};

/** The file line an engine message is about, or null. `internal`: the engine threw a JavaScript error rather than a
 *  refusal of its own, which names no line. */
export const errorLine = (text: string, message: string, internal: boolean): number | null => {
  if (/must open with a '---'/.test(message)) return 1;
  const at = /\bat line (\d+)\b/.exec(message);
  if (at) return Number(at[1]) + 1;
  if (internal) return null;
  const lines = text.split('\n');
  if (lines[0]?.trim() !== '---') return null;
  const close = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  const end = close < 0 ? lines.length : close;

  // A dotted path the message opens with ("surfaces.light.base: …"): each segment a key nested under the last, or
  // the rest of the path inside a one-line `{ … }` on the line that opens it.
  const path = /^([A-Za-z][\w-]*(?:\.[\w-]+)*)\s*:/.exec(message)?.[1];
  if (path) {
    let found: number | null = null;
    let from = 1;
    let indent = -1;
    for (const seg of path.split('.')) {
      let hit = -1;
      for (let i = from; i < end; i++) {
        const raw = lines[i];
        if (!uncommented(raw).trim()) continue;
        if (found !== null && indentOf(raw) <= indent) break;   // left the block the last segment opened
        if (isKey(raw, seg) && (found !== null || indentOf(raw) === 0)) { hit = i; break; }
      }
      if (hit < 0) break;
      found = hit + 1;
      indent = indentOf(lines[hit]);
      from = hit + 1;
      if (/\{/.test(uncommented(lines[hit]).split(':').slice(1).join(':'))) break;   // the rest is on this line
    }
    if (found !== null) return found;
  }

  // A quoted name: first as a key, then as a whole word in a value.
  for (const m of message.matchAll(/'([^'\n]+)'|"([^"\n]+)"|`([^`\n]+)`/g)) {
    const q = (m[1] ?? m[2] ?? m[3]).trim();
    if (q.length < 2) continue;
    for (let i = 1; i < end; i++) if (isKey(lines[i], q)) return i + 1;
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const word = new RegExp(`(^|[^\\w-])${esc}($|[^\\w-])`);
    for (let i = 1; i < end; i++) if (word.test(uncommented(lines[i]))) return i + 1;
  }
  return null;
};

const refusal = (text: string, e: unknown, prefix: string): { error: ImportError } => {
  const message = (e as Error)?.message ?? String(e);
  const internal = e instanceof TypeError || e instanceof ReferenceError || e instanceof RangeError;
  const line = errorLine(text, message, internal);
  // The line is in front now, so the parser's own "at line N" (counted inside the front matter) would contradict it.
  const said = line !== null ? message.replace(/\s+at line \d+\b/, '') : message;
  return { error: { text: `${prefix}${said}`.trim(), line } };
};

/** Engine acceptance IS the validation: parse the design.md, then confirm the engine builds it. Returns the
 *  BrandInput or an error; the working brand is never touched here. (The full schema validator is node-bound, so it
 *  cannot run in the studio; `brandTheme`'s guards cover the rest.)
 *
 *  Mirrors cli.ts's dialect detection (#556): a design.md may be ENGINE-NATIVE (front matter compiles 1:1 to
 *  BrandInput, `parseDesignMd`) or STANDARD (a flat `colors:` hex map, `parseStandardDesignMd` +
 *  `standardToBrandInput`). A top-level flat `colors:` map is the standard dialect; engine-native briefs never have
 *  one. The words around each message are today's, unchanged (moved here from `main.ts`). */
export const validateDesignMd = (text: string): ImportResult => {
  if (!text.trim()) return { error: { text: 'Nothing to import — the file is empty.', line: null } };

  let std;
  try { std = parseStandardDesignMd(text); }
  catch (e) { return refusal(text, e, "That doesn't read as a design.md: "); }
  const isStandard = isStandardDesignMd(std);

  let input: BrandInput;
  if (isStandard) {
    try { input = standardToBrandInput(std).input; }
    catch (e) { return refusal(text, e, `Parsed as a standard-dialect design.md, but couldn't classify '${std.name}': `); }
  } else {
    try { input = parseDesignMd(text).input; }
    catch (e) { return refusal(text, e, "That doesn't read as a design.md: "); }
  }

  try { brandTheme(input); }
  catch (e) { return refusal(text, e, 'Parsed, but the engine rejected it: '); }
  return { input };
};

/** A paste box's check, shared by the brand menu and the start window: an empty box asks for a brief (S2), anything
 *  else is `validateDesignMd`. */
export const validatePaste = (text: string): ImportResult =>
  (text.trim() ? validateDesignMd(text) : { error: { text: PASTE_EMPTY, line: null } });

/** The file pickers' types (owner decision G12 A: all three, as today). */
const MD_FILE_RE = /\.(md|markdown|txt)$/i;
export const IMPORT_ACCEPT = '.md,.markdown,.txt,text/markdown,text/plain';

/** What a file of another type shows, from the start window and the brand menu alike (owner decision S6). It names
 *  the three types the pickers accept (G12 A). */
export const FILE_TYPE_ERROR = 'Choose a .md, .markdown or .txt file.';
/** Is `file` one the pickers accept: a .md, .markdown or .txt name, or a text type. */
export const isDesignMdFile = (file: { name: string; type?: string }): boolean =>
  MD_FILE_RE.test(file.name) || /^text\//.test(file.type || '');

/** Read a chosen file as design.md text, refusing other file types up front (#160). */
export const readDesignMdFile = (file: File): Promise<{ text: string } | { error: string }> => {
  if (!isDesignMdFile(file)) return Promise.resolve({ error: FILE_TYPE_ERROR });
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve({ text: String(r.result ?? '') });
    r.onerror = () => resolve({ error: `Couldn't read "${file.name}".` });
    r.readAsText(file);
  });
};
