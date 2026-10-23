/**
 * The Components page's session state (#2700): which sets are selected, which families are open, and which row has
 * focus. The list (the levers pane) and the focused family (the preview pane) are two mounts, so this module holds the
 * state both read, and tells each when it moves. It lives for the session: a page visit, a repaint or a verdict never
 * resets it, as the chosen set never was (#870).
 *
 * WHAT OPENS ON ITS OWN (call 15 A): every family starts closed; a family opens when one of its sets is selected or
 * when the row is focused, and stays open until it is closed by hand.
 *
 * A SECTION'S SETTINGS START COLLAPSED (#2844, Q439 A; #2905): the disclosure after its sets is closed on open, and stays as the
 * person leaves it for the session, as an open family does.
 *
 * NOTHING IS SELECTED ON OPEN (call 13 A): the three Button families are 1,728 variants, and shouldn't be one click
 * away. Nothing is focused either, so the preview pane opens on the first row.
 */
export type ComponentsPageState = {
  readonly sel: ReadonlySet<string>;
  readonly open: ReadonlySet<string>;
  /** The settings blocks whose disclosure is open (#2844, Q439 A; by section kind since #2905, by block since #2952,
   *  `BlockKey`). Closed on open, remembered for the session. */
  readonly optsOpen: ReadonlySet<string>;
  /** The focused row's key (`GroupRow.key`), or null. */
  readonly focus: string | null;
};

let state: ComponentsPageState = { sel: new Set(), open: new Set(), optsOpen: new Set(), focus: null };
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
export const resetComponentsPage = (): void => { state = { sel: new Set(), open: new Set(), optsOpen: new Set(), focus: null }; };
