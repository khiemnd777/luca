package config

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/subosito/gotenv"
	"gopkg.in/yaml.v3"
)

var loadDotEnvOnce sync.Once

func EnsureEnvLoaded() error {
	var loadErr error

	loadDotEnvOnce.Do(func() {
		start, err := os.Getwd()
		if err != nil {
			loadErr = err
			return
		}

		loadErr = loadEnvFrom(start)
	})

	return loadErr
}

func loadEnvFrom(start string) error {
	repoRoot := findRepoRoot(start)
	apiDir := findAPIDir(start, repoRoot)
	existing := existingEnvKeys()
	candidates := envFileCandidates()

	if repoRoot != "" {
		if err := applyEnvScope(repoRoot, candidates, existing, false, false); err != nil {
			return err
		}
	}

	if apiDir != "" {
		if err := applyEnvScope(apiDir, candidates, existing, true, true); err != nil {
			return err
		}
	}

	if feOrigin := strings.TrimSpace(os.Getenv("APP_FE_ORIGIN")); feOrigin != "" {
		os.Setenv("M_MAIN_CLIENT_BASE_URL", feOrigin)
	}

	return nil
}

func envFileCandidates() []string {
	if strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "production") {
		return []string{".env.prod", ".env"}
	}
	return []string{".env"}
}

func applyEnvScope(dir string, names []string, existing map[string]struct{}, allowOverride bool, skipSharedPrefix bool) error {
	scopeLoaded := make(map[string]struct{})

	for _, name := range names {
		candidate := filepath.Join(dir, name)
		values, err := readEnvFile(candidate)
		if err != nil {
			return fmt.Errorf("load .env %s: %w", candidate, err)
		}
		if len(values) == 0 {
			continue
		}

		for key, value := range values {
			if _, ok := existing[key]; ok {
				continue
			}
			if skipSharedPrefix && strings.HasPrefix(key, "APP_") {
				continue
			}
			if _, ok := scopeLoaded[key]; ok {
				continue
			}
			if !allowOverride {
				if _, ok := os.LookupEnv(key); ok {
					continue
				}
			}

			os.Setenv(key, value)
			scopeLoaded[key] = struct{}{}
		}
	}

	return nil
}

func readEnvFile(path string) (gotenv.Env, error) {
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	return gotenv.Read(path)
}

func existingEnvKeys() map[string]struct{} {
	keys := make(map[string]struct{})
	for _, entry := range os.Environ() {
		key, _, found := strings.Cut(entry, "=")
		if found {
			keys[key] = struct{}{}
		}
	}
	return keys
}

func findRepoRoot(start string) string {
	for dir := start; ; dir = filepath.Dir(dir) {
		if fileExists(filepath.Join(dir, "AGENTS.md")) && dirExists(filepath.Join(dir, "api")) {
			return dir
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return ""
		}
	}
}

func findAPIDir(start, repoRoot string) string {
	if repoRoot != "" {
		apiDir := filepath.Join(repoRoot, "api")
		if dirExists(apiDir) {
			return apiDir
		}
	}

	for dir := start; ; dir = filepath.Dir(dir) {
		if filepath.Base(dir) == "api" && dirExists(filepath.Join(dir, "shared")) {
			return dir
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
	}

	fallback := filepath.Join(start, "api")
	if dirExists(fallback) {
		return fallback
	}

	return ""
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func ReadExpandedYAML(path string) ([]byte, error) {
	if err := EnsureEnvLoaded(); err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	return []byte(os.ExpandEnv(string(data))), nil
}

func UnmarshalYAMLFile(path string, out any) error {
	data, err := ReadExpandedYAML(path)
	if err != nil {
		return err
	}

	if err := yaml.Unmarshal(data, out); err != nil {
		return err
	}

	return nil
}

func NewExpandedYAMLReader(path string) (*bytes.Reader, string, error) {
	data, err := ReadExpandedYAML(path)
	if err != nil {
		return nil, "", err
	}

	configType := strings.TrimPrefix(filepath.Ext(path), ".")
	if configType == "" {
		configType = "yaml"
	}

	return bytes.NewReader(data), configType, nil
}
