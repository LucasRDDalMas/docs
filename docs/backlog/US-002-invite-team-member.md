---
title: "US-002 — Invite Team Member"
type: user-story
epic: EP-001
status: in-progress
tags: [backlog, user-story, users]
---

# US-002 — Invite Team Member

**As an** admin,
**I want** to invite people to the workspace by email,
**so that** they can access the portal without me managing passwords.

**Epic:** [EP-001 User Management](EP-001-user-management)
**Status:** In Progress | **Points:** 5

---

## Acceptance Criteria

```gherkin
Scenario: Admin invites a new user
  Given I am an admin
  When I enter "new@example.com" with role "member" in the Invite modal
  And I click Send Invitation
  Then POST /api/v1/users/invitations is called
  And the user appears in the table with status "invited"
  And an invitation email is sent to new@example.com

Scenario: Invite link expires after 72 hours
  Given an invitation was sent 73 hours ago
  When the invited user clicks the link
  Then they see "This invitation has expired"
  And an admin can re-send the invitation

Scenario: Already-active user is invited again
  Given "existing@example.com" is already an active user
  When an admin invites "existing@example.com"
  Then the API returns 200 with "alreadyExists": ["existing@example.com"]
  And the UI shows "existing@example.com is already a member"

Scenario: Viewer cannot invite
  Given I have role "viewer"
  When I call POST /api/v1/users/invitations
  Then the API returns 403 Forbidden
  And the Invite button is not shown in the UI
```

## Definition of Done

- [ ] `POST /api/v1/users/invitations` endpoint complete
- [ ] Invitation email template created and tested in staging
- [ ] 72-hour expiry enforced server-side
- [ ] Re-invite flow works (new token, old one invalidated)
- [ ] Already-member guard returns correct response
- [ ] Role guard: only `admin` and `owner` can invite
- [ ] Unit tests: token generation, expiry, already-member case
- [ ] E2E test: invite → receive email → accept → user active

## Tasks

- [x] `POST /api/v1/users/invitations` API route
- [x] Invitation JWT generation (72 h expiry)
- [ ] Email template (transactional email provider TBD)
- [ ] `GET /api/v1/invitations/accept?token=` — accept handler
- [ ] Re-invite: invalidate previous token on new invite
- [ ] UI: Invite modal on `/users`
- [ ] UI: "invited" status badge in user table
- [ ] Tests

## Open Questions

- [ ] Which transactional email provider? (Resend, Postmark, or SES)
- [ ] Should we support bulk CSV import for large teams?
