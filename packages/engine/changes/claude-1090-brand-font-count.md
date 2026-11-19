---
engine: patch
---
The plugin's Apply Theme summary counts the brand's own fonts in `type N fonts loaded` (#1090). It used to count every face loaded ahead of the write, including faces for the styles the file already held, so one brand reported 4 on an empty file and 6 on a themed one. The agent data's `fontsLoaded` reads the same number. No engine output changes.
