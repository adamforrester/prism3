/**
 * Prism3 — the shared browser reader for the shadcn gates 1 and 2 (#2997 PR 2).
 *
 * Loads one emitted shadcn CSS file into headless Chromium and reads colors back as 8-bit sRGB, through the browser's
 * own CSS parser and its canvas, so neither gate converts a color with `color.ts`, the code the projector uses.
 *
 * Playwright is loaded at run time from the workspace (it is an `apps/studio` and `apps/plugin` devDependency, #767),
 * the way `tools/block-capture` loads it. The engine package itself still declares no dependency.
 */
export type Rgba = [number, number, number, number];
export type ShadcnPage = {
  /** Each expression's color, drawn alone on a cleared canvas: [r, g, b, alpha byte]. */
  read: (mode: 'light' | 'dark', exprs: readonly string[]) => Promise<Rgba[]>;
  /** Each [ink, ground] pair, the ground drawn opaque and the ink composited over it: the opaque [r, g, b] pair. */
  over: (mode: 'light' | 'dark', pairs: ReadonlyArray<readonly [string, string]>) => Promise<Array<{ ink: Rgba; ground: Rgba }>>;
  close: () => Promise<void>;
};

export const openShadcnPage = async (css: string): Promise<ShadcnPage> => {
  let chromium: { launch: () => Promise<any> };
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('playwright did not load. It is an apps/studio devDependency (#767): run `npm ci` at the repo root.');
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body><div id="probe"></div></body></html>`);
  // A string, not a function: tsx's transform would inject helpers (`__name`) the page does not have.
  await page.evaluate(`(() => {
    const el = document.getElementById('probe');
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    const g = cv.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
    const resolve = (expr) => { el.style.color = ''; el.style.color = expr; return getComputedStyle(el).color; };
    const px = () => Array.from(g.getImageData(0, 0, 1, 1).data);
    window.__shadcn = {
      read: (exprs) => exprs.map((e) => { g.clearRect(0, 0, 1, 1); g.fillStyle = resolve(e); g.fillRect(0, 0, 1, 1); return px(); }),
      over: (pairs) => pairs.map(([ink, ground]) => {
        g.clearRect(0, 0, 1, 1);
        g.fillStyle = resolve('oklch(from ' + ground + ' l c h / 1)'); g.fillRect(0, 0, 1, 1);
        const gp = px();
        g.fillStyle = resolve(ink); g.fillRect(0, 0, 1, 1);
        return { ink: px(), ground: gp };
      }),
    };
  })()`);
  const call = (fn: 'read' | 'over', mode: 'light' | 'dark', arg: unknown) =>
    page.evaluate(`(() => { document.documentElement.className = ${JSON.stringify(mode === 'dark' ? 'dark' : '')}; return window.__shadcn.${fn}(${JSON.stringify(arg)}); })()`);
  return {
    read: (mode, exprs) => call('read', mode, exprs),
    over: (mode, pairs) => call('over', mode, pairs),
    close: () => browser.close(),
  };
};

/** WCAG 2 contrast of two opaque 8-bit sRGB colors, written here rather than imported, so the gates share no color
 *  code with the projector. */
export const wcagRatio = (a: readonly number[], b: readonly number[]): number => {
  const lum = (c: readonly number[]): number => {
    const [r, g, bl] = [c[0]!, c[1]!, c[2]!].map((v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const la = lum(a) + 0.05, lb = lum(b) + 0.05;
  return Math.max(la, lb) / Math.min(la, lb);
};

/** Floored to two places, the way the engine reports a ratio. */
export const floor2 = (r: number): number => Math.floor(r * 100) / 100;
