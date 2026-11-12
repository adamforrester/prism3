## (2026-11-11) — The UI polish review's copy fixes (#3553 Q-UI3, Q-UI4, Q-UI5, Q-UI6)

The owner took option A on four copy questions from the UI polish review (#3553).

**Q-UI3.** The Interactive page's settings card reads "Interactive settings", in sentence case like every other lever
card title. It was "Interactive Settings" (#3335's draft).

**Q-UI4.** The start window's color card reads "everything else starts from defaults you can tune". "smart" was the
buzzword class `docs/voice-standard.md` §2 bans. A brief with no front matter fence now reads "Line 1: That doesn't read
as a design.md. A design.md opens with a '---' YAML front matter fence on its first line." It had two colons in one
sentence, and the second clause started lowercase. The studio maps that one refusal to the owner's words
(`start-input.ts`, `parseRefusal`) for both dialects' parsers. The engine's own message is unchanged, because the
CLI and the MCP also read it. Every other parse refusal keeps today's "That doesn't read as a design.md: " prefix.

**Q-UI5.** Documentation › Style guides, with nothing selected, says "Pick a collection or a kind to see the tables
Update file will draw." It said "Nothing selected.", which named neither what appears nor what produces it.

**Q-UI6.** The web Components intro drops "A build places each on its page in this file.": the web host has no file and
builds nothing. It reads "The 62 component sets the engine defines, in families." The plugin's own intro is unchanged.
The plugin shows the web line only for the moment before the file's set list arrives.

**Verified.** `test-start-input.ts` holds the fence refusal verbatim for an engine-native brief and a standard-dialect
one. `test-style-guides-page.mjs` (plugin `test:verdict`) clears every kind and holds the empty summary verbatim, then
restores the selection. test:chrome sections 19, 26, 28 and 30 hold the other three strings as literals. Mutations,
each after a `wip:` commit: the mapping dropped fails `#3553 Q-UI4 A no front matter: the refusal reads in the owner's
words`; "Nothing selected." restored fails `#3553 Q-UI5 A: an empty selection says what produces the tables`; the title,
the color card and the intro each restored fail section 19's `Q51: Interactive's lever sections are the preview's …`
and 30's `TY2 A … every L1 heading the audit lists is found at L1`, 28's `the color card says …`, and 26's `the intro
counts the sets the engine defines`.
