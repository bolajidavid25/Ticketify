Ticketify — AI Engineering and Capstone Rules
How to use this file: Ticketify already has a root AGENTS.md containing project- and Figma Make-specific instructions. This document is a capstone-focused addendum. Merge these rules into the existing AGENTS.md; do not replace the existing file with this addendum, because doing so would discard important platform, Payload, and deployment instructions.

1. Project context
Ticketify is a student-focused event discovery and ticketing platform. The student-facing event experience includes event discovery, student accounts, ticket booking, waitlists, cancellation, and recipient-specific notifications. The UI uses the name Ticket Drop in parts of the event experience.

The current application uses:
- Next.js App Router and React;
- TypeScript and Tailwind CSS;
- Payload CMS as the application data and access-control layer;
- PostgreSQL through the Payload database adapter;
- pnpm for package management.
Important domain collections include events, users, admins, tickets, waitlist, and notifications. Read the relevant collection definitions, server actions, API routes, and generated types before changing behaviour. Do not infer a schema from the UI alone.
2. Agent operating workflow
Use this sequence for every non-trivial task:
1. Understand: Read the relevant source files, collection definitions, existing tests, project instructions, and any linked specification. Do not start implementing from a vague prompt.
2. Clarify the goal in the brief: Identify the user problem, in-scope behaviour, out-of-scope behaviour, constraints, and acceptance criteria.
3. Plan: Break the work into small, reviewable steps. Identify affected routes, collections, server actions, access rules, and tests.
4. Act: Implement only what is required. Reuse existing services, helpers, and conventions.
5. Observe: Run the most relevant tests, type checks, build, route previews, or manual verification available in the current environment.
6. Repeat: Fix failures, inspect the diff, and rerun the relevant checks.
7. Report: Summarise the change, verification evidence, risks, unresolved issues, and material AI involvement.
Do not mark work complete merely because code was generated, a command was started, or a happy-path screen appeared.
3. Important rules and rationale
Rule 1 — PostgreSQL/Payload is the source of truth
Do not introduce production fallbacks to hardcoded event or ticket arrays. Durable business records must come from the configured Payload/PostgreSQL data layer.

Rationale: A second source of truth can disagree with the database, create records that cannot be booked, and make administrator changes invisible to the student application.
Rule 2 — Use Payload Local API for domain mutations
Use the existing Payload Local API and collection hooks for creating, reading, and updating durable domain records. Do not introduce independent raw SQL or Drizzle business logic for booking, cancellation, capacity, or waitlist operations unless the project owner explicitly approves a deliberate architectural change.

Rationale: Collection hooks, validations, access control, generated types, and shared business rules must run consistently. Duplicating them in separate data paths creates drift and can bypass invariants.
Rule 3 — Keep student and administrator identities separate
Do not merge the users and admins collections or give student accounts Payload Admin permissions. Student application authentication and CMS administration are different authorization boundaries.

Rationale: Combining these identities can create privilege escalation and expose administrative functions to ordinary students.
Rule 4 — Enforce business invariants on the server
Never trust the browser to decide ticket ownership, event capacity, Student ID eligibility, ticket status, or waitlist position. Validate and allowlist mutation inputs on the server, and preserve collection-level protections.

Current domain rules include:
- A student must have a Student ID before booking or joining a waitlist.
- A student may hold no more than one active ticket for the same event.
- Students may only access their own private ticket, waitlist, and notification records.
- Only published events are eligible for student booking or waitlist actions.
- Capacity and ticket allocation are decided by server-side state.
Rationale: Client-side checks can be bypassed. Durable invariants must remain true for browser clients, REST clients, and future integrations.
Rule 5 — Make multi-step ticketing operations consistent
Booking and cancellation may involve multiple related writes: ticket status, event issuedCount, waitlist status, and notifications. Use the transaction pattern established in the existing code and pass the transaction request to every operation that belongs to it. Roll back on failure.

Rationale: A partial write can leave a seat count, ticket, waitlist entry, and notification out of sync.

Do not assume a transaction is active merely because beginTransaction() was called. Confirm that the database adapter returned a transaction identifier and that the participating operations use it.
Rule 6 — Preserve deterministic FIFO waitlist allocation
The server determines the next eligible waiter using the persisted joinedAt ordering. Do not accept a client-supplied recipient or position as the authority for allocation.

Rationale: Server-side FIFO selection protects fairness and prevents a student from selecting another person or manipulating their place in the queue.

If the earliest waiter is no longer eligible, define and test the intended skip/continuation behaviour instead of silently leaving an event in an inconsistent state.
Rule 7 — Create notifications only after the related operation is valid
A notification must not announce a booking, cancellation, or waitlist allocation that did not succeed. For transactional workflows, notification records should be written within the same transaction where appropriate, after the primary ticketing and waitlist changes have succeeded.

Rationale: Premature notifications can mislead users and create false records when the primary operation later fails.
Rule 8 — Protect authentication and OAuth account linking
Keep session signing secrets and provider credentials server-side. Do not store OAuth access or refresh tokens unless a separately approved requirement needs them. Verify Google's email_verified claim before linking a Google identity to an existing student account. Never trust an email address supplied by the browser as proof of identity.

Rationale: Weak account linking can enable account takeover; unnecessary tokens increase the impact of credential exposure.
Rule 9 — Apply least-privilege access rules
For every collection or endpoint, identify who can create, read, update, and delete records. Students should only access their own private records. Public visitors should not gain access to private submissions or operational records. For user-facing Local API calls, follow the existing project instructions for overrideAccess and authenticated-user context.

Rationale: Hiding a button in the UI is not access control. Authorization must be enforced at the server/data boundary.
Rule 10 — Keep secrets out of source code and AI context
Never request or print real passwords, database URLs, signing secrets, OAuth client secrets, or API keys in prompts, logs, documentation, screenshots, or commits. Refer to environment-variable names only. Do not introduce fake values to bypass platform configuration errors.

Rationale: Secrets placed in source history, logs, or browser bundles can be copied and abused even after the visible value is removed.
Rule 11 — Keep changes small and reviewable
Prefer one coherent feature or fix per branch/PR. Avoid broad refactors, speculative abstractions, unnecessary dependencies, and unrelated formatting changes. Check the installed package versions and local documentation before using APIs that may differ from prior versions.

Rationale: Small diffs make it easier for a human reviewer to understand intent, identify regressions, and verify the result.
Rule 12 — Test behaviour, including failure and boundary cases
Tests should assert observable behaviour, not implementation details alone. For ticketing changes, consider:
- unauthenticated requests;
- authenticated users without a Student ID;
- missing, invalid, or unpublished event IDs;
- duplicate active ticket attempts;
- exactly-at-capacity and sold-out events;
- repeated waitlist joins;
- cancellation by a non-owner;
- FIFO ordering and an ineligible next waiter;
- notification creation only after successful mutations;
- a failure partway through a multi-step operation;
- attempts to read or mutate another student's records.
Choose test cases that match the change; do not mechanically add irrelevant cases.

Rationale: Happy-path-only tests do not demonstrate that security rules, business constraints, and failure handling work.
Rule 13 — Preserve platform-owned project structure
Follow the existing AGENTS.md instructions for Figma Make, Payload, route groups, generated files, deployment scripts, and platform-managed environment variables. Do not directly edit Payload-managed routes or replace the configured Payload/Figma infrastructure.

Rationale: These files and services are coupled to the generated runtime. Replacing them with generic Next.js/Payload patterns can break preview, authentication, deployment, or administration.
4. AI use and developer control
AI may assist with planning, code generation, test drafting, debugging, documentation, and review. AI output is not an authority and must not be accepted without inspection.

The developer must:
- provide a clear task brief and acceptance criteria;
- supply the relevant project context and rules before implementation;
- inspect generated diffs and understand material changes;
- reject or modify recommendations that conflict with domain rules, security, data integrity, or scope;
- run verification and inspect the actual output;
- disclose material AI assistance in the project/capstone submission.
For material suggestions that are declined or changed, record:
1. the suggestion or proposed change;
2. whether it was rejected or modified;
3. the reason and risk avoided;
4. the alternative selected.
Use docs/REJECT_LOG.md for this record. Do not invent rejected suggestions after the fact; record real decisions as they occur.
5. Pull-request review norms
Every pull request should include:
- Purpose: the user problem and intended outcome.
- Scope: what changed and what was deliberately left unchanged.
- Specification: acceptance criteria or a link to the relevant spec.
- Implementation summary: affected pages, routes, collections, actions, and dependencies.
- Tests: tests added or updated, including relevant edge cases.
- Verification: exact commands or manual checks performed and their actual outcomes.
- Risk notes: security, privacy, access-control, data-integrity, API compatibility, migration, and deployment implications.
- AI-use declaration: a concise, honest account of where AI materially assisted.
- Known limitations: failures, skipped checks, assumptions, or work not completed.
Reviewers should evaluate:
1. Does the change meet the acceptance criteria?
2. Are server-side validation and authorization correct?
3. Are ticket capacity, duplicate prevention, FIFO ordering, and transaction boundaries preserved?
4. Can a failure leave partial records or misleading notifications?
5. Are secrets and private student records protected?
6. Are APIs and dependencies used according to the versions installed in this repository?
7. Do the tests meaningfully cover success, failure, and edge cases?
8. Is the diff small enough to understand and maintain?
Do not approve solely because the code compiles, the UI looks correct, or an AI review says the change is safe.
6. Verification evidence requirements
For every capstone feature or material change, save evidence of what was actually checked. Suitable evidence includes:
- test output, including the command and pass/fail result;
- build or type-check output;
- route/preview checks for affected user flows;
- screenshots of relevant behaviour where useful;
- API request/response examples with private values removed;
- a PR/diff link and commit reference;
- notes on failures, limitations, and checks that could not run.
Never report a test, build, security check, deployment, or manual verification as passed unless it was actually performed and observed. If the current environment prevents a check, state the limitation and identify the next verification step.
7. Capstone artefacts to maintain
Keep the following team-ready artefacts in the repository:
Artefact	Suggested path	Purpose
Project overview	README.md	Explain the application, architecture, setup, and contribution expectations.
Agent/context rules	AGENTS.md	Give AI agents the domain context, constraints, and workflow.
One-page specification	docs/CAPSTONE_SPEC.md	Define the selected feature and testable acceptance criteria.
Rejected suggestions	docs/REJECT_LOG.md	Record real AI suggestions rejected or changed and why.
AI-use declaration	docs/AI_USE.md	Disclose how AI was used and what the developer reviewed.
PR review norms	docs/PR_REVIEW.md	Record the review checklist applied to the change.
Verification evidence	docs/VERIFICATION.md	Record test/build/preview results and limitations.
Reflection	docs/REFLECTION.md	Provide the required 400–600-word reflection.

# figma-make-app

React + Next.js + Payload + Tailwind CSS project running inside Figma Make.

This file is supplied as project instructions at the start of each task. Do not
reread it before opening source. Always load the `payload-framework` skill.
Load `nextjs-docs` when the task involves routing, pages,
components, caching, images, or metadata, not for schema-only, data-only, or style-only changes.
Load `payload-content` before changing data.

For frontend work, keep a **Verify production delivery** todo pending until all
of these are done:

- Preview every requested route and fix every runtime or build error. Server
  Components cannot contain event handlers; use CSS interaction or a Client
  Component boundary.
- When a Client Component calls a Server Action inside `useTransition`, keep
  `revalidatePath` out of the action. Return a serializable result and call
  `router.refresh()` in the client after success.
- Run `figma make verify-deploy`, inspect its production route table, and visit
  every generated public route. `verify-bootstrap` and source inspection are
  not substitutes.
- Keep fixed pages static. Choose one content lifecycle before implementing
  dynamic routes; do not combine these contracts:
  - For an intentional build-time snapshot, use build-time reads without
    on-write revalidation and warn that Admin edits require another **Publish**.
  - For content that must stay fresh after Publish, add cached list/detail reads
    and collection hooks immediately after the schema, before building UI.
    Invalidate the list plus both the previous and current route keys on every
    write (for example, `previousDoc.slug` and `doc.slug` after a slug change),
    and invalidate affected pages when related media changes. Then prove a
    unique published edit appears in a fresh production request. A revalidation
    interval is not a substitute for these hooks.

For page-level static generation or ISR, do not complete the final delivery
todo while `verify-deploy` marks a requested public route as `ƒ (Dynamic)`.
Repair the caching setup and rerun verification; a successful build or HTTP 200
does not override the route table.

For CMS-managed images, pass the Payload upload `url` (`media.url`) to
`next/image`. Keep this template's custom loader (`figma-image-loader.ts`).
Do not add a same-origin `/media/[id]` proxy; those routes 404 after
Publish. The loader adds sizing parameters to relative Payload
`/api/<collection>/file/...` URLs and passes other `src` values through, so
`images.remotePatterns` is not needed. Verify nonzero image dimensions in
every requested view, including after replacing an upload. When publishing
is requested, verify images on the published site as well as in preview.

## Payload Data Integrity

For user-facing mutations, validate and allowlist every submitted field on the
server and return structured errors the UI can display. Grant anonymous create
only through narrow collection access, and protect server-owned workflow fields
with field-level `create` and `update` access. Enforce relationship eligibility
and other durable invariants at the collection boundary, not only in a Server
Action.

Preserve the document ID type generated in `payload-types.ts`; do not assume IDs
are numeric. User-facing Local API calls must set `overrideAccess: false` and
pass the authenticated `user` when one exists.

When an installed official plugin owns a requested capability, configure it and
consume its canonical fields instead of recreating them. For SEO social images,
use the plugin's upload-collection option and read its generated image field.

Model content images as upload relationships to the existing Media collection.
Seed remote starter files through `externalURL` so later uploads use the same
relationship; do not add parallel URL fields or hardcoded frontend image data.

## Development Server

A Next.js development server is **always running** on `$PORT` (default 3000).
You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This project uses Next.js route groups to separate the frontend app from the
Payload admin/API routes:

- `src/app/(frontend)/` - Your application pages
- `src/app/(payload)/` - Payload CMS admin panel and API routes (do not modify)
- `src/collections/` - Payload data collection definitions
- `src/globals/` - Payload CMS globals, if needed
- `src/payload.config.ts` - Payload configuration
- `src/payload-types.ts` - Auto-generated TypeScript types

## Key Files

- `src/app/(frontend)/layout.tsx` - Root layout component
- `src/app/(frontend)/page.tsx` - Home page component
- `src/app/(frontend)/not-found.tsx` - Custom not-found page for missing routes/records
- `src/app/(frontend)/styles.css` - Global styles and Tailwind CSS import
- `src/lib/payload.ts` - Shared Payload utilities (findBySlug, findByField)
- `src/payload.config.ts` - Payload config (collections, plugins, etc.)
- `next.config.ts` - Next.js configuration (includes Payload wrapper)
- `package.json` - Dependencies and scripts
- `.mise.toml` - Toolchain versions (Node.js, pnpm)
- `.figma/make/*` - Lifecycle scripts (install, dev, deploy, deploy-preview, verify)

## Styling

This project uses **Tailwind CSS v4** for frontend styling. Tailwind and its
PostCSS plugin are already installed and configured, and Tailwind is loaded by
the `@import "tailwindcss"` directive in `src/app/(frontend)/styles.css`.

Use Tailwind utility classes directly in JSX for application UI. Keep
`styles.css` for the Tailwind import, shared theme tokens, and truly global base
styles; do not default to inline style objects, CSS-in-JS, or hand-written
component classes when Tailwind utilities express the same design. If a Make Kit
or design-system package is installed, its components, tokens, and Tailwind
setup take precedence over generic utilities.

## Data/Backend Decision

Use the lightest stack that satisfies the request:

- Static UI, local browser state, games, or offline tools: no backend.
- Server-side compute, secrets, OAuth, email, webhooks, or third-party API calls
  without durable local data: Next.js server components, server actions, or route
  handlers.
- Durable records, admin-managed content/data, uploads, users, bookings,
  inventory, saved preferences, or data that persists across devices/sessions:
  Payload.
- Explicit Supabase request: use the Supabase flow instead of Payload.
- Durable data plus integrations: Payload for records; Next.js server runtime and
  environment variables for the integration.

Payload is this template's durable data, admin, auth, and content layer. Use it
for structured app data, not only editorial CMS content.

## Figma-Managed Payload Rules

This is not a vanilla self-hosted Payload project. Figma Cloud provides the
database, auth integration, file storage, deployment runtime, and platform
secrets through `@payloadcms/figma`.

Package-level `@payloadcms/figma` internals are platform-owned and may not be
present in this generated app workspace. Do not inspect, duplicate, or
reinterpret bootstrap/env/OAuth behavior in app code. Keep those internals intact
and follow the Make-specific rules below.

Use `buildFigmaConfig()` in `src/payload.config.ts`. Do not replace it with
Payload's raw `buildConfig()`.

Do not add or configure:

- `db`
- `secret`
- default `editor`
- Mongo/Postgres/SQLite/database adapter packages
- OAuth/auth plugins for Payload Admin Panel auth
- cloud-storage plugins for normal uploads
- migration files, DDL, local database setup, or connection-string instructions

If a shell command complains about missing Payload/Figma backend env vars, first
check whether you are running outside the Make lifecycle/dev-server environment.
Do not hard-code dummy secrets, run `@payloadcms/figma init`, or ask the user to
provide platform-owned values.

## Secrets And Environment Variables

Payload/Figma backend env vars and secrets are platform-owned. In generated Make
apps, do not ask the user to provide these values, hard-code placeholders, add
dummy values, or expose them in client code.

For third-party integrations, collect API keys, client secrets, and tokens with
the Make environment-variable card flow, then reference them from server-only
code as `process.env.*`. Secret-backed integrations should live in server
components, server actions, or route handlers.

Do not ask users to paste secret values into ordinary chat, code, comments, or
docs. Do not print, log, summarize, or expose secret values. Treat saved
environment variable values as write-only: you can reference variable names in
code, but you should not try to reveal existing values. Add, replace, or delete
user-provided environment variables only when the user explicitly asks for
secret or integration setup.

Do not put private values in Payload documents, static data, rendered props,
browser components, or public client environment variables. In Next.js,
`NEXT_PUBLIC_*` values can be bundled into browser code; in Vite, `VITE_*`
values can be bundled into browser code. Use public prefixes only for
configuration that is intentionally public, and warn the user if a sensitive key
appears to use a public prefix.

## Payload Data Intent

This template already includes Payload, but do not create placeholder
collections just because Payload is present. Add collections or globals only when
the user needs durable application data, admin-managed records, auth-backed
accounts, uploads, or editable content.

Server routes are for stateless compute/proxying. If a route creates, updates,
lists, or stores user/domain records, model those records in Payload.

## Auth Modeling

Keep three authorization concerns distinct:

- Figma/Make access controls who can view or edit the Make file.
- Payload Admin auth controls who can manage CMS/admin content.
- Generated app auth controls who can log into the published app.

This template starts with only the `admins` auth collection. It is configured as
`admin.user` and is exclusively for CMS editors using Figma SSO. Public visitors
remain unauthenticated unless the user asks for app login.

When the user requests public signup, login, profiles, or user-owned data, create
an auth-enabled `Users` collection with slug `users`, register it in
`src/payload.config.ts`, and use it for app accounts and ownership relationships.
Never use `Admins` for public signup or grant app users Payload Admin access.

Do not use generated app auth to grant Payload Admin access, and do not use
Payload Admin users for public app signup. Payload Admin auth is
platform/control-plane behavior and may use Figma SSO and/or Payload-native auth.
Do not build or modify Payload Admin login unless the user explicitly asks for
CMS/admin access behavior.
If the request is about `/admin`, CMS editors, or who can manage content, work
with the existing Payload Admin / `@payloadcms/figma` / platform-owned admin
auth setup instead of adding generated app login.

When implementing app login, signup, account management, roles, protected pages,
email/password auth, OAuth, Google sign-in, magic links, or custom app auth, use
the `payload-auth` skill before editing auth code.

Do not create custom password/session handling from scratch. Do not use Payload
Enterprise auth plugin code, and do not copy or recreate it. For generated app
OAuth or custom providers, prefer the public `payload-auth` framework when it is
compatible with the project. Do not hand-roll Google/OAuth as the default
implementation. Do not use `@payloadcms/figma` CLI OAuth, Figma/Payload
control-plane OAuth, or Payload Admin OAuth as public app login. If
`payload-auth` is unavailable and the user explicitly requires OAuth, use a
vetted server-side auth/OIDC framework and bridge the result to Payload app-user
records. Keep provider secrets server-side.

For Payload-backed apps, create collections/globals, connect frontend pages to
Payload queries, and seed real Payload documents when starter data is needed. Use
the Payload CLI. Static arrays are acceptable only for pure UI mock data with no
persistence/admin requirement.

Add explicit `access` rules for collections that contain private, user-submitted,
staff-only, or operational records. Public forms may create records when the app
requires submissions, but public users should not be able to list, read, update,
or delete private submissions by default. Do not rely on implicit Payload access
defaults for contact details, internal notes, user-owned records, orders,
bookings, messages, or similar app data.

## Payload Implementation Workflow

When adding Payload-backed functionality:

1. Inspect the existing `src/payload.config.ts`, `src/collections/`, and
   frontend routes before changing code.
2. Use the `payload-data-modeling` skill before adding or changing collections,
   globals, fields, relationships, constraints, ownership, access rules, seeds,
   or starter data.
3. Add or update collection/global definitions under `src/collections/` or
   `src/globals/`.
4. Register them in the existing `collections` or `globals` arrays in
   `src/payload.config.ts`. Keep the config shape intact. Keep the built-in
   Admins and Media collections. Add Users only when the app needs public
   accounts, as described under Auth Modeling.
5. Payload regenerates `src/payload-types.ts` automatically from the configured
   `typescript.outputFile`; do not manually regenerate types during Make work.
6. Do not run `generate:importmap` after routine changes. In Payload 4.0,
   development HMR regenerates the import map automatically, and `payload build`
   regenerates it before running `next build`. Run the command manually only to
   recover from a missing or stale import map, an import map generation error,
   or an environment where HMR and `payload build` are unavailable.
7. Query Payload from server components/routes with `getPayload({ config })`.
8. Keep user-facing pages in `src/app/(frontend)/`.
9. Do not directly edit `src/app/(payload)/`; it is managed by Payload.

Once the backend is connected, use the Payload data tooling this environment
provides for data/content CRUD and seeding instead of writing raw database
access, REST helpers, or one-off seed scripts. The `payload-content` skill is
authoritative for which mechanism to use; invoke it and follow it rather than
assuming a mechanism. Confirm that tooling can reach the current schema before
planning or promising seeding work. If it cannot yet, keep frontend queries
wired to Payload, explain the limitation, and do not replace durable data with
static arrays.

When the user asks to inspect, create, seed, migrate, normalize, bulk-update,
update, or delete Payload documents/globals in a follow-up request, use the
`payload-content` skill before taking action. Do not try Payload REST endpoints,
app API routes, temporary migration endpoints, temporary scripts, or Local API
code first. If the data tooling that skill documents is unavailable after
listing/refreshing tools, report that limitation instead of inventing a second
mutation path.
For data-only follow-up requests, do not modify app source code unless the user
also asks for schema, UI, or behavior changes.

Before finishing Payload work, verify:

- schema is registered in `src/payload.config.ts`;
- `src/payload-types.ts` is left to Payload's automatic regeneration, and import
  maps were regenerated when needed;
- frontend routes query Payload instead of durable static arrays;
- starter documents were seeded through the Payload data tooling when it was
  available, or unavailable tooling was reported without adding static fallback
  data;
- user-facing pages stayed under `src/app/(frontend)/`;
- `src/app/(payload)/` was not directly edited; and
- the fastest relevant typecheck/build was attempted.

If checks fail because platform backend env vars are unavailable in an ordinary
shell, do not remove Payload, add dummy env vars, or rewrite config. Report the
command/context limitation and keep the app wired to Payload.

## Data Modeling Quality

- Model the user's actual domain, not generic `items`.
- When changing an existing model, especially converting primitive fields or
  static data into relationships, use `payload-data-modeling` to plan what
  happens to existing records before editing schema or mutating documents.
- Public detail records usually need a unique indexed `slug` and slug routes
  such as `/blog/[slug]`, `/products/[slug]`, or `/menu/[slug]`. Use
  `findBySlug()` from `src/lib/payload.ts` for all slug lookups and call
  `notFound()` when no document exists. Do not duplicate lookup queries inline
  in each route file.
- Prefer relationships for domain concepts that users manage independently, such
  as events to speakers, products to categories, or bookings to services.
- For appointment or booking products, model services, staff/resources,
  availability/slots, bookings, users, and waitlists separately when the request
  calls for that detail.
- CMS-managed images usually use upload fields related to `media`, such as hero
  images and author portraits.
- For versions, drafts, `_status`, and domain status fields, follow
  `payload-framework`'s lifecycle decision and use `payload-data-modeling`; do
  not apply editorial CMS defaults to all durable application data.
- Render useful empty states when Payload returns no documents, avoid crashing on
  missing optional media/relationships, and handle missing slug records with
  `notFound()`.
- Organize the admin sidebar cleanly and avoid noisy or arbitrary sidebar fields.
- Add page/block structure management only when the user asks for CMS-managed
  pages or blocks.

## Schema Safety

Before changing existing Payload schema, classify the change:

- Greenfield: additive schema creation and starter seeds may proceed.
- Existing/follow-up: optional fields, new collections, and new relationships
  can usually proceed with a concise preview.
- Pause for confirmation: deletes, renames, type changes, `required` or `unique`
  constraints, relationship cardinality changes, bulk document updates, and
  content deletes.

Treat follow-up requests after an app/schema has been created as existing-app
edits, even when they arrive in the same chat session. Do not edit files or run
Payload document mutations for destructive or ambiguous changes until the user
confirms.

Route that confirmation through the `question` tool before any potentially
destructive schema edit or document mutation. Describe the affected
fields/documents, data-loss or invalidation risk, and preservation or migration
plan in chat first, then ask one operation-specific yes-or-no question with
exactly two options, "Yes" and "No". The UI automatically adds "Add a custom
response" as the third option. Wait for the user's answer before mutating. When
the answer approves the change, start it in the same response that reads the
answer; do not reply with only an acknowledgment or a statement of what you will
do next.

- Schema evolution should preserve existing data meaning or explicitly handle
  ambiguity. Use `payload-data-modeling` for the transition plan before changing
  fields, relationships, constraints, ownership, or starter data.
- Adding `required`, `unique`, validation ranges, changing relationship
  cardinality, or changing field types should check existing documents when
  possible and require confirmation if existing data may fail validation or be
  orphaned.
- Direct wording like "delete this field" or "make this required" does not
  override schema safety. For example, deleting a `slug` field must warn about
  affected `[slug]` routes, links, queries, and existing document values before
  proceeding.
- Do not make a destructive request appear safe by silently changing routes,
  queries, or seed data to avoid the risk. Pause first, explain the impact, and
  wait for confirmation.

Make code/version history and Payload document data are separate. Rolling back
code does not roll back Payload data.

## Routing

Frontend pages live in `src/app/(frontend)/`. Pages are defined by creating
`page.tsx` files:

- `src/app/(frontend)/page.tsx` - `/`
- `src/app/(frontend)/about/page.tsx` - `/about`
- `src/app/(frontend)/blog/[slug]/page.tsx` - `/blog/:slug`

The Payload admin panel is available at `/admin`.

### Slug Routes and Not-Found Handling

When creating dynamic routes for Payload content (articles, products, etc.),
use the shared `findBySlug()` utility from `src/lib/payload.ts` instead of
writing the Payload query inline:

```tsx
import { findBySlug } from '@/lib/payload'
import { notFound } from 'next/navigation'

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await findBySlug('articles', slug)
  if (!article) notFound()
  return <Article data={article} />
}
```

This pattern:

- Defines slug lookup logic once in `src/lib/payload.ts`, reusable by all routes
- Handles published vs draft visibility through the `draft` option
- Calls `notFound()` to render `src/app/(frontend)/not-found.tsx` when missing
- Avoids duplicating query logic across route files

When adding a new collection with a slug field, reuse `findBySlug()` in the new
route instead of copying the query. When the routing field changes (e.g. from
`slug` to `title` or `handle`), use `findByField()` and update all affected
routes to use the new field name—do not leave stale queries referencing the old
field.

## Preview/Proxy Configuration

Keep the Make preview origin configuration in `next.config.ts` intact. The
template uses the exact platform-provisioned preview host from
`FIGMA_PUBLIC_URL` for both `allowedDevOrigins` and
`experimental.serverActions.allowedOrigins`.

If Payload Admin logs `Invalid Server Actions request` with an
`x-forwarded-host`/`origin` mismatch, treat it as preview proxy configuration
first. Do not rewrite Payload Admin routes, disable Server Actions, or replace
Payload internals to work around it.

## Figma Make Scripts

These scripts are called by sboxd to manage the project lifecycle:

- `.figma/make/install` - Install project dependencies (`pnpm install`)
- `.figma/make/dev` - Start the dev server (`next dev --port $PORT --hostname 0.0.0.0`)
- `.figma/make/deploy` - Build, upload, finalize, and report completion through `figma make deploy`
- `.figma/make/deploy-preview` - Build the platform-provided cached preview;
  keep its `.next`/`nextjs` contract intact and delegate packaging/upload
  through `figma make deploy-preview`

Do **not** remove or rename these scripts. They must remain executable.

## Environment Variables

These are injected by sboxd at runtime:

- `FIGMA` - Set to `"1"` when running inside sboxd
- `PORT` - The port to listen on (passed to `next dev` via the dev script)
- `FIGMA_PUBLIC_URL` - The public URL of the site
- `FIGMA_SITE_NAME` - The human-readable site name
- `FIGMA_SITE_DESCRIPTION` - Short site description
- `FIGMA_ASSETS_PATH` - Directory where exported Figma assets are written
- `FIGMA_FAVICON_PATH` - Path to the exported favicon
- `FIGMA_PREVIEW_IMAGE_PATH` - Path to the OG/social preview image
- `FIGMA_PREVIEW_OAUTH_REDIRECT_URI` - Register verbatim with the provider; see `payload-auth`
- `FIGMA_PREVIEW_OAUTH_STATE_PREFIX` - Prefix the app's OAuth `state`; see `payload-auth`

Payload/Figma Cloud backend env vars are injected into the Make lifecycle
environment for connected Payload projects. They are platform-owned; do not ask
the user to provide them manually. If they are absent in an interactive shell,
treat that as an execution-context limitation before changing app code.

## File Writing

When writing multiple files, parallelize independent Write calls in a single
response. Files are independent when none depends on another's output at write
time. Batch by dependency layer — don't write files one at a time.

## Important

- The dev server must listen on `$PORT` - do not hardcode a port
- Use `pnpm install` to add new dependencies
- Do not modify files under `src/app/(payload)/` - they are managed by Payload
- Toolchain versions are managed by `.mise.toml`, not installed manually
- This template is Next.js App Router + React 19 + Payload + Tailwind CSS v4;
  check `package.json` before adding or using other dependencies.
- This template already sets `images.loader: 'custom'` via
  `figma-image-loader.ts`. Pass Payload `media.url` to `next/image`. Do not
  add `images.remotePatterns` or a same-origin `/media/[id]` proxy, and do
  not replace the Figma loader.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
