---
title: "ADR-001: Use Obsidian for Team Documentation"
status: accepted
date: 2026-06-26
tags: [adr, documentation, tooling]
---

# ADR-001: Use Obsidian for Team Documentation

**Status:** Accepted  
**Date:** 2026-06-26  
**Deciders:** Lucas  

## Context

The team needed a documentation system that is:
- Local-first and fast
- Markdown-native (version controllable)
- Able to link between notes and query content

Evaluated: Notion, Confluence, Obsidian, plain Markdown in Git.

## Decision

Use Obsidian as the primary documentation vault, with the vault stored in a shared
Git repository so all changes are version-controlled.

## Consequences

**Positive:**
- Zero vendor lock-in (plain Markdown files)
- Powerful graph view and Dataview queries
- Works offline

**Negative:**
- Requires each team member to install Obsidian
- Real-time collaboration requires Obsidian Sync or a workaround (e.g. Git + pull on open)
- Plugin choices need to be aligned across the team

## Alternatives Considered

| Option | Reason Rejected |
|--------|----------------|
| Notion | Vendor lock-in, proprietary format, slow |
| Confluence | Expensive, heavy, poor Markdown support |
| Plain Markdown in Git | No graph view, no Dataview, harder navigation |
