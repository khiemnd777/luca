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

		root := start
		candidates := envFileCandidates()
		found := false
		for {
			for _, name := range candidates {
				candidate := filepath.Join(root, name)
				if _, err := os.Stat(candidate); err == nil {
					if err := gotenv.Load(candidate); err != nil {
						loadErr = fmt.Errorf("load .env %s: %w", candidate, err)
					}
					found = true
					return
				}
			}

			parent := filepath.Dir(root)
			if parent == root {
				break
			}
			root = parent
		}

		if !found {
			for _, name := range candidates {
				fallback := filepath.Join(start, "api", name)
				if _, err := os.Stat(fallback); err == nil {
					if err := gotenv.Load(fallback); err != nil {
						loadErr = fmt.Errorf("load .env %s: %w", fallback, err)
					}
					return
				}
			}
		}
	})

	return loadErr
}

func envFileCandidates() []string {
	if strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "production") {
		return []string{".env.prod", ".env"}
	}
	return []string{".env"}
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
