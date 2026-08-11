/**
 * Style Dictionary 4.x / 5.x example: adding CSS font-family fallback stacks
 * to Token Press `fontFamily` tokens at build time.
 *
 * WHY THIS EXISTS
 * ---------------
 * Token Press emits `fontFamily` as a SINGLE brand family (e.g. "Inter") — the
 * family is a brand-identity token, not a rendering detail, and Figma only ever
 * carries one family per text style. But a browser needs a full stack
 * (`font-family: Inter, system-ui, sans-serif`) so text still renders while the
 * web font loads or if it fails. Fallbacks are a CSS-consumption concern, so the
 * right place to add them is a Style Dictionary transform — NOT the token.
 *
 * This example keeps the fallback lists in a small consumer-owned map
 * (FALLBACK_STACKS below). It is vendor-neutral: it works on any DTCG
 * `fontFamily` token and does not depend on any `$extensions` namespace.
 * A family with no entry in the map passes through unchanged (bare family).
 *
 * Run: `npm install` then `npm run build` (outputs build/variables.css).
 */

import StyleDictionary from 'style-dictionary';

/**
 * Consumer-owned fallback stacks, keyed by the single brand family Token Press
 * emits. Edit these to match your project's font strategy. A family with no
 * entry here passes through unchanged (just the bare family, no fallbacks).
 */
const FALLBACK_STACKS = {
  Inter: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  'Playfair Display': ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
  'JetBrains Mono': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
};

/** Wrap a family in quotes if it isn't a bare CSS identifier (whitespace,
 *  commas, or a leading digit all require quoting). */
function cssQuote(family) {
  return /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(family) ? family : `"${family}"`;
}

/**
 * Builds the full CSS font-family value: the single brand family followed by
 * its consumer-defined fallbacks. Falls back to a bare quoted family if no
 * stack is configured, so the transform is always safe to apply.
 */
function toFontFamilyStack(family) {
  const fallbacks = FALLBACK_STACKS[family] || [];
  return [family].concat(fallbacks).map(cssQuote).join(', ');
}

const sd = new StyleDictionary({
  source: ['tokens/**/*.json'],
  usesDtcg: true,
  hooks: {
    transforms: {
      // Appends the consumer's fallback stack to each single-family fontFamily
      // token. NOT transitive: Style Dictionary resolves aliases to their leaf
      // value before applying value transforms, so an aliased family
      // ({font.family.body}) is already the resolved "Inter" here and gets the
      // stack once. Making this transitive would re-run it on the alias and
      // double-wrap the already-expanded stack in quotes.
      'fontFamily/css/fallback': {
        type: 'value',
        transitive: false,
        filter: (token) => token.$type === 'fontFamily' || token.type === 'fontFamily',
        transform: (token) => {
          const value = token.$value !== undefined ? token.$value : token.value;
          return typeof value === 'string' ? toFontFamilyStack(value) : value;
        },
      },
    },
  },
  platforms: {
    css: {
      // Stock css group + our one custom transform appended.
      transforms: [
        'attribute/cti',
        'name/kebab',
        'time/seconds',
        'html/icon',
        'size/rem',
        'color/css',
        'fontFamily/css/fallback',
      ],
      buildPath: 'build/',
      // outputReferences keeps aliases as var() instead of flattening them to
      // literals. Valid positions: the top level of this config, the platform's
      // `options`, or the file's `options` (used here). A bare
      // `outputReferences` key directly on the platform object is silently
      // ignored — that's the trap.
      files: [
        {
          destination: 'variables.css',
          format: 'css/variables',
          options: { outputReferences: true },
        },
      ],
    },
  },
});

await sd.hasInitialized;
await sd.buildAllPlatforms();
