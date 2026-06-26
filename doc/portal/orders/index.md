---
title: "Orders List"
route: "/orders"
section: portal
apis:
  - GET /api/v1/orders
tags: [portal, orders]
---

# Orders List

**Route:** `/orders`
**Auth required:** Yes

## Purpose

Full-text searchable, filterable table of all orders. Supports bulk status updates and CSV export.

## Filter Bar

| Filter | Type | API param |
|--------|------|-----------|
| Search | text | `q` (order ID, customer name, email) |
| Status | multi-select | `status[]` |
| Date range | date picker | `createdFrom`, `createdTo` |
| Amount | range | `amountMin`, `amountMax` |
| Assigned to | user picker | `assigneeId` |

## Order Table

| Column | Field | Sortable |
|--------|-------|---------|
| Order ID | `order.id` | No |
| Customer | `order.customer.name` | Yes |
| Amount | `order.amount` | Yes |
| Status | `order.status` | Yes |
| Created | `order.createdAt` | Yes |
| Assignee | `order.assignee.name` | Yes |

## APIs Used

### `GET /api/v1/orders`

```json
{
  "orders": [
    {
      "id": "ord_9KZ2X",
      "customer": { "id": "usr_01J3K", "name": "Ana Lima" },
      "amount": 299.00,
      "currency": "USD",
      "status": "processing",
      "createdAt": "2026-06-27T10:00:00Z",
      "assignee": { "id": "usr_ADM01", "name": "Carlos Melo" }
    }
  ],
  "pagination": { "total": 980, "page": 1, "limit": 25, "pages": 40 }
}
```

[→ Swagger](https://api.internal/swagger#/orders/listOrders)

## Status Definitions

See [Order Status Map](../../glossary/status-maps#order-status) for the full state machine.

| Status | Colour | Meaning |
|--------|--------|---------|
| `draft` | Grey | Created but not submitted |
| `pending_payment` | Yellow | Awaiting payment confirmation |
| `processing` | Blue | Payment confirmed; being fulfilled |
| `shipped` | Indigo | Handed to carrier |
| `delivered` | Green | Delivery confirmed |
| `cancelled` | Red | Cancelled before shipment |
| `refunded` | Orange | Refund issued after payment |
