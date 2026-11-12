---
engine: minor
---
Component prose from the 2026-11-11 metadata audit (#3555 Q-MD5, Q-MD14, Q-MD15, Q-MD16).
- Summaries, which are also the Figma set descriptions, name other components in plain words and carry no build
  instruction.
- Every `primaryPurpose` opens with a verb, and each Button, IconButton and FlushIconButton sibling states its own.
- Shipped fields say "accessibility", not "a11y" or "i18n".
- Badge's no-color-alone claim is worded as intent, and Spinner and Checkbox.Row no longer cite a third-party system
  for their numbers.
- Image placeholder's `whenToUse` drops a Figma-only instruction that its `docs.do` already carries.
