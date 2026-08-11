/**
 * Base class for format exporters.
 * Provides common functionality and structure for platform-specific exporters.
 */

import { DTCGToken, DTCGFile } from '../../types/dtcg';
import {
  FormatExporter,
  FormatOptions,
  PlatformExport,
  TokenTransformer,
} from '../../types/export-formats';

/**
 * Abstract base class for format exporters.
 * Implements common functionality and defines the interface for specific format implementations.
 */
export abstract class BaseFormatExporter implements FormatExporter {
  protected transformer: TokenTransformer;

  constructor(transformer: TokenTransformer) {
    this.transformer = transformer;
  }

  /**
   * Export DTCG tokens to platform-specific format.
   * Must be implemented by specific format exporters.
   */
  abstract export(tokens: DTCGFile, options: FormatOptions): Promise<PlatformExport[]>;

  /**
   * Get supported file extensions for this format.
   * Must be implemented by specific format exporters.
   */
  abstract getSupportedExtensions(): string[];

  /**
   * Get format display name.
   * Must be implemented by specific format exporters.
   */
  abstract getDisplayName(): string;

  /**
   * Validate if tokens are compatible with this format.
   * Base implementation provides common validation.
   */
  validateTokens(tokens: DTCGFile): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!tokens) {
      errors.push('Tokens object is required');
      return { isValid: false, errors };
    }

    // Basic validation - specific formats can override for additional checks
    try {
      this.walkTokens(tokens, (token, path) => {
        if (!token.$type) {
          errors.push(`Token at path '${path}' is missing $type`);
        }
        if (token.$value === undefined) {
          errors.push(`Token at path '${path}' is missing $value`);
        }
      });
    } catch (error) {
      errors.push(
        `Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Walk through all tokens in the DTCG file.
   * Utility method for processing token hierarchies.
   */
  protected walkTokens(
    obj: any,
    callback: (token: DTCGToken, path: string) => void,
    currentPath: string = ''
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      // Skip DTCG meta keys
      if (key.startsWith('$')) {
        continue;
      }

      const newPath = currentPath ? `${currentPath}.${key}` : key;

      if (value && typeof value === 'object' && '$type' in value) {
        // This is a token
        callback(value as DTCGToken, newPath);
      } else if (value && typeof value === 'object') {
        // This is a group, recurse
        this.walkTokens(value, callback, newPath);
      }
    }
  }

  /**
   * Sanitize a token name for use in platform-specific formats.
   */
  protected sanitizeName(
    name: string,
    options?: {
      caseStyle?: 'camel' | 'pascal' | 'kebab' | 'snake' | 'constant';
      prefix?: string;
      suffix?: string;
    }
  ): string {
    const { caseStyle = 'kebab', prefix = '', suffix = '' } = options || {};

    // Remove special characters and normalize
    let sanitized = name.replace(/[^a-zA-Z0-9-_.]/g, '-').replace(/^-+|-+$/g, '');

    // Apply case style
    switch (caseStyle) {
      case 'camel':
        sanitized = this.toCamelCase(sanitized);
        break;
      case 'pascal':
        sanitized = this.toPascalCase(sanitized);
        break;
      case 'kebab':
        sanitized = this.toKebabCase(sanitized);
        break;
      case 'snake':
        sanitized = this.toSnakeCase(sanitized);
        break;
      case 'constant':
        sanitized = this.toConstantCase(sanitized);
        break;
    }

    return `${prefix}${sanitized}${suffix}`;
  }

  private toCamelCase(str: string): string {
    return str.replace(/[-_.](.)/g, (_, char) => char.toUpperCase());
  }

  private toPascalCase(str: string): string {
    const camel = this.toCamelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }

  private toKebabCase(str: string): string {
    return str.replace(/[_.]/g, '-').toLowerCase();
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[-.]/g, '_').toLowerCase();
  }

  private toConstantCase(str: string): string {
    return this.toSnakeCase(str).toUpperCase();
  }

  /**
   * Create a platform export result.
   */
  protected createExport(
    fileName: string,
    content: string,
    extension: string,
    mimeType: string = 'text/plain'
  ): PlatformExport {
    return {
      fileName,
      content,
      extension,
      mimeType,
    };
  }
}
