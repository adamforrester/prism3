/**
 * The ratio badges' pass and miss marks in the chrome's status colors (UI redesign S4f; the owner's QA-I2, extended
 * to Color › Surfaces & fills, 2026-10-02): a pass in the chrome's success icon color, a miss in its danger icon
 * color. The badge keeps its own ink and edge; only the mark moves.
 *
 * WHICH THEME'S COLOR. A mark sits on whatever the preview draws under it: the brand's page, its inverse fill, a
 * white container. Any of those can be light or dark, so neither chrome theme's icon color is safe everywhere. Each
 * mark is stamped with the chrome theme (`data-theme`, which re-scopes the chrome's variables to that theme) whose
 * icon color contrasts most with the ground the mark is ACTUALLY drawn on, read from the render: each ancestor's
 * computed background composited over the next, down to the first opaque one. Where neither theme's color reaches
 * 3:1 (WCAG 1.4.11's non-text floor, a mid-tone ground), the mark is not stamped and keeps the badge's own ink, as
 * before. `chrome.css` paints a stamped mark (`.p3-marks .sg-ratio-mk[data-theme]`).
 *
 * THE SAME RULE AS COLOR › INTERACTIVE'S (#2019, S5.3), written as a module so the two can share it: #2019 carries
 * its own copy inside `preview/interactive.ts` (it was open, unmerged, when this landed). Unifying them is moving
 * that preview onto `themeBadgeMarks` and its `.p3-ipv` rule onto `.p3-marks`; the algorithm is the same, line for line.
 */
import { contrast, hexToRgb } from '@prism3/engine/color';
import { h } from '../shell/dom';

/** WCAG 1.4.11's non-text floor, the one a badge mark is held to on its ground. */
export const MARK_MIN = 3;

/** The composited background under `n`, as `#rrggbb`: each ancestor's computed background laid over the next, to the
 *  first opaque one (white past the root). Read from the render, because a mark's ground is whatever is drawn there. */
export const groundUnder = (n: Element): string => {
  type C = { r: number; g: number; b: number; a: number };
  const parse = (s: string): C | null => {
    const m = /^rgba?\(([^)]+)\)$/.exec(s.trim());
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  let acc: C | null = null;
  for (let e: Element | null = n; e; e = e.parentElement) {
    const c = parse(getComputedStyle(e).backgroundColor);
    if (!c || c.a <= 0) continue;
    acc = acc ? { r: acc.r * acc.a + c.r * (1 - acc.a), g: acc.g * acc.a + c.g * (1 - acc.a), b: acc.b * acc.a + c.b * (1 - acc.a), a: acc.a + c.a * (1 - acc.a) } : c;
    if (acc.a >= 0.999) break;
  }
  const f = acc ?? { r: 255, g: 255, b: 255, a: 1 };
  const w = (v: number): number => Math.round(v * f.a + 255 * (1 - f.a));
  return `#${[f.r, f.g, f.b].map((v) => w(v).toString(16).padStart(2, '0')).join('')}`;
};

/** Stamp every badge mark under `host` with its theme, or clear it (see the header). `host` must be in the document,
 *  and carry `p3-marks` for the stamp to paint. */
export const themeBadgeMarks = (host: HTMLElement): void => {
  const read = (t: string): { ok: string; bad: string } => {
    const s = h('span');
    s.dataset.theme = t;
    host.append(s);
    const cs = getComputedStyle(s);
    const out = { ok: cs.getPropertyValue('--p3-ok-icon').trim(), bad: cs.getPropertyValue('--p3-bad-icon').trim() };
    s.remove();
    return out;
  };
  const themes = { light: read('light'), dark: read('dark') };
  const valid = (x: string): boolean => /^#[0-9a-f]{6}$/i.test(x);
  const memo = new Map<string, string | null>();
  for (const mk of host.querySelectorAll<HTMLElement>('.sg-ratio-mk')) {
    const kind = mk.closest('[data-below="true"]') ? 'bad' : 'ok';
    const g = groundUnder(mk);
    const key = `${kind} ${g}`;
    if (!memo.has(key)) {
      let best: string | null = null;
      let bestR = 0;
      for (const t of ['light', 'dark'] as const) {
        const hx = themes[t][kind];
        if (!valid(hx)) continue;
        const r = contrast(hexToRgb(hx), hexToRgb(g));
        if (r > bestR) { bestR = r; best = t; }
      }
      memo.set(key, bestR >= MARK_MIN ? best : null);
    }
    const t = memo.get(key);
    if (t) mk.dataset.theme = t; else delete mk.dataset.theme;
  }
};
