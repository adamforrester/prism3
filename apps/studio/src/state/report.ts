/**
 * Report a problem (#2069, owner decision Q116 A): a diagnostic bundle the person can copy, and a link that opens a
 * prefilled GitHub issue in their browser. No backend: the plugin declares no network, so nothing is sent from here;
 * the person reads the bundle, and files it or not.
 *
 * WHAT THE BUNDLE HOLDS: the app's build, `ENGINE_VERSION`, the host, and each operation's latest result from the
 * Activity drawer (its verdict and its lines). **The brand input only when the person opts in** (`includeBrand`, off by
 * default). **No file names and no keys**: the panel never holds the Figma file's name, and `scrub` takes out of every
 * line what could still carry one or a key — a Figma file URL, a long hex or token-shaped run (a key, a token, a
 * hash), and, while the brand is not included, the brand's own words (its `id`, `name` and `root`, which every token
 * name carries as its first segment, and its palette and mode names, #3523). Built from these fields alone, never from a dump of the session.
 *
 * Every string is a DRAFT placeholder (#2069: the placement and copy are the owner's call), in `REPORT_COPY`.
 */

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
};

const REDACTED = '[removed]';

/** Under this length a brand word is matched only as a whole segment (`SEGMENT`), so ordinary words keep their letters. */
const SHORT_WORD = 3;

/** One brand word. A plain string is matched by its length (`SHORT_WORD`); `{ whole }` only ever as a whole segment. */
export type BrandWord = string | { readonly whole: string };

const wordText = (w: BrandWord): string => (typeof w === 'string' ? w : w.whole);

/** The brand's own words, longest first so a word inside another goes second: its `id`, display `name` and token
 *  `root`, and (#3523, Q147 A) each `brandColors[].name` and `customModes[].name`. A word of any length counts (a root
 *  can be one letter, `root: 'g'`); `scrub` matches the short ones only as a whole segment, and a palette or mode name
 *  always so (`{ whole }`), since those are often ordinary words (`tidewater`, `night-watch`). The product's own name is
 *  never one. */
export const brandWords = (brand: Readonly<Record<string, unknown>> | null): BrandWord[] => {
  if (!brand) return [];
  // The product's own name is never the client's: the house brand is named for it, and every result line says it.
  const keep = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && !/^prism3$/i.test(v.trim());
  const words = ['id', 'name', 'root'].map((k) => brand[k]).filter(keep).map((v) => v.trim());
  const names = (k: string): string[] => (Array.isArray(brand[k]) ? (brand[k] as unknown[]) : [])
    .map((e) => (e && typeof e === 'object' ? (e as Record<string, unknown>).name : undefined)).filter(keep).map((v) => v.trim());
  const seen = new Set(words.map((w) => w.toLowerCase()));
  const whole: BrandWord[] = [];
  for (const n of [...names('brandColors'), ...names('customModes')]) {
    if (seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    whole.push({ whole: n });
  }
  return [...new Set(words), ...whole].sort((a, b) => wordText(b).length - wordText(a).length);
};

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** What bounds a brand word as a whole segment: the start or end, `/`, `.`, `-`, any whitespace (a newline or a tab
 *  too: a run's summary spans lines, #3560), a quote, or the punctuation prose puts next to a name — `,` `:` `;` `!` `?`
 *  and brackets (#3525 review: `(light, dark, night-watch)`, `→ light, night-watch;`). A letter or digit never does, so
 *  an ordinary word that holds the name stays whole (`tidewaters`). */
const SEGMENT = `/.\\-\\s"'\`“”‘’,:;!?()\\[\\]{}`;

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
      ? t.replace(new RegExp(`(^|[${SEGMENT}])${escapeRe(w)}(?=$|[${SEGMENT}])`, 'gi'), '$1[brand]')
      : t.replace(new RegExp(escapeRe(w), 'gi'), '[brand]');
  }
  return t;
};

/** The bundle, as Markdown, ready to paste into an issue. */
export const buildReport = (r: ReportInput): string => {
  const words = r.includeBrand ? [] : brandWords(r.brand);
  const s = (x: string): string => scrub(x, words);
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

/** The longest issue URL this builds, under the roughly 8 KB at which GitHub refuses a prefilled issue URL, so a longer
 *  body is cut and says where the rest is. `test-report.ts` holds it to a literal ceiling. */
export const URL_LIMIT = 7000;

/** The prefilled issue's URL: the title, and the body cut to fit `URL_LIMIT` with a line saying the full bundle is on
 *  the clipboard (the panel copies it before it opens the link). */
export const issueUrl = (body: string): string => {
  const at = (b: string): string => `${ISSUE_BASE}?title=${encodeURIComponent(REPORT_COPY.issueTitle)}&body=${encodeURIComponent(b)}`;
  if (at(body).length <= URL_LIMIT) return at(body);
  const note = `\n\n${REPORT_COPY.cut}`;
  // A cut never splits a surrogate pair (an emoji in a page name): `encodeURIComponent` throws on half of one.
  const head = (n: number): string => { const c = body.charCodeAt(n - 1); return body.slice(0, n > 0 && c >= 0xd800 && c <= 0xdbff ? n - 1 : n); };
  let lo = 0;
  let hi = body.length;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (at(head(mid) + note).length <= URL_LIMIT) lo = mid; else hi = mid - 1; }
  return at(head(lo) + note);
};

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
  cut: '(The report was cut to fit the link. The full report is on your clipboard: paste it here.)',
} as const;
