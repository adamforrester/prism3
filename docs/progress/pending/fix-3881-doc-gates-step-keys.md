## (2026-11-18) — lint-doc-gates fails a gate step that carries continue-on-error or a step if: (#3881)

Found in quality scan #3868. `lint-doc-gates.ts` holds every `ci.yml` gate step to the three checklists and to
`verify.ts`, and refuses shell syntax such as `|| true` inside a `run:`. It never read the step's other keys. With
`continue-on-error: true` or `if: false` inserted above the hit-target step, it exited 0 and printed its clean line:
the gate was still listed, documented and run locally, and CI would be green whatever it said. #888 decided the
policy ("never `continue-on-error`"); nothing enforced it.

Arm 10, `neuteredStepGaps`, reads the parsed tree (`parseYamlSubset`, not the scrape). No step with a `run:` may carry
`continue-on-error` other than a literal `false`, or any step-level `if:`. No job holding such a step may carry
`continue-on-error` other than `false`. A job-level `if:` is left to `all-gates.sh`, which fails a skipped job by name
unless the docs-only exemption lists it, and to `exemptionGaps`, which holds that list. The rule holds at zero today, so
there is no allowlist; a step that genuinely needs either key takes #888's route and adds its allowlist in that PR.

Mutations on the hit-target step (each committed first):
- `continue-on-error: true`: main exit 0; the fix exits 1 on `"Interactive controls meet the 44px hit-target floor"
  (\`engine\`) carries \`continue-on-error: true\``;
- `if: false`: main exit 0; the fix exits 1 on `… carries a step-level \`if: false\``;
- `continue-on-error: true` on the `engine` job: the fix exits 1 on `job \`engine\` carries \`continue-on-error: true\``;
- the arm's own predicate made always-sound: the self-check fails on three named lines (`arm 10 misses …`).
