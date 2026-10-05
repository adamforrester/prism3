/**
 * The error strip (UI redesign S13.1, owner decisions G18 A and N-2 A): the engine's error, and a refused restore,
 * as a full-width strip under the top bar, drawn in the chrome in both themes. Until S13.1 it was a legacy card,
 * pinned light, so in a dark theme it stayed light.
 *
 * WHAT IT SAYS, AND WHEN, IS `main.ts`'s (`syncErrorBar`, #388 and #772): it composes the line from `lastError` or
 * the restore failure and calls `show`, after every rebuild, on every view. This only draws: a warning glyph and the
 * line, or nothing. Hidden with the `hidden` attribute, never an inline value, so the chrome carries none.
 */
import { glyph, h, hook } from './dom';

export type ErrorStrip = {
  /** The strip, mounted where `main.ts` declares the `error` surface. Hook `error-bar`, as before. */
  readonly node: HTMLElement;
  /** Show `text`, or hide the strip on null. */
  readonly show: (text: string | null) => void;
};

export const errorStrip = (): ErrorStrip => {
  const node = hook(h('div', 'p3-errstrip'), 'error-bar');
  node.setAttribute('role', 'alert');
  const line = h('span', 'p3-errstrip-text');
  node.append(glyph('warn'), line);
  node.hidden = true;
  return {
    node,
    show: (text) => {
      node.hidden = text === null;
      line.textContent = text ?? '';
    },
  };
};
