/**
 * Error types and utilities for Token Press.
 * Provides standardized error handling across the plugin.
 */

/**
 * Error codes for different failure scenarios.
 */
export enum ErrorCode {
  // Scanning errors
  SCAN_FAILED = 'SCAN_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  API_TIMEOUT = 'API_TIMEOUT',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  ALIAS_BROKEN = 'ALIAS_BROKEN',
  ALIAS_CYCLE = 'ALIAS_CYCLE',
  TYPE_MISMATCH = 'TYPE_MISMATCH',

  // Export errors
  EXPORT_FAILED = 'EXPORT_FAILED',
  CONVERSION_FAILED = 'CONVERSION_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  ZIP_GENERATION_FAILED = 'ZIP_GENERATION_FAILED',

  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for token export operations.
 * Provides structured error information with context.
 */
export class TokenExportError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: unknown;

  constructor(message: string, code: ErrorCode = ErrorCode.UNKNOWN_ERROR, context?: unknown) {
    super(message);
    this.name = 'TokenExportError';
    this.code = code;
    this.context = context;

    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TokenExportError);
    }
  }
}

/**
 * Warning information for non-critical issues.
 */
export interface Warning {
  /** Warning severity level */
  severity: 'low' | 'medium' | 'high';
  /** Warning message */
  message: string;
  /** Optional context (e.g., variable name, file path) */
  context?: string;
}

/**
 * Partial failure information for operations that can partially succeed.
 */
export interface PartialFailure {
  /** What failed (e.g., collection name, style name) */
  item: string;
  /** Error message */
  error: string;
  /** Optional error code */
  code?: ErrorCode;
}

/**
 * Result of an export operation with success/failure tracking.
 */
export interface ExportResult {
  /** Whether the export succeeded */
  success: boolean;
  /** Number of files created */
  filesCreated: number;
  /** ZIP blob if successful */
  zipBlob?: Uint8Array;
  /** Non-critical warnings */
  warnings: Warning[];
  /** Partial failures (items that failed but didn't stop export) */
  partialFailures: PartialFailure[];
  /** Total time taken in milliseconds */
  duration?: number;
}

/**
 * Formats an unknown error into a user-friendly string.
 *
 * @param error Unknown error object
 * @returns Formatted error message
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Checks if an error is a specific type of TokenExportError.
 *
 * @param error Error to check
 * @param code Expected error code
 * @returns True if error matches the code
 */
export function isTokenExportError(error: unknown, code?: ErrorCode): boolean {
  if (!(error instanceof TokenExportError)) {
    return false;
  }
  if (code === undefined) {
    return true;
  }
  return error.code === code;
}
