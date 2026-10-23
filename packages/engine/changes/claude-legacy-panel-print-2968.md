---
engine: patch
---
Plugin: a usage panel drawn before one panel per family (#2932) is no longer kept aside as "(edited)" when nobody edited it (#2968). Its print was taken over the whole panel, specimens and sizes included, so once the documented set was rebuilt it could never match. When it no longer matches, the panel is now read by its text: unedited when every text it shows outside its specimens is one Prism3 writes there, in today's wording or the wording before #2932, or one the _Doc-block template holds. An unedited panel is replaced in place, and a family member's old panel is removed. A line a designer rewrote still keeps the panel aside. No committed artifact moves.
