/**
 * Base converter class providing common functionality for all token converters.
 */

import { TokenConverter, ConversionContext } from '../../types/converter-types';
import { TokenNameCase } from '../../types/plugin';
import {
  sanitizeTokenName as sanitizeTokenNameShared,
  createAliasReference,
} from '../../utils/token-name-utils';

/**
 * Abstract base class for token converters.
 * Provides common utilities and enforces the converter interface.
 */
export abstract class BaseConverter<T> implements TokenConverter<T> {
  /**
   * Checks if this converter can handle the given variable.
   * Must be implemented by subclasses.
   */
  abstract canConvert(variable: Variable, context: ConversionContext): boolean;

  /**
   * Converts a variable to its DTCG representation.
   * Must be implemented by subclasses.
   */
  abstract convert(variable: Variable, context: ConversionContext): T;

  /**
   * Sanitizes a token name for DTCG compliance, honouring the caller's casing
   * mode. Delegates to the shared utility so converters and the exporter
   * cannot drift.
   *
   * @param name Token name to sanitize
   * @param nameCase Casing mode; defaults to 'preserve'
   * @returns Sanitized token path
   */
  protected sanitizeTokenName(name: string, nameCase?: TokenNameCase): string {
    return sanitizeTokenNameShared(name, nameCase);
  }

  /**
   * Creates a DTCG alias reference from a variable.
   *
   * @param variable Variable to reference
   * @param nameCase Casing mode; defaults to 'preserve'
   * @param namespace Export namespace, so the reference resolves through the
   *   root wrapper the exporter adds
   * @returns DTCG alias string (e.g., "{color.primary}")
   */
  protected createAlias(variable: Variable, nameCase?: TokenNameCase, namespace?: string): string {
    return createAliasReference(variable.name, nameCase, namespace);
  }

  /**
   * Resolves a variable value, handling both direct values and aliases.
   *
   * @param value Variable value (can be alias or direct value)
   * @param variableMap Map of all variables for alias resolution
   * @param nameCase Casing mode for any emitted alias reference
   * @param namespace Export namespace for any emitted alias reference
   * @returns Resolved value or alias string
   */
  protected resolveValue(
    value: VariableValue,
    variableMap: Map<string, Variable>,
    nameCase?: TokenNameCase,
    namespace?: string
  ): any {
    // Handle alias references
    if (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      value.type === 'VARIABLE_ALIAS'
    ) {
      const targetVariable = variableMap.get((value as VariableAlias).id);
      if (targetVariable) {
        return this.createAlias(targetVariable, nameCase, namespace);
      }
    }

    // Return direct value
    return value;
  }
}
