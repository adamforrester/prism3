---
engine: minor
---
The plugin's saved Figma versions read "Saved before Prism3 updated 47 sets", "… updated Dialog", "… added Pagination", "… drew style guides" and "… applied the theme" (#2828, owner decision Q442 A). The engine version and the details (the set list, the table count, or "Variables and styles.") go in the version's description. One builder, version-title.ts, writes every title and is the only caller of saveVersionHistoryAsync. Build, Style guide and Apply theme now save a version before their first write, as Update did. No token, emitted tree or projected component surface moves.
