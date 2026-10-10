## (2026-10-10) — Layout: the studio refuses a breakpoint list that doesn't start at 0, and draws one that arrives that way (#2146 item 3)

**STATUS: branch `ui/2146-studio-first-breakpoint`.** Studio state only. No engine change, no committed artifact moves, no ENGINE bump owed. `CONTRACT_VERSION` unchanged. **One new DRAFT label** (owner Q189 A, below). **Closes #2146**: items 1 and 2 landed in #2158 (2026-10-05).

### Where the three surfaces stand

1. **MCP `validate_brand`** (#2158): runs the build path and returns the engine's sentence for `[320, 768]`, which `mcp-test.ts` asserts over the wire. Unchanged here.
2. **Schema and lever prose** (#2158, owner Q26 a): `theme-schema.json` says "The first must be 0."; `levers.ts` and the studio tooltip say "The first is always 0px." Unchanged here.
3. **Studio (this PR):**
   - **Refuses.** `commitBreakpoints` (`apps/studio/src/state/layout-input.ts`) returns `{ refused: true }` and writes nothing when the result wouldn't start at 0. That covers removing the 0px breakpoint, moving it, and adding to a list that already starts above 0. The page already puts a refused field back, and its row 0 is disabled with no Remove, so the page never asks for one. The guard covers the state API itself.
   - **Doesn't throw.** `namesFor` names a list that starts above 0 by its count (names follow the count alone), so the page draws such a state instead of throwing mid-render. That was #2146's named risk.
   - **Explains, where the studio already explains refusals.** Loading such a brand refuses: `initSession` throws the engine's sentence, and the import and restore paths catch it. An agent's live write keeps the last good theme and sets `lastError` to that sentence for the error line (`rebuild`; `studioMessage` passes it through unchanged). Both are now asserted.
   - The module header no longer calls the 0px first breakpoint "the page's limit". Since #2139 it's the engine's rule.

**The sentence is the owner-approved one from #2139**: "The first breakpoint must be 0px. This brand starts at ‹n›px." There's no new copy, and the Layout page gets no second line repeating the error line.

### Tests (`apps/studio/test-layout-input.ts`, section 4; 25 → 32)

- `removeBreakpoint(0)` and `editBreakpoint(0, 320)` are refused, and the brand stays byte-identical.
- An edit that keeps 0 still writes.
- Loading `[320, 768]` throws the sentence, as a literal.
- A live write of `[320, 768]` keeps the last good theme `[0, 768]` and sets `lastError` to the sentence.
- `namesFor` on that state gives `sm, md` without throwing.
- Add on that state is refused without throwing.

**Mutations:**
- Drop the commit-time refusal: 4 assertions fail by name, showing `[768,1024]` and `[320,1024]` written.
- Drop the `namesFor` guard: 2 fail by name, with the engine sentence thrown during the draw.

### The way out: "Add a 0px breakpoint" (owner Q189 A)

The first round left one state with no way out: a brand that arrives mid-session starting above 0 (only an agent's live write can make one). Row 0 is disabled and every write is refused, so the error line explained the problem but offered no fix. The owner chose A: a one-click action beside the error line.

- **State:** `needsZeroBreakpoint()` checks whether the brand's own list starts above 0. `addZeroBreakpoint()` puts `{ px: 0 }` in front of the existing entries and commits through `commitBreakpoints`. Every other width stays, and each per-breakpoint override follows its breakpoint to its new name under D13 (`320: sm → md`, `768: md → lg`). It's refused, writing nothing, on a list that already starts at 0.
- **Strip:** `errorStrip().show(text, action?)` (`shell/notices.ts`) mounts a `p3-btn` with the hook `error-fix` beside the line, and only while there's an action. The first draft kept a hidden `p3-btn-page` in every strip. `.p3-btn`'s `display` beat `hidden`, so `test:chrome` §29 measured an empty control at 2.7:1 and failed it by name. The plain `p3-btn` edge, measured shown on the strip's own ground, is 3.18:1 light and 3.93:1 dark, and the label is 19.4:1 and 18.1:1.
- **Wiring:** `firstBreakpointFix()` in `domains/layout.ts` builds the action, or returns null unless `needsZeroBreakpoint()`. `syncErrorBar` (`main.ts`) passes it on the `lastError` branch only, so any other error gets no button. The write stays in the Layout domain: `test-shell-imports.ts` holds that `main.ts` imports nothing from `state/layout-input`. The first draft wired the action in `main.ts` and that gate failed it by name, so it was moved.
- **Copy (DRAFT):** the label "Add a 0px breakpoint" (`LAYOUT_DRAFT.addZero`). No other new sentence; the error line is still the approved #2139 sentence.

**Edges, kept as they are on purpose:**
- **Seven breakpoints become eight.** A brand that arrives with seven breakpoints and starts above 0 becomes eight after the click. The engine refuses that ("The brand can have at most seven breakpoints. This brand has 8."), so the error line changes to that sentence and the action goes. The list then starts at 0, so the page's Remove works on every row but the first, and that's the way out. Dropping a breakpoint automatically would break "nothing else changes".
- **Mid-session only.** Importing or restoring such a brand still refuses at load (`initSession` throws the sentence). The action is for a brand that's already open.

**Tests:**
- `test-layout-input.ts` section 5 (32 → 38): not offered at 0; offered after a live `[320, 768]`; the click gives exactly `[0, 320, 768]`; column overrides re-keyed `{ md: 6, lg: 10 }`; after rebuild `lastError` is null and the action goes; refused and byte-identical on a list starting at 0.
- `test-smoke.mjs` §2d, per brand:
  - the title-floor refusal shows no action (through `absent()`, with the shown bar as its proof);
  - a live `[320, 768]` shows the button with the literal label;
  - one click clears the bar and stores `[0, 320, 768]`, with everything outside `layout` byte-identical.

**Mutations, each failing by name:**
- **The action missing:**
  - `main.ts` passes no action: the hook guard (`"error-fix" … never appeared in the rendered DOM`) and smoke "…shows "Add a 0px breakpoint" beside the error line — no action shown" and "one click clears the bar…" fail for prism3, aurora and harbor.
  - `needsZeroBreakpoint` is always false: 4 unit assertions fail.
- **The action altering other breakpoints** (replacing the first with 0 instead of inserting): unit "inserts 0 in front and keeps 320 and 768 exactly — [0,768]" fails, plus 2 more. Smoke "…stores [0, 320, 768]… — breakpoints [0,768]" fails for all three brands.
