# Ecosystem diagram

An interactive map of Prism3: the two entry lanes (theming UI and agent), the engine, what it produces, the checks that hold it, and the planned code library.

| File | What it is |
|---|---|
| `ecosystem.json` | The data. Every node, edge and trace on the page comes from here. |
| `index.html` | The page. One file, no libraries; it fetches `ecosystem.json` from the same folder. |

To view it locally, serve the repo root and open the folder. A `file://` address cannot fetch the JSON.

```bash
python3 -m http.server 8000   # then open http://localhost:8000/docs/public/ecosystem/
```

## When a feature ships, update the data

`packages/engine/lint-ecosystem.ts` runs in CI and fails by name when the data and the code disagree. Most updates are one of these:

| What changed | What to edit in `ecosystem.json` | Does CI catch a miss? |
|---|---|---|
| A component def added, renamed or removed | `members.items` on `component-defs` | Yes |
| An MCP tool added or removed (`packages/engine/mcp.ts`) | `members.items` on `mcp-server` | Yes |
| An agent link command added or removed (`AGENT_COMMANDS`) | `members.items` on `agent-link` | Yes |
| A desktop bridge tool added or removed | `members.items` on `bridge` | Yes |
| A skill added or removed under `skills/` | `members.items` on `skills` | Yes |
| A file a node names moved or was deleted | that node's `sources` or `docs` | Yes |
| Something planned or partial is now in use | the node's and its edges' `status`, and its `purpose` line | No — the status is a judgment |
| A new surface or output | a new node, its edges, and a place for it (`at`) | Only its paths and edges |

Rules the check enforces, so a hand edit fails early:

- Every edge joins two node ids that exist, once, and is never more built than either end: a `shipped` edge cannot touch a `planned` node.
- Every trace step names an edge as `"from>to"`.
- A `shipped` or `partial` node names at least one source path, and every path is tracked by git.
- Every node and waypoint sits inside the canvas (`canvas.width` × `canvas.height`).

## Fields

- **Node:** `id`, `label`, `role` (one of `roles`), `kind` (`actor`, `surface`, `artifact`, `content`, `check` or `hub`), `status` (`shipped`, `partial` or `planned`), `at` (center, in canvas units), `purpose` (one or two sentences), `inputs`, `outputs`, `sources` (repo paths), `docs` (one repo path), and optional `members` (`label` and `items`).
- **Edge:** `from`, `to`, `what` (what travels), `status`, and optional `via`: waypoints in canvas units, for an edge that would otherwise pass behind a node.
- **Trace:** `id`, `label`, and `steps`, each an `edge` and a `caption` shown while that step plays.
- **Region:** a labeled box drawn behind nodes (`x`, `y`, `w`, `h`), with an optional `status`.

Write `purpose`, `what` and `caption` text to `docs/voice-standard.md`: present tense, the system as the subject, US English, and no claim the code does not back.

## Positions

The canvas is 1500 × 880 units and scales to the page width. Below 900 px the page switches to a list grouped by role, so positions matter only on wider screens. After moving a node, open the page and check that no edge passes behind another node; add a `via` waypoint if one does.
