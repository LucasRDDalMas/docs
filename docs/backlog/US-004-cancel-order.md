---
title: "US-004 — Cancel Order"
type: user-story
epic: EP-002
status: planned
tags: [backlog, user-story, orders]
---

# US-004 — Cancel Order

**As an** admin,
**I want** to cancel an order that has not shipped yet,
**so that** the customer is not charged for goods they will not receive.

**Epic:** [EP-002 Order Lifecycle](EP-002-order-lifecycle)
**Status:** Planned | **Points:** 5

---

## Acceptance Criteria

```gherkin
Scenario: Admin cancels a processing order
  Given an order has status "processing"
  When I click Cancel and confirm with a reason
  Then PATCH /api/v1/orders/:id/status { "status": "cancelled", "reason": "..." } is called
  And a refund is triggered if payment.status === "captured"
  And the timeline shows "Cancelled by <admin name>"

Scenario: Cannot cancel a shipped order
  Given an order has status "shipped"
  When I call PATCH /api/v1/orders/:id/status { "status": "cancelled" }
  Then the API returns 422 "Cannot cancel an order that has shipped"
  And the Cancel button is hidden in the UI for shipped orders

Scenario: Viewer cannot cancel
  Given I have role "viewer"
  When I call PATCH /api/v1/orders/:id/status { "status": "cancelled" }
  Then the API returns 403 Forbidden
```

## Definition of Done

- [ ] `cancelled` transition rules added to state machine
- [ ] Refund trigger fires when `payment.status === "captured"`
- [ ] Cancellation reason stored and shown in timeline
- [ ] UI hides Cancel button for `shipped` and `delivered` orders
- [ ] Role guard: only `admin` and `owner` can cancel
- [ ] Unit tests: all valid/invalid transitions involving `cancelled`
- [ ] Unit test: refund trigger condition

## Tasks

- [ ] Add `cancelled` transition rules to state machine
- [ ] Refund trigger service (calls payment provider)
- [ ] `cancellationReason` field on order model
- [ ] UI: Cancel button + confirmation dialog
- [ ] UI: hide Cancel for post-shipment statuses
- [ ] Tests
