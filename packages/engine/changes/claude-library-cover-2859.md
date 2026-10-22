---
engine: minor
---
The library file has a cover (#2859, owner decision Q509 A). Set up file draws a 1920 × 1080 cover on the Cover page and
sets it as the file thumbnail while the file still has Figma's default one; a thumbnail a designer chose is never
replaced. The cover shows the brand's name, set in its display face, and "Prism3 {{ENGINE_VERSION}}" on the brand color:
the fill binds `foreground/brand` and both texts bind `text/on-brand`, the pair the engine contracts at 4.5:1 against
exactly that ground. Every Update keeps the version current. A cover a designer edited keeps every edit, and only its
tagged version text changes; with that text deleted, nothing is written and the run says so. `BrandInput` has a new
optional `name`, the brand's display name, which the cover shows, falling back to `id` as written. No token emits from
it, so CONTRACT is unchanged.
