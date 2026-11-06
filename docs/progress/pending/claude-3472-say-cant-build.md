## (2026-11-06) — prism3-build-ui says what it can't build, first and as an imperative (#3472)

The first code run of the agent-adherence test (#3440) scored R5 faked in all 10 runs: with or without the skill,
every agent built a stand-in for a component Prism3 doesn't have, and none named the gap in its report. Reading
`skills/prism3-build-ui/SKILL.md` showed why the skill arm did no better: it had **no** can't-do rule at all. Owner
decision Q61 A treats this as a skill gap.

- **The rule.** A new section, "Say what you can't build", sits right after the one-line contract and before the
  four layers. It opens with the imperative "If no component or token covers the need, do not build a substitute.
  Leave it out and name it in your report.", says how to tell a component isn't built (only in another entry's
  `planned` list), and gives three steps: leave it out, name it in the report, build the rest. A disclosed
  substitute is still a substitute, matching R5's Q1 A.
- **The worked negative is a tooltip,** planned under the icon buttons and with no entry of its own. It is
  deliberately not a date control, so the skill doesn't teach to the R5 detector (`docs/34`).
- **The self-check** gains one closing paragraph: reread the brief, and each ask is either built or reported.
- **`test.ts` holds it** (#3472 arms): the section exists before the four layers, opens with the imperative, its
  worked negative is a planned component with no catalog entry, and it carries no date word. The date words are
  typed in the test, not imported from the detector.
- **The wording is pending owner sign-off** in the PR. After merge, the harness pin moves to the new commit
  (`orchestrate.ts pin`, then `packets.ts`): the C1 packet embeds `SKILL.md` verbatim from the pin, so that
  regeneration is mechanical. Then C1 alone re-runs, N=5.
