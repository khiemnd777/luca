package gen

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"os/exec"

	"github.com/khiemnd777/noah_api/shared/bootstrap"
	"github.com/khiemnd777/noah_api/shared/config"
	"github.com/khiemnd777/noah_api/shared/db"
	"github.com/khiemnd777/noah_api/shared/utils"
)

func GenerateEntClient() error {
	log.Println("⚙️  Generating Ent client...")

	entPath := utils.GetFullPath("shared", "db", "ent")

	cmd := exec.Command("go", "generate", entPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Dir = utils.GetProjectRootDir()

	if err := cmd.Run(); err != nil {
		log.Fatalf("❌ Failed to generate Ent client: %v", err)
		return err
	}

	log.Println("✅ Ent Client generated successfully.")
	return nil
}

func ApplySQLMigrations() error {
	log.Println("🚀 Applying SQL migrations...")
	return withSQLDB(bootstrap.ApplySQLMigrations)
}

func ResetSQLMigrations() error {
	log.Println("🧨 Resetting SQL schema...")
	return withSQLDB(func(sqlDB *sql.DB) error {
		if err := bootstrap.ResetSQLSchema(sqlDB); err != nil {
			return err
		}
		return bootstrap.ApplySQLMigrations(sqlDB)
	})
}

func DropSQLSchema() error {
	log.Println("🧨 Dropping SQL schema...")
	return withSQLDB(bootstrap.ResetSQLSchema)
}

func PrintSQLMigrationStatus() error {
	return withSQLDB(func(sqlDB *sql.DB) error {
		statuses, err := bootstrap.ListSQLMigrationStatus(sqlDB)
		if err != nil {
			return err
		}

		fmt.Println("📋 SQL migration status")
		for _, status := range statuses {
			state := "pending"
			if status.Applied {
				state = "applied"
				if status.Source != "" {
					state += " (" + status.Source + ")"
				}
			}
			fmt.Printf("  V%d %-40s %s\n", status.Version, status.Name, state)
		}
		return nil
	})
}

func withSQLDB(run func(*sql.DB) error) error {
	dbCfg := config.Get().Database
	dbClient, err := db.NewDatabaseClient(dbCfg)
	if err != nil {
		return fmt.Errorf("init DB client failed: %w", err)
	}
	defer dbClient.Close()

	if err := dbClient.Connect(); err != nil {
		return fmt.Errorf("connect DB failed: %w", err)
	}

	sqlDB := dbClient.GetSQL()
	if sqlDB == nil {
		return fmt.Errorf("database provider %q does not support SQL migrations", dbCfg.Provider)
	}

	return run(sqlDB)
}
