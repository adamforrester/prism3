# Prism3 classic UI (archive)

This branch keeps the Studio and Figma plugin UI as it was before the 2026 UI redesign changed anything on screen. It holds built files only. The source is on branch `archive/ui-classic-src` (commit `5479b4d50ede6d7ebc62231fb9b037a0bf94692e`, engine 0.217.0), which is the last commit before redesign slice F4, the first visible change.

## Run the classic plugin in Figma

1. Check the branch out beside your normal checkout: `git worktree add ../prism3-classic archive/ui-classic`.
2. In Figma: Plugins → Development → Import plugin from manifest…, then pick `../prism3-classic/plugin/manifest.json`.

It is named **Prism3 (classic)** and has its own plugin ID (`prism3-theming-plugin-classic`), so it installs beside the current plugin.
- **Shared with the current plugin:** it reads and writes the same file data (shared plugin data), so either plugin can open a file themed by the other.
- **Kept separately:** per-user plugin preferences (`clientStorage`) are keyed by plugin ID, so they don't carry over.
- **Agent link:** both plugins use the same agent-link port, so switch the link on in only one of them at a time.

## Run the classic studio

Serve the `studio/` folder, for example `npx esbuild --servedir=studio`, and open `index.html`. It loads `/dist/main.js` from the served root.

## Rebuild from source

`git worktree add ../prism3-classic-src archive/ui-classic-src`, then `npm ci` and `npm run -w @prism3/plugin build`.
