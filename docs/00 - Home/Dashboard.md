# Dashboard

> Central hub for everything in this vault.

## Quick Links

- [[Active Projects]] — what's in flight right now
- [[Areas of Responsibility]] — ongoing domains to maintain
- [[06 - Daily Notes/2026-06-26]] — today's note

## Recently Modified

```dataview
TABLE file.mtime AS "Modified"
FROM ""
SORT file.mtime DESC
LIMIT 10
```

## Open Tasks

```dataview
TASK
WHERE !completed
SORT file.mtime DESC
LIMIT 20
```

---

## Navigation

| Section | Purpose |
|---------|---------|
| `01 - Projects/` | Time-bound work with clear outcomes |
| `02 - Areas/` | Ongoing responsibilities |
| `03 - Resources/` | Reference material and notes |
| `04 - Archive/` | Completed or inactive items |
| `05 - Templates/` | Note templates |
| `06 - Daily Notes/` | Daily journals |
