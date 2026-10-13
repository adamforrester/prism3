---
engine: minor
---
Icon color roles are fills only in Figma (#2566, owner decision): every icon is a fill, never a stroke. Every icon
color variable (`color.icon.*`, `color.inverse.icon.*`, `interactive.<c>.icon.*`, `disabled.icon` and their inverse
twins) now scopes to `FRAME_FILL` and `SHAPE_FILL` only. `STROKE_COLOR` is gone, so icon colors no longer appear in
Figma's border color picker. Scopes only: no variable name, value or alias moves, so CONTRACT is unchanged. The
committed Figma color files under `out/figma/` move. Apply Theme already rewrites a variable's scopes on update, so
re-applying a theme to an existing file moves its icon variables onto the new scopes in place.
