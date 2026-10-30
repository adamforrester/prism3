/**
 * THE BRAND-FACE WEB-FONT LOADER (#3138, owner decision Q1 A). The preview sets a brand's text in CSS, which sees
 * only the faces installed on this device. A face that is on Google Fonts can be loaded instead, so the preview shows
 * the brand's real face rather than a fallback.
 *
 * NETWORK, SO GATED. Every request sits behind `PRISM3_NETWORK`: `true` on the web and in the "Prism3 Studio" plugin,
 * whose manifest allows exactly the two Google Fonts hosts; `false` in "Prism3 Studio Offline", where esbuild drops
 * the request and this module is inert. `lint-network-reach.ts` checks both. Google receives the family name and the
 * viewer's IP address; nothing else is sent.
 *
 * ONE REQUEST PER FAMILY. The CSS API (`/css`, not `/css2`) is asked for all eighteen cuts at once: it answers with
 * the ones the family has and skips the rest, so the reply's `@font-face` rules are also the family's cuts. An
 * unknown family is a 400, and the family stays unloaded: the preview labels its fallback. Each family is asked once
 * per session, whatever the answer.
 *
 * DOM-LIGHT. Nothing runs at import. A load that lands invalidates `fonts`, the topic every brand-face section repaints on.
 */
import { invalidate } from '../state/store';
import { fontAvailable, type FaceCut } from './fonts';

export type WebFace = { readonly status: 'loading' | 'loaded' | 'missing'; readonly cuts: readonly FaceCut[] };

const faces = new Map<string, WebFace>();

/** The cuts a Google Fonts CSS reply declares, deduped and sorted. Pure, so a test can hand it a reply. */
export const cutsOfCss = (css: string): FaceCut[] => {
  const seen = new Map<string, FaceCut>();
  for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
    const w = Number(/font-weight:\s*(\d+)/.exec(block)?.[1]);
    if (!w) continue;
    const italic = /font-style:\s*italic/.test(block);
    seen.set(`${w}${italic ? 'i' : ''}`, { weight: w, italic });
  }
  return [...seen.values()].sort((a, b) => a.weight - b.weight || Number(a.italic) - Number(b.italic));
};

/** What the loader knows about a family: undefined until it is asked for. */
export const webFace = (family: string): WebFace | undefined => faces.get(family);

/** Ask for a family once. A no-op in the offline build, for a generic family, and for one already asked. */
export const requestWebFace = (family: string): void => {
  if (!PRISM3_NETWORK) return;
  if (!family || /^[a-z-]+$/.test(family) || faces.has(family)) return;
  faces.set(family, { status: 'loading', cuts: [] });
  const done = (face: WebFace): void => { faces.set(family, face); invalidate('fonts'); };
  // The request for one family: every cut, `display=swap`. Written inline, inside the `PRISM3_NETWORK` branch, and not
  // in a helper or a module constant: esbuild tree-shakes before it drops a dead branch, so a helper this branch named
  // would survive into the offline bundle with the host in it (`lint-network-reach.ts` failed on both, measured).
  fetch(`https://fonts.googleapis.com/css?family=${encodeURIComponent(family).replace(/%20/g, '+')}:`
    + '100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i&display=swap')
    .then(async (res) => {
      if (!res.ok) return done({ status: 'missing', cuts: [] });
      const css = await res.text();
      const cuts = cutsOfCss(css);
      if (!cuts.length) return done({ status: 'missing', cuts: [] });
      const style = document.createElement('style');
      style.dataset.p3WebFont = family;
      style.textContent = css;
      document.head.append(style);
      await Promise.all(cuts.map((c) => document.fonts.load(`${c.italic ? 'italic ' : ''}${c.weight} 16px "${family}"`).catch(() => [])));
      // A refused file (the CSS arrived, a face did not) leaves the family unpainted: the canvas probe says so.
      done(fontAvailable(family) ? { status: 'loaded', cuts } : { status: 'missing', cuts: [] });
    })
    .catch(() => done({ status: 'missing', cuts: [] }));
};
