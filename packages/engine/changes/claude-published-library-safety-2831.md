---
engine: minor
---
Update's dry run catches one more change that breaks library consumers, and Update file's checklist shows it (#2831,
#2864). On a published set, a layer the plan no longer has, which the update removes, is now listed as breaking:
consumer overrides on it are lost. When the plan adds a layer under the same parent, the line names that layer as the
likely new name and says a declared part rename keeps the layer in place. Each published set with a breaking change
now gets one "Breaks library consumers" line in Update file's checklist. The line names each case, what breaks, and what
the update does about it: a dropped member is kept and marked deprecated. The wording is a placeholder. Unpublished
sets are unchanged. No token is renamed or added, so CONTRACT is unchanged.
