package ent

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

const schemaCreateAdvisoryLockKey int64 = 2026041401

func CreateSchemaWithLock(ctx context.Context, provider string, db *sql.DB, create func(context.Context) error) error {
	if create == nil {
		return nil
	}
	if !usesPostgresLock(provider) || db == nil {
		return create(ctx)
	}

	conn, err := db.Conn(ctx)
	if err != nil {
		return fmt.Errorf("acquire schema migration connection failed: %w", err)
	}
	defer conn.Close()

	if _, err := conn.ExecContext(ctx, "SELECT pg_advisory_lock($1)", schemaCreateAdvisoryLockKey); err != nil {
		return fmt.Errorf("acquire schema migration advisory lock failed: %w", err)
	}

	unlockErr := error(nil)
	defer func() {
		if _, err := conn.ExecContext(ctx, "SELECT pg_advisory_unlock($1)", schemaCreateAdvisoryLockKey); err != nil {
			unlockErr = fmt.Errorf("release schema migration advisory lock failed: %w", err)
		}
	}()

	if err := create(ctx); err != nil {
		if unlockErr != nil {
			return fmt.Errorf("%w; %v", err, unlockErr)
		}
		return err
	}
	if unlockErr != nil {
		return unlockErr
	}
	return nil
}

func usesPostgresLock(provider string) bool {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "postgres", "postgresql":
		return true
	default:
		return false
	}
}
