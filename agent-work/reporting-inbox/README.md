# Reporting inbox

If a fresh session cannot safely edit the shared CSV or tracker workbook, it should write a single report file here named:

`<agent-slug>-<YYYY-MM-DD-HHMM>-report.md`

Required fields:

- Agent name and lane
- Status: not-started, in-progress, blocked, ready-for-review, complete
- Files changed
- Files read
- Tests run
- Screenshots or local URLs checked
- Decisions needed from Israel
- Scope boundary confirmation
- Signoff with name-choice explanation
