---
name: noah-cicd-workflow
description: Use when a Noah task affects GitHub Actions workflows, CI checks, deployment automation, VPS provisioning, production env rendering, release pipeline safety, or operational secrets for build and deploy.
---

# CI/CD

Use this skill for work that changes or operates Noah's delivery pipeline.

## No shortcut patch rule

- trace the real pipeline or deployment failure path before editing
- do not hide defects with skipped checks, permissive workflow branches, hardcoded env fallbacks, or "make it pass" conditionals
- if the correct fix crosses workflow, script, packaging, or secret handoff boundaries, update those layers coherently
- temporary mitigations require explicit user approval and must be labeled as temporary

Typical triggers:

- GitHub Actions workflow creation or edits
- CI checks for frontend or backend
- production deploy flow changes
- VPS bootstrap or provisioning changes
- Docker production build or compose changes
- secret/bootstrap/env rendering changes
- deploy failure triage

## Goals

- preserve the repo's current zero-touch VPS deploy model unless the user explicitly asks to replace it
- keep CI and CD responsibilities clear
- validate pipeline changes against the real repo entrypoints instead of inventing a parallel release path
- minimize blast radius for production-affecting edits

## Required reading order

1. `/AGENTS.md`
2. `/.github/workflows/*.yml`
3. `/deploy/scripts/provision-and-deploy.sh`
4. `/deploy/scripts/render-production-config.sh`
5. `/deploy/scripts/vps-healthcheck.sh`
6. `/deploy/scripts/push-github-secrets.sh` when secrets are involved
7. `/api/docker-compose.prod.yml`
8. `/api/Dockerfile.prod` and `/fe/Dockerfile.prod` when build or runtime packaging changes
9. `/deploy/config/project.env.example` when env shape or secret inputs change

Read only the nearest additional files needed for the task.

## Current repo model to preserve

- GitHub Actions is the orchestrator
- `main` push or manual dispatch triggers deploy
- frontend is verified by Bun install + build
- backend is verified by `go test ./...`
- source is copied to the VPS with `rsync`
- the VPS renders production env files and nginx config from `PROJECT_ENV_B64`
- docker compose on the VPS builds and runs the production stack
- nginx and certbot are managed on the VPS host

Do not replace this with image-registry, Kubernetes, or a new hosting model unless the user explicitly asks for that migration.

## Task classification

Classify the CI/CD task before editing:

- `ci-only`
  - build, lint, test, PR checks, matrix, caches, artifacts
- `cd-only`
  - deploy workflow, VPS provisioning, release snapshot, healthcheck, rollback hooks
- `pipeline-contract`
  - env shape, secrets, workflow inputs, script handoff, build output assumptions
- `incident`
  - failed deploy, failed workflow, secret mismatch, DNS/SSL/bootstrap/runtime issue

If more than one bucket applies, treat the task as `pipeline-contract`.

## Inspection checklist

For `ci-only`:

- target workflow file
- `fe/package.json`
- `api/go.mod`
- nearby test or lint entrypoints
- any cache or artifact paths referenced by the workflow

For `cd-only`:

- deploy workflow
- VPS deploy script
- nginx render script
- production compose file
- Dockerfiles touched by the deploy
- healthcheck script

For `pipeline-contract`:

- workflow env and secrets
- `deploy/config/project.env.example`
- `push-github-secrets.sh`
- render script outputs
- scripts that consume the rendered env

For `incident`:

- failing workflow step
- shell script invoked by that step
- env/secret assumptions
- runtime healthcheck targets
- the smallest surrounding file set that proves root cause

## Execution rules

- trace the real entrypoint sequence before editing:
  - workflow -> copied files -> `.deploy.env` -> `provision-and-deploy.sh` -> rendered env/nginx -> `docker compose up`
- keep CI entrypoints aligned with the actual repo commands already used by developers
- prefer tightening the existing pipeline over creating a second pipeline
- preserve the secret contract unless the user asked to rotate or redesign it
- keep deploy scripts idempotent where possible
- if a change affects production env shape, update the env example and secret bootstrap script in the same task
- if a change affects runtime ports, domains, or health endpoints, update healthcheck and nginx rendering coherently

## Safety rules

- do not trigger real deploys, mutate GitHub secrets, or rotate credentials unless the user explicitly asks for that action
- do not silently change deployment targets, public domains, or TLS behavior
- do not bypass verification steps to make a deploy green
- do not hardcode secrets into workflow or repo files
- do not introduce a second source of truth for production env values

## Validation checklist

Always validate the dimensions that apply:

- workflow syntax and step ordering are coherent
- CI commands match the actual repo scripts and toolchain versions
- secret names match across workflow, env example, and bootstrap script
- render script still produces the env files and nginx config expected by deploy
- production compose, Dockerfiles, and healthcheck still agree on ports and service names
- deploy steps remain idempotent and safe to rerun

When practical, run:

- `bash agents/scripts/validate.sh`
- relevant local checks such as:
  - `cd fe && bun run build`
  - `cd fe && bun run lint`
  - `cd api && go test ./...`

If a check is not run, say so and explain why.

## Output expectations

Before editing, produce a short internal plan covering:

- task classification
- exact pipeline files to inspect first
- production side effects to verify

Before sign-off, report:

- what changed in the pipeline
- what validations were run
- what production risks remain
