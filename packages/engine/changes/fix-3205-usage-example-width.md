---
engine: minor
---
Plugin: a usage-panel example is never narrower than its component declares (#3205). Dialog's Anatomy example drew about 60px wide, its title and text one letter per line, because the specimen kept the template placeholder's hug: the draw sized a specimen from the sizing its member reports, and a member read as hugging was left to hug. Now a def that builds its root at a width (placementWidth or builtSize) gets a fixed specimen at its member's width, with that width as the specimen's minWidth too, whatever the member reports; a def with a literal root minWidth gets that floor on a hugging specimen. Every drawn panel is due once, so Update redraws each in place.
