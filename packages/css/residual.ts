/**
 * THE RESIDUAL: the two facts @prism3/css still reads from the engine's TypeScript defs, because the emission does
 * not carry them yet. Everything else comes from emitted files (Q142 A, #3506, #3839). This is the ONLY file in the
 * package that may import `@prism3/engine`; `generate.ts --check` fails if another one does, or if this file grows a
 * third export.
 *
 *   - `hitTargetFloor(size)`: the button def's `size.<size>.hit-target` binding (Q-HT1 A: `space.300` at small,
 *     `space.550` at medium and large). Bound in the def's `tokens` by #3835, after Q142 A was decided, and not in the
 *     list #3839 emitted.
 *   - `pendingReplacement()`: the button's pending spinner rule, `anatomy.parts.spinner.replaces` and
 *     `overlaysWhenAbsent`. #3506 listed it; #3839 left it out because Q142 A did not name it.
 *
 * Getting both into `specs.json` is an engine change on `main`, filed as #3917 (OWNER DECISION in the journal's "Refresh 3" entry).
 * When it lands, this file is deleted and the two callers read the emission.
 */
import { button } from '@prism3/engine/components/index';

const tok = button.tokens as Record<string, string>;

/** The button def's hit-target floor token at one size. */
export const hitTargetFloor = (size: string): string => {
  const t = tok[`size.${size}.hit-target`];
  if (!t) throw new Error(`the button def binds no size.${size}.hit-target`);
  return t;
};

/** The pending spinner's replacement rule: the visual cells it takes, in order, and the part it overlays when none. */
export const pendingReplacement = (): { replaces: string[]; overlaysWhenAbsent: string } => {
  const sp = (button.anatomy.parts as any).spinner;
  if (!Array.isArray(sp?.replaces) || typeof sp.overlaysWhenAbsent !== 'string') throw new Error('the button\'s spinner part no longer states replaces and overlaysWhenAbsent');
  return { replaces: sp.replaces, overlaysWhenAbsent: sp.overlaysWhenAbsent };
};
