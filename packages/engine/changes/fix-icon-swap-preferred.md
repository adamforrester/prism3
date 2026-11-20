---
engine: minor
---
An INSTANCE_SWAP property whose target is a core icon (`icon/…`) now carries `preferIcons` in its plan (#4164), and the paste payload writes every `icon/` component the file holds, except the placeholder `icon/FPO-default-icon` (still the default, now exported as `ICON_PLACEHOLDER`), as that property's preferred values, by key in name order, so Figma lists the icons first in the swap picker. A swap whose target is not an icon is unchanged. No committed artifact changes: the committed plans project their swaps with no `icon/` target.
