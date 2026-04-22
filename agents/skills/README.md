# Noah Agent Artifacts Workflow

Noah manages two separate artifact classes for Codex:

- `skills`: reusable workflow packages
- `subagents`: reusable execution profiles

The repo is the source of truth for both. Runtime artifacts are produced by `validate.sh` and `sync.sh`.

## Source Of Truth vs Runtime

Repo-managed sources:

```text
agents/skills/<skill-name>/
agents/subagents/<agent-name>.toml
```

Global runtime targets:

```text
$CODEX_HOME/skills
$CODEX_HOME/agents
```

If `CODEX_HOME` is not set, Noah defaults to:

```text
$HOME/.codex/skills
$HOME/.codex/agents
```

This is Noah's internal source-of-truth -> sync -> global runtime workflow.

OpenAI's runtime layout for custom agents is `~/.codex/agents/*.toml`. Noah preserves that runtime target for subagents, but keeps the editable source files inside the repo under `agents/subagents/`.

Repo-local `.codex/agents` is not used as the primary source in this workflow.

## Skills

Each skill lives under:

```text
agents/skills/<skill-name>/
```

Required:

- `SKILL.md`

Optional:

- `agents/openai.yaml`
- `references/`
- `scripts/`
- `assets/`

Skills define workflow. They tell the main agent or a subagent how work should be approached.

## Hard Prohibition On Shortcut Patching

Repo-managed Noah skills must not permit symptom-only fixes or "make it pass" edits.

Rules:

- always trace the owning layer and root cause before editing
- never hide defects with guards, null fallbacks, hardcoded values, skip paths, retries, or local conditionals unless that behavior is the confirmed design
- when the correct fix crosses module, contract, auth, cache, or registration boundaries, update those layers coherently
- temporary mitigations require explicit user approval and must be described as temporary

## Subagents

Each subagent lives under:

```text
agents/subagents/<agent-name>.toml
```

Subagent files stay close to OpenAI custom-agent TOML and must include:

- `name`
- `description`
- `developer_instructions`

Optional fields follow the OpenAI custom-agent format, such as:

- `sandbox_mode`
- `nickname_candidates`
- `model`
- `model_reasoning_effort`
- `skills.config`

Noah uses one repo-specific placeholder convention for portability:

- `__CODEX_HOME__` may appear inside `skills.config.path`

During sync, that placeholder is rendered to the actual global runtime root before writing the file to `$CODEX_HOME/agents`.

Subagents define execution profiles. They tell the orchestrator which specialized agent should handle a bounded slice of work.

## Relationship Between Skills and Subagents

- skills define workflow
- subagents define execution roles
- the main agent orchestrates both

Typical relationship:

- the main agent chooses which skills are relevant for the task
- the main agent decides whether delegation is worth it
- if delegation is needed, the main agent spawns a subagent whose TOML points at the exact runtime skills it should load
- the main agent integrates the result and remains responsible for final validation and the final answer

Subagents do not replace skills. They consume or rely on skills.

## Canonical Noah v1 Subagents

Noah seeds these role-based subagents:

- `noah-boundary-explorer`
- `noah-api-worker`
- `noah-fe-worker`
- `noah-cicd-worker`
- `noah-contract-reviewer`
- `noah-regression-reviewer`

These are generic job-type profiles, not business-feature-specific agents.

## Orchestration Scenarios

### 1. Simple task

- main agent classifies the task with `noah-repo-architect`
- main agent applies any directly relevant workflow skills
- no subagent is needed

### 2. Cross-boundary implementation

- main agent classifies the task
- main agent may spawn `noah-api-worker` for `api/**`
- main agent may spawn `noah-fe-worker` for `fe/**`
- main agent may spawn `noah-cicd-worker` for `.github/**`, `deploy/**`, and production packaging files
- main agent merges the results and uses contract and regression validation before sign-off

### 3. High-risk review

- main agent or implementation workers finish the main edits
- main agent may spawn `noah-contract-reviewer`
- main agent may spawn `noah-regression-reviewer`
- findings flow back to the main agent, which decides on fixes and owns the final output

## Assistant Platform Guidance

When the task targets the AI Assistant Platform, treat it as platform work rather than domain workflow work.

Typical ownership areas:

- `api/modules/knowledge`: source management, ingestion jobs, chunking, storage, taxonomy, visibility
- `api/modules/assistant`: profiles, prompt versions, sessions, messages, traces, feedback, evals, provider integration
- `fe/src/features/knowledge`: admin knowledge surfaces
- `fe/src/features/assistant`: admin session, review, and eval surfaces
- `fe/src/features/assistant_profiles`: profile and prompt-version admin surfaces

Default validation focus for these tasks:

- knowledge visibility and scope boundaries
- FE/API response-shape consistency for session/profile/knowledge payloads
- citation validity against retrieved chunks only
- prompt-layer traceability
- permission boundaries:
  - `knowledge.manage`
  - `assistant.view`
  - `assistant.respond`
  - `assistant.profile.manage`
  - `assistant.review`

### Dedicated Assistant Platform skills

The Noah generic skills still apply, but Assistant Platform work now also has dedicated workflow skills:

- `noah-assistant-platform`
  - use first when the assistant task is broad, ambiguous, or crosses knowledge/runtime/governance boundaries
- `noah-assistant-runtime`
  - use for sessions, messages, profiles, prompt versions, prompt compiler, provider/model execution, traces, and proposed actions
- `noah-knowledge-runtime`
  - use for sources, uploads, parsing, chunking, embeddings, taxonomy, visibility, and ingestion lifecycle work
- `noah-assistant-safety-evals`
  - use for guardrails, citation validation, refusals, review queue, trace review, and offline eval scoring

Recommended pairing:

- keep starting with `noah-repo-architect`
- add `noah-api-feature-workflow` and/or `noah-fe-module-workflow` by scope
- add the narrowest assistant-specific skill above for assistant-platform tasks
- finish with `noah-contract-sync`, `noah-auth-rbac-guard`, and `noah-regression-review` as the task requires

## Validate

Run:

```bash
bash agents/scripts/validate.sh
```

This validates:

- every skill under `agents/skills`
- every subagent TOML under `agents/subagents`
- required subagent fields
- duplicate subagent names
- `skills.config` path shape for repo-managed sources

## Sync

Run:

```bash
bash agents/scripts/sync.sh
```

This will:

- validate repo-managed skills and subagents first
- sync skills into the global runtime skills store
- sync subagents into the global runtime agents store
- render `__CODEX_HOME__` placeholders when writing runtime subagent TOML

Optional cleanup mode:

```bash
bash agents/scripts/sync.sh --clean
```

This also removes runtime skills and subagents that no longer exist in the repo source.

## Recommended Workflow

1. Edit or review skills in `agents/skills`.
2. Edit or review subagents in `agents/subagents`.
3. Run `bash agents/scripts/validate.sh`.
4. Run `bash agents/scripts/sync.sh`.
5. Use the synced runtime artifacts from the global Codex runtime store.
