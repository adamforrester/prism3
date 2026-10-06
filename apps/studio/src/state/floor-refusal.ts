/**
 * The contrast floor's studio sentences (owner decisions Q67 B, Q69 A, Q70 A on #2250), with no DOM and no store, so
 * the import check (`start-input.ts`) and a Node test can call them on any brand input.
 *
 * THE ENGINE'S SENTENCE IS FOR AGENTS (Q67 B). The engine refuses a `floorStep` no page ground in that mode sits on
 * (#2227, `modes.ts`), with a sentence that names the setting and the tiers. The studio shows a plainer one. Only the
 * refusal's KIND is read off the engine's message (the `surfaces.<mode>.floorStep:` key it opens with, as
 * `errorLine` reads a key); the mode's valid steps are read off the brand, built with the floor removed, never parsed
 * out of the engine's words.
 */
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import { resolveAllModes } from '@prism3/engine/modes';

export type FloorMode = 'light' | 'dark';
const FLOOR_MODES: readonly FloorMode[] = ['light', 'dark'];
const GROUND_ROLES = ['background.primary', 'background.secondary', 'background.tertiary'] as const;
const label = (mode: FloorMode): string => (mode === 'dark' ? 'Dark' : 'Light');

/** The neutral steps `mode`'s page grounds sit on, by key (`'050'`), in ramp order, read off `input` built with
 *  `surfaces.<mode>.floorStep` removed (Auto is never refused, so that build is the one the floor has to match).
 *  Also the neutral palette's name. Null when that build fails for another reason. */
export const groundStepsOf = (input: BrandInput, mode: FloorMode): { palette: string; steps: string[] } | null => {
  const b = structuredClone(input);
  delete (b.surfaces?.[mode] as { floorStep?: number } | undefined)?.floorStep;
  try {
    const t = brandTheme(b);
    const nPal = t.roleToPalette.neutral;
    const roles = (resolveAllModes(t).find((x) => x.mode === mode)?.roles ?? {}) as Record<string, { path?: string } | undefined>;
    const on = new Set(GROUND_ROLES.map((r) => (roles[r]?.path ?? '').split('.')).map((p) => {
      const i = p.indexOf('palette');
      return i >= 0 && p[i + 1] === nPal ? p[i + 2] : undefined;
    }).filter((s): s is string => !!s));
    const keys = (t.palettes.find((p) => p.palette === nPal)?.steps ?? []).map((s) => s.key);
    return { palette: nPal, steps: keys.filter((k) => on.has(k)) };
  } catch { return null; }
};

/** "050 or 100", "850, 900 or 950", "050". */
const listOf = (steps: readonly string[]): string =>
  steps.length < 2 ? (steps[0] ?? '') : `${steps.slice(0, -1).join(', ')} or ${steps[steps.length - 1]}`;

/** The studio's refusal (Q67 B, DRAFT copy): the mode, then the steps a floor can be, from the brand. */
export const floorRefusalText = (mode: FloorMode, steps: readonly string[]): string =>
  `The contrast floor has to match a page background in ${label(mode)}. ` +
  (steps.length ? `Choose ${listOf(steps)}, or return to Auto.` : `No page background in ${label(mode)} sits on a neutral step, so return to Auto.`);

/** The line under an empty floor picker (Q70 A, the owner's wording). */
export const floorNoneText = (mode: FloorMode): string =>
  `No page background in ${label(mode)} sits on a neutral step, so the floor stays Auto.`;

/** The notice when a page background moves off the floor's step and the studio resets the floor (Q69 A, DRAFT). */
export const floorResetText = (mode: FloorMode, palette: string, step: string): string =>
  `The contrast floor is back on Auto — ${palette} ${step} is no longer a page background in ${label(mode)}.`;

/** The first mode whose set `floorStep` is on none of its grounds, with its valid steps, or null. */
export const floorOffGround = (input: BrandInput): { mode: FloorMode; step: number; palette: string; steps: string[] } | null => {
  for (const mode of FLOOR_MODES) {
    const step = input.surfaces?.[mode]?.floorStep;
    if (step == null) continue;
    const g = groundStepsOf(input, mode);
    if (g && !g.steps.some((k) => Number(k) === Number(step))) return { mode, step, ...g };
  }
  return null;
};

/** What the studio says for an engine message about `input`: the plain sentence for a floor refusal, the engine's own
 *  words for anything else. */
export const studioMessage = (message: string, input: BrandInput): string => {
  const kind = /^surfaces\.(light|dark)\.floorStep:/.exec(message);
  if (!kind) return message;
  const off = floorOffGround(input);
  return off && off.mode === kind[1] ? floorRefusalText(off.mode, off.steps) : message;
};
