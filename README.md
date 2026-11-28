[Ticketify_README.md](https://github.com/user-attachments/files/35537615/Ticketify_README.md)
# Ticketify

**Ticketify** is a student-focused event discovery and ticketing platform. It is designed to make campus event access more organised and fair by combining event discovery, student accounts, ticket allocation, waitlists, and in-app notifications.

The event experience is branded **Ticket Drop** in parts of the application.

> **Project status:** This README describes the current repository structure and implemented code paths. It is not a claim that every workflow has passed end-to-end or production verification. See the verification notes before treating a feature as release-ready.

## Table of contents

- [What Ticketify does](#what-ticketify-does)
- [Core workflows](#core-workflows)
- [Engineering principles](#engineering-principles)
- [Technology stack](#technology-stack)
- [Architecture and repository structure](#architecture-and-repository-structure)
- [Authentication and access control](#authentication-and-access-control)
- [API overview](#api-overview)
- [Getting started](#getting-started)
- [Environment and secrets](#environment-and-secrets)
- [Quality checks](#quality-checks)
- [AI-assisted engineering practices](#ai-assisted-engineering-practices)
- [Team contribution and pull-request expectations](#team-contribution-and-pull-request-expectations)
- [Project documentation](#project-documentation)

## What Ticketify does

Ticketify brings the main parts of a student event-ticketing workflow into one application:

- Students can discover published events and view event details.
- Students can create accounts and sign in using the authentication options provided by the application.
- A student must provide a valid Student ID before booking a ticket or joining a waitlist.
- The application enforces a one-active-ticket-per-student-per-event rule.
- When an event reaches capacity, eligible students can join its waitlist.
- When a ticket is cancelled, the application can allocate the released seat to the next eligible student in waitlist order.
- Students can view notifications associated with their own accounts.
- Administrators manage event records separately from student accounts through the Payload administration layer.

The application uses event capacity and issued-ticket information to communicate availability. Booking, cancellation, waitlist allocation, and notification operations are handled on the server rather than trusted to client-supplied values.

## Core workflows

### 1. Event discovery

Published events are retrieved from the Payload `events` collection. Event records include information such as title, description, date, venue, category, capacity, price, status, and associated media.

### 2. Student identity and accounts

Student accounts are stored in the `users` collection. The application supports local authentication and Google identity integration. A Google account is linked to an existing student account only when the Google identity reports a verified email address.

A newly registered student may complete account registration before supplying a Student ID, but the booking and waitlist actions require the Student ID to be present.

### 3. Ticket booking

The server checks that:

1. The student is authenticated.
2. The student has supplied a Student ID.
3. The requested event exists and is published.
4. The student does not already hold an active ticket for that event.
5. Capacity is available.

The booking workflow creates the ticket, updates the event's issued count, updates an applicable waitlist entry, and creates the related notification. These mutations are intended to be handled as one transaction where the database adapter supports it.

### 4. Waitlist and cancellation

Students can join a waitlist when an event has no remaining seats. Waitlist entries are ordered by `joinedAt`.

When a ticket is cancelled, the server checks the waitlist and attempts to allocate the released seat to the next eligible student. If no eligible waiter receives the seat, the event's issued count is reduced to return the seat to available capacity.

### 5. Notifications

The `notifications` collection stores notification records for their intended recipients. Student access is scoped to the authenticated student's own records. Ticketing notifications are created as part of the server-side ticketing workflow.

## Engineering principles

Ticketify follows these principles when changing application behaviour:

- **Database as the source of truth:** durable event, ticket, waitlist, user, and notification data belongs in Payload/PostgreSQL, not in production-only mock arrays.
- **Server-side enforcement:** important rules such as capacity, ownership, Student ID eligibility, and one-ticket limits must be checked on the server.
- **Use the established data layer:** use Payload Local API operations and collection hooks for domain mutations rather than duplicating business rules in raw SQL or separate API handlers.
- **Separate identity boundaries:** student accounts and CMS administrator accounts remain separate.
- **Atomic multi-step operations:** related ticket, capacity, waitlist, and notification changes should not leave partially updated records when a transaction can protect them.
- **Least privilege:** users should only read or modify records they are permitted to access.
- **Evidence before claims:** a build, test, or deployment is only described as successful when its command output or other verification evidence has been checked.

The repository's root [`AGENTS.md`](./AGENTS.md) contains the detailed instructions for AI coding agents and developers. The [`docs/REJECT_LOG.md`](./docs/REJECT_LOG.md) records important proposals that were declined or changed and explains the reasoning.

## Technology stack

The current `package.json` identifies the following principal technologies:

| Area | Technology |
|---|---|
| Application framework | Next.js 16 |
| UI library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| CMS and application data layer | Payload CMS 4 |
| Database adapter | Payload PostgreSQL adapter |
| Database | PostgreSQL |
| Package manager | pnpm |
| Formatting | oxfmt |

Versions are controlled by the repository's package manifest, lockfile, and toolchain configuration. Check those files before changing dependencies or runtime versions.

## Architecture and repository structure

The project uses the Next.js App Router and separates the student-facing application from the Payload administration and API routes.

```text
Ticketify/
├── docs/
│   └── REJECT_LOG.md
├── src/
│   ├── app/
│   │   ├── (frontend)/       # Student-facing pages and actions
│   │   ├── (payload)/        # Payload Admin and Payload API routes
│   │   └── api/              # Application API routes
│   ├── collections/          # Payload collections and access rules
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Authentication, Payload and shared services
│   ├── payload.config.ts
│   └── payload-types.ts      # Generated Payload types
├── AGENTS.md                 # Agent and engineering instructions
├── package.json
├── pnpm-lock.yaml
└── .env.example
```

Important collections currently include:

- `events` — event details, publication status, capacity, issued count, category, and media.
- `users` — student accounts and student identity fields.
- `admins` — separate Payload administration accounts.
- `tickets` — ticket code, student, event, and ticket status.
- `waitlist` — student/event queue entries and allocation status.
- `notifications` — recipient-specific notification records.
- `media` — uploaded media used by the application.

Do not manually edit generated Payload types or files owned by the Payload administration layer. Follow the instructions in `AGENTS.md`.

## Authentication and access control

Ticketify distinguishes between three concerns:

1. **Student application authentication:** controls access to student-facing account and ticketing features.
2. **Payload administrator authentication:** controls access to CMS and administrative management.
3. **Record-level access control:** determines which authenticated identity can read or change each record.

Student-facing ticket, waitlist, and notification records are scoped to their owner. Administrative access is separate and must not be granted to student accounts.

For API requests, the current authentication helper resolves a student from a supported JWT/Bearer authorization header or the HTTP-only student session cookie. Keep credentials and signing secrets on the server.

## API overview

The repository contains versioned API route groups for:

- Events: `/api/v1/events` and `/api/v1/events/[slug]`
- Current student: `/api/v1/me`
- Tickets: `/api/v1/tickets`, including booking and cancellation routes
- Waitlist: `/api/v1/waitlist` and `/api/v1/waitlist/join`
- Notifications: `/api/v1/notifications`, including marking a notification as read
- Contact: `/api/v1/contact`

Check the route handlers and their shared services for the exact request and response contracts before integrating another client. Reuse the established ticketing services; do not create a second implementation of booking, cancellation, or waitlist rules.

## Getting started

The repository uses pnpm. Confirm that your local Node.js and pnpm versions satisfy the `engines` field in `package.json` and the versions in `.mise.toml`.

```bash
pnpm install
pnpm dev
```

The current `dev` script in `package.json` starts Next.js on port `3000`. The repository's Make lifecycle instructions may supply a port and runtime environment differently; when working inside that environment, follow `AGENTS.md` rather than replacing its lifecycle configuration.

To create a production build:

```bash
pnpm build
```

The project uses Payload and a platform-managed backend in its Figma Make environment. A plain local shell may not have all platform-provided environment variables or backend services. A failed command caused by missing platform runtime configuration must be reported as an environment limitation; do not add fake secrets or rewrite the platform configuration to bypass it.

## Environment and secrets

Use `.env.example` as a reference for the names and purpose of environment variables. Actual secret values must be supplied through the approved environment-variable or deployment configuration.

- Never commit `.env` files or real credentials.
- Never paste secrets into prompts, documentation, source code, browser-visible components, or logs.
- Keep private keys and tokens in server-only code.
- Do not expose sensitive values through `NEXT_PUBLIC_*` variables.
- Do not invent placeholder secrets to make a build appear successful.
- Do not reveal or print existing secret values when inspecting configuration.

The Figma Make / Payload backend configuration is platform-managed. Follow the existing project instructions for this environment instead of adding a separate database or authentication setup.

## Quality checks

Run the checks relevant to the change and record their actual results. Do not state that a check passed unless it was executed successfully.

```bash
pnpm build
pnpm format
```

Before a change is considered complete:

- Verify the affected user flow, not only the changed function.
- Test successful, invalid, unauthorised, missing-record, duplicate, and capacity-boundary cases where relevant.
- Verify that a student cannot access another student's private records.
- Verify that failed multi-step operations do not leave partial ticketing state.
- Check relevant API routes and frontend states.
- Inspect build output and runtime errors.
- Record any checks that could not run and explain why.

The exact test command depends on the test tooling present in the current branch. Check `package.json` before assuming a test script exists.

## AI-assisted engineering practices

AI tools may be used to understand the codebase, draft specifications, propose designs, generate code, write tests, and review changes. AI output is a proposal, not proof of correctness.

The developer remains responsible for:

- Supplying a clear goal and testable acceptance criteria.
- Giving the agent the relevant project context and constraints.
- Reviewing generated code and generated tests.
- Rejecting or changing suggestions that weaken security, data integrity, maintainability, or scope.
- Running verification and inspecting the results.
- Declaring material AI assistance in the capstone or project submission.

Use the **Plan → Act → Observe → Repeat** workflow for substantial changes. Keep tasks small enough to review, and update `docs/REJECT_LOG.md` when a meaningful AI or engineering proposal is declined or materially changed.

## Team contribution and pull-request expectations

A pull request should:

1. Address one coherent feature, fix, or refactoring objective.
2. Link to the relevant specification or issue.
3. State what changed and what did not change.
4. Include testable acceptance criteria and verification evidence.
5. Include relevant tests, including boundary and failure cases.
6. Explain any security, privacy, data integrity, API, or dependency implications.
7. State where AI materially contributed to the work.
8. Identify known limitations and checks that were not run.

Reviewers should check correctness, edge cases, access control, secret handling, data integrity, dependency/API compatibility, test quality, and maintainability. Do not approve a change solely because generated code looks plausible or a happy-path demo works.

## Project documentation

- [`AGENTS.md`](./AGENTS.md) — project context, agent instructions, constraints, and engineering workflow.
- [`docs/REJECT_LOG.md`](./docs/REJECT_LOG.md) — rejected or modified proposals and the rationale for the final decision.
- `.env.example` — environment-variable names and example configuration shape.

For the capstone submission, keep the one-page specification, AI-use declaration, PR review record, verification evidence, and 400–600-word reflection in the `docs/` directory. Do not claim that an artefact exists until it has been added to the repository.
