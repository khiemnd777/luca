package config

import (
	"fmt"

	"github.com/spf13/viper"
)

var globalConfig *AppConfig

func Init(path string) error {
	if err := EnsureEnvLoaded(); err != nil {
		return fmt.Errorf("❌ Load env error: %w", err)
	}

	cfg, err := Load(path)
	if err != nil {
		return fmt.Errorf("❌ Read config error: %w", err)
	}
	globalConfig = cfg

	// Init viper config
	viper.Reset()
	reader, configType, err := NewExpandedYAMLReader(path)
	if err != nil {
		return fmt.Errorf("❌ Prepare expanded config error: %w", err)
	}
	viper.SetConfigType(configType)

	if err := viper.ReadConfig(reader); err != nil {
		panic(fmt.Errorf("fatal error config file: %w", err))
	}

	return nil
}

func Get() *AppConfig {
	if globalConfig == nil {
		panic("❌ Config not initialized. Did you forget to call config.Init(path)?")
	}
	return globalConfig
}

// SetForTests injects config for package-level tests without loading runtime config files.
func SetForTests(cfg *AppConfig) {
	globalConfig = cfg
}

func Load(path string) (*AppConfig, error) {
	var cfg AppConfig
	if err := UnmarshalYAMLFile(path, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
