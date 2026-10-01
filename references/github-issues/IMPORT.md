# Importing these as GitHub issues

## Option A — by hand (simplest)
For each file 01 to 12: New issue → title = the first line (without the `#`) → body = the rest → add the labels listed in the file.

## Option B — GitHub CLI (`gh`)
Run these from the repo root after installing and logging into `gh`. (You run them; Claude Code does not run terminal commands.)

First create the labels once:
```bash
for a in home attendance itinerary checklist budget expenses chat location dump couple settings account; do gh label create "area:$a" --force; done
for p in 1 2 3; do gh label create "phase:$p" --force; done
gh label create "good-first-issue" --force
```

Then create the issues (title is taken from each file's first heading):
```bash
for f in 01-home 02-attendance 03-itinerary 04-checklist 05-budget 06-expenses 07-chat 08-location 09-dump 10-couple 11-settings 12-account; do
  title=$(head -1 "github-issues/$f.md" | sed 's/^# //')
  gh issue create --title "$title" --body-file "github-issues/$f.md"
done
```
Assign owners in the GitHub UI, or add `--assignee <username>` to the command.

## Suggested milestones
- **M1 — Every tab looks right** = all `phase:1` issues
- **M2 — Everything works** = all `phase:2` issues
- **M3 — States + polish** = all `phase:3` issues
