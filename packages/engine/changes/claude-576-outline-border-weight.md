---
engine: minor
---
New brand setting `buttonBorderWeight` (#576): one border weight for every outline button set. `hairline`, the default, keeps today's 1px edge (`border-width.hairline`). `thick` binds `border-width.thick`, 2px, on button, button-neutral and button-destructive at once. Each set keeps its own border color, and icon buttons are unchanged. No token is added, so the token contract does not move. The component-defs export's format moves to `prism3-component-defs/1.5` (`settings.button.borderWeight`). The key, values and labels are a draft for the owner.
