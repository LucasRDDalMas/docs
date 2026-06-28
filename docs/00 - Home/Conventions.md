---
title: "Vault Conventions"
tags: [meta, documentation]
---

# Vault Conventions

> Read this before creating your first note.

## Folder System (PARA)

| Folder | What goes here | When to create |
|--------|----------------|----------------|
| `01 - Projects/` | Time-boxed work with a clear outcome | When work starts |
| `02 - Areas/` | Ongoing responsibilities | When you identify a domain you own |
| `03 - Resources/` | Reference material, articles, ADRs | When you want to remember something |
| `04 - Archive/` | Inactive notes | When a project ends or area is handed off |
| `05 - Templates/` | Note templates | When a note type repeats |
| `06 - Daily Notes/` | Daily journals | Automatically via Periodic Notes plugin |

**Rule:** When unsure where a note belongs, ask "would I use this for a specific outcome (project)
or as general reference (resource)?"

## Naming

- **Notes:** `Title Case` — e.g. `API Design Decisions`
- **Projects:** `Short Name - Description` — e.g. `Example - Docs POC`
- **ADRs:** `ADR-NNN - Title` — e.g. `ADR-001 - Use Obsidian for Docs`
- **Daily notes:** `YYYY-MM-DD` — e.g. `2026-06-26`
- No underscores, no camelCase in note names

## Frontmatter Fields

Every note should include at minimum:

```yaml
---
title: "Note Title"
tags: [tag1, tag2]
---
```

Project notes additionally include:

```yaml
---
status: active | on-hold | completed | archived
created: YYYY-MM-DD
due: YYYY-MM-DD
---
```

## Tags

Use tags for cross-cutting concerns, not for primary organisation (that's what folders are for).

| Tag | Meaning |
|-----|---------|
| `#project` | Project notes |
| `#area` | Area notes |
| `#resource` | Resource/reference notes |
| `#adr` | Architecture decision records |
| `#meeting` | Meeting notes |
| `#daily` | Daily notes |
| `#engineering` | Engineering-related |
| `#documentation` | Documentation work |

## Linking

- Link generously — `[[Note Name]]` is free
- Link on first mention within a note, not every mention
- Prefer linking to the note title (not a heading) unless the section is the real target
- Backlinks panel in Obsidian will show you what references a note

## Templates

Use templates from `05 - Templates/` for new notes:

- New project → [[Project Template]]
- Meeting notes → [[Meeting Note Template]]
- Daily note → [[Daily Note Template]] (auto via Periodic Notes)
- New area → [[Area Template]]
- Reference material → [[Resource Template]]

## Archive Policy

Move notes to `04 - Archive/` when:
- A project is completed or cancelled
- An area is no longer your responsibility
- A resource is outdated

Do not delete — archive. Searching archived notes is often useful.
