---
name: noah-knowledge-runtime
description: Use when a Noah task changes AI Assistant knowledge runtime behavior such as source management, uploads, parsing, chunking, embeddings, taxonomy, visibility, ingestion jobs, or retrieval eligibility of knowledge documents and chunks.
---

# Noah Knowledge Runtime

Use this skill for work centered in `api/modules/knowledge` and the paired admin UI in `fe/src/features/knowledge`.

## No shortcut patch rule

- trace the owning knowledge flow and root cause before editing
- do not hide defects with silent parsing skips, permissive retrieval fallbacks, hardcoded metadata, or "make it pass" conditionals
- if the correct fix crosses ingestion, parsing, repository, retrieval eligibility, or admin UI boundaries, update those layers coherently
- temporary mitigations require explicit user approval and must be labeled as temporary

## Required reading

1. `/AGENTS.md`
2. `/fe/AGENTS.md` if frontend is involved
3. `api/modules/knowledge/handler/handler.go` if route behavior changes
4. `api/modules/knowledge/service/service.go`
5. `api/modules/knowledge/service/parser.go` if parsing, chunking, or embedding changes
6. `api/modules/knowledge/repository/repository.go`
7. `api/migrations/sql/V30__assistant_platform.sql` when schema/index behavior changes
8. `fe/src/features/knowledge/index.tsx` and knowledge widgets if admin UI changes

## Ownership boundaries

- source, document, chunk, and ingestion job lifecycle belongs in `api/modules/knowledge`
- file parsing, chunking, and embedding preparation stay inside the knowledge service layer
- retrieval eligibility is controlled by status, taxonomy, dates, and visibility rules, not UI assumptions
- frontend knowledge pages stay as admin operations surfaces, not a public chatbox

## Knowledge invariants

- preserve required taxonomy:
  - `category`
  - `tags[]`
  - `audience`
  - `language`
  - `effective_from`
  - `effective_to`
- preserve visibility scopes:
  - `public_assistant`
  - `internal_assistant`
  - `admin_only`
- documents marked `disabled` or `archived` must stop contributing to retrieval
- retry and reindex flows must preserve document/source ownership and auditability

## Parsing and retrieval checks

When parsing, chunking, or embeddings change, verify:

- supported file types still parse along the intended path
- chunk boundaries remain deterministic enough for citations and excerpts
- lexical retrieval still works even if vector capability is unavailable
- vector behavior, if present, still uses the expected dimension/index conventions

## Frontend checks

When knowledge admin UI changes, verify:

- source list/detail and document detail pages preserve loading, empty, and error states
- upload, retry, reindex, disable, and archive actions remain explicit and permission-gated
- taxonomy and visibility editing remain clear and do not hide required fields
- strings route through `t(...)` and `api/languages/en.xml`

## Minimum validation

- upload or simulate at least one supported knowledge document flow
- verify document status transitions and retrieval eligibility rules
- verify `admin_only` knowledge cannot appear in public-assistant retrieval paths
