## (2026-10-10) — Layout: the studio refuses a breakpoint list that doesn't start at 0, and draws one that arrives that way (#2146 item 3)

**STATUS: branch `ui/2146-studio-first-breakpoint`.** Studio state only. No engine change, no committed artifact moves, no ENGINE bump owed. `CONTRACT_VERSION` unchanged. **No new user-facing copy.** **Closes #2146**: items 1 and 2 landed in #2158 (2026-10-05).

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

### Open for the owner (a design question, not decided here)

A brand that arrives mid-session starting above 0 (only an agent's write can do this) can't be fixed from the Layout page: row 0 is disabled and every write is refused, so the error line explains but offers no way out. Should row 0 accept 0 in that case, or should there be a one-step "set to 0px" fix? That's new UI and copy, so it isn't built here.
