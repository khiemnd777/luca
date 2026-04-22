---
name: database-workflow
description: Use when a task involves database schema inspection, migrations, SQL queries, repository-to-database tracing, data validation, or safe database debugging in an existing codebase.
---

# Database Workflow

Use this skill when the task touches persistence behavior, schema shape, migrations, queries, or data integrity.

## No shortcut patch rule

- trace the owning layer and root cause before any edit plan is formed
- do not hide data defects with guards, null fallbacks, hardcoded values, skip paths, or "make it pass" conditionals
- if the correct fix crosses schema, repository, service, contract, cache, or job boundaries, update those layers coherently
- temporary mitigations require explicit user approval and must be labeled as temporary

## Goals

- Identify the actual database engine and access pattern before changing anything.
- Trace the owning path from application code to schema and data.
- Keep schema, query, transaction, and contract changes aligned.
- Keep data operations safe, explicit, and reversible.

## Required workflow

1. Identify the database boundary first.
   - Inspect config, connection bootstrap, ORM or query builder usage, migration folders, and repository ownership.
   - Confirm whether the task is about schema, query logic, transactions, data repair, or contract drift.

2. Trace the full owning path.
   - For read bugs: handler or service -> repository or query -> table, view, index, or join assumptions.
   - For write bugs: request or validation -> service rules -> transaction -> persistence side effects.
   - For cross-boundary changes: include DTOs, mappers, caches, jobs, search, and UI assumptions if applicable.

3. Make the smallest coherent fix.
   - Update migrations, models, repositories, validations, and contracts together when the change crosses layers.
   - Prefer the owning repository or persistence layer over one-off query logic in handlers or presentational code.

4. Validate with the nearest safe checks.
   - Run targeted tests when present.
   - Inspect generated SQL or query call sites when the abstraction hides behavior.
   - For data updates, verify selection criteria before mutation and verify affected rows after mutation.

## Safety rules

- Never run destructive database commands unless explicitly requested.
- Treat production data operations as high-risk.
- Prefer read-only inspection first.
- If a migration is needed, keep it idempotent when the repo's migration style expects that.
- If identity or foreign-key semantics are involved, verify the exact key contract before editing queries.

## What to inspect

- database or connection bootstrap config
- migration files
- schema definitions or models
- owning repositories
- service validation and transaction boundaries
- cache, jobs, events, search, or realtime side effects when data shape changes

## Output expectations

Before editing, produce a short internal checklist containing:

- database engine and access pattern
- owning files to inspect first
- whether the task is schema, query, data, or contract related
- validation plan and risk level
