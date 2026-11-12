/**
 * The plugin adapter for the file facts scan (#2075 part 1): builds the engine's `FactsSource` from the open file and
 * runs `scanFileFacts` over it. Main thread only (`figma.*`). Read-only: it loads each page (required under
 * `documentAccess: dynamic-page` before a page's children can be read) and reads; it writes nothing.
 *
 * Figma's own objects satisfy the engine's structural types, so nothing is copied: the local lists are the host's
 * arrays, the pages are the host's page nodes, and the four lookups call the host's async getters. Nothing calls this
 * yet. Where the report surfaces (an agent-link read command, an export, the start screen) is the owner's call
 * (#2075's part 3 and the agent-link protocol), so this lands as a function and a test, not a message.
 *
 * `FactsHost` is the slice of `PluginAPI` this reads, so the global `figma` passes with no cast and a test passes a
 * shim (`file-shim.ts`'s `FileShim` and `NodeShim`).
 */
import { scanFileFacts, type FactsComponent, type FactsStyle, type FactsNode, type FactsPage, type FactsSource, type FileFactsReport, type TextRun } from '../../../packages/engine/file-facts';

type Page = FactsPage & { loadAsync?: () => Promise<void> };
type MainLike = { id: string; name: string; key?: string; remote?: boolean; parent?: { type: string; name: string; key?: string } | null } | null;

export type FactsHost = {
  variables: {
    getLocalVariableCollectionsAsync(): Promise<FactsSource['collections']>;
    getLocalVariablesAsync(): Promise<FactsSource['variables']>;
    getVariableByIdAsync(id: string): Promise<FactsSource['variables'][number] | null>;
    getVariableCollectionByIdAsync(id: string): Promise<FactsSource['collections'][number] | null>;
  };
  getLocalPaintStylesAsync(): Promise<readonly FactsStyle[]>;
  getLocalTextStylesAsync(): Promise<readonly FactsStyle[]>;
  getLocalEffectStylesAsync(): Promise<readonly FactsStyle[]>;
  getLocalGridStylesAsync(): Promise<readonly FactsStyle[]>;
  getStyleByIdAsync(id: string): Promise<FactsStyle | null>;
  root: { children: readonly Page[] };
};

/** The fields a mixed text layer's runs are read for; the same names the engine's `TextRun` carries. */
const RUN_FIELDS = ['fontName', 'fontWeight', 'fontSize', 'lineHeight', 'fills', 'fillStyleId', 'textStyleId', 'boundVariables'] as const;

export async function figmaFactsSource(host: FactsHost): Promise<FactsSource> {
  const pages = host.root.children;
  for (const p of pages) if (typeof p.loadAsync === 'function') await p.loadAsync();
  const [collections, variables, paint, text, effect, grid] = await Promise.all([
    host.variables.getLocalVariableCollectionsAsync(),
    host.variables.getLocalVariablesAsync(),
    host.getLocalPaintStylesAsync(),
    host.getLocalTextStylesAsync(),
    host.getLocalEffectStylesAsync(),
    host.getLocalGridStylesAsync(),
  ]);
  return {
    collections, variables, styles: { paint, text, effect, grid }, pages,
    variableById: (id) => host.variables.getVariableByIdAsync(id),
    collectionById: (id) => host.variables.getVariableCollectionByIdAsync(id),
    styleById: (id) => host.getStyleByIdAsync(id),
    mainComponent: async (node: FactsNode): Promise<FactsComponent | null> => {
      const get = (node as { getMainComponentAsync?: () => Promise<MainLike> }).getMainComponentAsync;
      const main = typeof get === 'function' ? await get.call(node) : null;
      if (!main) return null;
      const set = main.parent && main.parent.type === 'COMPONENT_SET' ? main.parent : null;
      return { id: main.id, name: main.name, key: main.key, remote: !!main.remote, ...(set ? { setName: set.name, setKey: set.key } : {}) };
    },
    textRuns: (node: FactsNode): readonly TextRun[] | null => {
      const get = (node as { getStyledTextSegments?: (f: readonly string[]) => readonly TextRun[] }).getStyledTextSegments;
      return typeof get === 'function' ? get.call(node, RUN_FIELDS) : null;
    },
  };
}

/** Scan the open file. `figma` passes as the host. */
export async function scanOpenFile(host: FactsHost): Promise<FileFactsReport> {
  return scanFileFacts(await figmaFactsSource(host));
}

/** Compile-time proof that the global `figma` is a `FactsHost` with no cast; never called. */
export const scanFigma = (): Promise<FileFactsReport> => scanOpenFile(figma);
