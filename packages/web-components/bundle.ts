/**
 * Bundles an element source (a committed `p3-*.js`, or a check's in-memory mutant of it) with Lit into one
 * classic script a Playwright page can load. Used by `check-parity.ts` and `check-browser.ts` only; the package itself
 * ships unbundled ES modules that import `lit` by name.
 */
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ELEMENT_SOURCE = readFileSync(resolve(HERE, 'p3-button.js'), 'utf8');
/** A committed element's source by file name (`p3-text-field.js`, …). */
export const sourceOf = (file: string): string => readFileSync(resolve(HERE, file), 'utf8');

export const bundle = async (source: string = ELEMENT_SOURCE, file = 'p3-button.js'): Promise<string> => {
  const r = await build({
    stdin: { contents: source, resolveDir: HERE, sourcefile: file, loader: 'js' },
    bundle: true, write: false, format: 'iife', target: 'es2022', logLevel: 'silent',
  });
  return r.outputFiles[0].text;
};
