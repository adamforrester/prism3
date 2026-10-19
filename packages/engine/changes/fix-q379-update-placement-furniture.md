---
engine: patch
---
In the plugin, an update now moves a set that sits in the page header's row, as an earlier build placed it beside a
wide header, to below the header where a fresh build places it (#2802). An update's check now lists a set's canvas
labels and backdrops that are missing or out of place as a change, so running Set up file and then the update again
draws them, without touching any member (#2803). The component executor's revision is raised to 29. No emitted
artifact, token or projected component surface moves.
