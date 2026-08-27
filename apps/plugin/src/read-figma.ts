/**
 * Prism3 Figma plugin — the MAIN-THREAD read adapter (docs/22 Phase 4 / #109).
 *
 * The inverse of `write-figma.ts`'s `applyWritePlan`: reads the current file's `core` +
 * `color.appearance` collections back out of `figma.variables.*` into a host-neutral `ReadbackSnapshot`
 * (engine `read-back.ts`). Two uses: (a) seed the shared UI from an existing themed file at #110,
 * and (b) feed the pure `verifyReadback` so the materialisation contract can be checked live.
 *
 * A COLLECTION NO LONGER IDENTIFIES AN AXIS (#1097). The palette, dimension and font primitives share
 * one `core` collection, so every partition below is by AXIS KEY — a collection name, or `core/<group>`
 * for one slice of it — resolved through the engine's `figma-names.ts`. Reading `core` wholesale would
 * put 38 dimension and 39 font variables into `snapshot.palette`, flip `primitivesHidden` on whichever
 * group happened to be unhidden, and make every float alias resolve against font names. And nothing here
 * spells a brand root: the un-merge is positional, so it holds for a client namespace we have never seen.
 *
 * Uses the async getters required under `documentAccess:"dynamic-page"`
 * (`getLocalVariableCollectionsAsync` / `getLocalVariablesAsync`) — the same ones `applyWritePlan`
 * proved live in #108. Alias values are resolved to the TARGET VARIABLE'S NAME (via an id→name map
 * over all vars), so the snapshot is pure, serialisable, and diffable against the write-side plan.
 *
 * Compiled under `tsconfig.main.json` — has `figma.*`, NO `document`. Shares the minimal
 * `VariablesApi` port with the write executor, so it's unit-testable against the same in-memory
 * shim (see `apps/plugin/test-readback.ts`).
 */
import type { ReadbackSnapshot, ReadValue } from '@prism3/engine/read-back';
import { axisSource, inAxis } from '@prism3/engine/figma-names';
import type { VariablesApi, VariableAlias, ReadVarValue } from './write-figma';

/** The minimal styles-read surface (shadow/gradient + typography lanes) — the style-name getters.
 *  `figma` structurally satisfies it; passing it is optional so the colour/FLOAT read stays standalone.
 *  `getLocalTextStylesAsync` is optional so a pre-#237 caller (styles only) still satisfies the port. */
export interface StylesReadApi {
  getLocalEffectStylesAsync(): Promise<{ name: string }[]>;
  /** `paints` is read for the #236 stop-binding check. Typed loosely (`readonly unknown[]`) because
   *  Figma's `PaintStyle.paints` is a `readonly Paint[]` union far wider than gradients — the reader
   *  narrows what it needs and ignores the rest, which is what keeps the real `figma` satisfying this. */
  getLocalPaintStylesAsync(): Promise<{ name: string; paints?: readonly unknown[] }[]>;
  getLocalTextStylesAsync?(): Promise<{ name: string }[]>;
}

const isAlias = (v: ReadVarValue): v is VariableAlias =>
  typeof v === 'object' && v !== null && (v as VariableAlias).type === 'VARIABLE_ALIAS';
const isRgb = (v: ReadVarValue): v is { r: number; g: number; b: number; a?: number } =>
  typeof v === 'object' && v !== null && 'r' in v;

/**
 * Read the live colour variables into a `ReadbackSnapshot`. Only the two colour axes (`core/palette` +
 * `color.appearance`) are read — the scope this lane materialises. Vars in other collections, and in the
 * other groups of the `core` collection, are ignored here and read by their own axis below. An alias whose
 * target var can't be found is surfaced as `{ alias: null }` rather than a fabricated name, so
 * `verifyReadback`'s dangling-alias check stays honest.
 *
 * `color.appearance` and not `color` since #1013 — the value tier is what `verifyReadback` checks, and
 * it is the tier that carries the appearance modes and the palette aliases. The alias tier that took the
 * short name is still unread here, which is the pre-existing hole the swap relocated rather than opened;
 * see `read-back.ts`'s header.
 */
export const readFigmaVariables = async (vars: VariablesApi, styles?: StylesReadApi): Promise<ReadbackSnapshot> => {
  const collections = await vars.getLocalVariableCollectionsAsync();
  // ALL local variables (no type filter): `getLocalVariablesAsync('COLOR')` returns ONLY COLOR vars,
  // which would make the FLOAT axes (#146) read back EMPTY. We index by collection below, so the
  // unfiltered fetch serves both the colour collections and the FLOAT ones. `nameById` (alias-target
  // resolution) also needs FLOAT names now that FLOAT vars alias each other (space→dimension, etc.).
  const allVars = await vars.getLocalVariablesAsync();
  const nameById = new Map(allVars.map((v) => [v.id, v.name] as const));

  const PALETTE_AXIS = 'core/palette';
  const palCol = collections.find((c) => c.name === axisSource(PALETTE_AXIS).collection);
  const colCol = collections.find((c) => c.name === 'color.appearance');

  const inPalette = inAxis(PALETTE_AXIS);
  const palette = palCol
    ? allVars
        .filter((v) => v.variableCollectionId === palCol.id && inPalette(v.name))
        .map((v) => ({ name: v.name, scopes: v.scopes, hidden: v.hiddenFromPublishing }))
    : [];

  // modeId → mode name, so the snapshot is keyed by human mode names (light/dark/…), not Figma ids.
  const modeName = new Map((colCol?.modes ?? []).map((m) => [m.modeId, m.name] as const));
  const color = colCol
    ? allVars
        .filter((v) => v.variableCollectionId === colCol.id)
        .map((v) => {
          const valuesByMode: Record<string, ReadValue> = {};
          for (const [modeId, name] of modeName) {
            const raw = v.valuesByMode[modeId];
            if (raw === undefined) continue; // mode carries no value for this var
            if (isAlias(raw)) valuesByMode[name] = { alias: nameById.get(raw.id) ?? null };
            else if (isRgb(raw)) valuesByMode[name] = { r: raw.r, g: raw.g, b: raw.b, a: raw.a ?? 1 };
            // non-colour literals (string/number/boolean) can't occur on a COLOR var — skip defensively
          }
          return { name: v.name, scopes: v.scopes, valuesByMode };
        })
    : [];

  // FLOAT axes (#146) — the geometric/dimensional axes. Read each present one into the same per-mode
  // shape as colour (alias → target NAME, literal → the numeric value as an Rgba-less ReadValue). Keyed
  // by axis key so `verifyFloatReadback` can check presence + resolution.
  const FLOAT_AXES = ['core/dimension', 'space', 'radius', 'size', 'icon', 'control', 'border-width', 'focus', 'opacity', 'layout'];
  const float: NonNullable<ReadbackSnapshot['float']> = {};
  for (const key of FLOAT_AXES) {
    const coll = collections.find((c) => c.name === axisSource(key).collection);
    if (!coll) continue;
    const owns = inAxis(key);
    const modeNameF = new Map(coll.modes.map((m) => [m.modeId, m.name] as const));
    float[key] = allVars
      .filter((v) => v.variableCollectionId === coll.id && owns(v.name))
      .map((v) => {
        const valuesByMode: Record<string, ReadValue> = {};
        for (const [modeId, mName] of modeNameF) {
          const raw = v.valuesByMode[modeId];
          if (raw === undefined) continue;
          if (isAlias(raw)) valuesByMode[mName] = { alias: nameById.get(raw.id) ?? null };
          else if (typeof raw === 'number') valuesByMode[mName] = raw;
          // a FLOAT var can't hold RGB/string/boolean — skip defensively
        }
        return { name: v.name, scopes: v.scopes, hidden: v.hiddenFromPublishing, valuesByMode };
      });
  }

  // TYPOGRAPHY (#237) — the `core/font`/`type-sets` axes, same per-mode shape as FLOAT (family STRING
  // values are surfaced as strings; weight-role aliases → target NAME). Keyed by axis key.
  const FONT_AXES = ['core/font', 'type-sets'];
  const font: NonNullable<ReadbackSnapshot['font']> = {};
  for (const key of FONT_AXES) {
    const coll = collections.find((c) => c.name === axisSource(key).collection);
    if (!coll) continue;
    const owns = inAxis(key);
    const modeNameF = new Map(coll.modes.map((m) => [m.modeId, m.name] as const));
    font[key] = allVars
      .filter((v) => v.variableCollectionId === coll.id && owns(v.name))
      .map((v) => {
        const valuesByMode: Record<string, ReadValue> = {};
        for (const [modeId, mName] of modeNameF) {
          const raw = v.valuesByMode[modeId];
          if (raw === undefined) continue;
          if (isAlias(raw)) valuesByMode[mName] = { alias: nameById.get(raw.id) ?? null };
          else if (typeof raw === 'number') valuesByMode[mName] = raw;
          // STRING family values (`typeof raw === 'string'`) aren't surfaced in ReadValue — the
          // name-level verify only needs presence + the weight-role alias graph. Skip defensively.
        }
        return { name: v.name, scopes: v.scopes, hidden: v.hiddenFromPublishing, valuesByMode };
      });
  }

  // STYLE + TEXT-STYLE NAMES — local Effect + Paint + Text style NAMES. Name-level for effects and
  // text styles (they hold resolved values, no alias graph). Gradient stops are the exception since
  // #236: their bindings are read too, because a name tells you the style exists and nothing about
  // whether it re-themes. Only read when a styles API is supplied.
  let stylesSnap: ReadbackSnapshot['styles'] | undefined;
  let textStyles: string[] | undefined;
  if (styles) {
    const effects = (await styles.getLocalEffectStylesAsync()).map((s) => s.name);
    const paintStyles = await styles.getLocalPaintStylesAsync();
    const paints = paintStyles.map((s) => s.name);
    // Resolve each bound stop's variable ID back to its NAME, so the verdict compares names (what the
    // plan asked for) rather than IDs (which differ per file and cannot be asserted against a plan).
    // An ID we cannot resolve reads as `null` — the same honesty rule the dangling-alias read follows:
    // report the gap, never fabricate a name.
    const gradientStopBindings: Record<string, (string | null)[]> = {};
    for (const s of paintStyles) {
      const paint = (s.paints ?? [])[0] as { gradientStops?: readonly unknown[] } | undefined;
      if (!paint?.gradientStops) continue;
      gradientStopBindings[s.name] = paint.gradientStops.map((raw) => {
        const stop = raw as { boundVariables?: { color?: { id?: string } } };
        const id = stop.boundVariables?.color?.id;
        return id ? nameById.get(id) ?? null : null;
      });
    }
    stylesSnap = { effects, paints, ...(Object.keys(gradientStopBindings).length ? { gradientStopBindings } : {}) };
    if (styles.getLocalTextStylesAsync) textStyles = (await styles.getLocalTextStylesAsync()).map((s) => s.name);
  }

  return {
    collections: collections.map((c) => ({ name: c.name, modes: c.modes.map((m) => m.name) })),
    palette,
    color,
    ...(Object.keys(float).length ? { float } : {}),
    ...(Object.keys(font).length ? { font } : {}),
    ...(stylesSnap ? { styles: stylesSnap } : {}),
    ...(textStyles ? { textStyles } : {}),
  };
};
