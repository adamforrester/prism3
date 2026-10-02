/**
 * Color › Surfaces & fills, the levers panel (UI redesign S4a; concept v6's Surfaces & fills page, V8, V9,
 * V10, R2, R5; S4c, the owner's decisions Q22 to Q30).
 *
 * WHAT IT DRAWS, from the page's sections in `shell/pages.ts`: the intro; **Background fills** (the page, the
 * contrast floor and the inverse band, one set for the mode the preview shows, Q22); **Foreground fills** (a
 * row per fill: a small swatch, its name and role, and a button that opens the step picker under the row,
 * with the ratio on it); **Text color** (the same rows for the text inks: the permanent, primary text editor,
 * owner decision Q20; no link row, Q28: links are edited on Interactive only); **Fields** (a row per
 * `field.*` role, page and inverse, Q29); **Gradients** (the switch, then an editor per gradient with a 44px
 * bar and editable stops). Every lever is shown (R2: this page shows every lever). Last, the way on to
 * Interactive.
 *
 * WRITES. Every write goes through `state/fills-input.ts`. Each control writes what the S4a page's control
 * for that mode wrote, byte for byte on the persisted brand: since S4c the surface controls write the
 * previewed mode's `surfaces` key, where S4a drew a Light group and a Dark group. The Fields rows are new
 * writes (`setRoleOverride`, the one `field.fill` always had). Where this page differs from concept v6, it is
 * by the owner's decision (`docs/superpowers/ui-redesign/decisions-2026-10-01-qa.md`):
 *   · every control edits the mode the preview shows (Q19, Q22), not light only as v6's R5 had it;
 *   · the options are the legacy page's: every neutral step for the page and the floor, the inverse band as
 *     a palette and a step, one palette per row in the step picker (Q21).
 *
 * HOW IT REPAINTS: by store subscription only (plan §5). A control writes through `fills-input.ts` and calls
 * `rebuild()`; the `brand` topic repaints this panel, the preview and the chrome, and `mode` repaints both.
 * The panel is redrawn whole, keeping focus on the element that had it (by hook and position), so a picker
 * stays open on its row and a choice in it keeps its focus. It never names a legacy repaint tier and never
 * imports `main.ts` (`test-shell-imports.ts`).
 */
import { brandState, currentMode, lastError, rebuild, searchQuery, setPage, setSearchHits, subscribe, theme } from '../state/store';
import { isDerived } from '../state/verdict';
import {
  FIELD_ROWS, FILL_ROWS, TEXT_ROWS, addGradient, addStop, bandOf, bandPalettes, editGradient, gradStopHex,
  inputGradientCss, neutralStepOptions, overrideOf, paletteOf, readGradients, removeGradient, removeStop, renameGradient, rolesIn,
  setBandPalette, setBandStep, setCenter, setGradientsOn, setRowOverride, setStopPalette, setStopPosition, setStopStep,
  SCRIM_ROLE, SURFACE_TOKENS, setSurfaceBase, setSurfaceFloor, stepHex, stepOfPath, stepsOf, surfaceSourceOf, washReadOf, type FillRow,
} from '../state/fills-input';
import { DOMAINS, type PageData, type Section } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { glyph, h, hook } from '../shell/dom';
import { leverBlock, selectField, stateLine, subLine, switchButton, type LeverBlock } from '../ui/lever-kit';
import { fmtRatio, stepPicker } from '../ui/step-picker';

const PAGE = (DOMAINS.find((d) => d.id === 'color') as { subpages: readonly PageData[] }).subpages.find((p) => p.id === 'fills')!;
/** The page the Continue button opens: the next Color sub-page, by the store's page key. */
const NEXT = { label: 'Interactive', page: 'interactive' } as const;

/** Something drawn that search can hide and a refusal can mark. */
type Item = { el: HTMLElement; said: string; key: string; block?: LeverBlock; refmark?: HTMLElement };

/** The hook a fill or text row carries for `role`, and its picker button's. */
const rowHook = (role: string): string => `fill-row-${role.replace(/\./g, '-')}`;

/** Mount the Surfaces & fills levers into `host`. Subscriptions are released through `cleanups`. */
export const mountFillsLevers = (host: HTMLElement, cleanups: (() => void)[]): void => {
  const root = hook(h('div', 'p3-levers-body'), 'fills-levers');
  host.replaceChildren(root);
  /** The role whose step picker is open, or null. One at a time, under its row (v6). */
  let openRole: string | null = null;
  /** The key the last edit wrote, so an engine refusal marks the lever or row that caused it. */
  let lastEdited: string | null = null;
  let items: Item[] = [];
  /** The open picker's focus, by role, from the last draw. */
  const pickers = new Map<string, () => void>();

  const edit = (key: string, write: () => void): void => {
    lastEdited = key;
    write();
    rebuild();
  };

  // ── Background fills: the page, the contrast floor and the inverse band, for the previewed mode ─────
  // One set of controls (owner decision Q22), where S4a drew a Light group and a Dark group: each control
  // writes `surfaces.<the previewed mode>`, as that mode's group did. A mode with no surfaces of its own (a
  // derived or a custom mode) shows the ones it is drawn from, disabled, with the line the rows use.
  const surfaces = (): Item[] => {
    // The lever's name is the section's (owner decision Q26), not the manifest's "Page surfaces": the block
    // heads the section, as Gradients' does. Its info text is still the manifest's description.
    const b = leverBlock('surfaces', { label: 'Background fills' });
    const opts = neutralStepOptions();
    const { source: m, editable } = surfaceSourceOf(currentMode);
    const sel = (id: string, label: string, role: string, options: { v: string; l: string }[], cur: string, on: (v: string) => void, token?: string): HTMLElement => {
      const f = h('div', 'p3-field');
      const lab = token ? tokenField(id, token, label) : h('label', 'p3-field-label', label);
      lab.htmlFor = id;
      const s = selectField(id, `${label}, ${modeLabel(currentMode)}`, role, on);
      s.set(options, cur);
      s.select.disabled = !editable;
      f.append(lab, s.el);
      return f;
    };
    /** A field that sets a token: the token, as a fill row shows its role, then the field's name. */
    const tokenField = (id: string, token: string, label: string): HTMLLabelElement => {
      const l = h('label', 'p3-fill-name');
      l.htmlFor = id;
      l.dataset.role = token;
      l.append(h('span', 'p3-fill-tok', token), h('span', 'p3-field-label', label));
      return l;
    };
    const roles = rolesIn(m);
    const cur = brandState.surfaces?.[m];
    const grp = hook(h('div', 'p3-modegroup'), 'surfaces-group');
    grp.dataset.mode = m;
    const d = derivedLine();
    grp.append(d ?? (editable ? editingLine() : subLine('Custom modes seed their surfaces from their base mode.')));
    const grid = h('div', 'p3-fieldgrid');
    // Page: white, black, or a neutral step. No Auto: an unset base reads as the mode's default.
    const baseVal = cur?.base ?? (m === 'dark' ? 'black' : 'white');
    grid.append(sel('p3-surf-base', 'Page', 'surface-base',
      [{ v: 'white', l: 'White' }, { v: 'black', l: 'Black' }, ...opts.map((o) => ({ v: String(o.value), l: o.label }))],
      String(baseVal), (v) => edit('surfaces', () => setSurfaceBase(m, v)), SURFACE_TOKENS.base));
    // Contrast floor: Auto names the floor it derived, read off a bold fill's `against`.
    const autoFloor = roles['foreground.brand']?.against;
    grid.append(sel('p3-surf-floor', 'Contrast floor', 'surface-floor',
      [{ v: '', l: autoFloor ? `Auto · ${autoFloor.replace('.', ' ')}` : 'Auto' }, ...opts.map((o) => ({ v: String(o.value), l: o.label }))],
      cur?.floorStep == null ? '' : String(cur.floorStep), (v) => edit('surfaces', () => setSurfaceFloor(m, v))));
    // Inverse band: a palette, then a step in it (#898).
    const band = bandOf(m);
    const nPal = theme.roleToPalette.neutral;
    const bf = h('div', 'p3-field p3-field-wide');
    const bl = tokenField('p3-surf-band', SURFACE_TOKENS.inverseBase, 'Inverse band');
    const pair = h('div', 'p3-fieldpair');
    const ps = selectField('p3-surf-band', `Inverse band palette, ${modeLabel(currentMode)}`, 'surface-band-palette', (v) => edit('surfaces', () => setBandPalette(m, v)));
    ps.set(bandPalettes().map((p) => ({ v: p, l: p === nPal ? 'Neutral' : p })), band.palette);
    const curSteps = stepsOf(band.palette);
    const bandAuto = band.palette === nPal ? stepOfPath(roles['inverse.background.primary']?.path)?.step ?? '' : String(curSteps[curSteps.length - 1] ?? '');
    const ss = selectField('p3-surf-bandstep', `Inverse band step, ${modeLabel(currentMode)}`, 'surface-band-step', (v) => edit('surfaces', () => setBandStep(m, v === '' ? undefined : v)));
    ss.set([{ v: '', l: `Auto · ${band.palette} ${bandAuto}` }, ...curSteps.map((s) => ({ v: s, l: `${band.palette} ${s}` }))], band.step ?? '');
    ps.select.disabled = ss.select.disabled = !editable;
    pair.append(ps.el, ss.el);
    bf.append(bl, pair);
    grid.append(bf);
    grp.append(grid);
    b.ctl.append(grp);
    const sc = scrimRow();
    if (sc) b.ctl.append(sc);
    return [{ el: b.el, said: `${b.said} page contrast floor inverse band ${SURFACE_TOKENS.base} ${SURFACE_TOKENS.inverseBase} scrim ${SCRIM_ROLE}`, key: 'surfaces', block: b }];
  };

  /** The scrim, read-only (owner decision, 2026-10-02): a fill row's swatch, name and role, and in place of the
   *  picker its primitive and opacity in the previewed mode. A wash has no ramp step to swap in, so there is
   *  nothing to pick (the reasons are on `washSourceRead` in `main.ts`). Its swatch composites the wash over the
   *  mode's page, as the preview's scrim card does. */
  const scrimRow = (): HTMLElement | null => {
    const roles = rolesIn(currentMode);
    const r = roles[SCRIM_ROLE];
    if (!r) return null;
    const { primitive, opacity } = washReadOf(r);
    const el = hook(h('div', 'p3-fillrow'), 'scrim-row');
    el.dataset.role = SCRIM_ROLE;
    const sw = h('span', 'p3-fill-sw');
    sw.dataset.content = '';
    const n = parseInt(r.hex.slice(1), 16);
    const wash = `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${r.alpha ?? 1})`;
    sw.style.background = `linear-gradient(${wash}, ${wash}), ${roles['background.primary']?.hex ?? '#ffffff'}`;
    const nm = h('div', 'p3-fill-name');
    nm.append(h('b', 'p3-fill-label', 'Scrim'), h('span', 'p3-fill-tok', SCRIM_ROLE));
    const read = hook(h('span', 'p3-fill-read', `${primitive} · ${opacity}%`), 'scrim-readout');
    read.title = 'A translucent wash has no ramp step to swap in — a step of the neutral ramp is opaque, and would replace the wash rather than retint it.';
    el.append(sw, nm, read);
    return el;
  };

  // ── fill and text rows, each with the step picker under it (V9, V10) ──────────────────────────────
  /** One overridable row: the swatch, the name and role, and the button that opens the step picker. */
  const row = (r: FillRow): Item | null => {
    const mode = currentMode;
    const roles = rolesIn(mode);
    const res = roles[r.role];
    if (!res) return null;
    const palette = paletteOf(r);
    const steps = stepsOf(palette);
    if (!steps.length) return null;
    const derived = isDerived(mode);
    const ov = overrideOf(mode, r.role);
    const at = stepOfPath(res.path);
    // A field fill that is transparent reads as the ground it sits on, so its swatch shows that ground.
    const tf = r.transparent;
    const transparent = !!tf && ov === undefined;
    const groundHex = roles[tf?.ground ?? 'background.primary']?.hex ?? '#ffffff';
    // What the role is measured against, and its floor. A field fill is judged by its value ink on it.
    const against = tf
      ? (roles[tf.ink] ? { hex: roles[tf.ink]!.hex, name: tf.ink, floor: tf.floor } : null)
      : res.against && res.against !== 'self' && (res.min ?? 0) > 0
        ? { hex: roles[res.against]?.hex ?? (() => { const d = res.against!.lastIndexOf('.'); return stepHex(res.against!.slice(0, d), res.against!.slice(d + 1)) ?? '#ffffff'; })(), name: res.against, floor: res.min! }
        : null;
    const ratio = !tf && res.against && res.against !== 'self' && typeof res.ratio === 'number' ? res.ratio : null;
    const below = ratio !== null && (res.min ?? 0) > 0 && ratio + 1e-9 < res.min!;

    const el = hook(h('div', 'p3-fillrow'), rowHook(r.role));
    el.dataset.role = r.role;
    const sw = h('span', 'p3-fill-sw');
    sw.dataset.content = '';
    sw.style.background = transparent ? groundHex : res.hex;
    const nm = h('div', 'p3-fill-name');
    nm.append(h('b', 'p3-fill-label', r.label), h('span', 'p3-fill-tok', r.role));
    const btn = hook(h('button', 'p3-btn p3-btn-page p3-pick'), 'fill-pick');
    btn.type = 'button';
    btn.id = `p3-pick-${r.role.replace(/\./g, '-')}`;
    btn.dataset.role = r.role;
    const open = openRole === r.role && !derived;
    btn.setAttribute('aria-expanded', String(open));
    const now = transparent ? 'Transparent' : `${ov !== undefined ? 'Override' : 'Auto'} · ${at ? `${at.palette} ${at.step}` : ''}`;
    btn.append(h('span', 'p3-btn-label', now));
    if (ratio !== null) {
      const rr = h('small', 'p3-pick-ratio', fmtRatio(ratio));
      if (below) { rr.dataset.below = 'true'; rr.append(glyph('x')); }
      btn.append(rr);
    }
    btn.append(glyph('chev'));
    btn.setAttribute('aria-label', `${r.label}: ${now}${ratio !== null ? `, ${fmtRatio(ratio)}` : ''}${below ? ', below floor' : ''}. Pick a step`);
    btn.disabled = derived;
    btn.onclick = () => {
      const opening = openRole !== r.role;
      openRole = opening ? r.role : null;
      render();
      // Opening a picker puts focus on its current step; closing it leaves focus on this button.
      if (opening) pickers.get(r.role)?.();
    };
    el.append(sw, nm, btn);
    const refmark = h('p', 'p3-refmark');
    refmark.setAttribute('role', 'note');
    refmark.append(glyph('x'), h('span', undefined, 'Refused. The preview keeps the last valid theme.'));
    refmark.hidden = true;
    const wrap = h('div', 'p3-fillrow-wrap');
    wrap.append(el, refmark);
    if (open) {
      const key = `row:${r.role}`;
      const pk = stepPicker({
        role: r.role,
        modeLabel: modeLabel(mode),
        palettes: [{ palette, steps: (theme.palettes.find((p) => p.palette === palette)?.steps ?? []).map((s) => ({ key: s.key, hex: s.hex })) }],
        current: transparent || !at || at.palette !== palette ? null : { palette, step: at.step },
        against,
        overridden: ov !== undefined,
        onPick: (_p, step) => edit(key, () => setRowOverride(mode, r, step)),
        onAuto: () => edit(key, () => setRowOverride(mode, r, undefined)),
        onClose: () => { openRole = null; render(); root.querySelector<HTMLElement>(`#${btn.id}`)?.focus(); },
      });
      wrap.append(pk.el);
      pickers.set(r.role, pk.focusCurrent);
    }
    return { el: wrap, said: `${r.label} ${r.role}`.toLowerCase(), key: `row:${r.role}`, refmark };
  };

  const derivedLine = (): HTMLElement | null =>
    isDerived(currentMode) ? stateLine(`${modeLabel(currentMode)} is auto-derived — read-only. Edit Light or Dark and it follows.`) : null;
  const editingLine = (): HTMLElement => subLine(`Editing ${modeLabel(currentMode)}, the mode the preview shows.`);

  /** A section's rows, under the line that says which mode they edit. */
  const rows = (key: string, list: readonly FillRow[]): Item[] => {
    const box = hook(h('div', 'p3-fillrows'), `${key === 'fills' ? 'fill' : key === 'fields' ? 'field' : key}-rows`);
    const out: Item[] = [];
    const d = derivedLine();
    box.append(d ?? editingLine());
    for (const r of list) { const it = row(r); if (it) { box.append(it.el); out.push(it); } }
    return [{ el: box, said: '', key }, ...out];
  };
  const fills = (): Item[] => rows('fills', FILL_ROWS);
  const text = (): Item[] => rows('text', TEXT_ROWS);
  const fields = (): Item[] => rows('fields', FIELD_ROWS);

  // ── Gradients: the switch, then an editor per gradient (v6: stops are editable) ─────────────────
  const gradients = (): Item[] => {
    const b = leverBlock('gradients', { forId: 'p3-gradients-switch' });
    const on = !!brandState.gradients;
    const sw = switchButton('p3-gradients-switch', 'Gradients', 'gradients-switch', { on: 'On', off: 'Off: no gradients emitted' },
      (v) => edit('gradients', () => setGradientsOn(v)));
    sw.set(on);
    b.ctl.append(sw.el);
    if (on) {
      const list = h('div', 'p3-list');
      const palNames = theme.palettes.map((p) => p.palette);
      readGradients().forEach((g, gi) => {
        const card = hook(h('div', 'p3-gedit'), 'gradient-editor');
        card.dataset.gradient = g.name;
        const top = h('div', 'p3-list-row');
        const nf = h('div', 'p3-colorfield');
        const name = hook(h('input', 'p3-hex-input p3-name-input'), 'gradient-name');
        name.type = 'text';
        name.spellcheck = false;
        name.value = g.name;
        name.setAttribute('aria-label', 'Gradient name');
        name.addEventListener('change', () => {
          lastEdited = 'gradients';
          if (!renameGradient(gi, name.value)) { name.value = g.name; return; }
          rebuild();
        });
        nf.append(name);
        const rm = hook(h('button', 'p3-btn p3-btn-page p3-btn-icon'), 'gradient-remove');
        rm.type = 'button';
        rm.setAttribute('aria-label', `Remove gradient ${g.name}`);
        rm.append(glyph('x'));
        rm.onclick = () => edit('gradients', () => removeGradient(gi));
        top.append(nf, rm);
        const bar = hook(h('div', 'p3-gbar'), 'gradient-bar');
        bar.dataset.content = '';
        bar.style.background = inputGradientCss(g);
        const set = h('div', 'p3-fieldgrid');
        const field = (label: string, id: string, ctl: HTMLElement): HTMLElement => {
          const f = h('div', 'p3-field');
          const l = h('label', 'p3-field-label', label);
          l.htmlFor = id;
          f.append(l, ctl);
          return f;
        };
        const kind = g.kind ?? 'linear';
        const ks = selectField(`p3-g-kind-${gi}`, `${g.name} kind`, 'gradient-kind', (v) => edit('gradients', () => editGradient(gi, (gg) => { gg.kind = v as 'linear' | 'radial'; })));
        ks.set([{ v: 'linear', l: 'Linear' }, { v: 'radial', l: 'Radial' }], kind);
        set.append(field('Kind', `p3-g-kind-${gi}`, ks.el));
        if (kind === 'linear') {
          const angle = g.angle ?? 135;
          const af = h('div', 'p3-field');
          const al = h('label', 'p3-field-label', `Angle · ${angle}°`);
          al.htmlFor = `p3-g-angle-${gi}`;
          const range = hook(h('input', 'p3-range'), 'gradient-angle');
          range.type = 'range';
          range.id = `p3-g-angle-${gi}`;
          range.min = '0'; range.max = '360'; range.step = '5'; range.value = String(angle);
          range.setAttribute('aria-valuetext', `${angle} degrees`);
          // The bar and the label follow the drag; the brand is written once, when the drag ends.
          range.addEventListener('input', () => {
            al.textContent = `Angle · ${range.value}°`;
            range.setAttribute('aria-valuetext', `${range.value} degrees`);
            bar.style.background = inputGradientCss({ ...g, angle: Number(range.value) });
          });
          range.addEventListener('change', () => edit('gradients', () => editGradient(gi, (gg) => { gg.angle = Number(range.value); })));
          af.append(al, range);
          set.append(af);
        } else {
          const shs = selectField(`p3-g-shape-${gi}`, `${g.name} shape`, 'gradient-shape', (v) => edit('gradients', () => editGradient(gi, (gg) => { gg.shape = v as 'circle' | 'ellipse'; })));
          shs.set([{ v: 'ellipse', l: 'Ellipse' }, { v: 'circle', l: 'Circle' }], g.shape ?? 'ellipse');
          set.append(field('Shape', `p3-g-shape-${gi}`, shs.el));
          const center = g.center ?? [0.5, 0.5];
          ([['Center X %', 0], ['Center Y %', 1]] as const).forEach(([label, idx]) => {
            const id = `p3-g-c${idx}-${gi}`;
            const cf = h('div', 'p3-colorfield');
            const num = hook(h('input', 'p3-hex-input p3-num-input'), `gradient-center-${idx ? 'y' : 'x'}`);
            num.type = 'number'; num.id = id; num.min = '0'; num.max = '100'; num.step = '5';
            num.value = String(Math.round(center[idx] * 100));
            num.addEventListener('change', () => edit('gradients', () => setCenter(gi, idx, Number(num.value))));
            cf.append(num);
            set.append(field(label, id, cf));
          });
        }
        const is = selectField(`p3-g-interp-${gi}`, `${g.name} interpolation`, 'gradient-interpolation', (v) => edit('gradients', () => editGradient(gi, (gg) => { gg.interpolation = v as 'oklch' | 'srgb'; })));
        is.set([{ v: 'oklch', l: 'OKLCH' }, { v: 'srgb', l: 'sRGB' }], g.interpolation ?? 'oklch');
        set.append(field('Interpolation', `p3-g-interp-${gi}`, is.el));
        const stops = h('div', 'p3-list');
        stops.append(h('span', 'p3-field-label', 'Stops'));
        g.stops.forEach((st, si) => {
          const sr = hook(h('div', 'p3-gstop'), 'gradient-stop');
          const ssw = h('i', 'p3-fill-sw');
          ssw.dataset.content = '';
          ssw.style.background = gradStopHex(st.palette, st.step);
          const pal = selectField(`p3-gs-p-${gi}-${si}`, `Stop ${si + 1} palette`, 'gradient-stop-palette', (v) => edit('gradients', () => setStopPalette(gi, si, v)));
          pal.set(palNames.map((p) => ({ v: p, l: p })), st.palette);
          const stp = selectField(`p3-gs-s-${gi}-${si}`, `Stop ${si + 1} step`, 'gradient-stop-step', (v) => edit('gradients', () => setStopStep(gi, si, Number(v))));
          stp.set((theme.palettes.find((p) => p.palette === st.palette)?.steps ?? []).map((s) => ({ v: String(s.num), l: s.key })), String(st.step));
          const pf = h('div', 'p3-colorfield p3-numfield');
          const pos = hook(h('input', 'p3-hex-input p3-num-input'), 'gradient-stop-position');
          pos.type = 'number'; pos.min = '0'; pos.max = '100'; pos.step = '5';
          pos.value = String(Math.round(st.position * 100));
          pos.setAttribute('aria-label', `Stop ${si + 1} position, percent`);
          pos.addEventListener('change', () => edit('gradients', () => setStopPosition(gi, si, Number(pos.value))));
          pf.append(pos);
          sr.append(ssw, pal.el, stp.el, pf);
          // A gradient needs two stops, so a stop is removable only while there are more than two (as before).
          if (g.stops.length > 2) {
            const srm = hook(h('button', 'p3-btn p3-btn-page p3-btn-icon'), 'gradient-stop-remove');
            srm.type = 'button';
            srm.setAttribute('aria-label', `Remove stop ${si + 1}`);
            srm.append(glyph('x'));
            srm.onclick = () => edit('gradients', () => removeStop(gi, si));
            sr.append(srm);
          }
          stops.append(sr);
        });
        const as = hook(h('button', 'p3-btn p3-addrow'), 'gradient-stop-add');
        as.type = 'button';
        as.append(glyph('plus'), h('span', 'p3-btn-label', 'Add stop'));
        as.onclick = () => edit('gradients', () => addStop(gi));
        stops.append(as);
        card.append(top, bar, set, stops);
        list.append(card);
      });
      const add = hook(h('button', 'p3-btn p3-addrow'), 'gradient-add');
      add.type = 'button';
      add.append(glyph('plus'), h('span', 'p3-btn-label', 'Add gradient'));
      add.onclick = () => edit('gradients', () => addGradient());
      list.append(add);
      b.ctl.append(list);
    }
    return [{ el: b.el, said: `${b.said} stops`, key: 'gradients', block: b }];
  };

  const ROWS: Record<string, () => Item[]> = { surfaces, fills, text, fields, gradients };

  // ── the page ──────────────────────────────────────────────────────────────────────────────────
  const section = (s: Section, i: number): { el: HTMLElement; items: Item[] } => {
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-fills-${i}`;
    const head = h('div', 'p3-lsec-head');
    const title = h('h3', 'p3-lsec-title', s.title);
    title.id = `${el.id}-t`;
    el.setAttribute('aria-labelledby', title.id);
    head.append(title);
    if (s.desc) head.append(h('p', 'p3-lsec-desc', s.desc));
    el.append(head);
    const out: Item[] = [];
    for (const r of s.rows) {
      const its = ROWS[r.ctl]?.() ?? [];
      // The first item is the section's own block (a lever, or the rows' box); rows are inside it.
      if (its[0]) el.append(its[0].el);
      out.push(...its);
    }
    return { el, items: out };
  };

  const render = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const focusKey = had && root.contains(had) ? had.getAttribute('data-p3') : null;
    const focusIndex = focusKey ? [...root.querySelectorAll(`[data-p3="${focusKey}"]`)].indexOf(had!) : -1;
    const focusStep = had?.dataset.step ?? null;
    items = [];
    pickers.clear();
    const parts: HTMLElement[] = [h('p', 'p3-intro', PAGE.intro)];
    PAGE.sections.forEach((s, i) => { const x = section(s, i); parts.push(x.el); items.push(...x.items); });
    const next = hook(h('button', 'p3-btn p3-btn-page p3-next'), 'fills-continue');
    next.type = 'button';
    next.append(h('span', 'p3-btn-label', `Continue to ${NEXT.label}`), glyph('chevr'));
    next.onclick = () => setPage(NEXT.page);
    const nr = h('div', 'p3-nextrow');
    nr.append(next);
    parts.push(nr);
    root.replaceChildren(...parts);
    markRefused();
    filter();
    if (focusKey) {
      const same = [...root.querySelectorAll<HTMLElement>(`[data-p3="${focusKey}"]`)];
      const pick = focusStep ? same.find((n) => n.dataset.step === focusStep) : same[Math.max(0, focusIndex)];
      (pick ?? same[0])?.focus({ preventScroll: true });
      // A control that is disabled after the edit (Return to Auto, once there is nothing to return) cannot hold
      // focus; the open picker's current step takes it, so Escape still reaches the picker.
      if (!root.contains(document.activeElement) && openRole) pickers.get(openRole)?.();
    }
  };

  const markRefused = (): void => {
    for (const it of items) {
      const yes = !!lastError && !!lastEdited && it.key === lastEdited;
      it.block?.setRefused(yes);
      if (it.refmark) { it.refmark.hidden = !yes; if (yes) it.el.dataset.refused = 'true'; }
    }
  };

  /** Search (Q3): hide what does not match, report the count. */
  const filter = (): void => {
    const q = searchQuery.trim().toLowerCase();
    const shown = items.filter((it) => it.said);
    for (const it of shown) it.el.hidden = !!q && !it.said.includes(q);
    for (const s of root.querySelectorAll<HTMLElement>('.p3-lsec')) {
      s.hidden = !!q && !s.querySelector(':is(.p3-lever, .p3-fillrow-wrap):not([hidden])');
    }
    for (const n of root.querySelectorAll<HTMLElement>('.p3-intro, .p3-nextrow')) n.hidden = !!q;
    setSearchHits(q ? shown.filter((it) => !it.el.hidden).length : null);
  };

  cleanups.push(subscribe('brand', render), subscribe('mode', () => { openRole = null; render(); }), subscribe('search', filter));
  // Leaving the page clears its count, so the next page's search starts from its own.
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  render();
};
