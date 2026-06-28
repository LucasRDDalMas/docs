---
title: "User Detail"
route: "/users/:id"
section: portal
apis:
  - GET /api/v1/users/:id
  - PATCH /api/v1/users/:id
  - GET /api/v1/users/:id/activity
tags: [portal, users]
---

# User Detail

**Route:** `/users/:id`
**Auth required:** Yes — role `admin` or `owner`, or viewing own profile

## Purpose

Full user profile with role management, status history, and activity log.

## Sections

### Profile Header

Avatar, name, email, role badge, status badge, join date.
Edit button (admin only) opens inline role/status editor.

### Activity Log

Paginated timeline of actions performed by this user.

- **API:** `GET /api/v1/users/:id/activity?limit=25&cursor=<cursor>`
- Entry types: login, order_created, settings_changed, invitation_sent

### Danger Zone

Visible to `owner` role only.

| Action | API call | Confirmation |
|--------|----------|--------------|
| Suspend user | `PATCH /api/v1/users/:id` `{ "status": "suspended" }` | Yes |
| Deactivate user | `PATCH /api/v1/users/:id` `{ "status": "deactivated" }` | Type username |
| Transfer ownership | `POST /api/v1/users/:id/transfer-ownership` | Type username |

## APIs Used

### `GET /api/v1/users/:id`

```json
{
  "user": {
    "id": "usr_01J3K",
    "name": "Ana Lima",
    "email": "ana@example.com",
    "role": "admin",
    "status": "active",
    "createdAt": "2025-11-14T09:00:00Z",
    "lastActiveAt": "2026-06-27T08:12:00Z",
    "avatarUrl": "https://avatars.example.com/usr_01J3K"
  }
}
```

[→ Swagger](https://api.internal/swagger#/users/getUser)

### `PATCH /api/v1/users/:id`

```json
{ "role": "member", "status": "suspended" }
```

[→ Swagger](https://api.internal/swagger#/users/updateUser)
