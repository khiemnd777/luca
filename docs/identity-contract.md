# Identity Contract

## Purpose

This document is the technical source of truth for identity usage across staff, user, and department flows.

Read this file before changing any code that touches:

- `users`
- `staffs`
- `departments`
- staff-related route params
- department administrator assignment or unassignment

## Canonical Identity Map

| Concept | Canonical ID |
| --- | --- |
| User account | `users.id` |
| Staff record | `staffs.id` |
| Staff-to-user link | `staffs.user_staff -> users.id` |
| Department administrator | `departments.administrator_id = users.id` |
| Staff DTO in frontend | currently uses `users.id` |

## Entity Reference

| Entity | Primary key | Foreign key / identity link | Notes |
| --- | --- | --- | --- |
| `users` | `users.id` | - | Account identity |
| `staffs` | `staffs.id` | `staffs.user_staff -> users.id` | Staff record identity is separate from account identity |
| `departments` | `departments.id` | `departments.administrator_id -> users.id` | Administrator identity always uses `users.id` |

## Endpoint And Flow Contract

Use this table by flow semantics even when exact route paths differ between modules.

| Flow / endpoint semantics | Expected identity | Contract |
| --- | --- | --- |
| Department admin assignment | `users.id` | Write `departments.administrator_id` with `users.id`, never `staffs.id` |
| Department admin unassignment | `users.id` | Resolve and clear admin ownership by `users.id`, never `staffs.id` |
| Frontend staff DTO references | `users.id` | Treat current frontend staff DTO identity as `users.id` unless the contract is explicitly changed |
| Staff record persistence | `staffs.id` | Use `staffs.id` only when the flow explicitly targets the staff record itself |
| `staff/**` route params named `id` | verify before edit | Do not infer `users.id` or `staffs.id` from the param name alone |

## Required Rules

- Never assume a route param named `id` in `staff/**` means `staffs.id`.
- Before editing any staff/user/department flow, explicitly verify whether the flow uses `users.id` or `staffs.id`.
- For department admin assignment/unassignment, the contract uses `users.id`.
- Do not write code that accepts both `users.id` and `staffs.id` in the same endpoint unless compatibility mode is explicitly requested.

## Naming Rules

- Use `userID` for `users.id`.
- Use `staffRecordID` for `staffs.id`.
- Do not use ambiguous names like `staffID` unless the variable truly means `staffs.id`.

## Review Checklist

Before shipping any change in this area, verify:

- route params are mapped to the correct identity domain
- DTOs and mappers preserve the canonical ID contract
- department admin flows read and write `users.id`
- variable names make the identity domain explicit
- the endpoint does not silently accept both identity domains unless explicitly requested
