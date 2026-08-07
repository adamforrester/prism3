/**
 * Build-time host discriminant (docs/22 #110). Substituted by esbuild `--define` at bundle time:
 *   • web build   → defaults to `'web'` (no --define needed; see the fallback below)
 *   • plugin build → `--define:PRISM3_HOST='"figma"'`
 *
 * Declared as an ambient const so both the web tsconfig and the plugin's ui-context tsconfig
 * typecheck the shared `apps/studio/src` UI. `makeWriteHost` / `hostCommit` branch on it, and esbuild
 * dead-code-eliminates the unused host's branch — so the "one UI, no fork" bundle never ships
 * the other host's code.
 */
declare const PRISM3_HOST: 'web' | 'figma';

/**
 * Build identity (#474). The commit the live bundle was built from, or `'local'` when it was not
 * built by the deploy. Every esbuild entry point that bundles `apps/studio/src` MUST define it — a `define`
 * that is merely absent leaves a bare identifier in the output and throws at load, so this is not a
 * value with a fallback; it is a required build input.
 *
 * It exists because `/dist/main.js` is served from an invariant URL: nothing about the page told you
 * which build you were looking at, so "did it deploy?" could only be answered by rebuilding locally
 * and diffing rendered pixels. That happened, for a change that had in fact shipped correctly.
 */
declare const PRISM3_BUILD: string;
