/**
 * Color › Palettes, the preview (UI redesign S2; concept v6's `palettes` view, V7, V8).
 *
 * WHAT IT SHOWS: every ramp the brand resolves, large, in a container per group — Brand palettes (primary,
 * then each brand color), Neutral, Status palettes, and Alpha and opacity. Each palette has a 56px hero
 * swatch at its anchor, its hex, its token, the roles it drives and, when the brand pins a color in it, an
 * anchor pill. Under that, its steps as strips of large squares with the step and hex under each: ten to
 * a strip, five when the preview is narrow, so the labels stay under their squares.
 *
 * SPECIMENS SIT ON THE BRAND'S PAGE, NOT ON THE CHROME (concept v6's finding, plan §9.1). Every strip is
 * a specimen root (`data-p3="specimen"`) painted with the brand's own `background.primary` for the mode
 * the preview shows, so a step reads against the page it will be used on. `test:chrome` checks each root's
 * composited ground against the engine's value, resolved in Node. The labels are chrome text and sit on
 * the chrome card, outside the roots. The alpha ramps are the exception, named here: they are the same
 * constants for every brand and draw on a checkerboard, as v6 drew them, so their transparency shows.
 *
 * HOW IT REPAINTS: by store subscription (`brand`, `mode`), never through a legacy tier. A ramp does not
 * vary by mode; the page color under it does, so the mode control changes the grounds.
 */
import { currentMode, lastGoodInput, subscribe, theme } from '../state/store';
import { resolvedModes } from '../state/verdict';
import { STATUS_ROLES, anchorStepFor, rolesByPalette } from '../state/palette-input';
import { h, hook } from '../shell/dom';
import { revealGroup, takeEdit } from './follow-edit';

/** The preview width below which a strip holds five squares instead of ten. */
const SLIM_MAX = 560;
/** The alpha steps the engine emits for `black-alpha` and `white-alpha`, and the `opacity` scale it emits
 *  from the same set. Constants in the engine, so constants here (the legacy page's `ALPHA_STEPS_UI`). */
const ALPHA_STEPS = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const alphaHex = (base: 'black' | 'white', pct: number): string =>
  `#${base === 'black' ? '000000' : 'ffffff'}${Math.round((pct / 100) * 255).toString(16).padStart(2, '0')}`;
const pad = (n: number): string => String(n).padStart(3, '0');

type StepLike = { num: number; key: string; hex: string };

/** The anchor's diamond (concept v6's ◆), drawn as a shape: the embedded faces carry no U+25C6, and a device
 *  face drawing one glyph in the chrome is what `test:chrome`'s font check refuses. */
const anchorMark = (): HTMLElement => { const m = h('span', 'p3-ancmark'); m.setAttribute('aria-hidden', 'true'); return m; };

/** The brand's page color for the mode the preview shows: the ground every specimen root is painted on. */
export const pageGround = (): string => {
  const m = resolvedModes(theme).find((x) => x.mode === currentMode) ?? resolvedModes(theme)[0];
  return m.roles['background.primary']?.hex ?? '#ffffff';
};

/** A container with a tracked small-capital title and a line under it (v6's `board`). */
const board = (title: string, desc: string, role: string): { el: HTMLElement; body: HTMLElement } => {
  const el = hook(h('section', 'p3-card p3-board'), role);
  const head = h('header', 'p3-card-head');
  head.append(h('h3', 'p3-card-title', title));
  if (desc) head.append(h('p', 'p3-board-desc', desc));
  const body = h('div', 'p3-board-body');
  el.append(head, body);
  return { el, body };
};

/** A specimen root: brand content on the brand's page color. */
const specimenRoot = (cls: 'p3-sqs', ground: string): HTMLElement => {
  const n = hook(h('div', cls), 'specimen');
  n.dataset.content = '';
  n.style.background = ground;
  return n;
};

/** The squares and their labels, `per` to a strip. */
const strips = (name: string, steps: readonly StepLike[], anchor: number | null, per: number, ground: string): HTMLElement[] => {
  const out: HTMLElement[] = [];
  for (let i = 0; i < steps.length; i += per) {
    const half = steps.slice(i, i + per);
    const row = h('div', 'p3-sqrow');
    const sq = specimenRoot('p3-sqs', ground);
    sq.setAttribute('aria-hidden', 'true');
    for (const st of half) {
      const c = h('i', 'p3-sq');
      c.style.background = st.hex;
      if (st.num === anchor) c.dataset.anchor = 'true';
      sq.append(c);
    }
    const keys = h('ol', 'p3-sqk');
    keys.setAttribute('aria-label', `${name} ramp, steps ${half[0].key} to ${half[half.length - 1].key}`);
    for (const st of half) {
      const li = h('li', 'p3-sqk-item');
      if (st.num === anchor) li.dataset.anchor = 'true';
      const k = h('b', 'p3-sqk-step', st.key);
      if (st.num === anchor) k.prepend(anchorMark());
      li.append(k, h('span', 'p3-sqk-hex', st.hex.slice(1)));
      if (st.num === anchor) { const sr = h('span', 'p3-sr', ' (anchor)'); li.append(sr); }
      keys.append(li);
    }
    row.append(sq, keys);
    out.push(row);
  }
  return out;
};

/** One palette: the head (hero, name, hex, token, roles, anchor), then its strips. */
const paletteBlock = (palette: string, label: string, per: number, ground: string, roles: Record<string, string[]>, note?: string): HTMLElement => {
  const p = theme.palettes.find((x) => x.palette === palette);
  const steps = p?.steps ?? [];
  const anc = anchorStepFor(palette);
  const a = steps.find((s) => s.num === anc) ?? steps.find((s) => s.num === 500) ?? steps[Math.floor(steps.length / 2)];
  const el = hook(h('div', 'p3-pal'), 'palette');
  el.dataset.palette = palette;
  const head = h('div', 'p3-palh');
  const hero = h('span', 'p3-hero');
  hero.dataset.content = '';
  if (a) hero.style.background = a.hex;
  const nm = h('div', 'p3-palh-name');
  nm.append(h('b', 'p3-pal-title', label));
  const meta = h('div', 'p3-palh-meta');
  meta.append(h('span', 'p3-pal-hex', a?.hex ?? ''), h('span', 'p3-tokchip', `palette.${palette}`));
  const drives = roles[palette] ?? [];
  const chip = h('span', 'p3-rolechip');
  if (drives.length && a) {
    const dot = h('i', 'p3-rolechip-dot');
    dot.dataset.content = '';
    dot.style.background = a.hex;
    chip.append(dot, document.createTextNode(`drives ${drives.join(', ')}`));
  } else chip.textContent = 'decorative';
  meta.append(chip);
  if (note) meta.append(h('span', 'p3-rolechip', note));
  nm.append(meta);
  head.append(hero, nm);
  if (anc !== null) {
    const ab = h('div', 'p3-palh-anchor');
    const pill = h('span', 'p3-ancpill', pad(anc));
    pill.prepend(anchorMark());
    ab.append(h('span', 'p3-eyebrow', 'Anchor'), pill);
    head.append(ab);
  }
  el.append(head, ...strips(palette, steps, anc, per, ground));
  return el;
};

/** A status role that draws from another palette (a borrow, or Auto reusing a brand color): its name and
 *  where it comes from. Its ramp is that palette's, shown in its own group above. */
const reuseLine = (role: string, src: string, borrowed: boolean): HTMLElement => {
  const el = hook(h('div', 'p3-pal p3-pal-reuse'), 'palette');
  el.dataset.palette = role;
  const p = theme.palettes.find((x) => x.palette === src);
  const a = p?.steps.find((s) => s.num === 500) ?? p?.steps[Math.floor((p?.steps.length ?? 1) / 2)];
  const head = h('div', 'p3-palh');
  const hero = h('span', 'p3-hero p3-hero-sm');
  hero.dataset.content = '';
  if (a) hero.style.background = a.hex;
  const nm = h('div', 'p3-palh-name');
  nm.append(h('b', 'p3-pal-title', role));
  const meta = h('div', 'p3-palh-meta');
  meta.append(h('span', 'p3-rolechip', borrowed ? `borrows ${src}` : `reuses ${src}`));
  nm.append(meta);
  head.append(hero, nm);
  el.append(head);
  return el;
};

/** Mount the Palettes preview into `host`. Subscriptions are released through `cleanups`. */
export const mountPalettesPreview = (host: HTMLElement, cleanups: (() => void)[]): void => {
  const root = hook(h('div', 'p3-stack p3-preview-stack'), 'palettes-preview');
  host.replaceChildren(root);
  let per = 10;

  // THE BOARDS ARE KEPT, AND SO IS EVERY BLOCK THAT DID NOT CHANGE. Each block is keyed by everything it
  // draws (its steps' colors, its anchor, the roles it drives, the ground, the strip width); an edit rebuilds
  // only the blocks whose key moved, and the rest stay the same nodes, so the browser restyles and lays out
  // only what changed. Rebuilding all four boards per edit doubled the edit-to-paint time (measured: a median
  // of about 160 ms against the legacy page's 75 ms on a primary edit).
  const boards = {
    brand: board('Brand palettes', 'Each brand color grown into a 20-step ramp. Your color is pinned as the anchor, never shifted.', 'board-brand'),
    neutral: board('Neutral', '', 'board-neutral'),
    status: board('Status palettes', 'Success, warning, danger and info. Auto reuses a brand color when its hue fits, or makes one.', 'board-status'),
    alpha: board('Alpha and opacity', 'On a checkerboard, so the alpha shows.', 'board-alpha'),
  };
  root.append(boards.brand.el, boards.neutral.el, boards.status.el, boards.alpha.el);
  let cache = new Map<string, HTMLElement>();
  let next = new Map<string, HTMLElement>();
  const keyed = (key: string, make: () => HTMLElement): HTMLElement => {
    const el = cache.get(key) ?? make();
    next.set(key, el);
    return el;
  };
  /** Put exactly `els`, in order, into `body`, moving or replacing only where a node differs. */
  const place = (body: HTMLElement, els: readonly HTMLElement[]): void => {
    els.forEach((e, i) => { if (body.children[i] !== e) body.insertBefore(e, body.children[i] ?? null); });
    while (body.children.length > els.length) body.lastElementChild!.remove();
  };
  /** Repaint a palette block's colors from the resolved theme: its squares, their hex labels, the hero and
   *  the roles chip's dot. Its structure (the steps, the anchor, the strips) is unchanged by construction. */
  const recolor = (el: HTMLElement, palette: string): void => {
    const steps = theme.palettes.find((x) => x.palette === palette)?.steps ?? [];
    const anc = anchorStepFor(palette);
    const a = steps.find((x) => x.num === anc) ?? steps.find((x) => x.num === 500) ?? steps[Math.floor(steps.length / 2)];
    el.querySelectorAll<HTMLElement>('.p3-sq').forEach((q, i) => {
      if (!steps[i]) return;
      q.style.background = steps[i].hex;
      const on = steps[i].num === anc;
      if ((q.dataset.anchor === 'true') !== on) { if (on) q.dataset.anchor = 'true'; else delete q.dataset.anchor; }
    });
    el.querySelectorAll<HTMLElement>('.p3-sqk-hex').forEach((q, i) => { if (steps[i] && q.textContent !== steps[i].hex.slice(1)) q.textContent = steps[i].hex.slice(1); });
    // The anchor can move along the ramp as the color's lightness moves: its square, its label and its pill.
    el.querySelectorAll<HTMLElement>('.p3-sqk-item').forEach((li, i) => {
      const on = !!steps[i] && steps[i].num === anc;
      if ((li.dataset.anchor === 'true') === on) return;
      const k = li.querySelector('.p3-sqk-step')!;
      if (on) { li.dataset.anchor = 'true'; k.prepend(anchorMark()); li.append(h('span', 'p3-sr', ' (anchor)')); }
      else { delete li.dataset.anchor; k.querySelector('.p3-ancmark')?.remove(); li.querySelector('.p3-sr')?.remove(); }
    });
    const pill = el.querySelector('.p3-ancpill');
    if (pill && anc !== null && pill.lastChild?.textContent !== pad(anc)) pill.lastChild!.textContent = pad(anc);
    if (a) {
      const hero = el.querySelector<HTMLElement>('.p3-hero'); if (hero) hero.style.background = a.hex;
      const dot = el.querySelector<HTMLElement>('.p3-rolechip-dot'); if (dot) dot.style.background = a.hex;
      const hx = el.querySelector('.p3-pal-hex'); if (hx && hx.textContent !== a.hex) hx.textContent = a.hex;
    }
  };
  const stepsKey = (palette: string): string => (theme.palettes.find((p) => p.palette === palette)?.steps ?? []).map((x) => x.hex).join('');

  const render = (): void => {
    next = new Map();
    const ground = pageGround();
    const roles = rolesByPalette();
    const brandNames = ['primary', ...(lastGoodInput.brandColors ?? []).map((b) => b.name)];
    const status = new Set<string>(STATUS_ROLES);
    const pals = theme.palettes.map((p) => p.palette);
    const rest = pals.filter((p) => !brandNames.includes(p) && p !== 'neutral' && !status.has(p));
    // A block is keyed by its STRUCTURE; its colors are patched in place when only they moved (a primary
    // dragged through its picker), which repaints the squares without laying out the block again.
    const block = (p: string, label: string): HTMLElement => {
      const anc = anchorStepFor(p);
      const el = keyed(['pal', p, label, per, ground, anc === null, (roles[p] ?? []).join(','), theme.palettes.find((x) => x.palette === p)?.steps.length].join('|'), () => paletteBlock(p, label, per, ground, roles));
      const hexes = `${anc}|${stepsKey(p)}`;
      if (el.dataset.hexes !== hexes) { recolor(el, p); el.dataset.hexes = hexes; }
      return el;
    };

    place(boards.brand.body, [...brandNames.filter((n) => pals.includes(n)), ...rest].map((p) => block(p, p === 'primary' ? 'Primary' : p)));

    const nPal = theme.palettes.find((p) => p.palette === 'neutral');
    const nHue = nPal ? Math.round(nPal.steps[10]?.oklch.h ?? 0) : 0;
    const nDesc = boards.neutral.el.querySelector('.p3-board-desc') ?? boards.neutral.el.querySelector('.p3-card-head')!.appendChild(h('p', 'p3-board-desc'));
    const nText = `Hue ${nHue}°${lastGoodInput.neutral.auto ? ', following primary' : ''}. Text, borders and surfaces draw from it.`;
    if (nDesc.textContent !== nText) nDesc.textContent = nText;
    place(boards.neutral.body, nPal ? [block('neutral', 'neutral')] : []);

    place(boards.status.body, STATUS_ROLES.map((r) => {
      const src = (theme.roleToPalette as Record<string, string>)[r] ?? r;
      if (src === r && pals.includes(r)) return block(r, r);
      const borrowed = lastGoodInput.roleColors?.[r] === src;
      return keyed(['reuse', r, src, borrowed, stepsKey(src)].join('|'), () => reuseLine(r, src, borrowed));
    }));

    const ink = resolvedModes(theme).find((x) => x.mode === currentMode)?.roles['text.primary']?.hex ?? '#000000';
    const alphaRamp = (base: 'black' | 'white'): HTMLElement => keyed(['alpha', base, per].join('|'), () => {
      const blk = hook(h('div', 'p3-pal'), 'alpha-ramp');
      const head = h('div', 'p3-palh');
      const nm = h('div', 'p3-palh-name');
      nm.append(h('b', 'p3-pal-title', `${base}-alpha`));
      const meta = h('div', 'p3-palh-meta');
      meta.append(h('span', 'p3-tokchip', `palette.${base}-alpha`));
      nm.append(meta);
      head.append(nm);
      blk.append(head);
      for (let i = 0; i < ALPHA_STEPS.length; i += per) {
        const half = ALPHA_STEPS.slice(i, i + per);
        const row = h('div', 'p3-sqrow');
        const sq = h('div', 'p3-sqs p3-checker');
        sq.dataset.content = '';
        sq.setAttribute('aria-hidden', 'true');
        for (const pct of half) { const c = h('i', 'p3-sq'); c.style.background = alphaHex(base, pct); sq.append(c); }
        const keys = h('ol', 'p3-sqk');
        keys.setAttribute('aria-label', `${base}-alpha, steps ${half[0]} to ${half[half.length - 1]}`);
        for (const pct of half) { const li = h('li', 'p3-sqk-item'); li.append(h('b', 'p3-sqk-step', String(pct)), h('span', 'p3-sqk-hex', alphaHex(base, pct).slice(1))); keys.append(li); }
        row.append(sq, keys);
        blk.append(row);
      }
      return blk;
    });
    const opacity = keyed(['opacity', per, ground, ink].join('|'), () => {
      const op = hook(h('div', 'p3-pal'), 'opacity-scale');
      const oh = h('div', 'p3-palh');
      const onm = h('div', 'p3-palh-name');
      onm.append(h('b', 'p3-pal-title', 'opacity'));
      const ometa = h('div', 'p3-palh-meta');
      ometa.append(h('span', 'p3-tokchip', 'opacity'));
      onm.append(ometa);
      oh.append(onm);
      op.append(oh);
      for (let i = 0; i < ALPHA_STEPS.length; i += per) {
        const half = ALPHA_STEPS.slice(i, i + per);
        const row = h('div', 'p3-sqrow');
        const sq = specimenRoot('p3-sqs', ground);
        sq.setAttribute('aria-hidden', 'true');
        for (const pct of half) { const c = h('i', 'p3-sq'); c.style.background = ink; c.style.opacity = String(pct / 100); sq.append(c); }
        const keys = h('ol', 'p3-sqk');
        keys.setAttribute('aria-label', `opacity, steps ${half[0]} to ${half[half.length - 1]}`);
        for (const pct of half) { const li = h('li', 'p3-sqk-item'); li.append(h('b', 'p3-sqk-step', String(pct)), h('span', 'p3-sqk-hex', String(pct / 100))); keys.append(li); }
        row.append(sq, keys);
        op.append(row);
      }
      return op;
    });
    place(boards.alpha.body, [alphaRamp('black'), alphaRamp('white'), opacity]);
    if (root.dataset.per !== String(per)) root.dataset.per = String(per);
    cache = next;
  };

  const ro = new ResizeObserver(() => {
    const w = host.getBoundingClientRect().width;
    const want = w > 0 && w < SLIM_MAX ? 5 : 10;
    if (want !== per) { per = want; render(); }
  });
  ro.observe(host);
  cleanups.push(() => ro.disconnect());
  // Q4 trial: after an edit's repaint, reveal the palette the edit changed (`follow-edit.ts`).
  cleanups.push(subscribe('brand', () => { render(); const p = takeEdit(); if (p) revealGroup(host, p); }), subscribe('mode', render));
  const w0 = host.getBoundingClientRect().width;
  per = w0 > 0 && w0 < SLIM_MAX ? 5 : 10;
  render();
};
