---
engine: patch
---
Studio and plugin: Report a problem now scrubs the words of every brand the session has held, not only the brand on
screen when the report opens (#3883). An Activity line is an operation's latest result, and it stays across a brand
load, a rename and a failed restore, so a client brand's root, palette, mode and typeface names could reach a report
opened on another brand. With "Include the brand's settings" ticked after a failed restore, the report now includes
the file's brand, not the boot demo. No committed artifact moves.
