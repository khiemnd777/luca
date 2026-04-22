---
name: noah-contract-sync
description: Use when a Noah task changes data crossing the FE/API boundary so request shapes, response shapes, models, mappers, permissions, and invalidation behavior are updated coherently on both sides.
---

# Noah Contract Sync

Use this skill whenever a task changes an endpoint, payload shape, response field, route behavior, or permission-sensitive user flow across frontend and backend.

## No shortcut patch rule

- trace the real contract owner and root cause before editing
- do not hide contract drift with mapper-only band-aids, frontend-only guards, backend-only aliases, or "make it pass" fallbacks
- if the correct fix crosses handler, service, DTO, API wrapper, mapper, or UI consumer boundaries, update those layers coherently
- temporary mitigations require explicit user approval and must be labeled as temporary

## Goal

Prevent partially wired changes across the FE/API boundary.

## Required inspection

Backend side:

- handler request/response handling
- service orchestration
- repository data shape
- auth and permission checks

Frontend side:

- feature API wrapper
- model definitions
- mapper profiles
- schemas, tables, widgets, and pages consuming the data

## Contract checklist

- request fields added, removed, or renamed
- response fields added, removed, or renamed
- nullability and default values
- enum or status value changes
- route path and route params
- permission assumptions
- error envelope and failure-state handling
- cache invalidation or stale list/detail reads

For AI Assistant Platform changes, explicitly review the assistant-specific contract surface and load the matching assistant skill for detailed workflow and payload ownership.

## Decision rules

- Update both sides in one coherent change unless the contract is intentionally backward-compatible.
- Keep DTO-to-model mapping centralized.
- Do not let UI components depend directly on transport naming.
- If the backend becomes more restrictive, verify frontend affordances and error handling still match.

## Minimum delivery checklist

- backend payload and service logic updated
- frontend API wrapper updated
- frontend mapper/model updated
- affected schemas/tables/widgets updated
- permissions verified end-to-end
- manual or automated verification noted for list, detail, create, update, or delete flows touched by the change

## Avoid

- changing only the backend and expecting the mapper layer to absorb it implicitly
- leaking raw backend field names into many UI files
- skipping invalidation after mutations that affect tables or detail views
