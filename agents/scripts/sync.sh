#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKILLS_SOURCE_DIR="$ROOT_DIR/agents/skills"
SUBAGENTS_SOURCE_DIR="$ROOT_DIR/agents/subagents"
CODEX_HOME_DIR="${CODEX_HOME:-"$HOME/.codex"}"
SKILLS_TARGET_DIR="$CODEX_HOME_DIR/skills"
SUBAGENTS_TARGET_DIR="$CODEX_HOME_DIR/agents"
CLEAN=0

usage() {
  cat <<EOF
Usage: $(basename "$0") [--clean] [--target DIR] [--agents-target DIR]

Sync repo-managed Noah skills and subagents into the global Codex runtime.

Options:
  --clean              Remove runtime artifacts that do not exist in the repo source.
  --target DIR         Override the runtime skills target directory.
  --agents-target DIR  Override the runtime subagents target directory.
  -h, --help           Show this help message.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean)
      CLEAN=1
      shift
      ;;
    --target)
      [[ $# -ge 2 ]] || {
        echo "--target requires a directory path" >&2
        exit 1
      }
      SKILLS_TARGET_DIR="$2"
      shift 2
      ;;
    --agents-target)
      [[ $# -ge 2 ]] || {
        echo "--agents-target requires a directory path" >&2
        exit 1
      }
      SUBAGENTS_TARGET_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

"$ROOT_DIR/agents/scripts/validate.sh" "$SKILLS_SOURCE_DIR" "$SUBAGENTS_SOURCE_DIR"

mkdir -p "$SKILLS_TARGET_DIR" "$SUBAGENTS_TARGET_DIR"

copy_skill() {
  local src_dir="$1"
  local skill_name
  local dest_dir

  skill_name="$(basename "$src_dir")"
  dest_dir="$SKILLS_TARGET_DIR/$skill_name"

  rm -rf "$dest_dir"
  mkdir -p "$dest_dir"

  cp "$src_dir/SKILL.md" "$dest_dir/SKILL.md"

  for subdir in agents references scripts assets; do
    if [[ -d "$src_dir/$subdir" ]]; then
      cp -R "$src_dir/$subdir" "$dest_dir/$subdir"
    fi
  done

  echo "Synced skill: $skill_name -> $dest_dir"
}

copy_subagent() {
  local src_file="$1"
  local agent_name
  local dest_file

  agent_name="$(basename "$src_file")"
  dest_file="$SUBAGENTS_TARGET_DIR/$agent_name"

  AGENT_SRC_FILE="$src_file" \
  AGENT_DEST_FILE="$dest_file" \
  CODEX_HOME_RENDER="$CODEX_HOME_DIR" \
  python3 - <<'PY'
from pathlib import Path
import os

src = Path(os.environ["AGENT_SRC_FILE"])
dest = Path(os.environ["AGENT_DEST_FILE"])
codex_home = os.environ["CODEX_HOME_RENDER"]

content = src.read_text()
content = content.replace("__CODEX_HOME__", codex_home)
dest.write_text(content)
PY

  echo "Synced subagent: $agent_name -> $dest_file"
}

echo "Valid source directories:"
echo "  skills: $SKILLS_SOURCE_DIR"
echo "  subagents: $SUBAGENTS_SOURCE_DIR"
echo "Runtime targets:"
echo "  skills: $SKILLS_TARGET_DIR"
echo "  subagents: $SUBAGENTS_TARGET_DIR"

while IFS= read -r -d '' skill_dir; do
  copy_skill "$skill_dir"
done < <(find "$SKILLS_SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d -print0 | sort -z)

while IFS= read -r -d '' subagent_file; do
  copy_subagent "$subagent_file"
done < <(find "$SUBAGENTS_SOURCE_DIR" -mindepth 1 -maxdepth 1 -type f -name '*.toml' -print0 | sort -z)

if [[ "$CLEAN" -eq 1 ]]; then
  while IFS= read -r -d '' runtime_dir; do
    runtime_name="$(basename "$runtime_dir")"
    if [[ ! -d "$SKILLS_SOURCE_DIR/$runtime_name" ]]; then
      rm -rf "$runtime_dir"
      echo "Removed runtime-only skill: $runtime_name"
    fi
  done < <(find "$SKILLS_TARGET_DIR" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null | sort -z)

  while IFS= read -r -d '' runtime_file; do
    runtime_name="$(basename "$runtime_file")"
    if [[ ! -f "$SUBAGENTS_SOURCE_DIR/$runtime_name" ]]; then
      rm -f "$runtime_file"
      echo "Removed runtime-only subagent: $runtime_name"
    fi
  done < <(find "$SUBAGENTS_TARGET_DIR" -mindepth 1 -maxdepth 1 -type f -name '*.toml' -print0 2>/dev/null | sort -z)
fi

echo "Sync complete"
