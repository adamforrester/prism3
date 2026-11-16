## (2026-11-16) — `@prism3/css` binds the button label's tracking to its token; Q145 waits on a `tone` prop the engine lacks (#3408)

**What changed.** On the code POC's integration branch `poc/arm-1`, the S2 button follow-ups. Engine output doesn't
move, so there is no change note.

- **Q143 A:** each label style's `letterSpacing` token is bound as `calc(var(--pds3-core-font-letter-spacing-role-…)
  * 1em)`. The token is a `number` since CONTRACT_VERSION 15.0.0, and the generator refuses a dimension. The parity
  check decodes it through new number sentinels (573 bindings). `check-raw-values` excuses only the core tokens a
  label style names.
- **Q139 A, Q140 A:** kept, and documented in the package README.
- **Q141 / Q-HT1 A:** small already reads `space.300`. Medium and large wait on `space.550`, which isn't on `main`.
- **Q145 A isn't built.** The engine has no `tone` prop: Destructive and Neutral are separate defs (#1223), and a
  `data-prop-tone` would be an invented prop the adherence scorer flags. The options are in the journal for the
  owner.
- **Next, on engine PRs to `main`:** `space.550`, Q142 / #3506 (geometry and motion in the emission), Q146 (motion
  tokens in the def).
