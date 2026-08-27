/**
 * Ambient globals injected into the plugin's MAIN thread by Figma at runtime (not exported by
 * `@figma/plugin-typings`). `__html__` is the bundled UI HTML string Figma substitutes from the
 * manifest's `ui` field; `__uiFiles__` is its multi-file counterpart. Main-context only.
 */
declare const __html__: string;
declare const __uiFiles__: Record<string, string>;

/**
 * Build identity (#836) — the same `--define` the iframe entry gets, now supplied to this entry too.
 *
 * DECLARED HERE RATHER THAN BY INCLUDING `apps/studio/src/prism3-host.d.ts`, which is where its sibling
 * `PRISM3_HOST` lives. That file declares both, and `PRISM3_HOST` has no define on this entry — pulling
 * it in would make a reference that compiles and throws at load, which is the exact failure mode the
 * "required build input" rule exists to prevent. It would also drag `declare module '*.css'` into a
 * context with no CSS loader. Two ambient declarations of one name in two non-overlapping tsconfigs is
 * the smaller cost; `apps/plugin/build.mjs` defines it on both entries and asserts it reached both.
 *
 * Read it through `apps/studio/src/build-identity.ts` — a pure module that compiles under this config's
 * no-DOM `lib` — not by comparing it to a literal.
 */
declare const PRISM3_BUILD: string;
