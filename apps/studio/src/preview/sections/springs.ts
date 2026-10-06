/** Springs: three generated presets, shown because they are real emitted tokens with no other home (UI redesign S9.1
 *  lifted the legacy `renderSpringsSection` here; S9.2 drew it in the Depth & motion preview's Motion section, owner
 *  decision D7 A). Not editable (the engine fixes them), and deliberately not animated: a spring is damping and
 *  stiffness, and faking one with a cubic-bezier trace would show a different curve than the token names.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="springs"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved springs (`theme.motion.spring`) and the block's copy. Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { el, hook, subHead, tokenPillWrapping } from './kit';

export const springsSection = (spring: Theme['motion']['spring'], copy: { title: string; desc: string }): HTMLElement => {
  const wrap = hook(el('div', 'dm-block'), 'depth-springs');
  wrap.dataset.sgSection = 'springs';   // the shared-section marker (`kit.ts`'s header)
  wrap.append(subHead(copy.title), el('p', 'dm-desc', copy.desc));
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
