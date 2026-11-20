---
engine: minor
---
The MCP brand-taking tools agree on their arguments and their file names (#4120, #4141, #4144; owner decisions A,
2026-11-19). validate_brand takes { brand }, as theme_brand, export_theme and score_consumption do; a bare BrandInput
is still read for one release. A call with no brand now says "<tool> requires `brand`: a BrandInput object" instead of
"(root): expected object" (DRAFT wording). export_theme writes the names the CLI writes: <id>.tokens.json, the
<id>.base.tokens.json + <id>.<mode>.overlay.tokens.json set it did not write before, <id>.ai.json (which names
<id>.tokens.json as its tree) and <id>.component-contracts.json with its compatibility copy and Specs projection. For one
release it also writes the old unprefixed names. Its description and its include property now say that include
replaces the default; the semantics are unchanged. No token path moves, so CONTRACT is unchanged.
