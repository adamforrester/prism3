## (2026-10-04) — A test checks that the chrome's eased scroll follows `motion.transition.default` when its alias is repointed (#2098 item 4)

**STATUS: branch `chrome/2098-motion-transition-alias`, PR open.** Test only: no product code changes, no emitted artifact moves, ENGINE stays at {{ENGINE_VERSION}} and `CONTRACT_VERSION` is unchanged. Part of #2098.

**The read had already moved.** #2098 item 4 says `chrome/spec.mjs` reads `motion.duration.normal` and `easing-role.default`. That was true when #2041 was reviewed. On `main`, #2041 (243d201f) already reads `motion.transition.default#duration` and `#timingFunction`, and `chrome/tokens.mjs`'s `resolve` follows a member's alias. What was still missing is a gate that tells the two reads apart. Over the committed emission they agree, because the composite points at exactly `duration.normal` and `easing-role.default`. So test-chrome.mjs's QA-B9 arm, with its literals `200ms` and `cubic-bezier(0.2, 0, 0, 1)`, passes either way.

**What changed.** `apps/studio/test-chrome-motion.ts` is new, and it runs in `npm run -w @prism3/studio test`. In each chrome theme it:
- takes the rows `shellRows` hands the build;
- clones the merged tree;
- adds fixture leaves (345ms; a curve of 0.11, 0.22, 0.33, 0.44), each one alias hop away, as the emission's are;
- repoints the composite's two members at them;
- asserts `cssOf` builds exactly those values.

The expected values are literals the emission never carries. A control checks that, over the unmodified emission, the same rows read the engine's own values.

**Mutations, each failing by name:**
- `transition-dur` read directly from `motion.duration.normal` → `light: --p3-transition-dur follows the repointed duration (want 345ms, got 200ms)`, and the same in dark;
- `transition-ease` read directly from `motion.easing-role.default` → the `-ease` arm in both themes;
- `resolve` not following a member's alias → both arms in both themes.

**Trap for whoever is next.** That last mutation first crashed the suite (`value.join is not a function`) instead of failing an arm. The test now catches a throwing read and reports it as the value it got, so a broken resolver fails by name like the rest.
