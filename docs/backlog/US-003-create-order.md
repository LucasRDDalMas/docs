---
title: "US-003 — Create Order"
type: user-story
epic: EP-002
status: planned
tags: [backlog, user-story, orders]
---

# US-003 — Create Order

**As a** member,
**I want** to create an order with line items and assign it to a team member,
**so that** the order enters the fulfilment pipeline.

**Epic:** [EP-002 Order Lifecycle](EP-002-order-lifecycle)
**Status:** Planned | **Points:** 8

---

## Acceptance Criteria

```gherkin
Scenario: Member creates a valid order
  Given I am a member
  When I submit a new order with at least one line item and a valid customer
  Then POST /api/v1/orders is called
  And the order is created with status "draft"
  And I am redirected to /orders/:id

Scenario: Order requires at least one line item
  When I submit with no line items
  Then I see "At least one line item is required"
  And no API call is made

Scenario: Order is auto-assigned if no assignee selected
  When I submit an order without selecting an assignee
  Then the API assigns the order by round-robin across active members
  And the assignee is shown on /orders/:id

Scenario: Draft order can be submitted for payment
  Given an order has status "draft"
  When I click "Submit for payment"
  Then PATCH /api/v1/orders/:id/status { "status": "pending_payment" } is called
```

## Definition of Done

- [ ] `POST /api/v1/orders` endpoint complete
- [ ] Round-robin assignment logic implemented and unit-tested
- [ ] State machine: `draft → pending_payment` transition validated
- [ ] UI: new order form at `/orders/new`
- [ ] UI: redirect to `/orders/:id` after creation
- [ ] Integration test: order creation → status transition

## Tasks

- [ ] `POST /api/v1/orders` API route
- [ ] Round-robin assignee selection service
- [ ] State machine module (validates every transition)
- [ ] `PATCH /api/v1/orders/:id/status` endpoint
- [ ] UI: new order form
- [ ] Tests
