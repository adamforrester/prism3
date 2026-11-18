---
engine: patch
---
The plugin's Update file summary gives one count of sets updated, and reports a declared font fallback as a fallback (#4067, #4068). The verdict's "Updated N sets" counts only the sets the run wrote to, no longer the sets it was given with nothing to write, and Update file's run line gives the same number in place of the in-place pass's progress count. The sets left to check are named on a "To check" line. A part whose face is not installed and whose plan's fallback face was written reads "<face> isn't installed, so N labels use <fallback>, as the component allows.", not "parts not written as planned". No engine output changes.
