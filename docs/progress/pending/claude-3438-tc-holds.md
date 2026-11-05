## (2026-11-05) — The Q-TC holds settled: the visited link icon, and five register entries by design (#3438)

**Status:** owner decisions Q-TC1 B and Q-TC2 to Q-TC5 A. Engine `{{ENGINE_VERSION}}` (minor: Link's code contract,
so its component surface digest, moves). `CONTRACT_VERSION` is unchanged: no token name moves.
`lint-token-consumers.ts` now holds no owner question.

### What changed

- **Q-TC1 B.** Link's `codeOnly` visited entry names `color.icon.link.visited` for a standalone link's trailing icon,
  beside `color.text.link.visited` for the label. A def now reads the token, so its register entry is gone: 240 unread
  becomes 239. Visited is code only (Q289.5 A) and Figma carries no visited member; the owner chose to add none, and no
  shipped docs sentence (both A). Link's evolution line, in the owner's wording, names no token path, so it is not a
  second read that would keep the token claimed if the binding went.
- **Q-TC2 to Q-TC5 A.** The six held entries move to by-design, each reason the owner's wording in substance: the focused
  fills ("kept for consumers; Prism3 controls show focus with the ring"), the destructive marks and the neutral and
  destructive selected fills ("every role carries every state, for consumers"), the tertiary text and fill ("kept for
  consumers"), and the large selection-control rung and extra-small height ("rungs kept for consumers' own
  controls"). The counts are unchanged.

### Verification

Two mutations, each failing `lint-token-consumers` by name: drop the visited icon binding from Link, and the gate fails
`unclaimed: 'color.icon.link.visited'`; drop the rewritten `color.*.tertiary` entry, and it fails
`unclaimed: 'color.foreground.tertiary'` and `unclaimed: 'color.text.tertiary'`.

### For whoever re-verifies this

A prose mention in a def is a read (the gate's header, LIMITS), so the binding is the `codeOnly` sentence. A rewrite of
that sentence that drops the token name puts the token back to unclaimed, which is the mutation above.
