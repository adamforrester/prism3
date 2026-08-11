/**
 * Regression test for #709 — OPACITY-scoped variables exported 100× out of DTCG range.
 *
 * Found by `tools/exporter-comparison` (#707) running both DTCG exporters over the same brand:
 * 11 tokens on each of nb and aurora, and the only difference in the whole comparison that
 * changed a value a consumer applies directly.
 *
 *   prism3 DTCG           opacity.5 = 0.05    ($type: number)
 *   prism3 Figma emission opacity/5 = 5       (FLOAT, scopes: ["OPACITY"])
 *   TokenPress read-back  opacity.5 = 5       ← 100× out of range
 *
 * Figma interprets an OPACITY-scoped FLOAT as a PERCENT (0–100); DTCG `number` opacity is a 0–1
 * FRACTION. Neither exporter was internally wrong — the ROUND-TRIP was — and the conversion
 * belongs where the percent convention is being left, which is here. A consumer applying `5` gets
 * full opacity where 5% was authored.
 *
 * WHY THIS FILE EXISTS AT ALL, which is the more useful half. The pre-existing opacity coverage was
 * one assertion, in `scope-dimension-detection.test.ts`:
 *
 *     expect(mapType(['OPACITY'], 'opacity-50')).toBe('number')
 *
 * It asserts the `$type` and never the VALUE, which is exactly how a value 100× out of bounds
 * passed a green suite for the entire life of the code. A type check cannot see a range error. So
 * the assertions below are on values and on the range, and the type assertion stays where it is.
 *
 * THE EXPECTED VALUES ARE NOT DERIVED FROM THE CODE UNDER TEST (docs/34). Each one is the DTCG
 * fraction for a percent that prism3's engine actually emits — `packages/engine/out/nb.tokens.json`
 * holds `nbds.opacity.5 = 0.05` and `packages/engine/out/figma/nb/opacity.json` holds
 * `opacity/5 = 5`. The pairs below are transcribed from those two committed artifacts, so the
 * expectation is an independent measurement of the round-trip's two ends rather than a restatement
 * of what the converter happens to compute.
 */

import { describe, test, expect } from '../../test-harness';
import { TokenExporter } from '../../src/plugin/exporter';
import { DimensionConverter } from '../../src/plugin/converters/dimension-converter';
import { validateDTCGFile, ValidationResult } from '../../src/utils/dtcg-validator';

/** Reach into the private conversion without hitting Figma globals. */
function convert(value: number, scopes: string[] = ['OPACITY']): unknown {
  const exporter = new TokenExporter({} as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (exporter as any).convertVariableValue(
    value,
    'FLOAT',
    new Map(),
    'number',
    scopes,
    'opacity-50'
  );
}

/**
 * The percent→fraction pairs prism3 actually round-trips, transcribed from the two committed
 * artifacts named in the header (Figma emission → canonical DTCG). This is the full opacity ramp
 * for `nb`: 12 tokens, and the 11 non-zero ones are #709's measured count.
 */
const RAMP: Array<[percent: number, fraction: number]> = [
  [0, 0],
  [5, 0.05],
  [10, 0.1],
  [20, 0.2],
  [30, 0.3],
  [40, 0.4],
  [50, 0.5],
  [60, 0.6],
  [70, 0.7],
  [80, 0.8],
  [90, 0.9],
  [100, 1],
];

describe('OPACITY percent → DTCG fraction (#709)', () => {
  test("prism3's whole opacity ramp round-trips to the fraction it started as", () => {
    for (const [percent, fraction] of RAMP) {
      expect(convert(percent)).toBe(fraction);
    }
  });

  test('every converted value lands inside the DTCG 0–1 range', () => {
    // The range assertion the old type-only coverage could not make. Stated separately from the
    // exact-value test above on purpose: a future change that keeps values in range while getting
    // them wrong fails the first test, and one that gets the arithmetic right on this ramp while
    // breaking an unlisted value fails this one.
    for (const [percent] of RAMP) {
      const out = convert(percent) as number;
      expect(out >= 0 && out <= 1).toBe(true);
    }
    expect(convert(100)).toBe(1);
  });

  test('the divide happens BEFORE the rounding, so it does not emit IEEE noise', () => {
    // Dividing by 100 introduces representation noise: 33.3 / 100 is 0.33299999999999996 and
    // 1.1 / 100 is 0.011000000000000001. Rounding first (which is what the pre-#709 code did) and
    // dividing after would leave that noise in the output.
    expect(convert(33.3)).toBe(0.333);
    expect(convert(1.1)).toBe(0.011);
    expect(convert(66.7)).toBe(0.667);
  });

  test('sub-percent precision survives, which is why the precision shifted too', () => {
    // At DECIMAL_3 the fraction would truncate exactly the two digits the divide moved right:
    // 5.001 would collapse to 0.05 and 0.05 to 0.001. DECIMAL_5 preserves on the fraction scale
    // what DECIMAL_3 preserved on the percent scale.
    expect(convert(5.001)).toBe(0.05001);
    expect(convert(0.05)).toBe(0.0005);
  });

  test('a half-percent is halved, not passed through — no magnitude heuristic', () => {
    // `v > 1 ? v / 100 : v` reads plausibly and is wrong. 0.5 is a legitimate half-percent, and
    // that rule would emit it as 0.5 — full opacity — instead of 0.005. Named here because it is
    // the fix a future reader is most likely to "simplify" toward.
    expect(convert(0.5)).toBe(0.005);
    expect(convert(1)).toBe(0.01);
  });

  test('a FLOAT without the OPACITY scope is untouched', () => {
    // The negative control. Without it, a converter that divided EVERY float by 100 would pass
    // every assertion above and look identical to a correct one.
    expect(convert(5, [])).toBe(5);
    expect(convert(50, ['WIDTH_HEIGHT'])).toBe(50);
  });
});

describe('DimensionConverter carries the same conversion (#709)', () => {
  /**
   * The dormant twin. `DimensionConverter` is constructed by the exporter but `convert()` has no
   * caller, so this copy of #709 could not affect an export — and equally could not be caught by
   * any test of one. It is asserted here so that wiring the class up cannot resurrect the bug
   * silently, which is the #708 shape: several readers of one convention, one of them still
   * working, and its success hiding the others' failure.
   */
  function convertVia(value: number, scopes: string[]): unknown {
    const converter = new DimensionConverter();
    const variable = {
      name: 'opacity/50',
      resolvedType: 'FLOAT',
      scopes,
      valuesByMode: { m: value },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return converter.convert(variable, { variableMap: new Map() } as any);
  }

  test('the same ramp, through the other reader', () => {
    expect(convertVia(5, ['OPACITY'])).toBe(0.05);
    expect(convertVia(90, ['OPACITY'])).toBe(0.9);
    expect(convertVia(100, ['OPACITY'])).toBe(1);
  });

  test('and the same negative control', () => {
    expect(convertVia(50, ['WIDTH_HEIGHT'])).not.toBe(0.5);
  });
});

describe('the validator says so too, at the other end of the pipe (#709)', () => {
  /**
   * The conversion above is the fix; this is the alarm for the next time something like it slips.
   * `validateNumberToken` checked the TYPE and never the meaning, so `5` passed as a valid opacity
   * — the bug and its validator agreed with each other for the whole life of the code.
   *
   * The range rule is name-scoped and warns rather than errors, and both tests below pin a half of
   * that. See the comment on `validateNumberToken` for the measurements behind it: a blanket 0–1
   * rule on `$type: number` would fire on 98 of the 250 number tokens we ourselves emit.
   */
  function validate(path: string, value: number): ValidationResult {
    const parts = path.split('.');
    const leaf = parts.pop() as string;
    let tree: Record<string, unknown> = { [leaf]: { $type: 'number', $value: value } };
    for (const p of parts.reverse()) {
      tree = { [p]: tree };
    }
    return validateDTCGFile(tree as never);
  }

  test('an unconverted percent on an opacity path is reported', () => {
    const result = validate('prism.opacity.5', 5);
    const codes = result.warnings.map((w) => w.code);
    expect(codes.includes('OPACITY_OUT_OF_RANGE')).toBe(true);
    // A warning, not an error — the name match is a heuristic and this validator reads
    // arbitrary third-party files.
    expect(result.errors.some((e) => e.code === 'OPACITY_OUT_OF_RANGE')).toBe(false);
  });

  test('the converted fraction is not reported', () => {
    expect(
      validate('prism.opacity.5', 0.05).warnings.some((w) => w.code === 'OPACITY_OUT_OF_RANGE')
    ).toBe(false);
    expect(
      validate('prism.opacity.100', 1).warnings.some((w) => w.code === 'OPACITY_OUT_OF_RANGE')
    ).toBe(false);
  });

  test('a line-height of 1.5 is left alone — the rule is not a blanket 0–1 check', () => {
    // The negative control, and the reason the rule is scoped by name at all. 1.5 is a correct
    // line-height and 12 is a correct grid column count; both are `$type: number` and both are
    // outside 0–1. A general range rule would flag 98 of our own emitted tokens.
    expect(
      validate('prism.font.line-height.150', 1.5).warnings.some(
        (w) => w.code === 'OPACITY_OUT_OF_RANGE'
      )
    ).toBe(false);
    expect(
      validate('prism.grid.md.columns', 12).warnings.some((w) => w.code === 'OPACITY_OUT_OF_RANGE')
    ).toBe(false);
  });
});
