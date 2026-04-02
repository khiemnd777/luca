package runtime

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/khiemnd777/noah_api/shared/app"
	"github.com/khiemnd777/noah_api/shared/config"
	"github.com/khiemnd777/noah_api/shared/utils"
	"gopkg.in/yaml.v3"
)

type RunningModule struct {
	PID      int       `json:"pid"`
	Host     string    `json:"host"`
	Port     int       `json:"port"`
	RunAt    time.Time `json:"run_at"`
	External bool      `json:"external"`
	Route    string    `json:"router"`
}

type Registry map[string]RunningModule

var (
	registryPath = "tmp/runtime.json"
	mu           sync.Mutex
)

// LoadRegistry đọc file; nếu chưa có trả map rỗng.
func LoadRegistry() (Registry, error) {
	mu.Lock()
	defer mu.Unlock()

	return withRegistryLock(func() (Registry, error) {
		return loadRegistryUnlocked()
	})
}

// SaveRegistry ghi đè file.
func SaveRegistry(reg Registry) error {
	mu.Lock()
	defer mu.Unlock()

	_, err := withRegistryLock(func() (struct{}, error) {
		return struct{}{}, saveRegistryUnlocked(reg)
	})
	return err
}

// Register module (gọi trong main.go sau khi biết realPort)
func Register(name, route, host string, port int, external bool) error {
	return UpdateRegistry(func(reg Registry) {
		reg[name] = RunningModule{
			PID:      os.Getpid(),
			Host:     host,
			Port:     port,
			Route:    route,
			RunAt:    time.Now(),
			External: external,
		}
	})
}

func getDestPort(port int) int {
	mCfg, _ := utils.LoadConfig[config.AppConfig](utils.GetAppConfigPath())
	mPort := mCfg.Server.Port
	return mPort + port
}

// GenerateRegistry duyệt modules/, gán host = "127.0.0.1",
//   - Nếu config.yaml có port>0  ➜ giữ nguyên
//   - Nếu port==0               ➜ auto-allocate
//   - Ghi toàn bộ vào tmp/runtime.json
func GenerateRegistry(modDir string) (Registry, []*app.Reserved, error) {
	reg := Registry{}
	var rs []*app.Reserved

	entries, err := os.ReadDir(modDir)
	if err != nil {
		return nil, nil, err
	}

	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()

		cfgFile := utils.GetModuleConfigPath(name)
		raw, routeFromCfg, hostFromCfg, portFromCfg, externalFromCfg, err := loadServerSection(cfgFile)
		if err != nil {
			fmt.Printf("⚠️  skip %s: %v\n", name, err)
			continue
		}

		host := hostFromCfg
		port := getDestPort(portFromCfg)
		r, portErr := app.EnsurePortAvailable(host, port)
		if portErr != nil {
			fmt.Printf("🛑  cannot alloc port for %s\n", name)
			continue
		}

		rs = append(rs, r)

		reg[name] = RunningModule{
			PID:      0,
			Host:     host,
			Port:     r.Port,
			Route:    routeFromCfg,
			RunAt:    time.Now(),
			External: externalFromCfg,
		}

		_ = raw
	}

	if err := SaveRegistry(reg); err != nil {
		return nil, nil, err
	}
	return reg, rs, nil
}

func UpdateRegistry(update func(Registry)) error {
	mu.Lock()
	defer mu.Unlock()

	_, err := withRegistryLock(func() (struct{}, error) {
		reg, err := loadRegistryUnlocked()
		if err != nil {
			return struct{}{}, err
		}
		update(reg)
		return struct{}{}, saveRegistryUnlocked(reg)
	})
	return err
}

func loadRegistryUnlocked() (Registry, error) {
	data, err := os.ReadFile(registryPath)
	if err != nil {
		if os.IsNotExist(err) {
			return Registry{}, nil
		}
		return nil, err
	}

	reg := Registry{}
	if err := json.Unmarshal(data, &reg); err != nil {
		return nil, err
	}
	return reg, nil
}

func saveRegistryUnlocked(reg Registry) error {
	data, err := json.MarshalIndent(reg, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(registryPath), 0o755); err != nil {
		return err
	}

	tmpPath := registryPath + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmpPath, registryPath)
}

func withRegistryLock[T any](fn func() (T, error)) (T, error) {
	lockPath := registryPath + ".lock"
	if err := os.MkdirAll(filepath.Dir(lockPath), 0o755); err != nil {
		var zero T
		return zero, err
	}

	lockFile, err := os.OpenFile(lockPath, os.O_CREATE|os.O_RDWR, 0o644)
	if err != nil {
		var zero T
		return zero, err
	}
	defer lockFile.Close()

	if err := syscall.Flock(int(lockFile.Fd()), syscall.LOCK_EX); err != nil {
		var zero T
		return zero, err
	}
	defer func() {
		_ = syscall.Flock(int(lockFile.Fd()), syscall.LOCK_UN)
	}()

	return fn()
}

func loadServerSection(cfgPath string) (
	rawFile []byte, route, host string, port int, external bool, err error,
) {
	data, err := config.ReadExpandedYAML(cfgPath)
	if err != nil {
		return nil, "", "", 0, false, err
	}

	var raw struct {
		Server struct {
			Host  string `yaml:"host"`
			Port  int    `yaml:"port"`
			Route string `yaml:"route"`
		} `yaml:"server"`
		External bool `yaml:"external"`
	}
	if err := yaml.Unmarshal(data, &raw); err != nil {
		return nil, "", "", 0, false, err
	}

	return data, raw.Server.Route, raw.Server.Host, raw.Server.Port, raw.External, nil
}
