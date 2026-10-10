## (2026-10-09) — Depth & motion: picking a role's default easing curve in Light unsets it (#2051)

**STATUS: branch `ui/2051-easing-default`.** Studio state plus one engine export. No committed artifact moves (`regen --check`: 177 in sync), so no ENGINE change note is owed, the #2006 precedent. `CONTRACT_VERSION` unchanged. **Fixes #2051.**

### What changed

`setEasingRole` (`apps/studio/src/state/depth-motion-input.ts`) used to write `motionPersonality.easingRoles.<role>` in Light for every pick, the default included. So a brand that picked a role's default back wasn't byte-identical to one that never touched it, the same shape as #2006. Now:
- a pick equal to the engine's default for that role (or `undefined`) removes the key;
- an emptied `easingRoles` is removed;
- an emptied `motionPersonality` is removed too, for a brand that never authored motion.

A non-default pick still writes, and a mode's write through `modeLevers` is unchanged.

The default is the engine's own, read rather than restated: `EASING_ROLE_DEFAULTS` in `packages/engine/theme.ts` is now exported (`const` → `export const`), as #2006 exported `TYPE_LINK_DEFAULT`. The emitted tokens can't change, because the engine fills an absent role with that same default. The header comments in `depth-motion-input.ts` and `domains/depth.ts` that described the old trap now describe this rule.

### Tests (`apps/studio/test-depth-motion-input.ts`, section 4)

- The four defaults restated as **literals**: default → `standard`, enter → `decelerate`, exit → `accelerate`, emphasized → `expressive`. A change to the engine's defaults fails here by name instead of moving the expectation with it.
- Picking the default leaves the brand byte-identical to the one loaded.
- calm, then back to the default, removes the key and the emptied `easingRoles`.
- With two roles set, returning one removes only that key.
- On a brand with no `motionPersonality`, set then reset removes `motionPersonality` itself, and the engine resolves the same motion as before (emission unchanged).
- The old assertion that pinned "writes the default curve rather than unsetting (#2051 changes that)" is replaced.

**Mutation:** restoring the old "always write" branch (`if (curve) {`) fails four assertions by name: the three byte-identity ones and the bare-brand one.
