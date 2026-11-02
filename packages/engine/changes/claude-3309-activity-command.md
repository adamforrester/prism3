---
engine: minor
---
The agent link answers a read-only `activity` command (#3309): the Activity drawer's runs this session, newest first,
the panel's own runs included, so an agent can diagnose a run the owner started without the drawer's text copied by
hand. Each run carries its operation, who ran it (the panel, or the agent command), its time, the verdict's kind and
ok, its headline, summary and lines, each set the build left not clean with the reasons its verdict read (a miss that
is not a skipped member, a missing canvas template), and the build stamp it ran from. The main thread keeps the log in
memory (apps/plugin/src/activity-log.ts): each verdict as it posts it to the panel, and the panel's own summary of a
multi-set build and of Update file's run, which the panel now posts as an activity-note. Nothing is kept in the file
and the command writes nothing. `since` and `limit` page it. AGENT_PROTOCOL_VERSION stays 1, no component surface
moves, and CONTRACT is unchanged.
