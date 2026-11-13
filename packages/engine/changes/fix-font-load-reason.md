---
engine: patch
---
The Figma paste payload reports why a font load was refused even when the host's rejection is not an Error. Figma's refusal of a face the file lacks carries no message, so a refused Google Sans load read "label.font -> Google Sans Medium (undefined)". It now reads the host's own reason, in step with the plugin's executor.
