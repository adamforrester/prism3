---
engine: minor
---
The resting link state is `rest`, the name every other interactive role gives it (#4165, owner decision A; a MAJOR contract change, held for the #1421 batch: the CONTRACT_VERSION bump lands once, with #1421). `color.text.link.default`, `color.icon.link.default`, `color.inverse.text.link.default` and `color.inverse.icon.link.default` are renamed `….link.rest`, with the same values. Each retired path has a `DEPRECATIONS` entry pointing at its `rest` twin, and the plugin's Update renames the four Figma variables in place, keeping their ids. A brand input whose `overrides` still name `….link.default` is read as `….link.rest`. Link and Breadcrumbs bind the new names. Studio's link states read `rest`, where they read `default`.
