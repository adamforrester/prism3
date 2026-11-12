## (2026-11-11) — Place names agree, the Agent switch keeps a label at 380, area tiles drop their tooltip (#3553 Q-UI9, Q-UI10, Q-UI13)

Three of the UI polish review's owner calls (#3553), each option A.

**Q-UI9 A.** The rail read "Docs" while the area's name, tooltip and page title read "Documentation". The decision was
"Documentation" on the rail if it fits the 60px tile, otherwise "Docs" on the page. Measured at the rail's 9px label,
"Documentation" needs 60px against a 55px tile ("Components", the longest today, is 53), so the area is "Docs" in its
name, its title and the plugin's Documentation heading. Shape's preview is titled "Shape" rather than "Size & shape". Other
prose that names the area ("the cover is off in Documentation" in a run's line, and the progress notes) is unchanged,
raised on #3553.

**Q-UI10 A.** At the plugin's 380 the Agent switch had dropped its "Agent" label (Q3083.6 A) and stood as a bare toggle
beside Update file. It now keeps a label there. The decision offered the word or the agent glyph. The word at 380 pushed
the bar into its trim step and cut the brand switcher to "Pri…", so the narrow tier shows the glyph (the Tabler `agent`
icon the Activity drawer already uses) and the wide tier keeps the word. The wide bar's fit steps still drop it with
the other bar labels.

**Q-UI13 A.** An area tile on the rail repeated its visible label in a tooltip. After a click the tooltip stayed under the
resting pointer and covered the page's first line. Area tiles draw no tooltip now. The rail's foot tiles (Minimize,
Help, Appearance), which draw no label, keep theirs. Activity's tile keeps its tooltip too, because it says more than its label.

**Verified.** New test:chrome section `3553-shell`, in shard 3, both hosts, both themes, at 1280 and 380. No area tile
draws or shows a tooltip after a click with the pointer resting on it. Every area tile's name is its label. The Docs title,
name and label agree. Shape's preview is titled "Shape". The Agent switch's label (the word at 1280, the glyph at 380) sits
inside the bar with no brand trim. Sections 1, 10, 29b and 30's literals and the plugin's `test-style-guides-page.mjs`
heading move to the new words. Mutations, each after a `wip:` commit: `name: 'Documentation'` back in `RAIL_AREAS` fails
`#3553 Q-UI9 … every area tile's name is its visible label`. The narrow glyph rule dropped fails `#3553 Q-UI10 … the Agent
switch shows its label`. `tip.remove()` dropped fails `#3553 Q-UI13 … no area tile draws a tooltip`.
