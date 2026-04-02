package runner

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/khiemnd777/noah_api/shared/config"
	"github.com/khiemnd777/noah_api/shared/runtime"
	"github.com/khiemnd777/noah_api/shared/utils"
)

const moduleStartTimeout = 30 * time.Second

type RunningModule struct {
	PID   int       `json:"pid"`
	Host  string    `json:"host"`
	Port  int       `json:"port"`
	RunAt time.Time `json:"run_at"`
}

type RunningModules map[string]RunningModule

func loadModuleConfig(module string) (host string, port int, err error) {
	// 1️⃣  Ưu tiên runtime registry (dynamic port)
	if reg, _ := runtime.LoadRegistry(); reg != nil {
		if m, ok := reg[module]; ok && m.Port != 0 {
			return m.Host, m.Port, nil
		}
	}

	// 2️⃣  Fallback: đọc config.yaml (cổng tĩnh)
	path := utils.GetModuleConfigPath(module)
	cfg, err := utils.LoadConfig[struct {
		Server struct {
			Host string `yaml:"host"`
			Port int    `yaml:"port"`
		} `yaml:"server"`
	}](path)
	if err != nil {
		return "", 0, err
	}

	// Nếu port vẫn =0 → báo lỗi rõ ràng
	if cfg.Server.Port == 0 {
		return "", 0, fmt.Errorf("module [%s] has dynamic port=0 and no runtime entry", module)
	}

	return cfg.Server.Host, cfg.Server.Port, nil
}

func getDestPort(port int) int {
	mCfg, _ := utils.LoadConfig[config.AppConfig](utils.GetAppConfigPath())
	mPort := mCfg.Server.Port
	return mPort + port
}

func StartModule(module string) error {
	host, port, err := loadModuleConfig(module)
	if err != nil {
		return err
	}

	if utils.CheckPortOpen(host, port) {
		return fmt.Errorf("❌ Port %d on host %s is already in use", port, host)
	}

	fmt.Printf("🚀 Starting module '%s' on %s:%d...\n", module, host, port)
	cmd := exec.Command("go", "run", utils.GetFullPath("modules", module, "main.go"))
	cmd.Env = append(os.Environ(), "GATEWAY_MODE=true")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("❌ Failed to start module: %w", err)
	}

	if err := waitForModuleReady(cmd, host, port, moduleStartTimeout); err != nil {
		return fmt.Errorf("❌ Module '%s' failed to become ready on %s:%d: %w", module, host, port, err)
	}

	return nil
}

func StartModulesInBatch(modules []string) error {
	var wg sync.WaitGroup
	for _, module := range modules {
		wg.Add(1)
		go func(m string) {
			defer wg.Done()
			if err := StartModule(m); err != nil {
				fmt.Printf("⚠️  Failed to start module [%s]: %v\n", m, err)
			}
		}(module)
	}
	wg.Wait()
	return nil
}

func StopModule(module string) error {
	modules, err := LoadRunningModules()
	if err != nil {
		return err
	}

	info, ok := modules[module]
	if !ok {
		return fmt.Errorf("❌ Module '%s' not found in modules.json", module)
	}

	pid, err := utils.DetectPIDFromPort(info.Port)
	if err != nil {
		return fmt.Errorf("❌ Failed to detect real PID for module '%s': %w", module, err)
	}

	proc, err := os.FindProcess(pid)
	if err != nil {
		return fmt.Errorf("❌ Could not find process: %w", err)
	}

	if err := proc.Kill(); err != nil {
		return fmt.Errorf("❌ Failed to kill process: %w", err)
	}

	delete(modules, module)
	return nil
}

func StopAllModules() error {
	modules, err := LoadRunningModules()
	if err != nil {
		return err
	}

	for name := range modules {
		err := StopModule(name)
		if err != nil {
			fmt.Printf("⚠️  Failed to stop module [%s]: %v\n", name, err)
		} else {
			fmt.Printf("🛑 Stopped module [%s]\n", name)
		}
	}
	return nil
}

func SyncRunningModules() error {
	registry, err := runtime.LoadRegistry()
	if err != nil {
		return fmt.Errorf("cannot load registry: %w", err)
	}

	running := RunningModules{}
	entries, err := os.ReadDir("modules")
	if err != nil {
		return fmt.Errorf("failed to read modules directory: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		name := entry.Name()
		var (
			host string
			port int
		)

		if rm, ok := registry[name]; ok {
			// Ưu tiên cổng động lấy được khi module start
			host = rm.Host
			port = rm.Port
		} else {
			// Fallback: đọc config.yaml (có thể port=0)
			h, p, err := loadModuleConfig(name)
			if err != nil {
				fmt.Printf("⚠️  Skipping module '%s': %v\n", name, err)
				continue
			}
			dPort := getDestPort(p)
			host, port = h, dPort
		}
		if utils.CheckPortOpen(host, port) {
			pid, _ := utils.DetectPIDFromPort(port)
			running[name] = RunningModule{
				PID:   pid,
				Host:  host,
				Port:  port,
				RunAt: time.Now(),
			}
			fmt.Printf("✅ Module '%s' is running on %s:%d (PID: %d)\n", name, host, port, pid)
		} else {
			fmt.Printf("🛑 Module '%s' is not running on %s:%d\n", name, host, port)
		}
	}

	err = SaveRunningModules(running)
	if err != nil {
		return fmt.Errorf("failed to save modules.json: %w", err)
	}

	fmt.Printf("🔁 Synced %d modules to tmp/modules.json\n", len(running))
	return nil
}

func ShowStatus() error {
	running, _ := LoadRunningModules()
	entries, err := os.ReadDir("modules")
	if err != nil {
		return fmt.Errorf("failed to read modules directory: %w", err)
	}

	type moduleRow struct {
		Name   string
		Host   string
		Port   int
		PID    int
		RunAt  string
		Status string
		Color  string
	}
	var rows []moduleRow

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		name := entry.Name()
		host, port, err := loadModuleConfig(name)
		if err != nil {
			rows = append(rows, moduleRow{
				Name: name, Host: "-", Port: 0, PID: -1, RunAt: "-", Status: "CONFIG ERROR", Color: "\033[33m",
			})
			continue
		}

		status := "STOPPED"
		pid := -1
		runAt := "-"
		color := "\033[31m" // red

		if utils.CheckPortOpen(host, port) {
			status = "RUNNING"
			pid, _ = utils.DetectPIDFromPort(port)
			if info, ok := running[name]; ok && !info.RunAt.IsZero() {
				runAt = info.RunAt.Format("2006-01-02 15:04:05")
			}
			color = "\033[32m" // green
		}

		rows = append(rows, moduleRow{
			Name: name, Host: host, Port: port, PID: pid, RunAt: runAt, Status: status, Color: color,
		})
	}

	sort.SliceStable(rows, func(i, j int) bool {
		return strings.ToLower(rows[i].Name) < strings.ToLower(rows[j].Name)
	})

	fmt.Println("\n📦 Module Status:")
	fmt.Println("----------------------------------------------------------------------------------------")
	fmt.Printf("%-20s | %-15s | %-5s | %-6s | %-20s | %-6s\n", "Module", "Host", "Port", "PID", "RunAt", "Status")
	fmt.Println("----------------------------------------------------------------------------------------")
	for _, r := range rows {
		fmt.Printf("%-20s | %-15s | %-5d | %-6d | %-20s | %s%-6s\033[0m\n",
			r.Name, r.Host, r.Port, r.PID, r.RunAt, r.Color, r.Status)
	}
	fmt.Println("----------------------------------------------------------------------------------------")
	return nil
}

func SaveRunningModule(module string, pid int, host string, port int) error {
	modules, _ := LoadRunningModules() // ignore read error if file doesn't exist
	modules[module] = RunningModule{
		PID: pid, Host: host, Port: port, RunAt: time.Now(),
	}
	return SaveRunningModules(modules)
}

func LoadRunningModules() (RunningModules, error) {
	path := filepath.Join("tmp", "modules.json")
	modules := RunningModules{}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return modules, nil // no file yet
		}
		return nil, err
	}
	if err := json.Unmarshal(data, &modules); err != nil {
		return nil, err
	}
	return modules, nil
}

func SaveRunningModules(modules RunningModules) error {
	_ = os.MkdirAll("tmp", os.ModePerm)
	data, err := json.MarshalIndent(modules, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join("tmp", "modules.json"), data, 0644)
}

func waitForModuleReady(cmd *exec.Cmd, host string, port int, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		if utils.CheckPortOpen(host, port) {
			return nil
		}

		if cmd.ProcessState != nil && cmd.ProcessState.Exited() {
			return fmt.Errorf("process exited before opening port")
		}

		time.Sleep(250 * time.Millisecond)

		if err := cmd.Process.Signal(syscall.Signal(0)); err != nil {
			if utils.CheckPortOpen(host, port) {
				return nil
			}
			return fmt.Errorf("process exited before opening port: %w", err)
		}
	}

	return fmt.Errorf("timeout after %s", timeout)
}
