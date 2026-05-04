# Module Inventory

## Purpose

This file is a navigation index for agents and engineers. Use it to find the likely owning layer before inspecting implementation files.

Rules:

- Treat this inventory as a starting index, not source of truth.
- Verify the nearest source files before editing.
- Keep claims evidence-backed with real paths.
- Do not infer business behavior from names alone.
- Update this file when module, feature, ownership, registration, or FE/API navigation changes land.
- Update `docs/tech-stack-inventory.md` when runtime, dependency, infrastructure, CI/CD, deployment, or tooling changes land.
- For staff, user, or department identity flows, read `docs/identity-contract.md` before editing.

Status values:

- `Registered`: module or feature has repo evidence for active registration.
- `Feature files only`: feature-owned files exist, but no `index.tsx` registration was confirmed.
- `Platform`: shared/runtime capability or cross-cutting module.
- `Verify before edit`: path exists, but ownership or runtime use needs local tracing.

## Backend Runtime Modules

| Module | Route | Status | Primary Evidence | First Files To Inspect |
| --- | --- | --- | --- | --- |
| `api/modules/attribute` | `/api/attribute` | Registered | `api/modules/attribute/config.yaml` | `handler/`, `service/`, `repository/`, `model/` |
| `api/modules/auditlog` | `/api/audit` | Platform | `api/modules/auditlog/config.yaml` | `handler/`, `service/pubsub.go`, `repository/`, `ent/` |
| `api/modules/auth` | `/api/auth` | Platform | `api/modules/auth/config.yaml` | `handler/`, `service/`, `repository/`, `model/` |
| `api/modules/folder` | `/api/folder` | Registered | `api/modules/folder/config.yaml` | `handler/`, `service/`, `repository/` |
| `api/modules/main` | `/api/department` | Registered | `api/modules/main/config.yaml`, `api/modules/main/registry/registry.go` | `department/`, `features/*/registry.go`, `registry/` |
| `api/modules/metadata` | `/api/metadata` | Platform | `api/modules/metadata/config.yaml` | `handler/`, `service/`, `repository/`, `model/` |
| `api/modules/notification` | `/api/notification` | Registered | `api/modules/notification/config.yaml` | `handler/`, `service/`, `repository/`, `notificationModel/` |
| `api/modules/observability` | `/api/observability` | Platform | `api/modules/observability/config.yaml` | `handler/`, `service/`, `repository/`, `model/` |
| `api/modules/photo` | `/api/photo` | Registered | `api/modules/photo/config.yaml` | `handler/`, `service/`, `repository/`, `jobs/` |
| `api/modules/profile` | `/api/profile` | Registered | `api/modules/profile/config.yaml` | `handler/`, `service/`, `repository/`, `model/` |
| `api/modules/rbac` | `/api/rbac` | Platform | `api/modules/rbac/config.yaml` | `handler/`, `service/`, `repository/` |
| `api/modules/realtime` | `/ws` | Platform | `api/modules/realtime/config.yaml` | `handler/`, `service/pubsub.go`, `repository/` |
| `api/modules/search` | `/api/search` | Platform | `api/modules/search/config.yaml` | `handler/`, `service/`, `repository/`, `guard/` |
| `api/modules/token` | `/api/token` | Registered | `api/modules/token/config.yaml` | `handler/`, `service/`, `repository/`, `jobs/` |
| `api/modules/user` | `/api/user` | Registered | `api/modules/user/config.yaml` | `handler/`, `service/`, `repository/`, `model/`; read `docs/identity-contract.md` for identity-sensitive work |

## Backend Main Module Features

These features live under `api/modules/main` and register through `api/modules/main/registry/registry.go` unless noted otherwise.

| Feature | Status | Primary Evidence | First Files To Inspect | FE Counterpart |
| --- | --- | --- | --- | --- |
| `department` | Registered | `api/modules/main/department/handler/handler.go` | `api/modules/main/department/`; read `docs/identity-contract.md` | `fe/src/features/department` |
| `features/__relation` | Platform | `api/modules/main/features/__relation/registry.go` | `handler/`, `service/`, `repository/`, `registrar/`, `policy/` | None confirmed |
| `features/brand` | Registered | `api/modules/main/features/brand/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/brand_name` |
| `features/catalog_ref_code` | Verify before edit | `api/modules/main/features/catalog_ref_code/service.go` | `service.go` | None confirmed |
| `features/category` | Registered | `api/modules/main/features/category/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/category` |
| `features/clinic` | Registered | `api/modules/main/features/clinic/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/clinic` |
| `features/customer` | Registered | `api/modules/main/features/customer/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/customer` |
| `features/dashboard` | Registered | `api/modules/main/features/dashboard/registry.go` | dashboard subfeatures and `shared/` | `fe/src/features/dashboard` |
| `features/dentist` | Registered | `api/modules/main/features/dentist/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/dentist` |
| `features/material` | Registered | `api/modules/main/features/material/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/material` |
| `features/order` | Registered | `api/modules/main/features/order/registry.go` | `handler/`, `service/`, `repository/`, `jobs/`, `middleware/`, `template/` | `fe/src/features/order` |
| `features/patient` | Registered | `api/modules/main/features/patient/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/patient` |
| `features/process` | Registered | `api/modules/main/features/process/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/process` |
| `features/product` | Registered | `api/modules/main/features/product/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/product` |
| `features/promotion` | Registered | `api/modules/main/features/promotion/registry.go` | `handler/`, `service/`, `repository/`, `engine/`, `validator/`, `contextbuilder/`, `model/` | `fe/src/features/promotion` |
| `features/raw_material` | Registered | `api/modules/main/features/raw_material/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/raw_material` |
| `features/restoration_type` | Registered | `api/modules/main/features/restoration_type/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/restoration_type` |
| `features/section` | Registered | `api/modules/main/features/section/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/section` |
| `features/staff` | Registered | `api/modules/main/features/staff/registry.go` | `handler/`, `service/`, `repository/`; read `docs/identity-contract.md` | `fe/src/features/staff` |
| `features/supplier` | Registered | `api/modules/main/features/supplier/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/supplier` |
| `features/technique` | Registered | `api/modules/main/features/technique/registry.go` | `handler/`, `service/`, `repository/` | `fe/src/features/technique` |

## Frontend Features

| Feature | Status | Primary Evidence | Owned Folders |
| --- | --- | --- | --- |
| `fe/src/features/auth` | Registered | `fe/src/features/auth/index.tsx` | `schemas/`, `widgets/` |
| `fe/src/features/brand_name` | Feature files only | `fe/src/features/brand_name/api/brand_name.api.ts` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/` |
| `fe/src/features/category` | Registered | `fe/src/features/category/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/`, `components/`, `utils/` |
| `fe/src/features/clinic` | Registered | `fe/src/features/clinic/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/`, `components/` |
| `fe/src/features/customer` | Registered | `fe/src/features/customer/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/` |
| `fe/src/features/dashboard` | Registered | `fe/src/features/dashboard/index.tsx` | `api/`, `model/`, `mapper/`, `tables/`, `widgets/`, `components/`, `context/`, `presentation/` |
| `fe/src/features/dentist` | Registered | `fe/src/features/dentist/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/`, `components/` |
| `fe/src/features/department` | Registered | `fe/src/features/department/index.tsx` | `api/`, `model/`, `schemas/`, `tables/`, `widgets/`, `components/`, `utils/`; read `docs/identity-contract.md` |
| `fe/src/features/material` | Registered | `fe/src/features/material/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/`, `components/`, `utils/` |
| `fe/src/features/metadata` | Registered | `fe/src/features/metadata/index.tsx` | Verify before edit |
| `fe/src/features/notification` | Registered | `fe/src/features/notification/index.tsx` | `widgets/`, `components/` |
| `fe/src/features/observability_logs` | Registered | `fe/src/features/observability_logs/index.tsx` | `api/`, `model/`, `tables/`, `pages/`, `components/` |
| `fe/src/features/order` | Registered | `fe/src/features/order/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/`, `pages/`, `components/`, `utils/`, `config/` |
| `fe/src/features/patient` | Registered | `fe/src/features/patient/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/`, `components/` |
| `fe/src/features/process` | Registered | `fe/src/features/process/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/`, `utils/` |
| `fe/src/features/product` | Registered | `fe/src/features/product/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/`, `components/` |
| `fe/src/features/promotion` | Registered | `fe/src/features/promotion/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/` |
| `fe/src/features/raw_material` | Feature files only | `fe/src/features/raw_material/api/raw_material.api.ts` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/` |
| `fe/src/features/rbac` | Registered | `fe/src/features/rbac/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/`, `components/` |
| `fe/src/features/restoration_type` | Feature files only | `fe/src/features/restoration_type/api/restoration_type.api.ts` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/` |
| `fe/src/features/search` | Registered | `fe/src/features/search/index.tsx` | `widgets/`, `components/` |
| `fe/src/features/section` | Registered | `fe/src/features/section/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/`, `components/` |
| `fe/src/features/settings` | Registered | `fe/src/features/settings/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `widgets/`, `components/` |
| `fe/src/features/staff` | Registered | `fe/src/features/staff/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/`, `utils/`; read `docs/identity-contract.md` |
| `fe/src/features/supplier` | Registered | `fe/src/features/supplier/index.tsx` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/` |
| `fe/src/features/technique` | Feature files only | `fe/src/features/technique/api/technique.api.ts` | `api/`, `model/`, `mapper/`, `schemas/`, `tables/`, `widgets/` |

## Cross-Boundary Hints

These hints are conservative routing aids. Verify the FE API wrapper and backend handler before editing any contract.

| Frontend Area | Likely API Owner | Status | Notes |
| --- | --- | --- | --- |
| `fe/src/features/order` | `api/modules/main/features/order` | Registered | Check jobs, middleware, templates, and FE mappers before contract edits. |
| `fe/src/features/staff` | `api/modules/main/features/staff` | Registered | Identity-sensitive; read `docs/identity-contract.md`. |
| `fe/src/features/department` | `api/modules/main/department` | Registered | Identity-sensitive; department admin contract uses `users.id`. |
| `fe/src/features/category` | `api/modules/main/features/category` | Registered | Verify route and mapper before edit. |
| `fe/src/features/product` | `api/modules/main/features/product` | Registered | Verify route and mapper before edit. |
| `fe/src/features/metadata` | `api/modules/metadata` | Platform | Verify metadata model and import/export flow before edit. |
| `fe/src/features/rbac` | `api/modules/rbac` | Platform | Permission-sensitive; verify backend authorization, not only UI visibility. |
| `fe/src/features/notification` | `api/modules/notification` | Registered | Verify realtime/push side effects before edit. |
| `fe/src/features/observability_logs` | `api/modules/observability` | Platform | Verify Loki/query shape before edit. |
| `fe/src/features/search` | `api/modules/search` | Platform | Verify search guard/indexing assumptions before edit. |
