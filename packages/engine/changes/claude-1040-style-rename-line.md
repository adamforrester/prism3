---
engine: patch
---
Apply Theme says which styles it renamed in place (#1040, owner decision A). The style rename pass already moved a text,
effect or gradient style the engine renamed onto its new name, keeping its id, layers and library consumers, but it
returned the result as data only. The apply summary now prints one line beside the variable rename line: "N renamed
styles migrated in place (layers kept: old→new, …)", capped at three pairs (copy DRAFT). Only applied renames count. A
refused rename or a client's style prints nothing. The register ships empty, so no apply prints the line yet. Plugin
only; no committed artifact moves.
