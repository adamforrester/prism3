/**
 * The start window (UI redesign S12): today's four start cards, restyled, in a window over the studio (owner
 * decisions G10 A and G11 B). It opens on the first run (the web with nothing saved, the plugin in a file with no
 * brand) and from "+ New brand" in either host.
 *
 * WHAT IT DOES AND WHAT IT LEAVES TO `main.ts`. It draws the window, keeps focus inside it, and turns each card into a
 * choice: a brand and where it came from. Whether a choice needs the guard, and the load itself, are lent (`guardFor`,
 * `load`), so this file names no legacy repaint (`test-shell-imports.ts`). What each card starts a brand from, the
 * hex check and the import check are `state/start-input.ts`'s, shared with the brand menu.
 *
 * THE OWNER'S DECISIONS IT DRAWS. The order is color, examples, import (S8), and "Start blank" is the color card's
 * secondary action (N1 A, the owner's review of #2142). The color card
 * starts at the working brand's primary (G14) and its button reads "Start from this color" (S1); a hex that is not
 * #rrggbb is refused in words (S3). The import card has "↑ Upload…" on its heading row and a paste box below, whose
 * Import button is disabled until the box holds text (S2, the owner's review of #2142),
 * and its errors name the line (S7). Close shows whenever the window was reopened (S9), never on the first run, and
 * Escape does what Close does. With unsaved edits a choice asks first, in a second window on top of this one (S4):
 * Cancel returns to the start, focus starts on Cancel, and Discard wears Prism3's destructive button (S5).
 */
import { hex, oklchToRgb } from '@prism3/engine/color';
import type { BrandInput } from '@prism3/engine/theme';
import type { Origin } from '../provenance';
import { BRANDS, brandState } from '../state/store';
import {
  BLANK_BRAND, HEX_ERROR, IMPORT_ACCEPT, importErrorText, readDesignMdFile, readHex, seedFromColor, validateDesignMd, validatePaste,
  type GuardText,
} from '../state/start-input';
import { h, hook } from './dom';
import type { Host } from './pages';

/** A start choice: the brand it loads and where that brand came from. */
export type StartChoice = { readonly input: BrandInput; readonly origin: Origin };

export type StartLend = {
  readonly host: Host;
  /** The first run: no Close, and Escape does nothing. */
  readonly first: boolean;
  /** The guard's words when the choice would discard edits, or null to load at once. */
  readonly guardFor: (c: StartChoice) => GuardText | null;
  /** Load the choice. The window closes as the brand loads. */
  readonly load: (c: StartChoice) => void;
  /** Close (reopened only): back to the brand, unchanged. */
  readonly close: () => void;
};

export type StartWindow = {
  readonly first: boolean;
  /** Remove the window (and its guard), and focus `to` when given. */
  readonly dismiss: (to: HTMLElement | null) => void;
};

const FOCUSABLE = 'button:not([disabled]), input:not([type="hidden"]):not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';
const focusables = (root: HTMLElement): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.getClientRects().length > 0 && !n.closest('[inert]'));

/** A window over the frame: a scrim and a dialog in it, labelled by its title. */
const windowShell = (cls: 'p3-dialog p3-start' | 'p3-dialog p3-dialog-guard', role: string, titleId: string): { scrim: HTMLElement; dlg: HTMLElement } => {
  const scrim = hook(h('div', cls.includes('p3-start') ? 'p3-scrim p3-scrim-start' : 'p3-scrim'), `${role}-scrim`);
  const dlg = hook(h('section', cls), role);
  dlg.setAttribute('role', cls.includes('guard') ? 'alertdialog' : 'dialog');
  dlg.setAttribute('aria-modal', 'true');
  dlg.setAttribute('aria-labelledby', titleId);
  scrim.append(dlg);
  return { scrim, dlg };
};

/** Keep Tab inside `dlg`, wrapping at both ends. */
const trapTab = (dlg: HTMLElement, e: KeyboardEvent): void => {
  if (e.key !== 'Tab') return;
  const f = focusables(dlg);
  if (!f.length) { e.preventDefault(); return; }
  const i = f.indexOf(document.activeElement as HTMLElement);
  if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && (i < 0 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
};

const button = (cls: `p3-${string}`, role: string, label: string): HTMLButtonElement => {
  const b = hook(h('button', cls, label), role);
  b.type = 'button';
  return b;
};

/** A card: its title and its one-line description. */
const card = (title: string, desc: string, cls: `p3-${string}` = 'p3-start-card'): { el: HTMLElement; text: HTMLElement } => {
  const el = hook(h('div', cls), 'start-path');
  const text = h('div', 'p3-start-text');
  text.append(h('h3', 'p3-start-title', title), h('p', 'p3-start-desc', desc));
  el.append(text);
  return { el, text };
};

/** An error line under a control, announced as it changes. Empty draws nothing. */
const errLine = (role: string, id: string): HTMLParagraphElement => {
  const p = hook(h('p', 'p3-start-err'), role);
  p.id = id;
  p.setAttribute('role', 'alert');
  return p;
};

export const openStart = (layer: HTMLElement, lend: StartLend): StartWindow => {
  // Everything else the frame draws sits behind the window and takes no focus or clicks.
  const behind = [...(layer.parentElement?.children ?? [])].filter((c): c is HTMLElement => c !== layer && c instanceof HTMLElement);
  const wasInert = behind.map((c) => c.inert);
  for (const c of behind) c.inert = true;

  const { scrim, dlg } = windowShell('p3-dialog p3-start', 'start-screen', 'p3-start-title');
  const head = h('div', 'p3-dialog-head');
  const title = hook(h('h2', 'p3-dialog-title', lend.host === 'figma' ? 'Start a brand in this file' : 'Start a brand'), 'start-heading');
  title.id = 'p3-start-title';
  head.append(title);
  if (!lend.first) {
    const close = button('p3-btn p3-btn-ghost', 'start-close', 'Close');
    close.onclick = () => lend.close();
    head.append(close);
  }
  const body = hook(h('div', 'p3-dialog-body'), 'start-column');
  body.append(h('p', 'p3-start-lede', 'One brand color is enough — the engine grows a full, contrast-checked system you can steer. Pick a starting point.'));

  let guard: { scrim: HTMLElement; from: HTMLElement | null } | null = null;
  const closeGuard = (refocus: boolean): void => {
    if (!guard) return;
    const { from } = guard;
    guard.scrim.remove();
    guard = null;
    dlg.inert = false;
    if (refocus) (from && from.isConnected ? from : focusables(dlg)[0])?.focus();
  };
  /** A choice: straight in, or through the guard when it would discard edits (G15 A). */
  const pick = (c: StartChoice, from: HTMLElement | null): void => {
    const g = lend.guardFor(c);
    if (!g) { lend.load(c); return; }
    const w = windowShell('p3-dialog p3-dialog-guard', 'start-guard', 'p3-guard-title');
    const gh = h('div', 'p3-dialog-head');
    const gt = hook(h('h2', 'p3-dialog-title', g.title), 'start-guard-title');
    gt.id = 'p3-guard-title';
    gh.append(gt);
    const gb = h('div', 'p3-dialog-body');
    const p = hook(h('p', 'p3-guard-text', g.body), 'start-guard-body');
    p.id = 'p3-guard-body';
    w.dlg.setAttribute('aria-describedby', p.id);
    gb.append(p);
    const foot = h('div', 'p3-dialog-foot');
    const cancel = button('p3-btn p3-btn-page', 'start-guard-cancel', 'Cancel');
    cancel.onclick = () => closeGuard(true);
    const discard = button('p3-btn p3-btn-danger', 'start-guard-discard', g.discard);
    discard.onclick = () => { closeGuard(false); lend.load(c); };
    foot.append(cancel, discard);
    w.dlg.append(gh, gb, foot);
    w.scrim.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeGuard(true); return; }
      trapTab(w.dlg, e);
    });
    dlg.inert = true;
    guard = { scrim: w.scrim, from };
    layer.append(w.scrim);
    cancel.focus();   // the safe choice first (S5)
  };

  // ── 1. from a color (G14: the working brand's primary; S1, S3) ───────────────────────────────────
  // The owner's answer N1 A (review of #2142): the neutral default is this card's secondary action, not a card of its own.
  const c1 = card('Start from your color', 'Your primary brand color; everything else takes smart defaults you can tune. No color yet? Start blank with a neutral gray.', 'p3-start-card');
  const row1 = h('div', 'p3-start-row');
  const field = h('div', 'p3-colorfield');
  const start = hex(oklchToRgb(brandState.primary));
  const swatch = hook(h('input', 'p3-color-input'), 'start-color');
  swatch.type = 'color'; swatch.value = start;
  swatch.setAttribute('aria-label', 'Brand color');
  swatch.setAttribute('data-content', '');   // it shows a color value, as the Palettes picker does
  const hexIn = hook(h('input', 'p3-hex-input'), 'start-hex');
  hexIn.type = 'text'; hexIn.value = start; hexIn.spellcheck = false; hexIn.autocomplete = 'off';
  hexIn.setAttribute('aria-label', 'Brand color hex');
  field.append(swatch, hexIn);
  const go = button('p3-btn p3-btn-primary p3-start-go', 'start-go', 'Start from this color');
  // "Start blank" (G13: a neutral gray), the secondary action beside the primary one.
  const blank = button('p3-btn p3-btn-page', 'start-blank', 'Start blank');
  blank.onclick = () => pick({ input: BLANK_BRAND(), origin: { kind: 'new' } }, blank);
  row1.append(field, go, blank);
  const err1 = errLine('start-color-error', 'p3-start-color-error');
  const showHexError = (on: boolean): void => {
    err1.textContent = on ? HEX_ERROR : '';
    field.dataset.refused = String(on);
    if (on) { hexIn.setAttribute('aria-invalid', 'true'); hexIn.setAttribute('aria-describedby', err1.id); }
    else { hexIn.removeAttribute('aria-invalid'); hexIn.removeAttribute('aria-describedby'); }
  };
  swatch.oninput = () => { hexIn.value = swatch.value; showHexError(false); };
  hexIn.oninput = () => { const v = readHex(hexIn.value); if (v) { swatch.value = v.toLowerCase(); showHexError(false); } };
  go.onclick = () => {
    const v = readHex(hexIn.value);
    if (!v) { showHexError(true); hexIn.focus(); return; }
    // A color the designer typed is a brand they authored here: `new`, not an example.
    pick({ input: seedFromColor(v), origin: { kind: 'new' } }, go);
  };
  c1.el.append(row1, err1);

  // ── 2. an example ─────────────────────────────────────────────────────────────────────────────
  const c2 = card('Explore an example', 'Open a fully-built example to see what the engine produces from a brand.');
  const chips = h('div', 'p3-start-chips');
  for (const name of Object.keys(BRANDS)) {
    const chip = button('p3-btn p3-btn-page p3-start-chip', 'start-example', '');
    const dot = h('span', 'p3-start-dot');
    dot.setAttribute('data-content', '');   // the brand's own color, not the chrome's
    dot.style.background = hex(oklchToRgb(BRANDS[name].primary));
    chip.append(dot, h('span', undefined, name));
    chip.onclick = () => pick({ input: BRANDS[name], origin: { kind: 'example', id: name } }, chip);
    chips.append(chip);
  }
  c2.el.append(chips);

  // ── 3. import a design.md: paste it (S2), or upload it ─────────────────────────────────────────
  // The owner's review of #2142: Upload sits at the end of the heading row; the paste box, set further down, is the
  // alternative, and its Import belongs to it.
  const c4 = card('Import a design.md', 'Already have a design.md? Paste it or upload it to load the full brand.', 'p3-start-card p3-start-import');
  const head4 = hook(h('div', 'p3-start-headrow'), 'start-import-head');
  const paste = hook(h('textarea', 'p3-start-paste'), 'start-paste');
  paste.placeholder = 'Paste a design.md brief';
  paste.setAttribute('aria-label', 'Paste a design.md brief');
  paste.spellcheck = false;
  const row4 = h('div', 'p3-start-row p3-start-pasterow');
  const upload = button('p3-btn p3-btn-page', 'start-upload', '↑ Upload…');
  const file = hook(h('input', 'p3-start-file'), 'start-file');
  file.type = 'file'; file.accept = IMPORT_ACCEPT; file.tabIndex = -1;
  file.setAttribute('aria-hidden', 'true');
  upload.onclick = () => file.click();
  const imp = button('p3-btn p3-btn-page p3-start-go', 'start-import', 'Import');
  // Disabled while the box is empty or only spaces, so an empty Import cannot be pressed; its name is its label in both
  // states.
  const syncImport = (): void => { imp.disabled = !paste.value.trim(); };
  paste.addEventListener('input', syncImport);
  syncImport();
  head4.append(c4.text, upload, file);
  c4.el.replaceChildren(head4);
  row4.append(imp);
  const err4 = errLine('start-import-error', 'p3-start-import-error');
  const showImportError = (text: string): void => {
    err4.textContent = text;
    if (text) paste.setAttribute('aria-describedby', err4.id); else paste.removeAttribute('aria-describedby');
  };
  imp.onclick = () => {
    const r = validatePaste(paste.value);
    if ('error' in r) { showImportError(importErrorText(r.error)); return; }
    showImportError('');
    pick({ input: r.input, origin: { kind: 'import', label: String(r.input.id ?? 'design.md') } }, imp);
  };
  file.onchange = async () => {
    showImportError('');
    const f = file.files?.[0];
    if (!f) return;
    const read = await readDesignMdFile(f);
    file.value = '';   // the same file can be chosen again after a fix
    if ('error' in read) { showImportError(read.error); return; }
    const res = validateDesignMd(read.text);
    if ('error' in res) { showImportError(importErrorText(res.error)); return; }
    pick({ input: res.input, origin: { kind: 'import', label: String(res.input.id ?? f.name) } }, upload);
  };
  c4.el.append(paste, row4, err4);

  // S8, then N1 A: color (with Blank), examples, import.
  body.append(c1.el, c2.el, c4.el);
  dlg.append(head, body);
  scrim.addEventListener('keydown', (e) => {
    if (guard) return;
    if (e.key === 'Escape') { e.preventDefault(); if (!lend.first) lend.close(); return; }
    trapTab(dlg, e);
  });
  layer.append(scrim);
  // The window takes focus as it opens: in the plugin it can open over an editor the designer is already using.
  focusables(dlg)[0]?.focus();

  return {
    first: lend.first,
    dismiss: (to) => {
      closeGuard(false);
      scrim.remove();
      behind.forEach((c, i) => { c.inert = wasInert[i]; });
      to?.focus();
    },
  };
};
