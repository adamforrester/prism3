/**
 * Shadow token converter.
 * Handles conversion of Figma effect styles to DTCG shadow format.
 */

import { ShadowLayer } from '../../types/converter-types';
import { DTCGDimension } from '../../types/dtcg';
import { ColorConverter } from './color-converter';

/**
 * Converter for shadow tokens.
 * Converts Figma DROP_SHADOW and INNER_SHADOW effects to DTCG shadow layers.
 */
export class ShadowConverter {
  private colorConverter: ColorConverter;

  constructor() {
    this.colorConverter = new ColorConverter();
  }

  /**
   * Converts a Figma effect style to DTCG shadow format.
   * Returns an array of shadow layers (for multi-layer shadows) or a single layer.
   *
   * @param effectStyle Figma effect style object
   * @param useRem Whether to use rem units instead of px
   * @param baseFontSize Base font size for rem calculations
   * @param dimensionFormat 'object' (DTCG spec) or 'string' (Style Dictionary)
   * @param colorFormat 'dtcg' (DTCG color object) or 'css' (rgb/rgba string)
   * @returns Array of shadow layers or single layer
   */
  convert(
    effectStyle: EffectStyle,
    useRem: boolean,
    baseFontSize: number,
    dimensionFormat: 'object' | 'string' = 'object',
    colorFormat: 'dtcg' | 'css' = 'dtcg'
  ): ShadowLayer[] | ShadowLayer {
    const shadowLayers: ShadowLayer[] = [];

    effectStyle.effects.forEach(effect => {
      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        const layer = this.convertEffect(
          effect,
          useRem,
          baseFontSize,
          dimensionFormat,
          colorFormat
        );
        shadowLayers.push(layer);
      }
    });

    // Return single layer if only one, array if multiple
    return shadowLayers.length === 1 ? shadowLayers[0] : shadowLayers;
  }

  /**
   * Converts a single shadow effect to a shadow layer.
   */
  private convertEffect(
    effect: Effect,
    useRem: boolean,
    baseFontSize: number,
    dimensionFormat: 'object' | 'string',
    colorFormat: 'dtcg' | 'css'
  ): ShadowLayer {
    const layer: ShadowLayer = {
      color:
        colorFormat === 'dtcg'
          ? this.colorConverter.convertToDTCG(effect.color)
          : this.colorConverter.convertToCSS(effect.color),
      offsetX: this.createDimension(effect.offset.x, useRem, baseFontSize, dimensionFormat),
      offsetY: this.createDimension(effect.offset.y, useRem, baseFontSize, dimensionFormat),
      blur: this.createDimension(effect.radius, useRem, baseFontSize, dimensionFormat),
      spread: this.createDimension(effect.spread || 0, useRem, baseFontSize, dimensionFormat),
    };

    // Add inset flag for inner shadows
    if (effect.type === 'INNER_SHADOW') {
      layer.inset = true;
    }

    return layer;
  }

  /**
   * Creates a shadow dimension as either DTCG object form (default) or a CSS
   * string ('4px') when dimensionFormat='string'. Mirrors the variable-side
   * formatDimensionValue helper for consistency.
   */
  private createDimension(
    value: number,
    useRem: boolean,
    baseFontSize: number,
    dimensionFormat: 'object' | 'string'
  ): DTCGDimension | string {
    const finalValue = useRem ? value / baseFontSize : value;
    const unit: 'px' | 'rem' = useRem ? 'rem' : 'px';

    if (dimensionFormat === 'string') {
      return `${finalValue}${unit}`;
    }
    return { value: finalValue, unit };
  }
}
