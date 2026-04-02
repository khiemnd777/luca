package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/khiemnd777/noah_api/shared/config"
	"github.com/khiemnd777/noah_api/shared/gen"
	"github.com/khiemnd777/noah_api/shared/utils"
)

func main() {
	if len(os.Args) < 2 {
		printHelp()
		return
	}

	config.Init(utils.GetAppConfigPath())

	switch os.Args[1] {
	case "ent":
		if len(os.Args) < 3 {
			fmt.Println("❌ Missing schema name. Example: go run scripts/gen.go ent User")
			return
		}
		generateEntSchema(os.Args[2])
	case "generate":
		gen.GenerateEntClient()
	case "seed":
		runSeeder()
	case "migrate":
		if err := gen.ApplySQLMigrations(); err != nil {
			fmt.Printf("❌ Failed to apply SQL migrations: %v\n", err)
		}
	case "drop":
		if err := gen.DropSQLSchema(); err != nil {
			fmt.Printf("❌ Failed to drop SQL schema: %v\n", err)
		}
	case "reset":
		if err := gen.ResetSQLMigrations(); err != nil {
			fmt.Printf("❌ Failed to reset SQL migrations: %v\n", err)
		}
	case "version":
		if err := gen.PrintSQLMigrationStatus(); err != nil {
			fmt.Printf("❌ Failed to inspect SQL migration status: %v\n", err)
		}
	case "status":
		if err := gen.PrintSQLMigrationStatus(); err != nil {
			fmt.Printf("❌ Failed to inspect SQL migration status: %v\n", err)
			return
		}
	default:
		fmt.Printf("❌ Unknown command: %s\n", os.Args[1])
		printHelp()
	}
}

func printHelp() {
	fmt.Println("\n📘 Dev CLI Helper Tool")
	fmt.Println("Usage:")
	fmt.Println("  go run ./scripts/gen ent <SchemaName>    📦 Create new schema and generate Ent client")
	fmt.Println("  go run ./scripts/gen generate             ⚙️  Only re-generate Ent client")
	fmt.Println("  go run ./scripts/gen seed                 🌱 Run seed logic")
	fmt.Println("  go run ./scripts/gen migrate              🚀 Apply app-managed SQL migrations")
	fmt.Println("  go run ./scripts/gen drop                 🧨 Drop public schema")
	fmt.Println("  go run ./scripts/gen reset                🔁 Drop schema and re-run SQL migrations")
	fmt.Println("  go run ./scripts/gen version              🧾 Show SQL migration status")
	fmt.Println("  go run ./scripts/gen status               🧾 Alias of version")
	fmt.Println()
}

func generateEntSchema(schema string) {
	fmt.Printf("📦 Creating schema: %s\n", schema)

	targetDir := filepath.Join(".", "shared", "db", "ent", "schema")

	cmd := exec.Command("ent", "new", schema, "--target", targetDir, "--feature", "sql/execquery")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		fmt.Printf("❌ Failed to create schema: %v\n", err)
		return
	}

	gen.GenerateEntClient()
}

func runSeeder() {
	fmt.Println("🌱 Running seed logic (TODO: implement your seeder here)...")
}
