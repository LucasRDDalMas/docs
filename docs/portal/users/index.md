---
title: "Users List"
route: "/users"
section: portal
apis:
  - GET /api/v1/users
  - POST /api/v1/users/invitations
  - DELETE /api/v1/users/:id
tags: [portal, users]
---

# Users List

**Route:** `/users`
**Auth required:** Yes — role `admin` or `owner`

## Purpose

Paginated, filterable table of all users in the workspace.
Admins can invite new users and deactivate existing ones.

## Filter Bar

| Filter | Type | API param |
|--------|------|-----------|
| Search | text | `q` (matches name, email) |
| Status | select | `status` (active, invited, suspended, deactivated) |
| Role | select | `role` (owner, admin, member, viewer) |
| Joined | date range | `joinedFrom`, `joinedTo` |

## User Table

| Column | Source field | Sortable |
|--------|--------------|---------|
| Name + Avatar | `user.name`, `user.avatarUrl` | Yes |
| Email | `user.email` | Yes |
| Role | `user.role` | Yes |
| Status | `user.status` | Yes |
| Joined | `user.createdAt` | Yes |
| Last active | `user.lastActiveAt` | Yes |

Row actions: **View profile** (→ `/users/:id`), **Change role**, **Suspend**, **Deactivate**.

## APIs Used

### `GET /api/v1/users`

```json
{
  "users": [
    {
      "id": "usr_01J3K",
      "name": "Ana Lima",
      "email": "ana@example.com",
      "role": "admin",
      "status": "active",
      "createdAt": "2025-11-14T09:00:00Z",
      "lastActiveAt": "2026-06-27T08:12:00Z",
      "avatarUrl": "https://avatars.example.com/usr_01J3K"
    }
  ],
  "pagination": { "total": 3410, "page": 1, "limit": 25, "pages": 137 }
}
```

[→ Swagger](https://api.internal/swagger#/users/listUsers)

### `POST /api/v1/users/invitations`

```json
{ "emails": ["new@example.com"], "role": "member" }
```

Response `201`:

```json
{ "invited": ["new@example.com"], "alreadyExists": [] }
```

[→ Swagger](https://api.internal/swagger#/users/inviteUsers)

## Status Definitions

See [User Status Map](../../glossary/status-maps#user-status) for the full state machine.

| Status | Badge colour | Meaning |
|--------|-------------|---------|
| `active` | Green | User has logged in at least once and is not suspended |
| `invited` | Blue | Invitation email sent; user has not accepted yet |
| `suspended` | Orange | Access temporarily blocked by an admin |
| `deactivated` | Grey | Permanently removed from workspace; data retained |
