---
name: noah-api-feature-workflow
description: Use when implementing or modifying backend work in Noah so changes follow the existing feature registry, handler-service-repository layering, module dependencies, and runtime boot patterns.
---

# Noah API Feature Workflow

Use this skill for work under `api/**`.

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

## Minimum implementation checklist

- inspect feature `registry.go`
- trace handler -> service -> repository
- update request/response payload handling coherently
- keep validation and business rules in the service layer
- keep persistence logic in repositories
- register new routes through the feature handler
- verify feature enablement and registry behavior if new components are added

## When schema changes are involved

Also inspect:

- migrations or schema definitions
- repository queries
- service validation and business rules
- handler request/response payloads
- dependent frontend contracts if the API response changes

## Avoid

- business logic in handlers
- persistence logic in boot code
- bypassing feature registries
- schema-only changes without tracing downstream consumers
- ad hoc auth checks when shared middleware or auth utilities already exist
