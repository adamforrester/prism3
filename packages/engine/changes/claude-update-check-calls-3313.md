---
engine: patch
---
Plugin: Update file's check makes far fewer host calls on a full library (#3313). It reads the file's component names once per check, not once per set. For each set that the hand-edit pass read at open, and that has not changed since, it reuses the pass's member reads. A document change that touches a set drops that set's kept read. A write, or a change that can't be traced to a set, drops all of them. The check still reads how each member draws against the file's variables, and each set's publish status, every time. The apply reads every set again before it writes. On a template-sized stand-in the check falls from about 2.8M host calls to about 0.84M, and its answer is unchanged. No emitted artifact, token or projected component surface moves.
