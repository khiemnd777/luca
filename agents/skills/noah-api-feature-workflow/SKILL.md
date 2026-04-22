---
name: noah-api-feature-workflow
description: Use when implementing or modifying backend work in Noah so changes follow the existing feature registry, handler-service-repository layering, module dependencies, and runtime boot patterns.
---

# Noah API Feature Workflow

Use this skill for work under `api/**`.

## No shortcut patch rule

- trace the owning backend layer and root cause before editing
- do not hide defects with guard-only checks, null fallbacks, hardcoded values, skip paths, or "make it pass" conditionals
- if the correct fix crosses handler, service, repository, migration, or registry boundaries, update those layers coherently
- temporary mitigations require explicit user approval and must be labeled as temporary

## Required reading

1. `/AGENTS.md`
2. `api/main.go`
3. `api/shared/runtime/registry.go` if runtime/module boot is involved
4. the target feature `registry.go`
5. the target handler, service, and repository files

## Backend shape to preserve

Follow the existing layering:

- handler/controller: transport only
- service/use-case: business rules and orchestration
- repository: persistence and queries

Feature registration should continue to flow through the existing registry pattern.

## Feature registration rules

- prefer feature-local `registry.go`
- keep boot/runtime composition clean
- use existing module deps and shared infrastructure
- do not wire feature internals directly into boot unless the codebase already does so intentionally

## Persistence and platform rules

- keep query logic in repositories
- reuse existing Ent/raw SQL conventions already used nearby
- follow existing transaction patterns
- inspect cron, worker, cache, metadata, search, or realtime side effects when entity behavior changes

For AI Assistant Platform backend work:

- load the narrowest assistant skill as well:
  - `noah-assistant-runtime`
  - `noah-knowledge-runtime`
  - `noah-assistant-safety-evals`
- keep this skill focused on Noah backend layering, registry, persistence, and migration discipline

## Minimum implementation checklist

- inspect feature `registry.go`
- trace handler -> service -> repository
- update request/response payload handling coherently
- keep validation and business rules in the service layer
- keep persistence logic in repositories
- register new routes through the feature handler
- verify feature enablement and registry behavior if new components are added

Assistant-platform additions usually require loading the matching assistant skill instead of re-encoding assistant-specific workflow here.

## When schema changes are involved

Also inspect:

- migrations or schema definitions
- repository queries
- service validation and business rules
- handler request/response payloads
- dependent frontend contracts if the API response changes

If the change touches assistant or knowledge schema, also load the matching assistant skill to review feature-specific schema expectations.

Migration rule:

- treat schema migrations as idempotent by default
- for raw SQL `ALTER` statements, always use `IF EXISTS` or `IF NOT EXISTS` where the database supports it
- when a direct `ALTER` cannot be made idempotent with built-in syntax, add an explicit existence guard instead of assuming clean state
- do not ship migrations that fail only because a column, index, constraint, or table already exists or is already absent

## Avoid

- business logic in handlers
- persistence logic in boot code
- bypassing feature registries
- schema-only changes without tracing downstream consumers
- ad hoc auth checks when shared middleware or auth utilities already exist
