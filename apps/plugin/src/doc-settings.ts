/**
 * THE FILE'S DOCUMENTATION SETTINGS (#2909 IA v2, owner decisions Q667 A and Q2909.23 A; the cover switch is #2977).
 *
 * Documentation is the panel's area for everything Prism3 writes into the file for people to read: the style guides, the
 * usage panel beside each set, and the cover. It holds settings only, and Update file draws with them, so they must
 * outlive the session and travel with the file: they are kept in the file's root plugin data under one key, and every
 * person who opens the file sees the same ones.
 *
 * WHAT THE MAIN THREAD READS. Two switches: `panels` (draw a usage panel beside each set a build or an update writes) and
 * `cover` (draw and keep the library cover current, and set the file thumbnail). Both are on unless the file says off,
 * so a file set up before this record existed keeps drawing what it always drew. `styleGuide` is the Style guides tab's
 * choices (what to draw, and every option), stored as the panel sent it: the panel turns it into the options a run
 * takes, so the main thread never reads inside it, and keeps it only if it is a plain object under `MAX_BYTES`.
 *
 * Pure: the root is passed in, so a Node test drives it on a fake.
 */

/** The root plugin-data key. */
export const DOC_SETTINGS_KEY = 'prism3:docSettings';
/** The most the record may hold, as JSON. Plugin data is per node and Figma caps it; this stays far under. */
export const MAX_BYTES = 32_000;

export type DocSettings = {
  /** Draw a usage panel beside each set a build or an update writes (#846). */
  readonly panels: boolean;
  /** Draw and keep the library cover current, and set the file thumbnail while it is Figma's default (#2977). */
  readonly cover: boolean;
  /** The Style guides tab's choices, as the panel sent them; `null` until the panel saves some. */
  readonly styleGuide: Record<string, unknown> | null;
};

export const DEFAULT_DOC_SETTINGS: DocSettings = { panels: true, cover: true, styleGuide: null };

type DataRoot = { getPluginData?(key: string): string; setPluginData?(key: string, value: string): void };

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** The settings a parsed value holds: each field that is the right type, the default for every other. */
export const docSettingsOf = (v: unknown): DocSettings => {
  if (!isPlain(v)) return DEFAULT_DOC_SETTINGS;
  return {
    panels: typeof v.panels === 'boolean' ? v.panels : DEFAULT_DOC_SETTINGS.panels,
    cover: typeof v.cover === 'boolean' ? v.cover : DEFAULT_DOC_SETTINGS.cover,
    styleGuide: isPlain(v.styleGuide) && JSON.stringify(v.styleGuide).length <= MAX_BYTES ? v.styleGuide : null,
  };
};

/** The file's settings. A missing, unreadable or malformed record reads as the defaults: never a throw. */
export const readDocSettings = (root: DataRoot): DocSettings => {
  let raw = '';
  try { raw = root.getPluginData?.(DOC_SETTINGS_KEY) ?? ''; } catch { return DEFAULT_DOC_SETTINGS; }
  if (!raw) return DEFAULT_DOC_SETTINGS;
  try { return docSettingsOf(JSON.parse(raw)); } catch { return DEFAULT_DOC_SETTINGS; }
};

/** Keep `next` in the file, normalized. Returns what was kept. A refused write throws, for the caller to report. */
export const writeDocSettings = (root: DataRoot, next: unknown): DocSettings => {
  const s = docSettingsOf(next);
  root.setPluginData?.(DOC_SETTINGS_KEY, JSON.stringify(s));
  return s;
};

/** The cover's outcome when the switch is off: nothing drawn, and the reason. DRAFT wording (#2909 Q2909.10 A). */
export const COVER_OFF = 'not drawn, the cover is off in Documentation';
