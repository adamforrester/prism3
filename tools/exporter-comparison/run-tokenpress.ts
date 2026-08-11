/**
 * DRIVER — runs TokenPress's REAL `TokenExporter` over adapted prism3 input, headlessly.
 *
 * Second half of the harness. `adapt-figma-emission.ts` produces Figma-shaped objects; this file
 * makes them reachable by an exporter that insists on fetching its own input, and unpacks the ZIP
 * it produces into an in-memory file map for `compare.ts` to diff.
 *
 * ── W5, THE FIFTH WORKAROUND: THERE IS NO SEAM, SO WE BECOME THE HOST ───────────────────────────
 *
 * `TokenExporter.exportToZip()` calls `this.scanner.scanAll()`, and `TokenScanner.scanAll()` calls
 * four `figma.*` APIs. There is no parameter, no injected scanner, no constructor hook. So to run
 * the exporter unmodified the ONLY option is to install a global `figma` object whose four methods
 * return the adapted arrays. That is not a testing convenience — it is the direct, executable
 * demonstration of #703's finding: the exporter's input type is the Figma host, and "no seam to pass
 * tokens in at" means the host is the seam.
 *
 * The stub is deliberately MINIMAL — exactly the four scanner reads and nothing else. It is not a
 * Figma emulator, and if the exporter ever reaches for a fifth API this throws by absence rather
 * than returning a plausible empty value.
 *
 * `__PLUGIN_VERSION__` is a bare identifier the bundler's `define` substitutes; under tsx there is no
 * bundler, so it is declared on globalThis from the real package.json — the same thing
 * `apps/tokenpress/test.ts` does, for the same reason.
 *
 * ZIP ROUND-TRIP IS UNAVOIDABLE, and it is #703's jszip finding in executable form: `exportToZip` is
 * the only public entry point, `zip` is threaded through every private exporter method, and there is
 * no intermediate file map to read instead. So the harness writes a real ZIP in memory and reads it
 * straight back. jszip is untouched.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';
import type { Adapted } from './adapt-figma-emission.ts';

const TOKENPRESS = join(import.meta.dirname, '../../apps/tokenpress');

/** The plugin's own `DEFAULT_OPTIONS` from `src/code.ts`, which is also its DTCG preset: the UI's
 *  `isSpecConformant()` accepts exactly this combination (dimensionFormat/letterSpacingFormat/
 *  durationFormat all `object`, colorFormat `dtcg`, colorSpace `srgb`). Restated here rather than
 *  imported because `code.ts` calls `figma.showUI` at module scope, so importing it would require
 *  stubbing the UI host as well — and a comparison that silently ran non-default options would be
 *  measuring the wrong thing. Kept in sync by an assertion in `compare.ts`, not by hope. */
export const DEFAULT_DTCG_OPTIONS = {
  units: 'px',
  remMultiplier: 16,
  colorFormat: 'dtcg',
  colorSpace: 'srgb',
  lineHeightOutput: 'ratio',
  letterSpacingUnits: 'px',
  dimensionFormat: 'object',
  letterSpacingFormat: 'object',
  durationFormat: 'object',
  tokenNameCase: 'preserve',
  includeFigmaExtensions: true,
  formatCss: false,
  formatRawFigma: false,
  formatDotNotation: false,
  excludedCollections: [] as string[],
} as const;

/** W5 — install the four scanner reads and nothing more. */
const installFigmaStub = (a: Adapted): void => {
  (globalThis as Record<string, unknown>).figma = {
    variables: {
      getLocalVariableCollectionsAsync: async () => a.collections,
      getLocalVariablesAsync: async () => a.variables,
    },
    getLocalTextStylesAsync: async () => a.textStyles,
    getLocalEffectStylesAsync: async () => a.effectStyles,
  };
};

const installPluginVersion = (): string => {
  const pkg = JSON.parse(readFileSync(join(TOKENPRESS, 'package.json'), 'utf8')) as {
    version: string;
  };
  (globalThis as Record<string, unknown>).__PLUGIN_VERSION__ = pkg.version;
  return pkg.version;
};

export type TokenPressOutput = {
  /** ZIP entry path -> parsed JSON. */
  files: Map<string, unknown>;
  /** Entry paths in the order the exporter wrote them. */
  order: string[];
  version: string;
  skippedBlurStyles: string[];
  /** Anything the exporter logged to console.warn/error while running — its own complaints. */
  complaints: string[];
};

export const runTokenPress = async (
  a: Adapted,
  options: Record<string, unknown> = DEFAULT_DTCG_OPTIONS
): Promise<TokenPressOutput> => {
  const version = installPluginVersion();
  installFigmaStub(a);

  // The exporter narrates progress and warns about oversized files on stdout. Captured rather than
  // muted: a warning it emits IS a finding about the input, and it is reported with the diff.
  const complaints: string[] = [];
  const realWarn = console.warn;
  const realError = console.error;
  const realLog = console.log;
  console.warn = (...args: unknown[]) => complaints.push(`warn: ${args.join(' ')}`);
  console.error = (...args: unknown[]) => complaints.push(`error: ${args.join(' ')}`);
  console.log = () => {};

  let zipBuffer: ArrayBuffer;
  let skippedBlurStyles: string[];
  try {
    // Imported here, after the stub is installed: `exporter.ts` itself is host-free at module scope,
    // but importing before the stub would leave a window where a future module-scope read fails
    // confusingly rather than at the call it belongs to.
    const { TokenExporter } = await import('../../apps/tokenpress/src/plugin/exporter.ts');
    const exporter = new TokenExporter(options as never);
    zipBuffer = await exporter.exportToZip();
    skippedBlurStyles = exporter.getSkippedBlurStyles();
  } finally {
    console.warn = realWarn;
    console.error = realError;
    console.log = realLog;
  }

  const zip = await JSZip.loadAsync(zipBuffer);
  const files = new Map<string, unknown>();
  const order: string[] = [];
  for (const path of Object.keys(zip.files)) {
    const entry = zip.files[path];
    if (entry.dir) continue;
    order.push(path);
    files.set(path, JSON.parse(await entry.async('string')));
  }

  return { files, order, version, skippedBlurStyles, complaints };
};
