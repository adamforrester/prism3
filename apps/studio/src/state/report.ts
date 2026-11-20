/**
 * Report a problem (#2069, owner decision Q116 A): a diagnostic bundle the person can copy, and a link that opens a
 * GitHub issue in their browser. No backend: the plugin declares no network, so nothing is sent from here; the person
 * reads the bundle, and files it or not. The owner (2026-11-17): the issue opens with the title filled in and a body
 * that only says to paste the report, which the panel has put on the clipboard; the link carries none of the report.
 *
 * WHAT THE BUNDLE HOLDS: the app's build, `ENGINE_VERSION`, the host, and each operation's latest result from the
 * Activity drawer (its verdict and its lines). **The brand input only when the person opts in** (`includeBrand`, off by
 * default). **No file names and no keys**: the panel never holds the Figma file's name, and `scrub` takes out of every
 * line what could still carry one or a key — a Figma file URL, a long hex or token-shaped run (a key, a token, a
 * hash), and, while the brand is not included, the brand's own words (its `id`, `name` and `root`, which every token
 * name carries as its first segment, and every other string its author wrote, typeface families included: #3523,
 * #3561, #3697 H4). A thrown write's or prune's line, and every other line that carries a host's message (#3702), keeps
 * only the error's class, not the host's message the drawer shows (`reduceFailure`, #3697 H4). Built from these fields
 * alone, never from a dump of the session.
 *
 * Every string is a DRAFT placeholder (#2069: the placement and copy are the owner's call), in `REPORT_COPY`.
 */
import { isReservedPalette } from '@prism3/engine';

/** Where the prefilled issue opens. The one URL the plugin's main thread will open for a report (`isIssueUrl`). */
export const ISSUE_BASE = 'https://github.com/adamforrester/prism3/issues/new';

/** One operation's latest result, as the Activity drawer holds it. */
export type ReportEntry = { readonly title: string; readonly verdict: string | null; readonly lines: readonly string[]; readonly agent: boolean };

export type ReportInput = {
  /** `PRISM3_BUILD` as stamped: the time, the checkout's tree token and the commit (`build-identity.ts`). */
  readonly stamp: string;
  readonly engine: string;
  readonly host: 'figma' | 'web';
  readonly activity: readonly ReportEntry[];
  /** The brand input the panel holds, or null. Read for its words even when it is not included, so `scrub` can take them out. */
  readonly brand: Readonly<Record<string, unknown>> | null;
  readonly includeBrand: boolean;
  /** The words of every brand the session has held (#3883), not only `brand`: an Activity line is an operation's
   *  latest result, and it stays across brand loads, renames and a failed restore. Scrubbed whether or not `brand` is
   *  included, except the included brand's own words, which the report then carries anyway. Required, so a caller
   *  cannot leave the earlier brands out by forgetting it. */
  readonly seen: readonly BrandWord[];
};

const REDACTED = '[removed]';

/** Under this length a brand word is matched only as a whole segment (`SEGMENT`), so ordinary words keep their letters. */
const SHORT_WORD = 3;

/** One brand word. A plain string is matched by its length (`SHORT_WORD`); `{ whole }` only ever as a whole segment. */
export type BrandWord = string | { readonly whole: string };

const wordText = (w: BrandWord): string => (typeof w === 'string' ? w : w.whole);

/** The engine's own words: every value the brand-input schema closes (`enum`, `const` in `theme-schema.json`). A brand
 *  author picks these from a fixed list (`density: 'comfortable'`, `typography.weights.display: ['strong']`), so they
 *  name no brand, and every line uses them as ordinary words (`display`, `body`, `text`, `light`). Taking them out
 *  would turn a report into `[brand]` and say nothing, so a string leaf holding one is not a brand word.
 *  FAIL-SAFE BY DIRECTION: a value missing here is only taken out when it need not be; a value here the schema does not
 *  close could let an authored word through, so `test-report.ts` holds every entry to the schema's closed values. */
export const ENGINE_VOCABULARY: ReadonlySet<string> = new Set([
  'light', 'dark', 'hc-light', 'hc-dark', 'wireframe', 'linear', 'standard', 'decelerate', 'accelerate', 'expressive', 'calm',
  'default', 'enter', 'exit', 'emphasized', 'snug', 'compact', 'cozy', 'normal', 'relaxed', 'loose', 'tight', 'wide', 'wider',
  'tighter', 'snappy', 'comfortable', 'spacious', 'warm', 'cool', 'pure', 'subtle', 'tinted', 'saturated', 'full', 'reduced',
  'accessible', 'conventional', 'text', '3:1', 'overlay-neutral', 'solid-tint', 'opaque-fill', 'none', 'strong', 'card', 'page',
  'white', 'black', 'floor', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'emphasis', 'max', 'display', 'title', 'body', 'label',
  'caption', 'eyebrow', 'code', 'auto', 'tightest', 'snugger', 'open', 'crisp', 'soft', 'diffuse', 'narrow', 'generous',
  'rounded', 'pill', 'boxed', 'hairline', 'outline', 'underline', 'follow', 'large', 'medium', 'small', 'outlined', 'partial',
  'attached', 'edges', 'match', 'smaller', 'fill', 'sharp', 'modest', 'round', 'energetic', 'premium', 'restrained', 'bold',
  'dense', 'radial', 'circle', 'ellipse', 'oklch', 'srgb',
]);

/** Every string leaf of `v`, at any depth: an object's values and an array's items (never a key). */
const stringLeaves = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const e of v) stringLeaves(e, out);
  else if (v && typeof v === 'object') for (const e of Object.values(v)) stringLeaves(e, out);
  return out;
};

/** The brand's own words, longest first so a word inside another goes second: its `id`, display `name` and token
 *  `root`, then every other string the brand author wrote (#3697 H4, extending #3561's owner decision A: every
 *  brand-authored string is a brand word). That is EVERY string leaf of the input, at any depth, so a field added to
 *  `BrandInput` later is covered without a list to remember: palette, mode, interactive palette and gradient names,
 *  typeface families (a licensed face names the brand, and the plugin's `typefaces unavailable (…)` line prints it),
 *  face pins, color strings and palette references. Not the engine's own words (`ENGINE_VOCABULARY`), and not a reserved
 *  palette (`primary`, `neutral`, the engine's names, `isReservedPalette`). Plus each key of `glassRoles`, the one place
 *  an author names something with a key. A word of any length counts (a root can be one letter, `root: 'g'`); `scrub`
 *  matches the short ones only as a whole segment, and every leaf always so (`{ whole }`), since those are often
 *  ordinary words (`tidewater`, `night-watch`, `lagoon`, `Inter`). The product's own name is never one. */
export const brandWords = (brand: Readonly<Record<string, unknown>> | null): BrandWord[] => {
  if (!brand) return [];
  // The product's own name is never the client's: the house brand is named for it, and every result line says it.
  const keep = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && !/^prism3$/i.test(v.trim());
  const words = ['id', 'name', 'root'].map((k) => brand[k]).filter(keep).map((v) => v.trim());
  const seen = new Set(words.map((w) => w.toLowerCase()));
  const whole: BrandWord[] = [];
  // `gradients: true` is the engine's own default set, not a list the author named: a boolean is no leaf.
  const keys = (k: string): string[] => (brand[k] && typeof brand[k] === 'object' && !Array.isArray(brand[k]) ? Object.keys(brand[k] as object) : [])
    .filter(keep).map((v) => v.trim());
  const leaves = stringLeaves(brand).filter(keep).map((v) => v.trim()).filter((v) => !ENGINE_VOCABULARY.has(v) && !isReservedPalette(v));
  for (const n of [...leaves, ...keys('glassRoles')]) {
    if (seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    whole.push({ whole: n });
  }
  return [...new Set(words), ...whole].sort((a, b) => wordText(b).length - wordText(a).length);
};

/** Several word lists as one (#3883): one entry per word, ignoring case. A plain string wins over `{ whole }` for the
 *  same text (it matches more, so it scrubs at least as much), and the longest words come first, as `brandWords` sorts. */
export const mergeWords = (...lists: ReadonlyArray<readonly BrandWord[]>): BrandWord[] => {
  const by = new Map<string, BrandWord>();
  for (const w of lists.flat()) {
    const k = wordText(w).toLowerCase();
    const had = by.get(k);
    if (!had || (typeof had !== 'string' && typeof w === 'string')) by.set(k, w);
  }
  return [...by.values()].sort((a, b) => wordText(b).length - wordText(a).length);
};

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** What bounds a brand word as a whole segment: the start or end, or any character that is not a letter or a digit, in
 *  any script. So `/`, `.`, `-`, whitespace (a newline or a tab too: a run's summary spans lines, #3560), quotes, the
 *  punctuation prose puts next to a name (#3525 review: `(light, dark, night-watch)`, `→ light, night-watch;`), and the
 *  `|` the plugin joins a face with (`Calibre Office|Regular`, #3697 H4) — every separator, not a list of the ones met
 *  so far. A letter or digit never does, so an ordinary word that holds the name stays whole (`tidewaters`). */
const SEGMENT = '[^\\p{L}\\p{N}]';

/** Take out of one line what could carry a file name or a key. `words`: the brand's words to take out too. */
export const scrub = (text: string, words: readonly BrandWord[] = []): string => {
  let t = text
    // A Figma file or design link names the file and carries its key, with or without its scheme.
    .replace(/(?:https?:\/\/)?(?:www\.)?figma\.com\/\S+/gi, REDACTED)
    // An absolute path names a person (a home folder) and a file.
    .replace(/(?:\/(?:Users|home)\/|\b[A-Za-z]:\\)\S+/g, REDACTED)
    // An email address names a person.
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, REDACTED)
    // A long hex run: a key, a hash, a node's library key.
    .replace(/\b[0-9a-f]{16,}\b/gi, REDACTED)
    // A token-shaped run of 20 or more letters, digits, `-` and `_` holding both a letter and a digit (an API key, a
    // bridge token). A token name never matches: its segments are joined by `/` or `.`, and each is short.
    .replace(/\b(?=[A-Za-z0-9_-]*[0-9])(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{20,}\b/g, REDACTED)
    // A Figma file key with no digit: 22 letters, upper and lower case. A token name never matches: it is lower case.
    .replace(/\b(?=[A-Za-z]*[A-Z])(?=[A-Za-z]*[a-z])[A-Za-z]{22}\b/g, REDACTED);
  for (const bw of words) {
    const w = wordText(bw);
    t = typeof bw !== 'string' || w.length < SHORT_WORD
      ? t.replace(new RegExp(`(^|${SEGMENT})${escapeRe(w)}(?=$|${SEGMENT})`, 'giu'), '$1[brand]')
      : t.replace(new RegExp(escapeRe(w), 'gi'), '[brand]');
  }
  return t;
};

/** A failure line the plugin posts when a write or a prune throws: `write failed: <Class>: <host message>`
 *  (`failureDetail` in `plugin/src/apply-summary.ts`). The class is one word, then `:`, `.` (a build note follows) or the end. */
const FAILED = /^((?:write|prune) failed): (?:([A-Za-z][A-Za-z0-9]*)(?=[:.]|$))?[\s\S]*$/;

/** A failure line as the report carries it: the error's class alone (`write failed: TypeError`), never the host's
 *  message (#3697 H4, D3703.1 B). The Activity drawer shows the message, so the designer keeps Figma's reason, but the
 *  message can carry anything the file holds (a page, a layer, a style), and `scrub` takes out only the words it knows.
 *  A `write failed:` or `prune failed:` line with no class at its head reads `Error`. Every other line that carries a
 *  host's message is cut to its class the same way (#3702, `DETAIL` below); any other line is unchanged. */
const reduceWriteFailure = (line: string): string => line.replace(FAILED, (_, head: string, cls?: string) => `${head}: ${cls ?? 'Error'}`);

/** Every other line that carries a host's message (#3702) carries it as `failureDetail` does, `<Class>: <message>`,
 *  where the class is an error's name (`Error`, `TypeError`, `DependencyBuildError`) or a host's exception
 *  (`DOMException`: Update file's catches post the detail bare, with no head, #4257 review), at the start of the line, after
 *  `: ` (`file setup failed: Error: …`) or after `(` (`Figma refused the write (Error: …)`). The message runs to the end
 *  of its line, so the report keeps the class and cuts the rest; a detail that opened a parenthesis gets it closed. The
 *  cut is `[\s\S]*`, not `.*`: JS's `.` stops at CR, U+2028 and U+2029, and a line holding one went through whole. */
const DETAIL = /(^|: |\()((?:[A-Z][A-Za-z0-9]*)?(?:Error|Exception)): [\s\S]*$/;
/** The class grammar `errorClass` emits (`plugin/src/apply-summary.ts`): one word, a letter first. `DETAIL` above finds a
 *  detail anywhere by its `…Error` or `…Exception` name; after a head a #3702 site is known to post, any class that grammar admits is
 *  one (`DOMException`, a lowercase `invariant`), so the two halves of the contract agree (#3702 review). */
const CLASS = '[A-Za-z][A-Za-z0-9]*';
/** The text each #3702 site posts right before its `failureDetail` (`main.ts`, `prune-figma.ts`'s version note, and since
 *  #4205 Update file's lines in `update-apply.ts` and `canvas-furniture.ts`).
 *  `test-report-redaction.ts` holds this list against every `failureDetail(` site in the plugin's source. */
export const DETAIL_HEADS: readonly string[] = [
  'component build failed: ', 'file setup failed: ', 'style guide failed: ', 'read-back failed: ', 'Cleanup failed: ',
  'Figma refused the write (', 'the engine could not plan it (', 'the named version could not be saved (',
  // #4205: Update file's stopped set (`<set>: stopped (…)`) and its run that threw (`The update failed: …`).
  ': stopped (', 'The update failed: ',
  // #4253: the component build's and Update file's misses, the slot carry, and the style guide's contrast note. Each
  // miss names a layer Prism3 drew, then the host's refusal in `failureDetail` form after one of these words.
  'REFUSED (', 'REFUSED by the slot (', 'NOT MADE (', 'NOT RECORDED (', 'NOT DELETED (', 'could not be cleared (',
  'not cleared (', 'could not be neutralized (', "after the foot pin's resize (", 'after the #865 defaults (',
  'on the combine-time handle (', 'on a freshly-resolved one (', 'marking the leftovers also failed (',
  "slot content on the set (", 'The saved brand did not resolve (', 'Saved brand not restored — ',
];
const HEAD_DETAIL = new RegExp(`(${DETAIL_HEADS.map((h) => escapeRe(h)).join('|')})(${CLASS}): [\\s\\S]*$`);
/** The apply's variable-write note names the variable, then the host's reason as `write-figma.ts` records it, with no
 *  class (`⚠ 3 variable writes refused by Figma (<name>: <reason>)`): the report keeps the name. A name may hold
 *  parentheses (a collision Rename's `… (Prism3)`, #1909), so the name ends at the first `: ` outside them; with none,
 *  nothing inside the parenthesis is kept. The note is a line of its own, and also a clause of the apply's one-line
 *  summary, so the cut runs to the end of the line either way. */
const REFUSED_HEAD = 'variable writes refused by Figma (';
const reduceRefused = (l: string): string => {
  const at = l.indexOf(REFUSED_HEAD);
  if (at < 0) return l;
  const from = at + REFUSED_HEAD.length;
  let depth = 0;
  for (let i = from; i < l.length; i++) {
    if (l[i] === '(') depth++;
    else if (l[i] === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0 && l.startsWith(': ', i)) return `${l.slice(0, i)})`;
  }
  return `${l.slice(0, from)}${REDACTED})`;
};
const reduceLine = (l: string): string => reduceRefused(l)
  .replace(HEAD_DETAIL, (_, head: string, cls: string) => `${head}${cls}${head.endsWith('(') ? ')' : ''}`)
  .replace(DETAIL, (_, at: string, cls: string) => `${at}${cls}${at === '(' ? ')' : ''}`);

export const reduceFailure = (line: string): string => reduceWriteFailure(line).split('\n').map(reduceLine).join('\n');

/** The bundle, as Markdown, ready to paste into an issue. */
export const buildReport = (r: ReportInput): string => {
  // #3883: every brand the session held, not only the one on screen now. With the brand included, its own words stay.
  const own = new Set((r.includeBrand ? brandWords(r.brand) : []).map((w) => wordText(w).toLowerCase()));
  const words = mergeWords(r.includeBrand ? [] : brandWords(r.brand), r.seen).filter((w) => !own.has(wordText(w).toLowerCase()));
  const s = (x: string): string => scrub(reduceFailure(x), words);
  const out: string[] = [
    REPORT_COPY.bodyAsk, '', REPORT_COPY.bodyWhat, '', '', REPORT_COPY.bodyDiag,
    `- ${REPORT_COPY.fieldBuild}: ${s(r.stamp)}`,
    `- ${REPORT_COPY.fieldEngine}: ${s(r.engine)}`,
    `- ${REPORT_COPY.fieldHost}: ${r.host === 'figma' ? REPORT_COPY.hostFigma : REPORT_COPY.hostWeb}`,
    '', REPORT_COPY.bodyActivity,
  ];
  const ran = r.activity.filter((e) => e.verdict !== null);
  if (!ran.length) out.push(REPORT_COPY.noActivity);
  for (const e of ran) {
    out.push(`- ${e.title}${e.agent ? ` (${REPORT_COPY.byAgent})` : ''}: ${s(e.verdict ?? '')}`);
    for (const l of e.lines) out.push(`  - ${s(l)}`);
  }
  if (r.includeBrand && r.brand) out.push('', REPORT_COPY.bodyBrand, '```json', JSON.stringify(r.brand, null, 2), '```');
  return out.join('\n');
};

/** The longest issue URL the plugin's main thread opens (`isIssueUrl`), under the roughly 8 KB at which GitHub refuses a
 *  prefilled issue URL. `test-report.ts` holds it to a literal ceiling. */
export const URL_LIMIT = 7000;

/** The issue's URL (the owner, 2026-11-17): the title, and a body that holds only the line asking for the report to be
 *  pasted. The report itself travels on the clipboard (the panel copies it before it opens the link), so the link is the
 *  same for every report and carries nothing from the session. */
export const issueUrl = (): string =>
  `${ISSUE_BASE}?title=${encodeURIComponent(REPORT_COPY.issueTitle)}&body=${encodeURIComponent(REPORT_COPY.issueBody)}`;

/** The one kind of URL the plugin opens for a report: the issue form on this repo, nothing else. */
export const isIssueUrl = (u: unknown): u is string => typeof u === 'string' && u.length <= URL_LIMIT && u.startsWith(`${ISSUE_BASE}?`);

/** DRAFT copy (#2069), the owner's call, listed in the PR body. */
export const REPORT_COPY = {
  open: 'Report a problem',
  title: 'Report a problem',
  intro: 'This builds a report from this session for an issue on GitHub. Nothing is sent from here: you read it below, then copy it or open a prefilled issue in your browser.',
  brandBox: 'Include the brand\'s settings',
  brandOff: 'The brand\'s settings are left out. Its name and token prefix are replaced with [brand].',
  brandOn: 'The brand\'s settings are included as they are. They can hold a client\'s colors and names.',
  never: 'The report holds no file names and no keys.',
  preview: 'Report',
  copy: 'Copy',
  copied: 'Copied',
  openIssue: 'Open a prefilled issue',
  close: 'Close',
  issueTitle: 'Problem report',
  bodyAsk: '<!-- Say what you did and what you expected. The diagnostics below came from Prism3. -->',
  bodyWhat: '### What happened',
  bodyDiag: '### Diagnostics',
  fieldBuild: 'Build',
  fieldEngine: 'Engine',
  fieldHost: 'Host',
  hostFigma: 'Figma plugin',
  hostWeb: 'Web studio',
  bodyActivity: '### Recent activity',
  noActivity: '- Nothing has run in this session.',
  byAgent: 'agent',
  bodyBrand: '### Brand settings (included by the reporter)',
  // Owner decision Q-RC1 A copy, verbatim (APPROVED 2026-11-17): the title prefilled, the body only asks for the report.
  issueBody: 'Paste the report here — Prism3 copies it to your clipboard as it opens this page. Copy in the Report a problem dialog copies it again.',
} as const;
