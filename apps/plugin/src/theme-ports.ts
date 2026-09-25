/**
 * The host → executor-port adapters for an Apply Theme, shared by the plugin's sequence (`apply-theme.ts`)
 * and the MCP paste runtime (`mcp-steps.ts`) — #111 / #1553.
 *
 * ONE PLACE THAT BINDS THE HOST, because the two drivers must hand each executor the same port. Before the
 * paste harness existed these bindings were inline in `main.ts`; a second copy in the runtime would be a
 * second place for a `.bind` to go missing, and a port that loses its `this` fails only on the real host,
 * never in a shim. Kept in its own module (no engine imports) so the runtime bundle does not pull in the
 * plan builders `apply-theme.ts` needs.
 *
 * Compiled under `tsconfig.main.json` (plugin-typings, no `dom`).
 */
import type { VariablesApi, VarCollection } from './write-figma';
import type { StylesApi } from './write-styles';
import type { GridStylesApi } from './write-grid-styles';
import type { TextStylesApi } from './write-text-styles';
import type { PreflightApi } from './preflight';
import type { FontPreloadApi } from './preload-fonts';
import type { SharedDataPort } from './persist-figma';

/**
 * The slice of `figma` the write sequence touches. The global satisfies it structurally — `main.ts` passes
 * `figma` and that call site is what proves the port on every typecheck, the same way the executors' own
 * ports are proven.
 */
export type ThemeHost = {
  // FIRST in the intersection, and the pre-flight's reader first inside it, because an intersection of
  // function types is an overload list: a bare call resolves to the first member (the pre-flight's, which
  // types `resolvedType`), while `.bind` resolves to the last (the variable port's, for the text executor).
  variables: { getLocalVariablesAsync: PreflightApi['getLocalVariablesAsync'] } & VariablesApi & {
    getLocalVariableCollectionsAsync(): Promise<VarCollection[]>;
  };
} & StylesApi & GridStylesApi & {
  getLocalTextStylesAsync: TextStylesApi['getLocalTextStylesAsync'] & PreflightApi['getLocalTextStylesAsync'];
  createTextStyle: TextStylesApi['createTextStyle'];
  loadFontAsync: TextStylesApi['loadFontAsync'];
  listAvailableFontsAsync(): ReturnType<NonNullable<TextStylesApi['listAvailableFontsAsync']>>;
  getLocalEffectStylesAsync: StylesApi['getLocalEffectStylesAsync'] & PreflightApi['getLocalEffectStylesAsync'];
  getLocalPaintStylesAsync: StylesApi['getLocalPaintStylesAsync'] & PreflightApi['getLocalPaintStylesAsync'];
  getLocalGridStylesAsync: GridStylesApi['getLocalGridStylesAsync'] & PreflightApi['getLocalGridStylesAsync'];
  root: SharedDataPort;
};

/** The font preload's port (#680). */
export const fontPreloadApiOf = (host: ThemeHost): FontPreloadApi => ({
  getLocalTextStylesAsync: host.getLocalTextStylesAsync.bind(host),
  loadFontAsync: host.loadFontAsync.bind(host),
  listAvailableFontsAsync: host.listAvailableFontsAsync.bind(host),
});

/** The pre-flight's read-only port (#506). */
export const preflightApiOf = (host: ThemeHost): PreflightApi => ({
  getLocalVariableCollectionsAsync: () => host.variables.getLocalVariableCollectionsAsync(),
  getLocalVariablesAsync: () => host.variables.getLocalVariablesAsync(),
  getLocalEffectStylesAsync: () => host.getLocalEffectStylesAsync(),
  getLocalPaintStylesAsync: () => host.getLocalPaintStylesAsync(),
  getLocalGridStylesAsync: () => host.getLocalGridStylesAsync(),
  getLocalTextStylesAsync: () => host.getLocalTextStylesAsync(),
  root: host.root,
});

/** The Text Style executor's port (#237): figma's style/font surface + figma.variables' getter. */
export const textApiOf = (host: ThemeHost): TextStylesApi => ({
  getLocalTextStylesAsync: host.getLocalTextStylesAsync.bind(host),
  createTextStyle: host.createTextStyle.bind(host),
  loadFontAsync: host.loadFontAsync.bind(host),
  getLocalVariablesAsync: host.variables.getLocalVariablesAsync.bind(host.variables),
  // #499: the real (family, style) pairs, so the executor can correct the engine's per-weight
  // style-name guess against what each family actually spells it.
  listAvailableFontsAsync: host.listAvailableFontsAsync.bind(host),
});
