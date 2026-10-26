---
engine: minor
---
Link over photography (#2986, owner decision Q690 A): every `text.link.*` role's `avoid_when` in the emitted
`.ai.json`, and its `inverse.text.link.*` twin's, now says that over a photograph a link is set in
`inverse.text.primary` with its underline kept as the link cue, on a media veil (`veil.*`) when the photo is busy,
and that `inverse.text.primary` flips in dark mode while the veil does not. Icon links are unchanged. The same rule is
written into the `prism3-consume` and `prism3-rebind` skills, and `lint-skills.ts` check 8 fails by name if either
skill or any text-link role stops stating it. No token is added or renamed and no value moves, so CONTRACT is
unchanged.
