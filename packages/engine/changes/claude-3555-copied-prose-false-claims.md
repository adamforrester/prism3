---
engine: minor
---
The interactive overlay's recorded contrast is measured at the alpha that ships, not the nominal one (#3555 F4): in the
hex dialect 10% ships as 26/255, so `text.primary` on the hover wash records 15.42, not 15.49, and the inverse twins
move the same way. The rgb dialect is unchanged. The field border, hover border and placeholder descriptions name the
ground they are gated on (`background.secondary`, or its inverse twin) instead of calling it "the darkest permissible
ground", which it is not (#3555 F5). The overlay description says "page ground", not "PAGE ground".
