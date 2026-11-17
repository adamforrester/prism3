/**
 * Report a problem (#2069, owner decision Q116 A): the dialog that shows the diagnostic bundle (`state/report.ts`), with
 * one opt-in box for the brand's settings (off by default), Copy, and "Open a prefilled issue", which opens GitHub's
 * new-issue form in the browser with the bundle filled in. Nothing is sent from the panel.
 *
 * The person sees the exact text before it leaves: the box below is the bundle, rebuilt as the opt-in changes, and
 * both actions take it from there.
 *
 * LAYOUT: Update file's dialog shape (`update-file.ts`): a modal over a scrim, a body, the actions in the foot. Opened
 * from the Activity drawer in the plugin, where the session's results are (`activity.ts`, its `report` lend), and from
 * the rail beside Help on the web, which has no drawer (#3524, `frame.ts`). The placement and every string are DRAFT
 * (#2069, #3524: the owner's call).
 *
 * DIALOG: modal (`aria-modal`); focus goes in as it opens and back to the opener as it closes; Escape and a click on the
 * scrim close it; Tab stays inside (`trapTab`).
 */
import { buildReport, issueUrl, REPORT_COPY, type ReportInput } from '../state/report';
import { focusables, glyph, h, hook, trapTab } from './dom';
import { copyText } from './activity';

export type ReportLend = {
  /** The bundle's inputs as they are now, less the opt-in, which the dialog holds. */
  readonly read: () => Omit<ReportInput, 'includeBrand'>;
  /** Open `url` in the browser (the plugin asks its main thread; the web opens a tab). */
  readonly openUrl: (url: string) => void;
};

/** Mount the layer. `open(opener)` shows the dialog; focus returns to `opener` when it closes. */
export const mountReport = (lend: ReportLend, cleanups: (() => void)[]): { readonly layer: HTMLElement; readonly open: (opener: HTMLElement | null) => void } => {
  const layer = hook(h('div', 'p3-bardlg-layer'), 'report-layer');
  let opener: HTMLElement | null = null;
  let includeBrand = false;

  const close = (): void => { layer.replaceChildren(); opener?.focus({ preventScroll: true }); opener = null; };

  const paint = (): void => {
    const input: ReportInput = { ...lend.read(), includeBrand };
    const text = buildReport(input);
    const scrim = h('div', 'p3-bardlg-scrim');
    scrim.dataset.still = 'true';
    const dlg = hook(h('div', 'p3-bardlg p3-upd'), 'report-dialog');
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-label', REPORT_COPY.title);
    dlg.tabIndex = -1;
    dlg.addEventListener('keydown', (e) => {
      trapTab(dlg, e);
      if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); close(); }
    });
    const head = h('div', 'p3-bardlg-head');
    head.append(h('h2', 'p3-bardlg-title', REPORT_COPY.title));
    const x = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon'), 'report-x');
    x.type = 'button';
    x.setAttribute('aria-label', REPORT_COPY.close);
    x.append(glyph('x'));
    x.onclick = close;
    head.append(x);

    const body = hook(h('div', 'p3-bardlg-col p3-upd-body'), 'report-body');
    // #3553 M10: not `p3-upd-sub`, whose indent hangs a hint under a checkbox: the intro comes before the checkbox.
    body.append(hook(h('p', 'p3-sub', REPORT_COPY.intro), 'report-intro'));
    // The opt-in: a real checkbox, off until the person turns it on, for this opening only.
    const optRow = hook(h('label', 'p3-upd-handsel'), 'report-brand-row');
    const box = hook(h('input'), 'report-brand');
    box.type = 'checkbox';
    box.checked = includeBrand;
    box.onchange = () => { includeBrand = box.checked; paint(); layer.querySelector<HTMLElement>('[data-p3="report-brand"]')?.focus({ preventScroll: true }); };
    optRow.append(box, h('span', undefined, REPORT_COPY.brandBox));
    body.append(optRow, hook(h('p', 'p3-sub p3-upd-sub', includeBrand ? REPORT_COPY.brandOn : REPORT_COPY.brandOff), 'report-brand-note'),
      hook(h('p', 'p3-sub p3-upd-sub', REPORT_COPY.never), 'report-never'));
    const lab = h('label', 'p3-sub', REPORT_COPY.preview);
    lab.htmlFor = 'p3-report-text';
    const area = hook(h('textarea', 'p3-textarea p3-sg-textarea'), 'report-text');
    area.id = 'p3-report-text';
    area.readOnly = true;
    area.rows = 10;
    area.value = text;
    body.append(lab, area);

    const foot = h('div', 'p3-bardlg-foot');
    const copy = hook(h('button', 'p3-btn p3-btn-page'), 'report-copy');
    copy.type = 'button';
    copy.textContent = REPORT_COPY.copy;
    // The copy may select a hidden box outside the dialog (`copyText`'s fallback), so focus comes back to the button.
    copy.onclick = () => { void copyText(text).then((done) => { if (done) copy.textContent = REPORT_COPY.copied; copy.focus({ preventScroll: true }); }); };
    const go = hook(h('button', 'p3-btn p3-btn-primary'), 'report-open-issue');
    go.type = 'button';
    go.textContent = REPORT_COPY.openIssue;
    // The full bundle goes to the clipboard first, so a report cut to fit the link is still whole where it says.
    go.onclick = () => { void copyText(text).finally(() => { go.focus({ preventScroll: true }); lend.openUrl(issueUrl(text)); }); };
    foot.append(copy, go);

    dlg.append(head, body, foot);
    scrim.onmousedown = (e) => { if (e.target === scrim) { e.preventDefault(); close(); } };
    scrim.append(dlg);
    layer.replaceChildren(scrim);
  };

  const open = (from: HTMLElement | null): void => {
    opener = from;
    includeBrand = false;   // off by default, every time the dialog opens
    paint();
    const dlg = layer.querySelector<HTMLElement>('[data-p3="report-dialog"]');
    if (dlg) (focusables(dlg)[0] ?? dlg).focus({ preventScroll: true });
  };
  cleanups.push(() => layer.replaceChildren());
  return { layer, open };
};
