/**
 * THE CHROME SUITE'S CI SHARDS (#2898). `test-chrome.mjs` runs as one CI job per shard, side by side under the
 * `gates` aggregator, with `CHROME_SHARD=<n>`: shard n runs the sections listed here, by the ids its guards carry
 * (`if (runs('<id>'))`). Every other way of running the suite (`npm run verify`, `npm run test:chrome`) runs the
 * whole of it and reads nothing here.
 *
 * Every section in exactly one shard. This file cannot check that, and is not trusted to: `test-chrome-shards.mjs`
 * holds the shards' RECORDS, what each shard actually ran, to the section list the unsharded suite reports
 * (`test-chrome.mjs --list`), and fails by name on a section in no shard or in two. So a new section added to the suite
 * and not here fails CI there.
 *
 * Balanced by measured time: #2898 timed each section in one whole local run (1969 s) and split them greedily, longest
 * first, so each shard holds about a third. To rebalance, read `sections[].ms` in the records a run writes
 * (`chrome-record/`, a whole run's or each CI shard's), and move whole sections; ids are listed in suite order.
 */
export const SHARDS = {
  // 657 s of the 1969 s whole run (#2898's local measure)
  1: ['8', '12', '13', '13c', '17', '18', '18-readonly', '18-s4d', '18-s4f', '19', '3115', '22', '30', '33', '40', '38', '41', '43', '47', 'ia2'],
  // 657 s of the 1969 s whole run (#2898's local measure)
  2: ['1', '2', '3', '4', '5', '6', '7', '9', '13b', '14', '16', '20b', '20c', '21', '23', '26', '29', '29b', '29c', '27', '28', '28b', '29-pinned', '29d', '31', '39', '44'],
  // 655 s of the 1969 s whole run (#2898's local measure)
  3: ['10', '11', '15', '19b', '20', '20d', '25', '24', 'x4a', '30b', '2232', '32', '35', '36', '37', '42', '45', '46', '47-menu'],
};
