---
name: noah-fe-module-workflow
description: Use when implementing or modifying frontend work in Noah so changes follow the existing module registration, route metadata, API wrapper, mapper, schema, table, and widget patterns.
---

# Noah Frontend Module Workflow

Use this skill for work under `fe/**`.

## No shortcut patch rule

- trace the owning frontend flow and root cause before editing
- do not hide defects with widget-only guards, null fallbacks, hardcoded display values, or "make it pass" conditionals
- if the correct fix crosses route metadata, API wrapper, mapper, schema, table, widget, or shared UI boundaries, update those layers coherently
- temporary mitigations require explicit user approval and must be labeled as temporary

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

For AI Assistant Platform routes:

- load the narrowest assistant skill as well:
  - `noah-assistant-runtime`
  - `noah-knowledge-runtime`
  - `noah-assistant-safety-evals`
- keep this skill focused on Noah frontend module registration, route metadata, shared UI, and data-flow discipline

## Data flow rules

- Use the shared API client and existing feature API wrapper patterns.
- Keep DTOs, models, and mapping separated.
- Keep normalization in mapper profiles, not scattered across widgets.
- Follow the cache invalidation pattern already used by the target feature.

For AI Assistant Platform UI work, use the matching assistant skill for feature-specific guidance and keep this skill focused on generic frontend composition rules.

## AutoForm contract

When work touches `fe/src/core/form` or any schema `submit.run(...)` path, trace the submit pipeline before editing payload shape:

`useAutoForm` state -> `packageData(...)` -> `hooks.mapToDto(packaged)` -> `submit.run(values)` / `submitButtons[].submit({ values })` -> `schema.afterSaved(result, ctx)`

Rules:

- `packageData(...)` produces the framework packaging shape `{ dto, collections }`, plus nested `<prop>_upsert` containers when metadata blocks target a nested prop.
- `hooks.mapToDto` receives that packaged object as input.
- `submit.run(values)` receives the exact return value of `mapToDto`, not the pre-mapped packaged shape unless `mapToDto` returns it unchanged.
- `schema.afterSaved(..., ctx)` receives the same submit shape on `ctx.values`.
- If a schema reads `values.dto`, preserve that container shape in `mapToDto`.
- If the submit handler wants a flat DTO, flatten in `mapToDto` and consume the flat object directly in `submit.run`.
- If there are no metadata blocks and no `mapToDto`, the submit path currently falls back to raw `useAutoForm` state instead of packaged values.
- Before changing form submit shape, inspect `auto-form.tsx`, `auto-form-package.tsx`, and every current `submit.run` consumer for that schema.

When to keep `mapToDto`:

- keep it for form-state to submit-shape transformation
- keep it when the schema needs to flatten packaged values into a domain submit DTO
- keep it when a schema intentionally preserves `{ dto, collections }`
- keep it when you need to make the submit contract explicit instead of relying on the raw-state fallback

When to move normalization into feature `api/*.ts` or nearby feature utilities:

- backend wire keys are backend-specific or numerically suffixed
- transport quirks should not leak into widgets or generic form code
- the schema should stay stable while the feature API normalizes the outgoing payload

Safe patterns:

- packaged/container submit: `mapToDto` preserves `{ dto, collections }`, `submit.run(values)` reads `values.dto`
- flat DTO submit: `mapToDto` returns `packaged.dto`, `submit.run(values)` reads the flat DTO directly
- flat DTO plus API normalization: `mapToDto` returns the flat DTO, feature `api/*.ts` normalizes backend-specific wire keys

Unsafe patterns:

- changing `mapToDto` output shape without updating `submit.run`
- assuming `values.dto` always exists
- burying transport-shape fixes inside widgets or shared form code
- trusting generic `camel_to_snake` conversion for numeric suffix keys without tracing serialized output

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

Assistant-platform frontend usually also requires the matching assistant skill for feature-local admin/UI specifics.

## Avoid

- raw `fetch` or custom axios instances
- route mounting in unrelated files
- hardcoded backend response shapes in multiple components
- custom form or table patterns for one-off screens
- broad UI refactors inside focused feature work
- scattering utility logic across widgets/components when it belongs in `utils/*.utils.ts`
- abstracting too early in the name of SOLID or DRY when there is no repeated pattern yet
