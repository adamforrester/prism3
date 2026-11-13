---
engine: patch
---
The studio no longer replaces a brand the designer already chose or edited with the file's brand when the file's read
arrives late (#3697 R9, owner decision A). The file's brand is held, and the error strip offers it ("Load the file's
brand"); taking the offer loads it as the file's. A restore before the designer acts loads as before, and a later restore
the plugin sends after its own write (#3394) still loads. The offer's words are a draft for owner approval.
