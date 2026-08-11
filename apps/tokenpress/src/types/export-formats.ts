/**
 * Types and interfaces for extensible export format support.
 * Prepares architecture for CSS, SCSS, Flutter, iOS, and Android exports.
 */

import { DTCGToken, DTCGFile } from './dtcg';

/**
 * Supported export formats for future platform integration
 */
export type ExportFormat =
  | 'dtcg'
  | 'css'
  | 'scss'
  | 'flutter'
  | 'ios'
  | 'android'
  | 'raw-figma'
  | 'dot-notation';

/**
 * Configuration options for different export formats
 */
export interface FormatOptions {
  /** Target format */
  format: ExportFormat;
  /** Format-specific configuration */
  config?: {
    /** CSS/SCSS specific options */
    css?: {
      prefix?: string;
      useCustomProperties?: boolean;
      generateUtilities?: boolean;
    };
    /** Flutter specific options */
    flutter?: {
      className?: string;
      packageName?: string;
    };
    /** iOS specific options */
    ios?: {
      target?: 'swift' | 'objective-c';
      className?: string;
    };
    /** Android specific options */
    android?: {
      resourceType?: 'xml' | 'compose';
      packageName?: string;
    };
  };
}

/**
 * Output structure for platform-specific exports
 */
export interface PlatformExport {
  /** File name for the export */
  fileName: string;
  /** File content */
  content: string;
  /** File extension */
  extension: string;
  /** MIME type */
  mimeType: string;
}

/**
 * Base interface for format exporters
 */
export interface FormatExporter {
  /** Export DTCG tokens to platform-specific format */
  export(tokens: DTCGFile, options: FormatOptions): Promise<PlatformExport[]>;
  
  /** Get supported file extensions for this format */
  getSupportedExtensions(): string[];
  
  /** Get format display name */
  getDisplayName(): string;
  
  /** Validate if tokens are compatible with this format */
  validateTokens(tokens: DTCGFile): { isValid: boolean; errors: string[] };
}

/**
 * Token transformation interface for platform-specific conversions
 */
export interface TokenTransformer {
  /** Transform color tokens */
  transformColor(token: DTCGToken, path: string): string;
  
  /** Transform dimension tokens */
  transformDimension(token: DTCGToken, path: string): string;
  
  /** Transform typography tokens */
  transformTypography(token: DTCGToken, path: string): string;
  
  /** Transform shadow tokens */
  transformShadow(token: DTCGToken, path: string): string;
  
  /** Transform generic tokens */
  transformGeneric(token: DTCGToken, path: string, type: string): string;
}

/**
 * Registry for format exporters
 */
export interface ExporterRegistry {
  /** Register a new format exporter */
  register(format: ExportFormat, exporter: FormatExporter): void;
  
  /** Get exporter for format */
  get(format: ExportFormat): FormatExporter | undefined;
  
  /** Get all supported formats */
  getSupportedFormats(): ExportFormat[];
  
  /** Check if format is supported */
  isSupported(format: ExportFormat): boolean;
}