#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="${1:-"$ROOT_DIR/agents/skills"}"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

fail() {
  echo "Validation failed: $*" >&2
  exit 1
}

assert_contains() {
  local file="$1"
  local pattern="$2"
  local message="$3"

  if ! grep -Eq "$pattern" "$file"; then
    fail "$message ($file)"
  fi
}

found_skill=0

while IFS= read -r -d '' skill_dir; do
  found_skill=1

  skill_name="$(basename "$skill_dir")"
  skill_md="$skill_dir/SKILL.md"

  [[ -f "$skill_md" ]] || fail "Missing SKILL.md for skill '$skill_name'"

  assert_contains "$skill_md" '^---$' "Missing frontmatter delimiter"
  assert_contains "$skill_md" '^name: [A-Za-z0-9._-]+$' "Missing or invalid frontmatter name"
  assert_contains "$skill_md" '^description: .+$' "Missing frontmatter description"

  agents_yaml="$skill_dir/agents/openai.yaml"
  if [[ -f "$agents_yaml" ]]; then
    assert_contains "$agents_yaml" '^interface:$' "Missing interface block in openai.yaml"
    assert_contains "$agents_yaml" '^  display_name: ".+"$' "Missing display_name in openai.yaml"
    assert_contains "$agents_yaml" '^  short_description: ".+"$' "Missing short_description in openai.yaml"

    if grep -Eq '^  default_prompt: ' "$agents_yaml"; then
      assert_contains "$agents_yaml" "\\\$${skill_name}" "default_prompt must mention \$${skill_name}"
    fi
  fi
done < <(find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d -print0 | sort -z)

[[ "$found_skill" -eq 1 ]] || fail "No skills found in $SOURCE_DIR"

echo "Validated agentic skills in $SOURCE_DIR"
