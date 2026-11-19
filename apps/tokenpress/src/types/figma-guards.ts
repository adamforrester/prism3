/**
 * Narrowing helpers for Figma's variable-value unions.
 *
 * `VariableValue` is `boolean | number | string | RGB | RGBA | VariableAlias`, and the members do
 * not share a discriminant that TypeScript can act on: `RGB` has no `type` and no `a`, so the
 * idiomatic-looking `value.type !== 'VARIABLE_ALIAS'` and `color.a !== undefined` guards are both
 * errors rather than narrowings — the property does not exist on every member to be checked.
 *
 * `isVariableAlias` is lifted verbatim from `raw-figma-exporter.ts`, where it was `private` to one
 * class while twelve other call sites in `exporter.ts` and `validator.ts` open-coded the same test
 * inline and could not narrow. The behavior is unchanged; only its reach is.
 */

/** True when a `VariableValue` is an alias reference rather than a literal. */
export const isVariableAlias = (value: unknown): value is VariableAlias =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  (value as VariableAlias).type === 'VARIABLE_ALIAS';

/** True when a Figma color carries an alpha channel. `RGB` does not; `RGBA` does. */
export const hasAlpha = (color: RGB | RGBA): color is RGBA => 'a' in color;

/**
 * A COLOR variable's composed value: a color (an alias, or a literal) laid at an opacity (a percent, or an alias to a
 * FLOAT holding one). Figma's `VariableComposedColor`; prism3's Apply Theme writes the alias-and-alias form for a
 * tinted wash (prism3 #1646, #2365). Not in `VariableValue`'s declared union in older plugin typings, so it is its own
 * shape here.
 */
export interface ComposedColor {
  color: VariableAlias | RGB | RGBA;
  opacity: number | VariableAlias;
}

/** True when a variable value is a composed color (`{ color, opacity }`) rather than a plain color or alias. */
export const isComposedColor = (value: unknown): value is ComposedColor =>
  typeof value === 'object' &&
  value !== null &&
  'color' in value &&
  'opacity' in value &&
  typeof (value as ComposedColor).color === 'object' &&
  (value as ComposedColor).color !== null;
