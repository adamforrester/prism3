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
