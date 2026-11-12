## (2026-11-11) — Code spans on the usage panel are drawn as code (#3552 Q-UG2)

The 2026-11-11 usage-guide scan (#3552, N5) found that code in a usage panel read as ordinary words, because `plain()` stripped every backtick. The owner took Q-UG2 A: keep the code, and draw backtick spans in a mono style through a `_Doc-block` text style.

**What changed.** `doc-block.ts` now names the code style the blocks use, `CODE_STYLE = 'code/inline/default'`. That is the brand's inline code text style, and the engine already emits it in every brand. The panel plans its lines with their backticks kept. When it writes a line, `write` removes the backticks (`codeRuns`) and draws each span in that style by range (`setRangeTextStyleIdAsync`). This is the same range mechanism Related already uses for its links. The style and its font are looked up once per draw, at the first code span. If the file lacks the style, the text is written plain and the run names the style as a miss. Link offsets in Related are now counted in the written text, so a Replaces entry with code can't shift a link. `writtenTexts` adds each line's written form, so a panel drawn this way still reads as Prism3's own.

**How far it reaches today: one line.** Button's first Do item (`buttonIcons`, `attached`). The defs mark very little of their code with backticks. The scan's 76 code-syntax lines, such as `<button>`, `type="number"` and `htmlFor`, are mostly unmarked prose. So they stay plain until the def text marks them. Whether to mark them is a copy call, raised on #3552, not made here.

**Gates.** `test-doc-panel.ts` adds `code/button` (typed by hand), `code/no style`, `code/every lead` (no drawn text carries a backtick, over all 37 leads) and `code/runs`. `panel/do-dont` now strips backticks itself before it compares. Mutations, each failing by name:
- the range call dropped → `code/button`;
- the backticks written as planned → `code/button`, `code/no style`, `code/every lead`, `panel/do-dont`;
- the missing style not named → `code/no style`.

`lint-executor-revision` reads the executor as unchanged (revision 56), so no bump is owed. No engine output moves. The plan hash moves only for Button's panel, so it alone is due once.
