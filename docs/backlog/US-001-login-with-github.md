---
title: "US-001 — Login with GitHub OAuth"
type: user-story
epic: EP-001
status: done
tags: [backlog, user-story, auth]
---

# US-001 — Login with GitHub OAuth

**As a** team member,
**I want** to log in with my GitHub account,
**so that** I don't need to manage a separate password.

**Epic:** [EP-001 User Management](EP-001-user-management)
**Status:** Done | **Points:** 3

---

## Acceptance Criteria

```gherkin
Scenario: Successful login
  Given I am not logged in
  When I visit /login and click "Continue with GitHub"
  Then I am redirected to GitHub OAuth
  When I authorise the app
  Then I am redirected to /dashboard with a session cookie set

Scenario: First-time login creates a user record
  Given my GitHub email is not yet in the workspace
  When I complete OAuth for the first time
  Then a user record is created with status "active" and role "member"

Scenario: Suspended user cannot log in
  Given my user status is "suspended"
  When I complete GitHub OAuth
  Then I am redirected to /login?error=suspended
  And I see "Your account has been suspended. Contact your workspace owner."

Scenario: Session expiry redirects with return path
  Given my session cookie has expired
  When I make any authenticated request
  Then I am redirected to /login?return=<original-path>
  And after login I land on the original path
```

## Definition of Done

- [x] GitHub OAuth App created; credentials in `.env`
- [x] `/api/auth/login` redirects to GitHub with scopes `read:user`, `user:email`
- [x] `/api/auth/callback` exchanges code, upserts user, sets HttpOnly cookie
- [x] Suspended user check blocks login with correct error response
- [x] Session expiry redirects with `?return=` param preserved
- [x] Unit tests: session creation, suspended-user guard
- [x] Integration test: full OAuth callback flow (GitHub mocked)

## Tasks

- [x] Create GitHub OAuth App in org settings
- [x] `GET /api/auth/login` — redirect to GitHub
- [x] `GET /api/auth/callback` — exchange code, upsert user, set cookie
- [x] Suspended user guard middleware
- [x] Return-URL logic on session expiry
- [x] Tests

## Linked PRs

- `feat/us-001-github-oauth` — merged 2026-06-20
