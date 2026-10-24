## (2026-10-24) — IA v2 phase 1: the plugin's left rail, Update file and Documentation (#2909)

**Status:** plugin panel and shared studio shell. ENGINE patch (change note). CONTRACT unchanged. No executor change,
so `EXECUTOR_REVISION` stays. The web studio's shell is unchanged (Q2909.9 is phase 2).

### What changed

- **The rail (owner decisions of 2026-10-24; round-4 wireframe).** `apps/studio/src/shell/rail.ts`: a 60px column, on
  the plugin only, with Theme · Components · Documentation · Export, then Agent (the one-click link toggle, filled with a
  green dot while on), Help (the old Docs) and Appearance (the old Theme menu). Labels and icons are the round-4 drafts,
  placeholders until Chunk 2 (Q2909.10, .19, .20). The rail keeps its labels at 380 (Q2909.16 A).
- **The top bar** holds the brand, Minimize (whether the agent link is on or off, the
  owner's direction of 2026-10-24; the strip shows the link status only while it is on) and Update file. Contrast moved into the Theme
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

- **Minimize does not depend on the agent link** (the owner's direction of 2026-10-24). It is on the top bar and works
  with the link on or off. With the link off, the strip shows the product's name and Restore only, with no link dot and
  no Turn off (`STRIP_IDLE`, placeholder wording). Turning the link off while minimized still restores the window, as
  #2949 decided. `test-agent-link.ts` `strip/off` holds it. Putting the old guard back in `setMinimized` fails it by name.
- **Three UI fixes found by moving `test:chrome` to the rail shell.** Clean up drew its tab from the state read before it
  asked for the dry run, so "Checking for stale items…" never showed. It now reads again after asking. At 380, the
  checklist ran past the bottom of the window with every set listed, so its action could not be reached. The narrow
  tier's `overflow: visible` for dialog columns reached its body; the checklist now scrolls inside itself. The 380
  Activity sheet's Escape and Close sent focus to the Activity tile, which the rail shell does not draw, so focus fell
  to BODY. Focus now goes to the drawer's own row.
- **`test:chrome` on the rail shell.** The plugin arms read the rail, the reduced bar and Update file in place of the
  Figma menu, Apply Theme and the Activity tile. Every write still gets checked on the wire: Theme, Set up file and
  Clean up's dry run and Delete. The plugin's Components page has no Build bar or boxes (Q2909.5 A), so the arms that
  measured them (#2825, C4, #2180) are retired, each with a note where it stood, and S8.2 holds their absence. The suite
  reads the plugin's mode control through the radios or the select: at 1280 the plugin's preview header also holds the
  verdict beside the 60px rail, so the radios do not fit and the select shows. A harness fix: the exemption canary's
  probe left `data-cprobe` marks, which the next font read then checked on nodes that had since been hidden.

### Deferred to phase 2

Lever re-homing (Q2909.3/.4), the due-check ledger and the background hand-edit pass (Q2909.8), updating the sets the
file already holds in place from the checklist, Components grouped by tiers (Q2909.17), the web studio's rail
(Q2909.9), and cutting the Decisions log (Q2909.7). The checklist saves no single version up front: each step saves
what it saved before (Apply, #2851).

### Held for the owner

The dark rail's selected tile uses `fill-2` (mapped, both themes), not the wireframe's unmapped `#2a2a2d`.
