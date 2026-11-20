## (2026-11-20) — Agent paste writes font cuts in the family's spelling; a negative-angle gradient is Prism3's (#3861, #1908)

### #3861 — the paste's font step resolves the cuts first
`runFont` (`mcp-steps.ts`) wrote the font plan exactly as built, so the cut variables held the engine's spelling (`Light Condensed`) until the `text` step's reconcile ran. The step now carries the text plan's cut → family pairing (`cutPairsOf`, `preload-fonts.ts`), each pair once, and calls `resolveCutPlan` with the host's font list before `applyVarCollectionPlan`, the same call Apply Theme makes. `resolveCutPlan` takes the pairs or the whole text plan, so the two paths can't disagree. The font script stays under `SCRIPT_CEILING`: the pairing is about a dozen short strings.

The new `font cut spelling` arm in `test-mcp-paste.ts` runs the paste only up to its font step, on a host whose families spell every multi-word style without its space. Its oracle is the shim's own face list, never `resolveCutPlan`.

### #1908 — the gradient description pattern takes any number
`STYLE_SIGNATURES.paint` (`prune-figma.ts`) accepted only `\d+(?:\.\d+)?°`. The formatter (`figmaGradientDescription`) prints `${angle}°` with JavaScript's number form, and the brand schema doesn't bound the angle. The pattern now takes a sign and an exponent. The arm applies aurora with gradients at -45° and 1e-7, strips the style marks (a file from before #1906), and re-applies with 0 conflicts. The prune suite's hand-typed false-positive arms still hold.
