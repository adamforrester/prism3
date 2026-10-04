/** Springs — three generated presets, shown because they are real emitted tokens with no other home (UI redesign
 *  S9.1, lifted from `main.ts`'s `renderSpringsSection`, unchanged in output). Not editable (the engine fixes
 *  them), and deliberately not animated: a spring is damping+stiffness, and faking one with a cubic-bezier trace
 *  would be showing a different curve than the token names. The legacy Motion page draws it; the Depth & motion
 *  page (S9.2) will draw the same code (owner decision D7).
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="springs"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved springs (`theme.motion.spring`). Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { el, palSection, tokenPillWrapping } from './kit';

export const springsSection = (spring: Theme['motion']['spring']): HTMLElement => {
  const wrap = palSection('Springs', 'Three generated spring presets for platforms that animate with physics rather than a duration + curve. Read-only — stated as damping and stiffness, the two numbers a consumer needs.');
  wrap.dataset.sgSection = 'springs';   // the shared-section marker (`kit.ts`'s header)
  const grid = el('div', 'mo-spring-grid');
  for (const [name, s] of Object.entries(spring)) {
    const card = el('div', 'mo-spring-card');
    card.append(el('div', 'mo-ez-name', name), tokenPillWrapping(`motion.spring.${name}`));
    const nums = el('div', 'mo-spring-nums mono');
    nums.append(el('span', undefined, `damping ${(s as { damping: number }).damping}`), el('span', undefined, `stiffness ${(s as { stiffness: number }).stiffness}`));
    card.append(nums);
    grid.append(card);
  }
  wrap.append(grid);
  return wrap;
};
