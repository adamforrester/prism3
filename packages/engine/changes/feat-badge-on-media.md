---
engine: minor
---
Badge gains a `surface` axis, `default | media` (#2983, owner decision Q644 A; built on the Q2983.1–3 recommendations,
pending the owner's answers). A status label on a photo, `surface=media`, sits on the page surface `background.primary`
with no edge, in the tone's text role (`text.primary` for neutral), padded `space.025` × `space.100` for an 18px label.
The Figma set grows from 20 to 25 members: media × count|dot and media × bold are excluded, and every existing member
gains `surface=default`. The paint grammar carries the surface second (`{tone}.default.{type}.{emphasis}.{slot}` and
`{tone}.media.{slot}`), so a media member can never reach a default key. No token path is added, so CONTRACT is unchanged.
