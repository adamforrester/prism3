## (2026-10-26) — Figma MCP tools run without a permission prompt in single-repo cloud sessions

The owner added `"permissions": { "allow": ["mcp__Figma"] }` to `.claude/settings.json`. Every Figma call (`use_figma`, screenshots, metadata, sessions) had been stopping for approval, which repeatedly stalled agent work in the Figma files. Agents are not allowed to edit this file, so the owner made the change by hand and an agent carried the PR.

**Trap for whoever re-verifies this:** a cloud session reads a repository's `.claude/settings.json` only when the session holds exactly one repository. An orchestrator session started with both this repo and the knowledge base ignores the rule and keeps prompting. Start such sessions with this repo alone, and attach the second repository mid-session when it's needed. The bare server name `mcp__Figma` allows every tool on that server, so new Figma tools need no edit here.
