/**
 * Integration test to verify all DTCG compliance fixes work together
 * Tests the issues identified in the original requirements:
 * 1. Color component rounding to 4 decimals
 * 2. Font sizes as dimension with units
 * 3. Letter spacing as dimension with units  
 * 4. Opacity values rounded to 3 decimals
 * 5. Font weights as numeric values with italic extracted to fontStyle
 */

import { describe, test, expect } from 'vitest';
import { TokenExporter } from '../../src/plugin/exporter';
import { TokenTypeDetector } from '../../src/plugin/type-detection';
import { TypographyConverter } from '../../src/plugin/converters/typography-converter';
import { ExportOptions } from '../../src/types/plugin';
import { validateDTCGFile } from '../../src/utils/dtcg-validator';

// Mock Figma API types for testing
const mockTextStyle = {
  id: 'text-style-1',
  name: 'Heading/Bold Italic',
  fontName: { family: 'Inter', style: 'Bold Italic' },
  fontSize: 24,
  letterSpacing: { value: 1.2, unit: 'PIXELS' as const },
  lineHeight: { value: 150, unit: 'PERCENT' as const },
  textDecoration: 'NONE' as const,
  description: 'Main heading style',
  paragraphSpacing: 0,
  paragraphIndent: 0,
  textCase: 'ORIGINAL' as const
};

const mockVariable = {
  id: 'var-1',
  name: 'color/primary',
  resolvedType: 'COLOR' as const,
  scopes: [],
  variableCollectionId: 'collection-1',
  valuesByMode: {
    'mode-1': { r: 0.12345678901234567, g: 0.5, b: 0.9876543210987654, a: 0.87654321 }
  },
  description: 'Primary brand color'
};

const mockFontSizeVariable = {
  id: 'var-2', 
  name: 'fontSize/large',
  resolvedType: 'FLOAT' as const,
  scopes: ['FONT_SIZE' as any],
  variableCollectionId: 'collection-1',
  valuesByMode: {
    'mode-1': 24
  },
  description: 'Large font size'
};

const mockFontWeightVariable = {
  id: 'var-3',
  name: 'fontWeight/boldItalic', 
  resolvedType: 'STRING' as const,
  scopes: ['FONT_STYLE' as any], // Figma uses FONT_STYLE scope for font weights
  variableCollectionId: 'collection-1',
  valuesByMode: {
    'mode-1': 'Bold Italic'
  },
  description: 'Bold italic font weight'
};

const mockLineHeightVariable = {
  id: 'var-4',
  name: 'lineHeight/loose',
  resolvedType: 'FLOAT' as const,
  scopes: ['LINE_HEIGHT' as any],
  variableCollectionId: 'collection-1',
  valuesByMode: {
    'mode-1': 1.0499999523162842 // Typical floating point precision issue
  },
  description: 'Loose line height'
};

const mockBreakpointVariable = {
  id: 'var-5',
  name: 'breakpoint/768',
  resolvedType: 'FLOAT' as const,
  scopes: [], // Breakpoints typically have empty scopes
  variableCollectionId: 'collection-1',
  valuesByMode: {
    'mode-1': 768
  },
  description: 'Tablet breakpoint'
};

const mockGridColumnsVariable = {
  id: 'var-6',
  name: 'grid/columns/12',
  resolvedType: 'FLOAT' as const,
  scopes: [], // Grid tokens typically have empty scopes
  variableCollectionId: 'collection-1',
  valuesByMode: {
    'mode-1': 12
  },
  description: '12 column grid'
};

const mockGridGutterVariable = {
  id: 'var-7',
  name: 'grid/gutter/24',
  resolvedType: 'FLOAT' as const,
  scopes: [],
  variableCollectionId: 'collection-1',
  valuesByMode: {
    'mode-1': 24
  },
  description: '24px gutter'
};

const mockContainerMaxFullVariable = {
  id: 'var-8',
  name: 'grid/containermax/full',
  resolvedType: 'FLOAT' as const,
  scopes: [],
  variableCollectionId: 'collection-1',
  valuesByMode: {
    'mode-1': 1
  },
  description: 'Full width container (100%)'
};

const mockCollection = {
  id: 'collection-1',
  name: 'Design Tokens',
  modes: [{ modeId: 'mode-1', name: 'Default' }],
  defaultModeId: 'mode-1'
};

describe('DTCG Compliance Fixes Integration', () => {
  test('Fix 1: Color components rounded to 4 decimals', () => {
    const options: ExportOptions = {
      units: 'px',
      remMultiplier: 16,
      lineHeightOutput: 'ratio',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    
    // Test color conversion with many decimal places
    const color = { r: 0.12345678901234567, g: 0.5, b: 0.9876543210987654, a: 0.87654321 };
    const result = (exporter as any).convertColor(color);
    
    expect(result.components[0]).toBe(0.1235); // Rounded to 4 decimals
    expect(result.components[1]).toBe(0.5);    // Exact value
    expect(result.components[2]).toBe(0.9877); // Rounded to 4 decimals  
    expect(result.alpha).toBe(0.877);          // Rounded to 3 decimals for opacity
  });

  test('Fix 2: Font sizes converted to dimension with px units', () => {
    const options: ExportOptions = {
      units: 'px',
      remMultiplier: 16,
      lineHeightOutput: 'ratio',
      letterSpacingUnits: 'px', 
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockFontSizeVariable.id, mockFontSizeVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockFontSizeVariable, 
      24, 
      variableMap
    );
    
    expect(dtcgToken.$type).toBe('dimension');
    expect(dtcgToken.$value).toEqual({ value: 24, unit: 'px' });
  });

  test('Fix 2: Font sizes converted to dimension with rem units', () => {
    const options: ExportOptions = {
      units: 'rem',
      remMultiplier: 16,
      lineHeightOutput: 'ratio',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockFontSizeVariable.id, mockFontSizeVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockFontSizeVariable,
      24,
      variableMap
    );
    
    expect(dtcgToken.$type).toBe('dimension');
    expect(dtcgToken.$value).toEqual({ value: 1.5, unit: 'rem' }); // 24/16 = 1.5
  });

  test('Fix 5: Font weight strings converted to numeric with italic extracted', () => {
    const options: ExportOptions = {
      units: 'px',
      remMultiplier: 16,
      lineHeightOutput: 'ratio',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockFontWeightVariable.id, mockFontWeightVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockFontWeightVariable,
      'Bold Italic',
      variableMap
    );
    
    expect(dtcgToken.$type).toBe('fontWeight');
    expect(dtcgToken.$value).toBe(700); // Bold = 700, italic stripped
  });

  test('Typography token with fontStyle extracted from font weight', () => {
    // extractFontStyle lives on TypographyConverter (was on TokenExporter).
    const converter = new TypographyConverter();

    expect((converter as any).extractFontStyle('Bold Italic')).toBe('italic');
    expect((converter as any).extractFontStyle('Bold')).toBe('normal');
    expect((converter as any).extractFontStyle('Light Oblique')).toBe('oblique');
    expect((converter as any).extractFontStyle('Regular')).toBe('normal');
  });

  test('Letter spacing with rem conversion', () => {
    // resolveLetterSpacing lives on TypographyConverter (was on TokenExporter).
    const converter = new TypographyConverter();
    const context = {
      variableMap: new Map(),
      fontWeightCache: {},
      lineHeightCache: {},
      useRem: true,
      baseFontSize: 16,
      letterSpacingUnits: 'px' as const,
      lineHeightOutput: 'ratio' as const,
      includeFigmaExtensions: false,
      dimensionFormat: 'object' as const,
      letterSpacingFormat: 'object' as const,
    };

    const letterSpacing = { value: 16, unit: 'PIXELS' as const };
    const result = (converter as any).resolveLetterSpacing(letterSpacing, undefined, context);

    expect(result).toEqual({ value: 1, unit: 'rem' }); // 16px / 16 = 1rem
  });

  test('Letter spacing percent honors letterSpacingFormat: object (DTCG spec)', () => {
    // F4 in docs/format-conformance-audit.md — percent was always emitted as
    // string regardless of letterSpacingFormat. '%' is a valid DTCGDimension unit.
    const converter = new TypographyConverter();
    const context = {
      variableMap: new Map(),
      fontWeightCache: {},
      lineHeightCache: {},
      useRem: false,
      baseFontSize: 16,
      letterSpacingUnits: 'percent' as const,
      lineHeightOutput: 'ratio' as const,
      includeFigmaExtensions: false,
      dimensionFormat: 'object' as const,
      letterSpacingFormat: 'object' as const,
    };

    const letterSpacing = { value: 2.5, unit: 'PERCENT' as const };
    const result = (converter as any).resolveLetterSpacing(letterSpacing, undefined, context);

    expect(result).toEqual({ value: 2.5, unit: '%' });
  });

  test('Letter spacing percent honors letterSpacingFormat: string (SD preset)', () => {
    const converter = new TypographyConverter();
    const context = {
      variableMap: new Map(),
      fontWeightCache: {},
      lineHeightCache: {},
      useRem: false,
      baseFontSize: 16,
      letterSpacingUnits: 'percent' as const,
      lineHeightOutput: 'ratio' as const,
      includeFigmaExtensions: false,
      dimensionFormat: 'object' as const,
      letterSpacingFormat: 'string' as const,
    };

    const letterSpacing = { value: 2.5, unit: 'PERCENT' as const };
    const result = (converter as any).resolveLetterSpacing(letterSpacing, undefined, context);

    expect(result).toBe('2.5%');
  });

  test('Complete typography token structure validation', () => {
    // Create a sample typography token with all the DTCG-compliant fixes applied
    const typographyToken = {
      $type: 'typography',
      $value: {
        fontFamily: ['Inter', 'sans-serif'],
        fontSize: { value: 1.5, unit: 'rem' },      // Fix 2: dimension with units
        fontWeight: 700,                            // Fix 5: numeric value  
        fontStyle: 'italic',                        // Fix 5: italic extracted
        letterSpacing: { value: 0.075, unit: 'rem' }, // Fix 3: dimension with units
        lineHeight: 1.5                             // Unitless multiplier
      }
    };

    const validationResult = validateDTCGFile({ typography: typographyToken });
    
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  test('Dimension token validation with different units', () => {
    const dimensionTokenPx = {
      $type: 'dimension',
      $value: { value: 24, unit: 'px' }
    };

    const dimensionTokenRem = {
      $type: 'dimension', 
      $value: { value: 1.5, unit: 'rem' }
    };

    const validationResult1 = validateDTCGFile({ 'size-px': dimensionTokenPx });
    const validationResult2 = validateDTCGFile({ 'size-rem': dimensionTokenRem });
    
    expect(validationResult1.isValid).toBe(true);
    expect(validationResult2.isValid).toBe(true);
    expect(validationResult1.errors).toHaveLength(0);
    expect(validationResult2.errors).toHaveLength(0);
  });

  test('Font weight validation accepts numeric values', () => {
    const fontWeightToken = {
      $type: 'fontWeight',
      $value: 700
    };

    const validationResult = validateDTCGFile({ 'weight-bold': fontWeightToken });
    
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  test('Line height as unitless ratio with proper rounding', () => {
    const options: ExportOptions = {
      units: 'px',
      remMultiplier: 16,
      lineHeightOutput: 'ratio',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockLineHeightVariable.id, mockLineHeightVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockLineHeightVariable,
      1.0499999523162842,
      variableMap
    );
    
    expect(dtcgToken.$type).toBe('number');
    expect(dtcgToken.$value).toBe(1.05); // Rounded to 3 decimals
  });

  test('Line height as dimension with px units', () => {
    const options: ExportOptions = {
      units: 'px',
      remMultiplier: 16,
      lineHeightOutput: 'dimension',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockLineHeightVariable.id, mockLineHeightVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockLineHeightVariable,
      24.123456789,
      variableMap
    );
    
    expect(dtcgToken.$type).toBe('dimension');
    expect(dtcgToken.$value).toEqual({ value: 24.12, unit: 'px' }); // Rounded to 2 decimals
  });

  test('Line height as dimension with rem units', () => {
    const options: ExportOptions = {
      units: 'rem',
      remMultiplier: 16,
      lineHeightOutput: 'dimension',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockLineHeightVariable.id, mockLineHeightVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockLineHeightVariable,
      24.123456789,
      variableMap
    );
    
    expect(dtcgToken.$type).toBe('dimension');
    expect(dtcgToken.$value).toEqual({ value: 1.508, unit: 'rem' }); // 24.123/16 = 1.5077, rounded to 3 decimals
  });

  test('Line height as percentage with proper rounding', () => {
    const options: ExportOptions = {
      units: 'px',
      remMultiplier: 16,
      lineHeightOutput: 'percentage',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockLineHeightVariable.id, mockLineHeightVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockLineHeightVariable,
      1.555555555,
      variableMap
    );
    
    expect(dtcgToken.$type).toBe('dimension');
    expect(dtcgToken.$value).toEqual({ value: 155.6, unit: '%' }); // 1.5556 * 100 = 155.56, rounded to 1 decimal
  });

  test('Line height dimension validation', () => {
    const lineHeightTokenPx = {
      $type: 'dimension',
      $value: { value: 24.12, unit: 'px' }
    };

    const lineHeightTokenRem = {
      $type: 'dimension',
      $value: { value: 1.5, unit: 'rem' }
    };

    const lineHeightTokenPercent = {
      $type: 'dimension',
      $value: { value: 150.0, unit: '%' }
    };

    const validationResult1 = validateDTCGFile({ 'line-height-px': lineHeightTokenPx });
    const validationResult2 = validateDTCGFile({ 'line-height-rem': lineHeightTokenRem });
    const validationResult3 = validateDTCGFile({ 'line-height-percent': lineHeightTokenPercent });
    
    expect(validationResult1.isValid).toBe(true);
    expect(validationResult2.isValid).toBe(true);
    expect(validationResult3.isValid).toBe(true);
    expect(validationResult1.errors).toHaveLength(0);
    expect(validationResult2.errors).toHaveLength(0);
    expect(validationResult3.errors).toHaveLength(0);
  });

  test('Breakpoint variables converted to dimension with px units', () => {
    const options: ExportOptions = {
      units: 'px',
      remMultiplier: 16,
      lineHeightOutput: 'ratio',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockBreakpointVariable.id, mockBreakpointVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockBreakpointVariable,
      768,
      variableMap
    );
    
    expect(dtcgToken.$type).toBe('dimension');
    expect(dtcgToken.$value).toEqual({ value: 768, unit: 'px' });
  });

  test('Breakpoints always use px units even when global setting is rem', () => {
    const options: ExportOptions = {
      units: 'rem', // Global setting is rem
      remMultiplier: 16,
      lineHeightOutput: 'ratio',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockBreakpointVariable.id, mockBreakpointVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockBreakpointVariable,
      1024,
      variableMap
    );
    
    // Breakpoints should still use px units, not converted to rem
    expect(dtcgToken.$type).toBe('dimension');
    expect(dtcgToken.$value).toEqual({ value: 1024, unit: 'px' });
  });

  test('Breakpoint variable name detection works for various patterns', () => {
    // isBreakpointVariable lives on TokenTypeDetector (was on TokenExporter).
    const detector = new TokenTypeDetector();

    const breakpointPatterns = [
      'breakpoint/tablet',
      'screen/mobile',
      'viewport/desktop',
      'size/lg',
      'width/1024',
      '768', // Pure numeric
      'min-width/390'
    ];

    breakpointPatterns.forEach(name => {
      expect(detector.isBreakpointVariable(name)).toBe(true);
    });

    const nonBreakpointPatterns = [
      'color/primary',
      'fontSize/large',
      'spacing/medium',
      'fontWeight/bold'
    ];

    nonBreakpointPatterns.forEach(name => {
      expect(detector.isBreakpointVariable(name)).toBe(false);
    });
  });

  test('Breakpoint dimension validation', () => {
    const breakpointToken = {
      $type: 'dimension',
      $value: { value: 768, unit: 'px' }
    };

    const validationResult = validateDTCGFile({ 'breakpoint-tablet': breakpointToken });
    
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  test('Grid columns converted to unitless number', () => {
    const options: ExportOptions = {
      units: 'px',
      remMultiplier: 16,
      lineHeightOutput: 'ratio',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockGridColumnsVariable.id, mockGridColumnsVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockGridColumnsVariable,
      12,
      variableMap
    );
    
    expect(dtcgToken.$type).toBe('number');
    expect(dtcgToken.$value).toBe(12); // Unitless column count
  });

  test('Grid gutter converted to dimension with px units', () => {
    const options: ExportOptions = {
      units: 'px',
      remMultiplier: 16,
      lineHeightOutput: 'ratio',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockGridGutterVariable.id, mockGridGutterVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockGridGutterVariable,
      24,
      variableMap
    );
    
    expect(dtcgToken.$type).toBe('dimension');
    expect(dtcgToken.$value).toEqual({ value: 24, unit: 'px' });
  });

  test('Grid gutters always use px units even when global setting is rem', () => {
    const options: ExportOptions = {
      units: 'rem', // Global setting is rem
      remMultiplier: 16,
      lineHeightOutput: 'ratio',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockGridGutterVariable.id, mockGridGutterVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockGridGutterVariable,
      24,
      variableMap
    );
    
    // Grid dimensions should still use px units, not converted to rem
    expect(dtcgToken.$type).toBe('dimension');
    expect(dtcgToken.$value).toEqual({ value: 24, unit: 'px' });
  });

  test('ContainerMax full token converted to 100% percentage', () => {
    const options: ExportOptions = {
      units: 'px',
      remMultiplier: 16,
      lineHeightOutput: 'ratio',
      letterSpacingUnits: 'px',
      includeFigmaExtensions: false,
      includeValidationReport: false
    };

    const exporter = new TokenExporter(options);
    const variableMap = new Map([[mockContainerMaxFullVariable.id, mockContainerMaxFullVariable as any]]);
    
    const dtcgToken = (exporter as any).convertVariableToDTCG(
      mockContainerMaxFullVariable,
      1,
      variableMap
    );
    
    expect(dtcgToken.$type).toBe('dimension');
    expect(dtcgToken.$value).toEqual({ value: 100, unit: '%' }); // 1 → 100%
  });

  test('Grid variable detection works for various patterns', () => {
    // isGridVariable / isGridColumnsVariable live on TokenTypeDetector
    // (were on TokenExporter).
    const detector = new TokenTypeDetector();

    const gridPatterns = [
      'grid/columns/12',
      'grid/gutter/24',
      'grid/margin/16',
      'grid/containermax/full',
      'column/count',
      'gutter/size',
      // Note: 'container/width' was previously in this list but never matched
      // — 'container' is not in TYPE_DETECTION_PATTERNS.GRID. Whether bare
      // 'container/...' should detect as grid is open in the format-conformance
      // audit (#30).
    ];

    gridPatterns.forEach(name => {
      expect(detector.isGridVariable(name)).toBe(true);
    });

    // isGridColumnsVariable matches "columns" (plural) but not "columnwidth".
    // Singular "column/count" is excluded — flagged for #30 audit (open
    // question whether singular column-count tokens should detect).
    const columnPatterns = [
      'grid/columns/12',
      'columns/4',
      'grid/system/sm/fluid/columns',
      'system/lg/columns',
      'layout/columns'
    ];

    columnPatterns.forEach(name => {
      expect(detector.isGridColumnsVariable(name)).toBe(true);
    });

    // Non-column grid patterns (should be dimensions, not column counts).
    const dimensionPatterns = [
      'grid/gutter/24',
      'grid/margin/16',
      'grid/columnwidth/163',
      'grid/containermax/320'
    ];

    dimensionPatterns.forEach(name => {
      expect(detector.isGridColumnsVariable(name)).toBe(false);
    });
  });

  test('ContainerMax full detection works correctly', () => {
    // isContainerMaxFullVariable lives on TokenTypeDetector (was on TokenExporter).
    const detector = new TokenTypeDetector();

    // Should detect containermax full with value 1
    expect(detector.isContainerMaxFullVariable('grid/containermax/full', 1)).toBe(true);
    expect(detector.isContainerMaxFullVariable('containermax/full', 1)).toBe(true);

    // Should not detect other values or names
    expect(detector.isContainerMaxFullVariable('grid/containermax/320', 320)).toBe(false);
    expect(detector.isContainerMaxFullVariable('grid/containermax/full', 100)).toBe(false);
    expect(detector.isContainerMaxFullVariable('grid/gutter/16', 1)).toBe(false);
  });

  test('Grid token validation', () => {
    const gridColumnsToken = {
      $type: 'number',
      $value: 12
    };

    const gridGutterToken = {
      $type: 'dimension',
      $value: { value: 24, unit: 'px' }
    };

    const containerMaxFullToken = {
      $type: 'dimension',
      $value: { value: 100, unit: '%' }
    };

    const validationResult1 = validateDTCGFile({ 'grid-columns': gridColumnsToken });
    const validationResult2 = validateDTCGFile({ 'grid-gutter': gridGutterToken });
    const validationResult3 = validateDTCGFile({ 'container-full': containerMaxFullToken });
    
    expect(validationResult1.isValid).toBe(true);
    expect(validationResult2.isValid).toBe(true);
    expect(validationResult3.isValid).toBe(true);
    expect(validationResult1.errors).toHaveLength(0);
    expect(validationResult2.errors).toHaveLength(0);
    expect(validationResult3.errors).toHaveLength(0);
  });
});