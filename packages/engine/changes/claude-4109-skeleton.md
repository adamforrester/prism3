---
engine: minor
---
New component: Skeleton (#4109), the content-shaped placeholder for the first load of a known layout, beside Spinner and Progress. One component with a `shape` axis (text, circle, rect) and a `size` axis on text only, four Figma members. Text draws three lines one body line box tall, with bars stepped to about 100, 80 and 40% of the width; rect is built at 320×180 and circle at 40×40, each one fill that resizes with the instance. Every shape paints `color.background.tertiary` as one surface in pieces. Skeleton never speaks: every shape is `aria-hidden`, and the region that is loading carries `aria-busy` and one status message. In code it pulses on `motion.duration.sweep` and stops under reduced motion. No token is minted, so `CONTRACT_VERSION` does not move.
