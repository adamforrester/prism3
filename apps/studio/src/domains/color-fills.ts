/**
 * Color › Surfaces & fills, the levers panel (UI redesign S4a; concept v6's Surfaces & fills page, V8, V9,
 * V10, R2, R5; S4c, the owner's decisions Q22 to Q30; S4d, Q44 to Q50).
 *
 * WHAT IT DRAWS, from the page's sections in `shell/pages.ts`: the intro and jump links to each section (Q49);
 * **Background fills** (one set for the mode the preview shows, Q22, as rows in the Foreground rows' pattern since
 * S4f, QA-B1: under "Default background fills" Primary, Secondary, Tertiary and the contrast floor with its own info
 * text, QA-B3, QA-B6; under "Inverse background fills" the inverse fill's palette select, then Inverse primary,
 * secondary and tertiary; each row names its token, Q41, and opens the step picker, Q45); **Scrim** (S4f, QA-B10:
 * the scrim's read-only row, out of Background fills); **Foreground** (the neutral ladder,
 * page and inverse, Q44); **Foreground fills** (a row per fill: a small swatch, its name and role, and a button
 * that opens the step picker under the row, with the ratio on it; then the subtle fills, the on-color inks and
 * the inverse fills, Q49); **Text color** (the same rows for the text inks, page and inverse: the permanent,
 * primary text editor, owner decision Q20; no link row, Q28: links are edited on Interactive only); **Border**
 * (page and inverse, the focus rings read-only, #1966); **Icon** (the icon contrast lever's block, as Color ›
 * Interactive drew it, holding the note and the button that unpairs icons, Q50, or pairs them again, Q61, with a
 * padlock that says which, QA-I10, QA-B12; then every icon role, locked to its text role while icons match text);
 * **Fields** (a row per `field.*` role, page and inverse, Q29); **Gradients** (the switch at the top right of its
 * header, then an editor per gradient with editable stops and no bar of its own, QA-B13 to QA-B16). A section's
 * inverse rows sit under the preview's "Inverse" sub-heading. Every lever is shown (R2: this page shows every
 * lever). Last, the way on to Interactive.
 *
 * WRITES. Every write goes through `state/fills-input.ts`. Each control writes what the S4a page's control
 * for that mode wrote, byte for byte on the persisted brand: since S4c the surface controls write the
 * previewed mode's `surfaces` key, where S4a drew a Light group and a Dark group. The Fields rows are new
 * writes (`setRoleOverride`, the one `field.fill` always had), and so are S4d's rows. The Primary (was Page) and
 * band step pickers write what the selects they replace wrote (Q45), and since S4f the contrast floor's picker
 * writes what its select wrote. Where this page differs from concept v6, it is
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
  BORDER_ROWS, FIELD_ROWS, FILL_ROWS, FOCUS_ROLES, floorAutoLabel, floorAutoShortLabel, FOREGROUND_ROWS, ICON_ROWS, PAIR_ICONS_CONFIRM, TEXT_ROWS, addGradient, addStop, bandOf, bandPalettes, editGradient, gradStopHex,
  iconOverrideCount, iconsPaired, lockedTo, overrideOf, pageKeyOf, pageSteps, pairIcons, paletteOf, readGradients, removeGradient, removeStop, renameGradient, rolesIn,
  setBandPalette, setBandStep, setCenter, setGradientsOn, setRowOverride, setStopPalette, setStopPosition, setStopStep,
  SCRIM_ROLE, SURFACE_TOKENS, setInverseTier, setSurfaceBase, setSurfaceFloor, setSurfaceTier, stepHex, stepOfPath, stepsOf, surfaceSourceOf, tierOf, unpairIcons, washReadOf,
  type FillRow, type InverseTier, type PageTier,
} from '../state/fills-input';
import { DOMAINS, ICONS_DESC, type PageData, type Section } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { glyph, h, hook } from '../shell/dom';
import { infoTip, inlineConfirm, jumpLabel, leverBlock, selectField, stateLine, subLine, switchButton, tokenLabel, type LeverBlock } from '../ui/lever-kit';
import { noteSectionEdit, scrollToStart } from '../preview/follow-edit';
import { fmtRatio, stepPicker, type StepPickerOpts } from '../ui/step-picker';

const PAGE = (DOMAINS.find((d) => d.id === 'color') as { subpages: readonly PageData[] }).subpages.find((p) => p.id === 'fills')!;
/** The page the Continue button opens: the next Color sub-page, by the store's page key. */
const NEXT = { label: 'Interactive', page: 'interactive' } as const;

/** The contrast floor row's info text (S4f, the owner's QA-B6, APPROVED). */
const FLOOR_INFO = 'The background most text, icon and fill colors are checked against for contrast. Auto uses background.secondary.';
/** The contrast floor row's `data-role`: it sets a setting, not a token, so it names the setting. */
const FLOOR_ROW = 'surfaces.floorStep';

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
  /** True while the re-pair confirm is open under the Icon section's Pair button (Q52, Q61). */
  let confirmPair = false;
  let items: Item[] = [];
  /** The open picker's focus, by role, from the last draw. */
  const pickers = new Map<string, () => void>();

  const edit = (key: string, write: () => void): void => {
    lastEdited = key;
    write();
    noteSectionEdit();   // QA-B9: the edit, and only an edit, reveals its preview section
    rebuild();
  };

  // ── Background fills: the page, its tiers, the contrast floor and the inverse fill, for the previewed mode ──
  // One set of controls (owner decision Q22), where S4a drew a Light group and a Dark group: each control
  // writes `surfaces.<the previewed mode>`, as that mode's group did. A mode with no surfaces of its own (a
  // derived or a custom mode) shows the ones it is drawn from, disabled, with the line the rows use.
  // S4f (the owner's QA-B1, QA-B3, QA-B6, QA-B7): the controls are rows in the Foreground rows' pattern, a swatch,
  // the name with its token under it, then the step picker, under two sub-headings at the rows' sub-heading size:
  // "Default background fills" (Primary, which was "Page", Secondary, Tertiary and the contrast floor, with its own
  // info text) and "Inverse background fills" (the inverse fill's palette, then its three tiers). Every control
  // writes exactly what the control it replaces wrote (the floor's step picker the floor select's value).
  const surfaces = (): Item[] => {
    // The lever's name is the section's (owner decision Q26), not the manifest's "Page surfaces": the block
    // heads the section, as Gradients' does. Its info text is the owner's (approved 2026-10-02), for this page
    // only: the manifest's description is the engine's, shared with MCP and the emission, and stays as it is.
    const b = leverBlock('surfaces', {
      label: 'Background fills',
      desc: 'The page, its tiers and the inverse fill for the mode the preview shows.',
    });
    const { source: m, editable } = surfaceSourceOf(currentMode);
    const roles = rolesIn(m);
    const cur = brandState.surfaces?.[m];
    const nPal = theme.roleToPalette.neutral;
    const named = (s: { palette: string; step: string }): string => (s.step === 'white' ? 'White' : s.step === 'black' ? 'Black' : `${s.palette} ${s.step}`);
    const rampOf = (p: string): StepPickerOpts['palettes'][number] => ({ palette: p, steps: (theme.palettes.find((x) => x.palette === p)?.steps ?? []).map((s) => ({ key: s.key, hex: s.hex })) });
    /** One background row (QA-B1): the swatch, the name with its token under it (a `label` for the button, so the
     *  control is named by what it sets), the button that opens the step picker (owner decision Q45), and the
     *  picker under the row while it is open. `key` is the picker's slot in `openRole`. `info` adds the row's own
     *  info button beside its name, its note drawn under the row (QA-B6). */
    const surfRow = (o: { key: string; id: string; hk: string; label: string; token: string | null; rowRole: string; hex: string; now: string;
      full?: string; info?: string; picker: Omit<StepPickerOpts, 'modeLabel' | 'onClose' | 'role'> & { role?: string } }): HTMLElement => {
      const wrap = h('div', 'p3-fillrow-wrap');
      // Every row is the one grid: swatch, name, and the picker on the right (#2179: the contrast floor's picker sat
      // under its name).
      const row = hook(h('div', 'p3-fillrow'), 'surface-row');
      row.dataset.role = o.rowRole;
      const sw = h('span', 'p3-fill-sw');
      sw.dataset.content = '';
      sw.style.background = o.hex;
      // The name with its token under it is the shared `tokenLabel` (QA-B2, #2041), a `label` for the button. A row with
      // its own info button (the contrast floor, a setting with no token) keeps a wrapper: its label first, the button
      // beside it.
      let nm: HTMLElement;
      let tip: HTMLElement | null = null;
      if (o.info || !o.token) {
        const lab = h('label', 'p3-fill-label', o.label);
        lab.htmlFor = o.id;
        nm = h('div', 'p3-fill-name');
        const line = h('div', 'p3-fill-nameline');
        line.append(lab);
        if (o.info) {
          const t = infoTip(`p3-tip-${o.id}`, o.label, o.info);
          tip = t.tip;
          line.append(t.button);
        }
        nm.append(line);
      } else nm = tokenLabel(o.token, o.label, o.id);
      const btn = hook(h('button', 'p3-btn p3-btn-page p3-pick'), o.hk);
      btn.type = 'button';
      btn.id = o.id;
      const open = openRole === o.key && editable;
      btn.setAttribute('aria-expanded', String(open));
      // `full`, when it says more than the visible label (the floor's "follows" sentence, FL1 A), is the button's
      // tooltip and follows the visible label in its accessible name, which keeps the visible label verbatim (WCAG 2.5.3).
      const more = o.full && o.full !== o.now ? o.full : null;
      btn.setAttribute('aria-label', `${o.label}, ${modeLabel(currentMode)}: ${o.now}.${more ? ` ${more}.` : ''} Pick a step`);
      if (more) btn.title = more;
      btn.append(h('span', 'p3-btn-label', o.now), glyph('chev'));
      btn.disabled = !editable;
      btn.onclick = () => {
        const opening = openRole !== o.key;
        openRole = opening ? o.key : null;
        render();
        if (opening) pickers.get(o.key)?.();
      };
      row.append(sw, nm, btn);
      wrap.append(row);
      if (tip) wrap.append(tip);
      if (open) {
        const pk = stepPicker({ role: o.token ?? o.label, ...o.picker, modeLabel: modeLabel(currentMode),
          onClose: () => { openRole = null; render(); root.querySelector<HTMLElement>(`#${o.id}`)?.focus(); } });
        wrap.append(pk.el);
        pickers.set(o.key, pk.focusCurrent);
      }
      return wrap;
    };
    /** A background tier (#1972): unset, it reads Auto and the step the engine derived (the ladder's own); a pick
     *  writes the input, and Return to Auto clears it. The page tiers pick from the Page's steps (White, the neutral
     *  steps, Black), the inverse tiers from every palette the inverse fill can draw from, browsed in the picker's
     *  own palette select (a palette is chosen by picking a step on it, so choosing one writes nothing by itself). */
    const tierRow = (tier: PageTier | InverseTier, label: string, hk: string, palettes: StepPickerOpts['palettes'],
      write: (palette: string, step: string | undefined) => void): HTMLElement => {
      const token = SURFACE_TOKENS[tier];
      const set = tierOf(m, tier);
      const res = roles[token];
      const at = stepOfPath(res?.path);
      const fixed = res?.path?.split('.').pop() ?? '';
      return surfRow({
        key: `surface:${tier}`, id: `p3-surf-${tier}`, hk, label, token, rowRole: token, hex: res?.hex ?? '#ffffff',
        now: set ? named(set) : `Auto · ${at ? named(at) : fixed}`,
        picker: {
          palettes,
          current: set ?? (at ? { palette: at.palette, step: at.step } : fixed === 'white' || fixed === 'black' ? { palette: nPal, step: fixed } : null),
          against: null, overridden: set != null,
          onPick: (p, step) => edit('surfaces', () => write(p, step)), onAuto: () => edit('surfaces', () => write(nPal, undefined)),
        },
      });
    };
    const grp = hook(h('div', 'p3-modegroup'), 'surfaces-group');
    grp.dataset.mode = m;
    const d = derivedLine();
    grp.append(d ?? (editable ? editingLine() : subLine('Custom modes seed their surfaces from their base mode.')));

    // ── Default background fills ──
    const def = hook(h('div', 'p3-fillrows'), 'surface-default-rows');
    def.append(h('h4', 'p3-rows-sub p3-rows-sub-first', 'Default background fills'));
    // Primary (QA-B3: "Page" was its name; it is `background.primary`): white, black, or a neutral step, in the step
    // picker (Q45). No Auto: an unset base reads as the mode's default. A pick writes the key exactly as the Page
    // control wrote it (`setSurfaceBase`).
    const baseKey = pageKeyOf(cur?.base ?? (m === 'dark' ? 'black' : 'white'));
    def.append(surfRow({
      key: 'surface:base', id: 'p3-surf-base', hk: 'surface-base-pick', label: 'Primary', token: SURFACE_TOKENS.base, rowRole: SURFACE_TOKENS.base,
      hex: roles[SURFACE_TOKENS.base]?.hex ?? '#ffffff', now: baseKey === 'white' ? 'White' : baseKey === 'black' ? 'Black' : `${nPal} ${baseKey}`,
      picker: {
        palettes: [{ palette: nPal, steps: pageSteps() }], current: { palette: nPal, step: baseKey },
        against: null, overridden: false, auto: false,
        onPick: (_p, step) => edit('surfaces', () => setSurfaceBase(m, step)), onAuto: () => {},
      },
    }));
    for (const [tier, label] of [['secondary', 'Secondary'], ['tertiary', 'Tertiary']] as const) {
      def.append(tierRow(tier, label, `surface-${tier}-pick`, [{ palette: nPal, steps: pageSteps() }], (_p, step) => setSurfaceTier(m, tier, step)));
    }
    // The contrast floor, as a row (QA-B1), with its own info text (QA-B6, APPROVED). It is a setting, not a token,
    // so the row names none. Auto names the floor the engine derives, and the tier when it is that tier's step
    // (`floorAutoLabel`, S4e). A step writes what the floor select wrote for it (`setSurfaceFloor`, the step's
    // number), and Return to Auto what its Auto option wrote (`''`, which unsets `floorStep`).
    const floorSteps = stepsOf(nPal);
    const floorKey = cur?.floorStep == null ? null : floorSteps.find((s) => Number(s) === Number(cur.floorStep)) ?? String(cur.floorStep);
    const autoFloor = stepOfPath(`palette.${roles['foreground.brand']?.against ?? ''}`);
    const floorAt = floorKey != null ? { palette: nPal, step: floorKey } : autoFloor && autoFloor.palette === nPal ? autoFloor : null;
    def.append(surfRow({
      key: 'surface:floor', id: 'p3-surf-floor', hk: 'surface-floor-pick', label: 'Contrast floor', token: null, rowRole: FLOOR_ROW,
      hex: (floorAt && stepHex(floorAt.palette, floorAt.step)) ?? roles[SURFACE_TOKENS.secondary]?.hex ?? '#ffffff',
      now: floorKey != null ? `${nPal} ${floorKey}` : floorAutoShortLabel(m),
      full: floorKey != null ? undefined : floorAutoLabel(m),
      info: FLOOR_INFO,
      picker: {
        role: 'Contrast floor', palettes: [rampOf(nPal)], current: floorAt,
        against: null, overridden: floorKey != null,
        onPick: (_p, step) => edit('surfaces', () => setSurfaceFloor(m, step)), onAuto: () => edit('surfaces', () => setSurfaceFloor(m, '')),
      },
    }));

    // ── Inverse background fills ──
    const inv = hook(h('div', 'p3-fillrows'), 'surface-inverse-rows');
    inv.append(h('h4', 'p3-rows-sub', 'Inverse background fills'));
    // The inverse fill's palette first (#898; Q55: it stays a select). Choosing one is its own write: it seeds the
    // darkest step (`setBandPalette`).
    const band = bandOf(m);
    const pf = h('div', 'p3-field');
    const pl = h('label', 'p3-field-label', 'Inverse fill palette');
    pl.htmlFor = 'p3-surf-band';
    const ps = selectField('p3-surf-band', `Inverse fill palette, ${modeLabel(currentMode)}`, 'surface-band-palette', (v) => edit('surfaces', () => setBandPalette(m, v)));
    ps.set(bandPalettes().map((p) => ({ v: p, l: p === nPal ? 'Neutral' : p })), band.palette);
    ps.select.disabled = !editable;
    pf.append(pl, ps.el);
    inv.append(pf);
    // Inverse primary: the step on the fill's palette (Q45), writing what the step control wrote, Auto included.
    const curSteps = stepsOf(band.palette);
    const bandAuto = band.palette === nPal ? stepOfPath(roles[SURFACE_TOKENS.inverseBase]?.path)?.step ?? '' : String(curSteps[curSteps.length - 1] ?? '');
    // The stored step is a number (`50`); the ramp's key is padded (`050`).
    const bandKey = band.step == null ? null : curSteps.find((s) => Number(s) === Number(band.step)) ?? band.step;
    inv.append(surfRow({
      key: 'surface:band', id: 'p3-surf-bandstep', hk: 'surface-band-step-pick', label: 'Inverse primary', token: SURFACE_TOKENS.inverseBase, rowRole: SURFACE_TOKENS.inverseBase,
      hex: roles[SURFACE_TOKENS.inverseBase]?.hex ?? '#000000', now: bandKey == null ? `Auto · ${band.palette} ${bandAuto}` : `${band.palette} ${bandKey}`,
      picker: {
        palettes: [rampOf(band.palette)], current: { palette: band.palette, step: bandKey ?? bandAuto },
        against: null, overridden: bandKey != null,
        onPick: (_p, step) => edit('surfaces', () => setBandStep(m, step)), onAuto: () => edit('surfaces', () => setBandStep(m, undefined)),
      },
    }));
    const bandSteps = bandPalettes().map(rampOf);
    for (const [tier, label] of [['inverseSecondary', 'Inverse secondary'], ['inverseTertiary', 'Inverse tertiary']] as const) {
      inv.append(tierRow(tier, label, `surface-${tier === 'inverseSecondary' ? 'inverse-secondary' : 'inverse-tertiary'}-pick`, bandSteps, (p, step) => setInverseTier(m, tier, p, step)));
    }
    grp.append(def, inv);
    b.ctl.append(grp);
    return [{ el: b.el, said: `${b.said} default inverse background fills primary secondary tertiary contrast floor inverse fill palette ${Object.values(SURFACE_TOKENS).join(' ')}`, key: 'surfaces', block: b }];
  };

  /** The Scrim section (S4f, QA-B10): the scrim's read-only row, out of Background fills into its own section, as the
   *  preview's Scrim section is. */
  const scrim = (): Item[] => {
    const r = scrimRow();
    if (!r) return [];
    const wrap = h('div', 'p3-fillrow-wrap');
    wrap.append(r);
    return [{ el: wrap, said: `scrim ${SCRIM_ROLE}`, key: 'scrim' }];
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
    // The owner's A6 (2026-10-03): the wash sits over the chrome's transparency checkerboard (`p3-checker`, Palettes'
    // alpha swatches), so the swatch reads as translucent, in either chrome theme.
    const sw = hook(h('span', 'p3-fill-sw p3-checker'), 'scrim-swatch');
    const wsh = hook(h('span', 'p3-scrim-wash'), 'scrim-wash');
    wsh.dataset.content = '';
    const n = parseInt(r.hex.slice(1), 16);
    wsh.style.background = `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${r.alpha ?? 1})`;
    sw.append(wsh);
    const nm = tokenLabel(SCRIM_ROLE, 'Scrim');
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
    // An icon row is locked to its text row while icons match text (Q50, #1968): read-only, naming what it follows.
    const follows = lockedTo(mode, r);
    const derived = isDerived(mode) || follows !== null;
    const ov = overrideOf(mode, r.role);
    const at = stepOfPath(res.path);
    // A role on a fixed primitive (an on-color ink on `white` or `black`) has no step; its Auto names the primitive.
    const atName = at ? `${at.palette} ${at.step}` : (res.path?.split('.').pop() ?? '');
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
    const nm = tokenLabel(r.role, r.label);
    const btn = hook(h('button', 'p3-btn p3-btn-page p3-pick'), 'fill-pick');
    btn.type = 'button';
    btn.id = `p3-pick-${r.role.replace(/\./g, '-')}`;
    btn.dataset.role = r.role;
    const open = openRole === r.role && !derived;
    btn.setAttribute('aria-expanded', String(open));
    const now = follows !== null ? `Follows ${follows}` : transparent ? 'Transparent' : `${ov !== undefined ? 'Override' : 'Auto'} · ${atName}`;
    btn.append(h('span', 'p3-btn-label', now));
    if (ratio !== null) {
      const rr = h('small', 'p3-pick-ratio', fmtRatio(ratio));
      if (below) { rr.dataset.below = 'true'; rr.append(glyph('x')); }
      btn.append(rr);
    }
    btn.append(glyph('chev'));
    btn.setAttribute('aria-label', `${r.label}: ${now}${ratio !== null ? `, ${fmtRatio(ratio)}` : ''}${below ? ', below floor' : ''}${follows !== null ? '' : '. Pick a step'}`);
    btn.disabled = derived;
    if (follows !== null) btn.dataset.follows = follows;
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

  /** A focus ring, read-only until #1966: a fill row's swatch, name and role, and in place of the picker the step
   *  it resolves to in the previewed mode. */
  const focusRow = (role: string, label: string): Item | null => {
    const res = rolesIn(currentMode)[role];
    if (!res) return null;
    const el = hook(h('div', 'p3-fillrow'), 'focus-row');
    el.dataset.role = role;
    const sw = h('span', 'p3-fill-sw');
    sw.dataset.content = '';
    sw.style.background = res.hex;
    const nm = tokenLabel(role, label);
    const at = stepOfPath(res.path);
    el.append(sw, nm, hook(h('span', 'p3-fill-read', at ? `${at.palette} ${at.step}` : (res.path ?? '')), 'focus-readout'));
    const wrap = h('div', 'p3-fillrow-wrap');
    wrap.append(el);
    return { el: wrap, said: `${label} ${role}`.toLowerCase(), key: `row:${role}` };
  };

  /** A section's rows, under the line that says which mode they edit. A row that starts a group (`sub`) is drawn
   *  under that group's sub-heading, the preview section's own ("Inverse"). */
  const rows = (key: string, list: readonly FillRow[], lead: HTMLElement[] = [], tail: (sub: string | undefined) => Item[] = () => []): Item[] => {
    const box = hook(h('div', 'p3-fillrows'), `${key === 'fills' ? 'fill' : key === 'fields' ? 'field' : key}-rows`);
    const out: Item[] = [];
    const d = derivedLine();
    box.append(d ?? editingLine(), ...lead);
    let sub: string | undefined;
    const close = (): void => { for (const it of tail(sub)) { box.append(it.el); out.push(it); } };
    for (const r of list) {
      if (r.sub) { close(); sub = r.sub; box.append(h('h4', 'p3-rows-sub', r.sub)); }
      const it = row(r);
      if (it) { box.append(it.el); out.push(it); }
    }
    close();
    return [{ el: box, said: '', key }, ...out];
  };
  const foreground = (): Item[] => rows('foreground', FOREGROUND_ROWS);
  const fills = (): Item[] => rows('fills', FILL_ROWS);
  const text = (): Item[] => rows('text', TEXT_ROWS);
  // The focus rings close their group, page and inverse, as the preview's Border section pairs them.
  const border = (): Item[] => rows('border', BORDER_ROWS, [], (sub) => {
    const f = focusRow(sub ? FOCUS_ROLES[1] : FOCUS_ROLES[0], 'Focus');
    return f ? [f] : [];
  });
  /** The Icon section (Q50, Q61): while icons match text, one note and the button that unpairs them, above rows
   *  that each say which text role they follow. Unpaired, the rows edit, and the note and its button say the
   *  other way: "Pair icons with text" re-pairs through `pairIcons`, as every control that sets `iconContrast` to
   *  `'text'` does, writing at once with no icon override to lose and otherwise asking first, in place, in
   *  `PAIR_ICONS_CONFIRM`'s words (Q52, Q60). Cancel writes nothing.
   *
   *  S4f (the owner's QA-I10 and QA-B12): the note and its button sit in the icon contrast lever's own block, as
   *  Color › Interactive drew that lever (its name and info button, the info text Interactive's Icons copy,
   *  `ICONS_DESC`, APPROVED), at the top of the section. The button carries a padlock that says the state: shut
   *  while icons are paired (the rows are locked to their text), open while they are not. The glyph is decorative;
   *  the button keeps its words as its name, and the note beside it says the state in words. */
  const icon = (): Item[] => {
    const b = leverBlock('iconContrast', { desc: ICONS_DESC });
    const paired = iconsPaired();
    const note = hook(h('div', 'p3-icon-pair'), paired ? 'icons-paired' : 'icons-unpaired');
    const btn = hook(h('button', 'p3-btn p3-btn-page p3-icon-lock'), paired ? 'icons-unpair' : 'icons-pair');
    btn.type = 'button';
    btn.dataset.locked = String(paired);
    btn.append(glyph(paired ? 'lock' : 'unlock'), h('span', 'p3-btn-label', paired ? 'Unpair icons from text' : 'Pair icons with text'));
    // Disabled in a derived mode, as every control on this page is (owner decisions Q56, Q59): HC and wireframe
    // follow Light and Dark, so the pairing is edited there.
    btn.disabled = isDerived(currentMode);
    note.append(h('p', 'p3-icon-pair-note', paired
      ? 'Icons follow their text color. Unpair them to set icons on their own.'
      : 'Icons are set on their own. Pair them to follow their text color again.'), btn);
    if (paired) {
      btn.onclick = () => edit('icons', () => unpairIcons());
      confirmPair = false;
    } else {
      btn.onclick = () => {
        if (!iconOverrideCount()) { edit('icons', () => pairIcons()); return; }
        confirmPair = true;
        render();
      };
      const n = iconOverrideCount();
      if (confirmPair && n && !btn.disabled) {
        note.append(inlineConfirm('icons-pair-confirm', {
          title: PAIR_ICONS_CONFIRM.title, body: [PAIR_ICONS_CONFIRM.body(n)], action: PAIR_ICONS_CONFIRM.action,
          onConfirm: () => { confirmPair = false; edit('icons', () => pairIcons()); },
          onCancel: () => { confirmPair = false; render(); },
          back: () => root.querySelector<HTMLElement>('[data-p3="icons-pair"], [data-p3="icons-unpair"]'),
        }));
      } else confirmPair = false;
    }
    b.ctl.append(note);
    const [box, ...rest] = rows('icon', ICON_ROWS);
    // The lever block heads the section's box, above the line that says which mode the rows edit: the pairing is
    // brand-wide, the rows are the previewed mode's.
    box.el.prepend(b.el);
    return [box, { el: b.el, said: b.said, key: 'icons', block: b }, ...rest];
  };
  const fields = (): Item[] => rows('fields', FIELD_ROWS);

  // ── Gradients: the switch, then an editor per gradient (v6: stops are editable) ─────────────────
  // S4f (the owner's QA-B13 to QA-B16): the switch sits at the top right of the block's header; the levers draw no
  // gradient of their own (the preview pane shows each one); each gradient is set apart from the next by a divider
  // with room on both sides, and Add gradient by its own divider and more room above it.
  const gradients = (): Item[] => {
    const b = leverBlock('gradients', { forId: 'p3-gradients-switch' });
    const on = !!brandState.gradients;
    const sw = switchButton('p3-gradients-switch', 'Gradients', 'gradients-switch', { on: 'On', off: 'Off: no gradients emitted' },
      (v) => edit('gradients', () => setGradientsOn(v)));
    sw.set(on);
    b.el.querySelector('.p3-lever-head')?.append(sw.el);
    // Read-only in a derived mode (owner decision Q59): every lever on the page is, brand-wide ones included, under
    // the line the rows use. Gradients are brand-wide, so the line says where they are edited.
    const d = derivedLine();
    if (d) b.ctl.append(d);
    if (on) {
      const list = hook(h('div', 'p3-glist'), 'gradient-list');
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
          noteSectionEdit();   // QA-B9, as `edit` does
          rebuild();
        });
        nf.append(name);
        const rm = hook(h('button', 'p3-btn p3-btn-page p3-btn-icon'), 'gradient-remove');
        rm.type = 'button';
        rm.setAttribute('aria-label', `Remove gradient ${g.name}`);
        rm.append(glyph('x'));
        rm.onclick = () => edit('gradients', () => removeGradient(gi));
        top.append(nf, rm);
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
          // The label follows the drag; the brand is written once, when the drag ends.
          range.addEventListener('input', () => {
            al.textContent = `Angle · ${range.value}°`;
            range.setAttribute('aria-valuetext', `${range.value} degrees`);
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
        card.append(top, set, stops);
        list.append(card);
      });
      const add = hook(h('button', 'p3-btn p3-addrow'), 'gradient-add');
      add.type = 'button';
      add.append(glyph('plus'), h('span', 'p3-btn-label', 'Add gradient'));
      add.onclick = () => edit('gradients', () => addGradient());
      const addRow = hook(h('div', 'p3-gadd'), 'gradient-add-row');
      addRow.append(add);
      list.append(addRow);
      b.ctl.append(list);
    }
    // The switch is in the header, so the whole block is read, less its info button (it opens help, edits nothing).
    if (d) for (const c of b.el.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button, input, select')) if (c.getAttribute('data-p3') !== 'lever-info') c.disabled = true;
    return [{ el: b.el, said: `${b.said} stops`, key: 'gradients', block: b }];
  };

  const ROWS: Record<string, () => Item[]> = { surfaces, scrim, foreground, fills, text, border, icon, fields, gradients };

  // ── the page ──────────────────────────────────────────────────────────────────────────────────
  const section = (s: Section, i: number): { el: HTMLElement; items: Item[] } => {
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-fills-${i}`;
    el.tabIndex = -1;   // a jump link's target takes focus
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

  /** Jump links to each section (Q49), at the top of the levers, as Color › Interactive has to its columns. */
  const jumps = (): HTMLElement => {
    const nav = hook(h('nav', 'p3-jump'), 'fills-jump');
    nav.setAttribute('aria-label', 'Sections on this page');
    nav.append(jumpLabel());
    PAGE.sections.forEach((s, i) => {
      const a = hook(h('a', 'p3-jump-link', s.title), 'fills-jump-link');
      a.href = `#p3-lsec-fills-${i}`;
      a.onclick = (e) => {
        e.preventDefault();
        const to = root.querySelector<HTMLElement>(`#p3-lsec-fills-${i}`);
        if (to) scrollToStart(to);   // QA-B17: eased, and at once under reduced motion
        to?.focus({ preventScroll: true });
      };
      nav.append(a);
    });
    return nav;
  };

  const render = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const focusKey = had && root.contains(had) ? had.getAttribute('data-p3') : null;
    const focusIndex = focusKey ? [...root.querySelectorAll(`[data-p3="${focusKey}"]`)].indexOf(had!) : -1;
    const focusStep = had?.dataset.step ?? null;
    items = [];
    pickers.clear();
    const parts: HTMLElement[] = [h('p', 'p3-intro', PAGE.intro), jumps()];
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
    for (const n of root.querySelectorAll<HTMLElement>('.p3-intro, .p3-nextrow, .p3-jump, .p3-rows-sub, .p3-icon-pair')) n.hidden = !!q;
    setSearchHits(q ? shown.filter((it) => !it.el.hidden).length : null);
  };

  cleanups.push(subscribe('brand', render), subscribe('mode', () => { openRole = null; confirmPair = false; render(); }), subscribe('search', filter));
  // Leaving the page clears its count, so the next page's search starts from its own.
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  render();
};
