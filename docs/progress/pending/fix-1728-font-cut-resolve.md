## (2026-11-17) — The font-cut variable is written in the family's own spelling before the text-style stage (#1728)

**What.** `runApplyTheme` now passes the variable stage a font plan whose cut rows are already resolved
(`resolveCutPlan`, `preload-fonts.ts`). Each cut's literal is resolved per mode against the family that the text plan
pairs it with (`fontStyleVar` → `fontFamilyVar`, not a name parse), using `resolveFontStyle` over the host's
`listAvailableFontsAsync`. Before this, the variable stage wrote the engine's `Semi Bold Italic` and the text-style
stage rewrote it to Playfair's `SemiBold Italic` (#1296). A run stopped between the two stages left the wrong value,
and every re-apply wrote it again. The pre-flight and the emission print still read the plans as built; only the values
the variable stage writes change. #1296's reconcile in the text-style stage stays as the second reader.

**Already fixed.** The issue's item 2, the preload warning "typeface unavailable" for a face the resolver finds, was
closed by #1793 (#1789). The new `#1728 whole` arm passes on main and pins it: no Playfair face is reported.

**Left alone, deliberately.** A cut whose family lacks the weight under every spelling keeps the engine's name (no
substitute face, #237), and the preload still reports it (`#1728 missing cut left alone`). An aliased mode, a family
absent from the host, or no host list all leave the planned value.

**Tests.** In `test-apply-interrupted.ts`, the prism3 brand runs on a host whose Playfair spells the cut `SemiBold Italic` and whose Inter
lacks `Semi Bold Italic`:
- A fresh apply stopped at stage 5 (`#1728 interrupted/fresh`), and a re-apply stopped there (`#1728 interrupted/re-apply`), leave the
  Playfair cut at `SemiBold Italic`. Both fail on main with `"Semi Bold Italic"`.
- A pure two-mode arm (`#1728 per mode`) matches the family by mode name.
- Two pure arms pin the alias guards, each in the mode whose family (Playfair) spells the cut differently, so removing
  a guard is observable. In `#1728 aliased cut left alone`, the cut row aliases there. In `#1728 aliased family left
  alone`, the family row aliases there, with a literal fallback naming Playfair. `#1728 resolved count` holds the total.

**Mutations.** The variable stage given the unresolved plan fails both interrupted arms. A substitute style (the family's
first) for a missing cut fails `missing cut left alone`. Matching modes by index instead of name fails `per mode`.
Dropping the cut-row alias guard (`|| row.aliasByMode[i]`) fails `aliased cut left alone`. Dropping the family-row guard
(`|| fam.row.aliasByMode[j]`) fails `aliased family left alone`. Each also fails `resolved count`. Both guards survived
the first version of the arms (review of `167e1a74`).

**Not here.** The agent paste path's font step (`mcp-steps.ts` `runFont`) writes the cut plan without the text plan, so it
keeps the old order. That is filed separately.
