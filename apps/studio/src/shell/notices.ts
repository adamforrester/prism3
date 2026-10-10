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

/** A one-click fix the strip offers beside its line (owner Q189 A, #2146). */
export type StripAction = { readonly label: string; readonly run: () => void };

export type ErrorStrip = {
  /** The strip, mounted where `main.ts` declares the `error` surface. Hook `error-bar`, as before. */
  readonly node: HTMLElement;
  /** Show `text`, or hide the strip on null. `action`, when given, draws a button beside the line. */
  readonly show: (text: string | null, action?: StripAction | null) => void;
};

export const errorStrip = (): ErrorStrip => {
  const node = hook(h('div', 'p3-errstrip'), 'error-bar');
  node.setAttribute('role', 'alert');
  const line = h('span', 'p3-errstrip-text');
  // In the strip only while there is an action: a button kept hidden would still be a control the chrome measures.
  const fix = hook(h('button', 'p3-btn'), 'error-fix');
  fix.type = 'button';
  let run: (() => void) | null = null;
  fix.onclick = () => run?.();
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
      const act = text === null ? null : action;
      run = act?.run ?? null;
      if (act && fix.textContent !== act.label) fix.textContent = act.label;
      if (act && !fix.isConnected) node.append(fix);
      else if (!act && fix.isConnected) fix.remove();
    },
  };
};
