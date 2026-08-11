/**
 * Registry for format exporters.
 * Central management for all export format implementations.
 */

import { ExportFormat, FormatExporter, ExporterRegistry } from '../../types/export-formats';

/**
 * Default implementation of the exporter registry.
 * Manages registration and retrieval of format exporters.
 */
export class DefaultExporterRegistry implements ExporterRegistry {
  private exporters = new Map<ExportFormat, FormatExporter>();

  /**
   * Register a new format exporter
   */
  register(format: ExportFormat, exporter: FormatExporter): void {
    this.exporters.set(format, exporter);
  }

  /**
   * Get exporter for specific format
   */
  get(format: ExportFormat): FormatExporter | undefined {
    return this.exporters.get(format);
  }

  /**
   * Get all supported formats
   */
  getSupportedFormats(): ExportFormat[] {
    return Array.from(this.exporters.keys());
  }

  /**
   * Check if format is supported
   */
  isSupported(format: ExportFormat): boolean {
    return this.exporters.has(format);
  }

  /**
   * Get count of registered exporters
   */
  getExporterCount(): number {
    return this.exporters.size;
  }

  /**
   * Clear all registered exporters (mainly for testing)
   */
  clear(): void {
    this.exporters.clear();
  }
}

/**
 * Global registry instance
 */
export const exporterRegistry = new DefaultExporterRegistry();