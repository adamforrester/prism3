/**
 * WHAT CHANGED IN THIS VERSION, IN THE UPDATE CHECK (#2650, owner decision Q308.1 A).
 *
 * The dry run of an update says what it would do to each set. These lines say why, in the engine's terms: the
 * breaking and new Figma items of the version this plugin builds at, for the sets the check found changes in,
 * read from the release notes the fold wrote (`docs/public/releases/index.json`, its `highlights`). Fixes are
 * left out here; the set's own line already counts what an update rewrites, and the full notes list them.
 *
 * The notes are bundled rather than fetched: the plugin has no network allowance for docs, and the notes for
 * the version it runs are fixed at build time. `lint-release-notes.ts` checks the highlights against git.
 *
 * A version with no release yet (a build of `main` between folds runs under the previous number, whose notes
 * do exist; a version with none at all predates #2650) shows nothing, never an empty heading.
 *
 * DRAFT wording, an owner item (#2650).
 */
import index from '../../../docs/public/releases/index.json';
import { ENGINE_VERSION } from '@prism3/engine/version';

type Highlight = { component: string; class: string; text: string };
type Index = { releases: { version: string; md: string; highlights: Highlight[] }[] };

/** How many items the summary names before it counts the rest. */
export const WHAT_CHANGED_LINES = 5;

/** The lines for the sets named, breaking first. Empty when the version has no notes or none touch these sets. */
export const whatChangedLines = (sets: readonly string[], version: string = ENGINE_VERSION, ix: Index = index as Index): string[] => {
  const entry = ix.releases.find((r) => r.version === version);
  if (!entry) return [];
  const mine = entry.highlights.filter((h) => sets.includes(h.component))
    .sort((a, b) => (a.class === b.class ? 0 : a.class === 'breaking' ? -1 : 1));
  if (!mine.length) return [];
  const plain = (s: string): string => s.replace(/`/g, '');
  const more = mine.length - WHAT_CHANGED_LINES;
  return [
    `What changed in ${version} for these sets:`,
    ...mine.slice(0, WHAT_CHANGED_LINES).map((h) => `${h.class === 'breaking' ? 'Breaking' : 'New'}: ${plain(h.text)}`),
    ...(more > 0 ? [`${more} more in the full notes.`] : []),
    `Full notes: docs/public/releases/${entry.md}`,
  ];
};
