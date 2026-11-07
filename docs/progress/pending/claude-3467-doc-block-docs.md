## (2026-11-07) — The setup guide says when `_Doc-block` is built, and agents learn to run file-setup again for the cover (#3467)

#3467's investigation found three docs that disagreed with the code. The owner's Q7 A was to fix them now; Q6 A was to tell agents how to get the cover drawn. This is that docs-only half. The behavior half (the bridge's build asks for `_Doc-block`, a missing `_Doc-block` becomes a note, the "setup incomplete" read) is its own PR.

### What changed

- `docs/public/guides/file-setup.md`: setup builds `_Doc-block` only once the file holds Badge, Tag, List Item and Divider and the theme, and says what is missing until then. The guide used to list it with the other helper components as if setup always built it. The new claim cites `doc-block.ts:177-180`, the early return in `ensureDocBlock`, fingerprinted.
- `apps/plugin/README.md`: the "Not yet wired: a UI trigger for `file-setup`" paragraph was stale. The trigger is Update file's Set up file step (Q668 A), and it runs the same `ACTIONS.fileSetup` as the agent command.
- The cover note (Q6 A), in the three places agents read the commands: the bridge's README, the agent-link runbook (`tools/figma-mcp/README.md` §5) and the agent reference (`docs/public/reference/commands.json`, authored in `emit-agent-reference.ts`'s `WRITES`). Setup draws the Cover only from a saved brand and `apply-theme` doesn't draw it, so after `file-setup` → `apply-theme` an agent runs `file-setup` again. The same `WRITES` line also stopped saying "the two template assets", which has been wrong since the furniture templates and `_Doc-block` joined the page.

### Not changed

The bridge's own note (`BRIDGE_INSTRUCTIONS`) is left alone. It is capped at 1,200 characters and is one of the agent-adherence test's arms, so editing it would move that experiment.
