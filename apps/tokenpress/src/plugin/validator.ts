// Validation logic per PRD error tolerance strategy
import { ValidationIssue } from '../types/plugin';
import { isVariableAlias } from '../types/figma-guards';

interface ValidationData {
  collections: VariableCollection[];
  variables: Variable[];
  textStyles: TextStyle[];
  effectStyles: EffectStyle[];
}

export class TokenValidator {
  private issues: ValidationIssue[] = [];
  private collectionMap: Map<string, VariableCollection> = new Map();

  // eslint-disable-next-line @typescript-eslint/require-await
  async validateAll(data: ValidationData): Promise<ValidationIssue[]> {
    this.issues = [];

    // Build collection and variable lookup maps
    this.collectionMap = this.buildCollectionMap(data.collections);
    const variableMap = this.buildVariableMap(data.variables);
    const aliasGraph = this.buildAliasGraph(data.variables, variableMap);

    // Critical validations (block export)
    this.validateAliasTargets(data.variables, variableMap);
    this.validateAliasCycles(aliasGraph);
    this.validateAliasTypeMismatches(data.variables, variableMap);

    // Warning validations (allow export)
    this.validateEmptyCollectionsAndModes(data.collections, data.variables);
    this.validateTextStyleIssues(data.textStyles);
    this.validateEffectStyleIssues(data.effectStyles);

    return this.issues;
  }

  private buildCollectionMap(collections: VariableCollection[]): Map<string, VariableCollection> {
    const map = new Map<string, VariableCollection>();
    collections.forEach(collection => map.set(collection.id, collection));
    return map;
  }

  private buildVariableMap(variables: Variable[]): Map<string, Variable> {
    const map = new Map<string, Variable>();
    variables.forEach(variable => map.set(variable.id, variable));
    return map;
  }

  private buildAliasGraph(
    variables: Variable[],
    variableMap: Map<string, Variable>
  ): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    variables.forEach(variable => {
      const dependencies = new Set<string>();

      Object.values(variable.valuesByMode).forEach(value => {
        if (isVariableAlias(value)) {
          dependencies.add(value.id);
        }
      });

      graph.set(variable.id, dependencies);
    });

    return graph;
  }

  private validateAliasTargets(variables: Variable[], variableMap: Map<string, Variable>): void {
    variables.forEach(variable => {
      Object.entries(variable.valuesByMode).forEach(([modeId, value]) => {
        if (isVariableAlias(value)) {
          if (!variableMap.has(value.id)) {
            const collection = this.collectionMap.get(variable.variableCollectionId);
            const collectionName = collection ? collection.name : 'Unknown Collection';

            this.addError(
              `Broken alias reference in variable "${variable.name}"`,
              `variable-${variable.id}`,
              {
                variableId: variable.id,
                modeId,
                targetId: value.id,
                collectionId: variable.variableCollectionId,
                collectionName: collectionName,
                variableName: variable.name,
              }
            );
          }
        }
      });
    });
  }

  private validateAliasCycles(aliasGraph: Map<string, Set<string>>): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        this.addError(
          `Circular alias dependency detected: ${path.concat(nodeId).join(' -> ')}`,
          `alias-cycle`,
          { cycle: path.concat(nodeId) }
        );
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const dependencies = aliasGraph.get(nodeId) || new Set();
      for (const depId of dependencies) {
        if (hasCycle(depId, path.concat(nodeId))) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of aliasGraph.keys()) {
      if (!visited.has(nodeId)) {
        hasCycle(nodeId, []);
      }
    }
  }

  private validateAliasTypeMismatches(
    variables: Variable[],
    variableMap: Map<string, Variable>
  ): void {
    variables.forEach(variable => {
      Object.entries(variable.valuesByMode).forEach(([modeId, value]) => {
        if (isVariableAlias(value)) {
          const targetVariable = variableMap.get(value.id);
          if (targetVariable && targetVariable.resolvedType !== variable.resolvedType) {
            const collection = this.collectionMap.get(variable.variableCollectionId);
            const collectionName = collection ? collection.name : 'Unknown Collection';

            this.addError(
              `Type mismatch: ${variable.resolvedType} variable "${variable.name}" references ${targetVariable.resolvedType} variable "${targetVariable.name}"`,
              `variable-${variable.id}`,
              {
                sourceType: variable.resolvedType,
                targetType: targetVariable.resolvedType,
                variableId: variable.id,
                targetId: targetVariable.id,
                collectionId: variable.variableCollectionId,
                collectionName: collectionName,
                variableName: variable.name,
              }
            );
          }
        }
      });
    });
  }

  private validateEmptyCollectionsAndModes(
    collections: VariableCollection[],
    variables: Variable[]
  ): void {
    collections.forEach(collection => {
      const collectionVariables = variables.filter(v => v.variableCollectionId === collection.id);

      if (collectionVariables.length === 0) {
        this.addWarning(
          `Collection "${collection.name}" contains no variables`,
          `collection-${collection.id}`
        );
      }

      collection.modes.forEach(mode => {
        const hasValues = collectionVariables.some(
          variable => variable.valuesByMode[mode.modeId] !== undefined
        );

        if (!hasValues) {
          this.addWarning(
            `Mode "${mode.name}" in collection "${collection.name}" has no variable values`,
            `mode-${mode.modeId}`
          );
        }
      });
    });
  }

  private validateTextStyleIssues(textStyles: TextStyle[]): void {
    textStyles.forEach(textStyle => {
      // Check for missing/auto line height
      if (textStyle.lineHeight.unit === 'AUTO') {
        this.addWarning(
          `Text style "${textStyle.name}" uses AUTO line height - will default to 1.2`,
          `text-style-${textStyle.id}`,
          { lineHeight: textStyle.lineHeight }
        );
      }

      // Check for implausible line height values
      if (textStyle.lineHeight.unit === 'PERCENT') {
        const ratio = textStyle.lineHeight.value / 100;
        if (ratio < 0.8 || ratio > 3) {
          this.addWarning(
            `Text style "${textStyle.name}" has unusual line height ratio: ${ratio}`,
            `text-style-${textStyle.id}`,
            { lineHeight: textStyle.lineHeight, ratio }
          );
        }
      }
    });
  }

  private validateEffectStyleIssues(effectStyles: EffectStyle[]): void {
    effectStyles.forEach(effectStyle => {
      effectStyle.effects.forEach((effect, index) => {
        if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
          if (effect.spread === undefined) {
            this.addWarning(
              `Shadow effect ${index + 1} in "${effectStyle.name}" missing spread value - will default to 0`,
              `effect-style-${effectStyle.id}`,
              { effectIndex: index, effectType: effect.type }
            );
          }
        }
      });
    });
  }

  private addError(message: string, source: string, details?: any): void {
    this.issues.push({ type: 'error', message, source, details });
  }

  private addWarning(message: string, source: string, details?: any): void {
    this.issues.push({ type: 'warning', message, source, details });
  }
}
