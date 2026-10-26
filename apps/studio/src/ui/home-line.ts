/**
 * A lever's read-only line away from its one home (#2909 Q2909.3 A, Q2909.4 A; v2's lever-home table on #2909). Each
 * lever is edited in one place. Where another page needs to say what it is set to, it draws this: the lever's name and
 * its value, then a link that opens the lever's home, switching the rail's area when the home is in another one
 * ("Density · Comfortable · Set it in Shape › Density"). Nothing here edits, so a derived mode's hold leaves the link
 * live (`.p3-deplink`, RX1 A).
 *
 * The pattern is Button options' way to Shape › Density (S8.2), drawn by one builder for every lever that has a line.
 */
import { glyph, h, hook } from '../shell/dom';
import { subLine } from './lever-kit';

export type HomeLine = {
  /** The hook prefix: the box is `<role>`, the link `<role>-link`. */
  readonly role: string;
  readonly label: string;
  /** The value, as the lever's home shows it. */
  readonly value: string;
  /** What the lever does, one line, or none. */
  readonly note?: string;
  /** The link's words: where the lever is set ("Set it in Shape › Density"). */
  readonly link: string;
  readonly go: () => void;
};

export const homeLine = (l: HomeLine): HTMLElement => {
  const box = hook(h('div', 'p3-lever p3-homeline'), l.role);
  const head = h('div', 'p3-lever-head');
  head.append(h('span', 'p3-lever-name', l.label), h('span', 'p3-readout', l.value));
  const go = hook(h('button', 'p3-btn p3-btn-ghost p3-deplink'), `${l.role}-link`);
  go.type = 'button';
  go.append(h('span', 'p3-btn-label', l.link), glyph('chevr'));
  go.onclick = l.go;
  const ctl = h('div', 'p3-lever-ctl');
  if (l.note) ctl.append(subLine(l.note));
  ctl.append(go);
  box.append(head, ctl);
  return box;
};
