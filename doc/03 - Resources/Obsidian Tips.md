---
title: "Obsidian Tips"
tags: [resource, obsidian, tooling]
---

# Obsidian Tips

## Essential Shortcuts

| Action | Mac | Windows |
|--------|-----|---------|
| Open command palette | `Cmd+P` | `Ctrl+P` |
| Quick switcher | `Cmd+O` | `Ctrl+O` |
| Search vault | `Cmd+Shift+F` | `Ctrl+Shift+F` |
| Toggle left sidebar | `Cmd+[` | `Ctrl+[` |
| New note | `Cmd+N` | `Ctrl+N` |
| Back-link pane | `Cmd+Shift+B` | `Ctrl+Shift+B` |
| Graph view | `Cmd+Shift+G` | `Ctrl+Shift+G` |

## Linking Best Practices

- Use `[[Note Name]]` for internal links
- Use `[[Note Name|Display Text]]` when you want custom label
- Use `[[Note Name#Heading]]` to link to a specific section
- Tags go in frontmatter (`tags: [topic]`) or inline (`#topic`)

## Dataview Cheat Sheet

```dataview
# List all notes with a tag
LIST FROM #project

# Table with fields from frontmatter
TABLE status, due FROM "01 - Projects" SORT due ASC

# Incomplete tasks across the vault
TASK WHERE !completed

# Notes modified in the last 7 days
LIST WHERE file.mtime >= date(today) - dur(7 days)
```

## Recommended Plugins

| Plugin | Purpose |
|--------|---------|
| Dataview | Query your vault like a database |
| Templater | Powerful templating with JS expressions |
| Calendar | Visual daily note navigation |
| Periodic Notes | Daily/weekly/monthly note automation |
| Kanban | Board view for project tasks |

## Folder Convention

Follow PARA. Prefix folders with numbers so they sort in the right order:

```
00 - Home
01 - Projects
02 - Areas
03 - Resources
04 - Archive
05 - Templates
06 - Daily Notes
```
