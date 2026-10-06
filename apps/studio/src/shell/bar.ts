/**
 * The top bar's controls (UI redesign S13.1, owner decisions G18 A and N-2 A): the brand switcher and its menu,
 * Export and its dialog, the plugin's Apply Theme and the prune review, placed among the shell's own controls (the
 * mark, Contrast, Theme, the Agent tile's slot, Activity and the Figma menu), in the owner's "A · Menu bar" order
 * (2026-10-05; see `paint`): white buttons with ▾ for the menus, borderless tiles with a small label for Contrast,
 * Theme, Agent, Activity and Export (`dom.ts` `tile`), Apply Theme the one filled control, and no divider. Until S13.1
 * `main.ts`'s `renderBar` drew these into the frame's bar slot in the legacy stylesheet, pinned light; they are the
 * chrome's now, in both themes.
 *
 * WHAT `main.ts` STILL OWNS, AND LENDS (`BarLend`). The brand-load rules (the overwrite confirm, `loadBrand` and its
 * origin, the design.md validation by engine acceptance), the export model (`export-settings.ts` and the downloads)
 * and the host's writes stay where they are, with their state. The bar reads a view of that state (`read`, and
 * `exportView` while the dialog is open) and calls the lent actions, each of which is the body the old control ran.
 * Each action ends by telling the store's `bar` topic, which this subscribes to and repaints from, as the shell
 * repaints from every topic (plan §3.10). So nothing here names a legacy repaint tier, and `test-shell-imports.ts`
 * holds that, as it does for the Figma menu. It cannot see inside a lent body (its header says so): "+ New brand" is
 * `main.ts`'s, and it reopens S12's start window over the studio (`startReopened`, `syncStart`), leaving the brand and
 * its origin in place until a path is chosen.
 *
 * WHAT IS LEFT LENT AS A NODE: the plugin's Pages menu (`pages`), the legacy page list the plugin keeps for the Style
 * guide until S11.2 moves it into the Figma menu. It is placed where it was, after Export.
 *
 * KEYBOARD (the brand menu): the switcher opens it on a click, Enter, Space or Arrow Down, with focus on the current
 * example (or the first item); Arrow keys, Home and End move between its items; Escape closes it back to the switcher;
 * Tab moves through it in order. The menu holds a form (the import box), so it is a group of controls, not a `menu`
 * role. The export and prune dialogs close on Escape and on a click on their scrim.
 *
 * DIALOG FOCUS (#2124 review). Both dialogs are modal: focus moves into one as it opens, Tab stays inside it, and as it
 * closes, by any path, focus returns to its opener (Export; the Figma menu for the prune review).
 *
 * A REPAINT KEEPS FOCUS. Every repaint redraws the menu and the dialog whole, as `renderBar` did; the control that had
 * focus is found again by its hook and its place among the controls with that hook, and focused again.
 */
import { subscribe } from '../state/store';
import { focusables, glyph, h, hook, pendingLabel, setBusy, tile, trapTab } from './dom';
import type { FigmaAction } from './figma';

/** The brand menu's state, read from `main.ts` on every repaint. */
export type BarView = {
  readonly brand: { readonly name: string; readonly hex: string };
  readonly menuOpen: boolean;
  readonly examples: readonly { readonly name: string; readonly hex: string; readonly current: boolean }[];
  /** A load waiting on the overwrite confirm (#160, #722, #1033): beneath the examples for an example, in place of
   *  the import box for an import. `text` is `main.ts`'s sentence, which names both origins. */
  readonly confirm: { readonly at: 'example' | 'import'; readonly text: string } | null;
  readonly importOpen: boolean;
  readonly importText: string;
  readonly importErr: string | null;
  readonly exportOpen: boolean;
  /** The prune review (#1521, plugin only), while a preview with something to remove has landed. */
  readonly prune: { readonly summary: string; readonly deleteLabel: string; readonly off: string | null } | null;
};

/** One block of the export dialog's right column, in order. */
export type ExportBlock =
  | { readonly kind: 'cap'; readonly text: string }
  | { readonly kind: 'files'; readonly text: string; readonly title?: string }
  | { readonly kind: 'note'; readonly text: string; readonly hook?: string }
  | { readonly kind: 'previews'; readonly files: readonly { readonly name: string | null; readonly text: string }[] };

/** The export dialog's content (#723), derived by `main.ts` from `export-settings.ts` while the dialog is open. */
export type ExportView = {
  readonly artifacts: readonly { readonly id: string; readonly label: string; readonly on: boolean }[];
  readonly desc: string;
  readonly settings: readonly {
    readonly key: string; readonly label: string; readonly desc: string;
    readonly options: readonly { readonly value: string; readonly label: string; readonly on: boolean }[];
  }[];
  /** Said when the artifact has no settings. */
  readonly none: string | null;
  readonly right: readonly ExportBlock[];
  readonly go: { readonly text: string; readonly off: string | null };
  readonly imports: readonly { readonly label: string; readonly desc: string }[];
};

/** What the old controls ran, each ending in the store's `bar` topic. */
export type BarActions = {
  readonly toggleMenu: () => void;
  readonly closeMenu: () => void;
  readonly example: (name: string) => void;
  readonly newBrand: () => void;
  readonly toggleImport: () => void;
  /** The paste, kept across repaints (M-17). Tells no topic: a keystroke redraws nothing. */
  readonly importText: (text: string) => void;
  readonly importLoad: (text: string) => void;
  readonly importFile: (file: File) => void;
  readonly replace: () => void;
  readonly cancelReplace: () => void;
  readonly toggleExport: () => void;
  readonly closeExport: () => void;
  /** Escape: the dialog closes, and its import box with it. */
  readonly escapeExport: () => void;
  readonly artifact: (id: string) => void;
  readonly setting: (key: string, value: string) => void;
  readonly download: () => void;
  readonly closePrune: () => void;
  readonly deletePrune: () => void;
};

export type BarLend = {
  readonly read: () => BarView;
  readonly exportView: () => ExportView;
  readonly act: BarActions;
  /** The design.md import's accepted file types. */
  readonly importAccept: string;
  /** The plugin's Pages menu, a legacy node (until S11.2), or null where the host offers no legacy page. */
  readonly pages: (() => HTMLElement | null) | null;
};

/** The shell's nodes the bar places, the same nodes every time. */
export type BarPlaced = {
  /** The product mark (the logo and "Prism3 Studio"), first on both hosts. */
  readonly mark: HTMLElement;
  readonly verdict: HTMLElement;
  readonly activity: HTMLElement;
  readonly agent: HTMLElement | null;
  readonly figma: HTMLElement | null;
  /** The theme menu (F3; both hosts since 2026-10-05), placed before Activity and Export so Export ends the web's bar. */
  readonly theme: HTMLElement | null;
  /** The bar's Apply Theme: its busy and off states, tooltip and function. The Figma menu does not list it (#2178). */
  readonly applyTheme: (() => FigmaAction) | null;
};

/** Mount the bar's controls into `host` (the frame's bar slot). Returns the node, which is the `brand-bar` chrome
 *  surface `main.ts` declares. */
export const mountBar = (lend: BarLend, placed: BarPlaced, cleanups: (() => void)[]): HTMLElement => {
  const { act } = lend;
  const root = hook(h('div', 'p3-bar-main'), 'bar-main');

  // ── the brand switcher and its menu ──────────────────────────────────────────────────────────────
  const brandWrap = h('div', 'p3-popwrap p3-brandwrap');
  const sel = hook(h('button', 'p3-brand'), 'brand-switcher');
  sel.type = 'button';
  sel.setAttribute('aria-controls', 'p3-brand-menu');
  // The swatch is the brand's color, so it is brand content: `data-content` marks it, and its inline background is
  // the one runtime value the chrome may carry.
  const sw = h('span', 'p3-swatch');
  const dot = h('span');
  dot.setAttribute('data-content', '');
  sw.append(dot);
  const name = h('span', 'p3-brand-name');
  sel.append(sw, name, glyph('chev'));
  sel.onclick = (e) => { e.stopPropagation(); act.toggleMenu(); };
  sel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && !lend.read().menuOpen) { e.preventDefault(); act.toggleMenu(); }
  });
  brandWrap.append(sel);

  // ── Apply Theme (plugin), Export ─────────────────────────────────────────────────────────────────
  let applyBtn: HTMLButtonElement | null = null;
  if (placed.applyTheme) {
    // The primary CTA, the one inverse-filled control, last on the bar. Busy while any Apply runs (owner decision #4
    // on #1956); off, natively, while the file's brand does not resolve (#1989), with the reason as its tooltip.
    applyBtn = hook(h('button', 'p3-btn p3-btn-primary'), 'apply-to-figma');
    applyBtn.type = 'button';
    applyBtn.append(pendingLabel('Apply Theme', 'Applying…'));
    applyBtn.onclick = () => placed.applyTheme!().run();
  }
  // Export: a bar tile (the owner's top-bar decision, 2026-10-05), its download glyph over "Export", the glyph alone
  // at narrow widths; the name and the tooltip stay "Export".
  const exportWrap = h('div', 'p3-popwrap');
  const { btn: exp, mark: expMark, tip: expTip } = tile('export-open', 'Export');
  expMark.append(glyph('export'));
  expTip.textContent = 'Export';
  exp.setAttribute('aria-label', 'Export');
  exp.setAttribute('aria-haspopup', 'dialog');
  exp.onclick = (e) => { e.stopPropagation(); act.toggleExport(); };
  exportWrap.append(exp);

  // The dialogs sit in a layer of their own after the controls, outside every wrap, so a scrim click is never read
  // as a click inside a menu's wrap (#723).
  const layer = h('div', 'p3-bardlg-layer');

  // ── paint ──────────────────────────────────────────────────────────────────────────────────────
  let wasOpen = false;
  let wasExport = false;
  let wasPrune = false;
  const paintBrand = (v: BarView): void => {
    dot.style.background = v.brand.hex;
    name.textContent = v.brand.name;
  };
  const paint = (): void => {
    const v = lend.read();
    const focused = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) ? document.activeElement : null;
    const again = focused ? findAgain(root, focused) : null;

    paintBrand(v);
    sel.setAttribute('aria-expanded', String(v.menuOpen));
    brandWrap.querySelector(':scope > [data-p3="brand-menu"]')?.remove();
    if (v.menuOpen) brandWrap.append(brandMenu(v));

    if (applyBtn && placed.applyTheme) {
      const a = placed.applyTheme();
      setBusy(applyBtn, !!a.busy);
      applyBtn.disabled = a.disabled && !a.busy;
      if (a.hint && a.disabled) applyBtn.title = a.hint; else applyBtn.removeAttribute('title');
    }
    exp.setAttribute('aria-expanded', String(v.exportOpen));

    // The bar's order (the owner's top-bar decision, 2026-10-05, "A · Menu bar"): the mark, the brand switcher,
    // Contrast, a spacer, Theme, the Agent tile's slot (plugin; T7 A), Activity, Export, then on the plugin the Pages
    // menu, the Figma menu and Apply Theme. On the web Export is the last control, and its right edge
    // is the page content's. At the narrow tier the plugin's file actions take a second row (`rowBreak`), Apply Theme
    // on its right (`spacer2`); above it both draw nothing. The shell's nodes are placed, never re-minted, so one that
    // holds focus keeps it.
    const pages = lend.pages ? lend.pages() : null;
    const fileRow = !!(pages || placed.figma || applyBtn);
    const order: (HTMLElement | null)[] = [placed.mark, brandWrap, placed.verdict, spacer, placed.theme, placed.agent, placed.activity, exportWrap,
      fileRow ? rowBreak : null, pages, placed.figma, fileRow ? spacer2 : null, applyBtn, layer];
    const want = order.filter((n): n is HTMLElement => !!n);
    if (want.length !== root.children.length || want.some((n, i) => root.children[i] !== n)) root.replaceChildren(...want);

    layer.replaceChildren();
    if (v.exportOpen) layer.append(exportDialog(lend.exportView(), v));
    if (v.prune) layer.append(pruneDialog(v.prune));

    // Focus. A dialog first (#2124 review, findings 1 and 2): as one opens, focus moves into it (its first control);
    // as one closes, by whatever path (Close, Cancel, a scrim click, Escape, its action), focus goes back to the
    // control that opened it: Export, or the Figma menu for the prune review (its Prune stale item). Then the menu:
    // back on the control that had it, or, as the menu opens, on its current example.
    const justOpened = v.menuOpen && !wasOpen;
    wasOpen = v.menuOpen;
    const exportOpened = v.exportOpen && !wasExport, exportClosed = !v.exportOpen && wasExport;
    const pruneOpened = !!v.prune && !wasPrune, pruneClosed = !v.prune && wasPrune;
    wasExport = v.exportOpen;
    wasPrune = !!v.prune;
    const into = (role: string): void => { const d = layer.querySelector<HTMLElement>(`[data-p3="${role}"]`); if (d) (focusables(d)[0] ?? d).focus(); };
    const figmaOpener = (): HTMLElement | null => placed.figma?.querySelector<HTMLElement>('[data-p3="figma-open"]') ?? null;
    if (exportOpened) into('export-dialog');
    else if (pruneOpened) into('prune-dialog');
    else if (exportClosed && !v.prune) exp.focus({ preventScroll: true });
    else if (pruneClosed && !v.exportOpen) (figmaOpener() ?? sel).focus({ preventScroll: true });
    else if (justOpened) {
      const items = menuItems(brandWrap);
      (items.find((i) => i.getAttribute('aria-current') === 'true') ?? items[0] ?? sel).focus();
    } else if (focused && !focused.isConnected) {
      // Redrawn: the same control again, or, when the menu closed under it, the switcher that opened it.
      // Never behind an open dialog: there, the dialog's first control.
      const inDlg = v.exportOpen ? 'export-dialog' : v.prune ? 'prune-dialog' : null;
      const back = again?.() ?? null;
      if (back) back.focus({ preventScroll: true });
      else if (inDlg) into(inDlg);
      else if (!v.menuOpen) sel.focus({ preventScroll: true });
    } else if (focused && document.activeElement !== focused) focused.focus({ preventScroll: true });
  };
  const spacer = h('span', 'p3-spacer');
  const rowBreak = h('span', 'p3-bar-break');
  const spacer2 = h('span', 'p3-bar-spacer2');

  // ── the brand menu ───────────────────────────────────────────────────────────────────────────────
  const brandMenu = (v: BarView): HTMLElement => {
    const menu = hook(h('div', 'p3-menu p3-brandmenu'), 'brand-menu');
    menu.id = 'p3-brand-menu';
    // No Modes section (owner decision 2026-10-01, #1943): Brand › Modes is the one place modes are edited.
    menu.append(h('div', 'p3-menu-cap', 'Examples'));
    for (const ex of v.examples) {
      const b = hook(h('button', 'p3-menu-item'), 'brand-menu-example');
      b.type = 'button';
      if (ex.current) b.setAttribute('aria-current', 'true');
      const s = h('span', 'p3-swatch p3-swatch-sm');
      const d = h('span');
      d.setAttribute('data-content', '');
      d.style.background = ex.hex;
      s.append(d);
      b.append(s, h('span', 'p3-menu-label', ex.name));
      b.onclick = () => act.example(ex.name);
      menu.append(b);
    }
    // Beneath the list it belongs to, so the sentence sits where the click was.
    if (v.confirm?.at === 'example') menu.append(confirmBox(v.confirm.text));
    menu.append(h('div', 'p3-menu-div'));
    const nb = hook(h('button', 'p3-menu-item', '+ New brand'), 'brand-menu-new');
    nb.type = 'button';
    nb.onclick = () => act.newBrand();
    const imp = hook(h('button', 'p3-menu-item', '↑ Import design.md…'), 'brand-menu-import');
    imp.type = 'button';
    imp.setAttribute('aria-expanded', String(v.importOpen));
    imp.onclick = () => act.toggleImport();
    menu.append(nb, imp);
    if (v.importOpen) menu.append(importBox(v));
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); act.closeMenu(); sel.focus(); return; }
      if (!(e.target instanceof HTMLElement) || !e.target.matches('.p3-menu-item')) return;
      const list = menuItems(brandWrap);
      const i = list.indexOf(e.target as HTMLButtonElement);
      let to: HTMLButtonElement | undefined;
      if (e.key === 'ArrowDown') to = list[(i + 1) % list.length];
      else if (e.key === 'ArrowUp') to = list[(i - 1 + list.length) % list.length];
      else if (e.key === 'Home') to = list[0];
      else if (e.key === 'End') to = list[list.length - 1];
      if (to) { e.preventDefault(); to.focus(); }
    });
    return menu;
  };

  /** The overwrite confirm (#160, #722, #1033): its sentence, then Replace brand and Cancel. */
  const confirmBox = (text: string): HTMLElement => {
    const box = h('div', 'p3-confirm');
    box.append(hook(h('p', 'p3-confirm-line', text), 'overwrite-confirm'));
    const row = h('div', 'p3-confirm-row');
    const rep = hook(h('button', 'p3-btn p3-btn-primary', 'Replace brand'), 'overwrite-replace');
    rep.type = 'button';
    rep.onclick = () => act.replace();
    const can = hook(h('button', 'p3-btn p3-btn-page', 'Cancel'), 'overwrite-cancel');
    can.type = 'button';
    can.onclick = () => act.cancelReplace();
    row.append(rep, can);
    box.append(row);
    return box;
  };

  /** The design.md import (#160, #722): paste or upload, then the conditional confirm. The brand menu and the export
   *  dialog draw this same box, over the same state, so a paste survives being reached from either. */
  const importBox = (v: BarView): HTMLElement => {
    if (v.confirm?.at === 'import') return confirmBox(v.confirm.text);
    const box = h('div', 'p3-import');
    const ta = hook(h('textarea', 'p3-textarea'), 'import-text');
    ta.placeholder = 'Paste a design.md — --- YAML frontmatter --- then prose…';
    ta.spellcheck = false;
    ta.value = v.importText;
    ta.oninput = () => act.importText(ta.value);
    box.append(ta);
    if (v.importErr) box.append(hook(h('p', 'p3-field-err', v.importErr), 'import-error'));
    const row = h('div', 'p3-import-row');
    const up = hook(h('label', 'p3-btn p3-btn-page p3-upload'), 'import-upload');
    const fi = hook(h('input', 'p3-file'), 'import-file');
    fi.type = 'file';
    fi.accept = lend.importAccept;
    fi.onchange = () => { const f = fi.files?.[0]; if (f) act.importFile(f); };
    up.append(h('span', undefined, '↑ Upload .md'), fi);
    const load = hook(h('button', 'p3-btn p3-btn-primary', 'Load'), 'import-load');
    load.type = 'button';
    load.onclick = () => act.importLoad(ta.value);
    row.append(up, load);
    box.append(row);
    return box;
  };

  // ── the dialogs ──────────────────────────────────────────────────────────────────────────────────
  /** A modal on a scrim: the head (its title and Close), then its body. A click on the scrim, and Escape, close it. */
  const dialog = (role: string, title: string, close: () => void): { scrim: HTMLElement; dlg: HTMLElement } => {
    const scrim = h('div', 'p3-bardlg-scrim');
    const dlg = hook(h('div', 'p3-bardlg'), role);
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-label', title);
    dlg.tabIndex = -1;   // focusable itself only as the fallback when it holds no control
    // Modal (`aria-modal`): Tab and Shift+Tab stay inside until it closes (S12's trap, `dom.ts`).
    dlg.addEventListener('keydown', (e) => trapTab(dlg, e));
    const head = h('div', 'p3-bardlg-head');
    head.append(h('h2', 'p3-bardlg-title', title));
    const x = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon'), 'dialog-close');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.append(glyph('x'));
    x.onclick = close;
    head.append(x);
    dlg.append(head);
    // A scrim click closes it. Its default (focus moving to the page under the click) is refused, so focus goes back to
    // the opener, as from Close.
    scrim.onmousedown = (e) => { if (e.target === scrim) { e.preventDefault(); close(); } };
    scrim.append(dlg);
    return { scrim, dlg };
  };

  /** The export dialog (#723): the artifact, its settings, then the files and a preview, the action, the import slot. */
  const exportDialog = (x: ExportView, v: BarView): HTMLElement => {
    const { scrim, dlg } = dialog('export-dialog', 'Export', act.closeExport);
    // Two columns: the settings on the left, what they produce on the right (#720's verify item: a preview you have
    // to scroll to is not a preview). One column at narrow widths, the preview after the settings.
    const body = h('div', 'p3-bardlg-body p3-export-body');
    const left = h('div', 'p3-bardlg-col');
    const right = h('div', 'p3-bardlg-col p3-export-out');
    const seg = h('div', 'p3-seg p3-export-seg');
    for (const a of x.artifacts) {
      const b = hook(h('button', 'p3-seg-tab', a.label), 'export-artifact');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(a.on));
      b.onclick = () => act.artifact(a.id);
      seg.append(b);
    }
    left.append(seg, h('p', 'p3-bardlg-desc', x.desc));
    if (x.settings.length) {
      left.append(h('div', 'p3-menu-div'));
      for (const s of x.settings) {
        const row = h('div', 'p3-export-set');
        row.append(h('div', 'p3-export-lab', s.label));
        const sseg = h('div', 'p3-seg p3-export-oseg');
        for (const o of s.options) {
          const b = hook(h('button', 'p3-seg-tab', o.label), 'export-setting');
          b.type = 'button';
          b.setAttribute('aria-pressed', String(o.on));
          b.setAttribute('aria-label', `${s.label}: ${o.label}`);
          b.onclick = () => act.setting(s.key, o.value);
          sseg.append(b);
        }
        row.append(sseg, h('p', 'p3-bardlg-note', s.desc));
        left.append(row);
      }
    } else if (x.none) left.append(h('p', 'p3-bardlg-note', x.none));
    for (const blk of x.right) {
      if (blk.kind === 'cap') right.append(h('div', 'p3-menu-cap', blk.text));
      else if (blk.kind === 'files') { const p = h('p', 'p3-export-files', blk.text); if (blk.title) p.title = blk.title; right.append(p); }
      else if (blk.kind === 'note') { const p = h('p', 'p3-bardlg-note', blk.text); if (blk.hook) hook(p, blk.hook); right.append(p); }
      else {
        // One block per file, its name above it: the text has to stay the bytes the download writes.
        const box = h('div', 'p3-export-prevs');
        for (const f of blk.files) {
          if (f.name !== null) box.append(h('div', 'p3-export-pname', f.name));
          // A scroll region, so it is a Tab stop (and in the trap's list) rather than one Chromium adds behind its back.
          const pre = h('pre', 'p3-export-pre', f.text);
          pre.tabIndex = 0;
          box.append(pre);
        }
        right.append(box);
      }
    }
    body.append(left, right);
    dlg.append(body);
    const foot = h('div', 'p3-bardlg-foot');
    const cancel = hook(h('button', 'p3-btn p3-btn-page', 'Cancel'), 'dialog-cancel');
    cancel.type = 'button';
    cancel.onclick = act.closeExport;
    const go = hook(h('button', 'p3-btn p3-btn-primary', x.go.text), 'dialog-confirm');
    go.type = 'button';
    if (x.go.off) { go.disabled = true; go.title = x.go.off; }
    go.onclick = act.download;
    foot.append(cancel, go);
    dlg.append(foot);
    // Import, a slot: the same conversation as export (#723).
    if (x.imports.length) {
      const imp = h('div', 'p3-bardlg-import');
      imp.append(h('div', 'p3-menu-cap', 'Import'));
      for (const slot of x.imports) {
        const b = hook(h('button', 'p3-menu-item', `↑ ${slot.label}…`), 'export-import');
        b.type = 'button';
        b.setAttribute('aria-expanded', String(v.importOpen));
        b.onclick = () => act.toggleImport();
        imp.append(b, h('p', 'p3-bardlg-note', slot.desc));
      }
      if (v.importOpen) imp.append(importBox(v));
      dlg.append(imp);
    }
    return scrim;
  };

  /** The prune review (#1521): the main thread's sentence, Cancel, and the destructive action named by its outcome. */
  const pruneDialog = (p: NonNullable<BarView['prune']>): HTMLElement => {
    const { scrim, dlg } = dialog('prune-dialog', 'Prune stale items', act.closePrune);
    const body = h('div', 'p3-bardlg-col');
    body.append(h('p', 'p3-bardlg-desc', p.summary));
    dlg.append(body);
    const foot = h('div', 'p3-bardlg-foot');
    const cancel = hook(h('button', 'p3-btn p3-btn-page', 'Cancel'), 'dialog-cancel');
    cancel.type = 'button';
    cancel.onclick = act.closePrune;
    const del = hook(h('button', 'p3-btn p3-btn-primary', p.deleteLabel), 'dialog-confirm');
    del.type = 'button';
    if (p.off) { del.disabled = true; del.title = p.off; }
    del.onclick = act.deletePrune;
    foot.append(cancel, del);
    dlg.append(foot);
    return scrim;
  };

  // ── dismissal, bound once ────────────────────────────────────────────────────────────────────────
  const onDown = (e: MouseEvent): void => {
    if (lend.read().menuOpen && !brandWrap.contains(e.target as Node)) act.closeMenu();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const v = lend.read();
    if (v.exportOpen) { act.escapeExport(); exp.focus(); }
    else if (v.prune) act.closePrune();
  };
  document.addEventListener('mousedown', onDown);
  document.addEventListener('keydown', onKey);
  cleanups.push(() => document.removeEventListener('mousedown', onDown), () => document.removeEventListener('keydown', onKey));
  cleanups.push(subscribe('bar', paint), subscribe('host', paint), subscribe('origin', paint));
  cleanups.push(subscribe('brand', () => paintBrand(lend.read())), subscribe('identity', () => paintBrand(lend.read())));
  paint();
  return root;
};

/** The brand menu's items, in order, as keyboard moves between them. */
const menuItems = (wrap: HTMLElement): HTMLButtonElement[] =>
  [...wrap.querySelectorAll<HTMLButtonElement>('[data-p3="brand-menu"] .p3-menu-item')].filter((b) => !b.disabled);

/** A way to find `n` again after a repaint: the same hook, at the same place among the controls with that hook. */
const findAgain = (root: HTMLElement, n: HTMLElement): (() => HTMLElement | null) | null => {
  const role = n.getAttribute('data-p3');
  if (!role) return null;
  const at = [...root.querySelectorAll(`[data-p3="${role}"]`)].indexOf(n);
  return () => (root.querySelectorAll<HTMLElement>(`[data-p3="${role}"]`)[at] ?? null);
};
