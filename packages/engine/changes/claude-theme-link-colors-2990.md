---
engine: patch
---
Studio and plugin, Color › Interactive › Links (#2990): the Text link and Text link · inverse rows now measure each step at its worst across the surfaces the link sits on (the engine's floor ground plus the family's primary and secondary surfaces), and a step below the floor can no longer be picked. Before, it could be picked, and the engine then moved the pin to the nearest step that clears. Each of these two rows now shows its contrast in every mode and the steps hover, visited and pressed follow. A new test.ts arm (L-07) pins every link-palette step onto every text-link role in each editable mode and checks the resolved hexes against those surfaces in all four modes. Built on the recommended answers to Q2990.1–5, still pending. No committed artifact moves.
