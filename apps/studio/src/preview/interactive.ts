/**
 * Color › Interactive, the preview (UI redesign S5.2).
 *
 * WHAT IT SHOWS, in the legacy Style guide's markup (owner direction for the Color previews, as S4a's
 * Surfaces & fills): the Style guide's **Interactive** section, drawn by the SAME code the Style guide draws
 * it with (`preview/sections/interactive.ts`), with every column the brand ships, accents included (owner
 * decision Q39), and the Text row (Q32); the shared **Disabled** section; and **Links**, the link role in each
 * state on the page and on the inverse fill. Every token chip carries its ratio badge (owner decision Q5).
 * No Icons section (S5.3, the owner's QA-I10): the icon contrast control left the levers, so the preview's
 * sections still match the levers' one for one (Q23).
 *
 * THE BADGE MARKS (S5.3, QA-I2): a pass in the chrome's success icon color, a miss in its danger icon color
 * (`chrome.css`, `.p3-ipv`). The marks sit on the brand's page, or on its inverse fill in an Inverse row, and either
 * can be light or dark, so each mark carries the chrome theme (`data-theme`) whose icon colors are made for a ground
 * of that lightness: the light theme's on a light ground, the dark theme's on a dark one.
 *
 * LEGACY MARKUP IN A LIGHT-PINNED HOST, SPECIMENS ON THE BRAND'S PAGE (plan §9.1), as `preview/surfaces.ts`:
 * each section's ground is a specimen root painted with the brand's own `background.primary` for the mode the
 * preview shows. The section container takes the levers panel's gray (owner decision Q24, `p3-sgsec`).
 *
 * HOW IT REPAINTS: by store subscription (`brand`, `mode`), never through a legacy tier. Nothing else moves
 * it: no scroll, no focus, no lever (V1).
 */
import { brandState, currentMode, rp, subscribe, theme } from '../state/store';
import { resolvedModes } from '../state/verdict';
import { h, hook } from '../shell/dom';
import { LINKS_DESC } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { BUILT_IN_SECTION_COLUMNS, disabledSection, interactiveSection, linksSection } from './sections/index';
import { contrast, hexToRgb } from '@prism3/engine/color';
import { SG_SURFACES, ground, oppositeOf, sgContext, type SgRole } from './sections/kit';

/** WCAG 1.4.11's non-text floor, the one a badge mark is held to on its ground (QA-I2). */
const MARK_MIN = 3;

/** The composited background under `n`, as `#rrggbb`: each ancestor's computed background laid over the next, to the
 *  first opaque one (white past the root). Read from the render, because a mark's ground is whatever is drawn there. */
const groundUnder = (n: Element): string => {
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

/** Every column the brand ships, in the levers' order: Primary, Neutral, Destructive, then each accent by
 *  its column name, named as the levers name it. */
export const previewColumns = (): ReadonlyArray<readonly [string, string]> => [
  ...BUILT_IN_SECTION_COLUMNS,
  ...(brandState.interactivePalettes ?? []).map((e) => { const n = e.name ?? e.palette; return [n.charAt(0).toUpperCase() + n.slice(1), n] as const; }),
];

/** Mount the Interactive preview into `host`. Subscriptions are released through `cleanups`. */
export const mountInteractivePreview = (host: HTMLElement, cleanups: (() => void)[]): void => {
  const stack = hook(h('div', 'p3-stack p3-preview-stack'), 'interactive-preview');
  const card = hook(h('div', 'p3-legacy-card p3-ipv'), 'interactive-style-guide');
  card.dataset.theme = 'light';
  stack.append(card);
  host.replaceChildren(stack);

  const paint = (): void => {
    const all = resolvedModes(theme);
    const rolesByMode = new Map<string, Record<string, SgRole | undefined>>(all.map((x) => [x.mode as string, x.roles as Record<string, SgRole | undefined>]));
    const cur: string = rolesByMode.has(currentMode) ? currentMode : rp.modes[0];
    const c = sgContext({
      rolesByMode, cur, opp: oppositeOf(cur, rp.modes, (m) => rolesByMode.has(m)), namespace: theme.namespace, modeLabel, badges: true,
      paletteHex: (p, s) => theme.palettes.find((x) => x.palette === p)?.steps.find((x) => x.key === s)?.hex ?? null,
    });
    const page = SG_SURFACES[0];
    // Only columns the engine resolved are drawn (an accent whose palette is gone resolves nothing).
    const columns = previewColumns().filter(([, col]) => !!c.role(cur, `interactive.${col}.fill.rest`));
    const secs = [
      interactiveSection(c, { method: theme.outlineInteraction, surface: page.key, columns }),
      disabledSection(c),
      linksSection(c, LINKS_DESC),
    ];
    // Q24: each section's container on the levers panel's gray. A class in the chrome's scope, beside the
    // legacy one, so `styles.css` keeps everything else about the section.
    for (const s of secs) s.classList.add('p3-sgsec');
    card.replaceChildren(...secs.map((s) => ground(c, s, page)));
    markColors();
  };
  /** QA-I2: each badge mark takes the chrome theme whose status icon color (success for a pass, danger for a miss)
   *  contrasts most with the ground the mark is drawn on, measured on the composited ground. Where neither theme's
   *  color reaches 3:1 (a mid-tone page), the mark takes no theme and keeps the badge's own ink, as before S5.3. */
  const markColors = (): void => {
    const read = (t: string): { ok: string; bad: string } => {
      const s = h('span');
      s.dataset.theme = t;
      card.append(s);
      const cs = getComputedStyle(s);
      const out = { ok: cs.getPropertyValue('--p3-ok-icon').trim(), bad: cs.getPropertyValue('--p3-bad-icon').trim() };
      s.remove();
      return out;
    };
    const themes = { light: read('light'), dark: read('dark') };
    const valid = (x: string): boolean => /^#[0-9a-f]{6}$/i.test(x);
    const memo = new Map<string, string | null>();
    for (const mk of card.querySelectorAll<HTMLElement>('.sg-ratio-mk')) {
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
  cleanups.push(subscribe('brand', paint), subscribe('mode', paint));
  paint();
};
