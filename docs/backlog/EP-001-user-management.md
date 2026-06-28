---
title: "EP-001 — User Management"
type: epic
status: in-progress
tags: [backlog, epic]
---

# EP-001 — User Management

**Goal:** Allow workspace owners to invite, manage roles, suspend and deactivate users.

**Business value:** Enables self-serve team onboarding without engineering involvement.

## Acceptance Criteria

- [ ] A workspace owner can invite users by email with a specified role
- [ ] Invited users receive an email with a sign-up link valid for 72 hours
- [ ] Admins can change the role of any user except the owner
- [ ] Admins can suspend and unsuspend users
- [ ] Only the owner can deactivate a user (data retained, access revoked)
- [ ] All role and status changes are recorded in the user activity log
- [ ] Users list supports filtering by status and role with < 200 ms response

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Unit tests cover edge cases (expired invite, self-demotion guard)
- [ ] Integration tests cover invite → accept → login flow
- [ ] API endpoints documented in Swagger
- [ ] Portal pages documented in [/users](../portal/users/index) and [/users/:id](../portal/users/detail)
- [ ] Statuses defined in [Status Maps](../glossary/status-maps)

## User Stories

- [US-001 Login with GitHub OAuth](US-001-login-with-github)
- [US-002 Invite Team Member](US-002-invite-team-member)

## Technical Notes

- Role hierarchy: `owner > admin > member > viewer`
- An owner cannot demote themselves (guard in API + UI)
- Invitation tokens are signed JWTs with 72 h expiry
