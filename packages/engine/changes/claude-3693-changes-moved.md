---
engine: patch
---
The agent link's `set-override` tells a confirm whose changes differ from its preview apart from one whose file's brand
moved (#3693). The `previewHash` is now 16 hex digits, the stored brand's 8 then the changes' 8. A confirm that echoes a
hash whose changes half differs from the changes it sends is refused as `changes-moved`, "Not saved — these changes
aren't the ones previewed. Preview them first." (draft copy). Only a moved brand half still reads `brand-moved`. When
both moved, the confirm reads `changes-moved`. Before, every mismatch read `brand-moved` and sent the agent to look at
the file when the fault was in its own request. The agent reference (`docs/public/reference/commands.json`) names the
new refusal in `set-override`'s description (draft copy).
