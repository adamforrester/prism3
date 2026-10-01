/**
 * The Figma menu (UI redesign S1.4, `docs/superpowers/ui-redesign/implementation-plan.md` §3.5 and §3.9),
 * plugin only: the writes this panel can make to the Figma file, in one menu on the top bar.
 *
 * IT CALLS WHAT THE OLD CONTROLS CALL. `main.ts` lends the list (`FigmaSource`): each item's label, whether
 * it is available right now, and the function it runs, which is the same function the control it replaces
 * ran (Apply to Figma, Prune stale), or the one the page's own button runs (Set up file). The two writes
 * that need options first (a set to build, the style guide's settings) open the page that holds those
 * options, as concept v6's "Build set…" and "Style guide…" open theirs. This file only draws the menu and
 * runs what it is handed: it names no legacy repaint tier (plan §3.10).
 *
 * Apply to Figma also stays on the bar, as the one inverse-filled control. The menu's copy of it is a
 * plain item.
 *
 * KEYBOARD, as the theme menu: the button opens it on a click, Enter, Space or Arrow Down, with focus on
 * the first item that can run; Arrow keys, Home and End move between the items that can run; Escape
 * closes it back to the button; Tab closes it and moves on.
 */
import { subscribe } from '../state/store';
import { glyph, h, hook } from './dom';

/** One write the menu offers. `run` is the function the old control ran. */
export type FigmaAction = {
  readonly id: string;
  readonly label: string;
  readonly disabled: boolean;
  /** The old control's tooltip, kept as the item's. */
  readonly hint?: string;
  readonly run: () => void;
};
export type FigmaSource = () => readonly FigmaAction[];

export const figmaMenu = (read: FigmaSource, cleanups: (() => void)[]): HTMLElement => {
  const wrap = h('div', 'p3-popwrap p3-figma-wrap');
  const btn = hook(h('button', 'p3-btn'), 'figma-open');
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-controls', 'p3-figma-menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.append(h('span', 'p3-btn-label', 'Figma'), glyph('chev'));
  const menu = hook(h('div', 'p3-menu p3-figma-menu'), 'figma-menu');
  menu.id = 'p3-figma-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Figma');

  let items: HTMLButtonElement[] = [];
  let actions: readonly FigmaAction[] = [];
  const enabled = (): HTMLButtonElement[] => items.filter((i) => !i.disabled);

  /** Draw the items from a fresh reading. Kept in place when the list is the same, so a host change while
   *  the menu is open updates what can run without moving focus. */
  const fill = (): void => {
    const next = read();
    const same = next.length === actions.length && next.every((a, i) => a.id === actions[i].id);
    actions = next;
    if (!same) {
      items = actions.map((a) => {
        const it = hook(h('button', 'p3-menu-item'), `figma-option-${a.id}`);
        it.type = 'button';
        it.setAttribute('role', 'menuitem');
        it.tabIndex = -1;
        it.onclick = () => {
          const act = actions.find((x) => x.id === a.id);
          if (!act || act.disabled) return;
          close(true);
          act.run();
        };
        return it;
      });
      menu.replaceChildren(...items);
    }
    for (const [i, a] of actions.entries()) {
      const it = items[i];
      it.replaceChildren(h('span', 'p3-menu-label', a.label));
      it.disabled = a.disabled;
      if (a.hint) it.title = a.hint; else it.removeAttribute('title');
    }
  };

  const isOpen = (): boolean => menu.isConnected;
  const onDown = (e: MouseEvent): void => { if (!wrap.contains(e.target as Node)) close(false); };
  const show = (): void => {
    fill();
    wrap.append(menu);
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('mousedown', onDown);
    (enabled()[0] ?? btn).focus();
  };
  function close(refocus: boolean): void {
    if (!isOpen()) return;
    menu.remove();
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', onDown);
    if (refocus) btn.focus();
  }
  btn.onclick = () => (isOpen() ? close(true) : show());
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && !isOpen()) { e.preventDefault(); show(); }
  });
  menu.addEventListener('keydown', (e) => {
    const list = enabled();
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'Tab') close(false);
    else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && list.length) {
      e.preventDefault();
      list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length].focus();
    } else if ((e.key === 'Home' || e.key === 'End') && list.length) { e.preventDefault(); list[e.key === 'Home' ? 0 : list.length - 1].focus(); }
  });
  cleanups.push(() => document.removeEventListener('mousedown', onDown), subscribe('host', () => { if (isOpen()) fill(); }));
  wrap.append(btn);
  return wrap;
};
