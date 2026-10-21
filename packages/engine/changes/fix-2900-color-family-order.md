---
engine: minor
---
Colour families follow the owner's panel order (#2900). The emitted `color` tree and the Figma create order now run
background, foreground, text, border, icon, interactive, disabled, scrim, veil, field, inverse: `border` and `icon` move
ahead of `interactive`, in the default families and in `inverse` alike. Roles inside each family are unchanged. A file
built fresh reads in this order; in an existing file the Update dry run lists the variables now out of place.
