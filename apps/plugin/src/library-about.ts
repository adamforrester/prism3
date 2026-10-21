/**
 * THE LIBRARY'S VERSIONS, IN WORDS (#2858, owner decisions Q443 A and Q479).
 *
 * Three readers want the same facts about the library a file holds: which engine and token contract built it, and
 * what changed. This module turns them into words, and draws nothing:
 *
 *   - `aboutContent`: the "About this library" frame on the Cover page (`about-frame.ts`). The engine, the token
 *     contract, the date of the Update that drew it, and what changed in the LATEST release only (Q479.2 A).
 *   - `lastChangedIn`: each set's "Last changed in <version>" block, for the usage panel beside the set (#846). The
 *     newest release whose Figma items name the set, no newer than the plugin's engine; release notes only (Q479.3 A).
 *   - `publishDescription`: the text the plugin offers with a Copy button after an Update, for Figma's Publish library
 *     dialog. No Plugin API call sets a library's publish description (the typings, `@figma/plugin-typings` 1.141.0,
 *     have `saveVersionHistoryAsync(title, description?)` for version history and a per-node `description`, and
 *     nothing that publishes a library or writes its description), so the designer pastes it.
 *
 * THE DATA IS BUNDLED, NOT FETCHED: `docs/public/releases/index.json`, whose `items` carry every Figma and token item of
 * every release (`release-notes.ts`), the same file `release-summary.ts` reads. The plugin has no network allowance for
 * docs, and the notes for the version it runs are fixed at build time.
 *
 * THE EXECUTOR REVISION IS NOT SHOWN (Q479.5 A): it stays in each member's stamp. Item sentences are shown as the
 * release notes generate them (Q479.4 B ships A): "builds differently" names no change, and the follow-up for a
 * one-line reader summary per changed set is #2875.
 *
 * DRAFT wording, an owner item, apart from what the approved wireframe already shows.
 */
import index from '../../../docs/public/releases/index.json';
import { CONTRACT_VERSION, ENGINE_VERSION } from '@prism3/engine/version';

export type ReleaseItem = { class: string; area: string; kind: string; component?: string; text: string };
export type ReleaseEntry = { version: string; from: string; date: string; counts: { breaking: number; new: number; fix: number }; items?: ReleaseItem[] };
export type ReleaseIndex = { releases: ReleaseEntry[] };

/** The bundled release notes. */
export const RELEASES = index as ReleaseIndex;

/** How many "What changed" lines the About frame lists before it counts the rest. */
export const ABOUT_LINES = 6;
/** How many per-set lines the publish description lists before it counts the rest. */
export const PUBLISH_LINES = 10;

const cmp = (a: string, b: string): number => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
};
const plain = (s: string): string => s.replace(/`/g, '');
const n = (k: number, one: string, many = `${one}s`): string => `${k} ${k === 1 ? one : many}`;
const list = (xs: readonly string[]): string => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The releases at or below `version`, newest first. */
const upTo = (version: string, ix: ReleaseIndex): ReleaseEntry[] =>
  ix.releases.filter((r) => cmp(r.version, version) <= 0).sort((a, b) => cmp(b.version, a.version));

/** The release notes for `version`, or the newest before it: a build of `main` between folds runs under the previous
 *  number, whose notes exist. Null when none are that old. */
export const releaseFor = (version: string, ix: ReleaseIndex = RELEASES): ReleaseEntry | null => upTo(version, ix)[0] ?? null;

/** A release's counts as a sentence: "29 new, 1 fix. No breaking changes." */
export const countsLine = (r: ReleaseEntry): string => {
  const parts = [r.counts.new ? `${r.counts.new} new` : '', r.counts.fix ? n(r.counts.fix, 'fix', 'fixes') : ''].filter(Boolean);
  const breaking = r.counts.breaking ? `${n(r.counts.breaking, 'breaking change')}.` : 'No breaking changes.';
  return `${r.version}: ${parts.length ? `${parts.join(', ')}. ` : ''}${breaking}`;
};

/** The longest dotted prefix every name shares, at least two segments, or ''. */
const sharedPrefix = (names: readonly string[]): string => {
  if (!names.length) return '';
  const split = names.map((x) => x.split('.'));
  const out: string[] = [];
  for (let i = 0; split.every((s) => s.length > i + 1 && s[i] === split[0][i]); i++) out.push(split[0][i]);
  return out.length >= 2 ? out.join('.') : '';
};

/**
 * WHAT CHANGED, as the About frame lists it: breaking items first, each in full; new component sets as one line
 * (building blocks, the `_` sets other components nest, are left out, as the wireframe does); every other new Figma
 * item as its sentence; new tokens as one line; fixes last, the sets that build differently as one line. Code items
 * are not in the bundle. At most `ABOUT_LINES`, then a count of the rest.
 */
export const whatChanged = (r: ReleaseEntry): string[] => {
  const items = r.items ?? [];
  const breaking = items.filter((i) => i.class === 'breaking').map((i) => `Breaking: ${plain(i.text)}`);
  const sets = items.filter((i) => i.class === 'new' && i.kind === 'set-added' && i.component && !i.component.startsWith('_')).map((i) => i.component!);
  const otherNew = items.filter((i) => i.class === 'new' && i.area === 'figma' && i.kind !== 'set-added').map((i) => plain(i.text));
  const tokens = items.filter((i) => i.class === 'new' && i.area === 'tokens').map((i) => /`([^`]+)`/.exec(i.text)?.[1] ?? '').filter(Boolean);
  const rebuilt = items.filter((i) => i.class === 'fix' && i.kind === 'set-rebuilt' && i.component).map((i) => i.component!);
  const otherFix = items.filter((i) => i.class === 'fix' && i.kind !== 'set-rebuilt').map((i) => `Fixed: ${plain(i.text)}`);
  const prefix = sharedPrefix(tokens);
  const lines = [
    ...breaking,
    ...(sets.length ? [`${n(sets.length, 'new set')}: ${list(sets)}.`] : []),
    ...otherNew,
    ...(tokens.length === 1 ? [`New token: ${tokens[0]}.`] : tokens.length ? [prefix ? `${tokens.length} new tokens under ${prefix}.` : `${tokens.length} new tokens.`] : []),
    ...(rebuilt.length === 1 ? [`Fixed: ${rebuilt[0]} builds differently.`] : rebuilt.length ? [`Fixed: ${rebuilt.length} sets build differently, ${list(rebuilt)}.`] : []),
    ...otherFix,
  ];
  const more = lines.length - ABOUT_LINES;
  return more > 0 ? [...lines.slice(0, ABOUT_LINES - 1), `And ${more + 1} more in the release notes.`] : lines;
};

/** The About frame's words. `updated` is the date of the Update that drew it, `YYYY-MM-DD`. */
export type AboutContent = {
  title: string;
  rows: { label: string; value: string; note: string }[];
  /** "What changed in 0.237.0", or null when this engine has no release notes. */
  heading: string | null;
  counts: string | null;
  changes: string[];
  footer: string;
};

export const aboutContent = (o: { updated: string; engine?: string; contract?: string; ix?: ReleaseIndex }): AboutContent => {
  const engine = o.engine ?? ENGINE_VERSION;
  const r = releaseFor(engine, o.ix);
  return {
    title: 'About this library',
    rows: [
      { label: 'Engine', value: engine, note: r ? `Released ${r.date}.` : '' },
      { label: 'Token contract', value: o.contract ?? CONTRACT_VERSION, note: 'Changes only when a token name is added, renamed or removed.' },
      { label: 'Updated', value: o.updated, note: 'By Update.' },
    ],
    heading: r ? `What changed in ${r.version}` : null,
    counts: r ? countsLine(r) : null,
    changes: r ? whatChanged(r) : [],
    footer: 'Generated by Prism3. Edits are kept aside on the next Update.',
  };
};

/** An item's sentence without its set's name in front: "`text-field`: `state` has…" → "state has…", and
 *  "`badge` builds differently." → "builds differently.". `lead` capitalizes the second form, whose first word is a
 *  verb; the first form starts on a property's name, which keeps its case. */
const withoutSet = (text: string, set: string, lead = false): string => {
  const t = plain(text);
  if (t.startsWith(`${set}: `)) return t.slice(set.length + 2);
  if (t.startsWith(`${set} `)) { const rest = t.slice(set.length + 1); return lead ? rest.charAt(0).toUpperCase() + rest.slice(1) : rest; }
  return t;
};

/**
 * "LAST CHANGED IN" (Q479.3 A): the newest release, no newer than `engine`, whose Figma items name `set` (the def id,
 * which is the set's name in Figma), with those items' sentences. A set no release names reads "Unchanged since" the
 * oldest release the notes hold, which is a lower bound: the notes start at #2650.
 */
export type LastChanged =
  | { kind: 'changed'; version: string; date: string; items: string[] }
  | { kind: 'unchanged'; since: string }
  | { kind: 'none' };

export const lastChangedIn = (set: string, engine: string = ENGINE_VERSION, ix: ReleaseIndex = RELEASES): LastChanged => {
  const rs = upTo(engine, ix);
  for (const r of rs) {
    const mine = (r.items ?? []).filter((i) => i.area === 'figma' && i.component === set);
    if (mine.length) return { kind: 'changed', version: r.version, date: r.date, items: mine.map((i) => withoutSet(i.text, set, true)) };
  }
  return rs.length ? { kind: 'unchanged', since: rs[rs.length - 1].version } : { kind: 'none' };
};

/** The block's lines: "Last changed in 0.236.0 · 2026-10-10", then the items. Empty when the notes hold nothing. */
export const lastChangedLines = (l: LastChanged): string[] =>
  l.kind === 'changed' ? [`Last changed in ${l.version} · ${l.date}`, ...l.items] : l.kind === 'unchanged' ? [`Unchanged since ${l.since}`] : [];

/**
 * THE PUBLISH DESCRIPTION, offered after an Update. The first sentence is the named version the Update saved before
 * it wrote (`update-apply.ts`'s title, whichever builder made it), then the engine, the engine the file held before
 * (the About frame's own record, when there was one) and the token contract. Then, for each set the Update changed,
 * the Figma items of every release it crossed that name the set: after `from`, up to the engine. With no `from`, the
 * engine's own release. Then whether any of it is breaking, counting the library-consumer breaks the Update listed
 * (#2831) and the breaking release items.
 */
export const publishDescription = (o: {
  title: string; sets: readonly string[]; from?: string | null; engine?: string; contract?: string;
  /** How many changes the Update listed as breaking library consumers (#2831). */
  consumerBreaks?: number; ix?: ReleaseIndex;
}): string => {
  const engine = o.engine ?? ENGINE_VERSION;
  const ix = o.ix ?? RELEASES;
  const crossed = upTo(engine, ix).filter((r) => (o.from ? cmp(r.version, o.from) > 0 : r === releaseFor(engine, ix)));
  const head = `${o.title}. Engine ${engine}${o.from && o.from !== engine ? `, from ${o.from}` : ''}. Token contract ${o.contract ?? CONTRACT_VERSION}.`;
  const lines: string[] = [];
  let breaking = o.consumerBreaks ?? 0;
  for (const set of o.sets) {
    for (const r of crossed) {
      for (const i of (r.items ?? []).filter((x) => x.area === 'figma' && x.component === set)) {
        lines.push(`${set}: ${withoutSet(i.text, set)}`);
        if (i.class === 'breaking') breaking++;
      }
    }
  }
  const more = lines.length - PUBLISH_LINES;
  const shown = more > 0 ? [...lines.slice(0, PUBLISH_LINES - 1), `And ${more + 1} more in the release notes.`] : lines;
  return [head, ...shown, breaking ? `${n(breaking, 'breaking change')} for library consumers.` : 'No breaking changes.'].join('\n');
};
