# AGENTS.md

## Purpose

This repository is a fullstack application organized as a modular codebase containing both frontend and backend projects in a shared folder structure. The goal is to preserve reusable architectural patterns from the source projects while removing all source-domain-specific business assumptions.

Agents working in this repo should:
- preserve module boundaries
- prefer existing shared infrastructure over one-off implementations
- fit new work into established module, routing, API, schema, mapper, and registry patterns
- avoid importing business concepts from the source projects unless they are explicitly present in this new codebase
- read `DESIGN.md` before frontend or UI-facing work and follow it as the visual source of truth unless the target subtree has narrower instructions

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

## Critical Rule: Absolute No Fabrication and Absolute No Hallucination

This rule is critically important and must never be broken.

- Never invent anything beyond the user's request.
- Never hallucinate facts, requirements, constraints, results, files, code behavior, or completion status.
- If the user's request is unclear, ask follow-up questions until the real, actionable requirement is clear before proceeding.
- If any off-path branch, new assumption, or scope expansion appears during execution, stop immediately and confirm with the user before continuing.
- Fabrication and hallucination are absolutely forbidden.

This rule overrides any tendency to guess, infer extra scope, or continue through ambiguity without explicit user confirmation.

## Critical Rule: Absolute No Shortcut Patches

This rule is critically important and must never be broken.

- Never ship a symptom-only fix, tactical workaround, or "make it pass" patch.
- Never hide a defect by adding guards, null fallbacks, hardcoded values, skip paths, retries, or local conditionals unless that behavior is the confirmed owning design.
- Before editing, trace the real owning layer and root cause. If the correct fix crosses handler/service/repository, mapper/API/UI, registry, auth, or cache boundaries, update those layers coherently.
- Do not justify a shortcut as the "smallest coherent change" unless it is actually the correct architectural fix.
- If only a temporary mitigation is possible, stop and get explicit user approval before implementing it, and label it as temporary.

## Critical Identity Contract: User vs Staff vs Department

This repo has two distinct identities:

- `users.id` = account/user identity
- `staffs.id` = staff record identity
- `staffs.user_staff` = foreign key to `users.id`
- `departments.administrator_id` stores `users.id`, NEVER `staffs.id`

Rules:
- Never assume a route param named `id` in `staff/**` means `staffs.id`.
- Before editing any staff/user/department flow, explicitly verify whether the flow uses `users.id` or `staffs.id`.
- For department admin assignment/unassignment, the contract uses `users.id`.
- Do not write code that accepts both `users.id` and `staffs.id` in the same endpoint unless the user explicitly requests that compatibility mode.
- Variable names must be explicit:
  - use `userID` for `users.id`
  - use `staffRecordID` for `staffs.id`
  - never use ambiguous names like `staffID` unless it truly means `staffs.id`

For any work touching staff/user/department identity, read `docs/identity-contract.md` first.

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

### Assistant Platform Note

The repo now includes a reusable AI Assistant Platform under:

- `api/modules/ai`
- `api/modules/ai/assistant`
- `api/modules/ai/knowledge`
- `fe/src/features/ai`
- `fe/src/features/ai/assistant`
- `fe/src/features/ai/assistant_profiles`
- `fe/src/features/ai/knowledge`

Treat this as platform infrastructure, not a domain feature.

Rules:
- keep assistant runtime, knowledge runtime, prompt governance, retrieval, safety, and evaluation concerns separated
- preserve the distinction between public assistant contracts and admin review/respond contracts
- do not mix future domain tools or business workflows into Plan 1 platform primitives unless the task explicitly calls for it
- preserve traceability for every assistant turn: profile, prompt version, model id, citations, safety, and token/latency metadata
- preserve the grounding contract: retrieved context is the only citable source set for assistant answers
- keep uploaded knowledge content out of system/profile prompt layers
- preserve profile-locked sessions so historical traces remain attributable to the profile/prompt version active at creation time

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
- apply DRY by reusing existing local patterns and shared infrastructure when repetition is real
- apply SOLID pragmatically without introducing speculative layers or indirection

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

For any work that changes or introduces frontend UI, read `/DESIGN.md` first and treat it as the default visual rulebook for layout, component styling, spacing, and anti-patterns. If local code and `DESIGN.md` diverge, prefer the dominant implemented pattern already present in the target module unless the user explicitly requests a new direction.

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

For Assistant Platform work, explicitly preserve these contracts when touched:

- knowledge source/document/job/chunk admin APIs
- assistant public session APIs
- assistant admin session/review/eval APIs
- chat response shape:
  - `answer`
  - `citations`
  - `confidence`
  - `safety`
  - `profile`
  - `proposed_actions`
  - `requires_confirmation`
  - `trace_id`

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

For Assistant Platform work, preserve these permission and scope expectations:

- `knowledge.manage`
- `assistant.view`
- `assistant.respond`
- `assistant.profile.manage`
- `assistant.review`

And preserve assistant content scope boundaries:

- `public_assistant`
- `internal_assistant`
- `admin_only`

`admin_only` content must never leak into public assistant retrieval.

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

For any work touching staff/user/department identity, read `docs/identity-contract.md` before inspecting implementation files.

Minimum checklists by change type:

Frontend-only changes:
- target feature `index`
- `/DESIGN.md`
- route registration and route metadata
- shared page/form/table/widget primitives already solving the problem
- permission and hidden-route implications

Assistant platform frontend usually:
- `fe/src/features/ai/index.tsx`
- `fe/src/features/ai/assistant`
- `fe/src/features/ai/assistant_profiles`
- `fe/src/features/ai/knowledge`
- feature `api/`, `model/`, and `widgets/`
- `fe/src/core/module/registry.tsx` and navigation behavior if menu grouping or route metadata changes
- `api/languages/en.xml` and related i18n usage if user-facing strings change

Backend-only changes:
- target feature handler/controller
- service/use-case
- repository
- registry and boot wiring if registration changes
- auth, validation, and response-envelope conventions

Assistant platform backend usually:
- `api/modules/ai/main.go`
- `api/modules/ai/assistant/handler/handler.go`
- `api/modules/ai/assistant/service/service.go`
- `api/modules/ai/assistant/service/provider.go`
- `api/modules/ai/assistant/service/prompt_compiler.go`
- `api/modules/ai/assistant/repository/repository.go`
- `api/modules/ai/knowledge/service/service.go`
- `api/modules/ai/knowledge/repository/repository.go`
- `api/migrations/sql/V30__assistant_platform.sql`
- module config/env files when provider, storage, or runtime defaults change

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
- `/DESIGN.md`
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

For Assistant Platform work:
- do not ship retrieval changes without checking citation validation and safety outcomes
- do not ship prompt/runtime changes without preserving prompt-layer trace metadata
- do not add model-provider behavior that can bypass post-generation citation and safety guards
- do not add frontend strings for assistant modules without updating `api/languages/en.xml`

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

## Orchestration Policy (STRICT, AUTO MODE)

For any task, you MUST operate as an execution system and NOT as a general assistant.

### 1. Task Classification (MANDATORY)

You MUST first invoke `noah-repo-architect` to:

- classify the task as:
  - feature
  - bug
  - refactor
- identify affected modules
- determine scope: frontend, backend, or cross-boundary

---

### 2. Execution Strategy (AUTO)

Based on classification:

#### If task is a BUG:

- You MUST trace the root cause before making any change
- You MUST minimize scope:
  - fix only what is necessary
  - do NOT refactor unrelated code
- You MUST preserve existing architecture and behavior
- You MUST prioritize correctness over completeness

#### If task is a FEATURE:

- You MUST implement end-to-end:
  - API → FE → contract → integration
- You MUST follow existing module and registry patterns
- You MUST ensure all layers are updated coherently

#### If task is a REFACTOR:

- You MUST preserve behavior
- You MUST reduce duplication or improve structure
- You MUST NOT change external contracts unless explicitly required

---

### 3. Skill Invocation And Coverage (MANDATORY)

You MUST execute through skills and are NOT allowed to answer using general reasoning alone.

- Always start with:
  - `noah-repo-architect`

- Then invoke the implementation skills that match the classified scope:
  - `noah-api-feature-workflow` if backend is involved
  - `noah-fe-module-workflow` if frontend is involved
  - `noah-cicd-workflow` if the task affects GitHub Actions, CI checks, deploy automation, VPS provisioning, release pipelines, production env rendering, or operational secrets

- If the task targets the AI Assistant Platform, also invoke the narrowest matching assistant skill:
  - `noah-assistant-platform` for platform-wide or ambiguous assistant work spanning knowledge, runtime, and governance
  - `noah-assistant-runtime` for sessions, profiles, prompt versions, prompt compiler, provider/model execution, traces, or proposed actions
  - `noah-knowledge-runtime` for source management, uploads, parsing, chunking, embedding, taxonomy, visibility, reindex, disable, or archive flows
  - `noah-assistant-safety-evals` for guardrails, citation validation, refusal/escalation behavior, review queue, trace review, or offline eval work

- Before completion, you MUST cover all relevant validation dimensions for the task:
  - `noah-contract-sync` when FE/API contracts, payloads, routes, models, or mappers may be affected
  - `noah-auth-rbac-guard` when routes, actions, permissions, auth, or scope-sensitive behavior may be affected
  - `noah-regression-review` for every non-trivial task before sign-off
  - `noah-cicd-workflow` validation when the task changes workflow entrypoints, deploy scripts, healthchecks, Docker production packaging, or secret handoff

- Coverage is mandatory, but explicit invocation is conditional by scope and complexity.
- Do not invoke unrelated skills only to satisfy ceremony.

---

### 4. Complexity-Based Execution Strategy (MANDATORY)

Use the smallest orchestration shape that fully covers the task:

- `simple`
  - use the main agent only
  - no subagent is required
  - still classify with `noah-repo-architect` and apply any directly relevant skills

- `medium` or ambiguous
  - main agent may delegate discovery to `noah-boundary-explorer`
  - use this when the next edit depends on clarifying ownership, scope, or the minimum file set first

- `cross-boundary`
  - main agent may delegate independent implementation to `noah-api-worker` and `noah-fe-worker` in parallel
  - main agent may delegate CI/CD implementation to `noah-cicd-worker` when the write scope is `.github/**`, `deploy/**`, or tightly related production packaging files
  - use only when the write scopes are clearly separable between `api/**` and `fe/**`

- `high-risk`
  - add `noah-contract-reviewer` and/or `noah-regression-reviewer` when contract drift, permission regressions, registration omissions, or stale side effects are likely

The main agent remains responsible for:
- planning
- deciding whether to delegate
- integrating delegated work
- final validation
- the final answer

Subagents must receive bounded scopes only:
- `noah-api-worker` owns `api/**`
- `noah-fe-worker` owns `fe/**`
- `noah-cicd-worker` owns `.github/**`, `deploy/**`, and tightly related production packaging files
- explorer and reviewer roles are read-heavy by default unless the task explicitly assigns edits

Do not delegate immediate blocking work if the main agent needs that result first to decide the approach.

---

### 5. Validation (NON-OPTIONAL)

You MUST NOT complete the task until all applicable validations pass:

- FE ↔ API contract consistency
- permission/auth safety
- cache and data consistency
- routing and module registration integrity

A task is considered INCOMPLETE if validation is skipped.

---

### 6. Constraints (STRICT)

You are NOT allowed to:

- skip required skills
- answer using general reasoning only
- expand scope beyond classification
- introduce new architecture patterns
- leave partially implemented changes

---

### 7. Input Model

The user will provide ONLY a single-line task.

You MUST derive:

- analysis
- execution
- validation
- review

without asking for additional prompts.

---

### 8. Output Requirements

Your final output MUST include:

- for simple tasks:
  - task classification
  - affected modules
  - changes made
  - validations performed
  - final status

- for non-trivial tasks:
  - task classification (feature / bug / refactor)
  - affected modules
  - changes made
  - validations performed
  - risks
  - final status:
    - SAFE
    - PARTIAL
    - UNSAFE
