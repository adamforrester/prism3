/**
 * Type detection utilities for identifying special token types based on naming patterns.
 * Consolidates all token type detection logic in one place for better maintainability.
 */

import { TYPE_DETECTION_PATTERNS } from '../constants';

/**
 * Generic pattern matcher for token names.
 * Checks if a token name matches any of the provided patterns (case-insensitive).
 *
 * @param name Token name to check
 * @param patterns Array of pattern strings to match against
 * @returns True if the name matches any pattern
 */
export function matchesPattern(name: string, patterns: readonly string[]): boolean {
  const lowerName = name.toLowerCase();
  return patterns.some(pattern => lowerName.includes(pattern));
}

/**
 * Token type detector class encapsulating all type detection logic.
 * Provides methods to identify special token types based on naming conventions.
 */
export class TokenTypeDetector {
  /**
   * Determines if a variable represents a breakpoint token.
   * Breakpoints are typically used for responsive design breakpoints.
   *
   * @param variableName Name of the variable to check
   * @returns True if the variable appears to be a breakpoint
   */
  isBreakpointVariable(variableName: string): boolean {
    const lowerName = variableName.toLowerCase();

    // Check against predefined patterns
    if (matchesPattern(variableName, TYPE_DETECTION_PATTERNS.BREAKPOINT)) {
      return true;
    }

    // Check for common breakpoint size patterns (mobile, tablet, desktop, etc.)
    if (/\b(xs|sm|md|lg|xl|xxl|mobile|tablet|desktop)\b/.test(lowerName)) {
      return true;
    }

    // Pure numeric breakpoints (e.g., "390", "768", "1024")
    const lastPart = variableName.split('/').pop() || '';
    if (/^\d+$/.test(lastPart)) {
      return true;
    }

    // Width-related terms
    if (lowerName.includes('width') && (lowerName.includes('min') || lowerName.includes('max'))) {
      return true;
    }

    return false;
  }

  /**
   * Determines if a variable represents a grid-related token.
   *
   * @param variableName Name of the variable to check
   * @returns True if the variable appears to be grid-related
   */
  isGridVariable(variableName: string): boolean {
    const lowerName = variableName.toLowerCase();

    // Check against predefined patterns
    if (matchesPattern(variableName, TYPE_DETECTION_PATTERNS.GRID)) {
      return true;
    }

    // Grid system patterns
    if (
      lowerName.includes('system') &&
      (lowerName.includes('column') || lowerName.includes('gutter') || lowerName.includes('margin'))
    ) {
      return true;
    }

    return false;
  }

  /**
   * Determines if a variable represents grid columns (should be unitless number).
   *
   * @param variableName Name of the variable to check
   * @returns True if the variable represents column count
   */
  isGridColumnsVariable(variableName: string): boolean {
    const lowerName = variableName.toLowerCase();

    // Match "columns" but not "columnwidth"
    return lowerName.includes('columns') && !lowerName.includes('columnwidth');
  }

  /**
   * Determines if a variable represents the containermax 'full' token (should be percentage).
   *
   * @param variableName Name of the variable to check
   * @param value The variable's value
   * @returns True if this is the containermax full token
   */
  isContainerMaxFullVariable(variableName: string, value: any): boolean {
    const lowerName = variableName.toLowerCase();

    return (
      lowerName.includes('containermax') &&
      lowerName.includes('full') &&
      typeof value === 'number' &&
      value === 1
    );
  }

  /**
   * Determines if a variable represents a negative dimension token.
   * These should be exported as dimension type with negative values like "-6px".
   *
   * @param variableName Name of the variable to check
   * @returns True if the variable appears to be a negative dimension
   */
  isNegativeDimensionVariable(variableName: string): boolean {
    const lowerName = variableName.toLowerCase();
    const nameParts = variableName.split('/');
    const lastPart = nameParts[nameParts.length - 1].toLowerCase();

    // Check for "neg" prefix patterns
    const hasNegativePattern =
      lowerName.includes('neg-') ||
      lowerName.includes('negative-') ||
      lowerName.includes('neg_') ||
      lowerName.includes('negative_') ||
      /\bneg\d+\b/.test(lastPart) ||
      /\bneg-?\d+\b/.test(lastPart);

    // Make sure it's in a dimension-like context (not in grid columns where it should be unitless)
    return hasNegativePattern && !this.isGridColumnsVariable(variableName);
  }

  /**
   * Determines if a font weight token name represents an italic variant.
   * These should be excluded from font weight alias resolution since fontStyle:"italic"
   * is handled separately in composite tokens.
   *
   * @param lowerName Lowercase font weight token name
   * @returns True if this is an italic font weight token
   */
  isItalicFontWeightToken(lowerName: string): boolean {
    return (
      // Direct italic token name
      lowerName === 'italic' ||
      // Italic variants
      lowerName.includes('-italic') ||
      lowerName.includes('_italic') ||
      lowerName.endsWith('italic') ||
      // Oblique variants
      lowerName.includes('-oblique') ||
      lowerName.includes('_oblique') ||
      lowerName.endsWith('oblique')
    );
  }

  /**
   * Determines if a variable represents a border token that should be classified as dimension.
   * This includes border radius and border width tokens.
   *
   * @param variableName Name of the variable to check
   * @returns True if the variable is a border token that should be a dimension
   */
  isBorderDimensionVariable(variableName: string): boolean {
    const lowerName = variableName.toLowerCase();

    // Border radius tokens
    if (lowerName.includes('border') && lowerName.includes('radius')) {
      return true;
    }

    // Border width tokens
    if (lowerName.includes('border') && lowerName.includes('width')) {
      return true;
    }

    // Direct radius tokens in border context
    if (lowerName.includes('radius')) {
      const contextKeywords = [
        'button',
        'pill',
        'container',
        'none',
        'xs',
        'sm',
        'md',
        'lg',
        'xl',
        '2xl',
      ];
      return contextKeywords.some(keyword => lowerName.includes(keyword));
    }

    return false;
  }

  /**
   * Determines if a variable represents a motion duration token.
   * Motion durations should be duration type with millisecond values.
   *
   * @param variableName Name of the variable to check
   * @returns True if the variable is a motion duration token
   */
  isMotionDurationVariable(variableName: string): boolean {
    const lowerName = variableName.toLowerCase();

    // Check against predefined patterns
    if (matchesPattern(variableName, TYPE_DETECTION_PATTERNS.MOTION)) {
      // Exclude easing tokens (should be string type)
      if (lowerName.includes('easing')) {
        return false;
      }

      // Motion/duration path patterns
      const isMotionDuration =
        (lowerName.includes('motion') && lowerName.includes('duration')) ||
        (lowerName.includes('animation') && lowerName.includes('duration')) ||
        (lowerName.includes('transition') && lowerName.includes('duration')) ||
        lowerName.includes('motion/duration') ||
        lowerName.includes('animation/duration');

      // Debug logging to verify detection
      if (lowerName.includes('motion') || lowerName.includes('duration')) {
        console.log(`[Token Press] Duration check: "${variableName}" -> ${isMotionDuration}`);
      }

      return isMotionDuration;
    }

    return false;
  }
}
