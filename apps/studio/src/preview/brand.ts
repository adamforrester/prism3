/**
 * Brand, the preview (UI redesign S3; concept v6's Brand page, V1, R4): the Style guide, the page's one home.
 *
 * A LENT LEGACY RENDERER. The Style guide is `renderPreviewStyleGuide` in `main.ts`, which this module must
 * not import (plan §3.10). So `main.ts` lends it at mount, the way S1.3 lends Inspect its Contrast table and
 * token list (`InspectLegacy`), and this module calls it into a host pinned light: it draws in `styles.css`,
 * which has no dark theme (D2). The renderer takes the repaint it should call when its own control (the
 * ground select) changes, so it never reaches for a legacy tier.
 *
 * SPECIMENS SIT ON THE BRAND'S PAGE (plan §9.1, S2's check). Each of the Style guide's grounds is a specimen
 * root (`data-p3="specimen"`), painted with the brand's own `background.primary` for the mode the preview
 * shows (on the default Page ground), never with the chrome's card.
 *
 * HOW IT REPAINTS: by store subscription (`brand`, `mode`), never through a legacy tier. Nothing else moves
 * it: no scroll, no focus, no lever (V1).
 */
import { subscribe } from '../state/store';
import { h, hook } from '../shell/dom';
import type { HostFonts } from '../ui/fonts';
import type { SetBuild } from '../state/host-session';
import type { SetStatus } from '../state/update-file';
import type { BuildRun, RunKind } from '../state/build-queue';

/** What `main.ts` lends the moved pages' previews until their slices replace the legacy renderers. */
export type PageLends = {
  /** The Style guide (`renderPreviewStyleGuide`). Its ground select calls `repaint` to redraw it in place. */
  readonly styleGuide: (host: HTMLElement, repaint: () => void) => void;
  /** What the host has said about its fonts (S6.2: Type's library and its type-ahead). Empty on the web. */
  readonly fonts: () => HostFonts;
  /** The component-set builds (S8.2): whether a build runs now (the panel's or an agent's), each set's result from
   *  this session (`true` clean, `false` with problems, `undefined` not built), and the build itself, which refuses
   *  while one runs and for a set that can't be built. The Components page reads them here so it never imports
   *  `main.ts`; on the web nothing builds, so `busy` is false and `run` posts nothing. It repaints from the `host`
   *  and `host:components` topics. */
  readonly sets: {
    readonly busy: () => boolean;
    /** An agent's build runs (the action bar waits and says so, #2700). */
    readonly agentBusy: () => boolean;
    /** #3170 Q3170.3 A: why the page's writes to the file (the add queue's boxes) are off now, or null. */
    readonly off: () => string | null;
    readonly lastOf: (id: string) => SetBuild | undefined;
    /** Build these sets, one after another (#2700). Refuses while a build runs, and drops a set that can't be built. */
    readonly run: (kind: RunKind, ids: readonly string[]) => void;
    /** Stop the run after the set it is building (call 16 A). */
    readonly stop: () => void;
    /** The run that is out, or null. */
    readonly current: () => BuildRun | null;
    /** The last run that ended in this session, with its verdict, or null. */
    readonly last: () => { readonly run: BuildRun; readonly verdict: { readonly ok: boolean; readonly headline: string; readonly lines: readonly string[] } } | null;
    /** Open the build's result in Activity. */
    readonly showResult: () => void;
    /** #2909 Q2909.8 A: a set's statuses in this file (`state/update-file.ts` `statusesOf`); empty on the web. */
    readonly status: (id: string) => readonly SetStatus[];
    /** #3129 Q833 A: the file's add queue, as the host last read it or the panel last wrote it; null before the host has
     *  said, and on the web. */
    readonly queue: () => readonly string[] | null;
    /** #3129: the sets the file holds, from the host's full read; null before it lands, while only the ledger has
     *  answered (#3110), after a failed read, and on the web. Components draws its boxes only once this is known. */
    readonly present: () => readonly string[] | null;
    /** #3129: queue `ids` in the file (`on`), or take them out. */
    readonly queueSets: (ids: readonly string[], on: boolean) => void;
  };
};

/** Mount the Brand preview into `host`. */
export const mountBrandPreview = (host: HTMLElement, cleanups: (() => void)[], lend: PageLends): void => {
  const stack = h('div', 'p3-stack p3-preview-stack');
  const card = hook(h('div', 'p3-legacy-card'), 'brand-style-guide');
  card.dataset.theme = 'light';
  stack.append(card);
  host.replaceChildren(stack);
  let painting = false;
  const paint = (): void => {
    if (painting) return;
    painting = true;
    try {
      card.replaceChildren();
      lend.styleGuide(card, paint);
    } finally { painting = false; }
  };
  cleanups.push(subscribe('brand', paint), subscribe('mode', paint), subscribe('fonts', paint));   // fonts: the type sample's faces (#3138)
  paint();
};
