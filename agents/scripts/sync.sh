#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="$ROOT_DIR/agents/skills"
CODEX_HOME_DIR="${CODEX_HOME:-"$HOME/.codex"}"
TARGET_DIR="$CODEX_HOME_DIR/skills"
CLEAN=0

usage() {
  cat <<EOF
Usage: $(basename "$0") [--clean] [--target DIR]

Sync repo-local skills from agents/skills into the Codex runtime skill store.

Options:
  --clean        Remove runtime skills that do not exist in the source directory.
  --target DIR   Override the runtime skill store target directory.
  -h, --help     Show this help message.
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
      TARGET_DIR="$2"
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

"$ROOT_DIR/agents/scripts/validate.sh" "$SOURCE_DIR"

mkdir -p "$TARGET_DIR"

copy_skill() {
  local src_dir="$1"
  local skill_name
  local dest_dir

  skill_name="$(basename "$src_dir")"
  dest_dir="$TARGET_DIR/$skill_name"

  rm -rf "$dest_dir"
  mkdir -p "$dest_dir"

  cp "$src_dir/SKILL.md" "$dest_dir/SKILL.md"

  for subdir in agents references scripts assets; do
    if [[ -d "$src_dir/$subdir" ]]; then
      cp -R "$src_dir/$subdir" "$dest_dir/$subdir"
    fi
  done

  echo "Synced skill: $skill_name"
}

while IFS= read -r -d '' skill_dir; do
  copy_skill "$skill_dir"
done < <(find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d -print0 | sort -z)

if [[ "$CLEAN" -eq 1 ]]; then
  while IFS= read -r -d '' runtime_dir; do
    runtime_name="$(basename "$runtime_dir")"
    if [[ ! -d "$SOURCE_DIR/$runtime_name" ]]; then
      rm -rf "$runtime_dir"
      echo "Removed runtime-only skill: $runtime_name"
    fi
  done < <(find "$TARGET_DIR" -mindepth 1 -maxdepth 1 -type d -print0 | sort -z)
fi

echo "Sync complete: $SOURCE_DIR -> $TARGET_DIR"
