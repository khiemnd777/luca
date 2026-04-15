package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadEnvFromPrioritizesRootSharedAndAppSpecific(t *testing.T) {
	repoRoot := t.TempDir()
	writeFile(t, filepath.Join(repoRoot, "AGENTS.md"), "root")
	writeFile(t, filepath.Join(repoRoot, ".env"), "APP_FE_ORIGIN=http://root.local:5173\nSHARED_NAME=root\n")
	writeFile(t, filepath.Join(repoRoot, "api", ".env"), "APP_FE_ORIGIN=http://api.local:5173\nPORT=9000\nSHARED_NAME=api\n")

	withEnvSnapshot(t, func() {
		if err := loadEnvFrom(filepath.Join(repoRoot, "api")); err != nil {
			t.Fatalf("load env: %v", err)
		}

		if got := os.Getenv("APP_FE_ORIGIN"); got != "http://root.local:5173" {
			t.Fatalf("APP_FE_ORIGIN = %q, want root shared value", got)
		}
		if got := os.Getenv("M_MAIN_CLIENT_BASE_URL"); got != "http://root.local:5173" {
			t.Fatalf("M_MAIN_CLIENT_BASE_URL = %q, want derived root shared value", got)
		}
		if got := os.Getenv("PORT"); got != "9000" {
			t.Fatalf("PORT = %q, want api-specific value", got)
		}
		if got := os.Getenv("SHARED_NAME"); got != "api" {
			t.Fatalf("SHARED_NAME = %q, want app override for non-APP variable", got)
		}
	})
}

func TestLoadEnvFromPreservesExternalEnvAndUsesProductionCandidates(t *testing.T) {
	repoRoot := t.TempDir()
	writeFile(t, filepath.Join(repoRoot, "AGENTS.md"), "root")
	writeFile(t, filepath.Join(repoRoot, ".env"), "APP_FE_ORIGIN=http://dev-root.local:5173\n")
	writeFile(t, filepath.Join(repoRoot, ".env.prod"), "APP_FE_ORIGIN=https://prod-root.local\n")
	writeFile(t, filepath.Join(repoRoot, "api", ".env"), "PORT=9000\n")
	writeFile(t, filepath.Join(repoRoot, "api", ".env.prod"), "PORT=9100\n")

	withEnvSnapshot(t, func() {
		if err := os.Setenv("APP_ENV", "production"); err != nil {
			t.Fatalf("set APP_ENV: %v", err)
		}
		if err := os.Setenv("PORT", "7000"); err != nil {
			t.Fatalf("set PORT: %v", err)
		}

		if err := loadEnvFrom(filepath.Join(repoRoot, "api")); err != nil {
			t.Fatalf("load env: %v", err)
		}

		if got := os.Getenv("APP_FE_ORIGIN"); got != "https://prod-root.local" {
			t.Fatalf("APP_FE_ORIGIN = %q, want production root value", got)
		}
		if got := os.Getenv("PORT"); got != "7000" {
			t.Fatalf("PORT = %q, want external env to win", got)
		}
		if got := os.Getenv("M_MAIN_CLIENT_BASE_URL"); got != "https://prod-root.local" {
			t.Fatalf("M_MAIN_CLIENT_BASE_URL = %q, want derived production root value", got)
		}
	})
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", path, err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func withEnvSnapshot(t *testing.T, fn func()) {
	t.Helper()

	snapshot := os.Environ()
	os.Clearenv()

	defer func() {
		os.Clearenv()
		for _, entry := range snapshot {
			key, value, found := strings.Cut(entry, "=")
			if !found {
				continue
			}
			if err := os.Setenv(key, value); err != nil {
				t.Fatalf("restore env %s: %v", key, err)
			}
		}
	}()

	fn()
}
