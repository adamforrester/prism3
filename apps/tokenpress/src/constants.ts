/**
 * Application-wide constants for Token Press
 * Centralizes magic numbers and configuration values for better maintainability
 */

/**
 * Performance and memory limits
 */
export const PERFORMANCE_LIMITS = {
  /** Maximum number of text styles to process (prevents crashes with very large files) */
  MAX_TEXT_STYLES: 1000,
  /** Batch size for processing text styles to reduce memory pressure */
  TEXT_STYLE_BATCH_SIZE: 50,
  /** Maximum ZIP file size in bytes (50MB) before warning */
  MAX_ZIP_SIZE_BYTES: 50_000_000,
  /** Maximum JSON string size in bytes (5MB) before warning */
  MAX_JSON_SIZE_BYTES: 5_000_000,
  /** Number of collections processed before yielding control to prevent UI blocking */
  YIELD_INTERVAL: 10,
} as const;

/**
 * API and timeout configuration
 */
export const API_CONFIG = {
  /** Timeout for Figma API calls in milliseconds (30 seconds) */
  TIMEOUT_MS: 30_000,
} as const;

/**
 * Progress reporting configuration
 */
export const PROGRESS_CONFIG = {
  /** Report progress every N text styles processed */
  TEXT_STYLE_REPORT_INTERVAL: 25,
  /** Progress percentage ranges for different export phases */
  PHASES: {
    INIT: 10,
    SCAN_START: 25,
    VARIABLES_START: 35,
    TYPOGRAPHY_START: 45,
    SHADOWS_START: 80,
    ZIP_START: 90,
  },
} as const;

/**
 * ZIP generation configuration
 */
export const ZIP_CONFIG = {
  /** Compression level (1-9, 6 balances speed and compression) */
  COMPRESSION_LEVEL: 6,
} as const;

/**
 * Numeric precision for rounding operations
 */
export const PRECISION = {
  /** Multiplier for 3 decimal places (0.001) */
  DECIMAL_3: 1000,
  /** Multiplier for 4 decimal places (0.0001) — strips IEEE-754 noise from
   *  small dimension values like letter-spacing where 3 decimals is too coarse. */
  DECIMAL_4: 10000,
  /** Multiplier for 1 decimal place percentage (0.1) */
  PERCENT_1: 10,
} as const;

/**
 * Rounds a number to the given decimal-multiplier precision (see PRECISION),
 * stripping IEEE-754 representation noise from values that originate as
 * Figma 32-bit floats. Returns non-finite inputs unchanged so callers don't
 * have to special-case NaN/Infinity.
 */
export function roundToPrecision(value: number, multiplier: number = PRECISION.DECIMAL_4): number {
  if (!Number.isFinite(value)) {return value;}
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Font weight validation ranges
 */
export const FONT_WEIGHT = {
  /** Minimum valid font weight value */
  MIN: 1,
  /** Maximum valid font weight value */
  MAX: 1000,
} as const;

/**
 * UI update intervals
 */
export const UI_CONFIG = {
  /** Polling interval for status updates in milliseconds */
  STATUS_POLL_INTERVAL_MS: 1000,
} as const;

/**
 * Token type detection patterns
 * Used to identify special token types by name patterns
 */
export const TYPE_DETECTION_PATTERNS = {
  GRID: ['grid', 'column', 'gutter', 'margin'] as const,
  BREAKPOINT: ['breakpoint', 'viewport', 'screen', 'media', 'responsive'] as const,
  MOTION: ['duration', 'delay', 'timing', 'easing', 'transition', 'animation'] as const,
} as const;

/**
 * Cubic Bezier easing conversion map for DTCG compliance.
 * Maps CSS easing keywords and cubic-bezier() function strings to [p1x, p1y, p2x, p2y] arrays.
 */
export const CUBIC_BEZIER_MAP: Record<string, [number, number, number, number]> = {
  // Standard CSS easing keywords
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  // Common cubic-bezier function strings
  'cubic-bezier(0, 0, 1, 1)': [0, 0, 1, 1],
  'cubic-bezier(0.25, 0.1, 0.25, 1)': [0.25, 0.1, 0.25, 1],
  'cubic-bezier(0.42, 0, 1, 1)': [0.42, 0, 1, 1],
  'cubic-bezier(0, 0, 0.58, 1)': [0, 0, 0.58, 1],
  'cubic-bezier(0.42, 0, 0.58, 1)': [0.42, 0, 0.58, 1],
  'cubic-bezier(0.2, 0, 0, 1)': [0.2, 0, 0, 1],
  'cubic-bezier(0.4, 0, 0.2, 1)': [0.4, 0, 0.2, 1],
};
