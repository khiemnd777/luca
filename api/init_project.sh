#!/bin/bash
set -euo pipefail

export GOCACHE="${PWD}/.gocache"
export GOTOOLCHAIN="${GOTOOLCHAIN:-auto}"
INIT_PROJECT_MODE="${INIT_PROJECT_MODE:-full}"

run_go_module_sync() {
  [[ "$INIT_PROJECT_MODE" == "full" || "$INIT_PROJECT_MODE" == "ci" ]]
}

run_db_bootstrap_steps() {
  [[ "$INIT_PROJECT_MODE" == "full" || "$INIT_PROJECT_MODE" == "runtime" ]]
}

go_mod_sync() {
  local attempt
  local max_attempts=5
  local output
  local -a missing_packages=()

  for ((attempt = 1; attempt <= max_attempts; attempt++)); do
    echo "👉 Running go mod tidy (attempt ${attempt}/${max_attempts})"

    if output=$(go mod tidy 2>&1); then
      [ -n "$output" ] && echo "$output"
      echo "👉 Running go mod vendor"
      go mod vendor
      return 0
    fi

    echo "$output"

    mapfile -t missing_packages < <(printf '%s\n' "$output" | sed -n 's/.*no required module provides package \([^;]*\);.*/\1/p' | sort -u)

    if [ ${#missing_packages[@]} -eq 0 ]; then
      echo "❌ go mod tidy failed with a non-recoverable error."
      return 1
    fi

    echo "⚙️ Auto-installing missing Go packages..."
    for pkg in "${missing_packages[@]}"; do
      echo "   - go get ${pkg}"
      go get "${pkg}"
    done
  done

  echo "❌ go mod tidy failed after ${max_attempts} attempts."
  return 1
}

echo "🚀 Initializing project..."
echo "🧭 init_project mode: ${INIT_PROJECT_MODE}"

# Step 0: Delete vendor folder
if [ -d "vendor" ]; then
  echo "🧹 Removing vendor folder..."
  rm -rf vendor
fi

# Step 1: Generate Ent for shared
echo "👉 Generating Ent for shared"
go run -mod=mod entgo.io/ent/cmd/ent generate ./shared/db/ent/schema --target ./shared/db/ent/generated --feature sql/execquery

if run_db_bootstrap_steps; then
  # Step 1.1: Init database
  echo "👉 Initializing database"
  GOFLAGS=-mod=mod go run scripts/init_db/main.go
else
  echo "⏭️ Skipping database init in ${INIT_PROJECT_MODE} mode"
fi

# Step 2: Auto generate Ent for all modules with ent/schema
for schema_dir in $(find modules -type d -path "*/ent/schema"); do
  module_dir=$(dirname "$(dirname "$schema_dir")")
  schema_path="./$schema_dir"
  target_path="./$module_dir/ent/generated"

  echo "👉 Generating Ent for $module_dir"
  go run -mod=mod entgo.io/ent/cmd/ent generate "$schema_path" --target "$target_path"

  if run_db_bootstrap_steps; then
    echo "⚙️ Running auto-migrate for $module_dir"
    (cd "$module_dir" && GOFLAGS=-mod=mod go run ./ent/cmd/migrate.go)
  else
    echo "⏭️ Skipping auto-migrate for $module_dir in ${INIT_PROJECT_MODE} mode"
  fi
done

if run_go_module_sync; then
  # Step 3: Tidy & Vendor
  go_mod_sync
else
  echo "⏭️ Skipping go mod tidy/vendor in ${INIT_PROJECT_MODE} mode"
fi

if run_db_bootstrap_steps; then
  # Step 4: Init roles
  echo "👉 Initializing roles"
  GOFLAGS=-mod=mod go run scripts/init_roles/main.go
else
  echo "⏭️ Skipping role init in ${INIT_PROJECT_MODE} mode"
fi

if [[ "$INIT_PROJECT_MODE" == "full" || "$INIT_PROJECT_MODE" == "ci" ]]; then
  # Step 5: Build all
  echo "👉 Building all modules"
  GOFLAGS=-mod=mod go build ./...
else
  echo "⏭️ Skipping build in ${INIT_PROJECT_MODE} mode"
fi

echo "✅ Project initialized successfully!"
