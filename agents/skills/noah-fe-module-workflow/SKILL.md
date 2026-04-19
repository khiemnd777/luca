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

When frontend code needs feature-local helper functions:

- place reusable helper logic under the feature's `utils/` folder
- name utility files with the `*.utils.ts` suffix
- keep utilities focused on a single responsibility and free of UI rendering concerns

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

## AutoForm contract

When work touches `fe/src/core/form` or any schema `submit.run(...)` path, trace the submit pipeline before editing payload shape:

`useAutoForm` state -> `packageData(...)` -> `hooks.mapToDto(packaged)` -> `submit.run(values)` / `submitButtons[].submit({ values })`

Rules:

- `packageData(...)` produces the framework packaging shape `{ dto, collections }`.
- `hooks.mapToDto` receives that packaged object as input.
- `submit.run(values)` receives the exact return value of `mapToDto`, not the pre-mapped packaged shape unless `mapToDto` returns it unchanged.
- If a schema reads `values.dto`, preserve that container shape in `mapToDto`.
- If the submit handler wants a flat DTO, flatten in `mapToDto` and consume the flat object directly in `submit.run`.
- Before changing form submit shape, inspect `auto-form.tsx`, `auto-form-package.tsx`, and every current `submit.run` consumer for that schema.

When to keep `mapToDto`:

- keep it for form-state to submit-shape transformation
- keep it when the schema needs to flatten packaged values into a domain submit DTO
- keep it when a schema intentionally preserves `{ dto, collections }`

When to move normalization into feature `api/*.ts` or nearby feature utilities:

- backend wire keys are backend-specific or numerically suffixed
- transport quirks should not leak into widgets or generic form code
- the schema should stay stable while the feature API normalizes the outgoing payload

Do not assume generic `camel_to_snake` conversion is sufficient for backend wire contracts with digits. Verify the actual serialized keys in tests or by tracing the packaged output.

## UI rules

- Prefer MUI and shared primitives from `src/core` and `src/shared`.
- Reuse schema-driven forms from `src/core/form` when possible.
- Reuse table infrastructure from `src/core/table`.
- Keep the admin UI clear and operational; avoid one-off visual systems.
- Follow SOLID in a pragmatic way: keep modules small, keep responsibilities separated, and depend on existing abstractions instead of feature-local ad hoc layers.
- Follow DRY by reusing nearby feature patterns and shared infrastructure when repetition is real; do not duplicate helpers, API wrappers, or mapping logic across components.

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
- scattering utility logic across widgets/components when it belongs in `utils/*.utils.ts`
- abstracting too early in the name of SOLID or DRY when there is no repeated pattern yet
