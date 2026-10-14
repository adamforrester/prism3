## (2026-10-14) — Figma widgets: capability grounding, and why the theming surface isn't one

**Docs only — no code, no version bump.** `docs/18` gains `§8` + `§8a` and one `§7` bullet. Sourced from the
current Figma Widget API docs (fetched 2026-09-27); nothing was tested in a live file, and the section says so.

**The question was whether the theming plugin should be a widget**, on the hope that living on a page instead
of in a modal would give a larger view. **It is the opposite**, for three reasons now recorded — but the one
worth carrying is reason 3, because it is the `§4`/principle-5 argument wearing new clothes: *"widget
rendering code won't be able to read and access data outside of the particular widget's state."* A widget
cannot read the file's variables to display them, so it must mirror them into synced state, and the file then
holds **two authorities for the theme**. Same defect class as a baseline allowed to rewrite what it reads.

**The premise was also just wrong on size**, which is worth knowing before anyone re-asks: `showUI` from a
widget *"creates a modal dialog with an `<iframe>`"* — the identical window — and the plugin already opens at
1280×900 and persists the designer's resize (#144). There was no ceiling to escape.

**`§8a` is the part that will save someone a day.** The strongest candidate use for a widget was **agent
memory** — a durable, visible, in-file trace of what an agent found and changed, read back next session.
Four separate API facts close it: a plugin *"cannot create WidgetNodes"*; `setWidgetSyncedState` *"only works
inside of a widget"*; `widgetSyncedState` is *"only readable by widgets created by the same `manifest.id`"*;
and `cloneWidget` overrides apply only within the same `manifest.id`. **A plugin's manifest id never matches a
widget's, so widget synced state is unreachable from both write routes in `§4`.**

**The approach tried and discarded**, since the diff cannot show it: `sharedPluginData` as the store (*"readable
by any plugin"*, 100 kB per entry) with the widget as a read-only projection does work, and it inverts the
mirror problem correctly — one authority, one viewer. It was still rejected, because a widget runs only on
interaction, so the projection is **stale until clicked**, while a node board drawn by the plugin (the
`applyComponentPlan` mechanism we already ship) is current as of the last write and needs no second published
id. The widget buys buttons and costs a staleness class.

**The trap for whoever revisits this:** `useStickable` reads like the obvious way to attach an annotation to a
component instance, and it is *"only available in FigJam"*. Nothing in Figma Design can follow a node.

**Nothing filed to build.** Owner's call, explicitly held: candidate uses were explored (drift sentinel,
contract-delta notes, constraint cards, adoption board) and none became an issue. `§7`'s new bullet records
that whether any widget ships is open while the theming-surface question is closed.

**Reworked onto `main` (#2583, owner decision Q288.1).** First written as #1721, which sat 354 commits behind
with its entry edited straight into the log. This PR carries the same `docs/18` text as new work, with the
entry moved here (#1807). Every claim the section makes about this repo's code was checked again on
2026-10-14 and still holds: the plugin opens at `DEFAULT_SIZE` 1280×900 and reopens at the designer's last
size (#144, `apps/plugin/src/main.ts`); `applyComponentPlan` is still the node-building mechanism; `§4` still
numbers the plugin and MCP routes 1 and 2. The quotes from the Widget API docs were not fetched again; the
section dates them to 2026-09-27.
