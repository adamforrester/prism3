## (2026-10-06) — docs/46: what rebinding an existing Figma file to Prism3 taught (the NB Log In pilot)

**STATUS: branch `docs/figma-rebind-learnings`.** Docs only: no engine, studio or plugin change, no emitted artifact moves, no ENGINE bump owed, `CONTRACT_VERSION` unchanged.

### Why

The Log In section of "NB Stance Design System (Copy)" was rebuilt onto the file's local Prism3 variables, styles and components through the Figma Console MCP on 2026-10-06. It finished at 0 rogue bindings, with the backup page provably unchanged. The run cost five script fixes and one near-miss, and none of that was written down anywhere in the repo. `docs/10` covers the engine writing tokens *into* a file; nothing covered rebinding a file someone else built. #1145 and #1553 would automate that job, so the traps belong somewhere both can find them.

### What the doc holds

- **The rule (owner, 2026-10-06): never detach a Prism3 component to match a design.** Place it, match what its variants, properties, text and layout overrides allow, and list every difference that remains, so the component gets fixed. The pilot first broke this: it built the 10 form fields as plain frames bound to Prism3 variables. It then put attached `text-field` instances in their place, and §3.1 lists the 13 measured differences (label 14 vs 10px, the "*" pushed to the row's edge as held PR #1832 addresses, an 8 vs 4 gap, 16px input vs 12, no focused-with-value state, a `control` that hugs, and more).
- **The near-miss.** The work page's 8 screens were main components, and the "DO NOT TOUCH" backup page held their instances, so editing in place would have rewritten the backup through propagation. Check `getInstancesAsync()` on every target, and fingerprint what you promised not to touch.
- **Plugin-API traps:**
  - `figma.createAutoLayout` doesn't exist in the bridge runtime.
  - A bound paint keeps its placeholder color, and `exportAsync` rendered it (black text with a correct gray binding).
  - Mixed-run text keeps stale node-level remote aliases until the whole node is set before its runs.
  - Remote `gridStyleId` is a rogue binding that both the mapping pass and the script missed.
- **Mapping traps.** The main one: "Grey - 50" is #767676 under two 20% black overlays, and renders about #4C4C4C. Reading its first paint sent it to `text/tertiary` and made the footer links lighter. The screen-1 comparison against the backup caught it, not any check.
- **The audit's checklist** for "0 rogue bindings", the pilot's owner calls (with a warning that its Q numbers collide with other series in this log), what is open (#2251, components vs frames, the missing header/footer/tabs pieces), and the fingerprint and audit snippets.

### Deliberately not here

The runner script stays in the owner's working folder. Putting it in `tools/` with its audit as a gate would be a separate PR, and only worth it if the rebind becomes repeatable work.
