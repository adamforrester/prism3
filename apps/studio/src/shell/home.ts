/**
 * The plugin's homes (#2879; the owner's Q485 C, and Q613 A on all ten wireframe questions): what the plugin shows in a
 * file with no brand when the start window is not the answer.
 *
 *   · THE LIBRARY HOME. The file uses a published Prism3 library and holds no Prism3 tokens of its own (the main thread's
 *     `file-kind.ts` decided it, by a stamp Prism3 wrote). It opens with no dialog: the library, the evidence on this
 *     page, the agent link, and "Set up a brand in this file…", which opens the start window (its X comes back here).
 *     Audit and Rebind are later PRs (Q613 4 and 5).
 *   · THE MINIMAL HOME, where the start window's X lands on a first run (Q613 6 A). No brand is loaded or created, and
 *     nothing is written to the file (Q613 10 A: nothing remembers the X either).
 *   · READING, while the main thread reads the current page (at most 1.5 s, Q613 2 A), so neither the start window nor a
 *     home flashes open and then away.
 *
 * WHAT IT OWNS. The home's region and its words; `frame.ts` mounts it once, shows it in the `home` layout, and paints it
 * from the view `main.ts` lends. THE AGENT LINK IS NOT DRAWN HERE: the card holds a stable, empty slot (`home-agent`),
 * which the plugin's own entry fills with a switch on the same main-thread state as the bar's Agent tile
 * (`apps/plugin/src/agent-link-ui.ts`; Q613 3 A). The web build carries none of it, and neither home opens on the web
 * (Q613 7 A).
 *
 * The copy is the wireframe's (`docs/voice-standard.md` §4, plugin register). Each line is a pure function of the view,
 * exported, so a test reads the words without a DOM.
 */
import type { LibraryFileView } from '../write-adapter';
import { h, hook } from './dom';

export type HomeView =
  | { readonly kind: 'reading' }
  | { readonly kind: 'none' }
  | { readonly kind: 'library'; readonly library: LibraryFileView };

/** The wireframe's words (#2879, approved with Q613). */
export const HOME_COPY = {
  reading: 'Reading this file',
  noneTitle: 'No brand in this file',
  noneLine: 'Prism3 writes nothing to this file until a brand starts. The agent link, Theme and Activity work without one.',
  noneStart: 'Start a brand…',
  noneBar: 'No brand',
  libraryBadge: 'Library file',
  libraryStart: 'Set up a brand in this file…',
  agentTitle: 'Agent link',
  /** The library's name when the team-library list could not give one. */
  unnamed: 'Prism3 library',
} as const;

const num = (n: number): string => n.toLocaleString('en-US');
const plural = (n: number, one: string, many: string): string => `${num(n)} ${n === 1 ? one : many}`;

/** The library's name, as the bar and the home's heading show it. */
export const libraryTitle = (l: LibraryFileView): string => l.name ?? HOME_COPY.unnamed;

/** The version line: one version, a range, or why there is none. */
export const libraryMeta = (l: LibraryFileView): string => {
  const v = l.versions;
  if (v.length === 1) return `Prism3 library · built by Prism3 ${v[0]}`;
  if (v.length > 1) return `Prism3 library · built by Prism3 ${v[0]}–${v[v.length - 1]} (${v.length} versions on this page)`;
  // DRAFT (#2879): when only variables from it are on this page, no component was there to carry a stamp.
  return l.instances > 0
    ? 'Prism3 library · version not recorded — its components carry no build stamp'
    : 'Prism3 library · version not recorded — no component from it is on this page';
};

/** The evidence: what on THIS page comes from the library. */
export const libraryEvidence = (l: LibraryFileView): string => {
  const parts = [l.instances > 0 ? plural(l.instances, 'instance', 'instances') : null,
    l.bindings > 0 ? plural(l.bindings, 'variable binding', 'variable bindings') : null].filter((x): x is string => !!x);
  return `This page uses ${parts.join(' and ')} from it. The file has no Prism3 variables of its own.`;
};

export type Home = {
  /** The home's region, the page's `main` while it shows. */
  readonly node: HTMLElement;
  readonly paint: (v: HomeView) => void;
};

/** Mount the home's region once. `startBrand` opens the start window from either home. */
export const mountHome = (startBrand: () => void): Home => {
  const node = hook(h('main', 'p3-home'), 'home');
  node.tabIndex = -1;
  const col = h('div', 'p3-home-col');
  const head = hook(h('div', 'p3-home-head'), 'home-head');
  const title = hook(h('h1', 'p3-home-title'), 'home-title');
  const meta = hook(h('p', 'p3-home-meta'), 'home-meta');
  const line = hook(h('p', 'p3-home-meta'), 'home-line');
  head.append(title, meta, line);
  // Reading: a status line, announced once as it appears.
  const reading = hook(h('p', 'p3-home-reading'), 'home-reading');
  reading.setAttribute('role', 'status');
  const spin = h('span', 'p3-spin');
  spin.setAttribute('aria-hidden', 'true');
  reading.append(spin, h('span', undefined, HOME_COPY.reading));
  // The agent link's card: its slot is filled by the plugin's entry, never by this file.
  const agentCard = hook(h('section', 'p3-home-card'), 'home-agent-card');
  agentCard.setAttribute('aria-label', HOME_COPY.agentTitle);
  agentCard.append(hook(h('div', 'p3-home-agent'), 'home-agent'));
  const start = hook(h('button', 'p3-btn p3-btn-page'), 'home-start');
  start.type = 'button';
  start.onclick = () => startBrand();
  const row = h('div', 'p3-home-row');
  row.append(start);
  col.append(reading, head, agentCard, row);
  node.append(col);

  const paint = (v: HomeView): void => {
    node.dataset.kind = v.kind;
    reading.hidden = v.kind !== 'reading';
    head.hidden = v.kind === 'reading';
    row.hidden = v.kind === 'reading';
    agentCard.hidden = v.kind !== 'library';
    if (v.kind === 'none') {
      title.textContent = HOME_COPY.noneTitle;
      meta.textContent = HOME_COPY.noneLine;
      line.hidden = true;
      start.textContent = HOME_COPY.noneStart;
      start.className = 'p3-btn p3-btn-primary';
    } else if (v.kind === 'library') {
      title.textContent = libraryTitle(v.library);
      meta.textContent = libraryMeta(v.library);
      line.hidden = false;
      line.textContent = libraryEvidence(v.library);
      start.textContent = HOME_COPY.libraryStart;
      start.className = 'p3-btn p3-btn-ghost';
    }
  };
  return { node, paint };
};
