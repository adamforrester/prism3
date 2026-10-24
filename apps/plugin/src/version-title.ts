/**
 * THE NAMED VERSION EVERY COMMAND SAVES BEFORE IT CHANGES THE FILE (#2828, owner decision Q442 A).
 *
 * Update, Build, Style guide and Apply theme each save one Figma version before their first write, so every run that
 * changes the file has a restore point. The title says what ran and how much, in a verb phrase after a common marker
 * ("Saved before Prism3 updated 47 sets"); the engine version and the details go in the description, where length
 * costs nothing. The wording is the owner's.
 *
 * THE ONE PLACE A VERSION IS SAVED. `saveVersion` is the only caller of `saveVersionHistoryAsync` in the plugin's
 * source, so the title and description cannot drift between commands. `test-version-title.ts` scans for a second
 * caller and fails by name.
 */
import { ENGINE_VERSION } from '@prism3/engine/version';
import type { ComponentDef } from '@prism3/engine/component-schema';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { missingDependencies, presentNames, type DepHost } from './build-deps';

/** A set the run touches: `set` is the id the list in the description uses, `name` the display name a one-set title uses. */
export type NamedSet = { set: string; name?: string };

export type VersionRun =
  | { run: 'update'; sets: readonly NamedSet[]; pageOrder?: boolean; about?: boolean; cover?: boolean; pageMoves?: boolean }
  | { run: 'setup'; sets: readonly NamedSet[] }
  | { run: 'build'; sets: readonly NamedSet[] }
  | { run: 'style-guide'; tables: number }
  | { run: 'apply-theme' };

export const MARKER = 'Saved before Prism3';

const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 's'}`;

/** The title and the description for a run. Pure: the text the owner approved, by case. */
export const versionOf = (r: VersionRun): { title: string; description: string } => {
  const engine = `Engine ${ENGINE_VERSION}.`;
  if (r.run === 'style-guide') return { title: `${MARKER} drew style guides`, description: `${engine} ${plural(r.tables, 'table')}.` };
  if (r.run === 'apply-theme') return { title: `${MARKER} applied the theme`, description: `${engine} Variables and styles.` };
  // DRAFT wording for the owner (#2989): Set up file saves one only when it moves sets to their pages.
  if (r.run === 'setup') return { title: `${MARKER} set up the file`, description: `${engine} Sets moved to their pages: ${r.sets.map((s) => s.set).join(', ')}.` };
  const n = r.sets.length;
  const verb = r.run === 'update' ? 'updated' : 'added';
  const what = n === 1 ? (r.sets[0].name ?? r.sets[0].set) : n > 1 ? `${n} sets` : r.run === 'update' && r.pageOrder ? 'the page order' : 'the file';
  const list = n > 1 ? ` Sets: ${r.sets.map((s) => s.set).join(', ')} (${n}).` : '';
  const pages = r.run === 'update' && r.pageOrder && n > 0 ? ' Page order.' : '';
  // The About frame (#2858) and the library cover (#2859) ride the description, never the title. An Update that is
  // only either saves no version (Q498 B), so neither is ever all a title has to name.
  const page = r.run === 'update' ? `${r.about ? ' About frame.' : ''}${r.cover ? ' Cover.' : ''}${r.pageMoves ? ' Sets moved to their pages.' : ''}` : '';
  return { title: `${MARKER} ${verb} ${what}`, description: `${engine}${list}${pages}${page}` };
};

export type VersionHost = { saveVersionHistoryAsync?(title: string, description?: string): Promise<unknown> };

/** Save the version for `run`, or throw: a host that cannot save one, or refuses, leaves the caller to write nothing. */
export const saveVersion = async (host: VersionHost, run: VersionRun): Promise<{ title: string; description: string }> => {
  if (!host.saveVersionHistoryAsync) throw new Error('this host cannot save a version');
  const v = versionOf(run);
  await host.saveVersionHistoryAsync(v.title, v.description);
  return v;
};

/** Build: the def and every missing set it nests, which the build adds first (#1633), read before anything is written. */
export const saveBeforeBuild = (
  host: VersionHost & DepHost,
  root: ComponentDef,
  ctx: { defs: readonly ComponentDef[]; project: (def: ComponentDef) => AnatomyPlan[] },
): Promise<{ title: string; description: string }> => {
  const present = presentNames(host);
  const deps = missingDependencies(root, { defs: ctx.defs, project: ctx.project, present: (n) => present.has(n) });
  return saveVersion(host, { run: 'build', sets: [...deps.map((d) => d.def), root].map((d) => ({ set: d.id, name: d.name })) });
};
