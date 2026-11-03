---
engine: minor
---
Dialog body scroll (G14, #3163; owner decision Q3130.8 A on #3130): the Dialog body is the scroll region at every
placement. A box part can now declare `scroll: 'vertical'`, which the schema accepts only on a box and only with
`clipsContent: true`, and which projects as `overflowDirection = VERTICAL`. Both executors (the plugin's and the paste
payload's) now write `overflowDirection` on every frame, `NONE` unless the plan says otherwise, and the paste payload
carries it onto a native slot. Dialog's `body` declares both, so it crops what overflows it and scrolls vertically: a
pinned footer no longer draws over a long form at full or end, where the body takes the height the header and footer
leave. Center and bottom hug, so there the crop shows only once a designer fixes the height. Dialog keeps its 24 members,
its properties and its layer names, so existing files update in place and instances keep their content. Dialog's
code notes now name the code shape: a flex-column panel with the body at `flex: 1 1 auto; min-height: 0; overflow-y:
auto`. No token is added and no token name moves, so CONTRACT is unchanged and every committed emission is
byte-identical. Dialog's projected surface moves (accepted).
