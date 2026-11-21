/**
 * The error strip (UI redesign S13.1, owner decisions G18 A and N-2 A): the engine's error, and a refused restore,
 * as a full-width strip under the top bar, drawn in the chrome in both themes. Until S13.1 it was a legacy card,
 * pinned light, so in a dark theme it stayed light.
 *
 * WHAT IT SAYS, AND WHEN, IS `main.ts`'s (`syncErrorBar`, #388 and #772): it composes the line from `lastError` or
 * the restore failure and calls `show`, after every rebuild, on every view. This only draws: a warning glyph, the
 * line and, when `main.ts` passes one, a one-click fix beside it (owner Q189 A, #2146); or nothing. Hidden with the `hidden` attribute, never an inline value, so the chrome carries none. It is an
 * alert, so its text is written only when it changes.
 */
import { glyph, h, hook } from './dom';

/** A one-click fix the strip offers beside its line (owner Q189 A, #2146). `hook` names its button; `error-fix` when
 *  absent. #3697 Q-R9.1 A: the overwrite confirm for the file's brand sits in the strip's place, as Replace brand and
 *  Cancel, so the strip draws up to two, under the confirm's own hooks. */
export type StripAction = { readonly label: string; readonly run: () => void; readonly hook?: string };

export type ErrorStrip = {
  /** The strip, mounted where `main.ts` declares the `error` surface. Hook `error-bar`, as before. */
  readonly node: HTMLElement;
  /** Show `text`, or hide the strip on null. `action`, when given, draws a button beside the line; a pair draws two.
   *  `detail` (#4222), when given, is drawn under the line behind a closed Details disclosure. */
  readonly show: (text: string | null, action?: StripAction | readonly [StripAction, StripAction] | null, detail?: string | null) => void;
};

export const errorStrip = (): ErrorStrip => {
  const node = hook(h('div', 'p3-errstrip'), 'error-bar');
  node.setAttribute('role', 'alert');
  const line = h('span', 'p3-errstrip-text');
  // In the strip only while there is an action: a button kept hidden would still be a control the chrome measures.
  const button = (): { el: HTMLButtonElement; run: (() => void) | null } => {
    const b = { el: h('button', 'p3-btn') as HTMLButtonElement, run: null as (() => void) | null };
    b.el.type = 'button';
    b.el.onclick = () => b.run?.();
    return b;
  };
  const buttons = [button(), button()];
  // #4222 (owner decision A): the text a designer can't act on (the engine's refusal, written for whoever edits the
  // design.md) sits under the line behind Details, closed. A closed disclosure's content is not read, so the alert
  // announces the line alone. In the strip only while there is a detail, as the buttons are.
  const msg = h('div', 'p3-errstrip-msg');
  const detail = hook(h('details', 'p3-errstrip-detail'), 'error-detail') as HTMLDetailsElement;
  const detailText = hook(h('p', 'p3-errstrip-detail-text'), 'error-detail-text');
  detail.append(h('summary', undefined, 'Details'), detailText);
  msg.append(line);
  node.append(glyph('warn'), msg);
  node.hidden = true;
  return {
    node,
    // The strip is `role="alert"`, and `main.ts` calls `show` after every rebuild. So the text is written only when it
    // changes: rewriting the same words would announce a standing error again on each edit (#2124 review, finding 4).
    show: (text, action = null, more = null) => {
      node.hidden = text === null;
      const next = text ?? '';
      if (line.textContent !== next) line.textContent = next;
      const extra = text === null ? null : more;
      if (extra === null) { if (detail.isConnected) detail.remove(); detail.open = false; }
      else {
        if (detailText.textContent !== extra) { detailText.textContent = extra; detail.open = false; }
        if (!detail.isConnected) msg.append(detail);
      }
      const acts: readonly StripAction[] = text === null || action === null ? [] : 'label' in action ? [action] : action;
      buttons.forEach((b, i) => {
        const act = acts[i];
        b.run = act?.run ?? null;
        if (act) {
          const role = act.hook ?? 'error-fix';
          if (b.el.dataset.p3 !== role) hook(b.el, role);
          if (b.el.textContent !== act.label) b.el.textContent = act.label;
          if (!b.el.isConnected) node.append(b.el);
        } else if (b.el.isConnected) b.el.remove();
      });
    },
  };
};
