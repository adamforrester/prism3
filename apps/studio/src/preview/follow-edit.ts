/**
 * THE EDIT-REVEAL (the owner's QA notes, `decisions-2026-10-01-qa.md` Q4, kept 2026-10-01; extended to every
 * new page by QA-B9, 2026-10-02): when a lever is EDITED, the preview scrolls so what that lever changes is in
 * view. On Color › Palettes that is the palette; on Surfaces & fills and Interactive it is the preview section
 * the lever's section pairs with.
 *
 * ONLY AN EDIT MOVES IT. V1 still holds for everything else: focusing a lever, scrolling either pane and
 * changing the mode never move the preview, and the view itself (its home) never changes: a reveal scrolls the
 * preview body it is handed and nothing else, never a tab, a page or a view. A lever's edit handler notes the
 * edit before it rebuilds (`noteEdit` with the palette on Palettes, `noteSectionEdit` elsewhere); the preview,
 * repainting from the `brand` topic, takes that note and reveals it. Nothing else ever writes a note: the
 * section tracker below only RECORDS where the last interaction in the levers pane happened, and a record
 * moves nothing until an edit handler turns it into a note.
 *
 * WHICH PREVIEW SECTION A LEVER SECTION PAIRS WITH: the Q23 heading pair. A lever section is headed and
 * described as the preview section it drives (owner decision Q23), and `test:chrome` reads those pairs against
 * the rendered preview, so the pairing is already a held contract. The shared-section markers (`sections/kit.ts`) were
 * the other candidate; they were not used because a preview section can be drawn outside `sections/` and carry
 * no marker (Surfaces & fills' Gradients; Interactive's Icons was another until S5.3 removed it), and only
 * `sections/` may write one (`test-shell-imports.ts`). Two lever headings were renamed away from their preview section by the
 * owner (Q26: "Background fills"; Q44: "Foreground fills", the fills the Foreground section draws), and
 * `PREVIEW_HEADING` names their pair. Scrim and Fields (S4f) are headed as their preview sections are, so they
 * need no row. A lever section with no preview section reveals nothing.
 *
 * EASED, ON THE STUDIO'S OWN MOTION TOKENS (QA-B9, QA-B17). `scrollTo({ behavior: 'smooth' })` takes neither a
 * duration nor a curve, so the scroll is stepped here, one position per animation frame, along the chrome's
 * default transition: `--p3-scroll-dur` and `--p3-scroll-ease`, which `chrome.css` sets on the two panes from
 * `--p3-dur-normal` and `--p3-ease` (the default theme's `motion.duration.normal` and
 * `motion.easing-role.default`, the pair its `motion.transition.default` names). A value this cannot read
 * jumps, rather than inventing a curve of its own. The jump links scroll the same way (`scrollToStart`).
 *
 * REDUCED MOTION JUMPS. Under `prefers-reduced-motion: reduce` the scroll lands at once, in one step.
 * `instant`, not `auto`, on every step: `auto` would defer to the pane's CSS `scroll-behavior`, which would make
 * the answer depend on a stylesheet.
 */

// ── the notes ─────────────────────────────────────────────────────────────────────────────────────

let pending: string | null = null;
let pendingSection: string | null = null;
let lastSection: string | null = null;

/** Note the palette an edit changes. The next preview repaint reveals it. */
export const noteEdit = (palette: string | null): void => { pending = palette; };

/** Take the note, once. */
export const takeEdit = (): string | null => { const p = pending; pending = null; return p; };

/** Note that an edit happened, in the lever section the last interaction in the levers pane was in. An edit
 *  handler calls it before it rebuilds; the next preview repaint reveals that section's preview pair. */
export const noteSectionEdit = (): void => { pendingSection = lastSection; };

/** Take the section note, once. */
export const takeSectionEdit = (): string | null => { const s = pendingSection; pendingSection = null; return s; };

/** Drop every note and record: the page they were made on has gone (the frame calls this when it releases
 *  the panes). */
export const dropEdits = (): void => { pending = null; pendingSection = null; lastSection = null; };

/** Record, on `pane`, the lever section each interaction happens in (by its heading). Records only: nothing
 *  here scrolls or notes. Capture phase, so the record is made before the control's own handler edits; a
 *  `change` that commits after a click elsewhere (a text field on blur) records the field's own section,
 *  because its event comes after the click's. Returns the release. */
export const trackLeverSections = (pane: HTMLElement): (() => void) => {
  const rec = (e: Event): void => {
    const t = e.target instanceof Element ? e.target : null;
    lastSection = t?.closest('.p3-lsec')?.querySelector('.p3-lsec-title')?.textContent ?? null;
  };
  const types = ['click', 'input', 'change', 'keydown'] as const;
  for (const t of types) pane.addEventListener(t, rec, true);
  return () => { for (const t of types) pane.removeEventListener(t, rec, true); };
};

// ── the eased scroll ──────────────────────────────────────────────────────────────────────────────

/** Whether the viewer asked for reduced motion. Read on each scroll, so a change to the setting applies at
 *  the next one. */
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A CSS time (`200ms`, `0.2s`) in ms, or NaN. */
const msOf = (v: string): number => {
  const m = /^\s*(-?[\d.]+)(ms|s)\s*$/.exec(v);
  return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : NaN;
};

/** A CSS `cubic-bezier(x1, y1, x2, y2)` as the progress function it names, or null. Solved for x by Newton's
 *  method, falling back to bisection where the slope is too flat to trust. */
export const bezierOf = (v: string): ((x: number) => number) | null => {
  const m = /^\s*cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)\s*$/.exec(v);
  if (!m) return null;
  const [x1, y1, x2, y2] = m.slice(1).map(Number);
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
  const at = (a: number, b: number, t: number): number => ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t;
  const slope = (a: number, b: number, t: number): number => 3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a;
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = at(x1, x2, t) - x;
      if (Math.abs(e) < 1e-6) return at(y1, y2, t);
      const d = slope(x1, x2, t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const e = at(x1, x2, t) - x;
      if (Math.abs(e) < 1e-6) break;
      if (e > 0) hi = t; else lo = t;
      t = (lo + hi) / 2;
    }
    return at(y1, y2, t);
  };
};

/** The running scroll on each element, so a new one (or a release) cancels it. */
const running = new WeakMap<Element, number>();

/** Stop `el`'s running eased scroll where it is. */
export const cancelEasedScroll = (el: Element): void => {
  const id = running.get(el);
  if (id !== undefined) { cancelAnimationFrame(id); running.delete(el); }
};

/** Scroll `el` to `top`: eased along the chrome's motion tokens, or at once under reduced motion. A scroll
 *  the viewer takes over (the position moves off the path between frames) stops the glide where they put it. */
export const easedScrollTo = (el: Element, top: number): void => {
  cancelEasedScroll(el);
  const to = Math.max(0, Math.min(Math.round(top), el.scrollHeight - el.clientHeight));
  const from = el.scrollTop;
  const jump = (): void => el.scrollTo({ top: to, behavior: 'instant' });
  if (Math.abs(to - from) < 1 || reducedMotion()) { jump(); return; }
  const cs = getComputedStyle(el);
  const ms = msOf(cs.getPropertyValue('--p3-scroll-dur'));
  const ease = bezierOf(cs.getPropertyValue('--p3-scroll-ease'));
  if (!(ms > 0) || !ease) { jump(); return; }
  let start: number | null = null;
  let last = from;
  const step = (now: number): void => {
    if (Math.abs(el.scrollTop - last) > 1) { running.delete(el); return; }   // the viewer took over
    start ??= now;
    const p = Math.min(1, (now - start) / ms);
    const y = p >= 1 ? to : Math.round(from + (to - from) * ease(p));
    el.scrollTo({ top: y, behavior: 'instant' });
    last = el.scrollTop;
    if (p < 1) running.set(el, requestAnimationFrame(step)); else running.delete(el);
  };
  running.set(el, requestAnimationFrame(step));
};

/** What scrolls `el` into view: its nearest ancestor that scrolls vertically, else the page. */
const scroller = (el: Element): Element => {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n;
  }
  return document.scrollingElement ?? document.documentElement;
};

/** Where `el`'s top sits in `sc`'s scrolled content. */
const topIn = (sc: Element, el: Element): number => {
  const base = sc === document.scrollingElement ? 0 : sc.getBoundingClientRect().top;
  return sc.scrollTop + el.getBoundingClientRect().top - base;
};

/** A jump link's scroll (QA-B17): `el`'s top to the top of what scrolls it, where `scrollIntoView({ block:
 *  'start' })` put it, eased as the reveal is. */
export const scrollToStart = (el: Element): void => {
  const sc = scroller(el);
  easedScrollTo(sc, topIn(sc, el));
};

// ── the reveals ───────────────────────────────────────────────────────────────────────────────────

/** The space a reveal leaves above what it reveals: the preview stack's own top padding, so the target lands
 *  where the body's first section sits when the body is at its top. */
const inset = (body: HTMLElement): number => parseFloat(getComputedStyle(body.firstElementChild as Element).paddingTop || '0') || 0;

/** Scroll `body` so `palette`'s group is in view: its top a little under the body's top when it is not
 *  already wholly visible. Returns whether the palette was found. */
export const revealGroup = (body: HTMLElement, palette: string): boolean => {
  const el = [...body.querySelectorAll<HTMLElement>('[data-p3="palette"]')].find((n) => n.dataset.palette === palette);
  if (!el) return false;
  const b = body.getBoundingClientRect(), r = el.getBoundingClientRect();
  if (r.top >= b.top && r.bottom <= b.bottom) return true;
  easedScrollTo(body, topIn(body, el) - inset(body));
  return true;
};

/** The preview section a lever section pairs with, where the owner renamed the lever's heading away from the
 *  preview's (see the header). Every other lever heading is its preview section's own (Q23). */
export const PREVIEW_HEADING: Readonly<Record<string, string>> = {
  'Background fills': 'Background',
  'Foreground fills': 'Foreground',
};

/** The preview section headed as the lever section `title` pairs with, in `body`, or null. */
export const previewSection = (body: HTMLElement, title: string): HTMLElement | null => {
  const want = PREVIEW_HEADING[title] ?? title;
  const head = [...body.querySelectorAll<HTMLElement>('[data-p3="section-title"]')].find((n) => n.textContent === want);
  return head?.closest<HTMLElement>('.psec') ?? null;
};

/** Scroll `body` so the preview section paired with the lever section `title` is in view: its top a little
 *  under the body's top, unless it is already wholly visible or already fills the view (the viewer is reading
 *  inside it). Returns whether the section was found. */
export const revealSection = (body: HTMLElement, title: string): boolean => {
  const el = previewSection(body, title);
  if (!el) return false;
  const b = body.getBoundingClientRect(), r = el.getBoundingClientRect();
  if (r.top >= b.top && r.bottom <= b.bottom) return true;
  if (r.top <= b.top && r.bottom >= b.bottom) return true;
  easedScrollTo(body, topIn(body, el) - inset(body));
  return true;
};
