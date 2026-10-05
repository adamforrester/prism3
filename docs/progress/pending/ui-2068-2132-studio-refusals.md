## (2026-10-05) — Type: a viewport pair the engine refuses is put back, with the engine's sentence (#2068)

**STATUS: branch `ui/2068-2132-studio-refusals`.** UI only: no engine change, no emitted artifact moves, ENGINE stays at {{ENGINE_VERSION}}, `CONTRACT_VERSION` unchanged. No new copy: the one string shown is the engine's owner-approved sentence. **Part 1 of the studio follow-up to #2133 (#2068) and #2139 (#2132).** Part 2 waits for #2142 (see below).

### What changed

The engine refuses a minimum viewport that is not below the maximum, fluid on or off (#2133): "The minimum viewport (‹min›px) must be smaller than the maximum viewport (‹max›px)." Before this change, Type's Min/Max viewport fields wrote such a pair. The engine then threw, and the error bar showed it.

Now `viewportRefusal(key, n)` in `state/type-input.ts` applies the engine's rule before anything is written. It applies it directly, with no trial build, as `ceilingBlocked()`, `titleFloorBlocked()` and `fluidBlocked()` do.
- The other bound is the brand's, or the engine's default when the brand sets none.
- Values appear as entered, so 1280.5 reads "1280.5px", as in the engine.

When the helper returns a sentence, Type's `onCommit` writes nothing. It puts the field back to its value, and shows the sentence as a warning state line under the fields (hook `type-viewport-refused`). The line clears on the next repaint.

### The display: a choice the owner may want to redirect

The #2044/#2054/#2055 refusals disable a chip or switch with the reason in its `title`. A text field takes any value, so it can't be disabled in advance. Two existing text-field patterns were reused instead, and no new mechanism was added:
- the put-back is how Layout's breakpoint field treats a refused edit;
- the warning line is how Brand's namespace field shows an invalid value.

The alternative, keeping the typed value and showing the line while typing, as the namespace field does, is a design call. I didn't make it.

### Gates and their independence

- **`test-type-input.ts`** checks each case against a sentence typed in the test, never read from the module. The engine is a second witness each time: it throws the same sentence for the pair, and builds each pair the helper lets through.
  - not refused: 375 and 1280 on the default, and 400 under 1280;
  - refused, equal: 1280/1280, 800/800, 375/375;
  - refused, inverted: 375/320, 1280/800;
  - refused, decimal: 1280.5/1280.
- **`test-chrome.mjs`** drives the real fields.
  - With no refusal, no line shows.
  - Min 1280 against the default max, then max 320 against the default min, each show the exact sentence, are put back, write nothing, and leave the error bar quiet.
- **Mutations.** Each was run after a `wip:` commit, and each failed by name:
  - `>=` changed to `>` fails the three equal-value unit arms;
  - a changed wording fails all six refused unit arms;
  - the refusal ignored in `onCommit` fails the six `#2068: …` chrome arms, plus the hook guard's "never appeared in the rendered DOM".

### Trap for whoever is next

A chrome arm that writes an allowed viewport value can't undo it: the field has no way to unset the key, so the value stays in the brand. Type's later "every edit undone, the brand is the one it was" arm then fails, on a typography diff that looks unrelated. The arm here only drives refused values, which write nothing. The allowed case is covered by the unit arm.

### Part 2, not done here

From #2139 (#2132), the engine refuses a brief or saved file whose first breakpoint isn't 0px: "The first breakpoint must be 0px. This brand starts at ‹n›px." The studio should show this through the shared import validator: Start screen paste and upload, and the brand menu. It should use "Line ‹n›: ‹what is wrong›. ‹How to fix it›." when a line is known, and drop the "Line ‹n›: " prefix when none is. That validator arrives with the S12 Start screen PR, #2142, which is still open. Part 2 follows once it merges.
