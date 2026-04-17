package bootstrap

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/khiemnd777/noah_api/shared/utils"
)

var sqlMigrationPattern = regexp.MustCompile(`^V(\d+)__.+\.sql$`)

type SQLMigrationStatus struct {
	Version int
	Name    string
	Applied bool
	Source  string
}

type sqlMigration struct {
	Version int
	Name    string
	Path    string
	Body    string
}

func ApplySQLMigrations(db *sql.DB) error {
	if db == nil {
		return nil
	}

	ctx := context.Background()
	if err := ensureSchemaMigrationsTable(ctx, db); err != nil {
		return err
	}
	if err := importLegacyMigrationHistory(ctx, db); err != nil {
		return err
	}

	migrations, err := loadSQLMigrations()
	if err != nil {
		return err
	}

	applied, err := loadAppliedSQLMigrations(ctx, db)
	if err != nil {
		return err
	}

	for _, migration := range migrations {
		if _, ok := applied[migration.Version]; ok {
			continue
		}

		log.Printf("🗃️ Applying SQL migration V%d (%s)", migration.Version, migration.Name)

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("begin migration V%d failed: %w", migration.Version, err)
		}

		if strings.TrimSpace(migration.Body) != "" {
			if _, err := tx.ExecContext(ctx, migration.Body); err != nil {
				_ = tx.Rollback()
				return fmt.Errorf("apply migration V%d failed: %w", migration.Version, err)
			}
		}

		if _, err := tx.ExecContext(ctx, `
			INSERT INTO schema_migrations (version, name, source)
			VALUES ($1, $2, 'app')
			ON CONFLICT (version) DO NOTHING
		`, migration.Version, migration.Name); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record migration V%d failed: %w", migration.Version, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration V%d failed: %w", migration.Version, err)
		}
	}

	return nil
}

func ensureSchemaMigrationsTable(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INT PRIMARY KEY,
			name TEXT NOT NULL,
			source TEXT NOT NULL DEFAULT 'app',
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("ensure schema_migrations failed: %w", err)
	}
	return nil
}

func importLegacyMigrationHistory(ctx context.Context, db *sql.DB) error {
	// Backward compatibility: preserve migration continuity for databases
	// that were previously managed by Flyway.
	var hasLegacyHistory bool
	if err := db.QueryRowContext(ctx, `SELECT to_regclass('public.flyway_schema_history') IS NOT NULL`).Scan(&hasLegacyHistory); err != nil {
		return fmt.Errorf("check legacy migration history failed: %w", err)
	}
	if !hasLegacyHistory {
		return nil
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO schema_migrations (version, name, source, applied_at)
		SELECT
			CAST(version AS INT),
			description,
			'flyway',
			COALESCE(installed_on, NOW())
		FROM flyway_schema_history
		WHERE success = TRUE
		  AND version ~ '^[0-9]+$'
		ON CONFLICT (version) DO NOTHING
	`); err != nil {
		return fmt.Errorf("import legacy migration history failed: %w", err)
	}

	return nil
}

func ListSQLMigrationStatus(db *sql.DB) ([]SQLMigrationStatus, error) {
	if db == nil {
		return nil, nil
	}

	ctx := context.Background()
	if err := ensureSchemaMigrationsTable(ctx, db); err != nil {
		return nil, err
	}
	if err := importLegacyMigrationHistory(ctx, db); err != nil {
		return nil, err
	}

	migrations, err := loadSQLMigrations()
	if err != nil {
		return nil, err
	}

	rows, err := db.QueryContext(ctx, `SELECT version, source FROM schema_migrations`)
	if err != nil {
		return nil, fmt.Errorf("list applied migration status failed: %w", err)
	}
	defer rows.Close()

	applied := make(map[int]string)
	for rows.Next() {
		var version int
		var source string
		if err := rows.Scan(&version, &source); err != nil {
			return nil, fmt.Errorf("scan applied migration status failed: %w", err)
		}
		applied[version] = source
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	statuses := make([]SQLMigrationStatus, 0, len(migrations))
	for _, migration := range migrations {
		source, ok := applied[migration.Version]
		statuses = append(statuses, SQLMigrationStatus{
			Version: migration.Version,
			Name:    migration.Name,
			Applied: ok,
			Source:  source,
		})
	}

	return statuses, nil
}

func ResetSQLSchema(db *sql.DB) error {
	if db == nil {
		return nil
	}

	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `DROP SCHEMA IF EXISTS public CASCADE`); err != nil {
		return fmt.Errorf("drop public schema failed: %w", err)
	}
	if _, err := db.ExecContext(ctx, `CREATE SCHEMA public`); err != nil {
		return fmt.Errorf("create public schema failed: %w", err)
	}
	if _, err := db.ExecContext(ctx, `GRANT ALL ON SCHEMA public TO public`); err != nil {
		return fmt.Errorf("grant public schema failed: %w", err)
	}

	return nil
}

func loadAppliedSQLMigrations(ctx context.Context, db *sql.DB) (map[int]struct{}, error) {
	rows, err := db.QueryContext(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, fmt.Errorf("list applied migrations failed: %w", err)
	}
	defer rows.Close()

	applied := make(map[int]struct{})
	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("scan applied migration failed: %w", err)
		}
		applied[version] = struct{}{}
	}

	return applied, rows.Err()
}

func loadSQLMigrations() ([]sqlMigration, error) {
	dir := utils.GetFullPath("migrations", "sql")
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read migration dir failed: %w", err)
	}

	migrations := make([]sqlMigration, 0, len(entries))
	seenVersions := make(map[int]string, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		matches := sqlMigrationPattern.FindStringSubmatch(entry.Name())
		if len(matches) != 2 {
			continue
		}

		version, err := strconv.Atoi(matches[1])
		if err != nil {
			return nil, fmt.Errorf("parse migration version %q failed: %w", entry.Name(), err)
		}
		if prev, exists := seenVersions[version]; exists {
			return nil, fmt.Errorf("duplicate SQL migration version V%d: %s conflicts with %s", version, entry.Name(), prev)
		}
		seenVersions[version] = entry.Name()

		path := filepath.Join(dir, entry.Name())
		body, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("read migration %q failed: %w", entry.Name(), err)
		}

		migrations = append(migrations, sqlMigration{
			Version: version,
			Name:    entry.Name(),
			Path:    path,
			Body:    string(body),
		})
	}

	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Version < migrations[j].Version
	})

	return migrations, nil
}
