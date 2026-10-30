---
engine: minor
---
A serif face falls back to a serif (#3140, owner decision Q3138.6 A). A curated family-name map (`font-class.ts`) gives a
known serif or serif display family the serif tail, `ui-serif, Georgia, Cambria, Times New Roman, Times, serif`, in
place of the sans one, so a page that can't load the face draws a serif. An unknown family keeps the sans tail, an
authored full stack is trusted verbatim, and a face on `code` keeps the mono tail. No new brand setting. The example
brand's Playfair Display display and title faces, and their typeface primitive, move to the serif tail; the reference
brand's faces are sans and do not move. No token is renamed or added, so CONTRACT is unchanged.
