---
title: "Status Maps"
section: glossary
tags: [glossary, status, state-machine]
---

# Status Maps

State machines for every entity. Invalid transitions return `422 Unprocessable Entity`.

---

## User Status {#user-status}

```
                    ┌─────────┐
              ┌────►│ invited │────► expired (72 h, terminal)
              │     └────┬────┘
    invite    │          │ accept
              │          ▼
           ┌──┴───┐   ┌────────┐
           │owner │◄──│ active │
           └──────┘   └───┬────┘
                          │ suspend (admin)
                          ▼
                    ┌───────────┐
                    │ suspended │
                    └─────┬─────┘
                          │ unsuspend (admin)
                          │
                     deactivate (owner) ──► ┌─────────────┐
                                            │ deactivated │ (terminal)
                                            └─────────────┘
```

| From | To | Who | Condition |
|------|----|-----|-----------|
| — | `invited` | admin, owner | Email not already active |
| `invited` | `active` | system | User accepts invitation link |
| `invited` | `expired` | system | 72 h elapsed |
| `active` | `suspended` | admin, owner | Cannot self-suspend |
| `suspended` | `active` | admin, owner | |
| `active` | `deactivated` | owner only | Cannot self-deactivate |
| `suspended` | `deactivated` | owner only | |

---

## Order Status {#order-status}

```
  ┌───────┐  submit   ┌─────────────────┐  webhook  ┌────────────┐
  │ draft │──────────►│ pending_payment  │──────────►│ processing │
  └───┬───┘           └────────┬────────┘           └─────┬──────┘
      │ cancel                 │ cancel                    │ ship
      ▼                        ▼                           ▼
 ┌──────────┐           ┌──────────┐             ┌──────────────┐
 │cancelled │           │cancelled │             │   shipped    │
 └──────────┘           └──────────┘             └──────┬───────┘
                                                        │ deliver
                        ┌──────────┐             ┌──────▼───────┐
                        │ refunded │◄────────────│  delivered   │(terminal)
                        └──────────┘  if captured└──────────────┘
```

| From | To | Who | Condition |
|------|----|-----|-----------|
| `draft` | `pending_payment` | member, admin, owner | ≥ 1 line item |
| `draft` | `cancelled` | admin, owner | No refund |
| `pending_payment` | `processing` | system (webhook) | Payment captured |
| `pending_payment` | `cancelled` | admin, owner | No refund |
| `processing` | `shipped` | admin, owner | |
| `processing` | `cancelled` | admin, owner | Triggers refund |
| `shipped` | `delivered` | admin, owner | |
| `cancelled` | `refunded` | system | If `payment.status === captured` |

---

## Payment Status {#payment-status}

| Status | Meaning |
|--------|---------|
| `pending` | Payment initiated; awaiting provider confirmation |
| `captured` | Funds successfully captured |
| `failed` | Provider declined or network error |
| `partially_refunded` | A partial refund has been issued |
| `refunded` | Full refund issued |

---

## Invitation Status {#invitation-status}

| Status | Meaning |
|--------|---------|
| `pending` | Email sent; user has not clicked the link yet |
| `accepted` | User clicked and completed sign-up |
| `expired` | 72 h elapsed without acceptance |
| `revoked` | Admin manually cancelled the invitation |
