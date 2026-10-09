import { validateComponentDef } from '../../../packages/engine/component-schema';
import { figmaAnatomySet, planComponentName } from '../../../packages/engine/anatomy-figma';
import { quantityStepper } from '../../../packages/engine/components/quantity-stepper';
const r = validateComponentDef(quantityStepper as any);
console.log(JSON.stringify(r, null, 1).slice(0, 4000));
const plans = figmaAnatomySet(quantityStepper, { swapTarget: 'FPO-default-icon' });
console.log('members', plans.length);
console.log(plans.slice(0, 3).map((p) => planComponentName(p)).join('\n'));
