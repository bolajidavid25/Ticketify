# REJECT LOG

This document tracks all proposed architectural, backend, and technical implementation decisions, explicitly recording accepted vs rejected proposals, reasoning, potential consequences, and chosen alternatives in accordance with the project's Master Engineering Instructions.

---

### Record 001: Mock Data Fallback in Production Flows
* **Date:** 2026-11-26
* **Proposed Implementation:** Retain `STARTER_EVENTS` fallback in `src/app/(frontend)/page.tsx`, `src/lib/payload.ts` (`findBySlug`), and `src/app/(frontend)/ticket-actions.ts` when database event count is low.
* **Decision:** **REJECTED**
* **Reason:** PostgreSQL is the single source of truth. Relying on hardcoded static array fallbacks causes split-brain state, prevents admin management from reflecting on the homepage, and introduces fragile special-case logic (`seed-*` ID branching).
* **Potential Consequences:** Discrepancies between database inventory and client view; race conditions when booking tickets against non-existent database IDs.
* **Alternative Approach Selected:** Seed the starter events permanently into the PostgreSQL `events` table via Payload Local API, ensuring 100% database-backed reads and mutations with no mock fallbacks in runtime code paths.

---

### Record 002: Direct Raw SQL for Business Logic vs Payload Local API
* **Date:** 2026-11-26
* **Proposed Implementation:** Bypass Payload Local API and execute raw SQL queries via Drizzle directly in route handlers and server actions for booking, capacity updates, and waitlist allocations.
* **Decision:** **REJECTED**
* **Reason:** Payload collections encapsulate field validations, hooks (such as the strict 1-ticket-per-student invariant hook in `Tickets.ts`), relationship resolution, access control, and auto-generated types.
* **Potential Consequences:** Bypassing collection hooks opens security loopholes (e.g. bypassing the 1-ticket-per-person rule), breaks Payload's internal cache and lifecycle hooks, and duplicates schema logic.
* **Alternative Approach Selected:** Utilize `payload.create`, `payload.find`, `payload.update`, and `payload.findByID` with explicit `overrideAccess` and `user` parameters, guaranteeing all collection hooks and constraints are executed.

---

### Record 003: Unified Auth Collection for Students and CMS Administrators
* **Date:** 2026-11-26
* **Proposed Implementation:** Merge the `admins` collection and `users` collection into a single collection with a `role` field.
* **Decision:** **REJECTED**
* **Reason:** Strict architectural separation of concerns. CMS administrators use Payload Admin authentication (`admins` collection) to manage content, while campus students use the `users` collection (`studentId`, university email, password) authenticated via custom session cookies (`src/lib/app-auth.ts`).
* **Potential Consequences:** Risk of privilege escalation where students could access `/admin` or administrative mutations.
* **Alternative Approach Selected:** Retain separate `admins` and `users` collections as strictly mandated in the project specification.

---

### Record 004: Emitting Notifications Before Mutation Persistence
* **Date:** 2026-11-26
* **Proposed Implementation:** Emit notification records concurrently with ticket creation or in background without awaiting database write confirmation.
* **Decision:** **REJECTED**
* **Reason:** Spurious or orphaned notifications will be delivered to students if the primary ticket booking or cancellation fails due to validation, capacity, or concurrency errors.
* **Alternative Approach Selected:** Strict sequencing and failure isolation: Notification creation runs strictly after ticket creation, capacity update, and waitlist status transitions succeed in PostgreSQL. Any failure in the primary operation aborts before emitting a notification.

---

### Record 005: Optimistic or Client-Determined FIFO Reallocation
* **Date:** 2026-11-26
* **Proposed Implementation:** Allow the client or client-provided parameters to determine which waitlist student receives an opened ticket on cancellation.
* **Decision:** **REJECTED**
* **Reason:** Security and fairness breach. FIFO waitlist allocation must be strictly deterministic and calculated exclusively on the server based on indexed `joinedAt` timestamps.
* **Alternative Approach Selected:** The server directly queries `waitlist` sorted by `joinedAt` ascending, verifies the recipient does not already hold an active ticket, creates the ticket, transitions the waitlist entry to `allocated`, and notifies the allocated student.

---

### Record 006: Storing Unnecessary Google Access and Refresh Tokens
* **Date:** 2026-11-26
* **Proposed Implementation:** Store raw Google OAuth access tokens and refresh tokens in the `users` collection.
* **Decision:** **REJECTED**
* **Reason:** Security and privacy best practices. The ticketing platform only requires identity verification (`openid`, `email`, `profile`). Storing long-lived Google OAuth access and refresh tokens expands the attack surface without functional necessity.
* **Alternative Approach Selected:** Validate identity via Google OpenID Connect ID token, store only the permanent identifier `googleId`, name, email, and avatar, and discard access tokens immediately.

---

### Record 007: Automatic Account Linking on Unverified Google Emails
* **Date:** 2026-11-26
* **Proposed Implementation:** Link an existing local student account whenever the email matches, regardless of Google's `email_verified` claim.
* **Decision:** **REJECTED**
* **Reason:** Critical account takeover vulnerability. An attacker could register an unverified Google account using a victim's university email address and take over their existing student account.
* **Alternative Approach Selected:** Strictly verify `email_verified === true` from Google's OpenID Connect token before permitting account linking. Reject linking if `email_verified` is false.

---

### Record 008: Blocking Initial OAuth Registration for Student ID Entry
* **Date:** 2026-11-26
* **Proposed Implementation:** Force an intermediate multi-step modal during the OAuth callback redirecting users back and forth before creating their account session.
* **Decision:** **REJECTED**
* **Reason:** High friction and failure rate on mobile devices and preview environments.
* **Alternative Approach Selected (Option C):** Permit initial Google registration and establish the student session, but strictly require and validate a unique Student ID before allowing ticket booking or waitlist entry (`bookTicketAction` and `joinWaitlistAction`), with a clean Student ID entry form on the profile/account page.

---

### Record 009: Separate REST API Database Access Layer vs Reusing Core Services
* **Date:** 2026-11-26
* **Proposed Implementation:** Write duplicate Drizzle or REST SQL queries directly inside `/api/v1/...` route handlers.
* **Decision:** **REJECTED**
* **Reason:** Violates Master Engineering Rule 5: "Avoid duplicate business logic. Reuse established server actions and services." Duplicating ticket booking or waitlist logic across Server Actions and REST API routes would result in code drift, inconsistent validations, and bypassed invariants.
* **Alternative Approach Selected:** API route handlers reuse the proven, transactionally consistent services (`bookTicketAction`, `cancelTicketAction`, `joinWaitlistAction`) parameterized with the resolved authenticated student, guaranteeing unified invariants across both web and API clients.

---

### Record 010: Cookie-Only Authentication for REST API Endpoints
* **Date:** 2026-11-26
* **Proposed Implementation:** Restrict `/api/v1` REST endpoints to browser cookie authentication only (`app-session`).
* **Decision:** **REJECTED**
* **Reason:** Standard REST clients, mobile apps, external integrations, and programmatic test scripts require standard `Authorization: JWT <token>` or `Authorization: Bearer <token>` header support.
* **Alternative Approach Selected:** Dual authentication resolution in `src/lib/api-auth.ts`: Resolves authentication from either `Authorization: JWT/Bearer <token>` headers or HTTP-only `app-session` cookies, providing full flexibility for both web browser sessions and API consumers.

---

### Record 011: Non-Transactional Multi-Step Ticketing & Notification Writes
* **Date:** 2026-11-27
* **Proposed Implementation:** Execute ticket creation/cancellation, event `issuedCount` updates, waitlist allocation, and notification creation as independent auto-committed Payload Local API calls in `src/app/(frontend)/ticket-actions.ts`.
* **Decision:** **REJECTED**
* **Reason:** If a downstream mutation (such as `events.issuedCount` update, `waitlist` status transition, or FIFO ticket creation) fails, earlier writes—including `ticket_cancelled` notifications—would remain committed in PostgreSQL, leaving capacity counts, tickets, and notifications out of sync.
* **Potential Consequences:** Orphaned notifications for failed cancellations, inconsistent `issuedCount` values, or partial waitlist allocations.
* **Alternative Approach Selected:** Wrap `bookTicketAction` and `cancelTicketAction` mutations in `payload.db.beginTransaction()` / `commitTransaction()` / `rollbackTransaction()` passing `req: { transactionID }` to all Payload operations, and defer notification creation until after all ticketing, capacity, and waitlist mutations succeed.


