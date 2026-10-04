/**
 * The Style guide's shared kit (UI redesign S4a): the DOM helpers and the context the color sections draw
 * from, held outside `main.ts` so two pages can draw the SAME sections from the same code.
 *
 * WHO DRAWS FROM IT. The legacy Style guide (`renderPreviewStyleGuide` in `main.ts`, Brand's preview from
 * S3) and Color › Surfaces & fills' preview (`preview/surfaces.ts`). The owner's decision (2026-10-01, Q5 in
 * `decisions-2026-10-01-qa.md`): the Color previews reuse the legacy Style guide's sections. So the five
 * sections that page shows (Background, Foreground, Text color, Border, Icon) live in `sections/`, each a
 * function of a context built here, and neither page keeps a copy of its own. A change to a section moves
 * both pages at once; `test-shell-imports.ts` holds that `main.ts` imports them and defines none of them.
 *
 * LEGACY MARKUP, ON PURPOSE. The sections draw the legacy classes (`psec`, `sg-*`, `tpill`) that
 * `styles.css` styles, because the owner prefers that look. The new page mounts them in a host pinned light
 * (`p3-legacy-card`, as Inspect's lent views and S3's Style guide are), so the chrome's dark theme never
 * reaches them. `el()` here mints those legacy classes WITHOUT `main.ts`'s class-scope law (#770), which
 * lives in `main.ts` and cannot be imported: every class string in `sections/` is a literal that law
 * already accepted when it lived in `main.ts`.
 *
 * WHAT `main.ts` NOW IMPORTS FROM HERE instead of defining: `palSection`, `subHead`, `tokenPillSpan`,
 * `isInversePath`, `withInverseBadge`, `colorPath`, `specimen` and `SPECIMEN`. One copy, so a section and
 * the rest of the legacy pages cannot disagree on a pill or a section head. S5.1 moved `specimenPair`,
 * `SPECIMEN_PAIR` and `legibleInkOn` here with the Disabled and Interactive sections, their readers then; since S5.3
 * Color › Interactive's preview (`preview/interactive.ts`) also reads `legibleInkOn`, to theme its badge marks.
 *
 * THE SHARED-SECTION MARKER (`data-sg-section`, follow-up to #1951). Each section module (the five, from
 * S5.1 Disabled and Interactive, and from S4c the Focus ring) stamps
 * its own root with `data-sg-section="<its file name>"`, as a literal IN THAT MODULE, never through `palSection`
 * or anything else here: `main.ts` imports `palSection`, so a marker set there would also mark a section
 * `main.ts` drew for itself, which is exactly what the marker exists to tell apart. `test-smoke.mjs` holds that
 * every one of the five on the Style guide and on Surfaces & fills, Disabled and Interactive on the Style
 * guide, and the Focus ring on Surfaces & fills, carries its marker, so a section `main.ts`
 * draws on its own (by any spelling, an aliased `palSection` included) fails there by name;
 * `test-shell-imports.ts` holds that no file outside `sections/` writes the marker. Invisible: an attribute.
 *
 * NO DOM AT IMPORT, NO STORE. The context is handed the resolved roles; nothing here reads the session.
 */
import { contrast, hexToRgb } from '@prism3/engine/color';
import { fmtRatio } from '../../ui/step-picker';

export { fmtRatio };

// ── DOM helpers (moved from `main.ts`, unchanged in output) ──────────────────────────────────────────

/** An element with a legacy class list and optional text. See the header for why there is no scope law. */
export const el = (tag: string, cls?: string, text?: string): HTMLElement => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
/** The `data-p3` test hook, the same contract as `main.ts`'s and `shell/dom.ts`'s. */
export const hook = <E extends Element>(n: E, role: string): E => { n.setAttribute('data-p3', role); return n; };

/** A SPECIMEN: an element whose ink is the BRAND's, previewed — as against the studio's own chrome (#779).
 *  The smoke suite holds chrome text to WCAG (4.5:1, 3:1 large) and a specimen to the contract of what it
 *  previews, and it cannot tell the two apart from class names: prefixes are per-surface, so `sg-lab` is a
 *  specimen and `sg-rn` beside it is chrome. The render site knows, so the render site says. Every site that
 *  paints ink from a brand token calls this; `test-smoke.mjs` fails on inline ink it finds unmarked, so a new
 *  specimen cannot land as chrome. */
export const SPECIMEN = 'data-specimen';
export const specimen = <T extends HTMLElement>(e: T): T => { e.setAttribute(SPECIMEN, ''); return e; };
/** A specimen that previews one ENGINE ROLE PAIR — an ink role on a fill role, both mode-relative keys as
 *  `paint()` takes them (#1652). The smoke suite reads the pair, resolves both roles from the committed
 *  emission rather than from this file's `paint()`, and holds the node to the contract THAT PAIR carries:
 *  the ink's own `min` where the fill is the ink's `against`, the #1281 exemption where it is a pressed /
 *  selected state of the ink's own fill. So the claim is written beside the paint call, not derived from
 *  it: a call site that paints one pair and claims another fails there by name. (Moved from `main.ts` in
 *  UI redesign S5.1, unchanged.) */
export const SPECIMEN_PAIR = 'data-specimen-pair';
export const specimenPair = <T extends HTMLElement>(e: T, ink: string, fill: string): T => { specimen(e).setAttribute(SPECIMEN_PAIR, `${ink} on ${fill}`); return e; };

/** #555 — a legible ink for a background whose lightness isn't known statically (a resolved fill that can
 *  land on either side of the light/dark line depending on mode, e.g. an "inverse of the current mode"
 *  band). Picks whichever of a fixed dark/light ink pair actually clears against the given background,
 *  rather than assuming the background's lightness. Falls back to the dark ink for a background this can't
 *  parse as hex (e.g. 'transparent'). (Moved from `main.ts` in UI redesign S5.1, unchanged.) */
export const legibleInkOn = (bgHex: string, dark = '#191920', light = '#f7f7f7'): string => {
  if (!bgHex.startsWith('#')) return dark;
  const bg = hexToRgb(bgHex);
  return contrast(hexToRgb(dark), bg) >= contrast(hexToRgb(light), bg) ? dark : light;
};

/** A section: its head (title and one line) and nothing else yet; the caller appends the body. */
export const palSection = (title: string, sub: string): HTMLElement => {
  const sec = el('div', 'psec');
  // `section-head` rather than a hook on `sec`: several sections carry their own role (`section-backgrounds`,
  // `section-duration-ramp`), and a hook is one value. `mode-audit.mjs` finds every section as its head's parent.
  const head = hook(el('div', 'psec-head'), 'section-head');
  const txt = el('div', 'psec-txt');
  txt.append(hook(el('h3', 'psec-t', title), 'section-title'), hook(el('p', 'psec-d', sub), 'section-description'));
  head.append(txt);
  sec.append(head);
  return sec;
};
/** A sub-heading inside a section. */
export const subHead = (title: string): HTMLElement => { const s = el('div', 'sub-lab'); s.append(el('h3', 'sub-t', title)); return s; };

/** The resolvable DTCG path for a color role. #1148 collapsed the pointer and value tiers into one `color`,
 *  so every role has the short name (the history is in `main.ts`'s git log, #1013 → #1148). */
export const colorPath = (role: string): string => `color.${role}`;

/** A token-path chip, ALONE: the small mono pill. A long path elides from the LEFT (`direction: rtl` in
 *  `styles.css`, #289), and the path stays one text node so a copy is exact. `tokenPill` in `main.ts` pairs
 *  it with the `inverse` badge. */
export const tokenPillSpan = (path: string): HTMLElement => {
  const p = hook(el('span', 'tpill mono', path), 'token-pill');
  p.title = path;
  return p;
};
/** True when a path's discriminator is the `inverse` group (#1141), matched as a whole segment. */
export const isInversePath = (path: string): boolean => path.split('.').includes('inverse');
/** Pair a pill with an `inverse` badge when its path carries that group (#1147). The badge is a sibling, so
 *  the pill's left elision never hides it and the pill's text stays the path. */
export const withInverseBadge = (path: string, pill: HTMLElement): HTMLElement => {
  if (!isInversePath(path)) return pill;
  const wrap = hook(el('span', 'tpill-wrap'), 'token-pill-wrap');
  const badge = hook(el('span', 'tpill-inv', 'inverse'), 'token-pill-inverse');
  badge.title = 'The inverse fill. Shown beside the path because a narrow pill hides its leading part.';
  wrap.append(badge, pill);
  return wrap;
};
/** A token pill with its `inverse` badge where the path carries one: `main.ts`'s `tokenPill`, for the sections. */
export const tokenPillBadged = (path: string): HTMLElement => withInverseBadge(path, tokenPillSpan(path));
/** A token pill that WRAPS on path boundaries, for card grids whose column width is fixed by the
 *  content set (six easing curves → a ~123px card, against ~225px for `motion.easing.expressive`).
 *  (Moved from `main.ts` in UI redesign S9.1 with the Motion sections, its only callers; unchanged.)
 *
 *  Deliberately NOT folded into `tokenPill`: `<wbr>` is not inert under `white-space: nowrap` in
 *  Chromium. Putting it in the shared helper took Layout's breakpoint pills from 0 wrapped to 5 and
 *  turned Surfaces' 3 elided pills into 3 wrapped ones — measured against `main` with the same sweep,
 *  which is the only reason it was caught. A shared component is exactly where an "obviously harmless"
 *  addition does damage out of sight of the page you are working on.
 *
 *  `<wbr>` rather than a zero-width space: it contributes nothing to `textContent`, so a path copied
 *  out of the pill is still the path. Pair with the wrap CSS on the container. */
export const tokenPillWrapping = (path: string): HTMLElement => {
  const p = tokenPillSpan(path);
  p.textContent = '';
  const segs = path.split('.');
  segs.forEach((seg, i) => { p.append(i < segs.length - 1 ? `${seg}.` : seg); if (i < segs.length - 1) p.append(el('wbr')); });
  return withInverseBadge(path, p);
};

/** Marks a control that changes the VIEW, not a token — a playback speed, a filter, a specimen ground.
 *  `main.ts`'s `attachModeBadges` skips these when deciding editability, the way it already skips `button`.
 *  (Moved from `main.ts` in UI redesign S9.1, with the Motion specimen that uses it; unchanged.)
 *
 *  WHY AN ATTRIBUTE AND NOT A DECLARED FLAG PER SECTION. #437's editability is measured from the
 *  rendered DOM precisely so it cannot drift, and #574 is not a reason to give that up — a
 *  hand-declared `editable: false` on Motion would go stale the day Motion gains a real control. The
 *  measurement was not wrong, it was measuring a PROXY: presence of a control is not evidence of
 *  editability, and a view-state control satisfies "the user can change something here" without
 *  satisfying "the user can change a token here". Marking the exception keeps the measurement, and a
 *  section that gains a real control still re-badges itself with no map to remember.
 *
 *  WHY AN ATTRIBUTE AND NOT THE `.mo-slowmo-sel` CLASS. The badge would then encode one specimen's
 *  class name, so the second view control would reintroduce the bug — exactly how #575 happened (a
 *  mapping re-derived at a second site, with no shared name to grep for). This is that shared name. */
export const VIEW_ONLY = 'data-view-only';
/** Tag `c` as a view-state control and return it, so it can wrap the control at construction. */
export const viewOnly = <T extends HTMLElement>(c: T): T => { c.setAttribute(VIEW_ONLY, ''); return c; };

// ── the section context ──────────────────────────────────────────────────────────────────────────────

/** A resolved role, as `resolveAllModes` gives it: the slice the sections read. */
export type SgRole = { path: string; hex: string; ratio: number; min: number; alpha?: number; against?: string };
export type RolesByMode = ReadonlyMap<string, Record<string, SgRole | undefined>>;

/** Which surface the specimens are previewed ON. Every option is a real background role, and each carries
 *  its OWN ink and border set (the history and the reasoning are on the Style guide's picker in `main.ts`). */
export type SgSurface = { key: string; label: string; ink: string; line: string; line2: string; tiered: boolean };
export const SG_SURFACES: readonly SgSurface[] = [
  { key: 'background.primary', label: 'Page', ink: 'text.primary', line: 'border.primary', line2: 'border.secondary', tiered: true },
  { key: 'background.secondary', label: 'Page, second tier', ink: 'text.primary', line: 'border.primary', line2: 'border.secondary', tiered: true },
  // The inverse band has ONE on-color ink, so the supporting tiers collapse onto it rather than
  // borrowing a page-gated role that was never measured against this ground.
  { key: 'inverse.background.primary', label: 'Inverse', ink: 'inverse.text.primary', line: 'inverse.border.primary', line2: 'inverse.border.primary', tiered: false },
];

/** The mode a section's second column shows: the current mode's opposite where the brand has it, else the
 *  first other mode (the Text color section's "On ‹mode› surface" pair). */
export const oppositeOf = (cur: string, modes: readonly string[], has: (m: string) => boolean): string => {
  const OPP: Record<string, string> = { light: 'dark', dark: 'light', 'hc-light': 'hc-dark', 'hc-dark': 'hc-light' };
  return OPP[cur] && has(OPP[cur]) ? OPP[cur] : (modes.find((m) => m !== cur) ?? cur);
};

/** What a section draws with. Built once per paint by `sgContext`. */
export type SgCtx = {
  /** The mode the specimens show, and the one the Text color section sets beside it. */
  readonly cur: string;
  readonly opp: string;
  readonly modeLabel: (m: string) => string;
  readonly role: (m: string, k: string) => SgRole | undefined;
  /** A role's paint: its hex, or `rgba(…)` for a role with an alpha, or `transparent` when unresolved. */
  readonly paint: (m: string, k: string) => string;
  /** Below its floor in mode `m`. */
  readonly fails: (m: string, k: string) => boolean;
  /** The token chip for a role, as one node or two: the pill, then (on Surfaces & fills) its ratio badge. */
  readonly chip: (k: string, label?: string, m?: string) => HTMLElement[];
  /** The token pill alone, never a badge (the Text color section's token column, owner decision Q46). */
  readonly pill: (k: string, label?: string, m?: string) => HTMLElement;
  /** The ratio badge for a role in mode `m`, or null: on the Style guide (no badges), or for a role measured
   *  against itself. The Text color section draws one per column (Q46). */
  readonly badge: (k: string, m?: string) => HTMLElement | null;
  readonly pills: (...nodes: HTMLElement[]) => HTMLElement;
  readonly grid: (cols: number, cards: HTMLElement[]) => HTMLElement;
  /** Mark a painted node with the role and the property it paints, so a test can read its computed color
   *  against the emission. Invisible: a data attribute. */
  readonly painted: <E extends HTMLElement>(n: E, k: string, prop: 'background' | 'border' | 'color', m?: string) => E;
};

/** The ratio badge (owner decision Q5): beside a role's token chip, the ratio the engine measured it at
 *  against what it is measured on, a check when it clears a floor, a cross when it is below its floor.
 *  A role measured against itself (a ground) has no ratio and gets no badge; a role with no floor (a
 *  decorative border) shows its ratio without a mark. Light-pinned legacy markup, like the chip beside it. */
export const ratioBadge = (k: string, r: SgRole | undefined, againstHex: string | null): HTMLElement | null => {
  if (!r || !r.against || r.against === 'self' || typeof r.ratio !== 'number') return null;
  const floor = r.min > 0 ? r.min : null;
  const below = floor !== null && r.ratio + 1e-9 < floor;
  const b = hook(el('span', below ? 'sg-ratio sg-ratio-no' : 'sg-ratio'), 'ratio-badge');
  b.dataset.role = k;
  if (below) b.dataset.below = 'true';
  b.append(el('span', 'sg-ratio-n', fmtRatio(r.ratio)));
  if (floor !== null) b.append(el('span', 'sg-ratio-mk', below ? '✗' : '✓'));
  b.title = `${fmtRatio(r.ratio)} against ${r.against}${againstHex ? ` (${againstHex})` : ''}${floor !== null ? `, floor ${floor}:1${below ? ', below floor' : ''}` : ', no floor'}`;
  return b;
};

/** Build the context the sections draw with. `badges` adds the ratio badge beside each chip (Surfaces &
 *  fills, owner decision Q5); the Style guide passes false and draws exactly what it drew before the lift.
 *  `paletteHex` resolves an `against` that names a palette step (`neutral.050`) rather than a role. */
export const sgContext = (o: {
  rolesByMode: RolesByMode; cur: string; opp: string; namespace: string; modeLabel: (m: string) => string;
  badges: boolean; paletteHex: (palette: string, step: string) => string | null;
}): SgCtx => {
  const { rolesByMode, cur } = o;
  const ns = o.namespace + '.';
  const role = (m: string, k: string): SgRole | undefined => rolesByMode.get(m)?.[k];
  const rgba = (hx: string, a: number): string => { const n = parseInt(hx.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  const paint = (m: string, k: string): string => { const r = role(m, k); return r ? (r.alpha != null ? rgba(r.hex, r.alpha) : r.hex) : 'transparent'; };
  const stepOf = (r: SgRole): string => (r.path.startsWith(ns) ? r.path.slice(ns.length) : r.path);
  const fails = (m: string, k: string): boolean => { const r = role(m, k); return !!(r && r.min > 0 && r.ratio < r.min); };
  const tipOf = (m: string, k: string): string => { const r = role(m, k); if (!r) return `${k} — unset`; const c = r.min > 0 ? ` · ${r.ratio.toFixed(2)}:1 (min ${r.min})` : ''; return `${stepOf(r)} · ${r.hex}${c}`; };
  /** What a role is measured against, as a hex: another role in the same mode, or a palette step. */
  const againstHex = (m: string, r: SgRole | undefined): string | null => {
    if (!r?.against || r.against === 'self') return null;
    const other = role(m, r.against);
    if (other) return other.hex;
    const dot = r.against.lastIndexOf('.');
    return dot > 0 ? o.paletteHex(r.against.slice(0, dot), r.against.slice(dot + 1)) : null;
  };
  // Token pill with hover-reveal of the resolved primitive (semantic lead, primitive on hover). The visible
  // label is the real, resolvable path; a short contextual label (e.g. `fill.rest`) is shown verbatim.
  const sgPill = (k: string, label?: string, m: string = cur): HTMLElement => {
    const path = label ?? colorPath(k);
    const p = tokenPillSpan(path);
    // `<wbr>` after each dot moves a wrap onto the path boundaries and adds nothing to `textContent`.
    p.textContent = '';
    path.split('.').forEach((seg, i, all) => { p.append(i < all.length - 1 ? `${seg}.` : seg); if (i < all.length - 1) p.append(el('wbr')); });
    // `data-sgtip` reveals what the role RESOLVES to; `title`, set by `tokenPillSpan`, is the full PATH.
    p.setAttribute('data-sgtip', tipOf(m, k));
    // a shared token pill flagged by the style guide's own contrast verdict
    if (fails(m, k)) { p.className = `${p.className} sg-failpill`.trim(); p.append(el('b', 'sg-fx', '!')); }
    // The inverse badge goes on LAST, so `.sg-failpill`'s marker and the bubble both stay on the pill (#1147).
    return withInverseBadge(path, p);
  };
  const badge = (k: string, m: string = cur): HTMLElement | null => {
    if (!o.badges) return null;
    const r = role(m, k);
    return ratioBadge(k, r, againstHex(m, r));
  };
  const chip = (k: string, label?: string, m: string = cur): HTMLElement[] => {
    const pill = sgPill(k, label, m);
    const b = badge(k, m);
    return b ? [pill, b] : [pill];
  };
  const pills = (...nodes: HTMLElement[]): HTMLElement => { const w = el('div', 'sg-pills'); nodes.forEach((n) => w.append(n)); return w; };
  const grid = (cols: number, cards: HTMLElement[]): HTMLElement => { const g = el('div', `sg-grid sg-g${cols}`); cards.forEach((c) => g.append(c)); return g; };
  const painted = <E extends HTMLElement>(n: E, k: string, prop: 'background' | 'border' | 'color', m: string = cur): E => {
    n.dataset.sgRole = k;
    n.dataset.sgPaint = prop;
    if (m !== cur) n.dataset.sgMode = m;
    return n;
  };
  return { cur, opp: o.opp, modeLabel: o.modeLabel, role, paint, fails, chip, pill: sgPill, badge, pills, grid, painted };
};

/** Re-home a built section's SPECIMENS onto the mode's own canvas: the specimens render the mode's colors,
 *  and the ground behind them is the chosen surface for the same mode, with the section's custom properties
 *  (`--panel`, `--paper`, `--line`, `--ink`, `--muted`, `--faint`) re-scoped to that surface's own set.
 *  The section's head stays studio; inside the ground is the brand's system. The history and the measured
 *  reasons are on the Style guide in `main.ts`.
 *
 *  The ground is a SPECIMEN ROOT (`data-p3="specimen"`, plan §9.1): on the Page surface it is the brand's
 *  own `background.primary` for the previewed mode, never the chrome's card, and `test:chrome` and
 *  `test:smoke` measure what it composites to. */
export const ground = (c: SgCtx, sec: HTMLElement, surf: SgSurface): HTMLElement => {
  const g = hook(el('div', 'sg-ground'), 'specimen');
  const head = sec.querySelector('.psec-head');
  while (sec.lastChild && sec.lastChild !== head) g.prepend(sec.lastChild);
  const { cur, paint } = c;
  const bg = paint(cur, surf.key);
  // A tiered ground keeps the secondary ink for supporting text; the inverse band has only its one
  // on-color role, so everything inside uses that.
  const support = surf.tiered ? paint(cur, 'text.secondary') : paint(cur, surf.ink);
  g.style.background = bg;
  g.style.setProperty('--panel', bg);
  g.style.setProperty('--paper', paint(cur, surf.tiered ? 'background.secondary' : surf.key));
  g.style.setProperty('--line', paint(cur, surf.line));
  g.style.setProperty('--line2', paint(cur, surf.line2));
  g.style.setProperty('--ink', paint(cur, surf.ink));
  g.style.setProperty('--ink2', support);
  // BOTH supporting inks map to the AA-gated tier (#355): `--faint` is 10.5px token pills that need 4.5:1.
  g.style.setProperty('--muted', support);
  g.style.setProperty('--faint', support);
  sec.append(g);
  return sec;
};

/** A section's specimens on WHITE, not on the brand's page (S4f, the owner's #1971, Q81): the grounds other colors
 *  are measured against (Surfaces & fills' Background and Foreground sections) need no page under them, and carry
 *  no ratio badge. The ground is still the section's specimen root (`data-p3="specimen"`), painted `#ffffff`, the
 *  owner's word, in every mode; nothing is re-scoped, so the section's own ink, lines and pills keep the light-pinned
 *  host's, which are made for a white ground. */
export const WHITE_GROUND = '#ffffff';
export const whiteGround = (sec: HTMLElement): HTMLElement => {
  const g = hook(el('div', 'sg-ground'), 'specimen');
  const head = sec.querySelector('.psec-head');
  while (sec.lastChild && sec.lastChild !== head) g.prepend(sec.lastChild);
  g.style.background = WHITE_GROUND;
  sec.append(g);
  return sec;
};

/** The five semantic families the Foreground and Icon sections draw, in the Style guide's order. */
export const SEM: ReadonlyArray<readonly [string, string]> = [['Brand', 'brand'], ['Danger', 'danger'], ['Success', 'success'], ['Warning', 'warning'], ['Info', 'info']];
