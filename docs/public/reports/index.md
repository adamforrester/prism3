# Analysis reports

Generated reports on the 53 registered components, read from their definitions and the emission. Each report is a page and a JSON twin with the same data; `regen.ts --check` fails when either is stale.

| Report | Covers | JSON |
|---|---|---|
| [Token usage](token-usage.md) | every token: which components, parts, variants and states bind it, the inverse per component, and the tokens no component binds | [token-usage.json](token-usage.json) |
| [Component dependencies](component-dependencies.md) | what nests what, directly and transitively, and which components a change reaches | [component-dependencies.json](component-dependencies.json) |
| [Component comparison](component-comparison.md) | state sets, variant axes, props, size rungs and defaults side by side, with every difference between peers | [component-comparison.json](component-comparison.json) |
| [Icon usage](icon-usage.md) | which glyphs each component draws, and which icon-set glyphs no component names | [icon-usage.json](icon-usage.json) |

For agents: [index.json](index.json) lists the same reports.
