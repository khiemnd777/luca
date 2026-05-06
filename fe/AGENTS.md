# AGENTS.md

## Purpose

This frontend is a modular, route-registered admin application where features compose themselves into the app through shared infrastructure instead of manual wiring.

Agents working in this repo should preserve the existing architecture, prefer shared primitives over custom one-off implementations, and fit new work into the established module, schema, table, widget, mapper, and API client patterns.
For any UI-facing work under `fe/**`, read `/DESIGN.md` before editing and follow it as the default visual source of truth unless the target module already has a more specific implemented pattern to preserve.

## Scope

This file applies to the frontend subtree only:
- `fe/**`

It supplements the root repository policy in `/AGENTS.md` with frontend-specific implementation guidance.

## Precedence

Within `fe/**`, use this order when instructions overlap:
- direct user request
- this `fe/AGENTS.md`
- the root `/AGENTS.md`
- local feature conventions already present in the edited module

If this file is silent on a topic, follow the root `AGENTS.md`.

## Decision Order

When tradeoffs exist in frontend work, prefer decisions in this order:
- preserve module registration and route ownership
- preserve auth, permission, and navigation semantics
- preserve API contract compatibility and mapper boundaries
- preserve the current visual language documented in `/DESIGN.md`
- reuse existing frontend infrastructure and visual language
- make the smallest coherent change that fully solves the task

## Stack

- **React 19**
- **TypeScript** with `strict` mode
- **Vite**
- **Material UI** and **MUI X Data Grid**
- **React Router**
- **Zustand**
- **Axios**
- **Day.js**
- **Recharts**
- **@dnd-kit**
- **react-hot-toast**

## Project Layout

- `src/app`: app shell, theme, router
- `src/core`: shared platform infrastructure
- `src/features`: business modules
- `src/shared`: lower-level reusable UI and utilities
- `src/mapper`: mapper profiles for DTO-to-model transformations
- `scripts/create-module`: scaffolding for new modules

## Import Conventions

Use path aliases instead of deep relative imports:

- `@root/*` -> `src/*`
- `@core/*` -> `src/core/*`
- `@features/*` -> `src/features/*`
- `@shared/*` -> `src/shared/*`
- `@store/*` -> `src/store/*`
- `@routes/*` -> `src/routes/*`
- `@pages/*` -> `src/pages/*`

Prefer absolute alias imports for readability and consistency.

## Architectural Rules

### 1. Register features through the module system

Feature modules are auto-loaded from `src/features/**/index.tsx` by `src/core/index.ts`.

New feature work should usually be expressed through:

- a module registration in `src/features/<feature>/index.tsx`
- route nodes registered with `registerModule(...)`
- widgets under `widgets/`
- schemas under `schemas/`
- tables under `tables/`
- APIs under `api/`
- models under `model/`
- mapper profiles under `mapper/`

Do not hand-wire feature imports into the app shell when the module registry can do it.

### 2. Preserve route metadata and permission-driven navigation

Routes are collected through `listRoutes()` and wrapped by `RequireAuth`.

When adding or changing routes:

- include `key`, `title`, `path`, and `label` when applicable
- attach `permissions` when the route is protected
- use `hidden: true` for internal detail pages that should not appear in menus
- keep menu order aligned through `priority`

Do not bypass the permission model by mounting pages directly in `src/app/routes.tsx` unless the page is explicitly public.

### 3. Reuse shared page containers

Many feature routes use shared page shells such as:

- `@core/pages/one-column-page`
- `@core/pages/general-page`

Prefer existing page shells before introducing a new layout abstraction.
Check `/DESIGN.md` before introducing or reshaping page-level UI so spacing, toolbar behavior, surface usage, and information density stay aligned with the current admin design language.

### 4. Prefer widgets, schemas, and tables over hardcoded screens

This codebase is designed around configurable building blocks:

- widgets compose page sections and actions
- schemas define forms
- tables define list/detail tabular views
- metadata and mapper layers adapt backend data for UI use

If a feature resembles an existing CRUD or detail flow, extend the established abstractions instead of building isolated form state and tables from scratch.

## Data and API Rules

### 5. Use the shared API client

Use the shared API layer under `src/core/network` instead of ad hoc `fetch` or local Axios instances.

Preferred behavior:

- use `api-client.ts` patterns for authenticated requests
- use cache tags and invalidation where list/detail data can become stale
- preserve token refresh behavior and login redirection semantics
- keep endpoint wrappers inside feature-specific `api/` modules

When mutating data, invalidate the relevant cache tags or prefixes.

If multiple cache or invalidation patterns appear to exist, follow the one already used by the target feature instead of introducing a new variant.

### 6. Keep DTOs, models, and mapper profiles separated

This repo already distinguishes transport data from UI-facing models. Follow that separation:

- API responses and request shapes live near `api/` or DTO/model files
- mapping logic belongs in `src/mapper/profiles` or feature-local `mapper/`
- UI components should consume normalized model shapes when possible

Do not spread backend response-shape assumptions across multiple components.

### 7. Respect realtime infrastructure

The app includes websocket providers and widgets under `src/core/network/websocket` plus feature websocket widgets in places like `src/features/order/widgets`.

When implementing realtime behavior:

- prefer the existing websocket provider/hooks
- integrate with existing widget or event-driven patterns
- avoid parallel websocket stacks

## UI Rules

### 8. Stay inside MUI and shared UI primitives

Default UI choices should be:

- MUI components
- shared components from `src/shared/components`
- shared page/layout primitives from `src/core` and `src/shared`

Before creating a new component, check whether there is already a matching primitive for:

- dialogs
- status boards
- uploads
- badges
- toolbars
- grids
- loading states
- tabs
- empty states

### 9. Reuse form infrastructure

Forms should prefer the shared auto-form stack in `src/core/form`.

Use schema-driven definitions when feasible. The form system already supports:

- text and numeric fields
- select and autocomplete
- async option loading
- search-backed fields
- validation and async validation
- file/image upload
- QR-related fields
- grouped fields
- dialog-hosted forms

Avoid introducing a separate form framework unless there is a strong repo-wide reason.

### 10. Reuse table infrastructure

Lists and admin grids should prefer the shared table layer in `src/core/table`.

Use feature-local table definitions under `tables/` and keep list fetching, columns, and row actions aligned with the table registry approach already used in the codebase.

### 11. Respect existing visual language

This is an internal admin system. Optimize for clarity and operational efficiency:

- consistent spacing and labels
- readable table/action flows
- minimal visual novelty
- explicit loading, error, and empty states

Do not introduce a disconnected design system or heavily stylized UI direction for isolated features.
Use `/DESIGN.md` as the first reference for visual rules, anti-patterns, and agent prompts when building new UI.

## Feature Conventions

### 12. Follow the existing feature folder shape

A typical feature may include:

- `index.tsx`
- `api/`
- `model/`
- `mapper/`
- `schemas/`
- `tables/`
- `widgets/`
- `components/`
- `pages/`
- `utils/`
- `config/`

Not every feature needs every folder, but new code should land in the nearest established location rather than in unrelated shared folders.

When a feature needs reusable frontend helpers:

- keep them in the owning feature's `utils/` folder unless they are clearly shared across features
- use the `*.utils.ts` suffix for utility files
- keep utility files non-visual and narrowly scoped

### 13. Prefer incremental extension of dense domains

The order domain is a current local example of a dense feature area and already includes:

- order CRUD and detail flows
- historical views
- process tracking
- QR and check-code flows
- print and delivery helpers
- promotion-aware pricing
- material and product sub-records
- websocket-driven updates
- audit log registration

For changes in this area, inspect existing order components, widgets, tables, schemas, and APIs before adding new patterns.

### 14. Preserve hidden/internal routes for detail screens

Several modules expose user-facing parent routes and hide detail routes from menus. When adding detail pages:

- keep them under the same feature module
- mark them hidden if they are not primary navigation destinations
- preserve permission requirements across parent/detail flows

## Auth and Access Control

### 15. Never bypass auth guard semantics

Protected routes are expected to work with:

- access token presence and expiry checks
- refresh token recovery
- redirect to `/login`
- redirect to `/forbidden` on insufficient permission

Do not add custom auth checks inside random components when route-level permission handling is the right place.

### 16. Permissions matter more than visibility

Hiding a menu item is not authorization. When adding any privileged view or action:

- guard the route with permissions
- gate the action in the relevant component if needed
- keep permission names consistent with existing naming patterns such as `order.view`, `staff.update`, `rbac.manage`

## Naming and Coding Style

### 17. Match local naming patterns

This codebase commonly uses:

- kebab-case file names
- suffixes such as `.widget.tsx`, `.table.ts`, `.schema.tsx`, `.api.ts`, `.model.ts`, `.profile.ts`
- feature-first naming, for example `order-process-check-code.widget.tsx`

Follow those conventions for new files.

### 18. Keep TypeScript explicit and narrow

- prefer concrete interfaces/types for feature models
- avoid `any`
- keep utility helpers typed
- preserve strict-mode compatibility

Apply SOLID pragmatically:

- keep a single responsibility per module/file where feasible
- keep transformation, remote calls, and presentation separated by the existing `mapper/`, `api/`, and `widgets/components` boundaries
- depend on existing shared abstractions before adding feature-local indirection

### 19. Be conservative with abstraction

Abstract only when there is a repeated pattern already visible across modules. Do not generalize a one-off screen prematurely.

### 20. Prefer DRY without forcing premature abstractions

- reuse existing helpers, mappers, page shells, form definitions, and table infrastructure when the same behavior already exists
- do not duplicate utility logic across widgets/components when it can live once in `utils/*.utils.ts` or an existing shared abstraction
- avoid creating new abstractions only to satisfy DRY when the repetition is not yet stable

## Operational Guidance for Agents

### 21. Before making changes

- read `/DESIGN.md` for frontend visual rules when the task affects UI, layout, forms, tables, dialogs, or page composition
- inspect the target feature's `index.tsx`
- inspect existing `schemas/`, `tables/`, `widgets/`, and `api/`
- check whether a shared core abstraction already solves the problem
- verify the permission model and route placement

For common frontend changes, inspect at least:

Feature/page changes:
- `/DESIGN.md`
- target feature `index.tsx`
- route metadata and parent/detail route placement
- nearby `widgets/`, `schemas/`, `tables/`, and `api/`

API integration changes:
- feature `api/`
- mapper or model files
- shared network usage and invalidation pattern
- UI components consuming the mapped model

Shared infrastructure changes:
- the owning file under `src/core` or `src/shared`
- at least one existing feature using that abstraction
- downstream assumptions before widening behavior

### 22. When adding a new module

Prefer using the scaffold command:

```bash
bun run create:module <module_name> "<Label>"
```

Then adapt the generated structure to the feature instead of building it manually from nothing.

### 23. When touching shared core code

Changes under `src/core` affect many modules. Make narrow changes, verify downstream assumptions, and avoid feature-specific logic leaking into shared infrastructure unless it is truly reusable.

### 24. Keep business logic out of presentational components

Favor this layering:

- `api/` for remote calls
- `mapper/` for transformation
- `model/` for typed entities
- `widgets/components` for presentation and feature interaction

### 25. Prefer extension over duplication

If a nearby feature already implements a similar workflow, copy its architectural approach, not just its UI.

## What Good Changes Look Like

A good change in this repo usually:

- lands in the correct feature folder
- registers itself through existing module infrastructure
- uses shared forms/tables/widgets where appropriate
- respects permissions and hidden-route conventions
- routes API traffic through the shared network layer
- keeps DTO mapping centralized
- fits the admin UI style already present

## What To Avoid

- direct feature imports into the app shell when auto-registration exists
- one-off local Axios clients
- duplicating form or table state systems
- bypassing `RequireAuth` or permission checks
- mixing transport DTOs directly into many components
- creating unrelated UI patterns for a single screen
- placing feature-specific code into `src/core` without reuse justification

## Verification Expectations

For non-trivial frontend work:
- run the nearest relevant frontend checks or tests when practical
- verify route registration, permission behavior, and affected API integration paths
- if automated checks are unavailable, report the screens or flows inspected and any remaining risk
- Do not automatically start long-running local dev servers such as `npm run dev`. Only start a dev server when the user explicitly requests it or approves it for the current task.

## Exclusions

Ignore dependency-local `AGENTS.md` files under:
- `node_modules/**`

Only follow them when intentionally modifying that dependency subtree itself.
