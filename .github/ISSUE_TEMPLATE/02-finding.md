---
name: Finding / bug
about: Something is wrong — found in review, in a live drive, or in use.
title: "[lane] "
labels: type:finding
---

<!--
  A finding is a defect with evidence. If you're not sure it's wrong, it's probably
  a decision (use the decision template) or a research question.
-->

**Lane:** <!-- engine / web / plugin / figma / code-library / mcp --> · **Type:** finding · **Source:** <!-- owner review / live drive / PR review / eval -->

## What's wrong

<!-- One bullet per distinct defect — don't merge two bugs into one prose blob.
     State the observed behaviour AND the expected behaviour. -->

-

## Repro

<!-- The steps, the brand/mode/viewport, and whether it reproduces on main.
     "Could not reproduce on main via headless" is a useful thing to write down —
     say so rather than leaving it implied. -->

## Suspected cause

<!-- Optional. If you've located it, name the file and line. If you haven't, say so
     rather than guessing — a wrong lead costs more than none. -->

## Blast radius

<!-- Does this move out/*? Does it affect the NB regression or a committed fixture?
     Which brands/modes are affected vs. clean? -->
