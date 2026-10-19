# Use the agent link

<!-- DRAFT for owner review (#2637, lane 4). -->

The agent link lets an AI agent drive the Prism3 plugin you have open in Figma. The agent asks for an action, such as Apply Theme or a component build, and the plugin runs it the way the panel's button would, then hands back the same result you would see. Two things differ: an agent's Apply Theme uses the brand settings the agent supplies, and an agent's prune preview never opens the delete dialog on your screen. <!-- src: apps/plugin/src/main.ts:1211-1221 --> <!-- src: tools/figma-mcp/README.md:124-128 -->

It is off every time the plugin opens, and only you can turn it on. <!-- src: apps/plugin/src/agent-link.ts:5-8 -->

## How it works

An agent working through Figma's own MCP connection can read and write a file's data, but it can't press the plugin's buttons. The agent link passes requests through the file's plugin data: the agent writes a request there, and the plugin, while the link is on, checks for requests about once a second, runs one, and writes the result back beside it. <!-- src: apps/plugin/src/agent-link.ts:9-21 --> <!-- src: apps/plugin/src/agent-protocol.ts:312-325 -->

MCP (Model Context Protocol) is the standard way an AI agent connects to a tool such as Figma. You don't need to set anything up in Prism3 for it; the agent's own setup handles the connection to Figma.

## Turn it on

1. Open the file and run the Prism3 plugin.
2. Choose **Agent** in the top bar. A green dot on its icon shows the link is on. <!-- src: apps/plugin/src/agent-link-ui.ts:96-110 --> <!-- src: apps/plugin/src/agent-link-ui.ts:128 -->
3. Tell the agent the link is on. It sends a status request first, to confirm the plugin answers.

To turn it off, choose **Agent** again. Closing the plugin also turns it off. <!-- src: apps/plugin/src/agent-link-ui.ts:128 --> <!-- src: apps/plugin/src/main.ts:1288-1290 -->

The **Activity** drawer shows the link's state: "Agent listening" while it waits, "Agent error" or "Agent not listening" when something is wrong, and while it is open, the last command the agent ran. <!-- src: apps/plugin/src/agent-link-ui.ts:43-61 -->

*[Screenshot placeholder: the top bar with the Agent tile on, and the Activity drawer's agent line.]*

## What an agent can do

| Request | What the plugin does |
|---|---|
| `status` | Reports the plugin version, the file and page, whether the file has a saved brand and variables, and the link's state. Writes nothing. <!-- src: apps/plugin/src/main.ts:1247-1278 --> |
| `apply-theme` | [Apply Theme](apply-a-theme.md), with the brand settings the agent supplies. <!-- src: apps/plugin/src/agent-protocol.ts:217-219 --> |
| `build-components` | [Builds one component set](build-components.md). <!-- src: apps/plugin/src/agent-protocol.ts:224-228 --> |
| `file-setup` | [Set up file](file-setup.md). <!-- src: apps/plugin/src/agent-protocol.ts:284-286 --> |
| `style-guide` | [Build style guides](style-guides.md), with the same options as the page. <!-- src: apps/plugin/src/agent-protocol.ts:229-256 --> |
| `prune` | [Prune stale](update-a-file-safely.md#remove-what-the-brand-no-longer-uses): a preview, or with a confirm, the delete. <!-- src: apps/plugin/src/agent-protocol.ts:220-223 --> |
| `readback` | Reads the file's color variables back and checks they were written correctly: each mode distinct, every alias resolving, the brand's modes present and scopes set. It also lists every component page. Writes nothing. It does not check contrast. <!-- src: apps/plugin/src/agent-dispatch.ts:85-120 --> <!-- src: apps/plugin/src/main.ts:1120-1145 --> <!-- src: apps/plugin/src/read-back.ts:238-290 --> |
| `update-components` | The [component update](update-a-file-safely.md#component-changes-check-read-then-confirm): a check first, then a confirm that carries the check's fingerprint. <!-- src: apps/plugin/src/agent-protocol.ts:68 --> <!-- src: apps/plugin/src/agent-protocol.ts:78-103 --> |
| `capture-baseline` | Records how each variant looks now, so a later update can tell your edits apart. Plugin data only. <!-- src: apps/plugin/src/main.ts:959-972 --> |
| `adopt-members` | Claims variants Prism3 did not build, so updates can reach them. Plugin data only. <!-- src: apps/plugin/src/main.ts:961-976 --> |

Every write an agent asks for passes the same checks as the panel's button, and is refused for the same reasons. <!-- src: apps/plugin/src/main.ts:1199-1235 --> <!-- src: apps/plugin/src/run-guard.ts:21-39 -->

## Safety

- **Off by default, never saved.** The link starts off at every launch and is not remembered between sessions. <!-- src: apps/plugin/src/agent-link.ts:5-8 -->
- **Only you can turn it on.** An agent can't switch it on: only the panel's **Agent** tile sends that request. <!-- src: apps/plugin/src/messages.ts:98-100 --> <!-- src: apps/plugin/src/main.ts:1340-1343 -->
- **While it is off, the plugin ignores the agent entirely.** A request waiting in the file does nothing. <!-- src: apps/plugin/src/agent-link.ts:6-8 -->
- **Old requests are not replayed.** A request already waiting when you turn the link on is answered "stale" and not run; the agent has to send it again. <!-- src: apps/plugin/src/agent-link.ts:29-31 --> <!-- src: apps/plugin/src/agent-protocol.ts:111-127 -->
- **One request at a time.** The plugin runs requests in the order sent, never two at once, and never while you are running the same action from the panel. <!-- src: apps/plugin/src/agent-link.ts:14-18 --> <!-- src: apps/plugin/src/run-guard.ts:39 -->
- **No code from the agent.** In the released plugin, a request names one of the actions above and nothing in it is run as code. A development build, used by maintainers, adds one more request, `run-code`, and a local desktop connection; the release build leaves both out. <!-- src: apps/plugin/src/agent-protocol.ts:29-30 --> <!-- src: apps/plugin/src/agent-dispatch.ts:222-225 --> <!-- src: apps/plugin/lint-release-bundle.ts:53-86 -->
- **Deletes and updates need a confirm.** A prune or a component update runs as a preview first, and the agent has to send a separate confirm. Ask it to show you the preview before it confirms. <!-- src: apps/plugin/src/agent-protocol.ts:220-223 --> <!-- src: apps/plugin/src/agent-protocol.ts:257-272 --> <!-- src: tools/figma-mcp/README.md:187-189 -->
- **It writes to the open file.** Whatever the agent asks for lands in the file the plugin is open in. Try a new workflow on a copy first. <!-- src: tools/figma-mcp/README.md:131-133 -->

The panel shows each result an agent's request produced, as if you had run it. A prune preview an agent asked for appears in Activity only; it never opens the delete dialog on your screen. <!-- src: apps/plugin/src/agent-dispatch.ts:259-260 --> <!-- src: apps/plugin/src/main.ts:1257-1260 -->

## Other ways an agent works with Prism3

- **Without Figma:** the Prism3 engine has its own MCP server, which can generate and check a brand's tokens and write them to disk. It does not touch Figma files. <!-- src: packages/engine/mcp.ts:236-372 --> <!-- src: packages/engine/README.md:113 -->
- **With the plugin closed:** a set of scripts runs the plugin's own steps through Figma's MCP connection, for test files. This route is for maintainers and is documented in `tools/figma-mcp/README.md`. <!-- src: tools/figma-mcp/README.md:1-27 -->

See the [feature reference](features.md) for what each route can do.
