---
name: noah-assistant-platform
description: Use when a Noah task targets the AI Assistant Platform broadly or ambiguously and you need to preserve the platform split between knowledge runtime, assistant runtime, prompt governance, citations, safety, evaluation, and admin operations.
---

# Noah Assistant Platform

Use this skill when the task clearly belongs to the Assistant Platform but is not yet narrow enough to stay inside only one specialized area.

## No shortcut patch rule

- trace the owning platform boundary and root cause before editing
- do not hide defects with local guards, fallback payloads, hardcoded values, or "make it pass" conditionals
- if the correct fix crosses runtime, knowledge, safety, FE/API contract, permission, or trace boundaries, update those layers coherently
- temporary mitigations require explicit user approval and must be labeled as temporary

## Use this for

- platform-wide assistant changes spanning both `api/**` and `fe/**`
- tasks that touch both `api/modules/assistant` and `api/modules/knowledge`
- tasks that affect runtime orchestration, admin governance, or assistant-platform contracts broadly
- ambiguous assistant work where the first job is to decide whether it belongs to runtime, knowledge, or safety/evals

## Assistant Platform ownership map

- `api/modules/assistant`: sessions, messages, profiles, prompt versions, policies, traces, feedback, evals, tool proposals, provider execution
- `api/modules/knowledge`: sources, documents, ingestion jobs, parsing, chunking, embeddings, taxonomy, visibility, indexing state
- `fe/src/features/assistant`: session, review, trace, citation, feedback, eval admin surfaces
- `fe/src/features/assistant_profiles`: profile, prompt-version, and policy admin surfaces
- `fe/src/features/knowledge`: source/document/job admin surfaces

## Required reading

1. `/AGENTS.md`
2. `/fe/AGENTS.md` if `fe/**` is involved
3. `agents/skills/README.md`
4. the nearest specialized assistant skill if the task narrows:
   - `noah-assistant-runtime`
   - `noah-knowledge-runtime`
   - `noah-assistant-safety-evals`

## Platform invariants

- keep knowledge ingestion concerns out of assistant runtime handlers and widgets
- keep provider execution, prompt compilation, and turn orchestration in `api/modules/assistant`
- keep uploaded document content out of system/profile prompt layers
- preserve session-level locking for profile and prompt version when the runtime expects stable traces
- preserve source grounding:
  - citations must come only from retrieved chunks
  - `admin_only` knowledge must never leak into public retrieval
- preserve admin auditability:
  - traces, reviews, prompt versions, and eval outcomes must stay inspectable

## Routing and contract checks

When the task affects UI/admin surfaces, verify:

- `AI` menu grouping remains coherent
- hidden detail routes stay hidden
- route permissions remain feature-local
- strings remain routed through `api/languages/en.xml`

When the task affects runtime/API behavior, verify:

- session/profile/knowledge payloads stay coherent across FE and API
- chat responses preserve `answer`, `citations`, `confidence`, `safety`, `profile`, `proposed_actions`, `requires_confirmation`, and `trace_id`
- prompt/compiler/provider changes still produce traceable turn records

## Decision rule

If the task becomes obviously narrow, switch focus to the matching specialized assistant skill rather than keeping all logic in this umbrella skill.
