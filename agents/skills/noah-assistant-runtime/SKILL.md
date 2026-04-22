---
name: noah-assistant-runtime
description: Use when a Noah task changes AI Assistant runtime behavior such as sessions, messages, assistant profiles, prompt versions, prompt compilation, model/provider execution, response shaping, traces, or generic proposed-action flows.
---

# Noah Assistant Runtime

Use this skill for assistant runtime work centered in `api/modules/assistant` and the paired admin surfaces in `fe/src/features/assistant` and `fe/src/features/assistant_profiles`.

## No shortcut patch rule

- trace the owning runtime path and root cause before editing
- do not hide defects with local guards, fallback citations, hardcoded trace fields, or "make it pass" conditionals
- if the correct fix crosses prompt compilation, provider execution, persistence, response shaping, or admin UI boundaries, update those layers coherently
- temporary mitigations require explicit user approval and must be labeled as temporary

## Required reading

1. `/AGENTS.md`
2. `/fe/AGENTS.md` if frontend is involved
3. `api/modules/assistant/handler/handler.go`
4. `api/modules/assistant/service/service.go`
5. `api/modules/assistant/repository/repository.go`
6. `api/modules/assistant/service/provider.go` if model execution changes
7. `api/modules/assistant/service/prompt_compiler.go` if prompt layering changes
8. `fe/src/features/assistant/index.tsx` and `fe/src/features/assistant_profiles/index.tsx` if admin UI changes

## Ownership boundaries

- sessions, messages, traces, feedback, eval runs, profiles, prompt versions, policies, and tool proposals belong in `api/modules/assistant`
- prompt compilation belongs in the service layer, not in handlers or UI
- provider/model execution belongs behind the assistant runtime service
- UI should consume stable response shapes through feature-local API wrappers and mappers

## Runtime invariants

- preserve separation between `public` and `admin` session modes
- keep each session locked to one effective profile and traced prompt version when the model turn is recorded
- keep prompt layering stable:
  - platform system prompt
  - profile prompt
  - response policy
  - safety policy
  - retrieved context
  - session summary
  - current user message
- do not let retrieved documents override system/profile instructions
- keep proposed actions generic:
  - declaration/proposal is allowed
  - business execution stays out until a later domain plan adds real tools

## Prompt and provider checks

When prompt or provider code changes, verify:

- `default_model_id` resolution still works across profile and runtime defaults
- provider failures degrade according to the configured fallback path
- token, latency, model id, prompt version, and safety outcomes are still captured in traces
- server-side response repair does not invent citations outside the retrieval set

## Frontend checks

When admin runtime UI changes, verify:

- the `AI` menu grouping remains correct
- session list/detail/review screens still respect permissions
- trace and citations panels stay dense but readable
- destructive actions keep confirmation flows
- user-facing strings route through `t(...)` and `api/languages/en.xml`

## Minimum validation

- create or inspect an admin session flow
- send at least one turn through the runtime path being changed
- verify citations, safety payload, profile attribution, and trace id remain coherent
