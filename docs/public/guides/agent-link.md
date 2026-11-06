# Use the agent link

<!-- DRAFT for owner review (#2637, lane 4; corrected to the Agent switch, Update file and the desktop bridge for #3264). -->

The agent link lets an AI agent drive the Prism3 plugin you have open in Figma. The agent asks for an action, such as writing the theme or building a component set, and the plugin runs the same write Update file runs, then hands back the same result you would see in Activity. <!-- src: apps/plugin/src/agent-protocol.ts:41#2ca0eeca --> <!-- src: tools/figma-mcp/README.md:125-129#ec69b4ba -->
Two things differ: an agent's theme write uses the brand settings the agent supplies, and an agent's clean-up preview appears in Activity only.

It is off every time the plugin opens, and only you can turn it on. <!-- src: apps/plugin/src/agent-link.ts:5-8#e3a1fc8c -->

## How it works

An agent working through Figma's own MCP connection can read and write a file's data, but it can't press the plugin's buttons. The agent link gives it two ways in: <!-- src: apps/plugin/src/agent-link.ts:9-21#e9f3139b -->

- The file's plugin data, as a mailbox. The agent writes a request there, and the plugin, while the link is on, checks for requests about once a second, runs one, and writes the result back beside it. <!-- src: apps/plugin/src/agent-protocol.ts:399#faf40979 --> <!-- src: apps/plugin/src/agent-link.ts:9-21#e9f3139b -->
- The desktop bridge, a small program on your computer that the agent talks to. While the link is on, the plugin holds a connection to it at `ws://localhost:17331`, on your computer only. The first time, the plugin asks you to pair: **Pair with the desktop bridge**, with a **Pairing code** from the bridge or your agent. A code works once, for 10 minutes. <!-- src: apps/plugin/src/agent-link-ui.ts:134-142 --> <!-- src: apps/plugin/src/agent-bridge-relay.ts:50-54 -->

"Prism3 Studio" carries both. "Prism3 Studio Offline" makes no network calls, so it has the mailbox only. <!-- src: apps/plugin/manifest.json:2-19 --> <!-- src: apps/plugin/manifest-offline.json:2-6 -->

MCP (Model Context Protocol) is the standard way an AI agent connects to a tool such as Figma. You don't need to set anything up in Prism3 for it; the agent's own setup handles the connection to Figma.

## Turn it on

1. Open the file and run the Prism3 plugin.
2. Turn on the **Agent** switch in the top bar, beside Update file. <!-- src: apps/plugin/src/agent-link-ui.ts:230-233 -->
3. Tell the agent the link is on. It sends a status request first, to confirm the plugin answers.

To turn it off, turn the **Agent** switch off. <!-- src: apps/plugin/src/agent-link-ui.ts:230 --> Closing the plugin also turns it off. <!-- src: apps/plugin/src/main.ts:2358#13449644 -->

The Activity drawer's bar shows the link's state in a word: "Listening · bridge" or "Listening · mailbox" while it waits, "Listening · mailbox only" in Prism3 Studio Offline, and "Error" or "Not listening" when something is wrong. Point at the word to read the full status. <!-- src: apps/plugin/src/agent-link-ui.ts:124-127 -->

*[Screenshot placeholder: the top bar with the Agent switch on, and the Activity drawer's agent word.]*

## What an agent can do

| Request | What the plugin does |
|---|---|
| `status` | Reports the plugin version, the file and page, whether the file has a saved brand and variables, and the link's state. Writes nothing. <!-- src: apps/plugin/src/agent-protocol.ts:53-54 --> |
| `apply-theme` | Writes the theme, as Update file's Theme item does, with the brand settings the agent supplies. See [Write the theme to a Figma file](apply-a-theme.md). <!-- src: apps/plugin/src/agent-protocol.ts:55-56 --> |
| `build-components` | Builds one component set. See [Build components](build-components.md). <!-- src: apps/plugin/src/agent-protocol.ts:57-58 --> |
| `file-setup` | Sets up the file. See [Set up a file](file-setup.md). <!-- src: apps/plugin/src/agent-protocol.ts:59-60 --> |
| `style-guide` | Draws the style guides, with the same options as Documentation. See [Build style guides](style-guides.md). <!-- src: apps/plugin/src/agent-protocol.ts:61-62 --> |
| `prune` | Clean up: a preview, or with a confirm, the delete. See [Remove what the brand no longer uses](update-a-file-safely.md#remove-what-the-brand-no-longer-uses). <!-- src: apps/plugin/src/agent-protocol.ts:63-64 --> |
| `readback` | Reads the file's color variables back and checks they were written correctly: each mode distinct, every alias resolving, the brand's modes present and scopes set. It also lists every component page. Writes nothing. It does not check contrast. <!-- src: apps/plugin/src/agent-protocol.ts:65-66 --> |
| `update-components` | Updates sets in place: a check first, then a confirm that carries the check's fingerprint. See [Update sets in place](update-a-file-safely.md#update-sets-in-place). <!-- src: apps/plugin/src/agent-protocol.ts:67-71 --> |
| `capture-baseline` | Records how each variant looks now, so a later update can tell your edits apart. Plugin data only. <!-- src: apps/plugin/src/agent-protocol.ts:72-73 --> |
| `adopt-members` | Claims variants Prism3 did not build, so updates can reach them. Plugin data only. <!-- src: apps/plugin/src/agent-protocol.ts:74-76 --> |
| `draw-specs` | Draws the spec panel beside each family's usage panel, as **Draw specs** in Documentation's Specs tab does. <!-- src: apps/studio/src/shell/documentation.ts:72 --> <!-- src: apps/plugin/src/agent-protocol.ts:77-79 --> |
| `inspect` | Reads the layers you name and the layers inside them: type, name, page, size, whether locked, the main component and its key for an instance, its properties, the variables it uses and its text style. Writes nothing. <!-- src: apps/plugin/src/agent-protocol.ts:80-81 --> |
| `component-keys` | Lists the file's component sets and components with their keys, so another file can place them. Writes nothing. <!-- src: apps/plugin/src/agent-protocol.ts:82-83 --> |
| `audit-frames` | Checks frames for what a rebuild should have replaced: old components, text with no style, colors bound to no variable, hand-drawn rules and unnamed frames. The agent supplies the old names. Writes nothing. <!-- src: apps/plugin/src/agent-protocol.ts:84-85 --> |
| `snapshot` | Renders one layer as an image, as this session shows it. Writes nothing. <!-- src: apps/plugin/src/agent-protocol.ts:86-87 --> |
| `activity` | Lists what Activity shows for this session, newest first: each run's result, its details, every set built with problems and why, and the plugin build that ran it. Writes nothing. <!-- src: apps/plugin/src/agent-protocol.ts:88-89 --> |
| `context` | Says what the open file is: its brand and modes, its variable collections, the sets Prism3 built and which are due, and what is read-only: pages whose name contains FINAL, locked layers and `Original · …` copies. Writes nothing. <!-- src: apps/plugin/src/agent-protocol.ts:93-94 --> |

Every write an agent asks for passes the same checks as Update file, and is refused for the same reasons. <!-- src: apps/plugin/src/run-guard.ts:1-14#b6f8158f -->

## Safety

- **Off by default, never saved.** The link starts off at every launch and is not remembered between sessions. <!-- src: apps/plugin/src/agent-link.ts:5-8#e3a1fc8c -->
- **Only you can turn it on.** An agent can't switch it on: only the panel's **Agent** switch sends that request. <!-- src: apps/plugin/src/agent-link-ui.ts:230 --> The main thread turns the link on only when the panel asks. <!-- src: apps/plugin/src/messages.ts:114-116#3ecd6409 -->
- **While it is off, the plugin ignores the agent entirely.** A request waiting in the file does nothing, and the plugin holds no connection to the bridge. <!-- src: apps/plugin/src/agent-link.ts:6-8#efefb571 --> <!-- src: apps/plugin/src/agent-link-ui.ts:336-337#76ccd888 -->
- **Old requests are not replayed.** A request already waiting when you turn the link on is answered "stale" and not run; the agent has to send it again. <!-- src: apps/plugin/src/agent-link.ts:146-158 -->
- **One request at a time.** The plugin runs requests in the order sent, never two at once, and never while the same write is running from Update file. <!-- src: apps/plugin/src/agent-link.ts:14-18#10971a60 -->
- **No code from the agent.** In the released plugin, a request names one of the actions above and nothing in it is run as code. A development build, used by maintainers, adds one more request, `run-code`; the release build leaves it out. <!-- src: apps/plugin/src/agent-protocol.ts:45-48 --> <!-- src: apps/plugin/src/agent-dispatch.ts:267 -->
- **Deletes and updates need a confirm.** A clean-up or a component update runs as a preview first, and the agent has to send a separate confirm. Ask it to show you the preview before it confirms. <!-- src: apps/plugin/src/agent-protocol.ts:60-68#122bd083 -->
- **It writes to the open file.** Whatever the agent asks for lands in the file the plugin is open in. Try a new workflow on a copy first. <!-- src: tools/figma-mcp/README.md:132-134#6f9a7cff -->

The panel shows each result an agent's request produced, in Activity, as if you had run it. <!-- src: apps/plugin/src/agent-dispatch.ts:14-22#8b93af69 -->

## Other ways an agent works with Prism3

- Without Figma: the Prism3 engine has its own MCP server, which can generate and check a brand's tokens and write them to disk. It does not touch Figma files. <!-- src: packages/engine/mcp.ts:239-375#915cdea4 --> <!-- src: packages/engine/README.md:114#782d7cd2 -->
- With the plugin closed: a set of scripts runs the plugin's own steps through Figma's MCP connection, for test files. This route is for maintainers and is documented in the repository's `tools/figma-mcp` folder. <!-- src: tools/figma-mcp/README.md:1-27 -->

See the [feature reference](features.md) for what each route can do.
