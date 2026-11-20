---
engine: minor
---
Two Apply Theme writes now read the file as the plugin's own path does (#3861, #1908). The agent paste's font step writes each font-cut variable in its family's own spelling before it writes, from the text plan's cut-to-family pairing it now carries, as the plugin has since #1728. A paste stopped between its font and text steps no longer leaves a cut naming a style its family lacks. And a gradient style whose angle is negative or prints with an exponent (`-45°`, `1e-7°`) is recognized as Prism3's by its description in a file applied before the ownership mark, so the next apply no longer refuses it. No engine output changes.
