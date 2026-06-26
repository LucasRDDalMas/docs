---
title: "Engineering"
tags: [area]
---

# Engineering

## Purpose

> Maintaining this area means: the codebase is well-tested, CI is green, tech debt is tracked,
> and the team has shared coding standards.

## Standards

- All new features start with a spec in `01 - Projects/`
- Architecture decisions are recorded in `03 - Resources/ADRs/`
- Incidents are documented within 48 hours

## Key Resources

- [[03 - Resources/Tech Stack]]
- [[03 - Resources/ADRs/ADR-001 - Use Obsidian for Docs]]

## Active Notes

```dataview
LIST
FROM "01 - Projects"
WHERE contains(tags, "engineering")
SORT file.mtime DESC
```
