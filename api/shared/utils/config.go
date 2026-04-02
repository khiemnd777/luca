package utils

import (
	"fmt"

	sharedconfig "github.com/khiemnd777/noah_api/shared/config"
	"gopkg.in/yaml.v3"
)

func LoadConfig[T any](path string) (*T, error) {
	if err := sharedconfig.EnsureEnvLoaded(); err != nil {
		return nil, fmt.Errorf("❌ Failed to load env: %w", err)
	}

	data, err := sharedconfig.ReadExpandedYAML(path)
	if err != nil {
		return nil, fmt.Errorf("❌ Failed to read config file %s: %w", path, err)
	}

	var config T
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("❌ Failed to unmarshal YAML config: %w", err)
	}

	return &config, nil
}
