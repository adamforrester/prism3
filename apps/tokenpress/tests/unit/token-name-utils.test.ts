import { describe, it, expect } from 'vitest';
import {
  sanitizeTokenName,
  createAliasReference,
  sanitizeFileName,
} from '../../src/utils/token-name-utils';

describe('sanitizeTokenName', () => {
  describe("'preserve' mode (default, DTCG-conformant)", () => {
    it('keeps camelCase intact — the reported bug', () => {
      expect(sanitizeTokenName('onSuccessContainer', 'preserve')).toBe('onSuccessContainer');
    });

    it('keeps camelCase intact inside a group path', () => {
      expect(sanitizeTokenName('color/onSurfaceVariant', 'preserve')).toBe(
        'color/onSurfaceVariant'
      );
    });

    it('keeps PascalCase and uppercase acronyms intact', () => {
      expect(sanitizeTokenName('Brand/BorderRadius', 'preserve')).toBe('Brand/BorderRadius');
      expect(sanitizeTokenName('spacing/2XL', 'preserve')).toBe('spacing/2XL');
    });

    it('defaults to preserve when no mode is passed', () => {
      expect(sanitizeTokenName('onSuccessContainer')).toBe('onSuccessContainer');
    });

    it('still collapses spaces and unsafe characters to hyphens', () => {
      expect(sanitizeTokenName('color/On Success', 'preserve')).toBe('color/On-Success');
      expect(sanitizeTokenName('color/brand+accent', 'preserve')).toBe('color/brand-accent');
    });

    it('leaves already-hyphenated names untouched', () => {
      expect(sanitizeTokenName('color/on-success-container', 'preserve')).toBe(
        'color/on-success-container'
      );
    });
  });

  describe("'kebab' mode (true kebab-case)", () => {
    it('splits camelCase humps into hyphenated words', () => {
      expect(sanitizeTokenName('onSuccessContainer', 'kebab')).toBe('on-success-container');
    });

    it('splits humps within a group path', () => {
      expect(sanitizeTokenName('color/onSurfaceVariant', 'kebab')).toBe(
        'color/on-surface-variant'
      );
    });

    it('handles PascalCase', () => {
      expect(sanitizeTokenName('BorderRadius', 'kebab')).toBe('border-radius');
    });

    it('handles acronym boundaries', () => {
      expect(sanitizeTokenName('parseHTMLValue', 'kebab')).toBe('parse-html-value');
    });

    it('separates trailing digits/size suffixes', () => {
      expect(sanitizeTokenName('spacing/2XL', 'kebab')).toBe('spacing/2-xl');
      expect(sanitizeTokenName('size/scale2', 'kebab')).toBe('size/scale-2');
    });

    it('is idempotent on already-kebab names', () => {
      expect(sanitizeTokenName('color/on-success-container', 'kebab')).toBe(
        'color/on-success-container'
      );
    });
  });

  describe("'lower' mode (legacy pre-3.0 behaviour)", () => {
    it('flattens camelCase, reproducing the old output exactly', () => {
      expect(sanitizeTokenName('onSuccessContainer', 'lower')).toBe('onsuccesscontainer');
      expect(sanitizeTokenName('color/onSurfaceVariant', 'lower')).toBe(
        'color/onsurfacevariant'
      );
      expect(sanitizeTokenName('spacing/2XL', 'lower')).toBe('spacing/2xl');
    });

    it('leaves already-hyphenated names untouched', () => {
      expect(sanitizeTokenName('color/on-success', 'lower')).toBe('color/on-success');
    });
  });

  describe('DTCG structural rules (all modes)', () => {
    it('strips the reserved leading "$"', () => {
      expect(sanitizeTokenName('$value', 'preserve')).toBe('value');
      expect(sanitizeTokenName('$type/foo', 'preserve')).toBe('type/foo');
    });

    it('removes curly braces, which are alias delimiters', () => {
      expect(sanitizeTokenName('color/{primary}', 'preserve')).toBe('color/primary');
    });

    it('removes periods, which are the path separator', () => {
      expect(sanitizeTokenName('color/brand.accent', 'preserve')).toBe('color/brand-accent');
    });

    it('drops empty path segments rather than emitting "" group keys', () => {
      expect(sanitizeTokenName('color//primary', 'preserve')).toBe('color/primary');
      expect(sanitizeTokenName('color/primary/', 'preserve')).toBe('color/primary');
      expect(sanitizeTokenName('color/!!!/primary', 'preserve')).toBe('color/primary');
    });

    it('preserves group depth for ordinary nested names', () => {
      expect(sanitizeTokenName('a/b/c/d', 'preserve')).toBe('a/b/c/d');
    });
  });
});

describe('createAliasReference', () => {
  it('builds a dot-delimited alias with case preserved', () => {
    expect(createAliasReference('color/onSuccessContainer', 'preserve')).toBe(
      '{color.onSuccessContainer}'
    );
  });

  it('builds a kebab alias', () => {
    expect(createAliasReference('color/onSuccessContainer', 'kebab')).toBe(
      '{color.on-success-container}'
    );
  });

  it('builds a legacy lowercase alias', () => {
    expect(createAliasReference('color/onSuccessContainer', 'lower')).toBe(
      '{color.onsuccesscontainer}'
    );
  });

  it('produces an alias whose path matches the emitted token path', () => {
    // The invariant that makes aliases resolvable: the reference text must be
    // exactly the token path with "/" swapped for ".".
    const name = 'brand/colorSet/onSurfaceVariant';
    const path = sanitizeTokenName(name, 'preserve');
    expect(createAliasReference(name, 'preserve')).toBe(`{${path.replace(/\//g, '.')}}`);
  });

  describe('namespace', () => {
    // The exporter wraps each file's tokens under the namespace as a root key
    // AFTER conversion, so an alias built from the bare variable name resolves
    // one level too high. Regression coverage for #61.
    it('prefixes the alias so it resolves through the root wrapper', () => {
      expect(createAliasReference('palette/neutral/950', 'preserve', 'nbds')).toBe(
        '{nbds.palette.neutral.950}'
      );
    });

    it('is a no-op when no namespace is configured', () => {
      expect(createAliasReference('palette/neutral/950', 'preserve')).toBe(
        '{palette.neutral.950}'
      );
      expect(createAliasReference('palette/neutral/950', 'preserve', '')).toBe(
        '{palette.neutral.950}'
      );
    });

    it('does not double-prefix a name that already carries the namespace', () => {
      // These files keep their own root key and the wrapper is skipped, so the
      // path is already correct.
      expect(createAliasReference('nbds/palette/blue', 'preserve', 'nbds')).toBe(
        '{nbds.palette.blue}'
      );
    });

    it('does not treat a namespace-prefixed substring as already prefixed', () => {
      // "nbdsExtra" starts with "nbds" but is a different group, so it must
      // still be namespaced. Guards against a naive startsWith check.
      expect(createAliasReference('nbdsExtra/blue', 'preserve', 'nbds')).toBe(
        '{nbds.nbdsExtra.blue}'
      );
    });

    it('namespaces a single-segment name', () => {
      expect(createAliasReference('radius', 'preserve', 'nbds')).toBe('{nbds.radius}');
    });

    it('handles a name equal to the namespace itself', () => {
      expect(createAliasReference('nbds', 'preserve', 'nbds')).toBe('{nbds}');
    });

    it('sanitizes the namespace, matching the wrapper root key', () => {
      // The namespace is a root key AND a leading alias segment, so it must
      // satisfy the same structural rules as a token name. applyNamespaceIfNeeded
      // sanitizes identically, so the two sides agree. Casing is left alone —
      // the namespace is a literal the user typed, not a Figma name.
      expect(createAliasReference('color/bg', 'preserve', 'My Brand')).toBe(
        '{My-Brand.color.bg}'
      );
    });

    it('collapses a namespace containing DTCG-structural characters', () => {
      // "." and "/" would otherwise split the alias into extra path segments
      // that the single-key wrapper never creates.
      expect(createAliasReference('color/bg', 'preserve', 'a.b')).toBe('{a-b.color.bg}');
      expect(createAliasReference('color/bg', 'preserve', 'nbds/core')).toBe(
        '{nbds-core.color.bg}'
      );
    });

    it('composes with each casing mode', () => {
      expect(createAliasReference('color/onSuccess', 'kebab', 'nbds')).toBe(
        '{nbds.color.on-success}'
      );
      expect(createAliasReference('color/onSuccess', 'lower', 'nbds')).toBe(
        '{nbds.color.onsuccess}'
      );
    });
  });
});

describe('sanitizeFileName', () => {
  it('always lowercases regardless of token-name mode', () => {
    expect(sanitizeFileName('BrandTheme')).toBe('brandtheme');
    expect(sanitizeFileName('Grids & Layouts')).toBe('grids-layouts');
  });
});
