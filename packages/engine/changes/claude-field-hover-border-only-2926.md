---
engine: minor
---
Fields hover by border only (#2926, owner decision 2026-10-26, Q1′ D and Q2′ A). Text field, Password field, Search
field, Select, Textarea and Code input cells bind no hover wash (`overlay.hover` → `interactive.neutral.overlay.hover`
is gone, and their frame parts paint no overlay slot), under Outline and Underline field styles and under every
outlineInteraction setting, which now reaches buttons, icon buttons, tags, segments and page cells only. Buttons and the
other controls keep their wash, and there is no lever. field.border.hover and inverse.field.border.hover move from two
ramp steps to four above rest in every brand and mode, about 1.9–2.2:1 rest→hover (was 1.39–1.47), and still clear
3:1 on background.secondary (6.4–9.9:1). Rest, focus (border.focus plus the 2px ring) and the status borders at hover
are unchanged. Descriptions, ai.json guidance and the field docs say so. No guaranteed name moves, so CONTRACT is
unchanged.
