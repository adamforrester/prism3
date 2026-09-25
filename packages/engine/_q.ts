import { figmaAnatomyPlan, applyButtonLayout, DEFAULT_BUTTON_LAYOUT } from './anatomy-figma';
import { button } from './components/button';
import { componentSizes, SPACE_BASE } from './scale';
const L = componentSizes('comfortable', SPACE_BASE);
const d = applyButtonLayout(button, { ...DEFAULT_BUTTON_LAYOUT, icons: 'edges' }, (r) => L.find(z => `size.${z.name}.height` === r)?.height);
const p = figmaAnatomyPlan(d, 'medium', { leading: false, trailing: true, swapTarget: 'X', appearance: 'filled', state: 'rest' });
const strip = (n: any): any => ({ name: n.name, type: n.type, bound: n.bound, minWidth: n.minWidth, fixedWidth: n.fixedWidth, layoutGrow: n.layoutGrow, textAlignHorizontal: n.textAlignHorizontal, textAutoResize: n.textAutoResize, psm: n.primaryAxisSizingMode, pai: n.primaryAxisAlignItems, children: n.children.map(strip) });
console.log(JSON.stringify(strip(p.root), null, 1));
