## (2026-11-04) — The `prism3-consume` skill is now `prism3-build-ui`, with a never-do list (#3412, #3410)

**Status:** PR open. ENGINE and CONTRACT unchanged: no emitted artifact moves. Skills, docs, the bridge's served URI
and one new `lint-skills.ts` check.

**The rename (#3412, owner decision).** `skills/prism3-consume/` is `skills/prism3-build-ui/`, with its frontmatter
`name`, its `.claude/skills/` symlink, and every current reference: README, CLAUDE.md, CONTRIBUTING, the design docs,
the other two skills' cross-references, `docs/public/llms.txt`, the ecosystem data, the surfaces inventory, the
tests that read the skill (`test.ts`, `test-chrome.mjs`, `test-agent-bridge.ts`), the plugin's `context` read-first
list and the figma bridge's served resource. No emitter names the skill, and nothing under `packages/engine/out/`
carried it. The dated history keeps the old name, because it was the name on that date: the progress log and its
pending entries, the changelog and its change notes, and `docs/superpowers/`.

**Redirects, where an outside surface promised the old name.** The bridge's `prism3://skills/prism3-consume` is now
`prism3://skills/prism3-build-ui`. A read of the old URI still fails with resource-not-found (-32002), and the error
now names the new URI (`RENAMED_RESOURCES` in `tools/figma-bridge/server.ts`, asserted in `test-agent-bridge.ts`).
`llms.txt`'s skill line says "Formerly `prism3-consume`", and the skill opens by naming its old name.

**The gate (check 9 in `lint-skills.ts`).** No existing gate read anything but the skills, so a stale mention in a
README or a test would have passed. The new check reads every file `git ls-files` lists (tracked, plus untracked
and not ignored), outside the dated history, and fails each line that names a retired skill without also naming its
replacement. A line naming both is a redirect, and passes. It also fails while the old skill directory exists or
the new one is missing. The old and new names are a literal register in the gate, never read from `skills/`
(docs/34). Mutations, each failing by name: the old name put back in `README.md` (`README.md:26 [retired skill
name]`); `skills/prism3-consume/` restored (`skills/prism3-consume/ … is still here`); the repo scan's call deleted
(the wiring floor: `the retired-name check ran 7× …`). Its ceiling: a nickname ("the consume skill") is not the
name, and passes.

**The never-do list (#3410, owner Q33 A).** A section in the renamed skill: eight habits that make generated UI look
machine-made, each with why it fails and the Prism3 part or role to use instead. The six the issue named (a thick
one-sided border, decorative dashed or dotted lines, too many labels, an unrequested gradient, one radius on every
corner, an icon on every line), plus two grounded in Prism3's own roles: status color spent on decoration, and
opacity used to quiet text instead of `text.secondary` / `text.tertiary`. Each alternative is a real part or role:
Banner's full 1px tone edge, Divider's solid rule in `border.secondary` / `border.primary`, the per-part radius
(Badge `radius.sm`, Tag `radius.round`, Button `radius.md`), `icon.size.*`. Written fresh. These are taste calls,
so the list is an owner Q-block on the PR (A: as drafted), not a merge gate. Gradient token names are not quoted,
because the gate's probe brand ships no gradient and the names are brand-conditional.
