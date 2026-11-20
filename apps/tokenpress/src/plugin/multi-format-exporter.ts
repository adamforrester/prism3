/**
 * Multi-format exporter that extends the existing TokenExporter.
 * Provides extensible platform export capabilities.
 */

import JSZip from 'jszip';
import { DTCGFile } from '../types/dtcg';
import { ExportFormat, FormatOptions, PlatformExport } from '../types/export-formats';
import { ExportOptions } from '../types/plugin';
import { sanitizeFileName } from '../utils/token-name-utils';
import { TokenExporter } from './exporter';
import { CSSFormatExporter } from './format-exporters/css-exporter';
import {
  DotNotationExporter,
  DotNotationExportInput,
} from './format-exporters/dot-notation-exporter';
import { RawFigmaExporter, RawFigmaExportInput } from './format-exporters/raw-figma-exporter';
import { exporterRegistry } from './format-exporters/registry';
import { TokenScanner } from './scanner';

/**
 * Deep merge utility for combining DTCG token structures.
 * Recursively merges nested objects without overwriting existing properties.
 *
 * @param target The target object to merge into
 * @param source The source object to merge from
 * @returns The merged object
 */
function deepMerge(target: any, source: any): any {
  const output = Object.assign({}, target);

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = output[key];

      // If both are objects and neither is null, recursively merge
      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        output[key] = deepMerge(targetValue, sourceValue);
      } else {
        // Otherwise, use the source value
        output[key] = sourceValue;
      }
    }
  }

  return output;
}

/**
 * Extended export options that support multiple output formats
 */
export interface MultiFormatExportOptions extends ExportOptions {
  /** Additional export formats to include */
  additionalFormats?: FormatOptions[];
  /** Whether to include DTCG JSON files (default: true) */
  includeDTCG?: boolean;
}

/**
 * Multi-format token exporter.
 * Extends the base TokenExporter to support multiple output formats.
 */
export class MultiFormatTokenExporter extends TokenExporter {
  private rawFigmaExporter: RawFigmaExporter;
  private dotNotationExporter: DotNotationExporter;
  private scanner: TokenScanner;

  constructor(options: MultiFormatExportOptions) {
    super(options);
    this.rawFigmaExporter = new RawFigmaExporter();
    this.dotNotationExporter = new DotNotationExporter();
    this.scanner = new TokenScanner();
    this.initializeFormatExporters();
  }

  /**
   * Initialize and register format exporters
   */
  private initializeFormatExporters(): void {
    // Register CSS exporter
    if (!exporterRegistry.isSupported('css')) {
      exporterRegistry.register('css', new CSSFormatExporter());
    }

    // Register raw Figma exporters (these use raw data, not DTCG)
    if (!exporterRegistry.isSupported('raw-figma')) {
      exporterRegistry.register('raw-figma', this.rawFigmaExporter);
    }
    if (!exporterRegistry.isSupported('dot-notation')) {
      exporterRegistry.register('dot-notation', this.dotNotationExporter);
    }
  }

  /**
   * Export tokens to ZIP with multiple format support
   */
  async exportToZipWithFormats(
    progressCallback?: (progress: number, message: string) => void
  ): Promise<ArrayBuffer> {
    const options = this.options as MultiFormatExportOptions;
    const startTime = Date.now();
    const zip = new JSZip();
    this.fileCount = 0;

    const reportProgress = (progress: number, message: string) => {
      if (progressCallback) {
        progressCallback(progress, message);
      }
    };

    // Export DTCG files (existing functionality)
    if (options.includeDTCG !== false) {
      reportProgress(20, 'Exporting DTCG tokens...');
      const dtcgZip = await super.exportToZip((p, m) => {
        // Scale progress to 20-60%
        reportProgress(20 + (p - 20) * 0.5, m);
      });

      // Extract files from DTCG ZIP and add to main ZIP
      const dtcgZipObj = await JSZip.loadAsync(dtcgZip);
      await this.mergeZipContents(dtcgZipObj, zip, 'tokens/');
    }

    // Export additional formats if specified
    if (options.additionalFormats && options.additionalFormats.length > 0) {
      reportProgress(60, 'Generating additional formats...');

      // Separate raw Figma formats from DTCG-based formats
      const rawFormats = options.additionalFormats.filter(
        f => f.format === 'raw-figma' || f.format === 'dot-notation'
      );
      const dtcgFormats = options.additionalFormats.filter(
        f => f.format !== 'raw-figma' && f.format !== 'dot-notation'
      );

      // Export DTCG-based formats (CSS, SCSS, etc.)
      if (dtcgFormats.length > 0) {
        const dtcgData = await this.generateDTCGData();

        for (let i = 0; i < dtcgFormats.length; i++) {
          const formatOptions = dtcgFormats[i];
          const progressPercent = 60 + ((i + 1) / options.additionalFormats.length) * 15;

          reportProgress(progressPercent, `Generating ${formatOptions.format} format...`);

          try {
            await this.exportToFormat(zip, dtcgData, formatOptions);
          } catch (error) {
            console.error(`Failed to export ${formatOptions.format} format:`, error);
            // Continue with other formats
          }
        }
      }

      // Export raw Figma formats (need raw variable data, not DTCG)
      if (rawFormats.length > 0) {
        reportProgress(75, 'Generating raw Figma formats...');

        try {
          const rawData = await this.getRawFigmaData();

          for (let i = 0; i < rawFormats.length; i++) {
            const formatOptions = rawFormats[i];
            const progressPercent = 75 + ((i + 1) / rawFormats.length) * 10;

            reportProgress(progressPercent, `Generating ${formatOptions.format} format...`);

            try {
              this.exportRawFormat(zip, rawData, formatOptions);
            } catch (error) {
              console.error(`Failed to export ${formatOptions.format} format:`, error);
            }
          }
        } catch (error) {
          console.error('Failed to get raw Figma data:', error);
        }
      }
    }

    reportProgress(90, 'Creating ZIP file...');
    const result = await zip.generateAsync({ type: 'arraybuffer' });

    const totalTime = Date.now() - startTime;
    console.log(`Multi-format export completed in ${totalTime}ms`);

    return result;
  }

  /**
   * Export tokens to a specific format and add to ZIP.
   * Groups DTCG files by mode so each mode gets its own output file.
   */
  private async exportToFormat(
    zip: JSZip,
    dtcgData: Record<string, DTCGFile>,
    formatOptions: FormatOptions
  ): Promise<void> {
    const exporter = exporterRegistry.get(formatOptions.format);
    if (!exporter) {
      throw new Error(`Unsupported export format: ${formatOptions.format}`);
    }

    // Create format-specific folder
    const formatFolder = zip.folder(formatOptions.format);
    if (!formatFolder) {
      throw new Error(`Failed to create folder for ${formatOptions.format}`);
    }

    // Group DTCG files by mode for per-mode export
    const modeGroups = this.groupDTCGByMode(dtcgData);
    const isMultiMode = Object.keys(modeGroups).length > 1;

    for (const [modeName, mergedDTCG] of Object.entries(modeGroups)) {
      try {
        const platformExports = await exporter.export(mergedDTCG, formatOptions);

        for (const platformExport of platformExports) {
          // For multi-mode exports, add mode name to the filename
          const fileName = isMultiMode
            ? this.addModeToFilename(platformExport.fileName, modeName)
            : platformExport.fileName;
          formatFolder.file(fileName, platformExport.content);
          this.fileCount++;
        }
      } catch (error) {
        console.error(`Failed to export to ${formatOptions.format} (mode: ${modeName}):`, error);
        throw error;
      }
    }
  }

  /**
   * Group DTCG files by mode.
   * Collections with multiple modes are separated; single-mode collections
   * are included in every mode group as shared tokens.
   */
  private groupDTCGByMode(dtcgData: Record<string, DTCGFile>): Record<string, DTCGFile> {
    // Identify which collections have multiple modes
    const collectionModes = new Map<string, Set<string>>();

    for (const dtcgFile of Object.values(dtcgData)) {
      const collectionName = dtcgFile.$extensions?.figma?.collection?.name;
      const modeName = dtcgFile.$extensions?.figma?.mode;
      if (collectionName && modeName) {
        if (!collectionModes.has(collectionName)) {
          collectionModes.set(collectionName, new Set());
        }
        collectionModes.get(collectionName)!.add(modeName);
      }
    }

    // Separate files into shared (single-mode collections) and mode-specific
    const sharedFiles: DTCGFile[] = [];
    const modeFiles = new Map<string, DTCGFile[]>();

    for (const dtcgFile of Object.values(dtcgData)) {
      const collectionName = dtcgFile.$extensions?.figma?.collection?.name;
      const modeName = dtcgFile.$extensions?.figma?.mode;
      const modes = collectionName ? collectionModes.get(collectionName) : undefined;

      if (modes && modes.size > 1 && modeName) {
        // Multi-mode collection — group by mode
        if (!modeFiles.has(modeName)) {
          modeFiles.set(modeName, []);
        }
        modeFiles.get(modeName)!.push(dtcgFile);
      } else {
        // Single-mode collection — shared across all modes
        sharedFiles.push(dtcgFile);
      }
    }

    // If no multi-mode collections exist, merge everything into one group
    if (modeFiles.size === 0) {
      return { default: this.mergeDTCGFiles(sharedFiles) };
    }

    // Merge shared files + mode-specific files for each mode group
    const result: Record<string, DTCGFile> = {};
    for (const [modeName, files] of modeFiles) {
      result[modeName] = this.mergeDTCGFiles(sharedFiles.concat(files));
    }

    return result;
  }

  /**
   * Merge multiple DTCG files into a single structure using deep merge
   */
  private mergeDTCGFiles(files: DTCGFile[]): DTCGFile {
    const merged: DTCGFile = {
      $extensions: files[0]?.$extensions || this.getFileExtensions(),
    };

    for (const dtcgFile of files) {
      for (const [key, value] of Object.entries(dtcgFile)) {
        if (key.startsWith('$')) {
          continue;
        }

        if (merged[key]) {
          merged[key] = deepMerge(merged[key], value);
        } else {
          merged[key] = value;
        }
      }
    }

    return merged;
  }

  /**
   * Insert mode name into a filename (e.g., "tokens.css" → "tokens-light.css")
   */
  private addModeToFilename(fileName: string, modeName: string): string {
    const sanitizedMode = sanitizeFileName(modeName);
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex === -1) {
      return `${fileName}-${sanitizedMode}`;
    }
    return `${fileName.slice(0, dotIndex)}-${sanitizedMode}${fileName.slice(dotIndex)}`;
  }

  /**
   * Generate DTCG data structure for format conversion
   * Extracts data from the existing DTCG export
   */
  private async generateDTCGData(): Promise<Record<string, DTCGFile>> {
    // Export DTCG to a temporary ZIP
    const dtcgZipBuffer = await super.exportToZip();
    const dtcgZipObj = await JSZip.loadAsync(dtcgZipBuffer);

    const result: Record<string, DTCGFile> = {};

    // Extract and parse all JSON files
    const filePromises: Promise<void>[] = [];

    dtcgZipObj.forEach((relativePath, file) => {
      if (!file.dir && relativePath.endsWith('.json')) {
        filePromises.push(
          file.async('string').then(content => {
            try {
              const parsedData = JSON.parse(content) as DTCGFile;
              result[relativePath] = parsedData;
            } catch (error) {
              console.error(`Failed to parse ${relativePath}:`, error);
            }
          })
        );
      }
    });

    await Promise.all(filePromises);

    return result;
  }

  /**
   * Merge contents from one ZIP into another with optional prefix
   */
  private async mergeZipContents(
    sourceZip: JSZip,
    targetZip: JSZip,
    prefix: string = ''
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    sourceZip.forEach((relativePath, file) => {
      if (!file.dir) {
        promises.push(
          file.async('string').then(content => {
            targetZip.file(prefix + relativePath, content);
            this.fileCount++;
          })
        );
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get raw Figma variable data for raw exporters
   */
  private async getRawFigmaData(): Promise<RawFigmaExportInput> {
    const { collections, variables } = await this.scanner.scanAll({
      excludedCollectionNames: (this.options as MultiFormatExportOptions).excludedCollections,
    });
    const variableMap = new Map(variables.map(v => [v.id, v]));

    return {
      variables,
      collections,
      variableMap,
      tokenNameCase: (this.options as MultiFormatExportOptions).tokenNameCase || 'preserve',
    };
  }

  /**
   * Export to raw Figma format (uses raw variable data, not DTCG)
   */
  private exportRawFormat(
    zip: JSZip,
    rawData: RawFigmaExportInput,
    formatOptions: FormatOptions
  ): void {
    const formatFolder = zip.folder(formatOptions.format);
    if (!formatFolder) {
      throw new Error(`Failed to create folder for ${formatOptions.format}`);
    }

    let platformExports: PlatformExport[] = [];

    if (formatOptions.format === 'raw-figma') {
      platformExports = this.rawFigmaExporter.exportRaw(rawData);
    } else if (formatOptions.format === 'dot-notation') {
      platformExports = this.dotNotationExporter.exportRaw(rawData);
    }

    for (const platformExport of platformExports) {
      formatFolder.file(platformExport.fileName, platformExport.content);
      this.fileCount++;
    }
  }

  /**
   * Get list of supported export formats
   */
  static getSupportedFormats(): ExportFormat[] {
    return exporterRegistry.getSupportedFormats();
  }

  /**
   * Check if a format is supported
   */
  static isFormatSupported(format: ExportFormat): boolean {
    return exporterRegistry.isSupported(format);
  }
}
