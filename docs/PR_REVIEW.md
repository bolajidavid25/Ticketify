# Capstone PR Review Record

## Feature

**Reliable FIFO Waitlist Allocation After Ticket Cancellation**

**Repository:** [bolajidavid25/Ticketify](https://github.com/bolajidavid25/Ticketify)  
**Base reviewed:** `main`  
**PR:** Not created yet  
**Review status:** Preliminary source review only — not an approval of a future PR.

## 1. Review objective

Confirm that cancelling a student's active ticket either reallocates the released seat to the oldest eligible waitlisted student or returns the seat to event capacity. The operation must preserve ownership, FIFO fairness, data consistency and notification correctness.

## 2. Files in the initial review scope

- `src/app/(frontend)/ticket-actions.ts`
- `src/app/api/v1/tickets/cancel/route.ts`
- `src/collections/Tickets.ts`
- `src/collections/Waitlist.ts`
- `src/collections/Notifications.ts`
- `src/lib/api-auth.ts`

## 3. Review checklist

### Correctness and business rules

- [ ] Acceptance criteria in `CAPSTONE_SPEC.md` are implemented.
- [ ] Only an active ticket belonging to the authenticated student can be cancelled.
- [ ] Waitlist candidates are processed in FIFO order.
- [ ] Ineligible candidates are skipped and cannot block the queue.
- [ ] No more than one replacement ticket is created per cancellation.
- [ ] `issuedCount` is unchanged after reallocation and decremented only when no eligible waiter receives the seat.
- [ ] Repeated cancellation does not duplicate tickets, count changes or notifications.

### Data integrity and failure handling

- [ ] Every related write uses the same confirmed transaction.
- [ ] Failure to start a transaction prevents the mutation from proceeding.
- [ ] A failure during ticket creation, waitlist update, event update or notification creation rolls back the complete operation.
- [ ] The REST API route reuses the same business logic as the server action.

### Security and privacy

- [ ] Authentication is enforced before cancellation.
- [ ] A student cannot cancel another student's ticket by changing the ticket ID.
- [ ] Student-facing queries and notifications are scoped to the authenticated recipient.
- [ ] Privileged Payload operations occur only after ownership and eligibility checks.
- [ ] No secret, token or private student data is included in source changes, test fixtures, screenshots or logs.

### Dependencies, APIs, tests and maintainability

- [ ] No unnecessary dependency is introduced.
- [ ] Payload APIs are used in accordance with the versions installed in the repository.
- [ ] Tests cover normal, boundary, unauthorised and failure cases.
- [ ] The diff is scoped and readable.
- [ ] Build/type verification and relevant route checks have been recorded.

### Intellectual property and licensing

- [ ] No third-party code, image, icon, dataset or text is copied into the feature without checking its licence or usage permission.
- [ ] Any new dependency has an acceptable licence and is recorded in the package manifest/lockfile.
- [ ] The feature uses the project's existing code and data model; no new external asset or dependency is currently proposed.

## 4. Preliminary findings from the current `main` branch

These are findings from source inspection, not test results.

### Finding F-01 — An ineligible first waiter can block the queue

**Severity:** High functional/fairness concern  
**Location:** `cancelTicketAction()` in `src/app/(frontend)/ticket-actions.ts`

The current implementation fetches only one waiting entry using `limit: 1` and sorts by `joinedAt`. It checks whether that student already has an active ticket. If so, it does not allocate a new ticket, but it also does not change that waitlist entry from `waiting` or continue to another candidate. A later cancellation can encounter the same entry again.

**Required resolution:** Process candidates in FIFO order; mark an ineligible entry `removed`; continue until the first eligible candidate is allocated or the queue is exhausted.

### Finding F-02 — Transaction availability must be enforced

**Severity:** Medium data-integrity concern  
**Location:** Transaction setup in `cancelTicketAction()`.

The current code makes `txReq` conditional on the transaction identifier. If no identifier is returned, subsequent writes can proceed without a shared transaction, while the action still follows its normal success path.

**Required resolution:** Confirm a transaction identifier before performing the multi-step mutation. If one cannot be started, fail safely before changing records. Verify that every participating Payload operation receives the same transaction request.

### Finding F-03 — Automated test evidence is missing from the repository

**Severity:** Verification gap  
**Evidence:** No test files or test script were found in the reviewed `main` tree/package manifest.

**Required resolution:** Add tests for the acceptance criteria, including the ineligible-first-waiter case and rollback after a forced mid-operation failure. Add the appropriate test command to the project's scripts once the test tooling is selected.

## 5. Security, privacy and IP decisions

- **Authentication/authorization:** Retain the existing student authentication resolution. Verify ownership of the ticket before any privileged write. Do not trust a client-provided student ID or waitlist recipient.
- **Student privacy:** Do not expose another student's ticket or notification. Use only the recipient identity determined by the server.
- **Data integrity:** Keep ticket, waitlist, event count and notification mutations inside the same confirmed transaction.
- **Secrets:** No new secrets are required for this feature. Do not add real tokens or credentials to source control or test fixtures.
- **Dependencies:** No new dependency is proposed. Prefer the existing Payload APIs and project tooling.
- **Intellectual property:** No new third-party image, font, dataset or copied source is required for this backend feature. Any future dependency or asset must be licence-checked before inclusion.

## 6. Required review evidence before approval

Attach these to the eventual PR:

- Link to the feature specification and PR diff.
- Test output for all relevant acceptance criteria.
- Build/type-check output from the supported environment.
- Manual or route-level verification of cancellation with an eligible waiter, an ineligible first waiter, and an empty queue.
- Evidence that a forced failure rolls back the related writes.
- A short AI-use declaration and links to actual reject-log entries.
- Known limitations, including any concurrency behaviour not covered by the implementation.

## 7. Review decision

**Current decision:** Changes requested before the feature can be considered complete.

This is a preliminary review of the existing implementation. F-01, F-02 and F-03 must be addressed and verified. A final review must be performed against the actual feature branch/PR diff after implementation; this document does not claim that the feature has passed tests or been approved.

**PR link:** To be added after the feature branch and PR exist.  
**Reviewer/date:** To be completed during the final PR review.
