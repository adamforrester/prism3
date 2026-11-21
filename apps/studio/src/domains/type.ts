/**
 * Type, the levers panel (UI redesign S6.2 Font families; S6.3 the rest; concept v6's Type page).
 *
 * WHAT IT DRAWS (#3079, owner decision 2026-11-18 A: the Type view laid out around the text types): the intro, with the
 * page's one **Show advanced settings** switch beside it (Q3079.2 A: advanced rows appear in place under an "Advanced"
 * mark; nothing else folds, and a search draws them too). Then the S6.2 font families, as two sections since TY1 A
 * (#2190): **Typeface library** and **Font family for each text type** (with Apply to all), both always shown. Then
 * **Scale**: the three scale chips and their warnings (TS1 A, #2216), and, advanced, headings scale between mobile and
 * desktop. Then **Text types**, one card per text type (Q3079.1 A): the family it uses, read-only; its **Line height**
 * and **Letter spacing** menus, real values with their token names (Q808 A), Default, and Current for a stored nudge
 * that lands on several values (Q3079.5 A); its size rows, shown (Q3079.3 A): a Desktop and a Mobile picker for each
 * display, title and eyebrow size (Q63 option A), caption md and lg picked (#3077), body and label read-only, code none;
 * the extra small sizes as switches on their own rows (Q809 A, Q3079.8 A: title 2xs, caption sm, caption xs), shown
 * while on and, while off, with advanced (Q3079.10 A); and, advanced, the display ceiling (Display only, Q3079.9 A), the
 * weights it ships, its italic styles and its font style pins (Q3079.6 A). Last, advanced only, **Every text type**: the
 * weight behind each name, Underlined link styles with the underline beneath it (Q3079.7 A), and each line height and
 * letter spacing name's step and mode swap. Then the way on to Shape.
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
 * every control on the page (Q59, Q74), held by the frame: the whole levers panel is inert and disabled under one line (N-3 A, #1984).
 *
 * BEHAVIOR-NEUTRAL (the S2 rule). Every write goes through `state/type-input.ts`, which writes what the legacy page
 * wrote, byte for byte on the persisted brand, its traps included (`responsive.fluid` is always written), except
 * #2006: an emptied `italics`, or a `links` list back at the engine's default, is unset. Two writers are new, for limits no surface edited before: the caption
 * and size floors, each UNSET at its default.
 *
 * THE TWO MENUS ARE THE ONLY NEW WRITERS (#3079). A value writes the text type's pin (`typography.leading`, #3079's
 * Q3079.4 A, or `typography.tracking`, #3077) and removes its nudge; Default removes both; Current writes nothing.
 * Opening the view writes nothing, so a brand stays byte-identical until edited. Every other control writes the field
 * it wrote before the move.
 *
 * HOW IT REPAINTS: by store subscription only (plan §5): `brand`, `mode`, and `fonts` (the host's font list, lent
 * as `lend.fonts`). A control writes, notes the edit for the preview's reveal (`noteSectionEdit`, QA-B9), and
 * calls `rebuild()`; the panel is redrawn whole, keeping focus on the element that had it. So every value derived
 * from the theme (a text type's style count, a nudge's landing name, a chip's clash) is read fresh after every
 * edit: the legacy page's `apply()` left them stale (#831). It never names a legacy repaint tier and never
 * imports `main.ts` (`test-shell-imports.ts`).
 */
import {
  brandState, currentMode, getModeLever, getPath, lastError, rp, searchQuery, setPage, setSearchHits, subscribe, theme,
} from '../state/store';
import { isDerived } from '../state/verdict';
import {
  TYPE_GROUP_ORDER, addLibraryFace, inLibrary, removeLibraryFace, setAllFamilies, setFamily,
  setTypeScale, shapeBlocked, releasePinnedSizes, pinnedSizeCount, rowsOf, widestRowsOf, brandSizePin, modeSizePin, viewportPin,
  setSizePin, setMobileSize, setFluid, setResponsiveViewport, viewportRefusal, setDisplayCeiling, ceilingPx, ceilingBlocked, titleFloorBlocked, fluidBlocked, setTitleFloor, setCaptionFloor, setSizeFloor,
  setWeightRole, toggleCategoryWeight, categoryWeightLock, setLink, linkLock, setItalicStyle, italicStyleOf, setFacePin,
  setCustomUnderline, setUnderlinePct,
  setRungBinding, setRepoint, type ItalicStyle, type RungField,
  CAPTION_SIZE_RUNGS, captionSizePin, captionFloorBlocked, setCaptionSize,
  spacingMenu, spacingRungs, setSpacing, type SpacingKind, type SpacingRun,
} from '../state/type-input';
import { HEADING_SIZE_FLOOR, PER_MODE_SIZE_GROUPS, LINE_HEIGHT_LADDER, LETTER_SPACING_LADDER, CAPTION_SIZE_FLOOR, UNDERLINE_BOUNDS, type FacePin, type PerModeSizeGroup } from '@prism3/engine';
import { faceStatus, missingCutsNote, WEIGHT_NAME, type HostFonts } from '../ui/fonts';
import { valuePicker, type ValuePickerOpts } from '../ui/value-picker';
import { emToPercentLabel } from '../em-percent';
import { DOMAINS, type PageData, type Section } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { glyph, h, hook } from '../shell/dom';
import { chipChoice, choice, leverBlock, leverOf, promoteLever, refuseOption, selectField, stateLine, subLine, switchButton, textField, tokenLabel, type LeverBlock, keepFocus, pageEdit, wordsOf } from '../ui/lever-kit';
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
  /** Compact refused for the 16px title floor, on the chip and under the chips (owner decision Q55 B, APPROVED, #2194). */
  scaleTitleFloor: "Compact can't be used while the title floor is 16px. Raise the title floor to use it.",
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
  /** The 16px chip's reason under Compact: the approved info text's second sentence (owner, B8b). */
  titleFloorCompact: 'The Compact scale already places a title at 16px, so the engine refuses 16px with it.',
  /** The 18px chip's reason while title 2xs is set individually (#2054). DRAFT, pending the owner's approval. */
  titleFloorPinned: 'Leaves out title 2xs, which you set individually.',
  captionFloorLabel: 'Smallest caption size',
  sizeFloorLabel: 'Smallest type size',
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
  // #2942 — DRAFT placeholders (owner Q2 A): the owner replaces this wording before merge. `underlineTip` is the
  // lever's own description, word for word (`test-lever-tips.ts` holds it to the manifest).
  underlineLabel: 'Underline thickness and offset',
  underlineTip: 'The underline on every link style, as a share of the font size: 5% thickness is 0.8px on 16px text, and a 25% offset puts the line 4px below the text. Auto leaves it to the font.',
  underlineSwitch: 'Custom underline',
  underlineThickness: 'Underline thickness, %',
  underlineOffset: 'Underline offset, %',
  underlineThicknessHint: 'Share of the font size: 5% is 0.8px on 16px text. Auto leaves it to the font.',
  underlineOffsetHint: 'Space between the text and the line, as a share of the font size: 25% is 4px on 16px text. Auto leaves it to the font.',
  underlineRange: (lo: number, hi: number): string => `A whole number from ${lo} to ${hi}. A value outside it is set to the nearest end.`,
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
} as const;
/** #3077 (owner decisions 2026-10-27: caption A): the caption sizes. Every string here is a DRAFT, pending the owner's
 *  approval. (Its letter spacing pin's own control went with #3079: each card's Letter spacing menu writes the pin.) */
export const TYPE_PIN_COPY = {
  captionLabel: 'Caption sizes',
  captionTip: 'Set caption md or lg directly. A caption keeps one size on every screen and in every mode.',
  captionName: (v: string): string => `Caption ${v}`,
  captionHint: 'Caption sizes stay in order, on the size ladder, at 10px or more.',
} as const;
/** #3079 (owner decision 2026-11-18 A): the Type view laid out around the text types. Every string here is a DRAFT,
 *  pending the owner's approval (the wireframe's copy table); approved strings that moved are reused from `S63`. */
export const TYPE_VIEW_COPY = {
  advSwitch: 'Show advanced settings',
  /** The mark over the advanced rows a card or section holds. */
  advMark: 'Advanced',
  familyLine: (face: string): string => `${face} · set in Font family for each text type`,
  sizeHead: 'Size',
  fixedHead: 'Size · fixed',
  captionHead: 'Size · one size on every screen',
  allScreens: 'All screens',
  menuHint: (g: string): string => `One value for every ${g} size, on desktop and mobile.`,
  defaultEntry: (values: string): string => `Default · ${values}`,
  followsSize: (g: string): string => `Follows the size: larger ${g} sizes start tighter.`,
  currentEntry: (values: string): string => `Current · ${values}`,
  currentNote: 'Set as steps from the default; pick a value to replace it.',
  menuAria: (g: string, what: string, value: string): string => `${g}, ${what}: ${value}. Pick a value`,
  shipsLabel: 'Weights it ships',
  fontStyleFor: (weight: string): string => `Font style for ${weight}`,
  addExtra: (g: string, v: string, px: number): string => `Add ${g} ${v}, ${px}px`,
  captionSmRefused: 'Caption md is already 10px. Sizes stay in order.',
  xsNote: 'Also adds 8px to the font size ladder.',
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
  /** The page's one Show advanced settings switch (#3079, Q3079.2 A). */
  let advOn = false;
  /** The value picker that is open, by its control's key, or null; one at a time, under its row (v6). */
  let openPick: string | null = null;
  /** Set when a picker was just opened, so the repaint puts focus on its current value. */
  let focusPick = false;
  let pickFocus: (() => void) | null = null;
  /** The key the last edit wrote, so an engine refusal marks the lever that caused it. */
  let lastEdited: string | null = null;
  /** Set by Release pinned sizes, which goes once it has worked: the repaint then puts focus on the scale (#2233). */
  let afterRelease = false;
  /** The Add face field's text and refusal, kept across a repaint. */
  let addError: string | null = null;
  let items: Item[] = [];

  const edit = pageEdit((k) => { lastEdited = k; });   // the shared edit (#2487 B5)
  const fonts = (): HostFonts => lend.fonts();

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
  /** #3079 (Q3079.2 A): the advanced rows a card or section holds, drawn in place under one mark, while the page's Show
   *  advanced settings is on or a search runs. Nothing else folds. */
  const advShown = (): boolean => advOn || !!searchQuery.trim();
  const advZone = (hk: string, kids: HTMLElement[]): HTMLElement => {
    const z = hook(h('div', 'p3-tadv'), hk);
    z.append(h('p', 'p3-tadv-mark', TYPE_VIEW_COPY.advMark), ...kids);
    return z;
  };

  // ── Scale ──────────────────────────────────────────────────────────────────────────────────────
  /** The heading scale: three chips, a chip the engine would refuse disabled with the reason, and Release pinned
   *  sizes while a size you set colliding at that scale (#353) is the reason (#2194). Brand-wide: any editable mode. */
  const typeScale = (): Item[] => {
    const L = leverOf('typography.typeScale');
    const b = leverBlock('typography.typeScale', { label: S63.scaleLabel, desc: S63.scaleTip, group: true });
    const cur = String(getPath(brandState, 'typography.typeScale') ?? 'default');
    const opts = (L?.options ?? []).map((o) => ({ v: String(o.value), l: String(o.label) }));
    const c = choice(S63.scaleLabel, 'type-scale', opts, (v) => edit('typography.typeScale', () => setTypeScale(v)));
    c.set(cur);
    // #2194 (owner, N3 A): the clash message and Release only when a pinned size is the cause; any other refusal
    // shows its own reason, the title floor's in its approved words (Q55 B) and the rest in the engine's own (Q56 A).
    let blocked = 0;
    const other = new Set<string>();
    // #2233: each reason is also a line under the chips, and that line describes the group (a disabled chip takes no
    // focus). The ids name the lines drawn below: the clash line, and each other reason's line in drawing order.
    for (const o of opts) {
      const r = shapeBlocked(o.v, cur);
      if (!r) continue;
      const why = r.kind === 'pinned' ? S63.scaleClash : r.kind === 'titleFloor' ? S63.scaleTitleFloor : r.reason;
      if (r.kind === 'pinned') blocked++; else other.add(why);
      refuseOption(c.el, o.v, why, r.kind === 'pinned' ? 'p3-tscale-clash' : `p3-tscale-why-${[...other].indexOf(why)}`);
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
    // #2194: a refusal that is not a pinned-size clash is a warning, so a group of its own (TS1 A), first among the
    // warnings: it is about a chip, as the clash is, and it stood before the clash before TS1 A.
    for (const [i, why] of [...other].entries()) {
      const box = hook(h('div', 'p3-tscale-group'), 'type-scale-refused');
      const line = stateLine(why, 'warn');
      line.id = `p3-tscale-why-${i}`;
      box.append(line);
      b.ctl.append(box);
    }
    if (blocked) {
      const rel = hook(h('button', 'p3-btn p3-btn-page'), 'type-scale-release');
      rel.type = 'button';
      rel.append(h('span', 'p3-btn-label', S63.release));
      rel.onclick = () => { afterRelease = true; edit('typography.typeScale', () => releasePinnedSizes()); };
      const box = hook(h('div', 'p3-tscale-group p3-tscale-clash'), 'type-scale-clash');
      const line = stateLine(S63.scaleClash, 'warn');
      line.id = 'p3-tscale-clash';
      box.append(line, rel);
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


  /** Headings scale between mobile and desktop (Scale, advanced since #3079). Every control here is brand-wide. */
  const fluidBlock = (): Item => {
    const ty = theme.typography;
    // Headings scale between mobile and desktop (owner decision Q70's words): `responsive.fluid`, ALWAYS written
    // (the legacy bytes), and the viewport pair the clamp() runs between. Turning it off while a mobile size is
    // set individually is the engine's refusal, so the switch is disabled there with that reason (#2055), as the
    // 16px title chip is under Compact. A brand that arrives off with a mobile size set is already refused, and
    // its switch stays live: turning it on is the way out (B8b's rule).
    {
      const b = leverBlock('typography.responsive', { label: S63.fluidLabel, desc: S63.fluidTip, group: true });
      const sw = switchButton('p3-type-fluid', S63.fluidLabel, 'type-fluid', (on) => edit('typography.responsive', () => setFluid(on)));
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
            // A value that is not a width (empty, not a number, below 0) is put back, as Layout's breakpoints do:
            // `Number('')` is 0, so a cleared field would otherwise store 0px (#2487 A6).
            const n = Number(v.trim());
            if (!v.trim() || !Number.isFinite(n) || n < 0) { fld.value = was; return; }
            const refused = viewportRefusal(key, n);
            if (refused) { fld.value = was; b.setState(hook(stateLine(refused, 'warn'), 'type-viewport-refused')); return; }
            edit('typography.responsive', () => { setResponsiveViewport(key, n); });
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
      return ({ el: b.el, said: `${b.said} ${S63.minVp} ${S63.maxVp}`.toLowerCase(), key: 'typography.responsive', block: b });
    }
  };
  /** The display ceiling (the Display card, advanced since #3079): the largest display size the brand makes, each
   *  option priced by one trial build. A ceiling below a display size set individually (desktop, mobile or any mode's)
   *  is the engine's refusal, so it is disabled with that reason (owner, 2026-10-04, #2044), as a clashing scale chip
   *  is. A brand that arrives with such a ceiling keeps its current option live, so it can move out (B8b's rule). */
  const ceilingBlock = (): Item => {
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
      return ({ el: b.el, said: b.said, key: 'typography.displayCeiling', block: b });
    }
  };

  // ── a text type's size rows (#3079, Q3079.3 A: shown, inside each card) ──────────────────────────────────────
  /** The rows' table head: the first cell's words, then each column's. */
  const sizesHead = (first: string, cols: readonly string[]): HTMLElement => {
    const head = h('div', 'p3-tsizes-head');
    const hc = h('div', 'p3-tsizes-cells');
    hc.append(...cols.map((c) => h('span', 'p3-field-label', c)));
    head.append(h('span', 'p3-field-label', first), hc);
    return head;
  };
  /** An extra small size's switch (Q809 A, Q3079.8 A): `Add caption sm, 10px`, on its own row in the sizes table. It
   *  writes the field the old "Smallest … size" lever wrote. `refused` disables it, with the reason drawn under it. */
  const extraSwitch = (g: string, v: string, px: number, on: boolean, refused: string | null, write: (on: boolean) => void): { sw: HTMLElement; why: HTMLElement | null } => {
    const id = `p3-extra-${g}-${v}`;
    const s = switchButton(id, TYPE_VIEW_COPY.addExtra(g, v, px), 'type-extra-switch', (x) => edit(g === 'title' ? 'typography.titleFloor' : v === 'sm' ? 'typography.captionFloor' : 'typography.sizeFloor', () => write(x)));
    s.set(on);
    s.el.dataset.group = g;
    s.el.dataset.variant = v;
    let why: HTMLElement | null = null;
    if (refused) {
      s.el.disabled = true;
      s.el.title = refused;
      why = hook(stateLine(refused), 'type-extra-refused');
      why.id = `${id}-why`;
      s.el.setAttribute('aria-describedby', why.id);
    }
    return { sw: s.el, why };
  };
  /** An extra small size's row while it is off: its switch's words and token, then the switch. Drawn with advanced. */
  const extraOffRow = (g: string, v: string, px: number, refused: string | null, write: (on: boolean) => void, note?: string): HTMLElement => {
    const row = hook(h('div', 'p3-tsizes-row p3-textra'), 'type-extra-row');
    row.dataset.group = g;
    row.dataset.variant = v;
    row.dataset.off = 'true';
    const x = extraSwitch(g, v, px, false, refused, write);
    const cells = h('div', 'p3-tsizes-cells');
    cells.append(x.sw);
    row.append(tokenLabel(`type.${g}.${v}`, TYPE_VIEW_COPY.addExtra(g, v, px), x.sw.id), cells);
    if (x.why) row.append(x.why);
    else if (note) row.append(hook(subLine(note), 'type-extra-note'));
    return row;
  };
  /** Display, title and eyebrow (Q63 option A): each heading size, a Desktop and a Mobile control side by side. Desktop
   *  is per mode: Light writes the brand's size (`typography.sizes`), another mode its own (`typeSizes`), shown as
   *  "Auto: follows Light (‹px›)" until set. Mobile is the heading's phone size (`sizeOverrides.<g>.<v>.mobile`,
   *  #1587), brand-wide, so it writes the same bytes from any editable mode (the Q54 rule); it shows while
   *  headings scale between mobile and desktop. Title 2xs carries the title floor's switch (Q3079.8 A). */
  const headingRows = (g: PerModeSizeGroup): HTMLElement | null => {
    const ty = theme.typography;
    const { mode, light } = modeNow();
    const widest = widestRowsOf();
    const fluid = ty.fluid;
    const ladder = ty.sizesPx;
    const live = rowsOf(theme, g);
    const all = widest?.get(g) ?? live;
    if (!all.length) return null;
    const inRange = new Set(live.map((r) => r.variant));
    const comp = (v: string) => ty.composites.find((x) => x.group === g && x.variant === v)!;
    const desk = live.map((r) => (light ? undefined : comp(r.variant).sizeByMode?.[mode]) ?? comp(r.variant).sizePx);
    const base = live.map((r) => comp(r.variant).sizePx);
    const mob = live.map((r) => comp(r.variant).sizeMinPx);
    const floor = HEADING_SIZE_FLOOR[g];
    const grp = hook(h('div', 'p3-tsizes'), 'type-sizes-group');
    grp.dataset.group = g;
    grp.append(sizesHead(TYPE_VIEW_COPY.sizeHead, fluid ? [S63.desktop, S63.mobile] : [S63.desktop]));
    // The title floor (Q809 A, Q3079.8 A): 16px adds title 2xs. Under Compact the switch is refused (Compact already
    // places a title at 16px); while title 2xs is set individually, turning it off is refused (#2054). A brand that
    // arrives in either refused state keeps its switch live, so it can move out (B8b's rule).
    const floor16 = (getPath(brandState, 'typography.titleFloor') ?? 18) === 16;
    for (const r of all) {
      if (g === 'title' && r.variant === '2xs' && !inRange.has('2xs')) {
        if (!advShown()) continue;
        const refused = getPath(brandState, 'typography.typeScale') === 'compact' ? S63.titleFloorCompact : null;
        grp.append(extraOffRow('title', '2xs', 16, refused, (on) => setTitleFloor(on)));
        continue;
      }
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
      // Title 2xs, drawn: its switch, showing the stored floor, to take it out again. A brand that arrives refused (title
      // 2xs set, the floor unset; the panel draws the last valid theme) shows it off, and turning it on is the way out.
      if (g === 'title' && r.variant === '2xs') {
        const x = extraSwitch('title', '2xs', 16, floor16, floor16 && titleFloorBlocked() ? S63.titleFloorPinned : null, (on) => setTitleFloor(on));
        cells.append(x.sw);
        if (x.why) row.append(x.why);
      }
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
    // Under Compact the widest trial build has no title 2xs (the engine refuses the 16px floor there), so its off row,
    // refused, is drawn last, where 2xs sits.
    if (g === 'title' && !all.some((r) => r.variant === '2xs') && advShown()) {
      const refused = getPath(brandState, 'typography.typeScale') === 'compact' ? S63.titleFloorCompact : null;
      grp.append(extraOffRow('title', '2xs', 16, refused, (on) => setTitleFloor(on)));
    }
    return grp;
  };
  /** Body and label (and any fixed text type): its sizes, read-only, one size on every screen. */
  const fixedRows = (g: string): HTMLElement | null => {
    const caps = sizesOf(g);
    if (!caps.length) return null;
    const grp = hook(h('div', 'p3-tsizes'), 'type-sizes-group');
    grp.dataset.group = g;
    grp.append(sizesHead(TYPE_VIEW_COPY.fixedHead, [TYPE_VIEW_COPY.allScreens]));
    for (const c of caps) {
      const row = hook(h('div', 'p3-tsizes-row'), 'type-fixed-row');
      row.dataset.group = g;
      row.dataset.variant = c.v;
      const cells = h('div', 'p3-tsizes-cells');
      cells.append(h('span', 'p3-tsizes-px', `${c.px}px`));
      row.append(tokenLabel(`type.${g}.${c.v}`, `${S63.groupName(g)} ${c.v}`), cells);
      grp.append(row);
    }
    return grp;
  };
  /** A text type's sizes, largest first, one entry per size. */
  const sizesOf = (g: string): { v: string; px: number }[] => theme.typography.composites.filter((c) => c.group === g)
    .reduce((acc: { v: string; px: number }[], c) => (acc.some((a) => a.v === c.variant) ? acc : [...acc, { v: c.variant, px: c.sizePx }]), [])
    .sort((a, z) => z.px - a.px);
  /** Caption (#3077's caption A; Q809 A): lg and md, each one size on every screen and in every mode, picked from the
   *  ladder, a size the engine refuses shown disabled; then sm and xs, each its floor's switch. An extra size that is
   *  on always shows; one that is off shows with advanced (Q3079.10 A). The sm switch is refused while caption md is
   *  10px, the engine's own ramp rule, so two 10px captions can't be reached. */
  const captionRows = (): { el: HTMLElement; block: LeverBlock } => {
    const ty = theme.typography;
    const b = leverBlock('typography.sizes.caption', { label: TYPE_PIN_COPY.captionLabel, desc: TYPE_PIN_COPY.captionTip, group: true });
    const caps = sizesOf('caption');
    const grp = hook(h('div', 'p3-tsizes'), 'caption-size-rows');
    grp.dataset.group = 'caption';
    grp.append(sizesHead(TYPE_VIEW_COPY.captionHead, [TYPE_VIEW_COPY.allScreens]));
    const asc = [...caps].reverse();
    for (const v of [...CAPTION_SIZE_RUNGS].reverse()) {
      const i = asc.findIndex((c) => c.v === v);
      if (i < 0) continue;
      const cur = asc[i].px, pin = captionSizePin(v);
      const key = `size:caption.${v}`, id = `p3-size-caption-${v}`;
      const row = hook(h('div', 'p3-tsizes-row'), 'caption-size-row');
      row.dataset.variant = v;
      const btn = pickButton(key, id, 'caption-size', TYPE_PIN_COPY.captionName(v), `${cur}px`, pin !== undefined);
      btn.dataset.variant = v;
      const cells = h('div', 'p3-tsizes-cells');
      cells.append(btn);
      row.append(tokenLabel(`type.caption.${v}`, TYPE_PIN_COPY.captionName(v), id), cells);
      grp.append(row);
      const lower = i > 0 ? asc[i - 1] : null, upper = i + 1 < asc.length ? asc[i + 1] : null;
      const pk = pickerFor(key, id, {
        name: TYPE_PIN_COPY.captionName(v),
        hint: TYPE_PIN_COPY.captionHint,
        current: cur,
        values: ty.sizesPx.filter((px) => px <= 18).map((px) => ({
          v: px, label: `${px}px`,
          sample: (e: HTMLElement) => { e.textContent = 'Ag'; e.style.fontFamily = stackOf('caption'); e.style.fontSize = `${px}px`; },
          refuse: px < CAPTION_SIZE_FLOOR ? S63.belowFloor('Caption', CAPTION_SIZE_FLOOR)
            : lower && px <= lower.px ? S63.notAbove(`caption.${lower.v}`, lower.px)
              : upper && px >= upper.px ? S63.notBelow(`caption.${upper.v}`, upper.px) : undefined,
        })),
        reset: { label: S63.toDefault, enabled: pin !== undefined },
        onPick: (px) => edit('typography.sizes.caption', () => setCaptionSize(v, px)),
        onReset: () => edit('typography.sizes.caption', () => setCaptionSize(v, undefined)),
      });
      if (pk) grp.append(pk);
    }
    // The extra small captions, smaller after larger.
    const smOn = (getPath(brandState, 'typography.captionFloor') ?? 11) === 10;
    const xsOn = (getPath(brandState, 'typography.sizeFloor') ?? 10) === 8;
    const extras: { v: 'sm' | 'xs'; px: number; on: boolean; refused: string | null; write: (on: boolean) => void; note?: string; warn?: string }[] = [
      { v: 'sm', px: 10, on: smOn, refused: !smOn && captionFloorBlocked() ? TYPE_VIEW_COPY.captionSmRefused : null, write: (on) => setCaptionFloor(on ? 10 : 11) },
      { v: 'xs', px: 8, on: xsOn, refused: null, write: (on) => setSizeFloor(on ? 8 : 10), note: TYPE_VIEW_COPY.xsNote, warn: S63.eightWarn },
    ];
    for (const x of extras) {
      if (!x.on) { if (advShown()) grp.append(extraOffRow('caption', x.v, x.px, x.refused, x.write, x.note)); continue; }
      const row = hook(h('div', 'p3-tsizes-row p3-textra'), 'type-extra-row');
      row.dataset.group = 'caption';
      row.dataset.variant = x.v;
      const sw = extraSwitch('caption', x.v, x.px, true, null, x.write);
      const cells = h('div', 'p3-tsizes-cells');
      cells.append(h('span', 'p3-tsizes-px', `${caps.find((c) => c.v === x.v)?.px ?? x.px}px`), sw.sw);
      row.append(tokenLabel(`type.caption.${x.v}`, TYPE_PIN_COPY.captionName(x.v)), cells);
      if (x.warn) row.append(hook(stateLine(x.warn, 'warn'), 'size-floor-warn'));
      grp.append(row);
    }
    b.ctl.append(grp);
    return { el: b.el, block: b };
  };

  // ── a text type's line height and letter spacing menus (#3079, Q808 A) ───────────────────────────────────────
  /** One menu: real values, each with its token name; Default (what the brand gets with nothing stored); and, while a
   *  stored nudge lands on more than one value, Current (Q3079.5 A), kept until another value is picked. One value for
   *  desktop and mobile. A pick writes the pin and removes the nudge; Default removes both (`setSpacing`). */
  const spacingMenuField = (g: string, kind: SpacingKind): HTMLElement => {
    const ty = theme.typography;
    const m = spacingMenu(g, kind, ty);
    const lh = kind === 'lh';
    const val = (rung: string): string => {
      if (lh) { const v = ty.lineHeights.find((l) => l.key === rung)?.value; return v === undefined ? rung : v.toFixed(2); }
      const em = ty.letterSpacings.find((l) => l.key === rung)?.em;
      // The wireframe's form: a looser letter spacing is signed, "+1%".
      return em === undefined ? rung : `${em > 0 ? '+' : ''}${emToPercentLabel(em)}`;
    };
    const num = (rung: string): number => (lh ? ty.lineHeights.find((l) => l.key === rung)?.value ?? 1.5 : ty.letterSpacings.find((l) => l.key === rung)?.em ?? 0);
    const vals = (runs: readonly SpacingRun[]): string => runs.map((r) => val(r.rung)).join(' / ');
    const ranges = (runs: readonly SpacingRun[]): string => runs.map((r) => (r.variants.length > 1 ? `${r.variants[0]}–${r.variants[r.variants.length - 1]}` : r.variants[0])).join(' / ');
    const what = lh ? S63.lhLabel : S63.lsLabel;
    const tokenOf = (rung: string): string => `${lh ? 'line-height' : 'letter-spacing'}-role.${rung}`;
    const rungs = spacingRungs(kind);
    const key = `${kind}:${g}`, id = `p3-${kind}-${g}`;
    const one = m.now.length === 1 || new Set(m.now.map((r) => r.rung)).size === 1;
    const nowLabel = one ? val(m.now[0].rung) : vals(m.now);
    const btn = hook(h('button', 'p3-btn p3-btn-page p3-pick'), lh ? 'type-lh' : 'type-ls');
    btn.type = 'button';
    btn.id = id;
    btn.dataset.key = key;
    btn.dataset.group = g;
    if (m.selected !== 'default') btn.dataset.set = 'true';
    btn.setAttribute('aria-expanded', String(openPick === key));
    btn.setAttribute('aria-label', TYPE_VIEW_COPY.menuAria(S63.groupName(g), what.toLowerCase(), one ? `${nowLabel} ${m.now[0].rung}` : nowLabel));
    btn.append(h('span', 'p3-btn-label', nowLabel), ...(one ? [h('span', 'p3-pick-tok', m.now[0].rung)] : []), glyph('chev'));
    btn.onclick = () => { const opening = openPick !== key; openPick = opening ? key : null; focusPick = opening; render(); };
    const f = hook(h('div', 'p3-field'), lh ? 'type-lh-field' : 'type-ls-field');
    f.dataset.group = g;
    const lab = h('label', 'p3-field-label', what);
    lab.htmlFor = id;
    f.append(lab, btn);
    const sample = (v: number) => (e: HTMLElement): void => {
      e.textContent = lh ? S63.lhSample : S63.lsSample;
      e.style.fontFamily = stackOf(g);
      if (lh) { e.style.lineHeight = String(v); e.dataset.wrap = 'true'; } else { e.style.letterSpacing = `${v}em`; e.style.fontSize = '16px'; }
    };
    const derivedSplit = new Set(m.derived.map((r) => r.rung)).size > 1;
    const CURRENT = -2, DEFAULT = -1;
    const values = [
      ...(m.selected === 'current' ? [{ v: CURRENT, label: TYPE_VIEW_COPY.currentEntry(vals(m.now)), note: `${ranges(m.now)}. ${TYPE_VIEW_COPY.currentNote}`, sample: sample(num(m.now[0].rung)) }] : []),
      { v: DEFAULT, label: TYPE_VIEW_COPY.defaultEntry(derivedSplit ? vals(m.derived) : val(m.derived[0].rung)), note: derivedSplit ? TYPE_VIEW_COPY.followsSize(g) : tokenOf(m.derived[0].rung), sample: sample(num(m.derived[0].rung)) },
      ...rungs.map((r, i) => ({ v: i, label: val(r), note: tokenOf(r), sample: sample(num(r)) })),
    ];
    const current = m.selected === 'current' ? CURRENT : m.selected === 'default' ? DEFAULT : rungs.indexOf(m.selected);
    const pk = pickerFor(key, id, {
      name: `${S63.groupName(g)}, ${what.toLowerCase()}`,
      hint: TYPE_VIEW_COPY.menuHint(g),
      current,
      values,
      onPick: (v) => { if (v === CURRENT) return; edit(`type.${g}`, () => setSpacing(g, kind, v === DEFAULT ? null : rungs[v] ?? null)); },
    });
    const wrap = h('div', 'p3-tmenu');
    wrap.append(f);
    if (pk) wrap.append(pk);
    return wrap;
  };

  // ── a text type's advanced rows (Q3079.6 A: weights it ships, italic, font style pins) ────────────────────────
  /** Which weights the text type ships: a check per weight, the engine's locks (a text type keeps one weight; label keeps
   *  emphasis, body and caption keep default) disabled with the reason. The style count is read from the rebuilt theme
   *  on every repaint (#831). Brand-wide. */
  const shipsRow = (g: string): HTMLElement => {
    const ty = theme.typography;
    const roleOrder = ty.weightRoles.map((w) => w.role);
    const comps = ty.composites.filter((c) => c.group === g);
    const has = new Set(comps.map((c) => c.weightRole));
    const row = hook(h('div', 'p3-field'), 'weights-row');
    row.dataset.group = g;
    const head = h('div', 'p3-tships-head');
    head.append(h('span', 'p3-field-label', TYPE_VIEW_COPY.shipsLabel), hook(h('span', 'p3-sub', S63.styles(comps.length)), 'weights-count'));
    const cells = h('div', 'p3-tships');
    for (const r of roleOrder) {
      const lock = categoryWeightLock(g, r, has);
      const c = hook(h('button', 'p3-btn p3-mcheck p3-tship'), 'weight-cell');
      c.type = 'button';
      c.dataset.role = r;
      c.setAttribute('role', 'checkbox');
      c.setAttribute('aria-checked', String(has.has(r)));
      c.setAttribute('aria-label', `${S63.groupName(g)}, ${S63.weightName(r)}`);
      c.append(glyph('check'), h('span', 'p3-btn-label', S63.weightName(r)));
      if (lock) { c.setAttribute('aria-disabled', 'true'); c.title = lock; c.setAttribute('aria-description', lock); }
      c.onclick = () => { if (c.getAttribute('aria-disabled') !== 'true') edit(`type.${g}`, () => toggleCategoryWeight(g, r, roleOrder, has)); };
      cells.append(c);
    }
    row.append(head, cells);
    return row;
  };
  /** Italic styles, three single-select chips (owner decision Q6; chips, not a segmented control, #2192): Upright,
   *  Upright + italic, Italic only. A text type that pins a font style cannot be Italic only (the engine refuses it):
   *  that chip is disabled with the reason. Brand-wide. */
  const italicRow = (g: string): HTMLElement => {
    const ty = theme.typography;
    const italicG = new Set(ty.composites.filter((c) => c.italic).map((c) => c.group));
    const italicDefG = new Set(ty.composites.filter((c) => c.italicDefault).map((c) => c.group));
    const row = hook(h('div', 'p3-titalic'), 'italic-row');
    row.dataset.group = g;
    const c = chipChoice(`${S63.groupName(g)}: ${S63.italicsLabel}`, 'italic-choice', ITALIC_CHIPS, (v) => edit(`type.${g}`, () => setItalicStyle(g, v, italicG, italicDefG)));
    c.el.dataset.group = g;
    const now = italicStyleOf(g, italicG, italicDefG);
    c.set(now);
    const pinned = Object.keys((getPath(brandState, `typography.faces.${g}`) as Record<string, unknown> | undefined) ?? {}).length > 0;
    // #2217: the row names its token on the label's line.
    row.append(tokenLabel(`type.${g}`, S63.italicsLabel, undefined, { onLine: true }), c.el);
    // RS1 A (#2451): the reason is also a hint line under the chips, describing the group.
    if (pinned && now !== 'only') {
      const id = `p3-italic-why-${g}`;
      refuseOption(c.el, 'only', S63.italicPinned, id);
      const line = hook(stateLine(S63.italicPinned), 'italic-refused');
      line.id = id;
      row.append(line);
    }
    return row;
  };
  /** Pin a font style (#1467, Q64): a verbatim style for one weight the text type ships, a width like Condensed a weight
   *  number can't reach. The family is fixed to the one the text type uses (the engine drops a pin whose family
   *  differs), and a pin left behind by a later family change is named. Commits on Enter or blur. */
  const pinRows = (g: string): HTMLElement[] => {
    const ty = theme.typography;
    const fam = ty.families.find((f) => f.group === g)?.stack[0];
    const italicOnly = ty.composites.some((c) => c.group === g && c.italicDefault);
    if (italicOnly) return [subLine(S63.pinItalicOnly([S63.groupName(g)]))];
    if (!fam) return [];
    const out: HTMLElement[] = [];
    for (const role of ty.weightRoles.map((w) => w.role).filter((r) => ty.composites.some((c) => c.group === g && c.weightRole === r))) {
      const id = `p3-pin-${g}-${role}`;
      const row = hook(h('div', 'p3-tpin'), 'pin-cut-row');
      row.setAttribute('data-cat', g);
      row.setAttribute('data-role', role);
      const nm = tokenLabel(`type.${g}.*.${role}`, TYPE_VIEW_COPY.fontStyleFor(S63.weightName(role)), id);
      nm.append(hook(h('span', 'p3-sub', fam), 'pin-cut-face'));
      const cur = getPath(brandState, `typography.faces.${g}.${role}`) as FacePin | undefined;
      const t = textField(id, 'pin-cut-input', {
        label: S63.pinField(S63.groupName(g), role),
        onCommit: (v) => { if ((cur?.style ?? '') === v.trim() && (!cur || cur.family === fam)) return; edit(`type.${g}`, () => setFacePin(g, role, v, fam)); },
      });
      t.el.placeholder = S63.pinPlaceholder;
      t.set(cur?.style ?? '');
      row.append(nm, t.el);
      out.push(row);
      if (cur && cur.family !== fam) out.push(hook(stateLine(S63.pinStale(cur.family, fam), 'warn'), 'pin-cut-stale'));
    }
    return out;
  };

  // ── the cards (#3079, Q3079.1 A: one card per text type) ─────────────────────────────────────────────────────
  /** One text type's card: the family it uses (read-only; set in Font family for each text type), its Line height and
   *  Letter spacing menus, its size rows, and, with advanced, its own advanced rows. */
  const card = (g: string): Item[] => {
    const ty = theme.typography;
    if (!ty.composites.some((c) => c.group === g)) return [];
    const b = leverBlock(`type.${g}`, { label: S63.groupName(g), group: true });
    // The card's frame wraps the block, so the block's legend stays its heading inside the frame.
    const box = hook(h('div', 'p3-tcard'), 'type-card');
    box.dataset.group = g;
    box.append(b.el);
    const fams = ty.familiesByMode?.[currentMode] ?? ty.families;
    const fam = fams.find((f) => f.group === g)?.stack[0] ?? '';
    b.ctl.append(hook(subLine(TYPE_VIEW_COPY.familyLine(fam)), 'type-card-family'));
    const menus = h('div', 'p3-tmenus');
    menus.append(spacingMenuField(g, 'lh'), spacingMenuField(g, 'ls'));
    b.ctl.append(menus);
    const out: Item[] = [];
    const words: string[] = [S63.lhLabel, S63.lsLabel, fam];
    if ((PER_MODE_SIZE_GROUPS as readonly string[]).includes(g)) {
      const rows = headingRows(g as PerModeSizeGroup);
      if (rows) b.ctl.append(rows);
      words.push(S63.sizesLabel, S63.desktop, S63.mobile, ...rowsOf(theme, g as PerModeSizeGroup).map((r) => `type.${g}.${r.variant}`));
    } else if (g === 'caption') {
      const c = captionRows();
      b.ctl.append(c.el);
      out.push({ el: c.el, said: '', key: 'typography.sizes.caption', block: c.block });
      words.push(TYPE_PIN_COPY.captionLabel, TYPE_VIEW_COPY.addExtra('caption', 'sm', 10), TYPE_VIEW_COPY.addExtra('caption', 'xs', 8), S63.captionFloorLabel, S63.sizeFloorLabel);
    } else if (g !== 'code') {
      const rows = fixedRows(g);
      if (rows) b.ctl.append(rows);
    }
    if (g === 'title') words.push(TYPE_VIEW_COPY.addExtra('title', '2xs', 16), S63.titleFloorLabel);
    words.push(TYPE_VIEW_COPY.shipsLabel, S63.italicsLabel, ...ITALIC_CHIPS.map((x) => x.l), S63.pinLabel);
    // #3093: the card says the manifest's words for every lever it draws, so a search by any of them finds it.
    words.push(...['typography.weights', 'typography.italics', 'typography.italicDefault', ...(g === 'title' ? ['typography.titleFloor'] : []),
      ...(g === 'caption' ? ['typography.captionFloor', 'typography.sizeFloor'] : []), ...(g === 'display' ? ['typography.displayCeiling'] : [])].map(wordsOf));
    if (advShown()) {
      const kids: HTMLElement[] = [];
      if (g === 'display') {
        const c = ceilingBlock();
        kids.push(c.el);
        out.push({ ...c, said: '' });
      }
      kids.push(shipsRow(g), italicRow(g), ...pinRows(g));
      b.ctl.append(advZone('type-card-advanced', kids));
    }
    if (g === 'display') words.push(S63.ceilingLabel, S63.ceilingTip);
    return [{ el: box, said: `${b.said} ${words.join(' ')}`.toLowerCase(), key: `type.${g}`, block: b }, ...out];
  };

  // ── Every text type (#3079: brand-wide, advanced only) ───────────────────────────────────────────────────────
  /** Underlined link styles (Q3079.7 A): a check per text type, brand-wide, with #2942's underline beneath it. */
  const linksBlock = (): Item => {
    const ty = theme.typography;
    const linkG = new Set(ty.composites.filter((c) => c.link).map((c) => c.group));
    const b = leverBlock('typography.links', { group: true });
    const cells = hook(h('div', 'p3-tships'), 'links-row');
    for (const g of TYPE_GROUP_ORDER) {
      if (!ty.composites.some((c) => c.group === g)) continue;
      const lock = linkLock(g);
      const c = hook(h('button', 'p3-btn p3-mcheck p3-tship'), 'link-cell');
      c.type = 'button';
      c.dataset.group = g;
      c.setAttribute('role', 'checkbox');
      c.setAttribute('aria-checked', String(linkG.has(g)));
      c.setAttribute('aria-label', `${S63.groupName(g)}, ${S63.link}`);
      c.append(glyph('check'), h('span', 'p3-btn-label', S63.groupName(g)));
      if (lock) { c.setAttribute('aria-disabled', 'true'); c.title = lock; c.setAttribute('aria-description', lock); }
      c.onclick = () => { if (c.getAttribute('aria-disabled') !== 'true') edit('typography.links', () => setLink(g, !linkG.has(g), linkG)); };
      cells.append(c);
    }
    b.ctl.append(cells);
    return { el: b.el, said: b.said, key: 'typography.links', block: b };
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
    // #3138 (owner decision Q4 A): a family that has no cut at a weight its text types use, named with the cuts it
    // has, so the gap shows here before Apply skips those styles (#237). Exact in Figma (its style names); on the web
    // from a loaded Google face or the advisory map; silent for an unknown family.
    const fams = ty.familiesByMode?.[mode] ?? ty.families;
    const needs = new Map<string, number[]>();
    for (const c of ty.composites) {
      const fam = fams.find((f) => f.group === c.group)?.stack[0];
      const v = roles.find((w) => w.role === c.weightRole)?.value;
      if (fam && v !== undefined) needs.set(fam, [...(needs.get(fam) ?? []), v]);
    }
    for (const [fam, ws] of needs) {
      const note = missingCutsNote(fam, ws, fonts());
      if (note) b.ctl.append(hook(subLine(note), 'weight-cuts-note'));
    }
    const eff = roles.map((w) => w.value);
    if (eff.some((v, i) => i > 0 && v < eff[i - 1])) b.setState(hook(stateLine(S63.orderWarn, 'warn'), 'order-warning'));
    return [{ el: b.el, said: `${b.said} ${roles.map((w) => `${w.role} font.weight-role.${w.role}`).join(' ')}`.toLowerCase(), key: 'typography.weightRoles', block: b }];
  };

  /** #2942 — the link underline (owner Q800 A, Q801 A): a "Custom underline" switch, off for auto, and when on two
   *  whole-percent fields, thickness and offset, each corrected to its bounds by the engine (`resolveUnderline`).
   *  The fields show the resolved value, so a value past a bound reads back as the bound. Brand-wide. */
  const underline = (): Item => {
    const u = theme.typography.underline;
    const on = u.thickness !== 'auto' || u.offset !== 'auto';
    const b = leverBlock('typography.underline', { label: S63.underlineLabel, desc: S63.underlineTip, group: true });
    const sw = switchButton('p3-type-underline', S63.underlineSwitch, 'type-underline-switch', (v) => edit('typography.underline', () => setCustomUnderline(v)));
    sw.set(on);
    // The switch's own name above it (Q800 A: "Custom underline"), as a field label sits over its field; the block keeps
    // the lever's label as its heading.
    const row = hook(h('div', 'p3-field'), 'type-underline-switch-row');
    const swLab = h('label', 'p3-field-label', S63.underlineSwitch);
    swLab.htmlFor = 'p3-type-underline';
    row.append(swLab, sw.el);
    b.ctl.append(row);
    if (on) {
      const pair = hook(h('div', 'p3-fieldpair'), 'type-underline-fields');
      for (const [field, label, hint] of [['thickness', S63.underlineThickness, S63.underlineThicknessHint], ['offset', S63.underlineOffset, S63.underlineOffsetHint]] as const) {
        const f = h('div', 'p3-field');
        const id = `p3-type-underline-${field}`;
        const lab = h('label', 'p3-field-label', label);
        lab.htmlFor = id;
        const { min, max } = UNDERLINE_BOUNDS[field];
        const now = u[field];
        const t = textField(id, `type-underline-${field}`, {
          describedBy: `${id}-hint`,
          // Not a number: put back, as the viewport fields do. A number past a bound is stored corrected (Q801 A).
          onCommit: (v, fld) => {
            const n = Number(v.trim());
            if (!v.trim() || !Number.isFinite(n)) { fld.value = now === 'auto' ? '' : String(now); return; }
            edit('typography.underline', () => setUnderlinePct(field, n));
          },
        });
        t.el.inputMode = 'numeric';
        t.set(now === 'auto' ? '' : String(now));
        const sub = hook(subLine(`${hint} ${S63.underlineRange(min, max)}`), 'type-underline-hint');
        sub.id = `${id}-hint`;
        f.append(lab, t.el, sub);
        pair.append(f);
      }
      b.ctl.append(pair);
    }
    return { el: b.el, said: `${b.said} ${S63.underlineSwitch} ${S63.underlineThickness} ${S63.underlineOffset}`.toLowerCase(), key: 'typography.underline', block: b };
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

  // ── the sections ──────────────────────────────────────────────────────────────────────────────
  /** Scale (#3079): the three scale chips, then, with advanced, how headings scale between mobile and desktop. */
  const scaleSection = (s: Section): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s.title, s.desc, 2);
    const out: Item[] = [...typeScale()];
    for (const it of out) el.append(it.el);
    if (advShown()) {
      const f = fluidBlock();
      out.push(f);
      el.append(advZone('type-scale-advanced', [f.el]));
    }
    return { el, items: out };
  };
  /** Text types (#3079, Q3079.1 A): one card per text type, in the order every Type table lists them. */
  const typesSection = (s: Section): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s.title, s.desc, 3);
    const { mode, light } = modeNow();
    if (!light) el.append(subLine(`Editing ${modeLabel(mode)}, the mode the preview shows. ${S63.mobileBrandWide}`));
    const out: Item[] = [];
    for (const g of TYPE_GROUP_ORDER) {
      const c = card(g);
      if (!c.length) continue;
      el.append(c[0].el);
      out.push(...c);
    }
    return { el, items: out };
  };
  /** Every text type (#3079): the brand-wide settings, drawn only with advanced. */
  const everySection = (s: Section): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s.title, s.desc, 4);
    const out: Item[] = [...weightRows(), linksBlock(), underline(), spacingNames('lineHeights'), spacingNames('letterSpacings')];
    for (const it of out) el.append(it.el);
    return { el, items: out };
  };
  // ── the sections ──────────────────────────────────────────────────────────────────────────────
  const sectionShell = (title: string, desc: string | undefined, i: number): HTMLElement => {
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-type-${i}`;
    const head = h('div', 'p3-lsec-head');
    const t = h('h2', 'p3-lsec-title', title);
    t.id = `${el.id}-t`;
    // No name, so not a landmark: only Inspect and Activity carry landmark names (Q197, #2487).
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


  /** The page's one Show advanced settings switch (Q3079.2 A). */
  const advSwitch = (): HTMLElement => {
    // The switch's own name above it, as a field label sits over its field (as Custom underline's).
    const row = hook(h('div', 'p3-field p3-tadv-switch'), 'type-advanced-row');
    const sw = switchButton('p3-type-advanced', TYPE_VIEW_COPY.advSwitch, 'type-advanced', (on) => { advOn = on; render(); });
    sw.set(advOn);
    // It edits nothing, so it stays live in a derived mode's read-only panel (RX1 A's rule, `STAYS_LIVE` in frame.ts).
    sw.el.classList.add('p3-disclose');
    const lab = h('label', 'p3-field-label', TYPE_VIEW_COPY.advSwitch);
    lab.htmlFor = 'p3-type-advanced';
    row.append(lab, sw.el);
    return row;
  };

  const render = (): void => {
    // What had focus, found again after the redraw (`keepFocus`, #2487 B5).
    const { key: focusKey, again } = keepFocus(root);
    const typed = root.querySelector<HTMLInputElement>('#p3-face-add')?.value ?? '';
    const scrollTop = host.scrollTop;
    items = [];
    pickFocus = null;
    const intro = h('div', 'p3-tintro');
    intro.append(h('p', 'p3-intro', PAGE.intro), advSwitch());
    const parts: HTMLElement[] = [intro];
    const [libS, famS, scaleS, typesS, everyS] = PAGE.sections;
    const lx = librarySection(libS);
    const fx = familiesSection(famS);
    const sc = scaleSection(scaleS);
    const tx = typesSection(typesS);
    parts.push(lx.el, fx.el, sc.el, tx.el);
    items.push(...lx.items, ...fx.items, ...sc.items, ...tx.items);
    // Every text type is advanced only: drawn with the switch on, or while a search runs (Q3079.2 A).
    if (advShown()) {
      const ex = everySection(everyS);
      parts.push(ex.el);
      items.push(...ex.items);
    }
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
    for (const it of items) it.block?.setRefused(!!lastError && !!lastEdited && it.key === lastEdited);
    filter();
    const released = afterRelease;
    afterRelease = false;
    if (focusPick && pickFocus) { focusPick = false; (pickFocus as () => void)(); }
    else if (focusKey) {
      const to = again();
      // #2233: Release pinned sizes is gone once it has worked, so focus stays in Type scale, on its selected chip,
      // the group's one Tab stop, from which the arrows now reach the chips the release enabled.
      if (to) to.focus({ preventScroll: true });
      else if (released) root.querySelector<HTMLElement>('[data-p3="type-scale"] [aria-checked="true"]')?.focus({ preventScroll: true });
    }
    if (host.scrollTop !== scrollTop) host.scrollTop = scrollTop;
  };

  /** Search (Q3): hide what does not match, report the count. A card shows whole when any of its words match. */
  const filter = (): void => {
    const q = searchQuery.trim().toLowerCase();
    const shown = items.filter((it) => it.said);
    for (const it of shown) it.el.hidden = !!q && !it.said.includes(q);
    const fam = root.querySelector<HTMLElement>('[data-p3="lever-typography-families"]');
    // #3093: the block shows for its own words too (Font families), not only for a text type's row that matches.
    const famSaid = items.find((it) => it.key === 'typography.families')?.block?.said ?? '';
    if (fam) fam.hidden = !!q && !famSaid.includes(q) && !fam.querySelector('[data-p3="family-row"]:not([hidden])');
    // A card hides on its frame, so a section shows while any lever in it sits outside a hidden node.
    for (const s of root.querySelectorAll<HTMLElement>('.p3-lsec')) s.hidden = false;
    for (const s of root.querySelectorAll<HTMLElement>('.p3-lsec')) s.hidden = !!q && ![...s.querySelectorAll<HTMLElement>('.p3-lever')].some((n) => !n.closest('[hidden]'));
    for (const n of root.querySelectorAll<HTMLElement>('.p3-tintro')) n.hidden = !!q;
    for (const n of root.querySelectorAll<HTMLElement>('.p3-nextrow')) n.hidden = !!q;
    setSearchHits(q ? shown.filter((it) => !it.el.hidden).length : null);
  };

  cleanups.push(subscribe('brand', render), subscribe('mode', () => { openPick = null; render(); }), subscribe('fonts', render));
  // A search draws the advanced rows, so starting or ending one redraws; typing within one only filters.
  let searching = !!searchQuery.trim();
  cleanups.push(subscribe('search', () => { const now = !!searchQuery.trim(); if (now !== searching && !advOn) { searching = now; render(); } else { searching = now; filter(); } }));
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  render();
};
