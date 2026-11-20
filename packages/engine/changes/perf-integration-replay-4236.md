---
engine: patch
---
`test.ts`'s #3833/#3863 integration replay runs in about 22 s instead of about 50 s (#4236). Inside its throwaway
clone, the fold's regen runs only the token and Figma emitters. The five release-notes runs go side by side, in
two groups. Tests only; no committed artifact moves, and a real fold still runs the whole of regen.
