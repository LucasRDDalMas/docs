---
title: "Terms A–Z"
section: glossary
tags: [glossary, terms]
---

# Terms A–Z

Canonical definitions for the domain vocabulary used across the portal, backlog, and APIs.

---

## A

**Active (user status)**
A user who has accepted their invitation and whose access has not been suspended or deactivated. See [User Status Map](status-maps#user-status).

**Assignee**
The team member responsible for fulfilling an order. Set at order creation; can be reassigned by any admin. Chosen by round-robin auto-assignment if not specified.

---

## D

**Definition of Done (DoD)**
A shared checklist used in the backlog to determine when a user story is complete. Includes: acceptance criteria passing, tests written, API documented, UI documented.

**Deactivated (user status)**
Permanent removal of a user from the workspace. Access is revoked immediately; data is retained for audit. Only the workspace owner can deactivate.

**Draft (order status)**
The initial state of an order after creation. No payment has been requested. A draft can be edited or submitted for payment.

---

## E

**Epic**
A large body of work decomposed into user stories. Maps to a single product goal. See [Backlog](../backlog/_index).

---

## I

**Invitation**
A time-limited (72 h) signed token sent to a user's email granting access to the workspace. Created via `POST /api/v1/users/invitations`.

---

## L

**Line Item**
A single product within an order. Has a SKU, description, quantity, unit price, and total. An order must have at least one line item.

---

## M

**Member (role)**
Default role for new users. Can create orders and view users. Cannot invite users or change other users' roles.

---

## O

**Order**
A commercial transaction with one or more line items, a customer, an assignee, and a payment. Follows a defined state machine. See [Order Status Map](status-maps#order-status).

**Owner (role)**
Highest privilege role. One owner per workspace. Can do everything admins can, plus transfer ownership and delete the workspace.

---

## P

**Payment**
Financial record attached to an order. Managed by the payment provider via webhook. See [Payment Status Map](status-maps#payment-status).

---

## R

**Round-Robin Assignment**
Auto-assignment strategy that distributes new orders evenly across all active members in alphabetical order of user ID. Resets after all members have been assigned once.

---

## S

**Slug**
URL-safe workspace identifier (e.g. `acme-corp`). Appears in API paths and portal subdomain. Changeable by owner only.

**Suspended (user status)**
Temporary access block. The user cannot log in; role and data are preserved. Can be reversed by any admin.

---

## U

**User Story**
A backlog item expressed as: "As a [role] I want [feature] so that [benefit]". Includes Given/When/Then acceptance criteria, a Definition of Done, and a task list.

---

## V

**Viewer (role)**
Read-only access. Can view orders, users, and dashboard. Cannot create, edit, or delete. Cannot be assigned as an order assignee.

---

## W

**Workspace**
Top-level organisational unit. All users, orders, and settings belong to a workspace. Maps to a unique slug; has one owner and multiple admins/members.
