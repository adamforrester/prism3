---
engine: minor
---
The Password field's box corner now follows Control shape's Boxed and Hairline, like every other field (#3784). Its def lacked the `levers.controlShape` entry its text-field siblings carry, so under Boxed or Hairline with Outline fields it kept the 4px `radius.sm` corner while the others squared. Its plans now bind `radius.none` (Boxed) or `radius.hairline` (Hairline) on the four corners of its control box, and nothing else moves. Rounded, Pill and Underline are unchanged. No `regen` artifact changes, because the brand-neutral build draws Rounded. The studio's Used-by index (`apps/studio/src/preview/used-by.ts`) moves PasswordField from `radius.sm` to `radius.none` under Boxed and to `radius.hairline` under Hairline. `CONTRACT_VERSION` unchanged: no token name moves.
