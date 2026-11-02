---
engine: patch
---
Plugin: a usage-panel example keeps its width once its panel is on the page (#3205 follow-up). #3211 fixed each specimen at its member's width with that width as its floor, but in Figma Dialog's example still ended up fixed at the 62px it hugs inside a 687px stage. The likely cause: the host drops a nested instance's size overrides when its tree moves, and the panel moves onto the page only after every specimen is sized. Now each specimen is sized again after the panel lands, before its anatomy markers are placed. The panel format is raised, so Update redraws every usage panel once. Real-Figma confirmation is still owed. No emitted artifact, token or projected component surface moves, and the executor is unchanged.
