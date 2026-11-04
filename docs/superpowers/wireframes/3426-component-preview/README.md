# #3426 wireframe — Studio component previews (throwaway)

A wireframe for the proposal on #3426, not product code. Never merged.

- `wireframe.png`: `mock.html` rendered inside the built Studio's Components page. The rail, the top bar and the levers
  pane are the real chrome; the preview pane holds the mock.
- `mock.html`: the fragment. Chrome parts read only the chrome's `--p3-*` variables. The radios are mock drawings, in
  the brand primary copied from the live Button specimen. Their boxes (16/20/24 px) are assumptions; their dots follow
  `radioDotPx` (`packages/engine/scale.ts`). The pink pins are annotations.
- `render.cjs`: `node render.cjs apps/studio <mock.html> <out.png>`, after `npm run -w @prism3/studio build`.
