---
engine: patch
---
Plugin: Apply Theme no longer freezes the panel while it writes (#3208). Every stage (float, color, styles, grid, type variables, text styles, motion) offers a hand-back after each variable or style it writes, and the plugin takes it once about 50 ms of work has run, the cadence a component write keeps. Until now only the color stage handed back, every 200 variables, and the float stage not at all, so the strip's timer stalled and Stop could not be clicked for long stretches. What an apply writes is unchanged. `EXECUTOR_REVISION` rises to 45 because the style executor the component executor shares takes the new argument; no set draws differently, so revision 45 names none. No emitted artifact, token or projected component surface moves.
