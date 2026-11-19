---
engine: patch
---
A Build set result that isn't clean offers "Show the set in Figma" in the Activity drawer while the file
holds the set (#3119). After every Build set, the panel's or an agent's, the plugin tells the panel whether the file holds
the set (`set-in-file`), read by the rule Update file uses to call a set present. The button posts `show-set`, which makes
the set's page current and fits the view to it, or, if the set has gone, answers `set-in-file` false so the offer goes. It
reads and changes the view only, never the file. No committed artifact moves.
