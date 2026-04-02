package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

var missingPackagePattern = regexp.MustCompile(`no required module provides package ([^;]+);`)

func main() {
	fmt.Println("🚀 Initializing project...")

	// Step 0: Delete vendor folder if exists
	deleteFolder("vendor")

	// Step 1: Generate Ent for shared
	run("Generating Ent for shared", "go", "run", "-mod=mod", "entgo.io/ent/cmd/ent", "generate", "./shared/db/ent/schema", "--target", "./shared/db/ent/generated", "--feature", "sql/execquery")

	// Step 1.1: Init database
	run("Initializing database", "go", "run", "./scripts/init_db")

	// Step 2: Auto generate Ent for all modules
	err := filepath.Walk("modules", func(path string, info os.FileInfo, err error) error {
		if err != nil || !info.IsDir() {
			return nil
		}

		if filepath.Base(path) == "schema" && filepath.Base(filepath.Dir(path)) == "ent" {
			module := filepath.Dir(filepath.Dir(path))
			schema := "./" + path
			target := "./" + filepath.Join(module, "ent", "generated")
			run(fmt.Sprintf("Generating Ent for %s", module), "go", "run", "-mod=mod", "entgo.io/ent/cmd/ent", "generate", schema, "--target", target)
			migratePath := filepath.Join(module, "ent", "cmd", "migrate.go")
			run(
				fmt.Sprintf("⚙️ Running auto-migrate for %s", module),
				"go", "run", "-mod=mod", migratePath,
			)

		}
		return nil
	})

	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to walk modules: %v\n", err)
		os.Exit(1)
	}

	// Step 3: go mod tidy & vendor
	runGoModSync()

	// // Step 4: Init roles
	// run("Initializing roles", "go", "run", "./scripts/init_roles")

	// Step 5: Build all
	run("Building all modules", "go", "build", "./...")

	fmt.Println("✅ Project initialized successfully!")
}

func run(title string, name string, args ...string) {
	fmt.Println("👉 " + title)
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = withDefaultGoToolchain(os.Environ())
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed: %s %v\n", name, args)
		os.Exit(1)
	}
}

func runGoModSync() {
	const maxAttempts = 5

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		fmt.Printf("👉 Running go mod tidy (attempt %d/%d)\n", attempt, maxAttempts)

		output, err := runCapture("go", "mod", "tidy")
		if err == nil {
			if strings.TrimSpace(output) != "" {
				fmt.Print(output)
			}
			run("Running go mod vendor", "go", "mod", "vendor")
			return
		}

		fmt.Print(output)

		matches := missingPackagePattern.FindAllStringSubmatch(output, -1)
		if len(matches) == 0 {
			fmt.Fprintln(os.Stderr, "❌ go mod tidy failed with a non-recoverable error.")
			os.Exit(1)
		}

		seen := make(map[string]struct{})
		fmt.Println("⚙️ Auto-installing missing Go packages...")
		for _, match := range matches {
			pkg := strings.TrimSpace(match[1])
			if pkg == "" {
				continue
			}
			if _, ok := seen[pkg]; ok {
				continue
			}
			seen[pkg] = struct{}{}
			run(fmt.Sprintf("go get %s", pkg), "go", "get", pkg)
		}
	}

	fmt.Fprintf(os.Stderr, "❌ go mod tidy failed after %d attempts.\n", maxAttempts)
	os.Exit(1)
}

func runCapture(name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	cmd.Env = withDefaultGoToolchain(os.Environ())

	var buf bytes.Buffer
	cmd.Stdout = &buf
	cmd.Stderr = &buf

	err := cmd.Run()
	return buf.String(), err
}

func withDefaultGoToolchain(env []string) []string {
	for _, item := range env {
		if strings.HasPrefix(item, "GOTOOLCHAIN=") {
			return env
		}
	}
	return append(env, "GOTOOLCHAIN=auto")
}

func deleteFolder(folder string) {
	if _, err := os.Stat(folder); !os.IsNotExist(err) {
		fmt.Println("🧹 Removing folder:", folder)
		if err := os.RemoveAll(folder); err != nil {
			fmt.Fprintf(os.Stderr, "❌ Failed to delete folder %s: %v\n", folder, err)
			os.Exit(1)
		}
	}
}
