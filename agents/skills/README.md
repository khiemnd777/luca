# Agentic Skills Workflow

`agents/skills` is the source-of-truth for Noah's repo-managed skills.

## Directory contract

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

Only files needed by the runtime skill should live inside a skill folder.

## Runtime target

Repo-local skills are synced into the Codex runtime skill store:

```text
$CODEX_HOME/skills
```

If `CODEX_HOME` is not set, the sync script defaults to:

```text
$HOME/.codex/skills
```

## Validate skills

Run:

```bash
bash agents/scripts/validate.sh
```

This validates that each skill:

- has a `SKILL.md`
- includes `name` and `description` in frontmatter
- has a minimally valid `agents/openai.yaml` when that file exists

## Sync skills

Run:

```bash
bash agents/scripts/sync.sh
```

This will:

- validate the source directory first
- copy each skill into the Codex runtime store
- overwrite existing runtime copies for the same skill names

Optional cleanup mode:

```bash
bash agents/scripts/sync.sh --clean
```

This also removes runtime skills that no longer exist in `agents/skills`.

## Recommended workflow

1. Edit or review skills in `agents/skills`.
2. Run `bash agents/scripts/validate.sh`.
3. Run `bash agents/scripts/sync.sh`.
4. Use the synced skills from the Codex runtime store.
