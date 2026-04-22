---
name: noah-assistant-safety-evals
description: Use when a Noah task changes AI Assistant guardrails, citation validation, refusal or escalation behavior, safety outputs, review queue flows, trace inspection, or offline evaluation and scoring behavior.
---

# Noah Assistant Safety and Evals

Use this skill when the change is primarily about groundedness, guardrails, reviewability, or evaluation quality.

## No shortcut patch rule

- trace the real safety or evaluation failure path before editing
- do not hide defects with weaker guards, silent skips, hardcoded verdicts, or "make it pass" fallbacks
- if the correct fix crosses service logic, validation, persistence, or review UI boundaries, update those layers coherently
- temporary mitigations require explicit user approval and must be labeled as temporary

## Required reading

1. `/AGENTS.md`
2. `api/modules/assistant/service/service.go`
3. `api/modules/assistant/service/prompt_compiler.go` if guard input depends on prompt layers
4. `api/modules/assistant/repository/repository.go` if reviews, traces, or eval persistence change
5. `fe/src/features/assistant/index.tsx` and assistant widgets if review/eval UI changes

## Safety ownership

- pre-LLM request classification, injection checks, scope filtering, and unsupported-risk gating belong in assistant service logic
- post-LLM citation validation, refusal/disclaimer enforcement, and output blocking belong after provider inference and before response finalization
- review queues, feedback, traces, and eval cases/results belong in assistant persistence and admin UI

## Safety invariants

- retrieved documents must never inject instructions into system/profile prompt layers
- citations must reference only chunk ids that actually exist in the retrieval set
- the final answer must not claim external sources beyond the retrieved set
- refusal/escalation templates must survive style and persona customization
- public retrieval must never include `admin_only` content

## Eval focus

When evaluation code changes, verify the platform can still score at least:

- retrieval hit rate
- citation validity
- refusal correctness
- style adherence

Persist eval outcomes with enough attribution to compare:

- profile
- prompt version
- model id

## Review UI checks

When admin review or trace UI changes, verify:

- citations, safety verdicts, and trace payloads remain inspectable
- review queue filters and detail views still map to backend payloads cleanly
- reviewers do not need hidden system-prompt access to understand what happened

## Minimum validation

- run or inspect at least one guardrail path and one safe-answer path
- confirm citation validation can reject non-retrieved chunk references
- confirm review/eval payloads still attribute profile, prompt version, and model correctly
