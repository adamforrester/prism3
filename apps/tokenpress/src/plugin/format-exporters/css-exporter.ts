/**
 * CSS format exporter.
 * Converts DTCG tokens to CSS custom properties.
 */

import { DTCGToken, DTCGFile, DTCGShadowLayer } from '../../types/dtcg';
import { FormatOptions, PlatformExport, TokenTransformer } from '../../types/export-formats';
import { BaseFormatExporter } from './base-exporter';

/**
 * Converts a DTCG token path into a CSS custom-property name.
 *
 * This is the SINGLE source of truth for CSS identifiers, used by both the
 * declaration side (`--x:`) and the reference side (`var(--x)`). The two must
 * agree exactly or every aliased token emits a dangling `var()`.
 *
 * They previously diverged: declarations went through `sanitizeName`, which
 * lowercases, while references only swapped "." for "-" with no case handling.
 * That was invisible while token names were lowercased upstream, and broke the
 * moment names began preserving their original case. Splitting camelCase humps
 * (rather than flattening them) also matches what Style Dictionary's stock
 * `name/cti/kebab` transform produces, so the two pipelines agree.
 *
 * Accepts either a "." -delimited DTCG path or an alias's inner text.
 */
export function toCSSVariableName(tokenPath: string, prefix: string = ''): string {
  const kebab = tokenPath
    .replace(/[.]/g, '-')
    // camelCase / PascalCase humps -> word boundaries
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    // acronym followed by a capitalised word: "HTMLValue" -> "HTML-Value"
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
    // collapse anything unsafe in a custom-property ident
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${prefix}${kebab}`;
}

/**
 * CSS Token Transformer
 * Handles conversion of DTCG tokens to CSS values
 */
export class CSSTokenTransformer implements TokenTransformer {
  /**
   * Prefix applied to emitted custom-property names. Must match the prefix the
   * exporter uses for declarations, or `var()` references won't resolve.
   */
  private prefix: string = '';

  setPrefix(prefix: string): void {
    this.prefix = prefix || '';
  }

  /**
   * Turns a DTCG alias's inner text into a matching `var()` reference.
   */
  private aliasToVar(aliasInner: string): string {
    return `var(--${toCSSVariableName(aliasInner, this.prefix)})`;
  }

  transformColor(token: DTCGToken, path: string): string {
    const value = token.$value as any;

    if (typeof value === 'string' && value.startsWith('{')) {
      // This is a reference, return as CSS custom property
      return this.aliasToVar(value.slice(1, -1));
    }

    if (value.colorSpace === 'srgb') {
      const [r, g, b] = value.components;
      const rgb = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];

      if (value.alpha !== undefined && value.alpha < 1) {
        return `rgba(${rgb.join(', ')}, ${value.alpha})`;
      } else {
        return `rgb(${rgb.join(', ')})`;
      }
    }

    return String(value);
  }

  transformDimension(token: DTCGToken, path: string): string {
    const value = token.$value as any;

    // Three shapes are supported:
    //   1. DTCG alias: '{path.to.token}' → resolve to var()
    //   2. SD-preset string: '4px' / '0.5rem' → pass through
    //   3. DTCG dimension object: { value, unit } → stringify
    if (typeof value === 'string') {
      if (value.startsWith('{') && value.endsWith('}')) {
        return this.aliasToVar(value.slice(1, -1));
      }
      return value;
    }

    if (typeof value === 'object' && value !== null && value.value !== undefined) {
      return `${value.value}${value.unit || 'px'}`;
    }

    return String(value);
  }

  transformTypography(token: DTCGToken, path: string): string {
    // Typography composites don't have a direct CSS equivalent
    // This method is not used for the expanded approach
    // Individual properties are handled in the exporter
    return `/* Typography composite - see individual properties */`;
  }

  /**
   * Transform individual typography properties to CSS values
   */
  transformTypographyProperty(value: any, propertyName: string): string {
    // Handle references
    if (typeof value === 'string' && value.startsWith('{')) {
      return this.aliasToVar(value.slice(1, -1));
    }

    // Handle dimension objects (fontSize, letterSpacing)
    if (typeof value === 'object' && value !== null && value.value !== undefined) {
      return `${value.value}${value.unit || 'px'}`;
    }

    // Handle plain values
    return String(value);
  }

  transformShadow(token: DTCGToken, path: string): string {
    const value = token.$value as any;

    if (Array.isArray(value)) {
      // Multiple shadow layers
      return value.map(layer => this.formatShadowLayer(layer)).join(', ');
    } else {
      // Single shadow layer
      return this.formatShadowLayer(value);
    }
  }

  transformGeneric(token: DTCGToken, path: string, type: string): string {
    const value = token.$value;

    if (typeof value === 'string' && value.startsWith('{')) {
      return this.aliasToVar(value.slice(1, -1));
    }

    // Handle objects (dimension, etc.) by stringifying
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private formatShadowLayer(layer: DTCGShadowLayer): string {
    const parts = [];

    if (layer.inset) {
      parts.push('inset');
    }

    // Shadow dimensions can be DTCGDimension objects (the spec default) or
    // CSS strings (Style Dictionary preset). Format helper handles both.
    parts.push(this.formatShadowDimension(layer.offsetX));
    parts.push(this.formatShadowDimension(layer.offsetY));
    parts.push(this.formatShadowDimension(layer.blur));

    if (layer.spread) {
      parts.push(this.formatShadowDimension(layer.spread));
    }

    if (layer.color) {
      // Convert DTCG color object to CSS color string
      const color = layer.color;
      if (typeof color === 'string') {
        parts.push(color);
      } else if (color.colorSpace === 'srgb') {
        const [r, g, b] = color.components;
        const rgb = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];

        if (color.alpha !== undefined && color.alpha < 1) {
          parts.push(`rgba(${rgb.join(', ')}, ${color.alpha})`);
        } else {
          parts.push(`rgb(${rgb.join(', ')})`);
        }
      }
    }

    return parts.join(' ');
  }

  /**
   * Format a single shadow dimension for the CSS shorthand. Handles three
   * cases: DTCGDimension object, CSS-string ('4px'), or DTCG alias
   * ('{shadow.offset}'). Aliases get var() resolution; strings pass through;
   * objects are stringified as `${value}${unit}`.
   */
  private formatShadowDimension(dim: DTCGShadowLayer['offsetX'] | undefined): string {
    if (!dim) {
      return '0px';
    }
    if (typeof dim === 'string') {
      // Alias references look like '{path.to.token}' — resolve to var().
      // Plain CSS strings ('4px') pass through unchanged.
      if (dim.startsWith('{') && dim.endsWith('}')) {
        return this.aliasToVar(dim.slice(1, -1));
      }
      return dim;
    }
    return `${dim.value || 0}${dim.unit || 'px'}`;
  }
}

/**
 * CSS Format Exporter
 * Exports DTCG tokens as CSS custom properties
 */
export class CSSFormatExporter extends BaseFormatExporter {
  constructor() {
    super(new CSSTokenTransformer());
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async export(tokens: DTCGFile, options: FormatOptions): Promise<PlatformExport[]> {
    const cssOptions = options.config?.css || {};
    const prefix = cssOptions.prefix || '';
    const useCustomProperties = cssOptions.useCustomProperties !== false; // Default true

    // The transformer emits the reference side (`var(--x)`); it needs the same
    // prefix the declaration side uses or references won't resolve.
    (this.transformer as CSSTokenTransformer).setPrefix(prefix);

    const lines: string[] = [];

    // Add header comment with mode name if available
    const modeName = tokens.$extensions?.figma?.mode;
    lines.push('/**');
    lines.push(` * Design Tokens - CSS Custom Properties${modeName ? ` (${modeName})` : ''}`);
    lines.push(' * Generated by Token Press');
    lines.push(' */');
    lines.push('');

    if (useCustomProperties) {
      lines.push(':root {');

      this.walkTokens(tokens, (token, path) => {
        // Handle typography composites by expanding into individual properties
        if (token.$type === 'typography' && typeof token.$value === 'object') {
          this.expandTypographyToken(token, path, prefix, lines);
        } else {
          const cssPath = toCSSVariableName(path, prefix);
          const value = this.transformToken(token, path);
          lines.push(`  --${cssPath}: ${value};`);
        }
      });

      lines.push('}');
    } else {
      // Generate CSS classes/utilities if requested
      if (cssOptions.generateUtilities) {
        lines.push('/* Utility Classes */');
        this.walkTokens(tokens, (token, path) => {
          if (token.$type === 'color') {
            const className = toCSSVariableName(path, prefix);
            const value = this.transformToken(token, path);
            lines.push(`.${className} { color: ${value}; }`);
            lines.push(`.bg-${className} { background-color: ${value}; }`);
          }
        });
      }
    }

    const content = lines.join('\n');

    return [this.createExport('tokens.css', content, 'css', 'text/css')];
  }

  getSupportedExtensions(): string[] {
    return ['css'];
  }

  getDisplayName(): string {
    return 'CSS Custom Properties';
  }

  private transformToken(token: DTCGToken, path: string): string {
    switch (token.$type) {
      case 'color':
        return this.transformer.transformColor(token, path);
      case 'dimension':
        return this.transformer.transformDimension(token, path);
      case 'typography':
        return this.transformer.transformTypography(token, path);
      case 'shadow':
        return this.transformer.transformShadow(token, path);
      default:
        return this.transformer.transformGeneric(token, path, token.$type);
    }
  }

  /**
   * Expand a typography composite token into individual CSS properties
   */
  private expandTypographyToken(
    token: DTCGToken,
    path: string,
    prefix: string,
    lines: string[]
  ): void {
    const typographyValue = token.$value as any;
    const transformer = this.transformer as CSSTokenTransformer;

    // Define the typography properties we want to export. Mirrors the keys
    // the TypographyConverter actually emits on $value — keep in sync if the
    // composite shape grows.
    const propertyMap: Record<string, string> = {
      fontFamily: 'font-family',
      fontSize: 'font-size',
      fontWeight: 'font-weight',
      letterSpacing: 'letter-spacing',
      lineHeight: 'line-height',
      fontStyle: 'font-style',
      textDecoration: 'text-decoration',
    };

    // Create a CSS variable for each property
    for (const [dtcgProp, cssProp] of Object.entries(propertyMap)) {
      if (typographyValue[dtcgProp] !== undefined) {
        const cssPath = toCSSVariableName(`${path}-${cssProp}`, prefix);
        const value = transformer.transformTypographyProperty(typographyValue[dtcgProp], dtcgProp);
        lines.push(`  --${cssPath}: ${value};`);
      }
    }
  }
}
