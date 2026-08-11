/**
 * Regression tests for the directory-per-mode DTCG export layout (v2.2.0).
 *
 * Background: pre-2.2 we suffixed per-mode files (`typography-desktop.json`,
 * `typography-mobile.json`) and dropped them into a flat `tokens/` folder
 * alongside their base file. Style Dictionary's default file-glob source
 * deep-merged the per-mode files onto the same DTCG path with different
 * `$value`s, hit collisions, and crashed `flattenProperties` with
 * `RangeError: Maximum call stack size exceeded`.
 *
 * Fix: route multi-mode collections to `tokens/<mode>/<file>.json` and
 * single-mode collections to `tokens/shared/<file>.json` so the merge has
 * no overlapping paths. Single-mode-only exports stay flat
 * (`tokens/<file>.json`) — no point in a directory layer when there's
 * nothing to share with.
 *
 * See docs/known-issues/SD-PER-MODE-MERGE.md for the full incident writeup.
 */

import { describe, test, expect } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';

function makeCollection(name: string, modeNames: string[]): any {
  return {
    id: `collection-${name}`,
    name,
    defaultModeId: 'mode-0',
    modes: modeNames.map((m, i) => ({ modeId: `mode-${i}`, name: m })),
  };
}

function getVariableFileName(
  collection: any,
  modeName: string,
  hasMultiMode: boolean
): string {
  const exporter = new TokenExporter({} as any);
  const mode = collection.modes.find((m: any) => m.name === modeName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (exporter as any).getVariableFileName(collection, mode, hasMultiMode);
}

describe('getVariableFileName — directory-per-mode layout', () => {
  test('single-mode-only export stays flat (no shared/ wrapper)', () => {
    const collection = makeCollection('typography', ['Default']);
    expect(getVariableFileName(collection, 'Default', false)).toBe('typography.json');
  });

  test('mixed export: multi-mode collection → <mode>/<file>.json', () => {
    const collection = makeCollection('typography', ['Desktop', 'Mobile']);
    expect(getVariableFileName(collection, 'Desktop', true)).toBe('desktop/typography.json');
    expect(getVariableFileName(collection, 'Mobile', true)).toBe('mobile/typography.json');
  });

  test('mixed export: single-mode collection → shared/<file>.json', () => {
    const collection = makeCollection('primitives', ['Default']);
    expect(getVariableFileName(collection, 'Default', true)).toBe('shared/primitives.json');
  });

  test('mode names are kebab-cased and lowercased', () => {
    const collection = makeCollection('color', ['Brand A', 'Brand_B', 'Cool/Dark']);
    expect(getVariableFileName(collection, 'Brand A', true)).toBe('brand-a/color.json');
    expect(getVariableFileName(collection, 'Brand_B', true)).toBe('brand-b/color.json');
    expect(getVariableFileName(collection, 'Cool/Dark', true)).toBe('cool-dark/color.json');
  });

  test('collection names are kebab-cased and lowercased', () => {
    const collection = makeCollection('Core Color', ['Light']);
    expect(getVariableFileName(collection, 'Light', false)).toBe('core-color.json');

    const multi = makeCollection('Core Color', ['Light', 'Dark']);
    expect(getVariableFileName(multi, 'Light', true)).toBe('light/core-color.json');
  });

  test('no path collisions across modes for the same multi-mode collection', () => {
    const collection = makeCollection('typography', ['Desktop', 'Mobile']);
    const desktop = getVariableFileName(collection, 'Desktop', true);
    const mobile = getVariableFileName(collection, 'Mobile', true);
    expect(desktop).not.toBe(mobile);
    // Different directories, same filename — this is the whole point: SD's
    // glob picks up both, but they live in separate trees so there's no
    // merge collision on shared DTCG paths.
    expect(desktop.split('/').pop()).toBe(mobile.split('/').pop());
  });
});
