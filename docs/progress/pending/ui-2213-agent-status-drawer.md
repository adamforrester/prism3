## (2026-10-06) — Plugin: the agent link's status line in the Activity drawer's bar row (#2213)

**Status:** branch `ui/2213-agent-status-drawer`, held for the owner's screenshot review. `apps/studio/src/shell/activity.ts`
(`setAgentLinkLine`), `apps/studio/src/chrome.css` (`.p3-drawer-link`), `apps/plugin/src/agent-link-ui.ts`, and
`test:chrome` section 31. UI only: no ENGINE bump (no emitted artifact moves), CONTRACT unchanged. **No new copy**: the
line's words are the existing formatter's, `agentLinkStatusText`. Owner decision N1 A (2026-10-06). Closes #2213.

### What changed

#2124 removed the Agent popover, so the link's status line was drawn nowhere. It now sits at the far right of the Activity
drawer's bar row, last before the caret, in the plugin only.

- **When:** a line only while the link is on. Off draws none. The plugin's Agent tile reports it with each published state
  through `setAgentLinkLine` (beside `setAgentLinkOn`); the studio never calls it, so the web has none.
- **Ink:** quiet text (the chrome's `text-2`, `color.text.secondary`). When the state carries an inbox error, the chrome's
  error ink (`bad-text`, `color.text.danger`), keyed on `data-error`. `test:chrome` holds both to the emission's hex and
  to 4.5:1 on the row's ground, in light and dark.
- **One line, and it gives way first.** `flex: 1000 1 0%; max-width: max-content`: the line starts from no width and grows
  into whatever room the row has left, up to its words' own width. So the summary ("Read-back · Clean") and its time are
  never squeezed by it, and the caret stays on the row. When the room is short, the line is cut with an ellipsis; its
  `title` and its text (which is what the row's accessible name is read from) keep the full words.
- **Measured:** at 380 the line has about 150px, so both the listening and the error words are cut. At 1280 the row sits
  under the preview pane (about 740px), so the listening words fit whole and the error's longer words are cut there too.

### The approach tried and discarded

The first cut was `flex: 0 1000 auto` (shrink the line before anything else). Flexbox weights shrinking by the basis, so the
summary still gave up a fraction of a pixel, and that was enough to draw its ellipsis: "Read-back · Cle…". The first probe
missed it too: `scrollWidth` rounds to whole pixels, so a 0.08px overflow read as whole. The summary is now measured with a
`Range` over its contents against its box, and the line takes room rather than giving it back.

### Gates, and the mutations that fail them by name

`test:chrome` section 31: the plugin, light and dark, at 1280 and 380, three published states (off, listening after a
command, listening with an inbox error), after a boot read-back so the row has a summary. The words are
`agentLinkStatusText(state)`, bundled for Node from the plugin's source and called in the test; the inks are walked from the
committed emission (not `tokens.mjs`, not the CSS); the accessible name is read through CDP `getPartialAXTree` on the line's
text node and on the row. Each mutation was run against the built bundles, with the tree committed first:

- hidden while listening → `#2213 figma light 1280 listening: the status line is drawn in the bar row, at least 40px wide (read null, shown false)` (4).
- shown while off → `#2213 figma light 1280 off: no status line while the link is off (read "Off — agent commands are ignored.")` (4).
- the error in the quiet ink → `#2213 figma light 1280 error: the line draws in the chrome's error ink, the emission's color.text.danger #a82e2e (read #67696b)` (4).
- the text cut short in the DOM at 380 → `#2213 figma light 380 listening: the accessible name carries the full words: the line's computed text "Listening — file m…", the row's name "Read-back · Clean … Listening — file m… Expand Activity"` (12 in all).
- the line shrinking with the summary → `#2213 figma light 380 listening: the caret and the whole summary stay on the row (… summary "Read-back · Clean" whole false)` (4).
- no tooltip at 380 → `#2213 figma light 380 listening: the line's tooltip carries its full words, though it is cut short (… read "null")` (4).

### Left for the owner

- **Off with a stale inbox error.** The link keeps `inboxError` after it is switched off (`agent-link.ts` clears it only on
  a poll). The formatter reads "Off — agent commands are ignored." for that state and drops the error, so the line follows
  the formatter and draws nothing while off. The issue's "or when it has an error" could also mean showing it there.
- **At 380 the error's words are cut before the ⚠.** The error is still told by the ink, the tooltip and the name, but
  the visible words read "Listening — file mailbox,…". Putting the error first would change the formatter's order.
- **The tooltip is set in every state**, not only when the line is cut.
- **The drawer is still not drawn before anything has run.** The plugin's boot read-back draws it almost at once; until
  then the line has no row to sit in.
