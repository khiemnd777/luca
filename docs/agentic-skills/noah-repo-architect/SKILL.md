---
name: noah-repo-architect
description: Use when a task targets the Noah monorepo and you need to determine whether the work belongs in frontend, backend, or both, then inspect the minimum required files before making changes.
---

# Noah Repo Architect

Use this skill first when the request is ambiguous, cross-cutting, or likely to affect architecture boundaries.

## Goals

- Preserve module ownership and existing architecture.
- Classify the task as `fe`, `api`, or cross-boundary.
- Inspect the smallest relevant file set before editing.
- Identify auth, contract, migration, cache, realtime, and registry implications early.

## Required reading order

1. Read `/AGENTS.md`.
2. If the task touches `fe/**`, read `/fe/AGENTS.md`.
3. Inspect only the nearest feature/module files needed to classify the change.

## Classification

Decide which bucket applies:

- `frontend-only`: route, page, widget, schema, table, client-side mapper, UI state.
- `backend-only`: handler, service, repository, registry, config, migration, worker, cron.
- `contract`: endpoint, request/response payload, model, mapper, permission flow, error handling.
- `platform-impact`: cache, realtime, search, metadata/customfields, pubsub, jobs, runtime registry.

If more than one bucket applies, treat it as cross-boundary and inspect both sides before proposing a change.

## Minimum inspection checklist

For frontend-only:

- target feature `index.tsx`
- relevant `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/`
- shared primitives already solving the problem
- route metadata and permission usage

For backend-only:

- target feature `registry.go`
- handler/controller
- service/use-case
- repository
- boot/registry path if feature registration changes
- auth/validation/response patterns

For contract changes:

- backend request/response DTOs or handler payload shape
- backend service and repository flow
- frontend feature API wrapper
- frontend mapper/model assumptions
- permission and invalidation implications

For schema/persistence changes:

- migration files or schema definitions
- repository queries
- service validation/business rules
- handler payloads
- frontend model/mapper consumers
- cache, realtime, search, and job side effects

## Decision rules

- Prefer extending the nearest existing feature pattern over inventing a new one.
- Do not hand-wire modules when registries or auto-loading already exist.
- Do not mix frontend transport assumptions directly into UI components.
- Do not move business logic into handlers, boot code, or presentational layers.
- Make the smallest coherent change that fully solves the task.

## Output expectations

Before editing, produce a short internal plan containing:

- task classification
- affected feature/module owners
- files to inspect first
- likely side effects to verify

If the task is risky or broad, explicitly call out what is out of scope.
