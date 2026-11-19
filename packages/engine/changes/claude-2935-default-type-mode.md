---
engine: minor
---
Each breakpoint names the type mode its frames start from (#2935, owner decision 2026-11-18, A). A new engine rule, `defaultTypeMode`, gives mobile type to a breakpoint below 1024px and desktop type from 1024px up, for any breakpoint count. With fluid type, each `breakpoint/<name>` Figma variable's description now ends "A frame at this breakpoint uses mobile type by default" (or desktop), and Studio's Layout preview shows the same beside each breakpoint's width. With static type, `type-sets` has no modes and nothing changes. No token name, value or mode moves; the five fluid brands' `layout.*.json` Figma descriptions change.
