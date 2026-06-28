# Active Projects

```dataview
TABLE status AS "Status", due AS "Due Date", tags AS "Tags"
FROM "01 - Projects"
WHERE status != "completed" AND status != "archived"
SORT due ASC
```

---

*To add a project, create a note in `01 - Projects/` using the [[Project Template]].*
