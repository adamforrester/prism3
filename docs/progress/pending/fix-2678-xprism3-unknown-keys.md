## (2026-11-18) — A standard design.md names the x-prism3 keys it skips (#2678)

**The decision.** The owner answered Q-XP1 A, option (a), on 2026-11-18. An unknown key in the optional `x-prism3:` block is warned by name, and the file keeps compiling. The owner's rule is to refuse only a file that breaks the design.md spec; a file that follows it compiles on what it carries and says what it skipped. The audit of the refusal half is #4029.

**The fix.**
- `standard-design-md.ts` now holds the ten keys `applyXPrism3` reads as `X_PRISM3_KEYS`, and `xPrism3Warnings` returns one line per other key, in file order.
- `standardToBrandInput` returns those lines as `xWarnings`, and the CLI prints each as `⚠ x-prism3: ignored unknown setting '<key>'` under the applied list.
- The check sits beside `applyXPrism3`, not inside it, so `applyXPrism3`'s contract ("returns what it applied") is unchanged for its other callers.
- The wording is DRAFT, waiting on the owner's voice pass.

**The test.** EXPECTED is typed from the issue's list of the ten keys, never read from `X_PRISM3_KEYS`, so the key list and the warning cannot agree by construction. The input is the issue's own reproduction: `controlShape` and `linkPalette`, beside a `root` that must still apply. The three arms `#2678 known keys`, `#2678 unknown keys` and `#2678 cli` each fail by name under their mutation. The theme skill's "dropped without a warning" line is updated to match.

**Not covered.** Studio's start screen reads the same conversion and does not show `xWarnings` yet. The owner's answer names the CLI's notes, so the studio surface is filed as #4044.
