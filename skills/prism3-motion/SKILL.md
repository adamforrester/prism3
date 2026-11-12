---
name: prism3-motion
description: >-
  Decide how things move in a Prism3 product — what animates and what doesn't,
  which duration, easing role, spring or transition token each change uses, how
  exits differ from entrances, and what reduced motion substitutes. Every rule
  binds to the brand's emitted motion tokens, never to a number, because the
  numbers move with the brand's tempo. Nine recipes cover dialog, accordion,
  tabs, toast and banner, the spinner's delayed show, progress, badge, the
  selection controls, and focus; every other component follows the rules
  directly.
when_to_use: >-
  When adding a transition, an animation, a spring or a reduced-motion rule to UI
  built on a Prism3 token system, or when writing the `motion` field of a component
  definition. Read it with `prism3-build-ui`, which covers every other token family.
---

# prism3-motion — moving things with Prism3's motion tokens

You're animating UI that sits on a generated Prism3 token system. The brand's motion lives in its
`motion.*` tokens: a duration ramp, easing roles, springs, transition composites and a stagger
interval. **The values behind those names change per brand**: the brand's tempo
(`motionPersonality.tempo`) scales the duration ramp, all but the two loop periods. So a number you type is right for one
brand at most, and wrong for the next one the same code runs on. Name the token and the brand
supplies the value.

> **The one-line contract:** every timing is a `motion.*` token, every change has a reason to move,
> and reduced motion swaps movement for a fade instead of deleting the transition.

The rules ground in the practice knowledge base (KB `18-motion-foundations` and
`21-motion-spec-and-handoff`) and in decisions the engine already encodes. Each rule names its
grounding, so you can check the reason, not only the rule.

## The tokens you bind

Bind the **role** a family offers, not the shape or step behind it. The role says why; the brand
picks the value.

| Family | Roles | Use it for |
|---|---|---|
| `motion.duration.*` | `instant`, `fast`, `normal`, `moderate`, `slow`, `slower` | How long a change takes, shortest to longest. Scaled by the brand's tempo. |
| | `spin`, `sweep` | Loop periods: one spinner turn, one pass of an indeterminate progress bar. Not tempo-scaled. |
| `motion.duration-reduced.*` | the same role names | The twin of each duration under `prefers-reduced-motion`. |
| `motion.easing-role.*` | `default`, `enter`, `exit`, `emphasized` | The curve, named by what the change does. |
| `motion.easing.*` | `linear`, `standard`, `decelerate`, `accelerate`, `expressive`, `calm` | Curve shapes. Reach for a shape only where no role fits, such as `motion.easing.linear` for a constant-speed loop. |
| `motion.spring.*` | `snappy`, `gentle`, `bouncy` | Physical motion for things a person drags, flicks or releases. |
| `motion.transition.*` | `default`, `enter`, `exit`, `emphasized` | A duration and an easing role already paired. Prefer these when one fits. |
| `motion.stagger` | — | The interval between siblings that arrive in sequence. |

The `.ai.json` sidecar has one entry per motion token, with what it's for. Read it when the table
above doesn't settle a choice.

## The rules

**R1. Every timing is a token.** A duration, a delay, a curve or a spring is a reference to a
`motion.*` token: a duration role, an easing role, a spring or a transition. A typed number or curve
is a defect, even when it matches today's value, because tomorrow's brand has a different tempo.
Where no token exists, don't invent one: say so in your report, and use the component's own spec
for that one value.
*Grounding:* KB `18-motion-foundations`, Tier 1 (motion tokens) and its failure mode where an agent
invents durations.

**R2. The easing follows the change.** A thing arriving takes `motion.easing-role.enter`, a thing
leaving takes `motion.easing-role.exit`, a change in place takes `motion.easing-role.default`, and a
deliberate hero moment takes `motion.easing-role.emphasized`. An entrance decelerates into place; an
exit accelerates away, so it reads as gone without being watched.
*Grounding:* KB `18-motion-foundations`, easing tokens; the role table `EASING_ROLE_DEFAULTS` in
`packages/engine/theme.ts`.

**R3. Leaving is faster than arriving.** An exit runs shorter than its entrance. The transitions
encode it: `motion.transition.exit` sits on `motion.duration.fast` and `motion.transition.enter` on
`motion.duration.normal`. When you pair a duration yourself, keep the exit at least one step shorter
than the entrance. A person who dismissed something has already moved on. Under reduced motion the
twins aren't in order yet (#3493): a reduced `fast` can outlast a reduced `normal`. So a reduced enter
and its exit share one `motion.duration-reduced.*` role, and the exit is never longer.
*Grounding:* KB `18-motion-foundations`, Tier 2, "exit faster by default".

**R4. Springs move what a person touches; curves move what the system starts.** A drag release, a
flick to dismiss and a swipe settle on a `motion.spring.*` token, because they continue a hand's
velocity. Anything the system triggers (an open, a load, a state change) takes a
`motion.transition.*`. Use `motion.spring.snappy` by default, `motion.spring.gentle` for a large
surface, and `motion.spring.bouncy` only for a deliberately expressive moment. Keep opacity and color
off springs: all three springs are spatial, and an effects spring doesn't exist yet (#3481).
*Grounding:* KB `18-motion-foundations`, decision frameworks (spring or curve) and the spatial and
effects split.

**R5. Animate transform and opacity.** Position, scale and opacity move without reflowing the
page. Animate size or layout only where the size change is the information: the accordion panel
opening, a banner collapsing as it's dismissed, toasts closing ranks. Those run on
`motion.transition.enter` and `motion.transition.exit` like any other change.
*Grounding:* KB `18-motion-foundations`, "May this animate layout?".

**R6. Chrome stays quick.** A state change on a control (hover, press, check, select) takes
`motion.duration.instant` or `motion.duration.fast`. An entrance or exit stays at or under
`motion.duration.moderate`. Keep `motion.duration.slow` and `motion.duration.slower` for moments that
replace the whole screen. Motion a person sees dozens of times a session gets in the way when it's
slow.
*Grounding:* KB `18-motion-foundations`, duration roles.

**R7. Reduced motion substitutes; it doesn't delete.** Under `prefers-reduced-motion`:
- movement (a slide, a scale, a spring) becomes a fade;
- every duration takes its twin in `motion.duration-reduced.*`, except that an enter and its exit
  share one twin until the reduced ramp is in order (R3, #3493);
- a functional loop slows instead of stopping: the spinner turns on `motion.duration-reduced.spin`,
  the progress sweep on `motion.duration-reduced.sweep`.

A fade isn't vestibular motion, and it keeps the cue that something appeared or went. Some reduced
durations resolve to zero today (#3484), so code that waits for a transition to end also handles the
case where no transition runs. Springs and curves have no reduced twin yet (#3483), so drop the
spring and fade instead.
*Grounding:* KB `18-motion-foundations`, the reduce-motion contract; the engine's derived
`durationReduced` ramp and `SPIN_REDUCED_MS` in `packages/engine/theme.ts`; WCAG 2.3.3.

**R8. Loops end.** A decorative animation runs a set number of times and stops. A functional loop
(the spinner, the indeterminate progress bar) runs on `motion.duration.spin` or
`motion.duration.sweep` and states what stops it: the work it reports finishing. Anything that moves
on its own for more than five seconds beside other content needs a way to pause, stop or hide it.
*Grounding:* KB `18-motion-foundations`, iterations; WCAG 2.2.2.

**R9. A repeated trigger doesn't queue.** When a person toggles, opens or switches again before a
transition finishes, the new change starts from where the element is now, on the same
`motion.transition.*` token. It never waits for the old one to play out, and a stack of repeats never
plays back in sequence.
*Grounding:* KB `18-motion-foundations`, skip on rapid repeat (a practice position).

**R10. Nothing grows from nothing.** A scale entrance starts a little smaller than full size, not
from zero, and fades in on the same `motion.transition.enter` timing. Growing from a point draws the
eye to the growth instead of the content.
*Grounding:* KB `18-motion-foundations`, the pop pattern.

**R11. Siblings stagger on one interval.** Items that arrive together, such as rows of a list,
start `motion.stagger` apart, each on `motion.transition.enter`. Keep the sequence short: stagger the
first few and let the rest arrive together, so a long list doesn't make the last item wait.
*Grounding:* KB `18-motion-foundations`, choreography.

## Recipes

Each recipe names its tracks (what moves), its tokens and its reduced form. Every one follows the
rules above; where a recipe needs a value the tokens don't hold yet, it says which gap.

### Dialog

| Track | Enter | Exit |
|---|---|---|
| Backdrop | opacity, `motion.duration.moderate`, `motion.easing-role.enter` | opacity, `motion.duration.normal`, `motion.easing-role.exit` |
| Panel, centered | opacity and a scale from a little under full size (R10), same timing as the backdrop | the reverse, same timing as the backdrop |
| Panel, bottom sheet or full screen | slides up from the bottom edge, same timing | slides back down, same timing |
| Panel, end panel | slides in from the end edge, same timing | slides back out, same timing |

**Reduced:** the backdrop and every panel placement fade only, on `motion.duration-reduced.normal`,
with no slide and no scale.

Move focus into the dialog when it opens, without waiting for the enter to finish.

### Accordion

| Track | Open | Close |
|---|---|---|
| Panel height (the R5 exception) and opacity | `motion.transition.enter` | `motion.transition.exit` |
| Indicator glyph turn | `motion.transition.default` | `motion.transition.default` |

**Reduced:** the height changes at once; the panel's fade stays, on `motion.duration-reduced.normal`
both ways (R3). The indicator swaps without turning.

### Tabs indicator

| Track | On a selection change |
|---|---|
| Underline | travels from the old tab to the new one, as a transform, on `motion.transition.default` |
| Panels | the outgoing panel fades out under the incoming one, on `motion.transition.default`. Panels never slide sideways. |

**Reduced:** the underline snaps to the new tab; the incoming panel fades in on
`motion.duration-reduced.fast`.

### Toast and banner

| Track | Enter | Exit |
|---|---|---|
| Toast | slides up and fades in, on `motion.transition.enter` | fades out, on `motion.transition.exit` |
| Banner | fades in, on `motion.transition.enter`; its space is reserved first, so nothing below jumps | collapses its height and fades, on `motion.transition.exit` (the R5 exception) |

A replacement toast plays the exit, then the enter. The toast's slide distance has no token yet
(#3482): take it from the `toast` definition until it does.

**Reduced:** fades only, on `motion.duration-reduced.normal` both ways (R3). The banner's height
changes at once.

### Spinner, delayed show

| Step | Tokens |
|---|---|
| The host waits before mounting it, so a quick response never flashes one | no token yet (#3486): use the host's own spec |
| It fades in on mount | `motion.duration.fast`, `motion.easing-role.enter` |
| It turns, at constant speed, until the work ends | `motion.duration.spin` per turn, `motion.easing.linear` |

**Reduced:** it turns slower on `motion.duration-reduced.spin` and never stops while the work runs;
the fade-in stays, on `motion.duration-reduced.fast`.

### Progress

| Step | Tokens |
|---|---|
| The wait before it shows, so a fast task shows nothing, and the least time it stays once shown | no token yet (#3486): Progress's own `delay` and `minDisplay` |
| The fill moves to each new value | `motion.duration.moderate`, `motion.easing-role.default` |
| An indeterminate bar sweeps its segment across the track, until the work ends | `motion.duration.sweep` per pass, `motion.easing.calm` |
| An indeterminate ring turns its arc, until the work ends | `motion.duration.sweep` per turn, `motion.easing.linear` |
| At complete or error, the fill's color crossfades | `motion.duration.fast`, `motion.easing-role.default` |

**Reduced:** the fill moves on `motion.duration-reduced.moderate`, which can resolve to zero (#3484).
The sweep and the turn slow to `motion.duration-reduced.sweep` and never stop while the work runs
(R7, R8).

### Badge

| Track | Enter | Exit |
|---|---|---|
| Count or dot | fades in and scales up from a little under full size (R10), from the corner it is anchored to, on `motion.transition.enter` | fades out and scales down toward its anchor, on `motion.transition.exit` |
| A changed count | only the number changes, on `motion.transition.default`; the pill doesn't move | — |
| Status label | no motion | no motion |

A badge doesn't pulse: none of its states loops (R8).

**Reduced:** a count or dot fades only, with no scale, on `motion.duration-reduced.normal` both
ways (R3); a changed count's number fades on the same role.

### Selection controls

| Control | Track | On a change |
|---|---|---|
| Checkbox | the check glyph draws in as a stroke while the fill crossfades | `motion.duration.fast`, `motion.easing-role.default` (R6) |
| Radio | the dot scales in from a little under full size (R10), the previous choice's dot scales out, and the ring's color crossfades | `motion.duration.fast`, `motion.easing-role.default` (R6) |
| Switch | the thumb travels across the track as a transform, and the track's color crossfades with it | `motion.transition.default` |
| Segmented control | the pill travels to the new option as a transform, as the tabs underline does | `motion.transition.default` |

The focus ring on each of them follows the focus recipe below.

**Reduced:** nothing draws, scales or travels. The glyph, the dot, the thumb and the pill take their
new place at once, and the color change fades on `motion.duration-reduced.fast`.

### Focus

The focus ring appears at once and leaves at once. It never animates in. A keyboard user needs to
see where focus landed the moment it lands, and a fade or a grow delays that. No `motion.*` token
applies: the ring binds `focus.ring.width`, `focus.ring.offset` and `color.border.focus`, and none of
them transitions. The control under the ring keeps its own state change (R6).

## Gaps: what to do until a token exists

| Gap | Issue | Until it's filled |
|---|---|---|
| No effects spring | #3481 | Keep opacity and color on a `motion.transition.*`. |
| No motion distance scale | #3482 | Take a slide distance from the component's definition. |
| No reduced twin for springs or curves | #3483 | Under reduced motion, drop the spring and fade. |
| Some reduced durations resolve to zero | #3484 | Handle the case where no transition runs. |
| The reduced ramp isn't in order: a shorter role can resolve longer | #3493 | Under reduced motion, give an enter and its exit the same `motion.duration-reduced.*` role. |
| Springs reach Figma without a paired duration | #3485 | Figma only; code is unaffected. |
| No show-delay or minimum-show timing | #3486 | Use the host's own spec for the wait. |

Report a gap you hit; don't fill it with a number.

## Before you finish

1. Every duration, delay, curve and spring in your change is a `motion.*` name. No unit, no curve
   function, no spring constant typed in.
2. Each moving thing has an easing role that matches its change: `enter`, `exit`, `default` or
   `emphasized`.
3. Each exit is shorter than its entrance. Under reduced motion, each exit shares its entrance's
   reduced role, so it's never longer (#3493).
4. Only transform and opacity animate, except the declared layout cases (R5).
5. Under reduced motion, every movement became a fade on a `motion.duration-reduced.*` twin, and
   every functional loop still runs, slower.
6. The focus ring has no transition.

This skill is gated by `packages/engine/lint-motion-literals.ts`: it fails when the skill types a
duration, a curve or a spring constant, and when a `motion.*` name here doesn't resolve in the
emitted tokens.
