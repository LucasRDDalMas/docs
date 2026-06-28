---
title: "Dashboard"
route: "/dashboard"
section: portal
apis:
  - GET /api/v1/stats
  - GET /api/v1/orders/summary
  - GET /api/v1/users/summary
tags: [portal, dashboard]
---

# Dashboard

**Route:** `/dashboard`
**Auth required:** Yes

## Purpose

Main analytics overview shown to all authenticated users after login.
Displays KPIs for the last 30 days, a live activity feed, and quick-action shortcuts.

## Sections

### KPI Cards

Four top-level metrics refreshed every 60 seconds via polling.

| Card | Data source | API field |
|------|-------------|-----------|
| Total Revenue | `GET /api/v1/stats` | `stats.revenue.total` |
| Active Users | `GET /api/v1/users/summary` | `summary.active` |
| Orders Today | `GET /api/v1/orders/summary` | `summary.today` |
| Avg Order Value | `GET /api/v1/stats` | `stats.orders.avgValue` |

### Activity Feed

Paginated list of recent events (order placed, user invited, settings changed).

- **API:** `GET /api/v1/activity?limit=20&cursor=<cursor>`
- **Polling interval:** 30 s
- **Max items shown:** 50 (oldest dropped from DOM)

### Quick Actions

| Button | Action |
|--------|--------|
| New Order | Navigate to `/orders/new` |
| Invite User | Opens invite modal → `POST /api/v1/users/invitations` |
| Export Report | `POST /api/v1/reports` → download CSV |

## APIs Used

### `GET /api/v1/stats`

Returns aggregated revenue and order metrics.

```json
{
  "stats": {
    "revenue": { "total": 142300.00, "currency": "USD" },
    "orders": { "total": 980, "avgValue": 145.20 }
  },
  "period": { "from": "2026-06-01", "to": "2026-06-27" }
}
```

[→ Swagger](https://api.internal/swagger#/stats/getStats)

### `GET /api/v1/orders/summary`

```json
{ "summary": { "today": 23, "week": 141, "pending": 7, "failed": 2 } }
```

[→ Swagger](https://api.internal/swagger#/orders/getOrdersSummary)

### `GET /api/v1/users/summary`

```json
{ "summary": { "total": 3410, "active": 2891, "invited": 45 } }
```

[→ Swagger](https://api.internal/swagger#/users/getUsersSummary)

## Status Definitions

| Status badge | Meaning |
|--------------|---------|
| `live` | Data loaded from API successfully |
| `stale` | Last successful fetch > 5 min ago; showing cached data |
| `error` | API unreachable; error state shown in card |

## Edge Cases

- If all three KPI APIs fail, the dashboard shows a full-page error with a retry button.
- If only one card fails, it shows an individual error state; the others remain live.
- Users with role `viewer` see revenue figures redacted.
