/**
 * A SEARCH FOR COMPONENTS SKIPS WHAT IS HIDDEN INSIDE INSTANCES (#4160).
 *
 * Figma walks every instance's subtree in a `findAllWithCriteria`, hidden layers included, unless the plugin sets
 * `figma.skipInvisibleInstanceChildren`, which Figma says can make the search "up to hundreds of times faster in large
 * documents". A master file holds thousands of instances. A component or a component set never sits inside an
 * instance, so a search whose every type is one of those two answers the same with the flag on.
 *
 * The flag is set around that one synchronous call and put back after it, never left on: with it on, reading a hidden
 * layer inside an instance throws, and the hand-edit pass (`member-baseline.ts`, `update-plan.ts`) reads those. A
 * search for any other type (an instance, a tagged frame) runs as it did, since what it finds can sit inside an
 * instance. A host with no `figma` (a Node shim without it) runs the search as given.
 */
type FlagHost = { skipInvisibleInstanceChildren?: boolean };

const COMPONENT_TYPES: ReadonlySet<string> = new Set(['COMPONENT', 'COMPONENT_SET']);

/** Whether a search for `types` can only find components or sets. */
export const onlyComponents = (types: readonly string[] | undefined): boolean => !!types?.length && types.every((t) => COMPONENT_TYPES.has(t));

/** Run `search` with Figma skipping hidden instance children, when `types` can only find components or sets. */
export const searchComponents = <T>(types: readonly string[] | undefined, search: () => T): T => {
  const host = (globalThis as { figma?: FlagHost }).figma;
  if (!host || !onlyComponents(types) || host.skipInvisibleInstanceChildren) return search();
  host.skipInvisibleInstanceChildren = true;
  try { return search(); } finally { host.skipInvisibleInstanceChildren = false; }
};
