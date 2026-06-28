---
title: "Tech Stack"
tags: [resource, engineering, reference]
---

# Tech Stack

> Living document — update when the stack changes.

## Frontend

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | React 19 | |
| Language | TypeScript 5.x | Strict mode on |
| Styling | CSS Modules + custom properties | No Tailwind by default |
| Build | Vite | |
| Testing | Vitest + Playwright | |

## Backend

| Layer | Choice | Notes |
|-------|--------|-------|
| Runtime | Node.js 22 (LTS) | |
| Language | TypeScript | |
| Framework | Fastify | |
| ORM | Drizzle | |
| Database | PostgreSQL 16 | |

## Infrastructure

| Concern | Choice |
|---------|--------|
| Hosting | — |
| CI | GitHub Actions |
| Containers | Docker + Compose |

## ADRs

```dataview
LIST FROM "03 - Resources/ADRs"
SORT file.name ASC
```
