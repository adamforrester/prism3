## (2026-11-13) — the alias validator refuses cycles and chains the readers cannot follow (#3698 finding 7b)

**STATUS: PR open, not merged.** ENGINE {{ENGINE_VERSION}} (patch, `packages/engine/changes/claude-3698-alias-cycles.md`), CONTRACT stands. Files: `packages/engine/tree.ts` (`aliasFaults`, `ALIAS_MAX_HOPS`, `AliasFault`; `buildTree` calls it; `deref` reads the cap), `packages/engine/fixtures/aliases/chains.tokens.json` (**NEW**), `packages/engine/test.ts` (one block), `packages/engine/cli.ts` and `packages/engine/emit-dtcg.ts` (the failure line names the reason).

**What was wrong.** `buildTree`'s alias gate asked one question per ref: does it name a token? A token that aliased itself, two that aliased each other, or a chain of 11 all passed. The readers disagree: `deref` stops after 10 hops and returns nothing, and `pxOf` / `numOf` read nothing as `0`. So a loop would have emitted clean and been consumed as zero. None exists today (8,034 aliases across the five committed trees, deepest chain 2 hops).

**The fix.** The walk moved out of `buildTree` unchanged into `aliasFaults(tree)`, a pure export, so it can be driven over a fixture. Each collected ref is also followed to a literal: in the alias's own mode where a link has one, else the link's `$value`. A ref to no token is `dangling` (the old check); a chain that reaches a token already on it is a `cycle`; a chain past `ALIAS_MAX_HOPS` is `too-deep`. The cap is 10 because that is `deref`'s limit, and `deref` now reads the same constant. A chain that dangles part-way is reported once, as its own dangling alias. Faults go into `stats.broken` with `reason`, `mode` and `chain`, so the CLI's exit, `emit-dtcg`'s exit and every existing `broken.length === 0` assertion refuse them with no new wiring. No artifact moves.

**The arms.** The clean fixture (a 10-hop chain, a per-mode chain, a composite sub-value) must report nothing. Six faults are planted in copies of it and each must be reported by path and reason:
- a self-alias;
- a two-token loop;
- a loop reached through a clean leaf;
- a loop in one mode only;
- an 11-hop chain;
- a dangling ref.

`deref` is driven over the same 10- and 11-hop chains, so the validator's cap stays tied to the reader's. The cap is typed in the test as 10, never read from the constant. Every committed tree is walked too. Mutation, from a `wip:` commit: a self-alias added to the fixture → `#3698 7b: the clean fixture … reports no alias fault (… faults: cycle fx.self (fx.self → fx.self))`.

**Not changed.** The issue counts at least six alias resolvers across the repo; this hardens the one that gates emission. The others (`deref` included) keep their own handling.
