---
name: noah-auth-rbac-guard
description: Use when a Noah task touches protected routes, privileged actions, or permission-sensitive flows so auth semantics, RBAC, and scope rules are preserved on both frontend and backend.
---

# Noah Auth RBAC Guard

Use this skill when the task affects access control, protected screens, menu visibility, internal routes, role checks, or privileged backend actions.

## No shortcut patch rule

- trace the real authorization path and root cause before editing
- do not hide defects with UI-only gating, permissive fallbacks, hardcoded roles, or "make it pass" conditionals
- if the correct fix crosses frontend affordances, backend guards, shared auth utilities, or scope enforcement, update those layers coherently
- temporary mitigations require explicit user approval and must be labeled as temporary

## Core rule

Visibility is not authorization. A hidden menu item is not a permission check.

## Required inspection

Frontend:

- route metadata and `permissions`
- hidden-route behavior
- guarded navigation patterns
- any feature-level conditional action rendering

Backend:

- auth middleware
- handler-level protected routes
- service assumptions about caller identity or scope
- shared auth utilities or internal-access boundaries

## Guard checklist

- who can view the page
- who can invoke the action
- whether frontend and backend use the same permission vocabulary
- whether detail routes remain protected even when hidden from navigation
- whether create/edit/delete buttons match backend authorization
- whether tenant/org/workspace/member scope rules exist and must still apply

For AI Assistant Platform work, explicitly review assistant permissions and visibility-scope boundaries, especially that `admin_only` knowledge never becomes eligible for public assistant retrieval.

## Decision rules

- Preserve existing auth and token/session semantics.
- Prefer shared permission infrastructure over feature-local custom checks.
- If a route or action is privileged, guard it in both UI affordance and backend execution path.
- Keep permission naming consistent with nearby code.

## Minimum delivery checklist

- route permissions reviewed
- hidden routes reviewed
- backend protection reviewed
- permission labels aligned with local conventions
- unauthorized and partially authorized flows considered

## Avoid

- UI-only gating
- new isolated permission systems inside a feature
- removing a backend guard because the UI already hides the action
