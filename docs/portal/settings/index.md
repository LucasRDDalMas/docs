---
title: "Settings"
route: "/settings"
section: portal
apis:
  - GET /api/v1/workspace
  - PATCH /api/v1/workspace
  - GET /api/v1/workspace/api-keys
  - POST /api/v1/workspace/api-keys
  - DELETE /api/v1/workspace/api-keys/:id
tags: [portal, settings]
---

# Settings

**Route:** `/settings`
**Auth required:** Yes — `owner` for destructive actions; `admin` for most changes

## Tabs

### General

| Field | API field | Editable by |
|-------|-----------|-------------|
| Workspace name | `workspace.name` | admin, owner |
| Slug | `workspace.slug` | owner only |
| Logo | `workspace.logoUrl` | admin, owner |
| Timezone | `workspace.timezone` | admin, owner |

`PATCH /api/v1/workspace` with changed fields.

### API Keys

Table of active API keys (name, prefix, created, last used, scopes).

- **Create:** `POST /api/v1/workspace/api-keys` `{ "name": "CI Key", "scopes": ["orders:read"] }`
- **Revoke:** `DELETE /api/v1/workspace/api-keys/:id`
- Full key shown only at creation — cannot be retrieved again.

### Danger Zone

| Action | Who |
|--------|-----|
| Delete workspace | owner only |

## APIs Used

### `GET /api/v1/workspace`

```json
{
  "workspace": {
    "id": "ws_X9KLM",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "logoUrl": "https://cdn.example.com/acme.png",
    "timezone": "America/Sao_Paulo",
    "createdAt": "2025-01-10T00:00:00Z"
  }
}
```

[→ Swagger](https://api.internal/swagger#/workspace/getWorkspace)
