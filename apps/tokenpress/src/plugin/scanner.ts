/**
 * Scans and retrieves design tokens from the Figma document.
 * Provides methods to enumerate variables, text styles, and effect styles
 * and organize them for DTCG export.
 */
export class TokenScanner {
  /**
   * Scans all local design tokens from the Figma document.
   * Retrieves variable collections, variables, text styles, and effect styles
   * using async Figma APIs for optimal performance.
   *
   * @returns Promise resolving to an object containing all scanned design resources
   */
  async scanAll(filter?: { excludedCollectionNames?: string[] }) {
    // Get all local resources using async APIs per PRD constraints
    const [collections, variables, textStyles, effectStyles] = await Promise.all([
      figma.variables.getLocalVariableCollectionsAsync(),
      figma.variables.getLocalVariablesAsync(),
      figma.getLocalTextStylesAsync(),
      figma.getLocalEffectStylesAsync(),
    ]);

    const excluded =
      filter && filter.excludedCollectionNames && filter.excludedCollectionNames.length > 0
        ? filter.excludedCollectionNames
        : null;

    if (!excluded) {
      return { collections, variables, textStyles, effectStyles };
    }

    // Filter out excluded collections + their variables. Aliases that target
    // a now-excluded variable will surface as broken-alias warnings during
    // validation — we intentionally do not strip them silently.
    const excludedSet = new Set(excluded);
    const includedCollections = collections.filter(c => !excludedSet.has(c.name));
    const includedCollectionIds = new Set(includedCollections.map(c => c.id));
    const includedVariables = variables.filter(v =>
      includedCollectionIds.has(v.variableCollectionId)
    );

    return {
      collections: includedCollections,
      variables: includedVariables,
      textStyles,
      effectStyles,
    };
  }

  /**
   * Organizes variables into a hierarchical structure grouped by collection and mode.
   * Creates a two-level map: Collection ID -> Mode ID -> Variables array.
   * This structure enables efficient lookup and processing during token export.
   *
   * @param variables Array of all Figma variables to organize
   * @param collections Array of variable collections containing mode information
   * @returns Map of collection IDs to maps of mode IDs to variable arrays
   */
  getVariablesByCollectionAndMode(variables: Variable[], collections: VariableCollection[]) {
    const result: Map<string, Map<string, Variable[]>> = new Map();

    collections.forEach(collection => {
      const collectionMap = new Map<string, Variable[]>();

      collection.modes.forEach(mode => {
        const modeVariables = variables.filter(
          variable =>
            variable.variableCollectionId === collection.id &&
            variable.valuesByMode[mode.modeId] !== undefined
        );

        collectionMap.set(mode.modeId, modeVariables);
      });

      result.set(collection.id, collectionMap);
    });

    return result;
  }

  /**
   * Extracts all variable bindings from a text style.
   * Text styles in Figma can have their properties bound to variables (e.g., font family,
   * font size, font weight, letter spacing, line height). This method collects all
   * such bindings for conversion to DTCG alias references.
   *
   * @param textStyle The Figma text style to extract bound variables from
   * @returns Object mapping property names to their variable alias bindings
   */
  getBoundVariablesForTextStyle(textStyle: TextStyle): Record<string, VariableAlias> {
    const boundVars: Record<string, VariableAlias> = {};

    if (textStyle.boundVariables && textStyle.boundVariables.fontFamily) {
      boundVars.fontFamily = textStyle.boundVariables.fontFamily;
    }
    if (textStyle.boundVariables && textStyle.boundVariables.fontSize) {
      boundVars.fontSize = textStyle.boundVariables.fontSize;
    }
    if (textStyle.boundVariables && textStyle.boundVariables.fontWeight) {
      boundVars.fontWeight = textStyle.boundVariables.fontWeight;
    }
    if (textStyle.boundVariables && textStyle.boundVariables.letterSpacing) {
      boundVars.letterSpacing = textStyle.boundVariables.letterSpacing;
    }
    if (textStyle.boundVariables && textStyle.boundVariables.lineHeight) {
      boundVars.lineHeight = textStyle.boundVariables.lineHeight;
    }

    return boundVars;
  }
}
