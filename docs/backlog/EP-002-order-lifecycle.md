---
title: "EP-002 — Order Lifecycle"
type: epic
status: planned
tags: [backlog, epic]
---

# EP-002 — Order Lifecycle

**Goal:** Full order flow from creation through fulfilment or cancellation, with payment integration and team assignment.

**Business value:** Core revenue flow — blocks all commercial use of the platform.

## Acceptance Criteria

- [ ] A member can create an order with one or more line items
- [ ] Orders are assigned to a team member on creation (or auto-assigned round-robin)
- [ ] Payment is captured via payment provider webhook (not the UI)
- [ ] Status transitions follow the defined state machine — invalid transitions return 422
- [ ] Any admin can add internal notes to an order
- [ ] Full timeline of status changes available on order detail page
- [ ] Cancelled orders trigger a refund if payment was already captured

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] State machine unit-tested for every valid and invalid transition
- [ ] Webhook handler tested with provider test events
- [ ] API endpoints documented in Swagger
- [ ] Portal pages documented in [/orders](../portal/orders/index) and [/orders/:id](../portal/orders/detail)
- [ ] Order statuses defined in [Order Status Map](../glossary/status-maps#order-status)

## User Stories

- [US-003 Create Order](US-003-create-order)
- [US-004 Cancel Order](US-004-cancel-order)
