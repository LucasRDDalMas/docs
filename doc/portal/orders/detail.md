---
title: "Order Detail"
route: "/orders/:id"
section: portal
apis:
  - GET /api/v1/orders/:id
  - PATCH /api/v1/orders/:id/status
  - POST /api/v1/orders/:id/notes
  - GET /api/v1/orders/:id/timeline
tags: [portal, orders]
---

# Order Detail

**Route:** `/orders/:id`
**Auth required:** Yes

## Purpose

Full order view: line items, payment info, shipping info, internal notes, and a
chronological timeline of every status transition.

## Sections

### Order Header

Order ID, customer name (→ `/users/:id`), created date, current status badge, assignee.

### Line Items Table

| Column | Field |
|--------|-------|
| SKU | `item.sku` |
| Description | `item.description` |
| Qty | `item.quantity` |
| Unit price | `item.unitPrice` |
| Total | `item.total` |

Footer: subtotal, tax, shipping, **grand total**.

### Payment Info

| Field | Source |
|-------|--------|
| Method | `order.payment.method` (card, bank_transfer, wallet) |
| Reference | `order.payment.reference` |
| Paid at | `order.payment.paidAt` |
| Status | `order.payment.status` |

### Shipping Info

Carrier, tracking number (external link), estimated delivery date.

### Internal Notes

Admin-only notes (not visible to customer).
`POST /api/v1/orders/:id/notes` `{ "body": "..." }`

### Status Timeline

Every status transition, who triggered it, and when.
See [Order Status Map](../../glossary/status-maps#order-status).

## APIs Used

### `GET /api/v1/orders/:id`

```json
{
  "order": {
    "id": "ord_9KZ2X",
    "customer": { "id": "usr_01J3K", "name": "Ana Lima", "email": "ana@example.com" },
    "status": "processing",
    "items": [
      { "sku": "SKU-001", "description": "Widget Pro", "quantity": 2,
        "unitPrice": 99.50, "total": 199.00 }
    ],
    "subtotal": 199.00,
    "tax": 19.90,
    "shipping": 9.90,
    "total": 228.80,
    "currency": "USD",
    "payment": {
      "method": "card",
      "reference": "pi_3PxQR",
      "paidAt": "2026-06-27T10:05:00Z",
      "status": "captured"
    },
    "shipping_info": {
      "carrier": "FedEx",
      "trackingNumber": "794601234567",
      "estimatedDelivery": "2026-06-30"
    },
    "createdAt": "2026-06-27T10:00:00Z"
  }
}
```

[→ Swagger](https://api.internal/swagger#/orders/getOrder)

### `PATCH /api/v1/orders/:id/status`

```json
{ "status": "shipped", "reason": "Handed to FedEx" }
```

[→ Swagger](https://api.internal/swagger#/orders/updateOrderStatus)
