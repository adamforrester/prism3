// Concept v4 mockup: the engine surface the mockup calls, bundled by build-v4.mjs.
// Prototype-only glue. It exposes the real engine on `window.P3` so the hand-written
// source (concept-v4.src.html) re-resolves the brand live on every lever edit.
import { brandTheme, TYPE_GROUPS, WEIGHT_ROLE_ORDER, weightAvailability, DISPLAY_VARIANTS } from '@prism3/engine/theme';
import { resolvePreview } from '@prism3/engine/resolve-preview';
import { resolveAllModes, OPACITY_STEPS, BUILTIN_MODES } from '@prism3/engine/modes';
import { componentDefs } from '@prism3/engine/components/index';
import { figmaVariantCount } from '@prism3/engine/component-schema';
import { densitySpacingStep, buttonMinWidth } from '@prism3/engine/scale';
import { buildTree } from '@prism3/engine/tree';
import { parseDesignMd, toDesignMd } from '@prism3/engine/design-md';
import { TRAITS } from '@prism3/engine/vocabulary';
import { ENGINE_VERSION, CONTRACT_VERSION } from '@prism3/engine/version';
import { rgbToOklch, oklchToRgb, hex as rgbHex, hexToRgb, contrast } from '@prism3/engine/color';
// The Figma file taxonomy Set up file creates (pure data, no Figma API).
import { TAXONOMY } from '../../../apps/plugin/src/file-taxonomy';
import manifest from '@prism3/engine/schema/lever-manifest.json';
import examples from '@prism3/engine/schema/example-brands.json';

// The trait citations in vocabulary.ts name the briefs they came from, and one is a client brand.
// They ship inside engine notes when a personality word is on, so the mockup replaces them before
// any note is built: the Decisions log never shows a client name. (Reported as a finding.)
for (const t of Object.values(TRAITS)) (t as { why: string }).why = 'cited in packages/engine/vocabulary.ts';

(window as any).P3 = {
  brandTheme, resolvePreview, resolveAllModes, buildTree, parseDesignMd, toDesignMd,
  componentDefs, figmaVariantCount, densitySpacingStep, buttonMinWidth,
  TYPE_GROUPS, WEIGHT_ROLE_ORDER, DISPLAY_VARIANTS, weightAvailability, OPACITY_STEPS, BUILTIN_MODES,
  rgbToOklch, oklchToRgb, rgbHex, hexToRgb, contrast, TAXONOMY, TRAITS,
  ENGINE_VERSION, CONTRACT_VERSION, manifest, examples,
};
