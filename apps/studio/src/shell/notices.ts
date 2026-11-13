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
  /** Show `text`, or hide the strip on null. `action`, when given, draws a button beside the line; a pair draws two. */
  readonly show: (text: string | null, action?: StripAction | readonly [StripAction, StripAction] | null) => void;
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
  node.append(glyph('warn'), line);
  node.hidden = true;
  return {
    node,
    // The strip is `role="alert"`, and `main.ts` calls `show` after every rebuild. So the text is written only when it
    // changes: rewriting the same words would announce a standing error again on each edit (#2124 review, finding 4).
    show: (text, action = null) => {
      node.hidden = text === null;
      const next = text ?? '';
      if (line.textContent !== next) line.textContent = next;
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
