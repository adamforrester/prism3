## (2026-11-19) — The shadcn/ui and Tailwind themes ship as regen artifacts (#2997 PR 4)

**What.** The delivery half of #2997, per Q2997.5 B. `regen.ts` gains two steps, `emit-shadcn` and `emit-tailwind`, placed
after `emit-dtcg` and `cli`, because they read the handoff those two write; `cli` writes wendys'. Each brand now commits
three new files: `out/shadcn/<brand>.css`, `out/shadcn/<brand>.registry-item.json` and `out/tailwind/<brand>.theme.css`.
That is 15 across the corpus. `schema/payload-manifest.json` classifies all three kinds as payload. The registry item is
what `npx shadcn add <url>` installs. A studio Export option and an MCP `include` are later, as decided.

**What did not need an edit.** The brief for this lane said that regen's expected artifact count, `EXPECTED_ARTIFACTS`
in `verify.ts` and `ci.yml`, moves with the new files. Since #3698 R3 there is no such count. `ARTIFACT_FLOOR` is a floor
that `ci.yml` reads from `verify.ts`, so growth needs no edit and `ci.yml` is untouched here. The count rose from 260 to
275. A step dropped from regen still fails, by name: #1059's write tracking reports each of its files as stale.

**The gates now reach the committed copies.**
- `regen --check` holds the committed copies byte for byte. Hand-editing `--radius` in `out/shadcn/prism3.css` fails
  `changed packages/engine/out/shadcn/prism3.css`.
- `lint-us-english` and `lint-voice` scan the new files through regen's `out/` walk. "Colour" in the registry
  `description` fails US English on all five registry items by name.
- Gates 1, 2 and 5 still render a fresh copy with `--out` and measure that, so they measure the code, not a stale file.

**Not done here.** Hosting the registry items for a URL install (Q2997.19 A, the existing site deploy) is not in this PR.
It is asked on the PR.
