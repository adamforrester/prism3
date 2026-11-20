---
engine: patch
---
Studio: putting a setting back to Auto now leaves the brand exactly as it was before the edit (#3878). A clear used to
leave an empty group behind (`typography: {}`, `shadow: {}`, `surfaces: { light: {} }`, `layout: {}`, or an empty
typeface library), so an unedited brand read as edited and the replace guard asked to discard "0 edits". The empty
group also reached Export design.md and the web's saved brand. Studio and plugin only: no committed artifact moves.
