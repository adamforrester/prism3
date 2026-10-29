/**
 * The Components page's session state (#2700): which families are open, and which row has focus. What is chosen to add is
 * not the session's: it is the file's add queue (#3129 Q833 A), so the selection #2700 kept here is retired.
 * The list (the levers pane) and the focused family (the preview pane) are two mounts, so this module holds the
 * state both read, and tells each when it moves. It lives for the session: a page visit, a repaint or a verdict never
 * resets it, as the chosen set never was (#870).
 *
 * WHAT OPENS ON ITS OWN (call 15 A): every family starts closed; a family opens when one of its sets is queued from its
 * box or when the row is focused, and stays open until it is closed by hand.
 *
 * A SECTION'S SETTINGS START COLLAPSED (#2844, Q439 A; #2905): the disclosure after its sets is closed on open, and stays as the
 * person leaves it for the session, as an open family does.
 *
 * NOTHING IS FOCUSED ON OPEN, so the preview pane opens on the first row.
 */
export type ComponentsPageState = {
  readonly open: ReadonlySet<string>;
  /** The settings blocks whose disclosure is open (#2844, Q439 A; by section kind since #2905, by block since #2952,
   *  `BlockKey`). Closed on open, remembered for the session. */
  readonly optsOpen: ReadonlySet<string>;
  /** The focused row's key (`GroupRow.key`), or null. */
  readonly focus: string | null;
};

let state: ComponentsPageState = { open: new Set(), optsOpen: new Set(), focus: null };
const watchers = new Set<() => void>();

export const componentsPage = (): ComponentsPageState => state;

/** Move the state and tell both panes. */
export const setComponentsPage = (patch: Partial<ComponentsPageState>): void => {
  state = { ...state, ...patch };
  for (const f of watchers) f();
};

/** Be told when the state moves. Returns the release. */
export const watchComponentsPage = (f: () => void): (() => void) => { watchers.add(f); return () => watchers.delete(f); };

/** Back to the page's opening state (tests). */
export const resetComponentsPage = (): void => { state = { open: new Set(), optsOpen: new Set(), focus: null }; };
