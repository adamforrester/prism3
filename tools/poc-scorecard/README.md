# `tools/poc-scorecard/` — the code POC's scorecard (#3408)

```sh
npx tsx tools/poc-scorecard/scorecard.ts record --arm arm-1 [--only <id>,<id>]   # run the arm's measurements
npx tsx tools/poc-scorecard/scorecard.ts render [--out <file>]                   # write the card from the records
npx tsx tools/poc-scorecard/scorecard.ts --self-test                             # the card's rules, on planted records
```

- **Rows** (`measures.ts`) are the brief's KPIs, written by hand, so a KPI with no measurement still shows on the card.
- **Records** go to `records/<arm>/<id>.json`, uncommitted. Each holds the commands, the exit code, the summary line,
  the value parsed from it, the commit and whether the tree was dirty, the time, and the seconds the run took.
- **Cells.** A measured cell shows the value, the commit and the time. A row with no record reads "not measured", with
  the arm's reason where it gives one. A failed run reads FAIL, with its first failing line. A passing run whose summary
  matches none of the row's patterns reads "unparsed". None of the three ever reads 0.
- **Arm 2.** It gets its rows in `ARMS` once its repo is readable, measured through the input contract in
  `apps/storybook/ARM-CONTRACT.md`.

Arm 1's setup: run `npm ci`, then the record step. The Storybook rows rebuild the Storybook first. The Figma geometry
row reads FAIL until the Mac job commits `apps/storybook/figma-geometry.json`.
