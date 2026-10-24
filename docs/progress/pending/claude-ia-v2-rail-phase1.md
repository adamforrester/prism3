## (2026-10-24) — IA v2 phase 1: the plugin's left rail, Update file and Documentation (#2909)

**Status:** plugin panel and shared studio shell. ENGINE patch (change note). CONTRACT unchanged. No executor change,
so `EXECUTOR_REVISION` stays. The web studio's shell is unchanged (Q2909.9 is phase 2).

### What changed

- **The rail (owner decisions of 2026-10-24; round-4 wireframe).** `apps/studio/src/shell/rail.ts`: a 60px column, on
  the plugin only, with Theme · Components · Documentation · Export, then Agent (the one-click link toggle, filled with a
  green dot while on), Help (the old Docs) and Appearance (the old Theme menu). Labels and icons are the round-4 drafts,
  placeholders until Chunk 2 (Q2909.10, .19, .20). The rail keeps its labels at 380 (Q2909.16 A).
- **The top bar** holds the brand, Minimize (while the link is on) and Update file. Contrast moved into the Theme
  area's preview header; Export, Activity's tile, the Figma menu and Apply Theme left the bar.
- **Update file** (`shell/update-file.ts` over `state/update-file.ts`): the checklist always opens (Q2909.2 A). Set up
  file is its first item on a file that is not set up (Q668 A); Theme is ticked; the sets the file lacks are listed
  unticked, ticked on a file that is not set up (Q2909.5 A); Style guides draw with Documentation's saved settings
  (Q2909.23 A). A new `file-sets-request` read tells the checklist which sets the file holds and whether it is set up.
  The run drives the writes the panel already had, one step at a time, and stops after a failed step.
- **Clean up** is the overlay's second tab: Prune stale's preview runs as it opens, its Delete is the confirmed prune,
  and the style guide's retired tables are offered there (Q668 A). It never rides Update.
- **Documentation** (`shell/documentation.ts`): tabs Style guides · Usage panels · Cover · Specs, a select at 380
  (Q2909.21 A). Style guides is the old Build style guides page in a settings-only mode, with no Draw (Q2909.23 A).
  Its choices, the usage-panel switch and the cover switch (#2977) are kept in the file's root plugin data
  (`apps/plugin/src/doc-settings.ts`); Set up file and Update skip the cover while it is off, and Build and Update skip
  the usage panel while panels are off.
- **Components** in the plugin is the list and its settings, without the Build bar: new sets are added from Update file.
- **The drawer's right end** says "Agent listening · last: readback 2m ago" while the link is on (Q2909.22 A).

### Deferred to phase 2

Lever re-homing (Q2909.3/.4), the due-check ledger and the background hand-edit pass (Q2909.8), updating the sets the
file already holds in place from the checklist, Components grouped by tiers (Q2909.17), the web studio's rail
(Q2909.9), and cutting the Decisions log (Q2909.7). The checklist saves no single version up front: each step saves
what it saved before (Apply, #2851).

### Held for the owner

The dark rail's selected tile uses `fill-2` (mapped, both themes), not the wireframe's unmapped `#2a2a2d`.
