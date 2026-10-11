/** The Style guide's Interactive section (UI redesign S5.1: lifted out of `renderPreviewStyleGuide` in
 *  `main.ts` so Color › Interactive can draw the same section, as S4a did for the five color sections).
 *  Each column in four treatments (Filled, Outline, Text, Inverse) at rest, hover and pressed, then the
 *  shared Disabled set. The Style guide draws Primary, Neutral and Destructive; Color › Interactive draws
 *  every column, accents included (owner decision Q39), through `columns`.
 *
 *  THE TEXT ROW (S5.2, owner decision Q32): the engine's text button (`packages/engine/components/button.ts`,
 *  appearance `text`): the ink `interactive.‹c›.text.‹state›` over the outline row's hover wash, and NO
 *  border. It reads the same `outlineStateRoles` the Outline row reads, takes its `fill` and its `text`, and
 *  never its `border`, so the two rows cannot disagree on the ground switch (#1629).
 *
 *  WHAT IT IS HANDED. The section context (`SgCtx`), the brand's `outlineInteraction` (which family the
 *  Outline row's hover fill reads, through `outlineStateRoles`) and the role key of the ground the section
 *  is previewed on (the Style guide's surface picker), because the Outline row's ink, edge and wash and the
 *  Inverse row's band all switch on whether that ground is itself the inverse band. */
import { isInverseRole } from '@prism3/engine/inverse-roles';
import type { Theme } from '@prism3/engine/theme';
import { outlineStateRoles } from '../../outline-roles';
import { el, hook, legibleInkOn, palSection, specimen, specimenPair, type SgCtx } from './kit';

export type InteractiveSectionOptions = {
  /** The brand's outline hover method (`theme.outlineInteraction`). */
  readonly method: Theme['outlineInteraction'];
  /** The role key of the ground the section sits on (`SgSurface.key`). */
  readonly surface: string;
  /** The columns to draw, as [name shown, column], in order. Default: Primary, Neutral, Destructive. */
  readonly columns?: ReadonlyArray<readonly [string, string]>;
};

/** The Style guide's three columns, in order. */
export const BUILT_IN_SECTION_COLUMNS: ReadonlyArray<readonly [string, string]> = [['Primary', 'primary'], ['Neutral', 'neutral'], ['Destructive', 'destructive']];
/** The last sentence on Color › Interactive (owner decision Q53, APPROVED). */
export const EVERY_SET = 'Every button set is shown, including ones you added.';
const DESC_HEAD = 'Each interactive palette in four treatments — filled, outline, text, inverse — with its rest / hover / pressed set laid out in a row. Each button is tagged with its exact fill token; the treatment label carries the supporting token. Disabled is one shared, stateless set.';

export const interactiveSection = (ctx: SgCtx, o: InteractiveSectionOptions): HTMLElement => {
  const { cur, paint } = ctx;
  // With `badges: false` a chip is the pill alone, exactly the node the Style guide drew before the lift.
  const pill = (k: string, label?: string): HTMLElement[] => ctx.chip(k, label);
  const columns = o.columns ?? BUILT_IN_SECTION_COLUMNS;
  // The last sentence is true only where the accents are left out (the Style guide).
  const secInt = palSection('Interactive', o.columns
    ? `${DESC_HEAD} ${EVERY_SET}`
    : `${DESC_HEAD} This style guide covers Primary, Neutral and Destructive only — accent palettes aren’t shown here.`);
  secInt.dataset.sgSection = 'interactive';   // the shared-section marker (`kit.ts`'s header)
  const STATES = ['rest', 'hover', 'pressed'];
  // `pair` names the engine roles an OPAQUE fill specimen previews (#1652) — see `specimenPair`. The
  // outline row passes none: its fill is a translucent wash and its ink is contracted against the page, so
  // it has no single ink-on-fill pair to claim and stays on the smoke floor.
  // Display-only (Q196, #2487): every state is already drawn side by side, so a specimen is inert, out of the tab order
  // and the accessibility tree, rather than 39 tab stops that do nothing, each named "Button".
  const btn = (bg: string, fg: string, bd: string | null, pair?: [string, string]): HTMLElement => { const b = hook(el('button', 'sg-btn', 'Button'), 'style-guide-button'); b.inert = true; b.style.background = bg; (pair ? specimenPair(b, ...pair) : specimen(b)).style.color = fg; if (bd) b.style.borderColor = bd; return b; };
  const bcol = (bg: string, fg: string, bd: string | null, st: string, fullkey: string, subpath: string, pair?: [string, string]): HTMLElement => { const c = hook(el('div', 'sg-bcol'), 'style-guide-state'); c.append(btn(bg, fg, bd, pair), hook(el('span', 'sg-st', st), 'style-guide-state-name'), ...pill(fullkey, subpath)); return c; };
  const footLine = (lbl: string, ...p: HTMLElement[]): HTMLElement => { const s = el('span', 'sg-foothint'); s.append(document.createTextNode(lbl + ' '), ...p); return s; };
  const trow = (label: string, foot: HTMLElement[], cols: HTMLElement[], inv: boolean): HTMLElement => {
    const row = el('div', 'sg-trow');
    const lab = el('div', 'sg-tlab', label);
    if (foot.length) { const f = el('div', 'sg-tlfoot'); foot.forEach((n) => f.append(n)); lab.append(f); }
    const bs = hook(el('div', 'sg-btns' + (inv ? ' sg-inv' : '')), 'style-guide-buttons');
    if (inv) {
      // #555 — the strip's own ground is `inverse.background.primary` for the CURRENT mode, and that
      // is not always dark: in a Dark mode, the inverse of dark is light, so a state label ink fixed
      // to a light gray (correct for the light-in-Light-mode case) went invisible on it. Pick the ink
      // from the resolved strip color instead of assuming which side of light/dark it lands on.
      const invBg = paint(cur, 'inverse.background.primary');
      bs.style.setProperty('--sg-invp', invBg);
      bs.style.setProperty('--sg-invp-ink', legibleInkOn(invBg, '#191920', '#c9ccce'));
    }
    cols.forEach((c) => bs.append(c));
    row.append(lab, bs);
    return row;
  };
  // Is the chosen preview ground itself an inverse band? Both the background and foreground inverse
  // tiers qualify — what matters is that the ground is the dark one the `inverse` column was
  // measured against, not which collection it came from.
  //
  // `isInverseRole`, the engine's own predicate, not a local `.includes('inverse')`. That substring
  // test was the only spelling available while the marker sat mid-path in three different positions;
  // #1140 makes it a single leading segment, so the question has one answer and one place to ask it.
  const onInverseGround = isInverseRole(o.surface);
  const paletteBlock = (nm: string, c: string): HTMLElement => {
    const block = hook(el('div', 'sg-pblock'), 'style-guide-palette');
    const hd = el('div', 'sg-phd'); hd.append(el('span', 'sg-rn', nm), ...pill(`interactive.${c}.fill.rest`, `color.interactive.${c}`)); block.append(hd);
    const filled = STATES.map((s) => bcol(paint(cur, `interactive.${c}.fill.${s}`), paint(cur, `interactive.${c}.on-fill`), null, s, `interactive.${c}.fill.${s}`, `fill.${s}`,
      [`interactive.${c}.on-fill`, `interactive.${c}.fill.${s}`]));
    // Each state's hover fill comes from whichever family the METHOD emits — `outlineFillRole`, the
    // same helper the emitter branches on, not a second copy of the mapping. Reading `overlay.*`
    // unconditionally is #288, and it was still here: under `solid-tint` the overlay role does not
    // exist, `paint()` returns 'transparent' for a missing role, and the row rendered the `none`
    // treatment. Two of three methods therefore looked identical on the surface a designer hands a
    // developer as the reference — and `none` was only "right" by accident.
    //
    // The GROUND is part of that choice too (#1629): on an inverse preview ground the fill reads the
    // `inverse.` twin of that role, as the ink and edge below do. All three keys come from one pure
    // helper, `outlineStateRoles`, so the three cannot take the ground switch separately again — the
    // fill was the one that did not, and painted the page wash on the band.
    const rolesFor = (s: string) => outlineStateRoles(o.method, c, s, onInverseGround);
    const bgFor: Record<string, string> = Object.fromEntries(
      STATES.map((s) => { const k = rolesFor(s).fill; return [s, k ? paint(cur, k) : 'transparent']; }));
    // The OUTLINE ink is the one role here measured against the PAGE rather than against its own
    // fill, so it is the one that breaks when the preview ground stops being the page. On the
    // inverse band `interactive.<c>.text.rest` rendered #0e0d0c on #0e0d0c — 1.00:1, the identical
    // colour, text that is not merely low-contrast but literally invisible. The engine already
    // resolves `inverse.interactive.<c>.text.*` for exactly this ground, so the row asks for the ink that matches
    // where it is being shown. Filled and Inverse need no such switch: their ink is `on-fill`,
    // measured against the button's own fill, which the ground behind it cannot change.
    // The EDGE takes the same switch, for the same reason and now with a token to switch to. #461
    // could only move the ink: the engine emitted one border, measured against the page, so the
    // outline row kept a page-ground edge on the dark band. #467 added `inverse.border`.
    //
    // The switch is PER STATE, not per row, and fixing the fill above is what forced that. The wash
    // is translucent, so a hovered control on the inverse band is still on the band and the
    // `inverse` ink is right for all three states. Since #1614 the `solid-tint` fill is translucent
    // too (the fill at an opacity step), so `opaque` is false and the switch (now in `outlineStateRoles`)
    // no longer fires for it. Until then it was an OPAQUE palette step: it covered the band, so from `hover` onward the ground is a page-tuned tint and the
    // band's ink is measured against something that is no longer there. Probed across the corpus —
    // 5 brands × 4 modes × {primary, destructive} × {hover, pressed} — the inverse ink on that tint
    // fails 3:1 in **79 of 80** combinations, worst 1.32:1. The engine gates the tint against the
    // control's own PAGE ink for that state (worst 4.51:1 across 120 rows), so the page ink is not a
    // fallback here, it is the measured-correct answer. Reading the right role and keeping the
    // row-wide ink switch would have traded a visible bug for an invisible one — the exact
    // gated-ground/painted-ground family as #63, #570 and #573.
    // The marker is a PREFIX since #1140, so the conditional moved to the front of the key rather
    // than into the middle of it. Same two candidate roles, one segment position.
    const otxt = (s: string) => rolesFor(s).text;
    // The edge is now stateful too (#576), so this appends the state exactly as `otxt` does. #575
    // had already made this function per-state — it took `s` only to choose the GROUND, and returned
    // the same single border for all three. The state key is the half that was missing.
    const obdFor = (s: string) => rolesFor(s).border;
    // The footer pill names the REST edge — the state whose ground is the row's own, and the one a
    // reader is looking at when they read the label.
    const obd = obdFor('rest');
    const outline = STATES.map((s) => bcol(bgFor[s], paint(cur, otxt(s)), paint(cur, obdFor(s)), s, otxt(s), `text.${s}`));
    // The text button: the Outline row's wash and ink, no edge (`bd` null leaves `.sg-btn`'s transparent one).
    const text = STATES.map((s) => bcol(bgFor[s], paint(cur, otxt(s)), null, s, otxt(s), `text.${s}`));
    const inv = STATES.map((s) => bcol(paint(cur, `inverse.interactive.${c}.fill.${s}`), paint(cur, `inverse.interactive.${c}.on-fill`), null, s, `inverse.interactive.${c}.fill.${s}`, `fill.${s}`,
      [`inverse.interactive.${c}.on-fill`, `inverse.interactive.${c}.fill.${s}`]));
    block.append(trow('Filled', [footLine('text', ...pill(`interactive.${c}.on-fill`, 'on-fill'))], filled, false));
    block.append(hook(trow('Outline', [footLine('border', ...pill(obd, 'border'))], outline, false), 'style-guide-outline'));
    block.append(hook(trow('Text', [footLine('text', ...pill(otxt('rest'), 'text'))], text, false), 'style-guide-text'));
    // The Inverse row paints its own inverse band so the inverse-column variants have the ground they
    // were measured against. When the PREVIEW ground is already that band, painting it again is a
    // dark rectangle on an identical dark rectangle: the row loses its edges and reads as "still
    // dark" rather than as a distinct treatment. On that ground the row simply uses the page's.
    block.append(trow('Inverse', [footLine('text', ...pill(`inverse.interactive.${c}.on-fill`, 'on-fill'))], inv, !onInverseGround));
    return block;
  };
  for (const [nm, c] of columns) secInt.append(paletteBlock(nm, c));
  {
    const block = hook(el('div', 'sg-pblock'), 'style-guide-palette');
    const hd = el('div', 'sg-phd'); hd.append(el('span', 'sg-rn', 'Disabled'), ...pill('disabled.fill', 'color.disabled')); block.append(hd);
    block.append(trow('Filled', [footLine('text', ...pill('disabled.on-fill', 'on-fill'))], [bcol(paint(cur, 'disabled.fill'), paint(cur, 'disabled.on-fill'), null, 'disabled', 'disabled.fill', 'fill', ['disabled.on-fill', 'disabled.fill'])], false));
    block.append(hook(trow('Outline', [footLine('text', ...pill('disabled.text', 'text'))], [bcol('transparent', paint(cur, 'disabled.text'), paint(cur, 'disabled.border'), 'disabled', 'disabled.border', 'border')], false), 'style-guide-outline'));
    block.append(trow('Inverse', [el('span', 'sg-foothint', 'shared — no inverse variant')], [bcol(paint(cur, 'disabled.fill'), paint(cur, 'disabled.on-fill'), null, 'disabled', 'disabled.fill', 'fill', ['disabled.on-fill', 'disabled.fill'])], !onInverseGround));
    secInt.append(block);
  }
  return secInt;
};
