import { aliasTargetIds } from '../types/figma-guards';

/** Alias targets that are not local variables, resolved through the Plugin API (prism3 #4166). */
export interface ExternalAliasTargets {
  /** Each resolved target variable, once. */
  variables: Variable[];
  /** Collection id → name, for each target's collection the API could read. */
  collectionNames: Record<string, string>;
  /** Collection id → default mode id, for the same collections (prism3 #2365): a tinted wash over a library variable
   *  resolves through that collection's default mode, as an alias into any other collection does. */
  collectionDefaultModes: Record<string, string>;
}

/**
 * Scans and retrieves design tokens from the Figma document.
 * Provides methods to enumerate variables, text styles, effect styles and
 * paint styles, and organize them for DTCG export.
 */
export class TokenScanner {
  /**
   * Scans all local design tokens from the Figma document.
   * Retrieves variable collections, variables, text styles, effect styles and
   * paint styles using async Figma APIs for optimal performance. Paint styles
   * are where a file's gradients live (prism3 #731).
   *
   * @returns Promise resolving to an object containing all scanned design resources
   */
  async scanAll(filter?: { excludedCollectionNames?: string[] }) {
    // Get all local resources using async APIs per PRD constraints
    const [collections, variables, textStyles, effectStyles, paintStyles] = await Promise.all([
      figma.variables.getLocalVariableCollectionsAsync(),
      figma.variables.getLocalVariablesAsync(),
      figma.getLocalTextStylesAsync(),
      figma.getLocalEffectStylesAsync(),
      figma.getLocalPaintStylesAsync(),
    ]);

    const excluded =
      filter && filter.excludedCollectionNames && filter.excludedCollectionNames.length > 0
        ? filter.excludedCollectionNames
        : null;

    if (!excluded) {
      return { collections, variables, textStyles, effectStyles, paintStyles };
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
      paintStyles,
    };
  }

  /**
   * The alias targets that are not in `variables` (prism3 #4166). A local variable can alias a
   * variable from an enabled team library, which `getLocalVariablesAsync` does not list, so the
   * export had no record of it and wrote the raw `{VariableID:…}`. `getVariableByIdAsync` resolves
   * such an id for any variable the file has imported. Each id is looked up once; a target that is
   * itself an alias is followed, up to `MAX_HOPS`. An id the API cannot resolve is left out, so it
   * stays a broken alias, as before.
   */
  async resolveExternalAliasTargets(variables: Variable[]): Promise<ExternalAliasTargets> {
    const MAX_HOPS = 10;
    const known = new Set(variables.map(v => v.id));
    const found: Variable[] = [];
    let frontier = variables;
    for (let hop = 0; hop < MAX_HOPS && frontier.length > 0; hop++) {
      const missing: string[] = [];
      frontier.forEach(v => {
        Object.values(v.valuesByMode).forEach(value => {
          aliasTargetIds(value).forEach(id => {
            if (!known.has(id)) {
              known.add(id);
              missing.push(id);
            }
          });
        });
      });
      const resolved = await Promise.all(
        missing.map(id => figma.variables.getVariableByIdAsync(id).catch(() => null))
      );
      frontier = resolved.filter((v): v is Variable => v !== null && v !== undefined);
      frontier.forEach(v => found.push(v));
    }

    const collectionNames: Record<string, string> = {};
    const collectionDefaultModes: Record<string, string> = {};
    const collectionIds = Array.from(new Set(found.map(v => v.variableCollectionId)));
    const collections = await Promise.all(
      collectionIds.map(id => figma.variables.getVariableCollectionByIdAsync(id).catch(() => null))
    );
    collections.forEach(c => {
      if (c) {
        collectionNames[c.id] = c.name;
        if (c.defaultModeId) {
          collectionDefaultModes[c.id] = c.defaultModeId;
        }
      }
    });
    return { variables: found, collectionNames, collectionDefaultModes };
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
