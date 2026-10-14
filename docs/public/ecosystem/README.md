# Ecosystem diagram

An interactive map of Prism3, in two views. **Diagram** reads left to right: inputs, the three interfaces (Web studio, Figma plugin, Agent), the engine, and what it produces. **Compare interfaces** is a table of every feature against the three interfaces. Both are drawn from one data file.

| File | What it is |
|---|---|
| `ecosystem.json` | The data. Every box, arrow, connection, check, feature and trace on the page comes from here. |
| `index.html` | The page. One file, no libraries; it fetches `ecosystem.json` from the same folder. |

To view it locally, serve the repo root and open the folder. A `file://` address cannot fetch the JSON.

```bash
python3 -m http.server 8000   # then open http://localhost:8000/docs/public/ecosystem/
```

Deep links: `#trace=<id>`, `#node=<id>`, `#feature=<id>`, `#conn=<id>`, `#check=<id>`, `#view=compare`.

## When a feature ships, update the data

`packages/engine/lint-ecosystem.ts` runs in CI and fails by name when the data and the code disagree. Most updates are one of these:

| What changed | What to edit in `ecosystem.json` | Does CI catch a miss? |
|---|---|---|
| A component def added, renamed or removed | `members.items` on the `component-defs` node | Yes |
| An MCP tool added or removed (`packages/engine/mcp.ts`) | `members.items` on the `mcp` connection, and a feature whose agent lane names it in `mcpTools` | Yes |
| An agent link command added or removed (`AGENT_COMMANDS`) | `members.items` on the `agent-link` connection, and exactly one feature whose agent lane names it in `agentCommands` | Yes |
| A plugin message added (`UiToMain` in `apps/plugin/src/messages.ts`) | a feature whose figma lane names it in `messages`, or the gate's `PLUMBING` list if it is not a feature | Yes |
| A desktop bridge tool added or removed | `members.items` on the `desktop-bridge` connection | Yes |
| A skill added or removed under `skills/` | `members.items` on the `load-skills` feature | Yes |
| A file anything names moved or was deleted | that entry's `sources` or `docs` | Yes |
| A new feature in one interface | a `features` entry with a lane per interface that has it | Partly: see below |
| Something planned or partial is now in use | the `status` on the node, edge, connection or feature lane, and its prose | No: the status is a judgment |

## Which interface has a feature

A feature lists the lanes that have it: `web`, `figma`, `agent`. Give the same feature one entry, with one lane per interface, so the compare table shows the sharing. The gate decides what it can from the code:

- **MCP tools are agent-only.** `mcpTools` may sit only in an agent lane.
- **Plugin messages are Figma-only.** A feature whose figma lane sends a `UiToMain` message cannot claim the web studio.
- **Agent commands decide shared or agent-only.** A command that is also a panel message (`apply-theme`, `build-components`, `prune`, `file-setup`, `style-guide`) is something the panel does too, so its feature must have a figma lane. A command with no panel message (`update-components`, `capture-baseline`, `adopt-members`, `status`, `readback`) is agent-only, so its feature must not.
- **Web and Figma share the studio UI.** The plugin imports the studio's whole entry, so a UI feature is in both unless the code branches on `PRISM3_HOST`. A web-only feature must cite a source with `PRISM3_HOST !== 'figma'`; a figma-only feature with no message must cite one with `PRISM3_HOST === 'figma'` or `isFigma`.

What it cannot check: whether a `via` line is true, or whether a shared panel behaves the same on both hosts. Read the code before you claim either.

## Fields

- **Node:** `id`, `label`, `role` (one of `roles`), `kind` (`input`, `lane`, `hub`, `content`, `artifact`, `surface` or `group`), `status` (`shipped`, `partial` or `planned`), `column` (one of `columns`), optional `parent` (a group node), `purpose`, `inputs`, `outputs`, `sources`, `docs`, and optional `members` (`label` and `items`). An input appears at the start of each lane an edge leads it to.
- **Edge:** `from`, `to`, `what` (what travels), `status`, optional `connection` (a connection id; only on an edge out of a lane) and optional `route: "under"` (pass below the engine column). Its id is `from>to`, plus `@connection` when it has one.
- **Connection:** `id`, `label`, `status`, `purpose`, `sources`, `docs`, optional `members`. Drawn as a label on each edge that names it.
- **Check:** `id`, `label`, `purpose`, `on` (node ids it sits on), `sources`, `docs`. Shown as badges with Show checks.
- **Feature:** `id`, `label`, `group`, optional `members`, and `lanes`: per lane, `status`, `via` (how that interface does it), `sources`, and optionally `mcpTools`, `agentCommands`, `messages` and `connections`.
- **Trace:** `id`, `label`, and `steps`, each an edge id and a `caption` shown while that step plays.

Write `purpose`, `via`, `what` and `caption` text to `docs/voice-standard.md`: present tense, the system as the subject, US English, and no claim the code does not back.

## Layout

The page lays boxes out in a CSS grid by `column` and measures them to draw the arrows, so there are no coordinates to maintain. Below 900 px the diagram becomes a stacked list: each lane with its inputs and its connections, then the engine, then the outputs. After adding a node or an edge, open the page at desktop width and check that no arrow crosses a box it does not touch.
