## (2026-11-03) — Studio: one settings rhythm, five named tokens and a gate on every place (#3337)

The owner's screenshot of Components › Button options showed settings stacked on each other: a segmented control's
bottom edge on the next setting's name, a readout line running into the next name, "Set it in …" links indented off
the column, and a read-only row's note drawn over its own name. The owner chose Q3337.1–.5 A.

### The diagnosis that made the fix small

One missing rule, not a scatter of margins. `.p3-bopts`, the root all nine option blocks draw their rows into, had no
CSS at all, so its rows sat in a plain block with no gap. The Theme pages only kept their 24px rhythm because each row's
parent (`.p3-lsec`, `.p3-icol`) supplied a grid gap; a container one level down skipped it, and nothing noticed.

### What changed

- **Five named chrome tokens** (`chrome/spec.mjs`, product rows over the space scale): `--p3-rhythm-label` (space.150),
  `--p3-rhythm-hint` (space.100), `--p3-rhythm-row` (space.300), `--p3-rhythm-group` (space.500) and
  `--p3-rhythm-section` (space.200). They are the values the Theme pages already used, so the Theme pages do not move;
  `.p3-lsec`, `.p3-icol`, `.p3-icols`, `.p3-levers-body`, `.p3-lever-ctl` and the L2 legend now read the names.
- **`.p3-bopts` is a grid at `--p3-rhythm-row`**, which fixes every Components option block at once.
- **"Set it in …" is a flush text link** (Q3337.2 A): `.p3-btn.p3-deplink` drops its inline padding and its edge, so its
  words start on the row's edge. It stays a whole target tall and underlined, with the chevron after it.
- **Read-only rows** (Q3337.3 A): in a group, a div lever's control already starts space-050 under its head, so its
  description takes no second pull. Three stacked pulls had put the note 4px over the name.
- **Export joins the rhythm** (Q3337.4 A): its settings are one `.p3-export-sets` grid at the row rhythm (12px → 24px),
  each label space-050 over its control, each note the hint rhythm under it. Before/after renders are in the PR for the
  owner's sign-off.

### The gate: `test:chrome` section `3337` (shard 2)

Both hosts, both themes, 1280 and 380, on every place that holds settings: Brand, Color × 3, Type, Shape, Depth,
Layout, Components with all nine option blocks open, and Export. Row → row is at least the emission's `space.300`, read
by section 30's `HT` oracle from `prism3.tokens.json`, never from `chrome.css`. It also checks that no control ends
within that distance above another row's name, that every "Set it in …" link starts within 1px of its row, and that a
read-only row's note starts below its name. Each option block is named literally with a floor of rows, and each place
has literal floors on rows and pairs. Color › Fills has a pairs floor of 0, because each of its levers is alone in its
section.

Mutations, each failing by name in all eight host × theme × width runs:
- `.p3-bopts`' gap dropped → `3337 figma light 1280 / components / button-options: "Button icons" → "Medium button label & icon" 0px < 24px (row → row, space.300)`;
- the link's inline padding restored → `… / components / shared-options: "Set it in Shape › Density" starts 16px in from its row (≤ 1px)`.

Run over `main`'s CSS (`chrome.css`, `bar.ts` and `spec.mjs` restored, both bundles rebuilt), the section fails 224 of its 649 assertions: 168 on Components, 32 on Export, and 24 for the three indented links on Shape and Type.

### Not here

The Weights read-only value runs past the card's edge at 1280. It is #3338, filed separately.
