/**
 * Unit tests for multi-format export architecture
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { DefaultExporterRegistry } from '../../src/plugin/format-exporters/registry';
import { CSSFormatExporter, CSSTokenTransformer } from '../../src/plugin/format-exporters/css-exporter';
import { DTCGFile, DTCGToken } from '../../src/types/dtcg';
import { FormatOptions } from '../../src/types/export-formats';

describe('Multi-Format Export Architecture', () => {
  let registry: DefaultExporterRegistry;
  let cssExporter: CSSFormatExporter;

  beforeEach(() => {
    registry = new DefaultExporterRegistry();
    cssExporter = new CSSFormatExporter();
  });

  describe('Exporter Registry', () => {
    test('should register and retrieve exporters', () => {
      registry.register('css', cssExporter);
      
      expect(registry.isSupported('css')).toBe(true);
      expect(registry.get('css')).toBe(cssExporter);
      expect(registry.getSupportedFormats()).toContain('css');
    });

    test('should return undefined for unsupported formats', () => {
      expect(registry.get('flutter')).toBeUndefined();
      expect(registry.isSupported('flutter')).toBe(false);
    });

    test('should track exporter count', () => {
      expect(registry.getExporterCount()).toBe(0);
      
      registry.register('css', cssExporter);
      expect(registry.getExporterCount()).toBe(1);
      
      registry.clear();
      expect(registry.getExporterCount()).toBe(0);
    });
  });

  describe('CSS Exporter', () => {
    test('should have correct metadata', () => {
      expect(cssExporter.getDisplayName()).toBe('CSS Custom Properties');
      expect(cssExporter.getSupportedExtensions()).toContain('css');
    });

    test('should validate tokens correctly', () => {
      const validTokens: DTCGFile = {
        colors: {
          primary: {
            $type: 'color',
            $value: {
              colorSpace: 'srgb',
              components: [0, 0.5, 1]
            }
          }
        }
      };

      const result = cssExporter.validateTokens(validTokens);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid tokens', () => {
      const invalidTokens: DTCGFile = {
        colors: {
          broken: {
            $type: 'color',
            // Missing $value
          } as DTCGToken
        }
      };

      const result = cssExporter.validateTokens(invalidTokens);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should export basic CSS custom properties', async () => {
      const tokens: DTCGFile = {
        colors: {
          primary: {
            $type: 'color',
            $value: {
              colorSpace: 'srgb',
              components: [1, 0, 0]
            }
          }
        }
      };

      const options: FormatOptions = {
        format: 'css',
        config: {
          css: {
            useCustomProperties: true
          }
        }
      };

      const result = await cssExporter.export(tokens, options);
      
      expect(result).toHaveLength(1);
      expect(result[0].fileName).toBe('tokens.css');
      expect(result[0].extension).toBe('css');
      expect(result[0].content).toContain(':root {');
      expect(result[0].content).toContain('--colors-primary:');
      expect(result[0].content).toContain('rgb(255, 0, 0)');
    });
  });

  describe('CSS Token Transformer', () => {
    let transformer: CSSTokenTransformer;

    beforeEach(() => {
      transformer = new CSSTokenTransformer();
    });

    test('should transform color tokens', () => {
      const colorToken: DTCGToken = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0.5, 0]
        }
      };

      const result = transformer.transformColor(colorToken, 'colors.orange');
      expect(result).toBe('rgb(255, 128, 0)');
    });

    test('should transform color tokens with alpha', () => {
      const colorToken: DTCGToken = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
          alpha: 0.5
        }
      };

      const result = transformer.transformColor(colorToken, 'colors.red');
      expect(result).toBe('rgba(255, 0, 0, 0.5)');
    });

    test('should transform dimension tokens', () => {
      const dimensionToken: DTCGToken = {
        $type: 'dimension',
        $value: {
          value: 16,
          unit: 'px'
        }
      };

      const result = transformer.transformDimension(dimensionToken, 'spacing.small');
      expect(result).toBe('16px');
    });

    test('should handle token references', () => {
      const refToken: DTCGToken = {
        $type: 'color',
        $value: '{colors.primary}'
      };

      const result = transformer.transformColor(refToken, 'colors.secondary');
      expect(result).toBe('var(--colors-primary)');
    });
  });
});