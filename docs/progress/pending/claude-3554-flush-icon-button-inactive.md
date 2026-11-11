## (2026-11-11) — The flush icon buttons carry a code-only isInactive (#3554 Q-CC22 A)

Owner decision Q-CC22 A. FlushIconButton's `disabled` told consumers to "prefer aria-disabled" inside a host that
blocks it at a limit, but gave them no prop for it, where IconButton carries `isPending`, `isInactive` and
`disabled`. The flush factory now carries `isInactive` beside `disabled`, worded as IconButton's, and `disabled` is
native disabled only. Pending stays out, as decided.

- `inactive` joins `states` and is admitted as `not-projected`, with IconButton's two reasons, so the Figma set is
  unchanged in member count. The spec grid gains the code-only coordinates (60 → 72), as IconButton's grid carries
  its `pending` and `inactive` columns, and the paint census and component-surface baselines were re-accepted.
- The host wording follows: the composition note and the `aria` line now tell a host to set `isInactive` (which
  carries aria-disabled) at a limit, and `onClick` is not called while disabled or inactive. Counter's own prose,
  which says its host sets aria-disabled at the limit, stays true and is not touched here.
