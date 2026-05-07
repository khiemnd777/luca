# Module Inventory

## Purpose

This file is a navigation index for agents and engineers. Use it to find the likely owning layer before inspecting implementation files.

Rules:

- Treat this inventory as a starting index, not source of truth.
- Verify the nearest source files before editing.
- Keep claims evidence-backed with real paths.
- Do not infer business behavior from names alone.
- When a user names a Vietnamese UI/business label, resolve ownership through registered frontend route metadata (`label`, `title`, `path`) before choosing a module.
- Do not infer ownership from English folder names, API namespace prefixes, or route prefixes alone. In particular, `/api/department` is the `api/modules/main` namespace and does not mean every feature below it owns "Chi nhánh" behavior.
- Update this file when module, feature, ownership, registration, or FE/API navigation changes land.
- Update `docs/tech-stack-inventory.md` when runtime, dependency, infrastructure, CI/CD, deployment, or tooling changes land.
- For staff, user, or department identity flows, read `docs/identity-contract.md` before editing.

Status values:

- `Registered`: module or feature has repo evidence for active registration.
- `Feature files only`: feature-owned files exist, but no `index.tsx` registration was confirmed.
- `Platform`: shared/runtime capability or cross-cutting module.
- `Verify before edit`: path exists, but ownership or runtime use needs local tracing.

## UI Label Ownership Index

Use this section when the user refers to a screen or business concept by its displayed UI label. These rows are routing aids backed by frontend route registration; verify the listed source files before editing implementation details.

| UI Label / Screen Term | Registered FE Owner | Path Evidence | Likely API Owner | Notes |
| --- | --- | --- | --- | --- |
| `Dashboard` | `fe/src/features/dashboard` | `fe/src/features/dashboard/index.tsx` (`label: "Dashboard"`, `path: "/"`) | `api/modules/main/features/dashboard` | Dashboard subfeatures share local presentation/context code. |
| `Tài khoản` | `fe/src/features/auth` | `fe/src/features/auth/index.tsx` (`title: "Tài khoản"`, `path: "/account"`) | `api/modules/auth`, `api/modules/profile` | Verify whether the task touches auth credentials or profile data. |
| `Chọn chi nhánh` | `fe/src/core/pages/department-selection-page.tsx` | `fe/src/app/routes.tsx` (`path: "/select-department"`) | `api/modules/auth`, `api/modules/token`, `api/modules/main/department` | Post-login department selection for users with multiple active department memberships; identity-sensitive and permission-sensitive. |
| `Chi nhánh` | `fe/src/features/department` | `fe/src/features/department/index.tsx` (`label: "Chi nhánh"`, `path: "/department"`) | `api/modules/main/department` | Owns branch/department tree behavior and parent-child branch relations. Read `docs/identity-contract.md` for identity-sensitive work. |
| `Phòng ban` | `fe/src/features/section` | `fe/src/features/section/index.tsx` (`label: "Phòng ban"`, `path: "/section"`) | `api/modules/main/features/section` | Do not confuse with `department` / `Chi nhánh`. |
| `Nha khoa` | `fe/src/features/clinic` | `fe/src/features/clinic/index.tsx` (`label: "Nha khoa"`, `path: "/clinic"`) | `api/modules/main/features/clinic` | Do not treat `clinic` as `Chi nhánh` unless the user explicitly says they mean the clinic entity. |
| `Nha sĩ` | `fe/src/features/clinic` route child; feature files under `fe/src/features/dentist` | `fe/src/features/clinic/index.tsx` (`label: "Nha sĩ"`, `path: "/dentist"`) | `api/modules/main/features/dentist` | FE route is registered under the clinic module; implementation files live in the dentist feature. |
| `Bệnh nhân` | `fe/src/features/clinic` route child; feature files under `fe/src/features/patient` | `fe/src/features/clinic/index.tsx` (`label: "Bệnh nhân"`, `path: "/patient"`) | `api/modules/main/features/patient` | FE route is registered under the clinic module; implementation files live in the patient feature. |
| `Nhân sự` | `fe/src/features/staff` | `fe/src/features/staff/index.tsx` (`label: "Nhân sự"`, `path: "/staff"`) | `api/modules/main/features/staff`, `api/modules/user` when account identity is involved | Read `docs/identity-contract.md`; distinguish `users.id` from `staffs.id`; department detail add-existing flow links existing staff users to `department_members` without creating `users`. |
| `Danh mục` | `fe/src/features/category` | `fe/src/features/category/index.tsx` (`label: "Danh mục"`, `path: "/category"`) | `api/modules/main/features/category` | Parent UI route also registers category-adjacent child screens. |
| `Kiểu phục hình` | `fe/src/features/category` route child; feature files under `fe/src/features/restoration_type` | `fe/src/features/category/index.tsx` (`label: "Kiểu phục hình"`, `path: "/restoration-type"`) | `api/modules/main/features/restoration_type` | FE route is registered under the category module; implementation files live in restoration type. |
| `Công nghệ` | `fe/src/features/category` route child; feature files under `fe/src/features/technique` | `fe/src/features/category/index.tsx` (`label: "Công nghệ"`, `path: "/technique"`) | `api/modules/main/features/technique` | FE route is registered under the category module; implementation files live in technique. |
| `Vật liệu` | `fe/src/features/category` route child; feature files under `fe/src/features/raw_material` | `fe/src/features/category/index.tsx` (`label: "Vật liệu"`, `path: "/raw-material"`) | `api/modules/main/features/raw_material` | Do not confuse with `Vật tư` / `material`. |
| `Thương hiệu` | `fe/src/features/category` route child; feature files under `fe/src/features/brand_name` | `fe/src/features/category/index.tsx` (`label: "Thương hiệu"`, `path: "/brand-name"`) | `api/modules/main/features/brand` | FE folder is `brand_name`; backend feature is `brand`. |
| `Vật tư` | `fe/src/features/material` | `fe/src/features/material/index.tsx` (`label: "Vật tư"`, `path: "/material"`) | `api/modules/main/features/material` | Do not confuse with `Vật liệu` / `raw_material`. |
| `Sản phẩm` | `fe/src/features/product` | `fe/src/features/product/index.tsx` (`label: "Sản phẩm"`, `path: "/product"`) | `api/modules/main/features/product` | Verify category/product contract before mapper or import changes. |
| `Đơn hàng` | `fe/src/features/order` | `fe/src/features/order/index.tsx` (`label: "Đơn hàng"`, `path: "/order"`) | `api/modules/main/features/order` | Check jobs, middleware, templates, and FE mappers before contract edits. |
| `Xác nhận giao hàng` | `fe/src/features/order` | `fe/src/features/order/index.tsx` (`label: "Xác nhận giao hàng"`, `path: "/delivery/qr/:token"`) | `api/modules/main/features/order` | Public/tokenized delivery QR flow; verify auth/token behavior before changes. |
| `Gia công` | `fe/src/features/order` | `fe/src/features/order/index.tsx` (`label: "Gia công"`, `path: "/check-code"`) | `api/modules/main/features/order` | Processing/check-code workflow under order ownership. |
| `Tiến trình` | `fe/src/features/order` | `fe/src/features/order/index.tsx` (`label: "Tiến trình"`, `path: "/in-progresses"`) | `api/modules/main/features/order` | In-progress workflow under order ownership. |
| `Khách hàng` | `fe/src/features/customer` | `fe/src/features/customer/index.tsx` (`label: "Khách hàng"`, `path: "/customer"`) | `api/modules/main/features/customer` | Verify customer-specific contract before edit. |
| `Khuyến mãi` | `fe/src/features/promotion` | `fe/src/features/promotion/index.tsx` (`label: "Khuyến mãi"`, `path: "/promotion"`) | `api/modules/main/features/promotion` | Check engine, validator, context builder, and scope behavior. |
| `Quyền hạn` | `fe/src/features/rbac` | `fe/src/features/rbac/index.tsx` (`label: "Quyền hạn"`, `path: "/rbac"`) | `api/modules/rbac` | Permission-sensitive; verify backend authorization, not only UI visibility. |
| `Thiết lập` | `fe/src/features/settings` | `fe/src/features/settings/index.tsx` (`label: "Thiết lập"`, `path: "/settings"`) | Verify feature-local API usage | Settings may touch profile/config-like data; inspect nearest API wrapper first. |
| `Metadata` | `fe/src/features/metadata` | `fe/src/features/metadata/index.tsx` (`label: "Metadata"`, `path: "/metadata"`) | `api/modules/metadata` | Verify collection/field/import/export model before edit. |
| `Import mapping` | `fe/src/features/metadata` | `fe/src/features/metadata/index.tsx` (`label: "Import mapping"`, `path: "/import-profiles/"`) | `api/modules/metadata` | Import profile and mapping flow under metadata ownership. |
| `Thông báo` | `fe/src/features/notification` | `fe/src/features/notification/index.tsx` (`label: "Thông báo"`, `path: "/notification"`) | `api/modules/notification` | Verify realtime/push side effects before edit. |
| `System Logs` | `fe/src/features/observability_logs` | `fe/src/features/observability_logs/index.tsx` (`label: "System Logs"`, `path: "/admin/system-logs"`) | `api/modules/observability` | Verify Loki/query shape before edit. |
| `Tìm kiếm` | `fe/src/features/search` | `fe/src/features/search/index.tsx` (`label: "Tìm kiếm"`, `path: "/search"`) | `api/modules/search` | Verify search guard/indexing assumptions before edit. |

## Backend Runtime Modules

| Module | Route | Status | Primary Evidence | First Files To Inspect |
| --- | --- | --- | --- | --- |
| `api/modules/attribute` | `/api/attribute` | Registered | `api/modules/attribute/config.yaml` | `handler/`, `service/`, `repository/`, `model/` |
| `api/modules/auditlog` | `/api/audit` | Platform | `api/modules/auditlog/config.yaml` | `handler/`, `service/pubsub.go`, `repository/`, `ent/` |
| `api/modules/auth` | `/api/auth` | Platform | `api/modules/auth/config.yaml` | `handler/`, `service/`, `repository/`, `model/`; owns login and `/auth/select-department` post-login selection |
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
| `features/staff` | Registered | `api/modules/main/features/staff/registry.go` | `handler/`, `service/`, `repository/`; read `docs/identity-contract.md`; owns `/staff/add-existing` department membership flow | `fe/src/features/staff` |
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
| `fe/src/features/staff` | `api/modules/main/features/staff` | Registered | Identity-sensitive; read `docs/identity-contract.md`; department staff add-existing uses `users.id` and must not create a `users` row. |
| `fe/src/features/department` | `api/modules/main/department` | Registered | Identity-sensitive; department admin contract uses `users.id`; corp-admin assignment UI delegates assign/unassign to staff API with `users.id`. |
| `fe/src/core/pages/login-page.tsx`, `fe/src/core/pages/department-selection-page.tsx` | `api/modules/auth`, `api/modules/token`, `api/modules/main/department` | Platform | Login may return app tokens immediately or a one-time selection token plus active departments; selected department is embedded into issued app tokens. |
| `fe/src/features/category` | `api/modules/main/features/category` | Registered | Verify route and mapper before edit. |
| `fe/src/features/product` | `api/modules/main/features/product` | Registered | Verify route and mapper before edit. |
| `fe/src/features/metadata` | `api/modules/metadata` | Platform | Verify metadata model and import/export flow before edit. |
| `fe/src/features/rbac` | `api/modules/rbac` | Platform | Permission-sensitive; verify backend authorization, not only UI visibility. |
| `fe/src/features/notification` | `api/modules/notification` | Registered | Verify realtime/push side effects before edit. |
| `fe/src/features/observability_logs` | `api/modules/observability` | Platform | Verify Loki/query shape before edit. |
| `fe/src/features/search` | `api/modules/search` | Platform | Verify search guard/indexing assumptions before edit. |
