/**
 * Color › Palettes, the levers panel (UI redesign S2; concept v6's Palettes page, V7, R2, R3).
 *
 * WHAT IT DRAWS, in v6's order, from the page's sections in `shell/pages.ts`: the page intro; Primary;
 * Brand colors, with a row per color and the dashed add; Neutrals (follow primary or a custom tint, then
 * chroma); and behind "Show 5 advanced", the pinned neutral and the four status colors (R2: Palettes keeps
 * the manifest's `advanced` flag). Last, the way on to the next sub-page. Each manifest key homed here draws
 * its `lever-*` block exactly once.
 *
 * HOW IT REPAINTS: by store subscription only (plan §5). A control writes the brand through
 * `state/palette-input.ts` and calls `rebuild()`; the `brand` topic tells this panel, the preview and the
 * chrome. The panel redraws itself whole only when its SHAPE changes (a color added, removed or renamed, a
 * source switched, Show advanced opened); otherwise each control updates in place and a focused field is
 * left alone, so a drag or a caret survives every edit. It never names a legacy repaint tier and never
 * imports `main.ts` (`test-shell-imports.ts`).
 *
 * SEARCH (Q3) filters this panel in place: a lever block that does not match its label, description or
 * key is hidden, and so is a section with none that do. Advanced levers are searched too.
 */
import { brandState, lastError, rebuild, searchQuery, setPage, setSearchHits, subscribe, theme } from '../state/store';
import {
  STATUS_ROLES, addBrandColor, anchorStepFor, autoStatus, hexOf, hueName, removeBrandColor, renameBrandColor, setBrandColor,
  setNeutralAnchor, setNeutralChroma, setNeutralFollow, setNeutralHue, setNeutralPinned, setPrimary, setStatusColor,
  removalEffects, setStatusSource, statusSeedHex, statusSource, type StatusRole, type StatusSource,
} from '../state/palette-input';
import { DOMAINS, type PageData, type Section } from '../shell/pages';
import { glyph, h, hook } from '../shell/dom';
import { noteEdit } from '../preview/follow-edit';
import { choice, colorField, inlineConfirm, leverBlock, setText, leverOf, selectField, sliderReadout, slider, stateLine, subLine, switchButton, type LeverBlock } from '../ui/lever-kit';

const PAGE = (DOMAINS.find((d) => d.id === 'color') as { subpages: readonly PageData[] }).subpages.find((p) => p.id === 'palettes')!;
const pad = (n: number): string => String(n).padStart(3, '0');
const oklchMeta = (o: { l: number; c: number; h: number }): string => `OKLCH ${o.l.toFixed(3)} ${o.c.toFixed(3)} ${Math.round(o.h * 10) / 10}°`;

/** The page the Continue button opens: the next Color sub-page, by the store's page key (S4a moved it). */
const NEXT = { label: 'Surfaces & fills', page: 'fills' } as const;

type Drawn = { block: LeverBlock; keys: readonly string[]; sync: () => void };

/** Mount the Palettes levers into `host`. Returns nothing; everything it subscribes to is released through
 *  `cleanups`, which the frame runs when the page goes. */
export const mountPalettesLevers = (host: HTMLElement, cleanups: (() => void)[]): void => {
  const root = hook(h('div', 'p3-levers-body'), 'palettes-levers');
  host.replaceChildren(root);
  let advOpen = false;
  /** The key the last edit wrote, so an engine refusal marks the lever that caused it. */
  let lastEdited: string | null = null;
  let drawn: Drawn[] = [];
  let shapeKey = '';
  /** Whether the advanced sections are drawn: when Show advanced is open, and while a search runs. */
  let advDrawn = false;
  /** The brand color whose removal is being confirmed, by name, or null. Part of the shape, so the confirm
   *  survives a repaint and closes with one. */
  let confirmRemove: string | null = null;
  const removeBtn = (name: string): HTMLElement | null =>
    [...root.querySelectorAll<HTMLElement>('[data-p3="brand-color-remove"]')].find((n) => n.getAttribute('aria-label') === `Remove ${name}`) ?? null;
  /** The remove confirm: what else the removal changes, then Remove and Cancel. Focus goes back to the
   *  color's remove button on Cancel, and to Add brand color once the color is gone. */
  const removeConfirm = (i: number, name: string): HTMLElement => {
    const effects = removalEffects(name);
    const ul = h('ul', 'p3-confirm-list');
    for (const e of effects.length ? effects : ['Nothing else uses it.']) ul.append(h('li', undefined, e));
    return inlineConfirm('brand-color-confirm', {
      title: `Remove ${name}?`,
      body: [ul],
      action: `Remove ${name}`,
      onConfirm: () => { confirmRemove = null; edit('brandColors', () => removeBrandColor(i)); },
      onCancel: () => { confirmRemove = null; render(); },
      back: () => removeBtn(name) ?? root.querySelector<HTMLElement>('[data-p3="brand-color-add"]'),
    });
  };

  /** The palette an edit to `key` changes, for the Q4 trial (`preview/follow-edit.ts`). */
  const paletteOf = (key: string, name?: string): string | null =>
    key === 'primary' ? 'primary' : key.startsWith('neutral.') ? 'neutral' : key.startsWith('status.') ? key.slice('status.'.length)
      : key === 'brandColors' ? name ?? null : null;
  const edit = (key: string, write: () => void, name?: string): void => {
    lastEdited = key;
    write();
    noteEdit(paletteOf(key, name));   // Q4 trial: the edit, and only an edit, reveals its palette
    rebuild();
  };

  const shape = (): string => JSON.stringify([
    advOpen, confirmRemove, (brandState.brandColors ?? []).map((b) => b.name), !!brandState.neutral.auto, !!brandState.neutral.anchor,
    STATUS_ROLES.map(statusSource), (brandState.brandColors ?? []).length,
  ]);

  // ── the rows, by their `ctl` in the page data ─────────────────────────────────────────────────
  const rows: Record<string, (keys: readonly string[]) => Drawn[]> = {
    primary: () => {
      const b = leverBlock('primary', { forId: 'p3-primary-color' });
      const cf = colorField('p3-primary-color', leverOf('primary')!.label, 'primary', (v) => edit('primary', () => setPrimary(v)));
      const sub = subLine('');
      b.ctl.append(cf.el, sub);
      return [{ block: b, keys: ['primary'], sync: () => {
        cf.set(hexOf(brandState.primary), oklchMeta(brandState.primary));
        const steps = theme.palettes.find((p) => p.palette === 'primary')?.steps.length ?? 0;
        const a = anchorStepFor('primary');
        setText(sub, a !== null ? `Pinned at step ${pad(a)} of the primary ramp. The other ${steps - 1} steps are derived.` : '');
      } }];
    },

    brandColors: () => {
      const b = leverBlock('brandColors');
      const list = h('div', 'p3-list');
      const syncs: (() => void)[] = [];
      const bc = brandState.brandColors ?? [];
      bc.forEach((c, i) => {
        const row = hook(h('div', 'p3-list-row'), 'brand-color-row');
        const field = h('div', 'p3-colorfield');
        const pick = hook(h('input', 'p3-color-input'), 'brand-color-color');
        pick.type = 'color';
        pick.dataset.content = '';
        pick.setAttribute('aria-label', `${c.name} color`);
        pick.addEventListener('input', () => edit('brandColors', () => setBrandColor(i, pick.value), brandState.brandColors?.[i]?.name));
        const name = hook(h('input', 'p3-hex-input p3-name-input'), 'brand-color-name');
        name.type = 'text';
        name.spellcheck = false;
        name.value = c.name;
        name.setAttribute('aria-label', 'Brand color name');
        name.addEventListener('change', () => {
          // Refused names (empty, unchanged, another palette's) put the old name back; nothing is written.
          if (!renameBrandColor(i, name.value)) { name.value = brandState.brandColors?.[i]?.name ?? c.name; return; }
          lastEdited = 'brandColors';
          rebuild();
        });
        const meta = h('span', 'p3-colorfield-meta');
        field.append(pick, name, meta);
        const rm = hook(h('button', 'p3-btn p3-btn-page p3-btn-icon'), 'brand-color-remove');
        rm.type = 'button';
        rm.setAttribute('aria-label', `Remove ${c.name}`);
        rm.append(glyph('x'));
        // Removing asks first, in place (owner, 2026-10-01), with S3's confirm (`inlineConfirm`). It names what
        // else the removal changes (`removalEffects`, the cascade `removeBrandColor` runs). Cancel writes
        // nothing; the action is the same removal and cascade as before.
        rm.onclick = () => { confirmRemove = c.name; render(); };
        row.append(field, rm);
        list.append(row);
        if (confirmRemove === c.name) list.append(removeConfirm(i, c.name));
        syncs.push(() => {
          const cur = brandState.brandColors?.[i];
          if (!cur) return;
          if (document.activeElement !== pick && pick.value !== hexOf(cur.oklch)) pick.value = hexOf(cur.oklch);
          setText(meta, hexOf(cur.oklch));
        });
      });
      if (!bc.length) list.append(subLine('No additional colors. The brand uses primary and the neutrals.'));
      const add = hook(h('button', 'p3-btn p3-addrow'), 'brand-color-add');
      add.type = 'button';
      add.append(glyph('plus'), h('span', 'p3-btn-label', 'Add brand color'));
      add.onclick = () => {
        edit('brandColors', () => addBrandColor());
        // The new row's name field takes focus, so the color can be named straight away.
        const rowsNow = root.querySelectorAll<HTMLInputElement>('[data-p3="brand-color-name"]');
        rowsNow[rowsNow.length - 1]?.focus();
      };
      list.append(add);
      b.ctl.append(list);
      return [{ block: b, keys: ['brandColors'], sync: () => syncs.forEach((f) => f()) }];
    },

    neutral: () => {
      const hueL = leverOf('neutral.hue')!, chL = leverOf('neutral.chroma')!;
      const follow = !!brandState.neutral.auto;
      const pinned = !!brandState.neutral.anchor;
      const a = leverBlock('neutral.hue', { group: true });
      const src = choice('Neutral source', 'neutral-source', [{ v: 'follow', l: 'Follow primary' }, { v: 'custom', l: 'Custom tint' }] as const,
        (v) => edit('neutral.hue', () => setNeutralFollow(v === 'follow')));
      const followLine = subLine('');
      const hue = slider('neutral.hue', 'neutral-hue-slider', hueL.label, (v) => edit('neutral.hue', () => setNeutralHue(v)));
      // As the legacy page: only a custom tint edits hue and chroma. A pinned neutral shows the anchor's
      // own hue and chroma, read-only (they are its readout); under Follow primary the hue follows primary
      // and chroma is read-only too. (Letting chroma move under Follow primary, which the engine reads, is
      // held for the owner, UI redesign S2 review.)
      a.ctl.append(src.el, follow && !pinned ? followLine : hue.el);
      hue.el.disabled = pinned;
      const b = leverBlock('neutral.chroma', { forId: 'p3-neutral-chroma' });
      const ch = slider('neutral.chroma', 'neutral-chroma-slider', chL.label, (v) => edit('neutral.chroma', () => setNeutralChroma(v)));
      ch.el.disabled = pinned || follow;
      b.ctl.append(ch.el);
      return [
        { block: a, keys: ['neutral.hue'], sync: () => {
          const n = brandState.neutral;
          const f = !!n.auto;
          src.set(f ? 'follow' : 'custom');
          const eff = f ? brandState.primary.h : n.hue;
          setText(followLine, `Hue follows primary: ${Math.round(eff * 10) / 10}°.`);
          const h0 = n.anchor ? n.anchor.h : n.hue;
          hue.set(h0);
          a.setReadout(n.anchor ? sliderReadout(hueL, h0) : f ? `${Math.round(eff)}° · follows primary` : sliderReadout(hueL, n.hue));
          a.setState(n.anchor ? stateLine(`A pinned neutral in Advanced sets the ramp: ${hexOf(n.anchor)}. Hue and chroma are its readout.`) : null);
        } },
        { block: b, keys: ['neutral.chroma'], sync: () => {
          const c0 = brandState.neutral.anchor ? brandState.neutral.anchor.c : brandState.neutral.chroma;
          ch.set(c0); b.setReadout(sliderReadout(chL, c0));
        } },
      ];
    },

    neutralAnchor: () => {
      const b = leverBlock('neutral.anchor', { forId: 'p3-neutral-pin' });
      const sw = switchButton('p3-neutral-pin', leverOf('neutral.anchor')!.label, 'neutral-pin-switch',
        { on: 'Pinned', off: 'Off: the ramp is derived from hue and chroma' }, (on) => edit('neutral.anchor', () => setNeutralPinned(on)));
      b.ctl.append(sw.el);
      const pinned = !!brandState.neutral.anchor;
      const cf = pinned ? colorField('p3-neutral-anchor', 'Pinned neutral', 'neutral-anchor', (v) => edit('neutral.anchor', () => setNeutralAnchor(v))) : null;
      if (cf) b.ctl.append(cf.el);
      return [{ block: b, keys: ['neutral.anchor'], sync: () => {
        const anc = brandState.neutral.anchor;
        sw.set(!!anc);
        if (cf && anc) cf.set(hexOf(anc), oklchMeta(anc));
      } }];
    },

    status: (keys) => {
      const key = keys[0];
      const role = key.split('.')[1] as StatusRole;
      const b = leverBlock(key, { forId: `p3-status-${role}` });
      const sel = selectField(`p3-status-${role}`, leverOf(key)!.label, `status-${role}-source`, (v) => edit(key, () => setStatusSource(role, v as StatusSource)));
      b.ctl.append(sel.el);
      const custom = statusSource(role) === 'custom';
      const cf = custom ? colorField(`p3-status-${role}-color`, leverOf(key)!.label, `status-${role}`, (v) => edit(key, () => setStatusColor(role, v))) : null;
      if (cf) b.ctl.append(cf.el);
      return [{ block: b, keys: [key], sync: () => {
        const auto = autoStatus()[role];
        const st = brandState.status?.[role];
        const names = ['primary', ...(brandState.brandColors ?? []).map((x) => x.name)];
        sel.set([
          { v: 'auto', l: auto.reuse ? `Auto: reuses ${auto.reuse} (${hueName(auto.h)}, ${Math.round(auto.h)}°)` : `Auto: synthesized ${hueName(auto.h)}, ${Math.round(auto.h)}°` },
          { v: 'custom', l: st ? `Custom: ${hueName(st.h)}, ${Math.round(st.h)}°` : 'Custom color' },
          ...names.map((p) => ({ v: `use:${p}`, l: `Use ${p}` })),
        ], statusSource(role));
        if (cf) cf.set(statusSeedHex(role), st ? oklchMeta(st) : '');
      } }];
    },
  };

  // ── the page ──────────────────────────────────────────────────────────────────────────────────
  const section = (s: Section, i: number): { el: HTMLElement; drawn: Drawn[] } => {
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-palettes-${i}`;
    const head = h('div', 'p3-lsec-head');
    const title = h('h3', 'p3-lsec-title', s.title);
    title.id = `${el.id}-t`;
    el.setAttribute('aria-labelledby', title.id);
    head.append(title);
    if (s.desc) head.append(h('p', 'p3-lsec-desc', s.desc));
    el.append(head);
    const out: Drawn[] = [];
    for (const r of s.rows) {
      const ds = rows[r.ctl]?.(r.keys ?? []) ?? [];
      for (const d of ds) el.append(d.block.el);
      out.push(...ds);
    }
    return { el, drawn: out };
  };

  const render = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const focusKey = had && root.contains(had) ? had.getAttribute('data-p3') : null;
    const focusIndex = focusKey ? [...root.querySelectorAll(`[data-p3="${focusKey}"]`)].indexOf(had!) : -1;
    shapeKey = shape();
    drawn = [];
    const parts: HTMLElement[] = [h('p', 'p3-intro', PAGE.intro)];
    const adv = PAGE.sections.filter((s) => s.advanced);
    PAGE.sections.forEach((s, i) => {
      if (s.advanced) return;
      const x = section(s, i); parts.push(x.el); drawn.push(...x.drawn);
    });
    if (adv.length) {
      const n = adv.reduce((a, s) => a + s.rows.length, 0);
      const showAll = advOpen || !!searchQuery.trim();
      advDrawn = showAll;
      const row = h('div', 'p3-advrow');
      const btn = hook(h('button', 'p3-btn p3-btn-page'), 'palettes-advanced');
      btn.type = 'button';
      btn.id = 'p3-adv-palettes';
      btn.setAttribute('aria-expanded', String(showAll));
      btn.setAttribute('aria-controls', 'p3-advb-palettes');
      btn.append(glyph(showAll ? 'chev' : 'chevr'), h('span', 'p3-btn-label', `${advOpen ? 'Hide' : 'Show'} ${n} advanced`));
      btn.onclick = () => { advOpen = !advOpen; render(); };
      const body = h('div', 'p3-advbody');
      body.id = 'p3-advb-palettes';
      if (showAll) PAGE.sections.forEach((s, i) => { if (!s.advanced) return; const x = section(s, i); body.append(x.el); drawn.push(...x.drawn); });
      body.hidden = !showAll;
      row.append(btn, body);
      parts.push(row);
    }
    const next = hook(h('button', 'p3-btn p3-btn-page p3-next'), 'palettes-continue');
    next.type = 'button';
    next.append(h('span', 'p3-btn-label', `Continue to ${NEXT.label}`), glyph('chevr'));
    next.onclick = () => setPage(NEXT.page);
    parts.push(h('div', 'p3-nextrow'));
    parts[parts.length - 1].append(next);
    root.replaceChildren(...parts);
    sync();
    filter();
    if (focusKey) [...root.querySelectorAll<HTMLElement>(`[data-p3="${focusKey}"]`)][Math.max(0, focusIndex)]?.focus({ preventScroll: true });
  };

  const sync = (): void => {
    for (const d of drawn) {
      d.sync();
      d.block.setRefused(!!lastError && !!lastEdited && d.keys.includes(lastEdited));
    }
  };

  /** Search (Q3): hide what does not match, report the count. */
  const filter = (): void => {
    const q = searchQuery.trim().toLowerCase();
    for (const d of drawn) d.block.el.hidden = !!q && !d.block.said.includes(q);
    for (const s of root.querySelectorAll<HTMLElement>('.p3-lsec')) s.hidden = !!q && !s.querySelector('.p3-lever:not([hidden])');
    for (const n of root.querySelectorAll<HTMLElement>('.p3-intro, .p3-nextrow')) n.hidden = !!q;
    const adv = root.querySelector<HTMLElement>('[data-p3="palettes-advanced"]');
    if (adv) adv.hidden = !!q;
    setSearchHits(q ? drawn.filter((d) => !d.block.el.hidden).length : null);
  };

  cleanups.push(subscribe('brand', () => { if (shape() !== shapeKey) render(); else sync(); }));
  cleanups.push(subscribe('search', () => { if ((advOpen || !!searchQuery.trim()) !== advDrawn) render(); else filter(); }));
  // Leaving the page clears its count, so the next page's search starts from its own.
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  render();
};
