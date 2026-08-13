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

/**
 * `.css` imported as TEXT (#769). The chrome stylesheet moved out of a template literal in
 * `main.ts` into `styles.css`, and it is pulled back in as a string rather than emitted as a
 * separate asset — the bundle has to stay self-contained for the Figma plugin iframe, which ships
 * `allowedDomains:["none"]` and cannot fetch a second file.
 *
 * This declaration lives beside the two defines above for the same reason they do: it is a
 * BUILD INPUT the type system cannot see, shared by both tsconfigs that compile `apps/studio/src`
 * (`apps/studio/tsconfig.json` and `apps/plugin/tsconfig.ui.json`, which names this file
 * explicitly). The matching build-side requirement is `--loader:.css=text` on every esbuild entry
 * that bundles this directory; `styles.css`'s own header lists them.
 *
 * Typecheck alone cannot prove the loader is configured — this declaration is satisfied by a
 * bundler that emits a separate .css file just as happily. `main.ts` asserts the string at boot.
 */
declare module '*.css' {
  const css: string;
  export default css;
}
