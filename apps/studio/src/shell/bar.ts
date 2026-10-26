/**
 * The top bar's controls (UI redesign S13.1, owner decisions G18 A and N-2 A; reduced by #2909 IA v2): the brand
 * switcher and its menu, then, in the plugin, Update file, the one global action (Q668 A), and Minimize's slot at the outer end. On both
 * hosts since Q2909.9 A the bar sits beside the rail (`rail.ts`): the mark, Contrast, Theme, Agent, Activity, Docs and
 * Export left it for the rail, the Theme area and the drawer, and Export's content is the Export area's page. The web's
 * bar holds the brand switcher alone. Until S13.1 `main.ts`'s `renderBar` drew these into the frame's bar slot in the
 * legacy stylesheet, pinned light; they are the chrome's now, in both themes.
 *
 * WHAT `main.ts` STILL OWNS, AND LENDS (`BarLend`). The brand-load rules (the overwrite confirm, `loadBrand` and its
 * origin, the design.md validation by engine acceptance) and the export model (`export-settings.ts` and the downloads)
 * stay where they are, with their state. The bar reads a view of that state (`read`, and `exportView` while the Export
 * area is open) and calls the lent actions, each of which is the body the old control ran. Each action ends by telling
 * the store's `bar` topic, which this subscribes to and repaints from, as the shell repaints from every topic (plan
 * §3.10). So nothing here names a legacy repaint tier, and `test-shell-imports.ts` holds that. It cannot see inside a
 * lent body (its header says so): "+ New brand" is `main.ts`'s, and it reopens S12's start window over the studio
 * (`startReopened`, `syncStart`), leaving the brand and its origin in place until a path is chosen.
 *
 * NOTHING IS LENT AS A NODE. The plugin's Pages menu, the last one, went with the old Style guide page in H12 (#2289,
 * owner PG1 A); the Figma menu, the bar's Apply Theme and its prune review went with #2998, after #2909 moved them into
 * Update file (its Clean up tab holds the prune's preview).
 *
 * KEYBOARD (the brand menu): the switcher opens it on a click, Enter, Space or Arrow Down, with focus on the current
 * example (or the first item); Arrow keys, Home and End move between its items; Escape closes it back to the switcher;
 * Tab moves through it in order. The menu holds a form (the import box), so it is a group of controls, not a `menu`
 * role.
 *
 * A REPAINT KEEPS FOCUS. Every repaint redraws the menu and the Export page whole, as `renderBar` did; the control that
 * had focus is found again by its hook and its place among the controls with that hook, and focused again.
 */
import { subscribe } from '../state/store';
import { glyph, h, hook } from './dom';

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
  /** Whether the Export area's content is drawn: while the area is open (`main.ts`). */
  readonly exportOpen: boolean;
  /** #2879: a home shows in place of the studio (`shell/home.ts`). The bar then names it, the library's name with its
   *  "Library file" badge or "No brand", and carries no brand control: no brand switcher and no Update file, since there
   *  is no brand in the file to switch or write. Null for the studio. */
  readonly home: { readonly name: string; readonly badge: string | null } | null;
};

/** One block of the export dialog's right column, in order. */
export type ExportBlock =
  | { readonly kind: 'cap'; readonly text: string }
  | { readonly kind: 'files'; readonly text: string; readonly title?: string }
  | { readonly kind: 'note'; readonly text: string; readonly hook?: string }
  | { readonly kind: 'previews'; readonly files: readonly { readonly name: string | null; readonly text: string }[] };

/** The Export area's content (#723, the export dialog's until #2909), derived by `main.ts` from `export-settings.ts`
 *  while the area is open. */
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
  readonly artifact: (id: string) => void;
  readonly setting: (key: string, value: string) => void;
  readonly download: () => void;
};

export type BarLend = {
  readonly read: () => BarView;
  readonly exportView: () => ExportView;
  readonly act: BarActions;
  /** The design.md import's accepted file types. */
  readonly importAccept: string;
};

/** The shell's nodes the bar places, the same nodes every time. */
export type BarPlaced = {
  /** Minimize's slot (#2949; the owner's direction of 2026-10-24: whether the link is on or off), plugin only. */
  readonly minimize: HTMLElement | null;
  /** Update file, the plugin's one global action (Q668 A); null on the web, which has no file to write (Q2909.9 A). */
  readonly update: HTMLElement | null;
  /** Export's area: while it is open, the export content is drawn here, as a page, not over the panel. */
  readonly exportPage: HTMLElement;
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

  // #2879: a home's name, and its badge, in place of the brand switcher. Text, not a control.
  const homeName = hook(h('div', 'p3-homename'), 'home-name');
  const homeNameText = h('span', 'p3-homename-text');
  const homeBadge = hook(h('span', 'p3-homename-badge'), 'home-badge');
  homeName.append(homeNameText, homeBadge);

  // ── paint ──────────────────────────────────────────────────────────────────────────────────────
  let wasOpen = false;
  /** The Export area's content as built, and what it was built from (A10). */
  let expNode: HTMLElement | null = null;
  let expKey = '';
  const paintBrand = (v: BarView): void => {
    dot.style.background = v.brand.hex;
    // Only when it differs (#2487 A9): a same-value write still replaces the text node, and the frame's observer then
    // re-measures the whole bar, which every brand repaint (a slider's every step) did.
    if (name.textContent !== v.brand.name) name.textContent = v.brand.name;
  };
  const paint = (): void => {
    const v = lend.read();
    const focused = document.activeElement instanceof HTMLElement && (root.contains(document.activeElement) || placed.exportPage.contains(document.activeElement)) ? document.activeElement : null;
    const again = focused ? findAgain(focused.closest('[data-p3="export-page"]') ? placed.exportPage : root, focused) : null;

    paintBrand(v);
    sel.setAttribute('aria-expanded', String(v.menuOpen));
    brandWrap.querySelector(':scope > [data-p3="brand-menu"]')?.remove();
    if (v.menuOpen) brandWrap.append(brandMenu(v));

    if (v.home) {
      if (homeNameText.textContent !== v.home.name) homeNameText.textContent = v.home.name;
      homeBadge.textContent = v.home.badge ?? '';
      homeBadge.hidden = !v.home.badge;
    }
    // #2909 (round 4): the brand, then Update file, the one global action, and Minimize (link on or off) at the outer end,
    // in the plugin (Q716 A, 2026-10-26: Minimize was before Update file). #2879: a home keeps Minimize, which needs no
    // brand. The shell's nodes are placed, never re-minted, so one that holds focus keeps it.
    const order: (HTMLElement | null)[] = v.home ? [homeName, spacer, placed.minimize] : [brandWrap, spacer, placed.update, placed.minimize];
    const want = order.filter((n): n is HTMLElement => !!n);
    if (want.length !== root.children.length || want.some((n, i) => root.children[i] !== n)) root.replaceChildren(...want);

    // The Export content is rebuilt only when what it shows changes (#2487 A10). Rebuilt on every `host`, `origin` or
    // `bar` notification, the import box's caret jumped to the end, an IME composition broke and the preview's scroll
    // reset. The import text is left out of the key: typing stores it without a repaint, so the box already shows it,
    // and a text set from elsewhere (an uploaded file) is written into the box in place.
    const ev = v.exportOpen ? lend.exportView() : null;
    const key = ev ? JSON.stringify([ev, v.importOpen, v.importErr, v.confirm]) : '';
    if (!ev) { expNode = null; expKey = ''; }
    else if (!expNode || key !== expKey) { expNode = exportPage(ev, v); expKey = key; }
    else {
      const ta = expNode.querySelector<HTMLTextAreaElement>('[data-p3="import-text"]');
      if (ta && ta.value !== v.importText) ta.value = v.importText;
    }
    // #2909: Export is an area: its content is drawn into the area's page.
    const page = expNode ? [expNode] : [];
    if (page.length !== placed.exportPage.children.length || page.some((n, i) => placed.exportPage.children[i] !== n)) placed.exportPage.replaceChildren(...page);

    // Focus: the menu, back on the control that had it, or, as the menu opens, on its current example.
    const justOpened = v.menuOpen && !wasOpen;
    wasOpen = v.menuOpen;
    if (justOpened) {
      const items = menuItems(brandWrap);
      (items.find((i) => i.getAttribute('aria-current') === 'true') ?? items[0] ?? sel).focus();
    } else if (focused && !focused.isConnected) {
      // Redrawn: the same control again, or, when the menu closed under it, the switcher that opened it.
      const back = again?.() ?? null;
      if (back) back.focus({ preventScroll: true });
      else if (!v.menuOpen) sel.focus({ preventScroll: true });
    } else if (focused && document.activeElement !== focused) focused.focus({ preventScroll: true });
  };
  const spacer = h('span', 'p3-spacer');
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

  // ── the Export area ────────────────────────────────────────────────────────────────────────────
  /** The Export area's page (#723; the export dialog's content until #2909, without its scrim, Close, Cancel and modal
   *  trap): the artifact, its settings, then the files and a preview, the action, the import slot. */
  const exportPage = (x: ExportView, v: BarView): HTMLElement => {
    const dlg = hook(h('section', 'p3-bardlg p3-export-page'), 'export-page');
    dlg.setAttribute('aria-labelledby', 'p3-export-page-h');
    const head = h('div', 'p3-bardlg-head');
    const h1 = h('h1', 'p3-bardlg-title', 'Export');
    h1.id = 'p3-export-page-h';
    head.append(h1);
    dlg.append(head);
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
          const pre = hook(h('pre', 'p3-export-pre', f.text), 'export-preview');
          pre.tabIndex = 0;
          box.append(pre);
        }
        right.append(box);
      }
    }
    body.append(left, right);
    dlg.append(body);
    const foot = h('div', 'p3-bardlg-foot');
    const go = hook(h('button', 'p3-btn p3-btn-primary', x.go.text), 'dialog-confirm');
    go.type = 'button';
    if (x.go.off) { go.disabled = true; go.title = x.go.off; }
    go.onclick = act.download;
    foot.append(go);
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
    return dlg;
  };

  // ── dismissal, bound once ────────────────────────────────────────────────────────────────────────
  const onDown = (e: MouseEvent): void => {
    if (lend.read().menuOpen && !brandWrap.contains(e.target as Node)) act.closeMenu();
  };
  document.addEventListener('mousedown', onDown);
  cleanups.push(() => document.removeEventListener('mousedown', onDown));
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
