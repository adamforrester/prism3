# Use the agent link

<!-- DRAFT for owner review (#2637, lane 4; corrected to the Agent switch, Update file and the desktop bridge for #3264). -->

The agent link lets an AI agent drive the Prism3 plugin you have open in Figma. The agent asks for an action, such as writing the theme or building a component set, and the plugin runs the same write Update file runs, then hands back the same result you would see in Activity. <!-- src: apps/plugin/src/agent-protocol.ts:41 --> <!-- src: tools/figma-mcp/README.md:124-128 -->
Two things differ: an agent's theme write uses the brand settings the agent supplies, and an agent's clean-up preview appears in Activity only.

It is off every time the plugin opens, and only you can turn it on. <!-- src: apps/plugin/src/agent-link.ts:5-8 -->

## How it works

An agent working through Figma's own MCP connection can read and write a file's data, but it can't press the plugin's buttons. The agent link gives it two ways in: <!-- src: apps/plugin/src/agent-link.ts:9-21 -->

- The file's plugin data, as a mailbox. The agent writes a request there, and the plugin, while the link is on, checks for requests about once a second, runs one, and writes the result back beside it. <!-- src: apps/plugin/src/agent-protocol.ts:330 --> <!-- src: apps/plugin/src/agent-link.ts:9-21 -->
- The desktop bridge, a small program on your computer that the agent talks to. While the link is on, the plugin holds a connection to it at `ws://localhost:17331`, on your computer only. The first time, the plugin asks you to pair: **Pair with the desktop bridge**, with a **Pairing code** from the bridge or your agent. A code works once, for 10 minutes. <!-- src: apps/plugin/src/agent-link-ui.ts:128-136 --> <!-- src: apps/plugin/src/agent-bridge-relay.ts:37-41 -->

"Prism3 Studio" carries both. "Prism3 Studio Offline" makes no network calls, so it has the mailbox only. <!-- src: apps/plugin/src/agent-link-ui.ts:326-335 -->

MCP (Model Context Protocol) is the standard way an AI agent connects to a tool such as Figma. You don't need to set anything up in Prism3 for it; the agent's own setup handles the connection to Figma.

## Turn it on

1. Open the file and run the Prism3 plugin.
2. Turn on the **Agent** switch in the top bar, beside Update file. <!-- src: apps/plugin/src/agent-link-ui.ts:222-225 -->
3. Tell the agent the link is on. It sends a status request first, to confirm the plugin answers.

To turn it off, turn the **Agent** switch off. <!-- src: apps/plugin/src/agent-link-ui.ts:222 --> Closing the plugin also turns it off. <!-- src: apps/plugin/src/main.ts:1975 -->

The Activity drawer's bar shows the link's state in a word: "Listening · bridge" or "Listening · mailbox" while it waits, "Listening · mailbox only" in Prism3 Studio Offline, and "Error" or "Not listening" when something is wrong. Point at the word to read the full status. <!-- src: apps/plugin/src/agent-link-ui.ts:118-121 -->

*[Screenshot placeholder: the top bar with the Agent switch on, and the Activity drawer's agent word.]*

## What an agent can do

| Request | What the plugin does |
|---|---|
| `status` | Reports the plugin version, the file and page, whether the file has a saved brand and variables, and the link's state. Writes nothing. <!-- src: apps/plugin/src/agent-protocol.ts:50-51 --> |
| `apply-theme` | Writes the theme, as Update file's Theme item does, with the brand settings the agent supplies. See [Write the theme to a Figma file](apply-a-theme.md). <!-- src: apps/plugin/src/agent-protocol.ts:52-53 --> |
| `build-components` | Builds one component set. See [Build components](build-components.md). <!-- src: apps/plugin/src/agent-protocol.ts:54-55 --> |
| `file-setup` | Sets up the file. See [Set up a file](file-setup.md). <!-- src: apps/plugin/src/agent-protocol.ts:56-57 --> |
| `style-guide` | Draws the style guides, with the same options as Documentation. See [Build style guides](style-guides.md). <!-- src: apps/plugin/src/agent-protocol.ts:58-59 --> |
| `prune` | Clean up: a preview, or with a confirm, the delete. See [Remove what the brand no longer uses](update-a-file-safely.md#remove-what-the-brand-no-longer-uses). <!-- src: apps/plugin/src/agent-protocol.ts:60-61 --> |
| `readback` | Reads the file's color variables back and checks they were written correctly: each mode distinct, every alias resolving, the brand's modes present and scopes set. It also lists every component page. Writes nothing. It does not check contrast. <!-- src: apps/plugin/src/agent-protocol.ts:62-63 --> |
| `update-components` | Updates sets in place: a check first, then a confirm that carries the check's fingerprint. See [Update sets in place](update-a-file-safely.md#update-sets-in-place). <!-- src: apps/plugin/src/agent-protocol.ts:64-68 --> |
| `capture-baseline` | Records how each variant looks now, so a later update can tell your edits apart. Plugin data only. <!-- src: apps/plugin/src/agent-protocol.ts:69-70 --> |
| `adopt-members` | Claims variants Prism3 did not build, so updates can reach them. Plugin data only. <!-- src: apps/plugin/src/agent-protocol.ts:71-73 --> |
| `draw-specs` | Draws the spec panel beside each family's usage panel, as **Draw specs** in Documentation's Specs tab does. <!-- src: apps/studio/src/shell/documentation.ts:54 --> <!-- src: apps/plugin/src/agent-protocol.ts:74-76 --> |

Every write an agent asks for passes the same checks as Update file, and is refused for the same reasons. <!-- src: apps/plugin/src/run-guard.ts:1-14 -->

## Safety

- **Off by default, never saved.** The link starts off at every launch and is not remembered between sessions. <!-- src: apps/plugin/src/agent-link.ts:5-8 -->
- **Only you can turn it on.** An agent can't switch it on: only the panel's **Agent** switch sends that request. <!-- src: apps/plugin/src/agent-link-ui.ts:222 --> The main thread turns the link on only when the panel asks. <!-- src: apps/plugin/src/messages.ts:110-112 -->
- **While it is off, the plugin ignores the agent entirely.** A request waiting in the file does nothing, and the plugin holds no connection to the bridge. <!-- src: apps/plugin/src/agent-link.ts:6-8 --> <!-- src: apps/plugin/src/agent-link-ui.ts:326-327 -->
- **Old requests are not replayed.** A request already waiting when you turn the link on is answered "stale" and not run; the agent has to send it again. <!-- src: apps/plugin/src/agent-link.ts:29-31 -->
- **One request at a time.** The plugin runs requests in the order sent, never two at once, and never while the same write is running from Update file. <!-- src: apps/plugin/src/agent-link.ts:14-18 -->
- **No code from the agent.** In the released plugin, a request names one of the actions above and nothing in it is run as code. A development build, used by maintainers, adds one more request, `run-code`; the release build leaves it out. <!-- src: apps/plugin/src/agent-protocol.ts:42-45 --> <!-- src: apps/plugin/src/agent-dispatch.ts:234 -->
- **Deletes and updates need a confirm.** A clean-up or a component update runs as a preview first, and the agent has to send a separate confirm. Ask it to show you the preview before it confirms. <!-- src: apps/plugin/src/agent-protocol.ts:57-65 -->
- **It writes to the open file.** Whatever the agent asks for lands in the file the plugin is open in. Try a new workflow on a copy first. <!-- src: tools/figma-mcp/README.md:131-133 -->

The panel shows each result an agent's request produced, in Activity, as if you had run it. <!-- src: apps/plugin/src/agent-dispatch.ts:14-22 -->

## Other ways an agent works with Prism3

- Without Figma: the Prism3 engine has its own MCP server, which can generate and check a brand's tokens and write them to disk. It does not touch Figma files. <!-- src: packages/engine/mcp.ts:236-372 --> <!-- src: packages/engine/README.md:113 -->
- With the plugin closed: a set of scripts runs the plugin's own steps through Figma's MCP connection, for test files. This route is for maintainers and is documented in the repository's `tools/figma-mcp` folder. <!-- src: tools/figma-mcp/README.md:1-27 -->

See the [feature reference](features.md) for what each route can do.
