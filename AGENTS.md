# AGENTS.md

## Purpose

This repository is a fullstack application organized as a modular codebase containing both frontend and backend projects in a shared folder structure. The goal is to preserve reusable architectural patterns from the source projects while removing all source-domain-specific business assumptions.

Agents working in this repo should:
- preserve module boundaries
- prefer existing shared infrastructure over one-off implementations
- fit new work into established module, routing, API, schema, mapper, and registry patterns
- avoid importing business concepts from the source projects unless they are explicitly present in this new codebase

## Scope

This file is the default agent policy for the entire repository.

It applies to:
- `fe/**`
- `api/**`
- shared repo-level structure and cross-boundary work

Nested `AGENTS.md` files may add narrower instructions for their own subtree.

## Precedence

Use this order when instructions overlap:
- direct user request
- this root `AGENTS.md`
- nested first-party `AGENTS.md` for the subtree being edited
- local code conventions already present in the target module

If a nested first-party `AGENTS.md` conflicts with this file, follow the nested file only within that subtree. Otherwise, treat nested files as supplements, not replacements.

## Decision Order

When tradeoffs exist, prefer decisions in this order:
- preserve architecture and ownership boundaries
- preserve auth, permission, and security semantics
- preserve FE/API contract compatibility
- reuse existing local patterns and infrastructure
- make the smallest coherent change that fully solves the task

## Default Mindset

Act like a senior engineer working inside an existing production codebase:
- preserve architecture
- respect ownership boundaries
- trace side effects across layers
- update all dependent layers coherently
- prefer pragmatic, maintainable changes
- avoid carrying over old business logic just because it existed in the source repo

Make the smallest coherent change that fully solves the task.

---

## Monorepo Principles

- Treat `fe` and `api` as separate runtime applications inside one repository, but keep architectural decisions aligned.
- Reuse shared contracts and conventions where appropriate, but do not couple frontend and backend internals unnecessarily.
- Keep business logic close to the owning backend module.
- Keep frontend focused on composition, presentation, interaction flows, and integration with backend contracts.
- Prefer extending existing modules over inventing parallel patterns.

When making non-trivial changes, inspect both sides if the change crosses the API boundary.

---

## Architecture Rules

### 1. Preserve module-based architecture

Keep the existing module structure intact.

Prefer:
- feature-local ownership
- module registration mechanisms already present in the repo
- shared infrastructure for cross-cutting concerns
- explicit layering over ad hoc wiring

Do not introduce a new architectural style unless explicitly requested.

### 2. Respect feature ownership

A feature should own its:
- routes
- handlers/controllers
- services/use-cases
- repositories/data access
- schemas/DTOs/models
- widgets/components/tables/forms where applicable
- API integration surface
- registration/wiring

Do not spread feature logic across unrelated folders without a strong architectural reason.

### 3. Prefer extension over duplication

If a nearby feature already implements a similar workflow, follow its architectural pattern rather than creating a new one.

Abstract only when a repeated pattern already exists in the codebase.

When in doubt:
- extend the nearest existing feature pattern
- keep logic with the owning feature or layer
- avoid new shared abstractions until repetition and ownership are clear

---

## Frontend Rules

### 4. Preserve frontend module registration patterns

If the frontend uses module registration or auto-loading, register new features through that system instead of hand-wiring them into the app shell.

Prefer:
- feature-level `index` registration
- route metadata
- module-driven navigation
- feature-local pages, widgets, schemas, tables, and API wrappers

Do not bypass the established route or module registry unless the codebase already does so intentionally.

### 5. Respect route metadata and guarded navigation

When adding or changing frontend routes:
- include route metadata expected by the app
- preserve permission-driven navigation
- mark internal/detail pages as hidden when appropriate
- keep menu ordering and grouping aligned with existing patterns

Do not mount protected screens directly in app shell routing if the route system already handles auth and permissions.

### 6. Reuse shared page, form, and table infrastructure

Prefer existing shared infrastructure before building custom solutions:
- page containers/layout shells
- schema-driven forms
- shared table/grid layers
- dialogs, toolbars, tabs, badges, uploads, empty states, loading states

Avoid introducing a parallel form or table framework for a one-off screen.

### 7. Keep frontend data contracts clean

Prefer:
- feature-local API clients using the shared network layer
- typed DTO/model separation where the repo already uses it
- centralized mapping/normalization
- cache invalidation patterns where available

Do not scatter backend response-shape assumptions across many components.

### 8. Stay inside the established UI system

Default to:
- the project’s existing component library
- shared UI primitives already present in the repo
- the existing visual language and interaction style

Optimize for clarity, consistency, and operational usefulness over novelty.

---

## Backend Rules

### 9. Preserve backend layering

Follow the established backend layering:
- `handler/controller -> service/use-case -> repository`

Rules:
- handlers/controllers stay thin
- business rules live in services/use-cases
- persistence and query logic live in repositories
- shared concerns belong in shared/platform packages, not inside arbitrary feature modules

Do not collapse layers unless the codebase intentionally uses a different pattern.

### 10. Preserve backend boot and registry patterns

If the backend uses a feature registry / module boot model, preserve it.

Typical patterns to keep when present:
- boot starts from `main.go`
- feature registration is centralized through registry packages
- features may self-register through `init()`
- side-effect imports may be used intentionally
- feature enablement may be config-driven
- each feature may own its own `registry.go`

Do not bypass the registry pattern by wiring feature internals directly in boot code unless the codebase already does that intentionally.

### 11. Keep runtime composition clean

Boot/runtime code should focus on composition:
- constructing repositories
- constructing services
- constructing handlers
- registering routes
- wiring shared dependencies

Do not move business logic into boot code.

### 12. Preserve persistence conventions

Use the project’s existing persistence patterns consistently:
- ORM/query builder conventions already present
- migration tooling already present
- transaction patterns already present
- repository ownership of persistence logic

Never make schema-only changes without checking affected application layers.

If adding or changing fields, inspect:
- schema definitions
- migrations
- repository queries
- service validations/business logic
- handler/controller request-response DTOs
- cache/search/realtime side effects if those systems exist

---

## Shared API Boundary Rules

### 13. Treat FE/API integration as an explicit contract

For changes crossing frontend and backend:
- update request/response contracts coherently
- keep DTOs and models explicit
- update mappers/adapters where present
- verify route naming, payload shape, and error handling conventions
- avoid partially wired changes across the boundary

Do not update only one side of a contract unless the change is intentionally backward-compatible.

### 14. Reuse the shared network and error handling patterns

Frontend should use the shared API client/network layer.
Backend should use the shared response/error conventions.

Avoid:
- ad hoc HTTP clients
- inconsistent response envelopes
- custom auth handling in random places
- duplicated transport helpers

---

## Auth, Access, And Security

### 15. Never bypass auth semantics

Protected flows should continue to respect the repo’s existing auth model.

Frontend:
- use route-level auth/permission handling where the app expects it

Backend:
- use existing auth middleware and internal-access boundaries
- preserve JWT/session/token semantics already present

Do not add isolated custom auth checks when shared auth infrastructure is the correct place.

### 16. Permissions matter more than visibility

When adding a privileged route, page, or action:
- guard it through the established permission model
- gate UI affordances when needed
- keep permission naming consistent with local conventions

Hiding a menu item is not authorization.

### 17. Preserve scope rules if the project has them

If the codebase uses org/workspace/member/tenant scoping:
- apply scope checks consistently
- preserve boundaries across route, service, repository, and UI behavior

If the new codebase does not use a source-project scope model, do not recreate it accidentally.

---

## Data, Mapping, And Models

### 18. Keep DTOs, models, and mapping separated

Where the repo already distinguishes transport and UI/domain models:
- keep API DTOs explicit
- keep normalized models explicit
- keep mapping logic centralized
- keep UI components consuming stable model shapes where possible

Do not leak transport-layer assumptions across many files.

### 19. Keep business logic out of presentational layers

Prefer this ownership:
- backend handlers/controllers: transport handling
- backend services/use-cases: business rules and orchestration
- backend repositories: persistence
- frontend API modules: remote calls
- frontend mappers/adapters: transformation
- frontend widgets/components/pages: presentation and interaction

---

## Realtime, Cache, Search, Jobs

### 20. Only use platform capabilities that actually exist in this repo

Examples:
- cache
- websocket/realtime
- search indexing
- pubsub/events
- workers/cron jobs
- custom fields/extensibility hooks

Rules:
- use existing helpers before adding new infrastructure
- invalidate cache when cached reads depend on mutations
- keep event and payload conventions consistent
- inspect indexing/live-update side effects when entity shape changes
- do not silently break runtime flows

If a capability from the source projects is not clearly present here, do not recreate it automatically.

---

## Naming And Code Style

### 21. Match local naming patterns

Follow the naming conventions already present in the codebase:
- file naming style
- suffix conventions
- feature-first naming
- route naming
- DTO/model/schema/table/widget naming

Do not introduce a second naming style unnecessarily.

### 22. Keep types explicit and narrow

- prefer concrete types/interfaces
- avoid `any` and vague untyped helpers
- preserve strict typing where the project expects it
- keep contracts narrow and readable

### 23. Be conservative with abstraction

Do not generalize a one-off implementation prematurely.

Introduce shared abstractions only when:
- the repetition is real
- the ownership is clear
- the abstraction matches the existing architecture

---

## What To Inspect Before Editing

For non-trivial work, inspect the smallest relevant set of files first.

Minimum checklists by change type:

Frontend-only changes:
- target feature `index`
- route registration and route metadata
- shared page/form/table/widget primitives already solving the problem
- permission and hidden-route implications

Backend-only changes:
- target feature handler/controller
- service/use-case
- repository
- registry and boot wiring if registration changes
- auth, validation, and response-envelope conventions

FE/API contract changes:
- backend request/response DTOs
- backend handler/service/repository flow
- frontend API client
- frontend mapper/adapter layer
- affected UI model assumptions and permission handling

Schema or persistence changes:
- schema definitions or migrations
- repository queries and transactions
- service validation and business rules
- request/response DTOs
- cache, realtime, search, jobs, or event side effects

Frontend usually:
- feature `index`
- route registration
- page/widget/schema/table files
- feature API module
- shared form/table/layout primitives already solving the problem

Backend usually:
- `main.go`
- relevant `registry.go`
- target feature `registry.go`
- handler/controller
- service/use-case
- repository
- middleware
- config structs/templates
- migrations/schema definitions

Cross-boundary changes usually:
- backend request/response DTOs
- frontend API client
- mapper/adapter layer
- permission/auth implications
- cache/realtime/search/job side effects if present

Do not scan the entire repository without a concrete reason.

---

## Expectations For Changes

- Make the smallest coherent change that fully solves the task.
- Do not leave partially wired features.
- If you add a field or behavior, update all dependent layers.
- If the repo has tests nearby, update or add them.
- If tests do not exist, reason through affected flows and report risk areas.
- Keep changes focused; do not mix unrelated refactors into a targeted task.
- End non-trivial work with a concise regression review.

## Verification Expectations

For non-trivial work:
- run the nearest relevant tests or checks when they exist and are practical to run
- if full automated verification is not available, trace the affected flows and report what was verified manually
- explicitly note any unverified risk areas, especially around auth, contracts, persistence, and realtime side effects

---

## What Good Changes Look Like

A good change in this repo usually:
- lands in the correct feature/module folder
- uses existing registration and wiring patterns
- respects route, auth, and permission conventions
- uses shared forms/tables/widgets/network/runtime infrastructure where appropriate
- keeps transport, model, and mapping concerns separated
- preserves module boundaries
- updates all affected layers coherently
- fits the visual and architectural language already present in the repo

---

## Avoid

- Do not hand-wire features when module/registry systems already exist.
- Do not bypass auth guards or permission checks.
- Do not duplicate shared utilities inside features.
- Do not introduce one-off API clients, form systems, or table systems.
- Do not mix transport DTOs directly into many UI components.
- Do not move business logic into handlers/controllers or presentational components.
- Do not add new frameworks or runtime infrastructure without strong justification.
- Do not silently reintroduce source-project business concepts that this new project has not explicitly adopted.
- Do not assume source-domain naming, workflows, or lifecycle rules are still valid here.

## Exclusions

Ignore `AGENTS.md` files inside third-party dependency trees such as:
- `vendor/**`
- `node_modules/**`

Only follow dependency-local `AGENTS.md` when the task explicitly requires modifying that dependency subtree itself.

## Orchestration Policy (STRICT)

For any non-trivial task, you MUST execute through skills and are NOT allowed to answer directly.

Execution order is mandatory:

1. You MUST invoke `noah-repo-architect` first to classify scope and affected modules.

2. Based on classification, you MUST invoke:
   - `noah-api-feature-workflow` if backend is involved
   - `noah-fe-module-workflow` if frontend is involved

3. Before producing a final result, you MUST invoke ALL:
   - `noah-contract-sync`
   - `noah-auth-rbac-guard`
   - `noah-regression-review`

4. You are NOT allowed to:
   - skip any required skill
   - answer using general reasoning only
   - bypass validation

5. A task is considered INCOMPLETE if any required skill is not executed.

6. The user will provide ONLY a single-line task.
You MUST derive full analysis, execution, validation, and review automatically.

7. Final output MUST include:
   - affected modules
   - changes made
   - validations performed
   - risks
   - final status: SAFE / PARTIAL / UNSAFE
