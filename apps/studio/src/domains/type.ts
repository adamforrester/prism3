/**
 * Type, the levers panel (UI redesign S6.2 Font families; S6.3 the rest; concept v6's Type page).
 *
 * WHAT IT DRAWS: the intro; the S6.2 font families, as two sections since TY1 A (#2190, heading pass 2): **Typeface
 * library** (each family by its name with its token under it, whether it is available here and what uses it, Add font
 * family (in the plugin, a type-ahead over the fonts this Figma can load) and a spelling note, and the remove button on
 * a family nothing uses) and **Font family for each text type** (each text type's family, its token on the label's
 * line, #2217; then Apply to all), both always shown: the owner keeps them out of Show advanced. **Scale** (S6.3): the three
 * scale chips, then the pinned count, then each warning with its own action (TS1 A, #2216): a chip the engine would
 * refuse disabled with the reason and Release pinned sizes, then the #1802 line naming a style the preview uses that
 * the brand does not make (Q72); behind its Show advanced, **Individual sizes**, a Desktop and a Mobile control for
 * each heading size, side by side (Q63 option A). Behind the page's Show
 * advanced (Q69): **Scale limits** (headings scale between mobile and desktop, with the viewport pair and the way
 * to Layout's breakpoints; the display ceiling; the title, caption and size floors), **Weights and styles** (each
 * weight, the weights each text type ships with its Link styles, the italic styles, Pin a font style) and **Line
 * height and letter spacing** (each name's step, each mode's swap, each text type's nudge; Q64). Last, the way on to
 * Shape. The lent legacy region S6.2 drew below Font families is gone, and Layout no longer draws "Responsive type
 * sizing": Type is its one home (Q71).
 *
 * THE S6.3 CONTROLS NAME THEIR TOKEN UNDER THEIR LABEL (owner QA-B2: the label is read first). S6.2's Font families
 * controls keep the token-first order Q68 gave them until the shared styling change flips every page at once.
 *
 * TYPE VALUES ARE PICKED FROM A PANEL (owner decision Q65 option A, `ui/value-picker.ts`): a heading size, a weight,
 * a line height or a letter spacing opens a list of every value it may take, each with a live sample, the ones that
 * would break the order shown disabled with the reason.
 *
 * WHICH MODE A CONTROL EDITS (owner decisions Q22, Q62 option A): the mode the preview shows. A per-mode value
 * (a font family, a weight, a heading's desktop size, a line height or letter spacing swap) writes the brand value
 * previewing Light, and `modeLevers[mode].*` previewing another editable mode, shown as "Auto: follows Light
 * (‹value›)" until set, with a way back to Auto. A brand-wide value (the library, the scale, the limits, which
 * weights and styles a text type ships, the pins, each name's step, the nudges, a heading's mobile size) writes the
 * same bytes from any editable mode (the Q54 rule). A derived mode (HC light, HC dark, wireframe) is read-only,
 * every control on the page (Q59, Q74), under S4a's line.
 *
 * BEHAVIOR-NEUTRAL (the S2 rule). Every write goes through `state/type-input.ts`, which writes what the legacy page
 * wrote, byte for byte on the persisted brand, its traps included (`responsive.fluid` is always written), except
 * #2006: an emptied `italics`, or a `links` list back at the engine's default, is unset. Two writers are new, for limits no surface edited before: the caption
 * and size floors, each UNSET at its default.
 *
 * HOW IT REPAINTS: by store subscription only (plan §5): `brand`, `mode`, and `fonts` (the host's font list, lent
 * as `lend.fonts`). A control writes, notes the edit for the preview's reveal (`noteSectionEdit`, QA-B9), and
 * calls `rebuild()`; the panel is redrawn whole, keeping focus on the element that had it. So every value derived
 * from the theme (a text type's style count, a nudge's landing name, a chip's clash) is read fresh after every
 * edit: the legacy page's `apply()` left them stale (#831). It never names a legacy repaint tier and never
 * imports `main.ts` (`test-shell-imports.ts`).
 */
import {
  brandState, currentMode, getModeLever, getPath, lastError, rebuild, rp, searchQuery, setPage, setSearchHits, subscribe, theme,
} from '../state/store';
import { isDerived } from '../state/verdict';
import {
  TYPE_GROUP_ORDER, addLibraryFace, inLibrary, removeLibraryFace, setAllFamilies, setFamily,
  setTypeScale, shapeBlocked, releasePinnedSizes, pinnedSizeCount, rowsOf, widestRowsOf, brandSizePin, modeSizePin, viewportPin,
  setSizePin, setMobileSize, setFluid, setResponsiveViewport, viewportRefusal, setDisplayCeiling, ceilingPx, ceilingBlocked, titleFloorBlocked, fluidBlocked, setTitleFloor, setCaptionFloor, setSizeFloor,
  setWeightRole, toggleCategoryWeight, categoryWeightLock, setLink, setItalicStyle, italicStyleOf, setFacePin,
  setRungBinding, setRepoint, setShift, nudgeSteps, resolvedRungs, type ItalicStyle, type RungField,
} from '../state/type-input';
import { HEADING_SIZE_FLOOR, PER_MODE_SIZE_GROUPS, LINE_HEIGHT_LADDER, LETTER_SPACING_LADDER } from '@prism3/engine/theme';
import type { FacePin } from '@prism3/engine/theme';
import { faceStatus, WEIGHT_NAME, type HostFonts } from '../ui/fonts';
import { valuePicker, type ValuePickerOpts } from '../ui/value-picker';
import { emToPercentLabel } from '../em-percent';
import { noteSectionEdit } from '../preview/follow-edit';
import { DOMAINS, type PageData, type Section } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { glyph, h, hook } from '../shell/dom';
import { choice, leverBlock, leverOf, promoteLever, selectField, stateLine, subLine, switchButton, textField, tokenLabel, type LeverBlock } from '../ui/lever-kit';
import type { PageLends } from '../preview/brand';

const PAGE = DOMAINS.find((d) => d.id === 'type') as PageData;
/** The page the Continue button opens: the next tab, Shape, by the store's page key (moved in S7). */
const NEXT = { label: 'Shape', page: 'shape' } as const;

/** Code's opt-out (owner decision Q75, APPROVED: today's wording, the em dash kept). */
export const CODE_NONE = 'None — no code styles';
/** A select's or a picker's Auto in a mode other than Light (owner decision Q62, APPROVED). */
export const familyAuto = (face: string): string => `Auto: follows Light (${face})`;
/** The page's own copy (S6.2). APPROVED by the owner on 2026-10-02 unless marked otherwise. */
export const TYPE_COPY = {
  libraryLabel: 'Typeface library',
  libraryTip: 'The font families this brand can use. A family is in the library while a text type uses it, or once you add it.',
  familiesLabel: 'Font family for each text type',
  familiesTip: 'Each text type’s font.family token names one family from the library. Swapping the family keeps every reference to the token.',
  faceHead: 'Family',
  addPlaceholder: 'Font family name',
  addLabel: 'Add a font family to the library',
  add: 'Add font family',
  remove: (face: string): string => `Remove ${face} from the library`,
  spellWeb: 'Type the name exactly as the font names itself. A name this device lacks still saves, and the preview shows a fallback.',
  spellFigma: (n: number): string => `Pick one of the ${n.toLocaleString('en-US')} fonts this Figma can load, or type any name. A name not on the list still saves, but its text styles can’t apply here.`,
  missingWeb: (faces: readonly string[]): string => `Not installed on this device: ${faces.join(', ')}. The preview shows a fallback.`,
  missingFigma: (faces: readonly string[]): string => `Not in this Figma: ${faces.join(', ')}. Text styles using it can’t apply.`,
  allLabel: 'Set every text type to',
  allChoose: 'Choose a font family…',
  allApply: 'Apply to all',
  allNote: 'Code keeps its own font family.',
  allLightOnly: 'Apply to all sets the Light font families. Preview Light to use it.',
  usedBy: (types: readonly string[]): string => `Used by ${types.join(', ')}`,
  unused: 'Not used',
  next: 'Continue to Shape',
} as const;
/** The S6.3 controls' copy, in the owner's plain words (Q70: step, line height, letter spacing, weight, text type,
 *  font style, swap, one step looser or tighter, Light; never "face", Q77, or "column", Q53). Every string here
 *  is APPROVED (owner, 2026-10-03, #2036). */
export const S63 = {
  groupName: (g: string): string => `${g[0].toUpperCase()}${g.slice(1)}`,
  weightName: (r: string): string => `${r[0].toUpperCase()}${r.slice(1)}`,
  textType: 'Text type',
  autoLight: familyAuto,
  toAuto: 'Return to Auto',
  // Scale
  scaleLabel: 'Type scale',
  // The lever's own description, word for word (#2070, owner 2026-10-04; #2089). `test-lever-tips.ts` holds it to
  // `lever-manifest.json`, so keep it a literal here: importing the lever text would make that test compare a value
  // with itself (docs/34).
  scaleTip: 'Moves every heading size one step up or down the size ladder. Body, label, caption and code stay put.',
  scaleClash: 'Some sizes you set would clash at this scale. Release them to switch.',
  release: 'Release pinned sizes',
  pinned: (n: number): string => `${n} ${n === 1 ? 'size is' : 'sizes are'} set individually. They keep their size when the scale moves.`,
  unresolved: (paths: readonly string[]): string => `${paths.length === 1 ? 'One text style' : `${paths.length} text styles`} the preview uses ${paths.length === 1 ? 'is' : 'are'} not in this brand: ${paths.join(', ')}. The preview shows a fallback.`,
  sizesLabel: 'Individual sizes',
  sizesTip: 'Set any heading size directly. Desktop is the size on wide screens; Mobile is the size on phones, while headings scale between them.',
  desktop: 'Desktop',
  mobile: 'Mobile',
  mobileBrandWide: 'Mobile sizes apply to every mode.',
  outside: (px: number): string => `Outside the range · ${px}px`,
  sizeHint: 'Sizes stay in order, largest first, on the size ladder.',
  mobileHint: 'A mobile size is at most its desktop size, and stays in order with its neighbors.',
  followScale: 'Follow the scale again',
  belowFloor: (g: string, px: number): string => `Below the ${g.toLowerCase()} floor, ${px}px.`,
  notAbove: (name: string, px: number): string => `Not above ${name} (${px}px). Sizes stay in order.`,
  notBelow: (name: string, px: number): string => `Not below ${name} (${px}px). Sizes stay in order.`,
  notAboveMobile: (name: string, px: number): string => `Below ${name} on mobile (${px}px). Sizes stay in order.`,
  notBelowMobile: (name: string, px: number): string => `Above ${name} on mobile (${px}px). Sizes stay in order.`,
  overDesktop: (px: number): string => `Larger than its desktop size, ${px}px.`,
  underMobile: (px: number): string => `Smaller than its mobile size, ${px}px.`,
  // Scale limits
  fluidLabel: 'Headings scale between mobile and desktop',   // APPROVED (Q70)
  fluidTip: 'Display, title and eyebrow sizes shrink smoothly from desktop to mobile between these two screen widths. Body text keeps one size.',
  /** Off, while a mobile size is set individually (#2055). DRAFT, pending the owner's approval. */
  fluidPinned: (sizes: readonly string[]): string => sizes.length === 1
    ? `Removes the mobile size of ${sizes[0]}, which you set individually.`
    : `Removes the mobile sizes of ${sizes.slice(0, -1).join(', ')} and ${sizes[sizes.length - 1]}, which you set individually.`,
  minVp: 'Min viewport, px',
  maxVp: 'Max viewport, px',
  dependsLayout: 'Depends on Layout: breakpoints',
  ceilingLabel: 'Largest display size',
  ceilingTip: 'The largest display size the brand makes. Display sizes above it are left out.',
  /** A ceiling that would trim a display size set individually (owner, 2026-10-04, #2044). */
  ceilingPinned: (size: string): string => `Smaller than display ${size}, which you set individually.`,
  titleFloorLabel: 'Smallest title size',
  titleFloorTip: '16px adds a title at body size. The Compact scale already places a title at 16px, so the engine refuses 16px with it.',
  /** The 16px chip's reason under Compact: the approved info text's second sentence (owner, B8b). */
  titleFloorCompact: 'The Compact scale already places a title at 16px, so the engine refuses 16px with it.',
  /** The 18px chip's reason while title 2xs is set individually (#2054). DRAFT, pending the owner's approval. */
  titleFloorPinned: 'Leaves out title 2xs, which you set individually.',
  captionFloorLabel: 'Smallest caption size',
  captionFloorTip: '10px adds a fine-print caption, for dense legal, footer or product details.',
  sizeFloorLabel: 'Smallest type size',
  sizeFloorTip: '8px adds the smallest caption and moves the size ladder down to 8px.',
  eightWarn: '8px is below the sizes the contrast floors were set for. Use it only for fine print that has an accessible alternative.',
  // Weights and styles
  weightsLabel: 'Weights',
  weightsTip: 'The weight number behind each name. The names read in order, from subtle to max.',
  weightHint: 'Each weight stays between the names before and after it.',
  toDefault: 'Return to the default',
  lighterThan: (r: string, n: number): string => `Lighter than ${r} (${n}). Weights stay in order.`,
  heavierThan: (r: string, n: number): string => `Heavier than ${r} (${n}). Weights stay in order.`,
  orderWarn: 'A weight now reads lighter than the name before it. The names read in order, from subtle to max.',
  matrixLabel: 'Weights each text type ships',
  matrixTip: 'Each weight a text type ships is a text style at every size. Link adds an underlined style for each.',
  link: 'Link',
  styles: (n: number): string => `${n} ${n === 1 ? 'style' : 'styles'}`,
  italicsLabel: 'Italic styles',
  italicsTip: 'Upright ships no italic. Upright + italic adds an italic style for each weight. Italic only makes italic the one style.',
  italicPinned: 'This text type pins a font style. Clear the pin first: Italic only sets the style from the weight.',
  pinLabel: 'Pin a font style',
  pinTip: 'Set one weight’s font style exactly as Figma names it, such as Light Condensed: a width a weight number can’t reach. The font family is the one the text type uses.',
  pinField: (g: string, role: string): string => `Font style for ${g}, ${role}`,
  pinPlaceholder: 'Derived from weight',
  pinStale: (was: string, now: string): string => `Pinned to ${was}, but this text type now uses ${now}. Enter the style again to pin it to ${now}, or the pin is dropped at export.`,
  pinNone: 'No text type has a font family to pin a style to.',
  pinItalicOnly: (types: readonly string[]): string => `Not listed: ${types.join(' and ')}, set to Italic only. A pinned style would replace the italic.`,
  // Line height and letter spacing
  lhLabel: 'Line height',
  lsLabel: 'Letter spacing',
  lhTip: 'The step each line height name uses. Every text style with that name moves with it.',
  lsTip: 'The step each letter spacing name uses. Every text style with that name moves with it.',
  swapLine: (m: string): string => `Editing ${m}, the mode the preview shows. A swap uses another name’s step in ${m} only; the steps apply to every mode.`,
  spaceHint: 'The names stay in order, so a step past a neighbor is unavailable.',
  crossBelow: (k: string, v: string): string => `Below ${k} (${v}). The names stay in order.`,
  crossAbove: (k: string, v: string): string => `Above ${k} (${v}). The names stay in order.`,
  lhSample: 'Line height sets the space between the lines of a paragraph, so a long passage reads evenly.',
  lsSample: 'Letter spacing',
  nudgeLabel: 'One step looser or tighter',
  nudgeTip: 'Moves a text type’s line height or letter spacing along the names, for every size it ships. Larger headings start tighter.',
  nudgeOpt: (v: number): string => (v === 0 ? 'Default' : `${Math.abs(v)} ${Math.abs(v) === 1 ? 'step' : 'steps'} ${v > 0 ? 'looser' : 'tighter'}`),
  landsOn: (names: string): string => `Uses ${names}`,
} as const;
/** The italic chips (owner decision Q6, APPROVED). */
const ITALIC_CHIPS: readonly { v: ItalicStyle; l: string }[] = [{ v: 'upright', l: 'Upright' }, { v: 'both', l: 'Upright + italic' }, { v: 'only', l: 'Italic only' }];
/** The weight numbers a weight can take (the legacy table's steps). */
const WEIGHT_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
/** The plain name under each `font.family.<type>` token (owner decision Q68's example, "Body face"). DRAFT. */
const FACE_NAME: Record<string, string> = {
  display: 'Display family', title: 'Title family', body: 'Body family', label: 'Label family',
  caption: 'Caption family', eyebrow: 'Eyebrow family', code: 'Code family',
};
const NONE = '__none__';   // a sentinel no font family can be called (the legacy page's)

/** Something drawn that search can hide and a refusal can mark. */
type Item = { el: HTMLElement; said: string; key: string; block?: LeverBlock };

/** Mount the Type levers into `host`. Subscriptions are released through `cleanups`. */
export const mountTypeLevers = (host: HTMLElement, cleanups: (() => void)[], lend: PageLends): void => {
  const root = hook(h('div', 'p3-levers-body'), 'type-levers');
  host.replaceChildren(root);
  /** Scale's own Show advanced (Individual sizes), and the page's (the advanced sections). */
  let scaleAdvOpen = false;
  let secAdvOpen = false;
  /** The value picker that is open, by its control's key, or null; one at a time, under its row (v6). */
  let openPick: string | null = null;
  /** Set when a picker was just opened, so the repaint puts focus on its current value. */
  let focusPick = false;
  let pickFocus: (() => void) | null = null;
  /** The key the last edit wrote, so an engine refusal marks the lever that caused it. */
  let lastEdited: string | null = null;
  /** The Add face field's text and refusal, kept across a repaint. */
  let addError: string | null = null;
  let items: Item[] = [];

  const edit = (key: string, write: () => void): void => {
    lastEdited = key;
    write();
    noteSectionEdit();   // QA-B9: the edit, and only an edit, reveals its preview section
    rebuild();
  };
  const fonts = (): HostFonts => lend.fonts();

  /** A derived mode's one line, at the top of the levers: every control on the page is read-only (Q59). S4a's. */
  const derivedLine = (): HTMLElement | null =>
    isDerived(currentMode) ? hook(stateLine(`${modeLabel(currentMode)} is auto-derived — read-only. Edit Light or Dark and it follows.`), 'type-derived') : null;

  /** A plain name, and its token under it in mono (QA-B2, which reverses Q68's order), as Surfaces & fills' fields. */
  const tokenName = tokenLabel;

  // ── the library ───────────────────────────────────────────────────────────────────────────────
  const library = (): Item => {
    const ty = theme.typography;
    const b = leverBlock('typography.typefaceLibrary', { label: TYPE_COPY.libraryLabel, desc: TYPE_COPY.libraryTip, group: true });
    const f = fonts();
    const head = h('div', 'p3-facehead');
    // The source of the availability verdict, named because the two hosts answer from different ones (the
    // legacy column heading's words): the host's font list once it has sent one, this device otherwise.
    head.append(h('span', 'p3-field-label', TYPE_COPY.faceHead), hook(h('span', 'p3-field-label', f.hostFonts.length ? 'In this Figma' : 'On this device'), 'typeface-source'));
    const list = hook(h('div', 'p3-fillrows'), 'face-library');
    const used = (name: string): string[] => {
      const base = TYPE_GROUP_ORDER.filter((g) => ty.families.find((x) => x.group === g)?.stack[0] === name);
      const inModes = Object.entries(ty.familiesByMode ?? {}).flatMap(([, fams]) => fams.filter((x) => x.stack[0] === name).map((x) => x.group));
      return [...new Set([...base, ...inModes])];
    };
    for (const tf of ty.typefaces) {
      const row = hook(h('div', 'p3-facerow'), 'face-row');
      row.dataset.slug = tf.slug;
      const st = faceStatus(tf.name, f);
      const by = used(tf.name);
      const name = tokenName(`font.typeface.${tf.slug}`, tf.name);
      const meta = h('span', 'p3-sub', by.length ? TYPE_COPY.usedBy(by) : TYPE_COPY.unused);
      name.append(meta);
      const stat = hook(h('span', 'p3-face-stat', st.label), 'face-status');
      stat.title = st.title;
      if (!st.ok) stat.dataset.bad = 'true';
      row.append(name, stat);
      // A family nothing uses, staged in the library, can be removed (always shown, owner 2026-10-03). Brand-wide.
      if (!by.length && inLibrary(tf.name)) {
        const rm = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon'), 'face-remove');
        rm.type = 'button';
        rm.setAttribute('aria-label', TYPE_COPY.remove(tf.name));
        rm.title = TYPE_COPY.remove(tf.name);
        rm.append(glyph('x'));
        rm.onclick = () => edit('typography.typefaceLibrary', () => removeLibraryFace(tf.slug));
        row.append(rm);
      }
      list.append(row);
    }
    b.ctl.append(head, list, addRow());
    b.ctl.append(subLine(f.hostFonts.length ? TYPE_COPY.spellFigma(f.hostFonts.length) : TYPE_COPY.spellWeb));
    return { el: b.el, said: `${b.said} ${ty.typefaces.map((t) => `${t.name} font.typeface.${t.slug}`).join(' ')}`.toLowerCase(), key: 'typography.typefaceLibrary', block: b };
  };

  /** Add face: a text field and a button; in the plugin the field is a combobox over the host's fonts (#113),
   *  page DOM rather than a datalist, so it scrolls and themes in Figma's iframe. A hint, not a constraint: an
   *  unlisted name still commits. Enter on a highlighted option fills the field; the next Enter adds it. */
  const addRow = (): HTMLElement => {
    const wrap = hook(h('div', 'p3-faceadd'), 'face-add-row');
    const field = textField('p3-face-add', 'face-add-input', { label: TYPE_COPY.addLabel });
    const input = field.el;
    input.placeholder = TYPE_COPY.addPlaceholder;
    const combo = h('div', 'p3-combo');
    combo.append(input);
    const f = fonts();
    let comboKey: ((e: KeyboardEvent) => boolean) | null = null;
    if (f.hostFonts.length) {
      const list = hook(h('div', 'p3-combo-list'), 'face-font-list');
      list.id = 'p3-face-font-list';
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', 'Font families this Figma can load');
      list.hidden = true;
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-controls', list.id);
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-expanded', 'false');
      let shown: string[] = [];
      let active = -1;
      const optId = (i: number): string => `p3-face-font-o${i}`;
      const setActive = (i: number): void => {
        const rows = [...list.children] as HTMLElement[];
        if (active >= 0 && rows[active]) rows[active].setAttribute('aria-selected', 'false');
        active = i;
        if (i < 0) { input.removeAttribute('aria-activedescendant'); return; }
        const row = rows[i];
        if (!row) return;
        row.setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', optId(i));
        row.scrollIntoView({ block: 'nearest' });
      };
      const close = (): void => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); setActive(-1); };
      const open = (): void => {
        if (!shown.length) { close(); return; }
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      };
      const paint = (q: string): void => {
        const needle = q.trim().toLowerCase();
        const pre: string[] = [], mid: string[] = [];
        for (const name of f.hostFonts) {
          if (!needle) { pre.push(name); continue; }
          const at = name.toLowerCase().indexOf(needle);
          if (at === 0) pre.push(name); else if (at > 0) mid.push(name);
        }
        shown = pre.concat(mid);
        list.replaceChildren(...shown.map((name, i) => {
          // textContent, never innerHTML: these names are the host's.
          const o = hook(h('div', 'p3-combo-opt', name), 'face-font-option');
          o.id = optId(i);
          o.setAttribute('role', 'option');
          o.setAttribute('aria-selected', 'false');
          // mousedown, not click: the field's blur closes the list before a click lands.
          o.onmousedown = (e) => { e.preventDefault(); input.value = name; close(); input.focus(); };
          return o;
        }));
        active = -1;
      };
      input.addEventListener('input', () => { paint(input.value); open(); });
      input.addEventListener('focus', () => { paint(input.value); open(); });
      input.addEventListener('blur', () => close());
      comboKey = (e) => {
        const isOpen = !list.hidden;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          if (!isOpen) { paint(input.value); open(); if (shown.length) setActive(0); return true; }
          if (!shown.length) return true;
          setActive(e.key === 'ArrowDown' ? (active + 1) % shown.length : (active <= 0 ? shown.length - 1 : active - 1));
          return true;
        }
        if (e.key === 'Escape') { if (!isOpen) return false; close(); return true; }
        if (e.key === 'Enter' && isOpen && active >= 0 && shown[active]) { input.value = shown[active]; close(); return true; }
        if (e.key === 'Tab' && isOpen) { close(); return false; }
        return false;
      };
      combo.append(list);
    }
    const go = hook(h('button', 'p3-btn p3-btn-page'), 'face-add');
    go.type = 'button';
    go.append(glyph('plus'), h('span', 'p3-btn-label', TYPE_COPY.add));
    const submit = (): void => {
      const refused = addLibraryFace(input.value, theme.typography.typefaces);
      if (refused) { addError = refused; render(); root.querySelector<HTMLElement>('#p3-face-add')?.focus(); return; }
      addError = null;
      input.value = '';
      edit('typography.typefaceLibrary', () => {});
    };
    go.onclick = submit;
    input.addEventListener('keydown', (e) => {
      if (comboKey && comboKey(e)) { e.preventDefault(); return; }
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    const line = h('div', 'p3-faceadd-row');
    line.append(combo, go);
    wrap.append(line);
    if (addError) wrap.append(hook(stateLine(addError, 'warn'), 'face-add-error'));
    return wrap;
  };

  // ── the face for each text type, for the previewed mode ────────────────────────────────────────
  const families = (): Item[] => {
    const ty = theme.typography;
    const mode = currentMode;
    const derived = isDerived(mode);
    const b = leverBlock('typography.families', { label: TYPE_COPY.familiesLabel, desc: TYPE_COPY.familiesTip, group: true });
    const out: Item[] = [];
    if (!derived) b.ctl.append(subLine(`Editing ${modeLabel(mode)}, the mode the preview shows.`));
    const rows = hook(h('div', 'p3-fillrows'), 'family-rows');
    const baseFace = (g: string): string => ty.families.find((f) => f.group === g)?.stack[0] ?? '';
    for (const g of TYPE_GROUP_ORDER) {
      const base = baseFace(g);
      const unbound = g === 'code' && getPath(brandState, 'typography.families.code') === null;
      const id = `p3-family-${g}`;
      const fld = hook(h('div', 'p3-field'), 'family-row');
      fld.dataset.group = g;
      const s = selectField(id, `${FACE_NAME[g]}, ${modeLabel(mode)}`, 'family-select', (v) => {
        if (mode === 'light') {
          if (v === NONE) edit('typography.families', () => setFamily('light', g, null));
          else if (v) edit('typography.families', () => setFamily('light', g, v));
          return;
        }
        edit('typography.families', () => setFamily(mode, g, v));
      });
      s.select.dataset.group = g;
      const line = h('div', 'p3-famrow');
      line.append(s.el);
      if (mode === 'light' || derived) {
        // Light writes the brand value. A derived mode carries no families of its own: it shows the brand
        // value, read-only (the legacy page's #423 rule).
        const opts = ty.typefaces.map((t) => ({ v: t.name, l: t.name }));
        if (base && !opts.some((o) => o.v === base)) opts.push({ v: base, l: base });
        if (g === 'code') opts.push({ v: NONE, l: CODE_NONE });
        s.set(opts, unbound ? NONE : base);
      } else if (unbound) {
        // Nothing to override: code ships no styles in any mode.
        s.set([{ v: '', l: familyAuto(CODE_NONE) }], '');
        s.select.disabled = true;
      } else {
        const raw = getModeLever(mode, `families.${g}`);
        const ov = Array.isArray(raw) ? raw[0] as string | undefined : raw as string | undefined;
        // An override equal to the brand value is inert (the engine drops it), so it reads as Auto.
        const name = ov && ov !== base ? ov : undefined;
        const opts = [{ v: '', l: familyAuto(base) }, ...ty.typefaces.filter((t) => t.name !== base).map((t) => ({ v: t.name, l: t.name }))];
        if (name && !ty.typefaces.some((t) => t.name === name)) opts.push({ v: name, l: name });
        s.set(opts, name ?? '');
        if (name) {
          s.select.dataset.set = 'true';
          const reset = hook(h('button', 'p3-btn p3-btn-page'), 'family-reset');
          reset.type = 'button';
          reset.dataset.group = g;
          reset.append(h('span', 'p3-btn-label', 'Return to Auto'));
          reset.setAttribute('aria-label', `${FACE_NAME[g]}: Return to Auto`);
          reset.onclick = () => edit('typography.families', () => setFamily(mode, g, undefined));
          line.append(reset);
        }
      }
      fld.append(tokenName(`font.family.${g}`, FACE_NAME[g], id, { onLine: true }), line);
      rows.append(fld);
      out.push({ el: fld, said: `${FACE_NAME[g]} font.family.${g} ${g}`.toLowerCase(), key: `family:${g}` });
    }
    b.ctl.append(rows);
    // Which faces this mode binds that are not available where the text styles are written.
    const f = fonts();
    const fams = ty.familiesByMode?.[mode] ?? ty.families;
    const missing = [...new Set(fams.map((x) => x.stack[0]).filter((x): x is string => !!x))].filter((x) => !faceStatus(x, f).ok);
    if (missing.length) b.setState(hook(stateLine(f.hostFonts.length ? TYPE_COPY.missingFigma(missing) : TYPE_COPY.missingWeb(missing), 'warn'), 'family-missing'));
    return [{ el: b.el, said: '', key: 'typography.families', block: b }, ...out];
  };

  // ── Show advanced (Q64, Q69): Apply to all ──────────────────────────────────────────────────────
  const applyAll = (): Item => {
    const ty = theme.typography;
    const box = hook(h('div', 'p3-field'), 'family-all');
    const lab = h('label', 'p3-field-label', TYPE_COPY.allLabel);
    lab.htmlFor = 'p3-family-all';
    const s = selectField('p3-family-all', TYPE_COPY.allLabel, 'family-all-select', () => {});
    s.set([{ v: '', l: TYPE_COPY.allChoose }, ...ty.typefaces.map((t) => ({ v: t.name, l: t.name }))], '');
    const go = hook(h('button', 'p3-btn p3-btn-page'), 'family-all-apply');
    go.type = 'button';
    go.append(h('span', 'p3-btn-label', TYPE_COPY.allApply));
    go.onclick = () => { const v = s.select.value; if (v) edit('typography.families', () => setAllFamilies(v)); };
    const line = h('div', 'p3-faceadd-row');
    line.append(s.el, go);
    box.append(lab, line, subLine(TYPE_COPY.allNote));
    // The legacy control wrote the Light faces only, so it is offered while previewing Light (Q22).
    if (currentMode !== 'light') {
      s.select.disabled = true;
      go.disabled = true;
      box.append(subLine(TYPE_COPY.allLightOnly));
    }
    return { el: box, said: `${TYPE_COPY.allLabel} ${TYPE_COPY.allApply}`.toLowerCase(), key: 'family-all' };
  };

  // ── S6.3: shared pieces ───────────────────────────────────────────────────────────────────────
  /** The mode a per-mode control edits, and whether it is Light (the brand value). */
  const modeNow = (): { mode: string; light: boolean } => ({ mode: currentMode, light: currentMode === 'light' });
  /** The family a text type uses in the previewed mode, as a CSS stack, for a live sample. */
  const stackOf = (g: string): string => {
    const ty = theme.typography;
    const fams = ty.familiesByMode?.[currentMode] ?? ty.families;
    return fams.find((f) => f.group === g)?.stack.map((x) => (/^[a-z-]+$/.test(x) ? x : `"${x}"`)).join(', ') ?? 'inherit';
  };

  /** A button that opens the value picker under its row (owner decision Q65), one picker open at a time. `key`
   *  names the slot in `openPick`. The picker is drawn by the caller into `slot` when this key is open. */
  const pickButton = (key: string, id: string, role: string, name: string, now: string, set: boolean): HTMLButtonElement => {
    const btn = hook(h('button', 'p3-btn p3-btn-page p3-pick'), role);
    btn.type = 'button';
    btn.id = id;
    btn.dataset.key = key;
    if (set) btn.dataset.set = 'true';
    btn.setAttribute('aria-expanded', String(openPick === key));
    btn.setAttribute('aria-label', `${name}, ${modeLabel(currentMode)}: ${now}. Pick a value`);
    btn.append(h('span', 'p3-btn-label', now), glyph('chev'));
    btn.onclick = () => {
      const opening = openPick !== key;
      openPick = opening ? key : null;
      focusPick = opening;
      render();
    };
    return btn;
  };
  /** The value picker for `key`, when it is the open one, closing back to its button. */
  const pickerFor = (key: string, btnId: string, o: Omit<ValuePickerOpts, 'modeLabel' | 'onClose'>): HTMLElement | null => {
    if (openPick !== key || isDerived(currentMode)) return null;
    const pk = valuePicker({ ...o, modeLabel: modeLabel(currentMode), onClose: () => { openPick = null; render(); root.querySelector<HTMLElement>(`#${btnId}`)?.focus(); } });
    pickFocus = pk.focusCurrent;
    return pk.el;
  };
  /** A section's own Show advanced (S6.2's form): a disclosure button and the body it opens. */
  const advFold = (hk: string, id: string, open: boolean, n: number, toggle: () => void, body: () => HTMLElement[]): HTMLElement => {
    const row = h('div', 'p3-advrow');
    const btn = hook(h('button', 'p3-btn p3-btn-page'), hk);
    btn.type = 'button';
    btn.id = `p3-adv-${id}`;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-controls', `p3-advb-${id}`);
    btn.append(glyph(open ? 'chev' : 'chevr'), h('span', 'p3-btn-label', `${open ? 'Hide' : 'Show'} ${n} advanced`));
    btn.onclick = toggle;
    const b = h('div', 'p3-advbody');
    b.id = `p3-advb-${id}`;
    b.hidden = !open;
    if (open) b.append(...body());
    row.append(btn, b);
    return row;
  };

  // ── Scale ──────────────────────────────────────────────────────────────────────────────────────
  /** The heading scale: three chips, a chip the engine would refuse (a size you set colliding at that scale,
   *  #353) disabled with the reason, and Release pinned sizes while any is. Brand-wide: any editable mode. */
  const typeScale = (): Item[] => {
    const L = leverOf('typography.typeScale');
    const b = leverBlock('typography.typeScale', { label: S63.scaleLabel, desc: S63.scaleTip, group: true });
    const cur = String(getPath(brandState, 'typography.typeScale') ?? 'default');
    const opts = (L?.options ?? []).map((o) => ({ v: String(o.value), l: String(o.label) }));
    const c = choice(S63.scaleLabel, 'type-scale', opts, (v) => edit('typography.typeScale', () => setTypeScale(v)));
    c.set(cur);
    let blocked = 0;
    for (const o of opts) {
      if (!shapeBlocked(o.v, cur)) continue;
      blocked++;
      const chip = c.el.querySelector<HTMLButtonElement>(`[data-value="${o.v}"]`);
      if (chip) { chip.disabled = true; chip.title = S63.scaleClash; }
    }
    b.ctl.append(c.el);
    // TS1 A (#2216, owner approval 2026-10-06): the control, then the pinned count as a plain line under it, then each
    // warning in a group of its own, holding its own action: the clash with Release pinned sizes, then the missing styles.
    const pins = pinnedSizeCount();
    if (pins) {
      const line = hook(stateLine(S63.pinned(pins)), 'type-sizes-count');
      line.classList.add('p3-tscale-pins');
      b.ctl.append(line);
    }
    if (blocked) {
      const rel = hook(h('button', 'p3-btn p3-btn-page'), 'type-scale-release');
      rel.type = 'button';
      rel.append(h('span', 'p3-btn-label', S63.release));
      rel.onclick = () => edit('typography.typeScale', () => releasePinnedSizes());
      const box = hook(h('div', 'p3-tscale-group p3-tscale-clash'), 'type-scale-clash');
      box.append(stateLine(S63.scaleClash, 'warn'), rel);
      b.ctl.append(box);
    }
    // #1802 (owner decision Q72): a text style the preview binds by name that this brand does not make. Inside the
    // lever since TS1 A, so it reads as part of Type scale.
    const miss = rp.unresolvedType;
    if (miss.length) {
      const box = hook(h('div', 'p3-tscale-group'), 'type-scale-unresolved');
      box.append(hook(stateLine(S63.unresolved(miss), 'warn'), 'type-unresolved'));
      b.ctl.append(box);
    }
    return [{ el: b.el, said: b.said, key: 'typography.typeScale', block: b }];
  };

  /** Individual sizes (Q63 option A, Q64): each heading size, a Desktop and a Mobile control side by side. Desktop
   *  is per mode: Light writes the brand's size (`typography.sizes`), another mode its own (`typeSizes`), shown as
   *  "Auto: follows Light (‹px›)" until set. Mobile is the heading's phone size (`sizeOverrides.<g>.<v>.mobile`,
   *  #1587), brand-wide, so it writes the same bytes from any editable mode (the Q54 rule); it shows while
   *  headings scale between mobile and desktop, as the legacy table did. */
  const sizes = (): Item => {
    const ty = theme.typography;
    const { mode, light } = modeNow();
    const b = leverBlock('typography.sizes', { label: S63.sizesLabel, desc: S63.sizesTip, group: true });
    const widest = widestRowsOf();
    const fluid = ty.fluid;
    const ladder = ty.sizesPx;
    for (const g of PER_MODE_SIZE_GROUPS) {
      const live = rowsOf(theme, g);
      const all = widest?.get(g) ?? live;
      if (!all.length) continue;
      const inRange = new Set(live.map((r) => r.variant));
      const comp = (v: string) => ty.composites.find((x) => x.group === g && x.variant === v)!;
      const desk = live.map((r) => (light ? undefined : comp(r.variant).sizeByMode?.[mode]) ?? comp(r.variant).sizePx);
      const base = live.map((r) => comp(r.variant).sizePx);
      const mob = live.map((r) => comp(r.variant).sizeMinPx);
      const floor = HEADING_SIZE_FLOOR[g];
      const grp = hook(h('div', 'p3-tsizes'), 'type-sizes-group');
      grp.dataset.group = g;
      const head = h('div', 'p3-tsizes-head');
      const hc = h('div', 'p3-tsizes-cells');
      hc.append(h('span', 'p3-field-label', S63.desktop), ...(fluid ? [h('span', 'p3-field-label', S63.mobile)] : []));
      head.append(h('span', 'p3-field-label', S63.groupName(g)), hc);
      grp.append(head);
      for (const r of all) {
        const row = hook(h('div', 'p3-tsizes-row'), 'type-size-row');
        row.dataset.group = g;
        row.dataset.variant = r.variant;
        const nm = tokenLabel(`type.${g}.${r.variant}`, `${S63.groupName(g)} ${r.variant}`);
        row.append(nm);
        if (!inRange.has(r.variant)) {
          row.dataset.off = 'true';
          row.append(h('span', 'p3-sub', S63.outside(r.px)));
          grp.append(row);
          continue;
        }
        const i = live.findIndex((x) => x.variant === r.variant);
        const sample = (px: number) => (e: HTMLElement): void => { e.textContent = 'Ag'; e.style.fontFamily = stackOf(g); e.style.fontSize = `${Math.min(px, 40)}px`; };
        // Desktop: sizes stay strictly in order, and at or above the group's floor (the engine refuses otherwise).
        const upper = i > 0 ? { px: desk[i - 1], v: live[i - 1].variant } : null;
        const lower = i + 1 < desk.length ? { px: desk[i + 1], v: live[i + 1].variant } : null;
        const ov = light ? brandSizePin(g, r.variant) : modeSizePin(mode, g, r.variant);
        const mPinned = fluid ? viewportPin(g, r.variant, 'mobile') : undefined;
        const dKey = `size:${g}.${r.variant}:desktop`;
        const dId = `p3-size-${g}-${r.variant}-d`;
        const dNow = !light && ov === undefined ? S63.autoLight(`${base[i]}px`) : `${desk[i]}px`;
        const dBtn = pickButton(dKey, dId, 'type-size-desktop', `${S63.groupName(g)} ${r.variant}, ${S63.desktop}`, dNow, ov !== undefined);
        dBtn.dataset.group = g;
        dBtn.dataset.variant = r.variant;
        const cells = h('div', 'p3-tsizes-cells');
        cells.append(dBtn);
        let mKey: string | null = null, mId = '';
        if (fluid) {
          mKey = `size:${g}.${r.variant}:mobile`;
          mId = `p3-size-${g}-${r.variant}-m`;
          const mPin = viewportPin(g, r.variant, 'mobile');
          const mBtn = pickButton(mKey, mId, 'type-size-mobile', `${S63.groupName(g)} ${r.variant}, ${S63.mobile}`, `${mob[i]}px`, mPin !== undefined);
          mBtn.dataset.group = g;
          mBtn.dataset.variant = r.variant;
          cells.append(mBtn);
        }
        row.append(cells);
        grp.append(row);
        const window = (lo: number, hi: number): number[] => {
          const a = Math.max(0, ladder.findIndex((x) => x >= lo) - 1);
          let z = ladder.findIndex((x) => x > hi);
          z = z < 0 ? ladder.length - 1 : z;
          return ladder.slice(a, z + 1);
        };
        const dPick = pickerFor(dKey, dId, {
          name: `${S63.groupName(g)} ${r.variant}, ${S63.desktop}`,
          hint: S63.sizeHint,
          current: desk[i],
          values: window(lower ? lower.px : floor, upper ? upper.px : ladder[ladder.length - 1]).map((px) => ({
            v: px, label: `${px}px`, sample: sample(px),
            refuse: px < floor ? S63.belowFloor(S63.groupName(g), floor)
              : lower && px <= lower.px ? S63.notAbove(`${g}.${lower.v}`, lower.px)
                : upper && px >= upper.px ? S63.notBelow(`${g}.${upper.v}`, upper.px)
                  // A mobile size set individually may not end up larger than the desktop size (the engine refuses it).
                  : light && mPinned !== undefined && px < mPinned ? S63.underMobile(mPinned) : undefined,
          })),
          reset: light ? { label: S63.followScale, enabled: ov !== undefined } : { label: S63.toAuto, enabled: ov !== undefined },
          onPick: (px) => edit('typography.sizes', () => setSizePin(light ? null : mode, g, r.variant, px)),
          onReset: () => edit('typography.sizes', () => setSizePin(light ? null : mode, g, r.variant, undefined)),
        });
        if (dPick) grp.append(dPick);
        if (mKey) {
          // Mobile: on the ladder, at or above the floor, at most its own desktop size, and in order with its
          // neighbors (equal allowed): the engine's coherence guard, so the picker never offers a refused value.
          const larger = i > 0 ? { px: mob[i - 1], v: live[i - 1].variant } : null;
          const smaller = i + 1 < mob.length ? { px: mob[i + 1], v: live[i + 1].variant } : null;
          const lo = Math.max(floor, smaller?.px ?? floor);
          const hi = Math.min(base[i], larger?.px ?? base[i]);
          const mPick = pickerFor(mKey, mId, {
            name: `${S63.groupName(g)} ${r.variant}, ${S63.mobile}`,
            hint: S63.mobileHint,
            current: mob[i],
            values: window(lo, base[i]).map((px) => ({
              v: px, label: `${px}px`, sample: sample(px),
              refuse: px < floor ? S63.belowFloor(S63.groupName(g), floor)
                : smaller && px < smaller.px ? S63.notAboveMobile(`${g}.${smaller.v}`, smaller.px)
                  : px > base[i] ? S63.overDesktop(base[i])
                    : larger && px > larger.px ? S63.notBelowMobile(`${g}.${larger.v}`, larger.px) : undefined,
            })).filter((x) => x.v <= Math.max(hi, base[i])),
            reset: { label: S63.followScale, enabled: viewportPin(g, r.variant, 'mobile') !== undefined },
            onPick: (px) => edit('typography.sizes', () => setMobileSize(g, r.variant, px)),
            onReset: () => edit('typography.sizes', () => setMobileSize(g, r.variant, undefined)),
          });
          if (mPick) grp.append(mPick);
        }
      }
      b.ctl.append(grp);
    }
    if (!light) b.ctl.prepend(subLine(`Editing ${modeLabel(mode)}, the mode the preview shows. ${S63.mobileBrandWide}`));
    return { el: b.el, said: `${b.said} ${S63.desktop} ${S63.mobile}`.toLowerCase(), key: 'typography.sizes', block: b };
  };

  const scale = (s: Section): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s.title, s.desc, 2);
    const out: Item[] = [];
    for (const it of typeScale()) { el.append(it.el); out.push(it); }
    const show = scaleAdvOpen || !!searchQuery.trim();
    el.append(advFold('scale-advanced', 'type-scale', show, 1, () => { scaleAdvOpen = !scaleAdvOpen; render(); }, () => {
      const sz = sizes();
      out.push(sz);
      return [sz.el];
    }));
    return { el, items: out };
  };

  // ── Scale limits ───────────────────────────────────────────────────────────────────────────────
  /** Every control here is brand-wide (the engine has no per-mode limit): any editable mode writes the same bytes. */
  const limits = (s: Section): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s.title, s.desc, 3);
    const out: Item[] = [];
    const ty = theme.typography;
    // Headings scale between mobile and desktop (owner decision Q70's words): `responsive.fluid`, ALWAYS written
    // (the legacy bytes), and the viewport pair the clamp() runs between. Turning it off while a mobile size is
    // set individually is the engine's refusal, so the switch is disabled there with that reason (#2055), as the
    // 16px title chip is under Compact. A brand that arrives off with a mobile size set is already refused, and
    // its switch stays live: turning it on is the way out (B8b's rule).
    {
      const b = leverBlock('typography.responsive', { label: S63.fluidLabel, desc: S63.fluidTip, group: true });
      const sw = switchButton('p3-type-fluid', S63.fluidLabel, 'type-fluid', { on: 'On', off: 'Off' }, (on) => edit('typography.responsive', () => setFluid(on)));
      const fluidOn = brandState.typography?.responsive?.fluid ?? ty.fluid;
      sw.set(fluidOn);
      const mobiles = fluidOn ? fluidBlocked() : [];
      if (mobiles.length) { sw.el.disabled = true; sw.el.title = S63.fluidPinned(mobiles); }
      const pair = h('div', 'p3-fieldpair');
      for (const [key, label, fallback] of [['minViewport', S63.minVp, ty.minViewport], ['maxViewport', S63.maxVp, ty.maxViewport]] as const) {
        const f = h('div', 'p3-field');
        const id = `p3-type-${key}`;
        const lab = h('label', 'p3-field-label', label);
        lab.htmlFor = id;
        const t = textField(id, `type-${key === 'minViewport' ? 'min' : 'max'}-viewport`, {
          // A pair the engine refuses (#2068) is put back rather than written, as Layout puts back a refused
          // breakpoint, and says why in the engine's own sentence, as a warning under the fields.
          onCommit: (v, fld) => {
            const was = String(getPath(brandState, `typography.responsive.${key}`) ?? fallback);
            if (was === v) return;
            const refused = viewportRefusal(key, Number(v));
            if (refused) { fld.value = was; b.setState(hook(stateLine(refused, 'warn'), 'type-viewport-refused')); return; }
            edit('typography.responsive', () => { setResponsiveViewport(key, Number(v)); });
          },
        });
        t.el.inputMode = 'numeric';
        t.set(String(getPath(brandState, `typography.responsive.${key}`) ?? fallback));
        f.append(lab, t.el);
        pair.append(f);
      }
      const dep = hook(h('button', 'p3-btn p3-btn-ghost p3-deplink'), 'type-fluid-layout');
      dep.type = 'button';
      dep.append(h('span', 'p3-btn-label', S63.dependsLayout), glyph('chevr'));
      dep.onclick = () => setPage('layout');
      b.ctl.append(sw.el, pair, dep);
      el.append(b.el);
      out.push({ el: b.el, said: `${b.said} ${S63.minVp} ${S63.maxVp}`.toLowerCase(), key: 'typography.responsive', block: b });
    }
    // The display ceiling: the largest display size the brand makes, each option priced by one trial build. A
    // ceiling below a display size set individually (desktop, mobile or any mode's) is the engine's refusal, so it
    // is disabled with that reason (owner, 2026-10-04, #2044), as a clashing scale chip is. A brand that arrives
    // with such a ceiling keeps its current option live, so it can move out (B8b's rule).
    {
      const L = leverOf('typography.displayCeiling');
      const b = leverBlock('typography.displayCeiling', { label: S63.ceilingLabel, desc: S63.ceilingTip, forId: 'p3-type-ceiling' });
      const opts = L?.options ?? [];
      const px = ceilingPx(opts[opts.length - 1]?.value);
      const cur = String(getPath(brandState, 'typography.displayCeiling') ?? L?.default);
      const blocked = ceilingBlocked();
      const s2 = selectField('p3-type-ceiling', S63.ceilingLabel, 'type-ceiling', (v) => edit('typography.displayCeiling', () => setDisplayCeiling(v)));
      s2.set(opts.map((o) => {
        const v = String(o.value), by = v === cur ? undefined : blocked.get(v);
        return { v, l: px.get(v) ? `display.${o.value} · ${px.get(v)}px` : `display.${o.value}`, off: by && S63.ceilingPinned(by) };
      }), cur);
      b.ctl.append(s2.el);
      el.append(b.el);
      out.push({ el: b.el, said: b.said, key: 'typography.displayCeiling', block: b });
    }
    const chips = (key: string, label: string, tip: string, role: string, opts: readonly { v: string; l: string }[], cur: string, write: (v: string) => void, after?: HTMLElement | null): void => {
      const b = leverBlock(key, { label, desc: tip, group: true });
      const c = choice(label, role, opts, (v) => edit(key, () => write(v)));
      c.set(cur);
      b.ctl.append(c.el);
      if (after) b.setState(after);
      el.append(b.el);
      out.push({ el: b.el, said: b.said, key, block: b });
    };
    // The title floor. 16px under the Compact scale is the engine's refusal (Compact already places a title at
    // 16px), so the chip is disabled there with that reason (owner, B8b, 2026-10-03), as a clashing scale chip is.
    // A brand that arrives with both set keeps its 16px chip live, so it can move back to 18px. And 18px while
    // title 2xs is set individually is the engine's refusal too (only 16px makes title 2xs), so the 18px chip is
    // disabled there with that reason (#2054). A brand that arrives on 18px with title 2xs set keeps its 18px
    // chip live by the same rule; 16px is its way out.
    const floor16 = (getPath(brandState, 'typography.titleFloor') ?? 18) === 16;
    chips('typography.titleFloor', S63.titleFloorLabel, S63.titleFloorTip, 'title-floor', [{ v: '18', l: '18px' }, { v: '16', l: '16px' }],
      floor16 ? '16' : '18', (v) => setTitleFloor(v === '16'));
    if (getPath(brandState, 'typography.typeScale') === 'compact' && !floor16) {
      const chip = el.querySelector<HTMLButtonElement>('[data-p3="title-floor-16"]');
      if (chip) { chip.disabled = true; chip.title = S63.titleFloorCompact; }
    }
    if (floor16 && titleFloorBlocked()) {
      const chip = el.querySelector<HTMLButtonElement>('[data-p3="title-floor-18"]');
      if (chip) { chip.disabled = true; chip.title = S63.titleFloorPinned; }
    }
    chips('typography.captionFloor', S63.captionFloorLabel, S63.captionFloorTip, 'caption-floor', [{ v: '11', l: '11px' }, { v: '10', l: '10px' }],
      (getPath(brandState, 'typography.captionFloor') ?? 11) === 10 ? '10' : '11', (v) => setCaptionFloor(v === '10' ? 10 : 11));
    const eight = (getPath(brandState, 'typography.sizeFloor') ?? 10) === 8;
    chips('typography.sizeFloor', S63.sizeFloorLabel, S63.sizeFloorTip, 'size-floor', [{ v: '10', l: '10px' }, { v: '8', l: '8px' }],
      eight ? '8' : '10', (v) => setSizeFloor(v === '8' ? 8 : 10), eight ? hook(stateLine(S63.eightWarn, 'warn'), 'size-floor-warn') : null);
    return { el, items: out };
  };

  // ── Weights and styles ─────────────────────────────────────────────────────────────────────────
  /** One row per weight name (Q65 option A: the value picker, every weight with a live sample, order-breaking
   *  ones disabled with the reason), for the previewed mode (Q62): Light writes `typography.weightRoles.<name>`,
   *  another mode `modeLevers[mode].weights.<name>`, shown as "Auto: follows Light (‹n›)" until set. */
  const weightRows = (): Item[] => {
    const ty = theme.typography;
    const { mode, light } = modeNow();
    const b = leverBlock('typography.weightRoles', { label: S63.weightsLabel, desc: S63.weightsTip, group: true });
    if (!light) b.ctl.append(subLine(`Editing ${modeLabel(mode)}, the mode the preview shows.`));
    const roles = ty.weightRolesByMode?.[mode] ?? ty.weightRoles;
    const body = ty.families.find((f) => f.group === 'body') ? stackOf('body') : 'inherit';
    const rows = hook(h('div', 'p3-fillrows'), 'weight-rows');
    roles.forEach((w, i) => {
      const lightV = ty.weightRoles.find((x) => x.role === w.role)?.value ?? w.value;
      const ov = light ? getPath(brandState, `typography.weightRoles.${w.role}`) as number | undefined : getModeLever(mode, `weights.${w.role}`) as number | undefined;
      const value = light ? (ov ?? w.value) : (ov ?? w.value);
      const key = `weight:${w.role}`;
      const id = `p3-weight-${w.role}`;
      const row = hook(h('div', 'p3-tweight'), 'weight-row');
      row.dataset.role = w.role;
      const now = !light && ov === undefined ? S63.autoLight(String(lightV)) : `${value}${WEIGHT_NAME[value] ? ` · ${WEIGHT_NAME[value]}` : ''}`;
      const btn = pickButton(key, id, 'weight-pick', S63.weightName(w.role), now, ov !== undefined);
      btn.dataset.role = w.role;
      row.append(tokenLabel(`font.weight-role.${w.role}`, S63.weightName(w.role), id), btn);
      rows.append(row);
      const prev = i > 0 ? roles[i - 1] : null, next = i + 1 < roles.length ? roles[i + 1] : null;
      const pk = pickerFor(key, id, {
        name: S63.weightName(w.role),
        hint: S63.weightHint,
        current: value,
        values: WEIGHT_STEPS.map((n) => ({
          v: n, label: `${n}${WEIGHT_NAME[n] ? ` · ${WEIGHT_NAME[n]}` : ''}`,
          sample: (e: HTMLElement) => { e.textContent = 'Ag 123'; e.style.fontFamily = body; e.style.fontWeight = String(n); },
          refuse: prev && n < prev.value ? S63.lighterThan(prev.role, prev.value) : next && n > next.value ? S63.heavierThan(next.role, next.value) : undefined,
        })),
        reset: light ? { label: S63.toDefault, enabled: ov !== undefined } : { label: S63.toAuto, enabled: ov !== undefined },
        onPick: (n) => edit('typography.weightRoles', () => setWeightRole(mode, w.role, n)),
        onReset: () => edit('typography.weightRoles', () => setWeightRole(mode, w.role, undefined)),
      });
      if (pk) rows.append(pk);
    });
    b.ctl.append(rows);
    const eff = roles.map((w) => w.value);
    if (eff.some((v, i) => i > 0 && v < eff[i - 1])) b.setState(hook(stateLine(S63.orderWarn, 'warn'), 'order-warning'));
    return [{ el: b.el, said: `${b.said} ${roles.map((w) => `${w.role} font.weight-role.${w.role}`).join(' ')}`.toLowerCase(), key: 'typography.weightRoles', block: b }];
  };

  /** Which weights each text type ships, and its Link styles: a matrix of checks, the engine's locks (a text
   *  type keeps one weight; label keeps emphasis, body and caption keep default) disabled with the reason. The
   *  style count beside each text type is read from the rebuilt theme on every repaint (#831). Brand-wide. */
  const weightMatrix = (): Item => {
    const ty = theme.typography;
    const roleOrder = ty.weightRoles.map((w) => w.role);
    const linkG = new Set(ty.composites.filter((c) => c.link).map((c) => c.group));
    const b = leverBlock('typography.weights', { label: S63.matrixLabel, desc: S63.matrixTip, group: true });
    const grid = hook(h('div', 'p3-wmatrix'), 'weights-matrix');
    const head = h('div', 'p3-wmatrix-row p3-wmatrix-head');
    head.append(h('span', 'p3-field-label', S63.textType), ...roleOrder.map((r) => hook(h('span', 'p3-field-label', S63.weightName(r)), 'weights-col')), hook(h('span', 'p3-field-label', S63.link), 'weights-col'));
    grid.append(head);
    const cell = (hk: string, label: string, on: boolean, lock: string | undefined, toggle: () => void): HTMLButtonElement => {
      const c = hook(h('button', 'p3-btn p3-mcheck'), hk);
      c.type = 'button';
      c.setAttribute('role', 'checkbox');
      c.setAttribute('aria-checked', String(on));
      c.setAttribute('aria-label', label);
      c.append(glyph('check'));
      if (lock) { c.setAttribute('aria-disabled', 'true'); c.title = lock; c.setAttribute('aria-description', lock); }
      c.onclick = () => { if (c.getAttribute('aria-disabled') !== 'true') toggle(); };
      return c;
    };
    for (const g of TYPE_GROUP_ORDER) {
      const comps = ty.composites.filter((c) => c.group === g);
      const has = new Set(comps.map((c) => c.weightRole));
      const row = hook(h('div', 'p3-wmatrix-row'), 'weights-row');
      row.dataset.group = g;
      const nm = tokenLabel(`type.${g}`, S63.groupName(g));
      nm.append(hook(h('span', 'p3-sub', S63.styles(comps.length)), 'weights-count'));
      row.append(nm);
      for (const r of roleOrder) {
        const c = cell('weight-cell', `${S63.groupName(g)}, ${S63.weightName(r)}`, has.has(r), categoryWeightLock(g, r, has), () => edit('typography.weights', () => toggleCategoryWeight(g, r, roleOrder, has)));
        c.dataset.role = r;
        row.append(c);
      }
      row.append(cell('link-cell', `${S63.groupName(g)}, ${S63.link}`, linkG.has(g), undefined, () => edit('typography.links', () => setLink(g, !linkG.has(g), linkG))));
      grid.append(row);
    }
    b.ctl.append(grid);
    return { el: b.el, said: `${b.said} ${S63.link}`.toLowerCase(), key: 'typography.weights', block: b };
  };

  /** Italic styles, one 3-chip per text type (owner decision Q6): Upright, Upright + italic, Italic only. A text
   *  type that pins a font style cannot be Italic only (the engine refuses it): that chip is disabled with the
   *  reason. Brand-wide. */
  const italics = (): Item => {
    const ty = theme.typography;
    const italicG = new Set(ty.composites.filter((c) => c.italic).map((c) => c.group));
    const italicDefG = new Set(ty.composites.filter((c) => c.italicDefault).map((c) => c.group));
    const b = leverBlock('typography.italics', { label: S63.italicsLabel, desc: S63.italicsTip, group: true });
    const rows = hook(h('div', 'p3-fillrows'), 'italic-rows');
    for (const g of TYPE_GROUP_ORDER) {
      const row = hook(h('div', 'p3-titalic'), 'italic-row');
      row.dataset.group = g;
      const c = choice(`${S63.groupName(g)}: ${S63.italicsLabel}`, 'italic-choice', ITALIC_CHIPS, (v) => edit('typography.italics', () => setItalicStyle(g, v, italicG, italicDefG)));
      c.el.dataset.group = g;
      const now = italicStyleOf(g, italicG, italicDefG);
      c.set(now);
      const pinned = Object.keys((getPath(brandState, `typography.faces.${g}`) as Record<string, unknown> | undefined) ?? {}).length > 0;
      if (pinned && now !== 'only') {
        const only = c.el.querySelector<HTMLButtonElement>('[data-value="only"]');
        if (only) { only.disabled = true; only.title = S63.italicPinned; }
      }
      row.append(tokenLabel(`type.${g}`, S63.groupName(g), undefined, { onLine: true }), c.el);
      rows.append(row);
    }
    b.ctl.append(rows);
    return { el: b.el, said: `${b.said} ${ITALIC_CHIPS.map((x) => x.l).join(' ')}`.toLowerCase(), key: 'typography.italics', block: b };
  };

  /** Pin a font style (#1467, Q64): a verbatim style for one (text type, weight) slot, a width like Condensed a
   *  weight number can't reach. The family is fixed to the one the text type uses (the engine drops a pin whose
   *  family differs), and a pin left behind by a later family change is named. Commits on Enter or blur. */
  const facePins = (): Item => {
    const ty = theme.typography;
    const b = leverBlock('typography.faces', { label: S63.pinLabel, desc: S63.pinTip, group: true });
    const bound = (g: string): string | undefined => ty.families.find((f) => f.group === g)?.stack[0];
    const roleOrder = ty.weightRoles.map((w) => w.role);
    const italicDefG = new Set(ty.composites.filter((c) => c.italicDefault).map((c) => c.group));
    const rows = hook(h('div', 'p3-fillrows'), 'pin-cut-table');
    let slots = 0;
    for (const g of TYPE_GROUP_ORDER) {
      const fam = bound(g);
      if (!fam || italicDefG.has(g)) continue;
      for (const role of roleOrder.filter((r) => ty.composites.some((c) => c.group === g && c.weightRole === r))) {
        slots++;
        const id = `p3-pin-${g}-${role}`;
        const row = hook(h('div', 'p3-tpin'), 'pin-cut-row');
        row.setAttribute('data-cat', g);
        row.setAttribute('data-role', role);
        const nm = tokenLabel(`type.${g}.*.${role}`, `${S63.groupName(g)}, ${S63.weightName(role).toLowerCase()}`, id);
        nm.append(hook(h('span', 'p3-sub', fam), 'pin-cut-face'));
        const cur = getPath(brandState, `typography.faces.${g}.${role}`) as FacePin | undefined;
        const t = textField(id, 'pin-cut-input', {
          label: S63.pinField(S63.groupName(g), role),
          onCommit: (v) => { if ((cur?.style ?? '') === v.trim() && (!cur || cur.family === fam)) return; edit('typography.faces', () => setFacePin(g, role, v, fam)); },
        });
        t.el.placeholder = S63.pinPlaceholder;
        t.set(cur?.style ?? '');
        row.append(nm, t.el);
        rows.append(row);
        if (cur && cur.family !== fam) rows.append(hook(stateLine(S63.pinStale(cur.family, fam), 'warn'), 'pin-cut-stale'));
      }
    }
    b.ctl.append(rows);
    if (!slots) b.ctl.append(subLine(S63.pinNone));
    if (italicDefG.size) b.ctl.append(subLine(S63.pinItalicOnly(TYPE_GROUP_ORDER.filter((g) => italicDefG.has(g)).map(S63.groupName))));
    return { el: b.el, said: b.said, key: 'typography.faces', block: b };
  };

  const weights = (s: Section): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s.title, s.desc, 4);
    const out: Item[] = [...weightRows(), weightMatrix(), italics(), facePins()];
    for (const it of out) el.append(it.el);
    return { el, items: out };
  };

  // ── Line height and letter spacing ─────────────────────────────────────────────────────────────
  /** Each name's step (brand-wide: the binding has no mode), and, previewing another mode, that mode's swap of
   *  one name for another (`modeLevers[mode].<field>.<name>`, "Auto" keeps the name itself). */
  const spacingNames = (field: RungField): Item => {
    const ty = theme.typography;
    const { mode, light } = modeNow();
    const lh = field === 'lineHeights';
    const steps = lh ? ty.lineHeights.map((l) => ({ key: l.key, val: l.value })) : ty.letterSpacings.map((l) => ({ key: l.key, val: l.em }));
    const ladder: readonly number[] = lh ? LINE_HEIGHT_LADDER : LETTER_SPACING_LADDER;
    const fmt = (v: number): string => (lh ? `${v.toFixed(2)}×` : `${v}em · ${emToPercentLabel(v)}`);
    const b = leverBlock(`typography.${field}`, { label: lh ? S63.lhLabel : S63.lsLabel, desc: lh ? S63.lhTip : S63.lsTip, group: true });
    if (!light) b.ctl.append(subLine(S63.swapLine(modeLabel(mode))));
    const rows = hook(h('div', 'p3-fillrows'), lh ? 'lh-rows' : 'ls-rows');
    const body = stackOf('body');
    steps.forEach((s, i) => {
      const key = `${field}:${s.key}`;
      const id = `p3-${lh ? 'lh' : 'ls'}-${s.key}`;
      const row = hook(h('div', 'p3-tspace'), lh ? 'lh-row' : 'ls-row');
      row.dataset.key = s.key;
      const btn = pickButton(key, id, lh ? 'lh-pick' : 'ls-pick', `${s.key}, ${lh ? S63.lhLabel : S63.lsLabel}`, fmt(s.val), false);
      btn.dataset.name = s.key;
      const ctl = h('div', 'p3-tspace-ctl');
      ctl.append(btn);
      row.append(tokenLabel(`font.${lh ? 'line-height' : 'letter-spacing'}-role.${s.key}`, s.key, id), ctl);
      if (!light && !isDerived(mode)) {
        const ov = getModeLever(mode, `${field}.${s.key}`) as string | undefined;
        const sel = selectField(`${id}-swap`, `${s.key} in ${modeLabel(mode)}`, lh ? 'lh-swap' : 'ls-swap', (v) => edit(`typography.${field}`, () => setRepoint(mode, field, s.key, v)));
        sel.select.dataset.name = s.key;
        sel.set([{ v: '', l: S63.autoLight(`${s.key} · ${fmt(s.val)}`) }, ...steps.filter((t) => t.key !== s.key).map((t) => ({ v: t.key, l: `${t.key} · ${fmt(t.val)}` }))], ov ?? '');
        if (ov) sel.select.dataset.set = 'true';
        ctl.append(sel.el);
      }
      rows.append(row);
      const lo = i > 0 ? steps[i - 1] : null, hi = i + 1 < steps.length ? steps[i + 1] : null;
      const pk = pickerFor(key, id, {
        name: `${s.key}, ${lh ? S63.lhLabel : S63.lsLabel}`,
        hint: S63.spaceHint,
        current: s.val,
        values: ladder.map((v) => ({
          v, label: fmt(v),
          sample: (e: HTMLElement) => {
            e.textContent = lh ? S63.lhSample : S63.lsSample;
            e.style.fontFamily = body;
            if (lh) { e.style.lineHeight = String(v); e.dataset.wrap = 'true'; } else { e.style.letterSpacing = `${v}em`; e.style.fontSize = '16px'; }
          },
          refuse: lo && v < lo.val - 1e-9 ? S63.crossBelow(lo.key, fmt(lo.val)) : hi && v > hi.val + 1e-9 ? S63.crossAbove(hi.key, fmt(hi.val)) : undefined,
        })),
        onPick: (v) => edit(`typography.${field}`, () => setRungBinding(field, s.key, v)),
      });
      if (pk) rows.append(pk);
    });
    b.ctl.append(rows);
    return { el: b.el, said: `${b.said} ${steps.map((x) => x.key).join(' ')}`.toLowerCase(), key: `typography.${field}`, block: b };
  };

  /** Each text type one or more steps looser or tighter than its derived line height and letter spacing (#377,
   *  #411), only the steps that move at least one of its styles; the names it lands on under each. Brand-wide. */
  const nudges = (): Item => {
    const ty = theme.typography;
    const b = leverBlock('typography.leadingShift', { label: S63.nudgeLabel, desc: S63.nudgeTip, group: true });
    const rows = hook(h('div', 'p3-fillrows'), 'nudge-rows');
    const head = h('div', 'p3-tnudge p3-tnudge-head');
    head.append(h('span', 'p3-field-label', S63.textType), h('span', 'p3-field-label', S63.lhLabel), h('span', 'p3-field-label', S63.lsLabel));
    rows.append(head);
    for (const g of TYPE_GROUP_ORDER) {
      if (!ty.composites.some((c) => c.group === g)) continue;
      const row = hook(h('div', 'p3-tnudge'), 'nudge-row');
      row.dataset.group = g;
      row.append(tokenLabel(`type.${g}`, S63.groupName(g)));
      for (const field of ['leadingShift', 'trackingShift'] as const) {
        const cur = (getPath(brandState, `typography.${field}.${g}`) as number | undefined) ?? 0;
        const steps = nudgeSteps(g, field, ty);
        const opts = steps.map((v) => ({ v: String(v), l: S63.nudgeOpt(v) }));
        // A hand-authored shift the steps don't reach is shown as itself, never silently rewritten (#411).
        if (!steps.includes(cur)) opts.push({ v: String(cur), l: S63.nudgeOpt(cur) });
        const lab = field === 'leadingShift' ? S63.lhLabel : S63.lsLabel;
        const s = selectField(`p3-nudge-${field}-${g}`, `${S63.groupName(g)}, ${lab}`, field === 'leadingShift' ? 'nudge-lh' : 'nudge-ls', (v) => edit('typography.leadingShift', () => setShift(g, field, Number(v))));
        s.select.dataset.group = g;
        s.set(opts, String(cur));
        const f = h('div', 'p3-field');
        f.append(s.el, hook(h('span', cur ? 'p3-sub p3-tnudge-set' : 'p3-sub', S63.landsOn(resolvedRungs(g, field, cur, ty))), 'nudge-lands'));
        row.append(f);
      }
      rows.append(row);
    }
    b.ctl.append(rows);
    return { el: b.el, said: `${b.said} ${S63.lhLabel} ${S63.lsLabel}`.toLowerCase(), key: 'typography.leadingShift', block: b };
  };

  const spacing = (s: Section): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s.title, s.desc, 5);
    const out: Item[] = [spacingNames('lineHeights'), spacingNames('letterSpacings'), nudges()];
    for (const it of out) el.append(it.el);
    return { el, items: out };
  };

  // ── the sections ──────────────────────────────────────────────────────────────────────────────
  const sectionShell = (title: string, desc: string | undefined, i: number): HTMLElement => {
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-type-${i}`;
    const head = h('div', 'p3-lsec-head');
    const t = h('h3', 'p3-lsec-title', title);
    t.id = `${el.id}-t`;
    el.setAttribute('aria-labelledby', t.id);
    head.append(t);
    if (desc) head.append(h('p', 'p3-lsec-desc', desc));
    el.append(head);
    return el;
  };
  /** TY1 A (#2190): the typeface library, its own section, titled by the lever's own name, which it says once (BG1 A). */
  const librarySection = (s: Section): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s.title, s.desc, 0);
    const lib = library();
    el.append(lib.el);
    if (lib.block) promoteLever(el, lib.block);
    return { el, items: [lib] };
  };
  /** TY1 A (#2190): the family for each text type, its own section, titled by its lever's name (said once), then Apply
   *  to all, always shown: the owner (2026-10-03, #2036) keeps the families out of Show advanced, "a major brand
   *  lever". It and the remove button were behind S6.2's fold (Q64). */
  const familiesSection = (s: Section): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s.title, s.desc, 1);
    const out: Item[] = [];
    const fams = families();
    el.append(fams[0].el);
    if (fams[0].block) promoteLever(el, fams[0].block);
    out.push(...fams);
    const a = applyAll();
    el.append(a.el);
    out.push(a);
    return { el, items: out };
  };

  const render = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const focusKey = had && root.contains(had) ? had.getAttribute('data-p3') : null;
    const focusIndex = focusKey ? [...root.querySelectorAll(`[data-p3="${focusKey}"]`)].indexOf(had!) : -1;
    const typed = root.querySelector<HTMLInputElement>('#p3-face-add')?.value ?? '';
    const scrollTop = host.scrollTop;
    items = [];
    pickFocus = null;
    const derived = derivedLine();
    const parts: HTMLElement[] = [h('p', 'p3-intro', PAGE.intro), ...(derived ? [derived] : [])];
    const [libS, famS, scaleS, ...advS] = PAGE.sections;
    const lx = librarySection(libS);
    const fx = familiesSection(famS);
    const sc = scale(scaleS);
    parts.push(lx.el, fx.el, sc.el);
    items.push(...lx.items, ...fx.items, ...sc.items);
    // The advanced sections (Q69: Scale limits, Weights and styles; Q64: Line height and letter spacing) behind
    // the page's Show advanced, as Palettes draws its own (counted by their rows); a search opens them.
    const showAll = secAdvOpen || !!searchQuery.trim();
    const n = advS.reduce((a, s) => a + s.rows.length, 0);
    const builders = [limits, weights, spacing];
    parts.push(advFold('type-sections-advanced', 'type-sections', showAll, n, () => { secAdvOpen = !secAdvOpen; render(); }, () => advS.map((s, i) => {
      const x = builders[i](s);
      items.push(...x.items);
      return x.el;
    })));
    const next = hook(h('button', 'p3-btn p3-btn-page p3-next'), 'type-continue');
    next.type = 'button';
    next.append(h('span', 'p3-btn-label', TYPE_COPY.next), glyph('chevr'));
    next.onclick = () => setPage(NEXT.page);
    const nr = h('div', 'p3-nextrow');
    nr.append(next);
    parts.push(nr);
    root.replaceChildren(...parts);
    const add = root.querySelector<HTMLInputElement>('#p3-face-add');
    if (add && typed && addError) add.value = typed;
    // A derived mode is read-only, every control on the page, brand-wide ones included (Q59, Q74). The info
    // buttons only show a description, so they stay; so does Scale's Show advanced (it edits nothing).
    // Scale's Show advanced only discloses Individual sizes, so it stays live and they can be read; what it opens is held.
    if (derived) for (const n2 of root.querySelectorAll<HTMLButtonElement | HTMLSelectElement | HTMLInputElement>('.p3-lsec :is(button, select, input):not(.p3-info, [data-p3="scale-advanced"])')) n2.disabled = true;
    for (const it of items) it.block?.setRefused(!!lastError && !!lastEdited && it.key === lastEdited);
    filter();
    if (focusPick && pickFocus) { focusPick = false; (pickFocus as () => void)(); }
    else if (focusKey) {
      const same = [...root.querySelectorAll<HTMLElement>(`[data-p3="${focusKey}"]`)];
      (same[Math.max(0, focusIndex)] ?? same[0])?.focus({ preventScroll: true });
    }
    if (host.scrollTop !== scrollTop) host.scrollTop = scrollTop;
  };

  /** Search (Q3): hide what does not match, report the count. */
  const filter = (): void => {
    const q = searchQuery.trim().toLowerCase();
    const shown = items.filter((it) => it.said);
    for (const it of shown) it.el.hidden = !!q && !it.said.includes(q);
    const fam = root.querySelector<HTMLElement>('[data-p3="lever-typography-families"]');
    if (fam) fam.hidden = !!q && !fam.querySelector('[data-p3="family-row"]:not([hidden])');
    for (const s of root.querySelectorAll<HTMLElement>('.p3-lsec')) s.hidden = !!q && !s.querySelector('.p3-lever:not([hidden])');
    for (const n of root.querySelectorAll<HTMLElement>('.p3-intro, .p3-nextrow, .p3-advrow > .p3-btn')) n.hidden = !!q;
    setSearchHits(q ? shown.filter((it) => !it.el.hidden).length : null);
  };

  cleanups.push(subscribe('brand', render), subscribe('mode', () => { openPick = null; render(); }), subscribe('fonts', render));
  cleanups.push(subscribe('search', () => { if ((secAdvOpen || !!searchQuery.trim()) !== drawnAll()) render(); else filter(); }));
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  /** Whether the advanced sections are drawn now (a search draws them). */
  const drawnAll = (): boolean => !!root.querySelector('#p3-advb-type-sections:not([hidden])');
  render();
};
