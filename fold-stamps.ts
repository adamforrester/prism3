/**
 * The fold's RENAME STAMPS step (#1816), split out of `fold.ts` only so `test.ts` can drive it: `fold.ts`
 * runs on import, this does not.
 *
 * A rename rule's `since` names the `ENGINE_VERSION` whose code made the rename. Since #1807 a PR cannot
 * know that number, so it writes the quoted placeholder as the stamp, in the rule's table and in
 * `test.ts`'s literal table for it, and the fold replaces every quoted placeholder in these three files
 * with the version it assigns. Only the QUOTED form, a whole string literal, is replaced: the bare
 * placeholder in a comment explaining the convention stays as written.
 *
 * `lint-emission-version.ts` checks the result through `packages/engine/rename-stamp-audit.ts`, which
 * restates the file list, the placeholder and the parse rather than importing them from here (docs/34
 * shape 2). Do not route one through the other.
 */
export const STAMP_FILES = [
  'packages/engine/materialization-renames.ts',
  'packages/engine/rename-map.ts',
  'packages/engine/test.ts',
] as const;

const QUOTED_PLACEHOLDER = /'\{\{ENGINE_VERSION\}\}'/g;

/** Replace every quoted placeholder in `src` with `version`, quoted. Returns the count it replaced. */
export const fillStamps = (src: string, version: string): { out: string; count: number } => {
  let count = 0;
  const out = src.replace(QUOTED_PLACEHOLDER, () => {
    count++;
    return `'${version}'`;
  });
  return { out, count };
};
