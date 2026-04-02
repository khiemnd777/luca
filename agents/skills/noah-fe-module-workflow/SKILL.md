---
name: noah-fe-module-workflow
description: Use when implementing or modifying frontend work in Noah so changes follow the existing module registration, route metadata, API wrapper, mapper, schema, table, and widget patterns.
---

# Noah Frontend Module Workflow

Use this skill for work under `fe/**`.

## Stack assumptions

- React + TypeScript
- Vite
- MUI and shared UI primitives
- module auto-loading via `src/core/index.ts`
- route registration via feature `index.tsx`

## Required reading

1. `/AGENTS.md`
2. `/fe/AGENTS.md`
3. `fe/src/core/index.ts`
4. the target feature `fe/src/features/<feature>/index.tsx`

## Frontend shape to preserve

Prefer feature-local ownership under:

- `api/`
- `model/`
- `mapper/`
- `schemas/`
- `tables/`
- `widgets/`
- `index.tsx`

Do not bypass the module system by wiring routes directly into the app shell when feature registration already handles it.

## Route and navigation rules

When adding or changing routes:

- include `key`, `title`, `path`, and `label` where applicable
- preserve `permissions`
- use `hidden: true` for internal detail pages
- keep menu ordering aligned through `priority`
- reuse existing page shells before creating new layouts

## Data flow rules

- Use the shared API client and existing feature API wrapper patterns.
- Keep DTOs, models, and mapping separated.
- Keep normalization in mapper profiles, not scattered across widgets.
- Follow the cache invalidation pattern already used by the target feature.

## UI rules

- Prefer MUI and shared primitives from `src/core` and `src/shared`.
- Reuse schema-driven forms from `src/core/form` when possible.
- Reuse table infrastructure from `src/core/table`.
- Keep the admin UI clear and operational; avoid one-off visual systems.

## Minimum implementation checklist

- update feature `index.tsx` if route/module registration changes
- update feature `api/` wrapper if the backend contract changes
- update `model/` and `mapper/` together
- update `schemas/`, `tables/`, and `widgets/` that consume changed fields
- verify route permissions and hidden-route behavior
- verify loading, error, and empty states when user-visible flows change

## Avoid

- raw `fetch` or custom axios instances
- route mounting in unrelated files
- hardcoded backend response shapes in multiple components
- custom form or table patterns for one-off screens
- broad UI refactors inside focused feature work
