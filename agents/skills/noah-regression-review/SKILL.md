---
name: noah-regression-review
description: Use when reviewing or finishing Noah changes to identify likely regressions around feature ownership, contracts, permissions, caching, realtime, jobs, and registration patterns before sign-off.
---

# Noah Regression Review

Use this skill for code review, self-review before completion, or when a task is risky enough that side effects must be traced explicitly.

## No shortcut patch rule

- treat symptom-only fixes, guard-only suppressions, hardcoded fallbacks, and "make it pass" edits as suspected regressions unless proven to be the correct design
- trace the owning layer and root cause before declaring a shortcut acceptable
- if the real fix crosses architecture, contract, auth, cache, job, or registration boundaries, require those layers to be updated coherently
- temporary mitigations require explicit user approval and must be labeled as temporary

## Review priority

Look for:

1. broken architecture boundaries
2. auth or permission regressions
3. FE/API contract mismatches
4. missing mapper or model updates
5. registration or boot omissions
6. stale cache, realtime, search, or job side effects
7. missing tests or unverified flows

## Review method

Trace the affected flow end-to-end:

- entry point
- route registration
- handler/controller
- service/use-case
- repository/query
- DTO/model/mapper
- UI consumer

Do not stop at the file that changed if downstream assumptions are obvious.

## High-risk trigger list

- new or changed route paths
- permission changes
- payload shape changes
- status or enum changes
- schema/migration changes
- feature registration changes
- new background jobs or cron registrations
- cache, websocket, pubsub, metadata, or search integrations

Assistant Platform work is high-risk when it changes grounding, prompt/runtime attribution, visibility filtering, or admin destructive flows. Load the matching assistant skill for the detailed workflow checks.

For schema or migration reviews, explicitly check:

- raw SQL `ALTER` statements are idempotent
- `IF EXISTS` / `IF NOT EXISTS` is used where supported
- fallback existence guards are present where built-in syntax is unavailable

## Output rules

When findings exist, report concrete issues first, ordered by severity, with file and line references.

If no findings are discovered:

- say so explicitly
- mention residual risks
- mention what was not verified

## Minimum verification checklist

- affected route/handler registration still works
- frontend route metadata still matches navigation expectations
- mapper/model updates are complete
- permissions are preserved
- changed mutations do not leave stale reads behind
- nearby tests were updated or the missing coverage was called out

For AI Assistant Platform changes, also verify:

- citations only reference retrieved chunks
- permissions and visibility boundaries are preserved
- profile/prompt/model attribution still lands in traces

## Avoid

- review summaries that only restate the diff
- approving contract or permission changes without tracing both sides
- assuming hidden pages, comments, or UI affordances enforce backend safety
