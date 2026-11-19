---
engine: minor
---
Code input's cell states lining figures for code (#2814, owner decision A): its `codeOnly` entry sets `font-variant-numeric: tabular-nums lining-nums`, one declaration, so every digit is one width and stands at cap height and the cell centers it whatever figures the brand's title font draws by default. The digit's caption says so. Figma's plugin API exposes OpenType features read-only, so the Figma cell keeps the font's default figures, and the entry says that too. No token or emission change.
