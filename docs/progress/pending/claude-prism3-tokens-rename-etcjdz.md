## (2026-11-18) — Turn on the restore auto-stash hook (#1050)

#3970 shipped `.claude/hooks/pre-tool-use-restore-autostash.mjs` and its mutation battery, but agents never edit
`.claude/settings.json`, so the hook wasn't wired. The owner adds its entry here, to the `hooks` array of the existing
`PreToolUse` → `Bash` entry, after the `git push` drift check. From then on, a restore of a path with uncommitted
work (`git checkout -- <path>`, `git checkout <ref> -- <path>`, `git restore`) first saves that work to a named stash
entry and reports it, then proceeds. A clean restore passes through untouched. The #923 stash-pop guard joins the same
array when it lands; the two react to disjoint commands.
