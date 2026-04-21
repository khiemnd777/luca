// scripts/create_module/templates/config_config.go.tmpl
package config

import (
	"time"

	"github.com/khiemnd777/noah_api/shared/config"
)

type PushConfig struct {
	Enabled      bool          `yaml:"enabled"`
	Subject      string        `yaml:"subject"`
	PublicKey    string        `yaml:"public_key"`
	PrivateKey   string        `yaml:"private_key"`
	TTL          time.Duration `yaml:"ttl"`
	Urgency      string        `yaml:"urgency"`
	AllowedTypes []string      `yaml:"allowed_types"`
}

type ModuleConfig struct {
	Server   config.ServerConfig   `yaml:"server"`
	Database config.DatabaseConfig `yaml:"database"`
	Push     PushConfig            `yaml:"push"`
}

func (c *ModuleConfig) GetServer() config.ServerConfig {
	return c.Server
}

func (c *ModuleConfig) GetDatabase() config.DatabaseConfig {
	return c.Database
}
