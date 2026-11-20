## (2026-11-19) — One announcement per Update file run, and a failure says why (#4219)

The #4104 accessibility audit recorded two polite live regions speaking for the same run: Activity's `activity-status` ("Update file, Theme" … "Update file failed: Apply failed.") and the status strip's `status-live` ("Applying the theme", each stage, "Stopped at Theme"). NVDA tends to read both and VoiceOver only the last, so a person heard the run twice in two vocabularies, or only the half without its name. On a failure, neither region said why. The owner chose A (2026-11-19): one announcer, in Activity's words.

### What changed

- **The strip's region says only what Activity doesn't** (`apps/studio/src/shell/status-strip.ts`): "Still working on <set>" during a run (Q3170.5 A) and the read after open, which is not an Activity run. A run's stages and its verdict line are still drawn, just not announced.
- **Update file's failure line carries the host's reason** (`apps/studio/src/shell/activity.ts`). `finishLine` takes the first cause's reason, else the first line it's given. For Update file's run it was given the failing step's headline first ("✗ Apply failed"), so the reason never reached it. The step's own lines now go first, and the headline is the fallback. The result is "Update file failed: Figma refused the write: the file is read-only."

### Test

`test-chrome.mjs` section 3170 records every non-empty write to both regions through one failing Theme run, on the plugin at light and dark 1280 and light 380. The strip writes nothing. Activity writes twice, at the start and at the end, and the end is the issue's literal. On `main` the strip arm reads `["Applying the theme","Writing color variables","Stopped at Theme"]` and the reason arm reads `"Update file failed: ✗ Apply failed."`. With both edits reverted, both arms fail by name, each naming its own edit's symptom.
